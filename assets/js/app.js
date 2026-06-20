const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const colors=['#51b848','#1f9e9a','#7fc34b','#f1bf35','#526d62','#e88f2d'];
function fmt(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:3})}
function setDefaultDates(){const now=new Date();const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));const first=new Date(cairo.getFullYear(),cairo.getMonth(),1);const last=new Date(cairo.getFullYear(),cairo.getMonth()+1,0);const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('#fromDate').value=iso(first);$('#toDate').value=iso(last)}
function startCairoClock(){const time=$('#cairoTime'),date=$('#cairoDate');function tick(){const now=new Date();time.textContent=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);date.textContent=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now)}tick();setInterval(tick,1000)}
function dbBadge(){const box=document.createElement('span');box.className='db-status'+(window.WarehouseDB?.ready?' ready':'');box.textContent=window.WarehouseDB?.ready?'Supabase متصل':'Supabase جاهز للإعداد';document.querySelector('.page-title div').appendChild(box)}
function initFilters(){const pf=$('#plantFilter'),wf=$('#warehouseFilter');APP_DATA.plants.forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));function fillWh(){wf.innerHTML='<option value="all">الكل</option>';APP_DATA.plants.filter(p=>pf.value==='all'||p.code===pf.value).forEach(p=>p.warehouses.forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]))))}pf.onchange=fillWh;fillWh();$('#resetBtn').onclick=()=>{pf.value='all';$('#warehouseTypeFilter').value='all';$('#movementFilter').value='all';fillWh();renderAll()};$('#searchBtn').onclick=renderAll}
function renderKPIs(){const totalWh=APP_DATA.plants.reduce((a,p)=>a+p.warehouses.length,0);const cards=[['عدد المخازن',totalWh,'مخزن','⌂'],['صافي الحركة','2,464.500','طن','⚖'],['إجمالي الكميات الخارجة','54,320.750','طن','↧'],['إجمالي الكميات الداخلة','56,785.250','طن','↥'],['إجمالي الحركات','12,458','حركة','☷']];$('#kpiCards').innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${c[1]}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('')}
function drawDonut(){const ctx=$('#donutChart').getContext('2d'),vals=[2985,2243,1972,1684,1489,2085],sum=vals.reduce((a,b)=>a+b,0);ctx.clearRect(0,0,340,240);let a=-Math.PI/2;vals.forEach((v,i)=>{let e=a+v/sum*Math.PI*2;ctx.beginPath();ctx.moveTo(115,120);ctx.arc(115,120,88,a,e);ctx.closePath();ctx.fillStyle=colors[i];ctx.globalAlpha=.9;ctx.fill();a=e});ctx.globalAlpha=1;ctx.beginPath();ctx.arc(115,120,45,0,Math.PI*2);ctx.fillStyle='#00251f';ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 16px Cairo';ctx.fillText('24%',95,72);ctx.fillText('18%',165,122);ctx.fillText('16%',90,178);ctx.fillText('12%',45,139);ctx.fillText('16%',45,91);const labs=['601 إصدار بضائع تسليم','101 استلام بضائع/تحويل','Z51 تحويل مخزون (ميزان)','301 نقل مخزون لوحدة','653 مرتجعات غير مقيدة','أخرى'];$('#movementLegend').innerHTML=labs.map((l,i)=>`<div><span style="background:${colors[i]}"></span>${l}</div>`).join('')}
function drawLine(){const ctx=$('#lineChart').getContext('2d');ctx.clearRect(0,0,430,250);const inV=[900,1400,1300,1500,1950,1450,1350,1500,1600,2000,1500,1750,1850,1800,1600,1650,1900,2200,1800,2000,1700,1900,2150,2000,2250,1900],outV=[600,780,820,1000,1260,1100,980,1070,1020,1350,1150,1200,1300,1100,1300,1450,1350,1500,1600,1200,1350,1300,1500,1450,1550,1200];function axes(){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;for(let i=0;i<6;i++){let y=215-i*34;ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(410,y);ctx.stroke()}ctx.fillStyle='#d6ead1';ctx.font='12px Cairo';ctx.fillText('2.5K',2,45);ctx.fillText('0',18,218);ctx.fillText('01/05',30,235);ctx.fillText('31/05',376,235)}function line(arr,c){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();arr.forEach((v,i)=>{let x=45+i*(350/(arr.length-1)),y=215-(v/2500)*170;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();arr.forEach((v,i)=>{let x=45+i*(350/(arr.length-1)),y=215-(v/2500)*170;ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fillStyle=c;ctx.fill()})}axes();line(inV,'#74c54a');line(outV,'#f1bb30');ctx.fillStyle='#74c54a';ctx.fillRect(200,18,10,10);ctx.fillStyle='#fff';ctx.fillText('حركات داخلة',215,28);ctx.fillStyle='#f1bb30';ctx.fillRect(295,18,10,10);ctx.fillStyle='#fff';ctx.fillText('حركات خارجة',310,28)}
function renderStock(){$('#stockSummary').innerHTML=[['إجمالي المخزون الحالي','125,430.600 طن'],['منتج تام (صب)','68,245.300 طن'],['منتج تام (معبأ)','32,187.150 طن'],['خامات','24,998.150 طن']].map(r=>`<div class="stock-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
function renderPlants(){const cards=APP_DATA.plants.map(p=>`<div class="plant-card"><div class="plant-icon"><img src="assets/img/logo.png" alt=""></div><strong>${p.name}</strong><br><span class="plant-code">${p.code}</span><br><small>${p.warehouses.length} مخزن</small></div>`).join('');$('#plantsCards').innerHTML=cards;$('#plantsFull').innerHTML=APP_DATA.plants.map(p=>`<div class="plant-card"><div class="plant-icon"><img src="assets/img/logo.png" alt=""></div><h3>${p.name}</h3><span class="plant-code">${p.code}</span><ul class="warehouse-list">${p.warehouses.map(w=>`<li><b>${w[0]}</b> - ${w[1]}</li>`).join('')}</ul></div>`).join('')}
function table(el,heads,rows){$(el).innerHTML=`<thead><tr>${heads.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`}
function renderTables(){table('#latestTable',['التاريخ','رقم الحركة','كود الحركة','وصف الحركة','من مخزن','إلى مخزن','الكمية','الوحدة'],APP_DATA.latest);table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحويل'],APP_DATA.salesReviewSample);table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample)}
function renderTabs(){const salesWh=APP_DATA.plants.flatMap(p=>p.warehouses.filter(w=>['W401','W402','N401','N402','N411','N412','E401','E402'].includes(w[0])).map(w=>w[0]));$('#salesTabs').innerHTML=salesWh.map((w,i)=>`<button class="${i===0?'active':''}">${w}</button>`).join('');$('#inboundTabs').innerHTML=APP_DATA.plants.map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('')}
function renderAlerts(){$('#alertsBox').innerHTML=[['⚠','حركات لم يتم تسويتها','يوجد 28 حركة تحتاج إلى تسوية'],['!','فروق جرد','يوجد 12 مخزن به فروق جرد'],['ℹ','حركات ملغاة','يوجد 15 حركة ملغاة خلال الفترة']].map(a=>`<div class="alert"><span>${a[0]}</span><div><b>${a[1]}</b><small>${a[2]}</small></div></div>`).join('')}
function nav(){ $$('.nav-item').forEach(b=>b.onclick=()=>{$$('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');$$('.section').forEach(s=>s.classList.remove('active-section'));$('#'+b.dataset.section).classList.add('active-section')})}
function renderAll(){renderKPIs();drawDonut();drawLine();renderStock();renderPlants();renderTables();renderTabs();renderAlerts()}
document.addEventListener('DOMContentLoaded',()=>{setDefaultDates();startCairoClock();dbBadge();initFilters();nav();renderAll()});

// === Supabase Sales Upload + Dynamic Sales Report ===
const SALES_WAREHOUSES = ['W401','W402','N401','N402','N411','N412','E401','E402'];
let activeSalesWarehouse = SALES_WAREHOUSES[0];

function normalizeHeader(v){return String(v||'').replace(/\s+/g,' ').trim();}
function parseArabicNumber(v){
  if(v===null || v===undefined || v==='') return 0;
  if(typeof v==='number') return v;
  const s=String(v).replace(/,/g,'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).trim();
  const n=Number(s);
  return Number.isFinite(n)?n:0;
}
function excelDateToISO(v){
  if(!v) return null;
  if(v instanceof Date && !isNaN(v)) return v.toISOString().slice(0,10);
  if(typeof v==='number'){
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return d.toISOString().slice(0,10);
  }
  const s=String(v).trim();
  const parsed=new Date(s);
  if(!isNaN(parsed)) return parsed.toISOString().slice(0,10);
  const m=s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if(m) return `${m[3]}-${String(m[2]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
  return null;
}
function getRowValue(row, names){
  for(const n of names){
    if(row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  }
  return '';
}
async function updateAuthStatus(){
  const el=$('#authStatus'); if(!el || !window.WarehouseDB?.ready) return;
  const {data}=await WarehouseDB.getUser();
  el.textContent = data?.user ? `تم تسجيل الدخول: ${data.user.email}` : 'لم يتم تسجيل الدخول بعد.';
}
function initAuthPanel(){
  const loginBtn=$('#loginBtn'), logoutBtn=$('#logoutBtn');
  if(!loginBtn) return;
  loginBtn.onclick=async()=>{
    const email=$('#loginEmail').value.trim();
    const password=$('#loginPassword').value;
    const status=$('#authStatus');
    status.textContent='جاري تسجيل الدخول...';
    const {error}=await WarehouseDB.signIn(email,password);
    status.textContent=error ? `خطأ: ${error.message}` : 'تم تسجيل الدخول بنجاح.';
    updateAuthStatus();
  };
  logoutBtn.onclick=async()=>{ await WarehouseDB.signOut(); updateAuthStatus(); };
  updateAuthStatus();
}
function rowsFromWorkbook(workbook){
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});
}
function mapSalesRows(rows,batchId){
  return rows.map((row,idx)=>{
    const normalized={};
    Object.entries(row).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
    return {
      batch_id: batchId,
      material_code: String(getRowValue(normalized,['كود المادة','المادة','Material','Material Code'])).trim(),
      material_name: String(getRowValue(normalized,['وصف المادة','وصف الصنف','Material Description'])).trim(),
      quantity: parseArabicNumber(getRowValue(normalized,['الكمية','كمية','Quantity'])),
      uom: String(getRowValue(normalized,['وحدة القياس','الوحدة','UOM'])).trim().toUpperCase() || 'TO',
      movement_type: String(getRowValue(normalized,['نوع الحركة','كود الحركة','Movement Type'])).trim(),
      movement_text: String(getRowValue(normalized,['وصف نوع الحركة','وصف الحركة','Movement Text'])).trim(),
      warehouse_code: String(getRowValue(normalized,['المخزن','كود المخزن','Storage Location'])).trim(),
      plant_code: String(getRowValue(normalized,['المصنع','تلمصنع','Plant'])).trim(),
      plant_name: String(getRowValue(normalized,['إسم المصنع','اسم المصنع','Plant Name'])).trim(),
      transaction_date: parseArabicNumber(getRowValue(normalized,['التاريخ'])) ? null : parseArabicNumber('')
    };
  }).map((r,i)=>{
    const original=rows[i];
    const normalized={};
    Object.entries(original).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
    r.transaction_date = parseArabicNumber(getRowValue(normalized,['التاريخ'])) && typeof getRowValue(normalized,['التاريخ']) === 'number'
      ? excelDateToISO(getRowValue(normalized,['التاريخ']))
      : excelDateToISO(getRowValue(normalized,['التاريخ','Date','Posting Date']));
    return r;
  }).filter(r=>r.material_code && r.material_name && r.movement_type && r.movement_text && r.warehouse_code && r.plant_code);
}
async function insertChunks(tableName, rows, chunkSize=500){
  for(let i=0;i<rows.length;i+=chunkSize){
    const chunk=rows.slice(i,i+chunkSize);
    const {error}=await WarehouseDB.client.from(tableName).insert(chunk);
    if(error) throw error;
  }
}
async function handleSalesFile(file){
  const status=$('#salesUploadStatus');
  status.className='upload-status';
  status.textContent='جاري قراءة الملف...';
  if(!WarehouseDB?.ready){ status.textContent='Supabase غير متصل. راجع ملف supabase-config.js'; status.className='upload-status err'; return; }
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){ status.textContent='سجل الدخول أولًا قبل رفع الملف.'; status.className='upload-status err'; return; }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء دفعة الرفع...`;
    const {data:batch,error:batchError}=await WarehouseDB.client.from('sales_upload_batches').insert({file_name:file.name,uploaded_by:userData.user.id,notes:'مراجعة مبيعات المنتج التام والتحويلات المخزنية'}).select('id').single();
    if(batchError) throw batchError;
    const payload=mapSalesRows(sourceRows,batch.id);
    if(!payload.length) throw new Error('لم يتم العثور على صفوف صالحة. راجع رؤوس الأعمدة.');
    status.textContent=`جاري رفع ${payload.length} سطر إلى Supabase...`;
    await insertChunks('sales_raw_transactions',payload,400);
    status.textContent=`تم رفع ${payload.length} سطر بنجاح. افتح شاشة مراجعة البيع لمشاهدة التقرير.`;
    status.className='upload-status ok';
    await loadSalesReport(activeSalesWarehouse);
  }catch(err){
    status.textContent=`خطأ أثناء الرفع: ${err.message || err}`;
    status.className='upload-status err';
  }
}
function initSalesUploader(){
  const input=$('#salesExcelInput'), btn=$('#pickSalesFileBtn'), dz=$('#salesDropZone');
  if(!input || !btn) return;
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleSalesFile(input.files[0]); };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleSalesFile(f)};
  }
}
async function loadSalesReport(warehouseCode){
  activeSalesWarehouse=warehouseCode;
  if(!WarehouseDB?.ready){ return; }
  const {data,error}=await WarehouseDB.client.from('sales_audit_report').select('*').eq('warehouse_code',warehouseCode).order('material_code');
  if(error){ console.error(error); return; }
  const rows=(data||[]).map(r=>[
    r.material_code,
    r.material_name,
    r.uom,
    fmt(r.sales_quantity),
    fmt(r.production_quantity),
    fmt(r.outgoing_transfer_quantity),
    fmt(r.incoming_transfer_quantity),
    fmt(r.total_loading_quantity)
  ]);
  table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],rows);
}
renderTabs = function(){
  $('#salesTabs').innerHTML=SALES_WAREHOUSES.map((w,i)=>`<button class="${i===0?'active':''}" data-warehouse="${w}">${w}</button>`).join('');
  $$('#salesTabs button').forEach(btn=>btn.onclick=()=>{ $$('#salesTabs button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); loadSalesReport(btn.dataset.warehouse); });
  $('#inboundTabs').innerHTML=APP_DATA.plants.map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('');
};
renderTables = function(){
  table('#latestTable',['التاريخ','رقم الحركة','كود الحركة','وصف الحركة','من مخزن','إلى مخزن','الكمية','الوحدة'],APP_DATA.latest);
  table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));
  table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],[]);
  table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample);
};
document.addEventListener('DOMContentLoaded',()=>{initAuthPanel();initSalesUploader();setTimeout(()=>loadSalesReport(activeSalesWarehouse),300);});

// === Main Program Login Gate ===
let CURRENT_AUTH_USER=null;
let CURRENT_APP_PROFILE=null;

async function fetchCurrentAppProfile(user){
  const fallback={
    full_name:user?.email || 'مستخدم',
    role:'authenticated',
    job_title:'',
    phone:'',
    avatar_url:'',
    email:user?.email || ''
  };
  if(!window.WarehouseDB?.ready || !user?.id) return fallback;
  try{
    const {data,error}=await WarehouseDB.client
      .from('app_users')
      .select('full_name, role, is_active, job_title, phone, avatar_url')
      .eq('id',user.id)
      .maybeSingle();
    if(error || !data) return fallback;
    if(data.is_active === false) return {...fallback, inactive:true};
    return {
      full_name:data.full_name || fallback.full_name,
      role:data.role || fallback.role,
      job_title:data.job_title || '',
      phone:data.phone || '',
      avatar_url:data.avatar_url || '',
      email:user?.email || ''
    };
  }catch(_){ return fallback; }
}
function paintAvatar(el, profile){
  if(!el) return;
  el.textContent='';
  el.style.backgroundImage='';
  el.classList.toggle('has-image', !!profile?.avatar_url);
  if(profile?.avatar_url){
    const img=document.createElement('img');
    img.src=profile.avatar_url;
    img.alt='الصورة الشخصية';
    el.appendChild(img);
    return;
  }
  const name=profile?.full_name || profile?.email || 'مستخدم';
  el.textContent=(name.trim()[0] || 'م').toUpperCase();
}
function applyProfileToHeader(profile){
  const name=profile?.full_name || profile?.email || 'مستخدم';
  const job=profile?.job_title || profile?.role || 'مستخدم';
  if($('#currentUserName')) $('#currentUserName').textContent=name;
  if($('#currentUserRole')) $('#currentUserRole').textContent=job;
  paintAvatar($('#currentUserAvatar'), profile);
}
function fillProfileForm(profile,user){
  if($('#profileFullName')) $('#profileFullName').value=profile?.full_name || '';
  if($('#profileJobTitle')) $('#profileJobTitle').value=profile?.job_title || '';
  if($('#profilePhone')) $('#profilePhone').value=profile?.phone || '';
  if($('#profilePreviewName')) $('#profilePreviewName').textContent=profile?.full_name || user?.email || '--';
  if($('#profilePreviewJob')) $('#profilePreviewJob').textContent=profile?.job_title || profile?.role || '--';
  if($('#profilePreviewEmail')) $('#profilePreviewEmail').textContent=user?.email || '';
  paintAvatar($('#profilePreviewAvatar'), profile);
}
function setMainAuthMessage(message,type=''){
  const el=$('#mainLoginStatus');
  if(!el) return;
  el.textContent=message;
  el.className='login-status '+(type||'');
}
function showLoginScreen(){
  $('#loginScreen')?.classList.remove('login-hidden');
  $('#appShell')?.classList.add('app-hidden');
}
async function showApplication(user){
  CURRENT_AUTH_USER=user;
  const profile=await fetchCurrentAppProfile(user);
  if(profile.inactive){
    await WarehouseDB.signOut();
    showLoginScreen();
    setMainAuthMessage('هذا المستخدم غير مفعل. راجع مدير النظام.','err');
    return;
  }
  CURRENT_APP_PROFILE=profile;
  $('#loginScreen')?.classList.add('login-hidden');
  $('#appShell')?.classList.remove('app-hidden');
  applyProfileToHeader(profile);
  fillProfileForm(profile,user);
  setTimeout(()=>loadSalesReport(activeSalesWarehouse),250);
}
async function checkMainSession(){
  if(!window.WarehouseDB?.ready){
    showLoginScreen();
    setMainAuthMessage('Supabase غير متصل. راجع إعدادات supabase-config.js','err');
    return;
  }
  const {data}=await WarehouseDB.getUser();
  if(data?.user) await showApplication(data.user); else showLoginScreen();
}
function fileToDataUrl(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=reject;
    reader.readAsDataURL(file);
  });
}
async function saveCurrentProfile(){
  const status=$('#profileSaveStatus');
  if(status){ status.className='upload-status'; status.textContent='جاري حفظ البيانات...'; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){
    if(status){ status.className='upload-status err'; status.textContent='سجل الدخول أولاً.'; }
    return;
  }
  try{
    let avatarUrl=CURRENT_APP_PROFILE?.avatar_url || '';
    const file=$('#profileAvatarInput')?.files?.[0];
    if(file){
      if(file.size > 600 * 1024) throw new Error('حجم الصورة كبير. استخدم صورة أقل من 600KB.');
      avatarUrl=await fileToDataUrl(file);
    }
    const payload={
      id: CURRENT_AUTH_USER.id,
      full_name: ($('#profileFullName')?.value || CURRENT_AUTH_USER.email || '').trim(),
      job_title: ($('#profileJobTitle')?.value || '').trim(),
      phone: ($('#profilePhone')?.value || '').trim(),
      avatar_url: avatarUrl,
      role: CURRENT_APP_PROFILE?.role && CURRENT_APP_PROFILE.role !== 'authenticated' ? CURRENT_APP_PROFILE.role : 'viewer',
      is_active: true
    };
    if(!payload.full_name) throw new Error('الإسم مطلوب.');
    const {data,error}=await WarehouseDB.client
      .from('app_users')
      .upsert(payload,{onConflict:'id'})
      .select('full_name, role, is_active, job_title, phone, avatar_url')
      .single();
    if(error) throw error;
    CURRENT_APP_PROFILE={...data,email:CURRENT_AUTH_USER.email};
    applyProfileToHeader(CURRENT_APP_PROFILE);
    fillProfileForm(CURRENT_APP_PROFILE,CURRENT_AUTH_USER);
    if(status){ status.className='upload-status ok'; status.textContent='تم حفظ بيانات الحساب بنجاح.'; }
  }catch(err){
    if(status){ status.className='upload-status err'; status.textContent='خطأ أثناء الحفظ: '+(err.message || err); }
  }
}
function initProfileSettings(){
  const form=$('#profileForm');
  const avatarInput=$('#profileAvatarInput');
  if(form){
    form.addEventListener('submit',e=>{e.preventDefault();saveCurrentProfile();});
  }
  if(avatarInput){
    avatarInput.addEventListener('change',async()=>{
      const file=avatarInput.files?.[0];
      if(!file) return;
      try{
        if(file.size > 600 * 1024) throw new Error('حجم الصورة كبير. استخدم صورة أقل من 600KB.');
        const dataUrl=await fileToDataUrl(file);
        const preview={...(CURRENT_APP_PROFILE||{}), avatar_url:dataUrl, full_name:$('#profileFullName')?.value || CURRENT_APP_PROFILE?.full_name};
        paintAvatar($('#profilePreviewAvatar'), preview);
      }catch(err){
        const status=$('#profileSaveStatus');
        if(status){ status.className='upload-status err'; status.textContent=err.message || String(err); }
      }
    });
  }
}

function initMainLoginGate(){
  const loginBtn=$('#mainLoginBtn');
  const emailInput=$('#mainLoginEmail');
  const passInput=$('#mainLoginPassword');
  const logoutBtn=$('#topLogoutBtn');
  if(loginBtn){
    loginBtn.onclick=async()=>{
      const email=(emailInput?.value||'').trim();
      const password=passInput?.value||'';
      if(!email || !password){ setMainAuthMessage('اكتب البريد الإلكتروني وكلمة المرور.','err'); return; }
      setMainAuthMessage('جاري تسجيل الدخول...');
      const {data,error}=await WarehouseDB.signIn(email,password);
      if(error){ setMainAuthMessage('خطأ في تسجيل الدخول: '+error.message,'err'); return; }
      setMainAuthMessage('تم تسجيل الدخول بنجاح.','ok');
      await showApplication(data.user);
    };
    [emailInput,passInput].forEach(inp=>{ if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') loginBtn.click(); }); });
  }
  if(logoutBtn){
    logoutBtn.onclick=async()=>{
      await WarehouseDB.signOut();
      showLoginScreen();
      setMainAuthMessage('تم تسجيل الخروج.','ok');
    };
  }
  if(WarehouseDB?.client?.auth){
    WarehouseDB.client.auth.onAuthStateChange((_event,session)=>{
      if(session?.user) showApplication(session.user);
      else showLoginScreen();
    });
  }
  checkMainSession();
}
document.addEventListener('DOMContentLoaded',()=>{initMainLoginGate();initProfileSettings();});
