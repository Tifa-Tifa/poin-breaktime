const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const files=['data/db.json','data/seed.json'];
const automatic=new Set([
  'outlet seharian wangi, rapi & bersih','stok outlet aman seharian','datang tepat waktu','breafing','piket','absen finger',
  'berita acara harian','laporan harian tertib & benar','list reservasi digrup tepat waktu lengkap perhari',
  'diagnosa & vote lengkap sehari','reservasi tamu aman semua tanpa eror dalam sehari'
]);
for(const relative of files){
  const target=path.join(root,relative),db=JSON.parse(fs.readFileSync(target,'utf8'));
  const finger=db.rules.find(r=>r.description.toLowerCase()==='absen finger');
  if(finger&&!finger.roles.includes('KASIR'))finger.roles.push('KASIR');
  for(const rule of db.rules){
    const name=rule.description.toLowerCase();
    rule.autoDaily=automatic.has(name);
    if(/^off (ao|kasir|terapis)$/.test(name)){rule.status='INACTIVE';rule.active=false;}
    if(name.includes('pegang tamu cowok'))rule.description='Pegang tamu perbulan diatas 45-50';
    if(name.includes('pegang tamu cewek'))rule.description='Pegang tamu perbulan diatas 50-60';
    const updated=rule.description.toLowerCase();
    if(updated==='tidak pernah lambat selama 1 pekan')rule.derivedType='WEEKLY_ATTENDANCE';
    if(updated==='tidak pernah lambat dalam 1 bulan')rule.derivedType='MONTHLY_ATTENDANCE';
    if(updated==='pegang tamu perbulan diatas 45-50')rule.derivedType='MONTHLY_GUEST_45';
    if(updated==='pegang tamu perbulan diatas 50-60')rule.derivedType='MONTHLY_GUEST_50';
  }
  const idsByName=name=>db.rules.filter(r=>name.test(r.description)).map(r=>r.id);
  const noSp=db.rules.find(r=>r.description.toLowerCase()==='1 bulan tidak dapat sp');
  if(noSp)noSp.automation={type:'NO_OCCURRENCE',period:'MONTHLY',blockerRuleIds:idsByName(/^SP [123]$/i),requiredDailyRuleId:'',blockOnDayOff:false};
  db.meta={...(db.meta||{}),automaticPointsEnabledAt:new Date().toISOString(),automaticPointTimezone:'Asia/Makassar'};
  fs.writeFileSync(target,`${JSON.stringify(db,null,2)}\n`);
}
const db=JSON.parse(fs.readFileSync(path.join(root,'data/db.json'),'utf8'));
console.log(JSON.stringify({automaticRules:db.rules.filter(r=>r.autoDaily&&r.status==='ACTIVE').map(r=>({description:r.description,roles:r.roles,points:r.points})),inactiveOffRules:db.rules.filter(r=>/^off /i.test(r.description)&&r.status==='INACTIVE').map(r=>r.description)},null,2));
