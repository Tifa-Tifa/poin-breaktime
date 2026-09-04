const state = {
  role: 'VIEWER', adminToken: null,
  page: 'dashboard',
  employees: [], outlets: [], assignments: [], rules: [], entries: [], annualScores: [], availableYears: [], autoExclusions: [], daysOff: [], audit: [],
  outlet: 'SEMUA', month: '2026-09', recapYear: '2026', recapPosition: 'SEMUA', search: '', pointCategory: 'SEMUA',
  selectedEmployee: 'emp-rafly', editingId: null, selectedPointCard: null,
  cardSelections: {}, rotationDraft: {}, sidebarCollapsed: localStorage.getItem('sidebarCollapsed')==='true',
  tourActive: false, tourStep: 0, tourRestoreCollapsed: false,
  employeeFilters: { position:'SEMUA', gender:'SEMUA', city:'SEMUA', status:'SEMUA', outlet:'SEMUA' }
};
const pendingPointSaves = new Set();

const icons = {
  dashboard: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-8"/>', award: '<circle cx="12" cy="8" r="6"/><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12"/>',
  trend: '<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>', activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>', edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v5M14 11v5"/>',
  lock: '<rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.6-1.5 1.1-1.5 2.2M12 17h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  building: '<path d="M3 21h18M6 21V4h12v17M9 8h2M13 8h2M9 12h2M13 12h2M9 16h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.38.3.6.75.6 1.23v.17h1v4h-.09A1.7 1.7 0 0 0 19.4 15z"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>', empty: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5M12 15V3"/>'
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const fmt = n => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(Number(n || 0));
const dateFmt = value => new Intl.DateTimeFormat('id-ID', { day:'numeric', month:'short', year:'numeric' }).format(new Date(value + 'T00:00:00'));
const initials = name => name.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase();
const matchesSearch = (...values) => !state.search.trim() || values.some(value => String(value ?? '').toLowerCase().includes(state.search.trim().toLowerCase()));
const activeEntries = () => state.entries.filter(e => e.status !== 'VOID');
const visibleEntries = () => activeEntries().filter(e => (state.outlet === 'SEMUA' || e.employee.outlet === state.outlet) && e.date.startsWith(state.month));
const monthLabel = () => new Intl.DateTimeFormat('id-ID',{month:'long',year:'numeric'}).format(new Date(state.month+'-01T00:00:00'));
const assignmentFor = (employeeId, date=`${state.month}-01`) => state.assignments.filter(a=>a.employeeId===employeeId&&a.effectiveFrom<=date&&(!a.effectiveTo||a.effectiveTo>=date)).sort((a,b)=>b.effectiveFrom.localeCompare(a.effectiveFrom))[0];
const outletFor = (employeeId, date) => state.outlets.find(o=>o.id===assignmentFor(employeeId,date)?.outletId);
const employeeOutletName = (employeeId,date) => outletFor(employeeId,date)?.name?.toUpperCase() || 'BELUM DITEMPATKAN';

async function api(path, options={}) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type':'application/json', ...(state.adminToken?{'Authorization':`Bearer ${state.adminToken}`}:{ }), ...(options.headers||{}) } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Permintaan gagal.');
  return result;
}

function toast(message, type='') {
  const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = message;
  document.querySelector('#toast-region').append(el); setTimeout(()=>el.remove(), 3200);
}

function navButton(page, label, iconName, badge='') {
  return `<button class="nav-button ${state.page===page?'active':''}" data-page="${page}" aria-label="${label}">${icon(iconName)}<span>${label}</span>${badge?`<span class="badge">${badge}</span>`:''}</button>`;
}

function shell(content) {
  return `<div class="app-shell ${state.sidebarCollapsed?'sidebar-collapsed':''}">
    <aside class="sidebar" id="sidebar" data-tour="sidebar">
      <div class="brand"><span class="brand-logo-frame"><picture><source type="image/avif" srcset="/assets/breaktime-logo-150.avif 150w, /assets/breaktime-logo-300.avif 300w" sizes="150px"><img src="/assets/breaktime-logo-150.webp" srcset="/assets/breaktime-logo-150.webp 150w, /assets/breaktime-logo-300.webp 300w" sizes="150px" alt="Breaktime" width="150" height="100" decoding="async"></picture></span></div>
      <button class="sidebar-collapse" id="sidebar-collapse" title="Tutup atau kecilkan navigasi" aria-label="Tutup atau kecilkan navigasi">${icon('chevron')}</button>
      <div class="nav-label">Utama</div>
      ${navButton('dashboard','Dashboard','dashboard')}
      ${navButton('recap','Rekapan Poin','chart')}
      ${navButton('scorecard','Poin Individu','award')}
      ${navButton('activity','Riwayat Aktivitas','list',activeEntries().length)}
      ${state.role==='ADMIN'?`<div class="nav-label">Kelola</div>${navButton('entry','Input Poin','plus')}${navButton('employees','Karyawan','users')}${navButton('outlets','Rotasi Outlet','building')}${navButton('rules','Point Master','settings')}`:`<div class="nav-label">Ringkasan</div>${navButton('outlets','Ringkasan Outlet','building')}`}
      <div class="sidebar-bottom">
        <div class="profile-mini"><img class="profile-avatar" src="/assets/${state.role==='ADMIN'?'admin':'viewer'}-avatar-48.webp" srcset="/assets/${state.role==='ADMIN'?'admin':'viewer'}-avatar-48.webp 48w, /assets/${state.role==='ADMIN'?'admin':'viewer'}-avatar-96.webp 96w" sizes="40px" width="48" height="48" loading="lazy" decoding="async" alt="Avatar ${state.role==='ADMIN'?'Administrator':'Viewer'}"><div><strong>${state.role==='ADMIN'?'Administrator':'Viewer'}</strong><span>${state.role==='ADMIN'?'Editor akses penuh':'Akses hanya lihat'}</span></div></div>
      </div>
    </aside>
    <button class="sidebar-backdrop" id="sidebar-backdrop" aria-label="Tutup menu navigasi"></button>
    <main class="main">
      <header class="topbar">
        <button class="icon-button mobile-menu" id="mobile-menu" aria-label="Buka menu navigasi">${icon('menu')}</button>
        <div class="welcome"><span>Selamat datang,</span><strong>${state.role==='ADMIN'?'Administrator':'Viewer'}</strong></div>
        <label class="search" data-tour="search">${icon('search')}<input id="global-search" value="${state.search}" placeholder="Cari nama atau aktivitas…"></label>
        <div class="top-actions">
          <div class="role-switch" data-tour="role" aria-label="Pilih peran"><button data-role="ADMIN" class="${state.role==='ADMIN'?'active':''}">Admin</button><button data-role="VIEWER" class="${state.role==='VIEWER'?'active':''}">Viewer</button></div>
          <button class="icon-button guide-button" id="open-walkthrough" aria-label="Buka panduan" title="Buka panduan">${icon('help')}</button>
        </div>
      </header>
      <div class="content">${content}</div>
    </main>
  </div>`;
}

function pageHead(title, description, actions='') {
  return `<div class="page-head"><div><div class="eyebrow">${state.outlet==='SEMUA'?'Semua outlet':state.outlet}</div><h1>${title}</h1><p>${description}</p></div>${actions}</div>`;
}

function filters(extra='') {
  return `<div class="filter-group" data-tour="filters"><select class="filter" id="outlet-filter" aria-label="Filter outlet"><option value="SEMUA">Semua outlet</option>${state.outlets.filter(o=>o.status!=='INACTIVE').map(o=>`<option value="${o.name.toUpperCase()}" ${state.outlet===o.name.toUpperCase()?'selected':''}>${o.name}</option>`).join('')}</select><input class="filter" id="month-filter" type="month" value="${state.month}" aria-label="Filter bulan">${extra}</div>`;
}

