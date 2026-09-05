const { supabase, supabaseAdmin } = require('./supabase');

const PAGE_SIZE = 1000;
const MAX_PARALLEL_READS = 6;
const WRITE_CHUNK_SIZE = 500;
const READ_CACHE_MS = 5 * 60_000;
const YEAR_RANGE_CACHE_MS = 10 * 60_000;
const readCache = new Map();
const pendingReads = new Map();
let cachedYearRange = null;
let cachedYearRangeAt = 0;
let cachedEmployeeStarts = null;
let cachedEmployeeStartsAt = 0;

const tableDefinitions = {
  employees: {
    table: 'employees',
    toApp: row => ({ ...row, updatedAt: row.updated_at }),
    toRow: item => ({ id:item.id, name:item.name, role:item.role, gender:item.gender, outlet:item.outlet, active:item.active, position:item.position, status:item.status, city:item.city, source:item.source, updated_at:item.updatedAt || null }),
  },
  outlets: {
    table: 'outlets',
    toApp: row => ({ ...row, order: row.display_order }),
    toRow: item => ({ id:item.id, code:item.code, name:item.name, color:item.color, display_order:item.order || 0, status:item.status, city:item.city }),
  },
  rules: {
    table: 'point_rules',
    toApp: row => ({ ...row, supportsMultiplier:row.supports_multiplier, isMultipliable:row.is_multipliable, autoDaily:row.auto_daily, derivedType:row.derived_type, updatedAt:row.updated_at }),
    toRow: item => ({ id:item.id, description:item.description, category:item.category, points:item.points, supports_multiplier:Boolean(item.supportsMultiplier), roles:item.roles || [], frequency:item.frequency, active:item.active !== false, is_multipliable:Boolean(item.isMultipliable), status:item.status, auto_daily:Boolean(item.autoDaily), derived_type:item.derivedType || null, automation:item.automation || null, updated_at:item.updatedAt || null }),
  },
  batches: {
    table: 'batches',
    toApp: row => ({ id:row.id, ruleId:row.rule_id, date:row.entry_date, notes:row.notes, createdBy:row.created_by, createdAt:row.created_at }),
    toRow: item => ({ id:item.id, rule_id:item.ruleId, entry_date:item.date, notes:item.notes, created_by:item.createdBy, created_at:item.createdAt || null }),
  },
  assignments: {
    table: 'assignments',
    toApp: row => ({ id:row.id, employeeId:row.employee_id, outletId:row.outlet_id, captainGroup:row.captain_group, effectiveFrom:row.effective_from, effectiveTo:row.effective_to, assignedBy:row.assigned_by }),
    toRow: item => ({ id:item.id, employee_id:item.employeeId, outlet_id:item.outletId, captain_group:item.captainGroup || null, effective_from:item.effectiveFrom, effective_to:item.effectiveTo || null, assigned_by:item.assignedBy }),
  },
  entries: {
    table: 'point_entries',
    toApp: row => ({ id:row.id, batchId:row.batch_id, employeeId:row.employee_id, ruleId:row.rule_id, outletId:row.outlet_id, date:row.entry_date, quantity:Number(row.quantity), multiplier:Number(row.multiplier), basePoints:Number(row.base_points), totalPoints:Number(row.total_points), entryKind:row.entry_kind, status:row.status, createdAt:row.created_at, updatedAt:row.updated_at, voidedByCancellationId:row.voided_by_cancellation_id, cancelledEntryId:row.cancelled_entry_id }),
    toRow: item => ({ id:item.id, batch_id:item.batchId || null, employee_id:item.employeeId, rule_id:item.ruleId, outlet_id:item.outletId || null, entry_date:item.date, quantity:item.quantity ?? 1, multiplier:item.multiplier ?? 1, base_points:item.basePoints ?? 0, total_points:item.totalPoints ?? 0, entry_kind:item.entryKind || 'MANUAL', status:item.status || 'CONFIRMED', created_at:item.createdAt || null, updated_at:item.updatedAt || null, voided_by_cancellation_id:item.voidedByCancellationId || null, cancelled_entry_id:item.cancelledEntryId || null }),
  },
  daysOff: {
    table: 'days_off',
    toApp: row => ({ id:row.id, employeeId:row.employee_id, date:row.off_date, status:row.status, createdAt:row.created_at }),
    toRow: item => ({ id:item.id, employee_id:item.employeeId, off_date:item.date, status:item.status || 'CONFIRMED', created_at:item.createdAt || null }),
  },
  audit: {
    table: 'audit_logs',
    toApp: row => ({ id:row.id, action:row.action, entityType:row.entity_type, entityId:row.entity_id, actor:row.actor, before:row.before_data, after:row.after_data, at:row.occurred_at }),
    toRow: item => ({ id:item.id, action:item.action, entity_type:item.entityType || null, entity_id:item.entityId || null, actor:item.actor, before_data:item.before || null, after_data:item.after || null, occurred_at:item.at }),
  },
};

