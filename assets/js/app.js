
function roundRect(ctx,x,y,w,h,r,fill,stroke){
  const rr=Math.min(r||0, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr); ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h); ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr); ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); ctx.closePath(); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}
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
    else if($('#dashboard')?.classList.contains('active-section')) loadDashboardRealData();
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


/* =========================================================
   Universal table engine: column search + asc/desc sorting
   Applies automatically to current and future visible system tables.
   ========================================================= */
const UNIVERSAL_TABLE_STATE = window.UNIVERSAL_TABLE_STATE || (window.UNIVERSAL_TABLE_STATE = {});
function universalTableKey(tbl){
  if(tbl.id) return tbl.id;
  if(!tbl.dataset.universalTableKey){
    tbl.dataset.universalTableKey='tbl_'+Math.random().toString(36).slice(2,10);
  }
  return tbl.dataset.universalTableKey;
}
function shouldSkipUniversalTable(tbl){
  if(!tbl || tbl.dataset.noUniversalTable==='1') return true;
  if(tbl.closest('.hidden-export-table')) return true;
  if(tbl.classList.contains('hidden-export-table')) return true;
  if(tbl.closest('.export-capture,.pdf-capture,.png-capture')) return true;
  if(tbl.querySelector('.sort-btn') || tbl.querySelector('.column-filter-row')) return true;
  const headRow=tbl.querySelector('thead tr');
  const body=tbl.querySelector('tbody');
  if(!headRow || !body) return true;
  const heads=[...headRow.cells];
  if(!heads.length) return true;
  const bodyRows=[...body.rows].filter(r=>!r.querySelector('.empty-row') && r.cells.length>1);
  if(!bodyRows.length) return true;
  return false;
}
function universalCellComparable(text){
  const raw=String(text||'').replace(/\s+/g,' ').trim();
  const numeric=raw.replace(/,/g,'').replace(/%/g,'').replace(/[^\x00-\x7F\-\.0-9]/g,'');
  if(numeric && /^-?\d+(\.\d+)?$/.test(numeric)) return {type:'num',value:Number(numeric)};
  const iso=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  const dmy=raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if(iso) return {type:'date',value:new Date(`${iso[1]}-${iso[2].padStart(2,'0')}-${iso[3].padStart(2,'0')}`).getTime()};
  if(dmy) return {type:'date',value:new Date(`${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`).getTime()};
  return {type:'text',value:raw.toLowerCase()};
}
function enhanceSystemTable(tbl){
  if(shouldSkipUniversalTable(tbl)) return;
  const key=universalTableKey(tbl);
  const headRow=tbl.querySelector('thead tr');
  const body=tbl.querySelector('tbody');
  const headers=[...headRow.cells].map(th=>cleanHeaderText(th.textContent));
  if(!UNIVERSAL_TABLE_STATE[key] || UNIVERSAL_TABLE_STATE[key].headersLength!==headers.length){
    UNIVERSAL_TABLE_STATE[key]={headersLength:headers.length,filters:Array(headers.length).fill(''),sortIndex:null,sortDir:'asc'};
  }
  const state=UNIVERSAL_TABLE_STATE[key];
  const originalRows=[...body.rows].map(tr=>({html:tr.innerHTML,texts:[...tr.cells].map(td=>stripHtml(td.innerHTML).replace(/\s+/g,' ').trim()),classes:tr.className||''}));
  function redraw(){
    let rows=[...originalRows];
    rows=rows.filter(r=>state.filters.every((f,i)=>!f || String(r.texts[i]||'').toLowerCase().includes(String(f).toLowerCase())));
    if(state.sortIndex!==null){
      const idx=state.sortIndex, dir=state.sortDir==='desc'?-1:1;
      rows.sort((a,b)=>{
        const av=universalCellComparable(a.texts[idx]);
        const bv=universalCellComparable(b.texts[idx]);
        if(av.type===bv.type){
          if(av.value<bv.value) return -1*dir;
          if(av.value>bv.value) return 1*dir;
          return 0;
        }
        return String(av.value).localeCompare(String(bv.value),'ar')*dir;
      });
    }
    body.innerHTML=rows.length?rows.map(r=>`<tr${r.classes?` class="${r.classes}"`:''}>${r.html}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="empty-row">لا توجد بيانات مطابقة</td></tr>`;
  }
  headRow.innerHTML=headers.map((h,i)=>{
    const arrow=state.sortIndex===i?(state.sortDir==='asc'?'▲':'▼'):'↕';
    return `<th class="sortable-th"><button type="button" class="sort-btn" data-col="${i}">${escapeHtml(h)} <span>${arrow}</span></button></th>`;
  }).join('');
  const filterRow=document.createElement('tr');
  filterRow.className='column-filter-row';
  filterRow.innerHTML=headers.map((h,i)=>`<th><input class="col-filter" data-col="${i}" value="${escapeHtml(state.filters[i]||'')}" placeholder="بحث ${escapeHtml(h)}"></th>`).join('');
  headRow.parentNode.appendChild(filterRow);
  tbl.classList.add('universal-filter-table');
  redraw();
  headRow.querySelectorAll('.sort-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const col=Number(btn.dataset.col);
      if(state.sortIndex===col) state.sortDir=state.sortDir==='asc'?'desc':'asc';
      else {state.sortIndex=col;state.sortDir='asc';}
      headRow.querySelectorAll('.sort-btn').forEach(b=>{
        const c=Number(b.dataset.col);
        const sp=b.querySelector('span');
        if(sp) sp.textContent=state.sortIndex===c?(state.sortDir==='asc'?'▲':'▼'):'↕';
      });
      redraw();
    });
  });
  filterRow.querySelectorAll('.col-filter').forEach(input=>{
    input.addEventListener('input',()=>{
      const col=Number(input.dataset.col);
      state.filters[col]=String(input.value||'').toLowerCase();
      const pos=input.selectionStart;
      redraw();
      const next=tbl.querySelector(`.column-filter-row .col-filter[data-col="${col}"]`);
      if(next){next.focus();try{next.setSelectionRange(pos,pos);}catch(_){}}
    });
  });
}
function enhanceSystemTables(root=document){
  try{[...root.querySelectorAll('table')].forEach(enhanceSystemTable);}catch(e){console.warn('Table enhancement skipped:',e);}
}
function initUniversalTableEnhancer(){
  enhanceSystemTables(document);
  if(window.__universalTableObserver) return;
  window.__universalTableObserver=new MutationObserver(()=>{
    if(window.__universalTableEnhanceTimer) clearTimeout(window.__universalTableEnhanceTimer);
    window.__universalTableEnhanceTimer=setTimeout(()=>enhanceSystemTables(document),80);
  });
  window.__universalTableObserver.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initUniversalTableEnhancer);
