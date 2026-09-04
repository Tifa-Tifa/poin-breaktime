const { supabase, supabaseAdmin } = require('./supabase');

const PAGE_SIZE = 1000;
const WRITE_CHUNK_SIZE = 500;

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

async function fetchAll(table) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(`Gagal membaca ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) return rows;
  }
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function snapshot(db) {
  return Object.fromEntries([...Object.keys(tableDefinitions), 'meta'].map(key => [key, structuredClone(db[key] || (key === 'meta' ? {} : []))]));
}

async function readDb() {
  const keys = Object.keys(tableDefinitions);
  const [collections, metaRows] = await Promise.all([
    Promise.all(keys.map(key => fetchAll(tableDefinitions[key].table))),
    fetchAll('app_meta'),
  ]);
  const db = Object.fromEntries(keys.map((key, index) => [key, collections[index].map(tableDefinitions[key].toApp)]));
  db.meta = metaRows.find(row => row.key === 'database')?.value || {};
  Object.defineProperty(db, '__snapshot', { value:snapshot(db), enumerable:false, configurable:true });
  return db;
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
  for (const key of ['employees','outlets','rules','batches','assignments','entries','daysOff','audit']) {
    if (changedByKey[key].length) await upsertRows(tableDefinitions[key].table, changedByKey[key]);
  }
  if (stable(db.meta || {}) !== stable(before.meta || {})) {
    const { error } = await supabaseAdmin.from('app_meta').upsert({ key:'database', value:db.meta || {}, updated_at:new Date().toISOString() }, { onConflict:'key' });
    if (error) throw new Error(`Gagal menyimpan app_meta: ${error.message}`);
  }
}

module.exports = { readDb, writeDb };