async function fetchAll(table, configure = query => query, limit = Infinity) {
  const firstTo = Math.min(PAGE_SIZE - 1, limit - 1);
  const { data:firstPage, error:firstError, count } = await configure(
    supabase.from(table).select('*', { count:'exact' }),
  ).range(0, firstTo);
  if (firstError) throw new Error(`Gagal membaca ${table}: ${firstError.message}`);
  const total = Math.min(count ?? firstPage.length, limit);
  if (firstPage.length >= total || firstPage.length < PAGE_SIZE) return firstPage.slice(0, total);

  const ranges = [];
  for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
    ranges.push([from, Math.min(from + PAGE_SIZE - 1, total - 1)]);
  }
  const rows = [...firstPage];
  for (let index = 0; index < ranges.length; index += MAX_PARALLEL_READS) {
    const pages = await Promise.all(ranges.slice(index, index + MAX_PARALLEL_READS).map(async ([from, to]) => {
      const { data, error } = await configure(supabase.from(table).select('*')).range(from, to);
      if (error) throw new Error(`Gagal membaca ${table}: ${error.message}`);
      return data;
    }));
    pages.forEach(page => rows.push(...page));
  }
  return rows.slice(0, total);
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function snapshot(db) {
  return Object.fromEntries([...Object.keys(tableDefinitions), 'meta'].map(key => [key, structuredClone(db[key] || (key === 'meta' ? {} : []))]));
}

function cloneDb(db) {
  const clone = structuredClone(db);
  Object.defineProperty(clone, '__snapshot', { value:snapshot(clone), enumerable:false, configurable:true });
  return clone;
}