function dashboard() {
  const entries = visibleEntries();
  const searchedEntries = entries.filter(e=>matchesSearch(e.employee.name,e.rule.description,e.employee.outlet,e.rule.category));
  const total = entries.reduce((a,e)=>a+e.totalPoints,0);
  const additions = entries.filter(e=>e.rule.category==='PENAMBAHAN').reduce((a,e)=>a+e.totalPoints,0);
  const achievements = entries.filter(e=>e.rule.category==='PRESTASI').reduce((a,e)=>a+e.totalPoints,0);
  const deductions = entries.filter(e=>e.rule.category==='PENGURANGAN').reduce((a,e)=>a+e.totalPoints,0);
  const people = new Set(entries.map(e=>e.employeeId)).size;
  const metrics = [
    ['Total poin', fmt(total), 'award', '#6c4df6','#eee9ff'],
    ['Poin positif', `+${fmt(additions+achievements)}`, 'trend','#229c68','#dff7ed'],
    ['Pengurangan', fmt(deductions), 'activity','#d05c64','#ffe7e7'],
    ['Karyawan aktif', people, 'users','#3979bb','#e1f2ff']
  ];
  const recapOutlets=state.outlets.filter(o=>o.status!=='INACTIVE'&&(state.outlet==='SEMUA'||o.name.toUpperCase()===state.outlet)).map(outlet=>{
    const assigned=state.employees.filter(e=>e.status==='ACTIVE'&&outletFor(e.id,`${state.month}-01`)?.id===outlet.id&&matchesSearch(e.name,e.position,e.city,outlet.name)).map(employee=>({employee,group:assignmentFor(employee.id,`${state.month}-01`)?.captainGroup||'A',score:entries.filter(x=>x.employeeId===employee.id&&x.outletId===outlet.id).reduce((sum,x)=>sum+x.totalPoints,0)}));
    const groups=['A','B'].map(group=>{const groupEmployees=assigned.filter(x=>x.group===group),members=groupEmployees.filter(x=>x.employee.position!=='KAPTEN').sort((a,b)=>{const priority={KASIR:1,AO:2,TERAPIS:3};return(priority[a.employee.position]||9)-(priority[b.employee.position]||9)||b.score-a.score||a.employee.name.localeCompare(b.employee.name)});return{group,captain:groupEmployees.find(x=>x.employee.position==='KAPTEN'),members,total:members.reduce((sum,x)=>sum+x.score,0)};});
    return{outlet,groups,total:assigned.reduce((sum,x)=>sum+x.score,0)};
  }).filter(item=>!state.search.trim()||item.groups.some(group=>group.captain||group.members.length));
  return shell(`${pageHead('Ringkasan Poin',`Pantau performa tim untuk ${monthLabel()}.`,filters(state.role==='ADMIN'?`<button class="button primary" data-page="entry">${icon('plus')} Input poin</button>`:''))}
    ${state.role==='VIEWER'?`<div class="viewer-note">${icon('lock')} Mode Viewer aktif. Data dapat dilihat, namun perubahan dinonaktifkan.</div>`:''}
    <div class="section-title"><div><h2>Rekapan poin per outlet</h2><p>Struktur Kapten A/B dan anggota tim</p></div><span>${monthLabel()}</span></div>
    <section class="captain-outlet-list">${recapOutlets.map(({outlet,groups,total})=>`<article class="captain-outlet-section" style="--outlet-color:${outlet.color}"><div class="captain-outlet-title"><div>${icon('building')}<div><span>OUTLET</span><h2>${outlet.name}</h2></div></div><div><strong>${total>0?'+':''}${fmt(total)}</strong><small>Total poin anggota</small></div></div><div class="captain-card-grid">${groups.map(({captain,members})=>`<section class="captain-team-card"><div class="captain-card-head"><div><span>KAPTEN</span><h3>${captain?.employee.name||'Belum ditentukan'}</h3></div></div><div class="captain-members"><div class="member-section-label">KASIR & AO</div>${members.filter(x=>['KASIR','AO'].includes(x.employee.position)).map(item=>memberRecapRow(item)).join('')||'<p class="member-empty">Belum ada anggota</p>'}<div class="member-section-label therapist">TERAPIS</div>${members.filter(x=>x.employee.position==='TERAPIS').map(item=>memberRecapRow(item)).join('')||'<p class="member-empty">Belum ada terapis</p>'}</div></section>`).join('')}</div></article>`).join('')}</section>
    <section class="panel dashboard-activity"><div class="panel-head"><div><h2>Aktivitas terbaru</h2><p>Catatan poin yang baru ditambahkan</p></div><button class="button" data-page="activity">Lihat semua</button></div>${activityList(searchedEntries.slice(0,7))}</section>`);
}

function recapPage() {
  const monthNames=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'];
  const years=state.availableYears;
  if(!years.includes(state.recapYear)) state.recapYear=years[0]||state.month.slice(0,4);
  const citySections=['Palu','Makassar'].map(city=>{
    const employees=state.employees.filter(employee=>employee.status==='ACTIVE'&&employee.position!=='KAPTEN'&&employee.city===city&&matchesSearch(employee.name,employee.position,city));
    const rows=employees.map(employee=>{
      const months=monthNames.map((_,index)=>state.annualScores.find(score=>score.employeeId===employee.id&&Number(score.month.slice(5,7))===index+1)?.total||0);
      return {employee,city,months,semesterOne:months.slice(0,6).reduce((sum,value)=>sum+value,0),semesterTwo:months.slice(6).reduce((sum,value)=>sum+value,0),total:months.reduce((sum,value)=>sum+value,0)};
    }).filter(row=>row.total!==0||!state.search.trim()).sort((a,b)=>b.total-a.total||a.employee.name.localeCompare(b.employee.name));
    const total=rows.reduce((sum,row)=>sum+row.total,0);
    const ranked=rows.filter(row=>row.total!==0&&(state.recapPosition==='SEMUA'||row.employee.position===state.recapPosition));
    const leaders=field=>[...ranked].sort((a,b)=>b[field]-a[field]||a.employee.name.localeCompare(b.employee.name)).slice(0,3);
    return {city,rows,total,leadersOne:leaders('semesterOne'),leadersTwo:leaders('semesterTwo')};
  });
  const grandTotal=citySections.reduce((sum,item)=>sum+item.total,0);
  const participants=new Set(state.annualScores.filter(score=>score.total!==0).map(score=>score.employeeId)).size;
  const leader=[...citySections.flatMap(item=>item.rows)].filter(row=>state.recapPosition==='SEMUA'||row.employee.position===state.recapPosition).sort((a,b)=>b.total-a.total)[0];
  const yearControl=`<div class="filter-group"><label class="recap-year-control">Peringkat<select class="filter" id="recap-position"><option value="SEMUA">Semua jabatan</option>${['AO','KASIR','TERAPIS'].map(position=>`<option value="${position}" ${position===state.recapPosition?'selected':''}>${position}</option>`).join('')}</select></label><label class="recap-year-control">Tahun<select class="filter" id="recap-year">${years.map(year=>`<option value="${year}" ${year===state.recapYear?'selected':''}>${year}</option>`).join('')}</select></label></div>`;
  return shell(`${pageHead('Rekapan Poin','Rekap bulanan, total semester, dan peringkat karyawan per kota.',yearControl)}
    <section class="recap-summary-grid"><article><span>TOTAL POIN ${state.recapYear}</span><strong>${grandTotal>0?'+':''}${fmt(grandTotal)}</strong><small>Akumulasi Palu dan Makassar</small></article><article><span>KARYAWAN TERCATAT</span><strong>${participants}</strong><small>Memiliki aktivitas pada tahun ini</small></article><article><span>PERINGKAT TERATAS</span><strong>${leader?.employee.name||'—'}</strong><small>${leader?`${leader.city} · ${fmt(leader.total)} poin`:'Belum ada data'}</small></article></section>
    <div class="annual-recap-list">${citySections.map(section=>`<section class="annual-recap-section"><div class="annual-recap-head"><div><span>REKAPAN POIN</span><h2>${section.city.toUpperCase()} ${state.recapYear}</h2></div><div><strong>${section.total>0?'+':''}${fmt(section.total)}</strong><small>Total poin kota</small></div></div><div class="semester-rank-grid">${[['SEMESTER 1','Jan–Jun',section.leadersOne],['SEMESTER 2','Jul–Des',section.leadersTwo]].map(([title,period,leaders])=>`<article class="semester-rank-card"><div><span>PERINGKAT ${title}</span><small>${period}</small></div>${leaders.map((row,index)=>`<button data-select-employee="${row.employee.id}"><b>${index+1}</b><span class="avatar">${initials(row.employee.name)}</span><span><strong>${row.employee.name}</strong><small>${row.employee.position}</small></span><em>${fmt(title==='SEMESTER 1'?row.semesterOne:row.semesterTwo)}</em></button>`).join('')||'<p>Belum ada poin</p>'}</article>`).join('')}</div><div class="table-wrap annual-recap-wrap"><table class="annual-recap-table"><thead><tr><th>No</th><th>Nama</th>${monthNames.map(month=>`<th>${month}</th>`).join('')}<th>Total 1</th><th>Total 2</th><th>Total</th></tr></thead><tbody>${section.rows.map((row,index)=>`<tr><td>${index+1}</td><td><button data-select-employee="${row.employee.id}"><span class="avatar">${initials(row.employee.name)}</span><span><strong>${row.employee.name}</strong><small>${row.employee.position}</small></span></button></td>${row.months.map(value=>`<td class="${value<0?'negative':value>0?'positive':''}">${value?fmt(value):'—'}</td>`).join('')}<td class="semester-total">${fmt(row.semesterOne)}</td><td class="semester-total">${fmt(row.semesterTwo)}</td><td class="year-total">${fmt(row.total)}</td></tr>`).join('')||`<tr><td colspan="17">${empty('Belum ada data',`Belum ada karyawan ${section.city} untuk ditampilkan.`)}</td></tr>`}</tbody></table></div></section>`).join('')}</div>`);
}

function memberRecapRow(item){return`<button data-select-employee="${item.employee.id}" class="captain-member-row"><span class="avatar">${initials(item.employee.name)}</span><span><small>${item.employee.position}</small><strong>${item.employee.name}</strong></span><b class="${item.score<0?'negative':''}">${item.score>0?'+':''}${fmt(item.score)}</b>${icon('chevron')}</button>`;}

