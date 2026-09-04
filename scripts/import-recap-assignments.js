const fs=require('fs');
const path=require('path');
const crypto=require('crypto');

function parseCsvLine(line){const cells=[];let value='',quoted=false;for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){value+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){cells.push(value.trim());value='';}else value+=c;}cells.push(value.trim());return cells;}

const root=path.resolve(__dirname,'..'),dbPath=path.join(root,'data','db.json');
const source=path.join(process.env.TEMP,'rekapan-poin.csv');
const rows=fs.readFileSync(source,'utf8').replace(/^\uFEFF/,'').split(/\r?\n/).map(parseCsvLine);
const db=JSON.parse(fs.readFileSync(dbPath,'utf8'));
const employeeByName=new Map(db.employees.map(e=>[e.name.trim().toUpperCase(),e]));
const aliases=new Map([['ANAS','ANNAS']]);
const outletMap=new Map([
  ['EMY SAELAN',db.outlets.find(o=>o.name.toUpperCase()==='EMYSAELAN')],
  ['SETIA BUDI',db.outlets.find(o=>o.name.toUpperCase()==='SETIABUDI')],
  ['MAKASSAR',db.outlets.find(o=>o.name.toUpperCase()==='PENGAYOMAN')],
]);
const planned=[],seen=new Set();
for(let i=0;i<rows.length;i++){
  const label=(rows[i][1]||'').toUpperCase();if(!outletMap.has(label))continue;
  const outlet=outletMap.get(label),captains=[rows[i+2][1],rows[i+2][6]];
  for(let groupIndex=0;groupIndex<2;groupIndex++){
    const group=groupIndex===0?'A':'B',captainName=aliases.get(captains[groupIndex].toUpperCase())||captains[groupIndex].toUpperCase(),captain=employeeByName.get(captainName);
    if(!captain||captain.position!=='KAPTEN')throw new Error(`Kapten tidak ditemukan: ${captains[groupIndex]}`);
    planned.push({employee:captain,outlet,group});seen.add(captain.id);
    for(let j=i+3;j<rows.length&&!outletMap.has((rows[j][1]||'').toUpperCase());j++)for(const column of groupIndex===0?[1,3]:[6,8]){
      const raw=rows[j][column];if(!raw)continue;const name=aliases.get(raw.toUpperCase())||raw.toUpperCase(),employee=employeeByName.get(name);
      if(!employee)throw new Error(`Karyawan tidak ditemukan: ${raw}`);if(seen.has(employee.id))throw new Error(`Karyawan tercatat ganda: ${employee.name}`);
      planned.push({employee,outlet,group});seen.add(employee.id);
    }
  }
}
if(planned.length!==77)throw new Error(`Jumlah hasil tidak sesuai: ${planned.length}`);
const from='2026-09-01',previousDay='2026-08-31';
db.assignments=(db.assignments||[]).filter(a=>{if(a.effectiveFrom>=from)return false;if(!a.effectiveTo||a.effectiveTo>=from)a.effectiveTo=previousDay;return true;});
for(const item of planned)db.assignments.push({id:crypto.randomUUID(),employeeId:item.employee.id,outletId:item.outlet.id,captainGroup:item.group,effectiveFrom:from,effectiveTo:null,assignedBy:'rekapan-poin-import'});
db.meta={...(db.meta||{}),recapAssignmentsImportedAt:new Date().toISOString(),recapAssignmentMonth:'2026-09',recapAssignmentCount:planned.length};
fs.writeFileSync(dbPath,`${JSON.stringify(db,null,2)}\n`);
const summary={};for(const item of planned){summary[item.outlet.name]??={};summary[item.outlet.name][item.group]??={captain:'',members:0};if(item.employee.position==='KAPTEN')summary[item.outlet.name][item.group].captain=item.employee.name;else summary[item.outlet.name][item.group].members++;}
console.log(JSON.stringify({assigned:planned.length,unassignedActive:db.employees.filter(e=>e.status==='ACTIVE'&&!seen.has(e.id)).length,summary},null,2));