else initUniversalTableEnhancer();


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
async function saveBlobWithPicker(blob, suggestedName, mimeType){
  const fileName=String(suggestedName||'report').replace(/[\\/:*?"<>|]/g,'-');
  if(window.showSaveFilePicker){
    try{
      const lowerName=fileName.toLowerCase();
      const extension=lowerName.endsWith('.pdf') ? '.pdf' : (lowerName.endsWith('.xlsx') ? '.xlsx' : (lowerName.endsWith('.png') ? '.png' : ''));
      const description=extension==='.pdf' ? 'PDF File' : (extension==='.xlsx' ? 'Excel Workbook' : (extension==='.png' ? 'PNG Image' : 'File'));
      const pickerOptions={
        suggestedName:fileName,
        types:[{
          description,
          accept:{[mimeType||blob.type||'application/octet-stream']:[extension||'.bin']}
        }]
      };
      const handle=await window.showSaveFilePicker(pickerOptions);
      const writable=await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    }catch(err){
      if(err && err.name==='AbortError') return;
      console.warn('Save picker unavailable, using browser download fallback',err);
    }
  }
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=fileName;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); },1000);
}
async function exportTableToExcel(tableId,reportTitle){
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
  const safeTitle=String(reportTitle||'Report').replace(/[\\/:*?"<>|]/g,'-');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await saveBlobWithPicker(blob,`${safeTitle}-${stamp}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
async function exportTableToPdf(tableId,reportTitle){
  const matrix=tableExportMatrix(tableId);
  if(!matrix.length || matrix.length===1){ alert('لا توجد بيانات للتصدير.'); return; }
  const Html2Canvas=window.html2canvas;
  const JsPDF=(window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if(!Html2Canvas || !JsPDF){ alert('مكتبة PDF غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }

  const head=matrix[0];
  const body=matrix.slice(1);
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  const safeTitle=String(reportTitle||'Report').replace(/[\\/:*?"<>|]/g,'-');

  const exportLayer=document.createElement('div');
  exportLayer.id='pdfExportRenderLayer';
  exportLayer.style.cssText=[
    'position:fixed',
    'left:0',
    'top:0',
    'width:1600px',
    'min-height:400px',
    'background:#ffffff',
    'color:#111111',
    'font-family:Cairo,Arial,Tahoma,sans-serif',
    'padding:18px',
    'box-sizing:border-box',
    'direction:rtl',
    'z-index:2147483647',
    'opacity:1',
    'pointer-events:none',
    'overflow:visible'
  ].join(';')+';';
  exportLayer.dir='rtl';
  exportLayer.lang='ar';
  exportLayer.innerHTML=`
    <div style="text-align:center;margin-bottom:12px;color:#111;background:#fff;">
      <h1 style="font-size:24px;margin:0 0 8px;font-weight:800;color:#111;line-height:1.5;">${escapeHtml(reportTitle)}</h1>
      <div style="font-size:13px;color:#333;line-height:1.6;">تاريخ التصدير: ${escapeHtml(new Date().toLocaleString('ar-EG'))}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:10px;direction:rtl;background:#fff;color:#111;">
      <thead><tr>${head.map(h=>`<th style="border:1px solid #555;padding:6px 5px;background:#dff1d8;color:#111;text-align:center;font-weight:800;line-height:1.45;white-space:normal;">${escapeHtml(h)}</th>`).join('')}</tr></thead>
      <tbody>${body.map((r,idx)=>{
        const isTotal=(idx===body.length-1 && r.some(c=>String(c).includes('الإجمالي')));
        return `<tr>${head.map((_,i)=>`<td style="border:1px solid #777;padding:5px;background:${isTotal?'#e5f6dd':'#fff'};color:#111;text-align:center;vertical-align:middle;line-height:1.45;${isTotal?'font-weight:800;':''}">${escapeHtml(r[i]||'')}</td>`).join('')}</tr>`;
      }).join('')}</tbody>
    </table>`;

  document.body.appendChild(exportLayer);
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));

    const canvas=await Html2Canvas(exportLayer,{
      scale:2,
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#ffffff',
      logging:false,
      scrollX:0,
      scrollY:0,
      windowWidth:exportLayer.scrollWidth,
      windowHeight:exportLayer.scrollHeight
    });

    const pdf=new JsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const pageWidth=pdf.internal.pageSize.getWidth();
    const pageHeight=pdf.internal.pageSize.getHeight();
    const margin=7;
    const imgWidth=pageWidth-(margin*2);
    const imgHeight=(canvas.height*imgWidth)/canvas.width;
    const imgData=canvas.toDataURL('image/jpeg',0.95);

    let y=margin;
    let remainingHeight=imgHeight;
    pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
    remainingHeight-=pageHeight-(margin*2);
    while(remainingHeight>0){
      pdf.addPage('a4','landscape');
      y=margin-(imgHeight-remainingHeight);
      pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
      remainingHeight-=pageHeight-(margin*2);
    }

    const blob=pdf.output('blob');
    await saveBlobWithPicker(blob,`${safeTitle}-${stamp}.pdf`,'application/pdf');
  }catch(err){
    console.error(err);
    alert('تعذر تصدير PDF. حاول مرة أخرى.');
  }finally{
    try{ exportLayer.remove(); }catch(_){}
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


// === Real Dashboard From Uploaded/Audited Data ===
function toNumber(v){
  const n=Number(String(v??0).replace(/,/g,''));
  return Number.isFinite(n)?n:0;
}
function movementSign(movement){
  const m=String(movement||'').trim().toUpperCase();
  return ['102','Z14','602','653','Z52','352','302'].includes(m) ? -1 : 1;
}
function dashboardDateKey(v){return normalizeDateISO(v)||'غير محدد';}
function dashboardMovementLabel(m){
  const code=String(m||'').trim().toUpperCase()||'غير محدد';
  const names={
    '601':'601 بيع/تسليم','602':'602 إلغاء تسليم','653':'653 مرتجعات','654':'654 إلغاء مرتجع','101':'101 استلام','102':'102 إلغاء استلام','Z13':'Z13 استلام بعد التصفية','Z14':'Z14 إلغاء بدون ميزان','Z51':'Z51 تحويل صادر','Z52':'Z52 إلغاء تحويل','351':'351 تحويل صادر','352':'352 إلغاء تحويل','301':'301 نقل','302':'302 إلغاء نقل'
  };
  return names[code]||`${code} حركة أخرى`;
}
function dashboardPlantFromWarehouse(code){return warehouseMetaByCode(code).plant_code || 'غير محدد';}
function drawDashboardDonut(items){
  const canvas=$('#donutChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d'); ctx.clearRect(0,0,340,240);
  const entries=(items||[]).filter(x=>x.value>0).slice(0,8);
  const sum=entries.reduce((a,b)=>a+b.value,0);
  const legend=$('#movementLegend');
  const statsBox=$('#donutStats') || (()=>{const d=document.createElement('div');d.id='donutStats';d.className='chart-stats-row';legend?.after(d);return d;})();
  if(!sum){
    ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات مبيعات',170,120);ctx.textAlign='start';
    if(legend) legend.innerHTML='';
    if(statsBox) statsBox.innerHTML='<div><b>0</b><span>إجمالي المبيعات</span></div><div><b>0</b><span>عدد المخازن</span></div>';
    return;
  }
  let a=-Math.PI/2;
  entries.forEach((item,i)=>{
    const e=a+(item.value/sum)*Math.PI*2;
    ctx.beginPath();ctx.moveTo(130,120);ctx.arc(130,120,86,a,e);ctx.closePath();
    ctx.fillStyle=colors[i%colors.length];ctx.globalAlpha=.92;ctx.fill();a=e;
  });
  ctx.globalAlpha=1;
  ctx.beginPath();ctx.arc(130,120,48,0,Math.PI*2);ctx.fillStyle='#00251f';ctx.fill();
  ctx.fillStyle='#fff';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText(fmt(sum),130,118);
  ctx.font='bold 12px Cairo';ctx.fillStyle='#d8ffd1';ctx.fillText('طن',130,139);ctx.textAlign='start';
  if(legend){
    legend.classList.add('dashboard-donut-legend');
    legend.innerHTML=entries.map((it,i)=>{
      const pct=sum?((it.value/sum)*100).toFixed(1):'0.0';
      const code=String(it.label||'').split(' - ')[0];
      const name=String(it.label||'').replace(/^.*? - /,'');
      return `<div class="legend-row"><span class="dot" style="background:${colors[i%colors.length]}"></span><b>${escapeHtml(code)}</b><em>${escapeHtml(name)}</em><strong>${fmt(it.value)}</strong><small>${pct}%</small></div>`;
    }).join('');
  }
  if(statsBox){
    const top=entries[0];
    statsBox.innerHTML=`<div><b>${fmt(sum)}</b><span>إجمالي المبيعات</span></div><div><b>${entries.length}</b><span>عدد المخازن</span></div><div><b>${escapeHtml(String(top.label||'-').split(' - ')[0])}</b><span>أعلى مخزن</span></div>`;
  }
}
function drawDashboardLine(dailyMap){
  const canvas=$('#lineChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const legend=$('#lineChartLegend');
  const series=[
    {key:'sales',label:'البيع',color:'#83d84b'},
    {key:'production',label:'الإنتاج',color:'#32aee9'},
    {key:'outgoing',label:'الصادرة',color:'#ff9f2f'},
    {key:'incoming',label:'الواردة',color:'#b965ff'}
  ];
  if(legend){
    legend.innerHTML=series.map(s=>`<span><i style="background:${s.color};color:${s.color}"></i>${s.label}</span>`).join('');
  }
  const realDays=Object.keys(dailyMap||{}).sort().slice(-31);
  const summary=$('#lineSummary') || (()=>{const d=document.createElement('div');d.id='lineSummary';d.className='chart-stats-row';canvas.after(d);return d;})();
  if(!realDays.length){
    ctx.fillStyle='#d6ead1';ctx.font='bold 20px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2);ctx.textAlign='start';
    if(summary) summary.innerHTML='<div><b>0</b><span>البيع</span></div><div><b>0</b><span>الإنتاج</span></div><div><b>0</b><span>الصادرة</span></div><div><b>0</b><span>الواردة</span></div>';
    return;
  }
  const totals=series.map(s=>({ ...s, total:realDays.reduce((a,d)=>a+(dailyMap[d][s.key]||0),0) }));
  // Keep the chart as a real LINE chart even when the selected period is one day.
  // In that case we duplicate the same day visually to draw horizontal trend lines instead of isolated dots.
  const plotDays = realDays.length===1 ? [realDays[0], realDays[0]] : realDays;
  const valueFor=(day,key)=> (dailyMap[day]?.[key] || 0);
  const rawMax=Math.max(1,...realDays.flatMap(d=>series.map(s=>valueFor(d,s.key))));
  const max=Math.ceil((rawMax*1.12)/10)*10;
  const pad={l:60,r:20,t:18,b:44};
  const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;

  ctx.save();
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;
  ctx.font='bold 12px Cairo';ctx.fillStyle='#cfe8d0';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let i=0;i<=5;i++){
    const y=pad.t+ch-(i/5)*ch;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillText(fmt(max*i/5),pad.l-10,y);
  }
  ctx.strokeStyle='rgba(132,207,80,.35)';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,pad.t+ch);ctx.lineTo(w-pad.r,pad.t+ch);ctx.stroke();

  const xFor=(idx)=> plotDays.length===1 ? pad.l+cw/2 : pad.l+idx*(cw/(plotDays.length-1));
  const yFor=(v)=> pad.t+ch-(v/max)*ch;
  series.forEach(s=>{
    ctx.strokeStyle=s.color;ctx.lineWidth=3.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
    plotDays.forEach((d,i)=>{const x=xFor(i), y=yFor(valueFor(d,s.key)); i?ctx.lineTo(x,y):ctx.moveTo(x,y);});
    ctx.stroke();
    plotDays.forEach((d,i)=>{
      const x=xFor(i), y=yFor(valueFor(d,s.key));
      ctx.beginPath();ctx.arc(x,y,4.2,0,Math.PI*2);ctx.fillStyle=s.color;ctx.fill();
      ctx.strokeStyle='rgba(0,20,14,.85)';ctx.lineWidth=2;ctx.stroke();
    });
  });
  ctx.fillStyle='#d6ead1';ctx.font='bold 13px Cairo';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  const first=realDays[0]?.slice(5)||'';
  const last=realDays[realDays.length-1]?.slice(5)||first;
  ctx.fillText(first,pad.l,pad.t+ch+30);
  ctx.fillText(last,w-pad.r,pad.t+ch+30);
  ctx.restore();
  if(summary){summary.innerHTML=totals.map(s=>`<div><b>${fmt(s.total)}</b><span>${s.label}</span></div>`).join('');}
}

function drawDashboardPlantBar(plantStats){
  const canvas=$('#plantBarChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d');
  const w=canvas.width, h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const plants=APP_DATA.plants.map(p=>p.code);
  const series=[
    {key:'sales',label:'البيع',color:'#74c54a'},
    {key:'production',label:'الإنتاج',color:'#2aa6e8'},
    {key:'outgoing',label:'الصادرة',color:'#ff9f2f'},
    {key:'incoming',label:'الواردة',color:'#b45cff'},
    {key:'loading',label:'التحميل',color:'#28c7bd'}
  ];
  const legend=$('#plantBarLegend');
  if(legend){legend.innerHTML=series.map(s=>`<span><i style="background:${s.color}"></i>${s.label}</span>`).join('');}
  const max=Math.max(1,...plants.flatMap(code=>series.map(s=>Math.abs((plantStats[code]||{})[s.key]||0))));
  const pad={l:48,r:20,t:18,b:40};
  const cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.lineWidth=1;
  ctx.font='11px Cairo';ctx.fillStyle='#cfe8d0';ctx.textAlign='right';
  for(let i=0;i<=5;i++){
    const y=pad.t+ch-(i/5)*ch;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillText(fmt(max*i/5),pad.l-8,y+4);
  }
  const groupGap=28;
  const groupW=(cw-groupGap*(plants.length-1))/plants.length;
  const barW=Math.max(8,Math.min(14,(groupW-20)/series.length));
  plants.forEach((code,pi)=>{
    const groupX=pad.l+pi*(groupW+groupGap);
    const barsW=barW*series.length+4*(series.length-1);
    const baseX=groupX+(groupW-barsW)/2;
    series.forEach((ser,si)=>{
      const v=Math.abs((plantStats[code]||{})[ser.key]||0);
      const bh=(v/max)*ch;
      const x=baseX+si*(barW+4), y=pad.t+ch-bh;
      ctx.fillStyle=ser.color;ctx.globalAlpha=.9;ctx.fillRect(x,y,barW,bh);
    });
    ctx.globalAlpha=1;ctx.fillStyle='#fff';ctx.font='bold 12px Cairo';ctx.textAlign='center';ctx.fillText(code,groupX+groupW/2,pad.t+ch+25);
  });
  ctx.textAlign='start';
  renderPlantPerformanceTable(plantStats);
}

function renderPlantPerformanceTable(plantStats){
  const node=$('#stockSummary');
  if(!node) return;
  const rows=APP_DATA.plants.map(p=>{
    const st=plantStats[p.code]||{};
    return `<tr><td>${p.code}</td><td>${fmt(st.sales||0)}</td><td>${fmt(st.production||0)}</td><td>${fmt(st.outgoing||0)}</td><td>${fmt(st.incoming||0)}</td><td>${fmt(st.loading||0)}</td></tr>`;
  }).join('');
  const total=APP_DATA.plants.reduce((a,p)=>{const st=plantStats[p.code]||{};a.sales+=(st.sales||0);a.production+=(st.production||0);a.outgoing+=(st.outgoing||0);a.incoming+=(st.incoming||0);a.loading+=(st.loading||0);return a;},{sales:0,production:0,outgoing:0,incoming:0,loading:0});
  node.innerHTML=`<div class="plant-performance-table"><table><thead><tr><th>المصنع</th><th>البيع</th><th>الإنتاج</th><th>الصادرة</th><th>الواردة</th><th>التحميل</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td>الإجمالي</td><td>${fmt(total.sales)}</td><td>${fmt(total.production)}</td><td>${fmt(total.outgoing)}</td><td>${fmt(total.incoming)}</td><td>${fmt(total.loading)}</td></tr></tfoot></table></div>`;
}

function modernIcon(name){
  const attrs='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  const icons={
    warning:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v5"></path><path d="M12 18h.01"></path></svg>`,
    box:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21 8-9-5-9 5 9 5 9-5Z"></path><path d="M3 8v8l9 5 9-5V8"></path><path d="M12 13v8"></path></svg>`,
    transfer:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h14l-4-4"></path><path d="M17 17H3l4 4"></path><path d="M21 7l-4 4"></path><path d="M3 17l4-4"></path></svg>`,
    doc:`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`,
    sales:`<svg ${attrs}><circle cx="9" cy="20" r="1.6"></circle><circle cx="18" cy="20" r="1.6"></circle><path d="M3 4h2.4l2.2 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H7"></path><path d="M9 11h9"></path></svg>`,
    production:`<svg ${attrs}><path d="M3 21h18"></path><path d="M5 21V10l5 3V9l5 4V7l4 3v11"></path><path d="M8 17h1"></path><path d="M12 17h1"></path><path d="M16 17h1"></path><path d="M7 7h3"></path></svg>`,
    outgoing:`<svg ${attrs}><path d="M4 7h14"></path><path d="M14 3l4 4-4 4"></path><path d="M20 17H6"></path><path d="M10 13l-4 4 4 4"></path></svg>`,
    incoming:`<svg ${attrs}><path d="M12 3v12"></path><path d="M7 10l5 5 5-5"></path><path d="M4 18h16"></path><path d="M6 21h12"></path></svg>`,
    loading:`<svg ${attrs}><path d="M3 16V8l9-4 9 4v8l-9 4-9-4Z"></path><path d="M3 8l9 4 9-4"></path><path d="M12 12v8"></path><path d="M7.5 5.7l9 4"></path></svg>`,
    home:`<svg ${attrs}><path d="M3 11.5 12 4l9 7.5"></path><path d="M5 10.5V20h14v-9.5"></path><path d="M9 20v-6h6v6"></path></svg>`,
    upload:`<svg ${attrs}><path d="M12 16V4"></path><path d="M7 9l5-5 5 5"></path><path d="M4 20h16"></path></svg>`,
    warehouses:`<svg ${attrs}><path d="M3 21h18"></path><path d="M5 21V9l7-4 7 4v12"></path><path d="M9 21v-7h6v7"></path><path d="M8 10h1"></path><path d="M12 10h1"></path><path d="M16 10h1"></path></svg>`,
    movements:`<svg ${attrs}><path d="M4 7h14"></path><path d="M14 3l4 4-4 4"></path><path d="M20 17H6"></path><path d="M10 13l-4 4 4 4"></path></svg>`,
    inbound:`<svg ${attrs}><path d="M12 3v10"></path><path d="M8 9l4 4 4-4"></path><path d="M5 17h14"></path><path d="M7 21h10"></path></svg>`,
    reports:`<svg ${attrs}><path d="M4 20V10"></path><path d="M10 20V4"></path><path d="M16 20v-7"></path><path d="M22 20H2"></path></svg>`,
    users:`<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
    shield:`<svg ${attrs}><path d="M12 3 20 6v5c0 5-3.4 8.2-8 10-4.6-1.8-8-5-8-10V6l8-3Z"></path><path d="m9 12 2 2 4-5"></path></svg>`,
    settings:`<svg ${attrs}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 1 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21.4a2.1 2.1 0 1 1-4.2 0v-.06a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H2.9a2.1 2.1 0 1 1 0-4.2h.06A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 1 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 9.2 3.4 1.8 1.8 0 0 0 10.3 1.75V1.7a2.1 2.1 0 1 1 4.2 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 1 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8c.13.38.38.7.71.92.28.18.61.28.94.28h.06a2.1 2.1 0 1 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z"></path></svg>`
  };
  return icons[name] || icons.reports;
}

function renderDashboardKPIs(stats){
  const cards=[
    ['إجمالي البيع',fmt(stats.salesQty),'طن','sales','kpi-sales'],
    ['إجمالي الإنتاج',fmt(stats.productionQty),'طن','production','kpi-production'],
    ['إجمالي التحويلات الصادره',fmt(stats.outgoingTransferQty),'طن','outgoing','kpi-outgoing'],
    ['إجمالي التحويلات الوارده',fmt(stats.incomingTransferQty),'طن','incoming','kpi-incoming'],
    ['إجمالي التحميل',fmt(stats.totalLoadingQty),'طن','loading','kpi-loading']
  ];
  const box=$('#kpiCards');
  if(box) box.innerHTML=cards.map(c=>`<article class="kpi glass ${c[4]}"><h3>${c[0]}</h3><div class="num">${c[1]}</div><small>${c[2]}</small><div class="icon modern-kpi-icon">${modernIcon(c[3])}</div></article>`).join('');
}
function getDashboardFilters(){
  return {
    plant: $('#dashboardPlantFilter')?.value || 'all',
    warehouse: $('#dashboardWarehouseFilter')?.value || 'all',
    from: normalizeDateISO($('#dashboardFromDate')?.value || ''),
    to: normalizeDateISO($('#dashboardToDate')?.value || '')
  };
}
function dashboardWhMeta(code){
  const meta=warehouseMetaByCode(code);
  return {plant:meta.plant_code||'', warehouse:meta.warehouse_code||String(code||'').toUpperCase(), name:meta.warehouse_name||'', type:meta.warehouse_type||''};
}

function renderModernSidebarIcons(){
  $$('.nav-icon[data-icon]').forEach(node=>{
    const name=node.getAttribute('data-icon');
    node.innerHTML=modernIcon(name);
  });
}

function initDashboardFilters(){
  const pf=$('#dashboardPlantFilter'), wf=$('#dashboardWarehouseFilter');
  if(!pf || !wf) return;
  if(pf.options.length<=1){
    APP_DATA.plants.forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
  }
  function fillWh(){
    const old=wf.value;
    const salesWarehouseCodes = ['W401','W402','N401','N402','N411','N412','E401','E402'];
    wf.innerHTML='<option value="all">كل مخازن البيع</option>';
    APP_DATA.plants
      .filter(p=>pf.value==='all'||p.code===pf.value)
      .forEach(p=>p.warehouses
        .filter(w=>salesWarehouseCodes.includes(String(w[0]).toUpperCase()))
        .forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0])))
      );
    if([...wf.options].some(o=>o.value===old)) wf.value=old;
  }
  pf.onchange=fillWh;
  fillWh();
  $('#dashboardSearchBtn')?.addEventListener('click',()=>loadDashboardRealData({keepDates:true}));
  $('#dashboardResetBtn')?.addEventListener('click',()=>{
    pf.value='all';
    fillWh();
    wf.value='all';
    $('#dashboardFromDate').value='';
    $('#dashboardToDate').value='';
    loadDashboardRealData({resetDefaultDate:true});
  });
}
async function getLatestSalesReportDate(){
  if(!WarehouseDB?.ready) return '';
  try{
    const res=await WarehouseDB.client.from('sales_audit_report').select('report_date').order('report_date',{ascending:false}).limit(1);
    return normalizeDateISO(res.data?.[0]?.report_date || '');
  }catch(_){return '';}
}
async function ensureDashboardDefaultDate(options={}){
  const fromEl=$('#dashboardFromDate'), toEl=$('#dashboardToDate');
  if(!fromEl || !toEl) return;
  if(options.keepDates && (fromEl.value || toEl.value)) return;
  const latest=await getLatestSalesReportDate();
  const today=normalizeDateISO(new Date().toISOString().slice(0,10));
  const defaultDate=latest || today;
  if(options.resetDefaultDate || (!fromEl.value && !toEl.value)){
    fromEl.value=defaultDate;
    toEl.value=defaultDate;
  }
}
function applyDashboardSalesFilters(rows,filters){
  return (rows||[]).filter(r=>{
    const wh=String(r.warehouse_code||'').trim().toUpperCase();
    const meta=dashboardWhMeta(wh);
    const d=dashboardDateKey(r.report_date);
    const plant=String(r.plant_code||meta.plant||'');
    if(filters.plant && filters.plant!=='all' && plant!==filters.plant) return false;
    if(filters.warehouse && filters.warehouse!=='all' && wh!==String(filters.warehouse).toUpperCase()) return false;
    if(filters.from && d<filters.from) return false;
    if(filters.to && d>filters.to) return false;
    return true;
  });
}
function renderDashboardSummary(stats){
  const node=$('#stockSummary');
  if(!node) return;
  node.innerHTML=[
    ['إجمالي البيع',`${fmt(stats.salesQty)} طن`],
    ['إجمالي الإنتاج',`${fmt(stats.productionQty)} طن`],
    ['إجمالي التحويلات الصادرة',`${fmt(stats.outgoingTransferQty)} طن`],
    ['إجمالي التحويلات الواردة',`${fmt(stats.incomingTransferQty)} طن`],
    ['إجمالي التحميل',`${fmt(stats.totalLoadingQty)} طن`]
  ].map(r=>`<div class="stock-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
}
function renderDashboardPlants(plantStats, totalSales=0){
  const node=$('#plantsCards');
  if(!node) return;
  const rows=APP_DATA.plants.map(p=>{
    const st=plantStats[p.code]||{sales:0,production:0,outgoing:0,incoming:0,loading:0};
    const pct=totalSales?Math.max(0,(st.sales/totalSales)*100):0;
    return {code:p.code,name:p.name,st,pct};
  }).sort((a,b)=>b.st.sales-a.st.sales);
  node.innerHTML=rows.map((r,i)=>`<div class="plant-progress-card rank-${i+1}">
    <div class="plant-progress-head"><b>${escapeHtml(r.name)}</b><span>${escapeHtml(r.code)}</span></div>
    <div class="plant-progress-value"><strong>${fmt(r.st.sales)}</strong><small>طن بيع</small><em>${r.pct.toFixed(1)}%</em></div>
    <div class="progress-track"><i style="width:${Math.min(100,r.pct).toFixed(1)}%"></i></div>
    <div class="plant-progress-metrics"><span>إنتاج ${fmt(r.st.production)}</span><span>تحميل ${fmt(r.st.loading)}</span></div>
  </div>`).join('');
}
function monthDaysCount(year,monthIndex){
  return new Date(year,monthIndex+1,0).getDate();
}
function dashboardMonthKeyFromRows(rows,filters={}){
  const explicit=normalizeDateISO(filters.to||filters.from||'');
  if(explicit) return explicit.slice(0,7);
  const dates=(rows||[]).map(r=>dashboardDateKey(r.report_date)).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  if(dates.length) return dates[dates.length-1].slice(0,7);
  return normalizeDateISO(new Date().toISOString().slice(0,10)).slice(0,7);
}
function renderDashboardSalesHeatmap(allRows,filters={}){
  const node=$('#alertsBox');
  if(!node) return;
  const monthKey=dashboardMonthKeyFromRows(allRows,filters);
  const [year,month]=monthKey.split('-').map(Number);
  const days=monthDaysCount(year,month-1);
  const daily={};
  (allRows||[]).forEach(r=>{
    const wh=String(r.warehouse_code||'').trim().toUpperCase();
    const meta=dashboardWhMeta(wh);
    const plant=String(r.plant_code||meta.plant||'');
    const d=dashboardDateKey(r.report_date);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(d) || !d.startsWith(monthKey)) return;
    if(filters.plant && filters.plant!=='all' && plant!==filters.plant) return;
    if(filters.warehouse && filters.warehouse!=='all' && wh!==String(filters.warehouse).toUpperCase()) return;
    daily[d]=(daily[d]||0)+Math.abs(toNumber(r.sales_quantity));
  });
  const values=Object.values(daily);
  const max=Math.max(...values,0);
  const weekDayOrder=[6,0,1,2,3,4,5];
  const weekDayLabels=['السبت','الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'];
  const firstDow=new Date(year,month-1,1).getDay();
  const firstOffset=weekDayOrder.indexOf(firstDow);
  const cells=[];
  for(let i=0;i<42;i++){
    const day=i-firstOffset+1;
    if(day<1 || day>days){
      cells.push(`<div class="heat-cell empty"></div>`);
      continue;
    }
    const date=`${monthKey}-${String(day).padStart(2,'0')}`;
    const val=daily[date]||0;
    const ratio=max?Math.max(.12,val/max):0;
    cells.push(`<div class="heat-cell" style="--heat:${ratio.toFixed(3)}" title="${date} - ${fmt(val)} طن"><b>${day}</b><span>${fmt(val)}</span></div>`);
  }
  node.innerHTML=`
    <div class="heatmap-head"><strong>${monthKey}</strong><span>الأقل</span><i></i><span>الأعلى</span></div>
    <div class="heatmap-weekdays">${weekDayLabels.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="heatmap-grid">${cells.join('')}</div>
    <div class="heatmap-footer"><b>${fmt(values.reduce((a,b)=>a+b,0))}</b><span>إجمالي البيع خلال الشهر حسب الفلتر</span></div>`;
}
function renderRankTable(selector,heads,rows,{totalLabel='الإجمالي'}={}){
  const node=$(selector); if(!node) return;
  const body=(rows&&rows.length?rows:[]).map((r,ri)=>`<tr>${heads.map((_,i)=>{
    const cls=i===0?'rank-num':(i>=heads.length-3?'num-cell':'');
    return `<td class="${cls}">${r[i]??''}</td>`;
  }).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}" class="empty-row">لا توجد بيانات مطابقة</td></tr>`;
  node.innerHTML=`<thead><tr>${heads.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
}
async function loadDashboardRealData(options={}){
  if(!WarehouseDB?.ready) return;
  await ensureDashboardDefaultDate(options);
  const filters=getDashboardFilters();
  let query=WarehouseDB.client
    .from('sales_audit_report')
    .select('report_date,warehouse_code,warehouse_name,plant_code,plant_name,material_code,material_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity')
    .order('report_date',{ascending:false})
    .range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from);
  if(filters.to) query=query.lte('report_date',filters.to);
  if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant);
  if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const salesRes=await query;
  if(salesRes.error){
    console.warn('dashboard sales load error',salesRes.error);
    return;
  }
  const sales=applyDashboardSalesFilters(salesRes.data||[],filters);
  const whSet=new Set(), daily={}, warehouseSalesMap={}, warehouseActivityMap={}, productMap={}, plantStats={};
  APP_DATA.plants.forEach(p=>plantStats[p.code]={sales:0,production:0,outgoing:0,incoming:0,loading:0});
  const stats={rowsCount:sales.length,salesQty:0,productionQty:0,outgoingTransferQty:0,incomingTransferQty:0,totalLoadingQty:0};
  sales.forEach(r=>{
    const d=dashboardDateKey(r.report_date); daily[d]=daily[d]||{sales:0,production:0,outgoing:0,incoming:0};
    const wh=String(r.warehouse_code||'').toUpperCase(); if(wh) whSet.add(wh);
    const meta=dashboardWhMeta(wh);
    const plant=r.plant_code||meta.plant||'غير محدد';
    if(!plantStats[plant]) plantStats[plant]={sales:0,production:0,outgoing:0,incoming:0,loading:0};
    const salesQty=toNumber(r.sales_quantity), prod=toNumber(r.production_quantity), outTr=toNumber(r.outgoing_transfer_quantity), inTr=toNumber(r.incoming_transfer_quantity), load=toNumber(r.total_loading_quantity);
    stats.salesQty+=salesQty;
    stats.productionQty+=prod;
    stats.outgoingTransferQty+=outTr;
    stats.incomingTransferQty+=inTr;
    stats.totalLoadingQty+=load;
    daily[d].sales+=Math.abs(salesQty);
    daily[d].production+=Math.abs(prod);
    daily[d].outgoing+=Math.abs(outTr);
    daily[d].incoming+=Math.abs(inTr);
    plantStats[plant].sales+=salesQty;
    plantStats[plant].production+=prod;
    plantStats[plant].outgoing+=outTr;
    plantStats[plant].incoming+=inTr;
    plantStats[plant].loading+=load;
    if(salesQty) warehouseSalesMap[wh]=(warehouseSalesMap[wh]||0)+Math.abs(salesQty);
    const pkey=String(r.material_code||r.material_name||'غير محدد');
    if(!productMap[pkey]) productMap[pkey]={code:r.material_code||'-',name:r.material_name||'-',sales:0,production:0,outgoing:0,incoming:0,loading:0};
    productMap[pkey].sales+=salesQty;
    productMap[pkey].production+=prod;
    productMap[pkey].outgoing+=outTr;
    productMap[pkey].incoming+=inTr;
    productMap[pkey].loading+=load;
    if(!warehouseActivityMap[wh]) warehouseActivityMap[wh]={code:wh,name:meta.name||'-',plant:plant,sales:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0};
    warehouseActivityMap[wh].sales+=salesQty;
    warehouseActivityMap[wh].production+=prod;
    warehouseActivityMap[wh].outgoing+=outTr;
    warehouseActivityMap[wh].incoming+=inTr;
    warehouseActivityMap[wh].loading+=load;
    warehouseActivityMap[wh].totalActivity+=Math.abs(salesQty)+Math.abs(prod)+Math.abs(outTr)+Math.abs(inTr)+Math.abs(load);
  });
  renderDashboardKPIs(stats);
  renderDashboardSummary(stats);
  drawDashboardLine(daily);
  drawDashboardPlantBar(plantStats);
  drawDashboardDonut(Object.entries(warehouseSalesMap).sort((a,b)=>b[1]-a[1]).map(([code,value])=>({label:`${code} - ${dashboardWhMeta(code).name||'مخزن بيع'}`,value})));
  const products=Object.values(productMap);
  const avgOutgoing=products.length ? products.reduce((a,p)=>a+Math.abs(p.outgoing),0)/products.length : 0;
  const insights={
    productionAboveSalesCount:products.filter(p=>p.production>p.sales && p.production>0).length,
    noSalesCount:products.filter(p=>Math.abs(p.sales)===0 && (Math.abs(p.production)+Math.abs(p.outgoing)+Math.abs(p.incoming))>0).length,
    highOutgoingCount:products.filter(p=>Math.abs(p.outgoing)>avgOutgoing && Math.abs(p.outgoing)>0).length,
    reviewItemsCount:products.filter(p=>Math.abs(p.production-p.sales)>0 && Math.abs(p.production-p.sales)>Math.max(5,Math.abs(p.sales)*.25)).length
  };
  renderDashboardPlants(plantStats, stats.salesQty);
  renderDashboardSalesHeatmap(salesRes.data||[], filters);
  const topProducts=products.sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales)).slice(0,10).map((p,i)=>[
    i+1,
    escapeHtml(p.code||'-'),
    escapeHtml(p.name||'-'),
    fmt(p.sales),
    fmt(p.production),
    fmt(p.loading)
  ]);
  renderRankTable('#latestTable',['#','كود الصنف','اسم الصنف','البيع','الإنتاج','التحميل'],topProducts);
  const topWarehouses=Object.values(warehouseActivityMap).sort((a,b)=>b.totalActivity-a.totalActivity).slice(0,10).map((w,i)=>[
    i+1,
    escapeHtml(w.code||'-'),
    escapeHtml(w.name||'-'),
    escapeHtml(w.plant||'-'),
    fmt(w.sales),
    fmt(w.loading)
  ]);
  renderRankTable('#topWarehousesTable',['#','كود المخزن','اسم المخزن','المصنع','البيع','التحميل'],topWarehouses);
  ensureDashboardPngButtons();
}


function updateFiltersVisibility(section){
  const filters=$('#globalFilters');
  if(!filters) return;
  const visibleSections=['inbound'];
  const shouldShow=visibleSections.includes(section);
  filters.classList.toggle('filters-hidden',!shouldShow);
  filters.setAttribute('aria-hidden',shouldShow?'false':'true');
}
function switchSection(section){
  if(!canViewSection(section)){
    showPermissionDenied(section);
    return;
  }
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
  $$('.section').forEach(s=>s.classList.remove('active-section'));
  const target=$('#'+section);
  if(target) target.classList.add('active-section');
  updateFiltersVisibility(section);
  if(section==='reports') setTimeout(()=>loadExecutiveReport(),50);
  if(section==='users') setTimeout(()=>loadUsersManagement(),50);
  if(section==='permissions') setTimeout(()=>loadPermissionsManagement(),50);
  setTimeout(()=>applyPermissionActionGuards(section),80);
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
document.addEventListener('DOMContentLoaded',()=>{setDefaultDates();startCairoClock();dbBadge();initFilters();initDashboardFilters();renderModernSidebarIcons();nav();initSidebarToggle();initReportExportButtons();renderAll()});

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
document.addEventListener('DOMContentLoaded',()=>{initAuthPanel();initSalesUploader();initIncomingUploader();initScaleUploader();initFreightUploader();refreshInboundReportDates();setTimeout(()=>{loadSalesReport(activeSalesWarehouse);loadInboundAuditReport();loadDashboardRealData();},300);});

// === Main Program Login Gate ===
let CURRENT_AUTH_USER=null;
let CURRENT_APP_PROFILE=null;

async function fetchCurrentAppProfile(user){
  const fallback={
    full_name:user?.email || 'مستخدم',
    role:isSystemOwnerEmail(user?.email) ? 'super_admin' : 'authenticated',
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
  await loadCurrentUserPermissions();
  $('#loginScreen')?.classList.add('login-hidden');
  $('#appShell')?.classList.remove('app-hidden');
  applyProfileToHeader(profile);
  fillProfileForm(profile,user);
  applyNavigationPermissions();
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
      role: isSystemOwnerEmail(CURRENT_AUTH_USER.email) ? 'super_admin' : (CURRENT_APP_PROFILE?.role && CURRENT_APP_PROFILE.role !== 'authenticated' ? CURRENT_APP_PROFILE.role : 'viewer'),
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



// === Permissions Engine ===
const PERMISSION_ACTIONS = [
  {key:'view', label:'عرض'},
  {key:'add', label:'إضافة'},
  {key:'edit', label:'تعديل'},
  {key:'delete', label:'حذف'},
  {key:'upload', label:'رفع'},
  {key:'export_excel', label:'Excel'},
  {key:'export_pdf', label:'PDF'},
  {key:'export_png', label:'PNG'},
  {key:'approve', label:'اعتماد'},
  {key:'manage', label:'إدارة'}
];
const PERMISSION_SCREENS = [
  {key:'dashboard', label:'الرئيسية', description:'عرض لوحة المؤشرات والشاشة الرئيسية'},
  {key:'upload', label:'رفع التقارير', description:'رفع ملفات البيع والوارد والميزان والنولون'},
  {key:'plants', label:'مصانع ومخازن', description:'عرض وإدارة المصانع والمخازن'},
  {key:'movements', label:'الحركات المخزنية', description:'قواعد وأكواد الحركات المخزنية'},
  {key:'sales', label:'مراجعة البيع', description:'مراجعة مبيعات المنتج التام والتحويلات'},
  {key:'inbound', label:'مراجعة الوارد', description:'مراجعة وارد MB51 والميزان والنولون'},
  {key:'reports', label:'التقارير', description:'مركز التقارير التنفيذية والتحليلات'},
  {key:'users', label:'إدارة المستخدمين', description:'إنشاء وتعديل وتعطيل وحذف المستخدمين'},
  {key:'permissions', label:'إدارة الصلاحيات', description:'تعديل صلاحيات الأدوار والشاشات'},
  {key:'settings', label:'الإعدادات', description:'بيانات الحساب وإعدادات النظام'}
];
const PERMISSION_ROLE_LABELS={admin:'Admin',auditor:'Auditor',viewer:'Viewer'};
let CURRENT_ROLE_PERMISSIONS = {};
let PERMISSIONS_MANAGEMENT_STATE={role:'admin', rows:[], view:[], dirty:false};
function permissionColumn(action){ return 'can_'+action; }
function defaultPermissionValue(role,screen,action){
  if(role==='admin') return true;
  if(role==='auditor'){
    if(['users','permissions','settings'].includes(screen)) return false;
    if(['delete','manage','approve'].includes(action)) return false;
    if(action==='add') return ['upload'].includes(screen);
    if(action==='edit') return ['sales','inbound','reports'].includes(screen);
    return ['view','upload','export_excel','export_pdf','export_png'].includes(action);
  }
  if(role==='viewer'){
    if(['users','permissions','settings','upload'].includes(screen)) return false;
    return ['view','export_excel','export_pdf','export_png'].includes(action);
  }
  return false;
}
function buildDefaultPermissions(role){
  const map={};
  PERMISSION_SCREENS.forEach(sc=>{
    map[sc.key]={screen_key:sc.key, role};
    PERMISSION_ACTIONS.forEach(a=>{ map[sc.key][permissionColumn(a.key)] = defaultPermissionValue(role,sc.key,a.key); });
  });
  return map;
}
function normalizePermissionRow(row, role){
  const key=row?.screen_key || row?.screen || row?.section_key || '';
  const out={screen_key:key, role:row?.role || role};
  PERMISSION_ACTIONS.forEach(a=>{
    const col=permissionColumn(a.key);
    out[col]=row && Object.prototype.hasOwnProperty.call(row,col) ? row[col] === true : defaultPermissionValue(role,key,a.key);
  });
  return out;
}
function permissionsForRoleFromRows(role, rows){
  const defaults=buildDefaultPermissions(role);
  (rows||[]).forEach(r=>{
    const nr=normalizePermissionRow(r,role);
    if(nr.screen_key && defaults[nr.screen_key]) defaults[nr.screen_key]={...defaults[nr.screen_key],...nr};
  });
  return defaults;
}
function isSuperAdmin(){ return CURRENT_APP_PROFILE?.role === 'super_admin'; }
function hasPermission(section, action='view'){
  if(isSuperAdmin()) return true;
  if(!section) return true;
  const row=CURRENT_ROLE_PERMISSIONS?.[section];
  if(!row) return action==='view' ? ['dashboard'].includes(section) : false;
  return row[permissionColumn(action)] === true;
}
function canViewSection(section){ return hasPermission(section,'view'); }
function showPermissionDenied(section){
  const label=PERMISSION_SCREENS.find(x=>x.key===section)?.label || section;
  alert(`غير مسموح بالوصول إلى: ${label}\nراجع مدير النظام لتعديل الصلاحيات.`);
}
async function loadCurrentUserPermissions(){
  if(isSuperAdmin()){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions('admin'); return; }
  const role=CURRENT_APP_PROFILE?.role || 'viewer';
  if(!WarehouseDB?.ready){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role); return; }
  try{
    const {data,error}=await WarehouseDB.client.from('app_role_permissions').select('*').eq('role',role);
    CURRENT_ROLE_PERMISSIONS = error ? buildDefaultPermissions(role) : permissionsForRoleFromRows(role,data||[]);
  }catch(_){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role); }
}
function applyNavigationPermissions(){
  $$('.nav-item').forEach(btn=>{
    const section=btn.dataset.section;
    const allowed=canViewSection(section);
    btn.classList.toggle('permission-hidden',!allowed);
    btn.disabled=!allowed;
    btn.title=allowed?'':'غير مسموح حسب صلاحيات الدور';
  });
  const active=$('.nav-item.active');
  if(active && active.disabled){
    const first=[...$$('.nav-item')].find(b=>!b.disabled);
    if(first) switchSection(first.dataset.section);
  }
}
function disableByPermission(selector, section, action, message){
  $$(selector).forEach(el=>{
    const allowed=hasPermission(section,action);
    el.disabled=!allowed;
    el.classList.toggle('permission-disabled',!allowed);
    if(!allowed) el.title=message || 'غير مسموح حسب صلاحيات الدور';
  });
}
function applyPermissionActionGuards(section){
  applyNavigationPermissions();
  if(!section) return;
  disableByPermission('button[id*="ExportExcel"],button[id*="Excel"],button[id*="exportExcel"],button[id*="ExcelBtn"]',section,'export_excel','لا تملك صلاحية تصدير Excel');
  disableByPermission('button[id*="ExportPdf"],button[id*="Pdf"],button[id*="exportPdf"],button[id*="PdfBtn"]',section,'export_pdf','لا تملك صلاحية تصدير PDF');
  disableByPermission('button[id*="ExportPng"],button[id*="Png"],.png-export-btn',section,'export_png','لا تملك صلاحية تصدير PNG');
  disableByPermission('.delete-user-btn,.delete-batch-btn,button[id*="Delete"],button.danger',section,'delete','لا تملك صلاحية الحذف');
  disableByPermission('button[id*="Upload"],button[id*="pick"],.upload-report-tab',section,'upload','لا تملك صلاحية الرفع');
  disableByPermission('button[id*="save"],button[id*="Save"],button[id*="edit"],.edit-user-btn',section,'edit','لا تملك صلاحية التعديل');
}
function setPermissionsStatus(message,type=''){
  const el=$('#permissionsManagementStatus');
  if(!el) return;
  el.className='upload-status permissions-status-bar '+(type||'');
  el.textContent=message||'';
}
function permissionsKpiUpdate(rows){
  const total=rows.length*PERMISSION_ACTIONS.length;
  let enabled=0;
  rows.forEach(r=>PERMISSION_ACTIONS.forEach(a=>{ if(r[permissionColumn(a.key)]) enabled++; }));
  const set=(id,v)=>{const el=$(id); if(el) el.textContent=v;};
  set('#permissionsScreensCount',rows.length);
  set('#permissionsEnabledCount',enabled);
  set('#permissionsDisabledCount',Math.max(0,total-enabled));
  set('#permissionsSelectedRoleLabel',PERMISSION_ROLE_LABELS[PERMISSIONS_MANAGEMENT_STATE.role]||PERMISSIONS_MANAGEMENT_STATE.role);
}
function renderPermissionsMatrix(rows){
  const tbody=$('#permissionsMatrixTable tbody');
  if(!tbody) return;
  if(!rows.length){ tbody.innerHTML='<tr><td colspan="11" class="empty-row">لا توجد شاشات مطابقة.</td></tr>'; return; }
  tbody.innerHTML=rows.map(sc=>{
    const row=PERMISSIONS_MANAGEMENT_STATE.rows.find(r=>r.screen_key===sc.key) || buildDefaultPermissions(PERMISSIONS_MANAGEMENT_STATE.role)[sc.key];
    const cells=PERMISSION_ACTIONS.map(a=>{
      const col=permissionColumn(a.key);
      return `<td><label class="perm-toggle"><input type="checkbox" data-screen="${escapeHtml(sc.key)}" data-action="${escapeHtml(a.key)}" ${row[col]?'checked':''}><span></span></label></td>`;
    }).join('');
    return `<tr data-screen="${escapeHtml(sc.key)}"><td class="permission-screen-cell"><b>${escapeHtml(sc.label)}</b><small>${escapeHtml(sc.description||'')}</small></td>${cells}</tr>`;
  }).join('');
  tbody.querySelectorAll('input[type="checkbox"]').forEach(chk=>chk.addEventListener('change',onPermissionToggleChange));
}
function applyPermissionsSearch(){
  const q=($('#permissionsQuickSearch')?.value||'').trim().toLowerCase();
  PERMISSIONS_MANAGEMENT_STATE.view=PERMISSION_SCREENS.filter(sc=>!q || [sc.key,sc.label,sc.description].join(' ').toLowerCase().includes(q));
  renderPermissionsMatrix(PERMISSIONS_MANAGEMENT_STATE.view);
  permissionsKpiUpdate(PERMISSIONS_MANAGEMENT_STATE.rows);
}
function onPermissionToggleChange(e){
  const screen=e.target.dataset.screen;
  const action=e.target.dataset.action;
  const row=PERMISSIONS_MANAGEMENT_STATE.rows.find(r=>r.screen_key===screen);
  if(row){ row[permissionColumn(action)]=e.target.checked; PERMISSIONS_MANAGEMENT_STATE.dirty=true; }
  permissionsKpiUpdate(PERMISSIONS_MANAGEMENT_STATE.rows);
}
function setAllVisiblePermissions(value){
  PERMISSIONS_MANAGEMENT_STATE.view.forEach(sc=>{
    const row=PERMISSIONS_MANAGEMENT_STATE.rows.find(r=>r.screen_key===sc.key);
    if(row) PERMISSION_ACTIONS.forEach(a=>row[permissionColumn(a.key)]=value);
  });
  PERMISSIONS_MANAGEMENT_STATE.dirty=true;
  applyPermissionsSearch();
}
function resetPermissionsToDefaults(){
  const role=PERMISSIONS_MANAGEMENT_STATE.role;
  PERMISSIONS_MANAGEMENT_STATE.rows=Object.values(buildDefaultPermissions(role));
  PERMISSIONS_MANAGEMENT_STATE.dirty=true;
  applyPermissionsSearch();
  setPermissionsStatus('تم استعادة الصلاحيات الافتراضية. اضغط حفظ لاعتمادها.','ok');
}
async function loadPermissionsManagement(){
  if(!$('#permissionsMatrixTable')) return;
  if(!isSuperAdmin() && !hasPermission('permissions','manage')){
    setPermissionsStatus('غير مسموح بإدارة الصلاحيات لهذا الدور.','err');
    return;
  }
  const role=$('#permissionsRoleSelect')?.value || PERMISSIONS_MANAGEMENT_STATE.role || 'admin';
  PERMISSIONS_MANAGEMENT_STATE.role=role;
  setPermissionsStatus('جاري تحميل الصلاحيات...');
  try{
    let rows=[];
    if(WarehouseDB?.ready){
      const {data,error}=await WarehouseDB.client.from('app_role_permissions').select('*').eq('role',role);
      if(error) throw error;
      rows=data||[];
    }
    PERMISSIONS_MANAGEMENT_STATE.rows=Object.values(permissionsForRoleFromRows(role,rows));
    PERMISSIONS_MANAGEMENT_STATE.dirty=false;
    const info=$('#permissionsRoleInfo');
    if(info) info.innerHTML=`<b>${PERMISSION_ROLE_LABELS[role]}</b><span>عدد الصلاحيات: ${PERMISSIONS_MANAGEMENT_STATE.rows.length*PERMISSION_ACTIONS.length}</span>`;
    applyPermissionsSearch();
    setPermissionsStatus('تم تحميل الصلاحيات.','ok');
  }catch(err){
    PERMISSIONS_MANAGEMENT_STATE.rows=Object.values(buildDefaultPermissions(role));
    applyPermissionsSearch();
    setPermissionsStatus('تعذر تحميل الصلاحيات من Supabase، تم عرض الافتراضي: '+(err.message||err),'err');
  }
}
async function savePermissionsManagement(){
  if(!WarehouseDB?.ready){ setPermissionsStatus('Supabase غير متصل.','err'); return; }
  if(!isSuperAdmin() && !hasPermission('permissions','manage')){ setPermissionsStatus('غير مسموح بحفظ الصلاحيات.','err'); return; }
  const role=PERMISSIONS_MANAGEMENT_STATE.role;
  if(role==='super_admin'){ setPermissionsStatus('لا يمكن تعديل صلاحيات Super Admin.','err'); return; }
  try{
    setPermissionsStatus('جاري حفظ الصلاحيات...');
    const payload=PERMISSIONS_MANAGEMENT_STATE.rows.map(r=>{
      const obj={role,screen_key:r.screen_key,updated_at:new Date().toISOString()};
      PERMISSION_ACTIONS.forEach(a=>obj[permissionColumn(a.key)] = r[permissionColumn(a.key)] === true);
      return obj;
    });
    const {error}=await WarehouseDB.client.from('app_role_permissions').upsert(payload,{onConflict:'role,screen_key'});
    if(error) throw error;
    PERMISSIONS_MANAGEMENT_STATE.dirty=false;
    setPermissionsStatus('تم حفظ الصلاحيات بنجاح.','ok');
    await loadCurrentUserPermissions();
    applyNavigationPermissions();
  }catch(err){ setPermissionsStatus('تعذر حفظ الصلاحيات: '+(err.message||err),'err'); }
}
function initPermissionsManagement(){
  $('#permissionsRoleSelect')?.addEventListener('change',loadPermissionsManagement);
  $('#permissionsQuickSearch')?.addEventListener('input',applyPermissionsSearch);
  $('#savePermissionsBtn')?.addEventListener('click',savePermissionsManagement);
  $('#reloadPermissionsBtn')?.addEventListener('click',loadPermissionsManagement);
  $('#permissionsSelectAllBtn')?.addEventListener('click',()=>setAllVisiblePermissions(true));
  $('#permissionsClearAllBtn')?.addEventListener('click',()=>setAllVisiblePermissions(false));
  $('#permissionsDefaultsBtn')?.addEventListener('click',resetPermissionsToDefaults);
}

// === Users Management ===
const USER_ROLE_LABELS={super_admin:'منشئ النظام',admin:'Admin',auditor:'Auditor',viewer:'Viewer',authenticated:'Authenticated'};
const USER_ROLE_CREATE_VALUES=new Set(['admin','auditor','viewer']);
const SYSTEM_OWNER_EMAILS=new Set(['ahmed.alaa842001@gmail.com']);
function isSystemOwnerEmail(email){ return SYSTEM_OWNER_EMAILS.has(String(email||'').trim().toLowerCase()); }
let USERS_MANAGEMENT_ROWS=[];
let USERS_MANAGEMENT_VIEW=[];
function setUsersStatus(message,type=''){
  const el=$('#userManagementStatus');
  if(!el) return;
  el.className='upload-status users-status-bar '+(type||'');
  el.textContent=message||'';
}
function roleLabel(role){ return USER_ROLE_LABELS[role] || role || 'Viewer'; }
function userInitial(name,email){ return String((name||email||'م').trim()).charAt(0).toUpperCase() || 'م'; }
function userDateText(v){
  if(!v) return '--';
  try{ return new Date(v).toLocaleString('ar-EG',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }catch(_){ return String(v).slice(0,19).replace('T',' '); }
}
function normalizeManagedUser(row){
  return {
    id: row?.id || '',
    email: row?.email || row?.auth_email || '',
    full_name: row?.full_name || row?.name || row?.email || '',
    job_title: row?.job_title || '',
    phone: row?.phone || '',
    role: row?.role || 'viewer',
    is_active: row?.is_active !== false,
    avatar_url: row?.avatar_url || '',
    created_at: row?.created_at || '',
    updated_at: row?.updated_at || row?.created_at || '',
    is_current: !!row?.is_current,
    is_fallback: !!row?.is_fallback
  };
}
async function ensureCurrentUserProfileFallback(rows){
  let list=(rows||[]).map(normalizeManagedUser);
  try{
    const {data:userData}=await WarehouseDB.getUser();
    const user=userData?.user;
    if(!user?.id) return list;
    const exists=list.some(u=>String(u.id)===String(user.id));
    if(exists){
      list=list.map(u=>String(u.id)===String(user.id)?{...u,is_current:true}:u);
      return list;
    }
    const profile=CURRENT_APP_PROFILE || {};
    const fallback=normalizeManagedUser({
      id:user.id,
      email:user.email,
      full_name:profile.full_name || user.user_metadata?.full_name || user.email,
      job_title:profile.job_title || profile.position || '',
      phone:profile.phone || '',
      avatar_url:profile.avatar_url || '',
      role:profile.role || (isSystemOwnerEmail(user.email) ? 'super_admin' : 'authenticated'),
      is_active:true,
      created_at:user.created_at || new Date().toISOString(),
      updated_at:new Date().toISOString(),
      is_current:true,
      is_fallback:true
    });
    list.unshift(fallback);
    // Best effort sync so the current authenticated user appears later from app_users too.
    try{
      await WarehouseDB.client.from('app_users').upsert({
        id:user.id,
        email:user.email,
        full_name:fallback.full_name || user.email,
        job_title:fallback.job_title,
        phone:fallback.phone,
        role:isSystemOwnerEmail(user.email) ? 'super_admin' : (fallback.role==='authenticated'?'viewer':fallback.role),
        is_active:true,
        updated_at:new Date().toISOString()
      },{onConflict:'id'});
    }catch(syncErr){ console.warn('Current profile sync skipped',syncErr); }
  }catch(err){ console.warn('Unable to merge current user',err); }
  return list;
}
function usersKpiUpdate(rows){
  const total=rows.length;
  const active=rows.filter(u=>u.is_active).length;
  const count=role=>rows.filter(u=>u.role===role).length;
  const set=(id,val)=>{ const el=$(id); if(el) el.textContent=val; };
  set('#usersTotalCount',total);
  set('#usersActiveCount',active);
  set('#usersInactiveCount',total-active);
  set('#usersSuperCount',count('super_admin'));
  set('#usersAdminCount',count('admin'));
  set('#usersAuditorCount',count('auditor'));
  set('#usersViewerCount',count('viewer')+count('authenticated'));
}
function currentUsersFilters(){
  return {
    q:($('#usersQuickSearch')?.value||'').trim().toLowerCase(),
    role:$('#usersRoleFilter')?.value||'all',
    status:$('#usersStatusFilter')?.value||'all'
  };
}
function applyUsersFilters(){
  const f=currentUsersFilters();
  USERS_MANAGEMENT_VIEW=USERS_MANAGEMENT_ROWS.filter(u=>{
    const hay=[u.full_name,u.email,u.job_title,u.phone,roleLabel(u.role)].join(' ').toLowerCase();
    const roleOk=f.role==='all' || u.role===f.role || (f.role==='viewer' && u.role==='authenticated');
    const statusOk=f.status==='all' || (f.status==='active'?u.is_active:!u.is_active);
    return (!f.q || hay.includes(f.q)) && roleOk && statusOk;
  });
  renderUsersManagementTableBody(USERS_MANAGEMENT_VIEW);
}
function renderUsersManagementTableBody(rows){
  const tbody=$('#usersManagementTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="10" class="empty-row">لا توجد بيانات مستخدمين مطابقة.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map((u,i)=>{
    const isSuper=u.role==='super_admin';
    const roleClass=(u.role||'viewer').replace(/[^a-z_]/g,'');
    const canToggle=!isSuper && !u.is_current;
    const canEdit=!isSuper || u.is_current;
    const avatar=u.avatar_url ? `<img src="${escapeHtml(u.avatar_url)}" alt="" />` : `<span>${escapeHtml(userInitial(u.full_name,u.email))}</span>`;
    return `<tr data-user-id="${escapeHtml(u.id)}" class="${u.is_current?'current-user-row':''} ${u.is_fallback?'fallback-user-row':''}">
      <td class="users-row-index">${i+1}</td>
      <td><div class="user-avatar-cell ${roleClass}">${avatar}</div></td>
      <td><strong>${escapeHtml(u.full_name||'--')}</strong>${u.is_current?'<small class="you-badge">أنت</small>':''}${u.is_fallback?'<small class="sync-badge">Auth</small>':''}</td>
      <td>${escapeHtml(u.job_title||'--')}</td>
      <td class="ltr-cell">${escapeHtml(u.email||'غير مخزن')}</td>
      <td class="ltr-cell">${escapeHtml(u.phone||'--')}</td>
      <td><span class="role-badge role-${roleClass}">${escapeHtml(roleLabel(u.role))}</span></td>
      <td><span class="status-pill ${u.is_active?'ok':'danger'}">${u.is_active?'نشط':'معطل'}</span></td>
      <td>${escapeHtml(userDateText(u.updated_at))}</td>
      <td>
        <div class="row-actions users-row-actions">
          <button type="button" class="icon-action view-user-btn" data-user-id="${escapeHtml(u.id)}" title="عرض">👁</button>
          ${canEdit?`<button type="button" class="icon-action edit-user-btn" data-user-id="${escapeHtml(u.id)}" title="تعديل">✎</button>`:`<button type="button" class="icon-action disabled" title="حساب منشئ النظام لا يتم تعديله من هنا">🔒</button>`}
          ${canToggle?`<button type="button" class="icon-action ${u.is_active?'danger-icon':'ok-icon'} toggle-user-btn" data-user-id="${escapeHtml(u.id)}" data-active="${u.is_active?'1':'0'}" title="${u.is_active?'تعطيل':'تفعيل'}">${u.is_active?'🚫':'✅'}</button>`:`<button type="button" class="icon-action disabled" title="لا يمكن تعطيل هذا الحساب">🔒</button>`}
          ${canToggle?`<button type="button" class="icon-action delete-user-btn hard-delete-icon" data-user-id="${escapeHtml(u.id)}" title="حذف نهائي من Auth">🗑</button>`:`<button type="button" class="icon-action disabled" title="لا يمكن حذف هذا الحساب">🔒</button>`}
        </div>
      </td>
    </tr>`;
  }).join('');
}
function renderUsersManagementTable(rows){
  USERS_MANAGEMENT_ROWS=(rows||[]).map(normalizeManagedUser);
  usersKpiUpdate(USERS_MANAGEMENT_ROWS);
  applyUsersFilters();
}
async function selectAppUsersForManagement(){
  if(!WarehouseDB?.ready) return {data:[],error:new Error('Supabase غير متصل')};
  const variants=[
    {select:'id, full_name, role, is_active, job_title, phone, avatar_url, created_at, updated_at, email', order:'created_at'},
    {select:'id, full_name, role, is_active, job_title, phone, avatar_url, created_at, updated_at', order:'created_at'},
    {select:'id, full_name, role, is_active, job_title, phone, avatar_url, email', order:null},
    {select:'id, full_name, role, is_active, job_title, phone, avatar_url', order:null}
  ];
  let last=null;
  for(const v of variants){
    let q=WarehouseDB.client.from('app_users').select(v.select);
    if(v.order) q=q.order(v.order,{ascending:false});
    const res=await q;
    if(!res.error) return res;
    last=res;
  }
  return last || {data:[],error:null};
}
async function loadUsersManagement(){
  if(!$('#usersManagementTable')) return;
  if(!WarehouseDB?.ready){ setUsersStatus('Supabase غير متصل.','err'); return; }
  setUsersStatus('جاري تحميل المستخدمين...');
  const {data,error}=await selectAppUsersForManagement();
  if(error){
    const merged=await ensureCurrentUserProfileFallback([]);
    renderUsersManagementTable(merged);
    setUsersStatus('تعذر تحميل جدول المستخدمين من Supabase: '+(error.message||error)+' — تم عرض المستخدم الحالي مؤقتاً. شغل ملف SQL المحدث لإصلاح سياسات RLS.','err');
    return;
  }
  const merged=await ensureCurrentUserProfileFallback(data||[]);
  renderUsersManagementTable(merged);
  setUsersStatus(`تم تحميل ${merged.length} مستخدم.`,'ok');
}
function openUserManagementModal(mode='create'){
  const modal=$('#userManagementModal');
  if(!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  if(mode==='create') resetUserManagementForm(false);
  setTimeout(()=>$('#managedUserFullName')?.focus(),50);
}
function closeUserManagementModal(){
  const modal=$('#userManagementModal');
  if(!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  document.body.classList.remove('modal-open');
}
function resetUserManagementForm(closeStatus=true){
  if($('#managedUserId')) $('#managedUserId').value='';
  if($('#managedUserEmail')) { $('#managedUserEmail').value=''; $('#managedUserEmail').disabled=false; }
  if($('#managedUserPassword')) { $('#managedUserPassword').value=''; $('#managedUserPassword').disabled=false; $('#managedUserPassword').placeholder='مطلوبة عند إضافة مستخدم جديد'; }
  if($('#managedUserFullName')) $('#managedUserFullName').value='';
  if($('#managedUserJobTitle')) $('#managedUserJobTitle').value='';
  if($('#managedUserPhone')) $('#managedUserPhone').value='';
  if($('#managedUserRole')) { $('#managedUserRole').value='viewer'; $('#managedUserRole').disabled=false; }
  if($('#managedUserActive')) { $('#managedUserActive').checked=true; $('#managedUserActive').disabled=false; }
  if($('#userFormTitle')) $('#userFormTitle').textContent='إضافة مستخدم جديد';
  if($('#saveManagedUserBtn')) $('#saveManagedUserBtn').textContent='إنشاء المستخدم';
  if(closeStatus) setUsersStatus('');
}
function fillUserFormForEdit(userId){
  const u=USERS_MANAGEMENT_ROWS.find(x=>String(x.id)===String(userId));
  if(!u) return;
  if(u.role==='super_admin' && !u.is_current){ setUsersStatus('حساب منشئ النظام لا يتم تعديله من شاشة المستخدمين.','err'); return; }
  if($('#managedUserId')) $('#managedUserId').value=u.id;
  if($('#managedUserEmail')) { $('#managedUserEmail').value=u.email||''; $('#managedUserEmail').disabled=true; }
  if($('#managedUserPassword')) { $('#managedUserPassword').value=''; $('#managedUserPassword').disabled=true; $('#managedUserPassword').placeholder='إعادة تعيين كلمة المرور تتم من Supabase Auth'; }
  if($('#managedUserFullName')) $('#managedUserFullName').value=u.full_name||'';
  if($('#managedUserJobTitle')) $('#managedUserJobTitle').value=u.job_title||'';
  if($('#managedUserPhone')) $('#managedUserPhone').value=u.phone||'';
  if($('#managedUserRole')) { $('#managedUserRole').value=USER_ROLE_CREATE_VALUES.has(u.role)?u.role:'viewer'; $('#managedUserRole').disabled=u.role==='super_admin'; }
  if($('#managedUserActive')) { $('#managedUserActive').checked=u.is_active; $('#managedUserActive').disabled=u.role==='super_admin'; }
  if($('#userFormTitle')) $('#userFormTitle').textContent='تعديل مستخدم';
  if($('#saveManagedUserBtn')) $('#saveManagedUserBtn').textContent='حفظ التعديل';
  openUserManagementModal('edit');
}
function viewManagedUser(userId){
  const u=USERS_MANAGEMENT_ROWS.find(x=>String(x.id)===String(userId));
  if(!u) return;
  alert(`بيانات المستخدم\n\nالاسم: ${u.full_name||'--'}\nالبريد: ${u.email||'--'}\nالدور: ${roleLabel(u.role)}\nالحالة: ${u.is_active?'نشط':'معطل'}\nالوظيفة: ${u.job_title||'--'}\nالهاتف: ${u.phone||'--'}`);
}
async function createAuthUserWithIsolatedClient(email,password){
  const cfg=window.WAREHOUSE_SUPABASE_CONFIG || {};
  if(!window.supabase || !cfg.url || !cfg.anonKey) throw new Error('Supabase غير جاهز لإنشاء الحساب.');
  const temp=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await temp.auth.signUp({email,password});
  if(error) throw error;
  return data?.user;
}
async function upsertManagedUserProfile(payload){
  const attempts=[];
  attempts.push(payload);
  const {email,...withoutEmail}=payload;
  attempts.push(withoutEmail);
  const {updated_at,...withoutUpdated}=withoutEmail;
  attempts.push(withoutUpdated);
  let lastError=null;
  for(const body of attempts){
    const res=await WarehouseDB.client.from('app_users').upsert(body,{onConflict:'id'}).select('*').single();
    if(!res.error) return res.data;
    lastError=res.error;
  }
  throw lastError || new Error('تعذر حفظ بيانات المستخدم.');
}
async function saveManagedUser(e){
  e?.preventDefault?.();
  if(!WarehouseDB?.ready){ setUsersStatus('Supabase غير متصل.','err'); return; }
  const existingId=$('#managedUserId')?.value || '';
  const email=($('#managedUserEmail')?.value||'').trim().toLowerCase();
  const password=$('#managedUserPassword')?.value || '';
  const fullName=($('#managedUserFullName')?.value||'').trim();
  const role=$('#managedUserRole')?.value || 'viewer';
  const jobTitle=($('#managedUserJobTitle')?.value||'').trim();
  const phone=($('#managedUserPhone')?.value||'').trim();
  const active=$('#managedUserActive')?.checked !== false;
  if(!fullName){ setUsersStatus('اسم المستخدم مطلوب.','err'); return; }
  if(!USER_ROLE_CREATE_VALUES.has(role)){ setUsersStatus('لا يمكن اختيار Super Admin من هذه الشاشة.','err'); return; }
  try{
    setUsersStatus(existingId?'جاري حفظ التعديل...':'جاري إنشاء المستخدم...');
    let userId=existingId;
    if(!existingId){
      if(!email){ setUsersStatus('البريد الإلكتروني مطلوب عند إضافة مستخدم جديد.','err'); return; }
      if(!password || password.length<6){ setUsersStatus('كلمة المرور مطلوبة ولا تقل عن 6 أحرف عند إضافة مستخدم جديد.','err'); return; }
      const authUser=await createAuthUserWithIsolatedClient(email,password);
      userId=authUser?.id;
      if(!userId) throw new Error('تم إرسال دعوة/تأكيد للمستخدم ولكن لم يتم إرجاع معرف الحساب. راجع إعدادات Supabase Auth.');
    }
    await upsertManagedUserProfile({
      id:userId,
      email,
      full_name:fullName,
      job_title:jobTitle,
      phone,
      role,
      is_active:active,
      updated_at:new Date().toISOString()
    });
    setUsersStatus(existingId?'تم حفظ تعديل المستخدم.':'تم إنشاء المستخدم وحفظ بياناته.','ok');
    closeUserManagementModal();
    resetUserManagementForm(false);
    await loadUsersManagement();
  }catch(err){
    setUsersStatus('خطأ: '+(err.message||err),'err');
  }
}
async function toggleManagedUser(userId,currentActive){
  const u=USERS_MANAGEMENT_ROWS.find(x=>String(x.id)===String(userId));
  if(!userId || !WarehouseDB?.ready) return;
  if(u?.role==='super_admin' || u?.is_current){ setUsersStatus('لا يمكن تعطيل هذا الحساب من شاشة إدارة المستخدمين.','err'); return; }
  try{
    setUsersStatus('جاري تحديث حالة المستخدم...');
    let res=await WarehouseDB.client.from('app_users').update({is_active:!currentActive, updated_at:new Date().toISOString()}).eq('id',userId);
    if(res.error && String(res.error.message||'').includes('updated_at')){
      res=await WarehouseDB.client.from('app_users').update({is_active:!currentActive}).eq('id',userId);
    }
    if(res.error) throw res.error;
    setUsersStatus(!currentActive?'تم تفعيل المستخدم.':'تم تعطيل المستخدم.','ok');
    await loadUsersManagement();
  }catch(err){ setUsersStatus('تعذر تحديث الحالة: '+(err.message||err),'err'); }
}

async function deleteManagedUserForever(userId){
  const u=USERS_MANAGEMENT_ROWS.find(x=>String(x.id)===String(userId));
  if(!userId || !WarehouseDB?.ready) return;
  if(!u){ setUsersStatus('المستخدم غير موجود في الجدول الحالي.','err'); return; }
  if(u.role==='super_admin'){ setUsersStatus('لا يمكن حذف حساب منشئ النظام.','err'); return; }
  if(u.is_current){ setUsersStatus('لا يمكن حذف حسابك الحالي.','err'); return; }
  const label=u.full_name || u.email || userId;
  const ok=confirm(`تحذير نهائي

سيتم حذف المستخدم من Supabase Auth نهائيًا، وحذف ملفه من جدول المستخدمين.

المستخدم: ${label}

هل أنت متأكد؟`);
  if(!ok) return;
  try{
    setUsersStatus('جاري حذف المستخدم نهائيًا من Supabase Auth...');
    const sessionRes=await WarehouseDB.client.auth.getSession();
    const accessToken=sessionRes?.data?.session?.access_token;
    if(!accessToken) throw new Error('جلسة الدخول غير صالحة. سجل الدخول مرة أخرى.');
    const cfg=window.WAREHOUSE_SUPABASE_CONFIG || {};
    const fnUrl=`${String(cfg.url||'').replace(/\/$/,'')}/functions/v1/delete-user`;
    if(!cfg.url) throw new Error('رابط Supabase غير مضبوط.');
    const response=await fetch(fnUrl,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'Authorization':`Bearer ${accessToken}`,
        'apikey':cfg.anonKey || ''
      },
      body:JSON.stringify({user_id:userId})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok || result.error) throw new Error(result.error || `فشل الحذف. HTTP ${response.status}`);
    setUsersStatus('تم حذف المستخدم نهائيًا من Auth وجدول المستخدمين.','ok');
    await loadUsersManagement();
  }catch(err){
    setUsersStatus('تعذر الحذف النهائي: '+(err.message||err),'err');
  }
}
async function exportUsersPanelPng(){
  const source=$('#usersManagementCapture');
  const Html2Canvas=window.html2canvas;
  if(!source || !Html2Canvas){ alert('مكتبة تصدير الصور غير محملة.'); return; }
  try{
    if(document.fonts?.ready) await document.fonts.ready;
    const canvas=await Html2Canvas(source,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#001f18',logging:false});
    canvas.toBlob(async blob=>{ if(blob) await saveBlobWithPicker(blob,`${safeFileName('إدارة المستخدمين')}.png`,'image/png'); },'image/png',1);
  }catch(err){ alert('تعذر تصدير صورة إدارة المستخدمين.'); }
}
function initUsersManagement(){
  const form=$('#userManagementForm');
  if(form) form.addEventListener('submit',saveManagedUser);
  $('#resetManagedUserFormBtn')?.addEventListener('click',()=>resetUserManagementForm());
  $('#refreshUsersBtn')?.addEventListener('click',loadUsersManagement);
  document.querySelectorAll('.users-open-create').forEach(btn=>btn.addEventListener('click',()=>openUserManagementModal('create')));
  $('#closeUserModalBtn')?.addEventListener('click',closeUserManagementModal);
  $('#cancelUserModalBtn')?.addEventListener('click',closeUserManagementModal);
  $('#userManagementModal')?.addEventListener('click',e=>{ if(e.target.id==='userManagementModal') closeUserManagementModal(); });
  $('#usersQuickSearch')?.addEventListener('input',applyUsersFilters);
  $('#usersRoleFilter')?.addEventListener('change',applyUsersFilters);
  $('#usersStatusFilter')?.addEventListener('change',applyUsersFilters);
  $('#usersExportExcelBtn')?.addEventListener('click',()=>exportTableToExcel('usersManagementTable','إدارة المستخدمين'));
  $('#usersExportPdfBtn')?.addEventListener('click',()=>exportTableToPdf('usersManagementTable','إدارة المستخدمين'));
  $('#usersExportPngBtn')?.addEventListener('click',exportUsersPanelPng);
  $('#usersManagementTable')?.addEventListener('click',e=>{
    const view=e.target.closest('.view-user-btn');
    const edit=e.target.closest('.edit-user-btn');
    const toggle=e.target.closest('.toggle-user-btn');
    const del=e.target.closest('.delete-user-btn');
    if(view){ viewManagedUser(view.dataset.userId); }
    if(edit){ fillUserFormForEdit(edit.dataset.userId); }
    if(toggle){ toggleManagedUser(toggle.dataset.userId, toggle.dataset.active==='1'); }
    if(del){ deleteManagedUserForever(del.dataset.userId); }
  });
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
document.addEventListener('DOMContentLoaded',()=>{initMainLoginGate();initProfileSettings();initUsersManagement();initPermissionsManagement();});

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

// === Executive Reports Center ===
let EXECUTIVE_REPORT_STATE={rows:[], stats:null, filters:null};
function fillReportFilters(){
  const pf=$('#reportPlantFilter'), wf=$('#reportWarehouseFilter');
  if(!pf || !wf || pf.dataset.ready==='1') return;
  APP_DATA.plants.forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
  const saleWhCodes=['W401','W402','N401','N402','N411','N412','E401','E402'];
  function fillWh(){
    const old=wf.value;
    wf.innerHTML='<option value="all">كل مخازن البيع</option>';
    APP_DATA.plants
      .filter(p=>pf.value==='all'||p.code===pf.value)
      .forEach(p=>p.warehouses.filter(w=>saleWhCodes.includes(w[0])).forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]))));
    if([...wf.options].some(o=>o.value===old)) wf.value=old;
  }
  pf.addEventListener('change',fillWh);
  fillWh();
  pf.dataset.ready='1';
}
async function ensureReportDefaultDates(options={}){
  const fromEl=$('#reportFromDate'), toEl=$('#reportToDate');
  if(!fromEl || !toEl || options.keepDates) return;
  if(fromEl.value || toEl.value) return;
  try{
    const {data,error}=await WarehouseDB.client.from('sales_audit_report').select('report_date').order('report_date',{ascending:false}).limit(1);
    if(!error && data?.[0]?.report_date){ fromEl.value=normalizeDateISO(data[0].report_date); toEl.value=normalizeDateISO(data[0].report_date); }
  }catch(_){ }
}
function getReportFilters(){
  return {plant:$('#reportPlantFilter')?.value||'all',warehouse:$('#reportWarehouseFilter')?.value||'all',from:normalizeDateISO($('#reportFromDate')?.value||''),to:normalizeDateISO($('#reportToDate')?.value||'')};
}
function reportFilterLabel(filters){
  const plant=filters.plant==='all'?'جميع المصانع':filters.plant;
  const wh=filters.warehouse==='all'?'جميع مخازن البيع':filters.warehouse;
  const period=(filters.from||filters.to)?`${filters.from||'البداية'} → ${filters.to||'النهاية'}`:'كل الفترات';
  return `الفترة: ${period} / المصنع: ${plant} / المخزن: ${wh} / تاريخ الإصدار: ${new Date().toLocaleString('ar-EG')}`;
}
function renderExecutiveKPIs(stats){
  const cards=[
    ['إجمالي البيع',stats.salesQty,'طن','🛒'],['إجمالي الإنتاج',stats.productionQty,'طن','🏭'],['التحويلات الصادرة',stats.outgoingTransferQty,'طن','↔'],['التحويلات الواردة',stats.incomingTransferQty,'طن','⬇'],['إجمالي التحميل',stats.totalLoadingQty,'طن','📦']
  ];
  const node=$('#executiveKpiCards'); if(node) node.innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${fmt(c[1])}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function drawReportLine(daily){
  const canvas=$('#reportLineChart'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const series=[{key:'sales',label:'البيع',color:'#83d84b'},{key:'production',label:'الإنتاج',color:'#32aee9'},{key:'outgoing',label:'الصادرة',color:'#ff9f2f'},{key:'incoming',label:'الواردة',color:'#b965ff'}];
  const days=Object.keys(daily||{}).sort().slice(-31); if(!days.length){ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2);return;}
  const plotDays=days.length===1?[days[0],days[0]]:days; const rawMax=Math.max(1,...days.flatMap(d=>series.map(s=>daily[d][s.key]||0))); const max=Math.ceil(rawMax*1.15);
  const pad={l:54,r:20,t:25,b:38}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(255,255,255,.13)';ctx.lineWidth=1;ctx.font='bold 11px Cairo';ctx.fillStyle='#cfe8d0';ctx.textAlign='right';
  for(let i=0;i<=5;i++){const y=pad.t+ch-(i/5)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/5),pad.l-8,y+4);}
  const xFor=i=>pad.l+i*(cw/(plotDays.length-1)); const yFor=v=>pad.t+ch-(v/max)*ch;
  series.forEach(s=>{ctx.strokeStyle=s.color;ctx.lineWidth=3;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();plotDays.forEach((d,i)=>{const x=xFor(i),y=yFor(daily[d]?.[s.key]||0);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();});
  // legend
  ctx.textAlign='left'; ctx.font='bold 12px Cairo'; let lx=25; series.forEach(s=>{ctx.fillStyle=s.color;ctx.fillRect(lx,8,18,4);ctx.fillStyle='#eaffdf';ctx.fillText(s.label,lx+24,13);lx+=95;});
  ctx.fillStyle='#d6ead1';ctx.font='bold 12px Cairo';ctx.textAlign='center';ctx.fillText(days[0].slice(5),pad.l,pad.t+ch+28);ctx.fillText(days[days.length-1].slice(5),w-pad.r,pad.t+ch+28);
}
function drawReportPlantBar(plantStats){
  const canvas=$('#reportPlantChart'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const plants=APP_DATA.plants.map(p=>p.code); const series=[{key:'sales',label:'البيع',color:'#74c54a'},{key:'production',label:'الإنتاج',color:'#2aa6e8'},{key:'outgoing',label:'الصادرة',color:'#ff9f2f'},{key:'incoming',label:'الواردة',color:'#b45cff'},{key:'loading',label:'التحميل',color:'#28c7bd'}];
  const max=Math.max(1,...plants.flatMap(c=>series.map(s=>Math.abs((plantStats[c]||{})[s.key]||0)))); const pad={l:50,r:20,t:30,b:42}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(255,255,255,.12)';ctx.font='bold 11px Cairo';ctx.fillStyle='#cfe8d0';ctx.textAlign='right'; for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/4),pad.l-8,y+4);}
  const groupW=cw/plants.length, barW=Math.min(17,(groupW-30)/series.length); plants.forEach((code,pi)=>{const baseX=pad.l+pi*groupW+groupW/2-((barW+4)*series.length)/2;series.forEach((s,si)=>{const v=Math.abs((plantStats[code]||{})[s.key]||0);const bh=(v/max)*ch;const x=baseX+si*(barW+4),y=pad.t+ch-bh;ctx.fillStyle=s.color;ctx.fillRect(x,y,barW,bh);});ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 13px Cairo';ctx.fillText(code,pad.l+pi*groupW+groupW/2,pad.t+ch+25);});
  ctx.textAlign='left';ctx.font='bold 11px Cairo';let lx=30;series.forEach(s=>{ctx.fillStyle=s.color;ctx.fillRect(lx,8,12,6);ctx.fillStyle='#eaffdf';ctx.fillText(s.label,lx+16,14);lx+=88;});
}
function drawReportDonut(warehouseSalesMap){
  const canvas=$('#reportDonutChart'), legend=$('#reportDonutLegend'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const entries=Object.entries(warehouseSalesMap||{}).sort((a,b)=>b[1]-a[1]).slice(0,8); const sum=entries.reduce((a,b)=>a+b[1],0); if(!sum){ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2); if(legend)legend.innerHTML=''; return;}
  const cx=155,cy=130,r=86; let a=-Math.PI/2; entries.forEach(([code,val],i)=>{const e=a+(val/sum)*Math.PI*2;ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,e);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();a=e;}); ctx.beginPath();ctx.arc(cx,cy,48,0,Math.PI*2);ctx.fillStyle='#00251f';ctx.fill();ctx.fillStyle='#fff';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText(fmt(sum),cx,cy-2);ctx.font='bold 12px Cairo';ctx.fillStyle='#d8ffd1';ctx.fillText('طن',cx,cy+20);
  if(legend) legend.innerHTML=entries.map(([code,val],i)=>`<div><span style="background:${colors[i%colors.length]}"></span><b>${escapeHtml(code)}</b> ${fmt(val)} طن - ${sum?((val/sum)*100).toFixed(1):0}%</div>`).join('');
}
function renderExecutiveInsights(products, warehouses, plantStats, stats){
  const topProduct=[...products].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0]||{};
  const topWh=[...warehouses].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0]||{};
  const topPlant=Object.entries(plantStats||{}).sort((a,b)=>Math.abs(b[1].sales)-Math.abs(a[1].sales))[0]||['-',{}];
  const noSales=products.filter(p=>Math.abs(p.sales)===0 && (Math.abs(p.production)+Math.abs(p.outgoing)+Math.abs(p.incoming))>0).length;
  const review=products.filter(p=>Math.abs(p.production-p.sales)>Math.max(5,Math.abs(p.sales)*.25)).length;
  const cards=[['🏭',topPlant[0],`أعلى مصنع بيعاً`,`${fmt(topPlant[1].sales||0)} طن`],['📦',topWh.code||'-','أعلى مخزن بيعاً',`${fmt(topWh.sales||0)} طن`],['⭐',topProduct.code||'-','أعلى صنف بيعاً',`${escapeHtml(topProduct.name||'-')}`],['🚫',noSales,'أصناف بدون بيع','لها إنتاج أو تحويلات'],['⚠️',review,'أصناف تحتاج مراجعة','فرق إنتاج/بيع مرتفع'],['📊',fmt(stats.salesQty),'إجمالي البيع','حسب الفلتر الحالي']];
  const node=$('#executiveInsights'); if(node) node.innerHTML=cards.map(c=>`<div class="executive-insight-card"><span class="insight-ico">${c[0]}</span><b>${c[1]}</b><span>${c[2]}</span><small>${c[3]}</small></div>`).join('');
}
function renderExecutiveExportTable(stats, products, warehouses, plantStats){
  const tbl=$('#executiveExportTable'); if(!tbl) return;
  const plantRows=APP_DATA.plants.map(p=>`<tr><td>أداء مصنع</td><td>${p.code}</td><td>${p.name}</td><td>${fmt((plantStats[p.code]||{}).sales||0)}</td><td>${fmt((plantStats[p.code]||{}).production||0)}</td><td>${fmt((plantStats[p.code]||{}).outgoing||0)}</td><td>${fmt((plantStats[p.code]||{}).incoming||0)}</td><td>${fmt((plantStats[p.code]||{}).loading||0)}</td></tr>`).join('');
  const productRows=products.slice(0,10).map(p=>`<tr><td>أفضل صنف</td><td>${escapeHtml(p.code)}</td><td>${escapeHtml(p.name)}</td><td>${fmt(p.sales)}</td><td>${fmt(p.production)}</td><td>${fmt(p.outgoing)}</td><td>${fmt(p.incoming)}</td><td>${fmt(p.loading)}</td></tr>`).join('');
  const whRows=warehouses.slice(0,10).map(w=>`<tr><td>أفضل مخزن</td><td>${escapeHtml(w.code)}</td><td>${escapeHtml(w.name)}</td><td>${fmt(w.sales)}</td><td>${fmt(w.production)}</td><td>${fmt(w.outgoing)}</td><td>${fmt(w.incoming)}</td><td>${fmt(w.loading)}</td></tr>`).join('');
  tbl.innerHTML=`<thead><tr><th>القسم</th><th>الكود</th><th>البيان</th><th>البيع</th><th>الإنتاج</th><th>الصادرة</th><th>الواردة</th><th>التحميل</th></tr></thead><tbody><tr><td>إجمالي</td><td>-</td><td>إجمالي الفترة</td><td>${fmt(stats.salesQty)}</td><td>${fmt(stats.productionQty)}</td><td>${fmt(stats.outgoingTransferQty)}</td><td>${fmt(stats.incomingTransferQty)}</td><td>${fmt(stats.totalLoadingQty)}</td></tr>${plantRows}${productRows}${whRows}</tbody>`;
}

let ACTIVE_REPORT_TAB='executive';
let ITEMS_REPORT_STATE={items:[], filters:null, summary:null};
function getReportStatus(item){
  const sales=Math.abs(item.sales||0), production=Math.abs(item.production||0), outgoing=Math.abs(item.outgoing||0), incoming=Math.abs(item.incoming||0), loading=Math.abs(item.loading||0);
  const activity=sales+production+outgoing+incoming+loading;
  const gap=production-sales;
  const absGap=Math.abs(gap);
  const threshold=Math.max(5, Math.max(sales,production)*0.25);
  if(activity>0 && sales===0) return {key:'no_sales', label:'بدون بيع', cls:'danger', weight:90};
  if(absGap>threshold && gap>0) return {key:'production_high', label:'إنتاج أعلى من البيع', cls:'warning', weight:70};
  if(absGap>threshold && gap<0) return {key:'sales_high', label:'بيع أعلى من الإنتاج', cls:'warning', weight:65};
  if(outgoing>Math.max(5,sales*0.5)) return {key:'outgoing_high', label:'تحويلات صادرة مرتفعة', cls:'info', weight:55};
  return {key:'ok', label:'طبيعي', cls:'ok', weight:0};
}
function getItemReviewScore(item){
  const st=getReportStatus(item);
  const sales=Math.abs(item.sales||0), production=Math.abs(item.production||0), outgoing=Math.abs(item.outgoing||0);
  return st.weight + Math.abs(production-sales) + outgoing*0.15 + (sales===0?25:0);
}
function renderItemsReportKPIs(summary){
  const cards=[
    ['عدد الأصناف',summary.count,'صنف','📦'],
    ['أصناف طبيعية',summary.ok,'صنف','✅'],
    ['تحتاج مراجعة',summary.review,'صنف','⚠️'],
    ['بدون بيع',summary.noSales,'صنف','🚫'],
    ['إجمالي فرق الإنتاج/البيع',summary.totalGap,'طن','↕']
  ];
  const node=$('#itemsReportKpis'); if(node) node.innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${fmt(c[1])}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function renderItemsStatusBoard(summary){
  const node=$('#itemsStatusBoard'); if(!node) return;
  node.innerHTML=`
    <div class="item-status-card ok"><div><span>الأصناف الطبيعية</span><small>لا توجد مؤشرات غير معتادة</small></div><b>${fmt(summary.ok)}</b></div>
    <div class="item-status-card danger"><div><span>أصناف بدون بيع</span><small>لها إنتاج أو تحويلات خلال الفترة</small></div><b>${fmt(summary.noSales)}</b></div>
    <div class="item-status-card warning"><div><span>فرق إنتاج/بيع مرتفع</span><small>تحتاج مراجعة كمية وحركة</small></div><b>${fmt(summary.gapItems)}</b></div>
    <div class="item-status-card warning"><div><span>تحويلات صادرة مرتفعة</span><small>أعلى من متوسط النشاط</small></div><b>${fmt(summary.outgoingHigh)}</b></div>
    <div class="item-status-card"><div><span>متوسط نسبة البيع للإنتاج</span><small>حسب الأصناف ذات الإنتاج</small></div><b>${fmt(summary.avgSalesToProduction)}%</b></div>
    <div class="item-status-card"><div><span>إجمالي التحميل</span><small>للأصناف المعروضة</small></div><b>${fmt(summary.totalLoading)}</b></div>`;
}
function itemReportRow(item,i){
  const status=getReportStatus(item);
  const prod=Math.abs(item.production||0), sales=Math.abs(item.sales||0);
  const gap=(item.production||0)-(item.sales||0);
  const ratio=prod?((sales/prod)*100):0;
  return `<tr class="item-row-${status.cls}"><td>${i+1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name)}</td><td>${fmt(item.sales)}</td><td>${fmt(item.production)}</td><td>${fmt(item.outgoing)}</td><td>${fmt(item.incoming)}</td><td>${fmt(item.loading)}</td><td>${fmt(gap)}</td><td>${prod?fmt(ratio)+'%':'-'}</td><td><span class="item-status-badge ${status.cls}">${status.label}</span></td></tr>`;
}
function renderItemsReportTables(items){
  const tbl=$('#itemsReportTable'), top=$('#itemsReviewTopTable');
  const headers='<thead><tr><th>#</th><th>كود الصنف</th><th>اسم الصنف</th><th>البيع</th><th>الإنتاج</th><th>الصادرة</th><th>الواردة</th><th>التحميل</th><th>فرق الإنتاج/البيع</th><th>نسبة البيع للإنتاج</th><th>الحالة</th></tr></thead>';
  if(tbl) tbl.innerHTML=headers+`<tbody>${items.map(itemReportRow).join('')||'<tr><td colspan="11">لا توجد بيانات</td></tr>'}</tbody>`;
  const reviewItems=[...items].sort((a,b)=>getItemReviewScore(b)-getItemReviewScore(a)).slice(0,10);
  if(top) top.innerHTML=headers+`<tbody>${reviewItems.map(itemReportRow).join('')||'<tr><td colspan="11">لا توجد بيانات</td></tr>'}</tbody>`;
  const count=$('#itemsReportCount'); if(count) count.textContent=`عدد الأصناف: ${items.length}`;
}
function renderItemsExportTable(items,summary){
  const tbl=$('#itemsReportExportTable'); if(!tbl) return;
  const rows=items.map((item,i)=>{const st=getReportStatus(item); const prod=Math.abs(item.production||0), sales=Math.abs(item.sales||0); const gap=(item.production||0)-(item.sales||0); const ratio=prod?((sales/prod)*100):0; return `<tr><td>${i+1}</td><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name)}</td><td>${fmt(item.sales)}</td><td>${fmt(item.production)}</td><td>${fmt(item.outgoing)}</td><td>${fmt(item.incoming)}</td><td>${fmt(item.loading)}</td><td>${fmt(gap)}</td><td>${prod?fmt(ratio)+'%':'-'}</td><td>${st.label}</td></tr>`;}).join('');
  tbl.innerHTML=`<thead><tr><th>#</th><th>كود الصنف</th><th>اسم الصنف</th><th>البيع</th><th>الإنتاج</th><th>الصادرة</th><th>الواردة</th><th>التحميل</th><th>فرق الإنتاج/البيع</th><th>نسبة البيع للإنتاج</th><th>الحالة</th></tr></thead><tbody>${rows}</tbody>`;
}
async function loadItemsReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let query=WarehouseDB.client.from('sales_audit_report').select('report_date,warehouse_code,plant_code,material_code,material_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity').order('material_code',{ascending:true}).range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from); if(filters.to) query=query.lte('report_date',filters.to); if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant); if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const {data,error}=await query; if(error){console.warn('items report load error',error);return;} const map={};
  (data||[]).forEach(r=>{const key=String(r.material_code||r.material_name||'غير محدد'); if(!map[key]) map[key]={code:r.material_code||'-',name:r.material_name||'-',sales:0,production:0,outgoing:0,incoming:0,loading:0}; const it=map[key]; it.sales+=toNumber(r.sales_quantity); it.production+=toNumber(r.production_quantity); it.outgoing+=toNumber(r.outgoing_transfer_quantity); it.incoming+=toNumber(r.incoming_transfer_quantity); it.loading+=toNumber(r.total_loading_quantity);});
  const items=Object.values(map).sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales));
  const summary={count:items.length,ok:0,review:0,noSales:0,gapItems:0,outgoingHigh:0,totalGap:0,totalLoading:0,avgSalesToProduction:0}; let ratioSum=0, ratioCount=0;
  items.forEach(it=>{const st=getReportStatus(it); if(st.key==='ok') summary.ok++; else summary.review++; if(st.key==='no_sales') summary.noSales++; if(st.key==='production_high'||st.key==='sales_high') summary.gapItems++; if(st.key==='outgoing_high') summary.outgoingHigh++; summary.totalGap+=(it.production||0)-(it.sales||0); summary.totalLoading+=it.loading||0; const prod=Math.abs(it.production||0); if(prod){ratioSum+=(Math.abs(it.sales||0)/prod)*100; ratioCount++;}}); summary.avgSalesToProduction=ratioCount?ratioSum/ratioCount:0;
  ITEMS_REPORT_STATE={items,filters,summary}; if($('#itemsReportMeta')) $('#itemsReportMeta').textContent=reportFilterLabel(filters); renderItemsReportKPIs(summary); renderItemsStatusBoard(summary); renderItemsReportTables(items); renderItemsExportTable(items,summary);
}