function activityList(entries) {
  if (!entries.length) return empty('Belum ada aktivitas','Data pada periode ini masih kosong.');
  return `<div class="activity-list">${entries.map(e=>`<div class="activity"><span class="dot ${e.totalPoints<0?'negative':''}"></span><div><p><strong>${e.employee.name}</strong> · ${e.rule.description}</p><small>${dateFmt(e.date)} · ${e.employee.outlet||'BELUM DITEMPATKAN'}</small></div><span class="points ${e.totalPoints<0?'negative':''}">${e.totalPoints>0?'+':''}${fmt(e.totalPoints)}</span></div>`).join('')}</div>`;
}

function activityPage() {
  let entries = visibleEntries().filter(e=>!state.search || `${e.employee.name} ${e.rule.description}`.toLowerCase().includes(state.search.toLowerCase()));
  return shell(`${pageHead('Riwayat Aktivitas',`${entries.length} entri ditemukan untuk ${monthLabel()}.`,filters(state.role==='ADMIN'?`<button class="button primary" data-page="entry">${icon('plus')} Input poin</button>`:''))}
    ${state.role==='VIEWER'?`<div class="viewer-note">${icon('lock')} Anda masuk sebagai Viewer. Tombol edit dan hapus disembunyikan.</div>`:''}
    <section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Tanggal</th><th>Karyawan</th><th>Aktivitas</th><th>Kategori</th><th>Kelipatan</th><th>Poin</th>${state.role==='ADMIN'?'<th>Aksi</th>':''}</tr></thead><tbody>${entries.map(e=>`<tr><td>${dateFmt(e.date)}</td><td><div class="employee-cell"><div class="avatar">${initials(e.employee.name)}</div><div><strong>${e.employee.name}</strong><br><small>${e.employee.role} · ${e.employee.outlet||'BELUM DITEMPATKAN'}</small></div></div></td><td>${e.rule.description}${e.entryKind==='AUTO'?'<br><small>Otomatis</small>':''}</td><td><span class="pill ${e.rule.category}">${e.rule.category}</span></td><td>${e.multiplier>1?`${e.multiplier}×`:'—'}</td><td><strong class="${e.totalPoints<0?'score negative':'score'}">${e.totalPoints>0?'+':''}${fmt(e.totalPoints)}</strong></td>${state.role==='ADMIN'?`<td>${e.entryKind==='AUTO'?'<span class="status-chip ACTIVE">OTOMATIS</span>':`<div class="row-actions"><button data-edit="${e.id}" title="Edit">${icon('edit')}</button><button data-void="${e.id}" title="Batalkan">${icon('trash')}</button></div>`}</td>`:''}</tr>`).join('')||`<tr><td colspan="7">${empty('Tidak ada data','Ubah filter atau tambahkan aktivitas baru.')}</td></tr>`}</tbody></table></div></section>`);
}

function scorecardPage() {
  const available = state.employees.filter(e=>e.status==='ACTIVE'&&e.position!=='KAPTEN'&&(state.outlet==='SEMUA'||employeeOutletName(e.id)===state.outlet)&&matchesSearch(e.name,e.position,e.gender,employeeOutletName(e.id)));
  if (!available.find(e=>e.id===state.selectedEmployee) && available[0]) state.selectedEmployee=available[0].id;
  const employee = available.find(e=>e.id===state.selectedEmployee);
  const entries = visibleEntries().filter(e=>e.employeeId===state.selectedEmployee);
  const total = entries.reduce((a,e)=>a+e.totalPoints,0);
  const days = new Date(Number(state.month.slice(0,4)),Number(state.month.slice(5,7)),0).getDate();
  const relevantRules = state.rules.filter(rule=>entries.some(e=>e.ruleId===rule.id));
  const groups = ['PENGURANGAN','PENAMBAHAN','PRESTASI'];
  const pointGuide = groups.map(group=>{
    const rules=state.rules.filter(rule=>rule.status==='ACTIVE'&&rule.category===group&&employee&&(!rule.roles.length||rule.roles.includes(employee.position))&&matchesSearch(rule.description,rule.category,rule.points));
    return `<article class="point-guide-card ${group}"><div class="point-guide-head"><div><span>URAIAN DISIPLIN</span><h3>${group}</h3></div><strong>${rules.length}</strong></div><div class="point-guide-list">${rules.map(rule=>`<div class="point-guide-row"><span>${rule.description}</span><b class="${rule.points<0?'negative':''}">${rule.points>0?'+':''}${fmt(rule.points)}</b></div>`).join('')||'<p class="column-empty">Belum ada uraian.</p>'}</div></article>`;
  }).join('');
  const matrix = groups.map(group=>{
    const rows = relevantRules.filter(r=>r.category===group);
    if (!rows.length) return '';
    return `<tr class="group"><td colspan="${days+2}">${group}</td></tr>${rows.map(rule=>`<tr><td>${rule.description}</td>${Array.from({length:days},(_,i)=>{const value=entries.filter(e=>e.ruleId===rule.id&&Number(e.date.slice(8,10))===i+1).reduce((a,e)=>a+e.totalPoints,0);return `<td class="${value>0?'positive':value<0?'negative':''}">${value?fmt(value):''}</td>`}).join('')}<td class="val">${fmt(entries.filter(e=>e.ruleId===rule.id).reduce((a,e)=>a+e.totalPoints,0))}</td></tr>`).join('')}`;
  }).join('');
  return shell(`${pageHead('Poin Individu','Scorecard bulanan dengan tampilan harian seperti sheet POIN.',filters(`<select class="filter" id="employee-filter">${available.map(e=>`<option value="${e.id}" ${e.id===state.selectedEmployee?'selected':''}>${e.name}</option>`).join('')}</select>`))}
    ${employee?`<section class="panel"><div class="scorecard-head"><div class="avatar">${initials(employee.name)}</div><div><h2>${employee.name}</h2><p>${employee.position} · ${employee.gender} · ${employeeOutletName(employee.id)}</p></div><div class="scorecard-total"><strong>${total>0?'+':''}${fmt(total)}</strong><span>POIN TERCAPAI</span></div></div><div class="table-wrap">${matrix?`<table class="matrix"><thead><tr><th>Uraian disiplin</th>${Array.from({length:days},(_,i)=>`<th>${i+1}</th>`).join('')}<th>Total</th></tr></thead><tbody>${matrix}</tbody></table>`:empty('Belum ada poin','Belum ada catatan untuk karyawan pada periode ini.')}</div></section>`:empty('Karyawan tidak ditemukan','Pilih outlet lain untuk melihat data.')}<div class="section-title point-guide-title"><div><h2>Daftar Uraian Disiplin ${employee?`· ${employee.position}`:''}</h2><p>Referensi uraian dan nilai dari sheet ${employee?.name||'POIN'} sesuai jabatan</p></div></div><section class="point-guide-grid">${pointGuide}</section>`);
}

function entryPage() {
  if (state.role !== 'ADMIN') return shell(`${pageHead('Input Poin','Form ini hanya tersedia untuk Admin.')}<div class="viewer-note">${icon('lock')} Akses ditolak. Ubah peran ke Admin untuk membuat atau mengubah data.</div>${empty('Mode hanya lihat','Viewer tidak memiliki izin untuk mengelola poin.')}`);
  const rules=state.rules.filter(r=>r.status==='ACTIVE'&&(state.pointCategory==='SEMUA'||r.category===state.pointCategory)&&(!state.search||r.description.toLowerCase().includes(state.search.toLowerCase())));
  const tabs=['SEMUA','PENGURANGAN','PENAMBAHAN','PRESTASI'];
  const date=state.entryDate||new Date().toISOString().slice(0,10),offToday=state.daysOff.filter(item=>item.date===date);
  return shell(`${pageHead('Input Poin Harian','Pilih kartu aktivitas, lalu tentukan satu atau beberapa karyawan.',`<button class="button" data-page="activity">Riwayat</button>`)}
    <section class="day-off-panel"><div><span>STATUS KEHADIRAN</span><h2>Tandai Karyawan OFF</h2><p>Semua poin harian otomatis pada tanggal ini akan dihentikan.</p></div><div class="day-off-input"><input id="day-off-search" list="day-off-options" placeholder="Ketik nama karyawan…" autocomplete="off"><input class="inline-entry-date" data-entry-date type="date" value="${date}" aria-label="Tanggal OFF"><datalist id="day-off-options">${state.employees.filter(e=>e.status==='ACTIVE'&&e.position!=='KAPTEN'&&!offToday.some(x=>x.employeeId===e.id)).map(e=>`<option value="${e.name}" label="${e.position}"></option>`).join('')}</datalist><button class="button" id="save-day-off">Tandai OFF</button></div><div class="day-off-list">${offToday.map(item=>`<span>${item.employee.name}<button data-restore-off="${item.id}">Pulihkan</button></span>`).join('')||'<small>Belum ada karyawan OFF pada tanggal ini.</small>'}</div></section>
    <div class="category-tabs">${tabs.map(t=>`<button data-category="${t}" class="${state.pointCategory===t?'active':''}">${t==='SEMUA'?'Semua Poin':t}</button>`).join('')}</div>
    <div class="point-board">${rules.map((r,i)=>pointEntryCard(r,i)).join('')||empty('Tidak ada kartu poin','Ubah kategori atau kata pencarian.')}</div>`);
}

