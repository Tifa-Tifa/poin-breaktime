const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const roleSources = [
  ['AO', path.join(process.env.TEMP, 'adi.csv')],
  ['KASIR', path.join(process.env.TEMP, 'salwa.csv')],
  ['TERAPIS', path.join(process.env.TEMP, 'azmi.csv')],
];

function parseCsvLine(line) {
  const cells = [];
  let value = '', quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { cells.push(value); value = ''; }
    else value += char;
  }
  cells.push(value);
  return cells.map(cell => cell.trim());
}

function normalize(value) {
  return value.toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/briefing/g, 'breafing')
    .replace(/di atas/g, 'diatas')
    .replace(/per hari/g, 'perhari')
    .replace(/perbulan/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferFrequency(description) {
  const value = description.toLowerCase();
  if (/1 bulan|30 hari|bulanan|perbulan/.test(value)) return 'MONTHLY';
  if (/1 pekan/.test(value)) return 'WEEKLY';
  if (/sp [123]|vote|membantu|bantu |fullday|tamu|request|tukaran/.test(value)) return 'EVENT';
  return 'DAILY';
}

const imported = new Map();
for (const [role, source] of roleSources) {
  const rows = fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map(parseCsvLine);
  let category = null;
  for (const row of rows) {
    const label = (row[2] || '').toUpperCase();
    if (['PENGURANGAN', 'PENAMBAHAN', 'PRESTASI'].includes(label)) { category = label; continue; }
    if (!category || !/^\d+$/.test(row[1] || '') || !row[2] || !row[3]) continue;
    const points = Number(row[3].replace(',', '.'));
    if (!Number.isFinite(points)) continue;
    const key = `${category}|${normalize(row[2])}|${points}`;
    if (!imported.has(key)) imported.set(key, { description: row[2], category, points, roles: [] });
    imported.get(key).roles.push(role);
  }
}

const dbPath = path.join(root, 'data', 'db.json');
const seedPath = path.join(root, 'data', 'seed.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const oldRules = db.rules || [];
const usedIds = new Set();
let counter = 1;

const rules = [...imported.values()].map(item => {
  const existing = oldRules.find(rule =>
    !usedIds.has(rule.id) && rule.category === item.category && Number(rule.points) === item.points && normalize(rule.description) === normalize(item.description)
  );
  const id = existing?.id || `r-sheet-${String(counter++).padStart(3, '0')}`;
  usedIds.add(id);
  const isMultipliable = existing?.isMultipliable ?? ['doble piket', 'tamu lembur'].includes(normalize(item.description));
  return {
    id,
    description: item.description,
    category: item.category,
    points: item.points,
    supportsMultiplier: isMultipliable,
    roles: [...new Set(item.roles)],
    frequency: existing?.frequency || inferFrequency(item.description),
    active: true,
    isMultipliable,
    status: 'ACTIVE',
  };
});

const referencedRuleIds = new Set((db.entries || []).map(entry => entry.ruleId));
for (const rule of oldRules) {
  if (!usedIds.has(rule.id) && referencedRuleIds.has(rule.id)) {
    rules.push({ ...rule, active: false, status: 'INACTIVE' });
  }
}

db.rules = rules;
fs.writeFileSync(dbPath, `${JSON.stringify(db, null, 2)}\n`);

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
seed.rules = rules;
fs.writeFileSync(seedPath, `${JSON.stringify(seed, null, 2)}\n`);

const counts = Object.fromEntries(['AO', 'KASIR', 'TERAPIS'].map(role => [role, rules.filter(rule => rule.status === 'ACTIVE' && rule.roles.includes(role)).length]));
console.log(JSON.stringify({ activeRules: rules.filter(rule => rule.status === 'ACTIVE').length, preservedLegacy: rules.filter(rule => rule.status === 'INACTIVE').length, counts }, null, 2));
