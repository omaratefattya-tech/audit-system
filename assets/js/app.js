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
let PLANTS_CATALOG_CACHE=null;
let PLANTS_CATALOG_PENDING=null;
function fallbackPlantsCatalog(){
  return (APP_DATA.plants||[]).map((p,index)=>({
    code:String(p.code||'').trim().toUpperCase(),
    name:p.name||p.code||'',
    is_active:true,
    sort_order:index,
    source:'fallback',
    warehouses:p.warehouses||[]
  })).filter(p=>p.code);
}
function normalizePlantCatalogRow(row,index=0){
  const code=String(row?.plant_code||row?.code||'').trim().toUpperCase();
  const fallback=(APP_DATA.plants||[]).find(p=>String(p.code||'').toUpperCase()===code)||{};
  return {code,name:row?.plant_name||row?.name||fallback.name||code,is_active:row?.is_active!==false,sort_order:Number(row?.sort_order??index)||0,source:row?.source||'supabase',warehouses:fallback.warehouses||[]};
}
function getPlantsCatalog(){return Array.isArray(PLANTS_CATALOG_CACHE)?PLANTS_CATALOG_CACHE:fallbackPlantsCatalog();}
async function loadPlantsCatalog(options={}){
  if(!options.force&&PLANTS_CATALOG_CACHE) return PLANTS_CATALOG_CACHE;
  if(!options.force&&PLANTS_CATALOG_PENDING) return PLANTS_CATALOG_PENDING;
  if(!WarehouseDB?.ready){PLANTS_CATALOG_CACHE=fallbackPlantsCatalog();return PLANTS_CATALOG_CACHE;}
  PLANTS_CATALOG_PENDING=(async()=>{
    try{
      const {data,error}=await WarehouseDB.client.from('plants').select('plant_code,plant_name,is_active,sort_order').eq('is_active',true).order('sort_order',{ascending:true}).order('plant_code',{ascending:true});
      if(error) throw error;
      PLANTS_CATALOG_CACHE=(data||[]).map(normalizePlantCatalogRow).filter(p=>p.code&&p.is_active);
      return PLANTS_CATALOG_CACHE;
    }catch(err){
      console.warn('[plants-catalog] fallback to APP_DATA.plants',err);
      PLANTS_CATALOG_CACHE=fallbackPlantsCatalog();
      return PLANTS_CATALOG_CACHE;
    }finally{PLANTS_CATALOG_PENDING=null;}
  })();
  return PLANTS_CATALOG_PENDING;
}
function clearPlantsCatalogCache(){PLANTS_CATALOG_CACHE=null;PLANTS_CATALOG_PENDING=null;}
let PLANTS_SCREEN_WAREHOUSES_CACHE=null;
let PLANTS_SCREEN_WAREHOUSES_PENDING=null;
function fallbackPlantsScreenWarehouses(){
  const map={};
  (APP_DATA.plants||[]).forEach(plant=>{
    const code=String(plant.code||'').trim().toUpperCase();
    map[code]=(plant.warehouses||[]).map((w,index)=>({
      warehouse_code:String(w[0]||'').trim().toUpperCase(),
      warehouse_name:w[1]||w[0]||'',
      plant_code:code,
      warehouse_type:w[2]||'',
      sort_order:index+1,
      source:'fallback'
    }));
  });
  return map;
}
function normalizePlantsScreenWarehouse(row,index=0){
  return {
    warehouse_code:String(row?.warehouse_code||'').trim().toUpperCase(),
    warehouse_name:row?.warehouse_name||row?.name||row?.warehouse_code||'',
    plant_code:String(row?.plant_code||'').trim().toUpperCase(),
    warehouse_type:row?.warehouse_type||'',
    sort_order:Number(row?.sort_order??index)||0,
    source:row?.source||'supabase'
  };
}
function getPlantsScreenWarehouses(){
  return PLANTS_SCREEN_WAREHOUSES_CACHE || fallbackPlantsScreenWarehouses();
}
async function loadPlantsScreenWarehouses(options={}){
  if(!options.force && PLANTS_SCREEN_WAREHOUSES_CACHE) return PLANTS_SCREEN_WAREHOUSES_CACHE;
  if(!options.force && PLANTS_SCREEN_WAREHOUSES_PENDING) return PLANTS_SCREEN_WAREHOUSES_PENDING;
  if(!WarehouseDB?.ready){PLANTS_SCREEN_WAREHOUSES_CACHE=fallbackPlantsScreenWarehouses();return PLANTS_SCREEN_WAREHOUSES_CACHE;}
  PLANTS_SCREEN_WAREHOUSES_PENDING=(async()=>{
    try{
      const {data,error}=await WarehouseDB.client
        .from('warehouses')
        .select('warehouse_code,warehouse_name,plant_code,warehouse_type,is_active,sort_order')
        .eq('is_active',true)
        .order('sort_order',{ascending:true})
        .order('warehouse_code',{ascending:true});
      if(error) throw error;
      const map={};
      (data||[]).map(normalizePlantsScreenWarehouse).filter(w=>w.warehouse_code&&w.plant_code).forEach(w=>{
        map[w.plant_code]=map[w.plant_code]||[];
        map[w.plant_code].push(w);
      });
      PLANTS_SCREEN_WAREHOUSES_CACHE=map;
      return map;
    }catch(err){
      console.warn('[plants-screen-warehouses] fallback to APP_DATA.plants',err);
      PLANTS_SCREEN_WAREHOUSES_CACHE=fallbackPlantsScreenWarehouses();
      return PLANTS_SCREEN_WAREHOUSES_CACHE;
    }finally{PLANTS_SCREEN_WAREHOUSES_PENDING=null;}
  })();
  return PLANTS_SCREEN_WAREHOUSES_PENDING;
}
function clearPlantsScreenWarehousesCache(){PLANTS_SCREEN_WAREHOUSES_CACHE=null;PLANTS_SCREEN_WAREHOUSES_PENDING=null;}
function plantNameFromCatalog(code){const plant=getPlantsCatalog().find(p=>p.code===String(code||'').trim().toUpperCase());return plant?.name||code||'';}
function fillPlantSelectFromCatalog(select,allLabel){
  if(!select) return;
  const current=select.value||'all';
  select.innerHTML='';
  select.add(new Option(allLabel,'all'));
  getPlantsCatalog().forEach(p=>select.add(new Option(p.code+' - '+p.name,p.code)));
  select.value=[...select.options].some(o=>o.value===current)?current:'all';
}
function refreshPlantsCatalogConsumers(){
  fillPlantSelectFromCatalog($('#plantFilter'),'\u0627\u0644\u0643\u0644');
  fillPlantSelectFromCatalog($('#dashboardPlantFilter'),'\u0643\u0644 \u0627\u0644\u0645\u0635\u0627\u0646\u0639');
  fillPlantSelectFromCatalog($('#reportPlantFilter'),'\u0643\u0644 \u0627\u0644\u0645\u0635\u0627\u0646\u0639');
  renderPlants();
  renderTabs();
}
function initFilters(){
  const pf=$('#plantFilter'),wf=$('#warehouseFilter'),typeFilter=$('#warehouseTypeFilter'),movementFilter=$('#movementFilter'),statusFilter=$('#inboundStatusFilter'),fromDate=$('#fromDate'),toDate=$('#toDate');
  if(!pf || !wf) return;
  getPlantsCatalog().forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
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
function renderPlants(){
  const node=$('#plantsFull');
  if(!node) return;
  const warehousesByPlant=getPlantsScreenWarehouses();
  node.innerHTML=getPlantsCatalog().map(p=>{
    const code=String(p.code||'').trim().toUpperCase();
    const warehouses=warehousesByPlant[code] || [];
    const rows=warehouses.map(w=>'<li><b>'+escapeHtml(w.warehouse_code||'')+'</b> - '+escapeHtml(w.warehouse_name||'')+'</li>').join('');
    return '<div class="plant-card"><div class="plant-icon"><img src="assets/img/logo.png" alt=""></div><h3>'+escapeHtml(p.name)+'</h3><span class="plant-code">'+escapeHtml(code)+'</span><ul class="warehouse-list">'+rows+'</ul></div>';
  }).join('');
  if(WarehouseDB?.ready && !PLANTS_SCREEN_WAREHOUSES_CACHE && !PLANTS_SCREEN_WAREHOUSES_PENDING){
    loadPlantsScreenWarehouses().then(()=>{ if($('#plantsFull')) renderPlants(); });
  }
}
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
  if(key==='salesTable' && heads.length>3){
    const totalIndexes=Array.from({length:heads.length-3},(_,i)=>i+3);
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
  await logSystemActivity(activityExportSection(reportTitle),'تصدير Excel',`تصدير ${reportTitle} Excel`);
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
    await logSystemActivity(activityExportSection(reportTitle),'تصدير PDF',`تصدير ${reportTitle} PDF`);
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

function renderTables(){table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','مرتجع فعلي','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحويل'],APP_DATA.salesReviewSample);table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample)}
function renderTabs(){const salesWh=APP_DATA.plants.flatMap(p=>p.warehouses.filter(w=>['W401','W402','N401','N402','N411','N412','E401','E402'].includes(w[0])).map(w=>w[0]));$('#salesTabs').innerHTML=salesWh.map((w,i)=>`<button class="${i===0?'active':''}">${w}</button>`).join('');$('#inboundTabs').innerHTML=getPlantsCatalog().map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('')}


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
  const plants=getPlantsCatalog().map(p=>p.code);
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
  const rows=getPlantsCatalog().map(p=>{
    const st=plantStats[p.code]||{};
    return `<tr><td>${p.code}</td><td>${fmt(st.sales||0)}</td><td>${fmt(st.production||0)}</td><td>${fmt(st.outgoing||0)}</td><td>${fmt(st.incoming||0)}</td><td>${fmt(st.loading||0)}</td></tr>`;
  }).join('');
  const total=getPlantsCatalog().reduce((a,p)=>{const st=plantStats[p.code]||{};a.sales+=(st.sales||0);a.production+=(st.production||0);a.outgoing+=(st.outgoing||0);a.incoming+=(st.incoming||0);a.loading+=(st.loading||0);return a;},{sales:0,production:0,outgoing:0,incoming:0,loading:0});
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

function formatMobileDashboardDateLabel(v){
  const d=normalizeDateISO(v||'');
  if(!d) return '';
  const parts=d.split('-');
  if(parts.length!==3) return d;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function updateMobileDashboardPeriodLabel(){
  const node=$('#mobileDashboardPeriodLabel b');
  if(!node) return;
  const from=normalizeDateISO($('#dashboardFromDate')?.value || '');
  const to=normalizeDateISO($('#dashboardToDate')?.value || '');
  if(from && to && from===to){
    node.textContent=`تاريخ التقرير: ${formatMobileDashboardDateLabel(from)}`;
  }else if(from || to){
    node.textContent=`الفترة: ${formatMobileDashboardDateLabel(from) || 'البداية'} → ${formatMobileDashboardDateLabel(to) || 'النهاية'}`;
  }else{
    node.textContent='تاريخ التقرير: --/--/----';
  }
}
function initDashboardFilters(){
  const pf=$('#dashboardPlantFilter'), wf=$('#dashboardWarehouseFilter');
  if(!pf || !wf) return;
  if(pf.options.length<=1){
    getPlantsCatalog().forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
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
  pf.onchange=()=>{clearUnifiedSalesRowsCache();fillWh();};
  wf.addEventListener('change',clearUnifiedSalesRowsCache);
  ['dashboardFromDate','dashboardToDate'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{clearUnifiedSalesRowsCache();updateMobileDashboardPeriodLabel();}));
  fillWh();
  updateMobileDashboardPeriodLabel();
  $('#dashboardSearchBtn')?.addEventListener('click',()=>{updateMobileDashboardPeriodLabel();loadDashboardRealData({keepDates:true});});
  $('#dashboardResetBtn')?.addEventListener('click',()=>{
    clearUnifiedSalesRowsCache();
    pf.value='all';
    fillWh();
    wf.value='all';
    $('#dashboardFromDate').value='';
    $('#dashboardToDate').value='';
    loadDashboardRealData({resetDefaultDate:true}).finally(updateMobileDashboardPeriodLabel);
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
    if(!isSalesReviewRow(r)) return false;
    // Keep dashboard aligned with the sales reports: only official sales warehouses are counted.
    if(!SALES_WAREHOUSES.includes(wh)) return false;
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
  const rows=getPlantsCatalog().map(p=>{
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
function getHeatmapCellClass(value,minPositive,maxValue,options={}){
  const val=toNumber(value);
  const includeBase=options.includeBase===true;
  if(!val) return includeBase?'zero':'';
  const min=toNumber(minPositive);
  const max=toNumber(maxValue);
  let base='';
  if(includeBase){
    if(max>0 && min>0 && max!==min){
      const ratio=(val-min)/(max-min);
      base=ratio>.72?'high':(ratio<.28?'low':'mid');
    }else{
      base='mid';
    }
  }
  if(max>0 && val===max) return [base,'heatmap-max-gold'].filter(Boolean).join(' ');
  if(min>0 && val===min) return [base,'heatmap-min-red'].filter(Boolean).join(' ');
  return base;
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
    if(filters.from && d<filters.from) return;
    if(filters.to && d>filters.to) return;
    if(filters.plant && filters.plant!=='all' && plant!==filters.plant) return;
    if(filters.warehouse && filters.warehouse!=='all' && wh!==String(filters.warehouse).toUpperCase()) return;
    daily[d]=(daily[d]||0)+unifiedSalesRowMetrics(r).sales;
  });
  const values=Object.values(daily).filter(v=>v>0);
  const max=Math.max(...values,0);
  const min=values.length?Math.min(...values):0;
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
    const heatmapClass=getHeatmapCellClass(val,min,max);
    const className=heatmapClass ? `heat-cell ${heatmapClass}` : 'heat-cell';
    cells.push(`<div class="${className}" style="--heat:${ratio.toFixed(3)}" title="${date} - ${fmt(val)} طن"><b>${day}</b><span>${fmt(val)}</span></div>`);
  }
  node.innerHTML=`
    <div class="heatmap-head"><strong>${monthKey}</strong><span>الأقل</span><i></i><span>الأعلى</span></div>
    <div class="heatmap-weekdays">${weekDayLabels.map(d=>`<span>${d}</span>`).join('')}</div>
    <div class="heatmap-grid">${cells.join('')}</div>
    <div class="heatmap-footer"><b>${fmt(Object.values(daily).reduce((a,b)=>a+b,0))}</b><span>إجمالي البيع للأيام المعروضة حسب الفلتر</span></div>`;
}
function renderRankTable(selector,heads,rows,{totalLabel='الإجمالي'}={}){
  const node=$(selector); if(!node) return;
  const body=(rows&&rows.length?rows:[]).map((r,ri)=>`<tr>${heads.map((_,i)=>{
    const cls=i===0?'rank-num':(i>=heads.length-3?'num-cell':'');
    return `<td class="${cls}">${r[i]??''}</td>`;
  }).join('')}</tr>`).join('') || `<tr><td colspan="${heads.length}" class="empty-row">لا توجد بيانات مطابقة</td></tr>`;
  node.innerHTML=`<thead><tr>${heads.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody>`;
}

// Emergency fallback only: Dynamic Sales Review uses public.sales_products and public.sales_product_warehouses.
const SALES_REVIEW_MATERIAL_CODES = new Set([
  '211000001','211000002','211000003','211000004','211000007','211000008','211000009',
  '211000011','211000012','211000013','211000016','211000018','211000019','211000020','211000021','211000022','211000023','211000024','211000025','211000029','211000030','211000031','211000032','211000033','211000034','211000035','211000036','211000037','211000038','211000039','211000041','211000042','211000044','211000045','211000046','211000047','211000049','211000050','211000051','211000054','211000055','211000056','211000057','211000058','211000060','211000061','211000062','211000063','211000065','211000067','211000069','211000086','211000087','211000088','211000089',
  '212000001','212000002','111000006','111000018'
]);
function normalizeMaterialCode(v){
  return String(v||'').replace(/\.0$/,'').replace(/\s+/g,'').trim();
}
function isSalesReviewMaterialCode(code){
  return SALES_REVIEW_MATERIAL_CODES.has(normalizeMaterialCode(code));
}
const SALES_REVIEW_CATALOG_DEBUG=true;
let SALES_REVIEW_CATALOG_CACHE=null;
let SALES_REVIEW_CATALOG_PENDING=null;
function buildLegacySalesReviewCatalog(reason='legacy'){
  const materialCodes=new Set([...SALES_REVIEW_MATERIAL_CODES].map(normalizeMaterialCode).filter(Boolean));
  const allowedWarehousesByMaterial=new Map();
  materialCodes.forEach(code=>allowedWarehousesByMaterial.set(code,new Set(SALES_WAREHOUSES)));
  return {
    source:'legacy',
    reason,
    materialCodes,
    materialNames:new Map(),
    defaultUnits:new Map(),
    allowedWarehousesByMaterial,
    allAllowedWarehouseCodes:new Set(SALES_WAREHOUSES),
    signature:'legacy:'+materialCodes.size+':'+SALES_WAREHOUSES.join(','),
    fallback:true
  };
}
function salesReviewCatalogSignature(catalog){
  if(!catalog) return 'none';
  const materialPart=[...(catalog.materialCodes||[])].sort().join(',');
  const warehousePart=[...(catalog.allAllowedWarehouseCodes||[])].sort().join(',');
  return [catalog.source||'unknown',materialPart,warehousePart].join(':');
}
async function loadSalesReviewCatalog(options={}){
  if(options.force){SALES_REVIEW_CATALOG_CACHE=null;SALES_REVIEW_CATALOG_PENDING=null;}
  if(SALES_REVIEW_CATALOG_CACHE) return SALES_REVIEW_CATALOG_CACHE;
  if(SALES_REVIEW_CATALOG_PENDING) return SALES_REVIEW_CATALOG_PENDING;
  SALES_REVIEW_CATALOG_PENDING=(async()=>{
    if(!WarehouseDB?.ready) return buildLegacySalesReviewCatalog('warehouse-db-not-ready');
    try{
      const [productsRes,linksRes]=await Promise.all([
        WarehouseDB.client
          .from('sales_products')
          .select('material_code,material_name,default_unit,is_active,use_in_sales_reports,sort_order')
          .eq('is_active',true)
          .eq('use_in_sales_reports',true)
          .order('sort_order',{ascending:true})
          .order('material_code',{ascending:true}),
        WarehouseDB.client
          .from('sales_product_warehouses')
          .select('material_code,warehouse_code,is_active')
          .eq('is_active',true)
      ]);
      if(productsRes.error) throw productsRes.error;
      if(linksRes.error) throw linksRes.error;
      const products=(productsRes.data||[]).map(p=>({
        code:normalizeMaterialCode(p.material_code),
        name:String(p.material_name||p.material_code||'').trim(),
        unit:String(p.default_unit||'TO').trim().toUpperCase()||'TO'
      })).filter(p=>p.code);
      if(!products.length) return buildLegacySalesReviewCatalog('empty-sales-products');
      const materialCodes=new Set(products.map(p=>p.code));
      const materialNames=new Map(products.map(p=>[p.code,p.name]));
      const defaultUnits=new Map(products.map(p=>[p.code,p.unit]));
      const allowedWarehousesByMaterial=new Map();
      (linksRes.data||[]).forEach(link=>{
        const code=normalizeMaterialCode(link.material_code);
        const wh=String(link.warehouse_code||'').trim().toUpperCase();
        if(!code || !wh || !materialCodes.has(code)) return;
        if(!allowedWarehousesByMaterial.has(code)) allowedWarehousesByMaterial.set(code,new Set());
        allowedWarehousesByMaterial.get(code).add(wh);
      });
      materialCodes.forEach(code=>{
        if(!allowedWarehousesByMaterial.has(code)) allowedWarehousesByMaterial.set(code,new Set());
      });
      const allAllowedWarehouseCodes=new Set();
      allowedWarehousesByMaterial.forEach(set=>set.forEach(wh=>allAllowedWarehouseCodes.add(wh)));
      const catalog={
        source:'dynamic',
        materialCodes,
        materialNames,
        defaultUnits,
        allowedWarehousesByMaterial,
        allAllowedWarehouseCodes,
        fallback:false
      };
      catalog.signature=salesReviewCatalogSignature(catalog);
      return catalog;
    }catch(error){
      console.warn('[sales-review-catalog] dynamic load failed, using legacy fallback',error);
      return buildLegacySalesReviewCatalog(error.message||'dynamic-load-failed');
    }
  })();
  try{
    SALES_REVIEW_CATALOG_CACHE=await SALES_REVIEW_CATALOG_PENDING;
    return SALES_REVIEW_CATALOG_CACHE;
  }finally{
    SALES_REVIEW_CATALOG_PENDING=null;
  }
}
function clearSalesReviewCatalogCache(){
  SALES_REVIEW_CATALOG_CACHE=null;
  SALES_REVIEW_CATALOG_PENDING=null;
}
function salesReviewWarehouseAllowedForMaterial(materialCode,warehouseCode,catalog){
  const code=normalizeMaterialCode(materialCode);
  const wh=String(warehouseCode||'').trim().toUpperCase();
  if(!code || !wh) return false;
  const allowed=catalog?.allowedWarehousesByMaterial?.get(code);
  if(allowed && allowed.size) return allowed.has(wh);
  if(catalog?.fallback) return SALES_WAREHOUSES.includes(wh);
  return false;
}
function isSalesReviewMaterialCodeInCatalog(code,catalog){
  const normalized=normalizeMaterialCode(code);
  return catalog?.materialCodes ? catalog.materialCodes.has(normalized) : isSalesReviewMaterialCode(normalized);
}
function isSalesReviewRow(row,catalog=null){
  if(!isSalesReviewMaterialCodeInCatalog(row?.material_code,catalog)) return false;
  if(catalog) return salesReviewWarehouseAllowedForMaterial(row?.material_code,row?.warehouse_code,catalog);
  return true;
}
function isLegacySalesReviewRow(row){
  const wh=String(row?.warehouse_code||'').trim().toUpperCase();
  return isSalesReviewMaterialCode(row?.material_code) && SALES_WAREHOUSES.includes(wh);
}
function filterSalesReviewRows(rows,catalog=null){
  return (rows||[]).filter(row=>isSalesReviewRow(row,catalog));
}
function salesReviewSetDiff(a,b){
  const bs=new Set(b);
  return [...new Set(a)].filter(x=>!bs.has(x)).sort();
}
function salesReviewDebugTotals(rows=[]){
  return rows.reduce((totals,row)=>{
    const metrics=unifiedSalesRowMetrics(row);
    totals.sales+=metrics.sales;
    totals.actualReturn+=metrics.actualReturn;
    totals.production+=metrics.production;
    totals.outgoing+=metrics.outgoing;
    totals.incoming+=metrics.incoming;
    totals.loading+=metrics.loading;
    return totals;
  },{sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0});
}
function salesReviewTotalsMatch(a,b){
  return ['sales','actualReturn','production','outgoing','incoming','loading'].every(key=>Math.abs((a?.[key]||0)-(b?.[key]||0))<0.000001);
}
function salesReviewEngineDebug(rows,catalog,stage,filters={}){
  if(!SALES_REVIEW_CATALOG_DEBUG) return;
  const sourceRows=rows||[];
  const legacyRows=sourceRows.filter(isLegacySalesReviewRow);
  const dynamicRows=filterSalesReviewRows(sourceRows,catalog);
  const legacyCodes=legacyRows.map(r=>normalizeMaterialCode(r.material_code)).filter(Boolean);
  const dynamicCodes=dynamicRows.map(r=>normalizeMaterialCode(r.material_code)).filter(Boolean);
  const legacyWarehouses=legacyRows.map(r=>String(r.warehouse_code||'').trim().toUpperCase()).filter(Boolean);
  const dynamicWarehouses=dynamicRows.map(r=>String(r.warehouse_code||'').trim().toUpperCase()).filter(Boolean);
  const currentMonth=new Date().toISOString().slice(0,7);
  const legacyCurrentMonthRows=legacyRows.filter(r=>(salesRowReportDate(r)||'').slice(0,7)===currentMonth);
  const dynamicCurrentMonthRows=dynamicRows.filter(r=>(salesRowReportDate(r)||'').slice(0,7)===currentMonth);
  const legacyCurrentMonthTotals=salesReviewDebugTotals(legacyCurrentMonthRows);
  const dynamicCurrentMonthTotals=salesReviewDebugTotals(dynamicCurrentMonthRows);
  console.log('[sales-review-catalog-debug]',stage,{
    catalogSource:catalog?.source||'legacy',
    catalogSignature:catalog?.signature||'none',
    filters,
    legacyRows:legacyRows.length,
    dynamicRows:dynamicRows.length,
    materialCodesOnlyInLegacy:salesReviewSetDiff(legacyCodes,dynamicCodes),
    materialCodesOnlyInDynamic:salesReviewSetDiff(dynamicCodes,legacyCodes),
    warehousesOnlyInLegacy:salesReviewSetDiff(legacyWarehouses,dynamicWarehouses),
    warehousesOnlyInDynamic:salesReviewSetDiff(dynamicWarehouses,legacyWarehouses),
    currentMonth,
    legacyCurrentMonthRows:legacyCurrentMonthRows.length,
    dynamicCurrentMonthRows:dynamicCurrentMonthRows.length,
    legacyCurrentMonthTotals,
    dynamicCurrentMonthTotals,
    currentMonthTotalsMatch:salesReviewTotalsMatch(legacyCurrentMonthTotals,dynamicCurrentMonthTotals)
  });
}
function salesReviewCurrentMonthFilters(base={}){
  if(base.from || base.to) return base;
  const now=new Date();
  const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));
  const first=new Date(cairo.getFullYear(),cairo.getMonth(),1);
  const last=new Date(cairo.getFullYear(),cairo.getMonth()+1,0);
  const iso=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return {...base,from:iso(first),to:iso(last)};
}
async function fetchSalesReviewVerificationSourceRows(filters={},options={}){
  if(!WarehouseDB?.ready) return [];
  const pageSize=1000;
  const maxPages=options.maxPages||200;
  const ascending=options.ascending!==false;
  const all=[];
  for(let page=0;page<maxPages;page++){
    const from=page*pageSize;
    const to=from+pageSize-1;
    let query=WarehouseDB.client
      .from('sales_raw_transactions')
      .select(SALES_RAW_AUDIT_SELECT)
      .eq('sales_upload_batches.status','active')
      .in('movement_type',SALES_REVIEW_MOVEMENT_TYPES)
      .order('id',{ascending})
      .range(from,to);
    if(filters.from) query=query.gte('sales_upload_batches.report_date',filters.from);
    if(filters.to) query=query.lte('sales_upload_batches.report_date',filters.to);
    if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant);
    if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',String(filters.warehouse).toUpperCase());
    const {data,error}=await query;
    if(error) throw error;
    const chunk=(data||[]).map(r=>({
      ...r,
      report_date:salesRowReportDate(r),
      warehouse_name:r.warehouse_name || dashboardWhMeta(r.warehouse_code).name || '',
      uom:r.uom || 'TO'
    }));
    all.push(...chunk);
    if(chunk.length<pageSize) break;
  }
  return all;
}
function salesReviewVerificationBuild(engine,sourceRows,catalog){
  const materialRows=sourceRows.filter(row=>engine==='legacy'
    ? isSalesReviewMaterialCode(row?.material_code)
    : isSalesReviewMaterialCodeInCatalog(row?.material_code,catalog));
  const warehouseRows=materialRows.filter(row=>{
    const wh=String(row?.warehouse_code||'').trim().toUpperCase();
    return engine==='legacy'
      ? SALES_WAREHOUSES.includes(wh)
      : salesReviewWarehouseAllowedForMaterial(row?.material_code,wh,catalog);
  });
  const totals=salesReviewDebugTotals(warehouseRows);
  const materials=new Set(warehouseRows.map(r=>normalizeMaterialCode(r.material_code)).filter(Boolean));
  const warehouses=new Set(warehouseRows.map(r=>String(r.warehouse_code||'').trim().toUpperCase()).filter(Boolean));
  return {
    engine,
    beforeMaterialFilter:sourceRows.length,
    afterMaterialFilter:materialRows.length,
    afterWarehouseFilter:warehouseRows.length,
    sales:totals.sales,
    outbound:totals.outgoing,
    inbound:totals.incoming,
    production:totals.production,
    loading:totals.loading,
    transferTotal:totals.outgoing+totals.incoming,
    actualReturn:totals.actualReturn,
    materialCount:materials.size,
    warehouseCount:warehouses.size,
    rows:warehouseRows,
    materials,
    warehouses
  };
}
function salesReviewVerificationRowKey(row){
  return [
    normalizeMaterialCode(row?.material_code),
    String(row?.warehouse_code||'').trim().toUpperCase()
  ].join('|');
}
function salesReviewVerificationReason(row,catalog,direction){
  const code=normalizeMaterialCode(row?.material_code);
  const wh=String(row?.warehouse_code||'').trim().toUpperCase();
  if(direction==='legacy-only'){
    if(!isSalesReviewMaterialCodeInCatalog(code,catalog)) return 'الصنف موجود في Legacy لكنه غير نشط أو غير مدرج في sales_products لتقارير البيع';
    if(!salesReviewWarehouseAllowedForMaterial(code,wh,catalog)) return 'المخزن موجود في Legacy لكنه غير مرتبط بالصنف في sales_product_warehouses';
    return 'فرق غير متوقع بعد تطبيق قواعد Dynamic';
  }
  if(!isSalesReviewMaterialCode(code)) return 'الصنف موجود في Dynamic لكنه غير موجود في SALES_REVIEW_MATERIAL_CODES';
  if(!SALES_WAREHOUSES.includes(wh)) return 'المخزن موجود في Dynamic لكنه خارج مخازن البيع الرسمية القديمة';
  return 'فرق غير متوقع بعد تطبيق قواعد Legacy';
}
function salesReviewVerificationGroupRows(rows,catalog,direction){
  const map=new Map();
  rows.forEach(row=>{
    const key=salesReviewVerificationRowKey(row);
    if(!map.has(key)){
      map.set(key,{
        material_code:normalizeMaterialCode(row?.material_code),
        material_name:row?.material_name||'-',
        warehouse_code:String(row?.warehouse_code||'').trim().toUpperCase()||'-',
        reason:salesReviewVerificationReason(row,catalog,direction),
        rows:0,
        totals:{sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0}
      });
    }
    const item=map.get(key);
    item.rows++;
    const metrics=unifiedSalesRowMetrics(row);
    item.totals.sales+=metrics.sales;
    item.totals.actualReturn+=metrics.actualReturn;
    item.totals.production+=metrics.production;
    item.totals.outgoing+=metrics.outgoing;
    item.totals.incoming+=metrics.incoming;
    item.totals.loading+=metrics.loading;
  });
  return [...map.values()].sort((a,b)=>String(a.material_code).localeCompare(String(b.material_code)) || String(a.warehouse_code).localeCompare(String(b.warehouse_code)));
}
function salesReviewVerificationDifferences(legacyRows,dynamicRows,catalog){
  const legacyKeys=new Set(legacyRows.map(salesReviewVerificationRowKey));
  const dynamicKeys=new Set(dynamicRows.map(salesReviewVerificationRowKey));
  const legacyOnly=legacyRows.filter(row=>!dynamicKeys.has(salesReviewVerificationRowKey(row)));
  const dynamicOnly=dynamicRows.filter(row=>!legacyKeys.has(salesReviewVerificationRowKey(row)));
  return {
    legacyOnly:salesReviewVerificationGroupRows(legacyOnly,catalog,'legacy-only'),
    dynamicOnly:salesReviewVerificationGroupRows(dynamicOnly,catalog,'dynamic-only')
  };
}
function salesReviewVerificationValuesMatch(legacy,dynamic){
  return ['beforeMaterialFilter','afterMaterialFilter','afterWarehouseFilter','sales','outbound','inbound','production','loading','transferTotal','materialCount','warehouseCount']
    .every(key=>Math.abs((legacy?.[key]||0)-(dynamic?.[key]||0))<0.000001);
}
async function runSalesReviewEngineVerification(filters={},options={}){
  const verificationFilters=salesReviewCurrentMonthFilters(filters||{});
  const catalog=await loadSalesReviewCatalog(options.catalogOptions||{});
  const sourceRows=await fetchSalesReviewVerificationSourceRows(verificationFilters,options);
  const legacy=salesReviewVerificationBuild('legacy',sourceRows,catalog);
  const dynamic=salesReviewVerificationBuild('dynamic',sourceRows,catalog);
  const differences=salesReviewVerificationDifferences(legacy.rows,dynamic.rows,catalog);
  const currentMonthTotalsMatch=salesReviewVerificationValuesMatch(legacy,dynamic);
  const report={
    filters:verificationFilters,
    catalogSource:catalog?.source||'legacy',
    catalogSignature:catalog?.signature||'none',
    sourceRowsBeforeMaterialFilter:sourceRows.length,
    legacy:{
      beforeMaterialFilter:legacy.beforeMaterialFilter,
      afterMaterialFilter:legacy.afterMaterialFilter,
      afterWarehouseFilter:legacy.afterWarehouseFilter,
      sales:legacy.sales,
      outbound:legacy.outbound,
      inbound:legacy.inbound,
      production:legacy.production,
      loading:legacy.loading,
      transferTotal:legacy.transferTotal,
      actualReturn:legacy.actualReturn,
      materialCount:legacy.materialCount,
      warehouseCount:legacy.warehouseCount
    },
    dynamic:{
      beforeMaterialFilter:dynamic.beforeMaterialFilter,
      afterMaterialFilter:dynamic.afterMaterialFilter,
      afterWarehouseFilter:dynamic.afterWarehouseFilter,
      sales:dynamic.sales,
      outbound:dynamic.outbound,
      inbound:dynamic.inbound,
      production:dynamic.production,
      loading:dynamic.loading,
      transferTotal:dynamic.transferTotal,
      actualReturn:dynamic.actualReturn,
      materialCount:dynamic.materialCount,
      warehouseCount:dynamic.warehouseCount
    },
    currentMonthTotalsMatch,
    differences
  };
  console.log('[sales-review-enterprise-verification]',report);
  if(currentMonthTotalsMatch){
    console.log('[sales-review-enterprise-verification] Dynamic Sales Review Engine is the official data source. Legacy remains as emergency fallback only.');
  }else{
    console.warn('[sales-review-enterprise-verification] Differences detected. Do not promote Dynamic as official until reviewed.',differences);
  }
  return report;
}

const UNIFIED_SALES_ROWS_CACHE=new Map();
const UNIFIED_SALES_ROWS_PENDING=new Map();
function unifiedSalesRowsCacheKey(filters={}){
  return [
    normalizeDateISO(filters.from||''),
    normalizeDateISO(filters.to||''),
    String(filters.plant||'all'),
    String(filters.warehouse||'all').toUpperCase()
  ].join('|');
}
function clearUnifiedSalesRowsCache(){
  UNIFIED_SALES_ROWS_CACHE.clear();
  UNIFIED_SALES_ROWS_PENDING.clear();
}
function clearSalesReviewEngineCache(){
  clearSalesReviewCatalogCache();
  clearUnifiedSalesRowsCache();
}
if(typeof window!=='undefined'){
  window.salesReviewEngineDebug=salesReviewEngineDebug;
  window.salesReviewDebugTotals=salesReviewDebugTotals;
  window.loadSalesReviewCatalog=loadSalesReviewCatalog;
  window.buildLegacySalesReviewCatalog=buildLegacySalesReviewCatalog;
  window.clearSalesReviewEngineCache=clearSalesReviewEngineCache;
  window.runSalesReviewEngineVerification=runSalesReviewEngineVerification;
  window.normalizeWorkerGroup=normalizeWorkerGroup;
  window.debugActualReturnRows=debugActualReturnRows;
  window.verifyDashboardProductMapAgainstSalesAudit=verifyDashboardProductMapAgainstSalesAudit;
  window.verifySalesAggregationAgainstSalesReviewTable=verifySalesAggregationAgainstSalesReviewTable;
  window.aggregateSalesAuditReportRows=aggregateSalesAuditReportRows;
}

const SALES_REVIEW_MOVEMENT_TYPES=['601','602','653','654','101','102','Z51','Z52','351','352','301','302','Z13','Z14'];
function salesPerfNow(){return window.performance?.now ? performance.now() : Date.now();}
function salesPerfMs(start){return Math.round((salesPerfNow()-start)*100)/100;}
function salesPerfLog(stage,start,details={}){
  console.log('[sales-performance]',stage,{...details,durationMs:salesPerfMs(start)});
}

const SALES_AUDIT_DASHBOARD_SELECT='report_date,warehouse_code,warehouse_name,plant_code,plant_name,material_code,material_name,sales_quantity,actual_return_quantity,production_quantity,outgoing_transfer_quantity,incoming_transfer_quantity,total_loading_quantity';
async function fetchAllSalesAuditRows(filters={}, options={}){
  if(!WarehouseDB?.ready) return [];
  const pageSize=1000;
  const maxPages=200;
  const orderBy=options.orderBy || 'report_date';
  const ascending=options.ascending===true;
  const selectCols=options.select || SALES_AUDIT_DASHBOARD_SELECT;
  const all=[];
  for(let page=0; page<maxPages; page++){
    const from=page*pageSize;
    const to=from+pageSize-1;
    let query=WarehouseDB.client
      .from('sales_audit_report')
      .select(selectCols)
      .order(orderBy,{ascending})
      .range(from,to);
    if(filters.from) query=query.gte('report_date',filters.from);
    if(filters.to) query=query.lte('report_date',filters.to);
    if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant);
    if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',String(filters.warehouse).toUpperCase());
    const {data,error}=await query;
    if(error) throw error;
    const chunk=data||[];
    all.push(...chunk);
    if(chunk.length<pageSize) break;
  }
  const catalog=await loadSalesReviewCatalog();
  const filtered=filterSalesReviewRows(all,catalog);
  salesReviewEngineDebug(all,catalog,'sales_audit_report',filters);
  return filtered;
}

const SALES_RAW_AUDIT_SELECT='id,material_code,material_name,quantity,uom,quantity_to,movement_type,movement_text,worker_group,warehouse_code,plant_code,plant_name,sales_upload_batches!inner(report_date,status)';
function salesRowReportDate(row){
  const batch=Array.isArray(row?.sales_upload_batches)?row.sales_upload_batches[0]:row?.sales_upload_batches;
  return normalizeDateISO(row?.report_date || batch?.report_date || '');
}
function salesRowQuantityTo(row){
  if(row && row.quantity_to!==undefined && row.quantity_to!==null) return toNumber(row.quantity_to);
  const q=toNumber(row?.quantity);
  return String(row?.uom||'').trim().toUpperCase()==='KG' ? q/1000 : q;
}
function salesMovementText(row){return String(row?.movement_text||'').replace(/\s+/g,' ').trim();}
function normalizeWorkerGroup(value){
  const raw=String(value ?? '').trim()
    .replace(/[\u0660-\u0669]/g,d=>String(d.charCodeAt(0)-0x0660))
    .replace(/[\u06F0-\u06F9]/g,d=>String(d.charCodeAt(0)-0x06F0))
    .replace(',', '.');
  if(!raw) return '';
  const numeric=Number(raw);
  if(Number.isFinite(numeric) && Number.isInteger(numeric)) return String(numeric);
  return raw.replace(/\.0+$/,'').replace(/^0+(\d+)$/,'$1');
}
function salesWorkerGroup(row){return normalizeWorkerGroup(row?.worker_group);}
function classifySalesReviewMovement(row){
  const movement=String(row?.movement_type||'').trim().toUpperCase();
  if(movement==='653') return ['9','16'].includes(salesWorkerGroup(row)) ? 'actual_return' : 'sales_deduction';
  return 'ignored';
}
async function debugActualReturnRows(filters={},options={}){
  const sourceRows=await fetchSalesReviewVerificationSourceRows(salesReviewCurrentMonthFilters(filters),options);
  const limit=options.limit || 50;
  const sample=sourceRows
    .filter(row=>String(row?.movement_type||'').trim().toUpperCase()==='653')
    .slice(0,limit)
    .map(row=>({
      material_code:row.material_code,
      warehouse_code:row.warehouse_code,
      movement_type:row.movement_type,
      worker_group_raw:row.worker_group,
      worker_group_normalized:normalizeWorkerGroup(row.worker_group),
      quantity:salesRowQuantityTo(row),
      classification:classifySalesReviewMovement(row)
    }));
  console.table(sample);
  return sample;
}
function emptyUnifiedSalesStats(rowsCount=0){
  return {rowsCount,salesQty:0,actualReturnQty:0,productionQty:0,outgoingTransferQty:0,incomingTransferQty:0,totalLoadingQty:0};
}
function addUnifiedSalesStats(target,metrics){
  target.salesQty+=metrics.sales;
  target.actualReturnQty+=metrics.actualReturn;
  target.productionQty+=metrics.production;
  target.outgoingTransferQty+=metrics.outgoing;
  target.incomingTransferQty+=metrics.incoming;
  target.totalLoadingQty+=metrics.loading;
}
function computeUnifiedSalesMetrics(row){
  const movement=String(row?.movement_type||'').trim().toUpperCase();
  if(movement){
    const q=salesRowQuantityTo(row);
    const text=salesMovementText(row);
    const worker=salesWorkerGroup(row);
    const metrics={sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    if(['601','654'].includes(movement)) metrics.sales+=q;
    if(movement==='602') metrics.sales-=q;
    if(movement==='653'){
      if(['9','16'].includes(worker)) metrics.actualReturn+=q;
      else metrics.sales-=q;
    }
    if(movement==='101' && text==='استلام بضائع للأمر') metrics.production+=q;
    if(movement==='102' && text==='ا.بضائع لإلغاء الأمر') metrics.production-=q;
    if(['Z51','351','301'].includes(movement)) metrics.outgoing+=q;
    if(['Z52','352','302'].includes(movement)) metrics.outgoing-=q;
    if(movement==='101' && text==='ا.بضائع لمخزون منقول') metrics.incoming+=q;
    if(movement==='Z13') metrics.incoming+=q;
    if(movement==='102' && text==='GR:إلغاء مخزون منقول') metrics.incoming-=q;
    if(movement==='Z14') metrics.incoming-=q;
    metrics.loading=metrics.sales+metrics.outgoing;
    return metrics;
  }
  const sales=toNumber(row?.sales_quantity);
  const outgoing=toNumber(row?.outgoing_transfer_quantity);
  return {
    sales,
    actualReturn:toNumber(row?.actual_return_quantity),
    production:toNumber(row?.production_quantity),
    outgoing,
    incoming:toNumber(row?.incoming_transfer_quantity),
    loading:sales+outgoing
  };
}
function rowMatchesUnifiedSalesFilters(row,filters={},catalog=null){
  const wh=String(row?.warehouse_code||'').trim().toUpperCase();
  const meta=dashboardWhMeta(wh);
  const d=salesRowReportDate(row) || dashboardDateKey(row?.report_date);
  const plant=String(row?.plant_code||meta.plant||'');
  if(filters.plant && filters.plant!=='all' && plant!==filters.plant) return false;
  if(filters.warehouse && filters.warehouse!=='all' && wh!==String(filters.warehouse).toUpperCase()) return false;
  if(filters.from && d<filters.from) return false;
  if(filters.to && d>filters.to) return false;
  if(!isSalesReviewRow(row,catalog)) return false;
  return true;
}
function isSalesAuditReportRow(row){
  return !!row && row.sales_quantity!==undefined && row.outgoing_transfer_quantity!==undefined && row.total_loading_quantity!==undefined && row.movement_type===undefined;
}
function salesAuditReportRowMetrics(row){
  return {
    sales:toNumber(row?.sales_quantity),
    actualReturn:toNumber(row?.actual_return_quantity),
    production:toNumber(row?.production_quantity),
    outgoing:toNumber(row?.outgoing_transfer_quantity),
    incoming:toNumber(row?.incoming_transfer_quantity),
    loading:toNumber(row?.total_loading_quantity)
  };
}
function aggregateSalesRowsWithMetrics(rows,filters={},options={},metricsResolver=computeUnifiedSalesMetrics){
  const catalog=options.catalog||null;
  const sourceRows=rows||[];
  const materialRows=sourceRows.filter(r=>isSalesReviewMaterialCodeInCatalog(r?.material_code,catalog));
  const salesWarehouseRows=materialRows.filter(r=>isSalesReviewRow(r,catalog));
  const groups=(options.groups||[]).map(g=>({...g,stats:emptyUnifiedSalesStats()}));
  const groupSets=groups.map(g=>new Set((g.codes||[]).map(c=>String(c).toUpperCase())));
  const filteredRows=salesWarehouseRows.filter(r=>rowMatchesUnifiedSalesFilters(r,filters,catalog));
  const daily={}, warehouseSalesMap={}, warehouseActivityMap={}, productMap={}, plantStats={};
  getPlantsCatalog().forEach(p=>plantStats[p.code]={sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0});
  const stats=emptyUnifiedSalesStats(filteredRows.length);
  filteredRows.forEach(r=>{
    const metrics=metricsResolver(r);
    const d=salesRowReportDate(r) || dashboardDateKey(r.report_date);
    daily[d]=daily[d]||{sales:0,production:0,outgoing:0,incoming:0,loading:0};
    const wh=String(r.warehouse_code||'').trim().toUpperCase();
    const meta=dashboardWhMeta(wh);
    const plant=r.plant_code||meta.plant||'��� ����';
    if(!plantStats[plant]) plantStats[plant]={sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    addUnifiedSalesStats(stats,metrics);
    daily[d].sales+=Math.abs(metrics.sales);
    daily[d].production+=Math.abs(metrics.production);
    daily[d].outgoing+=Math.abs(metrics.outgoing);
    daily[d].incoming+=Math.abs(metrics.incoming);
    daily[d].loading+=Math.abs(metrics.loading);
    plantStats[plant].sales+=metrics.sales;
    plantStats[plant].actualReturn+=metrics.actualReturn;
    plantStats[plant].production+=metrics.production;
    plantStats[plant].outgoing+=metrics.outgoing;
    plantStats[plant].incoming+=metrics.incoming;
    plantStats[plant].loading+=metrics.loading;
    if(metrics.sales) warehouseSalesMap[wh]=(warehouseSalesMap[wh]||0)+Math.abs(metrics.sales);
    const pkey=String(r.material_code||r.material_name||'��� ����');
    if(!productMap[pkey]) productMap[pkey]={code:r.material_code||'-',name:r.material_name||'-',sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    productMap[pkey].sales+=metrics.sales;
    productMap[pkey].actualReturn+=metrics.actualReturn;
    productMap[pkey].production+=metrics.production;
    productMap[pkey].outgoing+=metrics.outgoing;
    productMap[pkey].incoming+=metrics.incoming;
    productMap[pkey].loading+=metrics.loading;
    if(!warehouseActivityMap[wh]) warehouseActivityMap[wh]={code:wh,name:meta.name||r.warehouse_name||'-',plant:plant,sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0};
    warehouseActivityMap[wh].sales+=metrics.sales;
    warehouseActivityMap[wh].actualReturn+=metrics.actualReturn;
    warehouseActivityMap[wh].production+=metrics.production;
    warehouseActivityMap[wh].outgoing+=metrics.outgoing;
    warehouseActivityMap[wh].incoming+=metrics.incoming;
    warehouseActivityMap[wh].loading+=metrics.loading;
    warehouseActivityMap[wh].totalActivity+=Math.abs(metrics.sales)+Math.abs(metrics.production)+Math.abs(metrics.outgoing)+Math.abs(metrics.incoming)+Math.abs(metrics.loading);
    groups.forEach((g,idx)=>{ if(groupSets[idx].has(wh)) addUnifiedSalesStats(g.stats,metrics); });
  });
  return {rows:filteredRows,stats,daily,warehouseSalesMap,warehouseActivityMap,productMap,plantStats,groups,counts:{sourceRows:sourceRows.length,afterMaterialFilter:materialRows.length,afterSalesWarehouseFilter:salesWarehouseRows.length,afterAllFilters:filteredRows.length}};
}
function aggregateSalesAuditReportRows(rows,filters={},options={}){
  return aggregateSalesRowsWithMetrics(rows,filters,options,salesAuditReportRowMetrics);
}
function unifiedSalesRowMetrics(row){
  return isSalesAuditReportRow(row) ? salesAuditReportRowMetrics(row) : computeUnifiedSalesMetrics(row);
}
function buildUnifiedSalesTotals(rows,options={}){
  const perfLabel=`buildUnifiedSalesTotals ${unifiedSalesRowsCacheKey(options.filters||{})}`;
  const perfStart=salesPerfNow();
  console.time(perfLabel);
  const filters=options.filters||{};
  const sourceRows=rows||[];
  const isAuditRows=options.source==='raw-debug' ? false : (options.source==='sales_audit_report' || sourceRows.length===0 || sourceRows.every(isSalesAuditReportRow));
  const model=isAuditRows
    ? aggregateSalesAuditReportRows(sourceRows,filters,options)
    : aggregateSalesRowsWithMetrics(sourceRows,filters,options,computeUnifiedSalesMetrics);
  console.timeEnd(perfLabel);
  salesPerfLog('buildUnifiedSalesTotals',perfStart,{
    source:isAuditRows?'sales_audit_report':'raw-debug',
    sourceRows:model.counts.sourceRows,
    afterMaterialFilter:model.counts.afterMaterialFilter,
    afterSalesWarehouseFilter:model.counts.afterSalesWarehouseFilter,
    afterAllFilters:model.counts.afterAllFilters
  });
  delete model.counts;
  return model;
}async function verifyDashboardProductMapAgainstSalesAudit(filters={},options={}){
  const catalog=await loadSalesReviewCatalog(options.catalogOptions||{});
  const dashboardRows=await fetchUnifiedSalesRows(filters,{...options,source:'sales_audit_report'});
  const dashboardModel=buildUnifiedSalesTotals(dashboardRows,{filters,catalog,source:'sales_audit_report'});
  const auditRows=await fetchAllSalesAuditRows(filters,{ascending:true,orderBy:'material_code'});
  const dashboardMap=new Map();
  Object.values(dashboardModel.productMap||{}).forEach(item=>{
    const code=normalizeMaterialCode(item.code);
    if(!code) return;
    dashboardMap.set(code,{
      material_code:code,
      material_name:item.name||'',
      sales:toNumber(item.sales),
      actualReturn:toNumber(item.actualReturn),
      production:toNumber(item.production),
      outgoing:toNumber(item.outgoing),
      incoming:toNumber(item.incoming),
      loading:toNumber(item.loading)
    });
  });
  const auditMap=new Map();
  (auditRows||[]).forEach(row=>{
    if(!rowMatchesUnifiedSalesFilters(row,filters,catalog)) return;
    const code=normalizeMaterialCode(row.material_code);
    if(!code) return;
    if(!auditMap.has(code)) auditMap.set(code,{material_code:code,material_name:row.material_name||'',sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0});
    const item=auditMap.get(code);
    item.sales+=toNumber(row.sales_quantity);
    item.actualReturn+=toNumber(row.actual_return_quantity);
    item.production+=toNumber(row.production_quantity);
    item.outgoing+=toNumber(row.outgoing_transfer_quantity);
    item.incoming+=toNumber(row.incoming_transfer_quantity);
    item.loading+=toNumber(row.total_loading_quantity);
  });
  const metrics=['sales','actualReturn','production','outgoing','incoming','loading'];
  const codes=[...new Set([...dashboardMap.keys(),...auditMap.keys()])].sort();
  const differences=[];
  codes.forEach(code=>{
    const dashboard=dashboardMap.get(code)||{material_code:code,sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    const audit=auditMap.get(code)||{material_code:code,sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    const diff={material_code:code,material_name:dashboard.material_name||audit.material_name||''};
    let changed=false;
    metrics.forEach(metric=>{
      const delta=(dashboard[metric]||0)-(audit[metric]||0);
      if(Math.abs(delta)>0.000001){
        diff[metric]={dashboard:dashboard[metric]||0,salesAuditReport:audit[metric]||0,difference:delta};
        changed=true;
      }
    });
    if(changed) differences.push(diff);
  });
  const report={
    source:'sales_audit_report',
    filters,
    dashboardProducts:dashboardMap.size,
    salesAuditProducts:auditMap.size,
    differencesCount:differences.length,
    totalsMatch:differences.length===0,
    differences
  };
  console.log('[dashboard-vs-sales-audit-product-verification]',report);
  return report;
}
async function verifySalesAggregationAgainstSalesReviewTable(params={},options={}){
  const date=normalizeDateISO(params.date || params.report_date || activeSalesReportDate || '');
  const warehouse=String(params.warehouse || params.warehouse_code || activeSalesWarehouse || '').trim().toUpperCase();
  if(!date || !warehouse) throw new Error('verifySalesAggregationAgainstSalesReviewTable requires {date, warehouse}.');
  const filters={from:date,to:date,warehouse};
  if(params.plant && params.plant!=='all') filters.plant=params.plant;
  const catalog=await loadSalesReviewCatalog(options.catalogOptions||{});
  const dashboardRows=await fetchUnifiedSalesRows(filters,{...options,source:'sales_audit_report'});
  const dashboardModel=buildUnifiedSalesTotals(dashboardRows,{filters,catalog,source:'sales_audit_report',groups:options.groups||[]});
  let query=WarehouseDB.client
    .from('sales_audit_report')
    .select(SALES_AUDIT_DASHBOARD_SELECT)
    .eq('report_date',date)
    .eq('warehouse_code',warehouse)
    .order('material_code',{ascending:true});
  if(filters.plant) query=query.eq('plant_code',filters.plant);
  const {data,error}=await query;
  if(error) throw error;
  const salesReviewRows=filterSalesReviewRows(data||[],catalog);
  const dashboardMap=new Map();
  Object.values(dashboardModel.productMap||{}).forEach(item=>{
    const code=normalizeMaterialCode(item.code);
    if(!code) return;
    dashboardMap.set(code,{
      material_code:code,
      material_name:item.name||'',
      sales:toNumber(item.sales),
      actualReturn:toNumber(item.actualReturn),
      production:toNumber(item.production),
      outgoing:toNumber(item.outgoing),
      incoming:toNumber(item.incoming),
      loading:toNumber(item.loading)
    });
  });
  const reviewMap=new Map();
  salesReviewRows.forEach(row=>{
    const code=normalizeMaterialCode(row.material_code);
    if(!code) return;
    if(!reviewMap.has(code)) reviewMap.set(code,{material_code:code,material_name:row.material_name||'',sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0});
    const item=reviewMap.get(code);
    item.sales+=toNumber(row.sales_quantity);
    item.actualReturn+=toNumber(row.actual_return_quantity);
    item.production+=toNumber(row.production_quantity);
    item.outgoing+=toNumber(row.outgoing_transfer_quantity);
    item.incoming+=toNumber(row.incoming_transfer_quantity);
    item.loading+=toNumber(row.total_loading_quantity);
  });
  const metrics=['sales','actualReturn','production','outgoing','incoming','loading'];
  const codes=[...new Set([...dashboardMap.keys(),...reviewMap.keys()])].sort();
  const differences=[];
  codes.forEach(code=>{
    const dashboard=dashboardMap.get(code)||{material_code:code,sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    const review=reviewMap.get(code)||{material_code:code,sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0};
    const diff={date,warehouse,material_code:code,material_name:dashboard.material_name||review.material_name||''};
    let changed=false;
    metrics.forEach(metric=>{
      const delta=(dashboard[metric]||0)-(review[metric]||0);
      if(Math.abs(delta)>0.000001){
        diff[metric]={dashboard:dashboard[metric]||0,salesReviewTable:review[metric]||0,difference:delta};
        changed=true;
      }
    });
    if(changed) differences.push(diff);
  });
  const report={
    source:'sales_audit_report',
    date,
    warehouse,
    plant:filters.plant||'all',
    dashboardProducts:dashboardMap.size,
    salesReviewProducts:reviewMap.size,
    differencesCount:differences.length,
    totalsMatch:differences.length===0,
    differences
  };
  console.log('[sales-aggregation-vs-sales-review-table]',report);
  return report;
}
async function fetchAllSalesRawRows(filters={},options={}){
  if(!WarehouseDB?.ready) return [];
  const catalog=options.catalog || await loadSalesReviewCatalog();
  const perfLabel=`fetchAllSalesRawRows ${unifiedSalesRowsCacheKey(filters)} ${catalog.signature||''}`;
  const perfStart=salesPerfNow();
  console.time(perfLabel);
  const pageSize=1000;
  const maxPages=200;
  const ascending=options.ascending===true;
  const all=[];
  const materialQueryCodes=[...new Set(catalog.fallback ? [...SALES_REVIEW_MATERIAL_CODES] : [...(catalog.materialCodes||[])])];
  const warehouseQueryCodes=[...new Set(catalog.fallback ? [...SALES_WAREHOUSES] : [...(catalog.allAllowedWarehouseCodes||[])])];
  if(!materialQueryCodes.length || (!(filters.warehouse && filters.warehouse!=='all') && !warehouseQueryCodes.length)){
    salesPerfLog('fetchAllSalesRawRows-skipped-empty-dynamic-catalog',perfStart,{catalogSource:catalog.source,materialCodes:materialQueryCodes.length,warehouses:warehouseQueryCodes.length});
    console.timeEnd(perfLabel);
    return [];
  }
  const pageDurations=[];
  try{
    for(let page=0; page<maxPages; page++){
      const pageStart=salesPerfNow();
      const from=page*pageSize;
      const to=from+pageSize-1;
      let query=WarehouseDB.client
        .from('sales_raw_transactions')
        .select(SALES_RAW_AUDIT_SELECT)
        .eq('sales_upload_batches.status','active')
        .in('material_code',materialQueryCodes)
        .in('movement_type',SALES_REVIEW_MOVEMENT_TYPES)
        .order('id',{ascending})
        .range(from,to);
      if(filters.from) query=query.gte('sales_upload_batches.report_date',filters.from);
      if(filters.to) query=query.lte('sales_upload_batches.report_date',filters.to);
      if(filters.plant && filters.plant!=='all') query=query.eq('plant_code',filters.plant);
      if(filters.warehouse && filters.warehouse!=='all') query=query.eq('warehouse_code',String(filters.warehouse).toUpperCase());
      else query=query.in('warehouse_code',warehouseQueryCodes);
      const {data,error}=await query;
      if(error) throw error;
      const chunk=(data||[]).map(r=>({
        ...r,
        report_date:salesRowReportDate(r),
        warehouse_name:r.warehouse_name || dashboardWhMeta(r.warehouse_code).name || '',
        uom:r.uom || 'TO'
      }));
      all.push(...chunk);
      pageDurations.push({page:page+1,rows:chunk.length,durationMs:salesPerfMs(pageStart)});
      if(chunk.length<pageSize) break;
    }
    salesReviewEngineDebug(all,catalog,'sales_raw_transactions',filters);
    return filterSalesReviewRows(all,catalog);
  }finally{
    console.timeEnd(perfLabel);
    salesPerfLog('fetchAllSalesRawRows',perfStart,{
      supabaseRows:all.length,
      pages:pageDurations.length,
      pageDurations,
      dbFilters:{
        materialCodes:materialQueryCodes.length,
        catalogMaterialCodes:catalog.materialCodes?.size||0,
        warehouses:(filters.warehouse && filters.warehouse!=='all') ? 1 : warehouseQueryCodes.length,
        catalogWarehouses:catalog.allAllowedWarehouseCodes?.size||0,
        catalogSource:catalog.source,
        movements:SALES_REVIEW_MOVEMENT_TYPES.length
      }
    });
  }
}
async function fetchUnifiedSalesRows(filters={},options={}){
  const catalog=await loadSalesReviewCatalog();
  const source=options.rawDebug===true || options.source==='raw-debug' ? 'raw-debug' : 'sales_audit_report';
  const key=unifiedSalesRowsCacheKey(filters)+'|'+(catalog.signature||'legacy')+'|'+source;
  const perfLabel=`fetchUnifiedSalesRows ${key}`;
  const perfStart=salesPerfNow();
  console.time(perfLabel);
  if(UNIFIED_SALES_ROWS_CACHE.has(key)){
    const rows=UNIFIED_SALES_ROWS_CACHE.get(key);
    salesReviewEngineDebug(rows,catalog,'fetchUnifiedSalesRows cache-hit '+source,filters);
    console.timeEnd(perfLabel);
    salesPerfLog('fetchUnifiedSalesRows cache-hit',perfStart,{cacheKey:key,source,rows:rows.length});
    return rows;
  }
  if(UNIFIED_SALES_ROWS_PENDING.has(key)){
    const rows=await UNIFIED_SALES_ROWS_PENDING.get(key);
    salesReviewEngineDebug(rows,catalog,'fetchUnifiedSalesRows pending-hit '+source,filters);
    console.timeEnd(perfLabel);
    salesPerfLog('fetchUnifiedSalesRows pending-hit',perfStart,{cacheKey:key,source,rows:rows.length});
    return rows;
  }
  const request=source==='raw-debug'
    ? fetchAllSalesRawRows(filters,{...options,catalog})
    : fetchAllSalesAuditRows(filters,options);
  UNIFIED_SALES_ROWS_PENDING.set(key,request);
  try{
    const rows=await request;
    UNIFIED_SALES_ROWS_CACHE.set(key,rows);
    console.timeEnd(perfLabel);
    salesPerfLog('fetchUnifiedSalesRows fetch',perfStart,{cacheKey:key,source,rows:rows.length});
    return rows;
  }finally{
    UNIFIED_SALES_ROWS_PENDING.delete(key);
  }
}
async function loadDashboardRealData(options={}){
  if(!WarehouseDB?.ready) return;
  await ensureDashboardDefaultDate(options);
  updateMobileDashboardPeriodLabel();
  const filters=getDashboardFilters();
  let dashboardRows=[];
  try{
    dashboardRows=await fetchUnifiedSalesRows(filters,{ascending:false});
  }catch(error){
    console.warn('dashboard sales load error',error);
    return;
  }
  const catalog=await loadSalesReviewCatalog();
  const model=buildUnifiedSalesTotals(dashboardRows,{filters,catalog,source:'sales_audit_report'});
  const renderPerfLabel='renderDashboard '+unifiedSalesRowsCacheKey(filters);
  const renderPerfStart=salesPerfNow();
  console.time(renderPerfLabel);
  const sales=model.rows;
  const stats=model.stats;
  const daily=model.daily;
  const plantStats=model.plantStats;
  const warehouseSalesMap=model.warehouseSalesMap;
  const warehouseActivityMap=model.warehouseActivityMap;
  renderDashboardKPIs(stats);
  renderDashboardSummary(stats);
  drawDashboardLine(daily);
  drawDashboardPlantBar(plantStats);
  drawDashboardDonut(Object.entries(warehouseSalesMap).sort((a,b)=>b[1]-a[1]).map(([code,value])=>({label:code+' - '+(dashboardWhMeta(code).name||'مخزن بيع'),value})));
  const products=Object.values(model.productMap);
  renderDashboardPlants(plantStats, stats.salesQty);
  renderDashboardSalesHeatmap(sales, filters);
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
  console.timeEnd(renderPerfLabel);
  salesPerfLog('renderDashboard',renderPerfStart,{rows:sales.length,topProducts:topProducts.length,topWarehouses:topWarehouses.length});
}


function updateFiltersVisibility(section){
  const filters=$('#globalFilters');
  if(!filters) return;
  const visibleSections=['inbound'];
  const shouldShow=visibleSections.includes(section);
  filters.classList.toggle('filters-hidden',!shouldShow);
  filters.setAttribute('aria-hidden',shouldShow?'false':'true');
}
let MOBILE_DASHBOARD_SHELL_BOUND=false;
function currentActiveSection(){
  return $('.section.active-section')?.id || $('.nav-item.active')?.dataset.section || 'dashboard';
}
function updateMobileDashboardState(section){
  const active=section || currentActiveSection();
  const appVisible=!$('#appShell')?.classList.contains('app-hidden');
  const hasSection=!!$('#'+active);
  document.body.classList.toggle('mobile-app-shell-active', appVisible && hasSection);
  document.body.classList.toggle('mobile-dashboard-active', appVisible && active==='dashboard');
  document.body.classList.toggle('mobile-upload-reports-active', appVisible && active==='upload');
  document.body.classList.toggle('mobile-reports-active', appVisible && active==='reports');
  if(active==='dashboard') updateMobileDashboardPeriodLabel();
}
function syncMobileDashboardShellState(){
  updateMobileDashboardState(currentActiveSection());
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
  updateMobileDashboardState(section);
  closeMobileDashboardPanels();
  updateFiltersVisibility(section);
  if(section==='reports') setTimeout(()=>loadExecutiveReport(),50);
  if(section==='users') setTimeout(()=>loadUsersManagement(),50);
  if(section==='permissions') setTimeout(()=>loadPermissionsManagement(),50);
  setTimeout(()=>applyPermissionActionGuards(section),80);
}
function closeMobileDashboardPanels(){
  const drawer=$('#mobileDashboardDrawer');
  const opener=$('.mobile-drawer-open');
  if(drawer && drawer.contains(document.activeElement)){
    opener?.focus({preventScroll:true});
  }
  document.body.classList.remove('mobile-dashboard-filter-open','mobile-dashboard-drawer-open');
  $('#mobileDashboardFilterBtn')?.setAttribute('aria-expanded','false');
  document.querySelectorAll('.mobile-drawer-open').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  $('#mobileDashboardFilterOverlay')?.setAttribute('aria-hidden','true');
  $('#mobileDrawerOverlay')?.setAttribute('aria-hidden','true');
  drawer?.setAttribute('aria-hidden','true');
}
function openMobileDashboardFilters(){
  document.body.classList.add('mobile-dashboard-filter-open');
  document.body.classList.remove('mobile-dashboard-drawer-open');
  $('#mobileDashboardFilterBtn')?.setAttribute('aria-expanded','true');
  $('#mobileDashboardFilterOverlay')?.setAttribute('aria-hidden','false');
}
function openMobileDashboardDrawer(){
  document.body.classList.add('mobile-dashboard-drawer-open');
  document.body.classList.remove('mobile-dashboard-filter-open');
  document.querySelectorAll('.mobile-drawer-open').forEach(btn=>btn.setAttribute('aria-expanded','true'));
  $('#mobileDrawerOverlay')?.setAttribute('aria-hidden','false');
  const drawer=$('#mobileDashboardDrawer');
  drawer?.setAttribute('aria-hidden','false');
  setTimeout(()=>drawer?.querySelector('.mobile-drawer-close,.mobile-drawer-item')?.focus({preventScroll:true}),0);
}
function exportMobileDashboardPng(){
  const dashboard=$('#dashboard');
  if(dashboard) exportDashboardElementAsPng(dashboard,'الشاشة الرئيسية');
}
async function exportMobileKpiGroupPng(){
  const source=$('#kpiCards');
  if(!source) return;
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  const cards=[...source.querySelectorAll('.kpi')].slice(0,5);
  if(!cards.length) return;
  const from=normalizeDateISO($('#dashboardFromDate')?.value || '');
  const to=normalizeDateISO($('#dashboardToDate')?.value || '');
  const periodText=(from && to && from===to)
    ? `تاريخ التقرير: ${formatMobileDashboardDateLabel(from)}`
    : `الفترة: ${formatMobileDashboardDateLabel(from) || 'البداية'} → ${formatMobileDashboardDateLabel(to) || 'النهاية'}`;
  const exportBox=document.createElement('section');
  exportBox.className='mobile-kpi-export-box png-capturing-now';
  exportBox.setAttribute('aria-hidden','true');
  exportBox.style.cssText=[
    'position:fixed',
    'top:0',
    'left:0',
    'z-index:-1',
    'width:820px',
    'box-sizing:border-box',
    'padding:24px',
    'direction:rtl',
    'background:radial-gradient(circle at 50% 0,#07392f 0,#001a15 45%,#00100e 100%)',
    'pointer-events:none',
    'opacity:1',
    'overflow:visible'
  ].join(';');
  const header=document.createElement('header');
  header.style.cssText='display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin:0 0 18px;padding:0 0 16px;border-bottom:1px solid rgba(141,220,89,.22);';
  const title=document.createElement('h2');
  title.textContent='Total Key Stats';
  title.style.cssText='margin:0;color:#f4fff5;font:900 30px/1.2 Cairo,Segoe UI,Tahoma,Arial,sans-serif;text-align:left;direction:ltr;letter-spacing:0;';
  const period=document.createElement('div');
  period.textContent=periodText;
  period.style.cssText='margin-top:4px;color:#bdf29b;font:900 17px/1.45 Cairo,Segoe UI,Tahoma,Arial,sans-serif;text-align:right;white-space:nowrap;';
  header.append(title,period);
  const grid=document.createElement('div');
  grid.className='cards mobile-kpi-export-grid';
  grid.style.cssText='display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:16px!important;width:100%;overflow:visible!important;align-items:stretch;';
  cards.forEach((card,index)=>{
    const clone=card.cloneNode(true);
    clone.querySelectorAll('.widget-png-btn,.mobile-kpi-group-png-btn,.mobile-period-png-btn,.mobile-dashboard-shell,.mobile-dashboard-bottom-nav,.mobile-drawer-overlay,.mobile-side-drawer').forEach(el=>el.remove());
    clone.classList.remove('png-capturing-now');
    clone.style.cssText=[
      index===4 ? 'grid-column:1/-1!important' : 'grid-column:auto!important',
      index===4 ? 'height:178px!important' : 'height:188px!important',
      index===4 ? 'min-height:178px!important' : 'min-height:188px!important',
      'padding:22px!important',
      'border-radius:20px!important',
      'overflow:hidden!important',
      'position:relative!important'
    ].join(';');
    clone.querySelectorAll('*').forEach(child=>{ child.style.animation='none'; child.style.transition='none'; });
    grid.appendChild(clone);
  });
  exportBox.append(header,grid);
  document.body.appendChild(exportBox);
  document.body.classList.add('dashboard-png-exporting');
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const rect=exportBox.getBoundingClientRect();
    if(rect.width<=0 || rect.height<=0){ alert('تعذر تحديد أبعاد صورة المؤشرات.'); return; }
    const width=Math.ceil(exportBox.scrollWidth);
    const height=Math.ceil(exportBox.scrollHeight);
    window.__lastKpiExportBoxSize={width,height,rectWidth:rect.width,rectHeight:rect.height,layout:'2-2-1'};
    if(width<=1 || height<=1){ alert('تعذر تحديد أبعاد صورة المؤشرات.'); return; }
    const canvas=await Html2Canvas(exportBox,{
      scale:2,
      useCORS:true,
      allowTaint:true,
      backgroundColor:'#001a15',
      logging:false,
      scrollX:0,
      scrollY:0,
      windowWidth:width,
      windowHeight:height,
      width,
      height
    });
    canvas.toBlob(async blob=>{
      if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
      await saveBlobWithPicker(blob,`${safeFileName('Total Key Stats')}.png`,'image/png');
    },'image/png',1);
  }catch(err){
    console.error(err);
    alert('تعذر تصدير صورة المؤشرات. حاول مرة أخرى.');
  }finally{
    document.body.classList.remove('dashboard-png-exporting');
    exportBox.remove();
  }
}
function triggerMobileDashboardLogout(){
  closeMobileDashboardPanels();
  $('#topLogoutBtn')?.click();
}
function initMobileDashboardShell(){
  syncMobileDashboardShellState();
  if(MOBILE_DASHBOARD_SHELL_BOUND) return;
  MOBILE_DASHBOARD_SHELL_BOUND=true;
  document.addEventListener('click',event=>{
    const filterBtn=event.target.closest('#mobileDashboardFilterBtn');
    if(filterBtn){
      event.preventDefault();
      openMobileDashboardFilters();
      return;
    }
    if(event.target.closest('#mobileDashboardFilterOverlay,#mobileFilterCloseBtn')){
      event.preventDefault();
      closeMobileDashboardPanels();
      return;
    }
    if(event.target.closest('#mobileDashboardPeriodPngBtn')){
      event.preventDefault();
      exportMobileDashboardPng();
      return;
    }
    if(event.target.closest('#mobileKpiGroupPngBtn')){
      event.preventDefault();
      exportMobileKpiGroupPng();
      return;
    }
    if(event.target.closest('#mobileDashboardLogoutBtn')){
      event.preventDefault();
      triggerMobileDashboardLogout();
      return;
    }
    const drawerBtn=event.target.closest('.mobile-drawer-open');
    if(drawerBtn){
      event.preventDefault();
      openMobileDashboardDrawer();
      return;
    }
    if(event.target.closest('#mobileDrawerOverlay,.mobile-drawer-close')){
      event.preventDefault();
      closeMobileDashboardPanels();
      return;
    }
    const drawerItem=event.target.closest('.mobile-drawer-item[data-mobile-section]');
    if(drawerItem){
      event.preventDefault();
      const section=drawerItem.dataset.mobileSection;
      if(section) switchSection(section);
      closeMobileDashboardPanels();
    }
  });
  window.addEventListener('resize',syncMobileDashboardShellState);
}
function initMobileDashboardControls(){
  initMobileDashboardShell();
}
function nav(){
  $$('.nav-item').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));
  const active=$('.nav-item.active')?.dataset.section || 'dashboard';
  updateMobileDashboardState(active);
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
function renderAll(){renderPlants();renderTables();renderTabs()}
document.addEventListener('DOMContentLoaded',()=>{setDefaultDates();startCairoClock();dbBadge();initFilters();initDashboardFilters();renderModernSidebarIcons();nav();initMobileDashboardShell();initSidebarToggle();initLoginPasswordToggle();initReportExportButtons();renderAll()});

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
    if(!error) await logSystemActivity('المستخدمين','تسجيل دخول',`تسجيل دخول: ${email}`);
  };
  logoutBtn.onclick=async()=>{ await logSystemActivity('المستخدمين','تسجيل خروج',`تسجيل خروج: ${CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || 'المستخدم الحالي'}`); await WarehouseDB.signOut(); updateAuthStatus(); };
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
      worker_group: String(getRowValue(normalized,['مجموعة التعبئة و التحميل','مجموعة التعبئة والتحميل','مجموعة التعبئه و التحميل','مجموعة التعبئه والتحميل','مجموعه التعبئة و التحميل','مجموعه التعبئة والتحميل','مجموعه التعبئه و التحميل','مجموعه التعبئه والتحميل','مجموعة التحقق و التحميل','مجموعة التحقق والتحمبل','مجموعة العمال','مجموعه العمال','Worker Group','Workers Group','Labor Group'])).trim(),
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
      purchase_order: String(getRowValue(normalized,['Purchasing Document','Purchase Order','PO','أمر الشراء','رقم أمر الشراء'])).trim(),
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
function normalizeIncomingMatchKeyPart(value){
  const raw=stripHiddenUnicode(value)
    .trim()
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g,'')
    .replace(/[٬،,]/g,'');
  if(!raw) return '';
  const normalizedNumber=raw.replace(/\.0+$/,'');
  if(/^\d+$/.test(normalizedNumber)) return normalizedNumber.replace(/^0+(?=\d)/,'') || '0';
  return raw.toLowerCase();
}
function incomingAuditMatchKey(row){
  return [row?.material_code,row?.purchase_order,row?.vehicle_number].map(normalizeIncomingMatchKeyPart).join('|');
}
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
    const key=incomingAuditMatchKey(s);
    if(!scaleIndex.has(key)) scaleIndex.set(key,[]);
    scaleIndex.get(key).push(s);
  });
  const movementGroupIndex=new Map();
  incomingRows.forEach(row=>{
    const key=incomingAuditMatchKey(row);
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
    const key=incomingAuditMatchKey(r);
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
      clearUnifiedSalesRowsCache();
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
    clearUnifiedSalesRowsCache();
    activeSalesReportDate=reportDate;
    status.textContent=`تم رفع ${payload.length} سطر بنجاح لتاريخ ${reportDate}.`;
    status.className='upload-status ok';
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير مراجعة البيع بتاريخ ${reportDate} (${payload.length} حركة)`);
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
    clearUnifiedSalesRowsCache();
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير مراجعة البيع بتاريخ ${date}`);
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
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير MB51 بتاريخ ${reportDate} (${payload.length} حركة)`);
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
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير MB51 بتاريخ ${date}`);
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
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير الميزان بتاريخ ${reportDate} (${payload.length} حركة)`);
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
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير الميزان بتاريخ ${date}`);
    await loadScaleBatches();
    await refreshInboundReportDates();
    await loadInboundAuditReport();
  }
}