let WAREHOUSES_REPORT_STATE={warehouses:[],filters:null,summary:null};
function warehouseReportRow(w,i,totalSales){
  const pct=totalSales?Math.abs(w.sales||0)/Math.abs(totalSales)*100:0;
  return `<tr><td>${i+1}</td><td>${escapeHtml(w.code)}</td><td>${escapeHtml(w.name)}</td><td>${escapeHtml(w.plant)}</td><td>${fmt(w.sales)}</td><td>${fmt(w.production)}</td><td>${fmt(w.outgoing)}</td><td>${fmt(w.incoming)}</td><td>${fmt(w.loading)}</td><td><div class="warehouse-share-cell"><span>${fmt(pct)}%</span><b style="width:${Math.min(100,Math.max(0,pct))}%"></b></div></td></tr>`;
}
function renderWarehousesReportKPIs(summary){
  const cards=[
    ['إجمالي البيع',summary.sales,'طن','🛒'],['إجمالي الإنتاج',summary.production,'طن','🏭'],['التحويلات الصادرة',summary.outgoing,'طن','🚚'],['التحويلات الواردة',summary.incoming,'طن','📥'],['إجمالي التحميل',summary.loading,'طن','📦']
  ];
  const node=$('#warehousesReportKpis'); if(node) node.innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${fmt(c[1])}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function drawWarehousesReportChart(warehouses){
  const canvas=$('#warehousesReportChart'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const rows=(warehouses||[]).slice().sort((a,b)=>(b.loading||0)-(a.loading||0)).slice(0,8);
  const series=[
    {key:'sales',label:'البيع',color:'#83d84b'},
    {key:'production',label:'الإنتاج',color:'#32aee9'},
    {key:'outgoing',label:'التحويلات الصادرة',color:'#ff9f2d'},
    {key:'incoming',label:'التحويلات الواردة',color:'#29d6cb'},
    {key:'loading',label:'التحميل',color:'#9b5cf6'}
  ];
  if(!rows.length){ctx.fillStyle='#d6ead1';ctx.font='bold 24px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2);return;}
  const max=Math.max(1,...rows.flatMap(r=>series.map(s=>Math.abs(r[s.key]||0))));
  const pad={l:78,r:32,t:74,b:74}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.save();
  const g=ctx.createLinearGradient(0,pad.t,0,h-pad.b); g.addColorStop(0,'rgba(131,216,75,.08)'); g.addColorStop(1,'rgba(41,214,203,.02)'); ctx.fillStyle=g; ctx.fillRect(pad.l,pad.t,cw,ch);
  ctx.strokeStyle='rgba(255,255,255,.13)';ctx.fillStyle='#d8f5d0';ctx.font='bold 13px Cairo';ctx.textAlign='right';ctx.textBaseline='middle';
  for(let i=0;i<=5;i++){const y=pad.t+ch-(i/5)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/5),pad.l-12,y);}
  const groupW=cw/rows.length, barW=Math.max(12,Math.min(22,(groupW-26)/series.length));
  rows.forEach((row,ri)=>{
    const cx=pad.l+ri*groupW+groupW/2; const baseX=cx-((barW+5)*series.length-5)/2;
    series.forEach((s,si)=>{const v=Math.abs(row[s.key]||0); const bh=(v/max)*ch; const x=baseX+si*(barW+5), y=pad.t+ch-bh; const grad=ctx.createLinearGradient(x,y,x,y+bh); grad.addColorStop(0,s.color); grad.addColorStop(1,'rgba(255,255,255,.25)'); ctx.fillStyle=grad; ctx.fillRect(x,y,barW,bh); if(v>0 && bh>34){ctx.fillStyle='#f5fff0';ctx.font='bold 11px Cairo';ctx.textAlign='center';ctx.fillText(fmt(v),x+barW/2,Math.max(y-10,pad.t+10));}});
    ctx.fillStyle='#ffffff'; ctx.textAlign='center'; ctx.font='bold 15px Cairo'; ctx.fillText(row.code,cx,pad.t+ch+28);
    ctx.fillStyle='#aee998'; ctx.font='bold 11px Cairo'; ctx.fillText(String(row.plant||''),cx,pad.t+ch+48);
  });
  let lx=pad.l+10; ctx.textAlign='left'; ctx.font='bold 13px Cairo'; series.forEach(s=>{ctx.fillStyle=s.color;ctx.fillRect(lx,24,18,8);ctx.fillStyle='#eaffdf';ctx.fillText(s.label,lx+25,29);lx+=130;});
  ctx.restore();
}
function renderWarehousesRanking(warehouses,summary){
  const node=$('#warehousesRankingList'); if(!node) return;
  const topSales=[...warehouses].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0];
  const topLoading=[...warehouses].sort((a,b)=>Math.abs(b.loading)-Math.abs(a.loading))[0];
  const lowActivity=[...warehouses].sort((a,b)=>(a.totalActivity||0)-(b.totalActivity||0))[0];
  const avg=warehouses.length?summary.sales/warehouses.length:0;
  const maxAct=Math.max(1,...warehouses.map(w=>w.totalActivity||0));
  const rows=[...warehouses].sort((a,b)=>(b.totalActivity||0)-(a.totalActivity||0)).slice(0,10).map((w,i)=>`<div class="warehouse-rank-row"><em>${i+1}</em><div><b>${escapeHtml(w.code)}</b><small>${escapeHtml(w.name)} - ${escapeHtml(w.plant)}</small></div><span>${fmt(w.totalActivity)}<small> طن</small></span><i style="width:${Math.min(100,(w.totalActivity||0)/maxAct*100)}%"></i></div>`).join('');
  node.innerHTML=`<div class="warehouse-rank-bars">${rows||'<p class="hint">لا توجد بيانات</p>'}</div>`;
  const tiles=$('#warehousesQuickTiles');
  if(tiles){
    tiles.innerHTML=`
      <article><span>أعلى تحميل</span><b>${topLoading?escapeHtml(topLoading.code):'-'}</b><small>${topLoading?fmt(topLoading.loading):'0'} طن</small></article>
      <article><span>أعلى بيع</span><b>${topSales?escapeHtml(topSales.code):'-'}</b><small>${topSales?fmt(topSales.sales):'0'} طن</small></article>
      <article><span>متوسط البيع/مخزن</span><b>${fmt(avg)}</b><small>طن</small></article>
      <article><span>أقل نشاط</span><b>${lowActivity?escapeHtml(lowActivity.code):'-'}</b><small>${lowActivity?fmt(lowActivity.totalActivity):'0'} طن</small></article>`;
  }
}
function drawWarehousesLoadingDonut(warehouses,summary){
  const canvas=$('#warehousesLoadingDonut'); if(!canvas) return; const ctx=canvas.getContext('2d'); const w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const entries=(warehouses||[]).filter(x=>Math.abs(x.loading||0)>0).sort((a,b)=>Math.abs(b.loading)-Math.abs(a.loading)).slice(0,8);
  const sum=entries.reduce((a,b)=>a+Math.abs(b.loading||0),0);
  if(!sum){ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2); return;}
  const colors=['#79d84b','#29a9e6','#29d6cb','#ff9f2d','#ffd54a','#9b5cf6','#97a097','#4bc37b']; let start=-Math.PI/2; const cx=w*.36,cy=h*.5,r=Math.min(w,h)*.32,ir=r*.55;
  entries.forEach((e,i)=>{const val=Math.abs(e.loading||0),ang=val/sum*Math.PI*2; ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,start+ang);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill(); start+=ang;});
  ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);ctx.fill();ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#fff';ctx.font='bold 22px Cairo';ctx.textAlign='center';ctx.fillText(fmt(sum),cx,cy-4);ctx.font='bold 13px Cairo';ctx.fillText('طن',cx,cy+22);
  const lg=$('#warehousesLoadingLegend'); if(lg){lg.innerHTML=entries.map((e,i)=>{const pct=sum?Math.abs(e.loading||0)/sum*100:0; return `<div><i style="background:${colors[i%colors.length]}"></i><b>${escapeHtml(e.code)}</b><span>${fmt(pct)}%</span><em>${fmt(e.loading)} طن</em></div>`;}).join('');}
}
function renderWarehouseMiniTables(warehouses,summary){
  function block(sel, key){
    const node=$(sel); if(!node) return; const total=Math.max(1,Math.abs(summary[key]||0));
    const rows=[...warehouses].sort((a,b)=>Math.abs(b[key]||0)-Math.abs(a[key]||0)).slice(0,5);
    node.innerHTML=`<table><thead><tr><th>#</th><th>المخزن</th><th>القيمة</th><th>نسبة المساهمة</th></tr></thead><tbody>${rows.map((w,i)=>{const pct=Math.abs(w[key]||0)/total*100;return `<tr><td>${i+1}</td><td>${escapeHtml(w.code)}</td><td>${fmt(w[key]||0)}</td><td><div class="mini-progress"><b style="width:${Math.min(100,pct)}%"></b><span>${fmt(pct)}%</span></div></td></tr>`;}).join('')||'<tr><td colspan="4">لا توجد بيانات</td></tr>'}</tbody></table>`;
  }
  block('#warehouseTopSalesMini','sales'); block('#warehouseTopProductionMini','production'); block('#warehouseTopLoadingMini','loading');
  drawWarehousesLoadingDonut(warehouses,summary);
}
function renderWarehousesReportTables(warehouses,summary){
  const tbl=$('#warehousesReportTable');
  const headers='<thead><tr><th>الترتيب</th><th>المخزن</th><th>اسم المخزن</th><th>المصنع</th><th>البيع</th><th>الإنتاج</th><th>صادر</th><th>وارد</th><th>التحميل</th><th>نسبة المساهمة</th></tr></thead>';
  if(tbl) tbl.innerHTML=headers+`<tbody>${warehouses.map((w,i)=>warehouseReportRow(w,i,summary.sales)).join('')||'<tr><td colspan="10">لا توجد بيانات</td></tr>'}</tbody>`;
  const count=$('#warehousesReportCount'); if(count) count.textContent=`عدد المخازن: ${warehouses.length}`;
  const exp=$('#warehousesReportExportTable'); if(exp) exp.innerHTML=headers+`<tbody>${warehouses.map((w,i)=>{const pct=summary.sales?Math.abs(w.sales||0)/Math.abs(summary.sales)*100:0;return `<tr><td>${i+1}</td><td>${escapeHtml(w.code)}</td><td>${escapeHtml(w.name)}</td><td>${escapeHtml(w.plant)}</td><td>${fmt(w.sales)}</td><td>${fmt(w.production)}</td><td>${fmt(w.outgoing)}</td><td>${fmt(w.incoming)}</td><td>${fmt(w.loading)}</td><td>${fmt(pct)}%</td></tr>`;}).join('')}</tbody>`;
}
async function loadWarehousesReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let query=WarehouseDB.client.from('sales_audit_report').select('report_date,warehouse_code,warehouse_name,plant_code,plant_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity').order('warehouse_code',{ascending:true}).range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from); if(filters.to) query=query.lte('report_date',filters.to); if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant); if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const {data,error}=await query; if(error){console.warn('warehouses report load error',error);return;} const map={}, summary={sales:0,production:0,outgoing:0,incoming:0,loading:0};
  (data||[]).forEach(r=>{const code=String(r.warehouse_code||'').toUpperCase()||'-'; const meta=dashboardWhMeta(code); const plant=r.plant_code||meta.plant||'-'; if(!map[code]) map[code]={code,name:meta.name||r.warehouse_name||'-',plant,sales:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0}; const w=map[code]; const sales=toNumber(r.sales_quantity),prod=toNumber(r.production_quantity),out=toNumber(r.outgoing_transfer_quantity),inc=toNumber(r.incoming_transfer_quantity),load=toNumber(r.total_loading_quantity); w.sales+=sales;w.production+=prod;w.outgoing+=out;w.incoming+=inc;w.loading+=load;w.totalActivity+=Math.abs(sales)+Math.abs(prod)+Math.abs(out)+Math.abs(inc)+Math.abs(load); summary.sales+=sales;summary.production+=prod;summary.outgoing+=out;summary.incoming+=inc;summary.loading+=load;});
  const warehouses=Object.values(map).sort((a,b)=>(b.totalActivity||0)-(a.totalActivity||0));
  WAREHOUSES_REPORT_STATE={warehouses,filters,summary}; if($('#warehousesReportMeta')) $('#warehousesReportMeta').textContent=reportFilterLabel(filters); renderWarehousesReportKPIs(summary); drawWarehousesReportChart(warehouses); renderWarehousesRanking(warehouses,summary); renderWarehouseMiniTables(warehouses,summary); renderWarehousesReportTables(warehouses,summary);
}