function pointEntryCard(rule,index){
  const colors={PENGURANGAN:'#ffd8dc',PENAMBAHAN:'#d4ecff',PRESTASI:'#ffe9bd'},selected=state.cardSelections[rule.id]||{};
  const eligible=state.employees.filter(e=>e.status==='ACTIVE'&&(!rule.roles.length||rule.roles.includes(e.position)));
  const selectedDate=state.entryDate||new Date().toISOString().slice(0,10),excluded=state.autoExclusions.filter(e=>e.ruleId===rule.id&&e.date===selectedDate);
  const rows=Object.entries(selected).map(([id,qty])=>{const e=state.employees.find(x=>x.id===id);return e?`<div class="selected-person"><div class="avatar">${initials(e.name)}</div><div><strong>${e.name}</strong><small>${e.position} · ${employeeOutletName(e.id,state.entryDate||new Date().toISOString().slice(0,10))}</small></div>${rule.isMultipliable?`<label>Qty <input type="number" min="1" value="${qty}" data-card-qty="${rule.id}" data-employee="${e.id}"></label>`:''}<span>${rule.points>0?'+':''}${fmt(rule.points*(rule.isMultipliable?qty:1))}</span><button data-card-remove="${rule.id}" data-employee="${e.id}">×</button></div>`:''}).join('');
  const total=Object.values(selected).reduce((a,q)=>a+rule.points*(rule.isMultipliable?q:1),0);
  const excludedRows=rule.autoDaily&&excluded.length?`<div class="auto-exclusion-list"><small>POIN OTOMATIS DIHAPUS</small>${excluded.map(item=>`<div class="auto-exclusion-row"><span>${item.employee.name}</span><button data-restore-auto="${item.id}">Pulihkan</button></div>`).join('')}</div>`:'';
  const choices=eligible.filter(e=>!selected[e.id]&&!excluded.some(x=>x.employeeId===e.id));
  return `<article class="point-entry-card ${rule.autoDaily?'auto-daily-card':''}" style="--card-color:${colors[rule.category]};--delay:${index*20}ms"><div class="point-card-head"><div><span class="pill ${rule.category}">${rule.category}</span><h3>${rule.description}</h3></div><strong>${rule.points>0?'+':''}${fmt(rule.points)}</strong></div><p>${rule.autoDaily?'Poin terisi otomatis. Pilih karyawan untuk menghapus poin pada tanggal tersebut.':rule.isMultipliable?'Nilai dapat dikalikan dengan quantity.':'Multiplier otomatis ditetapkan ke 1.'}</p><div class="point-card-input-row"><div class="employee-search-picker">${icon('search')}<input type="search" list="employee-options-${rule.id}" data-card-employee-search="${rule.id}" placeholder="${rule.autoDaily?'Cari karyawan untuk dihapus…':'Ketik nama karyawan…'}" autocomplete="off"><datalist id="employee-options-${rule.id}">${choices.map(e=>`<option value="${e.name}" label="${e.position} · ${employeeOutletName(e.id)}"></option>`).join('')}</datalist></div><input class="inline-entry-date" data-entry-date type="date" value="${selectedDate}" aria-label="Tanggal poin ${rule.description}"></div><div class="selected-people">${rows}</div>${excludedRows}<div class="point-card-footer"><span>${Object.keys(selected).length} karyawan ${rule.autoDaily?'dipilih':`· <b>${total>0?'+':''}${fmt(total)}</b>`}</span><button class="button" data-save-card="${rule.id}" ${Object.keys(selected).length?'':'disabled'}>${rule.autoDaily?'Hapus poin otomatis':'Simpan poin'}</button></div></article>`;
}

function employeesPage(){
  const f=state.employeeFilters;
  const employees=state.employees.filter(e=>(!state.search||e.name.toLowerCase().includes(state.search.toLowerCase()))&&(f.position==='SEMUA'||e.position===f.position)&&(f.gender==='SEMUA'||e.gender===f.gender)&&(f.city==='SEMUA'||e.city===f.city)&&(f.status==='SEMUA'||e.status===f.status)&&(f.outlet==='SEMUA'||employeeOutletName(e.id)===f.outlet));
  const headerFilter=(id,label,values,current)=>`<span class="filterable-heading"><span>${label}</span><details class="table-filter" ${current!=='SEMUA'?'data-active="true"':''}><summary title="Filter ${label}" aria-label="Filter ${label}">${icon('menu')}</summary><div><select id="${id}" aria-label="Filter ${label}"><option value="SEMUA">Semua ${label.toLowerCase()}</option>${values.map(value=>`<option value="${value}" ${current===value?'selected':''}>${value}</option>`).join('')}</select></div></details></span>`;
  const outletValues=[...state.outlets.filter(o=>o.status!=='INACTIVE').map(o=>o.name.toUpperCase()),'BELUM DITEMPATKAN'];
  return shell(`${pageHead('Manajemen Karyawan',`${employees.length} karyawan ditampilkan. Gunakan ikon filter pada judul kolom.`,state.role==='ADMIN'?`<button class="button primary" id="add-employee">${icon('plus')} Tambah karyawan</button>`:'')}${state.role==='VIEWER'?`<div class="viewer-note">${icon('lock')} Data karyawan ditampilkan read-only.</div>`:''}<section class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Karyawan</th><th>${headerFilter('employee-position-filter','Jabatan',['KASIR','AO','TERAPIS','KAPTEN'],f.position)}</th><th>${headerFilter('employee-gender-filter','Gender',['PRIA','WANITA'],f.gender)}</th><th>${headerFilter('employee-city-filter','Kota',['Palu','Makassar'],f.city)}</th><th>${headerFilter('employee-status-filter','Status',['ACTIVE','INACTIVE'],f.status)}</th><th>${headerFilter('employee-outlet-filter',`Outlet ${monthLabel()}`,outletValues,f.outlet)}</th>${state.role==='ADMIN'?'<th>Aksi</th>':''}</tr></thead><tbody>${employees.map(e=>`<tr><td><div class="employee-cell"><div class="avatar">${initials(e.name)}</div><strong>${e.name}</strong></div></td><td>${e.position}</td><td>${e.gender}</td><td>${e.city||'—'}</td><td><span class="status-chip ${e.status}">${e.status}</span></td><td>${employeeOutletName(e.id)}</td>${state.role==='ADMIN'?`<td><button class="icon-button" data-employee-edit="${e.id}">${icon('edit')}</button></td>`:''}</tr>`).join('')||`<tr><td colspan="7">${empty('Karyawan tidak ditemukan','Ubah filter kolom untuk menampilkan data.')}</td></tr>`}</tbody></table></div></section>`);
}

function outletsPage(){
  const month=state.rotationMonth||state.month,allEmployees=state.employees.filter(e=>e.status==='ACTIVE'),employees=allEmployees.filter(e=>matchesSearch(e.name,e.position,e.gender,e.city,employeeOutletName(e.id,`${month}-01`))),activeOutlets=state.outlets.filter(o=>o.status!=='INACTIVE'&&matchesSearch(o.name,o.city));
  if(!Object.keys(state.rotationDraft).length)allEmployees.forEach(e=>{const assignment=assignmentFor(e.id,`${month}-01`);state.rotationDraft[e.id]={outletId:assignment?.outletId||'',captainGroup:assignment?.captainGroup||'A'};});
  const unassigned=employees.filter(e=>!state.rotationDraft[e.id]?.outletId);
  return shell(`${pageHead(state.role==='ADMIN'?'Rotasi & Outlet':'Ringkasan Outlet','Atur struktur outlet, kapten, dan anggota tim.',`<div class="filter-group"><input id="rotation-month" class="filter" type="month" value="${month}">${state.role==='ADMIN'?`<button id="add-outlet" class="button">${icon('plus')} Outlet</button><button id="save-rotation" class="button primary">Simpan rotasi</button>`:''}</div>`)}${state.role==='VIEWER'?`<div class="viewer-note">${icon('lock')} Struktur outlet ditampilkan dalam mode read-only.</div>`:''}${unassigned.length?`<section class="rotation-outlet unassigned-outlet"><div class="rotation-outlet-head"><div>${icon('users')}<div><small>KARYAWAN</small><h2>Belum ditempatkan</h2></div></div><strong>${unassigned.length} orang</strong></div><div class="rotation-members unassigned-grid">${unassigned.map(e=>`<div class="rotation-member"><div class="avatar">${initials(e.name)}</div><div><strong>${e.name}</strong><small>${e.position} · ${e.gender} · ${e.city||'Kota belum diisi'}</small></div></div>`).join('')}</div></section>`:''}<div class="rotation-outlet-list">${activeOutlets.map(o=>`<section class="rotation-outlet" style="--outlet:${o.color}"><div class="rotation-outlet-head"><div>${icon('building')}<div><small>OUTLET · ${o.city||'KOTA BELUM DIATUR'}</small><h2>${o.name}</h2></div></div>${state.role==='ADMIN'?`<div class="row-actions"><button data-outlet-edit="${o.id}" title="Edit outlet">${icon('edit')}</button><button data-outlet-delete="${o.id}" title="Nonaktifkan outlet">${icon('trash')}</button></div>`:''}</div><div class="rotation-captain-grid">${['A','B'].map(group=>{const team=employees.filter(e=>state.rotationDraft[e.id]?.outletId===o.id&&state.rotationDraft[e.id]?.captainGroup===group),captain=team.find(e=>e.position==='KAPTEN'),members=team.filter(e=>e.position!=='KAPTEN');return`<article class="rotation-captain-card"><div class="rotation-captain-title"><div><span>KAPTEN</span><strong>${captain?.name||'Belum ditentukan'}</strong></div>${state.role==='ADMIN'?`<button class="captain-edit-button" data-captain-edit="${o.id}" data-group="${group}" title="Ganti kapten">${icon('edit')}</button>`:''}<small>${members.length} anggota</small></div>${state.role==='ADMIN'?`<div class="member-quick-add">${icon('search')}<input data-member-search="${o.id}" data-group="${group}" list="member-options-${o.id}-${group}" placeholder="Ketik nama anggota…"><datalist id="member-options-${o.id}-${group}">${allEmployees.filter(e=>e.position!=='KAPTEN'&&!members.some(m=>m.id===e.id)).map(e=>`<option value="${e.name}" label="${e.position}"></option>`).join('')}</datalist></div>`:''}<div class="rotation-members">${members.map(e=>`<div class="rotation-member"><div class="avatar">${initials(e.name)}</div><div><strong>${e.name}</strong><small>${e.position} · ${e.gender} · ${e.city||'—'}</small></div>${state.role==='ADMIN'?`<button class="member-remove" data-member-remove="${e.id}" title="Keluarkan dari tim">×</button>`:''}</div>`).join('')||'<p class="column-empty">Belum ada anggota</p>'}</div></article>`}).join('')}</div></section>`).join('')}</div>`);
}