async function readDb(options = {}) {
  const cacheKey = JSON.stringify(options);
  const cached = readCache.get(cacheKey);
  if (cached && Date.now() - cached.at < READ_CACHE_MS) return cloneDb(cached.db);
  if (pendingReads.has(cacheKey)) return cloneDb(await pendingReads.get(cacheKey));
  const omitted = new Set(['batches', ...(options.omit || [])]);
  const keys = Object.keys(tableDefinitions).filter(key => !omitted.has(key));
  const load = async () => {
  const [collections, metaRows] = await Promise.all([
    Promise.all(keys.map(key => key === 'audit'
      ? fetchAll(tableDefinitions[key].table, query => query.order('occurred_at', { ascending:false }), options.auditLimit || 50)
      : key === 'entries'
        ? fetchAll(tableDefinitions[key].table, query => {
            if (options.entryId) return query.eq('id', options.entryId);
            if (options.entryEmployeeIds?.length) query = query.in('employee_id', options.entryEmployeeIds);
            if (options.entryRuleIds?.length) query = query.in('rule_id', options.entryRuleIds);
            if (options.entriesFrom) query = query.gte('entry_date', options.entriesFrom);
            if (options.entriesTo) query = query.lte('entry_date', options.entriesTo);
            return query;
          })
        : key === 'daysOff'
          ? fetchAll(tableDefinitions[key].table, query => {
              if (options.dayOffId) return query.eq('id', options.dayOffId);
              if (options.dayOffEmployeeIds?.length) query = query.in('employee_id', options.dayOffEmployeeIds);
              if (options.daysOffFrom) query = query.gte('off_date', options.daysOffFrom);
              if (options.daysOffTo) query = query.lte('off_date', options.daysOffTo);
              return query;
            })
          : key === 'employees' && options.employeeIds?.length
            ? fetchAll(tableDefinitions[key].table, query => query.in('id', options.employeeIds))
            : key === 'assignments' && options.assignmentEmployeeIds?.length
              ? fetchAll(tableDefinitions[key].table, query => query.in('employee_id', options.assignmentEmployeeIds))
          : fetchAll(tableDefinitions[key].table))),
    fetchAll('app_meta'),
  ]);
  const db = Object.fromEntries(keys.map((key, index) => [key, collections[index].map(tableDefinitions[key].toApp)]));
  for (const key of Object.keys(tableDefinitions)) if (!db[key]) db[key] = [];
  db.meta = metaRows.find(row => row.key === 'database')?.value || {};
  Object.defineProperty(db, '__snapshot', { value:snapshot(db), enumerable:false, configurable:true });
  readCache.set(cacheKey, { db, at:Date.now() });
  return db;
  };
  const pending = load();
  pendingReads.set(cacheKey, pending);
  try { return cloneDb(await pending); } finally { pendingReads.delete(cacheKey); }
}

async function readEntryYearRange() {
  if (cachedYearRange && Date.now() - cachedYearRangeAt < YEAR_RANGE_CACHE_MS) return [...cachedYearRange];
  const firstQuery = supabase.from('point_entries').select('entry_date').not('entry_date', 'is', null).order('entry_date', { ascending:true }).limit(1);
  const lastQuery = supabase.from('point_entries').select('entry_date').not('entry_date', 'is', null).order('entry_date', { ascending:false }).limit(1);
  const [{ data:first, error:firstError }, { data:last, error:lastError }] = await Promise.all([firstQuery, lastQuery]);
  if (firstError || lastError) throw new Error(`Gagal membaca rentang tahun: ${(firstError || lastError).message}`);
  const minYear = first?.[0]?.entry_date?.slice(0, 4);
  const maxYear = last?.[0]?.entry_date?.slice(0, 4);
  const years = minYear && maxYear
    ? Array.from({ length:Number(maxYear) - Number(minYear) + 1 }, (_, index) => String(Number(maxYear) - index))
    : [];
  cachedYearRange = years;
  cachedYearRangeAt = Date.now();
  return [...years];
}

async function readEmployeeStartDates() {
  if (cachedEmployeeStarts && Date.now() - cachedEmployeeStartsAt < YEAR_RANGE_CACHE_MS) return { ...cachedEmployeeStarts };
  const createQuery = (withCount = false) => supabase
    .from('point_entries')
    .select('employee_id,entry_date', withCount ? { count:'exact' } : undefined)
    .neq('status', 'VOID');
  const { data:firstPage, error:firstError, count } = await createQuery(true).range(0, PAGE_SIZE - 1);
  if (firstError) throw new Error(`Gagal membaca tanggal mulai karyawan: ${firstError.message}`);
  const ranges = [];
  for (let from = PAGE_SIZE; from < count; from += PAGE_SIZE) ranges.push([from, Math.min(from + PAGE_SIZE - 1, count - 1)]);
  const rows = [...firstPage];
  for (let index = 0; index < ranges.length; index += MAX_PARALLEL_READS) {
    const pages = await Promise.all(ranges.slice(index, index + MAX_PARALLEL_READS).map(async ([from, to]) => {
      const { data, error } = await createQuery().range(from, to);
      if (error) throw new Error(`Gagal membaca tanggal mulai karyawan: ${error.message}`);
      return data;
    }));
    pages.forEach(page => rows.push(...page));
  }
  const starts = {};
  for (const row of rows) if (!starts[row.employee_id] || row.entry_date < starts[row.employee_id]) starts[row.employee_id] = row.entry_date;
  cachedEmployeeStarts = starts;
  cachedEmployeeStartsAt = Date.now();
  return { ...starts };
}