let EXCEPTIONS_REPORT_STATE={exceptions:[], filters:null, summary:null};
function buildSalesAuditItemMap(rows){
  const map={};
  (rows||[]).forEach(r=>{
    const code=String(r.material_code||r.material_name||'غير محدد').trim()||'غير محدد';
    const wh=String(r.warehouse_code||'').toUpperCase();
    const meta=dashboardWhMeta(wh);
    if(!map[code]) map[code]={code:r.material_code||'-',name:r.material_name||'-',warehouses:new Set(),plants:new Set(),sales:0,production:0,outgoing:0,incoming:0,loading:0,rows:0};
    const item=map[code];
    item.rows++;
    if(wh) item.warehouses.add(wh);
    const plant=r.plant_code||meta.plant||'';
    if(plant) item.plants.add(plant);
    item.sales+=toNumber(r.sales_quantity);
    item.production+=toNumber(r.production_quantity);
    item.outgoing+=toNumber(r.outgoing_transfer_quantity);
    item.incoming+=toNumber(r.incoming_transfer_quantity);
    item.loading+=toNumber(r.total_loading_quantity);
  });
  return Object.values(map).map(i=>({...i,warehouses:[...i.warehouses],plants:[...i.plants]}));
}
function getItemExceptions(item){
  const sales=Math.abs(item.sales||0), production=Math.abs(item.production||0), outgoing=Math.abs(item.outgoing||0), incoming=Math.abs(item.incoming||0), loading=Math.abs(item.loading||0);
  const activity=sales+production+outgoing+incoming+loading;
  const list=[];
  if(activity>0 && sales===0) list.push({type:'no_sales',label:'بدون بيع',severity:'high',score:95,details:'الصنف له إنتاج أو تحويلات بدون أي بيع خلال الفترة'});
  const gap=production-sales, absGap=Math.abs(gap), gapThreshold=Math.max(5,Math.max(sales,production)*0.25);
  if(gap>gapThreshold) list.push({type:'production_high',label:'الإنتاج أعلى من البيع',severity:'medium',score:70+Math.min(25,absGap),details:`فرق إنتاج/بيع = ${fmt(gap)} طن`});
  if(-gap>gapThreshold) list.push({type:'sales_high',label:'البيع أعلى من الإنتاج',severity:'medium',score:68+Math.min(25,absGap),details:`فرق بيع/إنتاج = ${fmt(-gap)} طن`});
  if(outgoing>Math.max(5,(sales+production)*0.35)) list.push({type:'outgoing_high',label:'تحويلات صادرة مرتفعة',severity:'medium',score:62+Math.min(20,outgoing),details:`الصادر = ${fmt(outgoing)} طن`});
  if(incoming>Math.max(5,sales*0.45) && incoming>outgoing*1.25) list.push({type:'incoming_high',label:'تحويلات واردة مرتفعة',severity:'low',score:48+Math.min(18,incoming),details:`الوارد = ${fmt(incoming)} طن`});
  const expectedLoading=sales+outgoing;
  if(expectedLoading>0 && Math.abs(loading-expectedLoading)>Math.max(2,expectedLoading*0.03)) list.push({type:'loading_gap',label:'فرق في إجمالي التحميل',severity:'high',score:82+Math.min(20,Math.abs(loading-expectedLoading)),details:`التحميل ${fmt(loading)} مقابل المتوقع ${fmt(expectedLoading)}`});
  return list;
}
function flattenExceptions(items){
  const rows=[];
  (items||[]).forEach(item=>{
    getItemExceptions(item).forEach(ex=>rows.push({
      ...ex,
      code:item.code,
      name:item.name,
      warehouses:item.warehouses.join('، ')||'-',
      plants:item.plants.join('، ')||'-',
      sales:item.sales,
      production:item.production,
      outgoing:item.outgoing,
      incoming:item.incoming,
      loading:item.loading,
      reviewScore:ex.score+Math.abs((item.production||0)-(item.sales||0))*0.05+Math.abs(item.outgoing||0)*0.03
    }));
  });
  return rows.sort((a,b)=>b.reviewScore-a.reviewScore);
}
function renderExceptionsKPIs(summary){
  const cards=[
    ['إجمالي الاستثناءات',summary.total,'حالة','🚨'],
    ['أولوية عالية',summary.high,'حالة','🔴'],
    ['أولوية متوسطة',summary.medium,'حالة','🟠'],
    ['أصناف متأثرة',summary.items,'صنف','📦'],
    ['أكبر فرق إنتاج/بيع',summary.maxGap,'طن','↕']
  ];
  const node=$('#exceptionsReportKpis');
  if(node) node.innerHTML=cards.map(c=>`<article class="kpi glass"><h3>${c[0]}</h3><div class="num">${fmt(c[1])}</div><small>${c[2]}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function drawExceptionsChart(summary){
  const canvas=$('#exceptionsReportChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
  const labels=[['no_sales','بدون بيع'],['production_high','إنتاج أعلى من البيع'],['sales_high','بيع أعلى من الإنتاج'],['outgoing_high','صادر مرتفع'],['incoming_high','وارد مرتفع'],['loading_gap','فرق تحميل']];
  const vals=labels.map(([k])=>summary.byType[k]||0), max=Math.max(1,...vals);
  const pad={l:40,r:24,t:38,b:76}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(255,255,255,.11)';ctx.fillStyle='#d7f3d2';ctx.font='bold 12px Cairo';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/4),pad.l-8,y+4);}
  const bw=Math.min(70,cw/labels.length*.55);
  labels.forEach(([key,label],i)=>{const v=vals[i];const x=pad.l+(i+.5)*(cw/labels.length)-bw/2;const bh=(v/max)*ch;const y=pad.t+ch-bh;const grad=ctx.createLinearGradient(x,y,x,y+bh);grad.addColorStop(0,key==='loading_gap'||key==='no_sales'?'#ff5959':'#ffd44f');grad.addColorStop(1,'#62d84e');ctx.fillStyle=grad;ctx.fillRect(x,y,bw,bh);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 13px Cairo';ctx.fillText(fmt(v),x+bw/2,y-8);ctx.save();ctx.translate(x+bw/2,pad.t+ch+18);ctx.rotate(-Math.PI/7);ctx.fillStyle='#dff8d4';ctx.font='bold 11px Cairo';ctx.fillText(label,0,0);ctx.restore();});
}
function renderExceptionsPriority(exceptions){
  const node=$('#exceptionsPriorityList'); if(!node) return;
  const top=exceptions.slice(0,10);
  if(!top.length){
    node.innerHTML='<div class="empty-row exception-priority-empty">لا توجد استثناءات حسب الفلتر الحالي</div>';
    return;
  }
  const priorityText=e=>e.severity==='high'?'عالية':e.severity==='medium'?'متوسطة':'منخفضة';
  const actionText=e=>e.severity==='high'?'مراجعة فورية':e.severity==='medium'?'مراجعة':'متابعة';
  node.innerHTML=`<div class="exception-priority-head">
      <span>#</span><span>كود الصنف</span><span>الصنف</span><span>نوع الاستثناء</span><span>الأولوية</span><span>الفارق</span><span>الإجراء</span>
    </div>`+top.map((e,i)=>`
      <div class="exception-priority-row ${e.severity}">
        <em>${i+1}</em>
        <b>${escapeHtml(e.code)}</b>
        <span class="priority-item-name">${escapeHtml(e.name)}</span>
        <span class="priority-type">${escapeHtml(e.label)}</span>
        <span class="priority-badge ${e.severity}">${priorityText(e)}</span>
        <strong>${fmt(e.reviewScore)}<small> نقطة</small></strong>
        <button type="button" class="priority-action ${e.severity}">${actionText(e)}</button>
      </div>`).join('');
}
function exceptionRow(e,i){
  return `<tr class="exception-row ${e.severity}"><td>${i+1}</td><td><span class="item-status-badge ${e.severity==='high'?'danger':e.severity==='medium'?'warning':'info'}">${escapeHtml(e.label)}</span></td><td>${escapeHtml(e.code)}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.plants)}</td><td>${escapeHtml(e.warehouses)}</td><td>${fmt(e.sales)}</td><td>${fmt(e.production)}</td><td>${fmt(e.outgoing)}</td><td>${fmt(e.incoming)}</td><td>${fmt(e.loading)}</td><td>${escapeHtml(e.details)}</td></tr>`;
}
function renderExceptionsTables(exceptions){
  const headers='<thead><tr><th>#</th><th>نوع الاستثناء</th><th>كود الصنف</th><th>اسم الصنف</th><th>المصنع</th><th>المخزن</th><th>البيع</th><th>الإنتاج</th><th>صادر</th><th>وارد</th><th>التحميل</th><th>الملاحظة</th></tr></thead>';
  const body=`<tbody>${exceptions.map(exceptionRow).join('')||'<tr><td colspan="12">لا توجد استثناءات حسب الفلتر الحالي</td></tr>'}</tbody>`;
  const tbl=$('#exceptionsReportTable'); if(tbl) tbl.innerHTML=headers+body;
  const exp=$('#exceptionsReportExportTable'); if(exp) exp.innerHTML=headers+body;
  const count=$('#exceptionsReportCount'); if(count) count.textContent=`عدد الاستثناءات: ${exceptions.length}`;
}
async function loadExceptionsReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let query=WarehouseDB.client.from('sales_audit_report').select('report_date,warehouse_code,warehouse_name,plant_code,plant_name,material_code,material_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity').order('report_date',{ascending:false}).range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from); if(filters.to) query=query.lte('report_date',filters.to); if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant); if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const {data,error}=await query; if(error){console.warn('exceptions report load error',error);return;}
  const items=buildSalesAuditItemMap(data||[]), exceptions=flattenExceptions(items);
  const summary={total:exceptions.length,high:exceptions.filter(e=>e.severity==='high').length,medium:exceptions.filter(e=>e.severity==='medium').length,items:new Set(exceptions.map(e=>e.code)).size,maxGap:0,byType:{}};
  items.forEach(i=>summary.maxGap=Math.max(summary.maxGap,Math.abs((i.production||0)-(i.sales||0))));
  exceptions.forEach(e=>summary.byType[e.type]=(summary.byType[e.type]||0)+1);
  EXCEPTIONS_REPORT_STATE={exceptions,filters,summary};
  if($('#exceptionsReportMeta')) $('#exceptionsReportMeta').textContent=reportFilterLabel(filters);
  renderExceptionsKPIs(summary); drawExceptionsChart(summary); renderExceptionsPriority(exceptions); renderExceptionsTables(exceptions);
}


let SMART_ANALYTICS_STATE={rows:[],filters:null,stats:null,items:[],warehouses:[],plantStats:{},exceptions:[],daily:{}};
function smartSeverityClass(level){ return level==='high'?'danger':level==='medium'?'warning':level==='ok'?'ok':'info'; }
function smartTrendInfo(values){
  const clean=(values||[]).filter(v=>Number.isFinite(v));
  if(clean.length<2) return {label:'غير كافٍ',cls:'neutral',delta:0,icon:'•'};
  const first=clean[0]||0,last=clean[clean.length-1]||0;
  const base=Math.max(1,Math.abs(first));
  const delta=((last-first)/base)*100;
  if(delta>8) return {label:'صاعد',cls:'up',delta,icon:'▲'};
  if(delta<-8) return {label:'هابط',cls:'down',delta,icon:'▼'};
  return {label:'مستقر',cls:'stable',delta,icon:'▬'};
}

function clampScore(v){ return Math.max(0, Math.min(100, Number.isFinite(v)?v:0)); }
function auditScoreStatus(score){
  if(score>=90) return {label:'ممتاز',cls:'excellent',icon:'🟢'};
  if(score>=80) return {label:'جيد جداً',cls:'good',icon:'🟢'};
  if(score>=70) return {label:'يحتاج متابعة',cls:'warning',icon:'🟡'};
  return {label:'يحتاج تدخل',cls:'danger',icon:'🔴'};
}
function calculateAuditScoreForPlant(plantCode,modelBase){
  const st=(modelBase.plantStats||{})[plantCode]||{sales:0,production:0,outgoing:0,incoming:0,loading:0,activity:0};
  const rows=(modelBase.rows||[]).filter(r=>String(r.plant_code||dashboardWhMeta(String(r.warehouse_code||'').toUpperCase()).plant||'')===String(plantCode));
  const exceptions=(modelBase.exceptions||[]).filter(e=>String(e.plants||'').split('،').map(x=>x.trim()).includes(String(plantCode)));
  const totalActivity=Math.abs(st.sales||0)+Math.abs(st.production||0)+Math.abs(st.outgoing||0)+Math.abs(st.incoming||0)+Math.abs(st.loading||0);
  const hasData=rows.length>0 && totalActivity>0;
  const expectedLoading=Math.abs((st.sales||0)+(st.outgoing||0));
  const loadingGap=expectedLoading>0?Math.abs((st.loading||0)-expectedLoading):0;
  const salesProdGap=Math.abs((st.production||0)-(st.sales||0));
  const salesProdBase=Math.max(1,Math.abs(st.sales||0),Math.abs(st.production||0));
  const transferBalanceGap=Math.abs((st.outgoing||0)-(st.incoming||0));
  const transferBase=Math.max(1,Math.abs(st.outgoing||0)+Math.abs(st.incoming||0));
  const high=exceptions.filter(e=>e.severity==='high').length;
  const medium=exceptions.filter(e=>e.severity==='medium').length;
  const low=exceptions.filter(e=>e.severity==='low').length;

  const dataQuality=hasData?20:8;
  const salesBalance=clampScore(20-(salesProdGap/salesProdBase)*20);
  const transferScore=clampScore(15-(transferBalanceGap/transferBase)*15);
  const loadingScore=clampScore(15-(loadingGap/Math.max(1,expectedLoading))*15);
  const exceptionScore=clampScore(20-(high*6+medium*3+low*1.5));
  const activityScore=clampScore(10-(hasData?0:8));
  const total=clampScore(dataQuality+salesBalance+transferScore+loadingScore+exceptionScore+activityScore);
  const status=auditScoreStatus(total);
  const reasons=[];
  if(!hasData) reasons.push('لا توجد بيانات كافية للمصنع حسب الفلتر الحالي');
  if(salesProdGap>Math.max(5,salesProdBase*.25)) reasons.push(`فرق الإنتاج/البيع مرتفع (${fmt(salesProdGap)} طن)`);
  if(loadingGap>Math.max(2,expectedLoading*.03)) reasons.push(`فرق التحميل عن المتوقع (${fmt(loadingGap)} طن)`);
  if(high) reasons.push(`${high} استثناء عالي الأولوية`);
  if(medium) reasons.push(`${medium} استثناء متوسط الأولوية`);
  if(!reasons.length) reasons.push('المؤشرات الرئيسية ضمن الحدود المقبولة');
  return {plant:plantCode,score:total,status,parts:{dataQuality,salesBalance,transferScore,loadingScore,exceptionScore,activityScore},stats:st,exceptions:{high,medium,low,total:exceptions.length},reasons};
}
function calculateAuditScores(modelBase){
  const plantScores=APP_DATA.plants.map(p=>({...(calculateAuditScoreForPlant(p.code,modelBase)),name:p.name}));
  const active=plantScores.filter(s=>Math.abs((s.stats||{}).activity||0)>0 || s.exceptions.total>0);
  const weightedBase=active.length?active:plantScores;
  const overall=weightedBase.length?weightedBase.reduce((sum,r)=>sum+r.score,0)/weightedBase.length:100;
  const critical=plantScores.reduce((a,b)=>a+b.exceptions.high,0);
  const status=auditScoreStatus(overall);
  return {overall:clampScore(overall),status,critical,plantScores};
}

function buildSmartAnalyticsModel(rows,filters){
  const stats={salesQty:0,productionQty:0,outgoingTransferQty:0,incomingTransferQty:0,totalLoadingQty:0};
  const daily={}, whMap={}, productMap={}, plantStats={};
  APP_DATA.plants.forEach(p=>plantStats[p.code]={sales:0,production:0,outgoing:0,incoming:0,loading:0,activity:0});
  (rows||[]).forEach(r=>{
    const d=dashboardDateKey(r.report_date); daily[d]=daily[d]||{sales:0,production:0,outgoing:0,incoming:0,loading:0};
    const wh=String(r.warehouse_code||'').toUpperCase();
    const meta=dashboardWhMeta(wh);
    const plant=r.plant_code||meta.plant||'غير محدد';
    if(!plantStats[plant]) plantStats[plant]={sales:0,production:0,outgoing:0,incoming:0,loading:0,activity:0};
    const sales=toNumber(r.sales_quantity), prod=toNumber(r.production_quantity), out=toNumber(r.outgoing_transfer_quantity), inc=toNumber(r.incoming_transfer_quantity), load=toNumber(r.total_loading_quantity);
    stats.salesQty+=sales; stats.productionQty+=prod; stats.outgoingTransferQty+=out; stats.incomingTransferQty+=inc; stats.totalLoadingQty+=load;
    daily[d].sales+=Math.abs(sales); daily[d].production+=Math.abs(prod); daily[d].outgoing+=Math.abs(out); daily[d].incoming+=Math.abs(inc); daily[d].loading+=Math.abs(load);
    plantStats[plant].sales+=sales; plantStats[plant].production+=prod; plantStats[plant].outgoing+=out; plantStats[plant].incoming+=inc; plantStats[plant].loading+=load; plantStats[plant].activity+=Math.abs(sales)+Math.abs(prod)+Math.abs(out)+Math.abs(inc)+Math.abs(load);
    const pk=String(r.material_code||r.material_name||'غير محدد');
    if(!productMap[pk]) productMap[pk]={code:r.material_code||'-',name:r.material_name||'-',sales:0,production:0,outgoing:0,incoming:0,loading:0};
    productMap[pk].sales+=sales; productMap[pk].production+=prod; productMap[pk].outgoing+=out; productMap[pk].incoming+=inc; productMap[pk].loading+=load;
    if(!whMap[wh]) whMap[wh]={code:wh||'-',name:meta.name||r.warehouse_name||'-',plant:plant,sales:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0};
    whMap[wh].sales+=sales; whMap[wh].production+=prod; whMap[wh].outgoing+=out; whMap[wh].incoming+=inc; whMap[wh].loading+=load; whMap[wh].totalActivity+=Math.abs(sales)+Math.abs(prod)+Math.abs(out)+Math.abs(inc)+Math.abs(load);
  });
  const items=buildSalesAuditItemMap(rows||[]);
  const exceptions=flattenExceptions(items);
  const warehouses=Object.values(whMap).sort((a,b)=>b.totalActivity-a.totalActivity);
  const products=Object.values(productMap).sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales));
  const modelBase={rows,filters,stats,daily,warehouses,products,plantStats,items,exceptions};
  const auditScores=calculateAuditScores(modelBase);
  return {...modelBase,auditScores};
}

function renderSmartKpiCards(model){
  const node=$('#smartKpiCards'); if(!node) return;
  const stats=model?.stats||{};
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const exc=(model?.exceptions||[]).length;
  const wh=(model?.warehouses||[]).length;
  const items=(model?.products||[]).length;
  const audit=model?.auditScores||{overall:100,status:{label:'ممتاز'},critical:0};
  const cards=[
    ['الصحة العامة للمراجعة',audit.overall||0,`${audit.status?.label||''} - ${audit.critical||0} حرجة`,'🛡️','audit-health','overall'],
    ['إجمالي البيع',stats.salesQty||0,'طن','🛒','','sales'],
    ['إجمالي الإنتاج',stats.productionQty||0,'طن','🏭','','production'],
    ['فرق الإنتاج / البيع',gap,'طن',gap>=0?'🟢':'🟡','','balance'],
    ['عدد الاستثناءات',exc,'حالة','⚠️','','exceptions'],
    ['الأصناف النشطة',items,'صنف','📦','','items'],
    ['المخازن النشطة',wh,'مخزن','🏪','','warehouses']
  ];
  node.innerHTML=cards.map(c=>`<article class="kpi glass smart-kpi-card ${c[4]||''}" data-audit-score-target="${escapeHtml(c[5]||'overall')}"><h3>${escapeHtml(c[0])}</h3><div class="num">${c[4]?Math.round(c[1])+'%':fmt(c[1])}</div><small>${escapeHtml(c[2])}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function drawSmartMixChart(model){
  const canvas=$('#smartMixChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
  const stats=model?.stats||{};
  const entries=[
    ['البيع',Math.abs(stats.salesQty||0),'#83d84b'],
    ['الإنتاج',Math.abs(stats.productionQty||0),'#32aee9'],
    ['الصادر',Math.abs(stats.outgoingTransferQty||0),'#ff9f2f'],
    ['الوارد',Math.abs(stats.incomingTransferQty||0),'#b965ff'],
    ['التحميل',Math.abs(stats.totalLoadingQty||0),'#28c7bd']
  ];
  const max=Math.max(1,...entries.map(e=>e[1]));
  const pad={l:70,r:25,t:24,b:44}, ch=h-pad.t-pad.b, cw=w-pad.l-pad.r;
  ctx.strokeStyle='rgba(255,255,255,.12)'; ctx.lineWidth=1; ctx.fillStyle='#cfe8d0'; ctx.font='bold 12px Cairo'; ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/4),pad.l-8,y+4);}
  const barW=Math.min(72,cw/entries.length*.55); const gap=cw/entries.length;
  entries.forEach((e,i)=>{const x=pad.l+i*gap+gap/2-barW/2; const bh=(e[1]/max)*ch; const y=pad.t+ch-bh; const grad=ctx.createLinearGradient(0,y,0,pad.t+ch); grad.addColorStop(0,e[2]); grad.addColorStop(1,'rgba(255,255,255,.12)'); ctx.fillStyle=grad; roundRect(ctx,x,y,barW,bh,10,true,false); ctx.fillStyle='#eaffdf'; ctx.textAlign='center'; ctx.font='bold 12px Cairo'; ctx.fillText(e[0],x+barW/2,pad.t+ch+25); ctx.fillStyle='#fff'; ctx.font='bold 13px Cairo'; ctx.fillText(fmt(e[1]),x+barW/2,Math.max(18,y-8));});
}
function drawSmartPlantScoreChart(model){
  const canvas=$('#smartPlantScoreChart'); if(!canvas) return;
  const ctx=canvas.getContext('2d'), w=canvas.width, h=canvas.height; ctx.clearRect(0,0,w,h);
  const rows=(model?.auditScores?.plantScores||APP_DATA.plants.map(p=>({...p,score:100,status:auditScoreStatus(100)}))).map(r=>({code:r.plant||r.code,name:r.name,score:r.score,status:r.status}));
  const pad={l:105,r:28,t:22,b:34}, rowH=(h-pad.t-pad.b)/Math.max(1,rows.length);
  ctx.font='bold 14px Cairo';
  rows.forEach((r,i)=>{
    const y=pad.t+i*rowH+rowH/2;
    ctx.fillStyle='#eaffdf'; ctx.textAlign='right'; ctx.fillText(r.code,pad.l-15,y+5);
    const bw=w-pad.l-pad.r; const bh=18; const x=pad.l; const by=y-bh/2;
    ctx.fillStyle='rgba(255,255,255,.10)'; roundRect(ctx,x,by,bw,bh,10,true,false);
    const grad=ctx.createLinearGradient(x,0,x+bw,0); grad.addColorStop(0,'#ff5959'); grad.addColorStop(.55,'#ffd44f'); grad.addColorStop(1,'#74d84b');
    ctx.fillStyle=grad; roundRect(ctx,x,by,bw*(r.score/100),bh,10,true,false);
    ctx.fillStyle='#fff'; ctx.textAlign='left'; ctx.font='bold 13px Cairo'; ctx.fillText(`${r.score.toFixed(0)}%`,x+bw-4,y+5);
  });
}

