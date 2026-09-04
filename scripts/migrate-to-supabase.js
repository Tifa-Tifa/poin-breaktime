const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('../lib/supabase');

const execute = process.argv.includes('--execute');
const dbPath = path.join(__dirname, '..', 'data', 'db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

if (!execute) {
  console.log('DRY RUN: tidak ada data yang ditulis. Gunakan --execute setelah schema.sql selesai dijalankan.');
}
if (execute && !supabaseAdmin) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY wajib tersedia di .env untuk menjalankan migrasi. Jangan gunakan anon key untuk penulisan massal.');
}

const datasets = [
  ['employees', (db.employees || []).map(item => ({
    id:item.id, name:item.name, role:item.role || item.position, gender:item.gender || null,
    outlet:item.outlet || null, active:item.active !== false, position:item.position || item.role,
    status:item.status || (item.active === false ? 'INACTIVE' : 'ACTIVE'), city:item.city || null,
    source:item.source || null, updated_at:item.updatedAt || null,
  }))],
  ['outlets', (db.outlets || []).map(item => ({
    id:item.id, code:item.code, name:item.name, color:item.color || null,
    display_order:item.order || 0, status:item.status || 'ACTIVE', city:item.city || null,
  }))],
  ['point_rules', (db.rules || []).map(item => ({
    id:item.id, description:item.description, category:item.category, points:Number(item.points || 0),
    supports_multiplier:Boolean(item.supportsMultiplier), roles:item.roles || [], frequency:item.frequency || null,
    active:item.active !== false, is_multipliable:Boolean(item.isMultipliable),
    status:item.status || (item.active === false ? 'INACTIVE' : 'ACTIVE'), auto_daily:Boolean(item.autoDaily),
    derived_type:item.derivedType || null, automation:item.automation || null, updated_at:item.updatedAt || null,
  }))],
  ['batches', (db.batches || []).map(item => ({
    id:item.id, rule_id:item.ruleId || null, entry_date:item.date, notes:item.notes || null,
    created_by:item.createdBy || null, created_at:item.createdAt || null,
  }))],
  ['assignments', (db.assignments || []).map(item => ({
    id:item.id, employee_id:item.employeeId, outlet_id:item.outletId, captain_group:item.captainGroup || null,
    effective_from:item.effectiveFrom, effective_to:item.effectiveTo || null, assigned_by:item.assignedBy || null,
  }))],
  ['point_entries', (db.entries || []).map(item => ({
    id:item.id, batch_id:item.batchId || null, employee_id:item.employeeId, rule_id:item.ruleId,
    outlet_id:item.outletId || null, entry_date:item.date, quantity:Number(item.quantity || 1),
    multiplier:Number(item.multiplier || 1), base_points:Number(item.basePoints || 0),
    total_points:Number(item.totalPoints || 0), entry_kind:item.entryKind || 'MANUAL',
    status:item.status || 'CONFIRMED', created_at:item.createdAt || null, updated_at:item.updatedAt || null,
    voided_by_cancellation_id:item.voidedByCancellationId || null, cancelled_entry_id:item.cancelledEntryId || null,
  }))],
  ['days_off', (db.daysOff || []).map(item => ({
    id:item.id, employee_id:item.employeeId, off_date:item.date,
    status:item.status || 'CONFIRMED', created_at:item.createdAt || null,
  }))],
  ['audit_logs', (db.audit || []).map(item => ({
    id:item.id, action:item.action, entity_type:item.entityType || null, entity_id:item.entityId || null,
    actor:item.actor || null, before_data:item.before ?? null, after_data:item.after ?? null, occurred_at:item.at,
  }))],
  ['app_meta', [{ key:'database', value:db.meta || {}, updated_at:new Date().toISOString() }]],
];

const counts = Object.fromEntries(datasets.map(([table, rows]) => [table, rows.length]));
console.log('Data sumber:', counts);

async function upsertChunks(table, rows, chunkSize = 500) {
  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize);
    const { error } = await supabaseAdmin.from(table).upsert(chunk, { onConflict:table === 'app_meta' ? 'key' : 'id' });
    if (error) throw new Error(`${table} baris ${start + 1}-${start + chunk.length}: ${error.message}`);
    console.log(`${table}: ${Math.min(start + chunk.length, rows.length)}/${rows.length}`);
  }
}

async function verifyCounts() {
  const result = {};
  for (const [table] of datasets) {
    const { count, error } = await supabaseAdmin.from(table).select('*', { count:'exact', head:true });
    if (error) throw new Error(`Verifikasi ${table}: ${error.message}`);
    result[table] = count;
  }
  return result;
}

async function main() {
  if (!execute) return;
  for (const [table, rows] of datasets) await upsertChunks(table, rows);
  const remoteCounts = await verifyCounts();
  console.log('Migrasi selesai. Jumlah data Supabase:', remoteCounts);
}

main().catch(error => {
  console.error(`MIGRASI GAGAL: ${error.message}`);
  process.exitCode = 1;
});