async function upsertRows(table, rows) {
  for (let index = 0; index < rows.length; index += WRITE_CHUNK_SIZE) {
    const { error } = await supabaseAdmin.from(table).upsert(rows.slice(index, index + WRITE_CHUNK_SIZE), { onConflict:'id' });
    if (error) throw new Error(`Gagal menyimpan ${table}: ${error.message}`);
  }
}

async function deleteIds(table, ids) {
  for (let index = 0; index < ids.length; index += WRITE_CHUNK_SIZE) {
    const { error } = await supabaseAdmin.from(table).delete().in('id', ids.slice(index, index + WRITE_CHUNK_SIZE));
    if (error) throw new Error(`Gagal menghapus ${table}: ${error.message}`);
  }
}

async function writeDb(db) {
  if (!supabaseAdmin) throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib tersedia untuk menyimpan perubahan.');
  const before = db.__snapshot || {};
  const changedByKey = {};
  const removedByKey = {};

  for (const [key, definition] of Object.entries(tableDefinitions)) {
    const oldItems = before[key] || [];
    const oldById = new Map(oldItems.map(item => [item.id, item]));
    const newItems = db[key] || [];
    const newIds = new Set(newItems.map(item => item.id));
    changedByKey[key] = newItems.filter(item => !oldById.has(item.id) || stable(item) !== stable(oldById.get(item.id))).map(definition.toRow);
    removedByKey[key] = oldItems.filter(item => !newIds.has(item.id)).map(item => item.id);
  }

  for (const key of ['entries','batches','assignments','daysOff','audit','rules','employees','outlets']) {
    if (removedByKey[key].length) await deleteIds(tableDefinitions[key].table, removedByKey[key]);
  }
  const upsertChanged = keys => Promise.all(keys
    .filter(key => changedByKey[key].length)
    .map(key => upsertRows(tableDefinitions[key].table, changedByKey[key])));
  // Master data dan batch harus tersedia sebelum tabel yang memiliki foreign key.
  await upsertChanged(['employees','outlets','rules','batches','audit']);
  await upsertChanged(['assignments','entries','daysOff']);
  if (stable(db.meta || {}) !== stable(before.meta || {})) {
    const { error } = await supabaseAdmin.from('app_meta').upsert({ key:'database', value:db.meta || {}, updated_at:new Date().toISOString() }, { onConflict:'key' });
    if (error) throw new Error(`Gagal menyimpan app_meta: ${error.message}`);
  }
  Object.defineProperty(db, '__snapshot', { value:snapshot(db), enumerable:false, configurable:true });
  let invalidateEmployeeStarts = false;
  if (cachedEmployeeStarts) {
    for (const row of changedByKey.entries) {
      const current = cachedEmployeeStarts[row.employee_id];
      if (row.status === 'VOID' && current === row.entry_date) invalidateEmployeeStarts = true;
      else if (row.status !== 'VOID' && (!current || row.entry_date < current)) cachedEmployeeStarts[row.employee_id] = row.entry_date;
    }
  }
  if (cachedYearRange) {
    for (const row of changedByKey.entries) {
      const year = row.entry_date?.slice(0, 4);
      if (year && !cachedYearRange.includes(year)) cachedYearRange.push(year);
    }
    cachedYearRange.sort((a, b) => b.localeCompare(a));
  }
  readCache.clear();
  if (invalidateEmployeeStarts) {
    cachedEmployeeStarts = null;
    cachedEmployeeStartsAt = 0;
  }
}

module.exports = { readDb, writeDb, readEntryYearRange, readEmployeeStartDates };