function renderSmartExecutiveSummary(model){
  const node=$('#smartExecutiveSummary'); if(!node) return;
  const {stats,warehouses,products,plantStats,exceptions}=model;
  const topPlant=Object.entries(plantStats||{}).sort((a,b)=>Math.abs(b[1].sales)-Math.abs(a[1].sales))[0]||['-',{}];
  const topWh=warehouses[0]||{};
  const topProduct=products[0]||{};
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const plantShare=stats.salesQty?Math.abs((topPlant[1].sales||0)/stats.salesQty*100):0;
  const lines=[
    ['📈',`بلغ إجمالي البيع ${fmt(stats.salesQty)} طن خلال الفترة المحددة.`],
    ['🏭',`أعلى مصنع بيعاً هو ${escapeHtml(topPlant[0])} بنسبة مساهمة تقريبية ${fmt(plantShare)}%.`],
    ['📦',`أعلى مخزن نشاطاً هو ${escapeHtml(topWh.code||'-')} بإجمالي تحميل ${fmt(topWh.loading||0)} طن.`],
    ['⭐',`أعلى صنف بيعاً هو ${escapeHtml(topProduct.code||'-')} - ${escapeHtml(topProduct.name||'-')}.`],
    [gap>=0?'🟢':'🟡',`فرق الإنتاج عن البيع ${fmt(gap)} طن.`],
    [model.auditScores?.status?.icon||'🛡️',`الصحة العامة للمراجعة ${Math.round(model.auditScores?.overall||0)}% (${model.auditScores?.status?.label||''}).`],
    [exceptions.length?'⚠️':'✅',`عدد الاستثناءات التي تحتاج مراجعة: ${exceptions.length}.`]
  ];
  node.innerHTML=lines.map(([ico,text])=>`<div class="smart-summary-line"><span>${ico}</span><b>${text}</b></div>`).join('');
}
function renderSmartAlerts(model){
  const node=$('#smartAlerts'); if(!node) return;
  const {stats,warehouses,items,exceptions}=model;
  const alerts=[];
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const gapLimit=Math.max(10,Math.abs(stats.salesQty||0)*0.15);
  if(Math.abs(gap)>gapLimit) alerts.push({level:'medium',title:gap>0?'الإنتاج أعلى من البيع':'البيع أعلى من الإنتاج',text:`الفارق ${fmt(Math.abs(gap))} طن`});
  const noSales=items.filter(i=>Math.abs(i.sales||0)===0 && (Math.abs(i.production||0)+Math.abs(i.outgoing||0)+Math.abs(i.incoming||0))>0).length;
  if(noSales) alerts.push({level:'high',title:'أصناف بدون بيع',text:`يوجد ${noSales} صنف له حركة بدون بيع`});
  const inactiveWh=warehouses.filter(w=>Math.abs(w.totalActivity||0)===0).length;
  if(inactiveWh) alerts.push({level:'medium',title:'مخازن بلا نشاط',text:`عدد المخازن غير النشطة ${inactiveWh}`});
  if(Math.abs(stats.outgoingTransferQty||0)>Math.max(5,Math.abs(stats.salesQty||0)*0.45)) alerts.push({level:'medium',title:'تحويلات صادرة مرتفعة',text:`الصادر ${fmt(stats.outgoingTransferQty)} طن`});
  if(exceptions.filter(e=>e.severity==='high').length) alerts.push({level:'high',title:'استثناءات عالية الأولوية',text:`${exceptions.filter(e=>e.severity==='high').length} حالة تحتاج تدخل سريع`});
  if(!alerts.length) alerts.push({level:'ok',title:'الوضع مستقر',text:'لا توجد مؤشرات خطرة حسب الفلتر الحالي'});
  node.innerHTML=alerts.slice(0,8).map(a=>`<div class="smart-alert ${smartSeverityClass(a.level)}"><strong>${escapeHtml(a.title)}</strong><span>${escapeHtml(a.text)}</span></div>`).join('');
}
function renderSmartTopInsights(model){
  const node=$('#smartTopInsights'); if(!node) return;
  const {warehouses,products,plantStats}=model;
  const topPlant=Object.entries(plantStats||{}).sort((a,b)=>Math.abs(b[1].sales)-Math.abs(a[1].sales))[0]||['-',{}];
  const lowPlant=Object.entries(plantStats||{}).filter(x=>x[1].activity>0).sort((a,b)=>Math.abs(a[1].sales)-Math.abs(b[1].sales))[0]||['-',{}];
  const topWh=[...warehouses].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0]||{};
  const lowWh=[...warehouses].filter(w=>w.totalActivity>0).sort((a,b)=>Math.abs(a.sales)-Math.abs(b.sales))[0]||{};
  const topProduct=[...products].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0]||{};
  const rows=[
    ['🏭','أعلى مصنع',topPlant[0],`${fmt(topPlant[1].sales||0)} طن`],
    ['📉','أقل مصنع بيعاً',lowPlant[0],`${fmt(lowPlant[1].sales||0)} طن`],
    ['📦','أعلى مخزن',topWh.code||'-',`${fmt(topWh.sales||0)} طن`],
    ['📉','أقل مخزن بيعاً',lowWh.code||'-',`${fmt(lowWh.sales||0)} طن`],
    ['⭐','أعلى صنف',topProduct.code||'-',escapeHtml(topProduct.name||'-')]
  ];
  node.innerHTML=rows.map(r=>`<div class="smart-top-row"><span>${r[0]}</span><b>${r[1]}</b><strong>${escapeHtml(String(r[2]))}</strong><small>${r[3]}</small></div>`).join('');
}
function renderSmartRecommendations(model){
  const node=$('#smartRecommendations'); if(!node) return;
  const {stats,warehouses,exceptions,items}=model;
  const rec=[];
  const topHigh=exceptions.filter(e=>e.severity==='high').slice(0,3);
  topHigh.forEach(e=>rec.push(`مراجعة الصنف ${e.code} بسبب: ${e.label}.`));
  const topWh=[...warehouses].sort((a,b)=>Math.abs(b.outgoing)-Math.abs(a.outgoing))[0];
  if(topWh && Math.abs(topWh.outgoing||0)>Math.max(5,Math.abs(topWh.sales||0)*0.4)) rec.push(`مراجعة التحويلات الصادرة في المخزن ${topWh.code}.`);
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  if(gap< -Math.max(10,Math.abs(stats.salesQty||0)*0.15)) rec.push('البيع أعلى من الإنتاج بشكل ملحوظ؛ يفضل مراجعة خطة الإنتاج والتحويلات الواردة.');
  if(gap> Math.max(10,Math.abs(stats.salesQty||0)*0.15)) rec.push('الإنتاج أعلى من البيع؛ يفضل متابعة الأصناف الأعلى تراكمًا.');
  if(!rec.length) rec.push('لا توجد توصيات حرجة حالياً؛ استمر في المتابعة الدورية.');
  node.innerHTML=rec.slice(0,6).map((t,i)=>`<div class="smart-rec"><em>${i+1}</em><span>${escapeHtml(t)}</span></div>`).join('');
}
function renderSmartTrendAnalysis(model){
  const node=$('#smartTrendAnalysis'); if(!node) return;
  const days=Object.keys(model.daily||{}).sort().slice(-30);
  const metrics=[['sales','البيع'],['production','الإنتاج'],['outgoing','الصادر'],['incoming','الوارد'],['loading','التحميل']];
  node.innerHTML=metrics.map(([key,label])=>{
    const values=days.map(d=>model.daily[d]?.[key]||0);
    const t=smartTrendInfo(values);
    const total=values.reduce((a,b)=>a+b,0);
    return `<div class="smart-trend-row ${t.cls}"><b>${label}</b><strong>${t.icon} ${t.label}</strong><span>${fmt(t.delta)}%</span><small>إجمالي ${fmt(total)} طن</small></div>`;
  }).join('') || '<div class="empty-row">لا توجد بيانات اتجاه كافية</div>';
  const hint=$('#smartTrendHint'); if(hint) hint.textContent=days.length?`من ${days[0]} إلى ${days[days.length-1]}`:'لا توجد بيانات';
}
function renderSmartPlantScores(model){
  const node=$('#smartPlantScores'); if(!node) return;
  const rows=model.auditScores?.plantScores||[];
  node.innerHTML=rows.map(r=>{
    const parts=r.parts||{};
    const details=`جودة البيانات ${fmt(parts.dataQuality||0)}/20 | توازن البيع والإنتاج ${fmt(parts.salesBalance||0)}/20 | التحويلات ${fmt(parts.transferScore||0)}/15 | التحميل ${fmt(parts.loadingScore||0)}/15 | الاستثناءات ${fmt(parts.exceptionScore||0)}/20 | النشاط ${fmt(parts.activityScore||0)}/10`;
    return `<div class="smart-score-row smart-score-row-real ${r.status?.cls||''}" title="${escapeHtml(details)}" data-audit-score-target="${escapeHtml(r.plant)}">
      <div><b>${escapeHtml(r.plant)}</b><span>${escapeHtml(r.name||'')}</span><small>${escapeHtml(r.status?.icon||'')} ${escapeHtml(r.status?.label||'')}</small></div>
      <div class="smart-score-bar"><i style="width:${r.score.toFixed(0)}%"></i></div>
      <strong>${r.score.toFixed(0)}%</strong>
      <em>${escapeHtml((r.reasons||[])[0]||'')}</em>
    </div>`;
  }).join('');
}