function rulesPage(){
  const groups=['PENGURANGAN','PENAMBAHAN','PRESTASI'];
  const filteredRules=state.rules.filter(r=>matchesSearch(r.description,r.category,r.roles.join(' '),r.frequency,r.status));
  return shell(`${pageHead('Point Master','Atur kategori, nilai dasar, dan kemampuan multiplier.',state.role==='ADMIN'?`<button class="button primary" id="add-rule">${icon('plus')} Tambah point type</button>`:'')}${state.role==='VIEWER'?`<div class="viewer-note">${icon('lock')} Point Master ditampilkan read-only.</div>`:''}<div class="master-grid">${groups.map(group=>`<section class="master-column"><div class="master-head ${group}"><span>${filteredRules.filter(r=>r.category===group&&r.status==='ACTIVE').length}</span><h2>${group}</h2></div>${filteredRules.filter(r=>r.category===group).map(r=>`<article class="master-card"><div><h3>${r.description}</h3><p>${r.roles.length?r.roles.join(', '):'Semua jabatan'} · ${r.frequency}</p></div><strong class="${r.points<0?'negative':''}">${r.points>0?'+':''}${fmt(r.points)}</strong><div class="master-meta"><span>${r.isMultipliable?'× Multipliable':'×1 Fixed'}</span><span class="status-chip ${r.status}">${r.status}</span>${state.role==='ADMIN'?`<button data-rule-edit="${r.id}">${icon('edit')}</button>`:''}</div></article>`).join('')}</section>`).join('')}</div>`);
}

function empty(title,text){return `<div class="empty">${icon('empty')}<h3>${title}</h3><p>${text}</p></div>`}

function walkthroughSteps(){
  const mobile=window.matchMedia('(max-width:760px)').matches;
  const navigation=mobile?[
    {target:'#mobile-menu',title:'Buka menu',text:'Tekan tombol ini kapan saja untuk membuka menu navigasi.'},
    {target:'[data-tour="sidebar"]',title:'Navigasi utama',text:'Di dalam menu ini tersedia Dashboard, Rekapan Poin, Poin Individu, dan Riwayat Aktivitas.'},
  ]:[
    {target:'[data-tour="sidebar"]',title:'Navigasi utama',text:'Gunakan menu ini untuk membuka Dashboard, Rekapan Poin, Poin Individu, dan Riwayat Aktivitas.'},
  ];
  const common=[...navigation,
    {target:'[data-tour="search"]',title:'Cari dengan cepat',text:'Ketik nama karyawan atau aktivitas untuk langsung menyaring informasi yang tampil.'},
    {target:'[data-tour="filters"]',title:'Pilih periode',text:'Atur outlet serta bulan yang ingin dilihat. Seluruh ringkasan akan menyesuaikan pilihan ini.'},
  ];
  if(state.role==='ADMIN')return [...common,
    {target:'[data-page="entry"]',title:'Input poin',text:'Catat poin melalui kartu, pilih karyawan, isi quantity bila tersedia, atau tandai karyawan OFF.'},
    {target:'[data-page="employees"]',title:'Kelola karyawan',text:'Tambah dan edit data karyawan, termasuk jabatan, gender, kota, status, dan outlet.'},
    {target:'[data-page="outlets"]',title:'Rotasi outlet',text:'Atur kapten, anggota tim, kota outlet, dan rotasi bulanan dari menu ini.'},
    {target:'[data-page="rules"]',title:'Point Master',text:'Kelola nilai poin, quantity, serta aturan otomatis tanpa perlu mengubah kode.'},
  ];
  return [...common,
    {target:'.captain-outlet-title',title:'Ringkasan tim',text:'Setiap kartu menampilkan outlet, kapten, anggota, dan poin yang dicapai pada periode terpilih.'},
    {target:'[data-tour="role"]',title:'Mode Viewer dan Admin',text:'Semua pengguna masuk sebagai Viewer. Tekan Admin dan masukkan password untuk membuka fitur pengelolaan.'},
  ];
}
function closeWalkthrough(markSeen=true){
  state.tourActive=false;state.tourStep=0;document.querySelector('.walkthrough-layer')?.remove();
  document.querySelector('#sidebar')?.classList.remove('open','walkthrough-open');document.querySelector('#sidebar-backdrop')?.classList.remove('open');
  if(markSeen)localStorage.setItem('walkthroughSeen-v1','true');
  if(state.tourRestoreCollapsed){state.sidebarCollapsed=true;state.tourRestoreCollapsed=false;render();}
}
function updateWalkthroughPosition(){
  const layer=document.querySelector('.walkthrough-layer'),focus=layer?.querySelector('.walkthrough-focus');if(!layer||!focus)return;
  const target=document.querySelector(layer.dataset.target),rect=target?.getBoundingClientRect();
  if(!rect||rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth){focus.hidden=true;return;}
  const left=Math.max(2,rect.left-5),top=Math.max(2,rect.top-5),right=Math.min(innerWidth-2,rect.right+5),bottom=Math.min(innerHeight-2,rect.bottom+5);
  focus.hidden=false;Object.assign(focus.style,{left:`${left}px`,top:`${top}px`,width:`${Math.max(0,right-left)}px`,height:`${Math.max(0,bottom-top)}px`});
}
function showWalkthrough(){
  document.querySelector('.walkthrough-layer')?.remove();if(!state.tourActive)return;
  const steps=walkthroughSteps();state.tourStep=Math.min(state.tourStep,steps.length-1);const step=steps[state.tourStep];
  const mobile=window.matchMedia('(max-width:760px)').matches,sidebar=document.querySelector('#sidebar'),backdrop=document.querySelector('#sidebar-backdrop');
  if(mobile&&step.target==='[data-tour="sidebar"]'){sidebar?.classList.add('open','walkthrough-open');backdrop?.classList.add('open');}else if(mobile){sidebar?.classList.remove('open','walkthrough-open');backdrop?.classList.remove('open');}
  const target=document.querySelector(step.target);
  const layer=document.createElement('div');layer.className='walkthrough-layer';layer.dataset.target=step.target;
  const focus=target?'<div class="walkthrough-focus"></div>':'';
  layer.innerHTML=`${focus}<section class="walkthrough-card" role="dialog" aria-modal="true" aria-label="Panduan penggunaan"><div class="walkthrough-progress"><span>LANGKAH ${state.tourStep+1} DARI ${steps.length}</span><button type="button" data-tour-close aria-label="Tutup panduan">×</button></div><h2>${step.title}</h2><p>${step.text}</p><div class="walkthrough-dots">${steps.map((_,i)=>`<i class="${i===state.tourStep?'active':''}"></i>`).join('')}</div><div class="walkthrough-actions"><button class="button" type="button" data-tour-skip>Lewati</button><div>${state.tourStep?'<button class="button" type="button" data-tour-prev>Sebelumnya</button>':''}<button class="button purple" type="button" data-tour-next>${state.tourStep===steps.length-1?'Selesai':'Berikutnya'}</button></div></div></section>`;
  document.body.append(layer);
  updateWalkthroughPosition();
  layer.querySelector('[data-tour-close]').onclick=()=>closeWalkthrough();layer.querySelector('[data-tour-skip]').onclick=()=>closeWalkthrough();
  layer.querySelector('[data-tour-prev]')?.addEventListener('click',()=>{state.tourStep--;showWalkthrough()});
  layer.querySelector('[data-tour-next]').onclick=()=>{if(state.tourStep===steps.length-1)closeWalkthrough();else{state.tourStep++;showWalkthrough()}};
}
function render(){if(state.tourActive&&!window.matchMedia('(max-width:760px)').matches&&state.sidebarCollapsed){state.tourRestoreCollapsed=true;state.sidebarCollapsed=false;}const views={dashboard,recap:recapPage,activity:activityPage,scorecard:scorecardPage,entry:entryPage,employees:employeesPage,outlets:outletsPage,rules:rulesPage};document.querySelector('.walkthrough-layer')?.remove();document.querySelector('#app').innerHTML=(views[state.page]||dashboard)();bind();requestAnimationFrame(showWalkthrough);}
function selectCardEmployee(input){
  const ruleId=input.dataset.cardEmployeeSearch,employee=state.employees.find(e=>e.name.toLowerCase()===input.value.trim().toLowerCase());
  if(!employee){input.setCustomValidity('Pilih nama karyawan dari daftar.');input.reportValidity();return;}
  input.setCustomValidity('');state.cardSelections[ruleId]??={};state.cardSelections[ruleId][employee.id]=1;render();
  const quantity=document.querySelector(`[data-card-qty="${ruleId}"][data-employee="${employee.id}"]`);
  if(quantity){quantity.focus();quantity.select();quantity.scrollIntoView({behavior:'smooth',block:'center'});}
}