function initMobileUploadReportUI(){
  const select=$('#mobileUploadReportType');
  if(select){
    select.addEventListener('change',()=>{
      const tab=document.querySelector(`.upload-report-tab[data-upload-tab="${select.value}"]`);
      if(tab) tab.click();
    });
    document.addEventListener('click',e=>{
      const tab=e.target.closest('.upload-report-tab[data-upload-tab]');
      if(tab && select.value!==tab.dataset.uploadTab) select.value=tab.dataset.uploadTab;
    });
  }
  const setMeta=(meta,file)=>{
    if(!meta) return;
    if(!file){ meta.classList.remove('has-file'); meta.innerHTML=''; return; }
    meta.classList.add('has-file');
    meta.innerHTML=`<b>✔ تم اختيار الملف</b><span>${escapeHtml(file.name)}</span><small>${formatFileSize(file.size)}</small>`;
  };
  const items=[
    ['salesExcelInput','salesDropZone','salesMobileFileMeta'],
    ['incomingExcelInput','incomingDropZone','incomingMobileFileMeta'],
    ['scaleExcelInput','scaleDropZone','scaleMobileFileMeta'],
    ['freightExcelInput','freightDropZone','freightMobileFileMeta']
  ];
  items.forEach(([inputId,dropId,metaId])=>{
    const input=$('#'+inputId), drop=$('#'+dropId), meta=$('#'+metaId);
    if(input) input.addEventListener('change',()=>setMeta(meta,input.files?.[0]));
    if(drop) drop.addEventListener('drop',e=>setMeta(meta,e.dataTransfer?.files?.[0]));
  });
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
    await logSystemActivity('التقارير','رفع تقرير',`رفع تقرير النولون بتاريخ ${referenceDate} (${payload.length} صف)`);
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
     <button class="small-action delete" data-action="delete" data-id="${b.id}" data-date="${normalizeDateISO(b.reference_date)}">حذف</button>`
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
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير النولون بتاريخ ${btn.dataset.date || '-'}`);
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
  const catalog=await loadSalesReviewCatalog();
  const rows=filterSalesReviewRows(data||[],catalog).map(r=>[
    r.material_code,
    r.material_name,
    r.uom,
    fmt(r.sales_quantity),
    fmt(r.actual_return_quantity),
    fmt(r.production_quantity),
    fmt(r.outgoing_transfer_quantity),
    fmt(r.incoming_transfer_quantity),
    fmt(r.total_loading_quantity)
  ]);
  table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','مرتجع فعلي','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],rows);
}
renderTabs = function(){
  $('#salesTabs').innerHTML=SALES_WAREHOUSES.map((w,i)=>`<button class="${i===0?'active':''}" data-warehouse="${w}">${w}</button>`).join('');
  $$('#salesTabs button').forEach(btn=>btn.onclick=()=>{ $$('#salesTabs button').forEach(b=>b.classList.remove('active')); btn.classList.add('active'); loadSalesReport(btn.dataset.warehouse); });
  if($('#inboundTabs')) $('#inboundTabs').innerHTML=getPlantsCatalog().map((p,i)=>`<button class="${i===0?'active':''}">${p.code} - ${p.name}</button>`).join('');
};
renderTables = function(){
  table('#movementsTable',['كود الحركة','وصف SAP','التصنيف','تعريف الحركة','الأثر على الرصيد'],APP_DATA.movements.map(m=>[m[0],m[1],m[2],m[3],m[4]==='in'?'تضيف رصيد':'تخصم من الرصيد']));
  table('#salesTable',['كود المادة','وصف المادة','وحدة القياس','كمية البيع','مرتجع فعلي','الإنتاج','التحويلات الصادرة','التحويلات الواردة','إجمالي التحميل'],[]);
  table('#inboundTable',['المصنع','المخزن','كود المادة','وصف المادة','وحدة القياس','الوارد','الإلغاء','الصافي'],APP_DATA.inboundReviewSample);
};
document.addEventListener('DOMContentLoaded',()=>{initAuthPanel();initMobileUploadReportUI();initSalesUploader();initIncomingUploader();initScaleUploader();initFreightUploader();refreshInboundReportDates();setTimeout(()=>{loadSalesReport(activeSalesWarehouse);loadInboundAuditReport();loadDashboardRealData();},300);});

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
  syncMobileDashboardShell(profile);
}
function syncMobileDashboardShell(profile){
  const name=profile?.full_name || profile?.email || 'مستخدم';
  const job=profile?.job_title || profile?.role || 'مستخدم';
  if($('#mobileDashboardUserName')) $('#mobileDashboardUserName').textContent=name;
  if($('#mobileDashboardUserRole')) $('#mobileDashboardUserRole').textContent=job;
  paintAvatar($('#mobileDashboardAvatar'), profile);
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
function fillSettingsAccountPanel(profile,user){
  const role=profile?.role || (isSystemOwnerEmail(user?.email) ? 'super_admin' : 'authenticated');
  if($('#settingsUserEmail')) $('#settingsUserEmail').value=user?.email || profile?.email || '';
  if($('#settingsUserName')) $('#settingsUserName').value=profile?.full_name || user?.email || '';
  if($('#settingsUserRole')) $('#settingsUserRole').value=(USER_ROLE_LABELS?.[role] || role || '');
}
function setPasswordChangeStatus(message,type=''){
  const status=$('#passwordChangeStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function validatePasswordChangeFields(currentPassword,newPassword,confirmPassword){
  if(!currentPassword) return 'كلمة المرور الحالية غير صحيحة.';
  if((newPassword||'').length<7) return 'كلمة المرور الجديدة يجب ألا تقل عن 7 خانات.';
  if(/\s/.test(newPassword||'') || /\s/.test(confirmPassword||'')) return 'لا يسمح بوجود مسافات داخل كلمة المرور.';
  if(newPassword!==confirmPassword) return 'كلمة المرور الجديدة وتأكيدها غير متطابقتين.';
  return '';
}
function clearPasswordChangeFields(){
  ['currentPasswordInput','newPasswordInput','confirmPasswordInput'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
}
function createTemporaryPasswordAuthClient(){
  const cfg=window.WAREHOUSE_SUPABASE_CONFIG || {};
  if(!window.supabase || !cfg.url || !cfg.anonKey) return null;
  return window.supabase.createClient(cfg.url,cfg.anonKey,{
    auth:{
      persistSession:false,
      autoRefreshToken:false,
      detectSessionInUrl:false,
      storageKey:'temporary-password-check'
    }
  });
}
function snapshotLocalStorageForPasswordCheck(){
  if(typeof localStorage==='undefined') return '';
  const snapshot={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(key) snapshot[key]=localStorage.getItem(key);
  }
  return JSON.stringify(snapshot);
}
function summarizeAuthSessionResult(result){
  const session=result?.data?.session || null;
  return {
    session:session ? 'present' : null,
    hasAccessToken:Boolean(session?.access_token),
    hasUser:Boolean(session?.user),
    userId:session?.user?.id || null,
    userEmail:session?.user?.email || null,
    expiresAt:session?.expires_at || null,
    error:result?.error?.message || null
  };
}
async function getAuthSessionSummary(client){
  if(!client?.auth?.getSession) return {session:null,hasAccessToken:false,hasUser:false,error:'Auth client is not ready'};
  try{
    return summarizeAuthSessionResult(await client.auth.getSession());
  }catch(err){
    return {session:null,hasAccessToken:false,hasUser:false,error:err?.message || String(err)};
  }
}
async function logPasswordAuthSessionComparison(label,tempClient){
  const [mainSession,tempSession]=await Promise.all([
    getAuthSessionSummary(WarehouseDB?.client),
    getAuthSessionSummary(tempClient)
  ]);
  console.info('[password-check] '+label,{
    'Main Client Session':mainSession,
    'Temporary Client Session':tempSession
  });
  return {mainSession,tempSession};
}
async function verifyCurrentPasswordWithTemporaryClient(email,password){
  const mainClientBefore=WarehouseDB?.client || null;
  const localStorageBefore=snapshotLocalStorageForPasswordCheck();
  let tempClient=createTemporaryPasswordAuthClient();
  if(!tempClient) return {error:new Error('Supabase config is not ready')};
  await logPasswordAuthSessionComparison('before temporary verify',tempClient);
  try{
    const {error}=await tempClient.auth.signInWithPassword({email,password});
    await logPasswordAuthSessionComparison('after temporary verify',tempClient);
    return {error};
  }finally{
    try{ await tempClient.auth.signOut({scope:'local'}); }catch(_){}
    await logPasswordAuthSessionComparison('after temporary local signOut',tempClient);
    tempClient=null;
    const localStorageUnchanged=localStorageBefore===snapshotLocalStorageForPasswordCheck();
    const warehouseClientUnchanged=mainClientBefore===(WarehouseDB?.client || null);
    console.info('[password-check] temporary client isolation',{localStorageUnchanged,warehouseClientUnchanged,temporarySignOutScope:'local'});
  }
}
async function handlePasswordChangeSubmit(e){
  e.preventDefault();
  if(!hasPermission('settings_account','edit')){ alert('غير متاح للصلاحية الحالية'); return; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.email){ setPasswordChangeStatus('سجل الدخول أولاً.','err'); return; }
  const currentPassword=$('#currentPasswordInput')?.value || '';
  const newPassword=$('#newPasswordInput')?.value || '';
  const confirmPassword=$('#confirmPasswordInput')?.value || '';
  const validationMessage=validatePasswordChangeFields(currentPassword,newPassword,confirmPassword);
  if(validationMessage){ setPasswordChangeStatus(validationMessage,'err'); return; }
  setPasswordChangeStatus('جاري التحقق من كلمة المرور الحالية...');
  try{
    const verify=await verifyCurrentPasswordWithTemporaryClient(CURRENT_AUTH_USER.email,currentPassword);
    if(verify?.error){ setPasswordChangeStatus('كلمة المرور الحالية غير صحيحة.','err'); return; }
    setPasswordChangeStatus('جاري تغيير كلمة المرور...');
    const mainSessionBeforeUpdate=await WarehouseDB.client.auth.getSession();
    console.info('[password-change] WarehouseDB.client.auth.getSession() before updateUser',summarizeAuthSessionResult(mainSessionBeforeUpdate));
    if(mainSessionBeforeUpdate?.error || !mainSessionBeforeUpdate?.data?.session?.access_token){
      setPasswordChangeStatus('جلسة الدخول غير صالحة. سجل الدخول مرة أخرى.','err');
      return;
    }
    const {data,error}=await WarehouseDB.client.auth.updateUser({password:newPassword});
    if(error) throw error;
    if(data?.user) CURRENT_AUTH_USER=data.user;
    clearPasswordChangeFields();
    setPasswordChangeStatus('تم تغيير كلمة المرور بنجاح.','ok');
    await logSystemActivity('المستخدمين','تغيير كلمة المرور',`تغيير كلمة المرور: ${CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || 'المستخدم الحالي'}`);
  }catch(err){
    setPasswordChangeStatus('تعذر تغيير كلمة المرور: '+(err.message || err),'err');
  }
}

const DEFAULT_SYSTEM_SETTINGS={
  show_decimals:false,
  show_zero_values:true,
  color_max_value:true,
  color_min_value:true,
  show_averages:false,
  export_png_quality:'high',
  export_pdf_orientation:'portrait',
  export_paper_size:'a4',
  cache_retention_minutes:'10',
  auto_refresh:false,
  refresh_interval:'manual',
  notify_upload_complete:true,
  notify_audit_errors:true,
  notify_data_load_complete:false
};
let APP_SYSTEM_SETTINGS={...DEFAULT_SYSTEM_SETTINGS};
let SYSTEM_SETTINGS_LOADED_USER_ID=null;
function setSystemSettingsStatus(message,type=''){
  const status=$('#systemSettingsStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function getSystemSettingElement(id){return document.getElementById(id);}
function setSystemCheckbox(id,value){const el=getSystemSettingElement(id); if(el) el.checked=Boolean(value);}
function setSystemSelect(id,value){const el=getSystemSettingElement(id); if(el) el.value=String(value ?? '');}
function fillSystemSettingsForm(settings={}){
  const merged={...DEFAULT_SYSTEM_SETTINGS,...settings};
  APP_SYSTEM_SETTINGS=merged;
  setSystemCheckbox('showDecimalsSetting',merged.show_decimals);
  setSystemCheckbox('showZeroValuesSetting',merged.show_zero_values);
  setSystemCheckbox('colorMaxValueSetting',merged.color_max_value);
  setSystemCheckbox('colorMinValueSetting',merged.color_min_value);
  setSystemCheckbox('showAveragesSetting',merged.show_averages);
  setSystemSelect('exportPngQualitySetting',merged.export_png_quality);
  setSystemSelect('exportPdfOrientationSetting',merged.export_pdf_orientation);
  setSystemSelect('exportPaperSizeSetting',merged.export_paper_size);
  setSystemSelect('cacheRetentionSetting',merged.cache_retention_minutes);
  setSystemCheckbox('autoRefreshSetting',merged.auto_refresh);
  setSystemSelect('refreshIntervalSetting',merged.refresh_interval);
  setSystemCheckbox('notifyUploadCompleteSetting',merged.notify_upload_complete);
  setSystemCheckbox('notifyAuditErrorsSetting',merged.notify_audit_errors);
  setSystemCheckbox('notifyDataLoadCompleteSetting',merged.notify_data_load_complete);
}
function readSystemSettingsForm(){
  const checked=id=>Boolean(getSystemSettingElement(id)?.checked);
  const value=id=>getSystemSettingElement(id)?.value || '';
  return {
    show_decimals:checked('showDecimalsSetting'),
    show_zero_values:checked('showZeroValuesSetting'),
    color_max_value:checked('colorMaxValueSetting'),
    color_min_value:checked('colorMinValueSetting'),
    show_averages:checked('showAveragesSetting'),
    export_png_quality:value('exportPngQualitySetting') || DEFAULT_SYSTEM_SETTINGS.export_png_quality,
    export_pdf_orientation:value('exportPdfOrientationSetting') || DEFAULT_SYSTEM_SETTINGS.export_pdf_orientation,
    export_paper_size:value('exportPaperSizeSetting') || DEFAULT_SYSTEM_SETTINGS.export_paper_size,
    cache_retention_minutes:value('cacheRetentionSetting') || DEFAULT_SYSTEM_SETTINGS.cache_retention_minutes,
    auto_refresh:checked('autoRefreshSetting'),
    refresh_interval:value('refreshIntervalSetting') || DEFAULT_SYSTEM_SETTINGS.refresh_interval,
    notify_upload_complete:checked('notifyUploadCompleteSetting'),
    notify_audit_errors:checked('notifyAuditErrorsSetting'),
    notify_data_load_complete:checked('notifyDataLoadCompleteSetting')
  };
}
async function loadSystemSettings(){
  fillSystemSettingsForm(APP_SYSTEM_SETTINGS);
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  try{
    const {data,error}=await WarehouseDB.client
      .from('system_settings')
      .select('settings')
      .eq('user_id',CURRENT_AUTH_USER.id)
      .maybeSingle();
    if(error) throw error;
    fillSystemSettingsForm(data?.settings || DEFAULT_SYSTEM_SETTINGS);
    SYSTEM_SETTINGS_LOADED_USER_ID=CURRENT_AUTH_USER.id;
  }catch(err){
    setSystemSettingsStatus('\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645: '+(err.message||err),'err');
  }
}
async function ensureSystemSettingsLoaded(){
  if(SYSTEM_SETTINGS_LOADED_USER_ID && SYSTEM_SETTINGS_LOADED_USER_ID===CURRENT_AUTH_USER?.id) return;
  await loadSystemSettings();
}
async function saveSystemSettings(e){
  e?.preventDefault();
  if(!hasPermission('settings_system','edit')){ setSystemSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){ setSystemSettingsStatus('\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u062D\u0641\u0638 \u0627\u0644\u0625\u0639\u062F\u0627\u062F\u0627\u062A.','err'); return; }
  const settings=readSystemSettingsForm();
  setSystemSettingsStatus('\u062C\u0627\u0631\u064A \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645...');
  try{
    const payload={user_id:CURRENT_AUTH_USER.id,settings};
    const {data,error}=await WarehouseDB.client
      .from('system_settings')
      .upsert(payload,{onConflict:'user_id'})
      .select('settings')
      .maybeSingle();
    if(error) throw error;
    fillSystemSettingsForm(data?.settings || settings);
    SYSTEM_SETTINGS_LOADED_USER_ID=CURRENT_AUTH_USER.id;
    setSystemSettingsStatus('\u062A\u0645 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','تعديل إعدادات النظام','تعديل إعدادات النظام');
  }catch(err){
    setSystemSettingsStatus('\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u0625\u0639\u062F\u0627\u062F\u0627\u062A \u0627\u0644\u0646\u0638\u0627\u0645: '+(err.message||err),'err');
  }
}
function initSystemSettings(){
  fillSystemSettingsForm(DEFAULT_SYSTEM_SETTINGS);
  $('#systemSettingsForm')?.addEventListener('submit',saveSystemSettings);
  $('#clearSystemCacheBtn')?.addEventListener('click',()=>{
    if(typeof clearUnifiedSalesRowsCache==='function'){
      clearUnifiedSalesRowsCache();
      setSystemSettingsStatus('\u062A\u0645 \u0645\u0633\u062D \u0627\u0644\u0643\u0627\u0634.','ok');
      return;
    }
    setSystemSettingsStatus('\u0644\u0627 \u062A\u0648\u062C\u062F \u062F\u0627\u0644\u0629 \u0645\u0633\u062D \u0643\u0627\u0634 \u062C\u0627\u0647\u0632\u0629.','err');
  });
}


const SETTINGS_TABLE_CONTROLS=new Map();
function settingsTableCellText(cell){
  if(!cell) return '';
  const controls=[...cell.querySelectorAll('input,select,textarea')].map(el=>{
    if(el.tagName==='SELECT') return [el.value,el.options[el.selectedIndex]?.textContent||''].join(' ');
    if(el.type==='checkbox') return el.checked ? 'true نعم نشط' : 'false لا غير نشط';
    return el.value||'';
  }).join(' ');
  return (controls+' '+(cell.textContent||'')).replace(/\s+/g,' ').trim();
}
function settingsTableRowText(row){
  return [...(row?.cells||[])].map(settingsTableCellText).join(' ').toLowerCase();
}
function ensureSettingsTableFilterRow(table,state){
  const thead=table.tHead;
  if(!thead || !thead.rows.length) return;
  if(thead.querySelector('.settings-table-filter-row')) return;
  const headerCells=[...thead.rows[0].cells];
  const filterRow=document.createElement('tr');
  filterRow.className='settings-table-filter-row';
  filterRow.innerHTML=headerCells.map((th,idx)=>{
    const label=(th.textContent||'').replace(/\s+/g,' ').trim() || 'بحث';
    return `<th><input class="settings-table-col-filter" data-settings-col="${idx}" placeholder="${escapeHtml(label)}" /></th>`;
  }).join('');
  thead.appendChild(filterRow);
}
function settingsTableSortValue(row,colIndex){
  const text=settingsTableCellText(row.cells[colIndex]);
  const numeric=Number(String(text).replace(/,/g,''));
  return Number.isFinite(numeric) && String(text).trim()!=='' ? numeric : text.toLowerCase();
}
function applySettingsTableControls(tableId){
  const table=document.getElementById(tableId);
  const state=SETTINGS_TABLE_CONTROLS.get(tableId);
  if(!table || !state) return;
  ensureSettingsTableFilterRow(table,state);
  const tbody=table.tBodies[0];
  if(!tbody) return;
  const rows=[...tbody.rows];
  if(state.sortCol!=null){
    const dir=state.sortDir==='asc' ? 1 : -1;
    rows.sort((a,b)=>{
      const av=settingsTableSortValue(a,state.sortCol);
      const bv=settingsTableSortValue(b,state.sortCol);
      if(typeof av==='number' && typeof bv==='number') return (av-bv)*dir;
      return String(av).localeCompare(String(bv),'ar',{numeric:true,sensitivity:'base'})*dir;
    }).forEach(row=>tbody.appendChild(row));
  }
  const filters=state.filters||{};
  const global=(state.globalSearch||'').trim().toLowerCase();
  [...tbody.rows].forEach(row=>{
    if(row.querySelector('.empty-row')){ row.style.display=''; return; }
    const globalMatch=!global || settingsTableRowText(row).includes(global);
    const colsMatch=Object.entries(filters).every(([idx,value])=>{
      const q=String(value||'').trim().toLowerCase();
      return !q || settingsTableCellText(row.cells[Number(idx)]).toLowerCase().includes(q);
    });
    row.style.display=globalMatch && colsMatch ? '' : 'none';
  });
}
function refreshSettingsTableControls(tableId){ applySettingsTableControls(tableId); }
function initSettingsTableControls(tableId,options={}){
  const table=document.getElementById(tableId);
  if(!table || SETTINGS_TABLE_CONTROLS.has(tableId)) return;
  const state={globalSearch:'',filters:{},sortCol:null,sortDir:'asc',...options};
  SETTINGS_TABLE_CONTROLS.set(tableId,state);
  const wrap=table.closest('.table-wrap') || table.parentElement;
  if(wrap && !document.getElementById(`${tableId}GlobalSearch`)){
    const toolbar=document.createElement('div');
    toolbar.className='settings-table-controls glass-soft';
    toolbar.innerHTML=`<div class="users-search-box settings-table-search-box"><span>🔍</span><input id="${tableId}GlobalSearch" type="search" placeholder="بحث عام داخل الجدول..." /></div>`;
    wrap.parentElement?.insertBefore(toolbar,wrap);
    toolbar.querySelector('input')?.addEventListener('input',e=>{
      state.globalSearch=e.target.value||'';
      applySettingsTableControls(tableId);
    });
  }
  ensureSettingsTableFilterRow(table,state);
  table.addEventListener('click',e=>{
    const th=e.target.closest('thead tr:first-child th');
    if(!th || !table.contains(th)) return;
    const col=[...th.parentElement.children].indexOf(th);
    if(col<0) return;
    state.sortDir=state.sortCol===col && state.sortDir==='asc' ? 'desc' : 'asc';
    state.sortCol=col;
    table.querySelectorAll('thead tr:first-child th').forEach((h,i)=>{
      h.classList.toggle('settings-sort-active',i===col);
      h.dataset.sortDir=i===col ? state.sortDir : '';
    });
    applySettingsTableControls(tableId);
  });
  table.addEventListener('input',e=>{
    const input=e.target.closest('.settings-table-col-filter');
    if(!input) return;
    state.filters[input.dataset.settingsCol]=input.value||'';
    applySettingsTableControls(tableId);
  });
  applySettingsTableControls(tableId);
}
function initAllSettingsTableControls(){
  initSettingsTableControls('plantsSettingsTable');
  initSettingsTableControls('warehousesSettingsTable');
  initSettingsTableControls('salesProductsSettingsTable');
}

const SETTINGS_TAB_PERMISSION_MAP={
  profile:'settings_profile',
  account:'settings_account',
  system:'settings_system',
  'plants-settings':'settings_plants',
  'warehouses-settings':'settings_warehouses',
  'sales-products-settings':'settings_sales_products',
  'activity-log':'settings_activity_log'
};
function canViewSettingsTab(key){
  return hasPermission(SETTINGS_TAB_PERMISSION_MAP[key]||'settings','view');
}
function setElementsDisabled(selector,disabled,hide=false){
  $$(selector).forEach(el=>{
    el.disabled=!!disabled;
    el.classList.toggle('permission-disabled',!!disabled);
    if(hide) el.classList.toggle('permission-hidden',!!disabled);
    if(disabled) el.title='غير متاح للصلاحية الحالية';
  });
}
function applySettingsSubPermissions(){
  const root=$('#settings');
  if(!root) return;
  const tabs=[...root.querySelectorAll('[data-settings-tab]')];
  const panels=[...root.querySelectorAll('[data-settings-panel]')];
  tabs.forEach(tab=>{
    const allowed=canViewSettingsTab(tab.dataset.settingsTab);
    tab.hidden=!allowed;
    tab.disabled=!allowed;
  });
  panels.forEach(panel=>{
    const allowed=canViewSettingsTab(panel.dataset.settingsPanel);
    if(!allowed) panel.classList.remove('active');
  });
  const activeTab=tabs.find(tab=>tab.classList.contains('active') && !tab.hidden);
  if(!activeTab){
    const first=tabs.find(tab=>!tab.hidden);
    if(first) first.click();
  }

  setElementsDisabled('#saveProfileBtn,#profileForm input',!hasPermission('settings_profile','edit'));
  setElementsDisabled('#savePasswordBtn,#passwordChangeForm input,#passwordChangeForm button',!hasPermission('settings_account','edit'));
  setElementsDisabled('#systemSettingsForm input,#systemSettingsForm select,#saveSystemSettingsBtn,#clearSystemCacheBtn',!hasPermission('settings_system','edit'));

  const canAddPlants=hasPermission('settings_plants','add');
  const canEditPlants=hasPermission('settings_plants','edit');
  setElementsDisabled('#plantSettingsForm input,#addPlantBtn',!canAddPlants,true);
  setElementsDisabled('#plantsSettingsTable .plant-name-edit,#plantsSettingsTable .plant-active-edit,#plantsSettingsTable .plant-sort-edit,#plantsSettingsTable [data-action="save-plant"]',!canEditPlants,true);

  const canAddWarehouses=hasPermission('settings_warehouses','add');
  const canEditWarehouses=hasPermission('settings_warehouses','edit');
  setElementsDisabled('#warehouseSettingsForm input,#warehouseSettingsForm select,#addWarehouseBtn',!canAddWarehouses,true);
  setElementsDisabled('#warehousesSettingsTable input,#warehousesSettingsTable select,#warehousesSettingsTable [data-action="save-warehouse"]',!canEditWarehouses,true);

  const canAddProducts=hasPermission('settings_sales_products','add');
  const canEditProducts=hasPermission('settings_sales_products','edit');
  const canViewLinks=hasPermission('settings_sales_product_warehouses','view');
  const canEditLinks=hasPermission('settings_sales_product_warehouses','add') || hasPermission('settings_sales_product_warehouses','delete');
  setElementsDisabled('#salesProductSettingsForm input,#addSalesProductBtn',!canAddProducts,true);
  setElementsDisabled('#selectSalesProductWarehousesBeforeAddBtn',!canAddProducts || !canViewLinks,true);
  setElementsDisabled('#salesProductsSettingsTable .sales-product-name-edit,#salesProductsSettingsTable .sales-product-unit-edit,#salesProductsSettingsTable .sales-product-use-edit,#salesProductsSettingsTable .sales-product-active-edit,#salesProductsSettingsTable .sales-product-sort-edit,#salesProductsSettingsTable [data-action="save-sales-product"]',!canEditProducts,true);
  setElementsDisabled('#salesProductsSettingsTable [data-action="sales-product-warehouses"]',!canViewLinks,true);
  setElementsDisabled('#salesProductWarehousesList input,#saveSalesProductWarehousesBtn',!canEditLinks,true);

  setElementsDisabled('#activityLogExportExcelBtn',!hasPermission('settings_activity_log','export_excel'),true);
  setElementsDisabled('#activityLogExportPdfBtn',!hasPermission('settings_activity_log','export_pdf'),true);
}
let PLANTS_SETTINGS_LOADED=false;
let PLANTS_SETTINGS_ROWS=[];
function setPlantsSettingsStatus(message,type=''){
  const status=$('#plantsSettingsStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function normalizePlantSettingsCode(value){return String(value||'').trim().toUpperCase();}
function parsePlantActiveValue(value){
  if(value===true || value===1) return true;
  if(value===false || value===0 || value==null) return false;
  return String(value).trim().toLowerCase()==='true';
}
function renderPlantsSettingsTable(rows=[]){
  const tbody=$('#plantsSettingsTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="5" class="empty-row">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u0635\u0627\u0646\u0639 \u0645\u062D\u0641\u0648\u0638\u0629.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const id=escapeHtml(row.id||'');
    const code=escapeHtml(row.plant_code||'');
    const name=escapeHtml(row.plant_name||'');
    const sort=Number(row.sort_order||0);
    const active=parsePlantActiveValue(row.is_active);
    const statusText=active?'\u0646\u0634\u0637':'\u063A\u064A\u0631 \u0646\u0634\u0637';
    const statusClass=active?'plant-status-active':'plant-status-inactive';
    return '<tr data-plant-id="'+id+'" data-plant-code="'+code+'">'
      +'<td><span class="plant-code-readonly">'+code+'</span></td>'
      +'<td><input type="text" class="plant-name-edit" value="'+name+'" /></td>'
      +'<td><select class="plant-active-edit"><option value="true" '+(active?'selected':'')+'>\u0646\u0634\u0637</option><option value="false" '+(!active?'selected':'')+'>\u063A\u064A\u0631 \u0646\u0634\u0637</option></select><div class="'+statusClass+'">'+statusText+'</div></td>'
      +'<td><input type="number" class="plant-sort-edit" value="'+sort+'" step="1" /></td>'
      +'<td><div class="plant-row-actions"><button class="secondary save-plant-row-btn" type="button" data-action="save-plant">\u062D\u0641\u0638</button></div></td>'
      +'</tr>';
  }).join('');
  refreshSettingsTableControls('plantsSettingsTable');
  applySettingsSubPermissions();
}
async function fetchPlantsSettingsRowsDirect(){
  return WarehouseDB.client
    .from('plants')
    .select('id,plant_code,plant_name,is_active,sort_order',{count:'exact'})
    .order('sort_order',{ascending:true})
    .order('plant_code',{ascending:true});
}
async function fetchPlantSettingsRowDirect(plantCode){
  return WarehouseDB.client
    .from('plants')
    .select('id,plant_code,plant_name,is_active,sort_order,updated_at,updated_by',{count:'exact'})
    .eq('plant_code',plantCode);
}
function applyVerifiedPlantSettingsRow(verifiedRow, rows=[]){
  const code=normalizePlantSettingsCode(verifiedRow?.plant_code);
  if(!code) return rows;
  let found=false;
  const merged=(rows||[]).map(row=>{
    if(normalizePlantSettingsCode(row.plant_code)!==code) return row;
    found=true;
    return {...row,...verifiedRow};
  });
  if(!found) merged.push(verifiedRow);
  return merged.sort((a,b)=>(Number(a.sort_order||0)-Number(b.sort_order||0)) || String(a.plant_code||'').localeCompare(String(b.plant_code||'')));
}
async function loadPlantsSettings(){
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  setPlantsSettingsStatus('\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u0646\u0639...');
  try{
    const {data,error}=await fetchPlantsSettingsRowsDirect();
    if(error) throw error;
    PLANTS_SETTINGS_ROWS=data || [];
    PLANTS_SETTINGS_LOADED=true;
    renderPlantsSettingsTable(PLANTS_SETTINGS_ROWS);
    setPlantsSettingsStatus('\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u0646\u0639.','ok');
  }catch(err){
    PLANTS_SETTINGS_LOADED=false;
  ACTIVITY_LOG_STATE.loaded=false;
    PLANTS_SETTINGS_ROWS=[];
    renderPlantsSettingsTable([]);
    setPlantsSettingsStatus('\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u0635\u0627\u0646\u0639: '+(err.message||err),'err');
  }
}
async function ensurePlantsSettingsLoaded(){
  if(PLANTS_SETTINGS_LOADED) return;
  await loadPlantsSettings();
}
function clearPlantSettingsForm(){
  if($('#plantCodeInput')) $('#plantCodeInput').value='';
  if($('#plantNameInput')) $('#plantNameInput').value='';
  if($('#plantSortOrderInput')) $('#plantSortOrderInput').value='0';
  if($('#plantActiveInput')) $('#plantActiveInput').checked=true;
}
async function addPlantSettingsRow(e){
  e?.preventDefault();
  if(!hasPermission('settings_plants','add')){ setPlantsSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){ setPlantsSettingsStatus('\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0627\u0646\u0639.','err'); return; }
  const plant_code=normalizePlantSettingsCode($('#plantCodeInput')?.value);
  const plant_name=String($('#plantNameInput')?.value||'').trim();
  const sort_order=parseInt($('#plantSortOrderInput')?.value||'0',10)||0;
  const is_active=Boolean($('#plantActiveInput')?.checked);
  if(!plant_code || !plant_name){ setPlantsSettingsStatus('\u0643\u0648\u062F \u0627\u0644\u0645\u0635\u0646\u0639 \u0648\u0627\u0633\u0645 \u0627\u0644\u0645\u0635\u0646\u0639 \u0645\u0637\u0644\u0648\u0628\u0627\u0646.','err'); return; }
  setPlantsSettingsStatus('\u062C\u0627\u0631\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0635\u0646\u0639...');
  try{
    const {error}=await WarehouseDB.client.from('plants').insert({plant_code,plant_name,is_active,sort_order});
    if(error) throw error;
    clearPlantSettingsForm();
    PLANTS_SETTINGS_LOADED=false;
    clearPlantsCatalogCache();
    await loadPlantsSettings();
    await loadPlantsCatalog({force:true});
    refreshPlantsCatalogConsumers();
    setPlantsSettingsStatus('\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0635\u0646\u0639 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','إضافة',`إضافة مصنع: ${plant_code}`);
  }catch(err){
    setPlantsSettingsStatus('\u062A\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0635\u0646\u0639: '+(err.message||err),'err');
  }
}
async function savePlantSettingsRow(source){
  if(!hasPermission('settings_plants','edit')){ setPlantsSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  const row=source?.closest ? (source.closest('[data-plant-code]') || source.closest('tr')) : source;
  if(!row || !WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  const plantCode=normalizePlantSettingsCode(row.dataset.plantCode || row.querySelector('.plant-code-readonly')?.textContent || '');
  const plant_name=String(row.querySelector('.plant-name-edit')?.value||'').trim();
  const activeSelect=row.querySelector('.plant-active-edit');
  const activeValue=activeSelect?.value || 'false';
  const is_active=activeValue === 'true';
  const sort_order=parseInt(row.querySelector('.plant-sort-edit')?.value||'0',10)||0;
  if(!plant_name){ setPlantsSettingsStatus('\u0627\u0633\u0645 \u0627\u0644\u0645\u0635\u0646\u0639 \u0645\u0637\u0644\u0648\u0628.','err'); return; }
  setPlantsSettingsStatus('\u062C\u0627\u0631\u064A \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0635\u0646\u0639...');
  try{
    const selectOptions=[...(activeSelect?.options||[])].map(option=>({value:option.value,text:option.textContent,selected:option.selected}));
    console.info('[plants-settings] selected row before update',{rowDataset:{...row.dataset},plant_code:plantCode,selectOuterHTML:activeSelect?.outerHTML||'',selectOptions,selectValue:activeValue,is_active,typeof_is_active:typeof is_active});
    console.info('[plants-settings] update query',{table:'public.plants',where:{plant_code:plantCode},payload:{plant_name,is_active,sort_order}});

    const beforeSelect=await fetchPlantSettingsRowDirect(plantCode);
    console.info('[plants-settings] before update select',{data:beforeSelect.data,error:beforeSelect.error,count:beforeSelect.count});
    if(beforeSelect.error) throw beforeSelect.error;
    if(beforeSelect.count !== 1) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u0627\u0644\u062D\u0641\u0638: \u0643\u0648\u062F \u0627\u0644\u0645\u0635\u0646\u0639 \u063A\u064A\u0631 \u0641\u0631\u064A\u062F \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F.');

    const updateResult=await WarehouseDB.client
      .from('plants')
      .update({plant_name,is_active,sort_order},{count:'exact'})
      .eq('plant_code',plantCode)
      .select('id,plant_code,plant_name,is_active,sort_order,updated_at,updated_by');
    console.info('[plants-settings] update result',{data:updateResult.data,error:updateResult.error,count:updateResult.count});
    if(updateResult.error) throw updateResult.error;
    if(updateResult.count !== 1 || !updateResult.data?.length) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0623\u064A \u0635\u0641. \u0631\u0627\u062C\u0639 \u0635\u0644\u0627\u062D\u064A\u0627\u062A RLS \u0623\u0648 \u0643\u0648\u062F \u0627\u0644\u0645\u0635\u0646\u0639.');

    const verify=await fetchPlantSettingsRowDirect(plantCode);
    const verifyRows=(verify.data||[]).map(r=>({plant_code:r.plant_code,is_active:r.is_active,typeof_is_active:typeof r.is_active,updated_at:r.updated_at,updated_by:r.updated_by}));
    console.info('[plants-settings] after update direct select',{data:verifyRows,error:verify.error,count:verify.count});
    if(verify.error) throw verify.error;
    if(verify.count !== 1) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0641\u0638: \u0647\u0646\u0627\u0643 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0633\u062C\u0644 \u0623\u0648 \u0644\u0627 \u064A\u0648\u062C\u062F \u0633\u062C\u0644 \u0644\u0647\u0630\u0627 \u0627\u0644\u0643\u0648\u062F.');
    const verifiedRow=verify.data?.[0];
    const savedActive=parsePlantActiveValue(verifiedRow?.is_active);
    if(savedActive !== is_active) throw new Error('\u0644\u0645 \u062A\u062A\u063A\u064A\u0631 \u062D\u0627\u0644\u0629 \u0627\u0644\u0645\u0635\u0646\u0639 \u0641\u0639\u0644\u064A\u0627\u064B \u0641\u064A Supabase.');

    const freshRows=await fetchPlantsSettingsRowsDirect();
    console.info('[plants-settings] reload after verified update',{data:freshRows.data,error:freshRows.error,count:freshRows.count});
    if(freshRows.error) throw freshRows.error;
    PLANTS_SETTINGS_ROWS=applyVerifiedPlantSettingsRow(verifiedRow,freshRows.data||[]);
    PLANTS_SETTINGS_LOADED=true;
    renderPlantsSettingsTable(PLANTS_SETTINGS_ROWS);
    clearPlantsCatalogCache();
    await loadPlantsCatalog({force:true});
    refreshPlantsCatalogConsumers();
    setPlantsSettingsStatus('\u062A\u0645 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0635\u0646\u0639 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','تعديل',`تعديل مصنع: ${plantCode}`);
  }catch(err){
    setPlantsSettingsStatus('\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u0635\u0646\u0639: '+(err.message||err),'err');
  }
}
function initPlantsSettings(){
  $('#plantSettingsForm')?.addEventListener('submit',addPlantSettingsRow);
  const table=$('#plantsSettingsTable');
  if(!table || table.dataset.plantsSettingsBound==='1') return;
  table.dataset.noUniversalTable='1';
  table.dataset.plantsSettingsBound='1';
  table.addEventListener('click',e=>{
    const target=e.target?.closest ? e.target : e.target?.parentElement;
    const btn=target?.closest('[data-action="save-plant"]');
    if(!btn || !table.contains(btn)) return;
    console.log('[plants-settings] save button clicked',e.target);
    e.preventDefault();
    const row=btn.closest('[data-plant-code]') || btn.closest('tr');
    console.info('[plants-settings] save button context',{
      row,
      plant_code:normalizePlantSettingsCode(row?.dataset?.plantCode || row?.querySelector('.plant-code-readonly')?.textContent || ''),
      activeSelect:row?.querySelector('.plant-active-edit') || null,
      nameInput:row?.querySelector('.plant-name-edit') || null,
      sortInput:row?.querySelector('.plant-sort-edit') || null
    });
    savePlantSettingsRow(btn);
  });
}


let WAREHOUSES_SETTINGS_LOADED=false;
let WAREHOUSES_SETTINGS_ROWS=[];
function setWarehousesSettingsStatus(message,type=''){
  const status=$('#warehousesSettingsStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function normalizeWarehouseSettingsCode(value){return String(value||'').trim().toUpperCase();}
function parseWarehouseBoolean(value){
  if(value===true || value===1) return true;
  if(value===false || value===0 || value==null) return false;
  return String(value).trim().toLowerCase()==='true';
}
function warehouseTypeLabel(type){
  const map={finished:'\u0645\u0646\u062A\u062C \u062A\u0627\u0645',bulk_raw:'\u062E\u0627\u0645\u0627\u062A \u0635\u0628',raw:'\u062E\u0627\u0645\u0627\u062A',manufacturing:'\u062A\u0635\u0646\u064A\u0639',other:'\u0623\u062E\u0631\u0649'};
  return map[String(type||'').trim()] || String(type||'-');
}
function warehouseCategoryFromType(type){
  const map={finished:'finished_goods',bulk_raw:'bulk_raw_materials',raw:'raw_materials',manufacturing:'manufacturing',other:'other'};
  return map[String(type||'').trim()] || 'other';
}
function warehousePlantOptionsHtml(selected=''){
  const current=String(selected||'').trim().toUpperCase();
  return getPlantsCatalog().map(p=>{
    const code=escapeHtml(p.code||'');
    const label=escapeHtml((p.code||'')+' - '+(p.name||p.code||''));
    return '<option value="'+code+'" '+(String(p.code||'').toUpperCase()===current?'selected':'')+'>'+label+'</option>';
  }).join('');
}
function fillWarehousePlantInput(){
  const select=$('#warehousePlantInput');
  if(!select) return;
  const current=select.value;
  select.innerHTML=warehousePlantOptionsHtml(current);
}
function renderWarehousesSettingsTable(rows=[]){
  const tbody=$('#warehousesSettingsTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9" class="empty-row">\u0644\u0627 \u062A\u0648\u062C\u062F \u0645\u062E\u0627\u0632\u0646 \u0645\u062D\u0641\u0648\u0638\u0629.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const id=escapeHtml(row.id||'');
    const code=escapeHtml(row.warehouse_code||'');
    const name=escapeHtml(row.warehouse_name||'');
    const type=String(row.warehouse_type||'other').trim() || 'other';
    const sales=parseWarehouseBoolean(row.use_in_sales_review);
    const receiving=parseWarehouseBoolean(row.use_in_receiving_review);
    const active=parseWarehouseBoolean(row.is_active);
    const sort=Number(row.sort_order||0);
    const statusText=active?'\u0646\u0634\u0637':'\u063A\u064A\u0631 \u0646\u0634\u0637';
    const statusClass=active?'warehouse-status-active':'warehouse-status-inactive';
    return '<tr data-warehouse-id="'+id+'" data-warehouse-code="'+code+'">'
      +'<td><span class="warehouse-code-readonly">'+code+'</span></td>'
      +'<td><input type="text" class="warehouse-name-edit" value="'+name+'" /></td>'
      +'<td><select class="warehouse-plant-edit">'+warehousePlantOptionsHtml(row.plant_code)+'</select></td>'
      +'<td><select class="warehouse-type-edit"><option value="finished" '+(type==='finished'?'selected':'')+'>\u0645\u0646\u062A\u062C \u062A\u0627\u0645</option><option value="bulk_raw" '+(type==='bulk_raw'?'selected':'')+'>\u062E\u0627\u0645\u0627\u062A \u0635\u0628</option><option value="raw" '+(type==='raw'?'selected':'')+'>\u062E\u0627\u0645\u0627\u062A</option><option value="manufacturing" '+(type==='manufacturing'?'selected':'')+'>\u062A\u0635\u0646\u064A\u0639</option><option value="other" '+(type==='other'?'selected':'')+'>\u0623\u062E\u0631\u0649</option></select></td>'
      +'<td><select class="warehouse-sales-edit"><option value="true" '+(sales?'selected':'')+'>\u0646\u0639\u0645</option><option value="false" '+(!sales?'selected':'')+'>\u0644\u0627</option></select></td>'
      +'<td><select class="warehouse-receiving-edit"><option value="true" '+(receiving?'selected':'')+'>\u0646\u0639\u0645</option><option value="false" '+(!receiving?'selected':'')+'>\u0644\u0627</option></select></td>'
      +'<td><select class="warehouse-active-edit"><option value="true" '+(active?'selected':'')+'>\u0646\u0634\u0637</option><option value="false" '+(!active?'selected':'')+'>\u063A\u064A\u0631 \u0646\u0634\u0637</option></select><div class="'+statusClass+'">'+statusText+'</div></td>'
      +'<td><input type="number" class="warehouse-sort-edit" value="'+sort+'" step="1" /></td>'
      +'<td><div class="warehouse-row-actions"><button class="secondary save-warehouse-row-btn" type="button" data-action="save-warehouse">\u062D\u0641\u0638</button></div></td>'
      +'</tr>';
  }).join('');
  refreshSettingsTableControls('warehousesSettingsTable');
  applySettingsSubPermissions();
}
async function fetchWarehousesSettingsRowsDirect(){
  return WarehouseDB.client
    .from('warehouses')
    .select('id,warehouse_code,warehouse_name,plant_code,warehouse_type,use_in_sales_review,use_in_receiving_review,is_active,sort_order',{count:'exact'})
    .order('sort_order',{ascending:true})
    .order('warehouse_code',{ascending:true});
}
async function fetchWarehouseSettingsRowDirect(warehouseCode){
  return WarehouseDB.client
    .from('warehouses')
    .select('id,warehouse_code,warehouse_name,plant_code,warehouse_type,use_in_sales_review,use_in_receiving_review,is_active,sort_order,updated_at,updated_by',{count:'exact'})
    .eq('warehouse_code',warehouseCode);
}
async function loadWarehousesSettings(){
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  fillWarehousePlantInput();
  setWarehousesSettingsStatus('\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0632\u0646...');
  try{
    const {data,error}=await fetchWarehousesSettingsRowsDirect();
    if(error) throw error;
    WAREHOUSES_SETTINGS_ROWS=data || [];
    WAREHOUSES_SETTINGS_LOADED=true;
    renderWarehousesSettingsTable(WAREHOUSES_SETTINGS_ROWS);
    setWarehousesSettingsStatus('\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0632\u0646.','ok');
  }catch(err){
    WAREHOUSES_SETTINGS_LOADED=false;
    WAREHOUSES_SETTINGS_ROWS=[];
    renderWarehousesSettingsTable([]);
    setWarehousesSettingsStatus('\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0627\u0632\u0646: '+(err.message||err),'err');
  }
}
async function ensureWarehousesSettingsLoaded(){
  if(WAREHOUSES_SETTINGS_LOADED) return;
  await loadWarehousesSettings();
}
function readWarehouseSettingsForm(){
  const warehouse_type=String($('#warehouseTypeInput')?.value||'other').trim();
  const use_in_sales_review=Boolean($('#warehouseUseSalesInput')?.checked);
  return {
    warehouse_code:normalizeWarehouseSettingsCode($('#warehouseCodeInput')?.value),
    warehouse_name:String($('#warehouseNameInput')?.value||'').trim(),
    plant_code:normalizePlantSettingsCode($('#warehousePlantInput')?.value),
    warehouse_type,
    warehouse_category:warehouseCategoryFromType(warehouse_type),
    use_in_sales_review,
    use_in_receiving_review:Boolean($('#warehouseUseReceivingInput')?.checked),
    is_sales_warehouse:use_in_sales_review,
    is_active:Boolean($('#warehouseActiveInput')?.checked),
    sort_order:parseInt($('#warehouseSortOrderInput')?.value||'0',10)||0
  };
}
function clearWarehouseSettingsForm(){
  if($('#warehouseCodeInput')) $('#warehouseCodeInput').value='';
  if($('#warehouseNameInput')) $('#warehouseNameInput').value='';
  if($('#warehouseTypeInput')) $('#warehouseTypeInput').value='finished';
  if($('#warehouseUseSalesInput')) $('#warehouseUseSalesInput').checked=false;
  if($('#warehouseUseReceivingInput')) $('#warehouseUseReceivingInput').checked=false;
  if($('#warehouseActiveInput')) $('#warehouseActiveInput').checked=true;
  if($('#warehouseSortOrderInput')) $('#warehouseSortOrderInput').value='0';
}
async function addWarehouseSettingsRow(e){
  e?.preventDefault();
  if(!hasPermission('settings_warehouses','add')){ setWarehousesSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){ setWarehousesSettingsStatus('\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u0625\u062F\u0627\u0631\u0629 \u0627\u0644\u0645\u062E\u0627\u0632\u0646.','err'); return; }
  const payload=readWarehouseSettingsForm();
  if(!payload.warehouse_code || !payload.warehouse_name || !payload.plant_code){ setWarehousesSettingsStatus('\u0643\u0648\u062F \u0627\u0644\u0645\u062E\u0632\u0646 \u0648\u0627\u0633\u0645\u0647 \u0648\u0627\u0644\u0645\u0635\u0646\u0639 \u0645\u0637\u0644\u0648\u0628\u0629.','err'); return; }
  setWarehousesSettingsStatus('\u062C\u0627\u0631\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062E\u0632\u0646...');
  try{
    const {error}=await WarehouseDB.client.from('warehouses').insert(payload);
    if(error) throw error;
    clearWarehouseSettingsForm();
    WAREHOUSES_SETTINGS_LOADED=false;
    clearPlantsScreenWarehousesCache();
    await loadWarehousesSettings();
    await loadPlantsScreenWarehouses({force:true});
    if($('#plants')?.classList.contains('active-section')) renderPlants();
    setWarehousesSettingsStatus('\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062E\u0632\u0646 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','إضافة',`إضافة مخزن: ${payload.warehouse_code}`);
  }catch(err){
    setWarehousesSettingsStatus('\u062A\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062E\u0632\u0646: '+(err.message||err),'err');
  }
}
async function saveWarehouseSettingsRow(source){
  if(!hasPermission('settings_warehouses','edit')){ setWarehousesSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  const row=source?.closest ? (source.closest('[data-warehouse-code]') || source.closest('tr')) : source;
  if(!row || !WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  const warehouseCode=normalizeWarehouseSettingsCode(row.dataset.warehouseCode || row.querySelector('.warehouse-code-readonly')?.textContent || '');
  const payload={
    warehouse_name:String(row.querySelector('.warehouse-name-edit')?.value||'').trim(),
    plant_code:normalizePlantSettingsCode(row.querySelector('.warehouse-plant-edit')?.value),
    warehouse_type:String(row.querySelector('.warehouse-type-edit')?.value||'other').trim(),
    use_in_sales_review:row.querySelector('.warehouse-sales-edit')?.value === 'true',
    use_in_receiving_review:row.querySelector('.warehouse-receiving-edit')?.value === 'true',
    is_active:row.querySelector('.warehouse-active-edit')?.value === 'true',
    sort_order:parseInt(row.querySelector('.warehouse-sort-edit')?.value||'0',10)||0
  };
  if(!payload.warehouse_name || !payload.plant_code){ setWarehousesSettingsStatus('\u0627\u0633\u0645 \u0627\u0644\u0645\u062E\u0632\u0646 \u0648\u0627\u0644\u0645\u0635\u0646\u0639 \u0645\u0637\u0644\u0648\u0628\u0627\u0646.','err'); return; }
  setWarehousesSettingsStatus('\u062C\u0627\u0631\u064A \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u062E\u0632\u0646...');
  try{
    const before=await fetchWarehouseSettingsRowDirect(warehouseCode);
    if(before.error) throw before.error;
    if(before.count !== 1) throw new Error('\u0643\u0648\u062F \u0627\u0644\u0645\u062E\u0632\u0646 \u063A\u064A\u0631 \u0641\u0631\u064A\u062F \u0623\u0648 \u063A\u064A\u0631 \u0645\u0648\u062C\u0648\u062F.');
    const updateResult=await WarehouseDB.client
      .from('warehouses')
      .update(payload,{count:'exact'})
      .eq('warehouse_code',warehouseCode)
      .select('id,warehouse_code,warehouse_name,plant_code,warehouse_type,use_in_sales_review,use_in_receiving_review,is_active,sort_order,updated_at,updated_by');
    if(updateResult.error) throw updateResult.error;
    if(updateResult.count !== 1 || !updateResult.data?.length) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0623\u064A \u0635\u0641.');
    const verify=await fetchWarehouseSettingsRowDirect(warehouseCode);
    if(verify.error) throw verify.error;
    if(verify.count !== 1) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0641\u0638.');
    const saved=verify.data?.[0];
    if(!saved || parseWarehouseBoolean(saved.is_active)!==payload.is_active || parseWarehouseBoolean(saved.use_in_sales_review)!==payload.use_in_sales_review || parseWarehouseBoolean(saved.use_in_receiving_review)!==payload.use_in_receiving_review || String(saved.plant_code||'')!==payload.plant_code){
      throw new Error('\u0644\u0645 \u062A\u062A\u063A\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0645\u062E\u0632\u0646 \u0641\u0639\u0644\u064A\u0627\u064B \u0641\u064A Supabase.');
    }
    WAREHOUSES_SETTINGS_LOADED=false;
    clearPlantsScreenWarehousesCache();
    await loadWarehousesSettings();
    await loadPlantsScreenWarehouses({force:true});
    if($('#plants')?.classList.contains('active-section')) renderPlants();
    setWarehousesSettingsStatus('\u062A\u0645 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u062E\u0632\u0646 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','تعديل',`تعديل مخزن: ${warehouseCode}`);
  }catch(err){
    setWarehousesSettingsStatus('\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0645\u062E\u0632\u0646: '+(err.message||err),'err');
  }
}
function initWarehousesSettings(){
  fillWarehousePlantInput();
  $('#warehouseSettingsForm')?.addEventListener('submit',addWarehouseSettingsRow);
  const table=$('#warehousesSettingsTable');
  if(!table || table.dataset.warehousesSettingsBound==='1') return;
  table.dataset.noUniversalTable='1';
  table.dataset.warehousesSettingsBound='1';
  table.addEventListener('click',e=>{
    const target=e.target?.closest ? e.target : e.target?.parentElement;
    const btn=target?.closest('[data-action="save-warehouse"]');
    if(!btn || !table.contains(btn)) return;
    e.preventDefault();
    saveWarehouseSettingsRow(btn);
  });
}



let SALES_PRODUCTS_SETTINGS_LOADED=false;
let SALES_PRODUCTS_SETTINGS_ROWS=[];
function setSalesProductsSettingsStatus(message,type=''){
  const status=$('#salesProductsSettingsStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function normalizeSalesProductCode(value){return normalizeMaterialCode(value).toUpperCase();}
function normalizeSalesProductUnit(value){return String(value||'TO').trim().toUpperCase() || 'TO';}
function parseSalesProductBoolean(value){
  if(value===true || value===1) return true;
  if(value===false || value===0 || value==null) return false;
  return String(value).trim().toLowerCase()==='true';
}

let SALES_PRODUCT_WAREHOUSES_STATE={mode:'existing',materialCode:'',materialName:'',warehouses:[],links:[]};
function setSalesProductWarehousesStatus(message,type=''){
  const status=$('#salesProductWarehousesStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message || '';
}
function fallbackSalesProductWarehousesCatalog(){
  const rows=[];
  (APP_DATA.plants||[]).forEach(plant=>{
    const plantCode=String(plant.code||'').trim().toUpperCase();
    const plantName=plant.name||plantCode;
    (plant.warehouses||[]).forEach((w,index)=>{
      const warehouseCode=String(w[0]||'').trim().toUpperCase();
      if(!warehouseCode) return;
      rows.push({warehouse_code:warehouseCode,warehouse_name:w[1]||warehouseCode,plant_code:plantCode,plant_name:plantName,sort_order:index+1,source:'fallback'});
    });
  });
  return rows.sort((a,b)=>String(a.plant_code).localeCompare(String(b.plant_code)) || (a.sort_order-b.sort_order) || String(a.warehouse_code).localeCompare(String(b.warehouse_code)));
}
function normalizeSalesProductWarehouseCatalogRow(row,index=0){
  const plantCode=String(row?.plant_code||'').trim().toUpperCase();
  const plantMeta=getPlantsCatalog().find(p=>String(p.code||'').toUpperCase()===plantCode)||{};
  return {
    warehouse_code:String(row?.warehouse_code||'').trim().toUpperCase(),
    warehouse_name:row?.warehouse_name||row?.name||row?.warehouse_code||'',
    plant_code:plantCode,
    plant_name:row?.plant_name||plantMeta.name||plantCode,
    sort_order:Number(row?.sort_order??index)||0,
    source:row?.source||'supabase'
  };
}
async function loadSalesProductWarehousesCatalog(){
  if(!WarehouseDB?.ready) return fallbackSalesProductWarehousesCatalog();
  try{
    const {data,error}=await WarehouseDB.client
      .from('warehouses')
      .select('warehouse_code,warehouse_name,plant_code,is_active,sort_order')
      .eq('is_active',true)
      .order('plant_code',{ascending:true})
      .order('sort_order',{ascending:true})
      .order('warehouse_code',{ascending:true});
    if(error) throw error;
    return (data||[]).map(normalizeSalesProductWarehouseCatalogRow).filter(w=>w.warehouse_code);
  }catch(err){
    console.warn('[sales-product-warehouses] fallback to APP_DATA warehouses',err);
    return fallbackSalesProductWarehousesCatalog();
  }
}
async function fetchSalesProductWarehouseLinks(materialCode){
  if(!WarehouseDB?.ready) return [];
  const {data,error}=await WarehouseDB.client
    .from('sales_product_warehouses')
    .select('warehouse_code,is_active')
    .eq('material_code',materialCode);
  if(error) throw error;
  return data||[];
}

function salesProductWarehouseLinksFromCodes(codes=[]){
  return [...new Set((codes||[]).map(normalizeWarehouseSettingsCode).filter(Boolean))].map(warehouse_code=>({warehouse_code,is_active:true}));
}
function officialSalesProductWarehouseCodes(warehouses=[]){
  const official=new Set((typeof SALES_WAREHOUSES!=='undefined'?SALES_WAREHOUSES:[]).map(normalizeWarehouseSettingsCode));
  return (warehouses||[]).map(w=>normalizeWarehouseSettingsCode(w.warehouse_code)).filter(code=>official.has(code));
}
function getSelectedSalesProductWarehouseCodes(){
  return [...$$('#salesProductWarehousesList .sales-product-warehouse-check')]
    .filter(input=>input.checked)
    .map(input=>normalizeWarehouseSettingsCode(input.value))
    .filter(Boolean);
}
async function saveSalesProductWarehouseCodes(materialCode,selectedCodes=[]){
  const selected=[...new Set((selectedCodes||[]).map(normalizeWarehouseSettingsCode).filter(Boolean))];
  const existing=await fetchSalesProductWarehouseLinks(materialCode);
  const existingActiveCodes=(existing||[]).filter(l=>parseSalesProductBoolean(l.is_active)).map(l=>normalizeWarehouseSettingsCode(l.warehouse_code)).filter(Boolean);
  const selectedSet=new Set(selected);
  const toEnable=selected.filter(code=>!existingActiveCodes.includes(code));
  const toDisable=existingActiveCodes.filter(code=>!selectedSet.has(code));
  if(toEnable.length && !hasPermission('settings_sales_product_warehouses','add')){
    throw new Error('غير متاح للصلاحية الحالية');
  }
  if(toDisable.length && !hasPermission('settings_sales_product_warehouses','delete')){
    throw new Error('غير متاح للصلاحية الحالية');
  }
  if(selected.length){
    const payload=selected.map(warehouse_code=>({material_code:materialCode,warehouse_code,is_active:true}));
    const {error}=await WarehouseDB.client
      .from('sales_product_warehouses')
      .upsert(payload,{onConflict:'material_code,warehouse_code'});
    if(error) throw error;
  }
  if(toDisable.length){
    const {error}=await WarehouseDB.client
      .from('sales_product_warehouses')
      .update({is_active:false})
      .eq('material_code',materialCode)
      .in('warehouse_code',toDisable);
    if(error) throw error;
  }
  for(const warehouseCode of toEnable){
    await logSystemActivity('الإعدادات','إضافة ربط',`ربط الصنف: ${materialCode} بالمخزن: ${warehouseCode}`);
  }
  for(const warehouseCode of toDisable){
    await logSystemActivity('الإعدادات','حذف ربط',`حذف ربط الصنف: ${materialCode} من المخزن: ${warehouseCode}`);
  }
  clearSalesReviewEngineCache();
  return await fetchSalesProductWarehouseLinks(materialCode);
}
async function getNewSalesProductWarehouseSelection(){
  if(SALES_PRODUCT_WAREHOUSES_STATE.mode==='create'){
    const panel=$('#salesProductWarehousesPanel');
    if(panel && !panel.hidden) return getSelectedSalesProductWarehouseCodes();
    const links=(SALES_PRODUCT_WAREHOUSES_STATE.links||[]).filter(l=>parseSalesProductBoolean(l.is_active)).map(l=>l.warehouse_code);
    if(links.length) return [...new Set(links.map(normalizeWarehouseSettingsCode))];
  }
  const warehouses=SALES_PRODUCT_WAREHOUSES_STATE.warehouses?.length ? SALES_PRODUCT_WAREHOUSES_STATE.warehouses : await loadSalesProductWarehousesCatalog();
  return officialSalesProductWarehouseCodes(warehouses);
}

function renderSalesProductWarehousesPanel(){
  const panel=$('#salesProductWarehousesPanel');
  const title=$('#salesProductWarehousesTitle');
  const list=$('#salesProductWarehousesList');
  if(!panel || !list) return;
  const materialCode=SALES_PRODUCT_WAREHOUSES_STATE.materialCode;
  const materialName=SALES_PRODUCT_WAREHOUSES_STATE.materialName;
  if(title) title.textContent='مخازن الصنف: '+materialCode+' - '+materialName;
  const activeLinks=new Set((SALES_PRODUCT_WAREHOUSES_STATE.links||[]).filter(l=>parseSalesProductBoolean(l.is_active)).map(l=>String(l.warehouse_code||'').toUpperCase()));
  const warehouses=SALES_PRODUCT_WAREHOUSES_STATE.warehouses||[];
  if(!warehouses.length){
    list.innerHTML='<div class="empty-row">لا توجد مخازن نشطة متاحة.</div>';
    return;
  }
  list.innerHTML=warehouses.map(w=>{
    const code=escapeHtml(w.warehouse_code||'');
    const name=escapeHtml(w.warehouse_name||'');
    const plant=escapeHtml((w.plant_code||'')+' - '+(w.plant_name||w.plant_code||''));
    const checked=activeLinks.has(String(w.warehouse_code||'').toUpperCase())?'checked':'';
    return '<label class="sales-product-warehouse-option">'
      +'<input type="checkbox" class="sales-product-warehouse-check" value="'+code+'" '+checked+' />'
      +'<span><b>'+code+'</b><span>'+name+'</span><small>'+plant+'</small></span>'
      +'</label>';
  }).join('');
}
async function openSalesProductWarehousesPanel(source){
  if(!hasPermission('settings_sales_product_warehouses','view')){ setSalesProductWarehousesStatus('غير متاح للصلاحية الحالية','err'); return; }
  const row=source?.closest ? (source.closest('[data-material-code]') || source.closest('tr')) : source;
  const panel=$('#salesProductWarehousesPanel');
  if(!row || !panel) return;
  const materialCode=normalizeSalesProductCode(row.dataset.materialCode || row.querySelector('.sales-product-code-readonly')?.textContent || '');
  const materialName=String(row.querySelector('.sales-product-name-edit')?.value || '').trim();
  SALES_PRODUCT_WAREHOUSES_STATE={mode:'existing',materialCode,materialName,warehouses:[],links:[]};
  panel.hidden=false;
  setSalesProductWarehousesStatus('جاري تحميل مخازن الصنف...');
  renderSalesProductWarehousesPanel();
  try{
    const [warehouses,links]=await Promise.all([
      loadSalesProductWarehousesCatalog(),
      fetchSalesProductWarehouseLinks(materialCode)
    ]);
    SALES_PRODUCT_WAREHOUSES_STATE={mode:'existing',materialCode,materialName,warehouses,links};
    renderSalesProductWarehousesPanel();
    setSalesProductWarehousesStatus('تم تحميل مخازن الصنف.','ok');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){
    renderSalesProductWarehousesPanel();
    setSalesProductWarehousesStatus('تعذر تحميل مخازن الصنف: '+(err.message||err),'err');
  }
}
async function openNewSalesProductWarehousesPanel(){
  if(!hasPermission('settings_sales_product_warehouses','view') || !hasPermission('settings_sales_products','add')){ setSalesProductWarehousesStatus('غير متاح للصلاحية الحالية','err'); return; }
  const panel=$('#salesProductWarehousesPanel');
  if(!panel) return;
  const materialCode=normalizeSalesProductCode($('#salesProductCodeInput')?.value) || 'NEW';
  const materialName=String($('#salesProductNameInput')?.value||'').trim() || 'صنف جديد';
  const previous=SALES_PRODUCT_WAREHOUSES_STATE.mode==='create'
    ? (SALES_PRODUCT_WAREHOUSES_STATE.links||[]).filter(l=>parseSalesProductBoolean(l.is_active)).map(l=>l.warehouse_code)
    : [];
  SALES_PRODUCT_WAREHOUSES_STATE={mode:'create',materialCode,materialName,warehouses:[],links:salesProductWarehouseLinksFromCodes(previous)};
  panel.hidden=false;
  setSalesProductWarehousesStatus('جاري تحميل مخازن الصنف الجديد...');
  renderSalesProductWarehousesPanel();
  try{
    const warehouses=await loadSalesProductWarehousesCatalog();
    const selected=previous.length ? previous : officialSalesProductWarehouseCodes(warehouses);
    SALES_PRODUCT_WAREHOUSES_STATE={mode:'create',materialCode,materialName,warehouses,links:salesProductWarehouseLinksFromCodes(selected)};
    renderSalesProductWarehousesPanel();
    setSalesProductWarehousesStatus('تم تحديد مخازن البيع الرسمية افتراضيًا، ويمكن تعديلها قبل إضافة الصنف.','ok');
    panel.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(err){
    setSalesProductWarehousesStatus('تعذر تحميل مخازن الصنف الجديد: '+(err.message||err),'err');
  }
}
function closeSalesProductWarehousesPanel(){
  const panel=$('#salesProductWarehousesPanel');
  if(panel) panel.hidden=true;
  SALES_PRODUCT_WAREHOUSES_STATE={mode:'existing',materialCode:'',materialName:'',warehouses:[],links:[]};
  setSalesProductWarehousesStatus('');
}
async function saveSalesProductWarehouses(){
  if(!hasPermission('settings_sales_product_warehouses','add') && !hasPermission('settings_sales_product_warehouses','delete')){ setSalesProductWarehousesStatus('غير متاح للصلاحية الحالية','err'); return; }
  const materialCode=normalizeSalesProductCode(SALES_PRODUCT_WAREHOUSES_STATE.materialCode);
  if(!materialCode){ setSalesProductWarehousesStatus('اختر صنفًا أولاً.','err'); return; }
  const selected=getSelectedSalesProductWarehouseCodes();
  if(SALES_PRODUCT_WAREHOUSES_STATE.mode==='create'){
    SALES_PRODUCT_WAREHOUSES_STATE.links=salesProductWarehouseLinksFromCodes(selected);
    renderSalesProductWarehousesPanel();
    setSalesProductWarehousesStatus('تم حفظ اختيار المخازن مؤقتًا. اضغط إضافة صنف لإتمام الحفظ.','ok');
    return;
  }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){ setSalesProductWarehousesStatus('سجل الدخول أولاً لحفظ مخازن الصنف.','err'); return; }
  setSalesProductWarehousesStatus('جاري حفظ مخازن الصنف...');
  try{
    const links=await saveSalesProductWarehouseCodes(materialCode,selected);
    SALES_PRODUCT_WAREHOUSES_STATE.links=links;
    renderSalesProductWarehousesPanel();
    setSalesProductWarehousesStatus('تم حفظ مخازن الصنف بنجاح.','ok');
  }catch(err){
    setSalesProductWarehousesStatus('تعذر حفظ مخازن الصنف: '+(err.message||err),'err');
  }
}

function renderSalesProductsSettingsTable(rows=[]){
  const tbody=$('#salesProductsSettingsTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="8" class="empty-row">\u0644\u0627 \u062A\u0648\u062C\u062F \u0623\u0635\u0646\u0627\u0641 \u0628\u064A\u0639 \u0645\u062D\u0641\u0648\u0638\u0629.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const id=escapeHtml(row.id||'');
    const code=escapeHtml(row.material_code||'');
    const name=escapeHtml(row.material_name||'');
    const unit=escapeHtml(normalizeSalesProductUnit(row.default_unit));
    const useReports=parseSalesProductBoolean(row.use_in_sales_reports);
    const active=parseSalesProductBoolean(row.is_active);
    const sort=Number(row.sort_order||0);
    const statusText=active?'\u0646\u0634\u0637':'\u063A\u064A\u0631 \u0646\u0634\u0637';
    const statusClass=active?'sales-product-status-active':'sales-product-status-inactive';
    return '<tr data-sales-product-id="'+id+'" data-material-code="'+code+'">'
      +'<td><span class="sales-product-code-readonly">'+code+'</span></td>'
      +'<td><input type="text" class="sales-product-name-edit" value="'+name+'" /></td>'
      +'<td><input type="text" class="sales-product-unit-edit" value="'+unit+'" /></td>'
      +'<td><select class="sales-product-use-edit"><option value="true" '+(useReports?'selected':'')+'>\u0646\u0639\u0645</option><option value="false" '+(!useReports?'selected':'')+'>\u0644\u0627</option></select></td>'
      +'<td><select class="sales-product-active-edit"><option value="true" '+(active?'selected':'')+'>\u0646\u0634\u0637</option><option value="false" '+(!active?'selected':'')+'>\u063A\u064A\u0631 \u0646\u0634\u0637</option></select><div class="'+statusClass+'">'+statusText+'</div></td>'
      +'<td><input type="number" class="sales-product-sort-edit" value="'+sort+'" step="1" /></td>'
      +'<td><button class="secondary sales-product-warehouses-btn" type="button" data-action="sales-product-warehouses">\u0627\u0644\u0645\u062E\u0627\u0632\u0646</button></td>'
      +'<td><div class="sales-product-row-actions"><button class="secondary save-sales-product-row-btn" type="button" data-action="save-sales-product">\u062D\u0641\u0638</button></div></td>'
      +'</tr>';
  }).join('');
  refreshSettingsTableControls('salesProductsSettingsTable');
  applySettingsSubPermissions();
}
async function fetchSalesProductsSettingsRowsDirect(){
  return WarehouseDB.client
    .from('sales_products')
    .select('id,material_code,material_name,default_unit,use_in_sales_reports,is_active,sort_order',{count:'exact'})
    .order('sort_order',{ascending:true})
    .order('material_code',{ascending:true});
}
async function fetchSalesProductSettingsRowDirect(materialCode){
  return WarehouseDB.client
    .from('sales_products')
    .select('id,material_code,material_name,default_unit,use_in_sales_reports,is_active,sort_order,updated_at,updated_by',{count:'exact'})
    .eq('material_code',materialCode);
}
async function loadSalesProductsSettings(){
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  setSalesProductsSettingsStatus('\u062C\u0627\u0631\u064A \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0628\u064A\u0639...');
  try{
    const {data,error}=await fetchSalesProductsSettingsRowsDirect();
    if(error) throw error;
    SALES_PRODUCTS_SETTINGS_ROWS=data || [];
    SALES_PRODUCTS_SETTINGS_LOADED=true;
    renderSalesProductsSettingsTable(SALES_PRODUCTS_SETTINGS_ROWS);
    setSalesProductsSettingsStatus('\u062A\u0645 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0628\u064A\u0639.','ok');
  }catch(err){
    SALES_PRODUCTS_SETTINGS_LOADED=false;
    SALES_PRODUCTS_SETTINGS_ROWS=[];
    renderSalesProductsSettingsTable([]);
    setSalesProductsSettingsStatus('\u062A\u0639\u0630\u0631 \u062A\u062D\u0645\u064A\u0644 \u0628\u064A\u0627\u0646\u0627\u062A \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0628\u064A\u0639: '+(err.message||err),'err');
  }
}
async function ensureSalesProductsSettingsLoaded(){
  if(SALES_PRODUCTS_SETTINGS_LOADED) return;
  await loadSalesProductsSettings();
}
function readSalesProductSettingsForm(){
  return {
    material_code:normalizeSalesProductCode($('#salesProductCodeInput')?.value),
    material_name:String($('#salesProductNameInput')?.value||'').trim(),
    default_unit:normalizeSalesProductUnit($('#salesProductUnitInput')?.value),
    use_in_sales_reports:Boolean($('#salesProductUseReportsInput')?.checked),
    is_active:Boolean($('#salesProductActiveInput')?.checked),
    sort_order:parseInt($('#salesProductSortOrderInput')?.value||'0',10)||0
  };
}
function clearSalesProductSettingsForm(){
  if($('#salesProductCodeInput')) $('#salesProductCodeInput').value='';
  if($('#salesProductNameInput')) $('#salesProductNameInput').value='';
  if($('#salesProductUnitInput')) $('#salesProductUnitInput').value='TO';
  if($('#salesProductUseReportsInput')) $('#salesProductUseReportsInput').checked=true;
  if($('#salesProductActiveInput')) $('#salesProductActiveInput').checked=true;
  if($('#salesProductSortOrderInput')) $('#salesProductSortOrderInput').value='0';
}
async function addSalesProductSettingsRow(e){
  e?.preventDefault();
  if(!hasPermission('settings_sales_products','add')){ setSalesProductsSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  if(!WarehouseDB?.ready || !CURRENT_AUTH_USER?.id){ setSalesProductsSettingsStatus('\u0633\u062C\u0644 \u0627\u0644\u062F\u062E\u0648\u0644 \u0623\u0648\u0644\u0627\u064B \u0644\u0625\u062F\u0627\u0631\u0629 \u0623\u0635\u0646\u0627\u0641 \u0627\u0644\u0628\u064A\u0639.','err'); return; }
  const payload=readSalesProductSettingsForm();
  if(!payload.material_code || !payload.material_name){ setSalesProductsSettingsStatus('\u0643\u0648\u062F \u0627\u0644\u0635\u0646\u0641 \u0648\u0627\u0633\u0645\u0647 \u0645\u0637\u0644\u0648\u0628\u0627\u0646.','err'); return; }
  setSalesProductsSettingsStatus('\u062C\u0627\u0631\u064A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0646\u0641...');
  let selectedWarehouseCodes=[];
  try{
    selectedWarehouseCodes=await getNewSalesProductWarehouseSelection();
    if(selectedWarehouseCodes.length && !hasPermission('settings_sales_product_warehouses','add')){
      setSalesProductsSettingsStatus('غير متاح للصلاحية الحالية','err');
      return;
    }
    const {error}=await WarehouseDB.client.from('sales_products').insert(payload);
    if(error) throw error;
    try{
      await saveSalesProductWarehouseCodes(payload.material_code,selectedWarehouseCodes);
    }catch(linkError){
      setSalesProductsSettingsStatus('تم حفظ الصنف، لكن تعذر حفظ مخازنه: '+(linkError.message||linkError),'err');
      return;
    }
    clearSalesProductSettingsForm();
    closeSalesProductWarehousesPanel();
    clearSalesReviewEngineCache();
    SALES_PRODUCTS_SETTINGS_LOADED=false;
    await loadSalesProductsSettings();
    setSalesProductsSettingsStatus('\u062A\u0645\u062A \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0646\u0641 \u0648\u0645\u062E\u0627\u0632\u0646\u0647 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','إضافة',`إضافة صنف بيع: ${payload.material_code}`);
  }catch(err){
    setSalesProductsSettingsStatus('\u062A\u0639\u0630\u0631 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0635\u0646\u0641: '+(err.message||err),'err');
  }
}
async function saveSalesProductSettingsRow(source){
  if(!hasPermission('settings_sales_products','edit')){ setSalesProductsSettingsStatus('غير متاح للصلاحية الحالية','err'); return; }
  const row=source?.closest ? (source.closest('[data-material-code]') || source.closest('tr')) : source;
  if(!row || !WarehouseDB?.ready || !CURRENT_AUTH_USER?.id) return;
  const materialCode=normalizeSalesProductCode(row.dataset.materialCode || row.querySelector('.sales-product-code-readonly')?.textContent || '');
  const payload={
    material_name:String(row.querySelector('.sales-product-name-edit')?.value||'').trim(),
    default_unit:normalizeSalesProductUnit(row.querySelector('.sales-product-unit-edit')?.value),
    use_in_sales_reports:row.querySelector('.sales-product-use-edit')?.value === 'true',
    is_active:row.querySelector('.sales-product-active-edit')?.value === 'true',
    sort_order:parseInt(row.querySelector('.sales-product-sort-edit')?.value||'0',10)||0
  };
  if(!payload.material_name){ setSalesProductsSettingsStatus('\u0627\u0633\u0645 \u0627\u0644\u0635\u0646\u0641 \u0645\u0637\u0644\u0648\u0628.','err'); return; }
  setSalesProductsSettingsStatus('\u062C\u0627\u0631\u064A \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0646\u0641...');
  try{
    const updateResult=await WarehouseDB.client
      .from('sales_products')
      .update(payload,{count:'exact'})
      .eq('material_code',materialCode)
      .select('id,material_code,material_name,default_unit,use_in_sales_reports,is_active,sort_order,updated_at,updated_by');
    if(updateResult.error) throw updateResult.error;
    if(updateResult.count !== 1 || !updateResult.data?.length) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0639\u062F\u064A\u0644 \u0623\u064A \u0635\u0641.');
    const verify=await fetchSalesProductSettingsRowDirect(materialCode);
    if(verify.error) throw verify.error;
    if(verify.count !== 1) throw new Error('\u0644\u0645 \u064A\u062A\u0645 \u062A\u0623\u0643\u064A\u062F \u0627\u0644\u062D\u0641\u0638.');
    const saved=verify.data?.[0];
    if(!saved || String(saved.material_name||'').trim()!==payload.material_name || normalizeSalesProductUnit(saved.default_unit)!==payload.default_unit || parseSalesProductBoolean(saved.use_in_sales_reports)!==payload.use_in_sales_reports || parseSalesProductBoolean(saved.is_active)!==payload.is_active){
      throw new Error('\u0644\u0645 \u062A\u062A\u063A\u064A\u0631 \u0628\u064A\u0627\u0646\u0627\u062A \u0627\u0644\u0635\u0646\u0641 \u0641\u0639\u0644\u064A\u0627\u064B \u0641\u064A Supabase.');
    }
    clearSalesReviewEngineCache();
    SALES_PRODUCTS_SETTINGS_LOADED=false;
    await loadSalesProductsSettings();
    setSalesProductsSettingsStatus('\u062A\u0645 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0646\u0641 \u0628\u0646\u062C\u0627\u062D.','ok');
    await logSystemActivity('الإعدادات','تعديل',`تعديل صنف بيع: ${materialCode}`);
  }catch(err){
    setSalesProductsSettingsStatus('\u062A\u0639\u0630\u0631 \u062D\u0641\u0638 \u062A\u0639\u062F\u064A\u0644 \u0627\u0644\u0635\u0646\u0641: '+(err.message||err),'err');
  }
}
function initSalesProductsSettings(){
  $('#salesProductSettingsForm')?.addEventListener('submit',addSalesProductSettingsRow);
  $('#selectSalesProductWarehousesBeforeAddBtn')?.addEventListener('click',openNewSalesProductWarehousesPanel);
  $('#saveSalesProductWarehousesBtn')?.addEventListener('click',saveSalesProductWarehouses);
  $('#closeSalesProductWarehousesPanel')?.addEventListener('click',closeSalesProductWarehousesPanel);
  const table=$('#salesProductsSettingsTable');
  if(!table || table.dataset.salesProductsSettingsBound==='1') return;
  table.dataset.noUniversalTable='1';
  table.dataset.salesProductsSettingsBound='1';
  table.addEventListener('click',e=>{
    const target=e.target?.closest ? e.target : e.target?.parentElement;
    const warehousesBtn=target?.closest('[data-action="sales-product-warehouses"]');
    if(warehousesBtn && table.contains(warehousesBtn)){
      e.preventDefault();
      openSalesProductWarehousesPanel(warehousesBtn);
      return;
    }
    const btn=target?.closest('[data-action="save-sales-product"]');
    if(!btn || !table.contains(btn)) return;
    e.preventDefault();
    saveSalesProductSettingsRow(btn);
  });
}

function initPasswordVisibilityToggles(){
  document.querySelectorAll('[data-password-toggle]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const input=document.getElementById(btn.dataset.passwordToggle||'');
      if(!input) return;
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.textContent=show?'إخفاء':'إظهار';
    });
  });
}
function initSettingsAccountSecurity(){
  $('#passwordChangeForm')?.addEventListener('submit',handlePasswordChangeSubmit);
  initPasswordVisibilityToggles();
  fillSettingsAccountPanel(CURRENT_APP_PROFILE,CURRENT_AUTH_USER);
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
  document.body.classList.remove('mobile-app-shell-active','mobile-dashboard-active','mobile-upload-reports-active','mobile-reports-active','mobile-dashboard-filter-open','mobile-dashboard-drawer-open','mobile-reports-filter-open');
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
  fillSettingsAccountPanel(profile,user);
  await loadPlantsCatalog({force:true});
  refreshPlantsCatalogConsumers();
  SYSTEM_SETTINGS_LOADED_USER_ID=null;
  PLANTS_SETTINGS_LOADED=false;
  applyNavigationPermissions();
  nav();
  initMobileDashboardShell();
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
  if(!hasPermission('settings_profile','edit')){ alert('غير متاح للصلاحية الحالية'); return; }
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
    fillSettingsAccountPanel(CURRENT_APP_PROFILE,CURRENT_AUTH_USER);
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

const ACTIVITY_LOG_COLUMNS=[
  {key:'index',label:'م'},
  {key:'user_name',label:'المستخدم'},
  {key:'user_role',label:'الصلاحية'},
  {key:'section',label:'القسم'},
  {key:'operation_type',label:'نوع العملية'},
  {key:'details',label:'التفاصيل'},
  {key:'created_date',label:'التاريخ'},
  {key:'created_time',label:'الوقت'}
];
const ACTIVITY_LOG_STATE={rows:[],filters:{},globalSearch:'',sortKey:'created_at',sortDir:'desc',page:1,pageSize:25,loaded:false};
function activityDateTimeParts(date=new Date()){
  const cairo=new Date(date.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));
  const pad=n=>String(n).padStart(2,'0');
  return {
    created_date:`${cairo.getFullYear()}-${pad(cairo.getMonth()+1)}-${pad(cairo.getDate())}`,
    created_time:`${pad(cairo.getHours())}:${pad(cairo.getMinutes())}:${pad(cairo.getSeconds())}`
  };
}
function currentActivityUserInfo(){
  const profile=CURRENT_APP_PROFILE||{};
  const user=CURRENT_AUTH_USER||{};
  return {
    user_id:user.id||null,
    user_name:profile.full_name||profile.name||user.email||'غير محدد',
    user_role:profile.role||'غير محدد'
  };
}
async function logSystemActivity(section,operationType,details,options={}){
  if(!WarehouseDB?.ready || !WarehouseDB.client?.from) return;
  const cleanDetails=String(details||'').trim();
  if(!cleanDetails) return;
  try{
    const actor={...currentActivityUserInfo(),...(options.user||{})};
    const parts=activityDateTimeParts();
    const payload={
      user_id:actor.user_id,
      user_name:actor.user_name||'غير محدد',
      user_role:actor.user_role||'غير محدد',
      section,
      operation_type:operationType,
      details:cleanDetails,
      created_date:parts.created_date,
      created_time:parts.created_time
    };
    const {error}=await WarehouseDB.client.from('system_activity_log').insert(payload);
    if(error) throw error;
    if(ACTIVITY_LOG_STATE.loaded) loadActivityLog({silent:true});
  }catch(err){
    console.warn('[activity-log] failed to write system activity',err);
  }
}
function activityExportSection(reportTitle=''){
  const title=String(reportTitle||'');
  if(title.includes('مستخدم')) return 'المستخدمين';
  if(title.includes('صلاحيات')) return 'الصلاحيات';
  if(title.includes('سجل الحركات')) return 'النظام';
  return 'التقارير';
}
function setActivityLogStatus(message,type=''){
  const el=$('#activityLogStatus');
  if(!el) return;
  el.textContent=message||'';
  el.className='upload-status '+(type||'');
}
function activityLogRowValue(row,key,index=0){
  if(key==='index') return String(index+1);
  if(key==='created_time') return String(row.created_time||'').slice(0,8);
  return row[key] == null ? '' : String(row[key]);
}
function filteredActivityLogRows(){
  const q=ACTIVITY_LOG_STATE.globalSearch.trim().toLowerCase();
  const filters=ACTIVITY_LOG_STATE.filters||{};
  let rows=(ACTIVITY_LOG_STATE.rows||[]).map((row,sourceIndex)=>({row,sourceIndex})).filter(item=>{
    const row=item.row;
    const hay=ACTIVITY_LOG_COLUMNS.slice(1).map(c=>activityLogRowValue(row,c.key)).join(' ').toLowerCase();
    if(q && !hay.includes(q)) return false;
    return ACTIVITY_LOG_COLUMNS.slice(1).every(col=>{
      const f=String(filters[col.key]||'').trim().toLowerCase();
      return !f || activityLogRowValue(row,col.key).toLowerCase().includes(f);
    });
  });
  const key=ACTIVITY_LOG_STATE.sortKey;
  const dir=ACTIVITY_LOG_STATE.sortDir==='asc' ? 1 : -1;
  rows=rows.sort((a,b)=>{
    if(key==='index') return (a.sourceIndex-b.sourceIndex)*dir;
    return String(activityLogRowValue(a.row,key)).localeCompare(String(activityLogRowValue(b.row,key)))*dir;
  });
  return rows.map(item=>item.row);
}
function renderActivityLogTable(){
  const tableEl=$('#activityLogTable');
  if(!tableEl) return;
  const filtered=filteredActivityLogRows();
  const totalPages=Math.max(1,Math.ceil(filtered.length/ACTIVITY_LOG_STATE.pageSize));
  if(ACTIVITY_LOG_STATE.page>totalPages) ACTIVITY_LOG_STATE.page=totalPages;
  const start=(ACTIVITY_LOG_STATE.page-1)*ACTIVITY_LOG_STATE.pageSize;
  const pageRows=filtered.slice(start,start+ACTIVITY_LOG_STATE.pageSize);
  const head=ACTIVITY_LOG_COLUMNS.map(col=>{
    const arrow=ACTIVITY_LOG_STATE.sortKey===col.key ? (ACTIVITY_LOG_STATE.sortDir==='asc'?'▲':'▼') : '';
    return `<th data-activity-sort="${escapeHtml(col.key)}">${escapeHtml(col.label)} <span>${arrow}</span></th>`;
  }).join('');
  const filters=ACTIVITY_LOG_COLUMNS.map(col=>{
    if(col.key==='index') return '<th></th>';
    return `<th><input class="activity-log-col-filter" data-activity-filter="${escapeHtml(col.key)}" value="${escapeHtml(ACTIVITY_LOG_STATE.filters[col.key]||'')}" placeholder="${escapeHtml(col.label)}" /></th>`;
  }).join('');
  const body=pageRows.length ? pageRows.map((row,idx)=>{
    const rowIndex=start+idx;
    return '<tr>'+ACTIVITY_LOG_COLUMNS.map(col=>{
      const value=activityLogRowValue(row,col.key,rowIndex);
      const cls=col.key==='details'?' class="activity-log-details"':'';
      return `<td${cls}>${escapeHtml(value)||'-'}</td>`;
    }).join('')+'</tr>';
  }).join('') : '<tr><td colspan="8" class="empty-row">لا توجد حركات مطابقة.</td></tr>';
  tableEl.innerHTML=`<thead><tr>${head}</tr><tr class="activity-log-filter-row">${filters}</tr></thead><tbody>${body}</tbody>`;
  applySettingsSubPermissions();
  const pager=$('#activityLogPagination');
  if(pager){
    pager.innerHTML=`<button type="button" data-activity-page="prev" ${ACTIVITY_LOG_STATE.page<=1?'disabled':''}>السابق</button><span>صفحة ${ACTIVITY_LOG_STATE.page} من ${totalPages} - ${filtered.length.toLocaleString('en-US')} حركة</span><button type="button" data-activity-page="next" ${ACTIVITY_LOG_STATE.page>=totalPages?'disabled':''}>التالي</button>`;
  }
}
async function loadActivityLog(options={}){
  if(!$('#activityLogTable')) return;
  if(!WarehouseDB?.ready){ setActivityLogStatus('Supabase غير متصل.','err'); return; }
  if(!options.silent) setActivityLogStatus('جاري تحميل سجل الحركات...');
  try{
    const {data,error}=await WarehouseDB.client
      .from('system_activity_log')
      .select('id,user_id,user_name,user_role,section,operation_type,details,created_date,created_time,created_at')
      .order('created_at',{ascending:false})
      .limit(1000);
    if(error) throw error;
    ACTIVITY_LOG_STATE.rows=data||[];
    ACTIVITY_LOG_STATE.loaded=true;
    renderActivityLogTable();
    if(!options.silent) setActivityLogStatus('تم تحميل سجل الحركات.','ok');
  }catch(err){
    setActivityLogStatus('تعذر تحميل سجل الحركات: '+(err.message||err),'err');
  }
}
function ensureActivityLogLoaded(){ if(!ACTIVITY_LOG_STATE.loaded) loadActivityLog(); }
function activityLogExportMatrix(){
  const rows=filteredActivityLogRows();
  return [ACTIVITY_LOG_COLUMNS.map(c=>c.label),...rows.map((row,idx)=>ACTIVITY_LOG_COLUMNS.map(col=>activityLogRowValue(row,col.key,idx)))];
}
async function exportActivityLogExcel(){
  if(!hasPermission('settings_activity_log','export_excel')){ alert('غير متاح للصلاحية الحالية'); return; }
  if(!window.XLSX){ alert('مكتبة Excel غير محملة.'); return; }
  const matrix=activityLogExportMatrix();
  if(matrix.length<=1){ alert('لا توجد بيانات للتصدير.'); return; }
  const ws=XLSX.utils.aoa_to_sheet(matrix);
  ws['!rtl']=true;
  const wb=XLSX.utils.book_new();
  wb.Workbook={Views:[{RTL:true}]};
  XLSX.utils.book_append_sheet(wb,ws,'سجل الحركات');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await saveBlobWithPicker(blob,`${safeFileName('سجل الحركات')}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  await logSystemActivity('النظام','تصدير Excel','تصدير سجل الحركات Excel');
}
async function exportActivityLogPdf(){
  if(!hasPermission('settings_activity_log','export_pdf')){ alert('غير متاح للصلاحية الحالية'); return; }
  const matrix=activityLogExportMatrix();
  if(matrix.length<=1){ alert('لا توجد بيانات للتصدير.'); return; }
  const previousPage=ACTIVITY_LOG_STATE.page;
  const previousPageSize=ACTIVITY_LOG_STATE.pageSize;
  try{
    ACTIVITY_LOG_STATE.page=1;
    ACTIVITY_LOG_STATE.pageSize=Math.max(1,matrix.length-1);
    renderActivityLogTable();
    await exportTableToPdf('activityLogTable','سجل الحركات');
  }finally{
    ACTIVITY_LOG_STATE.page=previousPage;
    ACTIVITY_LOG_STATE.pageSize=previousPageSize;
    renderActivityLogTable();
  }
}
function initActivityLogSettings(){
  const tableEl=$('#activityLogTable');
  if(!tableEl || tableEl.dataset.activityLogBound==='1') return;
  tableEl.dataset.noUniversalTable='1';
  tableEl.dataset.activityLogBound='1';
  $('#activityLogSearchInput')?.addEventListener('input',e=>{ ACTIVITY_LOG_STATE.globalSearch=e.target.value||''; ACTIVITY_LOG_STATE.page=1; renderActivityLogTable(); });
  $('#activityLogRefreshBtn')?.addEventListener('click',()=>loadActivityLog());
  $('#activityLogExportExcelBtn')?.addEventListener('click',exportActivityLogExcel);
  $('#activityLogExportPdfBtn')?.addEventListener('click',exportActivityLogPdf);
  tableEl.addEventListener('click',e=>{
    const th=e.target.closest('[data-activity-sort]');
    if(!th) return;
    const key=th.dataset.activitySort;
    if(ACTIVITY_LOG_STATE.sortKey===key) ACTIVITY_LOG_STATE.sortDir=ACTIVITY_LOG_STATE.sortDir==='asc'?'desc':'asc';
    else { ACTIVITY_LOG_STATE.sortKey=key; ACTIVITY_LOG_STATE.sortDir=key==='created_at'?'desc':'asc'; }
    renderActivityLogTable();
  });
  tableEl.addEventListener('input',e=>{
    const input=e.target.closest('[data-activity-filter]');
    if(!input) return;
    ACTIVITY_LOG_STATE.filters[input.dataset.activityFilter]=input.value||'';
    ACTIVITY_LOG_STATE.page=1;
    renderActivityLogTable();
  });
  $('#activityLogPagination')?.addEventListener('click',e=>{
    const btn=e.target.closest('[data-activity-page]');
    if(!btn) return;
    const rows=filteredActivityLogRows();
    const totalPages=Math.max(1,Math.ceil(rows.length/ACTIVITY_LOG_STATE.pageSize));
    if(btn.dataset.activityPage==='prev') ACTIVITY_LOG_STATE.page=Math.max(1,ACTIVITY_LOG_STATE.page-1);
    if(btn.dataset.activityPage==='next') ACTIVITY_LOG_STATE.page=Math.min(totalPages,ACTIVITY_LOG_STATE.page+1);
    renderActivityLogTable();
  });
}
function initSettingsTabs(){
  const root=$('#settings');
  if(!root) return;
  const tabs=[...root.querySelectorAll('[data-settings-tab]')];
  const panels=[...root.querySelectorAll('[data-settings-panel]')];
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    const key=tab.dataset.settingsTab;
    if(!canViewSettingsTab(key)){
      alert('غير متاح للصلاحية الحالية');
      applySettingsSubPermissions();
      return;
    }
    tabs.forEach(t=>{const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',active?'true':'false');});
    panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.settingsPanel===key));
    if(key==='system') ensureSystemSettingsLoaded();
    if(key==='plants-settings') ensurePlantsSettingsLoaded();
    if(key==='warehouses-settings') ensureWarehousesSettingsLoaded();
    if(key==='sales-products-settings') ensureSalesProductsSettingsLoaded();
    if(key==='activity-log') ensureActivityLogLoaded();
    initAllSettingsTableControls();
    applySettingsSubPermissions();
  }));
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
  {key:'settings_profile', label:'الإعدادات / البيانات الشخصية', description:'عرض وتعديل بيانات الحساب الشخصية'},
  {key:'settings_account', label:'الإعدادات / بيانات المستخدم وكلمة المرور', description:'عرض وتعديل بيانات المستخدم وكلمة المرور'},
  {key:'settings_system', label:'الإعدادات / إعدادات النظام', description:'عرض وتعديل إعدادات النظام'},
  {key:'settings_plants', label:'الإعدادات / إعدادات المصانع', description:'عرض وإضافة وتعديل وحذف إعدادات المصانع'},
  {key:'settings_warehouses', label:'الإعدادات / إعدادات المخازن', description:'عرض وإضافة وتعديل وحذف إعدادات المخازن'},
  {key:'settings_sales_products', label:'الإعدادات / إعدادات أصناف البيع', description:'عرض وإضافة وتعديل وحذف إعدادات أصناف البيع'},
  {key:'settings_activity_log', label:'الإعدادات / سجل الحركات', description:'عرض وتصدير سجل الحركات'},
  {key:'settings_sales_product_warehouses', label:'الإعدادات / ربط أصناف البيع بالمخازن', description:'عرض وإضافة وحذف ربط أصناف البيع بالمخازن'},
  {key:'settings', label:'الإعدادات', description:'بيانات الحساب وإعدادات النظام'}
];
const PERMISSION_ROLE_LABELS={admin:'Admin',auditor:'Auditor',viewer:'Viewer'};
let CURRENT_ROLE_PERMISSIONS = {};
let PERMISSIONS_MANAGEMENT_STATE={role:'admin', rows:[], view:[], dirty:false};
function permissionColumn(action){ return 'can_'+action; }
function defaultPermissionValue(role,screen,action){
  if(role==='admin') return true;
  if(role==='auditor'){
    if(String(screen||'').startsWith('settings_')) return false;
    if(['users','permissions','settings'].includes(screen)) return false;
    if(['delete','manage','approve'].includes(action)) return false;
    if(action==='add') return ['upload'].includes(screen);
    if(action==='edit') return ['sales','inbound','reports'].includes(screen);
    return ['view','upload','export_excel','export_pdf','export_png'].includes(action);
  }
  if(role==='viewer'){
    if(String(screen||'').startsWith('settings_')) return false;
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
  if(isSuperAdmin()){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions('admin'); applySettingsSubPermissions(); return; }
  const role=CURRENT_APP_PROFILE?.role || 'viewer';
  if(!WarehouseDB?.ready){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role); applySettingsSubPermissions(); return; }
  try{
    const {data,error}=await WarehouseDB.client.from('app_role_permissions').select('*').eq('role',role);
    CURRENT_ROLE_PERMISSIONS = error ? buildDefaultPermissions(role) : permissionsForRoleFromRows(role,data||[]);
  }catch(_){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role); }
  applySettingsSubPermissions();
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
  if(section==='settings'){
    applySettingsSubPermissions();
    return;
  }
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
    await logSystemActivity('الصلاحيات','تعديل صلاحيات مستخدم',`تعديل صلاحيات الدور: ${role}`);
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
    await logSystemActivity('المستخدمين',existingId?'تعديل مستخدم':'إضافة مستخدم',`${existingId?'تعديل مستخدم':'إضافة مستخدم'}: ${fullName}`);
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
    await logSystemActivity('المستخدمين','تعديل مستخدم',`${!currentActive?'تفعيل':'تعطيل'} مستخدم: ${u?.full_name || u?.email || userId}`);
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
    await logSystemActivity('المستخدمين','حذف مستخدم',`حذف مستخدم: ${label}`);
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

function initLoginPasswordToggle(){
  const input=$('#mainLoginPassword');
  const btn=$('#mainLoginPasswordToggle');
  if(!input || !btn) return;
  const eyeSvg='<span class="password-icon password-icon-eye" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg></span>';
  const eyeOffSvg='<span class="password-icon password-icon-eye-off" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"></path><path d="M10.6 10.6A3 3 0 0 0 13.4 13.4"></path><path d="M9.2 5.4A10.7 10.7 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3.1 4.1"></path><path d="M6.1 6.8C3.8 8.4 2.5 12 2.5 12s3.5 7 9.5 7c1.4 0 2.7-.4 3.8-1"></path></svg></span>';
  btn.innerHTML=eyeSvg;
  btn.addEventListener('click',()=>{
    const show=input.type==='password';
    input.type=show?'text':'password';
    btn.setAttribute('aria-pressed',show?'true':'false');
    btn.setAttribute('aria-label',show?'إخفاء كلمة المرور':'إظهار كلمة المرور');
    btn.innerHTML=show?eyeOffSvg:eyeSvg;
    input.focus();
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
      await logSystemActivity('المستخدمين','تسجيل دخول',`تسجيل دخول: ${CURRENT_APP_PROFILE?.full_name || data.user?.email || email}`);
    };
    [emailInput,passInput].forEach(inp=>{ if(inp) inp.addEventListener('keydown',e=>{ if(e.key==='Enter') loginBtn.click(); }); });
  }
  if(logoutBtn){
    logoutBtn.onclick=async()=>{
      await WarehouseDB.signOut();
      await logSystemActivity('المستخدمين','تسجيل خروج',`تسجيل خروج: ${CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || 'المستخدم الحالي'}`);
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
document.addEventListener('DOMContentLoaded',()=>{initMainLoginGate();initProfileSettings();initSettingsTabs();initSettingsAccountSecurity();initSystemSettings();initPlantsSettings();initWarehousesSettings();initSalesProductsSettings();initAllSettingsTableControls();initActivityLogSettings();applySettingsSubPermissions();initUsersManagement();initPermissionsManagement();});

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
  getPlantsCatalog().forEach(p=>pf.add(new Option(`${p.code} - ${p.name}`,p.code)));
  const saleWhCodes=['W401','W402','N401','N402','N411','N412','E401','E402'];
  function fillWh(){
    const old=wf.value;
    wf.innerHTML='<option value="all">كل مخازن البيع</option>';
    APP_DATA.plants
      .filter(p=>pf.value==='all'||p.code===pf.value)
      .forEach(p=>p.warehouses.filter(w=>saleWhCodes.includes(w[0])).forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]))));
    if([...wf.options].some(o=>o.value===old)) wf.value=old;
  }
  pf.addEventListener('change',()=>{clearUnifiedSalesRowsCache();fillWh();});
  wf.addEventListener('change',clearUnifiedSalesRowsCache);
  ['reportFromDate','reportToDate'].forEach(id=>document.getElementById(id)?.addEventListener('change',clearUnifiedSalesRowsCache));
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
  const plants=getPlantsCatalog().map(p=>p.code); const series=[{key:'sales',label:'البيع',color:'#74c54a'},{key:'production',label:'الإنتاج',color:'#2aa6e8'},{key:'outgoing',label:'الصادرة',color:'#ff9f2f'},{key:'incoming',label:'الواردة',color:'#b45cff'},{key:'loading',label:'التحميل',color:'#28c7bd'}];
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
  const plantRows=getPlantsCatalog().map(p=>`<tr><td>\u0623\u062F\u0627\u0621 \u0645\u0635\u0646\u0639</td><td>${p.code}</td><td>${p.name}</td><td>${fmt((plantStats[p.code]||{}).sales||0)}</td><td>${fmt((plantStats[p.code]||{}).production||0)}</td><td>${fmt((plantStats[p.code]||{}).outgoing||0)}</td><td>${fmt((plantStats[p.code]||{}).incoming||0)}</td><td>${fmt((plantStats[p.code]||{}).loading||0)}</td></tr>`).join('');
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
  let data=[]; try{ data=await fetchAllSalesAuditRows(filters,{ascending:true,orderBy:'material_code'}); }catch(error){console.warn('items report load error',error);return;} const map={};
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
  let data=[]; try{ data=await fetchAllSalesAuditRows(filters,{ascending:true,orderBy:'warehouse_code'}); }catch(error){console.warn('warehouses report load error',error);return;} const map={}, summary={sales:0,production:0,outgoing:0,incoming:0,loading:0};
  (data||[]).forEach(r=>{const code=String(r.warehouse_code||'').toUpperCase()||'-'; const meta=dashboardWhMeta(code); const plant=r.plant_code||meta.plant||'-'; if(!map[code]) map[code]={code,name:meta.name||r.warehouse_name||'-',plant,sales:0,production:0,outgoing:0,incoming:0,loading:0,totalActivity:0}; const w=map[code]; const sales=toNumber(r.sales_quantity),prod=toNumber(r.production_quantity),out=toNumber(r.outgoing_transfer_quantity),inc=toNumber(r.incoming_transfer_quantity),load=toNumber(r.total_loading_quantity); w.sales+=sales;w.production+=prod;w.outgoing+=out;w.incoming+=inc;w.loading+=load;w.totalActivity+=Math.abs(sales)+Math.abs(prod)+Math.abs(out)+Math.abs(inc)+Math.abs(load); summary.sales+=sales;summary.production+=prod;summary.outgoing+=out;summary.incoming+=inc;summary.loading+=load;});
  const warehouses=Object.values(map).sort((a,b)=>(b.totalActivity||0)-(a.totalActivity||0));
  WAREHOUSES_REPORT_STATE={warehouses,filters,summary}; if($('#warehousesReportMeta')) $('#warehousesReportMeta').textContent=reportFilterLabel(filters); renderWarehousesReportKPIs(summary); drawWarehousesReportChart(warehouses); renderWarehousesRanking(warehouses,summary); renderWarehouseMiniTables(warehouses,summary); renderWarehousesReportTables(warehouses,summary);
}


let EXCEPTIONS_REPORT_STATE={exceptions:[], filters:null, summary:null};
function buildSalesAuditItemMap(rows){
  const map={};
  filterSalesReviewRows(rows||[],SALES_REVIEW_CATALOG_CACHE).forEach(r=>{
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
  let data=[]; try{ data=await fetchAllSalesAuditRows(filters,{ascending:false}); }catch(error){console.warn('exceptions report load error',error);return;}
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
  const plantScores=getPlantsCatalog().map(p=>({...(calculateAuditScoreForPlant(p.code,modelBase)),name:p.name}));
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
  getPlantsCatalog().forEach(p=>plantStats[p.code]={sales:0,production:0,outgoing:0,incoming:0,loading:0,activity:0});
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
  const rows=(model?.auditScores?.plantScores||getPlantsCatalog().map(p=>({...p,score:100,status:auditScoreStatus(100)}))).map(r=>({code:r.plant||r.code,name:r.name,score:r.score,status:r.status}));
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
  if(getPlantsCatalog().some(p=>p.code===target)){
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
  let data=[]; try{ data=await fetchAllSalesAuditRows(filters,{ascending:true}); }catch(error){console.warn('smart analytics load error',error);return;}
  const model=buildSmartAnalyticsModel(data||[],filters);
  SMART_ANALYTICS_STATE=model;
  if($('#smartAnalyticsMeta')) $('#smartAnalyticsMeta').textContent=reportFilterLabel(filters);
  renderSmartKpiCards(model); drawSmartMixChart(model); drawSmartPlantScoreChart(model); renderSmartExecutiveSummary(model); renderSmartAlerts(model); renderSmartTopInsights(model); renderSmartRecommendations(model); renderSmartTrendAnalysis(model); renderSmartPlantScores(model); renderSmartExportTable(model);
}


// === Production Analytics Report ===
let PRODUCTION_ANALYTICS_STATE={rows:[],filters:null,summary:null,plants:[],products:[],daily:{},plantDaily:{}};
function productionDayKey(v){ return normalizeDateISO(v)||'غير محدد'; }
function buildProductionAnalyticsModel(rows,filters){
  const summary={total:0,days:0,avgDaily:0,maxDay:{date:'-',value:0},minDay:{date:'-',value:0},topPlant:null,stability:0,changePct:0};
  const plantMap={}, productMap={}, daily={}, plantDaily={};
  (rows||[]).forEach(r=>{
    const prod=toNumber(r.production_quantity);
    const date=productionDayKey(r.report_date);
    const plant=String(r.plant_code||dashboardPlantFromWarehouse(r.warehouse_code)||'غير محدد').toUpperCase();
    const plantName=r.plant_name || plantNameFromCatalog(plant) || plant;
    const code=String(r.material_code||'-');
    const name=r.material_name||'-';
    summary.total+=prod;
    daily[date]=(daily[date]||0)+prod;
    if(!plantMap[plant]) plantMap[plant]={code:plant,name:plantName,production:0,days:{},avg:0,pct:0,maxDay:{date:'-',value:0},minDay:{date:'-',value:0}};
    plantMap[plant].production+=prod;
    plantMap[plant].days[date]=(plantMap[plant].days[date]||0)+prod;
    if(!plantDaily[plant]) plantDaily[plant]={};
    plantDaily[plant][date]=(plantDaily[plant][date]||0)+prod;
    if(!productMap[code]) productMap[code]={code,name,production:0,pct:0};
    productMap[code].production+=prod;
  });
  const dayEntries=Object.entries(daily).sort(([a],[b])=>a.localeCompare(b));
  const positives=dayEntries.filter(([,v])=>v>0);
  summary.days=positives.length;
  summary.avgDaily=summary.days?summary.total/summary.days:0;
  if(positives.length){
    const sorted=[...positives].sort((a,b)=>b[1]-a[1]);
    summary.maxDay={date:sorted[0][0],value:sorted[0][1]};
    summary.minDay={date:sorted[sorted.length-1][0],value:sorted[sorted.length-1][1]};
    const values=positives.map(([,v])=>v), mean=summary.avgDaily;
    const variance=values.reduce((a,v)=>a+Math.pow(v-mean,2),0)/values.length;
    const cv=mean?Math.sqrt(variance)/mean:0;
    summary.stability=Math.max(0,Math.min(100,100-(cv*100)));
    const mid=Math.floor(values.length/2);
    const first=values.slice(0,mid||1).reduce((a,b)=>a+b,0)/Math.max(1,(mid||1));
    const second=values.slice(mid).reduce((a,b)=>a+b,0)/Math.max(1,values.slice(mid).length||1);
    summary.changePct=first?((second-first)/first)*100:0;
  }
  const plants=Object.values(plantMap).sort((a,b)=>b.production-a.production).map(p=>{
    const vals=Object.entries(p.days).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
    p.pct=summary.total?Math.abs(p.production)/Math.abs(summary.total)*100:0;
    p.avg=vals.length?p.production/vals.length:0;
    if(vals.length){ p.maxDay={date:vals[0][0],value:vals[0][1]}; p.minDay={date:vals[vals.length-1][0],value:vals[vals.length-1][1]}; }
    return p;
  });
  const products=Object.values(productMap).sort((a,b)=>b.production-a.production).map(p=>{p.pct=summary.total?Math.abs(p.production)/Math.abs(summary.total)*100:0; return p;});
  summary.topPlant=plants[0]||null;
  return {rows:rows||[],filters,summary,plants,products,daily,plantDaily};
}
function renderProductionKpis(model){
  const s=model.summary||{};
  const cards=[
    ['إجمالي إنتاج المصانع',s.total,'طن','🏭'],
    ['متوسط الإنتاج اليومي',s.avgDaily,'طن/يوم','📈'],
    ['أعلى يوم إنتاج',s.maxDay?.value||0,s.maxDay?.date||'-','🟢'],
    ['أقل يوم إنتاج',s.minDay?.value||0,s.minDay?.date||'-','🔴'],
    ['عدد أيام الإنتاج',s.days,'يوم','📅'],
    ['نسبة التغير',s.changePct||0,'%','↗']
  ];
  const node=$('#productionKpiCards');
  if(node) node.innerHTML=cards.map(c=>`<article class="kpi glass production-kpi"><h3>${c[0]}</h3><div class="num">${fmt(c[1])}</div><small>${escapeHtml(c[2])}</small><div class="icon">${c[3]}</div></article>`).join('');
}
function drawProductionPlantBar(plants){
  const canvas=$('#productionPlantBarChart'); if(!canvas) return; const ctx=canvas.getContext('2d'), w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const data=(plants||[]).slice(0,8); if(!data.length){ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات إنتاج',w/2,h/2);return;}
  const max=Math.max(1,...data.map(p=>Math.abs(p.production||0))); const pad={l:58,r:24,t:34,b:55}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(255,255,255,.13)'; ctx.fillStyle='#cfe8d0'; ctx.font='bold 11px Cairo'; ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/4),pad.l-8,y+4);}
  const barW=Math.min(70,cw/data.length*.55);
  data.forEach((p,i)=>{const x=pad.l+(i+.5)*(cw/data.length)-barW/2; const bh=Math.abs(p.production)/max*ch; const y=pad.t+ch-bh; const grd=ctx.createLinearGradient(0,y,0,pad.t+ch); grd.addColorStop(0,colors[i%colors.length]); grd.addColorStop(1,'rgba(81,184,72,.18)'); ctx.fillStyle=grd; ctx.fillRect(x,y,barW,bh); ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 12px Cairo';ctx.fillText(fmt(p.production),x+barW/2,y-7);ctx.fillStyle='#eaffdf';ctx.font='bold 13px Cairo';ctx.fillText(p.code,x+barW/2,pad.t+ch+26);});
}
function drawProductionContributionDonut(plants){
  const canvas=$('#productionContributionDonut'), legend=$('#productionContributionLegend'); if(!canvas) return; const ctx=canvas.getContext('2d'), w=canvas.width,h=canvas.height; ctx.clearRect(0,0,w,h);
  const entries=(plants||[]).filter(p=>Math.abs(p.production)>0).slice(0,8); const sum=entries.reduce((a,p)=>a+Math.abs(p.production),0); if(!sum){ctx.fillStyle='#d6ead1';ctx.font='bold 18px Cairo';ctx.textAlign='center';ctx.fillText('لا توجد بيانات',w/2,h/2); if(legend) legend.innerHTML=''; return;}
  const cx=w*.34,cy=h*.5,r=Math.min(w,h)*.32,ir=r*.55; let a=-Math.PI/2;
  entries.forEach((p,i)=>{const ang=Math.abs(p.production)/sum*Math.PI*2; ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,a,a+ang);ctx.closePath();ctx.fillStyle=colors[i%colors.length];ctx.fill();a+=ang;});
  ctx.beginPath();ctx.arc(cx,cy,ir,0,Math.PI*2);ctx.fillStyle='#00251f';ctx.fill();ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 18px Cairo';ctx.fillText(fmt(sum),cx,cy-2);ctx.font='bold 12px Cairo';ctx.fillStyle='#d8ffd1';ctx.fillText('طن',cx,cy+20);
  if(legend) legend.innerHTML=entries.map((p,i)=>`<div><span style="background:${colors[i%colors.length]}"></span><b>${escapeHtml(p.code)}</b> ${fmt(p.pct)}% - ${fmt(p.production)} طن</div>`).join('');
}
function heatClass(value,min,max){
  return getHeatmapCellClass(value,min,max,{includeBase:true});
}
function renderProductionPlantHeatmap(model){
  const node=$('#productionPlantHeatmap'); if(!node) return; const days=Object.keys(model.daily||{}).sort(); const plants=model.plants||[];
  if(!days.length || !plants.length){ node.innerHTML='<div class="empty-row">لا توجد بيانات إنتاج</div>'; return; }
  const cols=`92px repeat(${days.length}, minmax(58px,1fr))`;
  const dayHead=days.map(d=>`<span>${escapeHtml(d.slice(5))}</span>`).join('');
  const rows=plants.map(p=>{
    const rowValues=days.map(d=>Math.abs(toNumber(model.plantDaily[p.code]?.[d]||0)));
    const positives=rowValues.filter(v=>v>0);
    const rowMax=Math.max(...positives,0);
    const rowMin=positives.length?Math.min(...positives):0;
    return `<div class="prod-heat-row" style="grid-template-columns:${cols}"><strong>${escapeHtml(p.code)}</strong>${days.map((d,idx)=>{const v=rowValues[idx]||0; return `<i class="${heatClass(v,rowMin,rowMax)}" title="${escapeHtml(p.code)} / ${escapeHtml(d)} / ${fmt(v)} طن"><b>${fmt(v)}</b></i>`;}).join('')}</div>`;
  }).join('');
  node.innerHTML=`<div class="prod-heat-head" style="grid-template-columns:${cols}"><strong>المصنع</strong>${dayHead}</div>${rows}<div class="prod-heat-scale"><span>أقل يوم داخل كل مصنع</span><em></em><span>أعلى يوم داخل كل مصنع</span></div>`;
}
function renderProductionAllHeatmap(model){
  const node=$('#productionAllHeatmap'); if(!node) return; const entries=Object.entries(model.daily||{}).sort(([a],[b])=>a.localeCompare(b));
  if(!entries.length){node.innerHTML='<div class="empty-row">لا توجد بيانات إنتاج</div>';return;}
  const values=entries.map(([,v])=>Math.abs(toNumber(v))).filter(v=>v>0), max=Math.max(...values,0), min=values.length?Math.min(...values):0;
  node.innerHTML=`<div class="production-all-grid">${entries.map(([d,v])=>{const val=Math.abs(toNumber(v)); return `<div class="all-heat-cell ${heatClass(val,min,max)}" title="${escapeHtml(d)} - ${fmt(val)} طن"><b>${escapeHtml(d.slice(5))}</b><span>${fmt(val)}</span></div>`;}).join('')}</div><div class="prod-heat-scale"><span>أقل يوم إنتاج</span><em></em><span>أعلى يوم إنتاج</span></div>`;
}
function renderProductionTopProducts(products){
  renderRankTable('#productionTopProductsTable',['#','كود الصنف','اسم الصنف','إجمالي الإنتاج','النسبة'],(products||[]).slice(0,10).map((p,i)=>[i+1,escapeHtml(p.code),escapeHtml(p.name),fmt(p.production),`${fmt(p.pct)}%`]));
}
function renderProductionInsights(model){
  const s=model.summary||{}, top=model.products?.[0]||{}, lowPlant=[...(model.plants||[])].sort((a,b)=>a.production-b.production)[0]||{};
  const lines=[
    ['🏆',`أعلى مصنع إنتاجاً: ${s.topPlant?.code||'-'} بإجمالي ${fmt(s.topPlant?.production||0)} طن`],
    ['📦',`أعلى صنف إنتاجاً: ${top.code||'-'} - ${escapeHtml(top.name||'-')} بإجمالي ${fmt(top.production||0)} طن`],
    ['📉',`أقل مصنع إنتاجاً: ${lowPlant.code||'-'} بإجمالي ${fmt(lowPlant.production||0)} طن`],
    ['🟢',`أعلى يوم إنتاج: ${s.maxDay?.date||'-'} بقيمة ${fmt(s.maxDay?.value||0)} طن`],
    ['🔴',`أقل يوم إنتاج: ${s.minDay?.date||'-'} بقيمة ${fmt(s.minDay?.value||0)} طن`],
    ['🛡️',`مؤشر استقرار الإنتاج: ${fmt(s.stability||0)}%`]
  ];
  const node=$('#productionInsights'); if(node) node.innerHTML=lines.map(l=>`<div class="production-insight"><span>${l[0]}</span><b>${l[1]}</b></div>`).join('');
}
function renderProductionExportTable(model){
  const tbl=$('#productionAnalyticsExportTable'); if(!tbl) return;
  const plantRows=(model.plants||[]).map((p,i)=>`<tr><td>مصنع</td><td>${i+1}</td><td>${escapeHtml(p.code)}</td><td>${escapeHtml(p.name)}</td><td>${fmt(p.production)}</td><td>${fmt(p.pct)}%</td></tr>`).join('');
  const productRows=(model.products||[]).slice(0,10).map((p,i)=>`<tr><td>صنف</td><td>${i+1}</td><td>${escapeHtml(p.code)}</td><td>${escapeHtml(p.name)}</td><td>${fmt(p.production)}</td><td>${fmt(p.pct)}%</td></tr>`).join('');
  tbl.innerHTML=`<thead><tr><th>النوع</th><th>#</th><th>الكود</th><th>البيان</th><th>الإنتاج</th><th>النسبة</th></tr></thead><tbody><tr><td>إجمالي</td><td>-</td><td>-</td><td>إجمالي إنتاج المصانع</td><td>${fmt(model.summary?.total||0)}</td><td>100%</td></tr>${plantRows}${productRows}</tbody>`;
}
async function loadProductionAnalyticsReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let data=[]; try{ data=await fetchAllSalesAuditRows(filters,{ascending:true}); }catch(error){console.warn('production analytics load error',error);return;}
  const model=buildProductionAnalyticsModel(data||[],filters); PRODUCTION_ANALYTICS_STATE=model;
  if($('#productionAnalyticsMeta')) $('#productionAnalyticsMeta').textContent=reportFilterLabel(filters);
  renderProductionKpis(model); drawProductionPlantBar(model.plants); drawProductionContributionDonut(model.plants); renderProductionPlantHeatmap(model); renderProductionAllHeatmap(model); renderProductionTopProducts(model.products); renderProductionInsights(model); renderProductionExportTable(model);
}


const SALES_TOTALS_GROUPS = [
  {title:'إجمالي كل مخازن البيع', codes:['W401','N401','N411','N412','E401','W402','N402','E402']},
  {title:'مبيعات المنتج التام', codes:['W401','N401','N411','N412','E401']},
  {title:'مبيعات الدشيشة والخامات', codes:['W402','N402','E402']},
  {title:'مبيعات مخزن W401', codes:['W401']},
  {title:'مبيعات مخزن W402', codes:['W402']},
  {title:'مبيعات مخزن N401', codes:['N401']},
  {title:'مبيعات مخزن N402', codes:['N402']},
  {title:'مبيعات مخزن N411', codes:['N411']},
  {title:'مبيعات مخزن N412', codes:['N412']},
  {title:'مبيعات مخزن E401', codes:['E401']},
  {title:'مبيعات مخزن E402', codes:['E402']}
];
function salesTotalsCardHtml(title,value,unit,icon){
  return `<article class="kpi glass sales-total-kpi"><h3>${escapeHtml(title)}</h3><div class="num">${fmt(value)}</div><small>${escapeHtml(unit||'طن')}</small><div class="icon">${icon||''}</div></article>`;
}
function renderSalesTotalsReport(groups,filters){
  const node=$('#salesTotalsRows'); if(!node) return;
  node.innerHTML=(groups||[]).map(group=>`
    <article class="panel glass sales-totals-row-card">
      <div class="sales-totals-row-head">
        <h3>${escapeHtml(group.title)}</h3>
        <span>${escapeHtml(group.codes.join(' / '))}</span>
      </div>
      <div class="cards report-kpis sales-totals-kpis">
        ${salesTotalsCardHtml('إجمالي البيع',group.stats.salesQty,'طن','🛒')}
        ${salesTotalsCardHtml('إجمالي الإنتاج',group.stats.productionQty,'طن','🏭')}
        ${salesTotalsCardHtml('إجمالي التحويلات الصادرة',group.stats.outgoingTransferQty,'طن','↔')}
        ${salesTotalsCardHtml('إجمالي التحويلات الواردة',group.stats.incomingTransferQty,'طن','⬇')}
        ${salesTotalsCardHtml('إجمالي التحميل',group.stats.totalLoadingQty,'طن','📦')}
      </div>
    </article>`).join('');
  const tbl=$('#salesTotalsExportTable');
  if(tbl){
    tbl.innerHTML=`<thead><tr><th>الصف</th><th>المخازن</th><th>إجمالي البيع</th><th>إجمالي الإنتاج</th><th>إجمالي التحويلات الصادرة</th><th>إجمالي التحويلات الواردة</th><th>إجمالي التحميل</th></tr></thead><tbody>${(groups||[]).map(g=>`<tr><td>${escapeHtml(g.title)}</td><td>${escapeHtml(g.codes.join(' / '))}</td><td>${fmt(g.stats.salesQty)}</td><td>${fmt(g.stats.productionQty)}</td><td>${fmt(g.stats.outgoingTransferQty)}</td><td>${fmt(g.stats.incomingTransferQty)}</td><td>${fmt(g.stats.totalLoadingQty)}</td></tr>`).join('')}</tbody>`;
  }
  if($('#salesTotalsReportMeta')) $('#salesTotalsReportMeta').textContent=`الفترة: ${filters.from||'--'} → ${filters.to||'--'} `;
}
async function loadSalesTotalsReport(options={}){
  if(!WarehouseDB?.ready) return;
  const reportPerfStart=salesPerfNow();
  const reportPerfLabel='loadSalesTotalsReport';
  console.time(reportPerfLabel);
  fillReportFilters();
  await ensureReportDefaultDates(options);
  const filters=getReportFilters();
  let rows=[];
  try{ rows=await fetchUnifiedSalesRows(filters,{ascending:true}); }catch(error){ console.warn('sales totals report load error',error); return; }
  const catalog=await loadSalesReviewCatalog();
  const model=buildUnifiedSalesTotals(rows,{filters,groups:SALES_TOTALS_GROUPS,catalog,source:'sales_audit_report'});
  const renderPerfLabel='renderSalesTotalsReport '+unifiedSalesRowsCacheKey(filters);
  const renderPerfStart=salesPerfNow();
  console.time(renderPerfLabel);
  renderSalesTotalsReport(model.groups,filters);
  console.timeEnd(renderPerfLabel);
  salesPerfLog('renderSalesTotalsReport',renderPerfStart,{groups:model.groups.length,rows:model.rows.length});
  console.timeEnd(reportPerfLabel);
  salesPerfLog('loadSalesTotalsReport',reportPerfStart,{sourceRows:rows.length,filteredRows:model.rows.length,groups:model.groups.length});
}

function syncMobileReportsDropdown(tab=ACTIVE_REPORT_TAB){
  const select=$('#mobileReportsTabSelect');
  if(select && tab && select.value!==tab) select.value=tab;
}
let MOBILE_REPORTS_UI_BOUND=false;
function closeMobileReportsFilters(){
  const filters=$('#executiveReportFilters');
  const opener=$('#mobileReportsFilterBtn');
  if(filters && filters.contains(document.activeElement)){
    opener?.focus({preventScroll:true});
  }
  document.body.classList.remove('mobile-reports-filter-open');
  opener?.setAttribute('aria-expanded','false');
  $('#mobileReportsFilterOverlay')?.setAttribute('aria-hidden','true');
}
function openMobileReportsFilters(){
  document.body.classList.add('mobile-reports-filter-open');
  $('#mobileReportsFilterBtn')?.setAttribute('aria-expanded','true');
  $('#mobileReportsFilterOverlay')?.setAttribute('aria-hidden','false');
  setTimeout(()=>$('#mobileReportsFilterCloseBtn')?.focus({preventScroll:true}),0);
}
function initMobileReportsUI(){
  const select=$('#mobileReportsTabSelect');
  const tabs=[...document.querySelectorAll('.report-tabs .report-tab[data-report-tab]')];
  if(select && tabs.length && !select.options.length){
    tabs.forEach(tab=>select.add(new Option(tab.textContent.trim(),tab.dataset.reportTab)));
    syncMobileReportsDropdown(ACTIVE_REPORT_TAB || tabs.find(t=>t.classList.contains('active'))?.dataset.reportTab || tabs[0]?.dataset.reportTab);
  }
  if(select && !select.dataset.bound){
    select.dataset.bound='1';
    select.addEventListener('change',()=>{
      const tab=document.querySelector(`.report-tabs .report-tab[data-report-tab="${select.value}"]`);
      if(tab) tab.click();
    });
  }
  if(MOBILE_REPORTS_UI_BOUND) return;
  MOBILE_REPORTS_UI_BOUND=true;
  document.addEventListener('click',event=>{
    const reportTab=event.target.closest('.report-tabs .report-tab[data-report-tab]');
    if(reportTab) syncMobileReportsDropdown(reportTab.dataset.reportTab);
    if(event.target.closest('#mobileReportsFilterBtn')){
      event.preventDefault();
      openMobileReportsFilters();
      return;
    }
    if(event.target.closest('#mobileReportsFilterOverlay,#mobileReportsFilterCloseBtn')){
      event.preventDefault();
      closeMobileReportsFilters();
    }
  });
}
function switchReportTab(tab){
  ACTIVE_REPORT_TAB=tab;
  syncMobileReportsDropdown(tab);
  document.querySelectorAll('[data-report-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.reportTab===tab));
  const exec=$('#executiveReportContent'), salesTotals=$('#salesTotalsReportContent'), items=$('#itemsReportContent'), warehouses=$('#warehousesReportContent'), exceptions=$('#exceptionsReportContent'), smart=$('#smartAnalyticsContent'), production=$('#productionAnalyticsContent');
  if(exec) exec.style.display=tab==='executive'?'flex':'none';
  if(salesTotals) salesTotals.style.display=tab==='salesTotals'?'flex':'none';
  if(items) items.style.display=tab==='items'?'flex':'none';
  if(warehouses) warehouses.style.display=tab==='warehouses'?'flex':'none';
  if(exceptions) exceptions.style.display=tab==='exceptions'?'flex':'none';
  if(smart) smart.style.display=tab==='smart'?'flex':'none';
  if(production) production.style.display=tab==='production'?'flex':'none';
  if(tab==='executive') loadExecutiveReport({keepDates:true});
  if(tab==='salesTotals') loadSalesTotalsReport({keepDates:true});
  if(tab==='items') loadItemsReport({keepDates:true});
  if(tab==='warehouses') loadWarehousesReport({keepDates:true});
  if(tab==='exceptions') loadExceptionsReport({keepDates:true});
  if(tab==='smart') loadSmartAnalyticsReport({keepDates:true});
  if(tab==='production') loadProductionAnalyticsReport({keepDates:true});
}
function loadActiveReport(options={}){
  if(ACTIVE_REPORT_TAB==='salesTotals') return loadSalesTotalsReport(options);
  if(ACTIVE_REPORT_TAB==='items') return loadItemsReport(options);
  if(ACTIVE_REPORT_TAB==='warehouses') return loadWarehousesReport(options);
  if(ACTIVE_REPORT_TAB==='exceptions') return loadExceptionsReport(options);
  if(ACTIVE_REPORT_TAB==='smart') return loadSmartAnalyticsReport(options);
  if(ACTIVE_REPORT_TAB==='production') return loadProductionAnalyticsReport(options);
  return loadExecutiveReport(options);
}
function exportActiveReportExcel(){
  if(ACTIVE_REPORT_TAB==='salesTotals') return exportTableToExcel('salesTotalsExportTable','ملخص مبيعات المخازن');
  if(ACTIVE_REPORT_TAB==='items') return exportTableToExcel('itemsReportExportTable','تقرير مراجعة الأصناف');
  if(ACTIVE_REPORT_TAB==='warehouses') return exportTableToExcel('warehousesReportExportTable','تقرير أداء المخازن');
  if(ACTIVE_REPORT_TAB==='exceptions') return exportTableToExcel('exceptionsReportExportTable','تقرير الاستثناءات والمراجعة');
  if(ACTIVE_REPORT_TAB==='smart') return exportTableToExcel('smartAnalyticsExportTable','التحليلات الذكية');
  if(ACTIVE_REPORT_TAB==='production') return exportTableToExcel('productionAnalyticsExportTable','تحليلات الإنتاج');
  return exportTableToExcel('executiveExportTable','التقرير التنفيذي لمراجعة المخازن');
}
function exportActiveReportPdf(){
  if(ACTIVE_REPORT_TAB==='salesTotals') return exportTableToPdf('salesTotalsExportTable','ملخص مبيعات المخازن');
  if(ACTIVE_REPORT_TAB==='items') return exportTableToPdf('itemsReportExportTable','تقرير مراجعة الأصناف');
  if(ACTIVE_REPORT_TAB==='warehouses') return exportTableToPdf('warehousesReportExportTable','تقرير أداء المخازن');
  if(ACTIVE_REPORT_TAB==='exceptions') return exportTableToPdf('exceptionsReportExportTable','تقرير الاستثناءات والمراجعة');
  if(ACTIVE_REPORT_TAB==='smart') return exportTableToPdf('smartAnalyticsExportTable','التحليلات الذكية');
  if(ACTIVE_REPORT_TAB==='production') return exportTableToPdf('productionAnalyticsExportTable','تحليلات الإنتاج');
  return exportTableToPdf('executiveExportTable','التقرير التنفيذي لمراجعة المخازن');
}
function activeReportVisualInfo(){
  const map={
    executive:{id:'executiveReportContent',title:'التقرير التنفيذي لمراجعة المخازن'},
    salesTotals:{id:'salesTotalsReportContent',title:'ملخص مبيعات المخازن'},
    items:{id:'itemsReportContent',title:'تقرير مراجعة الأصناف'},
    warehouses:{id:'warehousesReportContent',title:'تقرير أداء المخازن'},
    exceptions:{id:'exceptionsReportContent',title:'تقرير الاستثناءات والمراجعة'},
    smart:{id:'smartAnalyticsContent',title:'التحليلات الذكية'},
    production:{id:'productionAnalyticsContent',title:'تحليلات الإنتاج'}
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
function reportExportDateText(value){
  const d=normalizeDateISO(value||'');
  if(!d) return '';
  const parts=d.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}
function currentReportExportPeriodText(){
  const from=normalizeDateISO($('#reportFromDate')?.value || '');
  const to=normalizeDateISO($('#reportToDate')?.value || '');
  if(from && to && from===to) return `تاريخ التقرير: ${reportExportDateText(from)}`;
  if(from || to) return `الفترة: ${reportExportDateText(from) || 'البداية'} → ${reportExportDateText(to) || 'النهاية'}`;
  return 'تاريخ التقرير: --/--/----';
}
function styleSalesTotalsExportCard(card){
  card.classList.add('sales-totals-png-main-card');
  card.style.cssText=[
    'box-sizing:border-box',
    'min-width:0',
    'min-height:390px',
    'padding:16px',
    'border-radius:20px',
    'border:1px solid rgba(141,220,89,.32)',
    'background:linear-gradient(150deg,rgba(0,58,43,.88),rgba(0,24,20,.96))',
    'box-shadow:0 18px 42px rgba(0,0,0,.26)',
    'overflow:hidden'
  ].join(';');
  card.querySelectorAll('.widget-png-btn,.mobile-kpi-group-png-btn,.mobile-period-png-btn,.export-btn').forEach(el=>el.remove());
  const head=card.querySelector('.sales-totals-row-head');
  if(head){
    head.style.cssText='display:flex;flex-direction:column;align-items:flex-start;gap:7px;margin:0 0 14px;padding-bottom:12px;border-bottom:1px solid rgba(141,220,89,.22);text-align:right;';
    const title=head.querySelector('h3');
    if(title) title.style.cssText='margin:0;color:#fff;font-size:20px;line-height:1.35;font-weight:900;';
    const codes=head.querySelector('span');
    if(codes) codes.style.cssText='display:block;max-width:100%;color:#a7ee73;font-size:13px;line-height:1.45;font-weight:800;direction:ltr;text-align:left;overflow-wrap:anywhere;';
  }
  const grid=card.querySelector('.sales-totals-kpis');
  if(grid){
    grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;width:100%;margin:0;';
  }
  card.querySelectorAll('.sales-total-kpi').forEach((kpi,idx)=>{
    kpi.style.cssText=[
      'box-sizing:border-box',
      'min-width:0',
      `min-height:${idx===4?'92':'116'}px`,
      'padding:14px 12px',
      'border-radius:16px',
      'border:1px solid rgba(141,220,89,.36)',
      'background:linear-gradient(145deg,rgba(0,62,43,.52),rgba(0,28,23,.78))',
      'position:relative',
      'overflow:hidden',
      idx===4?'grid-column:1/-1':''
    ].filter(Boolean).join(';');
    const h=kpi.querySelector('h3');
    if(h) h.style.cssText='margin:0 0 8px;color:#f4fff5;font-size:12px;line-height:1.45;font-weight:800;text-align:right;';
    const num=kpi.querySelector('.num');
    if(num) num.style.cssText='color:#fff;font-size:23px;line-height:1.1;font-weight:900;';
    const unit=kpi.querySelector('small');
    if(unit) unit.style.cssText='color:#d4ebd5;font-size:11px;';
    const icon=kpi.querySelector('.icon');
    if(icon) icon.style.cssText='position:absolute;left:10px;bottom:10px;width:38px;height:38px;border-radius:13px;display:grid;place-items:center;background:rgba(141,220,89,.12);border:1px solid rgba(141,220,89,.18);font-size:22px;opacity:.95;color:#9be650;';
  });
}
async function exportSalesTotalsReportPng(){
  const source=$('#salesTotalsRows');
  const cards=[...(source?.querySelectorAll('.sales-totals-row-card')||[])];
  if(!cards.length){ alert('لا توجد مجموعات لتصديرها.'); return; }
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  const exportBox=document.createElement('section');
  exportBox.className='sales-totals-png-export-box';
  exportBox.dir='rtl';
  exportBox.lang='ar';
  exportBox.setAttribute('aria-hidden','true');
  exportBox.style.cssText=[
    'position:fixed','top:0','left:0','z-index:-1','width:1800px','min-height:400px','padding:28px','box-sizing:border-box',
    'background:radial-gradient(circle at 50% 0%,rgba(94,180,71,.14),transparent 36%),linear-gradient(180deg,#00291f,#001611)',
    'color:#fff','direction:rtl','font-family:Cairo,Arial,sans-serif','overflow:visible','pointer-events:none'
  ].join(';');
  const header=document.createElement('header');
  header.style.cssText='display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px;padding-bottom:16px;border-bottom:1px solid rgba(141,220,89,.28);';
  header.innerHTML=`<h2 style="margin:0;color:#fff;font-size:32px;line-height:1.25;font-weight:900;">ملخص مبيعات المخازن</h2><p style="margin:0;color:#bdf2a0;font-size:17px;line-height:1.4;font-weight:800;">${escapeHtml(currentReportExportPeriodText())}</p>`;
  const grid=document.createElement('div');
  grid.className='sales-totals-png-export-grid';
  grid.style.cssText='display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;width:100%;align-items:stretch;';
  cards.forEach(card=>{
    const clone=card.cloneNode(true);
    styleSalesTotalsExportCard(clone);
    grid.appendChild(clone);
  });
  exportBox.append(header,grid);
  document.body.appendChild(exportBox);
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=exportBox.getBoundingClientRect();
    const width=Math.ceil(exportBox.scrollWidth);
    const height=Math.ceil(exportBox.scrollHeight);
    if(!rect.width || !rect.height || !width || !height) throw new Error('Invalid sales totals export dimensions');
    const canvas=await Html2Canvas(exportBox,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#001611',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
    canvas.toBlob(async blob=>{
      if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
      await saveBlobWithPicker(blob,`${safeFileName('ملخص مبيعات المخازن')}.png`,'image/png');
    },'image/png',1);
  }catch(err){
    console.error(err);
    alert('تعذر تصدير ملخص مبيعات المخازن. حاول مرة أخرى.');
  }finally{
    try{ exportBox.remove(); }catch(_){}
  }
}
async function exportActiveReportPng(){
  if(ACTIVE_REPORT_TAB==='salesTotals') return exportSalesTotalsReportPng();
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
    await logSystemActivity(activityExportSection(info.title),'تصدير PDF',`تصدير ${info.title} PDF`);
  }catch(err){
    console.error(err);
    alert('تعذر تصدير PDF. حاول مرة أخرى.');
  }
}

async function loadExecutiveReport(options={}){
  if(!WarehouseDB?.ready) return; fillReportFilters(); await ensureReportDefaultDates(options); const filters=getReportFilters();
  let rows=[]; try{ rows=await fetchAllSalesAuditRows(filters,{ascending:false}); }catch(error){console.warn('executive report load error',error);return;}
  const stats={salesQty:0,productionQty:0,outgoingTransferQty:0,incomingTransferQty:0,totalLoadingQty:0}; const daily={}, productMap={}, whMap={}, whSalesMap={}, plantStats={}; getPlantsCatalog().forEach(p=>plantStats[p.code]={sales:0,production:0,outgoing:0,incoming:0,loading:0});
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
  initMobileReportsUI();
  document.querySelectorAll('[data-report-tab]').forEach(btn=>{
    if(!btn.disabled) btn.addEventListener('click',()=>switchReportTab(btn.dataset.reportTab));
  });
  $('#reportSearchBtn')?.addEventListener('click',()=>loadActiveReport({keepDates:true}));
  $('#reportResetBtn')?.addEventListener('click',()=>{
    clearUnifiedSalesRowsCache();
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










