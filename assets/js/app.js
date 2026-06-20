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

// === Daily Reports History / Versioned Uploads ===
const REPORT_TYPES = {
  sales: {
    title: 'سجل نسخ تقارير المبيعات المرفوعة',
    note: 'سيتم حفظ بيانات مبيعات المنتج التام والتحويلات حسب تاريخ التقرير، ثم عرضها من sales_audit_report.',
    fileNote: 'مراجعة مبيعات المنتج التام والتحويلات المخزنية'
  },
  incoming: {
    title: 'سجل نسخ تقارير الوارد MB51 المرفوعة',
    note: 'تجهيز سجل الوارد. سيتم تفعيل رفع الوارد بعد اعتماد قالب MB51.',
    fileNote: 'الوارد من MB51'
  }
};
let activeUploadType='sales';
let selectedReportFile=null;
let pendingReplaceBatch=null;
let selectedSalesReportDate=null;

function todayISO(){const d=new Date();const c=new Date(d.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));return `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`;}
function formatDateOnly(v){if(!v)return '--';const d=new Date(v+'T00:00:00');if(!isNaN(d))return new Intl.DateTimeFormat('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit'}).format(d);return v;}
function formatDateTime(v){if(!v)return '--';const d=new Date(v);if(isNaN(d))return v;return new Intl.DateTimeFormat('ar-EG',{dateStyle:'short',timeStyle:'short',timeZone:'Africa/Cairo'}).format(d);}
function currentUploaderName(){return (window.CURRENT_APP_PROFILE?.full_name || CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || 'مستخدم');}
function statusLabel(status){const s=status||'active';const map={active:'نشط',replaced:'مستبدل',deleted:'محذوف'};return `<span class="status-pill status-${s}">${map[s]||s}</span>`;}

async function loadUploadHistory(type=activeUploadType){
  const body=$('#uploadHistoryBody');
  if(!body) return;
  body.innerHTML='<tr><td colspan="7" class="empty-history">جاري تحميل السجل...</td></tr>';
  if(!WarehouseDB?.ready){body.innerHTML='<tr><td colspan="7" class="empty-history">Supabase غير متصل.</td></tr>';return;}
  const {data,error}=await WarehouseDB.client
    .from('sales_upload_batches')
    .select('id,report_type,report_date,file_name,row_count,uploaded_at,uploaded_by_name,status,file_size_bytes')
    .eq('report_type',type)
    .order('report_date',{ascending:false})
    .order('uploaded_at',{ascending:false});
  if(error){body.innerHTML=`<tr><td colspan="7" class="empty-history">خطأ في تحميل السجل: ${error.message}</td></tr>`;return;}
  const rows=data||[];
  if(!rows.length){body.innerHTML='<tr><td colspan="7" class="empty-history">لا توجد تقارير مرفوعة لهذا النوع حتى الآن.</td></tr>';return;}
  body.innerHTML=rows.map(b=>`
    <tr data-batch-id="${b.id}" data-report-date="${b.report_date||''}" data-status="${b.status||'active'}">
      <td>${formatDateOnly(b.report_date)}</td>
      <td>${b.file_name||'--'}</td>
      <td>${fmt(b.row_count||0)}</td>
      <td>${formatDateTime(b.uploaded_at)}</td>
      <td>${b.uploaded_by_name||'--'}</td>
      <td>${statusLabel(b.status)}</td>
      <td>
        <div class="history-actions">
          <button type="button" data-action="view">عرض</button>
          <button type="button" class="replace" data-action="replace">استبدال</button>
          <button type="button" class="danger" data-action="delete">حذف</button>
        </div>
      </td>
    </tr>`).join('');
  body.querySelectorAll('button[data-action]').forEach(btn=>btn.onclick=()=>handleHistoryAction(btn));
}