function bind(){
  document.querySelector('#open-walkthrough')?.addEventListener('click',()=>{state.tourStep=0;state.tourActive=true;if(!window.matchMedia('(max-width:760px)').matches&&state.sidebarCollapsed){state.tourRestoreCollapsed=true;state.sidebarCollapsed=false;render();return;}showWalkthrough()});
  document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>{state.page=btn.dataset.page;state.editingId=null;render()}));
  document.querySelectorAll('input[type="month"],input[type="date"]').forEach(input=>input.addEventListener('click',()=>{if(typeof input.showPicker==='function'){try{input.showPicker()}catch(_){/* Native picker may already be open. */}}}));
  document.querySelectorAll('[data-role]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.role==='ADMIN'){if(state.role!=='ADMIN')adminPasswordModal();return;}state.role='VIEWER';state.adminToken=null;if(['entry','employees','rules'].includes(state.page))state.page='dashboard';render();toast('Mode Viewer aktif.');}));
  document.querySelector('#mobile-menu')?.addEventListener('click',()=>{document.querySelector('#sidebar').classList.toggle('open');document.querySelector('#sidebar-backdrop').classList.toggle('open');});
  document.querySelector('#sidebar-collapse')?.addEventListener('click',()=>{if(window.matchMedia('(max-width:760px)').matches){document.querySelector('#sidebar').classList.remove('open');document.querySelector('#sidebar-backdrop').classList.remove('open');return;}state.sidebarCollapsed=!state.sidebarCollapsed;localStorage.setItem('sidebarCollapsed',String(state.sidebarCollapsed));render()});
  document.querySelector('#sidebar-backdrop')?.addEventListener('click',()=>{document.querySelector('#sidebar').classList.remove('open');document.querySelector('#sidebar-backdrop').classList.remove('open');});
  document.querySelector('#outlet-filter')?.addEventListener('change',e=>{state.outlet=e.target.value;render()});
  document.querySelector('#month-filter')?.addEventListener('change',async e=>{state.month=e.target.value;state.rotationDraft={};await load();render()});
  document.querySelector('#recap-year')?.addEventListener('change',async e=>{state.recapYear=e.target.value;await load();render()});
  document.querySelector('#recap-position')?.addEventListener('change',e=>{state.recapPosition=e.target.value;render()});
  document.querySelector('#employee-filter')?.addEventListener('change',e=>{state.selectedEmployee=e.target.value;render()});
  document.querySelectorAll('[data-select-employee]').forEach(button=>button.addEventListener('click',()=>{state.selectedEmployee=button.dataset.selectEmployee;state.page='scorecard';render();}));
  document.querySelector('#global-search')?.addEventListener('input',e=>{state.search=e.target.value;render();const input=document.querySelector('#global-search');input?.focus();input?.setSelectionRange(state.search.length,state.search.length)});
  document.querySelectorAll('[data-edit]').forEach(b=>b.addEventListener('click',()=>editEntryModal(state.entries.find(e=>e.id===b.dataset.edit))));
  document.querySelectorAll('[data-void]').forEach(btn=>btn.addEventListener('click',()=>confirmVoid(btn.dataset.void)));
  document.querySelectorAll('[data-category]').forEach(b=>b.addEventListener('click',()=>{state.pointCategory=b.dataset.category;render()}));
  document.querySelectorAll('[data-entry-date]').forEach(input=>input.addEventListener('change',e=>{const scrollY=window.scrollY;state.entryDate=e.target.value;render();requestAnimationFrame(()=>window.scrollTo({top:scrollY,behavior:'instant'}));}));
  document.querySelectorAll('[data-card-employee-search]').forEach(input=>{input.addEventListener('change',()=>selectCardEmployee(input));input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();selectCardEmployee(input);}})});
  document.querySelectorAll('[data-card-remove]').forEach(b=>b.addEventListener('click',()=>{delete state.cardSelections[b.dataset.cardRemove][b.dataset.employee];render()}));
  document.querySelectorAll('[data-card-qty]').forEach(i=>i.addEventListener('change',()=>{state.cardSelections[i.dataset.cardQty][i.dataset.employee]=Math.max(1,Number(i.value||1));render()}));
  document.querySelectorAll('[data-save-card]').forEach(b=>b.addEventListener('click',()=>savePointCard(b.dataset.saveCard)));
  document.querySelectorAll('[data-restore-auto]').forEach(b=>b.addEventListener('click',()=>restoreAutomaticPoint(b.dataset.restoreAuto)));
  document.querySelector('#save-day-off')?.addEventListener('click',saveDayOff);document.querySelectorAll('[data-restore-off]').forEach(b=>b.addEventListener('click',()=>restoreDayOff(b.dataset.restoreOff)));
  document.querySelector('#add-employee')?.addEventListener('click',()=>employeeModal());document.querySelectorAll('[data-employee-edit]').forEach(b=>b.addEventListener('click',()=>employeeModal(state.employees.find(e=>e.id===b.dataset.employeeEdit))));
  [['#employee-position-filter','position'],['#employee-gender-filter','gender'],['#employee-city-filter','city'],['#employee-status-filter','status'],['#employee-outlet-filter','outlet']].forEach(([selector,key])=>document.querySelector(selector)?.addEventListener('change',e=>{state.employeeFilters[key]=e.target.value;render()}));
  document.querySelector('#add-rule')?.addEventListener('click',()=>ruleModal());document.querySelectorAll('[data-rule-edit]').forEach(b=>b.addEventListener('click',()=>ruleModal(state.rules.find(r=>r.id===b.dataset.ruleEdit))));
  document.querySelector('#rotation-month')?.addEventListener('change',e=>{state.rotationMonth=e.target.value;state.rotationDraft={};render()});document.querySelectorAll('[data-rotate-outlet]').forEach(s=>s.addEventListener('change',()=>{state.rotationDraft[s.dataset.rotateOutlet].outletId=s.value;render()}));document.querySelectorAll('[data-rotate-group]').forEach(s=>s.addEventListener('change',()=>{state.rotationDraft[s.dataset.rotateGroup].captainGroup=s.value;render()}));document.querySelector('#save-rotation')?.addEventListener('click',saveRotation);document.querySelector('#add-outlet')?.addEventListener('click',()=>outletModal());document.querySelectorAll('[data-outlet-edit]').forEach(b=>b.addEventListener('click',()=>outletModal(state.outlets.find(o=>o.id===b.dataset.outletEdit))));document.querySelectorAll('[data-outlet-delete]').forEach(b=>b.addEventListener('click',()=>confirmOutletDelete(state.outlets.find(o=>o.id===b.dataset.outletDelete))));
  document.querySelectorAll('[data-member-search]').forEach(input=>input.addEventListener('change',()=>{const employee=state.employees.find(e=>e.name.toLowerCase()===input.value.trim().toLowerCase()&&e.position!=='KAPTEN');if(!employee){input.setCustomValidity('Pilih nama anggota dari daftar.');input.reportValidity();return;}state.rotationDraft[employee.id]={outletId:input.dataset.memberSearch,captainGroup:input.dataset.group};render()}));document.querySelectorAll('[data-member-remove]').forEach(b=>b.addEventListener('click',()=>{state.rotationDraft[b.dataset.memberRemove].outletId='';render()}));document.querySelectorAll('[data-captain-edit]').forEach(b=>b.addEventListener('click',()=>captainModal(b.dataset.captainEdit,b.dataset.group)));
}