function auditScorePartRows(parts){
  const rows=[
    ['جودة البيانات',parts?.dataQuality||0,20,'اكتمال وتوفر بيانات المراجعة حسب الفلتر الحالي'],
    ['توازن البيع والإنتاج',parts?.salesBalance||0,20,'كلما زاد الفرق غير الطبيعي بين البيع والإنتاج انخفضت الدرجة'],
    ['التحويلات',parts?.transferScore||0,15,'يقيس اتزان الصادر والوارد وعدم وجود تحويلات غير مكتملة'],
    ['التحميل',parts?.loadingScore||0,15,'يقارن إجمالي التحميل المتوقع بالتحميل الفعلي'],
    ['الاستثناءات',parts?.exceptionScore||0,20,'كل استثناء عالي أو متوسط أو منخفض يقلل الدرجة حسب شدته'],
    ['النشاط',parts?.activityScore||0,10,'وجود حركة وبيانات فعلية يرفع درجة الثقة']
  ];
  return rows.map(([label,val,max,desc])=>{
    const pct=max?Math.max(0,Math.min(100,(val/max)*100)):0;
    return `<div class="score-break-row"><div><b>${escapeHtml(label)}</b><small>${escapeHtml(desc)}</small></div><strong>${fmt(val)} / ${max}</strong><span><i style="width:${pct}%"></i></span></div>`;
  }).join('');
}
function auditScoreModalPlantTable(scores){
  return `<div class="score-mini-table-wrap"><table class="score-mini-table"><thead><tr><th>المصنع</th><th>الحالة</th><th>الدرجة</th><th>الاستثناءات</th></tr></thead><tbody>${(scores||[]).map(r=>`<tr><td><b>${escapeHtml(r.plant)}</b><small>${escapeHtml(r.name||'')}</small></td><td>${escapeHtml(r.status?.icon||'')} ${escapeHtml(r.status?.label||'')}</td><td>${Math.round(r.score)}%</td><td>${r.exceptions?.total||0}</td></tr>`).join('')}</tbody></table></div>`;
}
function averageAuditParts(scores){
  const keys=['dataQuality','salesBalance','transferScore','loadingScore','exceptionScore','activityScore'];
  const out={};
  keys.forEach(k=>out[k]=(scores||[]).length?(scores.reduce((a,b)=>a+(b.parts?.[k]||0),0)/scores.length):0);
  return out;
}
function scoreModalData(target){
  const model=SMART_ANALYTICS_STATE;
  const scores=model?.auditScores?.plantScores||[];
  const stats=model?.stats||{};
  if(!model || !model.auditScores) return null;
  if(APP_DATA.plants.some(p=>p.code===target)){
    const r=scores.find(x=>x.plant===target);
    if(!r) return null;
    return {
      title:`تفاصيل Audit Score - ${r.plant}`,
      subtitle:r.name||'',
      score:r.score,
      status:r.status,
      parts:r.parts,
      reasons:r.reasons||[],
      extra:`إجمالي الاستثناءات: ${r.exceptions?.total||0} | عالي: ${r.exceptions?.high||0} | متوسط: ${r.exceptions?.medium||0} | منخفض: ${r.exceptions?.low||0}`,
      table:''
    };
  }
  if(target==='balance'){
    const gap=(stats.productionQty||0)-(stats.salesQty||0);
    const base=Math.max(1,Math.abs(stats.salesQty||0),Math.abs(stats.productionQty||0));
    const balance=clampScore(100-(Math.abs(gap)/base)*100);
    return {
      title:'تفاصيل مؤشر التوازن بين البيع والإنتاج',
      subtitle:'تحليل الفرق بين البيع والإنتاج حسب الفلاتر الحالية',
      score:balance,
      status:auditScoreStatus(balance),
      parts:{dataQuality:20,salesBalance:clampScore(20-(Math.abs(gap)/base)*20),transferScore:15,loadingScore:15,exceptionScore:20,activityScore:10},
      reasons:[gap>=0?`الإنتاج أعلى من البيع بمقدار ${fmt(gap)} طن`:`البيع أعلى من الإنتاج بمقدار ${fmt(Math.abs(gap))} طن`,`إجمالي البيع ${fmt(stats.salesQty||0)} طن`,`إجمالي الإنتاج ${fmt(stats.productionQty||0)} طن`],
      extra:`نسبة التوازن التقريبية: ${Math.round(balance)}%`,
      table:''
    };
  }
  if(target==='exceptions'){
    const exc=model.exceptions||[];
    const high=exc.filter(e=>e.severity==='high').length, med=exc.filter(e=>e.severity==='medium').length, low=exc.filter(e=>e.severity==='low').length;
    const sc=clampScore(100-(high*10+med*5+low*2));
    return {title:'تفاصيل الاستثناءات',subtitle:'تأثير الاستثناءات على درجة المراجعة',score:sc,status:auditScoreStatus(sc),parts:averageAuditParts(scores),reasons:[`إجمالي الاستثناءات ${exc.length}`,`عالية الأولوية ${high}`,`متوسطة الأولوية ${med}`,`منخفضة الأولوية ${low}`],extra:'كلما زادت الاستثناءات عالية الأولوية انخفضت درجة الصحة العامة.',table:''};
  }
  if(target==='sales' || target==='production' || target==='items' || target==='warehouses'){
    const map={sales:['إجمالي البيع',stats.salesQty||0,'طن'],production:['إجمالي الإنتاج',stats.productionQty||0,'طن'],items:['الأصناف النشطة',(model.products||[]).length,'صنف'],warehouses:['المخازن النشطة',(model.warehouses||[]).length,'مخزن']};
    const m=map[target];
    return {title:`تفاصيل ${m[0]}`,subtitle:'حسب الفلاتر الحالية',score:model.auditScores.overall,status:model.auditScores.status,parts:averageAuditParts(scores),reasons:[`${m[0]}: ${fmt(m[1])} ${m[2]}`,`الصحة العامة للمراجعة ${Math.round(model.auditScores.overall)}%`],extra:'هذا المؤشر جزء من نموذج التحليلات الذكية وليس درجة مستقلة.',table:auditScoreModalPlantTable(scores)};
  }
  const parts=averageAuditParts(scores);
  return {
    title:'تفاصيل الصحة العامة للمراجعة',
    subtitle:'متوسط درجات المصانع حسب الفلاتر الحالية',
    score:model.auditScores.overall,
    status:model.auditScores.status,
    parts,
    reasons:[`إجمالي المصانع المحسوبة: ${scores.length}`,`الحالات الحرجة: ${model.auditScores.critical||0}`,`الاستثناءات الحالية: ${(model.exceptions||[]).length}`],
    extra:'اضغط على أي مصنع داخل درجة مراجعة المصانع لعرض تفاصيله منفرداً.',
    table:auditScoreModalPlantTable(scores)
  };
}
function ensureAuditScoreModal(){
  let modal=$('#auditScoreModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='auditScoreModal';
  modal.className='audit-score-modal hidden';
  modal.innerHTML=`<div class="audit-score-backdrop" data-close-audit-score></div><section class="audit-score-dialog glass" role="dialog" aria-modal="true" aria-labelledby="auditScoreModalTitle"><button class="audit-score-close" type="button" data-close-audit-score>×</button><div id="auditScoreModalBody"></div></section>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target.closest('[data-close-audit-score]')) closeAuditScoreModal(); });
  document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAuditScoreModal(); });
  return modal;
}
function closeAuditScoreModal(){
  const modal=$('#auditScoreModal'); if(!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}
function openAuditScoreModal(target){
  const data=scoreModalData(target||'overall');
  if(!data) return;
  const modal=ensureAuditScoreModal();
  const body=$('#auditScoreModalBody');
  const score=Math.round(data.score||0);
  const reasons=(data.reasons||[]).map(r=>`<li>${escapeHtml(r)}</li>`).join('');
  body.innerHTML=`<header class="score-modal-head"><div><h3 id="auditScoreModalTitle">${escapeHtml(data.title)}</h3><p>${escapeHtml(data.subtitle||'')}</p></div><div class="score-modal-gauge ${data.status?.cls||''}"><strong>${score}%</strong><span>${escapeHtml(data.status?.icon||'')} ${escapeHtml(data.status?.label||'')}</span></div></header><div class="score-breakdown">${auditScorePartRows(data.parts||{})}</div><div class="score-reasons"><h4>سبب النتيجة</h4><ul>${reasons}</ul><p>${escapeHtml(data.extra||'')}</p></div>${data.table||''}`;
  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
}
function initAuditScoreDetails(){
  document.addEventListener('click',e=>{
    const target=e.target.closest('[data-audit-score-target]');
    if(!target) return;
    if(e.target.closest('button,input,select,a')) return;
    openAuditScoreModal(target.dataset.auditScoreTarget||'overall');
  });
  const scoreChart=$('#smartPlantScoreChart');
  if(scoreChart){ scoreChart.closest('.smart-chart-card')?.setAttribute('data-audit-score-target','overall'); }
  const mixChart=$('#smartMixChart');
  if(mixChart){ mixChart.closest('.smart-chart-card')?.setAttribute('data-audit-score-target','balance'); }
}

function renderSmartExportTable(model){
  const tbl=$('#smartAnalyticsExportTable'); if(!tbl) return;
  const topRows=model.exceptions.slice(0,10).map((e,i)=>`<tr><td>استثناء</td><td>${i+1}</td><td>${escapeHtml(e.code)}</td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.label)}</td><td>${fmt(e.reviewScore)}</td></tr>`).join('');
  const scoreRows=(model.auditScores?.plantScores||[]).map((r,i)=>`<tr><td>Audit Score</td><td>${i+1}</td><td>${escapeHtml(r.plant)}</td><td>${escapeHtml(r.name||'')}</td><td>${escapeHtml(r.status?.label||'')}</td><td>${Math.round(r.score)}%</td></tr>`).join('');
  tbl.innerHTML=`<thead><tr><th>النوع</th><th>#</th><th>الكود</th><th>البيان</th><th>المؤشر</th><th>القيمة</th></tr></thead><tbody><tr><td>ملخص</td><td>-</td><td>الصحة العامة للمراجعة</td><td>-</td><td>${escapeHtml(model.auditScores?.status?.label||'')}</td><td>${Math.round(model.auditScores?.overall||0)}%</td></tr><tr><td>ملخص</td><td>-</td><td>إجمالي البيع</td><td>-</td><td>طن</td><td>${fmt(model.stats.salesQty)}</td></tr><tr><td>ملخص</td><td>-</td><td>إجمالي الإنتاج</td><td>-</td><td>طن</td><td>${fmt(model.stats.productionQty)}</td></tr>${scoreRows}${topRows}</tbody>`;
}
async function loadSmartAnalyticsReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let query=WarehouseDB.client.from('sales_audit_report').select('report_date,warehouse_code,warehouse_name,plant_code,plant_name,material_code,material_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity').order('report_date',{ascending:true}).range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from); if(filters.to) query=query.lte('report_date',filters.to); if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant); if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const {data,error}=await query; if(error){console.warn('smart analytics load error',error);return;}
  const model=buildSmartAnalyticsModel(data||[],filters);
  SMART_ANALYTICS_STATE=model;
  if($('#smartAnalyticsMeta')) $('#smartAnalyticsMeta').textContent=reportFilterLabel(filters);
  renderSmartKpiCards(model); drawSmartMixChart(model); drawSmartPlantScoreChart(model); renderSmartExecutiveSummary(model); renderSmartAlerts(model); renderSmartTopInsights(model); renderSmartRecommendations(model); renderSmartTrendAnalysis(model); renderSmartPlantScores(model); renderSmartExportTable(model);
}

