const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const dbPath = path.join(root, 'data', 'db.json');
const sourcePath = path.join(process.env.TEMP, 'poin-breaktime-full-data.json');
const shouldWrite = process.argv.includes('--write');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const key = value => String(value || '').trim().toLocaleUpperCase('id-ID');
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const employees = new Map(db.employees.map(employee => [key(employee.name), employee]));
const rules = new Map(db.rules.map(rule => [key(rule.description), rule]));
const descriptionAliases = new Map([
  ['PEGANG TAMU COWOK DIATAS 45-50', 'PEGANG TAMU PERBULAN DIATAS 45-50'],
  ['PEGANG TAMU CEWEK DIATAS 50-60', 'PEGANG TAMU PERBULAN DIATAS 50-60'],
]);
const targetRule = rules.get('TIDAK BANTU AO');
if (!targetRule) throw new Error('Aturan Tidak Bantu AO tidak ditemukan.');

const stats = {
  sourceRows: records.length,
  eligibleRows: 0,
  skippedInactive: 0,
  skippedCaptains: 0,
  skippedNotInMaster: 0,
  skippedInvalidDate: 0,
  aliasesApplied: 0,
  unmatchedRules: {},
  cancellations: 0,
  cancellationTargetsVoided: 0,
  unmatchedCancellations: 0,
  unmatchedCancellationDetails: [],
};
const eligible = [];
for (const record of records) {
  const employee = employees.get(key(record.name));
  if (!employee) { stats.skippedNotInMaster += 1; continue; }
  if (employee.status === 'INACTIVE') { stats.skippedInactive += 1; continue; }
  if (employee.position === 'KAPTEN') { stats.skippedCaptains += 1; continue; }
  const sourceDescription = key(record.description);
  const normalizedDescription = descriptionAliases.get(sourceDescription) || sourceDescription;
  if (normalizedDescription !== sourceDescription) stats.aliasesApplied += 1;
  const rule = rules.get(normalizedDescription);
  if (!rule) {
    stats.unmatchedRules[record.description] = (stats.unmatchedRules[record.description] || 0) + 1;
    continue;
  }
  // The source contains formula-generated OFF rows for 29-31 February 2026.
  // They cannot represent real work dates and must not enter the website database.
  if (!validDate(record.date)) { stats.skippedInvalidDate += 1; continue; }
  eligible.push({ record, employee, rule });
}
stats.eligibleRows = eligible.length;
if (Object.keys(stats.unmatchedRules).length) {
  throw new Error(`Uraian poin tidak cocok: ${JSON.stringify(stats.unmatchedRules)}`);
}

const now = new Date().toISOString();
const batchId = crypto.randomUUID();
const entries = [];
const cancellations = [];
const assignmentFor = (employeeId, date) => db.assignments
  .filter(item => item.employeeId === employeeId && item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date))
  .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

for (const { record, employee, rule } of eligible) {
  const quantityValue = Number(record.quantity || 1);
  const quantity = Number.isFinite(quantityValue) && quantityValue > 0 ? quantityValue : 1;
  const assignment = assignmentFor(employee.id, record.date);
  const entry = {
    id: crypto.randomUUID(), batchId, employeeId: employee.id, ruleId: rule.id,
    outletId: assignment?.outletId || null, date: record.date,
    quantity, multiplier: quantity, basePoints: Number(rule.points),
    totalPoints: Number(record.points), entryKind: 'MANUAL', status: 'CONFIRMED',
    createdAt: now, updatedAt: now,
  };
  if (rule.autoDaily && Number(record.points) < 0) {
    entry.entryKind = 'AUTO_EXCLUSION';
    entry.totalPoints = 0;
  }
  if (rule.automation?.type === 'CANCEL_RULE') {
    entry.entryKind = 'CANCELLATION';
    entry.totalPoints = 0;
    entry.basePoints = 0;
    entry.quantity = 1;
    entry.multiplier = 1;
    cancellations.push(entry);
    stats.cancellations += 1;
  } else {
    entries.push(entry);
  }
}

for (const cancellation of cancellations) {
  const target = entries.find(entry => entry.status !== 'VOID'
    && entry.employeeId === cancellation.employeeId
    && entry.date === cancellation.date
    && entry.ruleId === targetRule.id);
  if (target) {
    target.status = 'VOID';
    target.voidedByCancellationId = cancellation.id;
    cancellation.cancelledEntryId = target.id;
    stats.cancellationTargetsVoided += 1;
  } else {
    stats.unmatchedCancellations += 1;
    const employee = db.employees.find(item => item.id === cancellation.employeeId);
    stats.unmatchedCancellationDetails.push({ employee: employee?.name, date: cancellation.date });
  }
  entries.push(cancellation);
}

stats.storedEntries = entries.length;
stats.manualConfirmed = entries.filter(e => e.entryKind === 'MANUAL' && e.status === 'CONFIRMED').length;
stats.autoExclusions = entries.filter(e => e.entryKind === 'AUTO_EXCLUSION').length;
stats.voidedEntries = entries.filter(e => e.status === 'VOID').length;

if (shouldWrite) {
  db.entries = entries;
  db.batches = [{
    id: batchId, ruleId: null, date: '2025-02-27',
    notes: 'Impor penuh sheet DATA; hanya karyawan aktif non-kapten',
    createdBy: 'spreadsheet-import', createdAt: now,
  }];
  db.daysOff = [];
  db.audit.unshift({
    id: crypto.randomUUID(), action: 'REPLACE_ALL_FROM_FULL_SPREADSHEET',
    entityType: 'POINT_ENTRY', entityId: batchId, actor: 'Admin', before: null,
    after: stats, at: now,
  });
  db.meta = {
    ...(db.meta || {}), dataSheetImportedAt: now, dataSheetRange: '2025-02-27/2026-09-03',
    dataSheetRowCount: records.length, importedActivePointRows: entries.length,
  };
  fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);
}

console.log(JSON.stringify({ mode: shouldWrite ? 'write' : 'dry-run', ...stats }, null, 2));