function adjustAnnualScore(employeeId,date,delta){if(!date.startsWith(`${state.recapYear}-`)||!delta)return;const month=date.slice(0,7),score=state.annualScores.find(item=>item.employeeId===employeeId&&item.month===month);if(score)score.total=Number(score.total||0)+Number(delta);else state.annualScores.push({employeeId,month,total:Number(delta)});}
async function savePointCard(ruleId){
  if(pendingPointSaves.has(ruleId))return;
  const selected=state.cardSelections[ruleId]||{},items=Object.entries(selected).map(([employeeId,quantity])=>({employeeId,quantity}));
  if(!items.length)return;
  const date=state.entryDate||new Date().toISOString().slice(0,10),button=document.querySelector(`[data-save-card="${ruleId}"]`),originalLabel=button?.textContent;
  pendingPointSaves.add(ruleId);
  if(button){button.disabled=true;button.setAttribute('aria-busy','true');button.textContent='Menyimpan…';}
  try{
    const result=await api('/api/entry-batches',{method:'POST',body:JSON.stringify({date,ruleId,items})});
    delete state.cardSelections[ruleId];
    if(result.action==='REMOVED'){
      for(const exclusion of result.entries){const removed=state.entries.filter(entry=>entry.employeeId===exclusion.employeeId&&entry.ruleId===exclusion.ruleId&&entry.date===exclusion.date&&entry.entryKind==='AUTO');removed.forEach(entry=>adjustAnnualScore(entry.employeeId,entry.date,-entry.totalPoints));state.entries=state.entries.filter(entry=>!removed.includes(entry));state.autoExclusions.unshift(exclusion);}
    }else if(result.action==='ADDED'){
      for(const entry of result.entries){if(entry.date.startsWith(state.month))state.entries.unshift(entry);adjustAnnualScore(entry.employeeId,entry.date,entry.totalPoints);}
    }else{
      await load();
    }
    render();
    toast(result.action==='REMOVED'?`${result.entries.length} poin otomatis berhasil dihapus.`:result.action==='CANCELLED'?'Poin target berhasil dibatalkan.':`${result.entries.length} poin berhasil dicatat.`);
  }catch(error){
    if(button){button.disabled=false;button.removeAttribute('aria-busy');button.textContent=originalLabel;}
    toast(error.message,'error');
  }finally{
    pendingPointSaves.delete(ruleId);
  }
}
async function restoreAutomaticPoint(id){try{await api(`/api/entries/${id}`,{method:'DELETE'});await load();render();toast('Poin otomatis berhasil dipulihkan.');}catch(error){toast(error.message,'error')}}
async function saveDayOff(){const input=document.querySelector('#day-off-search'),employee=state.employees.find(e=>e.name.toLowerCase()===input.value.trim().toLowerCase());if(!employee){input.setCustomValidity('Pilih nama karyawan dari daftar.');input.reportValidity();return;}try{await api('/api/days-off',{method:'POST',body:JSON.stringify({employeeId:employee.id,date:state.entryDate||new Date().toISOString().slice(0,10)})});await load();render();toast(`${employee.name} ditandai OFF.`);}catch(error){toast(error.message,'error')}}
async function restoreDayOff(id){try{await api(`/api/days-off/${id}`,{method:'DELETE'});await load();render();toast('Status OFF dibatalkan dan poin otomatis dipulihkan.');}catch(error){toast(error.message,'error')}}

async function saveRotation(){try{await api('/api/assignments',{method:'POST',body:JSON.stringify({month:state.rotationMonth||state.month,assignments:Object.entries(state.rotationDraft).map(([employeeId,value])=>({employeeId,outletId:value.outletId,captainGroup:value.captainGroup}))})});state.rotationDraft={};await load();render();toast('Rotasi outlet dan grup kapten berhasil disimpan.');}catch(error){toast(error.message,'error')}}

function modalFrame(title,content,saveLabel='Simpan'){const host=document.createElement('div');host.className='modal-backdrop';host.innerHTML=`<div class="modal modal-wide"><h3>${title}</h3>${content}<div class="modal-actions"><button class="button" data-cancel>Tutup</button><button class="button purple" data-submit>${saveLabel}</button></div></div>`;document.body.append(host);host.querySelector('[data-cancel]').onclick=()=>host.remove();host.onclick=e=>{if(e.target===host)host.remove()};return host;}

function adminPasswordModal(){const host=modalFrame('Masuk sebagai Admin',`<p>Masukkan password Admin untuk membuka input dan pengelolaan data.</p><form id="admin-auth-form"><div class="field"><label for="admin-password">Password Admin</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required placeholder="Masukkan password"><small id="auth-error" class="auth-error"></small></div></form>`,'Buka mode Admin');const input=host.querySelector('#admin-password');input.focus();const submit=async()=>{const password=input.value;if(!password){input.focus();return;}host.querySelector('[data-submit]').disabled=true;try{const result=await api('/api/auth/admin',{method:'POST',body:JSON.stringify({password})});state.adminToken=result.token;state.role='ADMIN';host.remove();render();toast('Mode Admin berhasil dibuka.');}catch(error){const message=host.querySelector('#auth-error');message.textContent=error.message;input.select();host.querySelector('[data-submit]').disabled=false;}};host.querySelector('[data-submit]').onclick=submit;host.querySelector('form').addEventListener('submit',e=>{e.preventDefault();submit();});}