async function refreshSalesReportDates(preferDate){
  const sel=$('#salesReportDateSelect');
  if(!sel || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('sales_upload_batches')
    .select('report_date')
    .eq('report_type','sales')
    .eq('status','active')
    .order('report_date',{ascending:false});
  if(error || !(data||[]).length){
    sel.innerHTML='<option value="">لا توجد تقارير مرفوعة</option>';
    selectedSalesReportDate=null;
    return;
  }
  const dates=[...new Set(data.map(x=>x.report_date).filter(Boolean))];
  sel.innerHTML=dates.map(d=>`<option value="${d}">${formatDateOnly(d)}</option>`).join('');
  selectedSalesReportDate = preferDate && dates.includes(preferDate) ? preferDate : (selectedSalesReportDate && dates.includes(selectedSalesReportDate) ? selectedSalesReportDate : dates[0]);
  sel.value=selectedSalesReportDate;
  sel.onchange=()=>{selectedSalesReportDate=sel.value;loadSalesReport(activeSalesWarehouse);};
}

function switchUploadType(type){
  activeUploadType=type;
  pendingReplaceBatch=null;
  selectedReportFile=null;
  $$('#upload .report-type-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.uploadTab===type));
  if($('#historyTitle')) $('#historyTitle').textContent=REPORT_TYPES[type].title;
  if($('#dropZoneHint')) $('#dropZoneHint').textContent=REPORT_TYPES[type].note;
  if($('#selectedReportFileName')) $('#selectedReportFileName').textContent='لم يتم اختيار ملف';
  const status=$('#salesUploadStatus'); if(status){status.className='upload-status';status.textContent= type==='incoming' ? 'رفع الوارد سيتم تفعيله بعد اعتماد قالب MB51.' : '';}
  loadUploadHistory(type);
}

function handleHistoryAction(btn){
  const tr=btn.closest('tr');
  const id=tr?.dataset.batchId;
  const reportDate=tr?.dataset.reportDate;
  const status=tr?.dataset.status;
  const action=btn.dataset.action;
  if(!id) return;
  if(action==='view'){
    if(activeUploadType==='sales'){
      selectedSalesReportDate=reportDate;
      switchSection('sales');
      refreshSalesReportDates(reportDate).then(()=>loadSalesReport(activeSalesWarehouse));
    }else{
      alert('عرض الوارد سيتم تفعيله مع مرحلة MB51.');
    }
    return;
  }
  if(status==='deleted') { alert('هذه النسخة محذوفة بالفعل.'); return; }
  if(action==='replace'){
    pendingReplaceBatch={id, reportDate, reportType:activeUploadType};
    if($('#reportDateInput')) $('#reportDateInput').value=reportDate;
    $('#salesExcelInput')?.click();
    return;
  }
  if(action==='delete') deleteReportBatch(id,reportDate,activeUploadType);
}

async function deleteReportBatch(batchId,reportDate,type){
  if(!confirm(`سيتم حذف بيانات تقرير ${formatDateOnly(reportDate)} المرتبطة بهذه النسخة فقط. هل تريد المتابعة؟`)) return;
  const status=$('#salesUploadStatus');
  if(status){status.className='upload-status';status.textContent='جاري حذف التقرير...';}
  try{
    if(type==='sales'){
      const {error:rawErr}=await WarehouseDB.client.from('sales_raw_transactions').delete().eq('batch_id',batchId);
      if(rawErr) throw rawErr;
    }
    const {error:upErr}=await WarehouseDB.client.from('sales_upload_batches').update({status:'deleted',deleted_at:new Date().toISOString()}).eq('id',batchId);
    if(upErr) throw upErr;
    if(status){status.className='upload-status ok';status.textContent='تم حذف التقرير وبياناته المرتبطة.';}
    await loadUploadHistory(type);
    await refreshSalesReportDates();
    if(type==='sales') await loadSalesReport(activeSalesWarehouse);
  }catch(err){if(status){status.className='upload-status err';status.textContent='خطأ أثناء الحذف: '+(err.message||err);}}
}

async function replaceOldActiveBatchIfNeeded(reportType,reportDate,explicitBatchId){
  let oldId=explicitBatchId||null;
  if(!oldId){
    const {data,error}=await WarehouseDB.client.from('sales_upload_batches')
      .select('id,file_name')
      .eq('report_type',reportType)
      .eq('report_date',reportDate)
      .eq('status','active')
      .maybeSingle();
    if(error) throw error;
    if(data?.id){
      const ok=confirm(`يوجد تقرير نشط مرفوع لنفس التاريخ (${formatDateOnly(reportDate)}). هل تريد استبداله؟`);
      if(!ok) throw new Error('تم إلغاء الرفع لأن هناك تقريرًا موجودًا لنفس التاريخ.');
      oldId=data.id;
    }
  }
  if(oldId){
    if(reportType==='sales'){
      const {error:delErr}=await WarehouseDB.client.from('sales_raw_transactions').delete().eq('batch_id',oldId);
      if(delErr) throw delErr;
    }
    const {error:repErr}=await WarehouseDB.client.from('sales_upload_batches').update({status:'replaced',replaced_at:new Date().toISOString()}).eq('id',oldId);
    if(repErr) throw repErr;
  }
}

async function handleSalesFile(file){
  selectedReportFile=file;
  if($('#selectedReportFileName')) $('#selectedReportFileName').textContent=file?.name || 'لم يتم اختيار ملف';
  const status=$('#salesUploadStatus');
  if(status){status.className='upload-status';status.textContent='';}
  if(activeUploadType==='incoming'){
    if(status){status.className='upload-status err';status.textContent='رفع الوارد من MB51 سيتم تفعيله في المرحلة التالية بعد اعتماد القالب.';}
    return;
  }
  const reportDate=$('#reportDateInput')?.value;
  if(!reportDate){if(status){status.className='upload-status err';status.textContent='اختر تاريخ التقرير أولاً.';}return;}
  if(!WarehouseDB?.ready){if(status){status.className='upload-status err';status.textContent='Supabase غير متصل. راجع ملف supabase-config.js';}return;}
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){if(status){status.className='upload-status err';status.textContent='سجل الدخول أولًا قبل رفع الملف.';}return;}
  try{
    if(status) status.textContent='جاري قراءة الملف...';
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    const tempBatchId='00000000-0000-0000-0000-000000000000';
    const payloadPreview=mapSalesRows(sourceRows,tempBatchId);
    if(!payloadPreview.length) throw new Error('لم يتم العثور على صفوف صالحة. راجع رؤوس الأعمدة.');
    if(status) status.textContent='جاري تجهيز نسخة الرفع اليومية...';
    await replaceOldActiveBatchIfNeeded('sales',reportDate,pendingReplaceBatch?.id||null);
    const batchPayload={
      report_type:'sales',
      report_date:reportDate,
      file_name:file.name,
      file_size_bytes:file.size||0,
      row_count:payloadPreview.length,
      uploaded_by:userData.user.id,
      uploaded_by_name:currentUploaderName(),
      status:'active',
      notes:REPORT_TYPES.sales.fileNote
    };
    const {data:batch,error:batchError}=await WarehouseDB.client.from('sales_upload_batches').insert(batchPayload).select('id').single();
    if(batchError) throw batchError;
    const payload=payloadPreview.map(r=>({...r,batch_id:batch.id}));
    if(status) status.textContent=`جاري رفع ${payload.length} سطر إلى Supabase...`;
    await insertChunks('sales_raw_transactions',payload,400);
    pendingReplaceBatch=null;
    selectedReportFile=null;
    if($('#selectedReportFileName')) $('#selectedReportFileName').textContent='لم يتم اختيار ملف';
    if(status){status.className='upload-status ok';status.textContent=`تم رفع تقرير ${formatDateOnly(reportDate)} بعدد ${payload.length} سطر بنجاح.`;}
    selectedSalesReportDate=reportDate;
    await loadUploadHistory('sales');
    await refreshSalesReportDates(reportDate);
    await loadSalesReport(activeSalesWarehouse);
  }catch(err){
    pendingReplaceBatch=null;
    if(status){status.className='upload-status err';status.textContent=`خطأ أثناء الرفع: ${err.message || err}`;}
  }
}

function initSalesUploader(){
  const input=$('#salesExcelInput'), chooseBtn=$('#chooseReportFileBtn'), uploadBtn=$('#uploadReportBtn'), dz=$('#salesDropZone');
  if($('#reportDateInput') && !$('#reportDateInput').value) $('#reportDateInput').value=todayISO();
  $$('#upload .report-type-tabs button').forEach(btn=>btn.onclick=()=>switchUploadType(btn.dataset.uploadTab));
  if($('#refreshHistoryBtn')) $('#refreshHistoryBtn').onclick=()=>loadUploadHistory(activeUploadType);
  if(!input) return;
  if(chooseBtn) chooseBtn.onclick=()=>input.click();
  if(uploadBtn) uploadBtn.onclick=()=>{
    if(!selectedReportFile){input.click();return;}
    handleSalesFile(selectedReportFile);
  };
  input.onchange=()=>{
    selectedReportFile=input.files?.[0] || null;
    if($('#selectedReportFileName')) $('#selectedReportFileName').textContent=selectedReportFile?.name || 'لم يتم اختيار ملف';
    if(selectedReportFile) handleSalesFile(selectedReportFile);
    input.value='';
  };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f){selectedReportFile=f;handleSalesFile(f);}};
  }
  switchUploadType(activeUploadType);
}

async function loadSalesReport(warehouseCode){
  activeSalesWarehouse=warehouseCode;
  if(!WarehouseDB?.ready){ return; }
  if(!selectedSalesReportDate){await refreshSalesReportDates();}
  if(!selectedSalesReportDate){
    table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],[]);
    return;
  }
  const {data,error}=await WarehouseDB.client.from('sales_audit_report').select('*').eq('warehouse_code',warehouseCode).eq('report_date',selectedSalesReportDate).order('material_code');
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

function switchSection(section){
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
  $$('.section').forEach(s=>s.classList.remove('active-section'));
  const target=$('#'+section);
  if(target) target.classList.add('active-section');
  updateFiltersVisibility(section);
  if(section==='upload') loadUploadHistory(activeUploadType);
  if(section==='sales') refreshSalesReportDates().then(()=>loadSalesReport(activeSalesWarehouse));
}

document.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>{initSalesUploader();refreshSalesReportDates();},500);});