function switchReportTab(tab){
  ACTIVE_REPORT_TAB=tab;
  document.querySelectorAll('[data-report-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.reportTab===tab));
  const exec=$('#executiveReportContent'), items=$('#itemsReportContent'), warehouses=$('#warehousesReportContent'), exceptions=$('#exceptionsReportContent'), smart=$('#smartAnalyticsContent');
  if(exec) exec.style.display=tab==='executive'?'flex':'none';
  if(items) items.style.display=tab==='items'?'flex':'none';
  if(warehouses) warehouses.style.display=tab==='warehouses'?'flex':'none';
  if(exceptions) exceptions.style.display=tab==='exceptions'?'flex':'none';
  if(smart) smart.style.display=tab==='smart'?'flex':'none';
  if(tab==='executive') loadExecutiveReport({keepDates:true});
  if(tab==='items') loadItemsReport({keepDates:true});
  if(tab==='warehouses') loadWarehousesReport({keepDates:true});
  if(tab==='exceptions') loadExceptionsReport({keepDates:true});
  if(tab==='smart') loadSmartAnalyticsReport({keepDates:true});
}
function loadActiveReport(options={}){
  if(ACTIVE_REPORT_TAB==='items') return loadItemsReport(options);
  if(ACTIVE_REPORT_TAB==='warehouses') return loadWarehousesReport(options);
  if(ACTIVE_REPORT_TAB==='exceptions') return loadExceptionsReport(options);
  if(ACTIVE_REPORT_TAB==='smart') return loadSmartAnalyticsReport(options);
  return loadExecutiveReport(options);
}
function exportActiveReportExcel(){
  if(ACTIVE_REPORT_TAB==='items') return exportTableToExcel('itemsReportExportTable','تقرير مراجعة الأصناف');
  if(ACTIVE_REPORT_TAB==='warehouses') return exportTableToExcel('warehousesReportExportTable','تقرير أداء المخازن');
  if(ACTIVE_REPORT_TAB==='exceptions') return exportTableToExcel('exceptionsReportExportTable','تقرير الاستثناءات والمراجعة');
  if(ACTIVE_REPORT_TAB==='smart') return exportTableToExcel('smartAnalyticsExportTable','التحليلات الذكية');
  return exportTableToExcel('executiveExportTable','التقرير التنفيذي لمراجعة المخازن');
}
function exportActiveReportPdf(){
  if(ACTIVE_REPORT_TAB==='items') return exportTableToPdf('itemsReportExportTable','تقرير مراجعة الأصناف');
  if(ACTIVE_REPORT_TAB==='warehouses') return exportTableToPdf('warehousesReportExportTable','تقرير أداء المخازن');
  if(ACTIVE_REPORT_TAB==='exceptions') return exportTableToPdf('exceptionsReportExportTable','تقرير الاستثناءات والمراجعة');
  if(ACTIVE_REPORT_TAB==='smart') return exportTableToPdf('smartAnalyticsExportTable','التحليلات الذكية');
  return exportTableToPdf('executiveExportTable','التقرير التنفيذي لمراجعة المخازن');
}
function activeReportVisualInfo(){
  const map={
    executive:{id:'executiveReportContent',title:'التقرير التنفيذي لمراجعة المخازن'},
    items:{id:'itemsReportContent',title:'تقرير مراجعة الأصناف'},
    warehouses:{id:'warehousesReportContent',title:'تقرير أداء المخازن'},
    exceptions:{id:'exceptionsReportContent',title:'تقرير الاستثناءات والمراجعة'},
    smart:{id:'smartAnalyticsContent',title:'التحليلات الذكية'}
  };
  return map[ACTIVE_REPORT_TAB] || map.executive;
}
function copyCanvasPixelsToClone(sourceRoot, cloneRoot){
  const sourceCanvases=[...sourceRoot.querySelectorAll('canvas')];
  const cloneCanvases=[...cloneRoot.querySelectorAll('canvas')];
  sourceCanvases.forEach((canvas,idx)=>{
    const cloneCanvas=cloneCanvases[idx];
    if(!cloneCanvas) return;
    try{
      const img=document.createElement('img');
      img.src=canvas.toDataURL('image/png');
      img.alt='chart';
      img.style.width=(canvas.getAttribute('width')||canvas.clientWidth||520)+'px';
      img.style.maxWidth='100%';
      img.style.height='auto';
      img.style.display='block';
      img.style.margin='0 auto';
      cloneCanvas.replaceWith(img);
    }catch(_){ }
  });
}
async function renderActiveReportCanvas(){
  const info=activeReportVisualInfo();
  const source=document.getElementById(info.id);
  if(!source){ alert('لم يتم العثور على التقرير الحالي.'); return null; }
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return null; }

  const clone=source.cloneNode(true);
  copyCanvasPixelsToClone(source,clone);
  clone.style.display='block';
  clone.removeAttribute('hidden');
  clone.classList.add('report-exporting');

  const layer=document.createElement('div');
  layer.className='report-capture-layer';
  layer.dir='rtl';
  layer.lang='ar';
  layer.appendChild(clone);
  document.body.appendChild(layer);

  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const width=Math.max(1200, clone.scrollWidth, source.scrollWidth, clone.getBoundingClientRect().width);
    const height=Math.max(400, clone.scrollHeight, source.scrollHeight, clone.getBoundingClientRect().height);
    layer.style.width=width+'px';
    clone.style.width='100%';
    const canvas=await Html2Canvas(clone,{
      scale:2,
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#001f18',
      logging:false,
      scrollX:0,
      scrollY:0,
      windowWidth:width,
      windowHeight:height
    });
    return {canvas,info};
  }catch(err){
    console.error(err);
    alert('تعذر تجهيز التقرير للتصدير. حاول مرة أخرى.');
    return null;
  }finally{
    try{ layer.remove(); }catch(_){}
  }
}
function safeFileName(title){
  const stamp=new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
  return `${String(title||'Report').replace(/[\/:*?"<>|]/g,'-')}-${stamp}`;
}
async function exportActiveReportPng(){
  const rendered=await renderActiveReportCanvas();
  if(!rendered) return;
  const {canvas,info}=rendered;
  canvas.toBlob(async blob=>{
    if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
    await saveBlobWithPicker(blob,`${safeFileName(info.title)}.png`,'image/png');
  },'image/png',1);
}
async function exportActiveReportVisualPdf(){
  const rendered=await renderActiveReportCanvas();
  if(!rendered) return;
  const {canvas,info}=rendered;
  const JsPDF=(window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if(!JsPDF){ alert('مكتبة PDF غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  try{
    const orientation=canvas.width>=canvas.height?'landscape':'portrait';
    const pdf=new JsPDF({orientation,unit:'mm',format:'a4',compress:true});
    const pageWidth=pdf.internal.pageSize.getWidth();
    const pageHeight=pdf.internal.pageSize.getHeight();
    const margin=5;
    const imgWidth=pageWidth-(margin*2);
    const imgHeight=(canvas.height*imgWidth)/canvas.width;
    const imgData=canvas.toDataURL('image/jpeg',0.94);
    let y=margin;
    let remainingHeight=imgHeight;
    pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
    remainingHeight-=pageHeight-(margin*2);
    while(remainingHeight>0){
      pdf.addPage('a4',orientation);
      y=margin-(imgHeight-remainingHeight);
      pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
      remainingHeight-=pageHeight-(margin*2);
    }
    const blob=pdf.output('blob');
    await saveBlobWithPicker(blob,`${safeFileName(info.title)}.pdf`,'application/pdf');
  }catch(err){
    console.error(err);
    alert('تعذر تصدير PDF. حاول مرة أخرى.');
  }
}

async function loadExecutiveReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let query=WarehouseDB.client.from('sales_audit_report').select('report_date,warehouse_code,warehouse_name,plant_code,plant_name,material_code,material_name,sales_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity').order('report_date',{ascending:false}).range(0,9999);
  if(filters.from) query=query.gte('report_date',filters.from); if(filters.to) query=query.lte('report_date',filters.to); if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant); if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',filters.warehouse);
  const {data,error}=await query; if(error){console.warn('executive report load error',error);return;} const rows=data||[];
  const stats={salesQty:0,productionQty:0,outgoingTransferQty:0,incomingTransferQty:0,totalLoadingQty:0}; const daily={}, productMap={}, whMap={}, whSalesMap={}, plantStats={}; APP_DATA.plants.forEach(p=>plantStats[p.code]={sales:0,production:0,outgoing:0,incoming:0,loading:0});
  rows.forEach(r=>{const d=dashboardDateKey(r.report_date); daily[d]=daily[d]||{sales:0,production:0,outgoing:0,incoming:0}; const wh=String(r.warehouse_code||'').toUpperCase(); const meta=dashboardWhMeta(wh); const plant=r.plant_code||meta.plant||'غير محدد'; if(!plantStats[plant]) plantStats[plant]={sales:0,production:0,outgoing:0,incoming:0,loading:0}; const sales=toNumber(r.sales_quantity), prod=toNumber(r.production_quantity), out=toNumber(r.outgoing_transfer_quantity), inc=toNumber(r.incoming_transfer_quantity), load=toNumber(r.total_loading_quantity); stats.salesQty+=sales;stats.productionQty+=prod;stats.outgoingTransferQty+=out;stats.incomingTransferQty+=inc;stats.totalLoadingQty+=load; daily[d].sales+=Math.abs(sales);daily[d].production+=Math.abs(prod);daily[d].outgoing+=Math.abs(out);daily[d].incoming+=Math.abs(inc); plantStats[plant].sales+=sales;plantStats[plant].production+=prod;plantStats[plant].outgoing+=out;plantStats[plant].incoming+=inc;plantStats[plant].loading+=load; if(sales) whSalesMap[wh]=(whSalesMap[wh]||0)+Math.abs(sales); const pk=String(r.material_code||r.material_name||'غير محدد'); if(!productMap[pk]) productMap[pk]={code:r.material_code||'-',name:r.material_name||'-',sales:0,production:0,outgoing:0,incoming:0,loading:0}; productMap[pk].sales+=sales;productMap[pk].production+=prod;productMap[pk].outgoing+=out;productMap[pk].incoming+=inc;productMap[pk].loading+=load; if(!whMap[wh]) whMap[wh]={code:wh,name:meta.name||r.warehouse_name||'-',plant:plant,sales:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0}; whMap[wh].sales+=sales;whMap[wh].production+=prod;whMap[wh].outgoing+=out;whMap[wh].incoming+=inc;whMap[wh].loading+=load;whMap[wh].totalActivity+=Math.abs(sales)+Math.abs(prod)+Math.abs(out)+Math.abs(inc)+Math.abs(load);});
  const products=Object.values(productMap).sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales)); const warehouses=Object.values(whMap).sort((a,b)=>b.totalActivity-a.totalActivity);
  EXECUTIVE_REPORT_STATE={rows,stats,filters}; if($('#executiveReportMeta')) $('#executiveReportMeta').textContent=reportFilterLabel(filters); renderExecutiveKPIs(stats); drawReportLine(daily); drawReportPlantBar(plantStats); drawReportDonut(whSalesMap); renderRankTable('#executiveTopProductsTable',['#','كود الصنف','اسم الصنف','البيع','الإنتاج','التحميل'],products.slice(0,10).map((p,i)=>[i+1,escapeHtml(p.code),escapeHtml(p.name),fmt(p.sales),fmt(p.production),fmt(p.loading)])); renderRankTable('#executiveTopWarehousesTable',['#','كود المخزن','اسم المخزن','المصنع','البيع','التحميل'],warehouses.slice(0,10).map((w,i)=>[i+1,escapeHtml(w.code),escapeHtml(w.name),escapeHtml(w.plant),fmt(w.sales),fmt(w.loading)])); renderExecutiveInsights(products,warehouses,plantStats,stats); renderExecutiveExportTable(stats,products,warehouses,plantStats);
}