function employeeModal(employee){const activeOutlets=state.outlets.filter(o=>o.status!=='INACTIVE');const host=modalFrame(employee?'Edit Karyawan':'Tambah Karyawan',`<form id="employee-form"><div class="form-grid"><div class="field full"><label>Nama</label><input name="name" required value="${employee?.name||''}"></div><div class="field"><label>Jabatan</label><select name="position">${['KASIR','AO','TERAPIS','KAPTEN'].map(x=>`<option ${employee?.position===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Gender</label><select name="gender"><option ${employee?.gender==='PRIA'?'selected':''}>PRIA</option><option ${employee?.gender==='WANITA'?'selected':''}>WANITA</option></select></div><div class="field"><label>Kota</label><select name="city"><option value="">Pilih kota…</option><option value="Palu" ${employee?.city==='Palu'?'selected':''}>Palu</option><option value="Makassar" ${employee?.city==='Makassar'?'selected':''}>Makassar</option></select></div><div class="field"><label>Status</label><select name="status"><option ${employee?.status==='ACTIVE'?'selected':''}>ACTIVE</option><option ${employee?.status==='INACTIVE'?'selected':''}>INACTIVE</option></select></div>${employee?'':`<div class="field"><label>Outlet awal (opsional)</label><select name="outletId"><option value="">Belum ditempatkan</option>${activeOutlets.map(o=>`<option value="${o.id}">${o.name}</option>`).join('')}</select></div><div class="field"><label>Grup kapten</label><select name="captainGroup"><option>A</option><option>B</option></select></div>`}</div></form>`);host.querySelector('[data-submit]').onclick=async()=>{const value=Object.fromEntries(new FormData(host.querySelector('form')));try{await api(employee?`/api/employees/${employee.id}`:'/api/employees',{method:employee?'PUT':'POST',body:JSON.stringify(value)});host.remove();await load();state.rotationDraft={};render();toast(employee?'Karyawan diperbarui.':'Karyawan ditambahkan.');}catch(error){toast(error.message,'error')}};}

function ruleModal(rule){const automation=rule?.automation||{type:rule?.autoDaily?'DAILY_DEFAULT':'MANUAL'},options=state.rules.filter(r=>r.id!==rule?.id);const host=modalFrame(rule?'Edit Point Type':'Tambah Point Type',`<form id="rule-form"><div class="form-grid"><div class="field full"><label>Nama point type</label><input name="description" required value="${rule?.description||''}"></div><div class="field"><label>Kategori</label><select name="category">${['PENGURANGAN','PENAMBAHAN','PRESTASI'].map(x=>`<option ${rule?.category===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Base point</label><input name="points" type="number" step="0.1" required value="${rule?.points??0}"></div><div class="field"><label>Frekuensi</label><select name="frequency">${['DAILY','WEEKLY','MONTHLY','EVENT'].map(x=>`<option ${rule?.frequency===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Status</label><select name="status"><option ${rule?.status==='ACTIVE'?'selected':''}>ACTIVE</option><option ${rule?.status==='INACTIVE'?'selected':''}>INACTIVE</option></select></div><div class="field full toggle-row"><label><input name="isMultipliable" type="checkbox" ${rule?.isMultipliable?'checked':''}> Is Multipliable</label><small>Aktifkan quantity pada kartu input poin.</small></div><div class="field full"><label>Jabatan yang berhak</label><div class="role-checks">${['KASIR','AO','TERAPIS'].map(x=>`<label><input type="checkbox" name="roles" value="${x}" ${rule?.roles?.includes(x)?'checked':''}> ${x}</label>`).join('')}</div></div><div class="automation-settings field full"><label>Tipe perhitungan</label><select name="automationType">${[['MANUAL','Manual'],['DAILY_DEFAULT','Otomatis harian'],['NO_OCCURRENCE','Bonus jika aturan tidak terjadi'],['ACCUMULATION','Bonus berdasarkan akumulasi']].map(([v,l])=>`<option value="${v}" ${automation.type===v?'selected':''}>${l}</option>`).join('')}</select><div class="automation-grid"><label>Periode<select name="automationPeriod"><option value="WEEKLY" ${automation.period==='WEEKLY'?'selected':''}>Mingguan</option><option value="MONTHLY" ${automation.period!=='WEEKLY'?'selected':''}>Bulanan</option></select></label><label>Batas akumulasi<input name="threshold" type="number" min="0" step="1" value="${automation.threshold||0}"></label></div><label>Aturan penggagal<select name="blockerRuleIds" multiple size="5">${options.map(r=>`<option value="${r.id}" ${automation.blockerRuleIds?.includes(r.id)?'selected':''}>${r.description}</option>`).join('')}</select></label><label>Sumber akumulasi<select name="sourceRuleIds" multiple size="5">${options.map(r=>`<option value="${r.id}" ${automation.sourceRuleIds?.includes(r.id)?'selected':''}>${r.description}</option>`).join('')}</select></label><label>Poin harian wajib<select name="requiredDailyRuleId"><option value="">Tidak ada</option>${options.filter(r=>r.autoDaily).map(r=>`<option value="${r.id}" ${automation.requiredDailyRuleId===r.id?'selected':''}>${r.description}</option>`).join('')}</select></label><label class="automation-check"><input type="checkbox" name="blockOnDayOff" ${automation.blockOnDayOff?'checked':''}> Status OFF menggagalkan bonus</label></div></div></form>`);host.querySelector('[data-submit]').onclick=async()=>{const form=host.querySelector('form'),fd=new FormData(form),value=Object.fromEntries(fd);value.isMultipliable=form.isMultipliable.checked;value.blockOnDayOff=form.blockOnDayOff.checked;value.roles=fd.getAll('roles');value.blockerRuleIds=fd.getAll('blockerRuleIds');value.sourceRuleIds=fd.getAll('sourceRuleIds');try{await api(rule?`/api/rules/${rule.id}`:'/api/rules',{method:rule?'PUT':'POST',body:JSON.stringify(value)});host.remove();await load();render();toast(rule?'Point type diperbarui.':'Point type ditambahkan.');}catch(error){toast(error.message,'error')}};}

function outletModal(outlet){const host=modalFrame(outlet?'Edit Outlet':'Tambah Outlet',`<form><div class="form-grid"><div class="field full"><label>Nama outlet</label><input name="name" required value="${outlet?.name||''}"></div><div class="field"><label>Kota</label><select name="city" required><option value="">Pilih kota…</option><option value="Palu" ${outlet?.city==='Palu'?'selected':''}>Palu</option><option value="Makassar" ${outlet?.city==='Makassar'?'selected':''}>Makassar</option></select></div><div class="field"><label>Warna kartu</label><input name="color" type="color" value="${outlet?.color||'#d8d2ff'}"></div>${outlet?`<div class="field"><label>Status</label><select name="status"><option ${outlet.status==='ACTIVE'?'selected':''}>ACTIVE</option><option ${outlet.status==='INACTIVE'?'selected':''}>INACTIVE</option></select></div>`:''}</div></form>`);host.querySelector('[data-submit]').onclick=async()=>{const value=Object.fromEntries(new FormData(host.querySelector('form')));try{await api(outlet?`/api/outlets/${outlet.id}`:'/api/outlets',{method:outlet?'PUT':'POST',body:JSON.stringify(value)});host.remove();await load();state.rotationDraft={};render();toast(outlet?'Outlet diperbarui.':'Outlet ditambahkan.');}catch(error){toast(error.message,'error')}};}

function confirmOutletDelete(outlet){if(!outlet)return;const host=document.createElement('div');host.className='modal-backdrop';host.innerHTML=`<div class="modal"><h3>Nonaktifkan outlet?</h3><p>Outlet <strong>${outlet.name}</strong> akan disembunyikan dari penempatan baru. Riwayat poin tetap tersimpan dan outlet dapat diaktifkan kembali.</p><div class="modal-actions"><button class="button" data-cancel>Tutup</button><button class="button danger" data-confirm>Nonaktifkan</button></div></div>`;document.body.append(host);host.querySelector('[data-cancel]').onclick=()=>host.remove();host.querySelector('[data-confirm]').onclick=async()=>{try{await api(`/api/outlets/${outlet.id}`,{method:'DELETE'});host.remove();await load();state.rotationDraft={};render();toast('Outlet dinonaktifkan.');}catch(error){toast(error.message,'error')}};}

function editEntryModal(entry){if(!entry)return;const eligible=state.rules.filter(r=>r.status==='ACTIVE'&&(!r.roles.length||r.roles.includes(entry.employee.position)));const host=modalFrame('Edit Poin Harian',`<form><div class="form-grid"><div class="field"><label>Tanggal</label><input name="date" type="date" value="${entry.date}"></div><div class="field"><label>Karyawan</label><select name="employeeId">${state.employees.filter(e=>e.status==='ACTIVE').map(e=>`<option value="${e.id}" ${e.id===entry.employeeId?'selected':''}>${e.name}</option>`).join('')}</select></div><div class="field full"><label>Point type</label><select name="ruleId">${eligible.map(r=>`<option value="${r.id}" ${r.id===entry.ruleId?'selected':''}>${r.description}</option>`).join('')}</select></div><div class="field"><label>Quantity</label><input name="quantity" type="number" min="1" value="${entry.quantity||entry.multiplier||1}"></div><div class="field full"><label>Catatan</label><textarea name="notes">${entry.notes||''}</textarea></div></div></form>`,'Simpan perubahan');host.querySelector('[data-submit]').onclick=async()=>{const value=Object.fromEntries(new FormData(host.querySelector('form')));try{await api(`/api/entries/${entry.id}`,{method:'PUT',body:JSON.stringify(value)});host.remove();await load();render();toast('Poin berhasil diperbarui.');}catch(error){toast(error.message,'error')}};}

function confirmVoid(id) {
  const entry=state.entries.find(e=>e.id===id); if(!entry)return;
  const host=document.createElement('div');host.className='modal-backdrop';host.innerHTML=`<div class="modal"><h3>Batalkan entri poin?</h3><p>Entri <strong>${entry.rule.description}</strong> untuk ${entry.employee.name} akan ditandai batal dan tidak dihitung lagi.</p><div class="modal-actions"><button class="button" data-cancel>Tutup</button><button class="button danger" data-confirm>Batalkan entri</button></div></div>`;document.body.append(host);
  host.querySelector('[data-cancel]').onclick=()=>host.remove();host.onclick=e=>{if(e.target===host)host.remove()};
  host.querySelector('[data-confirm]').onclick=async()=>{try{await api(`/api/entries/${id}`,{method:'DELETE'});host.remove();await load();render();toast('Entri berhasil dibatalkan.')}catch(error){toast(error.message,'error')}};
}

async function load() {
  const data=await api(`/api/bootstrap?month=${encodeURIComponent(state.month)}&year=${encodeURIComponent(state.recapYear)}`);Object.assign(state,data);
}

window.addEventListener('scroll',updateWalkthroughPosition,true);
window.addEventListener('resize',updateWalkthroughPosition);
load().then(render).catch(error=>{document.querySelector('#app').innerHTML=`<div class="app-loading"><div class="brand-mark">!</div><strong>Dashboard tidak dapat dimuat</strong><span>${error.message}</span></div>`});
function captainModal(outletId,group){const current=state.employees.find(e=>e.position==='KAPTEN'&&state.rotationDraft[e.id]?.outletId===outletId&&state.rotationDraft[e.id]?.captainGroup===group),captains=state.employees.filter(e=>e.status==='ACTIVE'&&e.position==='KAPTEN');const host=modalFrame('Ganti Kapten',`<p>Pilih kapten untuk memimpin tim ini.</p><div class="field"><label>Nama kapten</label><select id="captain-choice"><option value="">Belum ditentukan</option>${captains.map(e=>`<option value="${e.id}" ${e.id===current?.id?'selected':''}>${e.name}</option>`).join('')}</select></div>`,'Terapkan');host.querySelector('[data-submit]').onclick=()=>{const id=host.querySelector('#captain-choice').value;if(current&&current.id!==id)state.rotationDraft[current.id]={...state.rotationDraft[current.id],outletId:''};if(id)state.rotationDraft[id]={outletId,captainGroup:group};host.remove();render();toast('Kapten diganti. Klik Simpan rotasi untuk menyimpan.');};}
const baseRuleModal=ruleModal;ruleModal=function(rule){baseRuleModal(rule);const hosts=document.querySelectorAll('.modal-backdrop'),host=hosts[hosts.length-1],type=host.querySelector('[name="automationType"]'),settings=host.querySelector('.automation-settings');if(!type||!settings)return;type.insertAdjacentHTML('beforeend','<option value="CANCEL_RULE">Membatalkan poin lain</option>');type.value=rule?.automation?.type||type.value;const field=document.createElement('label');field.innerHTML=`Poin yang dibatalkan<select name="targetRuleId"><option value="">Pilih aturan…</option>${state.rules.filter(r=>r.id!==rule?.id).map(r=>`<option value="${r.id}" ${rule?.automation?.targetRuleId===r.id?'selected':''}>${r.description}</option>`).join('')}</select>`;settings.insertBefore(field,settings.querySelector('.automation-check'));};
