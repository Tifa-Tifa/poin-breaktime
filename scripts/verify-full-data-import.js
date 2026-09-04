const fs = require('fs');
const path = require('path');

const db = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'db.json'), 'utf8'));
const employees = new Map(db.employees.map(item => [item.id, item]));
const rules = new Set(db.rules.map(item => item.id));
const invalid = [];
for (const entry of db.entries) {
  const employee = employees.get(entry.employeeId);
  if (!employee) invalid.push(`employee:${entry.id}`);
  if (employee?.status !== 'ACTIVE') invalid.push(`inactive:${entry.id}`);
  if (employee?.position === 'KAPTEN') invalid.push(`captain:${entry.id}`);
  if (!rules.has(entry.ruleId)) invalid.push(`rule:${entry.id}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date)) invalid.push(`date:${entry.id}`);
  if (!Number.isFinite(entry.totalPoints)) invalid.push(`points:${entry.id}`);
}
const byMonth = {};
for (const entry of db.entries) byMonth[entry.date.slice(0, 7)] = (byMonth[entry.date.slice(0, 7)] || 0) + 1;
const result = {
  entries: db.entries.length,
  employeesReferenced: new Set(db.entries.map(item => item.employeeId)).size,
  invalidReferences: invalid.length,
  months: byMonth,
  currentMonthRows: byMonth['2026-09'] || 0,
  auditAction: db.audit[0]?.action,
  metadata: db.meta,
};
console.log(JSON.stringify(result, null, 2));
if (invalid.length) process.exitCode = 1;