function dashboardPngTitleFromElement(element){
  if(!element) return 'dashboard-box';
  if(element.id==='dashboard') return 'الشاشة الرئيسية';
  const heading=element.querySelector('h2,h3,.num');
  const text=(heading?.textContent||element.getAttribute('aria-label')||'dashboard-box').replace(/\s+/g,' ').trim();
  return text || 'dashboard-box';
}
function ensureDashboardPngButtons(){
  const dashboard=document.getElementById('dashboard');
  if(!dashboard) return;
  const filters=document.getElementById('dashboardFilters');
  if(filters && !document.getElementById('dashboardFullPngBtn')){
    const fullBtn=document.createElement('button');
    fullBtn.id='dashboardFullPngBtn';
    fullBtn.type='button';
    fullBtn.className='secondary dashboard-full-png-btn';
    fullBtn.innerHTML='<span class="png-icon" aria-hidden="true">▣</span><span>تصدير الشاشة PNG</span>';
    fullBtn.title='تصدير الشاشة الرئيسية كاملة كصورة PNG';
    fullBtn.addEventListener('click',()=>exportDashboardElementAsPng(dashboard,'الشاشة الرئيسية'));
    filters.appendChild(fullBtn);
  }
  dashboard.querySelectorAll('.panel.glass,.kpi.glass').forEach((box,idx)=>{
    if(box.classList.contains('no-widget-png-export')) return;
    if(box.querySelector(':scope > .widget-png-btn')) return;
    box.classList.add('png-exportable-widget');
    if(!box.dataset.pngTitle) box.dataset.pngTitle=dashboardPngTitleFromElement(box);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='widget-png-btn';
    btn.title='تصدير هذا البوكس كصورة PNG';
    btn.setAttribute('aria-label','تصدير هذا البوكس كصورة PNG');
    btn.innerHTML='<span>PNG</span><span class="png-mini-icon" aria-hidden="true">▣</span>';
    btn.addEventListener('click',(ev)=>{
      ev.stopPropagation();
      exportDashboardElementAsPng(box,box.dataset.pngTitle||dashboardPngTitleFromElement(box));
    });
    box.prepend(btn);
  });
}
async function exportDashboardElementAsPng(element,title){
  if(!element) return;
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  const previousActive=document.activeElement;
  element.classList.add('png-capturing-now');
  document.body.classList.add('dashboard-png-exporting');
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=element.getBoundingClientRect();
    const width=Math.ceil(Math.max(rect.width, element.scrollWidth, 1));
    const height=Math.ceil(Math.max(rect.height, element.scrollHeight, 1));
    const canvas=await Html2Canvas(element,{
      scale:Math.min(3, Math.max(2, window.devicePixelRatio||2)),
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#001a15',
      logging:false,
      scrollX:-window.scrollX,
      scrollY:-window.scrollY,
      windowWidth:Math.max(document.documentElement.clientWidth,width),
      windowHeight:Math.max(document.documentElement.clientHeight,height),
      width,
      height
    });
    canvas.toBlob(async blob=>{
      if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
      await saveBlobWithPicker(blob,`${safeFileName(title||'dashboard')}.png`,'image/png');
    },'image/png',1);
  }catch(err){
    console.error(err);
    alert('تعذر تصدير الصورة. حاول مرة أخرى.');
  }finally{
    element.classList.remove('png-capturing-now');
    document.body.classList.remove('dashboard-png-exporting');
    try{ previousActive && previousActive.focus && previousActive.focus(); }catch(_){ }
  }
}

function initExecutiveReports(){
  fillReportFilters();
  document.querySelectorAll('[data-report-tab]').forEach(btn=>{
    if(!btn.disabled) btn.addEventListener('click',()=>switchReportTab(btn.dataset.reportTab));
  });
  $('#reportSearchBtn')?.addEventListener('click',()=>loadActiveReport({keepDates:true}));
  $('#reportResetBtn')?.addEventListener('click',()=>{
    if($('#reportPlantFilter')) $('#reportPlantFilter').value='all';
    fillReportFilters();
    if($('#reportWarehouseFilter')) $('#reportWarehouseFilter').value='all';
    if($('#reportFromDate')) $('#reportFromDate').value='';
    if($('#reportToDate')) $('#reportToDate').value='';
    loadActiveReport();
  });
  $('#executiveReportExcelBtn')?.addEventListener('click',exportActiveReportExcel);
  $('#activeReportPdfBtn')?.addEventListener('click',exportActiveReportVisualPdf);
  $('#activeReportPngBtn')?.addEventListener('click',exportActiveReportPng);
  $('#smartVisualPdfBtn')?.addEventListener('click',async()=>{ ACTIVE_REPORT_TAB='smart'; await exportActiveReportVisualPdf(); });
  $('#smartVisualPngBtn')?.addEventListener('click',async()=>{ ACTIVE_REPORT_TAB='smart'; await exportActiveReportPng(); });
}
document.addEventListener('DOMContentLoaded',initExecutiveReports);
document.addEventListener('DOMContentLoaded',initAuditScoreDetails);
document.addEventListener('DOMContentLoaded',()=>{ ensureDashboardPngButtons(); setTimeout(ensureDashboardPngButtons,800); });
