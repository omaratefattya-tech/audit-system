const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const colors=['#51b848','#1f9e9a','#7fc34b','#f1bf35','#526d62','#e88f2d'];
function fmt(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:3})}
function setDefaultDates(){const now=new Date();const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));const first=new Date(cairo.getFullYear(),cairo.getMonth(),1);const last=new Date(cairo.getFullYear(),cairo.getMonth()+1,0);const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('#fromDate').value=iso(first);$('#toDate').value=iso(last)}
function startCairoClock(){const time=$('#cairoTime'),date=$('#cairoDate');function tick(){const now=new Date();time.textContent=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',second:'2-digit'}).format(now);date.textContent=new Intl.DateTimeFormat('ar-EG',{timeZone:'Africa/Cairo',weekday:'long',year:'numeric',month:'long',day:'numeric'}).format(now)}tick();setInterval(tick,1000)}
function dbBadge(){const box=document.createElement('span');box.className='db-status'+(window.WarehouseDB?.ready?' ready':'');box.textContent=window.WarehouseDB?.ready?'Supabase متصل':'Supabase جاهز للإعداد';document.querySelector('.page-title div').appendChild(box)}
function initFilters(){
  const pf=$('#plantFilter'),wf=$('#warehouseFilter'),typeFilter=$('#warehouseTypeFilter'),movementFilter=$('#movementFilter'),statusFilter=$('#inboundStatusFilter'),fromDate=$('#fromDate'),toDate=$('#toDate');
  if(!pf || !wf) return;
  APP_DATA.plants.forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
  function fillWh(){
    wf.innerHTML='<option value="all">الكل</option>';
    APP_DATA.plants
      .filter(p=>pf.value==='all'||p.code===pf.value)
      .forEach(p=>p.warehouses.forEach(w=>{
        if(!typeFilter || typeFilter.value==='all' || w[2]===typeFilter.value){
          wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]));
        }
      }));
  }
  function fillIncomingMovements(){
    if(!movementFilter) return;
    movementFilter.innerHTML='<option value="all">الكل</option><option value="101">101 - استلام</option><option value="102">102 - إلغاء استلام</option><option value="Z13">Z13 - استلام بدون الميزان</option><option value="Z14">Z14 - إلغاء بدون ميزان</option>';
  }
  function restoreInboundFilters(){
    const saved=readSavedInboundFilters();
    if(!saved) return;
    if(saved.plant) pf.value=saved.plant;
    if(typeFilter && saved.warehouseType) typeFilter.value=saved.warehouseType;
    fillWh();
    if(saved.warehouse && [...wf.options].some(o=>o.value===saved.warehouse)) wf.value=saved.warehouse;
    if(movementFilter && saved.movement) movementFilter.value=String(saved.movement).toLowerCase();
    if(statusFilter && saved.status) statusFilter.value=saved.status;
    if(fromDate && saved.from) fromDate.value=saved.from;
    if(toDate && saved.to) toDate.value=saved.to;
  }
  pf.onchange=fillWh;
  if(typeFilter) typeFilter.onchange=fillWh;
  fillWh();
  fillIncomingMovements();
  restoreInboundFilters();
  const runInboundFilter=()=>{ saveInboundFilters(getInboundTopFilters()); return loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true}); };
  $('#resetBtn').onclick=()=>{
    pf.value='all';
    if(typeFilter) typeFilter.value='all';
    fillWh();
    if(movementFilter) movementFilter.value='all';
    if(statusFilter) statusFilter.value='all';
    if(fromDate) fromDate.value='';
    if(toDate) toDate.value='';
    const dateSelect=$('#inboundReportDateSelect');
    if(dateSelect) dateSelect.value='';
    clearSavedInboundFilters();
    runInboundFilter();
  };
  $('#searchBtn').onclick=()=>{
    if($('#inbound')?.classList.contains('active-section')) runInboundFilter();
    else renderAll();
  };
}
function renderKPIs(){const totalWh=APP_DATA.plants.reduce((a,p)=>a+p.warehouses.length,0);const cards=[['عدد المخازن',totalWh,'مخزن','⌂'],['صافي الحركة','2,464.500','طن','⚖'],['إجمالي الكميات الخارجة','54,320.750','طن','↧'],['إجمالي الكميات الداخلة','56,785.250','طن','↥'],['إجمالي الحركات','12,458','حركة','☷']];$('#kpiCards').innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${c[1]}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('')}
function drawDonut(){const ctx=$('#donutChart').getContext('2d'),vals=[2985,2243,1972,1684,1489,2085],sum=vals.reduce((a,b)=>a+b,0);ctx.clearRect(0,0,340,240);let a=-Math.PI/2;vals.forEach((v,i)=>{let e=a+v/sum*Math.PI*2;ctx.beginPath();ctx.moveTo(115,120);ctx.arc(115,120,88,a,e);ctx.closePath();ctx.fillStyle=colors[i];ctx.globalAlpha=.9;ctx.fill();a=e});ctx.globalAlpha=1;ctx.beginPath();ctx.arc(115,120,45,0,Math.PI*2);ctx.fillStyle='#00251f';ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 16px Cairo';ctx.fillText('24%',95,72);ctx.fillText('18%',165,122);ctx.fillText('16%',90,178);ctx.fillText('12%',45,139);ctx.fillText('16%',45,91);const labs=['601 إصدار بضائع تسليم','101 استلام بضائع/تحويل','Z51 تحويل مخزون (ميزان)','301 نقل مخزون لوحدة','653 مرتجعات غير مقيدة','أخرى'];$('#movementLegend').innerHTML=labs.map((l,i)=>`<div><span style="background:${colors[i]}"></span>${l}</div>`).join('')}
function drawLine(){const ctx=$('#lineChart').getContext('2d');ctx.clearRect(0,0,430,250);const inV=[900,1400,1300,1500,1950,1450,1350,1500,1600,2000,1500,1750,1850,1800,1600,1650,1900,2200,1800,2000,1700,1900,2150,2000,2250,1900],outV=[600,780,820,1000,1260,1100,980,1070,1020,1350,1150,1200,1300,1100,1300,1450,1350,1500,1600,1200,1350,1300,1500,1450,1550,1200];function axes(){ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;for(let i=0;i<6;i++){let y=215-i*34;ctx.beginPath();ctx.moveTo(35,y);ctx.lineTo(410,y);ctx.stroke()}ctx.fillStyle='#d6ead1';ctx.font='12px Cairo';ctx.fillText('2.5K',2,45);ctx.fillText('0',18,218);ctx.fillText('01/05',30,235);ctx.fillText('31/05',376,235)}function line(arr,c){ctx.strokeStyle=c;ctx.lineWidth=2;ctx.beginPath();arr.forEach((v,i)=>{let x=45+i*(350/(arr.length-1)),y=215-(v/2500)*170;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();arr.forEach((v,i)=>{let x=45+i*(350/(arr.length-1)),y=215-(v/2500)*170;ctx.beginPath();ctx.arc(x,y,3,0,7);ctx.fillStyle=c;ctx.fill()})}axes();line(inV,'#74c54a');line(outV,'#f1bb30');ctx.fillStyle='#74c54a';ctx.fillRect(200,18,10,10);ctx.fillStyle='#fff';ctx.fillText('حركات داخلة',215,28);ctx.fillStyle='#f1bb30';ctx.fillRect(295,18,10,10);ctx.fillStyle='#fff';ctx.fillText('حركات خارجة',310,28)}
function renderStock(){$('#stockSummary').innerHTML=[['إجمالي المخزون الحالي','125,430.600 طن'],['منتج تام (صب)','68,245.300 طن'],['منتج تام (معبأ)','32,187.150 طن'],['خامات','24,998.150 طن']].map(r=>`<div class="stock-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
function renderPlants(){const cards=APP_DATA.plants.map(p=>`<div class="plant-card"><div class="plant-icon"><img src="assets/img/logo.png" alt=""></div><strong>${p.name}</strong><br><span class="plant-code">${p.code}</span><br><small>${p.warehouses.length} مخزن</small></div>`).join('');$('#plantsCards').innerHTML=cards;$('#plantsFull').innerHTML=APP_DATA.plants.map(p=>`<div class="plant-card"><div class="plant-icon"><img src="assets/img/logo.png" alt=""></div><h3>${p.name}</h3><span class="plant-code">${p.code}</span><ul class="warehouse-list">${p.warehouses.map(w=>`<li><b>${w[0]}</b> - ${w[1]}</li>`).join('')}</ul></div>`).join('')}
const TABLE_STATE={};
function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));}
function stripHtml(v){const tmp=document.createElement('div');tmp.innerHTML=String(v??'');return (tmp.textContent||tmp.innerText||'').trim();}
function normalizeArabicDigits(v){return String(v??'').replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d));}

function warehouseMetaByCode(code){
  const target=String(code||'').trim().toUpperCase();
  for(const plant of APP_DATA.plants){
    const wh=plant.warehouses.find(w=>String(w[0]).toUpperCase()===target);
    if(wh) return {plant_code:plant.code,warehouse_code:wh[0],warehouse_type:wh[2],warehouse_name:wh[1]};
  }
  return {plant_code:'',warehouse_code:target,warehouse_type:'',warehouse_name:''};
}
const INBOUND_FILTERS_KEY='auditSystemInboundTopFilters';
function readSavedInboundFilters(){
  try{return JSON.parse(sessionStorage.getItem(INBOUND_FILTERS_KEY)||'null');}catch(_){return null;}
}
function saveInboundFilters(filters){
  try{sessionStorage.setItem(INBOUND_FILTERS_KEY,JSON.stringify(filters||{}));}catch(_){}
}
function clearSavedInboundFilters(){
  try{sessionStorage.removeItem(INBOUND_FILTERS_KEY);}catch(_){}
}
function updateInboundResultsCount(count){
  const node=$('#inboundResultsCount');
  if(node) node.textContent=`عدد الحركات المعروضة: ${Number(count||0).toLocaleString('en-US')}`;
}
function getInboundMovementStatus(row){
  const movementStatus=String(row.movement_cell_status || row.raw_result?.movement_cell_status || '').toLowerCase();
  const movement=String(row.incoming_movement_type || row.raw_result?.movement_type || '').trim().toUpperCase();
  const notCleared= row.scale_net_weight_to==null || row.scale_match_status==='not_cleared' || row.purchase_order_match_status==='not_cleared' || String(row.warning_message||'').includes('لم يتم التصفية');
  const weightDiff= !!row.weight_diff_status && !['ok','not_applicable'].includes(row.weight_diff_status);
  const cancelled= movementStatus==='red' || (['101','102'].includes(movement) && row.raw_result?.movement_group==='cancelled');
  const settledAfter= movementStatus==='gold' || (['Z13','101'].includes(movement) && movementStatus==='gold');
  const matched= !notCleared && !weightDiff && !cancelled && !settledAfter && row.scale_match_status==='matched' && row.warehouse_match_status==='matched' && row.purchase_order_match_status==='matched' && ['matched','supplier_vehicle_ok','not_applicable',null,undefined,''].includes(row.freight_match_status);
  if(cancelled) return 'cancelled';
  if(settledAfter) return 'settled_after';
  if(notCleared) return 'not_cleared';
  if(weightDiff) return 'weight_diff';
  if(matched) return 'matched';
  return 'all';
}
function getInboundTopFilters(){
  return {
    plant: $('#plantFilter')?.value || 'all',
    warehouse: $('#warehouseFilter')?.value || 'all',
    warehouseType: $('#warehouseTypeFilter')?.value || 'all',
    movement: ($('#movementFilter')?.value || 'all').toUpperCase(),
    status: $('#inboundStatusFilter')?.value || 'all',
    from: normalizeDateISO($('#fromDate')?.value || ''),
    to: normalizeDateISO($('#toDate')?.value || '')
  };
}
function inboundWarehouseCodesForFilters(filters){
  if(!filters) return [];
  if(filters.warehouse && filters.warehouse!=='all') return [String(filters.warehouse).toUpperCase()];
  return APP_DATA.plants
    .filter(p=>!filters.plant || filters.plant==='all' || p.code===filters.plant)
    .flatMap(p=>p.warehouses)
    .filter(w=>!filters.warehouseType || filters.warehouseType==='all' || w[2]===filters.warehouseType)
    .map(w=>String(w[0]).toUpperCase());
}
function inboundRowMatchesTopFilters(row,filters){
  if(!filters) return true;
  const whCode=String(row.mb51_warehouse_code || row.scale_warehouse_code || '').trim().toUpperCase();
  const meta=warehouseMetaByCode(whCode);
  const movement=String(row.incoming_movement_type || row.raw_result?.movement_type || '').trim().toUpperCase();
  if(filters.plant && filters.plant!=='all' && meta.plant_code!==filters.plant) return false;
  if(filters.warehouse && filters.warehouse!=='all' && whCode!==String(filters.warehouse).toUpperCase()) return false;
  if(filters.warehouseType && filters.warehouseType!=='all' && meta.warehouse_type!==filters.warehouseType) return false;
  if(filters.movement && filters.movement!=='ALL' && movement!==filters.movement) return false;
  if(filters.status && filters.status!=='all' && getInboundMovementStatus(row)!==filters.status) return false;
  return true;
}
function comparableValue(v){
  const txt=normalizeArabicDigits(stripHtml(v)).replace(/\s+/g,' ').trim();
  const numeric=Number(txt.replace(/,/g,'').replace(/[^0-9.\-]/g,''));
  if(txt && Number.isFinite(numeric) && /\d/.test(txt)) return {type:'number',value:numeric};
  const iso=txt.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy=txt.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(iso){return {type:'date',value:new Date(`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`).getTime()};}
  if(dmy){return {type:'date',value:new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`).getTime()};}
  return {type:'text',value:txt.toLowerCase()};
}
function table(el,heads,rows){
  const node=$(el); if(!node) return;
  const key=node.id||el;
  if(!TABLE_STATE[key]) TABLE_STATE[key]={filters:Array(heads.length).fill(''),sortIndex:null,sortDir:'asc'};
  const state=TABLE_STATE[key];
  if(!Array.isArray(state.filters) || state.filters.length!==heads.length) state.filters=Array(heads.length).fill('');
  let visible=[...(rows||[])];
  visible=visible.filter(row=>state.filters.every((f,i)=>!f || stripHtml(row[i]).toLowerCase().includes(String(f).toLowerCase())));
  if(state.sortIndex!==null){
    const idx=state.sortIndex, dir=state.sortDir==='desc'?-1:1;
    visible.sort((a,b)=>{
      const av=comparableValue(a[idx]);
      const bv=comparableValue(b[idx]);
      if(av.type===bv.type && av.value<bv.value) return -1*dir;
      if(av.type===bv.type && av.value>bv.value) return 1*dir;
      return String(av.value).localeCompare(String(bv.value),'ar')*dir;
    });
  }
  const headHtml=heads.map((h,i)=>{
    const arrow=state.sortIndex===i?(state.sortDir==='asc'?'▲':'▼'):'↕';
    return `<th class="sortable-th"><button type="button" class="sort-btn" data-col="${i}">${escapeHtml(h)} <span>${arrow}</span></button></th>`;
  }).join('');
  const filterHtml=heads.map((h,i)=>`<th><input class="col-filter" data-col="${i}" value="${escapeHtml(state.filters[i]||'')}" placeholder="بحث ${escapeHtml(h)}" /></th>`).join('');
  const bodyHtml=visible.length
    ? visible.map(r=>`<tr>${heads.map((_,i)=>`<td>${r[i]??''}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${heads.length}" class="empty-row">لا توجد بيانات مطابقة</td></tr>`;
  
function numericCellValue(v){
  if(v===null||v===undefined) return 0;
  const n=parseFloat(String(v).replace(/,/g,'').trim());
  return Number.isFinite(n)?n:0;
}
let footerHtml='';
  if(key==='salesTable' && heads.length>=8){
    const totalIndexes=[3,4,5,6,7];
    const totals=totalIndexes.map(idx=>visible.reduce((sum,row)=>sum+numericCellValue(row[idx]),0));
    footerHtml=`<tfoot><tr class="sales-total-row"><td colspan="3">الإجمالي</td>${totals.map(v=>`<td>${fmt(v)}</td>`).join('')}</tr></tfoot>`;
  }
  node.innerHTML=`<thead><tr>${headHtml}</tr><tr class="column-filter-row">${filterHtml}</tr></thead><tbody>${bodyHtml}</tbody>${footerHtml}`;
  node.querySelectorAll('.sort-btn').forEach(btn=>{
    btn.onclick=()=>{
      const col=Number(btn.dataset.col);
      if(state.sortIndex===col) state.sortDir=state.sortDir==='asc'?'desc':'asc';
      else {state.sortIndex=col;state.sortDir='asc';}
      table(el,heads,rows);
    };
  });
  node.querySelectorAll('.col-filter').forEach(input=>{
    input.oninput=()=>{
      const col=Number(input.dataset.col);
      state.filters[col]=input.value;
      const pos=input.selectionStart;
      table(el,heads,rows);
      const next=node.querySelector(`.col-filter[data-col="${col}"]`);
      if(next){ next.focus(); try{next.setSelectionRange(pos,pos);}catch(_){}}
    };
  });
}


function cleanHeaderText(text){
  return String(text||'').replace(/[▲▼↕]/g,'').replace(/\s+/g,' ').trim();
}
function tableExportMatrix(tableId){
  const tbl=document.getElementById(tableId);
  if(!tbl) return [];
  const header=[...tbl.querySelectorAll('thead tr:first-child th')].map(th=>cleanHeaderText(th.textContent));
  const rows=[...tbl.querySelectorAll('tbody tr')]
    .filter(tr=>!tr.querySelector('.empty-row'))
    .map(tr=>[...tr.cells].map(td=>stripHtml(td.innerHTML).replace(/\s+/g,' ').trim()));
  const footer=[...tbl.querySelectorAll('tfoot tr')]
    .map(tr=>[...tr.cells].flatMap(td=>{
      const span=Number(td.getAttribute('colspan')||1);
      const txt=stripHtml(td.innerHTML).replace(/\s+/g,' ').trim();
      return [txt,...Array(Math.max(0,span-1)).fill('')];
    }));
  return [header,...rows,...footer].filter(r=>r.length);
}
function exportTableToExcel(tableId,reportTitle){
  const matrix=tableExportMatrix(tableId);
  if(!matrix.length || matrix.length===1){ alert('لا توجد بيانات للتصدير.'); return; }
  if(!window.XLSX){ alert('مكتبة Excel غير محملة.'); return; }
  const meta=[
    [reportTitle],
    ['تاريخ التصدير', new Date().toLocaleString('ar-EG')],
    []
  ];
  const ws=XLSX.utils.aoa_to_sheet([...meta,...matrix]);
  ws['!cols']=matrix[0].map((_,i)=>({wch:Math.max(14,...matrix.map(r=>String(r[i]||'').length).slice(0,500).map(n=>Math.min(n,42)))}));
  ws['!rtl']=true;
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:meta.length,c:0},e:{r:meta.length,c:Math.max(0,matrix[0].length-1)}})};
  const wb=XLSX.utils.book_new();
  wb.Workbook={Views:[{RTL:true}]};
  XLSX.utils.book_append_sheet(wb,ws,'التقرير');
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  XLSX.writeFile(wb,`${reportTitle}-${stamp}.xlsx`,{bookType:'xlsx',cellStyles:true});
}
function exportTableToPdf(tableId,reportTitle){
  const matrix=tableExportMatrix(tableId);
  if(!matrix.length || matrix.length===1){ alert('لا توجد بيانات للتصدير.'); return; }
  if(!window.html2pdf){ alert('مكتبة PDF غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }

  const head=matrix[0];
  const body=matrix.slice(1);
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  const safeTitle=String(reportTitle||'Report').replace(/[\\/:*?"<>|]/g,'-');
  const wrapper=document.createElement('div');
  wrapper.dir='rtl';
  wrapper.lang='ar';
  wrapper.style.cssText='position:fixed;left:0;top:0;width:1120px;background:#fff;color:#111;font-family:Cairo,Arial,sans-serif;padding:18px;box-sizing:border-box;direction:rtl;z-index:-1;pointer-events:none;';
  wrapper.innerHTML=`
    <div style="text-align:center;margin-bottom:10px;">
      <h1 style="font-size:22px;margin:0 0 6px;font-weight:800;">${escapeHtml(reportTitle)}</h1>
      <div style="font-size:12px;color:#444;">تاريخ التصدير: ${escapeHtml(new Date().toLocaleString('ar-EG'))}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;direction:rtl;table-layout:auto;">
      <thead><tr>${head.map(h=>`<th style="border:1px solid #666;padding:5px;background:#e8f3e4;text-align:center;font-weight:800;white-space:normal;">${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${body.map((r,idx)=>{
        const isTotal=idx===body.length-1 && r.includes('الإجمالي');
        return `<tr>${head.map((_,i)=>`<td style="border:1px solid #777;padding:4px 5px;text-align:center;vertical-align:middle;${isTotal?'background:#dff1d8;font-weight:800;':''}">${escapeHtml(r[i]||'')}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table>`;
  document.body.appendChild(wrapper);
  const options={
    margin:8,
    filename:`${safeTitle}-${stamp}.pdf`,
    image:{type:'jpeg',quality:0.98},
    html2canvas:{scale:2,useCORS:true,backgroundColor:'#ffffff',scrollX:0,scrollY:0,windowWidth:1120},
    jsPDF:{unit:'mm',format:'a4',orientation:'landscape'},
    pagebreak:{mode:['avoid-all','css','legacy']}
  };
  const finish=()=>{ try{ wrapper.remove(); }catch(_){} };
  const runExport=()=>html2pdf().set(options).from(wrapper).save().then(finish).catch(err=>{
    finish();
    console.error(err);
    alert('تعذر تصدير PDF. حاول مرة أخرى.');
  });
  if(document.fonts && document.fonts.ready){
    document.fonts.ready.then(()=>setTimeout(runExport,80));
  }else{
    setTimeout(runExport,80);
  }
}
function initReportExportButtons(){
  $('#salesExportExcelBtn')?.addEventListener('click',()=>exportTableToExcel('salesTable','مراجعة البيع والتحويلات'));
  $('#salesExportPdfBtn')?.addEventListener('click',()=>exportTableToPdf('salesTable','مراجعة البيع والتحويلات'));
  $('#inboundExportExcelBtn')?.addEventListener('click',()=>exportTableToExcel('inboundTable','مراجعة الوارد'));
  $('#inboundExportPdfBtn')?.addEventListener('click',()=>exportTableToPdf('inboundTable','مراجعة الوارد'));
}

function renderTables(){table('#latestTable',['التاريخ','رقم الحركة','كود الحركة','وصف الحركة','من مخزن','إلى مخزن','الكمية','الوحدة'],APP_DATA.latest);table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحويل'],APP_DATA.salesReviewSample);table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample)}
function renderTabs(){const salesWh=APP_DATA.plants.flatMap(p=>p.warehouses.filter(w=>['W401','W402','N401','N402','N411','N412','E401','E402'].includes(w[0])).map(w=>w[0]));$('#salesTabs').innerHTML=salesWh.map((w,i)=>`<button class="${i===0?'active':''}">${w}</button>`).join('');$('#inboundTabs').innerHTML=APP_DATA.plants.map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('')}
function renderAlerts(){$('#alertsBox').innerHTML=[['⚠','حركات لم يتم تسويتها','يوجد 28 حركة تحتاج إلى تسوية'],['!','فروق جرد','يوجد 12 مخزن به فروق جرد'],['ℹ','حركات ملغاة','يوجد 15 حركة ملغاة خلال الفترة']].map(a=>`<div class="alert"><span>${a[0]}</span><div><b>${a[1]}</b><small>${a[2]}</small></div></div>`).join('')}
function updateFiltersVisibility(section){
  const filters=$('#globalFilters');
  if(!filters) return;
  const visibleSections=['inbound'];
  const shouldShow=visibleSections.includes(section);
  filters.classList.toggle('filters-hidden',!shouldShow);
  filters.setAttribute('aria-hidden',shouldShow?'false':'true');
}
function switchSection(section){
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
  $$('.section').forEach(s=>s.classList.remove('active-section'));
  const target=$('#'+section);
  if(target) target.classList.add('active-section');
  updateFiltersVisibility(section);
}
function nav(){
  $$('.nav-item').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));
  const active=$('.nav-item.active')?.dataset.section || 'dashboard';
  updateFiltersVisibility(active);
}

function initSidebarToggle(){
  const shell = $('#appShell');
  const btn = $('#sidebarToggleBtn');
  if(!shell || !btn) return;
  const saved = localStorage.getItem('auditSidebarCollapsed') === '1';
  const apply = (collapsed)=>{
    shell.classList.toggle('sidebar-collapsed', collapsed);
    btn.textContent = collapsed ? '›' : '☰';
    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    btn.title = collapsed ? 'فتح القائمة' : 'إغلاق القائمة';
  };
  apply(saved);
  btn.onclick = ()=>{
    const collapsed = !shell.classList.contains('sidebar-collapsed');
    localStorage.setItem('auditSidebarCollapsed', collapsed ? '1' : '0');
    apply(collapsed);
  };
}
function renderAll(){renderKPIs();drawDonut();drawLine();renderStock();renderPlants();renderTables();renderTabs();renderAlerts()}
document.addEventListener('DOMContentLoaded',()=>{setDefaultDates();startCairoClock();dbBadge();initFilters();nav();initSidebarToggle();initReportExportButtons();renderAll()});

// === Supabase Sales Upload + Dynamic Sales Report ===
const SALES_WAREHOUSES = ['W401','W402','N401','N402','N411','N412','E401','E402'];
let activeSalesWarehouse = SALES_WAREHOUSES[0];
let activeSalesReportDate = '';
function todayISO(){const d=new Date();const c=new Date(d.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));return `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`;}
function normalizeDateISO(v){return v ? String(v).slice(0,10) : '';}
function currentUploaderName(userData){return CURRENT_APP_PROFILE?.full_name || userData?.user?.email || 'مستخدم';}

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
    const key=normalizeHeader(n);
    if(row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
    if(row[n] !== undefined && row[n] !== null && row[n] !== '') return row[n];
  }
  return '';
}
function getRawRowValue(rawRow,names){
  const row=rawRow&&typeof rawRow==='object'?rawRow:{};
  return getRowValue(row,names);
}
function getIncomingMovementType(row){
  return String(row?.movement_type || getRawRowValue(row?.raw_row,[
    'نوع الحركة','نوع الحركه','كود الحركة','كود الحركه','الحركة','حركة','MvT','Mvt','Movement Type','Movement type','Movement Type Code'
  ]) || '').trim();
}
function getIncomingMovementText(row){
  return String(row?.movement_text || getRawRowValue(row?.raw_row,[
    'وصف نوع الحركة','وصف نوع الحركه','وصف الحركة','وصف الحركه','نص الحركة','نص الحركه','Movement Text','Movement Type Text','Movement Description'
  ]) || '').trim();
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

function mapIncomingRows(rows,batchId){
  return rows.map((row,idx)=>{
    const normalized={};
    Object.entries(row).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
    const trxDateValue=getRowValue(normalized,['التاريخ','تاريخ الترحيل','Posting Date','Document Date','Date']);
    const materialName=String(getRowValue(normalized,['وصف المادة','وصف الصنف','Material Description','Short Text'])).trim();
    const uom=String(getRowValue(normalized,['وحدة القياس','الوحدة','UOM','Base Unit of Measure','Unit of Entry'])).trim().toUpperCase() || 'TO';
    return {
      batch_id: batchId,
      material_code: String(getRowValue(normalized,['كود المادة','المادة','Material','Material Code'])).trim(),
      material_name: materialName,
      quantity: parseArabicNumber(getRowValue(normalized,['الكمية','كمية','Quantity','Qty in Un. of Entry'])),
      uom,
      movement_type: String(getRowValue(normalized,['نوع الحركة','نوع الحركه','كود الحركة','كود الحركه','الحركة','حركة','Movement Type','Movement type','Movement Type Code','MvT','Mvt'])).trim(),
      movement_text: String(getRowValue(normalized,['وصف نوع الحركة','وصف نوع الحركه','وصف الحركة','وصف الحركه','نص الحركة','نص الحركه','Movement Text','Movement Type Text','Movement Description'])).trim(),
      warehouse_code: String(getRowValue(normalized,['المخزن','كود المخزن','Storage Location','SLoc'])).trim(),
      plant_code: String(getRowValue(normalized,['المصنع','تلمصنع','Plant'])).trim(),
      plant_name: String(getRowValue(normalized,['إسم المصنع','اسم المصنع','Plant Name'])).trim(),
      transaction_date: typeof trxDateValue === 'number' ? excelDateToISO(trxDateValue) : excelDateToISO(trxDateValue),
      purchase_order: String(getRowValue(normalized,['أمر الشراء','رقم أمر الشراء','Purchase Order','Purchasing Document','PO'])).trim(),
      vehicle_number: String(getRowValue(normalized,['رقم العربية','رقم السياره','رقم السيارة','Vehicle Number','Truck No'])).trim(),
      vehicle_description: String(getRowValue(normalized,['وصف العربية','وصف السياره','وصف السيارة','Vehicle Description','Truck Description'])).trim(),
      freight_description: String(getRowValue(normalized,['وصف النولون','نولون','Freight Description'])).trim(),
      freight_rate_per_ton: parseArabicNumber(getRowValue(normalized,['قيمة النولون للطن','قيمة النولون','نولون الطن','Freight Rate','Rate Per Ton'])),
      goods_type: materialName,
      raw_row: normalized
    };
  }).filter(r=>r.material_code && r.material_name && r.warehouse_code && r.plant_code);
}

function mapScaleRows(rows,batchId){
  return rows.map(row=>{
    const normalized={};
    Object.entries(row).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
    const trxDateValue=getRowValue(normalized,['التاريخ','تاريخ','Date']);
    return {
      batch_id: batchId,
      material_code: String(getRowValue(normalized,['المادة','كود المادة','Material','Material Code'])).trim(),
      material_name: String(getRowValue(normalized,['وصف المادة','وصف الصنف','Material Description'])).trim(),
      net_weight_kg: parseArabicNumber(getRowValue(normalized,['صافي الميزان','صافى الميزان','صافي الوزن','Net Weight'])),
      plant_code: String(getRowValue(normalized,['المصنع','Plant'])).trim(),
      warehouse_code: String(getRowValue(normalized,['المخزن','Storage Location','SLoc'])).trim(),
      purchase_order: String(getRowValue(normalized,['أمر الشراء','رقم أمر الشراء','Purchase Order','PO'])).trim(),
      transaction_date: typeof trxDateValue === 'number' ? excelDateToISO(trxDateValue) : excelDateToISO(trxDateValue),
      vehicle_number: String(getRowValue(normalized,['رقم العربية','رقم السياره','رقم السيارة','Vehicle Number','Truck No'])).trim(),
      vehicle_description: String(getRowValue(normalized,['وصف العربية','وصف السياره','وصف السيارة','Vehicle Description'])).trim(),
      raw_row: normalized
    };
  }).filter(r=>r.material_code && r.net_weight_kg && r.plant_code && r.warehouse_code && r.purchase_order && r.vehicle_number);
}

function mapFreightRows(rows,batchId){
  return rows.map((row,idx)=>{
    const normalized={};
    Object.entries(row).forEach(([k,v])=>normalized[normalizeHeader(k)]=v);
    const plantRaw=String(getRowValue(normalized,['المصنع','كود المصنع','Plant','Plant Code'])).trim();
    return {
      batch_id: batchId,
      freight_description: String(getRowValue(normalized,['وصف النولون','نولون','Freight Description'])).trim(),
      goods_type: String(getRowValue(normalized,['نوع البضاعه','نوع البضاعة','نوع البضاعة ','وصف المادة','Goods Type','Material Description'])).trim(),
      plant_code: normalizePlantCodeForAudit(plantRaw),
      vehicle_description: String(getRowValue(normalized,['وصف العربية','وصف السياره','وصف السيارة','Vehicle Description','Truck Description'])).trim(),
      rate_per_ton: parseArabicNumber(getRowValue(normalized,['قيمة النولون للطن','قيمة النولون','نولون الطن','Freight Rate','Rate Per Ton'])),
      is_active: true,
      source_row_number: idx+2,
      raw_row: normalized
    };
  }).filter(r=>r.freight_description && r.goods_type && r.plant_code && r.vehicle_description && Number.isFinite(Number(r.rate_per_ton)));
}

function stripHiddenUnicode(v){return String(v||'').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g,'');}
function normText(v){return stripHiddenUnicode(v).replace(/\s+/g,' ').trim();}
function normKeepSapSpaces(v){return stripHiddenUnicode(v).trim();}
function normKey(v){return normText(v).toLowerCase();}
function normKeyKeepSapSpaces(v){return normKeepSapSpaces(v).toLowerCase();}
function containsNormalizedText(full,part){
  const f=normKey(full);
  const p=normKey(part);
  return !!p && (f===p || f.includes(p) || p.includes(f));
}
function freightDescriptionKey(v){return normKeyKeepSapSpaces(v);}
function isSupplierVehicle(vehicleNumber, vehicleDescription){
  const no=normText(vehicleNumber);
  const desc=normText(vehicleDescription);
  return !desc || no.includes('س') || (!no.startsWith('300') && !desc);
}
function incomingTypeFromVehicle(vehicleNumber, vehicleDescription){
  return isSupplierVehicle(vehicleNumber, vehicleDescription) ? 'وصّال' : 'أرضة';
}
function isRateEqual(a,b){return Math.abs(Number(a||0)-Number(b||0)) < 0.005;}
async function fetchAllRows(tableName, select='*', buildQuery){
  let all=[];
  for(let from=0;;from+=1000){
    let q=WarehouseDB.client.from(tableName).select(select).range(from,from+999);
    if(buildQuery) q=buildQuery(q);
    const {data,error}=await q;
    if(error) throw error;
    all=all.concat(data||[]);
    if(!data || data.length<1000) break;
  }
  return all;
}
function auditStatusCell(value,status){
  const map={green:'#0f5f35',red:'#7a1f1f',yellow:'#7a6a1f',gold:'#b98612',neutral:'transparent'};
  const color=map[status]||map.neutral;
  const glow=status==='gold' ? 'box-shadow:0 0 12px rgba(241,191,48,.85);border:1px solid rgba(255,225,120,.9);font-weight:800;' : '';
  return `<span style="display:block;padding:6px 8px;border-radius:8px;background:${color};color:#fff;${glow}">${value ?? '-'}</span>`;
}
function normalizePlantCodeForAudit(value, warehouseCode=''){
  const v=normKey(value);
  const wh=normKey(warehouseCode).toUpperCase();
  if(['wf01','w'].includes(v) || v.includes('الواحة') || v.includes('واحه')) return 'WF01';
  if(['el01','n'].includes(v) || v.includes('السواقي') || v.includes('الايمان') || v.includes('الإيمان')) return 'EL01';
  if(['el02','e'].includes(v) || v.includes('العامرية') || v.includes('عامريه')) return 'EL02';
  if(wh.startsWith('W')) return 'WF01';
  if(wh.startsWith('N')) return 'EL01';
  if(wh.startsWith('E')) return 'EL02';
  return String(value||'').trim();
}
function normalizeVehicleClass(value){
  const v=normText(value);
  const checks=['قاطرة','قاطره','تريلا','وش','جامبو','دبابة','دبابه'];
  return checks.find(x=>v.includes(x)) || v;
}
function normalizeGoodsTypeForFreight(value){
  const v=normText(value);
  if(!v) return '';
  if(v.includes('سولار')) return 'سولار';
  return 'باقي الأصناف ما عدا السولار';
}
function goodsTypeMatchesReference(refGoods, materialName){
  const ref=normKey(refGoods);
  const mat=normKey(materialName);
  const group=normKey(normalizeGoodsTypeForFreight(materialName));
  if(!ref) return false;
  if(ref===mat || ref===group) return true;
  if(ref.includes('باقي الأصناف') && group.includes('باقي الأصناف')) return true;
  return false;
}
function freightKey(parts){return parts.map(normKey).join('|');}
function analyzeFreightReference(freightRows,r){
  const plant=normalizePlantCodeForAudit(r.plant_code || r.plant_name,r.warehouse_code);
  const vehicleDesc=r.vehicle_description;
  const freightDesc=freightDescriptionKey(r.freight_description);
  const materialName=r.goods_type || r.material_name;
  const active=freightRows||[];
  const byPlant=active.filter(f=>normKey(normalizePlantCodeForAudit(f.plant_code))===normKey(plant));
  if(!byPlant.length){
    return {ref:null,reason:'لا يوجد مصنع مطابق في مرجع النولون'};
  }
  const byVehicle=byPlant.filter(f=>{
    const refVehicle=f.vehicle_description;
    return containsNormalizedText(vehicleDesc, refVehicle)
      || normKey(normalizeVehicleClass(vehicleDesc))===normKey(normalizeVehicleClass(refVehicle));
  });
  if(!byVehicle.length){
    return {ref:null,reason:'وصف العربية غير مطابق مع مرجع النولون'};
  }
  const byFreight=byVehicle.filter(f=>freightDescriptionKey(f.freight_description)===freightDesc);
  if(!byFreight.length){
    return {ref:null,reason:'وصف النولون غير مطابق مع مرجع النولون'};
  }
  const ref=byFreight.find(f=>goodsTypeMatchesReference(f.goods_type,materialName));
  if(!ref){
    return {ref:null,reason:'نوع البضاعة / وصف المادة غير مطابق مع مرجع النولون'};
  }
  return {ref,reason:'تم العثور على سطر نولون مرجعي مطابق'};
}
function findFreightReference(freightRows,r){
  return analyzeFreightReference(freightRows,r).ref;
}
function movementCellStatusFromGroup(movementType,group){
  const mt=normKey(movementType).toUpperCase();
  if(!group?.has102) return 'neutral';
  if(mt==='101' || mt==='102') return 'red';
  if(mt==='Z13') return 'gold';
  return 'neutral';
}
function buildMovementCellStatusIndex(rows){
  const grouped=new Map();
  (rows||[]).forEach((row,sourceIndex)=>{
    const key=[row.material_code,row.purchase_order,row.vehicle_number].map(normKey).join('|');
    if(!grouped.has(key)) grouped.set(key,[]);
    grouped.get(key).push({row,sourceIndex,mt:normKey(getIncomingMovementType(row)).toUpperCase()});
  });
  const statusById=new Map();
  grouped.forEach(items=>{
    const sorted=items.slice().sort((a,b)=>{
      const ai=Number(a.row?.id||0), bi=Number(b.row?.id||0);
      if(ai && bi && ai!==bi) return ai-bi;
      return a.sourceIndex-b.sourceIndex;
    });
    const firstCancelIndex=sorted.findIndex(x=>x.mt==='102');
    if(firstCancelIndex<0) return;
    sorted.forEach((item,idx)=>{
      let status='neutral';
      if(item.mt==='102') status='red';
      else if(item.mt==='101') status=idx>firstCancelIndex ? 'gold' : 'red';
      else if(item.mt==='Z13') status='gold';
      if(status!=='neutral') statusById.set(String(item.row?.id||item.sourceIndex),status);
    });
  });
  return statusById;
}
async function tryBuildIncomingAudit(reportDate, targetStatus){
  reportDate=normalizeDateISO(reportDate);
  if(!reportDate || !WarehouseDB?.ready) return {built:false,message:'لم يتم تحديد تاريخ التقرير.'};
  if(targetStatus) targetStatus.textContent='جاري فحص توفر MB51 والميزان لنفس التاريخ...';
  const {data:incomingBatch,error:incomingErr}=await WarehouseDB.client
    .from('incoming_upload_batches').select('id,report_date').eq('report_type','incoming').eq('status','active').eq('report_date',reportDate).maybeSingle();
  if(incomingErr) throw incomingErr;
  const {data:scaleBatch,error:scaleErr}=await WarehouseDB.client
    .from('scale_upload_batches').select('id,report_date').eq('report_type','scale').eq('status','active').eq('report_date',reportDate).maybeSingle();
  if(scaleErr) throw scaleErr;
  if(!incomingBatch || !scaleBatch){
    const missing=!incomingBatch?'MB51':'تقرير الميزان';
    const msg=`تم الحفظ، ولم يتم إنشاء مراجعة الوارد لأن ${missing} غير متوفر لنفس التاريخ ${reportDate}.`;
    if(targetStatus) targetStatus.textContent=msg;
    return {built:false,message:msg};
  }
  if(targetStatus) targetStatus.textContent='التقريران متوفران. جاري بناء نتائج مراجعة الوارد...';
  const [incomingRows,scaleRows,freightRows]=await Promise.all([
    fetchAllRows('incoming_raw_transactions','*',q=>q.eq('batch_id',incomingBatch.id)),
    fetchAllRows('scale_raw_transactions','*',q=>q.eq('batch_id',scaleBatch.id)),
    fetchAllRows('incoming_freight_rates','*',q=>q.eq('is_active',true))
  ]);
  const scaleIndex=new Map();
  scaleRows.forEach(s=>{
    const key=[s.material_code,s.purchase_order,s.vehicle_number].map(normKey).join('|');
    if(!scaleIndex.has(key)) scaleIndex.set(key,[]);
    scaleIndex.get(key).push(s);
  });
  const movementGroupIndex=new Map();
  incomingRows.forEach(row=>{
    const key=[row.material_code,row.purchase_order,row.vehicle_number].map(normKey).join('|');
    if(!movementGroupIndex.has(key)) movementGroupIndex.set(key,{has101:false,has102:false,hasZ13:false});
    const group=movementGroupIndex.get(key);
    const mt=normKey(getIncomingMovementType(row)).toUpperCase();
    if(mt==='101') group.has101=true;
    if(mt==='102') group.has102=true;
    if(mt==='Z13') group.hasZ13=true;
  });
  const movementStatusIndex=buildMovementCellStatusIndex(incomingRows);
  await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',reportDate);
  const results=incomingRows.map(r=>{
    const key=[r.material_code,r.purchase_order,r.vehicle_number].map(normKey).join('|');
    const matches=scaleIndex.get(key)||[];
    const scale=matches.length===1?matches[0]:null;
    const quantityTo=String(r.uom||'').toUpperCase()==='KG' ? Number(r.quantity||0)/1000 : Number(r.quantity_to ?? r.quantity ?? 0);
    const movementGroup=movementGroupIndex.get(key)||{};
    const incomingMovementType=getIncomingMovementType(r);
    const incomingMovementText=getIncomingMovementText(r);
    const movementCellStatus=movementStatusIndex.get(String(r.id)) || movementCellStatusFromGroup(incomingMovementType,movementGroup);
    const incomingType=incomingTypeFromVehicle(r.vehicle_number,r.vehicle_description);
    let scaleMatchStatus='not_cleared',scaleCellStatus='red',rowStatus='error',rowColor='red',warning='';
    let weightDiffTo=null,weightDiffPercent=null,weightDiffStatus='not_applicable';
    let warehouseStatus='not_applicable',poStatus='not_cleared';
    if(matches.length>1){ scaleMatchStatus='multiple_matches'; warning='يوجد أكثر من تصفية مطابقة لنفس المادة/أمر الشراء/رقم العربية.'; }
    else if(scale){
      scaleMatchStatus='matched'; scaleCellStatus='green';
      weightDiffTo=quantityTo-Number(scale.net_weight_to ?? (Number(scale.net_weight_kg||0)/1000));
      weightDiffPercent=quantityTo ? Math.abs(weightDiffTo)/Math.abs(quantityTo)*100 : null;
      weightDiffStatus=(weightDiffPercent!==null && weightDiffPercent<=0.3) ? 'ok' : 'out_of_tolerance';
      warehouseStatus=normKey(r.warehouse_code)===normKey(scale.warehouse_code)?'matched':'mismatch';
      poStatus=normKey(r.purchase_order)===normKey(scale.purchase_order)?'matched':'mismatch';
      rowStatus=(weightDiffStatus==='ok' && warehouseStatus==='matched' && poStatus==='matched')?'ok':'error';
      rowColor=rowStatus==='ok'?'green':'red';
    }else{
      warning='لم يتم التصفية في تاريخه';
      rowStatus='warning'; rowColor='yellow';
    }
    let freightStatus='not_applicable',refFreightDesc='',refRate=null,freightDiagnosis='غير مطبق';
    if(incomingType==='وصّال'){
      freightStatus=(!normText(r.freight_description) && isRateEqual(r.freight_rate_per_ton,0.01))?'supplier_vehicle_ok':'supplier_vehicle_mismatch';
      freightDiagnosis=freightStatus==='supplier_vehicle_ok' ? 'وصّال: وصف النولون فارغ والقيمة 0.01' : 'وصّال: قيمة النولون أو وصف النولون غير مطابق';
    }else{
      const freightAnalysis=analyzeFreightReference(freightRows,r);
      const ref=freightAnalysis.ref;
      freightDiagnosis=freightAnalysis.reason;
      if(ref){
        refFreightDesc=ref.freight_description; refRate=Number(ref.rate_per_ton||0);
        freightStatus=isRateEqual(r.freight_rate_per_ton,refRate)?'matched':'mismatch';
        freightDiagnosis=freightStatus==='matched' ? 'مطابق: المصنع + وصف المادة + وصف العربية + وصف النولون + القيمة' : `قيمة النولون غير مطابقة: MB51=${r.freight_rate_per_ton ?? '-'} / المرجع=${refRate}`;
      }else{
        freightStatus='mismatch';
      }
    }
    if(rowStatus==='ok' && !['matched','supplier_vehicle_ok','not_applicable'].includes(freightStatus)){rowStatus='error';rowColor='red';}
    return {
      report_date: reportDate,
      incoming_batch_id: incomingBatch.id,
      scale_batch_id: scaleBatch.id,
      incoming_transaction_id: r.id,
      scale_transaction_id: scale?.id || null,
      material_code: r.material_code,
      material_name: r.material_name,
      uom: r.uom,
      quantity_to: quantityTo,
      incoming_movement_type: incomingMovementType || '',
      incoming_movement_text: incomingMovementText || '',
      movement_cell_status: movementCellStatus,
      scale_net_weight_to: scale ? Number(scale.net_weight_to ?? (Number(scale.net_weight_kg||0)/1000)) : null,
      scale_match_status: scaleMatchStatus,
      scale_cell_status: scaleCellStatus,
      weight_diff_to: weightDiffTo,
      weight_diff_percent: weightDiffPercent,
      weight_diff_status: weightDiffStatus,
      mb51_warehouse_code: r.warehouse_code,
      scale_warehouse_code: scale?.warehouse_code || null,
      warehouse_match_status: warehouseStatus,
      mb51_purchase_order: r.purchase_order || '',
      scale_purchase_order: scale?.purchase_order || null,
      purchase_order_match_status: poStatus,
      vehicle_number: r.vehicle_number || '',
      incoming_type: incomingType,
      vehicle_description: r.vehicle_description || '',
      mb51_freight_description: r.freight_description || '',
      reference_freight_description: refFreightDesc,
      mb51_freight_rate_per_ton: Number(r.freight_rate_per_ton||0),
      reference_freight_rate_per_ton: refRate,
      freight_match_status: freightStatus,
      row_status: rowStatus,
      row_color: rowColor,
      warning_message: warning,
      raw_result: {scale_matches:matches.length,movement_group:movementGroup,movement_type:incomingMovementType,movement_text:incomingMovementText,movement_cell_status:movementCellStatus,movement_color_logic:'repost_101_gold_v2',plant_used_for_freight:normalizePlantCodeForAudit(r.plant_code || r.plant_name,r.warehouse_code),goods_used_for_freight:normalizeGoodsTypeForFreight(r.goods_type || r.material_name),vehicle_class_used_for_freight:normalizeVehicleClass(r.vehicle_description),freight_diagnosis:freightDiagnosis}
    };
  });
  if(results.length) await insertChunks('incoming_audit_results',results,300);
  if(targetStatus){ targetStatus.className='upload-status ok'; targetStatus.textContent=`تم إنشاء نتائج مراجعة الوارد تلقائياً: ${results.length} سطر لتاريخ ${reportDate}.`; }
  await refreshInboundReportDates(reportDate);
  await loadInboundAuditReport(reportDate);
  return {built:true,count:results.length};
}

async function insertChunks(tableName, rows, chunkSize=500){
  for(let i=0;i<rows.length;i+=chunkSize){
    const chunk=rows.slice(i,i+chunkSize);
    const {error}=await WarehouseDB.client.from(tableName).insert(chunk);
    if(error) throw error;
  }
}
async function upsertChunks(tableName, rows, chunkSize=500, onConflict=''){
  for(let i=0;i<rows.length;i+=chunkSize){
    const chunk=rows.slice(i,i+chunkSize);
    let q=WarehouseDB.client.from(tableName).upsert(chunk, onConflict ? {onConflict} : undefined);
    const {error}=await q;
    if(error) throw error;
  }
}
async function handleSalesFile(file){
  const status=$('#salesUploadStatus');
  const reportDate=normalizeDateISO($('#salesReportDateInput')?.value);
  status.className='upload-status';
  status.textContent='جاري قراءة الملف...';
  if(!reportDate){ status.textContent='اختار تاريخ التقرير أولاً.'; status.className='upload-status err'; return; }
  if(!WarehouseDB?.ready){ status.textContent='Supabase غير متصل. راجع ملف supabase-config.js'; status.className='upload-status err'; return; }
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){ status.textContent='سجل الدخول أولًا قبل رفع الملف.'; status.className='upload-status err'; return; }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    const payloadPreview=mapSalesRows(sourceRows,'00000000-0000-0000-0000-000000000000');
    if(!payloadPreview.length) throw new Error('لم يتم العثور على صفوف صالحة. راجع رؤوس الأعمدة.');

    const {data:existing,error:existingError}=await WarehouseDB.client
      .from('sales_upload_batches')
      .select('id,file_name,report_date')
      .eq('report_type','sales')
      .eq('report_date',reportDate)
      .eq('status','active');
    if(existingError) throw existingError;
    if(existing?.length){
      const ok=confirm(`يوجد تقرير مبيعات مرفوع بالفعل بتاريخ ${reportDate}.
هل تريد استبداله بالملف الجديد؟`);
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف النسخة القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      const {error:deleteError}=await WarehouseDB.client.from('sales_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
    }

    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة يومية بتاريخ ${reportDate}...`;
    const {data:batch,error:batchError}=await WarehouseDB.client.from('sales_upload_batches').insert({
      file_name:file.name,
      uploaded_by:userData.user.id,
      uploaded_by_name:currentUploaderName(userData),
      notes:'مراجعة مبيعات المنتج التام والتحويلات المخزنية',
      report_type:'sales',
      report_date:reportDate,
      row_count:payloadPreview.length,
      file_size_bytes:file.size || 0,
      status:'active'
    }).select('id').single();
    if(batchError) throw batchError;
    const payload=payloadPreview.map(r=>({...r,batch_id:batch.id}));
    status.textContent=`جاري رفع ${payload.length} سطر إلى Supabase...`;
    await insertChunks('sales_raw_transactions',payload,400);
    activeSalesReportDate=reportDate;
    status.textContent=`تم رفع ${payload.length} سطر بنجاح لتاريخ ${reportDate}.`;
    status.className='upload-status ok';
    await loadSalesBatches();
    await refreshSalesReportDates(reportDate);
    await loadSalesReport(activeSalesWarehouse);
  }catch(err){
    status.textContent=`خطأ أثناء الرفع: ${err.message || err}`;
    status.className='upload-status err';
  }
}
async function refreshSalesReportDates(preferredDate=''){
  const select=$('#salesReportDateSelect');
  if(!select || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('sales_upload_batches')
    .select('report_date')
    .eq('report_type','sales')
    .eq('status','active')
    .not('report_date','is',null)
    .order('report_date',{ascending:false});
  if(error){ console.error(error); return; }
  const dates=[...new Set((data||[]).map(x=>normalizeDateISO(x.report_date)).filter(Boolean))];
  const current=preferredDate || activeSalesReportDate || select.value || dates[0] || '';
  select.innerHTML='<option value="">كل النسخ المتاحة</option>'+dates.map(d=>`<option value="${d}">${d}</option>`).join('');
  if(current && dates.includes(current)) select.value=current;
  else select.value='';
  activeSalesReportDate=select.value;
  select.onchange=()=>{ activeSalesReportDate=select.value; loadSalesReport(activeSalesWarehouse); };
}
function formatFileSize(bytes){
  const n=Number(bytes||0);
  if(!n) return '-';
  if(n<1024) return `${n} B`;
  if(n<1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(2)} MB`;
}
async function loadSalesBatches(){
  const tbl=$('#salesBatchesTable');
  if(!tbl || !WarehouseDB?.ready){ return; }
  const {data,error}=await WarehouseDB.client
    .from('sales_upload_batches')
    .select('id,file_name,upload_date,uploaded_by,uploaded_by_name,report_date,row_count,file_size_bytes,status')
    .eq('report_type','sales')
    .eq('status','active')
    .order('report_date',{ascending:false});
  if(error){
    tbl.innerHTML=`<tbody><tr><td>خطأ تحميل السجل: ${error.message}</td></tr></tbody>`;
    return;
  }
  const rows=(data||[]).map(b=>[
    normalizeDateISO(b.report_date) || '-',
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    b.upload_date ? new Date(b.upload_date).toLocaleString('ar-EG') : '-',
    `<button class="small-action view" data-action="view" data-date="${normalizeDateISO(b.report_date)}">عرض</button>
     <button class="small-action replace" data-action="replace" data-date="${normalizeDateISO(b.report_date)}">استبدال</button>
     <button class="small-action delete" data-action="delete" data-id="${b.id}" data-date="${normalizeDateISO(b.report_date)}">حذف</button>`
  ]);
  table('#salesBatchesTable',['تاريخ التقرير','اسم الملف','عدد السطور','الحجم','الرافع','تاريخ الرفع','الإجراءات'],rows);
}
async function handleSalesBatchAction(btn){
  const action=btn.dataset.action;
  const date=btn.dataset.date || '';
  if(action==='view'){
    activeSalesReportDate=date;
    await refreshSalesReportDates(date);
    switchSection('sales');
    await loadSalesReport(activeSalesWarehouse);
  }
  if(action==='replace'){
    if($('#salesReportDateInput')) $('#salesReportDateInput').value=date;
    $('#salesExcelInput')?.click();
  }
  if(action==='delete'){
    if(!confirm(`سيتم حذف تقرير المبيعات بتاريخ ${date} وكل بياناته الخام. هل أنت متأكد؟`)) return;
    const {error:delError}=await WarehouseDB.client.from('sales_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء الحذف: '+delError.message); return; }
    await loadSalesBatches();
    await refreshSalesReportDates();
    await loadSalesReport(activeSalesWarehouse);
  }
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('#salesBatchesTable [data-action]');
  if(!btn) return;
  e.preventDefault();
  handleSalesBatchAction(btn);
});

async function handleIncomingFile(file){
  const status=$('#incomingUploadStatus');
  const reportDate=normalizeDateISO($('#incomingReportDateInput')?.value);
  if(!status) return;
  status.className='upload-status';
  status.textContent='جاري قراءة الملف...';
  if(!reportDate){ status.textContent='اختار تاريخ التقرير أولاً.'; status.className='upload-status err'; return; }
  if(!WarehouseDB?.ready){ status.textContent='Supabase غير متصل. راجع ملف supabase-config.js'; status.className='upload-status err'; return; }
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){ status.textContent='سجل الدخول أولًا قبل رفع الملف.'; status.className='upload-status err'; return; }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    const payloadPreview=mapIncomingRows(sourceRows,'00000000-0000-0000-0000-000000000000');
    if(!payloadPreview.length) throw new Error('لم يتم العثور على صفوف وارد صالحة. راجع رؤوس الأعمدة.');

    const {data:existing,error:existingError}=await WarehouseDB.client
      .from('incoming_upload_batches')
      .select('id,file_name,report_date')
      .eq('report_type','incoming')
      .eq('report_date',reportDate)
      .eq('status','active');
    if(existingError) throw existingError;
    if(existing?.length){
      const ok=confirm(`يوجد تقرير وارد MB51 مرفوع بالفعل بتاريخ ${reportDate}.
هل تريد استبداله بالملف الجديد؟`);
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف النسخة القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',reportDate);
      const {error:rawDeleteError}=await WarehouseDB.client.from('incoming_raw_transactions').delete().in('batch_id',ids);
      if(rawDeleteError) throw rawDeleteError;
      const {error:deleteError}=await WarehouseDB.client.from('incoming_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
    }

    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة وارد بتاريخ ${reportDate}...`;
    const {data:batch,error:batchError}=await WarehouseDB.client.from('incoming_upload_batches').insert({
      file_name:file.name,
      uploaded_by:userData.user.id,
      uploaded_by_name:currentUploaderName(userData),
      notes:'الوارد من MB51',
      report_type:'incoming',
      report_date:reportDate,
      row_count:payloadPreview.length,
      file_size_bytes:file.size || 0,
      status:'active'
    }).select('id').single();
    if(batchError) throw batchError;
    const payload=payloadPreview.map(r=>({...r,batch_id:batch.id}));
    status.textContent=`جاري رفع ${payload.length} سطر وارد إلى Supabase...`;
    await insertChunks('incoming_raw_transactions',payload,400);
    status.textContent=`تم رفع ${payload.length} سطر وارد بنجاح لتاريخ ${reportDate}.`;
    status.className='upload-status ok';
    await loadIncomingBatches();
    await tryBuildIncomingAudit(reportDate,status);
  }catch(err){
    status.textContent=`خطأ أثناء رفع الوارد: ${err.message || err}`;
    status.className='upload-status err';
  }
}
async function loadIncomingBatches(){
  const tbl=$('#incomingBatchesTable');
  if(!tbl || !WarehouseDB?.ready){ return; }
  const {data,error}=await WarehouseDB.client
    .from('incoming_upload_batches')
    .select('id,file_name,upload_date,uploaded_by,uploaded_by_name,report_date,row_count,file_size_bytes,status')
    .eq('report_type','incoming')
    .eq('status','active')
    .order('report_date',{ascending:false});
  if(error){
    tbl.innerHTML=`<tbody><tr><td>خطأ تحميل سجل الوارد: ${error.message}</td></tr></tbody>`;
    return;
  }
  const rows=(data||[]).map(b=>[
    normalizeDateISO(b.report_date) || '-',
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    b.upload_date ? new Date(b.upload_date).toLocaleString('ar-EG') : '-',
    `<button class="small-action view" data-action="view" data-date="${normalizeDateISO(b.report_date)}">عرض</button>
     <button class="small-action replace" data-action="replace" data-date="${normalizeDateISO(b.report_date)}">استبدال</button>
     <button class="small-action delete" data-action="delete" data-id="${b.id}" data-date="${normalizeDateISO(b.report_date)}">حذف</button>`
  ]);
  table('#incomingBatchesTable',['تاريخ التقرير','اسم الملف','عدد السطور','الحجم','الرافع','تاريخ الرفع','الإجراءات'],rows);
}
async function handleIncomingBatchAction(btn){
  const action=btn.dataset.action;
  const date=btn.dataset.date || '';
  if(action==='view'){
    switchSection('inbound');
    await refreshInboundReportDates(date);
    await loadInboundAuditReport(date);
  }
  if(action==='replace'){
    if($('#incomingReportDateInput')) $('#incomingReportDateInput').value=date;
    $('#incomingExcelInput')?.click();
  }
  if(action==='delete'){
    if(!confirm(`سيتم حذف تقرير الوارد بتاريخ ${date} وكل بياناته الخام. هل أنت متأكد؟`)) return;
    await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',date);
    const {error:rawDeleteError}=await WarehouseDB.client.from('incoming_raw_transactions').delete().eq('batch_id',btn.dataset.id);
    if(rawDeleteError){ alert('خطأ أثناء حذف بيانات الوارد: '+rawDeleteError.message); return; }
    const {error:delError}=await WarehouseDB.client.from('incoming_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء حذف نسخة الوارد: '+delError.message); return; }
    await loadIncomingBatches();
  }
}

async function handleScaleFile(file){
  const status=$('#scaleUploadStatus');
  const reportDate=normalizeDateISO($('#scaleReportDateInput')?.value);
  if(!status) return;
  status.className='upload-status';
  status.textContent='جاري قراءة ملف الميزان...';
  if(!reportDate){ status.textContent='اختار تاريخ التقرير أولاً.'; status.className='upload-status err'; return; }
  if(!WarehouseDB?.ready){ status.textContent='Supabase غير متصل. راجع ملف supabase-config.js'; status.className='upload-status err'; return; }
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){ status.textContent='سجل الدخول أولًا قبل رفع الملف.'; status.className='upload-status err'; return; }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    const payloadPreview=mapScaleRows(sourceRows,'00000000-0000-0000-0000-000000000000');
    if(!payloadPreview.length) throw new Error('لم يتم العثور على صفوف ميزان صالحة. راجع رؤوس الأعمدة.');
    const {data:existing,error:existingError}=await WarehouseDB.client
      .from('scale_upload_batches')
      .select('id,file_name,report_date')
      .eq('report_type','scale')
      .eq('report_date',reportDate)
      .eq('status','active');
    if(existingError) throw existingError;
    if(existing?.length){
      const ok=confirm(`يوجد تقرير ميزان مرفوع بالفعل بتاريخ ${reportDate}.\nهل تريد استبداله بالملف الجديد؟`);
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف نسخة الميزان القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',reportDate);
      const {error:rawDeleteError}=await WarehouseDB.client.from('scale_raw_transactions').delete().in('batch_id',ids);
      if(rawDeleteError) throw rawDeleteError;
      const {error:deleteError}=await WarehouseDB.client.from('scale_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
    }
    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة ميزان بتاريخ ${reportDate}...`;
    const {data:batch,error:batchError}=await WarehouseDB.client.from('scale_upload_batches').insert({
      file_name:file.name,
      uploaded_by:userData.user.id,
      uploaded_by_name:currentUploaderName(userData),
      notes:'تقرير الميزان',
      report_type:'scale',
      report_date:reportDate,
      row_count:payloadPreview.length,
      file_size_bytes:file.size || 0,
      status:'active'
    }).select('id').single();
    if(batchError) throw batchError;
    const payload=payloadPreview.map(r=>({...r,batch_id:batch.id}));
    status.textContent=`جاري رفع ${payload.length} سطر ميزان إلى Supabase...`;
    await insertChunks('scale_raw_transactions',payload,400);
    status.textContent=`تم رفع ${payload.length} سطر ميزان بنجاح لتاريخ ${reportDate}.`;
    status.className='upload-status ok';
    await loadScaleBatches();
    await tryBuildIncomingAudit(reportDate,status);
  }catch(err){
    status.textContent=`خطأ أثناء رفع تقرير الميزان: ${err.message || err}`;
    status.className='upload-status err';
  }
}
async function loadScaleBatches(){
  const tbl=$('#scaleBatchesTable');
  if(!tbl || !WarehouseDB?.ready){ return; }
  const {data,error}=await WarehouseDB.client
    .from('scale_upload_batches')
    .select('id,file_name,upload_date,uploaded_by,uploaded_by_name,report_date,row_count,file_size_bytes,status')
    .eq('report_type','scale')
    .eq('status','active')
    .order('report_date',{ascending:false});
  if(error){
    tbl.innerHTML=`<tbody><tr><td>خطأ تحميل سجل الميزان: ${error.message}</td></tr></tbody>`;
    return;
  }
  const rows=(data||[]).map(b=>[
    normalizeDateISO(b.report_date) || '-',
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    b.upload_date ? new Date(b.upload_date).toLocaleString('ar-EG') : '-',
    `<button class="small-action view" data-action="view" data-date="${normalizeDateISO(b.report_date)}">عرض المراجعة</button>
     <button class="small-action replace" data-action="replace" data-date="${normalizeDateISO(b.report_date)}">استبدال</button>
     <button class="small-action delete" data-action="delete" data-id="${b.id}" data-date="${normalizeDateISO(b.report_date)}">حذف</button>`
  ]);
  table('#scaleBatchesTable',['تاريخ التقرير','اسم الملف','عدد السطور','الحجم','الرافع','تاريخ الرفع','الإجراءات'],rows);
}
async function handleScaleBatchAction(btn){
  const action=btn.dataset.action;
  const date=btn.dataset.date || '';
  if(action==='view'){
    switchSection('inbound');
    await refreshInboundReportDates(date);
    await loadInboundAuditReport(date);
  }
  if(action==='replace'){
    if($('#scaleReportDateInput')) $('#scaleReportDateInput').value=date;
    $('#scaleExcelInput')?.click();
  }
  if(action==='delete'){
    if(!confirm(`سيتم حذف تقرير الميزان بتاريخ ${date} وكل بياناته الخام ونتائج مراجعة الوارد المبنية عليه. هل أنت متأكد؟`)) return;
    await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',date);
    const {error:rawDeleteError}=await WarehouseDB.client.from('scale_raw_transactions').delete().eq('batch_id',btn.dataset.id);
    if(rawDeleteError){ alert('خطأ أثناء حذف بيانات الميزان: '+rawDeleteError.message); return; }
    const {error:delError}=await WarehouseDB.client.from('scale_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء حذف نسخة الميزان: '+delError.message); return; }
    await loadScaleBatches();
    await refreshInboundReportDates();
    await loadInboundAuditReport();
  }
}
function initScaleUploader(){
  const input=$('#scaleExcelInput'), btn=$('#pickScaleFileBtn'), dz=$('#scaleDropZone'), dateInput=$('#scaleReportDateInput');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  if(!input || !btn) return;
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleScaleFile(input.files[0]); input.value=''; };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleScaleFile(f)};
  }
  loadScaleBatches();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('#scaleBatchesTable [data-action]');
  if(!btn) return;
  e.preventDefault();
  handleScaleBatchAction(btn);
});
async function refreshInboundReportDates(preferredDate=''){
  const select=$('#inboundReportDateSelect');
  if(!select || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('incoming_audit_results')
    .select('report_date')
    .not('report_date','is',null)
    .order('report_date',{ascending:false});
  if(error){ console.error(error); return; }
  const dates=[...new Set((data||[]).map(x=>normalizeDateISO(x.report_date)).filter(Boolean))];
  const current=preferredDate || select.value || dates[0] || '';
  select.innerHTML='<option value="">اختر تاريخ المراجعة</option>'+dates.map(d=>`<option value="${d}">${d}</option>`).join('');
  if(current && dates.includes(current)) select.value=current;
  select.onchange=()=>loadInboundAuditReport(select.value,{useSavedFilters:true,forceDate:true});
}
async function loadInboundAuditReport(date='',options={}){
  const tbl=$('#inboundTable');
  if(!tbl || !WarehouseDB?.ready) return;
  const savedFilters=options.useSavedFilters ? readSavedInboundFilters() : null;
  const useTopFilters=!!options.useTopFilters || !!savedFilters;
  const topFilters=useTopFilters ? (savedFilters || getInboundTopFilters()) : null;
  const selected=normalizeDateISO(date || (!options.ignoreSelectedDate ? $('#inboundReportDateSelect')?.value : '') || '');
  const heads=['تاريخ التقرير','المادة','وصف المادة','وحدة القياس','الكمية','صافي الميزان','فرق الوزن %','نوع الحركة','مخزن MB51','مخزن الميزان','أمر الشراء MB51','أمر الشراء الميزان','رقم العربية','نوع الوارد','وصف العربية','وصف النولون','قيمة النولون للطن','سبب مطابقة النولون'];
  let query=WarehouseDB.client
    .from('incoming_audit_results')
    .select('*');
  if(useTopFilters){
    if(options.forceDate && selected){
      query=query.eq('report_date',selected);
    }else{
      if(topFilters.from) query=query.gte('report_date',topFilters.from);
      if(topFilters.to) query=query.lte('report_date',topFilters.to);
    }
    const warehouseCodes=inboundWarehouseCodesForFilters(topFilters);
    if(warehouseCodes.length && warehouseCodes.length<APP_DATA.plants.flatMap(p=>p.warehouses).length) query=query.in('mb51_warehouse_code',warehouseCodes);
    if(topFilters.movement && topFilters.movement!=='ALL') query=query.eq('incoming_movement_type',topFilters.movement);
  }else if(selected){
    query=query.eq('report_date',selected);
  }else{
    updateInboundResultsCount(0);
    table('#inboundTable',heads,[]);
    return;
  }
  const {data,error}=await query
    .order('report_date',{ascending:false})
    .order('material_code',{ascending:true});
  if(error){ tbl.innerHTML=`<tbody><tr><td>خطأ تحميل مراجعة الوارد: ${error.message}</td></tr></tbody>`; return; }
  const filtered=(data||[]).filter(r=>inboundRowMatchesTopFilters(r,topFilters));
  updateInboundResultsCount(filtered.length);
  if((!useTopFilters || selected) && filtered.some(r=>!r.incoming_movement_type || !r.raw_result?.freight_diagnosis || r.raw_result?.movement_color_logic!=='repost_101_gold_v2') && !window.__incomingMovementRebuildOnce){
    window.__incomingMovementRebuildOnce=true;
    try{
      await tryBuildIncomingAudit(selected);
      return loadInboundAuditReport(selected);
    }catch(e){ console.warn('incoming audit rebuild skipped',e); }
  }
  const rows=filtered.map(r=>{
    const scaleStatus=r.scale_cell_status || (r.scale_match_status==='matched'?'green':r.row_color);
    const weightStatus=r.weight_diff_status==='ok'?'green':(r.weight_diff_status==='not_applicable'?'yellow':'red');
    const whStatus=r.warehouse_match_status==='matched'?'green':(r.warehouse_match_status==='not_applicable'?'yellow':'red');
    const poStatus=r.purchase_order_match_status==='matched'?'green':(r.purchase_order_match_status==='not_cleared'?'yellow':'red');
    const freightStatus=['matched','supplier_vehicle_ok'].includes(r.freight_match_status)?'green':(r.freight_match_status==='not_applicable'?'yellow':'red');
    const movementStatus=r.movement_cell_status || r.raw_result?.movement_cell_status || 'neutral';
    const movementValue=(r.incoming_movement_type || r.raw_result?.movement_type || '-') + (r.incoming_movement_text ? ' - '+r.incoming_movement_text : '');
    const values=[
      normalizeDateISO(r.report_date) || '-',
      r.material_code || '-',
      r.material_name || '-',
      r.uom || '-',
      fmt(r.quantity_to || 0),
      r.scale_net_weight_to==null ? (r.warning_message || 'لم يتم التصفية في تاريخه') : fmt(r.scale_net_weight_to),
      r.weight_diff_percent==null ? '-' : fmt(r.weight_diff_percent)+'%',
      movementValue,
      r.mb51_warehouse_code || '-',
      r.scale_warehouse_code || 'لم يتم التصفية في تاريخه',
      r.mb51_purchase_order || '-',
      r.scale_purchase_order || 'لم يتم التصفية في تاريخه',
      r.vehicle_number || '-',
      r.incoming_type || '-',
      r.vehicle_description || '-',
      r.mb51_freight_description || '-',
      r.mb51_freight_rate_per_ton==null ? '-' : fmt(r.mb51_freight_rate_per_ton),
      r.raw_result?.freight_diagnosis || '-'
    ];
    const normalStatuses=['neutral','neutral','neutral','neutral','neutral',scaleStatus,weightStatus,movementStatus,whStatus,whStatus,poStatus,poStatus,'neutral','neutral','neutral',freightStatus,freightStatus,freightStatus];
    let statuses=normalStatuses;
    if(movementStatus==='red'){
      statuses=values.map(()=> 'red');
    }else if(movementStatus==='gold'){
      statuses=values.map((_,i)=> i>=values.length-3 ? freightStatus : 'gold');
    }
    return values.map((v,i)=>statuses[i]==='neutral' ? v : auditStatusCell(v,statuses[i]));
  });
  table('#inboundTable',heads,rows);
}


async function handleFreightFile(file){
  const status=$('#freightUploadStatus');
  const referenceDate=normalizeDateISO($('#freightReferenceDateInput')?.value) || todayISO();
  if(!status) return;
  status.className='upload-status';
  status.textContent='جاري قراءة ملف نولون الوارد...';
  if(!WarehouseDB?.ready){ status.textContent='Supabase غير متصل. راجع ملف supabase-config.js'; status.className='upload-status err'; return; }
  const {data:userData}=await WarehouseDB.getUser();
  if(!userData?.user){ status.textContent='سجل الدخول أولًا قبل رفع الملف.'; status.className='upload-status err'; return; }
  try{
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const sourceRows=rowsFromWorkbook(workbook);
    if(!sourceRows.length) throw new Error('الملف لا يحتوي على بيانات.');
    const payloadPreview=mapFreightRows(sourceRows,'00000000-0000-0000-0000-000000000000');
    if(!payloadPreview.length) throw new Error('لم يتم العثور على صفوف نولون صالحة. راجع رؤوس الأعمدة.');
    const ok=confirm(`سيتم تحديث مرجع نولون الوارد بالكامل بعدد ${payloadPreview.length} صف.
سيتم تعطيل الصفوف القديمة غير الموجودة في الملف الجديد.
هل تريد المتابعة؟`);
    if(!ok){ status.textContent='تم إلغاء رفع مرجع النولون بدون تغيير البيانات.'; return; }
    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء سجل تحديث مرجع النولون...`;
    const {data:batch,error:batchError}=await WarehouseDB.client.from('freight_upload_batches').insert({
      file_name:file.name,
      reference_date:referenceDate,
      uploaded_by:userData.user.id,
      uploaded_by_name:currentUploaderName(userData),
      row_count:payloadPreview.length,
      file_size_bytes:file.size || 0,
      status:'active'
    }).select('id').single();
    if(batchError) throw batchError;
    status.textContent='جاري تعطيل مرجع النولون القديم...';
    const {error:disableError}=await WarehouseDB.client.from('incoming_freight_rates').update({is_active:false}).eq('is_active',true);
    if(disableError) throw disableError;
    const payload=payloadPreview.map(r=>({...r,batch_id:batch.id}));
    status.textContent=`جاري رفع ${payload.length} صف نولون إلى Supabase...`;
    await upsertChunks('incoming_freight_rates',payload,400,'freight_description,goods_type,plant_code,vehicle_description');
    status.textContent=`تم تحديث مرجع نولون الوارد بنجاح بعدد ${payload.length} صف.`;
    status.className='upload-status ok';
    await loadFreightBatches();
    await loadFreightRates();
  }catch(err){
    status.textContent=`خطأ أثناء رفع نولون الوارد: ${err.message || err}`;
    status.className='upload-status err';
  }
}
async function loadFreightBatches(){
  const tbl=$('#freightBatchesTable');
  if(!tbl || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('freight_upload_batches')
    .select('id,file_name,reference_date,upload_date,uploaded_by,uploaded_by_name,row_count,file_size_bytes,status')
    .neq('status','deleted')
    .order('upload_date',{ascending:false});
  if(error){ tbl.innerHTML=`<tbody><tr><td>خطأ تحميل سجل نولون الوارد: ${error.message}</td></tr></tbody>`; return; }
  const rows=(data||[]).map(b=>[
    normalizeDateISO(b.reference_date) || '-',
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    b.upload_date ? new Date(b.upload_date).toLocaleString('ar-EG') : '-',
    b.status || '-',
    `<button class="small-action view" data-action="view">عرض المرجع الحالي</button>
     <button class="small-action delete" data-action="delete" data-id="${b.id}">حذف</button>`
  ]);
  table('#freightBatchesTable',['تاريخ المرجع','اسم الملف','عدد السطور','الحجم','الرافع','تاريخ الرفع','الحالة','الإجراءات'],rows);
}
async function loadFreightRates(){
  const tbl=$('#freightRatesTable');
  if(!tbl || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('incoming_freight_rates')
    .select('freight_description,goods_type,plant_code,vehicle_description,rate_per_ton,is_active,updated_at')
    .eq('is_active',true)
    .order('plant_code',{ascending:true})
    .order('freight_description',{ascending:true});
  if(error){ tbl.innerHTML=`<tbody><tr><td>خطأ تحميل مرجع النولون: ${error.message}</td></tr></tbody>`; return; }
  const rows=(data||[]).map(r=>[
    r.freight_description || '-',
    r.goods_type || '-',
    r.plant_code || '-',
    r.vehicle_description || '-',
    fmt(r.rate_per_ton || 0),
    r.is_active ? 'نشط' : 'غير نشط',
    r.updated_at ? new Date(r.updated_at).toLocaleString('ar-EG') : '-'
  ]);
  table('#freightRatesTable',['وصف النولون','نوع البضاعة','المصنع','وصف العربية','قيمة النولون للطن','الحالة','آخر تحديث'],rows);
}
async function handleFreightBatchAction(btn){
  const action=btn.dataset.action;
  if(action==='view'){
    await loadFreightRates();
  }
  if(action==='delete'){
    if(!confirm('سيتم حذف هذا التحديث وتعطيل الصفوف المرتبطة به. هل أنت متأكد؟')) return;
    const id=btn.dataset.id;
    const {error:disableError}=await WarehouseDB.client.from('incoming_freight_rates').update({is_active:false}).eq('batch_id',id);
    if(disableError){ alert('خطأ أثناء تعطيل صفوف النولون: '+disableError.message); return; }
    const {error:batchError}=await WarehouseDB.client.from('freight_upload_batches').update({status:'deleted'}).eq('id',id);
    if(batchError){ alert('خطأ أثناء حذف سجل التحديث: '+batchError.message); return; }
    await loadFreightBatches();
    await loadFreightRates();
  }
}
function initFreightUploader(){
  const input=$('#freightExcelInput'), btn=$('#pickFreightFileBtn'), dz=$('#freightDropZone'), dateInput=$('#freightReferenceDateInput');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  if(!input || !btn) return;
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleFreightFile(input.files[0]); input.value=''; };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleFreightFile(f)};
  }
  loadFreightBatches();
  loadFreightRates();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('#freightBatchesTable [data-action]');
  if(!btn) return;
  e.preventDefault();
  handleFreightBatchAction(btn);
});

function initIncomingUploader(){
  const input=$('#incomingExcelInput'), btn=$('#pickIncomingFileBtn'), dz=$('#incomingDropZone'), dateInput=$('#incomingReportDateInput');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  if(!input || !btn) return;
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleIncomingFile(input.files[0]); input.value=''; };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleIncomingFile(f)};
  }
  loadIncomingBatches();
}
document.addEventListener('click',e=>{
  const btn=e.target.closest('#incomingBatchesTable [data-action]');
  if(!btn) return;
  e.preventDefault();
  handleIncomingBatchAction(btn);
});
function initSalesUploader(){
  const input=$('#salesExcelInput'), btn=$('#pickSalesFileBtn'), dz=$('#salesDropZone'), dateInput=$('#salesReportDateInput');
  if(dateInput && !dateInput.value) dateInput.value=todayISO();
  if(!input || !btn) return;
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleSalesFile(input.files[0]); input.value=''; };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleSalesFile(f)};
  }
  loadSalesBatches();
  refreshSalesReportDates();
}
async function loadSalesReport(warehouseCode){
  activeSalesWarehouse=warehouseCode;
  if(!WarehouseDB?.ready){ return; }
  let query=WarehouseDB.client.from('sales_audit_report').select('*').eq('warehouse_code',warehouseCode);
  if(activeSalesReportDate) query=query.eq('report_date',activeSalesReportDate);
  const {data,error}=await query.order('material_code');
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
  if($('#inboundTabs')) $('#inboundTabs').innerHTML=APP_DATA.plants.map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('');
};
renderTables = function(){
  table('#latestTable',['التاريخ','رقم الحركة','كود الحركة','وصف الحركة','من مخزن','إلى مخزن','الكمية','الوحدة'],APP_DATA.latest);
  table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));
  table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],[]);
  table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample);
};
document.addEventListener('DOMContentLoaded',()=>{initAuthPanel();initSalesUploader();initIncomingUploader();initScaleUploader();initFreightUploader();refreshInboundReportDates();setTimeout(()=>{loadSalesReport(activeSalesWarehouse);loadInboundAuditReport();},300);});

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
  setTimeout(()=>{
    loadSalesBatches();
    loadIncomingBatches();
    loadScaleBatches();
    refreshSalesReportDates();
    refreshInboundReportDates();
    loadSalesReport(activeSalesWarehouse);
    loadInboundAuditReport();
  },250);
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

// Upload reports tabs controller
function initUploadReportTabs(){
  const tabs=document.querySelectorAll('[data-upload-tab]');
  const panels=document.querySelectorAll('[data-upload-panel]');
  if(!tabs.length) return;
  tabs.forEach(tab=>{
    tab.addEventListener('click',()=>{
      if(tab.disabled) return;
      const key=tab.dataset.uploadTab;
      tabs.forEach(t=>t.classList.toggle('active',t===tab));
      panels.forEach(p=>p.classList.toggle('active',p.dataset.uploadPanel===key));
    });
  });
}
document.addEventListener('DOMContentLoaded',initUploadReportTabs);
