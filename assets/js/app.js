function roundRect(ctx,x,y,w,h,r,fill,stroke){
  const rr=Math.min(r||0, Math.abs(w)/2, Math.abs(h)/2);
  ctx.beginPath(); ctx.moveTo(x+rr,y); ctx.lineTo(x+w-rr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+rr); ctx.lineTo(x+w,y+h-rr); ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h); ctx.lineTo(x+rr,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-rr); ctx.lineTo(x,y+rr); ctx.quadraticCurveTo(x,y,x+rr,y); ctx.closePath(); if(fill)ctx.fill(); if(stroke)ctx.stroke();
}
const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);

// Central application-modal stack and scroll lock. Each modal owns one token;
// the underlying scroll root is restored only after the last token is released.
const APP_MODAL_SCROLL_LOCKS=new Map();
let APP_MODAL_SCROLL_SNAPSHOT=null;
let APP_MODAL_SCROLL_OBSERVER=null;
function getApplicationModalScrollRoot(){
  if(document.body?.classList.contains('focus-mode-active')) return document.querySelector('.main') || document.scrollingElement || document.documentElement;
  return document.scrollingElement || document.documentElement;
}
function captureApplicationModalScrollRoot(root){
  if(!root) return null;
  return {root,overflowY:root.style.overflowY};
}
function restoreApplicationModalScrollRoot(){
  const snapshot=APP_MODAL_SCROLL_SNAPSHOT;
  APP_MODAL_SCROLL_SNAPSHOT=null;
  if(snapshot?.root) snapshot.root.style.overflowY=snapshot.overflowY;
}
function applyApplicationModalScrollRoot(){
  const root=getApplicationModalScrollRoot();
  if(!root) return;
  if(APP_MODAL_SCROLL_SNAPSHOT?.root===root){root.style.overflowY='hidden';return;}
  restoreApplicationModalScrollRoot();
  APP_MODAL_SCROLL_SNAPSHOT=captureApplicationModalScrollRoot(root);
  root.style.overflowY='hidden';
}
function hasActiveAppModalScrollLock(){return APP_MODAL_SCROLL_LOCKS.size>0;}
function topApplicationModalLock(){
  const entries=[...APP_MODAL_SCROLL_LOCKS.entries()];
  return entries.length ? entries[entries.length-1] : null;
}
function cleanupDetachedAppModalLocks(){
  let changed=false;
  for(const [modalId,entry] of APP_MODAL_SCROLL_LOCKS){
    if(entry?.element?.isConnected) continue;
    APP_MODAL_SCROLL_LOCKS.delete(modalId);
    changed=true;
  }
  if(!changed) return;
  if(APP_MODAL_SCROLL_LOCKS.size) applyApplicationModalScrollRoot();
  else{restoreApplicationModalScrollRoot();document.body?.classList.remove('modal-open');}
}
function ensureAppModalScrollObserver(){
  if(APP_MODAL_SCROLL_OBSERVER || !document.body) return;
  APP_MODAL_SCROLL_OBSERVER=new MutationObserver(()=>cleanupDetachedAppModalLocks());
  APP_MODAL_SCROLL_OBSERVER.observe(document.body,{childList:true});
}
function lockAppModalScroll(modalId,modalElement){
  const id=String(modalId || '').trim();
  if(!id || !modalElement) return;
  const existing=APP_MODAL_SCROLL_LOCKS.get(id);
  if(existing) APP_MODAL_SCROLL_LOCKS.delete(id);
  APP_MODAL_SCROLL_LOCKS.set(id,{element:modalElement,close:modalElement._appModalClose || existing?.close || null});
  ensureAppModalScrollObserver();
  document.body?.classList.add('modal-open');
  applyApplicationModalScrollRoot();
}
function unlockAppModalScroll(modalId){
  const id=String(modalId || '').trim();
  if(id) APP_MODAL_SCROLL_LOCKS.delete(id);
  cleanupDetachedAppModalLocks();
  if(APP_MODAL_SCROLL_LOCKS.size){document.body?.classList.add('modal-open');applyApplicationModalScrollRoot();return;}
  restoreApplicationModalScrollRoot();
  document.body?.classList.remove('modal-open');
}
function resetAppModalScrollLocks(){
  APP_MODAL_SCROLL_LOCKS.clear();
  restoreApplicationModalScrollRoot();
  document.body?.classList.remove('modal-open');
}
function syncApplicationModalScrollRoot(){if(APP_MODAL_SCROLL_LOCKS.size) applyApplicationModalScrollRoot();}
function appModalFocusableElements(modalElement){
  if(!modalElement) return [];
  return [...modalElement.querySelectorAll('button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')]
    .filter(element=>element.getClientRects().length>0 && element.getAttribute('aria-hidden')!=='true');
}
function closeActiveApplicationModals(options={}){
  const entries=[...APP_MODAL_SCROLL_LOCKS.entries()].reverse();
  entries.forEach(([modalId,entry])=>{
    try{
      const close=entry?.element?._appModalClose || entry?.close;
      if(typeof close==='function') close({...options,force:true});
      else unlockAppModalScroll(modalId);
    }catch(_){unlockAppModalScroll(modalId);}
  });
  resetAppModalScrollLocks();
}
document.addEventListener('keydown',event=>{
  const top=topApplicationModalLock();
  if(!top) return;
  const [,entry]=top;
  const modal=entry?.element;
  if(event.key==='Escape'){
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const close=modal?._appModalClose || entry?.close;
    if(typeof close==='function') close();
    return;
  }
  if(event.key!=='Tab' || !modal) return;
  const focusable=appModalFocusableElements(modal);
  if(!focusable.length){event.preventDefault();return;}
  const first=focusable[0],last=focusable[focusable.length-1];
  if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus();}
},true);
let APP_LIQUID_CONFIRM_SEQUENCE=0;
function showAppLiquidConfirm(options={}){
  const title=String(options.title || 'تأكيد الإجراء');const message=String(options.message || 'هل تريد المتابعة؟');const confirmText=String(options.confirmText || 'تأكيد');const cancelText=String(options.cancelText || 'إلغاء');const modalId=`appLiquidConfirmModal-${++APP_LIQUID_CONFIRM_SEQUENCE}`;
  return new Promise(resolve=>{
    const modal=document.createElement('div');modal.id=modalId;modal.className='app-liquid-confirm app-liquid-modal-backdrop';
    modal.innerHTML='<section class="app-liquid-confirm__dialog app-liquid-modal" role="dialog" aria-modal="true"><header class="app-liquid-modal__header"><h2 class="app-liquid-modal__title"></h2><button type="button" class="app-liquid-modal__close" data-app-confirm-action="cancel" aria-label="إغلاق نافذة التأكيد">×</button></header><div class="app-liquid-confirm__body app-liquid-modal__body"><p></p></div><footer class="app-liquid-modal__footer"><button type="button" class="secondary" data-app-confirm-action="cancel"></button><button type="button" class="danger" data-app-confirm-action="confirm"></button></footer></section>';
    const titleElement=modal.querySelector('.app-liquid-modal__title');const messageElement=modal.querySelector('.app-liquid-confirm__body p');const cancelButton=modal.querySelector('[data-app-confirm-action="cancel"]:not(.app-liquid-modal__close)');const confirmButton=modal.querySelector('[data-app-confirm-action="confirm"]');const dialog=modal.querySelector('[role="dialog"]');const labelId=`${modalId}-title`;
    titleElement.id=labelId;titleElement.textContent=title;messageElement.textContent=message;cancelButton.textContent=cancelText;confirmButton.textContent=confirmText;dialog.setAttribute('aria-labelledby',labelId);
    let settled=false;const close=(accepted=false)=>{if(settled)return;settled=true;unlockAppModalScroll(modalId);modal.remove();resolve(Boolean(accepted));};
    modal._appModalClose=()=>close(false);modal.addEventListener('click',event=>{const action=event.target.closest('[data-app-confirm-action]')?.dataset.appConfirmAction;if(action==='confirm')close(true);else if(action==='cancel')close(false);});
    document.body.appendChild(modal);lockAppModalScroll(modalId,modal);requestAnimationFrame(()=>confirmButton.focus({preventScroll:true}));
  });
}

const ENTERPRISE_MULTI_SELECT_IDS=new Set([
  'dashboardPlantFilter','dashboardWarehouseFilter','reportPlantFilter','reportWarehouseFilter','itemAnalyticsItemFilter',
  'rawMaterialsPlantFilter','rawMaterialsWarehouseFilter','rawMaterialsWarehouseTypeFilter','rawMaterialsGroupFilter','rawMaterialsStatusFilter',
  'usersRoleFilter','usersStatusFilter'
]);
function enterpriseFilterValues(value){
  if(Array.isArray(value)) return value.map(v=>String(v||'').trim()).filter(Boolean);
  if(value instanceof Set) return [...value].map(v=>String(v||'').trim()).filter(Boolean);
  const v=String(value??'all').trim();
  return !v || v==='all' ? ['all'] : [v];
}
function enterpriseFilterActiveValues(value){return enterpriseFilterValues(value).filter(v=>v && v!=='all');}
function enterpriseFilterIsAll(value){return enterpriseFilterActiveValues(value).length===0;}
function enterpriseFilterMatches(value,candidate,normalizer=v=>String(v||'').trim()){
  const active=enterpriseFilterActiveValues(value).map(normalizer).filter(Boolean);
  if(!active.length) return true;
  return active.includes(normalizer(candidate));
}
function enterpriseFilterApplyQuery(query,column,value,normalizer=v=>String(v||'').trim()){
  const active=enterpriseFilterActiveValues(value).map(normalizer).filter(Boolean);
  if(!active.length) return query;
  return active.length===1 ? query.eq(column,active[0]) : query.in(column,active);
}
function enterpriseFilterText(value,select,allText='الكل'){
  const active=enterpriseFilterActiveValues(value);
  if(!active.length) return allText;
  const labels=active.map(v=>[...(select?.options||[])].find(o=>o.value===v)?.textContent?.trim() || v);
  return labels.length<=3 ? labels.join('، ') : `${labels.slice(0,3).join('، ')} +${labels.length-3}`;
}
function enterpriseMultiSelectValues(select){
  if(!select) return ['all'];
  if(select.dataset.enterpriseValues){try{return enterpriseFilterValues(JSON.parse(select.dataset.enterpriseValues));}catch(_){ }}
  return enterpriseFilterValues(select.value||'all');
}
function enterpriseSetMultiSelectValues(select,values,{silent=false}={}){
  if(!select) return;
  const options=[...select.options].map(o=>o.value);
  let next=enterpriseFilterValues(values).filter(v=>options.includes(v));
  if(!next.length || next.includes('all')) next=['all'];
  select.dataset.enterpriseValues=JSON.stringify(next);
  select.value=next[0] || 'all';
  enterpriseRenderMultiSelect(select);
  if(!silent) select.dispatchEvent(new Event('change',{bubbles:true}));
}
function enterpriseRenderMultiSelect(select){
  const wrapper=select?.nextElementSibling?.classList?.contains('enterprise-multiselect') ? select.nextElementSibling : null;
  if(!select || !wrapper) return;
  const values=enterpriseMultiSelectValues(select);
  const active=enterpriseFilterActiveValues(values);
  const options=[...select.options].filter(o=>o.value!=='all');
  const label=active.length ? enterpriseFilterText(active,select) : (select.options[0]?.textContent?.trim() || 'الكل');
  wrapper.querySelector('.enterprise-ms-label').textContent=label;
  wrapper.querySelector('.enterprise-ms-count').textContent=active.length ? String(active.length) : 'الكل';
  const list=wrapper.querySelector('.enterprise-ms-list');
  list.innerHTML=options.map(option=>{
    const checked=active.includes(option.value);
    return `<label class="enterprise-ms-option"><input type="checkbox" value="${option.value.replace(/"/g,'&quot;')}" ${checked?'checked':''}><span>${option.textContent}</span></label>`;
  }).join('') || '<div class="enterprise-ms-empty">لا توجد خيارات</div>';
}
function initEnterpriseMultiSelect(select){
  if(!select || !ENTERPRISE_MULTI_SELECT_IDS.has(select.id)) return;
  const existingWrapper=select.nextElementSibling?.classList?.contains('enterprise-multiselect') ? select.nextElementSibling : null;
  if(select.dataset.enterpriseMultiSelectBound==='1'){
    if(existingWrapper){ enterpriseRenderMultiSelect(select); return; }
    delete select.dataset.enterpriseMultiSelectBound;
  }
  select.dataset.enterpriseMultiSelectBound='1';
  select.classList.add('enterprise-native-select');
  const wrapper=document.createElement('div');
  wrapper.className='enterprise-multiselect';
  wrapper.innerHTML='<button type="button" class="enterprise-ms-trigger" aria-expanded="false"><span class="enterprise-ms-label"></span><b class="enterprise-ms-count"></b></button><div class="enterprise-ms-menu" hidden><div class="enterprise-ms-actions"><button type="button" data-ms-action="all">تحديد الكل</button><button type="button" data-ms-action="clear">مسح الكل</button></div><div class="enterprise-ms-list"></div></div>';
  select.insertAdjacentElement('afterend',wrapper);
  const observer=new MutationObserver(()=>enterpriseSetMultiSelectValues(select,enterpriseMultiSelectValues(select),{silent:true}));
  observer.observe(select,{childList:true});
  wrapper.addEventListener('click',event=>{
    event.stopPropagation();
    const trigger=event.target.closest('.enterprise-ms-trigger');
    if(trigger){
      const open=wrapper.classList.toggle('open');
      trigger.setAttribute('aria-expanded',open?'true':'false');
      wrapper.querySelector('.enterprise-ms-menu').hidden=!open;
      return;
    }
    const action=event.target.closest('[data-ms-action]')?.dataset.msAction;
    if(action==='all') enterpriseSetMultiSelectValues(select,[...select.options].filter(o=>o.value!=='all').map(o=>o.value));
    if(action==='clear') enterpriseSetMultiSelectValues(select,['all']);
    const checkbox=event.target.closest('.enterprise-ms-option input');
    if(checkbox){
      const current=new Set(enterpriseFilterActiveValues(enterpriseMultiSelectValues(select)));
      checkbox.checked ? current.add(checkbox.value) : current.delete(checkbox.value);
      enterpriseSetMultiSelectValues(select,current.size?[...current]:['all']);
    }
  });
  enterpriseSetMultiSelectValues(select,select.value||'all',{silent:true});
}
function enterpriseSelectValues(id){return enterpriseMultiSelectValues(document.getElementById(id));}
function enterpriseSetSelectValuesById(id,values,options){enterpriseSetMultiSelectValues(document.getElementById(id),values,options||{});}
function initEnterpriseMultiSelectFilters(root=document){ENTERPRISE_MULTI_SELECT_IDS.forEach(id=>initEnterpriseMultiSelect(document.getElementById(id)));}
function enterpriseCloseOpenMultiSelects(){
  document.querySelectorAll('.enterprise-multiselect.open').forEach(wrapper=>{
    wrapper.classList.remove('open');
    wrapper.querySelector('.enterprise-ms-trigger')?.setAttribute('aria-expanded','false');
    const menu=wrapper.querySelector('.enterprise-ms-menu');
    if(menu) menu.hidden=true;
  });
}
document.addEventListener('click',event=>{
  if(event.target.closest('.enterprise-multiselect')) return;
  enterpriseCloseOpenMultiSelects();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape') enterpriseCloseOpenMultiSelects();});
const colors=['#51b848','#1f9e9a','#7fc34b','#f1bf35','#526d62','#e88f2d'];
function fmt(n){return Number(n).toLocaleString('en-US',{maximumFractionDigits:3})}
function setDefaultDates(){const now=new Date();const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));const first=new Date(cairo.getFullYear(),cairo.getMonth(),1);const last=new Date(cairo.getFullYear(),cairo.getMonth()+1,0);const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;$('#fromDate').value=iso(first);$('#toDate').value=iso(last)}
function startCairoClock(){const time=$('#cairoTime'),date=$('#cairoDate');function tick(){const now=new Date();const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));time.textContent=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(now);date.textContent=formatDisplayDate(cairo)}tick();setInterval(tick,1000)}
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
function fillInboundPlantFilter(select){
  if(!select) return;
  const current=select.value||'all';
  const plants=getPlantsCatalog();
  const source=plants.length?plants:fallbackPlantsCatalog();
  select.innerHTML='';
  select.add(new Option('\u0627\u0644\u0643\u0644','all'));
  source.forEach(p=>select.add(new Option(`${p.code} - ${p.name}`,p.code)));
  select.value=[...select.options].some(o=>o.value===current)?current:'all';
}
function refreshPlantsCatalogConsumers(){
  fillInboundPlantFilter($('#plantFilter'));
  fillPlantSelectFromCatalog($('#dashboardPlantFilter'),'\u0643\u0644 \u0627\u0644\u0645\u0635\u0627\u0646\u0639');
  fillPlantSelectFromCatalog($('#reportPlantFilter'),'\u0643\u0644 \u0627\u0644\u0645\u0635\u0627\u0646\u0639');
  renderPlants();
  renderTabs();
}
function initFilters(){
  const pf=$('#plantFilter'),wf=$('#warehouseFilter'),typeFilter=$('#warehouseTypeFilter'),movementFilter=$('#movementFilter'),statusFilter=$('#inboundStatusFilter'),fromDate=$('#fromDate'),toDate=$('#toDate');
  if(!pf || !wf) return;
  fillInboundPlantFilter(pf);
  function fillWh(){
    const old=wf.value || 'all';
    wf.innerHTML='<option value="all">الكل</option>';
    APP_DATA.plants
      .filter(p=>pf.value==='all' || String(p.code).toUpperCase()===String(pf.value).toUpperCase())
      .forEach(p=>p.warehouses.forEach(w=>{
        if(!typeFilter || typeFilter.value==='all' || String(w[2])===String(typeFilter.value)){
          wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]));
        }
      }));
    wf.value=[...wf.options].some(o=>o.value===old)?old:'all';
  }
  function fillIncomingMovements(){
    if(!movementFilter) return;
    movementFilter.innerHTML='<option value="all">الكل</option><option value="101">101 - استلام</option><option value="102">102 - إلغاء استلام</option><option value="Z13">Z13 - استلام بدون الميزان</option><option value="Z14">Z14 - إلغاء بدون ميزان</option>';
  }
  function restoreInboundFilters(){
    const saved=readSavedInboundFilters();
    if(!saved) return;
    pf.value=inboundLegacySingleValue(saved.plant);
    if(typeFilter) typeFilter.value=inboundLegacySingleValue(saved.warehouseType);
    fillWh();
    const savedWarehouse=inboundLegacySingleValue(saved.warehouse);
    wf.value=[...wf.options].some(o=>o.value===savedWarehouse)?savedWarehouse:'all';
    if(movementFilter){
      const savedMovement=inboundLegacySingleValue(saved.movement).toUpperCase();
      movementFilter.value=[...movementFilter.options].some(o=>o.value===savedMovement)?savedMovement:'all';
    }
    if(statusFilter){
      const savedStatus=inboundLegacySingleValue(saved.status);
      statusFilter.value=[...statusFilter.options].some(o=>o.value===savedStatus)?savedStatus:'all';
    }
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
    wf.value='all';
    if(movementFilter) movementFilter.value='all';
    if(statusFilter) statusFilter.value='all';
    if(fromDate || toDate) setDefaultDates();
    clearSavedInboundFilters();
    runInboundFilter();
  };
  $('#searchBtn').onclick=async()=>{
    if($('#inbound')?.classList.contains('active-section')){
      await runInboundFilter();
      if(isMobileInboundViewport()) closeMobileInboundFilters();
    }else if($('#dashboard')?.classList.contains('active-section')) loadDashboardRealData();
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
function setInboundTopDateRange(date){
  const value=normalizeDateISO(date||'');
  const fromDate=$('#fromDate'), toDate=$('#toDate');
  if(fromDate) fromDate.value=value;
  if(toDate) toDate.value=value;
}
function inboundLegacySingleValue(value){
  if(Array.isArray(value)){
    const first=value.map(v=>String(v||'').trim()).find(v=>v && v.toLowerCase()!=='all');
    return first || 'all';
  }
  const v=String(value??'all').trim();
  return v && v.toLowerCase()!=='all' ? v : 'all';
}
function inboundLegacyMovementValue(value){
  const v=inboundLegacySingleValue(value);
  return v==='all' ? 'all' : String(v).toUpperCase();
}
function inboundLegacyFilterMatches(filterValue,candidate,normalizer=v=>String(v||'').trim()){
  const value=inboundLegacySingleValue(filterValue);
  if(value==='all') return true;
  return normalizer(candidate)===normalizer(value);
}
function getInboundTopFilters(){
  return {
    plant: inboundLegacySingleValue($('#plantFilter')?.value || 'all'),
    warehouse: inboundLegacySingleValue($('#warehouseFilter')?.value || 'all'),
    warehouseType: inboundLegacySingleValue($('#warehouseTypeFilter')?.value || 'all'),
    movement: inboundLegacyMovementValue($('#movementFilter')?.value || 'all'),
    status: inboundLegacySingleValue($('#inboundStatusFilter')?.value || 'all'),
    from: normalizeDateISO($('#fromDate')?.value || ''),
    to: normalizeDateISO($('#toDate')?.value || '')
  };
}
function inboundWarehouseCodesForFilters(filters){
  if(!filters) return [];
  if(filters.warehouse && filters.warehouse!=='all') return [String(filters.warehouse).toUpperCase()];
  return APP_DATA.plants
    .filter(p=>!filters.plant || filters.plant==='all' || String(p.code).toUpperCase()===String(filters.plant).toUpperCase())
    .flatMap(p=>p.warehouses)
    .filter(w=>!filters.warehouseType || filters.warehouseType==='all' || String(w[2])===String(filters.warehouseType))
    .map(w=>String(w[0]).toUpperCase());
}
function inboundRowMatchesTopFilters(row,filters){
  if(!filters) return true;
  const whCode=String(row.mb51_warehouse_code || row.scale_warehouse_code || '').trim().toUpperCase();
  const meta=warehouseMetaByCode(whCode);
  const movement=String(row.incoming_movement_type || row.raw_result?.movement_type || '').trim().toUpperCase();
  if(!inboundLegacyFilterMatches(filters.plant,meta.plant_code,v=>String(v||'').toUpperCase())) return false;
  if(!inboundLegacyFilterMatches(filters.warehouse,whCode,v=>String(v||'').toUpperCase())) return false;
  if(!inboundLegacyFilterMatches(filters.warehouseType,meta.warehouse_type)) return false;
  if(!inboundLegacyFilterMatches(filters.movement,movement,v=>String(v||'').toUpperCase())) return false;
  if(!inboundLegacyFilterMatches(filters.status,getInboundMovementStatus(row))) return false;
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
  const columnKeys=heads.map((h,i)=>key==='inboundTable' && typeof inboundColumnKeyForHeading==='function' ? inboundColumnKeyForHeading(h,i) : String(i));
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
    const colAttrs=key==='inboundTable' ? ` data-column-key="${escapeHtml(columnKeys[i])}" data-column-label="${escapeHtml(h)}"` : '';
    return `<th class="sortable-th"${colAttrs}><button type="button" class="sort-btn" data-col="${i}">${escapeHtml(h)} <span>${arrow}</span></button></th>`;
  }).join('');
  const filterHtml=heads.map((h,i)=>{
    const colAttrs=key==='inboundTable' ? ` data-column-key="${escapeHtml(columnKeys[i])}" data-column-label="${escapeHtml(h)}"` : '';
    const inputAttrs=key==='inboundTable' ? ` data-column-key="${escapeHtml(columnKeys[i])}"` : '';
    return `<th${colAttrs}><input class="col-filter" data-col="${i}"${inputAttrs} value="${escapeHtml(state.filters[i]||'')}" placeholder="بحث ${escapeHtml(h)}" /></th>`;
  }).join('');
  const bodyHtml=visible.length
    ? visible.map(r=>`<tr>${heads.map((_,i)=>{ const colAttrs=key==='inboundTable' ? ` data-column-key="${escapeHtml(columnKeys[i])}"` : ''; return `<td${colAttrs}>${r[i]??''}</td>`; }).join('')}</tr>`).join('')
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
  if(key==='inboundTable' && typeof applyInboundColumnVisibility==='function') applyInboundColumnVisibility();
}

const INBOUND_COLUMN_STORAGE_KEY='auditInboundHiddenColumns';
const INBOUND_REQUIRED_COLUMN_KEYS=new Set(['material_code','material_name','quantity','scale_net_weight','weight_diff_percent']);
function inboundColumnKeyForHeading(head,index){
  const text=cleanHeaderText(stripHtml(head)).replace(/\s+/g,' ').trim();
  const map={
    'تاريخ التقرير':'report_date','المادة':'material_code','كود المادة':'material_code','وصف المادة':'material_name','وحدة القياس':'uom','الكمية':'quantity','صافي الميزان':'scale_net_weight','فرق الوزن %':'weight_diff_percent','نوع الحركة':'movement_type','مخزن MB51':'mb51_warehouse','مخزن الميزان':'scale_warehouse','أمر الشراء MB51':'mb51_purchase_order','أمر الشراء الميزان':'scale_purchase_order','رقم العربية':'vehicle_number','نوع الوارد':'incoming_type','وصف العربية':'vehicle_description','وصف النولون':'freight_description','قيمة النولون للطن':'freight_rate','سبب مطابقة النولون':'freight_match_reason','المصنع':'plant','المخزن':'warehouse','الوارد':'incoming_quantity','الإلغاء':'cancelled_quantity','الصافي':'net_quantity'
  };
  if(map[text]) return map[text];
  return 'inbound_col_'+index+'_'+text.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g,'_').replace(/^_+|_+$/g,'');
}
function inboundTableColumns(){
  const table=$('#inboundTable');
  if(!table) return [];
  return [...table.querySelectorAll('thead tr:first-child th')].map((th,index)=>{
    const label=th.dataset.columnLabel || cleanHeaderText(th.textContent);
    const key=th.dataset.columnKey || inboundColumnKeyForHeading(label,index);
    return {key,label,index,required:INBOUND_REQUIRED_COLUMN_KEYS.has(key)};
  });
}
function readInboundHiddenColumnKeys(){
  try{ const parsed=JSON.parse(localStorage.getItem(INBOUND_COLUMN_STORAGE_KEY)||'[]'); return new Set(Array.isArray(parsed)?parsed:[]); }
  catch(_){ return new Set(); }
}
function writeInboundHiddenColumnKeys(hidden){ localStorage.setItem(INBOUND_COLUMN_STORAGE_KEY,JSON.stringify([...hidden])); }
function visibleInboundColumnCount(columns,hidden){ return columns.filter(col=>col.required || !hidden.has(col.key)).length; }
function renderInboundColumnManager(){
  const popover=$('#inboundColumnManagerPopover');
  if(!popover) return;
  const columns=inboundTableColumns();
  const hidden=readInboundHiddenColumnKeys();
  if(!columns.length){ popover.innerHTML='<p class="inbound-columns-empty">لا توجد أعمدة متاحة الآن.</p>'; return; }
  popover.innerHTML=`<div class="inbound-columns-head"><strong>إدارة أعمدة مراجعة الوارد</strong><small>الأعمدة الأساسية تبقى ظاهرة دائمًا.</small></div><div class="inbound-columns-list">${columns.map(col=>{ const checked=col.required || !hidden.has(col.key); return `<label class="inbound-column-option ${col.required?'is-required':''}"><input type="checkbox" data-inbound-column-key="${escapeHtml(col.key)}" ${checked?'checked':''} ${col.required?'disabled':''}/><span>${escapeHtml(col.label)}</span></label>`; }).join('')}</div><div class="inbound-columns-actions"><button class="secondary" id="inboundColumnsShowAllBtn" type="button">إظهار الكل</button><button class="secondary" id="inboundColumnsResetBtn" type="button">استعادة الافتراضي</button></div>`;
}
function applyInboundColumnVisibility(){
  const table=$('#inboundTable');
  if(!table) return;
  const columns=inboundTableColumns();
  if(!columns.length) return;
  const knownKeys=new Set(columns.map(col=>col.key));
  const hidden=readInboundHiddenColumnKeys();
  [...hidden].forEach(key=>{ if(!knownKeys.has(key) || INBOUND_REQUIRED_COLUMN_KEYS.has(key)) hidden.delete(key); });
  if(visibleInboundColumnCount(columns,hidden)<1) hidden.clear();
  table.querySelectorAll('[data-column-key]').forEach(cell=>{
    const key=cell.dataset.columnKey;
    const hide=hidden.has(key) && !INBOUND_REQUIRED_COLUMN_KEYS.has(key);
    cell.classList.toggle('inbound-column-hidden',hide);
    cell.toggleAttribute('hidden',hide);
  });
  table.dataset.columnsManaged=hidden.size?'true':'false';
  writeInboundHiddenColumnKeys(hidden);
  renderInboundColumnManager();
}
function closeInboundColumnManager(){
  const popover=$('#inboundColumnManagerPopover');
  const button=$('#inboundColumnManagerBtn');
  if(popover) popover.hidden=true;
  button?.setAttribute('aria-expanded','false');
}
function initInboundColumnManager(){
  if(document.body.dataset.inboundColumnManagerBound==='1') return;
  document.body.dataset.inboundColumnManagerBound='1';
  const button=$('#inboundColumnManagerBtn');
  const popover=$('#inboundColumnManagerPopover');
  if(!button || !popover) return;
  button.addEventListener('click',event=>{ event.preventDefault(); event.stopPropagation(); renderInboundColumnManager(); const open=popover.hidden; popover.hidden=!open; button.setAttribute('aria-expanded',open?'true':'false'); });
  popover.addEventListener('click',event=>{
    event.stopPropagation();
    const action=event.target.closest('button');
    if(action?.id==='inboundColumnsShowAllBtn' || action?.id==='inboundColumnsResetBtn'){ event.preventDefault(); localStorage.removeItem(INBOUND_COLUMN_STORAGE_KEY); applyInboundColumnVisibility(); return; }
    const checkbox=event.target.closest('input[type="checkbox"][data-inbound-column-key]');
    if(!checkbox) return;
    const columns=inboundTableColumns();
    const key=checkbox.dataset.inboundColumnKey;
    if(INBOUND_REQUIRED_COLUMN_KEYS.has(key)){ checkbox.checked=true; return; }
    const hidden=readInboundHiddenColumnKeys();
    if(checkbox.checked) hidden.delete(key); else hidden.add(key);
    if(visibleInboundColumnCount(columns,hidden)<1){ hidden.delete(key); checkbox.checked=true; alert('يجب أن يبقى عمود واحد ظاهرًا على الأقل.'); }
    writeInboundHiddenColumnKeys(hidden);
    applyInboundColumnVisibility();
  });
  document.addEventListener('click',event=>{ if(!event.target.closest('#inboundColumnManager')) closeInboundColumnManager(); });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape' && !popover.hidden){ event.stopPropagation(); closeInboundColumnManager(); button.focus({preventScroll:true}); } },true);
  applyInboundColumnVisibility();
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
    ['تاريخ التصدير', formatDisplayDateTime(new Date())],
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
      <div style="font-size:13px;color:#333;line-height:1.6;">تاريخ التصدير: ${escapeHtml(formatDisplayDateTime(new Date()))}</div>
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
function formatSalesReviewExportDate(value){
  return formatDisplayDate(value,'');
}
function currentSalesReviewDate(){
  return normalizeDateISO($('#salesReportDateSelect')?.value || activeSalesReportDate || '');
}
function currentSalesReviewWarehouseLabel(){
  const activeButton=$('#salesTabs button.active');
  const code=String(activeButton?.dataset?.warehouse || activeSalesWarehouse || activeButton?.textContent || '').trim().toUpperCase();
  const meta=warehouseMetaByCode(code);
  return meta?.warehouse_name ? `${code} - ${meta.warehouse_name}` : (code || '-');
}
function prepareSalesReviewExportTable(sourceTable){
  const clone=sourceTable.cloneNode(true);
  clone.querySelectorAll('.column-filter-row').forEach(row=>row.remove());
  clone.querySelectorAll('thead tr:first-child th').forEach(th=>{ th.textContent=cleanHeaderText(th.textContent); });
  clone.querySelectorAll('input,button,select').forEach(control=>{
    const text=cleanHeaderText(control.textContent || control.value || '');
    control.replaceWith(document.createTextNode(text));
  });
  clone.removeAttribute('id');
  clone.style.cssText='width:100%;border-collapse:collapse;table-layout:auto;font-size:18px;color:#f4fff5;direction:rtl;';
  clone.querySelectorAll('th').forEach(th=>{
    th.style.cssText='background:rgba(0,70,45,.92);color:#d8ffd1;border:1px solid rgba(141,220,89,.26);padding:13px 10px;text-align:center;white-space:normal;font-weight:900;line-height:1.35;';
  });
  clone.querySelectorAll('td').forEach(td=>{
    td.style.cssText='border:1px solid rgba(255,255,255,.10);padding:12px 10px;text-align:center;white-space:normal;line-height:1.35;background:rgba(0,35,27,.58);';
  });
  clone.querySelectorAll('tfoot td').forEach(td=>{
    td.style.background='rgba(0,74,43,.96)';
    td.style.color='#fff';
    td.style.fontWeight='900';
  });
  return clone;
}
async function exportSalesReviewPng(){
  const tableEl=$('#salesTable');
  if(!tableEl){ alert('لم يتم العثور على جدول مراجعة البيع.'); return; }
  const rows=[...tableEl.querySelectorAll('tbody tr')].filter(row=>!row.querySelector('.empty-row'));
  if(!rows.length){ alert('لا توجد بيانات للتصدير.'); return; }
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  const date=currentSalesReviewDate();
  const warehouseLabel=currentSalesReviewWarehouseLabel();
  const warehouseCode=String(activeSalesWarehouse || $('#salesTabs button.active')?.dataset?.warehouse || 'ALL').trim().toUpperCase() || 'ALL';
  const exportBox=document.createElement('section');
  exportBox.className='sales-review-png-export-box';
  exportBox.dir='rtl';
  exportBox.lang='ar';
  exportBox.setAttribute('aria-hidden','true');
  exportBox.style.cssText=[
    'position:fixed','top:0','left:0','z-index:-1','width:1600px','min-height:420px','padding:28px','box-sizing:border-box',
    'background:radial-gradient(circle at 50% 0%,rgba(94,180,71,.14),transparent 34%),linear-gradient(180deg,#00291f,#001611)',
    'color:#fff','direction:rtl','font-family:Cairo,Arial,sans-serif','overflow:visible','pointer-events:none'
  ].join(';');
  const header=document.createElement('header');
  header.style.cssText='display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:22px;padding-bottom:16px;border-bottom:1px solid rgba(141,220,89,.28);';
  header.innerHTML=`<div><h2 style="margin:0 0 8px;color:#fff;font-size:34px;line-height:1.25;font-weight:900;">مراجعة البيع والتحويلات</h2><p style="margin:0;color:#bdf2a0;font-size:17px;line-height:1.5;font-weight:800;">تاريخ التقرير: ${escapeHtml(formatSalesReviewExportDate(date) || '--/--/----')}</p></div><p style="margin:0;color:#dfffd4;font-size:18px;line-height:1.5;font-weight:900;">المخزن: ${escapeHtml(warehouseLabel)}</p>`;
  const tableWrap=document.createElement('div');
  tableWrap.style.cssText='width:100%;overflow:visible;border:1px solid rgba(141,220,89,.22);border-radius:18px;background:rgba(0,24,20,.48);padding:12px;box-sizing:border-box;';
  tableWrap.appendChild(prepareSalesReviewExportTable(tableEl));
  exportBox.append(header,tableWrap);
  document.body.appendChild(exportBox);
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=exportBox.getBoundingClientRect();
    const width=Math.ceil(exportBox.scrollWidth);
    const height=Math.ceil(exportBox.scrollHeight);
    if(!rect.width || !rect.height || !width || !height) throw new Error('Invalid sales review export dimensions');
    const canvas=await Html2Canvas(exportBox,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#001611',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
    canvas.toBlob(async blob=>{
      if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
      const fileDate=date || todayISO();
      await saveBlobWithPicker(blob,`مراجعة-البيع-${warehouseCode}-${fileDate}.png`,'image/png');
    },'image/png',1);
  }catch(err){
    console.error(err);
    alert('تعذر تصدير مراجعة البيع PNG. حاول مرة أخرى.');
  }finally{
    try{ exportBox.remove(); }catch(_){}
  }
}
function initReportExportButtons(){
  $('#salesExportExcelBtn')?.addEventListener('click',()=>exportTableToExcel('salesTable','مراجعة البيع والتحويلات'));
  $('#salesExportPdfBtn')?.addEventListener('click',()=>exportTableToPdf('salesTable','مراجعة البيع والتحويلات'));
  $('#salesExportPngBtn')?.addEventListener('click',exportSalesReviewPng);
  $('#inboundExportExcelBtn')?.addEventListener('click',()=>exportTableToExcel('inboundTable','مراجعة الوارد'));
  $('#inboundExportPdfBtn')?.addEventListener('click',()=>exportTableToPdf('inboundTable','مراجعة الوارد'));
  $('#rawMaterialsExportExcelBtn')?.addEventListener('click',exportRawMaterialsExcel);
  $('#rawMaterialsExportPdfBtn')?.addEventListener('click',exportRawMaterialsPdf);
  $('#rawMaterialsExportPngBtn')?.addEventListener('click',exportRawMaterialsPng);
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
    plant:`<svg ${attrs}><path d="M3 21h18"></path><path d="M5 21V9l6-4 6 4v12"></path><path d="M9 21v-6h6v6"></path><path d="M8 11h1"></path><path d="M12 11h1"></path><path d="M16 11h1"></path><path d="M7 6h3"></path></svg>`,
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

    analytics:`<svg ${attrs}><path d="M4 19V5"></path><path d="M4 19h16"></path><path d="M8 16l3-4 3 2 4-7"></path></svg>`,
    search:`<svg ${attrs}><circle cx="11" cy="11" r="7"></circle><path d="m20 20-3.5-3.5"></path></svg>`,
    reset:`<svg ${attrs}><path d="M3 12a9 9 0 1 0 3-6.7"></path><path d="M3 4v6h6"></path></svg>`,
    refresh:`<svg ${attrs}><path d="M21 12a9 9 0 0 1-15.3 6.4"></path><path d="M3 12A9 9 0 0 1 18.3 5.6"></path><path d="M21 5v6h-6"></path><path d="M3 19v-6h6"></path></svg>`,
    save:`<svg ${attrs}><path d="M5 3h12l2 2v16H5z"></path><path d="M8 3v6h8V3"></path><path d="M8 21v-7h8v7"></path></svg>`,
    image:`<svg ${attrs}><rect x="4" y="5" width="16" height="14" rx="2"></rect><circle cx="9" cy="10" r="1.5"></circle><path d="m7 17 4-4 3 3 2-2 3 3"></path></svg>`,
    pdf:`<svg ${attrs}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path><path d="M8 13h8"></path><path d="M8 17h5"></path></svg>`,
    excel:`<svg ${attrs}><path d="M4 4h16v16H4z"></path><path d="M8 4v16"></path><path d="M4 9h16"></path><path d="M4 14h16"></path><path d="m11 17 5-6"></path><path d="m16 17-5-6"></path></svg>`,
    eye:`<svg ${attrs}><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    edit:`<svg ${attrs}><path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z"></path><path d="m14 7 3 3"></path></svg>`,
    lock:`<svg ${attrs}><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>`,
    ban:`<svg ${attrs}><circle cx="12" cy="12" r="9"></circle><path d="m5.7 5.7 12.6 12.6"></path></svg>`,
    check:`<svg ${attrs}><path d="m5 12 4 4 10-10"></path></svg>`,
    trash:`<svg ${attrs}><path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path></svg>`,
    menu:`<svg ${attrs}><path d="M4 7h16"></path><path d="M4 12h16"></path><path d="M4 17h16"></path></svg>`,
    arrowLeft:`<svg ${attrs}><path d="M19 12H5"></path><path d="m12 19-7-7 7-7"></path></svg>`,
    trendUp:`<svg ${attrs}><path d="m4 16 6-6 4 4 6-8"></path><path d="M15 6h5v5"></path></svg>`,
    trendDown:`<svg ${attrs}><path d="m4 8 6 6 4-4 6 8"></path><path d="M15 18h5v-5"></path></svg>`,
    stable:`<svg ${attrs}><path d="M5 12h14"></path><path d="M8 9l-3 3 3 3"></path><path d="m16 9 3 3-3 3"></path></svg>`,
    calendar:`<svg ${attrs}><path d="M7 3v4"></path><path d="M17 3v4"></path><path d="M4 8h16"></path><rect x="4" y="5" width="16" height="16" rx="2"></rect></svg>`,
    trophy:`<svg ${attrs}><path d="M8 4h8v5a4 4 0 0 1-8 0z"></path><path d="M6 5H4v2a4 4 0 0 0 4 4"></path><path d="M18 5h2v2a4 4 0 0 1-4 4"></path><path d="M12 13v5"></path><path d="M8 21h8"></path></svg>`,
    star:`<svg ${attrs}><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"></path></svg>`,
    alert:`<svg ${attrs}><path d="M12 8v5"></path><path d="M12 17h.01"></path><path d="M10.3 3.2 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0Z"></path></svg>`,
    userCheck:`<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="m16 11 2 2 4-5"></path></svg>`,
    userX:`<svg ${attrs}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="m17 8 4 4"></path><path d="m21 8-4 4"></path></svg>`,
    role:`<svg ${attrs}><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"></path><path d="M9 12h6"></path><path d="M12 9v6"></path></svg>`,
    settings:`<svg ${attrs}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 1 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.65V21.4a2.1 2.1 0 1 1-4.2 0v-.06a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-1.65-1.1H2.9a2.1 2.1 0 1 1 0-4.2h.06A1.8 1.8 0 0 0 4.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 1 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 9.2 3.4 1.8 1.8 0 0 0 10.3 1.75V1.7a2.1 2.1 0 1 1 4.2 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 1 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8c.13.38.38.7.71.92.28.18.61.28.94.28h.06a2.1 2.1 0 1 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z"></path></svg>`
  };
  return icons[name] || icons.reports;
}


function uiIcon(name,className='ui-svg-icon'){
  return '<span class="'+className+'" aria-hidden="true">'+modernIcon(name)+'</span>';
}
function renderInlineModernIcons(root=document){
  root.querySelectorAll('[data-modern-icon]').forEach(node=>{
    const name=node.getAttribute('data-modern-icon')||'reports';
    node.innerHTML=modernIcon(name);
  });
}
function renderStandardKpiCard(config={}){
  const title=escapeHtml(config.title||'');
  const value=config.value ?? '';
  const unit=escapeHtml(config.unit||'');
  const icon=config.icon||'reports';
  const className=String(config.className||'').trim();
  const extraClass=String(config.extraClass||'').trim();
  const classes=['kpi','glass',className,extraClass].filter(Boolean).join(' ');
  const attributes=config.attributes||{};
  const attrText=Object.keys(attributes).map(key=>{
    const name=String(key).replace(/[^a-zA-Z0-9_-]/g,'');
    if(!name) return '';
    return ' '+name+'="'+escapeHtml(attributes[key])+'"';
  }).join('');
  return `<article class="${classes}"${attrText}><h3>${title}</h3><div class="num">${value}</div><small>${unit}</small><div class="icon modern-kpi-icon">${modernIcon(icon)}</div></article>`;
}

function renderDashboardKPIs(stats){
  const cards=[
    {title:'إجمالي البيع',value:fmt(stats.salesQty),unit:'طن',icon:'sales',className:'kpi-sales'},
    {title:'إجمالي الإنتاج',value:fmt(stats.productionQty),unit:'طن',icon:'production',className:'kpi-production'},
    {title:'إجمالي التحويلات الصادره',value:fmt(stats.outgoingTransferQty),unit:'طن',icon:'outgoing',className:'kpi-outgoing'},
    {title:'إجمالي التحويلات الوارده',value:fmt(stats.incomingTransferQty),unit:'طن',icon:'incoming',className:'kpi-incoming'},
    {title:'إجمالي التحميل',value:fmt(stats.totalLoadingQty),unit:'طن',icon:'loading',className:'kpi-loading'}
  ];
  const box=$('#kpiCards');
  if(box) box.innerHTML=cards.map(renderStandardKpiCard).join('');
}
function getDashboardFilters(){
  return {
    plant: enterpriseSelectValues('dashboardPlantFilter'),
    warehouse: enterpriseSelectValues('dashboardWarehouseFilter'),
    from: normalizeDateISO($('#dashboardFromDate')?.value || ''),
    to: normalizeDateISO($('#dashboardToDate')?.value || '')
  };
}
function dashboardWhMeta(code){
  const meta=warehouseMetaByCode(code);
  return {plant:meta.plant_code||'', warehouse:meta.warehouse_code||String(code||'').toUpperCase(), name:meta.warehouse_name||'', type:meta.warehouse_type||''};
}

function renderModernSidebarIcons(){
  document.querySelectorAll('.nav-icon[data-icon]').forEach(node=>{
    const name=node.getAttribute('data-icon');
    node.innerHTML=modernIcon(name);
  });
  document.querySelectorAll('.sidebar .nav-item').forEach(item=>{
    const label=[...item.childNodes].filter(node=>node.nodeType===Node.TEXT_NODE).map(node=>node.textContent.trim()).filter(Boolean).join(' ');
    if(label){
      item.setAttribute('data-label',label);
      item.setAttribute('aria-label',label);
    }
  });
  renderInlineModernIcons(document);
}

function formatMobileDashboardDateLabel(v){
  return formatDisplayDate(v,'');
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
    const old=enterpriseMultiSelectValues(wf);
    const salesWarehouseCodes = ['W401','W402','N401','N402','N411','N412','E401','E402'];
    wf.innerHTML='<option value="all">كل مخازن البيع</option>';
    APP_DATA.plants
      .filter(p=>enterpriseFilterMatches(enterpriseMultiSelectValues(pf),p.code))
      .forEach(p=>p.warehouses
        .filter(w=>salesWarehouseCodes.includes(String(w[0]).toUpperCase()))
        .forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0])))
      );
    enterpriseSetMultiSelectValues(wf,old,{silent:true});
  }
  pf.onchange=()=>{clearUnifiedSalesRowsCache();fillWh();};
  wf.addEventListener('change',clearUnifiedSalesRowsCache);
  ['dashboardFromDate','dashboardToDate'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{clearUnifiedSalesRowsCache();updateMobileDashboardPeriodLabel();}));
  fillWh();
  initEnterpriseMultiSelectFilters($('#dashboard'));
  updateMobileDashboardPeriodLabel();
  $('#dashboardSearchBtn')?.addEventListener('click',()=>{updateMobileDashboardPeriodLabel();loadDashboardRealData({keepDates:true});});
  $('#dashboardResetBtn')?.addEventListener('click',()=>{
    clearUnifiedSalesRowsCache();
    enterpriseSetMultiSelectValues(pf,['all'],{silent:true});
    fillWh();
    enterpriseSetMultiSelectValues(wf,['all'],{silent:true});
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
    if(!enterpriseFilterMatches(filters.plant,plant)) return false;
    if(!enterpriseFilterMatches(filters.warehouse,wh,v=>String(v||'').toUpperCase())) return false;
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
    if(!enterpriseFilterMatches(filters.plant,plant)) return;
    if(!enterpriseFilterMatches(filters.warehouse,wh,v=>String(v||'').toUpperCase())) return;
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
    cells.push(`<div class="${className}" style="--heat:${ratio.toFixed(3)}" title="${formatDisplayDate(date,date)} - ${fmt(val)} طن"><b>${day}</b><span>${fmt(val)}</span></div>`);
  }
  node.innerHTML=`
    <div class="heatmap-head"><strong>${monthKey.split('-').reverse().join('/')}</strong><span>الأقل</span><i></i><span>الأعلى</span></div>
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
    query=enterpriseFilterApplyQuery(query,'plant_code',filters.plant);
    query=enterpriseFilterApplyQuery(query,'warehouse_code',filters.warehouse,v=>String(v||'').toUpperCase());
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
    query=enterpriseFilterApplyQuery(query,'plant_code',filters.plant);
    query=enterpriseFilterApplyQuery(query,'warehouse_code',filters.warehouse,v=>String(v||'').toUpperCase());
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
  if(!enterpriseFilterMatches(filters.plant,plant)) return false;
  if(!enterpriseFilterMatches(filters.warehouse,wh,v=>String(v||'').toUpperCase())) return false;
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
    const plant=r.plant_code||meta.plant||'غير محدد';
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
    const pkey=String(r.material_code||r.material_name||'غير محدد');
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
  const selectedWarehouseCodes=enterpriseFilterActiveValues(filters.warehouse).map(v=>String(v).toUpperCase());
  if(!materialQueryCodes.length || (!selectedWarehouseCodes.length && !warehouseQueryCodes.length)){
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
      query=enterpriseFilterApplyQuery(query,'plant_code',filters.plant);
      if(selectedWarehouseCodes.length) query=query.in('warehouse_code',selectedWarehouseCodes);
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
        warehouses:selectedWarehouseCodes.length || warehouseQueryCodes.length,
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
  initEnterpriseMultiSelectFilters($('#dashboard'));
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
let DASHBOARD_PNG_EXPORT_BUSY=false;
const DASHBOARD_PNG_BUTTON_SELECTOR='#mobileDashboardPeriodPngBtn,#mobileKpiGroupPngBtn,#dashboardFullPngBtn,.widget-png-btn';
const DASHBOARD_PNG_CAPTURE_EXCLUDE_SELECTOR='.widget-png-btn,.mobile-kpi-group-png-btn,.mobile-period-png-btn,.dashboard-full-png-btn,.mobile-dashboard-shell,.mobile-dashboard-bottom-nav,.mobile-drawer-overlay,.mobile-side-drawer,.mobile-dashboard-filter-overlay';
function dashboardPngButtons(){
  return [...document.querySelectorAll(DASHBOARD_PNG_BUTTON_SELECTOR)];
}
function dashboardPngToastIcon(type){
  return type==='success'
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>';
}
function showDashboardPngToast(message,type='success',duration=3000){
  const text=String(message||'').trim();
  if(!text) return;
  let stack=$('#dashboardPngToastStack');
  if(!stack){
    stack=document.createElement('div');
    stack.id='dashboardPngToastStack';
    stack.className='dashboard-png-toast-stack';
    stack.setAttribute('aria-live','polite');
    stack.setAttribute('aria-atomic','false');
    document.body.appendChild(stack);
  }
  const toast=document.createElement('div');
  toast.className=`dashboard-png-toast dashboard-png-toast-${type}`;
  toast.setAttribute('role',type==='error'?'alert':'status');
  toast.innerHTML=`<span class="dashboard-png-toast-icon">${dashboardPngToastIcon(type)}</span><span class="dashboard-png-toast-text"></span><button type="button" class="dashboard-png-toast-close" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>`;
  toast.querySelector('.dashboard-png-toast-text').textContent=text;
  stack.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('is-visible'));
  let timer=window.setTimeout(close,Math.max(1000,Number(duration)||3000));
  function close(){
    window.clearTimeout(timer);
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    window.setTimeout(()=>toast.remove(),220);
  }
  toast.querySelector('.dashboard-png-toast-close')?.addEventListener('click',close);
}
function syncDashboardPngButtonState(){
  const allowed=hasPermission('dashboard','export_png');
  dashboardPngButtons().forEach(btn=>{
    if(!Object.prototype.hasOwnProperty.call(btn.dataset,'dashboardPngIdleHtml')) btn.dataset.dashboardPngIdleHtml=btn.innerHTML;
    if(!Object.prototype.hasOwnProperty.call(btn.dataset,'dashboardPngIdleTitle')) btn.dataset.dashboardPngIdleTitle=btn.title||'';
    btn.setAttribute('data-html2canvas-ignore','true');
    btn.disabled=!allowed || DASHBOARD_PNG_EXPORT_BUSY;
    btn.classList.toggle('permission-disabled',!allowed);
    btn.classList.toggle('dashboard-png-loading',DASHBOARD_PNG_EXPORT_BUSY);
    btn.setAttribute('aria-busy',DASHBOARD_PNG_EXPORT_BUSY?'true':'false');
    if(DASHBOARD_PNG_EXPORT_BUSY){
      btn.innerHTML='<span class="dashboard-png-loading-spinner" aria-hidden="true"></span><span>...</span>';
      btn.title='جارٍ تصدير الصورة';
    }else{
      btn.innerHTML=btn.dataset.dashboardPngIdleHtml;
      btn.title=allowed ? btn.dataset.dashboardPngIdleTitle : 'لا تملك صلاحية تصدير PNG';
    }
  });
}
function beginDashboardPngExport(){
  if(DASHBOARD_PNG_EXPORT_BUSY) return false;
  if(!hasPermission('dashboard','export_png')){
    syncDashboardPngButtonState();
    return false;
  }
  DASHBOARD_PNG_EXPORT_BUSY=true;
  syncDashboardPngButtonState();
  return true;
}
function endDashboardPngExport(){
  DASHBOARD_PNG_EXPORT_BUSY=false;
  syncDashboardPngButtonState();
}
function dashboardCanvasToPngBlob(canvas){
  return new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>{
      if(blob) resolve(blob);
      else reject(new Error('PNG blob creation failed'));
    },'image/png',1);
  });
}
function markDashboardPngCaptureExclusions(element){
  if(!element) return ()=>{};
  const nodes=[];
  if(element.matches?.(DASHBOARD_PNG_CAPTURE_EXCLUDE_SELECTOR)) nodes.push(element);
  nodes.push(...element.querySelectorAll(DASHBOARD_PNG_CAPTURE_EXCLUDE_SELECTOR));
  const previous=nodes.map(node=>({node,had:node.hasAttribute('data-html2canvas-ignore'),value:node.getAttribute('data-html2canvas-ignore')}));
  nodes.forEach(node=>node.setAttribute('data-html2canvas-ignore','true'));
  return ()=>previous.forEach(item=>{
    if(item.had) item.node.setAttribute('data-html2canvas-ignore',item.value||'true');
    else item.node.removeAttribute('data-html2canvas-ignore');
  });
}
function currentActiveSection(){
  return $('.section.active-section')?.id || $('.nav-item.active')?.dataset.section || 'dashboard';
}
const APPLICATION_VIEW_STATE_KEY='audit_application_view_state_v1';
let APPLICATION_VIEW_RESTORED_USER_ID='';
function readApplicationViewState(){
  try{
    const parsed=JSON.parse(sessionStorage.getItem(APPLICATION_VIEW_STATE_KEY)||'null');
    return parsed && typeof parsed==='object' ? parsed : null;
  }catch(_){ return null; }
}
function writeApplicationViewState(patch={}){
  try{
    const userId=String(CURRENT_AUTH_USER?.id || '').trim();
    if(!userId) return;
    const current=readApplicationViewState() || {};
    const next={...current,...patch,userId};
    if(patch.inventory) next.inventory={...(current.inventory||{}),...patch.inventory};
    sessionStorage.setItem(APPLICATION_VIEW_STATE_KEY,JSON.stringify(next));
  }catch(_){}
}
function persistInventoryCountViewState(){
  const inventoryDate=$('#inventoryCountDateInput')?.value || '';
  const plantCode=String($('#inventoryCountPlantSelect')?.value || '').trim().toUpperCase();
  const warehouseCode=String($('#inventoryCountWarehouseSelect')?.value || '').trim().toUpperCase();
  writeApplicationViewState({inventory:{inventoryDate,plantCode,warehouseCode}});
}
function rememberApplicationViewState(section=currentActiveSection()){
  const activeSection=String(section || currentActiveSection() || 'dashboard');
  const patch={
    section:activeSection,
    focusMode:document.body.classList.contains('focus-mode-active') && document.body.dataset.focusSection===activeSection
  };
  if(activeSection==='inventory_closing'){
    const {inventoryDate,plantCode,warehouseCode}=typeof inventoryCountReadInputs==='function' ? inventoryCountReadInputs() : {inventoryDate:'',plantCode:'',warehouseCode:''};
    patch.inventory={inventoryDate,plantCode,warehouseCode};
  }
  writeApplicationViewState(patch);
}
function applySavedInventoryCountViewState(state){
  const saved=state?.inventory;
  if(!saved) return false;
  const dateInput=$('#inventoryCountDateInput');
  const plantSelect=$('#inventoryCountPlantSelect');
  const warehouseSelect=$('#inventoryCountWarehouseSelect');
  if(saved.plantCode && plantSelect && [...plantSelect.options].some(option=>option.value===saved.plantCode)) plantSelect.value=saved.plantCode;
  if(typeof syncInventoryCountWarehouse==='function') syncInventoryCountWarehouse();
  if(saved.warehouseCode && warehouseSelect && [...warehouseSelect.options].some(option=>option.value===saved.warehouseCode)) warehouseSelect.value=saved.warehouseCode;
  if(saved.inventoryDate && dateInput){
    dateInput.value=String(saved.inventoryDate).slice(0,10);
    if(window.CustomDatePicker) window.CustomDatePicker.refresh(dateInput);
  }
  if(typeof updateInventoryCountSelectedDateSummary==='function') updateInventoryCountSelectedDateSummary();
  return Boolean(saved.inventoryDate && saved.plantCode && saved.warehouseCode);
}
function restoreApplicationViewState(){
  const userId=String(CURRENT_AUTH_USER?.id || '').trim();
  if(!userId || APPLICATION_VIEW_RESTORED_USER_ID===userId) return false;
  APPLICATION_VIEW_RESTORED_USER_ID=userId;
  const state=readApplicationViewState();
  if(!state || String(state.userId || '')!==userId) return false;
  const section=String(state.section || '').trim();
  if(!section || !$('#'+section) || !canViewSection(section)) return false;
  const hasInventoryContext=section==='inventory_closing' && applySavedInventoryCountViewState(state);
  switchSection(section,{inventoryOpenMode:hasInventoryContext?'selected':'default',persistView:false});
  if(state.focusMode && FOCUS_MODE_SECTIONS.has(section)){
    setTimeout(()=>{ if(currentActiveSection()===section) enterFocusMode(section); },140);
  }
  return true;
}
function updateMobileDashboardState(section){
  const active=section || currentActiveSection();
  const appVisible=!$('#appShell')?.classList.contains('app-hidden');
  const hasSection=!!$('#'+active);
  document.body.classList.toggle('mobile-app-shell-active', appVisible && hasSection);
  document.body.classList.toggle('mobile-dashboard-active', appVisible && active==='dashboard');
  document.body.classList.toggle('mobile-inbound-active', appVisible && active==='inbound');
  document.body.classList.toggle('mobile-upload-reports-active', appVisible && active==='upload');
  document.body.classList.toggle('mobile-reports-active', appVisible && active==='reports');
  document.body.classList.toggle('mobile-raw-materials-active', appVisible && active==='raw_materials');
  if(active==='dashboard') updateMobileDashboardPeriodLabel();
}
function syncMobileDashboardShellState(){
  updateMobileDashboardState(currentActiveSection());
}
const INVENTORY_AUDIT_SECTION_IDS = new Set(['inventory_closing','inventory_differences','inventory_expiry_tracking']);
function isInventoryAuditSection(section){ return INVENTORY_AUDIT_SECTION_IDS.has(section); }
const DEPARTMENT_PERSONNEL_SECTION_IDS = new Set(['department_storekeepers','department_weekly_leave_schedule','department_hr_reports','department_evaluations']);
function isDepartmentPersonnelSection(section){ return DEPARTMENT_PERSONNEL_SECTION_IDS.has(section); }
function setInventoryAuditNavGroupOpen(group,open){
  if(!group) return;
  group.classList.toggle('is-open',!!open);
  const submenu=group.querySelector('.inventory-audit-nav-submenu,.inventory-audit-mobile-submenu');
  const toggle=group.querySelector('[data-inventory-nav-toggle],[data-inventory-mobile-toggle]');
  if(submenu) submenu.hidden=!open;
  if(toggle) toggle.setAttribute('aria-expanded',open?'true':'false');
}
function syncInventoryAuditNavigation(section=currentActiveSection()){
  const active=isInventoryAuditSection(section);
  $$('[data-inventory-nav-group],[data-inventory-mobile-nav-group]').forEach(group=>{ if(active) setInventoryAuditNavGroupOpen(group,true); });
  $$('[data-inventory-nav-toggle],[data-inventory-mobile-toggle]').forEach(toggle=>toggle.classList.toggle('active',active));
  $$('.mobile-drawer-item[data-mobile-section]').forEach(item=>item.classList.toggle('active',item.dataset.mobileSection===section));
}
function setDepartmentPersonnelNavGroupOpen(group,open){
  if(!group) return;
  group.classList.toggle('is-open',!!open);
  const submenu=group.querySelector('.department-personnel-nav-submenu,.department-personnel-mobile-submenu');
  const toggle=group.querySelector('[data-department-personnel-nav-toggle],[data-department-personnel-mobile-toggle]');
  if(submenu) submenu.hidden=!open;
  if(toggle) toggle.setAttribute('aria-expanded',open?'true':'false');
}
function syncDepartmentPersonnelNavigation(section=currentActiveSection()){
  const active=isDepartmentPersonnelSection(section);
  $$('[data-department-personnel-nav-group],[data-department-personnel-mobile-nav-group]').forEach(group=>{ if(active) setDepartmentPersonnelNavGroupOpen(group,true); });
  $$('[data-department-personnel-nav-toggle],[data-department-personnel-mobile-toggle]').forEach(toggle=>toggle.classList.toggle('active',active));
  $$('.mobile-drawer-item[data-mobile-section]').forEach(item=>item.classList.toggle('active',item.dataset.mobileSection===section));
}
function switchSection(section,options={}){
  if(typeof canLeaveDepartmentWeeklyWorkspace==='function' && !canLeaveDepartmentWeeklyWorkspace(section)) return false;
  closeActiveApplicationModals({restoreFocus:false});
  if(document.body.classList.contains('focus-mode-active')) exitFocusMode({restoreScroll:false});
  if(!canViewSection(section)){
    showPermissionDenied(section);
    return;
  }
  $$('.nav-item').forEach(x=>x.classList.toggle('active',x.dataset.section===section));
  syncInventoryAuditNavigation(section);
  syncDepartmentPersonnelNavigation(section);
  $$('.section').forEach(s=>s.classList.remove('active-section'));
  const target=$('#'+section);
  if(target) target.classList.add('active-section');
  updateMobileDashboardState(section);
  closeMobileDashboardPanels();
  updateFiltersVisibility(section);
  if(options.persistView!==false) rememberApplicationViewState(section);
  if(section==='reports') setTimeout(()=>loadExecutiveReport(),50);
  if(section==='raw_materials') setTimeout(()=>loadRawMaterialsScreen(),50);
  if(section==='users') setTimeout(()=>loadUsersManagement(),50);
  if(section==='permissions') setTimeout(()=>loadPermissionsManagement(),50);
  if(section==='inventory_closing'){
    const openSelected=options.inventoryOpenMode==='selected';
    setTimeout(()=>openSelected ? openExistingInventoryCountFromUi({showLoading:true}) : openDefaultInventoryCountFromUi({showLoading:true}),50);
  }
  if(section==='inventory_differences') setTimeout(()=>loadInventoryDifferenceScreen(),50);
  if(section==='department_storekeepers') setTimeout(()=>loadDepartmentStorekeepers(),50);
  if(section==='department_weekly_leave_schedule') setTimeout(()=>loadDepartmentWeeklyWorkspace('statuses'),50);
  if(section==='department_evaluations') setTimeout(()=>loadDepartmentWeeklyWorkspace('evaluations'),50);
  setTimeout(()=>applyPermissionActionGuards(section),80);
  return true;
}
function closeMobileDashboardPanels(){
  const drawer=$('#mobileDashboardDrawer');
  const opener=$('.mobile-drawer-open');
  if(drawer && drawer.contains(document.activeElement)){
    opener?.focus({preventScroll:true});
  }
  document.body.classList.remove('mobile-dashboard-filter-open','mobile-dashboard-drawer-open','mobile-inbound-filter-open','mobile-raw-materials-filter-open','inventory-count-settings-open','inventory-count-export-open','inventory-count-search-open');
  $('#mobileDashboardFilterBtn')?.setAttribute('aria-expanded','false');
  $('#mobileInboundFilterBtn')?.setAttribute('aria-expanded','false');
  $('#mobileInboundFilterOverlay')?.setAttribute('aria-hidden','true');
  if(document.body.classList.contains('mobile-inbound-active') && isMobileInboundViewport()) $('#globalFilters')?.setAttribute('aria-hidden','true');
  document.querySelectorAll('.mobile-drawer-open').forEach(btn=>btn.setAttribute('aria-expanded','false'));
  $('#mobileDashboardFilterOverlay')?.setAttribute('aria-hidden','true');
  $('#mobileDrawerOverlay')?.setAttribute('aria-hidden','true');
  $('#inventoryCountMobileSheetOverlay')?.setAttribute('aria-hidden','true');
  $('#inventoryCountMobileSettingsBtn')?.setAttribute('aria-expanded','false');
  $('#inventoryCountMobileExportBtn')?.setAttribute('aria-expanded','false');
  $('#inventoryCountMobileSearchBtn')?.setAttribute('aria-expanded','false');
  const inventoryExportPanel=$('#inventoryCountMobileExportPanel');
  if(inventoryExportPanel){ inventoryExportPanel.hidden=true; inventoryExportPanel.setAttribute('aria-hidden','true'); }
  drawer?.setAttribute('aria-hidden','true');
}
function isMobileInboundViewport(){
  return window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : window.innerWidth<=768;
}
function closeMobileInboundFilters(){
  const filters=$('#globalFilters');
  const opener=$('#mobileInboundFilterBtn');
  if(filters && filters.contains(document.activeElement)){
    opener?.focus({preventScroll:true});
  }
  document.body.classList.remove('mobile-inbound-filter-open');
  opener?.setAttribute('aria-expanded','false');
  $('#mobileInboundFilterOverlay')?.setAttribute('aria-hidden','true');
  if(isMobileInboundViewport()) filters?.setAttribute('aria-hidden','true');
}
function openMobileInboundFilters(){
  const filters=$('#globalFilters');
  filters?.classList.remove('filters-hidden');
  document.body.classList.add('mobile-inbound-filter-open');
  $('#mobileInboundFilterBtn')?.setAttribute('aria-expanded','true');
  $('#mobileInboundFilterOverlay')?.setAttribute('aria-hidden','false');
  filters?.setAttribute('aria-hidden','false');
  setTimeout(()=>$('#mobileInboundFilterCloseBtn')?.focus({preventScroll:true}),0);
}
function isMobileRawMaterialsViewport(){
  return window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : window.innerWidth<=768;
}
function closeRawMaterialsFilters(){
  const filters=$('#rawMaterialsFilters');
  const opener=$('#mobileRawMaterialsFilterBtn');
  if(filters && filters.contains(document.activeElement)) opener?.focus({preventScroll:true});
  document.body.classList.remove('mobile-raw-materials-filter-open');
  opener?.setAttribute('aria-expanded','false');
  $('#mobileRawMaterialsFilterOverlay')?.setAttribute('aria-hidden','true');
  if(isMobileRawMaterialsViewport()) filters?.setAttribute('aria-hidden','true');
}
function openRawMaterialsFilters(){
  const filters=$('#rawMaterialsFilters');
  document.body.classList.add('mobile-raw-materials-filter-open');
  $('#mobileRawMaterialsFilterBtn')?.setAttribute('aria-expanded','true');
  $('#mobileRawMaterialsFilterOverlay')?.setAttribute('aria-hidden','false');
  filters?.setAttribute('aria-hidden','false');
  setTimeout(()=>$('#mobileRawMaterialsFilterCloseBtn')?.focus({preventScroll:true}),0);
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
  if(!source || !beginDashboardPngExport()) return;
  let exportBox=null;
  try{
    const Html2Canvas=window.html2canvas;
    const cards=[...source.querySelectorAll('.kpi')].slice(0,5);
    if(!Html2Canvas || !cards.length) throw new Error('PNG export is unavailable');
    const from=normalizeDateISO($('#dashboardFromDate')?.value || '');
    const to=normalizeDateISO($('#dashboardToDate')?.value || '');
    const periodText=(from && to && from===to)
      ? `تاريخ التقرير: ${formatMobileDashboardDateLabel(from)}`
      : `الفترة: ${formatMobileDashboardDateLabel(from) || 'البداية'} → ${formatMobileDashboardDateLabel(to) || 'النهاية'}`;
    exportBox=document.createElement('section');
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
      clone.querySelectorAll(DASHBOARD_PNG_CAPTURE_EXCLUDE_SELECTOR).forEach(el=>el.remove());
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
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const rect=exportBox.getBoundingClientRect();
    const width=Math.ceil(exportBox.scrollWidth);
    const height=Math.ceil(exportBox.scrollHeight);
    window.__lastKpiExportBoxSize={width,height,rectWidth:rect.width,rectHeight:rect.height,layout:'2-2-1'};
    if(rect.width<=0 || rect.height<=0 || width<=1 || height<=1) throw new Error('Invalid KPI export dimensions');
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
    const blob=await dashboardCanvasToPngBlob(canvas);
    await saveBlobWithPicker(blob,`${safeFileName('Total Key Stats')}.png`,'image/png');
    showDashboardPngToast('تم تصدير الصورة بنجاح.','success',3000);
  }catch(err){
    console.error('Dashboard KPI PNG export failed',err);
    showDashboardPngToast('تعذر تصدير الصورة.','error',6000);
  }finally{
    document.body.classList.remove('dashboard-png-exporting');
    exportBox?.remove();
    endDashboardPngExport();
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
    const rawMaterialsFilterBtn=event.target.closest('#mobileRawMaterialsFilterBtn');
    if(rawMaterialsFilterBtn){
      event.preventDefault();
      openRawMaterialsFilters();
      return;
    }
    if(event.target.closest('#mobileRawMaterialsFilterOverlay,#mobileRawMaterialsFilterCloseBtn')){
      event.preventDefault();
      closeRawMaterialsFilters();
      return;
    }
    const inboundFilterBtn=event.target.closest('#mobileInboundFilterBtn');
    if(inboundFilterBtn){
      event.preventDefault();
      openMobileInboundFilters();
      return;
    }
    if(event.target.closest('#mobileInboundFilterOverlay,#mobileInboundFilterCloseBtn')){
      event.preventDefault();
      closeMobileInboundFilters();
      return;
    }
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
    const inventoryMobileToggle=event.target.closest('[data-inventory-mobile-toggle]');
    if(inventoryMobileToggle){
      event.preventDefault();
      const group=inventoryMobileToggle.closest('[data-inventory-mobile-nav-group]');
      setInventoryAuditNavGroupOpen(group,!group?.classList.contains('is-open'));
      return;
    }
    const departmentPersonnelMobileToggle=event.target.closest('[data-department-personnel-mobile-toggle]');
    if(departmentPersonnelMobileToggle){
      event.preventDefault();
      const group=departmentPersonnelMobileToggle.closest('[data-department-personnel-mobile-nav-group]');
      setDepartmentPersonnelNavGroupOpen(group,!group?.classList.contains('is-open'));
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
  $$('.nav-item[data-section]').forEach(b=>b.onclick=()=>switchSection(b.dataset.section));
  $$('[data-inventory-nav-toggle]').forEach(btn=>{ btn.onclick=()=>{ const group=btn.closest('[data-inventory-nav-group]'); setInventoryAuditNavGroupOpen(group,!group?.classList.contains('is-open')); }; });
  $$('[data-department-personnel-nav-toggle]').forEach(btn=>{ btn.onclick=()=>{
    const group=btn.closest('[data-department-personnel-nav-group]');
    const shell=$('#appShell');
    if(shell?.classList.contains('sidebar-collapsed')){
      $('#sidebarToggleBtn')?.click();
      setDepartmentPersonnelNavGroupOpen(group,true);
      return;
    }
    setDepartmentPersonnelNavGroupOpen(group,!group?.classList.contains('is-open'));
  }; });
  const active=$('.nav-item.active')?.dataset.section || 'dashboard';
  syncInventoryAuditNavigation(active);
  syncDepartmentPersonnelNavigation(active);
  updateMobileDashboardState(active);
  updateFiltersVisibility(active);
}

const FOCUS_MODE_SECTIONS = new Set(['sales','inbound','raw_materials','inventory_closing']);
let FOCUS_MODE_SCROLL_Y = 0;
function setFocusModeButtonState(){
  const active=document.body.classList.contains('focus-mode-active');
  const section=document.body.dataset.focusSection || '';
  $$('[data-focus-target]').forEach(btn=>{
    const isActive=active && btn.dataset.focusTarget===section;
    btn.hidden=isActive;
    btn.setAttribute('aria-pressed',isActive?'true':'false');
  });
  $$('[data-focus-close]').forEach(btn=>{
    const owner=btn.closest('.section')?.id || '';
    btn.hidden=!(active && owner===section);
  });
}
function enterFocusMode(section){
  if(!FOCUS_MODE_SECTIONS.has(section)) return;
  const target=$('#'+section);
  if(!target) return;
  if(currentActiveSection()!==section) switchSection(section);
  FOCUS_MODE_SCROLL_Y=window.scrollY || document.documentElement.scrollTop || 0;
  document.body.classList.add('focus-mode-active');
  document.body.dataset.focusSection=section;
  rememberApplicationViewState(section);
  syncApplicationModalScrollRoot();
  setFocusModeButtonState();
  if(section==='inventory_closing') requestAnimationFrame(updateInventoryCountFreezePanes);
  requestAnimationFrame(()=>target.querySelector('[data-focus-close]')?.focus({preventScroll:true}));
}
function exitFocusMode(options={}){
  const wasActive=document.body.classList.contains('focus-mode-active');
  document.body.classList.remove('focus-mode-active');
  delete document.body.dataset.focusSection;
  rememberApplicationViewState(currentActiveSection());
  syncApplicationModalScrollRoot();
  setFocusModeButtonState();
  updateInventoryCountFreezePanes();
  if(wasActive && options.restoreScroll!==false) requestAnimationFrame(()=>window.scrollTo({top:FOCUS_MODE_SCROLL_Y,behavior:'auto'}));
}
function initFocusModeControls(){
  if(document.body.dataset.focusModeBound==='1') return;
  document.body.dataset.focusModeBound='1';
  document.addEventListener('click',event=>{
    const openBtn=event.target.closest('[data-focus-target]');
    if(openBtn){
      event.preventDefault();
      enterFocusMode(openBtn.dataset.focusTarget);
      return;
    }
    if(event.target.closest('[data-focus-close]')){
      event.preventDefault();
      exitFocusMode();
    }
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && document.body.classList.contains('focus-mode-active')) exitFocusMode();
  });
  window.addEventListener('resize',()=>{
    if(document.body.classList.contains('focus-mode-active') && document.body.dataset.focusSection==='inventory_closing') updateInventoryCountFreezePanes();
  });
  setFocusModeButtonState();
}

function initSidebarToggle(){
  const shell = $('#appShell');
  const btn = $('#sidebarToggleBtn');
  if(!shell || !btn) return;
  const saved = localStorage.getItem('auditSidebarCollapsed') === '1';
  const apply = (collapsed)=>{
    shell.classList.toggle('sidebar-collapsed', collapsed);
    btn.innerHTML = collapsed ? modernIcon('arrowLeft') : modernIcon('menu');
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
document.addEventListener('DOMContentLoaded',()=>{setDefaultDates();startCairoClock();dbBadge();initEnterpriseMultiSelectFilters();initFilters();initDashboardFilters();renderModernSidebarIcons();nav();initMobileDashboardShell();initSidebarToggle();initLoginPasswordToggle();initReportExportButtons();initFocusModeControls();initInboundColumnManager();renderAll()});

// === Supabase Sales Upload + Dynamic Sales Report ===
const SALES_WAREHOUSES = ['W401','W402','N401','N402','N411','N412','E401','E402'];
let activeSalesWarehouse = SALES_WAREHOUSES[0];
let activeSalesReportDate = '';
function todayISO(){const d=new Date();const c=new Date(d.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));return `${c.getFullYear()}-${String(c.getMonth()+1).padStart(2,'0')}-${String(c.getDate()).padStart(2,'0')}`;}
function normalizeDateISO(v){return v ? String(v).slice(0,10) : '';}
function formatDisplayDate(value,emptyText='—'){
  if(value===null || value===undefined || value==='') return emptyText;
  const pad=n=>String(n).padStart(2,'0');
  if(value instanceof Date){
    if(Number.isNaN(value.getTime())) return emptyText;
    return pad(value.getDate())+'/'+pad(value.getMonth()+1)+'/'+value.getFullYear();
  }
  const text=String(value).trim();
  if(!text) return emptyText;
  const iso=text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(iso) return iso[3]+'/'+iso[2]+'/'+iso[1];
  const parsed=new Date(text);
  if(Number.isNaN(parsed.getTime())) return emptyText;
  return pad(parsed.getDate())+'/'+pad(parsed.getMonth()+1)+'/'+parsed.getFullYear();
}
function formatDisplayDateTime(value,emptyText='—'){
  if(value===null || value===undefined || value==='') return emptyText;
  const dateText=formatDisplayDate(value,emptyText);
  if(dateText===emptyText) return emptyText;
  const pad=n=>String(n).padStart(2,'0');
  const parsed=value instanceof Date ? value : new Date(value);
  if(!Number.isNaN(parsed.getTime())) return dateText+' '+pad(parsed.getHours())+':'+pad(parsed.getMinutes());
  const text=String(value).trim();
  const time=text.match(/[T\s](\d{2}):(\d{2})/);
  return time ? dateText+' '+time[1]+':'+time[2] : dateText;
}
function formatDisplayDateRange(from,to){
  const fromText=from ? formatDisplayDate(from,'') : '';
  const toText=to ? formatDisplayDate(to,'') : '';
  return (fromText||toText) ? (fromText || 'البداية')+' → '+(toText || 'النهاية') : 'كل الفترات';
}
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
    const warehouseValue=getRowValue(normalized,['المخزن','Storage Location','SLoc']);
    return {
      batch_id: batchId,
      material_code: String(getRowValue(normalized,['المادة','كود المادة','Material','Material Code'])).trim(),
      material_name: String(getRowValue(normalized,['وصف المادة','وصف الصنف','Material Description'])).trim(),
      net_weight_kg: parseArabicNumber(getRowValue(normalized,['صافي الميزان','صافى الميزان','صافي الوزن','Net Weight'])),
      plant_code: String(getRowValue(normalized,['المصنع','Plant'])).trim(),
      warehouse_code: warehouseValue == null ? null : (String(warehouseValue).trim() || null),
      purchase_order: String(getRowValue(normalized,['Purchasing Document','Purchase Order','PO','أمر الشراء','رقم أمر الشراء'])).trim(),
      transaction_date: typeof trxDateValue === 'number' ? excelDateToISO(trxDateValue) : excelDateToISO(trxDateValue),
      vehicle_number: String(getRowValue(normalized,['رقم العربية','رقم السياره','رقم السيارة','Vehicle Number','Truck No'])).trim(),
      vehicle_description: String(getRowValue(normalized,['وصف العربية','وصف السياره','وصف السيارة','Vehicle Description'])).trim(),
      raw_row: normalized
    };
  }).filter(r=>r.material_code && r.net_weight_kg && r.plant_code && r.purchase_order && r.vehicle_number);
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
  const map={green:'#0f5f35',red:'#7a1f1f',yellow:'#7a6a1f',gold:'#b98612',blue:'#145da0',neutral:'transparent'};
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
    const msg=`تم الحفظ، ولم يتم إنشاء مراجعة الوارد لأن ${missing} غير متوفر لنفس التاريخ ${formatDisplayDate(reportDate,reportDate)}.`;
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
    let scaleWarehouseMissing=false;
    if(matches.length>1){ scaleMatchStatus='multiple_matches'; warning='يوجد أكثر من تصفية مطابقة لنفس المادة/أمر الشراء/رقم العربية.'; }
    else if(scale){
      scaleMatchStatus='matched'; scaleCellStatus='green';
      weightDiffTo=quantityTo-Number(scale.net_weight_to ?? (Number(scale.net_weight_kg||0)/1000));
      weightDiffPercent=quantityTo ? Math.abs(weightDiffTo)/Math.abs(quantityTo)*100 : null;
      weightDiffStatus=(weightDiffPercent!==null && weightDiffPercent<=0.3) ? 'ok' : 'out_of_tolerance';
      scaleWarehouseMissing=!String(scale.warehouse_code || '').trim();
      warehouseStatus=scaleWarehouseMissing?'not_applicable':(normKey(r.warehouse_code)===normKey(scale.warehouse_code)?'matched':'mismatch');
      poStatus=normKey(r.purchase_order)===normKey(scale.purchase_order)?'matched':'mismatch';
      const warehouseAccepted=warehouseStatus==='matched' || scaleWarehouseMissing;
      rowStatus=(weightDiffStatus==='ok' && warehouseAccepted && poStatus==='matched')?'ok':'error';
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
      raw_result: {scale_matches:matches.length,scale_warehouse_missing:scaleWarehouseMissing,movement_group:movementGroup,movement_type:incomingMovementType,movement_text:incomingMovementText,movement_cell_status:movementCellStatus,movement_color_logic:'repost_101_gold_v2',plant_used_for_freight:normalizePlantCodeForAudit(r.plant_code || r.plant_name,r.warehouse_code),goods_used_for_freight:normalizeGoodsTypeForFreight(r.goods_type || r.material_name),vehicle_class_used_for_freight:normalizeVehicleClass(r.vehicle_description),freight_diagnosis:freightDiagnosis}
    };
  });
  if(results.length) await insertChunks('incoming_audit_results',results,300);
  if(targetStatus){ targetStatus.className='upload-status ok'; targetStatus.textContent=`تم إنشاء نتائج مراجعة الوارد تلقائياً: ${results.length} سطر لتاريخ ${formatDisplayDate(reportDate,reportDate)}.`; }
  await refreshInboundReportDates();
  await loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
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
      const ok=await showAppLiquidConfirm({message:`يوجد تقرير مبيعات مرفوع بالفعل بتاريخ ${formatDisplayDate(reportDate,reportDate)}.
هل تريد استبداله بالملف الجديد؟`});
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف النسخة القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      const {error:deleteError}=await WarehouseDB.client.from('sales_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
      clearUnifiedSalesRowsCache();
    }

    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة يومية بتاريخ ${formatDisplayDate(reportDate,reportDate)}...`;
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
    status.textContent=`تم رفع ${payload.length} سطر بنجاح لتاريخ ${formatDisplayDate(reportDate,reportDate)}.`;
    status.className='upload-status ok';
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير مراجعة البيع بتاريخ ${formatDisplayDate(reportDate,reportDate)} (${payload.length} حركة)`);
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
    formatDisplayDate(b.report_date,'-'),
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    formatDisplayDateTime(b.upload_date,'-'),
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
    if(!await showAppLiquidConfirm({message:`سيتم حذف تقرير المبيعات بتاريخ ${formatDisplayDate(date,date)} وكل بياناته الخام. هل أنت متأكد؟`})) return;
    const {error:delError}=await WarehouseDB.client.from('sales_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء الحذف: '+delError.message); return; }
    clearUnifiedSalesRowsCache();
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير مراجعة البيع بتاريخ ${formatDisplayDate(date,date)}`);
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
      const ok=await showAppLiquidConfirm({message:`يوجد تقرير وارد MB51 مرفوع بالفعل بتاريخ ${formatDisplayDate(reportDate,reportDate)}.
هل تريد استبداله بالملف الجديد؟`});
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف النسخة القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',reportDate);
      const {error:rawDeleteError}=await WarehouseDB.client.from('incoming_raw_transactions').delete().in('batch_id',ids);
      if(rawDeleteError) throw rawDeleteError;
      const {error:deleteError}=await WarehouseDB.client.from('incoming_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
    }

    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة وارد بتاريخ ${formatDisplayDate(reportDate,reportDate)}...`;
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
    status.textContent=`تم رفع ${payload.length} سطر وارد بنجاح لتاريخ ${formatDisplayDate(reportDate,reportDate)}.`;
    status.className='upload-status ok';
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير MB51 بتاريخ ${formatDisplayDate(reportDate,reportDate)} (${payload.length} حركة)`);
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
    formatDisplayDate(b.report_date,'-'),
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    formatDisplayDateTime(b.upload_date,'-'),
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
    setInboundTopDateRange(date);
    saveInboundFilters(getInboundTopFilters());
    await refreshInboundReportDates();
    await loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
  }
  if(action==='replace'){
    if($('#incomingReportDateInput')) $('#incomingReportDateInput').value=date;
    $('#incomingExcelInput')?.click();
  }
  if(action==='delete'){
    if(!await showAppLiquidConfirm({message:`سيتم حذف تقرير الوارد بتاريخ ${formatDisplayDate(date,date)} وكل بياناته الخام. هل أنت متأكد؟`})) return;
    await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',date);
    const {error:rawDeleteError}=await WarehouseDB.client.from('incoming_raw_transactions').delete().eq('batch_id',btn.dataset.id);
    if(rawDeleteError){ alert('خطأ أثناء حذف بيانات الوارد: '+rawDeleteError.message); return; }
    const {error:delError}=await WarehouseDB.client.from('incoming_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء حذف نسخة الوارد: '+delError.message); return; }
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير MB51 بتاريخ ${formatDisplayDate(date,date)}`);
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
      const ok=await showAppLiquidConfirm({message:`يوجد تقرير ميزان مرفوع بالفعل بتاريخ ${formatDisplayDate(reportDate,reportDate)}.\nهل تريد استبداله بالملف الجديد؟`});
      if(!ok){ status.textContent='تم إلغاء الرفع بدون تغيير البيانات.'; return; }
      status.textContent='جاري حذف نسخة الميزان القديمة لنفس التاريخ...';
      const ids=existing.map(x=>x.id);
      await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',reportDate);
      const {error:rawDeleteError}=await WarehouseDB.client.from('scale_raw_transactions').delete().in('batch_id',ids);
      if(rawDeleteError) throw rawDeleteError;
      const {error:deleteError}=await WarehouseDB.client.from('scale_upload_batches').delete().in('id',ids);
      if(deleteError) throw deleteError;
    }
    status.textContent=`تم قراءة ${sourceRows.length} سطر. جاري إنشاء نسخة ميزان بتاريخ ${formatDisplayDate(reportDate,reportDate)}...`;
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
    status.textContent=`تم رفع ${payload.length} سطر ميزان بنجاح لتاريخ ${formatDisplayDate(reportDate,reportDate)}.`;
    status.className='upload-status ok';
    await logSystemActivity('التقارير',existing?.length?'استبدال تقرير':'رفع تقرير',`${existing?.length?'استبدال':'رفع'} تقرير الميزان بتاريخ ${formatDisplayDate(reportDate,reportDate)} (${payload.length} حركة)`);
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
    formatDisplayDate(b.report_date,'-'),
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    formatDisplayDateTime(b.upload_date,'-'),
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
    setInboundTopDateRange(date);
    saveInboundFilters(getInboundTopFilters());
    await refreshInboundReportDates();
    await loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
  }
  if(action==='replace'){
    if($('#scaleReportDateInput')) $('#scaleReportDateInput').value=date;
    $('#scaleExcelInput')?.click();
  }
  if(action==='delete'){
    if(!await showAppLiquidConfirm({message:`سيتم حذف تقرير الميزان بتاريخ ${formatDisplayDate(date,date)} وكل بياناته الخام ونتائج مراجعة الوارد المبنية عليه. هل أنت متأكد؟`})) return;
    await WarehouseDB.client.from('incoming_audit_results').delete().eq('report_date',date);
    const {error:rawDeleteError}=await WarehouseDB.client.from('scale_raw_transactions').delete().eq('batch_id',btn.dataset.id);
    if(rawDeleteError){ alert('خطأ أثناء حذف بيانات الميزان: '+rawDeleteError.message); return; }
    const {error:delError}=await WarehouseDB.client.from('scale_upload_batches').delete().eq('id',btn.dataset.id);
    if(delError){ alert('خطأ أثناء حذف نسخة الميزان: '+delError.message); return; }
    await logSystemActivity('التقارير','حذف تقرير',`حذف تقرير الميزان بتاريخ ${formatDisplayDate(date,date)}`);
    await loadScaleBatches();
    await refreshInboundReportDates();
    await loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
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
    meta.innerHTML=`<b>${uiIcon('check')} تم اختيار الملف</b><span>${escapeHtml(file.name)}</span><small>${formatFileSize(file.size)}</small>`;
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
async function refreshInboundReportDates(){
  return [];
}
async function loadInboundAuditReport(date='',options={}){
  const tbl=$('#inboundTable');
  if(!tbl || !WarehouseDB?.ready) return;
  const savedFilters=options.useSavedFilters ? readSavedInboundFilters() : null;
  const useTopFilters=true;
  const topFilters=savedFilters ? {
    plant: inboundLegacySingleValue(savedFilters.plant),
    warehouse: inboundLegacySingleValue(savedFilters.warehouse),
    warehouseType: inboundLegacySingleValue(savedFilters.warehouseType),
    movement: inboundLegacyMovementValue(savedFilters.movement),
    status: inboundLegacySingleValue(savedFilters.status),
    from: normalizeDateISO(savedFilters.from || ''),
    to: normalizeDateISO(savedFilters.to || '')
  } : getInboundTopFilters();
  const selected=normalizeDateISO(date || '');
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
    if(topFilters.warehouse && topFilters.warehouse!=='all') query=query.eq('mb51_warehouse_code',String(topFilters.warehouse).toUpperCase());
    if(topFilters.movement && String(topFilters.movement).trim().toLowerCase()!=='all') query=query.eq('incoming_movement_type',String(topFilters.movement).toUpperCase());
  }
  const {data,error}=await query
    .order('report_date',{ascending:false})
    .order('material_code',{ascending:true});
  if(error){ tbl.innerHTML='<tbody><tr><td>خطأ تحميل مراجعة الوارد: '+error.message+'</td></tr></tbody>'; return; }
  const filtered=(data||[]).filter(r=>inboundRowMatchesTopFilters(r,topFilters));
  updateInboundResultsCount(filtered.length);
  if((!useTopFilters || selected) && filtered.some(r=>!r.incoming_movement_type || !r.raw_result?.freight_diagnosis || r.raw_result?.movement_color_logic!=='repost_101_gold_v2') && !window.__incomingMovementRebuildOnce){
    window.__incomingMovementRebuildOnce=true;
    try{
      await tryBuildIncomingAudit(selected);
      return loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
    }catch(e){ console.warn('incoming audit rebuild skipped',e); }
  }
  const rows=filtered.map(r=>{
    const scaleStatus=r.scale_cell_status || (r.scale_match_status==='matched'?'green':r.row_color);
    const weightStatus=r.weight_diff_status==='ok'?'green':(r.weight_diff_status==='not_applicable'?'yellow':'red');
    const whStatus=r.warehouse_match_status==='matched'?'green':(r.warehouse_match_status==='not_applicable'?'yellow':'red');
    const scaleWarehouseMissing=r.raw_result?.scale_warehouse_missing===true;
    const mb51WarehouseStatus=scaleWarehouseMissing?'neutral':whStatus;
    const scaleWarehouseStatus=scaleWarehouseMissing?'blue':whStatus;
    const poStatus=r.purchase_order_match_status==='matched'?'green':(r.purchase_order_match_status==='not_cleared'?'yellow':'red');
    const freightStatus=['matched','supplier_vehicle_ok'].includes(r.freight_match_status)?'green':(r.freight_match_status==='not_applicable'?'yellow':'red');
    const movementStatus=r.movement_cell_status || r.raw_result?.movement_cell_status || 'neutral';
    const movementValue=(r.incoming_movement_type || r.raw_result?.movement_type || '-') + (r.incoming_movement_text ? ' - '+r.incoming_movement_text : '');
    const values=[
      formatDisplayDate(r.report_date,'-'),
      r.material_code || '-',
      r.material_name || '-',
      r.uom || '-',
      fmt(r.quantity_to || 0),
      r.scale_net_weight_to==null ? (r.warning_message || 'لم يتم التصفية في تاريخه') : fmt(r.scale_net_weight_to),
      r.weight_diff_percent==null ? '-' : fmt(r.weight_diff_percent)+'%',
      movementValue,
      r.mb51_warehouse_code || '-',
      scaleWarehouseMissing ? '\u2014' : (r.scale_warehouse_code || 'لم يتم التصفية في تاريخه'),
      r.mb51_purchase_order || '-',
      r.scale_purchase_order || 'لم يتم التصفية في تاريخه',
      r.vehicle_number || '-',
      r.incoming_type || '-',
      r.vehicle_description || '-',
      r.mb51_freight_description || '-',
      r.mb51_freight_rate_per_ton==null ? '-' : fmt(r.mb51_freight_rate_per_ton),
      r.raw_result?.freight_diagnosis || '-'
    ];
    const normalStatuses=['neutral','neutral','neutral','neutral','neutral',scaleStatus,weightStatus,movementStatus,mb51WarehouseStatus,scaleWarehouseStatus,poStatus,poStatus,'neutral','neutral','neutral',freightStatus,freightStatus,freightStatus];
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
    const ok=await showAppLiquidConfirm({message:`سيتم تحديث مرجع نولون الوارد بالكامل بعدد ${payloadPreview.length} صف.
سيتم تعطيل الصفوف القديمة غير الموجودة في الملف الجديد.
هل تريد المتابعة؟`});
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
    formatDisplayDate(b.reference_date,'-'),
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    formatDisplayDateTime(b.upload_date,'-'),
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
    formatDisplayDateTime(r.updated_at,'-')
  ]);
  table('#freightRatesTable',['وصف النولون','نوع البضاعة','المصنع','وصف العربية','قيمة النولون للطن','الحالة','آخر تحديث'],rows);
}
async function handleFreightBatchAction(btn){
  const action=btn.dataset.action;
  if(action==='view'){
    await loadFreightRates();
  }
  if(action==='delete'){
    if(!await showAppLiquidConfirm({message:'سيتم حذف هذا التحديث وتعطيل الصفوف المرتبطة به. هل أنت متأكد؟'})) return;
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
document.addEventListener('DOMContentLoaded',()=>{initAuthPanel();initMobileUploadReportUI();initSalesUploader();initIncomingUploader();initScaleUploader();initFreightUploader();refreshInboundReportDates();setTimeout(()=>{loadSalesReport(activeSalesWarehouse);loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});loadDashboardRealData();},300);});

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
    toolbar.innerHTML=`<div class="users-search-box settings-table-search-box"><span class="settings-search-icon" aria-hidden="true">${modernIcon('search')}</span><input id="${tableId}GlobalSearch" type="search" placeholder="بحث عام داخل الجدول..." /></div>`;
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
  initSettingsTableControls('storekeepersSettingsTable');
  initSettingsTableControls('departmentPersonnelTable');
  initSettingsTableControls('departmentStatusCodesTable');
}

const SETTINGS_TAB_PERMISSION_MAP={
  profile:'settings_profile',
  account:'settings_account',
  system:'settings_system',
  'plants-settings':'settings_plants',
  'warehouses-settings':'settings_warehouses',
  'sales-products-settings':'settings_sales_products',
  'storekeepers':'settings_storekeepers',
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
  syncSettingsMobileTabSelect?.();

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

  applyStorekeepersSettingsPermissions();
  applyDepartmentPersonnelPermissions();
  applyDepartmentStatusCodesPermissions();

  setElementsDisabled('#activityLogExportExcelBtn',!hasPermission('settings_activity_log','export_excel'),true);
  setElementsDisabled('#activityLogExportPdfBtn',!hasPermission('settings_activity_log','export_pdf'),true);
}
function canAddStorekeepersSettings(){ return hasPermission('settings_storekeepers','add'); }
function canEditStorekeepersSettings(){ return hasPermission('settings_storekeepers','edit'); }
function notifyStorekeepersPermissionDenied(){ alert('\u063A\u064A\u0631 \u0645\u062A\u0627\u062D \u0644\u0644\u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629'); }
function isStorekeepersSettingsEditing(){ return Boolean($('#storekeeperIdInput')?.value); }
function applyStorekeepersSettingsPermissions(){
  const canAdd=canAddStorekeepersSettings();
  const canEdit=canEditStorekeepersSettings();
  const isEditing=isStorekeepersSettingsEditing();
  const canUseForm=isEditing ? canEdit : canAdd;
  const form=$('#storekeeperSettingsForm');
  if(form) form.classList.toggle('permission-hidden',!canUseForm);
  setElementsDisabled('#storekeeperSettingsForm input:not([type="hidden"]),#storekeeperSettingsForm select,#saveStorekeeperBtn',!canUseForm,true);
  setElementsDisabled('#cancelStorekeeperBtn',isEditing ? !canEdit : false,true);
  setElementsDisabled('#storekeepersSettingsTable [data-action="edit-storekeeper"],#storekeepersSettingsTable [data-action="toggle-storekeeper"]',!canEdit,true);
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
  APPLICATION_VIEW_RESTORED_USER_ID='';
  closeActiveApplicationModals({restoreFocus:false});
  resetAppModalScrollLocks();
  $('#loginScreen')?.classList.remove('login-hidden');
  $('#appShell')?.classList.add('app-hidden');
  document.body.classList.remove('mobile-app-shell-active','mobile-dashboard-active','mobile-inbound-active','mobile-upload-reports-active','mobile-reports-active','mobile-dashboard-filter-open','mobile-dashboard-drawer-open','mobile-inbound-filter-open','mobile-reports-filter-open');
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
  restoreApplicationViewState();
  setTimeout(()=>{
    loadSalesBatches();
    loadIncomingBatches();
    loadScaleBatches();
    refreshSalesReportDates();
    refreshInboundReportDates();
    loadSalesReport(activeSalesWarehouse);
    loadInboundAuditReport('',{useTopFilters:true,ignoreSelectedDate:true});
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
  if(key==='created_date') return formatDisplayDate(row.created_date,'');
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
function syncSettingsMobileTabSelect(){
  const root=$('#settings');
  const select=$('#settingsMobileTabSelect');
  if(!root || !select) return;
  const tabs=[...root.querySelectorAll('[data-settings-tab]')];
  [...select.options].forEach(option=>{
    const tab=tabs.find(item=>item.dataset.settingsTab===option.value);
    option.disabled=!tab || tab.hidden || tab.disabled || !canViewSettingsTab(option.value);
  });
  const active=tabs.find(tab=>tab.classList.contains('active') && !tab.hidden && !tab.disabled) || tabs.find(tab=>!tab.hidden && !tab.disabled);
  if(active) select.value=active.dataset.settingsTab;
}
function initSettingsMobileTabSelect(){
  const root=$('#settings');
  const select=$('#settingsMobileTabSelect');
  if(!root || !select || select.dataset.settingsMobileBound==='1') return;
  select.dataset.settingsMobileBound='1';
  select.addEventListener('change',()=>{
    const tabs=[...root.querySelectorAll('[data-settings-tab]')];
    const target=tabs.find(tab=>tab.dataset.settingsTab===select.value);
    if(target && !target.hidden && !target.disabled) target.click();
    syncSettingsMobileTabSelect();
  });
  syncSettingsMobileTabSelect();
}
function initSettingsTabs(){
  const root=$('#settings');
  if(!root) return;
  const tabs=[...root.querySelectorAll('[data-settings-tab]')];
  const panels=[...root.querySelectorAll('[data-settings-panel]')];
  if(root.dataset.settingsTabsBound==='1'){
    initSettingsMobileTabSelect();
    syncSettingsMobileTabSelect();
    return;
  }
  root.dataset.settingsTabsBound='1';
  tabs.forEach(tab=>tab.addEventListener('click',()=>{
    const key=tab.dataset.settingsTab;
    if(!canViewSettingsTab(key)){
      alert('غير متاح للصلاحية الحالية');
      applySettingsSubPermissions();
      syncSettingsMobileTabSelect();
      return;
    }
    tabs.forEach(t=>{const active=t===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',active?'true':'false');});
    panels.forEach(panel=>panel.classList.toggle('active',panel.dataset.settingsPanel===key));
    if(key==='system') ensureSystemSettingsLoaded();
    if(key==='plants-settings') ensurePlantsSettingsLoaded();
    if(key==='warehouses-settings') ensureWarehousesSettingsLoaded();
    if(key==='sales-products-settings') ensureSalesProductsSettingsLoaded();
    if(key==='storekeepers') ensureStorekeepersLoaded();
    if(key==='department-personnel') ensureDepartmentPersonnelLoaded();
    if(key==='department-status-codes') ensureDepartmentStatusCodesLoaded();
    if(key==='activity-log') ensureActivityLogLoaded();
    initAllSettingsTableControls();
    applySettingsSubPermissions();
    syncSettingsMobileTabSelect();
  }));
  initSettingsMobileTabSelect();
  syncSettingsMobileTabSelect();
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
  {key:'raw_materials', label:'متابعة الخامات', description:'متابعة أرصدة الخامات ومعدلات الاستهلاك وأيام التغطية'},
  {key:'inventory_count', label:'الجرد وتوثيق المخزون', description:'إنشاء جرد المخزون وعرض البنود والرصيد الدفتري'},
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
  if(screen==='raw_materials') return false;
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
function permissionKeyForSection(section){
  if(isInventoryAuditSection(section)) return 'inventory_count';
  if(isDepartmentPersonnelSection(section)) return 'reports';
  return section;
}
function hasPermission(section, action='view'){
  if(isSuperAdmin()) return true;
  if(!section) return true;
  const permissionKey=permissionKeyForSection(section);
  const row=CURRENT_ROLE_PERMISSIONS?.[permissionKey];
  if(!row) return action==='view' ? ['dashboard'].includes(permissionKey) : false;
  return row[permissionColumn(action)] === true;
}
function canViewSection(section){ return hasPermission(section,'view'); }
function showPermissionDenied(section){
  const permissionKey=permissionKeyForSection(section);
  const label=PERMISSION_SCREENS.find(x=>x.key===permissionKey)?.label || section;
  alert(`غير مسموح بالوصول إلى: ${label}\nراجع مدير النظام لتعديل الصلاحيات.`);
}
async function loadCurrentUserPermissions(){
  if(isSuperAdmin()){
    CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions('admin');
    applySettingsSubPermissions();
    syncDashboardPngButtonState();
    return;
  }
  const role=CURRENT_APP_PROFILE?.role || 'viewer';
  if(!WarehouseDB?.ready){
    CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role);
    applySettingsSubPermissions();
    syncDashboardPngButtonState();
    return;
  }
  try{
    const {data,error}=await WarehouseDB.client.from('app_role_permissions').select('*').eq('role',role);
    CURRENT_ROLE_PERMISSIONS = error ? buildDefaultPermissions(role) : permissionsForRoleFromRows(role,data||[]);
  }catch(_){ CURRENT_ROLE_PERMISSIONS=buildDefaultPermissions(role); }
  applySettingsSubPermissions();
  syncDashboardPngButtonState();
}
function applyNavigationPermissions(){
  $$('.nav-item').forEach(btn=>{
    const section=btn.dataset.section;
    const allowed=canViewSection(section);
    btn.classList.toggle('permission-hidden',!allowed);
    btn.disabled=!allowed;
    btn.title=allowed?'':'غير مسموح حسب صلاحيات الدور';
  });
  const rawMobileItem=$('.mobile-drawer-item[data-mobile-section="raw_materials"]');
  if(rawMobileItem){
    const allowed=canViewSection('raw_materials');
    rawMobileItem.classList.toggle('permission-hidden',!allowed);
    rawMobileItem.hidden=!allowed;
    rawMobileItem.disabled=!allowed;
  }
  const inventoryAllowed=canViewSection('inventory_closing');
  $$('[data-inventory-nav-group],[data-inventory-mobile-nav-group]').forEach(group=>{
    group.classList.toggle('permission-hidden',!inventoryAllowed);
    group.hidden=!inventoryAllowed;
  });
  $$('.mobile-drawer-item[data-mobile-section="inventory_closing"],.mobile-drawer-item[data-mobile-section="inventory_differences"],.mobile-drawer-item[data-mobile-section="inventory_expiry_tracking"]').forEach(item=>{
    item.disabled=!inventoryAllowed;
    item.classList.toggle('permission-hidden',!inventoryAllowed);
  });
  const departmentPersonnelAllowed=canViewSection('department_storekeepers');
  $$('[data-department-personnel-nav-group],[data-department-personnel-mobile-nav-group]').forEach(group=>{
    group.classList.toggle('permission-hidden',!departmentPersonnelAllowed);
    group.hidden=!departmentPersonnelAllowed;
  });
  $$('.mobile-drawer-item[data-mobile-section="department_storekeepers"],.mobile-drawer-item[data-mobile-section="department_weekly_leave_schedule"],.mobile-drawer-item[data-mobile-section="department_hr_reports"],.mobile-drawer-item[data-mobile-section="department_evaluations"]').forEach(item=>{
    item.disabled=!departmentPersonnelAllowed;
    item.classList.toggle('permission-hidden',!departmentPersonnelAllowed);
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
  if(section==='dashboard') syncDashboardPngButtonState();
  if(section==='inventory_closing'){
    disableByPermission('#createInventoryCountBtn','inventory_count','add',"غير متاح للصلاحية الحالية");
    disableByPermission('#createInventoryDifferenceSnapshotBtn','inventory_count','add',"غير متاح للصلاحية الحالية");
    disableByPermission('#finishInventoryCountBtn,#inventoryCountPostCloseInvoiceBtn','inventory_count','edit',"لا تملك صلاحية تعديل مستند الجرد");
    if(typeof inventoryCountUpdateCreateButton === 'function') inventoryCountUpdateCreateButton();
    if(typeof updateInventoryDifferenceSnapshotButton === 'function') updateInventoryDifferenceSnapshotButton();
    if(typeof updateInventoryCountFinalizationControls === 'function') updateInventoryCountFinalizationControls();
  }
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
  return formatDisplayDateTime(v,'--');
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
    role:enterpriseSelectValues('usersRoleFilter'),
    status:enterpriseSelectValues('usersStatusFilter')
  };
}
function applyUsersFilters(){
  const f=currentUsersFilters();
  USERS_MANAGEMENT_VIEW=USERS_MANAGEMENT_ROWS.filter(u=>{
    const hay=[u.full_name,u.email,u.job_title,u.phone,roleLabel(u.role)].join(' ').toLowerCase();
    const roleOk=enterpriseFilterIsAll(f.role) || enterpriseFilterMatches(f.role,u.role) || (enterpriseFilterActiveValues(f.role).includes('viewer') && u.role==='authenticated');
    const statusOk=enterpriseFilterIsAll(f.status) || (enterpriseFilterActiveValues(f.status).includes('active') && u.is_active) || (enterpriseFilterActiveValues(f.status).includes('inactive') && !u.is_active);
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
          <button type="button" class="icon-action view-user-btn" data-user-id="${escapeHtml(u.id)}" title="عرض">${modernIcon('eye')}</button>
          ${canEdit?`<button type="button" class="icon-action edit-user-btn" data-user-id="${escapeHtml(u.id)}" title="تعديل">${modernIcon('edit')}</button>`:`<button type="button" class="icon-action disabled" title="حساب منشئ النظام لا يتم تعديله من هنا">${modernIcon('lock')}</button>`}
          ${canToggle?`<button type="button" class="icon-action ${u.is_active?'danger-icon':'ok-icon'} toggle-user-btn" data-user-id="${escapeHtml(u.id)}" data-active="${u.is_active?'1':'0'}" title="${u.is_active?'تعطيل':'تفعيل'}">${u.is_active?modernIcon('ban'):modernIcon('check')}</button>`:`<button type="button" class="icon-action disabled" title="لا يمكن تعطيل هذا الحساب">${modernIcon('lock')}</button>`}
          ${canToggle?`<button type="button" class="icon-action delete-user-btn hard-delete-icon" data-user-id="${escapeHtml(u.id)}" title="حذف نهائي من Auth">${modernIcon('trash')}</button>`:`<button type="button" class="icon-action disabled" title="لا يمكن حذف هذا الحساب">${modernIcon('lock')}</button>`}
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
  modal.classList.add('app-liquid-modal-backdrop');
  modal.querySelector('.users-modal-card')?.classList.add('app-liquid-modal');
  modal.querySelector('.users-modal-head')?.classList.add('app-liquid-modal__header');
  modal.querySelector('.modal-close')?.classList.add('app-liquid-modal__close');
  modal.querySelector('.modal-close')?.setAttribute('aria-label','إغلاق نافذة إدارة المستخدمين');
  modal._appModalClose=closeUserManagementModal;
  modal._appModalReturnFocus=document.activeElement;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden','false');
  lockAppModalScroll('userManagementModal',modal);
  if(mode==='create') resetUserManagementForm(false);
  setTimeout(()=>$('#managedUserFullName')?.focus({preventScroll:true}),50);
}
function closeUserManagementModal(options={}){
  const modal=$('#userManagementModal');
  if(!modal) return;
  const returnFocus=modal._appModalReturnFocus;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  unlockAppModalScroll('userManagementModal');
  if(options.restoreFocus!==false && returnFocus?.isConnected) requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
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
  const ok=await showAppLiquidConfirm({message:`تحذير نهائي

سيتم حذف المستخدم من Supabase Auth نهائيًا، وحذف ملفه من جدول المستخدمين.

المستخدم: ${label}

هل أنت متأكد؟`});
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
let MOBILE_APPLICATION_RELOAD_PENDING=false;
function isMobileApplicationRefreshViewport(){
  return window.matchMedia ? window.matchMedia('(max-width: 768px)').matches : window.innerWidth<=768;
}
function hasApplicationUnsavedChanges(){
  const departmentDirty=typeof window.hasUnsavedDepartmentPersonnelWork==='function' && window.hasUnsavedDepartmentPersonnelWork();
  const permissionsDirty=Boolean(typeof PERMISSIONS_MANAGEMENT_STATE!=='undefined' && PERMISSIONS_MANAGEMENT_STATE?.dirty);
  return Boolean(departmentDirty || permissionsDirty);
}
function requestSafeApplicationReload(){
  if(MOBILE_APPLICATION_RELOAD_PENDING || !isMobileApplicationRefreshViewport()) return false;
  const authenticatedView=!$('#appShell')?.classList.contains('app-hidden');
  if(authenticatedView && hasApplicationUnsavedChanges()){
    const confirmed=window.confirm('توجد تعديلات غير محفوظة. سيؤدي تحديث البرنامج إلى فقدها. هل تريد المتابعة؟');
    if(!confirmed) return false;
  }
  if(authenticatedView && typeof window.approveDepartmentPersonnelReloadOnce==='function') window.approveDepartmentPersonnelReloadOnce();
  MOBILE_APPLICATION_RELOAD_PENDING=true;
  window.location.reload();
  return true;
}
function syncMobileApplicationRefreshControls(){
  const mobile=isMobileApplicationRefreshViewport();
  const loginRefresh=$('#loginLogoRefreshBtn');
  const appRefresh=$('#mobileDashboardRefreshBtn');
  if(loginRefresh){
    loginRefresh.disabled=!mobile;
    loginRefresh.tabIndex=mobile?0:-1;
    loginRefresh.setAttribute('aria-disabled',mobile?'false':'true');
  }
  if(appRefresh){
    appRefresh.disabled=!mobile;
    appRefresh.tabIndex=mobile?0:-1;
    appRefresh.setAttribute('aria-disabled',mobile?'false':'true');
  }
}
function initMobileApplicationRefresh(){
  const bind=element=>{
    if(!element || element.dataset.refreshBound==='1') return;
    element.dataset.refreshBound='1';
    element.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      requestSafeApplicationReload();
    });
  };
  bind($('#loginLogoRefreshBtn'));
  bind($('#mobileDashboardRefreshBtn'));
  if(document.documentElement.dataset.mobileRefreshResizeBound!=='1'){
    document.documentElement.dataset.mobileRefreshResizeBound='1';
    window.addEventListener('resize',syncMobileApplicationRefreshControls,{passive:true});
  }
  syncMobileApplicationRefreshControls();
}
window.requestSafeApplicationReload=requestSafeApplicationReload;

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
document.addEventListener('DOMContentLoaded',()=>{initMobileApplicationRefresh();initMainLoginGate();initProfileSettings();initSettingsTabs();initSettingsAccountSecurity();initSystemSettings();initPlantsSettings();initWarehousesSettings();initSalesProductsSettings();initAllSettingsTableControls();initActivityLogSettings();applySettingsSubPermissions();initUsersManagement();initPermissionsManagement();});

// Raw materials report upload helpers
const RAW_MATERIALS_UPLOAD_CHUNK_SIZE=250;
const RAW_MATERIALS_TEMPLATE_HEADERS={
  current_plant_stock:{fileName:'رصيد المصنع الحالي.xlsx',sheetName:'Data',headers:['المادة','وصف المادة','وحدة القياس','رصيد غير مقيد','قيد فحص الجودة','مجموعة المواد','وصف مجموعة المواد','المصنع','إسم المصنع','المخزن','إسم المخزن']},
  consumption_rate:{fileName:'حساب معدل إستهدلاك الخامات.xlsx',sheetName:'Data',headers:['المادة','وصف المادة','الكمية','وحدة القياس','نوع الحركة','وصف نوع الحركة','المصنع','إسم المصنع','مجموعه المواد','وصف مجموعه المواد','التاريخ']}
};
const RAW_MATERIALS_UPLOAD_CONFIG={
  current_plant_stock:{
    statusId:'currentPlantStockUploadStatus',inputId:'currentPlantStockExcelInput',buttonId:'pickCurrentPlantStockFileBtn',dropId:'currentPlantStockDropZone',tableId:'currentPlantStockBatchesTable',chunkRpc:'append_current_plant_stock_upload_chunk',finalizeRpc:'finalize_current_plant_stock_upload',title:'رصيد المصنع الحالي'
  },
  consumption_rate:{
    statusId:'consumptionRateUploadStatus',inputId:'consumptionRateExcelInput',buttonId:'pickConsumptionRateFileBtn',dropId:'consumptionRateDropZone',tableId:'consumptionRateBatchesTable',chunkRpc:'append_consumption_rate_upload_chunk',finalizeRpc:'finalize_consumption_rate_upload',title:'معدل الاستهلاك'
  }
};
const RAW_MATERIALS_UPLOAD_BUSY={current_plant_stock:false,consumption_rate:false};
async function downloadRawMaterialsTemplate(key){
  const spec=RAW_MATERIALS_TEMPLATE_HEADERS[key];
  if(!spec) return;
  if(!window.XLSX){ alert('مكتبة Excel غير محملة.'); return; }
  const ws=XLSX.utils.aoa_to_sheet([spec.headers]);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,spec.sheetName);
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await saveBlobWithPicker(blob,spec.fileName,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function cleanRawMaterialsHeader(value){
  return stripHiddenUnicode(value).trim();
}
function rawMaterialsCell(sheet,rowIndex,colIndex){
  const address=XLSX.utils.encode_cell({r:rowIndex,c:colIndex});
  const cell=sheet[address];
  if(!cell) return '';
  if(cell.w!==undefined && cell.w!==null && String(cell.w).trim()!=='') return cell.w;
  return cell.v ?? '';
}
function rawMaterialsSheetMatrix(sheet){
  const ref=sheet?.['!ref'];
  if(!ref) return {matrix:[],columnCount:0,startRow:0,startCol:0};
  const range=XLSX.utils.decode_range(ref);
  const matrix=[];
  for(let r=range.s.r;r<=range.e.r;r++){
    const row=[];
    for(let c=range.s.c;c<=range.e.c;c++) row.push(rawMaterialsCell(sheet,r,c));
    matrix.push(row);
  }
  return {matrix,columnCount:range.e.c-range.s.c+1,startRow:range.s.r,startCol:range.s.c};
}
function rawMaterialsText(value){
  return stripHiddenUnicode(value).trim();
}
function isRawMaterialsBlankRow(row){
  return !row.some(value=>rawMaterialsText(value));
}
function parseRawMaterialsNumber(value,label,rowNumber,options={}){
  const text=rawMaterialsText(value);
  if(!text){
    if(options.allowBlank) return null;
    throw new Error(`الصف ${rowNumber}: ${label} يجب أن تكون رقمًا صالحًا.`);
  }
  const normalized=text
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/٬/g,'')
    .replace(/,/g,'')
    .replace(/٫/g,'.');
  const n=Number(normalized);
  if(!Number.isFinite(n)) throw new Error(`الصف ${rowNumber}: ${label} يجب أن تكون رقمًا صالحًا.`);
  return n;
}
function parseRawMaterialsDate(value,label,rowNumber){
  const iso=excelDateToISO(value);
  if(!iso) throw new Error(`الصف ${rowNumber}: ${label} يجب أن يكون تاريخًا صالحًا.`);
  return iso;
}
function readRawMaterialsWorkbookRows(workbook,key){
  const spec=RAW_MATERIALS_TEMPLATE_HEADERS[key];
  if(!spec) throw new Error('نوع تقرير غير معروف.');
  const sheet=workbook.Sheets[spec.sheetName];
  if(!sheet) throw new Error(`يجب أن يحتوي الملف على ورقة باسم ${spec.sheetName}.`);
  const {matrix,columnCount,startRow}=rawMaterialsSheetMatrix(sheet);
  if(!matrix.length) throw new Error('ورقة Data فارغة.');
  if(columnCount!==spec.headers.length) throw new Error(`عدد الأعمدة غير صحيح. المطلوب ${spec.headers.length} أعمدة فقط.`);
  const actualHeaders=matrix[0].map(cleanRawMaterialsHeader);
  const mismatch=spec.headers.find((header,index)=>actualHeaders[index]!==header);
  if(mismatch){
    const index=spec.headers.indexOf(mismatch);
    throw new Error(`Header غير مطابق في العمود ${index+1}. المطلوب: ${mismatch}`);
  }
  const data=[];
  for(let i=1;i<matrix.length;i++){
    const row=matrix[i];
    const rowNumber=startRow+i+1;
    if(isRawMaterialsBlankRow(row)) continue;
    data.push(mapRawMaterialsReportRow(key,row,rowNumber));
  }
  if(!data.length) throw new Error('الملف لا يحتوي على صفوف بيانات صالحة.');
  return data;
}
function mapRawMaterialsReportRow(key,row,rowNumber){
  if(key==='current_plant_stock'){
    const materialCode=rawMaterialsText(row[0]);
    const materialName=rawMaterialsText(row[1]);
    const uom=rawMaterialsText(row[2]);
    const plantCode=rawMaterialsText(row[7]);
    const plantName=rawMaterialsText(row[8]);
    const warehouseCode=rawMaterialsText(row[9]);
    const warehouseName=rawMaterialsText(row[10]);
    if(!materialCode) throw new Error(`الصف ${rowNumber}: المادة لا يجب أن تكون فارغة.`);
    if(!materialName) throw new Error(`الصف ${rowNumber}: وصف المادة لا يجب أن يكون فارغًا.`);
    if(!uom) throw new Error(`الصف ${rowNumber}: وحدة القياس لا يجب أن تكون فارغة.`);
    if(!plantCode) throw new Error(`الصف ${rowNumber}: المصنع لا يجب أن يكون فارغًا.`);
    if(!plantName) throw new Error(`الصف ${rowNumber}: إسم المصنع لا يجب أن يكون فارغًا.`);
    if(!warehouseCode) throw new Error(`الصف ${rowNumber}: المخزن لا يجب أن يكون فارغًا.`);
    if(!warehouseName) throw new Error(`الصف ${rowNumber}: إسم المخزن لا يجب أن يكون فارغًا.`);
    return {
      source_row_number:rowNumber,
      material_code:materialCode,
      material_name:materialName,
      uom,
      unrestricted_stock:parseRawMaterialsNumber(row[3],'رصيد غير مقيد',rowNumber,{allowBlank:true}),
      quality_inspection_stock:parseRawMaterialsNumber(row[4],'قيد فحص الجودة',rowNumber,{allowBlank:true}),
      material_group:rawMaterialsText(row[5]),
      material_group_description:rawMaterialsText(row[6]),
      plant_code:plantCode,
      plant_name:plantName,
      warehouse_code:warehouseCode,
      warehouse_name:warehouseName
    };
  }
  if(key==='consumption_rate'){
    const materialCode=rawMaterialsText(row[0]);
    const plantCode=rawMaterialsText(row[6]);
    if(!materialCode) throw new Error(`الصف ${rowNumber}: المادة لا يجب أن تكون فارغة.`);
    if(!plantCode) throw new Error(`الصف ${rowNumber}: المصنع لا يجب أن يكون فارغًا.`);
    return {
      source_row_number:rowNumber,
      material_code:materialCode,
      material_name:rawMaterialsText(row[1]),
      quantity:parseRawMaterialsNumber(row[2],'الكمية',rowNumber),
      uom:rawMaterialsText(row[3]),
      movement_type:rawMaterialsText(row[4]),
      movement_text:rawMaterialsText(row[5]),
      plant_code:plantCode,
      plant_name:rawMaterialsText(row[7]),
      material_group:rawMaterialsText(row[8]),
      material_group_description:rawMaterialsText(row[9]),
      transaction_date:parseRawMaterialsDate(row[10],'التاريخ',rowNumber)
    };
  }
  throw new Error('نوع تقرير غير معروف.');
}
async function beginRawMaterialsUpload(key,file,rows,userData){
  const {data,error}=await WarehouseDB.client.rpc('begin_raw_material_report_upload',{
    p_report_key:key,
    p_file_name:file.name,
    p_uploaded_by_name:currentUploaderName(userData),
    p_expected_rows:rows.length,
    p_file_size_bytes:file.size || 0
  });
  if(error) throw error;
  const result=Array.isArray(data) ? data[0] : data;
  const batchId=result?.batch_id || result?.id || result;
  if(!batchId) throw new Error('لم يتم إنشاء Batch للرفع.');
  return batchId;
}
async function uploadRawMaterialsChunk(key,batchId,chunk){
  const config=RAW_MATERIALS_UPLOAD_CONFIG[key];
  const {error}=await WarehouseDB.client.rpc(config.chunkRpc,{p_batch_id:batchId,p_rows:chunk});
  if(error) throw error;
}
async function uploadRawMaterialsChunks(key,batchId,rows,onProgress){
  let uploaded=0;
  for(let i=0;i<rows.length;i+=RAW_MATERIALS_UPLOAD_CHUNK_SIZE){
    const chunk=rows.slice(i,i+RAW_MATERIALS_UPLOAD_CHUNK_SIZE);
    await uploadRawMaterialsChunk(key,batchId,chunk);
    uploaded+=chunk.length;
    if(onProgress) onProgress(uploaded,rows.length);
  }
}
async function finalizeRawMaterialsUpload(key,batchId){
  const config=RAW_MATERIALS_UPLOAD_CONFIG[key];
  const {data,error}=await WarehouseDB.client.rpc(config.finalizeRpc,{p_batch_id:batchId});
  if(error) throw error;
  return Array.isArray(data) ? data[0] : data;
}
async function failRawMaterialsUpload(batchId,message){
  if(!batchId || !WarehouseDB?.ready) return;
  try{
    await WarehouseDB.client.rpc('fail_raw_material_report_upload',{
      p_batch_id:batchId,
      p_error_message:String(message||'Upload failed').slice(0,500)
    });
  }catch(err){
    console.warn('Raw materials upload fail marker skipped',err);
  }
}
async function replaceRawMaterialsReport(key,file,rows,userData,onProgress){
  let batchId='';
  let finalizeStarted=false;
  try{
    batchId=await beginRawMaterialsUpload(key,file,rows,userData);
    await uploadRawMaterialsChunks(key,batchId,rows,onProgress);
    finalizeStarted=true;
    return await finalizeRawMaterialsUpload(key,batchId);
  }catch(err){
    if(batchId && !finalizeStarted) await failRawMaterialsUpload(batchId,err.message || err);
    throw err;
  }
}
function setRawMaterialsUploadStatus(key,message,type=''){
  const status=$('#'+RAW_MATERIALS_UPLOAD_CONFIG[key].statusId);
  if(!status) return;
  status.className='upload-status '+type;
  status.textContent=message;
}
async function handleRawMaterialsReportFile(key,file){
  const config=RAW_MATERIALS_UPLOAD_CONFIG[key];
  const input=$('#'+config.inputId);
  const button=$('#'+config.buttonId);
  if(!file || RAW_MATERIALS_UPLOAD_BUSY[key]) return;
  RAW_MATERIALS_UPLOAD_BUSY[key]=true;
  if(button) button.disabled=true;
  if(input) input.disabled=true;
  setRawMaterialsUploadStatus(key,'جاري قراءة الملف...');
  try{
    if(!WarehouseDB?.ready) throw new Error('Supabase غير متصل. راجع ملف supabase-config.js');
    if(!window.XLSX) throw new Error('مكتبة Excel غير محملة.');
    const {data:userData}=await WarehouseDB.getUser();
    if(!userData?.user) throw new Error('سجل الدخول أولًا قبل رفع الملف.');
    const arrayBuffer=await file.arrayBuffer();
    const workbook=XLSX.read(arrayBuffer,{type:'array',cellDates:true});
    const rows=readRawMaterialsWorkbookRows(workbook,key);
    const ok=await showAppLiquidConfirm({message:`تم التحقق من ${rows.length} صف صالح في تقرير ${config.title}. سيتم رفع الصفوف على دفعات ثم استبدال النسخة الحالية لهذا التقرير فقط بعد اكتمال كل الدفعات. هل تريد المتابعة؟`});
    if(!ok){ setRawMaterialsUploadStatus(key,'تم إلغاء الرفع بدون تغيير البيانات.'); return; }
    setRawMaterialsUploadStatus(key,`جاري بدء Batch الرفع لتقرير ${config.title}...`);
    const result=await replaceRawMaterialsReport(key,file,rows,userData,(uploaded,total)=>{
      const percent=Math.round((uploaded/total)*100);
      setRawMaterialsUploadStatus(key,`تم رفع ${uploaded.toLocaleString('en-US')} من ${total.toLocaleString('en-US')} صف إلى Staging (${percent}%).`);
    });
    const savedRows=Number(result?.row_count || rows.length);
    setRawMaterialsUploadStatus(key,`تم حفظ تقرير ${config.title} بنجاح بعدد ${savedRows.toLocaleString('en-US')} صف.`,'ok');
    await logSystemActivity('التقارير','رفع تقرير',`رفع تقرير ${config.title} (${savedRows} صف)`);
    await loadRawMaterialsUploadBatch(key);
  }catch(err){
    setRawMaterialsUploadStatus(key,`خطأ أثناء رفع ${config.title}: ${err.message || err}`,'err');
  }finally{
    RAW_MATERIALS_UPLOAD_BUSY[key]=false;
    if(button) button.disabled=false;
    if(input){ input.disabled=false; input.value=''; }
  }
}
async function loadRawMaterialsUploadBatch(key){
  const config=RAW_MATERIALS_UPLOAD_CONFIG[key];
  const tbl=$('#'+config.tableId);
  if(!tbl || !WarehouseDB?.ready) return;
  const {data,error}=await WarehouseDB.client
    .from('raw_material_upload_batches')
    .select('id,report_key,file_name,upload_date,uploaded_by,uploaded_by_name,row_count,file_size_bytes,status,replaced_at,deleted_at,notes')
    .eq('report_key',key)
    .eq('status','succeeded')
    .is('deleted_at',null)
    .order('upload_date',{ascending:false})
    .limit(1);
  if(error){ tbl.innerHTML=`<tbody><tr><td>خطأ تحميل آخر رفع: ${error.message}</td></tr></tbody>`; return; }
  const rows=(data||[]).map(b=>[
    b.file_name || '-',
    Number(b.row_count||0).toLocaleString('en-US'),
    formatFileSize(b.file_size_bytes),
    b.uploaded_by_name || b.uploaded_by || '-',
    formatDisplayDateTime(b.upload_date,'-'),
    b.status || '-'
  ]);
  table('#'+config.tableId,['اسم الملف','عدد الصفوف','الحجم','الرافع','تاريخ الرفع','الحالة'],rows);
}
function bindRawMaterialsUploader(key){
  const config=RAW_MATERIALS_UPLOAD_CONFIG[key];
  const input=$('#'+config.inputId), btn=$('#'+config.buttonId), dz=$('#'+config.dropId);
  if(!input || !btn || btn.dataset.rawUploadBound==='1') return;
  btn.dataset.rawUploadBound='1';
  btn.onclick=()=>input.click();
  input.onchange=()=>{ if(input.files?.[0]) handleRawMaterialsReportFile(key,input.files[0]); };
  if(dz){
    dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag')};
    dz.ondragleave=()=>dz.classList.remove('drag');
    dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag');const f=e.dataTransfer.files?.[0];if(f)handleRawMaterialsReportFile(key,f)};
  }
  loadRawMaterialsUploadBatch(key);
}
function initRawMaterialsReportUploaders(){
  bindRawMaterialsUploader('current_plant_stock');
  bindRawMaterialsUploader('consumption_rate');
}
function initRawMaterialsTemplateDownloads(){
  document.querySelectorAll('[data-template-key]').forEach(btn=>{
    if(btn.dataset.rawTemplateBound==='1') return;
    btn.dataset.rawTemplateBound='1';
    btn.addEventListener('click',event=>{
      event.preventDefault();
      downloadRawMaterialsTemplate(btn.dataset.templateKey);
    });
  });
}
const RAW_MATERIALS_SCREEN_TABS={
  main:{tableId:'rawMaterialsMainTable',countId:'rawMaterialsMainCount',label:'خامات رئيسية'},
  bran:{tableId:'rawMaterialsBranTable',countId:'rawMaterialsBranCount',label:'مجموعة الردة'},
  packaging:{tableId:'rawMaterialsPackagingTable',countId:'rawMaterialsPackagingCount',label:'مواد تعبئة وتغليف'}
};
const RAW_MATERIALS_BRAN_GROUP='Z111-06';
const RAW_MATERIALS_PACKAGING_GROUPS=new Set(['Z113-01','Z113-02','Z113-03']);
const RAW_MATERIALS_BRAN_UNKNOWN_UNITS=new Set();
const RAW_MATERIALS_SCREEN_STATE={stockRows:[],metricRows:[],branConsumptionRows:[],branConsumptionPeriod:null,mergedRows:[],loaded:false,loading:false,activeTab:'main'};
function rawMaterialsSetStatus(message,type=''){
  const el=$('#rawMaterialsStatus');
  if(!el) return;
  el.className='raw-materials-status upload-status '+(type||'');
  el.textContent=message||'';
}
function rawMaterialsCode(value){return String(value||'').trim().toUpperCase();}
function rawMaterialsKey(materialCode,plantCode){return rawMaterialsCode(materialCode)+'|'+rawMaterialsCode(plantCode);}
function rawMaterialsUnitInfo(value){
  const text=String(value||'').trim();
  const upper=text.toUpperCase();
  if(['KG','KILOGRAM'].includes(upper) || ['كيلو','كيلوجرام'].includes(text)) return {unit:'TON',family:'weight',factor:0.001};
  if(['TON','TO','T','TONS'].includes(upper) || text==='طن') return {unit:'TON',family:'weight',factor:1};
  if(['PC','PCS','PIECE'].includes(upper) || text==='قطعة') return {unit:'PC',family:'count',factor:1};
  return {unit:text || '-',family:'unknown',factor:1};
}
function rawMaterialsNumber(value){
  const n=Number(value??0);
  return Number.isFinite(n)?n:0;
}
function rawMaterialsNormalizeBranDailyConsumption(value,unit,row){
  const amount=rawMaterialsNumber(value);
  const text=String(unit||'').trim();
  const upper=text.toUpperCase();
  if(['TON','TO','T','TONS'].includes(upper) || text==='طن') return {value:amount,unit:'TON',recognized:true};
  if(['KG','KGS','KILOGRAM','KILOGRAMS'].includes(upper) || ['كيلو','كيلوجرام','كيلو جرام'].includes(text)) return {value:amount/1000,unit:'TON',recognized:true};
  const warnKey=rawMaterialsKey(row?.material_code,row?.plant_code)+'|'+(text||'-');
  if(!RAW_MATERIALS_BRAN_UNKNOWN_UNITS.has(warnKey)){
    RAW_MATERIALS_BRAN_UNKNOWN_UNITS.add(warnKey);
    console.warn('Raw materials bran group consumption skipped unknown unit', {material_code:row?.material_code,plant_code:row?.plant_code,unit:text||'-'});
  }
  return {value:0,unit:'TON',recognized:false};
}
function rawMaterialsDateKey(value){
  const text=String(value||'').trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0,10) : '';
}
function rawMaterialsAddDays(dateKey,days){
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey||''));
  if(!match) return '';
  const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
  date.setUTCDate(date.getUTCDate()+days);
  return date.toISOString().slice(0,10);
}
async function rawMaterialsLoadBranConsumptionRows(){
  const base=q=>q.eq('material_group',RAW_MATERIALS_BRAN_GROUP).in('movement_type',['261','262']);
  const latestQuery=base(WarehouseDB.client.from('consumption_rate_rows').select('transaction_date').order('transaction_date',{ascending:false}).limit(1));
  const {data,error}=await latestQuery;
  if(error) throw error;
  const periodEnd=rawMaterialsDateKey(data?.[0]?.transaction_date);
  if(!periodEnd) return {rows:[],periodStart:'',periodEnd:''};
  const periodStart=rawMaterialsAddDays(periodEnd,-89);
  const rows=await fetchAllRows('consumption_rate_rows','material_code,material_group,plant_code,movement_type,quantity,uom,transaction_date',q=>base(q).gte('transaction_date',periodStart).lte('transaction_date',periodEnd).order('transaction_date',{ascending:true}));
  return {rows:rows||[],periodStart,periodEnd};
}
function rawMaterialsNormalizeQuantity(value,uom){
  const info=rawMaterialsUnitInfo(uom);
  return {value:rawMaterialsNumber(value)*info.factor,unit:info.unit,family:info.family};
}
function rawMaterialsStatusFromCoverage(avg,coverage){
  if(!Number.isFinite(avg) || avg<=0) return 'no_consumption';
  if(coverage<=3) return 'critical';
  if(coverage<=5) return 'low';
  if(coverage<=10) return 'safe';
  if(coverage<=15) return 'comfortable';
  return 'surplus';
}
function rawMaterialsStatusLabel(status){
  return {no_consumption:'بدون استهلاك',critical:'حرج',low:'منخفض',safe:'آمن',comfortable:'مطمئن',surplus:'زائد'}[status] || '—';
}
function rawMaterialsStatusBadge(status){
  return `<span class="raw-materials-status-badge raw-status-${escapeHtml(status)}">${escapeHtml(rawMaterialsStatusLabel(status))}</span>`;
}
function rawMaterialsFormatQuantity(value,unit){
  const n=Number(value);
  if(!Number.isFinite(n)) return '—';
  if(unit==='PC') return n.toLocaleString('en-US',{maximumFractionDigits:Number.isInteger(n)?0:2});
  return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
}
function rawMaterialsFormatCoverage(value){
  const n=Number(value);
  return Number.isFinite(n) ? n.toLocaleString('en-US',{maximumFractionDigits:2,minimumFractionDigits:0}) : '—';
}
function rawMaterialsNormalizeStockRows(rows){
  const map=new Map();
  (rows||[]).forEach(row=>{
    const material=rawMaterialsCode(row.material_code);
    const plant=rawMaterialsCode(row.plant_code);
    if(!material || !plant) return;
    const key=rawMaterialsKey(material,plant);
    const unrestricted=rawMaterialsNumber(row.unrestricted_stock);
    const quality=rawMaterialsNumber(row.quality_inspection_stock);
    const stock=rawMaterialsNormalizeQuantity(unrestricted+quality,row.uom);
    const current=map.get(key) || {
      key,material_code:material,material_description:row.material_name||'',plant_code:plant,plant_name:row.plant_name||'',
      material_group:rawMaterialsCode(row.material_group),material_group_description:row.material_group_description||'',stock_by_unit:new Map(),warehouses:new Map()
    };
    current.material_description=current.material_description || row.material_name || '';
    current.plant_name=current.plant_name || row.plant_name || '';
    current.material_group=current.material_group || rawMaterialsCode(row.material_group);
    current.material_group_description=current.material_group_description || row.material_group_description || '';
    current.stock_by_unit.set(stock.unit,(current.stock_by_unit.get(stock.unit)||0)+stock.value);
    const wh=rawMaterialsCode(row.warehouse_code);
    if(wh){
      const meta=warehouseMetaByCode(wh);
      current.warehouses.set(wh,{code:wh,name:row.warehouse_name||meta.warehouse_name||wh,type:meta.warehouse_type||'',stock_by_unit:new Map()});
      const w=current.warehouses.get(wh);
      w.stock_by_unit.set(stock.unit,(w.stock_by_unit.get(stock.unit)||0)+stock.value);
    }
    map.set(key,current);
  });
  return map;
}
function rawMaterialsChooseStock(stockItem,unit){
  if(!stockItem) return 0;
  if(stockItem.stock_by_unit.has(unit)) return stockItem.stock_by_unit.get(unit)||0;
  if(stockItem.stock_by_unit.size===1) return [...stockItem.stock_by_unit.values()][0]||0;
  return 0;
}
function rawMaterialsBuildMergedRows(stockRows,metricRows){
  const stockMap=rawMaterialsNormalizeStockRows(stockRows);
  const keys=new Set([...stockMap.keys(),...(metricRows||[]).map(r=>rawMaterialsKey(r.material_code,r.plant_code))]);
  const metricMap=new Map((metricRows||[]).map(r=>[rawMaterialsKey(r.material_code,r.plant_code),r]));
  return [...keys].map(key=>{
    const stock=stockMap.get(key);
    const metric=metricMap.get(key);
    const unit=rawMaterialsUnitInfo(metric?.unit_of_measure || (stock?.stock_by_unit?.keys ? [...stock.stock_by_unit.keys()][0] : '')).unit;
    const currentStock=rawMaterialsChooseStock(stock,unit);
    const average=rawMaterialsNumber(metric?.average_daily_consumption);
    const coverage=average>0 ? currentStock/average : null;
    const status=rawMaterialsStatusFromCoverage(average,coverage);
    return {
      key,
      material_code:stock?.material_code || rawMaterialsCode(metric?.material_code),
      material_description:stock?.material_description || metric?.material_description || '',
      plant_code:stock?.plant_code || rawMaterialsCode(metric?.plant_code),
      plant_name:stock?.plant_name || metric?.plant_name || '',
      material_group:stock?.material_group || rawMaterialsCode(metric?.material_group),
      material_group_description:stock?.material_group_description || metric?.material_group_description || '',
      unit_of_measure:unit,
      metric_unit_of_measure:metric?.unit_of_measure || '',
      current_stock:currentStock,
      average_daily_consumption:average,
      coverage_days:coverage,
      status,
      warehouses:stock?.warehouses || new Map(),
      period_start:metric?.period_start || '',
      period_end:metric?.period_end || ''
    };
  }).sort((a,b)=>a.plant_code.localeCompare(b.plant_code) || a.material_code.localeCompare(b.material_code));
}
function rawMaterialsFilterValues(){
  return {
    plant:enterpriseSelectValues('rawMaterialsPlantFilter'),
    warehouse:enterpriseSelectValues('rawMaterialsWarehouseFilter'),
    warehouseType:enterpriseSelectValues('rawMaterialsWarehouseTypeFilter'),
    group:enterpriseSelectValues('rawMaterialsGroupFilter'),
    status:enterpriseSelectValues('rawMaterialsStatusFilter')
  };
}
function rawMaterialsRowForWarehouseFilter(row,filters){
  let warehouseRows=[...(row.warehouses?.values?.() || [])];
  if(!enterpriseFilterIsAll(filters.warehouse)) warehouseRows=warehouseRows.filter(w=>enterpriseFilterMatches(filters.warehouse,w.code,rawMaterialsCode));
  if(!enterpriseFilterIsAll(filters.warehouseType)) warehouseRows=warehouseRows.filter(w=>enterpriseFilterMatches(filters.warehouseType,w.type));
  if(!enterpriseFilterIsAll(filters.warehouse) || !enterpriseFilterIsAll(filters.warehouseType)){
    if(!warehouseRows.length) return null;
    const stock=warehouseRows.reduce((sum,wh)=>sum+rawMaterialsChooseStock(wh,row.unit_of_measure),0);
    const average=rawMaterialsNumber(row.average_daily_consumption);
    const coverage=average>0 ? stock/average : null;
    return {...row,current_stock:stock,coverage_days:coverage,status:rawMaterialsStatusFromCoverage(average,coverage)};
  }
  return row;
}
function rawMaterialsMatchesDimensionFilters(row,filters){
  if(!enterpriseFilterMatches(filters.plant,row.plant_code)) return false;
  if(!enterpriseFilterMatches(filters.group,row.material_group)) return false;
  return true;
}
function rawMaterialsMatchesFilters(row,filters){
  if(!rawMaterialsMatchesDimensionFilters(row,filters)) return false;
  if(!enterpriseFilterMatches(filters.status,row.status)) return false;
  return true;
}
function rawMaterialsBranGroupDailyConsumption(rows){
  const plantScope=new Set((rows||[]).map(row=>rawMaterialsCode(row.plant_code)).filter(Boolean));
  if(!plantScope.size) return 0;
  let issue=0, returned=0;
  const activeDates=new Set();
  (RAW_MATERIALS_SCREEN_STATE.branConsumptionRows||[]).forEach(row=>{
    const plant=rawMaterialsCode(row.plant_code);
    if(!plantScope.has(plant)) return;
    const movement=String(row.movement_type||'').trim();
    if(movement!=='261' && movement!=='262') return;
    const dateKey=rawMaterialsDateKey(row.transaction_date);
    if(dateKey) activeDates.add(dateKey);
    const quantityTon=rawMaterialsNormalizeBranDailyConsumption(row.quantity,row.uom,row).value;
    if(movement==='261') issue+=quantityTon;
    if(movement==='262') returned+=quantityTon;
  });
  const activeDays=activeDates.size;
  if(!activeDays) return 0;
  return (issue-returned)/activeDays;
}
function rawMaterialsApplyBranGroupConsumption(rows){
  const groupAverage=rawMaterialsBranGroupDailyConsumption(rows);
  return (rows||[]).map(row=>{
    const sourceAverage=rawMaterialsNumber(row.source_average_daily_consumption ?? row.average_daily_consumption);
    const currentStock=rawMaterialsNumber(row.current_stock);
    const coverage=groupAverage>0 ? currentStock/groupAverage : null;
    return {...row,source_average_daily_consumption:sourceAverage,bran_group_average_daily_consumption:groupAverage,average_daily_consumption:groupAverage,unit_of_measure:'TON',coverage_days:coverage,status:rawMaterialsStatusFromCoverage(groupAverage,coverage)};
  });
}
function rawMaterialsTabForGroup(group){
  const key=rawMaterialsCode(group);
  if(key===RAW_MATERIALS_BRAN_GROUP) return 'bran';
  if(RAW_MATERIALS_PACKAGING_GROUPS.has(key)) return 'packaging';
  return 'main';
}
function rawMaterialsVisibleRows(tabKey){
  const filters=rawMaterialsFilterValues();
  const rows=RAW_MATERIALS_SCREEN_STATE.mergedRows
    .map(row=>rawMaterialsRowForWarehouseFilter(row,filters))
    .filter(Boolean)
    .filter(row=>rawMaterialsTabForGroup(row.material_group)===tabKey)
    .filter(row=>rawMaterialsMatchesDimensionFilters(row,filters));
  if(tabKey==='bran'){
    return rawMaterialsApplyBranGroupConsumption(rows)
      .filter(row=>enterpriseFilterMatches(filters.status,row.status));
  }
  return rows.filter(row=>rawMaterialsMatchesFilters(row,filters));
}
function rawMaterialsTotalsByUnit(rows){
  const map=new Map();
  rows.forEach(row=>{
    const unit=row.unit_of_measure || '-';
    const item=map.get(unit) || {unit,stock:0,average:0};
    item.stock+=rawMaterialsNumber(row.current_stock);
    item.average+=rawMaterialsNumber(row.average_daily_consumption);
    map.set(unit,item);
  });
  return [...map.values()].sort((a,b)=>a.unit.localeCompare(b.unit));
}
function rawMaterialsFormatUnitTotals(totals,field){
  if(!totals.length) return '—';
  return totals.map(item=>`${rawMaterialsFormatQuantity(item[field],item.unit)} ${escapeHtml(item.unit)}`).join(' / ');
}
function rawMaterialsTotalRow(rows,tabKey){
  const totals=rawMaterialsTotalsByUnit(rows);
  if(tabKey==='bran' && totals.length){
    const groupAverage=rawMaterialsNumber(rows[0]?.bran_group_average_daily_consumption ?? rawMaterialsBranGroupDailyConsumption(rows));
    totals.forEach((item,index)=>{ item.average=index===0 ? groupAverage : 0; });
  }
  const unitLabel=totals.length===1 ? totals[0].unit : (totals.length ? 'متعدد' : '—');
  let coverage='—', status='—';
  if(tabKey==='bran' && totals.length===1){
    const item=totals[0];
    const coverageValue=item.average>0 ? item.stock/item.average : null;
    coverage=rawMaterialsFormatCoverage(coverageValue);
    status=rawMaterialsStatusBadge(rawMaterialsStatusFromCoverage(item.average,coverageValue));
  }
  return ['الإجمالي','إجمالي التبويب',escapeHtml(unitLabel),'—',rawMaterialsFormatUnitTotals(totals,'stock'),rawMaterialsFormatUnitTotals(totals,'average'),coverage,status];
}
function rawMaterialsRenderTable(tabKey){
  const spec=RAW_MATERIALS_SCREEN_TABS[tabKey];
  const tableNode=$('#'+spec.tableId);
  if(!tableNode) return;
  const rows=rawMaterialsVisibleRows(tabKey);
  const heads=['المادة','وصف المادة','وحدة القياس','المصنع','الرصيد الحالي','متوسط الاستهلاك اليومي','أيام التغطية','الحالة'];
  const body=rows.length ? rows.map(row=>[
    escapeHtml(row.material_code),
    escapeHtml(row.material_description || '-'),
    escapeHtml(row.unit_of_measure || '-'),
    escapeHtml(row.plant_name || row.plant_code || '-'),
    rawMaterialsFormatQuantity(row.current_stock,row.unit_of_measure),
    rawMaterialsFormatQuantity(row.average_daily_consumption,row.unit_of_measure),
    rawMaterialsFormatCoverage(row.coverage_days),
    rawMaterialsStatusBadge(row.status)
  ]) : [];
  const total=rawMaterialsTotalRow(rows,tabKey);
  tableNode.innerHTML='<thead><tr>'+heads.map(h=>`<th>${escapeHtml(h)}</th>`).join('')+'</tr></thead>'
    +'<tbody>'+(body.length?body.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join(''):`<tr><td colspan="${heads.length}" class="empty-row">لا توجد بيانات مطابقة</td></tr>`)
    +'</tbody><tfoot><tr class="raw-materials-total-row">'+total.map(c=>`<td>${c}</td>`).join('')+'</tr></tfoot>';
  const count=$('#'+spec.countId);
  if(count) count.textContent=rows.length.toLocaleString('en-US')+' مادة';
}
const RAW_MATERIALS_EXPORT_HEADERS=['المادة','وصف المادة','وحدة القياس','المصنع','الرصيد الحالي','متوسط الاستهلاك اليومي','أيام التغطية','الحالة'];
function rawMaterialsCurrentTabKey(){return RAW_MATERIALS_SCREEN_STATE.activeTab || 'main';}
function rawMaterialsExportTabLabel(tabKey){return RAW_MATERIALS_SCREEN_TABS[tabKey]?.label || 'متابعة الخامات';}
function rawMaterialsExportTabSlug(tabKey){return ({main:'main',bran:'bran',packaging:'packaging'}[tabKey] || 'raw-materials');}
function rawMaterialsExportNumber(value,decimals=2){
  const n=Number(value);
  if(!Number.isFinite(n)) return '—';
  return Number(n.toFixed(decimals));
}
function rawMaterialsExportQuantity(value,unit){
  const n=Number(value);
  if(!Number.isFinite(n)) return '—';
  const decimals=unit==='PC' && Number.isInteger(n) ? 0 : 2;
  return Number(n.toFixed(decimals));
}
function rawMaterialsExportFilterSummary(tabKey){
  const filters=rawMaterialsFilterValues();
  const lines=[
    'التبويب: '+rawMaterialsExportTabLabel(tabKey),
    'المصانع: '+enterpriseFilterText(filters.plant,$('#rawMaterialsPlantFilter'),'الكل')
  ];
  if(!$('#rawMaterialsWarehouseField')?.hidden) lines.push('المخازن: '+enterpriseFilterText(filters.warehouse,$('#rawMaterialsWarehouseFilter'),'الكل'));
  if(!$('#rawMaterialsWarehouseTypeField')?.hidden) lines.push('نوع المخزن: '+enterpriseFilterText(filters.warehouseType,$('#rawMaterialsWarehouseTypeFilter'),'الكل'));
  lines.push('مجموعة المواد: '+enterpriseFilterText(filters.group,$('#rawMaterialsGroupFilter'),'الكل'));
  lines.push('الحالة: '+enterpriseFilterText(filters.status,$('#rawMaterialsStatusFilter'),'الكل'));
  return lines;
}
function rawMaterialsExportData(tabKey=rawMaterialsCurrentTabKey()){
  const rows=rawMaterialsVisibleRows(tabKey);
  const body=rows.map(row=>[
    row.material_code || '',
    row.material_description || '',
    row.unit_of_measure || '',
    row.plant_name || row.plant_code || '—',
    rawMaterialsExportQuantity(row.current_stock,row.unit_of_measure),
    rawMaterialsExportQuantity(row.average_daily_consumption,row.unit_of_measure),
    rawMaterialsExportNumber(row.coverage_days,2),
    rawMaterialsStatusLabel(row.status)
  ]);
  const total=rawMaterialsTotalRow(rows,tabKey).map(cell=>stripHtml(String(cell)).replace(/\s+/g,' ').trim() || '—');
  return {tabKey,rows,matrix:[RAW_MATERIALS_EXPORT_HEADERS,...body,total],summary:rawMaterialsExportFilterSummary(tabKey)};
}
function rawMaterialsExportFileName(tabKey,ext){return `raw-materials-${rawMaterialsExportTabSlug(tabKey)}-${todayISO()}.${ext}`;}
function rawMaterialsExportTitle(tabKey){return 'متابعة الخامات - '+rawMaterialsExportTabLabel(tabKey);}
async function exportRawMaterialsExcel(){
  const data=rawMaterialsExportData();
  if(!data.rows.length){ alert('لا توجد بيانات للتصدير.'); return; }
  if(!window.XLSX){ alert('مكتبة Excel غير محملة.'); return; }
  const meta=[[rawMaterialsExportTitle(data.tabKey)],['تاريخ التصدير',formatDisplayDateTime(new Date())],...data.summary.map(line=>[line]),[]];
  const ws=XLSX.utils.aoa_to_sheet([...meta,...data.matrix]);
  ws['!cols']=data.matrix[0].map((_,i)=>({wch:Math.max(14,...data.matrix.map(r=>String(r[i]??'').length).slice(0,500).map(n=>Math.min(n,44)))}));
  ws['!rtl']=true;
  ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:meta.length,c:0},e:{r:meta.length,c:data.matrix[0].length-1}})};
  const wb=XLSX.utils.book_new();
  wb.Workbook={Views:[{RTL:true}]};
  XLSX.utils.book_append_sheet(wb,ws,'متابعة الخامات');
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true});
  const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  await saveBlobWithPicker(blob,rawMaterialsExportFileName(data.tabKey,'xlsx'),'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function rawMaterialsExportTableHtml(matrix){
  const head=matrix[0];
  const body=matrix.slice(1);
  return `<table class="raw-materials-export-table"><thead><tr>${head.map(h=>`<th>${escapeHtml(h)}</th>`).join('')}</tr></thead><tbody>${body.map((row,index)=>`<tr class="${index===body.length-1?'is-total':''}">${head.map((_,i)=>`<td>${escapeHtml(row[i] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function rawMaterialsExportBox(data){
  const box=document.createElement('section');
  box.className='raw-materials-export-box';
  box.dir='rtl';
  box.lang='ar';
  box.style.cssText='position:fixed;left:0;top:0;width:1500px;min-height:400px;background:#001611;color:#f4fff5;font-family:Cairo,Arial,Tahoma,sans-serif;padding:22px;box-sizing:border-box;z-index:2147483647;overflow:visible;';
  box.innerHTML=`<header class="raw-materials-export-header"><h1>${escapeHtml(rawMaterialsExportTitle(data.tabKey))}</h1><p>تاريخ التصدير: ${escapeHtml(formatDisplayDateTime(new Date()))}</p><div>${data.summary.map(line=>`<span>${escapeHtml(line)}</span>`).join('')}</div></header>${rawMaterialsExportTableHtml(data.matrix)}`;
  return box;
}
async function rawMaterialsCaptureExportBox(box,backgroundColor='#001611'){
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas) throw new Error('html2canvas is not loaded');
  document.body.appendChild(box);
  if(document.fonts && document.fonts.ready) await document.fonts.ready;
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const width=Math.ceil(box.scrollWidth);
  const height=Math.ceil(box.scrollHeight);
  if(!width || !height) throw new Error('Invalid raw materials export dimensions');
  return Html2Canvas(box,{scale:2,useCORS:true,allowTaint:true,backgroundColor,logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
}
async function exportRawMaterialsPdf(){
  const data=rawMaterialsExportData();
  if(!data.rows.length){ alert('لا توجد بيانات للتصدير.'); return; }
  const JsPDF=(window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if(!window.html2canvas || !JsPDF){ alert('مكتبة PDF غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return; }
  const box=rawMaterialsExportBox(data);
  try{
    const canvas=await rawMaterialsCaptureExportBox(box,'#001611');
    const pdf=new JsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
    const pageWidth=pdf.internal.pageSize.getWidth();
    const pageHeight=pdf.internal.pageSize.getHeight();
    const margin=7;
    const imgWidth=pageWidth-(margin*2);
    const imgHeight=(canvas.height*imgWidth)/canvas.width;
    const imgData=canvas.toDataURL('image/jpeg',0.94);
    let remainingHeight=imgHeight;
    let y=margin;
    pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
    remainingHeight-=pageHeight-(margin*2);
    while(remainingHeight>0){
      pdf.addPage('a4','landscape');
      y=margin-(imgHeight-remainingHeight);
      pdf.addImage(imgData,'JPEG',margin,y,imgWidth,imgHeight,undefined,'FAST');
      remainingHeight-=pageHeight-(margin*2);
    }
    const blob=pdf.output('blob');
    await saveBlobWithPicker(blob,rawMaterialsExportFileName(data.tabKey,'pdf'),'application/pdf');
  }catch(err){
    console.error('Raw materials PDF export failed',err);
    alert('تعذر تصدير PDF. حاول مرة أخرى.');
  }finally{
    try{ box.remove(); }catch(_){}
  }
}
async function exportRawMaterialsPng(){
  const data=rawMaterialsExportData();
  if(!data.rows.length){ alert('لا توجد بيانات للتصدير.'); return; }
  if(!window.html2canvas){ alert('مكتبة PNG غير محملة.'); return; }
  const box=rawMaterialsExportBox(data);
  try{
    const canvas=await rawMaterialsCaptureExportBox(box,'#001611');
    canvas.toBlob(async blob=>{
      if(!blob){ alert('تعذر إنشاء صورة PNG.'); return; }
      await saveBlobWithPicker(blob,rawMaterialsExportFileName(data.tabKey,'png'),'image/png');
    },'image/png',1);
  }catch(err){
    console.error('Raw materials PNG export failed',err);
    alert('تعذر تصدير PNG. حاول مرة أخرى.');
  }finally{
    try{ box.remove(); }catch(_){}
  }
}
function renderRawMaterialsActiveTab(){
  if(!$('#raw_materials')) return;
  rawMaterialsRenderTable(RAW_MATERIALS_SCREEN_STATE.activeTab || 'main');
}
function rawMaterialsAddOptions(select,items,allLabel){
  if(!select) return;
  const current=enterpriseMultiSelectValues(select);
  select.innerHTML=`<option value="all">${escapeHtml(allLabel)}</option>`+items.map(item=>`<option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>`).join('');
  enterpriseSetMultiSelectValues(select,current,{silent:true});
}
function syncRawMaterialsFilterOptions(){
  const rows=RAW_MATERIALS_SCREEN_STATE.mergedRows;
  const plantItems=[...new Map(rows.filter(r=>r.plant_code).map(r=>[r.plant_code,{value:r.plant_code,label:r.plant_code+(r.plant_name?' - '+r.plant_name:'')}])).values()].sort((a,b)=>a.value.localeCompare(b.value));
  const groupItems=[...new Map(rows.filter(r=>r.material_group).map(r=>[r.material_group,{value:r.material_group,label:r.material_group+(r.material_group_description?' - '+r.material_group_description:'')}])).values()].sort((a,b)=>a.value.localeCompare(b.value));
  const warehouseMap=new Map();
  const typeMap=new Map();
  RAW_MATERIALS_SCREEN_STATE.stockRows.forEach(row=>{
    const wh=rawMaterialsCode(row.warehouse_code);
    if(!wh) return;
    const meta=warehouseMetaByCode(wh);
    warehouseMap.set(wh,{value:wh,label:wh+(row.warehouse_name||meta.warehouse_name?' - '+(row.warehouse_name||meta.warehouse_name):'')});
    if(meta.warehouse_type) typeMap.set(meta.warehouse_type,{value:meta.warehouse_type,label:meta.warehouse_type});
  });
  rawMaterialsAddOptions($('#rawMaterialsPlantFilter'),plantItems,'كل المصانع');
  rawMaterialsAddOptions($('#rawMaterialsWarehouseFilter'),[...warehouseMap.values()].sort((a,b)=>a.value.localeCompare(b.value)),'كل المخازن');
  rawMaterialsAddOptions($('#rawMaterialsWarehouseTypeFilter'),[...typeMap.values()].sort((a,b)=>a.value.localeCompare(b.value)),'كل أنواع المخازن');
  rawMaterialsAddOptions($('#rawMaterialsGroupFilter'),groupItems,'كل المجموعات');
  initEnterpriseMultiSelectFilters($('#raw_materials'));
  const whField=$('#rawMaterialsWarehouseField');
  const typeField=$('#rawMaterialsWarehouseTypeField');
  if(whField) whField.hidden=warehouseMap.size===0;
  if(typeField) typeField.hidden=typeMap.size===0;
}
async function loadRawMaterialsScreen(force=false){
  if(RAW_MATERIALS_SCREEN_STATE.loading) return;
  if(RAW_MATERIALS_SCREEN_STATE.loaded && !force){ renderRawMaterialsActiveTab(); return; }
  if(!WarehouseDB?.ready){ rawMaterialsSetStatus('Supabase غير متصل. لا يمكن تحميل بيانات متابعة الخامات.','err'); return; }
  RAW_MATERIALS_SCREEN_STATE.loading=true;
  rawMaterialsSetStatus('جاري تحميل بيانات متابعة الخامات...');
  try{
    const [stockRows,metricRows,branConsumption]=await Promise.all([
      fetchAllRows('current_plant_stock_rows','material_code,material_name,uom,unrestricted_stock,quality_inspection_stock,material_group,material_group_description,plant_code,plant_name,warehouse_code,warehouse_name'),
      fetchAllRows('raw_material_consumption_metrics','material_code,material_description,plant_code,plant_name,material_group,material_group_description,unit_of_measure,average_daily_consumption,period_start,period_end'),
      rawMaterialsLoadBranConsumptionRows()
    ]);
    RAW_MATERIALS_SCREEN_STATE.stockRows=stockRows||[];
    RAW_MATERIALS_SCREEN_STATE.metricRows=metricRows||[];
    RAW_MATERIALS_SCREEN_STATE.branConsumptionRows=branConsumption.rows||[];
    RAW_MATERIALS_SCREEN_STATE.branConsumptionPeriod={periodStart:branConsumption.periodStart||'',periodEnd:branConsumption.periodEnd||''};
    RAW_MATERIALS_SCREEN_STATE.mergedRows=rawMaterialsBuildMergedRows(stockRows,metricRows);
    RAW_MATERIALS_SCREEN_STATE.loaded=true;
    syncRawMaterialsFilterOptions();
    renderRawMaterialsActiveTab();
    rawMaterialsSetStatus(`تم تحميل ${RAW_MATERIALS_SCREEN_STATE.mergedRows.length.toLocaleString('en-US')} مادة من رصيد المصنع ومعدل الاستهلاك.`,'ok');
  }catch(err){
    rawMaterialsSetStatus('تعذر تحميل بيانات متابعة الخامات: '+(err.message||err),'err');
  }finally{
    RAW_MATERIALS_SCREEN_STATE.loading=false;
  }
}
function initRawMaterialsFilters(){
  const root=$('#raw_materials');
  if(!root || root.dataset.rawMaterialsFiltersBound==='1') return;
  root.dataset.rawMaterialsFiltersBound='1';
  $('#rawMaterialsSearchBtn')?.addEventListener('click',()=>{
    renderRawMaterialsActiveTab();
    closeRawMaterialsFilters();
  });
  $('#rawMaterialsResetBtn')?.addEventListener('click',()=>{
    ['rawMaterialsPlantFilter','rawMaterialsWarehouseFilter','rawMaterialsWarehouseTypeFilter','rawMaterialsGroupFilter','rawMaterialsStatusFilter'].forEach(id=>enterpriseSetSelectValuesById(id,['all'],{silent:true}));
    renderRawMaterialsActiveTab();
    closeRawMaterialsFilters();
  });
  ['rawMaterialsPlantFilter','rawMaterialsWarehouseFilter','rawMaterialsWarehouseTypeFilter','rawMaterialsGroupFilter','rawMaterialsStatusFilter'].forEach(id=>{
    $('#'+id)?.addEventListener('change',renderRawMaterialsActiveTab);
  });
}
function switchRawMaterialsTab(key){
  const root=$('#raw_materials');
  if(!root) return;
  const selected=key || 'main';
  root.querySelectorAll('[data-raw-materials-tab]').forEach(tab=>{
    const active=tab.dataset.rawMaterialsTab===selected;
    tab.classList.toggle('active',active);
    tab.setAttribute('aria-selected',active?'true':'false');
  });
  root.querySelectorAll('[data-raw-materials-panel]').forEach(panel=>{
    const active=panel.dataset.rawMaterialsPanel===selected;
    panel.classList.toggle('active',active);
    panel.hidden=!active;
  });
  const select=$('#rawMaterialsMobileTabSelect');
  if(select && select.value!==selected) select.value=selected;
  RAW_MATERIALS_SCREEN_STATE.activeTab=selected;
  renderRawMaterialsActiveTab();
}
function initRawMaterialsTabs(){
  const root=$('#raw_materials');
  if(!root || root.dataset.rawMaterialsTabsBound==='1') return;
  root.dataset.rawMaterialsTabsBound='1';
  initRawMaterialsFilters();
  root.querySelectorAll('[data-raw-materials-tab]').forEach(tab=>{
    tab.addEventListener('click',()=>switchRawMaterialsTab(tab.dataset.rawMaterialsTab));
  });
  $('#rawMaterialsMobileTabSelect')?.addEventListener('change',event=>switchRawMaterialsTab(event.target.value));
  switchRawMaterialsTab('main');
}
document.addEventListener('DOMContentLoaded',()=>{initRawMaterialsTemplateDownloads();initRawMaterialsReportUploaders();initRawMaterialsTabs();});
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
    const old=enterpriseMultiSelectValues(wf);
    wf.innerHTML='<option value="all">كل مخازن البيع</option>';
    APP_DATA.plants
      .filter(p=>enterpriseFilterMatches(enterpriseMultiSelectValues(pf),p.code))
      .forEach(p=>p.warehouses.filter(w=>saleWhCodes.includes(w[0])).forEach(w=>wf.add(new Option(`${w[0]} - ${w[1]}`,w[0]))));
    enterpriseSetMultiSelectValues(wf,old,{silent:true});
  }
  pf.addEventListener('change',()=>{clearUnifiedSalesRowsCache();fillWh(); if(ACTIVE_REPORT_TAB===ITEM_ANALYTICS_TAB) fillItemAnalyticsItemFilter({keepSelection:true});});
  wf.addEventListener('change',()=>{clearUnifiedSalesRowsCache(); if(ACTIVE_REPORT_TAB===ITEM_ANALYTICS_TAB) fillItemAnalyticsItemFilter({keepSelection:true});});
  ['reportFromDate','reportToDate'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{clearUnifiedSalesRowsCache(); if(ACTIVE_REPORT_TAB===ITEM_ANALYTICS_TAB) fillItemAnalyticsItemFilter({keepSelection:true});}));
  fillWh();
  initEnterpriseMultiSelectFilters($('#reports'));
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
  return {plant:enterpriseSelectValues('reportPlantFilter'),warehouse:enterpriseSelectValues('reportWarehouseFilter'),from:normalizeDateISO($('#reportFromDate')?.value||''),to:normalizeDateISO($('#reportToDate')?.value||'')};
}
function reportFilterLabel(filters){
  const plant=enterpriseFilterText(filters.plant,$('#reportPlantFilter'),'جميع المصانع');
  const wh=enterpriseFilterText(filters.warehouse,$('#reportWarehouseFilter'),'جميع مخازن البيع');
  const period=formatDisplayDateRange(filters.from,filters.to);
  return `الفترة: ${period} / المصنع: ${plant} / المخزن: ${wh} / تاريخ الإصدار: ${formatDisplayDateTime(new Date())}`;
}
function renderExecutiveKPIs(stats){
  const cards=[
    {title:'إجمالي البيع',value:fmt(stats.salesQty),unit:'طن',icon:'sales'},
    {title:'إجمالي الإنتاج',value:fmt(stats.productionQty),unit:'طن',icon:'production'},
    {title:'التحويلات الصادرة',value:fmt(stats.outgoingTransferQty),unit:'طن',icon:'outgoing'},
    {title:'التحويلات الواردة',value:fmt(stats.incomingTransferQty),unit:'طن',icon:'incoming'},
    {title:'إجمالي التحميل',value:fmt(stats.totalLoadingQty),unit:'طن',icon:'loading'}
  ];
  const node=$('#executiveKpiCards'); if(node) node.innerHTML=cards.map(renderStandardKpiCard).join('');
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
  const cards=[['production',topPlant[0],'أعلى مصنع بيعاً',fmt(topPlant[1].sales||0)+' طن'],['warehouses',topWh.code||'-','أعلى مخزن بيعاً',fmt(topWh.sales||0)+' طن'],['star',topProduct.code||'-','أعلى صنف بيعاً',escapeHtml(topProduct.name||'-')],['ban',noSales,'أصناف بدون بيع','لها إنتاج أو تحويلات'],['alert',review,'أصناف تحتاج مراجعة','فرق إنتاج/بيع مرتفع'],['reports',fmt(stats.salesQty),'إجمالي البيع','حسب الفلتر الحالي']];
  const node=$('#executiveInsights'); if(node) node.innerHTML=cards.map(c=>'<div class="executive-insight-card"><span class="insight-ico">'+modernIcon(c[0])+'</span><b>'+c[1]+'</b><span>'+c[2]+'</span><small>'+c[3]+'</small></div>').join('');
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
    {title:'عدد الأصناف',value:fmt(summary.count),unit:'صنف',icon:'box',className:'kpi-items-count'},
    {title:'أصناف طبيعية',value:fmt(summary.ok),unit:'صنف',icon:'shield',className:'kpi-items-ok'},
    {title:'تحتاج مراجعة',value:fmt(summary.review),unit:'صنف',icon:'warning',className:'kpi-items-review'},
    {title:'بدون بيع',value:fmt(summary.noSales),unit:'صنف',icon:'doc',className:'kpi-items-no-sales'},
    {title:'إجمالي فرق الإنتاج/البيع',value:fmt(summary.totalGap),unit:'طن',icon:'transfer',className:'kpi-items-gap'}
  ];
  const node=$('#itemsReportKpis'); if(node) node.innerHTML=cards.map(renderStandardKpiCard).join('');
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



// === Enterprise Item Analytics ===
const ITEM_ANALYTICS_TAB='item_analytics';
let ITEM_ANALYTICS_STATE={filters:null,scopeRows:[],selectedRows:[],previousScopeRows:[],model:null,auditSearch:'',auditSort:{key:'date',dir:'asc'},queryCount:0,hiddenDueToInsufficientData:[]};
function itemAnalyticsSyncFilterVisibility(tab=ACTIVE_REPORT_TAB){
  const field=$('#itemAnalyticsItemFilterField');
  if(field) field.hidden=tab!==ITEM_ANALYTICS_TAB;
  const trigger=$('#mobileReportsFilterBtn small');
  if(trigger) trigger.textContent=tab===ITEM_ANALYTICS_TAB?'المصنع / المخزن / الصنف / التاريخ':'المصنع / المخزن / التاريخ';
}
function itemAnalyticsCode(value){return String(value||'').trim().toUpperCase();}
function itemAnalyticsDayMs(){return 24*60*60*1000;}
function itemAnalyticsDateFromKey(key){const v=normalizeDateISO(key);return v?new Date(v+'T00:00:00Z'):null;}
function itemAnalyticsDateAdd(key,days){const d=itemAnalyticsDateFromKey(key);if(!d)return '';d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);}
function itemAnalyticsPeriodLength(filters){const a=itemAnalyticsDateFromKey(filters.from),b=itemAnalyticsDateFromKey(filters.to);if(!a||!b)return 0;return Math.max(1,Math.round((b-a)/itemAnalyticsDayMs())+1);}
function itemAnalyticsPreviousFilters(filters){const days=itemAnalyticsPeriodLength(filters);if(!days||!filters.from)return null;const prevTo=itemAnalyticsDateAdd(filters.from,-1);const prevFrom=itemAnalyticsDateAdd(prevTo,-days+1);return {...filters,from:prevFrom,to:prevTo};}
function itemAnalyticsBaseFilters(){const filters=getReportFilters();return {plant:filters.plant,warehouse:filters.warehouse,from:filters.from,to:filters.to};}
function itemAnalyticsSelectedCodes(){return enterpriseFilterActiveValues(enterpriseSelectValues('itemAnalyticsItemFilter')).map(itemAnalyticsCode).filter(Boolean);}
function itemAnalyticsListItem(label,value,detail=''){return `<div class="item-analytics-list-row"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>${detail?`<small>${escapeHtml(detail)}</small>`:''}</div>`;}
function itemAnalyticsSetEmpty(message='اختر صنفًا واحدًا أو أكثر لعرض تحليلات الأصناف'){
  const empty=$('#itemAnalyticsEmptyState'), results=$('#itemAnalyticsResults'), meta=$('#itemAnalyticsMeta');
  if(empty){empty.hidden=false;empty.querySelector('h3').textContent=message;}
  if(results) results.hidden=true;
  if(meta) meta.textContent=message;
}
function itemAnalyticsShowResults(){const empty=$('#itemAnalyticsEmptyState'),results=$('#itemAnalyticsResults');if(empty)empty.hidden=true;if(results)results.hidden=false;}
async function fillItemAnalyticsItemFilter(options={}){
  const select=$('#itemAnalyticsItemFilter');
  if(!select || !WarehouseDB?.ready) return;
  await ensureReportDefaultDates({keepDates:true});
  const keep=options.keepSelection!==false;
  const current=keep?enterpriseMultiSelectValues(select):['all'];
  const filters=itemAnalyticsBaseFilters();
  try{
    const rows=await fetchAllSalesAuditRows(filters,{ascending:true,orderBy:'material_code',select:'material_code,material_name,report_date,plant_code,warehouse_code'});
    const map=new Map();
    (rows||[]).forEach(row=>{const code=itemAnalyticsCode(row.material_code);if(code&&!map.has(code))map.set(code,{code,name:row.material_name||''});});
    const items=[...map.values()].sort((a,b)=>a.code.localeCompare(b.code));
    select.innerHTML='<option value="all">اختر صنفًا</option>'+items.map(item=>`<option value="${escapeHtml(item.code)}">${escapeHtml(item.code)} — ${escapeHtml(item.name||'بدون وصف')}</option>`).join('');
    const valid=new Set(items.map(item=>item.code));
    const next=enterpriseFilterActiveValues(current).map(itemAnalyticsCode).filter(code=>valid.has(code));
    enterpriseSetMultiSelectValues(select,next.length?next:['all'],{silent:true});
    initEnterpriseMultiSelectFilters($('#reports'));
  }catch(error){console.warn('item analytics item filter load error',error);}
}
function getItemAnalyticsFilters(){return {...itemAnalyticsBaseFilters(),items:itemAnalyticsSelectedCodes()};}
function itemAnalyticsValidateFilters(filters){
  if(filters.from && filters.to && filters.from>filters.to) return 'تاريخ البداية لا يجب أن يتجاوز تاريخ النهاية.';
  if(!filters.items.length) return 'اختر صنفًا واحدًا أو أكثر لعرض تحليلات الأصناف';
  return '';
}
function itemAnalyticsStats(rows){
  const stats={sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0,rows:0};
  (rows||[]).forEach(row=>{const m=unifiedSalesRowMetrics(row);stats.sales+=toNumber(m.sales);stats.actualReturn+=toNumber(m.actualReturn);stats.production+=toNumber(m.production);stats.outgoing+=toNumber(m.outgoing);stats.incoming+=toNumber(m.incoming);stats.loading+=toNumber(m.loading);stats.rows++;});
  return stats;
}
function itemAnalyticsDaily(rows){
  const map=new Map();
  (rows||[]).forEach(row=>{const d=dashboardDateKey(row.report_date);if(!map.has(d))map.set(d,{date:d,sales:0,production:0,outgoing:0,incoming:0,loading:0,rows:0});const m=unifiedSalesRowMetrics(row),item=map.get(d);item.sales+=toNumber(m.sales);item.production+=toNumber(m.production);item.outgoing+=toNumber(m.outgoing);item.incoming+=toNumber(m.incoming);item.loading+=toNumber(m.loading);item.rows++;});
  return [...map.values()].filter(r=>r.date&&r.date!=='غير محدد').sort((a,b)=>a.date.localeCompare(b.date));
}
function itemAnalyticsProductMap(rows){
  const map=new Map();
  (rows||[]).forEach(row=>{const code=itemAnalyticsCode(row.material_code)||'غير محدد';if(!map.has(code))map.set(code,{code,name:row.material_name||'',sales:0,actualReturn:0,production:0,outgoing:0,incoming:0,loading:0,rows:0});const item=map.get(code),m=unifiedSalesRowMetrics(row);item.name=item.name||row.material_name||'';item.sales+=toNumber(m.sales);item.actualReturn+=toNumber(m.actualReturn);item.production+=toNumber(m.production);item.outgoing+=toNumber(m.outgoing);item.incoming+=toNumber(m.incoming);item.loading+=toNumber(m.loading);item.rows++;});
  return [...map.values()].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales));
}
function itemAnalyticsBuildAbc(scopeRows,selectedCodes){
  const products=itemAnalyticsProductMap(scopeRows);
  const total=products.reduce((sum,p)=>sum+Math.abs(p.sales),0);
  let cumulative=0;
  const selected=new Map();
  products.forEach((p,index)=>{const contribution=total?Math.abs(p.sales)/total*100:0;cumulative+=contribution;const cls=cumulative<=80?'A':(cumulative<=95?'B':'C');const row={...p,rank:index+1,contribution,cumulative,abc:cls,totalScopeSales:total};if(selectedCodes.includes(itemAnalyticsCode(p.code)))selected.set(itemAnalyticsCode(p.code),row);});
  const selectedRows=selectedCodes.map(code=>selected.get(code)).filter(Boolean);
  const combinedSales=selectedRows.reduce((sum,p)=>sum+Math.abs(p.sales),0);
  return {products,total,selectedRows,combinedContribution:total?combinedSales/total*100:0};
}
function itemAnalyticsBuildAuditRows(rows){
  const entries=[];
  const specs=[
    ['sales','بيع','إجمالي بيع يومي','خارج'],['actualReturn','مرتجع فعلي','مرتجع / إلغاء بيع','إلغاء / مرتجع'],['production','إنتاج','إجمالي إنتاج يومي','داخل'],['incoming','تحويل وارد','إجمالي تحويلات واردة يومية','داخل'],['outgoing','تحويل صادر','إجمالي تحويلات صادرة يومية','خارج'],['loading','تحميل','إجمالي تحميل يومي','خارج']
  ];
  (rows||[]).forEach(row=>{const m=unifiedSalesRowMetrics(row);specs.forEach(([key,movement,desc,direction])=>{const qty=toNumber(m[key]);if(!qty)return;entries.push({date:dashboardDateKey(row.report_date),code:row.material_code||'',name:row.material_name||'',plant:row.plant_name||row.plant_code||'',warehouse:row.warehouse_name||row.warehouse_code||'',movement,description:desc,quantity:qty,unit:'طن',direction});});});
  return entries.sort((a,b)=>a.date.localeCompare(b.date)||a.code.localeCompare(b.code));
}
function itemAnalyticsTrend(daily){
  if((daily||[]).length<6) return {label:'غير كاف',rate:null,detail:'البيانات أقل من 6 أيام'};
  const mid=Math.floor(daily.length/2);const first=daily.slice(0,mid).reduce((s,d)=>s+Math.abs(d.sales),0);const second=daily.slice(mid).reduce((s,d)=>s+Math.abs(d.sales),0);const rate=first?((second-first)/Math.abs(first))*100:(second?100:0);return {label:rate>8?'صاعد':rate<-8?'هابط':'مستقر',rate,detail:`تغير النصف الثاني عن الأول ${fmt(rate)}%`};
}
function itemAnalyticsVolatility(daily){const values=(daily||[]).map(d=>Math.abs(d.sales)).filter(v=>v>0);if(values.length<3)return 0;const avg=values.reduce((a,b)=>a+b,0)/values.length;const variance=values.reduce((s,v)=>s+Math.pow(v-avg,2),0)/values.length;return avg?Math.sqrt(variance)/avg:0;}
function itemAnalyticsComparison(current,previous){function pct(c,p){if(!p)return null;return ((c-p)/Math.abs(p))*100;}return {sales:pct(current.sales,previous.sales),production:pct(current.production,previous.production),outgoing:pct(current.outgoing,previous.outgoing),incoming:pct(current.incoming,previous.incoming),loading:pct(current.loading,previous.loading)};}
function itemAnalyticsBuildModel(filters,scopeRows,previousScopeRows){
  const selectedSet=new Set(filters.items.map(itemAnalyticsCode));
  const selectedRows=scopeRows.filter(row=>selectedSet.has(itemAnalyticsCode(row.material_code)));
  const previousSelectedRows=previousScopeRows.filter(row=>selectedSet.has(itemAnalyticsCode(row.material_code)));
  const stats=itemAnalyticsStats(selectedRows),previousStats=itemAnalyticsStats(previousSelectedRows);
  const daily=itemAnalyticsDaily(selectedRows),previousDaily=itemAnalyticsDaily(previousSelectedRows);
  const activeSalesDays=daily.filter(d=>Math.abs(d.sales)>0).length;
  const comparison=itemAnalyticsComparison(stats,previousStats);
  const trend=itemAnalyticsTrend(daily);
  const volatility=itemAnalyticsVolatility(daily);
  const abc=itemAnalyticsBuildAbc(scopeRows,filters.items);
  const auditRows=itemAnalyticsBuildAuditRows(selectedRows);
  const products=itemAnalyticsProductMap(selectedRows);
  return {filters,scopeRows,selectedRows,previousScopeRows,previousSelectedRows,stats,previousStats,daily,previousDaily,activeSalesDays,comparison,trend,volatility,abc,auditRows,products};
}
function itemAnalyticsHealth(model){
  let score=70;const reasons=[],risks=[],strengths=[];
  const stats=model.stats,comp=model.comparison,contribution=model.abc.combinedContribution,days=itemAnalyticsPeriodLength(model.filters),activeRate=days?model.activeSalesDays/days*100:0;
  if(Math.abs(stats.sales)>0){score+=8;strengths.push(`بيع فعلي بقيمة ${fmt(stats.sales)} طن`);}else if(Math.abs(stats.production)+Math.abs(stats.outgoing)+Math.abs(stats.incoming)>0){score-=30;risks.push('توجد حركة بدون بيع خلال الفترة');}
  if(contribution>=15){score+=8;strengths.push(`مساهمة مرتفعة ${fmt(contribution)}% من إجمالي البيع`);}else reasons.push(`مساهمة البيع ${fmt(contribution)}%`);
  if(comp.sales!==null){if(comp.sales<-20){score-=15;risks.push(`تراجع البيع ${fmt(Math.abs(comp.sales))}% عن الفترة السابقة`);}else if(comp.sales>15){score+=7;strengths.push(`نمو البيع ${fmt(comp.sales)}% عن الفترة السابقة`);}}
  else reasons.push('لا توجد بيانات كافية للمقارنة السابقة');
  const prodGap=Math.abs(Math.abs(stats.production)-Math.abs(stats.sales));const gapBase=Math.max(Math.abs(stats.sales),Math.abs(stats.production),1);if(prodGap/gapBase>.3){score-=10;risks.push(`فرق إنتاج/بيع مرتفع ${fmt(prodGap)} طن`);}else strengths.push('الإنتاج والبيع ضمن نطاق مقبول');
  if(model.volatility>.75){score-=10;risks.push(`تذبذب الطلب مرتفع (${fmt(model.volatility*100)}%)`);}else if(model.volatility>0){strengths.push(`تذبذب الطلب تحت السيطرة (${fmt(model.volatility*100)}%)`);}
  if(activeRate<15 && days>=14){score-=8;risks.push(`نسبة أيام البيع النشطة منخفضة ${fmt(activeRate)}%`);}else if(activeRate>=40){score+=5;strengths.push(`نشاط بيع منتظم ${fmt(activeRate)}% من الفترة`);}
  score=Math.max(0,Math.min(100,Math.round(score)));
  const status=score>=85?'ممتاز':score>=70?'طبيعي':score>=50?'يحتاج متابعة':'حرج';
  const action=status==='حرج'?'مراجعة فورية للصنف والفترة':status==='يحتاج متابعة'?'متابعة أسباب المخاطر خلال الفترة':'استمرار المتابعة الدورية';
  return {score,status,reasons:reasons.slice(0,4),risks:risks.slice(0,4),strengths:strengths.slice(0,4),action};
}
function renderItemAnalyticsHealth(model){
  const health=itemAnalyticsHealth(model);const badge=$('#itemAnalyticsHealthBadge'),node=$('#itemAnalyticsHealthSummary');if(badge){badge.textContent=`${health.status} - ${health.score}/100`;badge.className='item-analytics-health-badge '+(health.status==='حرج'?'danger':health.status==='يحتاج متابعة'?'warning':health.status==='ممتاز'?'excellent':'normal');}
  if(node) node.innerHTML=`<div class="item-analytics-health-score"><b>${health.score}</b><span>درجة من 100</span><strong>${escapeHtml(health.status)}</strong></div><div class="item-analytics-health-details">${itemAnalyticsListItem('الإجراء المقترح',health.action)}${itemAnalyticsListItem('أهم الأسباب',(health.reasons.length?health.reasons.join(' / '):'لا توجد أسباب سلبية حاسمة'))}${itemAnalyticsListItem('أهم المخاطر',(health.risks.length?health.risks.join(' / '):'لا توجد مخاطر عالية حسب القواعد الحالية'))}${itemAnalyticsListItem('نقاط القوة',(health.strengths.length?health.strengths.join(' / '):'لا توجد نقاط قوة كافية'))}</div>`;
}
function renderItemAnalyticsKpis(stats){
  const cards=[{title:'إجمالي البيع',value:fmt(stats.sales),unit:'طن',icon:'sales'},{title:'إجمالي الإنتاج',value:fmt(stats.production),unit:'طن',icon:'production'},{title:'إجمالي التحويلات الواردة',value:fmt(stats.incoming),unit:'طن',icon:'incoming'},{title:'إجمالي التحويلات الصادرة',value:fmt(stats.outgoing),unit:'طن',icon:'outgoing'},{title:'إجمالي التحميل',value:fmt(stats.loading),unit:'طن',icon:'loading'}];
  const node=$('#itemAnalyticsKpiCards');if(node)node.innerHTML=cards.map(renderStandardKpiCard).join('');
}
function renderItemAnalyticsHeatmap(selector,daily,key){
  const node=$(selector);if(!node)return;const values=(daily||[]).map(d=>Math.abs(d[key]||0));const nonZero=values.filter(v=>v>0);const max=nonZero.length?Math.max(...nonZero):0,min=nonZero.length?Math.min(...nonZero):0;
  node.innerHTML=(daily||[]).map(d=>{const v=Math.abs(d[key]||0);let cls='empty';if(v>0&&v===max)cls='max';else if(v>0&&v===min)cls='min';else if(v>0)cls='mid';const pct=max?Math.max(12,Math.min(100,(v/max)*100)):0;return `<div class="item-analytics-heat-cell ${cls}" style="--heat:${pct}%" title="${escapeHtml(d.date)} - ${fmt(v)} طن"><span>${escapeHtml(d.date.slice(5))}</span><b>${fmt(v)}</b></div>`;}).join('') || '<div class="empty-row">لا توجد بيانات يومية</div>';
}
function renderItemAnalyticsList(id,rows){const node=$('#'+id);if(node)node.innerHTML=(rows||[]).join('')||'<div class="empty-row">لا توجد بيانات كافية</div>';}
function renderItemAnalyticsPerformance(model){
  const daily=model.daily,stats=model.stats,active=model.activeSalesDays,highest=[...daily].sort((a,b)=>Math.abs(b.sales)-Math.abs(a.sales))[0],lowest=daily.filter(d=>Math.abs(d.sales)>0).sort((a,b)=>Math.abs(a.sales)-Math.abs(b.sales))[0];
  const days=itemAnalyticsPeriodLength(model.filters);const avg=days?stats.sales/days:0;const activeAvg=active?stats.sales/active:0;
  renderItemAnalyticsList('itemAnalyticsSalesPerformance',[itemAnalyticsListItem('إجمالي البيع',fmt(stats.sales)+' طن'),itemAnalyticsListItem('متوسط البيع اليومي',fmt(avg)+' طن'),itemAnalyticsListItem('عدد أيام البيع الفعلية',fmt(active)+' يوم'),itemAnalyticsListItem('أعلى يوم بيع',highest?`${highest.date} - ${fmt(highest.sales)} طن`:'غير متاح'),itemAnalyticsListItem('أقل يوم بيع فعلي',lowest?`${lowest.date} - ${fmt(lowest.sales)} طن`:'غير متاح'),itemAnalyticsListItem('متوسط الكمية في يوم البيع',fmt(activeAvg)+' طن'),itemAnalyticsListItem('اتجاه الأداء',model.trend.label,model.trend.detail),itemAnalyticsListItem('نسبة الأيام النشطة',days?fmt(active/days*100)+'%':'غير متاح'),itemAnalyticsListItem('تذبذب الطلب',fmt(model.volatility*100)+'%')]);
}
function renderItemAnalyticsComparison(model){
  const c=model.stats,p=model.previousStats,comp=model.comparison;const row=(label,key)=>itemAnalyticsListItem(label,`${fmt(c[key])} / السابق: ${fmt(p[key])}`,comp[key]===null?'لا توجد بيانات سابقة':`التغير ${fmt(comp[key])}%`);
  renderItemAnalyticsList('itemAnalyticsPeriodComparison',[row('البيع الحالي والسابق','sales'),row('الإنتاج الحالي والسابق','production'),row('التحويلات الواردة','incoming'),row('التحويلات الصادرة','outgoing'),row('التحميل','loading')]);
}
function renderItemAnalyticsContribution(model){
  const rows=[itemAnalyticsListItem('نطاق المقارنة','كل الأصناف داخل نفس المصنع والمخزن والفترة بدون فلتر الصنف'),itemAnalyticsListItem('مساهمة الأصناف المختارة',fmt(model.abc.combinedContribution)+'%',`إجمالي نطاق المقام ${fmt(model.abc.total)} طن`)];
  model.abc.selectedRows.forEach(item=>rows.push(itemAnalyticsListItem(`${item.code} - ${item.name||''}`,`ترتيب ${item.rank} / فئة ${item.abc}`,`مساهمة ${fmt(item.contribution)}% / تراكمي ${fmt(item.cumulative)}%`)));
  renderItemAnalyticsList('itemAnalyticsContribution',rows);
}
function renderItemAnalyticsSeasonality(model){
  const days=itemAnalyticsPeriodLength(model.filters),daily=model.daily,hidden=[];const rows=[];
  if(days<90){rows.push(itemAnalyticsListItem('الموسمية','البيانات التاريخية غير كافية لتحديد الموسمية بثقة','الحد الأدنى العملي 90 يومًا للتحليل الشهري'));hidden.push('Seasonality');}
  else{const monthEnd=daily.filter(d=>Number(d.date.slice(8,10))>=24).reduce((s,d)=>s+Math.abs(d.sales),0);const rest=daily.filter(d=>Number(d.date.slice(8,10))<24).reduce((s,d)=>s+Math.abs(d.sales),0);rows.push(itemAnalyticsListItem('نمط آخر الشهر',rest?`آخر الشهر أعلى/أقل بـ ${fmt(((monthEnd-rest)/Math.abs(rest))*100)}%`:'لا توجد بيانات كافية للمقارنة'));}
  if(daily.length<30){rows.push(itemAnalyticsListItem('كشف الأنماط','البيانات غير كافية لاستخراج نمط موثوق'));hidden.push('Pattern Detection');}
  else{const weekdays={};daily.forEach(d=>{const dt=itemAnalyticsDateFromKey(d.date);const k=dt?dt.getUTCDay():0;weekdays[k]=(weekdays[k]||0)+Math.abs(d.sales);});const top=Object.entries(weekdays).sort((a,b)=>b[1]-a[1])[0];rows.push(itemAnalyticsListItem('أعلى يوم أسبوعي',top?`اليوم رقم ${top[0]} بقيمة ${fmt(top[1])} طن`:'غير متاح'));}
  ITEM_ANALYTICS_STATE.hiddenDueToInsufficientData=hidden;
  renderItemAnalyticsList('itemAnalyticsSeasonality',rows);
}
function renderItemAnalyticsForecast(model){
  const daily=model.daily.filter(d=>Math.abs(d.sales)>0);if(daily.length<14){renderItemAnalyticsList('itemAnalyticsForecast',[itemAnalyticsListItem('Forecast','لا توجد بيانات كافية لإنتاج توقع موثوق','يحتاج 14 يوم بيع فعلي على الأقل')]);ITEM_ANALYTICS_STATE.hiddenDueToInsufficientData.push('Forecast');return;}
  const recent=daily.slice(-14);const avg=recent.reduce((s,d)=>s+Math.abs(d.sales),0)/recent.length;const rows=[itemAnalyticsListItem('النموذج','Moving Average بسيط',`عدد أيام الأساس ${recent.length}`),itemAnalyticsListItem('توقع 7 أيام',fmt(avg*7)+' طن','تقديري'),itemAnalyticsListItem('توقع 30 يومًا',fmt(avg*30)+' طن','تقديري')];if(daily.length>=60)rows.push(itemAnalyticsListItem('توقع 90 يومًا',fmt(avg*90)+' طن','تقديري طويل المدى'));else rows.push(itemAnalyticsListItem('توقع 90 يومًا','لا توجد بيانات كافية','يحتاج فترة أطول'));renderItemAnalyticsList('itemAnalyticsForecast',rows);
}
function renderItemAnalyticsInventorySignals(model){
  const rows=[itemAnalyticsListItem('Inventory Turnover','غير معروض كحقيقة','لا يوجد متوسط مخزون تاريخي موثوق'),itemAnalyticsListItem('Stockout تاريخي','غير معروض','لا يوجد رصيد يومي تاريخي موثوق')];
  if(Math.abs(model.stats.sales)===0 && Math.abs(model.stats.production+model.stats.incoming)>0) rows.push(itemAnalyticsListItem('ركود محتمل','حركة أو إنتاج بدون بيع','إشارة مؤكدة من بيانات الفترة'));
  renderItemAnalyticsList('itemAnalyticsInventorySignals',rows);
}
function renderItemAnalyticsAlertsRecommendations(model){
  const alerts=[],rec=[];const h=itemAnalyticsHealth(model);const comp=model.comparison;
  if(comp.sales!==null && comp.sales<-20) alerts.push(itemAnalyticsListItem('انخفاض مفاجئ في البيع',`التراجع ${fmt(Math.abs(comp.sales))}%`,'أولوية مرتفعة'));
  if(Math.abs(model.stats.loading)>Math.abs(model.stats.sales+model.stats.outgoing)*1.15 && Math.abs(model.stats.loading)>0) alerts.push(itemAnalyticsListItem('تحميل أعلى من النشاط المتوقع',fmt(model.stats.loading)+' طن','أولوية متوسطة'));
  if(!model.previousSelectedRows.length) alerts.push(itemAnalyticsListItem('لا توجد فترة مقارنة','المقارنة السابقة غير كافية','تنبيه بيانات'));
  rec.push(itemAnalyticsListItem(h.status==='حرج'?'مراجعة فورية':'متابعة دورية',h.action,`الدرجة ${h.score}/100`));
  if(model.abc.selectedRows.some(i=>i.abc==='A')) rec.push(itemAnalyticsListItem('صنف فئة A','متابعة يومية للحركة والمخزون','مرتبط بمساهمة عالية'));
  if(model.volatility>.75) rec.push(itemAnalyticsListItem('تذبذب مرتفع','مراجعة أسباب قمم الطلب','أولوية متوسطة'));
  renderItemAnalyticsList('itemAnalyticsAlerts',alerts.length?alerts:[itemAnalyticsListItem('لا توجد تنبيهات عالية','حسب القواعد الحالية')]);
  renderItemAnalyticsList('itemAnalyticsRecommendations',rec);
}
function renderItemAnalyticsAuditTrail(model){
  const search=String(ITEM_ANALYTICS_STATE.auditSearch||'').trim().toLowerCase();let rows=model.auditRows||[];
  if(search) rows=rows.filter(r=>Object.values(r).some(v=>String(v||'').toLowerCase().includes(search)));
  const sort=ITEM_ANALYTICS_STATE.auditSort||{key:'date',dir:'asc'};rows=[...rows].sort((a,b)=>{const av=sort.key==='quantity'?toNumber(a[sort.key]):String(a[sort.key]||'');const bv=sort.key==='quantity'?toNumber(b[sort.key]):String(b[sort.key]||'');const cmp=av>bv?1:av<bv?-1:0;return sort.dir==='desc'?-cmp:cmp;});
  const heads=[['date','التاريخ'],['code','الصنف'],['name','وصف الصنف'],['plant','المصنع'],['warehouse','المخزن'],['movement','الحركة'],['description','وصف الحركة'],['quantity','الكمية'],['unit','الوحدة'],['direction','الاتجاه']];
  const html='<thead><tr>'+heads.map(([k,h])=>`<th data-ia-sort="${k}">${escapeHtml(h)}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>`<tr class="ia-dir-${r.direction==='داخل'?'in':r.direction==='خارج'?'out':'return'}"><td>${escapeHtml(formatDisplayDate(r.date,r.date||''))}</td><td>${escapeHtml(r.code)}</td><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.plant)}</td><td>${escapeHtml(r.warehouse)}</td><td>${escapeHtml(r.movement)}</td><td>${escapeHtml(r.description)}</td><td>${fmt(r.quantity)}</td><td>${escapeHtml(r.unit)}</td><td>${escapeHtml(r.direction)}</td></tr>`).join('')+(rows.length?'':'<tr><td colspan="10">لا توجد بيانات حركة مطابقة</td></tr>')+'</tbody>';
  const tbl=$('#itemAnalyticsAuditTrailTable');if(tbl)tbl.innerHTML=html;
}
function renderItemAnalyticsComparisonTable(model){
  const rows=model.products.map(item=>{const abc=model.abc.selectedRows.find(a=>itemAnalyticsCode(a.code)===itemAnalyticsCode(item.code));return `<tr><td>${escapeHtml(item.code)}</td><td>${escapeHtml(item.name||'')}</td><td>${fmt(item.sales)}</td><td>${fmt(item.production)}</td><td>${fmt(item.incoming)}</td><td>${fmt(item.outgoing)}</td><td>${fmt(item.loading)}</td><td>${abc?fmt(abc.contribution)+'%':'—'}</td><td>${abc?.abc||'—'}</td><td>${model.trend.label}</td><td>${model.daily.length>=14?'Moving Average':'غير كاف'}</td></tr>`;}).join('');
  const heads='<thead><tr><th>الصنف</th><th>الوصف</th><th>البيع</th><th>الإنتاج</th><th>الوارد</th><th>الصادر</th><th>التحميل</th><th>مساهمة البيع</th><th>ABC</th><th>الاتجاه</th><th>التوقع</th></tr></thead>';
  const body=`<tbody>${rows||'<tr><td colspan="11">لا توجد بيانات</td></tr>'}</tbody>`;const tbl=$('#itemAnalyticsComparisonTable');if(tbl)tbl.innerHTML=heads+body;const count=$('#itemAnalyticsComparisonCount');if(count)count.textContent=`${model.products.length} صنف`;
}
function renderItemAnalyticsExportTable(model){const tbl=$('#itemAnalyticsExportTable');if(!tbl)return;tbl.innerHTML=$('#itemAnalyticsComparisonTable')?.innerHTML||'';}
function renderItemAnalyticsReport(model){
  itemAnalyticsShowResults();const meta=$('#itemAnalyticsMeta');if(meta)meta.textContent=reportFilterLabel(model.filters)+` / الأصناف: ${enterpriseFilterText(model.filters.items,$('#itemAnalyticsItemFilter'),'اختر صنفًا')}`;
  renderItemAnalyticsHealth(model);renderItemAnalyticsKpis(model.stats);renderItemAnalyticsHeatmap('#itemAnalyticsSalesHeatmap',model.daily,'sales');renderItemAnalyticsHeatmap('#itemAnalyticsProductionHeatmap',model.daily,'production');renderItemAnalyticsPerformance(model);renderItemAnalyticsComparison(model);renderItemAnalyticsContribution(model);renderItemAnalyticsSeasonality(model);renderItemAnalyticsInventorySignals(model);renderItemAnalyticsForecast(model);renderItemAnalyticsAlertsRecommendations(model);renderItemAnalyticsAuditTrail(model);renderItemAnalyticsComparisonTable(model);renderItemAnalyticsExportTable(model);
}
async function loadItemAnalyticsReport(options={}){
  if(!WarehouseDB?.ready) return;fillReportFilters();itemAnalyticsSyncFilterVisibility(ITEM_ANALYTICS_TAB);await ensureReportDefaultDates(options);await fillItemAnalyticsItemFilter({keepSelection:true});
  const filters=getItemAnalyticsFilters();const error=itemAnalyticsValidateFilters(filters);if(error){itemAnalyticsSetEmpty(error);return;}
  itemAnalyticsShowResults();const meta=$('#itemAnalyticsMeta');if(meta)meta.textContent='جاري تحميل تحليلات الأصناف...';
  try{
    const previousFilters=itemAnalyticsPreviousFilters(filters);let queryCount=0;
    const scopeRows=await fetchUnifiedSalesRows(filters,{ascending:true});queryCount++;
    const previousScopeRows=previousFilters?await fetchUnifiedSalesRows(previousFilters,{ascending:true}):[];if(previousFilters)queryCount++;
    const model=itemAnalyticsBuildModel(filters,scopeRows,previousScopeRows);ITEM_ANALYTICS_STATE={...ITEM_ANALYTICS_STATE,filters,scopeRows,previousScopeRows,selectedRows:model.selectedRows,model,queryCount};
    renderItemAnalyticsReport(model);
  }catch(error){console.warn('item analytics load error',error);itemAnalyticsSetEmpty('تعذر تحميل تحليلات الأصناف. راجع الاتصال أو الفلاتر.');}
}
function itemAnalyticsWorkbookRows(model){
  const summary=[['العنوان','تحليلات الأصناف'],['الفترة',formatDisplayDateRange(model.filters.from,model.filters.to)],['الأصناف',enterpriseFilterText(model.filters.items,$('#itemAnalyticsItemFilter'),'')],['إجمالي البيع',model.stats.sales],['إجمالي الإنتاج',model.stats.production],['الوارد',model.stats.incoming],['الصادر',model.stats.outgoing],['التحميل',model.stats.loading],['عدد Queries',ITEM_ANALYTICS_STATE.queryCount||0]];
  const timeline=[['التاريخ','الصنف','وصف الصنف','المصنع','المخزن','الحركة','وصف الحركة','الكمية','الوحدة','الاتجاه'],...(model.auditRows||[]).map(r=>[formatDisplayDate(r.date,r.date||''),r.code,r.name,r.plant,r.warehouse,r.movement,r.description,r.quantity,r.unit,r.direction])];
  const comparison=[['الصنف','الوصف','البيع','الإنتاج','الوارد','الصادر','التحميل','مساهمة البيع','ABC','الترتيب','التراكمي'],...model.abc.selectedRows.map(r=>[r.code,r.name,r.sales,r.production,r.incoming,r.outgoing,r.loading,r.contribution,r.abc,r.rank,r.cumulative])];
  const forecast=[['البند','القيمة'],...($('#itemAnalyticsForecast')?.innerText||'').split('\n').filter(Boolean).map(t=>[t,''])];
  return {summary,timeline,comparison,forecast};
}
async function exportItemAnalyticsExcel(){
  const model=ITEM_ANALYTICS_STATE.model;if(!model||!model.selectedRows.length){alert('اختر صنفًا واحدًا أو أكثر قبل التصدير.');return;}if(!window.XLSX){alert('مكتبة Excel غير محملة.');return;}
  const wb=XLSX.utils.book_new();wb.Workbook={Views:[{RTL:true}]};const sheets=itemAnalyticsWorkbookRows(model);Object.entries(sheets).forEach(([name,rows])=>{if(rows.length>1){const ws=XLSX.utils.aoa_to_sheet(rows);ws['!rtl']=true;XLSX.utils.book_append_sheet(wb,ws,name.slice(0,31));}});
  const out=XLSX.write(wb,{bookType:'xlsx',type:'array'});await saveBlobWithPicker(new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),`item-analytics-${todayISO()}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
function bindItemAnalyticsUI(){
  $('#itemAnalyticsAuditSearch')?.addEventListener('input',event=>{ITEM_ANALYTICS_STATE.auditSearch=event.target.value||'';if(ITEM_ANALYTICS_STATE.model)renderItemAnalyticsAuditTrail(ITEM_ANALYTICS_STATE.model);});
  $('#itemAnalyticsAuditTrailTable')?.addEventListener('click',event=>{const th=event.target.closest('th[data-ia-sort]');if(!th)return;const key=th.dataset.iaSort;const prev=ITEM_ANALYTICS_STATE.auditSort||{};ITEM_ANALYTICS_STATE.auditSort={key,dir:prev.key===key&&prev.dir==='asc'?'desc':'asc'};if(ITEM_ANALYTICS_STATE.model)renderItemAnalyticsAuditTrail(ITEM_ANALYTICS_STATE.model);});
}
let WAREHOUSES_REPORT_STATE={warehouses:[],filters:null,summary:null};
function warehouseReportRow(w,i,totalSales){
  const pct=totalSales?Math.abs(w.sales||0)/Math.abs(totalSales)*100:0;
  return `<tr><td>${i+1}</td><td>${escapeHtml(w.code)}</td><td>${escapeHtml(w.name)}</td><td>${escapeHtml(w.plant)}</td><td>${fmt(w.sales)}</td><td>${fmt(w.production)}</td><td>${fmt(w.outgoing)}</td><td>${fmt(w.incoming)}</td><td>${fmt(w.loading)}</td><td><div class="warehouse-share-cell"><span>${fmt(pct)}%</span><b style="width:${Math.min(100,Math.max(0,pct))}%"></b></div></td></tr>`;
}
function renderWarehousesReportKPIs(summary){
  const cards=[
    {title:'إجمالي البيع',value:fmt(summary.sales),unit:'طن',icon:'sales',className:'kpi-sales'},
    {title:'إجمالي الإنتاج',value:fmt(summary.production),unit:'طن',icon:'production',className:'kpi-production'},
    {title:'التحويلات الصادرة',value:fmt(summary.outgoing),unit:'طن',icon:'outgoing',className:'kpi-outgoing'},
    {title:'التحويلات الواردة',value:fmt(summary.incoming),unit:'طن',icon:'incoming',className:'kpi-incoming'},
    {title:'إجمالي التحميل',value:fmt(summary.loading),unit:'طن',icon:'loading',className:'kpi-loading'}
  ];
  const node=$('#warehousesReportKpis'); if(node) node.innerHTML=cards.map(renderStandardKpiCard).join('');
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
  const loadingRankRows=[...warehouses].map(w=>({...w,loadingRankTotal:toNumber(w.sales)+toNumber(w.outgoing)}));
  const maxLoadingRank=Math.max(1,...loadingRankRows.map(w=>Math.abs(w.loadingRankTotal||0)));
  const rows=loadingRankRows.sort((a,b)=>Math.abs(b.loadingRankTotal||0)-Math.abs(a.loadingRankTotal||0)).slice(0,10).map((w,i)=>`<div class="warehouse-rank-row"><em>${i+1}</em><div><b>${escapeHtml(w.code)}</b><small>${escapeHtml(w.name)}</small></div><span>${fmt(w.loadingRankTotal)}<small> \u0637\u0646</small></span><i style="width:${Math.min(100,Math.abs(w.loadingRankTotal||0)/maxLoadingRank*100)}%"></i></div>`).join('');
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
  ensureWarehousePerformancePngButtons();
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
    {title:'إجمالي الاستثناءات',value:fmt(summary.total),unit:'حالة',icon:'warning',className:'kpi-exceptions-total'},
    {title:'أولوية عالية',value:fmt(summary.high),unit:'حالة',icon:'shield',className:'kpi-exceptions-high'},
    {title:'أولوية متوسطة',value:fmt(summary.medium),unit:'حالة',icon:'reports',className:'kpi-exceptions-medium'},
    {title:'أصناف متأثرة',value:fmt(summary.items),unit:'صنف',icon:'box',className:'kpi-exceptions-items'},
    {title:'أكبر فرق إنتاج/بيع',value:fmt(summary.maxGap),unit:'طن',icon:'transfer',className:'kpi-exceptions-gap'}
  ];
  const node=$('#exceptionsReportKpis');
  if(node) node.innerHTML=cards.map(renderStandardKpiCard).join('');
}
function exceptionChartColor(key){
  const map={
    sales_high:['#d99a35','#8a5a1f'],
    production_high:['#4ea3d8','#1c5878'],
    outgoing_high:['#9b7bd9','#59478f'],
    incoming_high:['#38b8aa','#1f6f68'],
    loading_gap:['#8bd46a','#3f8748'],
    no_sales:['#9fa8ad','#5f6c72']
  };
  return map[key] || ['#79ce47','#2f7e3f'];
}
function resizeExceptionsChartCanvas(canvas){
  if(!canvas) return {w:canvas?.width||0,h:canvas?.height||0};
  const rect=canvas.getBoundingClientRect();
  const cssWidth=Math.max(320,Math.round(rect.width || canvas.clientWidth || 760));
  const cssHeight=Math.max(280,Math.min(480,Math.round(rect.height || canvas.clientHeight || 400)));
  const dpr=Math.min(2,Math.max(1,window.devicePixelRatio||1));
  const targetW=Math.round(cssWidth*dpr), targetH=Math.round(cssHeight*dpr);
  if(canvas.width!==targetW) canvas.width=targetW;
  if(canvas.height!==targetH) canvas.height=targetH;
  const ctx=canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  return {w:cssWidth,h:cssHeight};
}
function drawExceptionsChart(summary){
  const canvas=$('#exceptionsReportChart'); if(!canvas) return;
  const size=resizeExceptionsChartCanvas(canvas);
  const ctx=canvas.getContext('2d'), w=size.w, h=size.h; ctx.clearRect(0,0,w,h);
  const labels=[['no_sales','بدون بيع'],['production_high','إنتاج أعلى من البيع'],['sales_high','بيع أعلى من الإنتاج'],['outgoing_high','صادر مرتفع'],['incoming_high','وارد مرتفع'],['loading_gap','فرق تحميل']];
  const vals=labels.map(([k])=>summary.byType[k]||0), max=Math.max(1,...vals);
  const pad={l:46,r:24,t:34,b:w<560?92:76}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  ctx.strokeStyle='rgba(220,255,215,.13)';ctx.fillStyle='#d7f3d2';ctx.font='bold 12px Cairo';ctx.textAlign='right';
  for(let i=0;i<=4;i++){const y=pad.t+ch-(i/4)*ch;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();ctx.fillText(fmt(max*i/4),pad.l-8,y+4);}
  const bw=Math.max(24,Math.min(64,cw/labels.length*.48));
  labels.forEach(([key,label],i)=>{
    const v=vals[i], x=pad.l+(i+.5)*(cw/labels.length)-bw/2, bh=(v/max)*ch, y=pad.t+ch-bh;
    const colors=exceptionChartColor(key), grad=ctx.createLinearGradient(x,y,x,y+Math.max(bh,1));
    grad.addColorStop(0,colors[0]);grad.addColorStop(1,colors[1]);ctx.fillStyle=grad;ctx.fillRect(x,y,bw,Math.max(bh,2));
    ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='bold 13px Cairo';ctx.fillText(fmt(v),x+bw/2,Math.max(18,y-8));
    ctx.save();ctx.translate(x+bw/2,pad.t+ch+18);ctx.rotate(w<560?-Math.PI/4:-Math.PI/8);ctx.fillStyle='#dff8d4';ctx.font='bold 11px Cairo';ctx.fillText(label,0,0);ctx.restore();
  });
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
  renderExceptionsKPIs(summary); drawExceptionsChart(summary); renderExceptionsPriority(exceptions); renderExceptionsTables(exceptions); ensureExceptionsReportPngButtons();
}


function exceptionsReportPngDateRange(){
  const filters=getReportFilters();
  const from=normalizeDateISO(filters.from || $('#reportFromDate')?.value || '');
  const to=normalizeDateISO(filters.to || $('#reportToDate')?.value || '');
  return {from,to,fromToken:from||'start',toToken:to||'end'};
}
function exceptionsReportPngFilterLine(){
  const range=exceptionsReportPngDateRange();
  return `الفترة: من ${formatDisplayDate(range.from,'البداية')} إلى ${formatDisplayDate(range.to,'النهاية')}`;
}
function exceptionsReportPngFileName(prefix){
  const range=exceptionsReportPngDateRange();
  return `${prefix}_${range.fromToken}_to_${range.toToken}.png`;
}
function setExceptionsPngBusy(button,busy){
  if(!button) return;
  if(!button.dataset.defaultText) button.dataset.defaultText=button.textContent.trim();
  button.disabled=!!busy;
  button.textContent=busy?'جاري PNG...':button.dataset.defaultText;
}
function exceptionsPngButton(id,title,slug,target,width){
  const btn=document.createElement('button');
  btn.id=id;
  btn.type='button';
  btn.className='exceptions-widget-png-btn png-export-btn';
  btn.title=`تصدير ${title} كصورة PNG`;
  btn.setAttribute('aria-label',btn.title);
  btn.textContent='PNG';
  btn.addEventListener('click',event=>{
    event.preventDefault();
    event.stopPropagation();
    exportExceptionsWidgetPng(target,title,slug,event.currentTarget,width);
  });
  return btn;
}
function ensureExceptionsReportPngButtons(){
  const root=$('#exceptionsReportContent'); if(!root) return;
  const kpis=$('#exceptionsReportKpis');
  if(kpis && !$('#exceptionsKpisPngBtn')){
    kpis.classList.add('exceptions-widget-png-scope','exceptions-kpis-png-scope');
    kpis.prepend(exceptionsPngButton('exceptionsKpisPngBtn','مؤشرات تقرير الاستثناءات','exceptions-kpis',kpis,1500));
  }
  const chart=root.querySelector('.exceptions-chart-card');
  if(chart && !$('#exceptionsDistributionPngBtn')){
    chart.classList.add('exceptions-widget-png-scope');
    const h=chart.querySelector('h3')||chart;
    h.appendChild(exceptionsPngButton('exceptionsDistributionPngBtn','توزيع الاستثناءات حسب النوع','exceptions-distribution',chart,1200));
  }
  const priority=root.querySelector('.exceptions-priority-card');
  if(priority && !$('#exceptionsPrioritiesPngBtn')){
    priority.classList.add('exceptions-widget-png-scope');
    const h=priority.querySelector('h3')||priority;
    h.appendChild(exceptionsPngButton('exceptionsPrioritiesPngBtn','أولويات المراجعة','review-priorities',priority,1500));
  }
  const details=root.querySelector('.exceptions-report-main-card');
  if(details && !$('#exceptionsDetailsPngBtn')){
    details.classList.add('exceptions-widget-png-scope');
    const h=details.querySelector('.report-section-head')||details;
    h.appendChild(exceptionsPngButton('exceptionsDetailsPngBtn','جدول الاستثناءات التفصيلي','exceptions-details',details,1800));
  }
}
function normalizeExceptionsPngClone(source,clone){
  if(!clone) return;
  copyCanvasPixelsToClone(source,clone);
  clone.querySelectorAll('.exceptions-widget-png-btn,.png-export-btn').forEach(btn=>btn.remove());
  const isMobilePriorityExport=source?.classList?.contains('exceptions-priority-card') && window.matchMedia?.('(max-width:650px)')?.matches;
  if(isMobilePriorityExport){
    clone.classList.add('exceptions-priority-png-clone');
    clone.style.setProperty('height','auto','important');
    clone.style.setProperty('min-height','0','important');
    clone.style.setProperty('max-height','none','important');
    clone.style.setProperty('overflow','visible','important');
    clone.style.setProperty('align-content','start','important');
    clone.style.setProperty('align-items','start','important');
    clone.style.setProperty('justify-content','flex-start','important');
    clone.style.setProperty('padding-bottom','8px','important');
    const priorityList=clone.querySelector('.exceptions-priority-list');
    if(priorityList){
      priorityList.style.setProperty('display','flex','important');
      priorityList.style.setProperty('flex-direction','column','important');
      priorityList.style.setProperty('height','auto','important');
      priorityList.style.setProperty('min-height','0','important');
      priorityList.style.setProperty('max-height','none','important');
      priorityList.style.setProperty('overflow','visible','important');
      priorityList.style.setProperty('align-content','start','important');
      priorityList.style.setProperty('align-items','start','important');
      priorityList.style.setProperty('flex','0 0 auto','important');
      priorityList.style.setProperty('width','100%','important');
      priorityList.style.setProperty('box-sizing','border-box','important');
      priorityList.style.setProperty('padding-bottom','0','important');
    }
    clone.querySelectorAll('.exception-priority-row').forEach(row=>{
      row.style.setProperty('display','grid','important');
      row.style.setProperty('grid-template-columns','34px minmax(0,1fr)','important');
      row.style.setProperty('grid-template-areas','"rank code" "name name" "type type" "badge score" "action action"','important');
      row.style.setProperty('gap','8px 10px','important');
      row.style.setProperty('height','auto','important');
      row.style.setProperty('min-height','0','important');
      row.style.setProperty('max-height','none','important');
      row.style.setProperty('overflow','visible','important');
      row.style.setProperty('align-content','start','important');
      row.style.setProperty('align-items','start','important');
      row.style.setProperty('flex','0 0 auto','important');
      row.style.setProperty('width','100%','important');
      row.style.setProperty('box-sizing','border-box','important');
      row.querySelector('em')?.style.setProperty('grid-area','rank','important');
      row.querySelector('b')?.style.setProperty('grid-area','code','important');
      row.querySelector('.priority-item-name')?.style.setProperty('grid-area','name','important');
      row.querySelector('.priority-type')?.style.setProperty('grid-area','type','important');
      row.querySelector('.priority-badge')?.style.setProperty('grid-area','badge','important');
      row.querySelector('strong')?.style.setProperty('grid-area','score','important');
      row.querySelector('.priority-action')?.style.setProperty('grid-area','action','important');
    });
  }
  clone.querySelectorAll('.rank-table-wrap,.exceptions-report-table-wrap,.exceptions-priority-list').forEach(wrap=>{
    wrap.style.setProperty('height','auto','important');
    wrap.style.setProperty('max-height','none','important');
    wrap.style.setProperty('min-height','0','important');
    wrap.style.setProperty('overflow','visible','important');
  });
  clone.querySelectorAll('canvas,img').forEach(media=>{
    media.style.setProperty('max-width','100%','important');
    media.style.setProperty('height','auto','important');
    media.style.setProperty('display','block','important');
    media.style.setProperty('margin','0 auto','important');
  });
  clone.querySelectorAll('table').forEach(table=>{
    table.style.setProperty('width','100%','important');
    table.style.setProperty('max-width','100%','important');
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
  });
  clone.querySelectorAll('th,td').forEach(cell=>{
    cell.style.setProperty('white-space','normal','important');
    cell.style.setProperty('overflow-wrap','anywhere','important');
    cell.style.setProperty('word-break','break-word','important');
    cell.style.setProperty('line-height','1.35','important');
  });
}
function exceptionsPngExportBox(title,width){
  const box=document.createElement('section');
  box.className='exceptions-widget-png-export-box';
  box.dir='rtl';
  box.lang='ar';
  box.setAttribute('aria-hidden','true');
  box.style.cssText=[
    'position:fixed','top:0','left:0','z-index:-1',`width:${width||1400}px`,'min-height:280px','padding:26px','box-sizing:border-box',
    'background:radial-gradient(circle at 50% 0%,rgba(94,180,71,.13),transparent 36%),linear-gradient(180deg,#00291f,#001611)',
    'color:#fff','direction:rtl','font-family:Cairo,Arial,sans-serif','overflow:visible','pointer-events:none'
  ].join(';');
  const header=document.createElement('header');
  header.className='exceptions-widget-png-header';
  header.innerHTML=`<h2>${escapeHtml(title)}</h2><p>${escapeHtml(exceptionsReportPngFilterLine())}</p>`;
  box.appendChild(header);
  return box;
}
async function captureExceptionsPngBox(box,fileName){
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return false; }
  document.body.appendChild(box);
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const rect=box.getBoundingClientRect();
    const width=Math.ceil(Math.max(box.scrollWidth,rect.width,1));
    const height=Math.ceil(Math.max(box.scrollHeight,rect.height,1));
    if(width<=1 || height<=1) throw new Error(`Invalid exceptions PNG dimensions: ${width}x${height}`);
    const canvas=await Html2Canvas(box,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#001611',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
    return await new Promise(resolve=>{
      canvas.toBlob(async blob=>{
        if(!blob){ alert('تعذر إنشاء صورة PNG.'); resolve(false); return; }
        await saveBlobWithPicker(blob,fileName,'image/png');
        resolve(true);
      },'image/png',1);
    });
  }finally{
    try{ box.remove(); }catch(_){ }
  }
}
async function exportExceptionsWidgetPng(source,title,slug,button,width){
  if(!source || button?.disabled) return;
  setExceptionsPngBusy(button,true);
  const exportWidth=Math.max(width||1400, Math.ceil(source.scrollWidth||0), Math.ceil(source.querySelector('table')?.scrollWidth||0)+80);
  const box=exceptionsPngExportBox(title,exportWidth);
  try{
    const clone=source.cloneNode(true);
    normalizeExceptionsPngClone(source,clone);
    box.appendChild(clone);
    const ok=await captureExceptionsPngBox(box,exceptionsReportPngFileName(slug));
    if(ok) await logSystemActivity(activityExportSection('تقرير الاستثناءات والمراجعة'),'تصدير PNG',`تصدير ${title} PNG`);
  }catch(err){
    console.error('Exceptions widget PNG export failed',err);
    alert('تعذر تصدير هذا البوكس PNG. حاول مرة أخرى.');
    try{ box.remove(); }catch(_){ }
  }finally{
    setExceptionsPngBusy(button,false);
  }
}
let SMART_ANALYTICS_STATE={rows:[],filters:null,stats:null,items:[],warehouses:[],plantStats:{},exceptions:[],daily:{}};
function smartSeverityClass(level){ return level==='high'?'danger':level==='medium'?'warning':level==='ok'?'ok':'info'; }
function smartTrendInfo(values){
  const clean=(values||[]).filter(v=>Number.isFinite(v));
  if(clean.length<2) return {label:'غير كافٍ',cls:'neutral',delta:0,icon:'stable'};
  const first=clean[0]||0,last=clean[clean.length-1]||0;
  const base=Math.max(1,Math.abs(first));
  const delta=((last-first)/base)*100;
  if(delta>8) return {label:'صاعد',cls:'up',delta,icon:'trendUp'};
  if(delta<-8) return {label:'هابط',cls:'down',delta,icon:'trendDown'};
  return {label:'مستقر',cls:'stable',delta,icon:'stable'};
}

function clampScore(v){ return Math.max(0, Math.min(100, Number.isFinite(v)?v:0)); }
function auditScoreStatus(score){
  if(score>=90) return {label:'ممتاز',cls:'excellent',icon:'check'};
  if(score>=80) return {label:'جيد جداً',cls:'good',icon:'check'};
  if(score>=70) return {label:'يحتاج متابعة',cls:'warning',icon:'alert'};
  return {label:'يحتاج تدخل',cls:'danger',icon:'ban'};
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
    {title:'الصحة العامة للمراجعة',value:Math.round(audit.overall||0)+'%',unit:`${audit.status?.label||''} - ${audit.critical||0} حرجة`,icon:'shield',className:'kpi-smart-health',extraClass:'smart-kpi-card audit-health',attributes:{'data-audit-score-target':'overall'}},
    {title:'إجمالي البيع',value:fmt(stats.salesQty||0),unit:'طن',icon:'sales',className:'kpi-sales',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'sales'}},
    {title:'إجمالي الإنتاج',value:fmt(stats.productionQty||0),unit:'طن',icon:'production',className:'kpi-production',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'production'}},
    {title:'فرق الإنتاج / البيع',value:fmt(gap),unit:'طن',icon:'transfer',className:'kpi-smart-balance',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'balance'}},
    {title:'عدد الاستثناءات',value:fmt(exc),unit:'حالة',icon:'warning',className:'kpi-smart-exceptions',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'exceptions'}},
    {title:'الأصناف النشطة',value:fmt(items),unit:'صنف',icon:'box',className:'kpi-smart-items',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'items'}},
    {title:'المخازن النشطة',value:fmt(wh),unit:'مخزن',icon:'warehouses',className:'kpi-smart-warehouses',extraClass:'smart-kpi-card',attributes:{'data-audit-score-target':'warehouses'}}
  ];
  node.innerHTML=cards.map(renderStandardKpiCard).join('');
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


function smartCleanValue(value){
  const text=String(value||'').trim();
  return text && text!=='-' && text!=='غير محدد' ? text : '';
}
function smartPeriodPhrase(model){
  const filters=model?.filters||{};
  const from=normalizeDateISO(filters.from||'');
  const to=normalizeDateISO(filters.to||'');
  if(from && to) return 'خلال الفترة من '+formatDisplayDate(from,from)+' إلى '+formatDisplayDate(to,to);
  if(from) return 'من '+formatDisplayDate(from,from);
  if(to) return 'حتى '+formatDisplayDate(to,to);
  return 'خلال الفترة المحددة';
}
function smartLocationPhrase(entry){
  const parts=[];
  const warehouse=smartCleanValue(entry?.warehouses||entry?.warehouse||entry?.code);
  const plant=smartCleanValue(entry?.plants||entry?.plant);
  if(warehouse) parts.push('المخزن '+warehouse);
  if(plant) parts.push('المصنع '+plant);
  return parts.join(' — ');
}
function smartExceptionText(e,period){
  const location=smartLocationPhrase(e);
  const bits=['الصنف '+smartCleanValue(e?.code), smartCleanValue(e?.name)].filter(Boolean).join(' — ');
  const where=location ? ' في '+location : '';
  const details=smartCleanValue(e?.details) ? ': '+e.details : '';
  const score=Number.isFinite(Number(e?.reviewScore)) ? ' — '+fmt(e.reviewScore)+' نقطة' : '';
  return bits+where+' بسبب '+(smartCleanValue(e?.label)||'مؤشر مراجعة')+details+' '+period+score+'.';
}
function smartItemText(item,reason,period){
  const location=smartLocationPhrase({warehouses:(item?.warehouses||[]).join('، '),plants:(item?.plants||[]).join('، ')});
  const bits=['الصنف '+smartCleanValue(item?.code), smartCleanValue(item?.name)].filter(Boolean).join(' — ');
  const where=location ? ' في '+location : '';
  return bits+where+' '+reason+' '+period+'.';
}
function smartAlertDetailsHtml(details,extra){
  const rows=(details||[]).filter(Boolean).slice(0,3);
  const extraText=extra ? '<small>'+escapeHtml(extra)+'</small>' : '';
  return rows.length ? '<ul class="smart-alert-details">'+rows.map(t=>'<li>'+escapeHtml(t)+'</li>').join('')+'</ul>'+extraText : extraText;
}
function smartPushRecommendation(list,seen,key,text){
  if(!text || seen.has(key)) return;
  seen.add(key);
  list.push(text);
}

function renderSmartExecutiveSummary(model){
  const node=$('#smartExecutiveSummary'); if(!node) return;
  const {stats,warehouses,products,plantStats,exceptions}=model;
  const topPlant=Object.entries(plantStats||{}).sort((a,b)=>Math.abs(b[1].sales)-Math.abs(a[1].sales))[0]||['-',{}];
  const topWh=warehouses[0]||{};
  const topProduct=products[0]||{};
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const plantShare=stats.salesQty?Math.abs((topPlant[1].sales||0)/stats.salesQty*100):0;
  const scoreIcon=model.auditScores?.status?.icon||'shield';
  const lines=[
    ['trendUp','بلغ إجمالي البيع '+fmt(stats.salesQty)+' طن خلال الفترة المحددة.'],
    ['production','أعلى مصنع بيعاً هو '+escapeHtml(topPlant[0])+' بنسبة مساهمة تقريبية '+fmt(plantShare)+'%.'],
    ['warehouses','أعلى مخزن نشاطاً هو '+escapeHtml(topWh.code||'-')+' بإجمالي تحميل '+fmt(topWh.loading||0)+' طن.'],
    ['star','أعلى صنف بيعاً هو '+escapeHtml(topProduct.code||'-')+' - '+escapeHtml(topProduct.name||'-')+'.'],
    [gap>=0?'check':'alert','فرق الإنتاج عن البيع '+fmt(gap)+' طن.'],
    [scoreIcon,'الصحة العامة للمراجعة '+Math.round(model.auditScores?.overall||0)+'% ('+(model.auditScores?.status?.label||'')+').'],
    [exceptions.length?'alert':'check','عدد الاستثناءات التي تحتاج مراجعة: '+exceptions.length+'.']
  ];
  node.innerHTML=lines.map(([ico,text])=>'<div class="smart-summary-line"><span>'+modernIcon(ico)+'</span><b>'+text+'</b></div>').join('');
}
function renderSmartAlerts(model){
  const node=$('#smartAlerts'); if(!node) return;
  const {stats,warehouses,items,exceptions}=model;
  const period=smartPeriodPhrase(model);
  const alerts=[];
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const gapLimit=Math.max(10,Math.abs(stats.salesQty||0)*0.15);
  if(Math.abs(gap)>gapLimit){
    const type=gap>0?'production_high':'sales_high';
    const related=exceptions.filter(e=>e.type===type).slice(0,3).map(e=>smartExceptionText(e,period));
    alerts.push({level:'medium',title:gap>0?'الإنتاج أعلى من البيع':'البيع أعلى من الإنتاج',text:'الفارق '+fmt(Math.abs(gap))+' طن.',details:related,extra:related.length?'':'يحتاج المؤشر العام إلى مراجعة الأصناف الأكثر تأثيراً داخل نفس الفترة.'});
  }
  const noSalesItems=items.filter(i=>Math.abs(i.sales||0)===0 && (Math.abs(i.production||0)+Math.abs(i.outgoing||0)+Math.abs(i.incoming||0))>0);
  if(noSalesItems.length){
    const sorted=[...noSalesItems].sort((a,b)=>(Math.abs(b.production||0)+Math.abs(b.outgoing||0)+Math.abs(b.incoming||0))-(Math.abs(a.production||0)+Math.abs(a.outgoing||0)+Math.abs(a.incoming||0)));
    alerts.push({level:'high',title:'أصناف بدون بيع',text:'يوجد '+noSalesItems.length+' صنف له حركة بدون بيع.',details:sorted.slice(0,3).map(i=>smartItemText(i,'بدون بيع رغم وجود إنتاج أو تحويلات',period)),extra:noSalesItems.length>3?'+ '+(noSalesItems.length-3)+' إضافي':''});
  }
  const inactiveWh=warehouses.filter(w=>Math.abs(w.totalActivity||0)===0);
  if(inactiveWh.length){
    alerts.push({level:'medium',title:'مخازن بلا نشاط',text:'عدد المخازن غير النشطة '+inactiveWh.length+'.',details:inactiveWh.slice(0,3).map(w=>'المخزن '+smartCleanValue(w.code)+' — '+smartCleanValue(w.name)+' — المصنع '+smartCleanValue(w.plant)+' بلا نشاط '+period+'.'),extra:inactiveWh.length>3?'+ '+(inactiveWh.length-3)+' إضافي':''});
  }
  if(Math.abs(stats.outgoingTransferQty||0)>Math.max(5,Math.abs(stats.salesQty||0)*0.45)){
    const related=exceptions.filter(e=>e.type==='outgoing_high').slice(0,3).map(e=>smartExceptionText(e,period));
    alerts.push({level:'medium',title:'تحويلات صادرة مرتفعة',text:'إجمالي الصادر '+fmt(stats.outgoingTransferQty)+' طن.',details:related,extra:related.length?'':'راجع أعلى الأصناف والمخازن في التحويلات الصادرة داخل الفترة.'});
  }
  const highExceptions=exceptions.filter(e=>e.severity==='high');
  if(highExceptions.length){
    alerts.push({level:'high',title:'استثناءات عالية الأولوية',text:highExceptions.length+' حالة تحتاج تدخل سريع.',details:highExceptions.slice(0,3).map(e=>smartExceptionText(e,period)),extra:highExceptions.length>3?'+ '+(highExceptions.length-3)+' إضافي':''});
  }
  if(!alerts.length) alerts.push({level:'ok',title:'الوضع مستقر',text:'لا توجد مؤشرات خطرة حسب الفلتر الحالي',details:[],extra:''});
  node.innerHTML=alerts.slice(0,8).map(a=>'<div class="smart-alert '+smartSeverityClass(a.level)+'"><strong>'+escapeHtml(a.title)+'</strong><span>'+escapeHtml(a.text)+'</span>'+smartAlertDetailsHtml(a.details,a.extra)+'</div>').join('');
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
    ['production','أعلى مصنع',topPlant[0],fmt(topPlant[1].sales||0)+' طن'],
    ['trendDown','أقل مصنع بيعاً',lowPlant[0],fmt(lowPlant[1].sales||0)+' طن'],
    ['warehouses','أعلى مخزن',topWh.code||'-',fmt(topWh.sales||0)+' طن'],
    ['trendDown','أقل مخزن بيعاً',lowWh.code||'-',fmt(lowWh.sales||0)+' طن'],
    ['star','أعلى صنف',topProduct.code||'-',escapeHtml(topProduct.name||'-')]
  ];
  node.innerHTML=rows.map(r=>'<div class="smart-top-row"><span>'+modernIcon(r[0])+'</span><b>'+r[1]+'</b><strong>'+escapeHtml(String(r[2]))+'</strong><small>'+r[3]+'</small></div>').join('');
}
function renderSmartRecommendations(model){
  const node=$('#smartRecommendations'); if(!node) return;
  const {stats,warehouses,exceptions,items}=model;
  const period=smartPeriodPhrase(model);
  const rec=[];
  const seen=new Set();
  exceptions.filter(e=>e.severity==='high').slice(0,4).forEach(e=>{
    smartPushRecommendation(rec,seen,e.type+'-'+e.code,'راجع '+smartExceptionText(e,period));
  });
  exceptions.filter(e=>e.type==='no_sales').slice(0,3).forEach(e=>{
    smartPushRecommendation(rec,seen,'no_sales-'+e.code,'راجع الصنف '+smartCleanValue(e.code)+' — '+smartCleanValue(e.name)+' '+(smartLocationPhrase(e)?'في '+smartLocationPhrase(e)+' ':'')+'بسبب عدم وجود بيع خلال الفترة.');
  });
  exceptions.filter(e=>e.type==='loading_gap').slice(0,2).forEach(e=>{
    smartPushRecommendation(rec,seen,'loading_gap-'+e.code,'تحقق من إجمالي تحميل الصنف '+smartCleanValue(e.code)+' — '+smartCleanValue(e.name)+' '+(smartLocationPhrase(e)?'في '+smartLocationPhrase(e)+' ':'')+'لأن '+smartCleanValue(e.details)+'.');
  });
  exceptions.filter(e=>e.type==='outgoing_high').slice(0,2).forEach(e=>{
    smartPushRecommendation(rec,seen,'outgoing_high-'+e.code,'راجع التحويلات الصادرة للصنف '+smartCleanValue(e.code)+' — '+smartCleanValue(e.name)+' '+(smartLocationPhrase(e)?'في '+smartLocationPhrase(e)+' ':'')+'بسبب ارتفاع غير معتاد.');
  });
  const topWh=[...warehouses].sort((a,b)=>Math.abs(b.outgoing)-Math.abs(a.outgoing))[0];
  if(topWh && Math.abs(topWh.outgoing||0)>Math.max(5,Math.abs(topWh.sales||0)*0.4)){
    smartPushRecommendation(rec,seen,'warehouse-outgoing-'+topWh.code,'راجع التحويلات الصادرة في المخزن '+smartCleanValue(topWh.code)+' — '+smartCleanValue(topWh.name)+' بالمصنع '+smartCleanValue(topWh.plant)+' لأن الصادر بلغ '+fmt(topWh.outgoing)+' طن مقابل بيع '+fmt(topWh.sales)+' طن.');
  }
  const gap=(stats.productionQty||0)-(stats.salesQty||0);
  const gapLimit=Math.max(10,Math.abs(stats.salesQty||0)*0.15);
  if(Math.abs(gap)>gapLimit){
    const type=gap<0?'sales_high':'production_high';
    const e=exceptions.find(x=>x.type===type);
    if(e) smartPushRecommendation(rec,seen,'gap-focus-'+e.code,'تحقق من الصنف '+smartCleanValue(e.code)+' — '+smartCleanValue(e.name)+' '+(smartLocationPhrase(e)?'في '+smartLocationPhrase(e)+' ':'')+'لأنه من أبرز أسباب فرق الإنتاج/البيع.');
  }
  if(rec.length<5){
    exceptions.filter(e=>e.severity==='medium').slice(0,5).forEach(e=>{
      smartPushRecommendation(rec,seen,'medium-'+e.type+'-'+e.code,'تابع الصنف '+smartCleanValue(e.code)+' — '+smartCleanValue(e.name)+' '+(smartLocationPhrase(e)?'في '+smartLocationPhrase(e)+' ':'')+'بسبب '+smartCleanValue(e.label)+' — '+smartCleanValue(e.details)+'.');
    });
  }
  if(!rec.length) rec.push('لا توجد توصيات حرجة حالياً؛ استمر في المتابعة الدورية حسب الفترة الحالية.');
  node.innerHTML=rec.slice(0,8).map((t,i)=>'<div class="smart-rec"><em>'+(i+1)+'</em><span>'+escapeHtml(t)+'</span></div>').join('');
}
function renderSmartTrendAnalysis(model){
  const node=$('#smartTrendAnalysis'); if(!node) return;
  const days=Object.keys(model.daily||{}).sort().slice(-30);
  const metrics=[['sales','البيع'],['production','الإنتاج'],['outgoing','الصادر'],['incoming','الوارد'],['loading','التحميل']];
  node.innerHTML=metrics.map(([key,label])=>{
    const values=days.map(d=>model.daily[d]?.[key]||0);
    const t=smartTrendInfo(values);
    const total=values.reduce((a,b)=>a+b,0);
    return '<div class="smart-trend-row '+t.cls+'"><b>'+label+'</b><strong>'+modernIcon(t.icon)+' '+t.label+'</strong><span>'+fmt(t.delta)+'%</span><small>إجمالي '+fmt(total)+' طن</small></div>';
  }).join('') || '<div class="empty-row">لا توجد بيانات اتجاه كافية</div>';
  const hint=$('#smartTrendHint'); if(hint) hint.textContent=days.length?'من '+days[0]+' إلى '+days[days.length-1]:'لا توجد بيانات';
}
function renderSmartPlantScores(model){
  const node=$('#smartPlantScores'); if(!node) return;
  const rows=model.auditScores?.plantScores||[];
  node.innerHTML=rows.map(r=>{
    const parts=r.parts||{};
    const details=`جودة البيانات ${fmt(parts.dataQuality||0)}/20 | توازن البيع والإنتاج ${fmt(parts.salesBalance||0)}/20 | التحويلات ${fmt(parts.transferScore||0)}/15 | التحميل ${fmt(parts.loadingScore||0)}/15 | الاستثناءات ${fmt(parts.exceptionScore||0)}/20 | النشاط ${fmt(parts.activityScore||0)}/10`;
    return `<div class="smart-score-row smart-score-row-real ${r.status?.cls||''}" title="${escapeHtml(details)}" data-audit-score-target="${escapeHtml(r.plant)}">
      <div><b>${escapeHtml(r.plant)}</b><span>${escapeHtml(r.name||'')}</span><small>${modernIcon(r.status?.icon||'shield')} ${escapeHtml(r.status?.label||'')}</small></div>
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
  return `<div class="score-mini-table-wrap"><table class="score-mini-table"><thead><tr><th>المصنع</th><th>الحالة</th><th>الدرجة</th><th>الاستثناءات</th></tr></thead><tbody>${(scores||[]).map(r=>`<tr><td><b>${escapeHtml(r.plant)}</b><small>${escapeHtml(r.name||'')}</small></td><td>${modernIcon(r.status?.icon||'shield')} ${escapeHtml(r.status?.label||'')}</td><td>${Math.round(r.score)}%</td><td>${r.exceptions?.total||0}</td></tr>`).join('')}</tbody></table></div>`;
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
  modal.className='audit-score-modal app-liquid-modal-backdrop hidden';
  modal.innerHTML=`<div class="audit-score-backdrop" aria-hidden="true"></div><section class="audit-score-dialog glass app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="auditScoreModalTitle"><button class="audit-score-close app-liquid-modal__close" type="button" data-close-audit-score aria-label="إغلاق نافذة تقييم المراجعة">×</button><div id="auditScoreModalBody" class="app-liquid-modal__body"></div></section>`;
  document.body.appendChild(modal);
  modal._appModalClose=closeAuditScoreModal;
  modal.addEventListener('click',e=>{ if(e.target.closest('button[data-close-audit-score]')) closeAuditScoreModal(); });
  return modal;
}
function closeAuditScoreModal(options={}){
  const modal=$('#auditScoreModal'); if(!modal) return;
  const returnFocus=modal._appModalReturnFocus;
  modal.classList.add('hidden');
  unlockAppModalScroll('auditScoreModal');
  if(options.restoreFocus!==false && returnFocus?.isConnected) requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
}
function openAuditScoreModal(target){
  const data=scoreModalData(target||'overall');
  if(!data) return;
  const modal=ensureAuditScoreModal();
  modal._appModalClose=closeAuditScoreModal;
  modal._appModalReturnFocus=document.activeElement;
  const body=$('#auditScoreModalBody');
  const score=Math.round(data.score||0);
  const reasons=(data.reasons||[]).map(r=>`<li>${escapeHtml(r)}</li>`).join('');
  body.innerHTML=`<header class="score-modal-head"><div><h3 id="auditScoreModalTitle">${escapeHtml(data.title)}</h3><p>${escapeHtml(data.subtitle||'')}</p></div><div class="score-modal-gauge ${data.status?.cls||''}"><strong>${score}%</strong><span>${modernIcon(data.status?.icon||'shield')} ${escapeHtml(data.status?.label||'')}</span></div></header><div class="score-breakdown">${auditScorePartRows(data.parts||{})}</div><div class="score-reasons"><h4>سبب النتيجة</h4><ul>${reasons}</ul><p>${escapeHtml(data.extra||'')}</p></div>${data.table||''}`;
  modal.classList.remove('hidden');
  lockAppModalScroll('auditScoreModal',modal);
  requestAnimationFrame(()=>modal.querySelector('[data-close-audit-score]')?.focus({preventScroll:true}));
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
  const st=model.summary||{};
  const cards=[
    {title:'إجمالي إنتاج المصانع',value:fmt(st.total),unit:'طن',icon:'production',extraClass:'production-kpi'},
    {title:'متوسط الإنتاج اليومي',value:fmt(st.avgDaily),unit:'طن/يوم',icon:'trendUp',extraClass:'production-kpi'},
    {title:'أعلى يوم إنتاج',value:fmt(st.maxDay?.value||0),unit:formatDisplayDate(st.maxDay?.date,'-'),icon:'check',extraClass:'production-kpi'},
    {title:'أقل يوم إنتاج',value:fmt(st.minDay?.value||0),unit:formatDisplayDate(st.minDay?.date,'-'),icon:'ban',extraClass:'production-kpi'},
    {title:'عدد أيام الإنتاج',value:fmt(st.days),unit:'يوم',icon:'calendar',extraClass:'production-kpi'},
    {title:'نسبة التغير',value:fmt(st.changePct||0),unit:'%',icon:'trendUp',extraClass:'production-kpi'}
  ];
  const node=$('#productionKpiCards'); if(node) node.innerHTML=cards.map(renderStandardKpiCard).join('');
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
  const dayHead=days.map(d=>`<span>${escapeHtml(formatDisplayDate(d,d))}</span>`).join('');
  const rows=plants.map(p=>{
    const rowValues=days.map(d=>Math.abs(toNumber(model.plantDaily[p.code]?.[d]||0)));
    const positives=rowValues.filter(v=>v>0);
    const rowMax=Math.max(...positives,0);
    const rowMin=positives.length?Math.min(...positives):0;
    return `<div class="prod-heat-row" style="grid-template-columns:${cols}"><strong>${escapeHtml(p.code)}</strong>${days.map((d,idx)=>{const v=rowValues[idx]||0; return `<i class="${heatClass(v,rowMin,rowMax)}" title="${escapeHtml(p.code)} / ${escapeHtml(formatDisplayDate(d,d))} / ${fmt(v)} طن"><b>${fmt(v)}</b></i>`;}).join('')}</div>`;
  }).join('');
  node.innerHTML=`<div class="prod-heat-head" style="grid-template-columns:${cols}"><strong>المصنع</strong>${dayHead}</div>${rows}<div class="prod-heat-scale"><span>أقل يوم داخل كل مصنع</span><em></em><span>أعلى يوم داخل كل مصنع</span></div>`;
}
function renderProductionAllHeatmap(model){
  const node=$('#productionAllHeatmap'); if(!node) return; const entries=Object.entries(model.daily||{}).sort(([a],[b])=>a.localeCompare(b));
  if(!entries.length){node.innerHTML='<div class="empty-row">لا توجد بيانات إنتاج</div>';return;}
  const values=entries.map(([,v])=>Math.abs(toNumber(v))).filter(v=>v>0), max=Math.max(...values,0), min=values.length?Math.min(...values):0;
  node.innerHTML=`<div class="production-all-grid">${entries.map(([d,v])=>{const val=Math.abs(toNumber(v)); return `<div class="all-heat-cell ${heatClass(val,min,max)}" title="${escapeHtml(formatDisplayDate(d,d))} - ${fmt(val)} طن"><b>${escapeHtml(formatDisplayDate(d,d))}</b><span>${fmt(val)}</span></div>`;}).join('')}</div><div class="prod-heat-scale"><span>أقل يوم إنتاج</span><em></em><span>أعلى يوم إنتاج</span></div>`;
}
function renderProductionTopProducts(products){
  renderRankTable('#productionTopProductsTable',['#','كود الصنف','اسم الصنف','إجمالي الإنتاج','النسبة'],(products||[]).slice(0,10).map((p,i)=>[i+1,escapeHtml(p.code),escapeHtml(p.name),fmt(p.production),`${fmt(p.pct)}%`]));
}
function renderProductionInsights(model){
  const st=model.summary||{}, top=model.products?.[0]||{}, lowPlant=[...(model.plants||[])].sort((a,b)=>a.production-b.production)[0]||{};
  const lines=[['trophy','أعلى مصنع إنتاجاً: '+(st.topPlant?.code||'-')+' بإجمالي '+fmt(st.topPlant?.production||0)+' طن'],['box','أعلى صنف إنتاجاً: '+(top.code||'-')+' - '+escapeHtml(top.name||'-')+' بإجمالي '+fmt(top.production||0)+' طن'],['trendDown','أقل مصنع إنتاجاً: '+(lowPlant.code||'-')+' بإجمالي '+fmt(lowPlant.production||0)+' طن'],['check','أعلى يوم إنتاج: '+formatDisplayDate(st.maxDay?.date,'-')+' بقيمة '+fmt(st.maxDay?.value||0)+' طن'],['ban','أقل يوم إنتاج: '+formatDisplayDate(st.minDay?.date,'-')+' بقيمة '+fmt(st.minDay?.value||0)+' طن'],['shield','مؤشر استقرار الإنتاج: '+fmt(st.stability||0)+'%']];
  const node=$('#productionInsights'); if(node) node.innerHTML=lines.map(l=>'<div class="production-insight"><span>'+modernIcon(l[0])+'</span><b>'+l[1]+'</b></div>').join('');
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
  {title:'مبيعات مخزن W401 ( مبيعات الواحة أعلاف )', codes:['W401']},
  {title:'مبيعات مخزن W402 (مبيعات الواحة خامات )', codes:['W402']},
  {title:'مبيعات مخزن N401 ( مبيعات الرئيسي أعلاف )', codes:['N401']},
  {title:'مبيعات مخزن N402 ( مبيعات الرئيسي خامات )', codes:['N402']},
  {title:'مبيعات مخزن N411 (مبيعات مخزن البحيرة )', codes:['N411']},
  {title:'مبيعات مخزن N412 ( مبيعات مخزن أسيوط )', codes:['N412']},
  {title:'مبيعات مخزن E401 ( مبيعات العامرية أعلاف )', codes:['E401']},
  {title:'مبيعات مخزن E402 ( مبيعات العامرية خامات )', codes:['E402']}
];
function salesTotalsCardHtml(title,value,unit,icon){
  return '<article class="kpi glass sales-total-kpi"><h3>'+escapeHtml(title)+'</h3><div class="num">'+fmt(value)+'</div><small>'+escapeHtml(unit||'طن')+'</small><div class="icon modern-kpi-icon">'+modernIcon(icon||'reports')+'</div></article>';
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
        ${salesTotalsCardHtml('إجمالي البيع',group.stats.salesQty,'طن','sales')}
        ${salesTotalsCardHtml('إجمالي الإنتاج',group.stats.productionQty,'طن','production')}
        ${salesTotalsCardHtml('إجمالي التحويلات الصادرة',group.stats.outgoingTransferQty,'طن','outgoing')}
        ${salesTotalsCardHtml('إجمالي التحويلات الواردة',group.stats.incomingTransferQty,'طن','incoming')}
        ${salesTotalsCardHtml('إجمالي التحميل',group.stats.totalLoadingQty,'طن','loading')}
      </div>
    </article>`).join('');
  const tbl=$('#salesTotalsExportTable');
  if(tbl){
    tbl.innerHTML=`<thead><tr><th>الصف</th><th>المخازن</th><th>إجمالي البيع</th><th>إجمالي الإنتاج</th><th>إجمالي التحويلات الصادرة</th><th>إجمالي التحويلات الواردة</th><th>إجمالي التحميل</th></tr></thead><tbody>${(groups||[]).map(g=>`<tr><td>${escapeHtml(g.title)}</td><td>${escapeHtml(g.codes.join(' / '))}</td><td>${fmt(g.stats.salesQty)}</td><td>${fmt(g.stats.productionQty)}</td><td>${fmt(g.stats.outgoingTransferQty)}</td><td>${fmt(g.stats.incomingTransferQty)}</td><td>${fmt(g.stats.totalLoadingQty)}</td></tr>`).join('')}</tbody>`;
  }
  if($('#salesTotalsReportMeta')) $('#salesTotalsReportMeta').textContent=`الفترة: ${formatDisplayDate(filters.from,'--')} → ${formatDisplayDate(filters.to,'--')} `;
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
  itemAnalyticsSyncFilterVisibility(tab);
  syncMobileReportsDropdown(tab);
  document.querySelectorAll('[data-report-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.reportTab===tab));
  const exec=$("#executiveReportContent"), salesTotals=$("#salesTotalsReportContent"), items=$("#itemsReportContent"), itemAnalytics=$("#itemAnalyticsContent"), warehouses=$("#warehousesReportContent"), exceptions=$("#exceptionsReportContent"), smart=$("#smartAnalyticsContent"), production=$("#productionAnalyticsContent");
  if(exec) exec.style.display=tab==='executive'?'flex':'none';
  if(salesTotals) salesTotals.style.display=tab==='salesTotals'?'flex':'none';
  if(items) items.style.display=tab==='items'?'flex':'none';
  if(itemAnalytics) itemAnalytics.style.display=tab===ITEM_ANALYTICS_TAB?'flex':'none';
  if(warehouses) warehouses.style.display=tab==='warehouses'?'flex':'none';
  if(exceptions) exceptions.style.display=tab==='exceptions'?'flex':'none';
  if(smart) smart.style.display=tab==='smart'?'flex':'none';
  if(production) production.style.display=tab==='production'?'flex':'none';
  if(tab==='executive') loadExecutiveReport({keepDates:true});
  if(tab==='salesTotals') loadSalesTotalsReport({keepDates:true});
  if(tab==='items') loadItemsReport({keepDates:true});
  if(tab===ITEM_ANALYTICS_TAB) loadItemAnalyticsReport({keepDates:true});
  if(tab==='warehouses') loadWarehousesReport({keepDates:true});
  if(tab==='exceptions') loadExceptionsReport({keepDates:true});
  if(tab==='smart') loadSmartAnalyticsReport({keepDates:true});
  if(tab==='production') loadProductionAnalyticsReport({keepDates:true});
}
function loadActiveReport(options={}){
  if(ACTIVE_REPORT_TAB==='salesTotals') return loadSalesTotalsReport(options);
  if(ACTIVE_REPORT_TAB==='items') return loadItemsReport(options);
  if(ACTIVE_REPORT_TAB===ITEM_ANALYTICS_TAB) return loadItemAnalyticsReport(options);
  if(ACTIVE_REPORT_TAB==='warehouses') return loadWarehousesReport(options);
  if(ACTIVE_REPORT_TAB==='exceptions') return loadExceptionsReport(options);
  if(ACTIVE_REPORT_TAB==='smart') return loadSmartAnalyticsReport(options);
  if(ACTIVE_REPORT_TAB==='production') return loadProductionAnalyticsReport(options);
  return loadExecutiveReport(options);
}
function exportActiveReportExcel(){
  if(ACTIVE_REPORT_TAB==='salesTotals') return exportTableToExcel('salesTotalsExportTable','ملخص مبيعات المخازن');
  if(ACTIVE_REPORT_TAB==='items') return exportTableToExcel('itemsReportExportTable','تقرير مراجعة الأصناف');
  if(ACTIVE_REPORT_TAB===ITEM_ANALYTICS_TAB) return exportItemAnalyticsExcel();
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
    item_analytics:{id:'itemAnalyticsContent',title:'تحليلات الأصناف'},
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
  return formatDisplayDate(value,'');
}
function currentReportExportPeriodText(){
  const from=normalizeDateISO($('#reportFromDate')?.value || '');
  const to=normalizeDateISO($('#reportToDate')?.value || '');
  if(from && to && from===to) return `تاريخ التقرير: ${reportExportDateText(from)}`;
  if(from || to) return `الفترة: ${reportExportDateText(from) || 'البداية'} → ${reportExportDateText(to) || 'النهاية'}`;
  return 'تاريخ التقرير: --/--/----';
}
    function whDateToken(){
      const from=normalizeDateISO(document.querySelector('#reportFromDate')?.value || '');
      const to=normalizeDateISO(document.querySelector('#reportToDate')?.value || '');
      if(from && to && from!==to) return from+'-'+to;
      return from || to || new Date().toISOString().slice(0,10);
    }
    function whPngIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 4h14v16H5z"></path><path d="M8 9h8M8 13h5M8 17h8"></path></svg>';}
    function whFileSlug(title){const text=String(title||'warehouse-widget');const pairs=[['warehouse-performance','warehouse-performance'],['الإجماليات','warehouse-total-kpis'],['ترتيب','warehouse-ranking'],['مقارنة','warehouse-comparison-chart'],['توزيع','warehouse-loading-distribution'],['البيع','warehouse-top-sales'],['الإنتاج','warehouse-top-production'],['التحميل','warehouse-top-loading'],['أقل نشاط','warehouse-low-activity'],['متوسط','warehouse-average-sales'],['جدول','warehouse-performance-table']];const hit=pairs.find(function(pair){return text.indexOf(pair[0])>-1;});return hit?hit[1]:'warehouse-widget';}
    function whTitle(element){if(!element)return 'أداء المخازن';if(element.id==='warehousesReportKpis')return 'إجماليات أداء المخازن';return (element.querySelector('h3,span')?.textContent||element.dataset.warehouseWidgetTitle||'أداء المخازن').replace(/\s+/g,' ').trim();}
    function whWidth(element){if(!element)return 900;if(element.id==='warehousesReportKpis')return 940;if(element.classList.contains('warehouse-chart-card-wide'))return 1240;if(element.classList.contains('warehouse-donut-card'))return 980;if(element.classList.contains('warehouse-report-main-card'))return 1500;if(element.classList.contains('warehouse-mini-table-card'))return 760;if(element.closest('#warehousesQuickTiles'))return 620;return 920;}
    function whCleanup(node){if(!node)return;node.querySelectorAll('.warehouse-widget-png-btn,.widget-png-btn,.mobile-kpi-group-png-btn,.mobile-period-png-btn,.mobile-only,.export-btn').forEach(function(el){el.remove();});node.querySelectorAll('[id]').forEach(function(el){el.removeAttribute('id');});node.querySelectorAll('.warehouse-rank-bars,.warehouse-mini-table,.warehouse-report-table-wrap,.rank-table-wrap,.table-wrap').forEach(function(el){el.style.overflow='visible';el.style.maxHeight='none';el.style.height='auto';});node.querySelectorAll('.warehouse-rank-bars').forEach(function(el){el.style.display='flex';el.style.flexDirection='column';});node.querySelectorAll('table').forEach(function(table){table.style.width='100%';table.style.minWidth='0';});}
    async function whWaitImages(root){const images=[].slice.call(root.querySelectorAll('img'));await Promise.all(images.map(function(img){if(img.complete&&img.naturalWidth)return Promise.resolve();return new Promise(function(resolve){img.addEventListener('load',resolve,{once:true});img.addEventListener('error',resolve,{once:true});});}));}
    function whBox(title,width){const box=document.createElement('section');box.className='warehouse-performance-export-box';box.dir='rtl';box.lang='ar';box.setAttribute('aria-hidden','true');box.style.cssText=['position:fixed','top:0','left:-10000px','z-index:0','width:'+width+'px','min-height:420px','padding:28px','box-sizing:border-box','background:radial-gradient(circle at 50% 0%,rgba(94,180,71,.16),transparent 36%),linear-gradient(180deg,#00291f,#001611)','color:#fff','direction:rtl','font-family:Cairo,Arial,sans-serif','overflow:visible','pointer-events:none'].join(';');const header=document.createElement('header');header.className='warehouse-performance-export-header';header.innerHTML='<h2>'+escapeHtml(title)+'</h2><p>'+escapeHtml(currentReportExportPeriodText())+'</p>';box.appendChild(header);return box;}
    function whCanvasPlaceholder(sourceCanvas){const ph=document.createElement('div');ph.className='warehouse-export-chart-placeholder';const parent=sourceCanvas?.parentElement;const title=parent?.querySelector('h3')?.textContent||sourceCanvas?.getAttribute('aria-label')||sourceCanvas?.id||'الرسم البياني';ph.textContent=title;ph.style.cssText='min-height:220px;width:100%;display:grid;place-items:center;border:1px dashed rgba(141,220,89,.35);border-radius:16px;color:#d4ebd5;background:rgba(0,35,28,.55);font-weight:800;text-align:center;padding:18px;box-sizing:border-box;';return ph;}function whPrepareCloneCanvases(sourceRoot,cloneRoot){const sourceCanvases=[].slice.call(sourceRoot.querySelectorAll('canvas'));const cloneCanvases=[].slice.call(cloneRoot.querySelectorAll('canvas'));sourceCanvases.forEach(function(sourceCanvas,idx){const cloneCanvas=cloneCanvases[idx];if(!cloneCanvas)return;const rect=sourceCanvas.getBoundingClientRect();const valid=sourceCanvas.width>0&&sourceCanvas.height>0&&rect.width>0&&rect.height>0;const wrapper=cloneCanvas.parentElement;if(wrapper){wrapper.style.width='100%';wrapper.style.minHeight=Math.max(260,Math.ceil(rect.height||sourceCanvas.height||320))+'px';wrapper.style.display='block';wrapper.style.overflow='visible';}if(!valid){cloneCanvas.replaceWith(whCanvasPlaceholder(sourceCanvas));return;}try{const img=new Image();img.src=sourceCanvas.toDataURL('image/png',1);img.alt=sourceCanvas.getAttribute('aria-label')||sourceCanvas.id||'chart';img.width=Math.ceil(rect.width);img.height=Math.ceil(rect.height);img.style.cssText='display:block;max-width:100%;height:auto;object-fit:contain;margin:0 auto;';cloneCanvas.replaceWith(img);}catch(_){cloneCanvas.replaceWith(whCanvasPlaceholder(sourceCanvas));}});}function whRemoveInvalidCanvases(root){const invalid=[].slice.call(root.querySelectorAll('canvas')).filter(function(c){const rect=c.getBoundingClientRect();return c.width<=0||c.height<=0||rect.width<=0||rect.height<=0;});invalid.forEach(function(c){c.replaceWith(whCanvasPlaceholder(c));});return invalid.length;}function whInvalidBackgroundElements(root){return [].slice.call(root.querySelectorAll('*')).filter(function(el){const style=getComputedStyle(el);const rect=el.getBoundingClientRect();return style.backgroundImage!=='none'&&(rect.width<=0||el.clientWidth<=0||el.offsetWidth<=0);});}function whSanitizeInvalidBackgrounds(root){const before=whInvalidBackgroundElements(root);before.forEach(function(el){el.style.backgroundImage='none';el.style.backgroundRepeat='no-repeat';});const after=whInvalidBackgroundElements(root);root.dataset.invalidBackgroundElementsBeforeCapture=String(before.length);root.dataset.invalidBackgroundElementsAfterCapture=String(after.length);return {before:before.length,after:after.length};}function whExportSelector(el){if(!el)return '';if(el===document.body)return 'body';if(el.id)return '#'+el.id;const parts=[];let node=el;while(node&&node.nodeType===1&&node!==document.body&&parts.length<7){let part=node.tagName.toLowerCase();if(node.id){part+='#'+node.id;parts.unshift(part);break;}const classes=String(node.className||'').trim().split(/\s+/).filter(Boolean).slice(0,3);if(classes.length)part+='.'+classes.join('.');const parent=node.parentElement;if(parent){const same=[].slice.call(parent.children).filter(function(child){return child.tagName===node.tagName;});if(same.length>1)part+=':nth-of-type('+(same.indexOf(node)+1)+')';}parts.unshift(part);node=parent;}return parts.join(' > ');}function whIsPaintColor(color){return !!color&&color!=='transparent'&&color!=='rgba(0, 0, 0, 0)';}function whStyleHasPaintSource(style){if(!style)return false;const bgRepeat=String(style.backgroundRepeat||'');return style.backgroundImage!=='none'||style.borderImageSource!=='none'||style.maskImage!=='none'||style.webkitMaskImage!=='none'||style.filter!=='none'||(whIsPaintColor(style.backgroundColor)&&bgRepeat&&bgRepeat!=='no-repeat');}function whPseudoHasPaint(style){return !!style&&(style.content!=='none'||style.backgroundImage!=='none'||style.borderImageSource!=='none'||style.maskImage!=='none'||style.webkitMaskImage!=='none');}function whZeroSizeElement(el){const rect=el.getBoundingClientRect();return rect.width<=0||rect.height<=0;}function whEnsureExportPseudoStyle(root){if(root.querySelector(':scope > style[data-warehouse-export-pseudo-guard]'))return;const style=document.createElement('style');style.setAttribute('data-warehouse-export-pseudo-guard','true');style.textContent='.warehouse-performance-export-node .warehouse-export-disable-before::before{content:none!important;background:none!important;background-image:none!important;border-image:none!important;mask:none!important;-webkit-mask:none!important}.warehouse-performance-export-node .warehouse-export-disable-after::after{content:none!important;background:none!important;background-image:none!important;border-image:none!important;mask:none!important;-webkit-mask:none!important}';root.prepend(style);}function whSanitizeZeroSizePaintSources(root){whEnsureExportPseudoStyle(root);const elements=[root].concat([].slice.call(root.querySelectorAll('*')));let firstSelector='';function scan(){const invalid=[];const pseudo=[];elements.forEach(function(el){if(!(el instanceof HTMLElement||el instanceof SVGElement))return;const zero=whZeroSizeElement(el);const style=getComputedStyle(el);if(zero&&whStyleHasPaintSource(style)){invalid.push(el);}['::before','::after'].forEach(function(type){const ps=getComputedStyle(el,type);if(zero&&whPseudoHasPaint(ps)){pseudo.push({el,type});}});});return {invalid,pseudo};}const before=scan();before.invalid.forEach(function(el){if(!firstSelector)firstSelector=whExportSelector(el);el.style.setProperty('background-image','none','important');el.style.setProperty('background-repeat','no-repeat','important');el.style.setProperty('border-image-source','none','important');el.style.setProperty('mask-image','none','important');el.style.setProperty('-webkit-mask-image','none','important');if(el instanceof SVGElement)el.style.setProperty('filter','none','important');});before.pseudo.forEach(function(item){if(!firstSelector)firstSelector=whExportSelector(item.el)+(item.type||'');item.el.classList.add(item.type==='::before'?'warehouse-export-disable-before':'warehouse-export-disable-after');});const after=scan();root.dataset.zeroSizePaintSourcesBefore=String(before.invalid.length);root.dataset.zeroSizePaintSourcesAfter=String(after.invalid.length);root.dataset.zeroSizePseudoBefore=String(before.pseudo.length);root.dataset.zeroSizePseudoAfter=String(after.pseudo.length);root.dataset.firstZeroSizePaintSelector=firstSelector;return {before:before.invalid.length,after:after.invalid.length,pseudoBefore:before.pseudo.length,pseudoAfter:after.pseudo.length,firstSelector};}function whClone(source){const clone=source.cloneNode(true);whPrepareCloneCanvases(source,clone);whCleanup(clone);clone.classList.add('warehouse-performance-export-node');clone.style.display='block';clone.style.width='100%';clone.style.maxWidth='100%';clone.style.overflow='visible';return clone;}
    function whScale(width,height){const maxSide=30000;const maxArea=90000000;const sideScale=Math.min(maxSide/Math.max(width,height,1),2);const areaScale=Math.sqrt(maxArea/Math.max(width*height,1));return Math.max(1,Math.min(2,sideScale,areaScale));}
    async function whCapture(box){const Html2Canvas=window.html2canvas;if(!Html2Canvas)throw new Error('html2canvas is not loaded');document.body.appendChild(box);if(document.fonts&&document.fonts.ready)await document.fonts.ready;await new Promise(function(resolve){requestAnimationFrame(function(){requestAnimationFrame(resolve);});});await whWaitImages(box);const invalidCanvasesBeforeCapture=whRemoveInvalidCanvases(box);box.dataset.invalidCanvasesBeforeCapture=String(invalidCanvasesBeforeCapture);const invalidBackgrounds=whSanitizeInvalidBackgrounds(box);box.dataset.invalidBackgroundElementsBeforeCapture=String(invalidBackgrounds.before);box.dataset.invalidBackgroundElementsAfterCapture=String(invalidBackgrounds.after);whSanitizeZeroSizePaintSources(box);await new Promise(function(resolve){requestAnimationFrame(resolve);});await new Promise(function(resolve){requestAnimationFrame(resolve);});const rect=box.getBoundingClientRect();const width=Math.ceil(box.scrollWidth);const height=Math.ceil(box.scrollHeight);if(!rect.width||!rect.height||!width||!height)throw new Error('Invalid warehouse export dimensions: '+width+'x'+height);return Html2Canvas(box,{scale:whScale(width,height),useCORS:true,allowTaint:true,backgroundColor:'#001611',logging:false,scrollX:0,scrollY:0,width:width,height:height,windowWidth:width,windowHeight:height});}
    async function whSavePng(canvas,title){return new Promise(function(resolve){canvas.toBlob(async function(blob){if(!blob){alert('تعذر إنشاء صورة PNG.');resolve(false);return;}await saveBlobWithPicker(blob,whFileSlug(title)+'-'+whDateToken()+'.png','image/png');resolve(true);},'image/png',1);});}
    async function exportWarehousePerformanceWidgetPng(element,title){if(!element)return;const box=whBox(title||whTitle(element),whWidth(element));box.appendChild(whClone(element));try{const canvas=await whCapture(box);await whSavePng(canvas,title||whTitle(element));}catch(err){console.error('Warehouse widget PNG export failed',err);alert('تعذر تصدير هذا البوكس. حاول مرة أخرى.');}finally{try{box.remove();}catch(_){}}}
    function whTargets(){const content=document.querySelector('#warehousesReportContent');if(!content)return [];const targets=[];const kpis=document.querySelector('#warehousesReportKpis');if(kpis)targets.push({element:kpis,title:'إجماليات أداء المخازن'});const ranking=content.querySelector('.warehouse-ranking-card');if(ranking)targets.push({element:ranking,title:'ترتيب المخازن حسب إجمالي التحميل'});content.querySelectorAll('#warehousesQuickTiles article').forEach(function(card){targets.push({element:card,title:whTitle(card)});});const chart=content.querySelector('.warehouse-chart-card-wide');if(chart)targets.push({element:chart,title:'مقارنة مخازن المنتج التام'});const donut=content.querySelector('.warehouse-donut-card');if(donut)targets.push({element:donut,title:'توزيع إجمالي التحميل على المخازن'});content.querySelectorAll('.warehouse-mini-table-card').forEach(function(card){targets.push({element:card,title:whTitle(card)});});const table=content.querySelector('.warehouse-report-main-card');if(table)targets.push({element:table,title:'جدول أداء المخازن المجمع'});return targets;}
    function ensureWarehousePerformancePngButtons(){whTargets().forEach(function(item){const element=item.element;const title=item.title;if(!element||element.querySelector(':scope > .warehouse-widget-png-btn'))return;element.classList.add('warehouse-widget-png-scope');element.dataset.warehouseWidgetTitle=title;const btn=document.createElement('button');btn.type='button';btn.className='warehouse-widget-png-btn';btn.title='تصدير هذا البوكس كصورة PNG';btn.setAttribute('aria-label','تصدير '+title+' كصورة PNG');btn.innerHTML='<span>PNG</span>'+whPngIcon();btn.addEventListener('click',function(event){event.preventDefault();event.stopPropagation();exportWarehousePerformanceWidgetPng(element,title);});element.prepend(btn);});}
    async function exportWarehousePerformanceReportPng(){const source=document.querySelector('#warehousesReportContent');if(!source){alert('لم يتم العثور على تقرير أداء المخازن.');return;}const box=whBox('تقرير أداء المخازن',1800);const clone=whClone(source);clone.querySelector('.executive-title-card')?.remove();clone.querySelector('.hidden-export-table')?.remove();clone.classList.add('warehouse-performance-full-export');box.appendChild(clone);try{const canvas=await whCapture(box);await whSavePng(canvas,'warehouse-performance');}catch(err){console.error('Warehouse performance PNG export failed',err);alert('تعذر تجهيز التقرير للتصدير. حاول مرة أخرى.');}finally{try{box.remove();}catch(_){}}}
    async function exportWarehousePerformanceReportPdf(){const source=document.querySelector('#warehousesReportContent');if(!source){alert('لم يتم العثور على تقرير أداء المخازن.');return;}const JsPDF=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF;if(!JsPDF){alert('مكتبة PDF غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.');return;}const box=whBox('تقرير أداء المخازن',1800);const clone=whClone(source);clone.querySelector('.executive-title-card')?.remove();clone.querySelector('.hidden-export-table')?.remove();clone.classList.add('warehouse-performance-full-export');box.appendChild(clone);try{const canvas=await whCapture(box);const pdf=new JsPDF({orientation:'landscape',unit:'mm',format:'a3',compress:true});const pageWidth=pdf.internal.pageSize.getWidth();const pageHeight=pdf.internal.pageSize.getHeight();const margin=8;const imgWidth=pageWidth-(margin*2);const imgHeight=(canvas.height*imgWidth)/canvas.width;const pageContentHeight=pageHeight-(margin*2);const imgData=canvas.toDataURL('image/jpeg',0.92);let offset=0;let page=0;while(offset<imgHeight){if(page>0)pdf.addPage('a3','landscape');pdf.addImage(imgData,'JPEG',margin,margin-offset,imgWidth,imgHeight,undefined,'FAST');offset+=pageContentHeight;page+=1;}const blob=pdf.output('blob');await saveBlobWithPicker(blob,'warehouse-performance-'+whDateToken()+'.pdf','application/pdf');await logSystemActivity(activityExportSection('تقرير أداء المخازن'),'تصدير PDF','تصدير تقرير أداء المخازن PDF');}catch(err){console.error('Warehouse performance PDF export failed',err);alert('تعذر تصدير PDF. حاول مرة أخرى.');}finally{try{box.remove();}catch(_){}}}
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
function itemsReportPngDateRange(){
  const filters=getReportFilters();
  const from=normalizeDateISO(filters.from || $('#reportFromDate')?.value || '');
  const to=normalizeDateISO(filters.to || $('#reportToDate')?.value || '');
  return {from,to,fromToken:from||'start',toToken:to||'end'};
}
function itemsReportPngFilterLine(){
  const filters=getReportFilters();
  const range=itemsReportPngDateRange();
  const parts=[`الفترة: من ${formatDisplayDate(range.from,'البداية')} إلى ${formatDisplayDate(range.to,'النهاية')}`];
  const plantSelect=$('#reportPlantFilter');
  const warehouseSelect=$('#reportWarehouseFilter');
  if(!enterpriseFilterIsAll(filters.plant)){
    parts.push(`المصنع: ${enterpriseFilterText(filters.plant,plantSelect,'جميع المصانع')}`);
  }
  if(!enterpriseFilterIsAll(filters.warehouse)){
    parts.push(`المخزن: ${enterpriseFilterText(filters.warehouse,warehouseSelect,'جميع مخازن البيع')}`);
  }
  return parts.join(' / ');
}
function itemsReportPngFileName(prefix){
  const range=itemsReportPngDateRange();
  return `${prefix}_${range.fromToken}_to_${range.toToken}.png`;
}
function setItemsReportPngBusy(button,busy,label){
  if(!button) return;
  if(!button.dataset.defaultText) button.dataset.defaultText=button.textContent.trim();
  button.disabled=!!busy;
  button.textContent=busy ? (label || 'جاري إنشاء PNG...') : button.dataset.defaultText;
}
function normalizeItemsReportPngClone(root){
  if(!root) return;
  root.querySelectorAll('.items-report-png-btn,.png-export-btn').forEach(btn=>btn.remove());
  root.querySelectorAll('.rank-table-wrap,.item-report-table-wrap').forEach(wrap=>{
    wrap.style.setProperty('height','auto','important');
    wrap.style.setProperty('max-height','none','important');
    wrap.style.setProperty('overflow','visible','important');
  });
  root.querySelectorAll('table').forEach(table=>{
    table.style.setProperty('width','100%','important');
    table.style.setProperty('max-width','100%','important');
    table.style.setProperty('min-width','0','important');
    table.style.setProperty('table-layout','fixed','important');
  });
  root.querySelectorAll('th,td').forEach(cell=>{
    cell.style.setProperty('white-space','normal','important');
    cell.style.setProperty('overflow-wrap','anywhere','important');
    cell.style.setProperty('word-break','break-word','important');
  });
}
function createItemsReportPngBox(className,width){
  const box=document.createElement('section');
  box.className=`items-report-png-export-box ${className||''}`.trim();
  box.dir='rtl';
  box.lang='ar';
  box.setAttribute('aria-hidden','true');
  box.style.cssText=[
    'position:fixed','top:0','left:0','z-index:-1',`width:${width||1600}px`,'min-height:300px','padding:28px','box-sizing:border-box',
    'background:radial-gradient(circle at 50% 0%,rgba(94,180,71,.14),transparent 36%),linear-gradient(180deg,#00291f,#001611)',
    'color:#fff','direction:rtl','font-family:Cairo,Arial,sans-serif','overflow:visible','pointer-events:none'
  ].join(';');
  return box;
}
function itemsReportPngHeader(title){
  const header=document.createElement('header');
  header.className='items-report-png-header';
  header.style.cssText='display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin-bottom:18px;padding-bottom:14px;border-bottom:1px solid rgba(141,220,89,.28);';
  header.innerHTML=`<h2 style="margin:0;color:#fff;font-size:32px;line-height:1.25;font-weight:900;">${escapeHtml(title)}</h2><p style="margin:0;color:#bdf2a0;font-size:17px;line-height:1.4;font-weight:800;text-align:left;">${escapeHtml(itemsReportPngFilterLine())}</p>`;
  return header;
}
async function captureItemsReportPngBox(box,fileName){
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas){ alert('مكتبة تصدير الصور غير محملة. تأكد من الاتصال بالإنترنت ثم حاول مرة أخرى.'); return false; }
  document.body.appendChild(box);
  try{
    if(document.fonts && document.fonts.ready){ await document.fonts.ready; }
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=box.getBoundingClientRect();
    const width=Math.ceil(Math.max(box.scrollWidth, rect.width, 1));
    const height=Math.ceil(Math.max(box.scrollHeight, rect.height, 1));
    if(width<=1 || height<=1) throw new Error(`Invalid items PNG dimensions: ${width}x${height}`);
    const canvas=await Html2Canvas(box,{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#001611',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
    return await new Promise(resolve=>{
      canvas.toBlob(async blob=>{
        if(!blob){ alert('تعذر إنشاء صورة PNG.'); resolve(false); return; }
        await saveBlobWithPicker(blob,fileName,'image/png');
        resolve(true);
      },'image/png',1);
    });
  }finally{
    try{ box.remove(); }catch(_){ }
  }
}
function applyItemsSummaryExportDesktopLayout(box){
  if(!box) return;
  box.classList.add('items-summary-export-clone');
  box.style.setProperty('width','1800px','important');
  box.style.setProperty('max-width','1800px','important');
  const kpis=box.querySelector('#itemsReportKpis,.item-report-summary');
  if(kpis){
    kpis.style.setProperty('display','grid','important');
    kpis.style.setProperty('grid-template-columns','repeat(5,minmax(0,1fr))','important');
    kpis.style.setProperty('gap','14px','important');
    kpis.style.setProperty('width','100%','important');
    kpis.style.setProperty('margin','0 0 18px','important');
    kpis.querySelectorAll('.kpi').forEach(card=>{
      card.style.setProperty('min-width','0','important');
      card.style.setProperty('min-height','126px','important');
      card.style.setProperty('padding','18px','important');
      card.style.setProperty('box-sizing','border-box','important');
    });
  }
  const grid=box.querySelector('.item-report-top-grid');
  if(grid){
    grid.style.setProperty('display','grid','important');
    grid.style.setProperty('grid-template-columns','minmax(0,.35fr) minmax(0,.65fr)','important');
    grid.style.setProperty('gap','20px','important');
    grid.style.setProperty('align-items','start','important');
    grid.style.setProperty('width','100%','important');
    grid.style.setProperty('direction','rtl','important');
    const articles=[...grid.children].filter(el=>el.nodeType===1);
    const tableCard=articles[0];
    const statusCard=articles[1];
    if(tableCard){
      tableCard.style.setProperty('grid-column','2','important');
      tableCard.style.setProperty('grid-row','1','important');
      tableCard.style.setProperty('align-self','start','important');
      tableCard.style.setProperty('min-width','0','important');
      tableCard.style.setProperty('width','100%','important');
      tableCard.style.setProperty('min-height','0','important');
      tableCard.style.setProperty('overflow','hidden','important');
    }
    if(statusCard){
      statusCard.style.setProperty('grid-column','1','important');
      statusCard.style.setProperty('grid-row','1','important');
      statusCard.style.setProperty('align-self','start','important');
      statusCard.style.setProperty('min-width','0','important');
      statusCard.style.setProperty('width','100%','important');
      statusCard.style.setProperty('min-height','0','important');
      statusCard.style.setProperty('overflow','hidden','important');
    }
  }
  const board=box.querySelector('#itemsStatusBoard');
  if(board){
    board.style.setProperty('display','grid','important');
    board.style.setProperty('grid-template-columns','1fr','important');
    board.style.setProperty('gap','9px','important');
    board.style.setProperty('height','auto','important');
    board.style.setProperty('min-height','0','important');
    board.style.setProperty('padding-top','0','important');
    board.querySelectorAll('.item-status-card').forEach(card=>{
      card.style.setProperty('min-height','58px','important');
      card.style.setProperty('padding','10px 12px','important');
      card.style.setProperty('gap','10px','important');
    });
  }
  const wrap=box.querySelector('.item-report-top-grid > article:first-child .report-rank-wrap');
  if(wrap){
    wrap.style.setProperty('height','auto','important');
    wrap.style.setProperty('max-height','none','important');
    wrap.style.setProperty('overflow','visible','important');
    wrap.style.setProperty('width','100%','important');
    wrap.style.setProperty('max-width','100%','important');
  }
  const table=box.querySelector('#itemsReviewTopTable');
  if(table){
    table.style.setProperty('width','100%','important');
    table.style.setProperty('max-width','100%','important');
    table.style.setProperty('min-width','0','important');
    table.style.setProperty('table-layout','fixed','important');
    table.style.setProperty('border-collapse','collapse','important');
    table.style.setProperty('font-size','11.5px','important');
    table.querySelectorAll('th,td').forEach(cell=>{
      cell.style.setProperty('padding','6px 4px','important');
      cell.style.setProperty('line-height','1.25','important');
      cell.style.setProperty('white-space','nowrap','important');
      cell.style.setProperty('overflow','hidden','important');
      cell.style.setProperty('text-overflow','clip','important');
      cell.style.setProperty('overflow-wrap','normal','important');
      cell.style.setProperty('word-break','normal','important');
      cell.style.setProperty('box-sizing','border-box','important');
    });
    table.querySelectorAll('th:nth-child(3),td:nth-child(3),th:nth-child(11),td:nth-child(11)').forEach(cell=>{
      cell.style.setProperty('white-space','normal','important');
      cell.style.setProperty('overflow-wrap','break-word','important');
    });
    const widths=['3%','9%','30%','6%','6%','6%','6%','6%','8%','8%','12%'];
    widths.forEach((width,idx)=>{
      table.querySelectorAll(`th:nth-child(${idx+1}),td:nth-child(${idx+1})`).forEach(cell=>cell.style.setProperty('width',width,'important'));
    });
    table.querySelectorAll('.item-status-badge').forEach(badge=>{
      badge.style.setProperty('display','inline-flex','important');
      badge.style.setProperty('max-width','100%','important');
      badge.style.setProperty('padding','3px 5px','important');
      badge.style.setProperty('font-size','10px','important');
      badge.style.setProperty('white-space','normal','important');
      badge.style.setProperty('overflow','hidden','important');
      badge.style.setProperty('overflow-wrap','break-word','important');
      badge.style.setProperty('word-break','normal','important');
    });
  }
}
async function exportItemsReportSummaryPng(button){
  if(button?.disabled) return;
  const source=$('#itemsReportContent');
  const kpis=$('#itemsReportKpis');
  const topGrid=source?.querySelector('.item-report-top-grid');
  if(!source || !kpis || !topGrid){ alert('لم يتم العثور على ملخص تقرير الأصناف.'); return; }
  setItemsReportPngBusy(button,true,'جاري تصدير الملخص...');
  const box=createItemsReportPngBox('items-report-summary-png-export items-summary-export-clone',1800);
  try{
    const kpiClone=kpis.cloneNode(true);
    const topClone=topGrid.cloneNode(true);
    normalizeItemsReportPngClone(kpiClone);
    normalizeItemsReportPngClone(topClone);
    box.append(itemsReportPngHeader('تقرير مراجعة الأصناف'),kpiClone,topClone);
    const ok=await captureItemsReportPngBox(box,itemsReportPngFileName('items-report-summary'));
    if(ok) await logSystemActivity(activityExportSection('تقرير مراجعة الأصناف'),'تصدير PNG','تصدير ملخص تقرير الأصناف PNG');
  }catch(err){
    console.error('Items summary PNG export failed',err);
    alert('تعذر تصدير ملخص تقرير الأصناف PNG. حاول مرة أخرى.');
    try{ box.remove(); }catch(_){ }
  }finally{
    setItemsReportPngBusy(button,false);
  }
}
async function exportItemsReviewTablePng(button){
  if(button?.disabled) return;
  const source=$('#itemsReportContent .item-report-main-card');
  const table=$('#itemsReportTable');
  if(!source || !table){ alert('لم يتم العثور على جدول مراجعة الأصناف.'); return; }
  setItemsReportPngBusy(button,true,'جاري تصدير الجدول...');
  const width=Math.max(1600, source.scrollWidth || 0, table.scrollWidth || 0);
  const box=createItemsReportPngBox('items-review-table-png-export',width);
  try{
    const clone=source.cloneNode(true);
    normalizeItemsReportPngClone(clone);
    const head=clone.querySelector('.report-section-head');
    const period=document.createElement('p');
    period.className='items-report-export-period';
    period.textContent=itemsReportPngFilterLine();
    period.style.cssText='width:100%;margin:0 0 10px;color:#bdf2a0;font-size:16px;font-weight:800;text-align:right;';
    if(head) head.insertAdjacentElement('afterend',period);
    box.appendChild(clone);
    const ok=await captureItemsReportPngBox(box,itemsReportPngFileName('items-review-table'));
    if(ok) await logSystemActivity(activityExportSection('تقرير مراجعة الأصناف'),'تصدير PNG','تصدير جدول مراجعة الأصناف المجمع PNG');
  }catch(err){
    console.error('Items review table PNG export failed',err);
    alert('تعذر تصدير جدول مراجعة الأصناف PNG. حاول مرة أخرى.');
    try{ box.remove(); }catch(_){ }
  }finally{
    setItemsReportPngBusy(button,false);
  }
}
async function exportActiveReportPng(){
  if (ACTIVE_REPORT_TAB === 'warehouses') {
    await exportWarehousePerformanceReportPng();
    return;
  }
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
  if (ACTIVE_REPORT_TAB === 'warehouses') {
    await exportWarehousePerformanceReportPdf();
    return;
  }
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
    fullBtn.innerHTML='<span class="png-icon" aria-hidden="true">'+modernIcon('image')+'</span><span>تصدير الشاشة PNG</span>';
    fullBtn.title='تصدير الشاشة الرئيسية كاملة كصورة PNG';
    fullBtn.addEventListener('click',()=>exportDashboardElementAsPng(dashboard,'الشاشة الرئيسية'));
    filters.appendChild(fullBtn);
  }
  dashboard.querySelectorAll('.panel.glass,.kpi.glass').forEach(box=>{
    if(box.classList.contains('no-widget-png-export')) return;
    if(box.querySelector(':scope > .widget-png-btn')) return;
    box.classList.add('png-exportable-widget');
    if(!box.dataset.pngTitle) box.dataset.pngTitle=dashboardPngTitleFromElement(box);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='widget-png-btn';
    btn.title='تصدير هذا البوكس كصورة PNG';
    btn.setAttribute('aria-label','تصدير هذا البوكس كصورة PNG');
    btn.setAttribute('data-html2canvas-ignore','true');
    btn.innerHTML='<span>PNG</span><span class="png-mini-icon" aria-hidden="true">'+modernIcon('image')+'</span>';
    btn.addEventListener('click',ev=>{
      ev.preventDefault();
      ev.stopPropagation();
      exportDashboardElementAsPng(box,box.dataset.pngTitle||dashboardPngTitleFromElement(box));
    });
    box.prepend(btn);
  });
  syncDashboardPngButtonState();
}

async function exportDashboardElementAsPng(element,title){
  if(!element || !beginDashboardPngExport()) return;
  const Html2Canvas=window.html2canvas;
  const previousActive=document.activeElement;
  const restoreExclusions=markDashboardPngCaptureExclusions(element);
  element.classList.add('png-capturing-now');
  document.body.classList.add('dashboard-png-exporting');
  try{
    if(!Html2Canvas) throw new Error('PNG export is unavailable');
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=element.getBoundingClientRect();
    const width=Math.ceil(Math.max(rect.width,element.scrollWidth,1));
    const height=Math.ceil(Math.max(rect.height,element.scrollHeight,1));
    const canvas=await Html2Canvas(element,{
      scale:Math.min(3,Math.max(2,window.devicePixelRatio||2)),
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
    const blob=await dashboardCanvasToPngBlob(canvas);
    await saveBlobWithPicker(blob,`${safeFileName(title||'dashboard')}.png`,'image/png');
    showDashboardPngToast('تم تصدير الصورة بنجاح.','success',3000);
  }catch(err){
    console.error('Dashboard PNG export failed',err);
    showDashboardPngToast('تعذر تصدير الصورة.','error',6000);
  }finally{
    restoreExclusions();
    element.classList.remove('png-capturing-now');
    document.body.classList.remove('dashboard-png-exporting');
    endDashboardPngExport();
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
    enterpriseSetSelectValuesById('reportPlantFilter',['all'],{silent:true});
    fillReportFilters();
    enterpriseSetSelectValuesById('reportWarehouseFilter',['all'],{silent:true});
    enterpriseSetSelectValuesById('itemAnalyticsItemFilter',['all'],{silent:true});
    if($('#reportFromDate')) $('#reportFromDate').value='';
    if($('#reportToDate')) $('#reportToDate').value='';
    loadActiveReport();
  });
  $('#executiveReportExcelBtn')?.addEventListener('click',exportActiveReportExcel);
  $('#activeReportPdfBtn')?.addEventListener('click',exportActiveReportVisualPdf);
  $('#activeReportPngBtn')?.addEventListener('click',exportActiveReportPng);
  $('#itemsSummaryPngBtn')?.addEventListener('click',event=>exportItemsReportSummaryPng(event.currentTarget));
  $('#itemsReviewTablePngBtn')?.addEventListener('click',event=>exportItemsReviewTablePng(event.currentTarget));

  $('#smartVisualPdfBtn')?.addEventListener('click',async()=>{ ACTIVE_REPORT_TAB='smart'; await exportActiveReportVisualPdf(); });
  $('#smartVisualPngBtn')?.addEventListener('click',async()=>{ ACTIVE_REPORT_TAB='smart'; await exportActiveReportPng(); });
}
document.addEventListener('DOMContentLoaded',initExecutiveReports);
document.addEventListener('DOMContentLoaded',initAuditScoreDetails);
document.addEventListener('DOMContentLoaded',()=>{ ensureDashboardPngButtons(); setTimeout(ensureDashboardPngButtons,800); });














// === Inventory Closing Module (UI Skeleton) ===
function initInventoryClosing() {
  const tabs = document.querySelectorAll('.subtabs [data-inventory-closing-tab]');
  const panels = document.querySelectorAll('[data-inventory-closing-panel]');
  
  if(tabs.length === 0) return;
  
  // Setup tabs switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.inventoryClosingTab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      panels.forEach(p => {
        const isTarget = p.dataset.inventoryClosingPanel === target;
        p.classList.toggle('active', isTarget);
        if (isTarget) {
          p.removeAttribute('hidden');
        } else {
          p.setAttribute('hidden', '');
        }
      });
    });
  });

  // Setup export buttons
  const exportConfigs = [
    { id: 'Wf01', title: 'تقفيل الواحة' },
    { id: 'El01', title: 'تقفيل المصنع الرئيسي' },
    { id: 'El02', title: 'تقفيل مصنع العامرية' }
  ];

  exportConfigs.forEach(cfg => {
    const excelBtn = document.getElementById('inventoryClosing' + cfg.id + 'ExportExcelBtn');
    const pdfBtn = document.getElementById('inventoryClosing' + cfg.id + 'ExportPdfBtn');
    const pngBtn = document.getElementById('inventoryClosing' + cfg.id + 'ExportPngBtn');
    const tableId = 'inventoryClosing' + cfg.id + 'Table';
    const panelId = 'inventoryClosing' + cfg.id + 'Panel';

    if(excelBtn) {
      excelBtn.addEventListener('click', () => {
        if(typeof exportTableToExcel === 'function') exportTableToExcel(tableId, cfg.title);
      });
    }
    
    if(pdfBtn) {
      pdfBtn.addEventListener('click', () => {
        if(typeof exportTableToPdf === 'function') exportTableToPdf(tableId, cfg.title);
      });
    }
    
    if(pngBtn) {
      pngBtn.addEventListener('click', async () => {
        const panel = document.getElementById(panelId);
        if(!panel) return;
        if(!window.html2canvas) { alert('مكتبة PNG غير متوفرة'); return; }
        
        try {
          const canvas = await html2canvas(panel, {
            scale: 2,
            backgroundColor: '#001611',
            useCORS: true
          });
          canvas.toBlob(async blob => {
            if(!blob) return;
            const fileName = cfg.title + '-' + new Date().toISOString().slice(0,10) + '.png';
            if(typeof saveBlobWithPicker === 'function') {
              await saveBlobWithPicker(blob, fileName, 'image/png');
            } else {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName;
              a.click();
              URL.revokeObjectURL(url);
            }
          }, 'image/png', 1);
        } catch (err) {
          console.error('PNG Export error:', err);
          alert('حدث خطأ أثناء تصدير PNG');
        }
      });
    }
  });
  
  // Set user placeholders
  const placeholders = document.querySelectorAll('.inventory-closing-user-placeholder');
  const currentUserName = document.getElementById('currentUserName')?.textContent || '';
  placeholders.forEach(p => {
    p.textContent = currentUserName && currentUserName !== '--' ? currentUserName : '';
  });
}


const INVENTORY_COUNT_WAREHOUSE_BY_PLANT = {
  WF01: 'W401',
  EL01: 'N401',
  EL02: 'E401'
};
let INVENTORY_COUNT_STATE = { documentId: null, versionId: null, versionNo: null, documentStatus: null, versionStatus: null, lines: [], creating: false, snapshotCreating: false, loading: false, finalizing: false, postCloseInvoiceSaving: false, requestSeq: 0, status: 'idle', openingBalanceMode: 'manual_first_day', openingBalanceSaving: new Set(), productionSaving: new Set(), physicalBalanceSaving: new Set(), oldestQuantitySaving: new Set(), oldestDateSaving: new Set(), inventoryCounterSaving: new Set(), inventoryCounterOptions: [], inventoryCounterPlantCode: '', inventoryCounterLoading: false, reviewerUserId: null, reviewerName: '—', visibleColumnKeys: null, columnManagerDraftKeys: null, searchText: '', columnFilters: {}, sortKey: '', sortDirection: 'asc', settlementContextVersionId: null, settlementContextSnapshot: null, settlementContextByLine: new Map(), settlementContextLoading: false, settlementContextError: '', settlementContextRequestSeq: 0, settlementPhaseStarted: false, settlementSaving: new Set(), settlementModalLineId: null, settlementModalSnapshotId: null, reversalSaving: new Set(), reversalModalLineId: null, reversalModalSettlementId: null, postCloseInvoiceModalLineId: null, auditHistoryRequestSeq: 0, auditHistoryLineId: null, auditHistoryVersionId: null };
const INVENTORY_COUNT_VISIBLE_COLUMNS_STORAGE_KEY = 'inventory_count_visible_columns';
const INVENTORY_COUNT_COLUMNS = [
  { key: 'material_code', label: 'كود المادة', required: true },
  { key: 'material_name', label: 'وصف المادة', required: true },
  { key: 'uom', label: 'وحدة القياس', required: true },
  { key: 'opening_balance', label: 'رصيد أول' },
  { key: 'production_quantity', label: 'الإنتاج' },
  { key: 'incoming_transfers', label: 'التحويلات الواردة' },
  { key: 'actual_returns', label: 'مرتجع فعلي' },
  { key: 'adjustment_increase_z22', label: 'تسوية زيادة Z22' },
  { key: 'adjustment_shortage_z21', label: 'تسوية عجز Z21' },
  { key: 'sales_quantity', label: 'كمية البيع' },
  { key: 'outgoing_transfers', label: 'التحويلات الصادرة' },
  { key: 'rework_311', label: 'إعادة التصنيع 311' },
  { key: 'book_balance', label: 'الرصيد الدفتري' },
  { key: 'physical_balance', label: 'الرصيد الفعلي' },
  { key: 'inventory_variance', label: 'فرق الجرد' },
  { key: 'oldest_quantity', label: 'كمية أقدم تاريخ' },
  { key: 'oldest_date', label: 'أقدم تاريخ' },
  { key: 'inventory_counter', label: 'القائم بالجرد' },
  { key: 'inventory_settlement', label: 'تسوية الجرد' }
];
const INVENTORY_COUNT_REQUIRED_COLUMN_KEYS = new Set(INVENTORY_COUNT_COLUMNS.filter(column=>column.required).map(column=>column.key));
const INVENTORY_COUNT_SORT_COLUMNS = {
  material_code: 'text',
  material_name: 'text',
  uom: 'text',
  opening_balance: 'number',
  production_quantity: 'number',
  incoming_transfers: 'number',
  actual_returns: 'number',
  adjustment_increase_z22: 'number',
  adjustment_shortage_z21: 'number',
  sales_quantity: 'number',
  outgoing_transfers: 'number',
  rework_311: 'number',
  book_balance: 'number',
  physical_balance: 'number',
  inventory_variance: 'number',
  oldest_quantity: 'number',
  oldest_date: 'date',
  inventory_counter: 'text'
};
function inventoryCountTodayIso(){
  const now=new Date();
  const cairo=new Date(now.toLocaleString('en-US',{timeZone:'Africa/Cairo'}));
  return `${cairo.getFullYear()}-${String(cairo.getMonth()+1).padStart(2,'0')}-${String(cairo.getDate()).padStart(2,'0')}`;
}
function inventoryCountSetStatus(message,type=''){
  const toastType = type === 'err' ? 'error' : (type === 'ok' ? 'success' : (type || 'info'));
  showInventoryCountToast(message || '', toastType);
}
function inventoryCountSettlementPhaseStarted(){
  return Boolean(INVENTORY_COUNT_STATE.settlementPhaseStarted);
}
function inventoryCountIsFinalized(){
  return String(INVENTORY_COUNT_STATE.documentStatus || '').toLowerCase()==='locked'
    && ['settled','approved','locked'].includes(String(INVENTORY_COUNT_STATE.versionStatus || '').toLowerCase());
}
function markInventoryCountSettlementPhaseStarted(){
  INVENTORY_COUNT_STATE.settlementPhaseStarted=true;
  updateInventoryDifferenceSnapshotButton();
  updateInventoryCountFinalizationControls();
}
function inventoryCountSettlementPhaseLockMessage(){
  return 'بدأت مرحلة تسوية فروق الجرد لهذا المستند. تم إيقاف التعديلات اليدوية، وأي تعديل لاحق يجب أن يتم من خلال تسوية الجرد أو التراجع عنها.';
}
function inventoryCountFinalizedMessage(){
  return 'تم إنهاء مستند الجرد نهائيًا. جميع خانات الجرد مقفلة، وأي تعديل لاحق على البيع أو التحويلات أو الإنتاج يتم من زر تعديلات بعد إنهاء الجرد.';
}
function inventoryCountManualEditsLocked(){
  return inventoryCountSettlementPhaseStarted() || inventoryCountIsFinalized();
}
function inventoryCountPhaseLockErrorMessage(error,fallback='حدث خطأ أثناء الحفظ.',versionId=INVENTORY_COUNT_STATE.versionId){
  const message=String(error?.message || error || '').trim();
  if(message.includes('inventory_settlement_phase_started')){
    const normalizedVersionId=String(versionId || '');
    if(!normalizedVersionId || normalizedVersionId===String(INVENTORY_COUNT_STATE.versionId || '')){
      markInventoryCountSettlementPhaseStarted();
      requestAnimationFrame(()=>renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []));
    }
    return inventoryCountSettlementPhaseLockMessage();
  }
  if(message.includes('inventory_count_negative_production_not_allowed')) return 'الإنتاج لا يمكن أن يكون بقيمة سالبة.';
  if(message.includes('inventory_count_negative_physical_balance_not_allowed')) return 'الرصيد الفعلي لا يمكن أن يكون بقيمة سالبة.';
  if(message.includes('inventory_count_negative_oldest_quantity_not_allowed')) return 'كمية أقدم تاريخ لا يمكن أن تكون بقيمة سالبة.';
  return message || fallback;
}
function inventoryCountManualControlLockAttributes(){
  if(!inventoryCountManualEditsLocked()) return '';
  const title=escapeHtml(inventoryCountIsFinalized() ? inventoryCountFinalizedMessage() : inventoryCountSettlementPhaseLockMessage());
  return ` disabled aria-disabled="true" title="${title}" data-inventory-settlement-phase-locked="1"`;
}
function inventoryCountBlockManualEditIfSettlementPhaseStarted(){
  if(!inventoryCountManualEditsLocked()) return false;
  const message=inventoryCountIsFinalized() ? inventoryCountFinalizedMessage() : inventoryCountSettlementPhaseLockMessage();
  showInventoryCountToast(message,'warning',6000);
  renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  return true;
}
function inventoryCountRejectNegativeManualValue(input,label,updateWidth){
  if(!input) return false;
  const raw=String(input.value ?? '').trim().replace(',','.');
  if(raw==='') return false;
  const value=Number(raw);
  if(Number.isFinite(value) && value<0){
    input.value=input.dataset.lastSaved || '';
    if(typeof updateWidth==='function') updateWidth(input);
    showInventoryCountToast(`${label} لا يمكن أن تكون قيمة سالبة.`,'warning',5000);
    return true;
  }
  return false;
}
function updateInventoryDifferenceSnapshotButton(){
  const btn=$('#createInventoryDifferenceSnapshotBtn');
  if(!btn) return;
  const canAdd=hasPermission('inventory_count','add');
  const busy=!!INVENTORY_COUNT_STATE.loading || !!INVENTORY_COUNT_STATE.creating || !!INVENTORY_COUNT_STATE.snapshotCreating || !!INVENTORY_COUNT_STATE.finalizing;
  const ready=!!INVENTORY_COUNT_STATE.documentId && !!INVENTORY_COUNT_STATE.versionId && (INVENTORY_COUNT_STATE.lines || []).length > 0 && INVENTORY_COUNT_STATE.documentStatus !== 'archived';
  const phaseLocked=inventoryCountSettlementPhaseStarted();
  const finalized=inventoryCountIsFinalized();
  btn.disabled=busy || !canAdd || !ready || phaseLocked || finalized;
  btn.classList.toggle('permission-disabled',!canAdd || !ready || phaseLocked || finalized);
  btn.title=finalized
    ? 'تم إنهاء مستند الجرد؛ لا يمكن إعداد أو استبدال مستند فروق الجرد.'
    : (phaseLocked
      ? 'بدأت مرحلة تسوية فروق الجرد؛ لا يمكن إعداد أو استبدال مستند فروق الجرد بعد أول تسوية.'
      : (!canAdd ? "غير متاح للصلاحية الحالية" : (!ready ? "افتح مستند جرد يحتوي على أصناف أولاً" : "إنشاء نسخة مصمتة لعرضها في شاشة فروق الجرد")));
}
function inventoryCountUnresolvedVarianceCount(){
  return (INVENTORY_COUNT_STATE.lines || []).reduce((count,row)=>count+(Math.abs(normalizeInventorySettlementNumber(row?.inventory_variance))>=0.0005 ? 1 : 0),0);
}
function updateInventoryCountFinalizationControls(){
  const finishBtn=$('#finishInventoryCountBtn');
  const invoiceBtn=$('#inventoryCountPostCloseInvoiceBtn');
  const canEdit=hasPermission('inventory_count','edit');
  const finalized=inventoryCountIsFinalized();
  const hasVersion=!!INVENTORY_COUNT_STATE.documentId && !!INVENTORY_COUNT_STATE.versionId && (INVENTORY_COUNT_STATE.lines || []).length>0;
  const unresolved=inventoryCountUnresolvedVarianceCount();
  const busy=!!INVENTORY_COUNT_STATE.loading || !!INVENTORY_COUNT_STATE.creating || !!INVENTORY_COUNT_STATE.snapshotCreating || !!INVENTORY_COUNT_STATE.finalizing || !!INVENTORY_COUNT_STATE.postCloseInvoiceSaving;
  if(finishBtn){
    finishBtn.textContent=finalized ? 'تم إنهاء الجرد' : (INVENTORY_COUNT_STATE.finalizing ? 'جارٍ إنهاء الجرد...' : 'إنهاء الجرد');
    finishBtn.disabled=busy || !canEdit || !hasVersion || finalized || unresolved>0;
    finishBtn.classList.toggle('permission-disabled',!canEdit || !hasVersion || finalized || unresolved>0);
    finishBtn.title=finalized
      ? 'تم إنهاء مستند الجرد نهائيًا.'
      : (!canEdit ? 'لا تملك صلاحية تعديل مستند الجرد.'
        : (!hasVersion ? 'افتح مستند جرد أولاً.'
          : (unresolved>0 ? `لا يمكن إنهاء الجرد قبل تسوية جميع الفروق. عدد الأصناف المتبقية: ${unresolved}` : 'إنهاء مستند الجرد نهائيًا وقفل جميع الخانات.')));
  }
  if(invoiceBtn){
    invoiceBtn.disabled=busy || !canEdit || !hasVersion || !finalized;
    invoiceBtn.classList.toggle('permission-disabled',!canEdit || !hasVersion || !finalized);
    invoiceBtn.title=finalized
      ? (canEdit ? 'إضافة تعديل بيع أو تحويل أو إنتاج بعد إنهاء الجرد.' : 'لا تملك صلاحية تعديل مستند الجرد.')
      : 'يصبح هذا الزر متاحًا بعد إنهاء الجرد.';
  }
}
function inventoryCountUpdateCreateButton(){
  const btn=$('#createInventoryCountBtn');
  if(!btn) return;
  const canAdd=hasPermission('inventory_count','add');
  const busy=!!INVENTORY_COUNT_STATE.loading || !!INVENTORY_COUNT_STATE.creating;
  const hasCurrent=!!INVENTORY_COUNT_STATE.versionId || INVENTORY_COUNT_STATE.status==='found';
  const blocked=INVENTORY_COUNT_STATE.status==='no_current_version';
  btn.disabled=busy || !canAdd || hasCurrent || blocked;
  btn.classList.toggle('permission-disabled',!canAdd || hasCurrent || blocked);
  if(hasCurrent){
    btn.textContent='الجرد موجود';
    btn.title='تم فتح جرد موجود لهذا التاريخ والمخزن';
  }else if(blocked){
    btn.textContent='جرد غير مكتمل';
    btn.title='مستند الجرد موجود، لكن لا توجد نسخة حالية صالحة.';
  }else{
    btn.textContent='جرد جديد';
    btn.title=canAdd ? '' : "غير متاح للصلاحية الحالية";
  }
  updateInventoryDifferenceSnapshotButton();
  updateInventoryCountFinalizationControls();
}
function inventoryCountSetLoading(active,message='جارٍ إنشاء الجرد...'){
  INVENTORY_COUNT_STATE.loading=!!active;
  const overlay=$('#inventoryCountLoadingOverlay');
  if(overlay){
    const box=overlay.firstElementChild;
    if(box) box.textContent=message;
    overlay.hidden=!active;
    overlay.style.display=active ? 'grid' : 'none';
    overlay.setAttribute('aria-hidden',active?'false':'true');
  }
  inventoryCountUpdateCreateButton();
}
function inventoryCountReadInputs(){
  return {
    inventoryDate: $('#inventoryCountDateInput')?.value || '',
    plantCode: ($('#inventoryCountPlantSelect')?.value || '').trim().toUpperCase(),
    warehouseCode: ($('#inventoryCountWarehouseSelect')?.value || '').trim().toUpperCase()
  };
}
function inventoryCountIsoDateParts(value){
  const text=String(value||'').trim();
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if(!match) return null;
  const year=Number(match[1]);
  const month=Number(match[2]);
  const day=Number(match[3]);
  const date=new Date(year,month-1,day);
  if(date.getFullYear()!==year || date.getMonth()!==month-1 || date.getDate()!==day) return null;
  return {year,month,day,date,iso:text};
}
function inventoryCountSelectedDayName(value){
  const parts=inventoryCountIsoDateParts(value);
  if(!parts) return '';
  return ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'][parts.date.getDay()] || '';
}
function updateInventoryCountSelectedDateSummary(){
  const summary=$('#inventoryCountSelectedDateSummary');
  if(!summary) return;
  const dayEl=summary.querySelector('.inventory-count-day-badge');
  const dateEl=summary.querySelector('.inventory-count-date-value');
  const value=$('#inventoryCountDateInput')?.value || '';
  const dayName=inventoryCountSelectedDayName(value);
  if(!dayName){
    summary.classList.add('is-empty');
    if(dayEl) dayEl.textContent='';
    if(dateEl) dateEl.textContent='اختر تاريخ الجرد';
    return;
  }
  summary.classList.remove('is-empty');
  if(dayEl) dayEl.textContent=dayName;
  if(dateEl) dateEl.textContent=formatDisplayDate(value,'');
}
function syncInventoryCountWarehouse(){
  const plant=$('#inventoryCountPlantSelect')?.value || 'WF01';
  const warehouse=INVENTORY_COUNT_WAREHOUSE_BY_PLANT[plant] || '';
  const select=$('#inventoryCountWarehouseSelect');
  if(!select) return;
  select.innerHTML=warehouse ? `<option value="${warehouse}">${warehouse}</option>` : '';
  select.value=warehouse;
}
function formatInventoryCountQuantity(value){
  if(value===null || value===undefined || value==='') return '—';
  return fmt(value);
}
function formatInventoryCountManualQuantity(value){
  if(value===null || value===undefined || value==='') return '';
  return fmt(value);
}
function formatInventoryCountMovementQuantity(value){
  if(value===null || value===undefined || value==='') return '0';
  return fmt(value);
}
function formatInventoryCountThreeDecimalQuantity(value){
  if(value===null || value===undefined || value==='') return '0.000';
  const n=Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : '0.000';
}
function normalizeInventoryReviewNumber(value){
  if(value===null || value===undefined || value==='') return 0;
  const number=Number(value);
  return Number.isFinite(number) ? number : 0;
}
function getInventoryReviewTolerance(production){
  const value=normalizeInventoryReviewNumber(production);
  if(value<=0) return null;
  if(value<20) return 2.5;
  if(value<50) return 1.5;
  if(value<70) return 1;
  return 0.6;
}
function calculateInventoryVarianceRate(variance,production){
  const productionValue=normalizeInventoryReviewNumber(production);
  if(productionValue<=0) return null;
  return Math.abs(normalizeInventoryReviewNumber(variance)) / Math.abs(productionValue) * 100;
}
function getInventoryReviewMatchLabel(matchPercentage){
  const rounded=Number(normalizeInventoryReviewNumber(matchPercentage).toFixed(2));
  if(rounded===100) return 'تطابق كامل';
  if(rounded>=90) return 'تطابق مرتفع';
  if(rounded>=70) return 'تطابق محتمل';
  return 'أقرب فرق عكسي — تطابق ضعيف';
}
function findBestInverseInventoryVariance(currentRow,lines=[]){
  const currentVariance=normalizeInventoryReviewNumber(currentRow?.inventory_variance);
  if(Math.abs(currentVariance)<0.0005) return null;
  const currentId=String(currentRow?.id || '').trim();
  const currentMaterialCode=String(currentRow?.material_code || '').trim();
  const currentAbs=Math.abs(currentVariance);
  const candidates=(Array.isArray(lines) ? lines : []).reduce((result,row)=>{
    const lineId=String(row?.id || '').trim();
    const materialCode=String(row?.material_code || '').trim();
    const candidateVariance=normalizeInventoryReviewNumber(row?.inventory_variance);
    if(!lineId || lineId===currentId || !materialCode || materialCode===currentMaterialCode) return result;
    if(Math.abs(candidateVariance)<0.0005 || Math.sign(candidateVariance)===Math.sign(currentVariance)) return result;
    const candidateAbs=Math.abs(candidateVariance);
    const maximum=Math.max(currentAbs,candidateAbs);
    if(maximum<=0) return result;
    const matchPercentage=Math.min(currentAbs,candidateAbs) / maximum * 100;
    result.push({
      row,
      variance:candidateVariance,
      matchPercentage,
      quantityDifference:Math.abs(currentAbs-candidateAbs),
      matchLabel:getInventoryReviewMatchLabel(matchPercentage)
    });
    return result;
  },[]);
  candidates.sort((a,b)=>{
    if(Math.abs(b.matchPercentage-a.matchPercentage)>0.0000001) return b.matchPercentage-a.matchPercentage;
    if(Math.abs(a.quantityDifference-b.quantityDifference)>0.0000001) return a.quantityDifference-b.quantityDifference;
    return String(a.row?.material_code || '').localeCompare(String(b.row?.material_code || ''),'en',{numeric:true,sensitivity:'base'});
  });
  return candidates[0] || null;
}
function getCurrentInventoryReviewerName(){
  return String(CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || 'المراجع').trim() || 'المراجع';
}
function formatInventoryReviewQuantity(value,signed=false){
  const number=normalizeInventoryReviewNumber(value);
  return (signed && number>0 ? '+' : '')+number.toFixed(3);
}
function formatInventoryReviewPercentage(value){
  return value===null || value===undefined ? 'غير مطبقة' : normalizeInventoryReviewNumber(value).toFixed(2)+'%';
}
function buildInventoryReviewRecommendations(row,lines=[],context={}){
  const variance=normalizeInventoryReviewNumber(row?.inventory_variance);
  const production=normalizeInventoryReviewNumber(row?.production_quantity);
  const varianceIsZero=Math.abs(variance)<0.0005;
  const tolerance=getInventoryReviewTolerance(production);
  const varianceRate=varianceIsZero ? null : calculateInventoryVarianceRate(variance,production);
  const direction=varianceIsZero ? 'مطابق' : (variance>0 ? 'فرق زيادة' : 'فرق عجز');
  const directionKey=varianceIsZero ? 'match' : (variance>0 ? 'surplus' : 'shortage');
  let classification='مطابق';
  let summary='لا يوجد فرق جرد لهذا الصنف، ولا توجد إجراءات مراجعة إضافية مطلوبة حاليًا.';
  let recommendations=[];
  let notice='';
  if(!varianceIsZero && production>0 && varianceRate<=tolerance){
    classification='فرق مقبول نسبيًا';
    summary='فرق الجرد مقبول نسبيًا وفق نسبة السماح المحددة لكمية إنتاج هذا الصنف، ولكن يجب التأكيد على تجميع العدادات وتسجيل الإنتاج وإجراء مراجعة سريعة لكارت الصنف.';
    recommendations=[
      'تأكد من تجميع عدادات الإنتاج خلال الورديات الثلاث.',
      'تأكد من تسجيل كامل إنتاج الصنف.',
      'نفّذ مراجعة سريعة لكارت الصنف.',
      'راجع أي حركة بيع أو تحويل غير معتادة إن وجدت.'
    ];
  }else if(!varianceIsZero && production>0){
    classification='فرق يحتاج مراجعة';
    summary='فرق الجرد يتجاوز نسبة السماح المحددة لكمية إنتاج هذا الصنف.';
    recommendations=[
      'راجع تسجيلك للإنتاج؛ ربما تكون كمية الإنتاج المسجلة غير صحيحة.',
      `يا ${context.currentUserName || 'المراجع'}، يوجد فرق جرد كبير في هذا الصنف مقارنة بكمية الإنتاج المسجلة. راجع تجميع الإنتاج من تقرير الإنتاج اليدوي، وجمّع عدادات الصنف خلال الورديات الثلاث؛ ربما يكون التجميع غير صحيح.`,
      'راجع الكاميرات على إنتاج هذا الصنف خلال الورديات الثلاث؛ ربما توجد كمية تم إنتاجها ولم يتم تسجيلها، أو تم تسجيلها على صنف آخر.',
      'راجع فروق الجرد الخاصة بالصنف في الأيام السابقة؛ ربما يكون الفرق متعلقًا بيوم سابق لم يكن الجرد فيه صحيحًا.'
    ];
    notice='إذا ثبت أن الفرق ناتج عن جرد يوم سابق، يجب عند تنفيذ التسوية تسجيل السبب بوضوح وذكر تاريخ اليوم الذي كان الجرد فيه غير صحيح.';
  }else if(!varianceIsZero){
    classification='لا يوجد إنتاج مسجل';
    summary='لا يمكن تقييم فرق الجرد كنسبة من الإنتاج؛ لأنه لا توجد كمية إنتاج مسجلة لهذا الصنف في اليوم الحالي.';
    recommendations=[
      'راجع الرصيد الفعلي المدخل.',
      'راجع كارت الصنف.',
      'راجع حركات البيع.',
      'راجع التحويلات الصادرة والواردة.',
      'راجع المرتجعات والتسويات.',
      'راجع فروق الجرد في الأيام السابقة.',
      'ابحث عن صنف آخر يحتوي فرق جرد عكسي.'
    ];
  }
  return {
    row,
    context,
    variance,
    production,
    varianceIsZero,
    varianceRate,
    tolerance,
    toleranceDifference:varianceRate===null || tolerance===null ? null : tolerance-varianceRate,
    direction,
    directionKey,
    classification,
    summary,
    recommendations,
    notice,
    inverseCandidate:varianceIsZero ? null : findBestInverseInventoryVariance(row,lines)
  };
}
function inventoryReviewCreateElement(tag,className='',text=''){
  const element=document.createElement(tag);
  if(className) element.className=className;
  if(text!==undefined && text!==null) element.textContent=String(text);
  return element;
}
function inventoryReviewAppendDetail(parent,label,value,className=''){
  const item=inventoryReviewCreateElement('div','inventory-review-detail'+(className ? ' '+className : ''));
  item.append(inventoryReviewCreateElement('span','inventory-review-detail-label',label));
  item.append(inventoryReviewCreateElement('strong','inventory-review-detail-value',value));
  parent.append(item);
  return item;
}
function ensureInventoryReviewRecommendationsModal(){
  let modal=$('#inventoryReviewRecommendationsModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='inventoryReviewRecommendationsModal';
  modal.className='inventory-review-modal app-liquid-modal-backdrop';
  modal.innerHTML='<div class="inventory-review-backdrop" aria-hidden="true"></div><section class="inventory-review-card app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="inventoryReviewRecommendationsTitle"><header class="inventory-review-head app-liquid-modal__header"><div><span class="inventory-review-eyebrow">الجرد وتوثيق المخزون</span><h2 id="inventoryReviewRecommendationsTitle" class="app-liquid-modal__title">توصيات المراجعة</h2></div><button type="button" class="inventory-review-icon-close app-liquid-modal__close" data-inventory-review-close aria-label="إغلاق نافذة توصيات المراجعة">×</button></header><nav class="inventory-review-tabs app-liquid-modal__tabs" aria-label="تبويبات مراجعة الصنف"><button type="button" data-inventory-review-tab="recommendations" aria-selected="true">توصيات المراجعة</button><button type="button" data-inventory-review-tab="history" aria-selected="false">سجل التسويات والتراجعات</button></nav><div class="inventory-review-product-summary-container"></div><div class="inventory-review-scroll app-liquid-modal__body"><div class="inventory-review-modal-body" data-inventory-review-panel="recommendations"></div><section class="inventory-review-history-panel" data-inventory-review-panel="history" hidden><p class="inventory-review-history-status" role="status">جاري تحميل سجل الصنف...</p><div class="inventory-review-timeline"></div></section></div><footer class="inventory-review-footer app-liquid-modal__footer"><button type="button" class="secondary inventory-review-close-btn" data-inventory-review-close>إغلاق</button></footer></section>';
  modal.addEventListener('click',event=>{
    if(event.target.closest('button[data-inventory-review-close]')){closeInventoryReviewRecommendationsModal();return;}
    const tab=event.target.closest('[data-inventory-review-tab]');
    if(tab && modal.contains(tab)) activateInventoryReviewModalTab(modal,tab.dataset.inventoryReviewTab);
  });
  modal.addEventListener('keydown',event=>{
    if(event.key!=='Escape') return;
    event.preventDefault();event.stopPropagation();closeInventoryReviewRecommendationsModal();
  });
  document.body.appendChild(modal);
  return modal;
}
function renderInventoryReviewRecommendationsModal(modal,model){
  const body=modal.querySelector('.inventory-review-modal-body');
  if(!body) return;
  body.replaceChildren();
  const summaryContainer = modal.querySelector('.inventory-review-product-summary-container');
  if(summaryContainer) summaryContainer.replaceChildren();
  const product=inventoryReviewCreateElement('section','inventory-review-product-card');
  const productTitle=inventoryReviewCreateElement('div','inventory-review-product-title');
  productTitle.append(inventoryReviewCreateElement('strong','inventory-review-material-code',model.row?.material_code || '—'));
  productTitle.append(inventoryReviewCreateElement('span','inventory-review-material-name',model.row?.material_name || '—'));
  product.append(productTitle);
  const context=inventoryReviewCreateElement('div','inventory-review-context');
  [
    ['المصنع',model.context.plantCode || '—'],
    ['المخزن',model.context.warehouseCode || '—'],
    ['تاريخ الجرد',formatDisplayDate(model.context.inventoryDate,'—')]
  ].forEach(([label,value])=>inventoryReviewAppendDetail(context,label,value));
  product.append(context);
  if(summaryContainer) summaryContainer.append(product); else body.append(product);
  const details=inventoryReviewCreateElement('section','inventory-review-details-grid');
  inventoryReviewAppendDetail(details,'الإنتاج',formatInventoryReviewQuantity(model.production));
  inventoryReviewAppendDetail(details,'الرصيد الدفتري',formatInventoryReviewQuantity(model.row?.book_balance));
  inventoryReviewAppendDetail(details,'الرصيد الفعلي',formatInventoryReviewQuantity(model.row?.physical_balance));
  inventoryReviewAppendDetail(details,'فرق الجرد',formatInventoryReviewQuantity(model.variance,true),'inventory-review-'+model.directionKey);
  inventoryReviewAppendDetail(details,'اتجاه الفرق',model.direction,'inventory-review-'+model.directionKey);
  inventoryReviewAppendDetail(details,'نسبة الفرق من الإنتاج',formatInventoryReviewPercentage(model.varianceRate));
  inventoryReviewAppendDetail(details,'نسبة السماح',formatInventoryReviewPercentage(model.tolerance));
  inventoryReviewAppendDetail(details,'تصنيف المراجعة',model.classification,'inventory-review-classification');
  if(summaryContainer) summaryContainer.append(details); else body.append(details);
  const recommendations=inventoryReviewCreateElement('section','inventory-review-recommendations');
  const recommendationHead=inventoryReviewCreateElement('div','inventory-review-section-head');
  recommendationHead.append(inventoryReviewCreateElement('h3','',model.classification));
  recommendationHead.append(inventoryReviewCreateElement('span','inventory-review-direction inventory-review-direction-'+model.directionKey,model.direction));
  recommendations.append(recommendationHead);
  recommendations.append(inventoryReviewCreateElement('p','inventory-review-summary',model.summary));
  if(model.toleranceDifference!==null && model.classification==='فرق مقبول نسبيًا'){
    recommendations.append(inventoryReviewCreateElement('p','inventory-review-rate-gap','هامش السماح المتبقي: '+model.toleranceDifference.toFixed(2)+'%'));
  }
  if(model.recommendations.length){
    const list=inventoryReviewCreateElement('ol','inventory-review-list');
    model.recommendations.forEach(text=>list.append(inventoryReviewCreateElement('li','',text)));
    recommendations.append(list);
  }
  if(model.notice) recommendations.append(inventoryReviewCreateElement('div','inventory-review-notice',model.notice));
  body.append(recommendations);
  if(!model.varianceIsZero){
    const inverse=inventoryReviewCreateElement('section','inventory-review-inverse-card');
    inverse.append(inventoryReviewCreateElement('h3','','أقرب فرق جرد عكسي'));
    if(model.inverseCandidate){
      const candidate=model.inverseCandidate;
      inverse.append(inventoryReviewCreateElement('span','inventory-review-match-badge',candidate.matchLabel));
      const inverseDetails=inventoryReviewCreateElement('div','inventory-review-inverse-grid');
      inventoryReviewAppendDetail(inverseDetails,'كود الصنف الآخر',candidate.row?.material_code || '—');
      inventoryReviewAppendDetail(inverseDetails,'وصف الصنف الآخر',candidate.row?.material_name || '—');
      inventoryReviewAppendDetail(inverseDetails,'فرق الصنف الحالي',formatInventoryReviewQuantity(model.variance,true));
      inventoryReviewAppendDetail(inverseDetails,'فرق الصنف الآخر',formatInventoryReviewQuantity(candidate.variance,true));
      inventoryReviewAppendDetail(inverseDetails,'فرق الكمية',formatInventoryReviewQuantity(candidate.quantityDifference));
      inventoryReviewAppendDetail(inverseDetails,'نسبة التطابق',formatInventoryReviewPercentage(candidate.matchPercentage));
      inventoryReviewAppendDetail(inverseDetails,'المصنع',model.context.plantCode || '—');
      inventoryReviewAppendDetail(inverseDetails,'المخزن',model.context.warehouseCode || '—');
      inventoryReviewAppendDetail(inverseDetails,'تاريخ الجرد',formatDisplayDate(model.context.inventoryDate,'—'));
      inverse.append(inverseDetails);
      inverse.append(inventoryReviewCreateElement('p','inventory-review-inverse-text',`يوجد فرق جرد عكسي في الصنف ${candidate.row?.material_code || '—'} — ${candidate.row?.material_name || '—'} بقيمة ${formatInventoryReviewQuantity(candidate.variance,true)} طن، بنسبة تطابق ${candidate.matchPercentage.toFixed(2)}%. راجع كارت الصنفين؛ ربما يكون الفرق ناتجًا عن خطأ في تسجيل البيع أو التحويلات أو تسجيل حركة على كود صنف غير صحيح.`));
    }else{
      inverse.append(inventoryReviewCreateElement('p','inventory-review-no-inverse','لم يتم العثور داخل نسخة الجرد الحالية على صنف آخر يحتوي فرق جرد عكسي يمكن مطابقته مع هذا الفرق.'));
    }
    body.append(inverse);
  }
}
function activateInventoryReviewModalTab(modal,tabName){
  const selected=tabName==='history'?'history':'recommendations';
  modal?.querySelectorAll('[data-inventory-review-tab]').forEach(tab=>{
    const active=tab.dataset.inventoryReviewTab===selected;
    tab.setAttribute('aria-selected',active?'true':'false');tab.classList.toggle('is-active',active);
  });
  modal?.querySelectorAll('[data-inventory-review-panel]').forEach(panel=>{panel.hidden=panel.dataset.inventoryReviewPanel!==selected;});
}
function configureInventoryReviewModalMode(modal,hasSettlementHistory){
  if(!modal) return;
  const postSettlement=Boolean(hasSettlementHistory);
  modal.classList.toggle('is-post-settlement',postSettlement);
  const title=modal.querySelector('#inventoryReviewRecommendationsTitle');
  const eyebrow=modal.querySelector('.inventory-review-eyebrow');
  const close=modal.querySelector('.inventory-review-icon-close');
  const recommendationsTab=modal.querySelector('[data-inventory-review-tab="recommendations"]');
  const historyTab=modal.querySelector('[data-inventory-review-tab="history"]');
  if(title) title.textContent=postSettlement ? 'ملاحظات بعد التسوية' : 'توصيات المراجعة';
  if(eyebrow) eyebrow.textContent=postSettlement ? 'السجل الكامل للصنف' : 'الجرد وتوثيق المخزون';
  if(close) close.setAttribute('aria-label',postSettlement ? 'إغلاق نافذة ملاحظات ما بعد التسوية' : 'إغلاق نافذة توصيات المراجعة');
  if(recommendationsTab) recommendationsTab.textContent='توصيات المراجعة';
  if(historyTab) historyTab.textContent='سجل التسويات والتراجعات';
}
function inventoryReviewLineHasSettlementHistory(contextLine){
  if(!contextLine) return false;
  return Boolean(
    contextLine.active_settlement_id
    || contextLine.latest_settlement_id
    || contextLine.latest_reversal_id
    || ['active','reversed'].includes(String(contextLine.current_state || ''))
  );
}
function inventoryAuditHistoryStatusMessage(status){
  return ({not_authenticated:'يجب تسجيل الدخول أولًا.',inactive_user:'الحساب الحالي غير نشط.',permission_denied:'لا تملك صلاحية عرض سجل الصنف.',line_not_found:'تعذر العثور على الصنف في نسخة الجرد الحالية.'})[String(status || '')] || 'تعذر تحميل سجل التسويات والتراجعات.';
}
function inventoryAuditHistoryAppendValue(parent,label,value){
  const item=inventoryReviewCreateElement('div','inventory-review-history-value');
  item.append(inventoryReviewCreateElement('span','',label));item.append(inventoryReviewCreateElement('strong','',value));parent.append(item);
}
function renderInventoryCountLineAuditHistory(modal,data){
  const panel=modal?.querySelector('.inventory-review-history-panel');const status=panel?.querySelector('.inventory-review-history-status');const timeline=panel?.querySelector('.inventory-review-timeline');
  if(!panel || !status || !timeline) return;
  timeline.replaceChildren();const events=Array.isArray(data?.timeline)?data.timeline:[];
  if(events.length){
    configureInventoryReviewModalMode(modal,true);
    if(modal.dataset.inventoryReviewAutoHistory==='1') activateInventoryReviewModalTab(modal,'history');
  }
  status.textContent=events.length?'السجل مرتب من الأحدث إلى الأقدم.':'لم يتم تنفيذ أي تسوية أو تراجع على هذا الصنف حتى الآن.';status.classList.remove('is-error');
  const labels={opening_balance:'رصيد أول',production_quantity:'الإنتاج',incoming_transfers:'التحويلات الواردة',actual_returns:'المرتجع الفعلي',adjustment_increase_z22:'تسوية زيادة Z22',adjustment_shortage_z21:'تسوية عجز Z21',sales_quantity:'كمية البيع',outgoing_transfers:'التحويلات الصادرة',rework_311:'إعادة التصنيع 311',book_balance:'الرصيد الدفتري',physical_balance:'الرصيد الفعلي',inventory_variance:'فرق الجرد',oldest_quantity:'كمية أقدم تاريخ',oldest_date:'أقدم تاريخ',inventory_counter_name_snapshot:'القائم بالجرد',inventory_counter_job_title_snapshot:'وظيفة القائم بالجرد'};
  events.forEach((event,index)=>{
    const reversal=event?.event_type==='reversal';const card=inventoryReviewCreateElement('article','inventory-review-timeline-event '+(reversal?'is-reversal':'is-settlement'));const header=inventoryReviewCreateElement('header','inventory-review-timeline-head');
    header.append(inventoryReviewCreateElement('span','inventory-review-event-badge',reversal?'تراجع':'تسوية'));header.append(inventoryReviewCreateElement('strong','',`العملية ${events.length-index}`));header.append(inventoryReviewCreateElement('time','',formatDisplayDateTime(event?.occurred_at,'—')));card.append(header);
    const meta=inventoryReviewCreateElement('div','inventory-review-history-meta');
    inventoryAuditHistoryAppendValue(meta,'المنفذ',event?.performed_by || '—');inventoryAuditHistoryAppendValue(meta,'السبب',reversal?(event?.reversal_reason || '—'):(event?.reason_label || '—'));inventoryAuditHistoryAppendValue(meta,'الحقل المستهدف',inventorySettlementTargetFieldLabel(event?.target_field));inventoryAuditHistoryAppendValue(meta,'طريقة التسوية',inventorySettlementMethodLabel(event?.reconciliation_method));inventoryAuditHistoryAppendValue(meta,'إصدار السطر',`${event?.row_version_before ?? '—'} ← ${event?.row_version_after ?? '—'}`);inventoryAuditHistoryAppendValue(meta,'مستند الفروق',event?.snapshot_number || event?.snapshot_id || '—');card.append(meta);
    if(!reversal && event?.action_text){const action=inventoryReviewCreateElement('p','inventory-review-history-action');action.append(inventoryReviewCreateElement('span','','الإجراء: '));action.append(document.createTextNode(String(event.action_text)));card.append(action);}
    if(reversal) card.append(inventoryReviewCreateElement('p','inventory-review-history-related',`التسوية المرتبطة: ${event?.related_settlement_id || '—'}`));
    const comparison=inventoryReviewCreateElement('div','inventory-review-history-comparison');
    if(!reversal && event?.correction_quantity != null){
      const primary=inventoryReviewCreateElement('section','');
      primary.append(inventoryReviewCreateElement('h4','','تصحيح التحميل'));
      inventoryAuditHistoryAppendValue(primary,'كمية التحميل الخاطئ',formatInventoryCountThreeDecimalQuantity(event.correction_quantity)+' طن');
      inventoryAuditHistoryAppendValue(primary,'المرحلة الأولى',inventorySettlementMethodLabel(event.primary_reconciliation_method));
      inventoryAuditHistoryAppendValue(primary,'الحقول المعدلة',inventorySettlementTargetFieldLabel(event.primary_target_field));
      if(event.primary_target_field === 'outgoing_transfers+incoming_transfers' || event.primary_target_field === 'multiple'){
        inventoryAuditHistoryAppendValue(primary,'التحويلات الصادرة',`${formatInventoryCountThreeDecimalQuantity(event.before?.outgoing_transfers)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.outgoing_transfers)}`);
        inventoryAuditHistoryAppendValue(primary,'التحويلات الواردة',`${formatInventoryCountThreeDecimalQuantity(event.before?.incoming_transfers)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.incoming_transfers)}`);
      } else if (event.primary_target_field === 'outgoing_transfers'){
        inventoryAuditHistoryAppendValue(primary,'التحويلات الصادرة',`${formatInventoryCountThreeDecimalQuantity(event.before?.outgoing_transfers)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.outgoing_transfers)}`);
      } else if (event.primary_target_field === 'sales_quantity'){
        inventoryAuditHistoryAppendValue(primary,'كمية البيع',`${formatInventoryCountThreeDecimalQuantity(event.before?.sales_quantity)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.sales_quantity)}`);
      }
      inventoryAuditHistoryAppendValue(primary,'الرصيد الدفتري (قبل)',formatInventoryCountThreeDecimalQuantity(event.before?.book_balance));
      inventoryAuditHistoryAppendValue(primary,'الرصيد الدفتري (بعد المرحلة الأولى)',formatInventoryCountThreeDecimalQuantity(event.book_balance_after_primary));
      inventoryAuditHistoryAppendValue(primary,'فرق الجرد المتبقي',formatInventoryCountThreeDecimalQuantity(event.residual_variance_after_primary));
      const secondary=inventoryReviewCreateElement('section','');
      secondary.append(inventoryReviewCreateElement('h4','','تسوية الفرق المتبقي'));
      inventoryAuditHistoryAppendValue(secondary,'المرحلة الثانية',inventorySettlementMethodLabel(event.secondary_reconciliation_method));
      inventoryAuditHistoryAppendValue(secondary,'الحقل الثانوي',inventorySettlementTargetFieldLabel(event.secondary_target_field));
      if(event.secondary_target_field === 'production_quantity'){
        inventoryAuditHistoryAppendValue(secondary,'الإنتاج',`${formatInventoryCountThreeDecimalQuantity(event.before?.production_quantity)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.production_quantity)}`);
      }else if(event.secondary_target_field === 'physical_balance'){
        inventoryAuditHistoryAppendValue(secondary,'الرصيد الفعلي',`${formatInventoryCountThreeDecimalQuantity(event.before?.physical_balance)} ← ${formatInventoryCountThreeDecimalQuantity(event.after?.physical_balance)}`);
      }
      inventoryAuditHistoryAppendValue(secondary,'الرصيد الدفتري النهائي',formatInventoryCountThreeDecimalQuantity(event.after?.book_balance));
      inventoryAuditHistoryAppendValue(secondary,'الرصيد الفعلي النهائي',formatInventoryCountThreeDecimalQuantity(event.after?.physical_balance));
      inventoryAuditHistoryAppendValue(secondary,'فرق الجرد النهائي',formatInventoryCountThreeDecimalQuantity(event.after?.inventory_variance));
      comparison.append(primary,secondary);
    } else {
      const before=inventoryReviewCreateElement('section','');before.append(inventoryReviewCreateElement('h4','','قبل'));
      const after=inventoryReviewCreateElement('section','');after.append(inventoryReviewCreateElement('h4','','بعد'));
      Object.entries(labels).forEach(([key,label])=>{inventoryAuditHistoryAppendValue(before,label,formatInventoryAuditHistoryValue(key,event?.before?.[key]));inventoryAuditHistoryAppendValue(after,label,formatInventoryAuditHistoryValue(key,event?.after?.[key]));});
      comparison.append(before,after);
    }
    card.append(comparison);timeline.append(card);
  });
}
async function loadInventoryCountLineAuditHistory(lineId,versionId,modal){
  const seq=++INVENTORY_COUNT_STATE.auditHistoryRequestSeq;INVENTORY_COUNT_STATE.auditHistoryLineId=String(lineId || '');INVENTORY_COUNT_STATE.auditHistoryVersionId=String(versionId || '');
  const status=modal?.querySelector('.inventory-review-history-status');const timeline=modal?.querySelector('.inventory-review-timeline');if(status){status.textContent='جاري تحميل سجل الصنف...';status.classList.remove('is-error');}timeline?.replaceChildren();
  try{
    const {data,error}=await WarehouseDB.client.rpc('get_inventory_count_line_audit_history',{p_line_id:lineId,p_version_id:versionId});if(error) throw error;
    if(seq!==INVENTORY_COUNT_STATE.auditHistoryRequestSeq || !modal?.isConnected) return;
    if(String(INVENTORY_COUNT_STATE.versionId || '')!==String(versionId) || String(INVENTORY_COUNT_STATE.auditHistoryLineId || '')!==String(lineId) || String(modal.dataset.inventoryReviewVersionId || '')!==String(versionId)) return;
    if(data?.status!=='ok') throw new Error(inventoryAuditHistoryStatusMessage(data?.status));if(String(data?.line?.id || '')!==String(lineId)) return;renderInventoryCountLineAuditHistory(modal,data);
  }catch(err){
    if(seq!==INVENTORY_COUNT_STATE.auditHistoryRequestSeq || !modal?.isConnected) return;const message=err?.message || 'تعذر تحميل سجل التسويات والتراجعات.';if(status){status.textContent=message;status.classList.add('is-error');}timeline?.replaceChildren();
  }
}

function openInventoryReviewRecommendationsModal(lineId,versionId,triggerCell){
  const requestedLineId=String(lineId || '').trim();
  const requestedVersionId=String(versionId || '').trim();
  const currentVersionId=String(INVENTORY_COUNT_STATE.versionId || '').trim();
  if(!requestedLineId || !requestedVersionId || requestedVersionId!==currentVersionId) return;
  if(inventoryCountLineHasActiveSave(requestedLineId)){
    showInventoryCountToast('انتظر اكتمال حفظ بيانات الصنف.','warning');
    return;
  }
  const latestRow=(INVENTORY_COUNT_STATE.lines || []).find(row=>String(row?.id || '')===requestedLineId);
  if(!latestRow){ showInventoryCountToast('تعذر العثور على بيانات الصنف الحالية.','warning'); return; }
  closeInventoryReviewRecommendationsModal({restoreFocus:false});
  const contextValues=inventoryCountReadInputs();
  const context={
    ...contextValues,
    versionId:currentVersionId,
    currentUserName:getCurrentInventoryReviewerName()
  };
  const model=buildInventoryReviewRecommendations(latestRow,INVENTORY_COUNT_STATE.lines || [],context);
  const modal=ensureInventoryReviewRecommendationsModal();
  const settlementContext=inventorySettlementContextLine(requestedLineId);
  const hasSettlementHistory=inventoryReviewLineHasSettlementHistory(settlementContext);
  modal._inventoryReviewReturnFocus=triggerCell || null;
  modal.dataset.inventoryReviewVersionId=currentVersionId;
  modal.dataset.inventoryReviewLineId=requestedLineId;
  modal.dataset.inventoryReviewAutoHistory=hasSettlementHistory ? '1' : '0';
  renderInventoryReviewRecommendationsModal(modal,model);
  configureInventoryReviewModalMode(modal,hasSettlementHistory);
  activateInventoryReviewModalTab(modal,hasSettlementHistory ? 'history' : 'recommendations');
  loadInventoryCountLineAuditHistory(requestedLineId,currentVersionId,modal);
  modal._appModalClose=closeInventoryReviewRecommendationsModal;
  lockAppModalScroll('inventoryReviewRecommendationsModal',modal);
  requestAnimationFrame(()=>{
    const preferred=hasSettlementHistory
      ? modal.querySelector('[data-inventory-review-tab="history"]')
      : modal.querySelector('.inventory-review-icon-close');
    preferred?.focus({preventScroll:true});
  });
}
function closeInventoryReviewRecommendationsModal(options={}){
  const modal=$('#inventoryReviewRecommendationsModal');
  if(!modal) return;
  const returnFocus=modal._inventoryReviewReturnFocus;
  INVENTORY_COUNT_STATE.auditHistoryRequestSeq++;
  INVENTORY_COUNT_STATE.auditHistoryLineId=null;
  INVENTORY_COUNT_STATE.auditHistoryVersionId=null;
  unlockAppModalScroll('inventoryReviewRecommendationsModal');
  modal.replaceChildren();
  modal.remove();
  if(options.restoreFocus!==false && returnFocus?.isConnected){
    requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
  }
}
function renderInventoryReviewTriggerCell(row,key,label){
  const value=row?.[key];
  const display=formatInventoryCountText(value);
  if(value===null || value===undefined || String(value).trim()==='') return `<td>${display}</td>`;
  const lineId=escapeHtml(String(row?.id || ''));
  const versionId=escapeHtml(String(INVENTORY_COUNT_STATE.versionId || ''));
  const ariaLabel=escapeHtml(`${label}: ${String(value)}. فتح توصيات المراجعة`);
  return `<td data-inventory-review-line-id="${lineId}" data-inventory-review-version-id="${versionId}" tabindex="0" role="button" aria-label="${ariaLabel}">${display}</td>`;
}
function initInventoryReviewRecommendations(){
  const table=$('#inventoryCountLinesTable');
  if(!table || table.dataset.inventoryReviewBound==='1') return;
  table.dataset.inventoryReviewBound='1';
  const handleActivation=event=>{
    if(event.target.closest('input,select,button,textarea,a')) return;
    const cell=event.target.closest('tbody td[data-inventory-review-line-id][data-inventory-review-version-id]');
    if(!cell || !table.contains(cell)) return;
    if(event.type==='keydown'){
      if(event.key!=='Enter' && event.key!==' ') return;
      event.preventDefault();
    }
    openInventoryReviewRecommendationsModal(
      cell.dataset.inventoryReviewLineId,
      cell.dataset.inventoryReviewVersionId,
      cell
    );
  };
  table.addEventListener('click',handleActivation);
  table.addEventListener('keydown',handleActivation);
}
function inventoryCountVarianceState(value){
  const n=Number(value);
  if(!Number.isFinite(n) || Math.abs(n)<0.0005) return 'match';
  return n<0 ? 'shortage' : 'surplus';
}
function inventoryCountVarianceTitle(value){
  const state=inventoryCountVarianceState(value);
  if(state==='shortage') return '\u0641\u0631\u0642 \u0639\u062c\u0632';
  if(state==='surplus') return '\u0641\u0631\u0642 \u0632\u064a\u0627\u062f\u0629';
  return '\u0645\u0637\u0627\u0628\u0642';
}
function renderInventoryVarianceCell(value){
  const state=inventoryCountVarianceState(value);
  return `<td class="inventory-variance-cell inventory-variance-${state}" title="${escapeHtml(inventoryCountVarianceTitle(value))}">${formatInventoryCountThreeDecimalQuantity(value)}</td>`;
}
function inventoryCountTotalNumber(value){
  if(value===null || value===undefined || value==='') return 0;
  const n=Number(value);
  return Number.isFinite(n) ? n : 0;
}
function inventoryCountReviewerName(){
  return String(INVENTORY_COUNT_STATE.reviewerName || '—').trim() || '—';
}
function setInventoryCountReviewerFromResult(data){
  INVENTORY_COUNT_STATE.reviewerUserId=data?.reviewer_user_id || null;
  INVENTORY_COUNT_STATE.reviewerName=String(data?.reviewer_name || '—').trim() || '—';
  updateInventoryCountReviewerFooter();
}
function updateInventoryCountReviewerFooter(){
  const footer=$('#inventoryCountReviewerFooter');
  if(!footer) return;
  footer.textContent=`القائم بالمراجعة / ${inventoryCountReviewerName()}`;
}
function renderInventoryCountTotals(rows=[]){
  const tfoot=$('#inventoryCountLinesTable tfoot');
  if(!tfoot) return;
  if(!rows.length){
    tfoot.innerHTML='';
    updateInventoryCountReviewerFooter();
    return;
  }
  const total=key=>rows.reduce((sum,row)=>sum+inventoryCountTotalNumber(row?.[key]),0);
  tfoot.innerHTML=`<tr class="inventory-count-total-row">
    <td>الإجمالي</td>
    <td></td>
    <td></td>
    <td>${formatInventoryOpeningBalance(total('opening_balance'))}</td>
    <td>${formatInventoryCountMovementQuantity(total('production_quantity'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('incoming_transfers'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('actual_returns'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('adjustment_increase_z22'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('adjustment_shortage_z21'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('sales_quantity'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('outgoing_transfers'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('rework_311'))}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(total('book_balance'))}</td>
    <td>${formatInventoryCountMovementQuantity(total('physical_balance'))}</td>
    ${renderInventoryVarianceCell(total('inventory_variance'))}
    <td>${formatInventoryCountMovementQuantity(total('oldest_quantity'))}</td>
    <td></td>
    <td></td>
    <td></td>
  </tr>`;
  updateInventoryCountReviewerFooter();
  applyInventoryCountColumnVisibility();
}
function inventoryCountAllColumnKeys(){
  return INVENTORY_COUNT_COLUMNS.map(column=>column.key);
}
function inventoryCountSanitizeVisibleColumnKeys(keys){
  const valid=new Set(inventoryCountAllColumnKeys());
  const incoming=Array.isArray(keys) ? keys : inventoryCountAllColumnKeys();
  const result=[];
  INVENTORY_COUNT_COLUMNS.forEach(column=>{
    if(column.required || incoming.includes(column.key)) result.push(column.key);
  });
  INVENTORY_COUNT_REQUIRED_COLUMN_KEYS.forEach(key=>{
    if(valid.has(key) && !result.includes(key)) result.push(key);
  });
  return result.length ? result : inventoryCountAllColumnKeys();
}
function inventoryCountReadVisibleColumnKeys(){
  try{
    const raw=window.localStorage?.getItem(INVENTORY_COUNT_VISIBLE_COLUMNS_STORAGE_KEY);
    if(!raw) return inventoryCountAllColumnKeys();
    const parsed=JSON.parse(raw);
    return inventoryCountSanitizeVisibleColumnKeys(parsed);
  }catch(_){
    return inventoryCountAllColumnKeys();
  }
}
function inventoryCountSaveVisibleColumnKeys(keys){
  const sanitized=inventoryCountSanitizeVisibleColumnKeys(keys);
  try{ window.localStorage?.setItem(INVENTORY_COUNT_VISIBLE_COLUMNS_STORAGE_KEY,JSON.stringify(sanitized)); }catch(_){ }
  INVENTORY_COUNT_STATE.visibleColumnKeys=sanitized;
  return sanitized;
}
function inventoryCountVisibleColumnKeys(){
  if(!Array.isArray(INVENTORY_COUNT_STATE.visibleColumnKeys)) INVENTORY_COUNT_STATE.visibleColumnKeys=inventoryCountReadVisibleColumnKeys();
  return inventoryCountSanitizeVisibleColumnKeys(INVENTORY_COUNT_STATE.visibleColumnKeys);
}
function inventoryCountVisibleColumnSet(){
  return new Set(inventoryCountVisibleColumnKeys());
}
function inventoryCountVisibleColumnCount(){
  return inventoryCountVisibleColumnKeys().length;
}
function inventoryCountVisibleColumnIndexes(){
  const visible=inventoryCountVisibleColumnSet();
  return INVENTORY_COUNT_COLUMNS.map((column,index)=>visible.has(column.key) ? index : -1).filter(index=>index>=0);
}
function inventoryCountFilterVisibleColumns(values){
  const indexes=inventoryCountVisibleColumnIndexes();
  return indexes.map(index=>values[index]);
}
function applyInventoryCountColumnKeys(){
  const table=$('#inventoryCountLinesTable');
  if(!table) return;
  const rows=[];
  if(table.tHead) rows.push(...table.tHead.rows);
  table.tBodies && [...table.tBodies].forEach(body=>rows.push(...body.rows));
  if(table.tFoot) rows.push(...table.tFoot.rows);
  rows.forEach(row=>{
    if(row.cells.length!==INVENTORY_COUNT_COLUMNS.length) return;
    [...row.cells].forEach((cell,index)=>{
      const column=INVENTORY_COUNT_COLUMNS[index];
      if(!column) return;
      cell.dataset.inventoryColumnKey=column.key;
      cell.classList.add('inventory-count-column-cell',`inventory-count-column-${column.key}`);
    });
  });
}
function applyInventoryCountColumnVisibility(keys=null){
  const table=$('#inventoryCountLinesTable');
  if(!table) return;
  const visible=new Set(inventoryCountSanitizeVisibleColumnKeys(keys || inventoryCountVisibleColumnKeys()));
  INVENTORY_COUNT_STATE.visibleColumnKeys=[...visible].filter(key=>INVENTORY_COUNT_COLUMNS.some(column=>column.key===key));
  applyInventoryCountColumnKeys();
  table.querySelectorAll('[data-inventory-column-key]').forEach(cell=>{
    const key=cell.dataset.inventoryColumnKey;
    cell.classList.toggle('inventory-count-column-hidden',!visible.has(key));
  });
  table.querySelectorAll('tbody .empty-state').forEach(cell=>{ cell.colSpan=visible.size; });
  renderInventoryCountColumnManagerOptions();
  updateInventoryCountFreezePanes();
}
function inventoryCountNormalizeText(value){
  return String(value ?? '').trim().toLocaleLowerCase('ar');
}
function inventoryCountFilterValue(row,key){
  if(key==='inventory_variance_state') return inventoryCountVarianceState(row?.inventory_variance);
  if(key==='inventory_counter') return String(row?.inventory_counter_name_snapshot || '').trim();
  return row?.[key];
}
function inventoryCountLineMatchesFilters(row,filters=INVENTORY_COUNT_STATE.columnFilters || {}){
  return Object.entries(filters || {}).every(([key,raw])=>{
    const value=String(raw ?? '').trim();
    if(!value) return true;
    if(key==='oldest_date_from'){
      const iso=formatInventoryDateInputValue(row?.oldest_date);
      return !!iso && iso>=value;
    }
    if(key==='oldest_date_to'){
      const iso=formatInventoryDateInputValue(row?.oldest_date);
      return !!iso && iso<=value;
    }
    if(key==='inventory_variance_state') return inventoryCountVarianceState(row?.inventory_variance)===value;
    if(INVENTORY_COUNT_SORT_COLUMNS[key]==='number'){
      const n=Number(row?.[key]);
      const target=Number(value);
      if(!Number.isFinite(target)) return true;
      return Number.isFinite(n) && Math.abs(n-target)<0.0005;
    }
    const source=inventoryCountNormalizeText(inventoryCountFilterValue(row,key));
    return source.includes(inventoryCountNormalizeText(value));
  });
}
function inventoryCountSortValue(row,key){
  const type=INVENTORY_COUNT_SORT_COLUMNS[key];
  const value=row?.[key];
  if(type==='number'){
    if(value===null || value===undefined || value==='') return null;
    const n=Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if(type==='date'){
    const iso=formatInventoryDateInputValue(value);
    return iso || null;
  }
  return inventoryCountNormalizeText(value);
}
function inventoryCountCompareRows(a,b,key,direction){
  const type=INVENTORY_COUNT_SORT_COLUMNS[key];
  const av=inventoryCountSortValue(a,key);
  const bv=inventoryCountSortValue(b,key);
  if(av===null && bv===null) return 0;
  if(av===null) return 1;
  if(bv===null) return -1;
  let result=0;
  if(type==='number') result=av-bv;
  else result=String(av).localeCompare(String(bv),'ar',{numeric:true,sensitivity:'base'});
  return direction==='desc' ? -result : result;
}
function inventoryCountDisplayRows(rows=[]){
  const filters=INVENTORY_COUNT_STATE.columnFilters || {};
  const sortKey=INVENTORY_COUNT_STATE.sortKey || '';
  const direction=INVENTORY_COUNT_STATE.sortDirection==='desc' ? 'desc' : 'asc';
  const output=(rows || []).filter(row=>inventoryCountLineMatchesFilters(row,filters));
  if(sortKey && INVENTORY_COUNT_SORT_COLUMNS[sortKey]) output.sort((a,b)=>inventoryCountCompareRows(a,b,sortKey,direction));
  return output;
}
function inventoryCountFilterControlValue(control){
  return String(control?.value ?? '').trim();
}
function inventoryCountColumnFilterControls(){
  return [...document.querySelectorAll('#inventoryCountLinesTable thead .inventory-count-column-filter, #inventoryCountMobileFilterPanel .inventory-count-column-filter')];
}
function inventoryCountSetColumnFilter(key,value){
  if(!INVENTORY_COUNT_STATE.columnFilters || typeof INVENTORY_COUNT_STATE.columnFilters!=='object') INVENTORY_COUNT_STATE.columnFilters={};
  const text=String(value ?? '').trim();
  if(text) INVENTORY_COUNT_STATE.columnFilters[key]=text;
  else delete INVENTORY_COUNT_STATE.columnFilters[key];
}
function syncInventoryCountFilterControls(){
  const filters=INVENTORY_COUNT_STATE.columnFilters || {};
  inventoryCountColumnFilterControls().forEach(control=>{
    const key=control.dataset.inventoryFilterKey;
    if(key && control.value!==String(filters[key] || '')) control.value=String(filters[key] || '');
  });
}
function syncInventoryCountSortIndicators(){
  const sortKey=INVENTORY_COUNT_STATE.sortKey || '';
  const direction=INVENTORY_COUNT_STATE.sortDirection==='desc' ? 'desc' : 'asc';
  document.querySelectorAll('#inventoryCountLinesTable .inventory-count-sort-btn').forEach(btn=>{
    const active=btn.dataset.inventorySortKey===sortKey;
    btn.classList.toggle('is-sorted',active);
    btn.dataset.sortDirection=active ? direction : '';
    btn.setAttribute('aria-sort',active ? (direction==='desc' ? 'descending' : 'ascending') : 'none');
  });
}
function syncInventoryCountSearchControls(){
  syncInventoryCountFilterControls();
  syncInventoryCountSortIndicators();
}
function resetInventoryCountSearchSort(){
  INVENTORY_COUNT_STATE.searchText='';
  INVENTORY_COUNT_STATE.columnFilters={};
  INVENTORY_COUNT_STATE.sortKey='';
  INVENTORY_COUNT_STATE.sortDirection='asc';
  syncInventoryCountSearchControls();
  renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
}
function initInventoryCountSearchSortControls(){
  const table=$('#inventoryCountLinesTable');
  const reset=$('#inventoryCountClearFiltersBtn');
  if(!table || table.dataset.inventoryCountFilterBound==='1') return;
  table.dataset.inventoryCountFilterBound='1';
  table.addEventListener('input',event=>{
    const control=event.target.closest('.inventory-count-column-filter');
    if(!control || !table.contains(control)) return;
    inventoryCountSetColumnFilter(control.dataset.inventoryFilterKey,inventoryCountFilterControlValue(control));
    syncInventoryCountFilterControls();
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  });
  table.addEventListener('change',event=>{
    const control=event.target.closest('.inventory-count-column-filter');
    if(!control || !table.contains(control)) return;
    inventoryCountSetColumnFilter(control.dataset.inventoryFilterKey,inventoryCountFilterControlValue(control));
    syncInventoryCountFilterControls();
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  });
  table.addEventListener('click',event=>{
    const sortBtn=event.target.closest('.inventory-count-sort-btn[data-inventory-sort-key]');
    if(sortBtn && table.contains(sortBtn)){
      event.preventDefault();
      const key=sortBtn.dataset.inventorySortKey;
      if(INVENTORY_COUNT_STATE.sortKey!==key){
        INVENTORY_COUNT_STATE.sortKey=key;
        INVENTORY_COUNT_STATE.sortDirection='asc';
      }else if(INVENTORY_COUNT_STATE.sortDirection==='asc'){
        INVENTORY_COUNT_STATE.sortDirection='desc';
      }else{
        INVENTORY_COUNT_STATE.sortKey='';
        INVENTORY_COUNT_STATE.sortDirection='asc';
      }
      syncInventoryCountSortIndicators();
      renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
      return;
    }
    const clearBtn=event.target.closest('#inventoryCountClearFiltersBtn');
    if(clearBtn && table.contains(clearBtn)){
      event.preventDefault();
      resetInventoryCountSearchSort();
    }
  });
  reset?.addEventListener('click',event=>{ event.preventDefault(); resetInventoryCountSearchSort(); });
  syncInventoryCountSearchControls();
}
function inventoryCountColumnManagerDraftSet(){
  if(!(INVENTORY_COUNT_STATE.columnManagerDraftKeys instanceof Set)){
    INVENTORY_COUNT_STATE.columnManagerDraftKeys=new Set(inventoryCountVisibleColumnKeys());
  }
  INVENTORY_COUNT_REQUIRED_COLUMN_KEYS.forEach(key=>INVENTORY_COUNT_STATE.columnManagerDraftKeys.add(key));
  return INVENTORY_COUNT_STATE.columnManagerDraftKeys;
}
function renderInventoryCountColumnManagerOptions(){
  const panel=$('#inventoryCountColumnManagerPanel');
  if(!panel || panel.hidden) return;
  const draft=inventoryCountColumnManagerDraftSet();
  const list=panel.querySelector('.inventory-count-column-list');
  if(!list) return;
  list.innerHTML=INVENTORY_COUNT_COLUMNS.map(column=>{
    const checked=draft.has(column.key) || column.required;
    const disabled=column.required ? ' disabled title="عمود أساسي لا يمكن إخفاؤه"' : '';
    return `<label class="inventory-count-column-option${column.required ? ' is-required' : ''}"><input type="checkbox" data-column-key="${escapeHtml(column.key)}"${checked ? ' checked' : ''}${disabled}><span>${escapeHtml(column.label)}</span></label>`;
  }).join('');
}
function openInventoryCountColumnManager(){
  const panel=$('#inventoryCountColumnManagerPanel');
  const btn=$('#inventoryCountColumnManagerBtn');
  if(!panel || !btn) return;
  INVENTORY_COUNT_STATE.columnManagerDraftKeys=new Set(inventoryCountVisibleColumnKeys());
  panel.hidden=false;
  panel.setAttribute('aria-hidden','false');
  btn.setAttribute('aria-expanded','true');
  if(!panel.dataset.rendered){
    panel.dataset.rendered='1';
    panel.innerHTML=`<div class="inventory-count-column-panel-head"><strong>إدارة الأعمدة</strong><button type="button" class="inventory-count-column-close" data-column-manager-action="cancel" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div><div class="inventory-count-column-list"></div><div class="inventory-count-column-actions"><button type="button" class="secondary" data-column-manager-action="show-all">إظهار الكل</button><button type="button" class="secondary" data-column-manager-action="default">استعادة الافتراضي</button><button type="button" class="secondary" data-column-manager-action="cancel">إلغاء</button><button type="button" class="primary" data-column-manager-action="apply">تطبيق</button></div>`;
  }
  renderInventoryCountColumnManagerOptions();
  requestAnimationFrame(()=>panel.querySelector('input:not(:disabled),button')?.focus({preventScroll:true}));
}
function closeInventoryCountColumnManager(applyChanges=false){
  const panel=$('#inventoryCountColumnManagerPanel');
  const btn=$('#inventoryCountColumnManagerBtn');
  if(!panel) return;
  if(applyChanges){
    inventoryCountSaveVisibleColumnKeys([...inventoryCountColumnManagerDraftSet()]);
  }else{
    INVENTORY_COUNT_STATE.visibleColumnKeys=inventoryCountReadVisibleColumnKeys();
  }
  INVENTORY_COUNT_STATE.columnManagerDraftKeys=null;
  applyInventoryCountColumnVisibility();
  panel.hidden=true;
  panel.setAttribute('aria-hidden','true');
  btn?.setAttribute('aria-expanded','false');
}
function initInventoryCountColumnManager(){
  const btn=$('#inventoryCountColumnManagerBtn');
  const panel=$('#inventoryCountColumnManagerPanel');
  if(!btn || !panel || btn.dataset.columnManagerBound==='1') return;
  btn.dataset.columnManagerBound='1';
  INVENTORY_COUNT_STATE.visibleColumnKeys=inventoryCountReadVisibleColumnKeys();
  btn.addEventListener('click',event=>{
    event.preventDefault();
    if(panel.hidden) openInventoryCountColumnManager();
    else closeInventoryCountColumnManager(false);
  });
  panel.addEventListener('change',event=>{
    const checkbox=event.target.closest('input[type="checkbox"][data-column-key]');
    if(!checkbox) return;
    const key=checkbox.dataset.columnKey;
    const draft=inventoryCountColumnManagerDraftSet();
    if(INVENTORY_COUNT_REQUIRED_COLUMN_KEYS.has(key)){
      checkbox.checked=true;
      showInventoryCountToast('عمود أساسي لا يمكن إخفاؤه','warning');
      return;
    }
    if(checkbox.checked) draft.add(key);
    else draft.delete(key);
    INVENTORY_COUNT_REQUIRED_COLUMN_KEYS.forEach(requiredKey=>draft.add(requiredKey));
    applyInventoryCountColumnVisibility([...draft]);
  });
  panel.addEventListener('click',event=>{
    const action=event.target.closest('[data-column-manager-action]')?.dataset.columnManagerAction;
    if(!action) return;
    event.preventDefault();
    if(action==='apply') closeInventoryCountColumnManager(true);
    if(action==='cancel') closeInventoryCountColumnManager(false);
    if(action==='show-all' || action==='default'){
      INVENTORY_COUNT_STATE.columnManagerDraftKeys=new Set(inventoryCountAllColumnKeys());
      applyInventoryCountColumnVisibility([...INVENTORY_COUNT_STATE.columnManagerDraftKeys]);
    }
  });
  document.addEventListener('click',event=>{
    if(panel.hidden) return;
    if(panel.contains(event.target) || btn.contains(event.target)) return;
    closeInventoryCountColumnManager(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape' && !panel.hidden) closeInventoryCountColumnManager(false);
  });
  applyInventoryCountColumnKeys();
  applyInventoryCountColumnVisibility();
}
function inventoryCountImportantToast(message,type){
  const text=String(message || '');
  return type==='error' || type==='warning' || /لا يوجد|لا توجد|لا يمكن|غير متاح|غير مسموح|صلاحية|تعارض|modified by another user|Reload and try again|فشل|تعذر|مطلوب|ليست/.test(text);
}
function inventoryCountToastIcon(type){
  if(type==='success') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  if(type==='error') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v5"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>';
  if(type==='warning') return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16v-4"/><path d="M12 8h.01"/><circle cx="12" cy="12" r="9"/></svg>';
}
function showInventoryCountToast(message,type='info'){
  const text=String(message || '').trim();
  if(!text) return;
  type = type === 'err' ? 'error' : (type === 'ok' ? 'success' : (type || 'info'));
  const stack=currentActiveSection()==='inventory_differences' ? ($('#inventoryDifferenceToastStack') || $('#inventoryCountToastStack')) : $('#inventoryCountToastStack');
  if(!stack){
    if(window.showToast) window.showToast(text,type==='error'?'error':type);
    return;
  }
  const now=Date.now();
  const duplicate=[...stack.children].find(item=>item.dataset.message===text && now-Number(item.dataset.createdAt||0)<900);
  if(duplicate) return;
  while(stack.children.length>=4) stack.firstElementChild?.remove();
  const toast=document.createElement('div');
  toast.className=`inventory-count-toast inventory-count-toast-${type || 'info'}`;
  toast.dataset.message=text;
  toast.dataset.createdAt=String(now);
  toast.setAttribute('role',type==='error'?'alert':'status');
  toast.innerHTML=`<span class="inventory-count-toast-icon">${inventoryCountToastIcon(type)}</span><span class="inventory-count-toast-text"></span><button type="button" class="inventory-count-toast-close" aria-label="إغلاق"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>`;
  toast.querySelector('.inventory-count-toast-text').textContent=text;
  stack.appendChild(toast);
  requestAnimationFrame(()=>toast.classList.add('is-visible'));
  let remaining=inventoryCountImportantToast(text,type) ? 6000 : 3000;
  let started=Date.now();
  let timer=null;
  const close=()=>{
    window.clearTimeout(timer);
    toast.classList.remove('is-visible');
    toast.classList.add('is-leaving');
    setTimeout(()=>toast.remove(),220);
  };
  const start=()=>{
    started=Date.now();
    window.clearTimeout(timer);
    timer=window.setTimeout(close,remaining);
  };
  toast.addEventListener('mouseenter',()=>{
    remaining=Math.max(600,remaining-(Date.now()-started));
    window.clearTimeout(timer);
  });
  toast.addEventListener('mouseleave',start);
  toast.querySelector('.inventory-count-toast-close')?.addEventListener('click',close);
  start();
}
function inventoryCountExportFileBase(){
  const {inventoryDate,plantCode,warehouseCode}=inventoryCountReadInputs();
  return `Inventory Count-${inventoryDate || inventoryCountTodayIso()}-${plantCode || 'Plant'}-${warehouseCode || 'Warehouse'}`.replace(/[\\/:*?"<>|]/g,'-');
}
function inventoryCountPlain(value){
  if(value===null || value===undefined) return '';
  return String(value).trim();
}
function inventoryCountCounterExportLabel(row){
  const name=inventoryCountPlain(row?.inventory_counter_name_snapshot);
  const job=inventoryCountPlain(row?.inventory_counter_job_title_snapshot);
  return job ? `${name} — ${job}` : name;
}
function inventoryCountExcelNumber(value,emptyValue=''){
  if(value===null || value===undefined || value==='') return emptyValue;
  const n=Number(value);
  return Number.isFinite(n) ? n : emptyValue;
}
function inventoryCountExportHeaders(){
  return INVENTORY_COUNT_COLUMNS.map(column=>column.label);
}
function inventoryCountSettlementExportLabel(){
  return 'غير منفذة';
}
function inventoryCountExportMetaRows(){
  const {inventoryDate,plantCode,warehouseCode}=inventoryCountReadInputs();
  const dayName=inventoryCountSelectedDayName(inventoryDate);
  return [
    ['الجرد وتوثيق المخزون'],
    ['اليوم والتاريخ', dayName ? `${dayName} — ${formatDisplayDate(inventoryDate,'')}` : 'اختر تاريخ الجرد'],
    ['المصنع', plantCode || '—'],
    ['المخزن', warehouseCode || '—'],
    ['رقم الإصدار', INVENTORY_COUNT_STATE.versionNo || '—'],
    ['عدد الأصناف', (INVENTORY_COUNT_STATE.lines || []).length],
    []
  ];
}
function inventoryCountExportDisplayRow(row){
  return [
    inventoryCountPlain(row?.material_code),
    inventoryCountPlain(row?.material_name),
    inventoryCountPlain(row?.uom),
    formatInventoryOpeningBalance(row?.opening_balance),
    formatInventoryProductionQuantity(row?.production_quantity),
    formatInventoryCountThreeDecimalQuantity(row?.incoming_transfers),
    formatInventoryCountThreeDecimalQuantity(row?.actual_returns),
    formatInventoryCountThreeDecimalQuantity(row?.adjustment_increase_z22),
    formatInventoryCountThreeDecimalQuantity(row?.adjustment_shortage_z21),
    formatInventoryCountThreeDecimalQuantity(row?.sales_quantity),
    formatInventoryCountThreeDecimalQuantity(row?.outgoing_transfers),
    formatInventoryCountThreeDecimalQuantity(row?.rework_311),
    formatInventoryCountThreeDecimalQuantity(row?.book_balance),
    formatInventoryManualThreeDecimal(row?.physical_balance),
    formatInventoryCountThreeDecimalQuantity(row?.inventory_variance),
    formatInventoryManualThreeDecimal(row?.oldest_quantity),
    formatDisplayDate(row?.oldest_date,''),
    inventoryCountCounterExportLabel(row),
    inventoryCountSettlementExportLabel(row)
  ];
}
function inventoryCountExportExcelRow(row){
  return [
    inventoryCountPlain(row?.material_code),
    inventoryCountPlain(row?.material_name),
    inventoryCountPlain(row?.uom),
    inventoryCountExcelNumber(row?.opening_balance),
    inventoryCountExcelNumber(row?.production_quantity),
    inventoryCountExcelNumber(row?.incoming_transfers,0),
    inventoryCountExcelNumber(row?.actual_returns,0),
    inventoryCountExcelNumber(row?.adjustment_increase_z22,0),
    inventoryCountExcelNumber(row?.adjustment_shortage_z21,0),
    inventoryCountExcelNumber(row?.sales_quantity,0),
    inventoryCountExcelNumber(row?.outgoing_transfers,0),
    inventoryCountExcelNumber(row?.rework_311,0),
    inventoryCountExcelNumber(row?.book_balance,0),
    inventoryCountExcelNumber(row?.physical_balance),
    inventoryCountExcelNumber(row?.inventory_variance,0),
    inventoryCountExcelNumber(row?.oldest_quantity),
    formatDisplayDate(row?.oldest_date,''),
    inventoryCountCounterExportLabel(row),
    inventoryCountSettlementExportLabel(row)
  ];
}
function inventoryCountExportTotalRow(display=true,sourceRows=null){
  const rows=Array.isArray(sourceRows) ? sourceRows : (INVENTORY_COUNT_STATE.lines || []);
  const total=key=>rows.reduce((sum,row)=>sum+inventoryCountTotalNumber(row?.[key]),0);
  const numeric=value=>display ? formatInventoryCountThreeDecimalQuantity(value) : value;
  return [
    'الإجمالي','','',
    display ? formatInventoryOpeningBalance(total('opening_balance')) : total('opening_balance'),
    display ? formatInventoryProductionQuantity(total('production_quantity')) : total('production_quantity'),
    numeric(total('incoming_transfers')),
    numeric(total('actual_returns')),
    numeric(total('adjustment_increase_z22')),
    numeric(total('adjustment_shortage_z21')),
    numeric(total('sales_quantity')),
    numeric(total('outgoing_transfers')),
    numeric(total('rework_311')),
    numeric(total('book_balance')),
    display ? formatInventoryManualThreeDecimal(total('physical_balance')) : total('physical_balance'),
    numeric(total('inventory_variance')),
    display ? formatInventoryManualThreeDecimal(total('oldest_quantity')) : total('oldest_quantity'),
    '', '', ''
  ];
}
function inventoryCountPngCellValue(key,displayValue,rawValue){
  if(INVENTORY_COUNT_SORT_COLUMNS[key]==='number' && rawValue!==null && rawValue!==undefined && rawValue!==''){
    const numericValue=Number(rawValue);
    if(Number.isFinite(numericValue) && numericValue===0) return '_';
  }
  return displayValue ?? '';
}
function inventoryCountExportColumnLayout(visibleKeys=[]){
  const weights={
    material_code:2.3,
    material_name:6.8,
    uom:.75,
    oldest_date:1.75,
    inventory_counter:2.8,
    inventory_settlement:2.1
  };
  const fallbackWeight=1.15;
  const totalWeight=visibleKeys.reduce((sum,key)=>sum+(weights[key] || fallbackWeight),0);
  return visibleKeys.map(key=>({
    key,
    width:totalWeight ? ((weights[key] || fallbackWeight)/totalWeight)*100 : 0
  }));
}
function inventoryCountBuildExportSheet(options={}){
  const target=options.target==='png' ? 'png' : 'document';
  const rows=target==='png' ? inventoryCountDisplayRows(INVENTORY_COUNT_STATE.lines || []) : (INVENTORY_COUNT_STATE.lines || []);
  const visibleIndexes=inventoryCountVisibleColumnIndexes();
  const visibleKeys=visibleIndexes.map(index=>INVENTORY_COUNT_COLUMNS[index]?.key || '');
  const sheet=document.createElement('section');
  sheet.className='inventory-count-export-sheet';
  if(target==='png') sheet.classList.add('inventory-count-export-sheet-png');
  sheet.dir='rtl';
  sheet.lang='ar';
  sheet.dataset.exportTarget=target;
  sheet.dataset.exportRows=String(rows.length);
  sheet.dataset.exportColumns=String(visibleKeys.length);
  const exportRowHeight=Math.max(22,Math.min(28,Math.floor(1320/Math.max(rows.length,1))));
  const exportFontSize=visibleKeys.length<=10 ? 11.2 : (visibleKeys.length<=15 ? 10.4 : 9.8);
  sheet.style.setProperty('--inventory-export-row-height',`${exportRowHeight}px`);
  sheet.style.setProperty('--inventory-export-font-size',`${exportFontSize}px`);
  const content=document.createElement('div');
  content.className='inventory-count-export-content';
  const header=document.createElement('header');
  header.className='inventory-count-export-header';
  const title=document.createElement('h1');
  title.textContent='الجرد وتوثيق المخزون';
  const meta=document.createElement('div');
  meta.className='inventory-count-export-meta';
  inventoryCountExportMetaRows().slice(1,-1).forEach(row=>{
    const item=document.createElement('span');
    item.textContent=`${row[0]}: ${target==='png' && row[0]==='عدد الأصناف' ? rows.length : row[1]}`;
    meta.appendChild(item);
  });
  header.append(title,meta);
  const table=document.createElement('table');
  table.className='inventory-count-export-table';
  table.dataset.noUniversalTable='1';
  const colgroup=document.createElement('colgroup');
  inventoryCountExportColumnLayout(visibleKeys).forEach(column=>{
    const col=document.createElement('col');
    col.dataset.inventoryExportKey=column.key;
    col.style.width=`${column.width}%`;
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);
  const thead=document.createElement('thead');
  const headRow=document.createElement('tr');
  visibleIndexes.forEach(index=>{
    const key=INVENTORY_COUNT_COLUMNS[index]?.key || '';
    const th=document.createElement('th');
    th.textContent=inventoryCountExportHeaders()[index] || '';
    if(key) th.classList.add(`inventory-count-export-col-${key}`);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  const tbody=document.createElement('tbody');
  rows.forEach(row=>{
    const values=inventoryCountExportDisplayRow(row);
    const tr=document.createElement('tr');
    visibleIndexes.forEach(index=>{
      const key=INVENTORY_COUNT_COLUMNS[index]?.key || '';
      const td=document.createElement('td');
      td.textContent=target==='png' ? inventoryCountPngCellValue(key,values[index],row?.[key]) : (values[index] ?? '');
      if(key) td.classList.add(`inventory-count-export-col-${key}`);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  const tfoot=document.createElement('tfoot');
  const totalRow=document.createElement('tr');
  totalRow.className='inventory-count-export-total-row';
  const totals=inventoryCountExportTotalRow(true,rows);
  const rawTotals=inventoryCountExportTotalRow(false,rows);
  visibleIndexes.forEach(index=>{
    const key=INVENTORY_COUNT_COLUMNS[index]?.key || '';
    const td=document.createElement('td');
    td.textContent=target==='png' ? inventoryCountPngCellValue(key,totals[index],rawTotals[index]) : (totals[index] ?? '');
    if(key) td.classList.add(`inventory-count-export-col-${key}`);
    totalRow.appendChild(td);
  });
  tfoot.appendChild(totalRow);
  table.append(thead,tbody,tfoot);
  const footer=document.createElement('footer');
  footer.textContent=`القائم بالمراجعة / ${inventoryCountReviewerName()}`;
  content.append(header,table,footer);
  sheet.appendChild(content);
  return sheet;
}
function inventoryCountPngColumnBounds(key){
  if(key==='material_name') return {min:260,max:440};
  if(key==='inventory_counter') return {min:220,max:360};
  if(key==='inventory_settlement') return {min:170,max:240};
  if(key==='material_code') return {min:130,max:210};
  if(key==='uom') return {min:100,max:150};
  if(key==='oldest_date') return {min:135,max:190};
  if(INVENTORY_COUNT_SORT_COLUMNS[key]==='number') return {min:126,max:190};
  return {min:120,max:220};
}
function inventoryCountMeasureExportText(context,element){
  const text=String(element?.textContent || '').trim();
  if(!text) return 0;
  const style=getComputedStyle(element);
  context.font=`${style.fontStyle || 'normal'} ${style.fontWeight || '700'} ${style.fontSize || '11px'} ${style.fontFamily || 'Cairo, sans-serif'}`;
  return context.measureText(text).width;
}
function inventoryCountApplyPngExportLayout(sheet){
  const table=sheet.querySelector('.inventory-count-export-table');
  const columns=[...(table?.querySelectorAll('col[data-inventory-export-key]') || [])];
  if(!table || !columns.length) return {width:Math.max(1,sheet.scrollWidth),columnWidths:[]};
  const context=document.createElement('canvas').getContext('2d');
  const columnWidths=columns.map((column,index)=>{
    const key=column.dataset.inventoryExportKey || '';
    const bounds=inventoryCountPngColumnBounds(key);
    const cells=[...table.rows].map(row=>row.cells[index]).filter(Boolean);
    const measured=context ? cells.reduce((maximum,cell)=>Math.max(maximum,inventoryCountMeasureExportText(context,cell)),0) : bounds.min;
    const padding=key==='material_name' || key==='inventory_counter' ? 34 : 26;
    return Math.ceil(Math.min(bounds.max,Math.max(bounds.min,measured+padding)));
  });
  const tableWidth=columnWidths.reduce((sum,width)=>sum+width,0);
  const sheetWidth=Math.max(1,tableWidth+28);
  columns.forEach((column,index)=>{column.style.width=`${columnWidths[index]}px`;});
  table.style.width=`${tableWidth}px`;
  const content=sheet.querySelector('.inventory-count-export-content');
  if(content) content.style.width=`${tableWidth}px`;
  sheet.style.width=`${sheetWidth}px`;
  sheet.style.minWidth=`${sheetWidth}px`;
  sheet.style.height='auto';
  sheet.style.minHeight='0';
  sheet.dataset.measuredTableWidth=String(tableWidth);
  sheet.dataset.measuredSheetWidth=String(sheetWidth);
  sheet.dataset.measuredColumnWidths=columnWidths.join(',');
  return {width:sheetWidth,columnWidths};
}
function inventoryCountPngCaptureScale(width,height){
  const preferredScale=2;
  const maximumDimension=16000;
  const maximumPixels=64000000;
  const dimensionScale=Math.min(maximumDimension/Math.max(width,1),maximumDimension/Math.max(height,1));
  const pixelScale=Math.sqrt(maximumPixels/Math.max(width*height,1));
  return Math.max(Number.EPSILON,Math.min(preferredScale,dimensionScale,pixelScale));
}
function inventorySettlementStatusMessage(status,reasonCode=''){
  const messages={
    not_authenticated:'يجب تسجيل الدخول قبل تنفيذ التسوية.',
    inactive_user:'الحساب الحالي غير نشط.',
    permission_denied:'لا تملك صلاحية تعديل مستند الجرد.',
    line_not_found:'تعذر العثور على سطر الجرد.',
    version_not_current:'نسخة الجرد لم تعد النسخة الحالية.',
    current_snapshot_not_found:'يجب إعداد مستند فروق الجرد قبل تنفيذ التسوية.',
    snapshot_not_current:'مستند فروق الجرد المحدد لم يعد المستند الحالي.',
    snapshot_line_not_found:'الصنف غير موجود داخل مستند فروق الجرد الحالي.',
    snapshot_stale:'تم تعديل بيانات الصنف بعد إعداد مستند فروق الجرد. استبدل مستند فروق الجرد ثم أعد المحاولة.',
    post_reversal_snapshot_stale:'تم تعديل بيانات الصنف بعد التراجع. استبدل مستند فروق الجرد ثم أعد المحاولة.',
    material_code_mismatch:'كود المادة لا يطابق سطر مستند فروق الجرد.',
    physical_balance_required:'يجب إدخال الرصيد الفعلي للصنف قبل تنفيذ التسوية.',
    invalid_snapshot_values:'قيم مستند فروق الجرد غير صالحة للتسوية.',
    zero_variance:'لا يوجد فرق جرد يحتاج إلى تسوية.',
    invalid_reason:'سبب التسوية المحدد غير صالح.',
    action_required:'الإجراء مطلوب.',
    action_too_long:'الإجراء يجب ألا يتجاوز 2000 حرف.',
    production_reason_not_allowed:'لا يمكن تسوية الفرق بسبب الإنتاج لأن الصنف لا يحتوي على إنتاج في هذا اليوم.',
    row_version_conflict:'تم تعديل بيانات الصنف. أعد تحميل المستند واستبدل مستند فروق الجرد عند الحاجة.',
    line_already_reconciled:'تمت تسوية فرق الجرد لهذا الصنف بالفعل.',
    inventory_count_read_only:'نسخة الجرد الحالية لا تسمح بالتعديل.',
    postcondition_failed:'تعذر إتمام التسوية لأن النتيجة النهائية لم تحقق تطابق الرصيد الدفتري والفعلي.',
    settlement_state_changed:'تغيرت حالة تسوية الصنف. أعد تحميل المستند.',
    // Stage 2 specific errors:
    correction_quantity_required:'يجب إدخال كمية التحميل الخاطئ لتنفيذ هذا النوع من التسوية.',
    invalid_correction_quantity:'كمية التحميل الخاطئ غير صالحة. تأكد من إدخال قيمة صحيحة أكبر من الصفر.',
    insufficient_outgoing_transfers:'لا يمكن تنفيذ التصحيح لأن التحويلات الصادرة الحالية أقل من كمية التحميل الخاطئ المدخلة.',
    insufficient_sales_quantity:'لا يمكن تنفيذ التصحيح لأن كمية البيع الحالية أقل من كمية التحميل الخاطئ المدخلة.',
    negative_production_after_residual:'لا يمكن تسوية الفرق المتبقي؛ الكمية المحسوبة للإنتاج بعد التسوية ستصبح سالبة.',
    negative_physical_result_not_allowed:'لا يمكن تسوية الفرق المتبقي؛ الرصيد الفعلي النهائي سيصبح سالبًا.'
  };
  if(status==='negative_result_not_allowed'){
    if(reasonCode==='production_difference' || reasonCode==='damaged_bags' || reasonCode==='other') return 'لا يمكن تنفيذ هذه التسوية لأن كمية الإنتاج بعد التسوية ستصبح سالبة. اختر سببًا آخر أو راجع بيانات الصنف.';
    if(reasonCode==='transfer_overloaded') return 'لا يمكن تنفيذ هذه التسوية لأن التحويلات الصادرة بعد التسوية ستصبح سالبة.';
    if(reasonCode==='transfer_not_loaded') return 'لا يمكن تنفيذ هذه التسوية لأن التحويلات الواردة بعد التسوية ستصبح سالبة.';
    if(reasonCode==='sales_overloaded' || reasonCode==='sales_not_loaded') return 'لا يمكن تنفيذ التسوية لأن كمية البيع بعد التسوية ستصبح سالبة.';
    return 'لا يمكن تنفيذ التسوية لأن القيمة الناتجة ستصبح سالبة.';
  }
  return messages[String(status || '')] || 'تعذر حفظ تسوية فرق الجرد.';
}
async function inventoryCountCaptureExportSheet(options={}){
  const Html2Canvas=window.html2canvas;
  if(!Html2Canvas) throw new Error('مكتبة تصدير الصور غير محملة.');
  const target=options.target==='png' ? 'png' : 'document';
  const sheet=inventoryCountBuildExportSheet({target});
  document.body.appendChild(sheet);
  try{
    if(document.fonts && document.fonts.ready) await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    if(target==='png'){
      inventoryCountApplyPngExportLayout(sheet);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const width=Math.max(1,Math.ceil(sheet.scrollWidth));
      const height=Math.max(1,Math.ceil(sheet.scrollHeight));
      const captureScale=inventoryCountPngCaptureScale(width,height);
      const canvas=await Html2Canvas(sheet,{scale:captureScale,useCORS:true,allowTaint:true,backgroundColor:'#00291f',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
      return {canvas,width,height};
    }
    const content=sheet.querySelector('.inventory-count-export-content');
    const sheetStyles=getComputedStyle(sheet);
    const horizontalPadding=(parseFloat(sheetStyles.paddingLeft)||0)+(parseFloat(sheetStyles.paddingRight)||0);
    const verticalPadding=(parseFloat(sheetStyles.paddingTop)||0)+(parseFloat(sheetStyles.paddingBottom)||0);
    const availableWidth=Math.max(1,sheet.clientWidth-horizontalPadding);
    const availableHeight=Math.max(1,sheet.clientHeight-verticalPadding);
    let fitScale=1;
    if(content){
      content.style.transform='none';
      const naturalWidth=Math.max(content.scrollWidth,content.getBoundingClientRect().width,1);
      const naturalHeight=Math.max(content.scrollHeight,content.getBoundingClientRect().height,1);
      fitScale=Math.min(1,availableWidth/naturalWidth,availableHeight/naturalHeight);
      content.style.setProperty('--inventory-export-fit-scale',String(fitScale));
      content.style.transform=`scale(${fitScale})`;
    }
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const width=Math.max(1,Math.ceil(sheet.clientWidth));
    const height=Math.max(1,Math.ceil(sheet.clientHeight));
    const captureScale=Math.min(3,Math.max(2,1/Math.max(fitScale,.01)));
    const canvas=await Html2Canvas(sheet,{scale:captureScale,useCORS:true,allowTaint:true,backgroundColor:'#00291f',logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
    return {canvas,width,height};
  }finally{
    sheet.remove();
  }
}
async function exportInventoryCountPng(){
  if(!(INVENTORY_COUNT_STATE.lines || []).length){ showInventoryCountToast('لا توجد بيانات للتصدير.','warning'); return; }
  try{
    const {canvas}=await inventoryCountCaptureExportSheet({target:'png'});
    await new Promise(resolve=>canvas.toBlob(async blob=>{
      if(!blob){ showInventoryCountToast('تعذر إنشاء صورة PNG.','error'); resolve(); return; }
      await saveBlobWithPicker(blob,`${inventoryCountExportFileBase()}.png`,'image/png');
      showInventoryCountToast('تم التصدير بنجاح.','success');
      resolve();
    },'image/png',1));
  }catch(err){
    console.error('Inventory count PNG export failed',err);
    showInventoryCountToast(err?.message || 'فشل التصدير.','error');
  }
}
async function exportInventoryCountPdf(){
  if(!(INVENTORY_COUNT_STATE.lines || []).length){ showInventoryCountToast('لا توجد بيانات للتصدير.','warning'); return; }
  const JsPDF=(window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
  if(!JsPDF){ showInventoryCountToast('مكتبة PDF غير محملة.','error'); return; }
  try{
    const {canvas}=await inventoryCountCaptureExportSheet();
    const pdf=new JsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const finalWidth=pdf.internal.pageSize.getWidth();
    const finalHeight=pdf.internal.pageSize.getHeight();
    const margin=4;
    const availableWidth=finalWidth-(margin*2);
    const availableHeight=finalHeight-(margin*2);
    const fit=Math.min(availableWidth/canvas.width,availableHeight/canvas.height);
    const imageWidth=canvas.width*fit;
    const imageHeight=canvas.height*fit;
    const imageX=(finalWidth-imageWidth)/2;
    const imageY=(finalHeight-imageHeight)/2;
    pdf.setFillColor(0,41,31);
    pdf.rect(0,0,finalWidth,finalHeight,'F');
    pdf.addImage(canvas.toDataURL('image/png',1),'PNG',imageX,imageY,imageWidth,imageHeight,undefined,'FAST');
    await saveBlobWithPicker(pdf.output('blob'),`${inventoryCountExportFileBase()}.pdf`,'application/pdf');
    showInventoryCountToast('تم التصدير بنجاح.','success');
  }catch(err){
    console.error('Inventory count PDF export failed',err);
    showInventoryCountToast(err?.message || 'فشل التصدير.','error');
  }
}
async function exportInventoryCountExcel(){
  const rows=INVENTORY_COUNT_STATE.lines || [];
  if(!rows.length){ showInventoryCountToast('لا توجد بيانات للتصدير.','warning'); return; }
  if(!window.XLSX){ showInventoryCountToast('مكتبة Excel غير محملة.','error'); return; }
  try{
    const matrix=[
      ...inventoryCountExportMetaRows(),
      inventoryCountFilterVisibleColumns(inventoryCountExportHeaders()),
      ...rows.map(row=>inventoryCountFilterVisibleColumns(inventoryCountExportExcelRow(row))),
      inventoryCountFilterVisibleColumns(inventoryCountExportTotalRow(false)),
      [],
      [`القائم بالمراجعة / ${inventoryCountReviewerName()}`]
    ];
    const ws=XLSX.utils.aoa_to_sheet(matrix);
    ws['!rtl']=true;
    ws['!cols']=inventoryCountFilterVisibleColumns(inventoryCountExportHeaders()).map((_,index)=>({wch:Math.min(42,Math.max(12,...matrix.map(row=>String(row[index] ?? '').length + 2)))}));
    const numericStartRow=inventoryCountExportMetaRows().length + 2;
    const numericEndRow=numericStartRow + rows.length;
    const visibleNumericColumns=inventoryCountVisibleColumnIndexes()
      .map((originalIndex,visibleIndex)=>({originalIndex,visibleIndex}))
      .filter(item=>item.originalIndex>=3 && item.originalIndex<=15)
      .map(item=>item.visibleIndex);
    for(let r=numericStartRow;r<=numericEndRow;r+=1){
      visibleNumericColumns.forEach(c=>{
        const cell=ws[XLSX.utils.encode_cell({r:r-1,c})];
        if(cell && typeof cell.v==='number') cell.z='0.000';
      });
    }
    const wb=XLSX.utils.book_new();
    wb.Workbook={Views:[{RTL:true}]};
    XLSX.utils.book_append_sheet(wb,ws,'Inventory Count');
    const out=XLSX.write(wb,{bookType:'xlsx',type:'array',cellStyles:true});
    const blob=new Blob([out],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
    await saveBlobWithPicker(blob,`${inventoryCountExportFileBase()}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    showInventoryCountToast('تم التصدير بنجاح.','success');
  }catch(err){
    console.error('Inventory count Excel export failed',err);
    showInventoryCountToast(err?.message || 'فشل التصدير.','error');
  }
}
function updateInventoryCountFreezePanes(){
  const table=$('#inventoryCountLinesTable');
  if(!table) return;
  if(!(document.body.classList.contains('focus-mode-active') && document.body.dataset.focusSection==='inventory_closing')){
    table.style.removeProperty('--ic-sticky-code-right');
    table.style.removeProperty('--ic-sticky-name-right');
    table.style.removeProperty('--ic-sticky-uom-right');
    return;
  }
  const firstRow=table.tHead?.rows?.[0] || table.tBodies?.[0]?.rows?.[0];
  if(!firstRow) return;
  const cells=firstRow.cells;
  const codeWidth=Math.ceil(cells[0]?.getBoundingClientRect().width || 110);
  const nameWidth=Math.ceil(cells[1]?.getBoundingClientRect().width || 220);
  table.style.setProperty('--ic-sticky-code-right','0px');
  table.style.setProperty('--ic-sticky-name-right',`${codeWidth}px`);
  table.style.setProperty('--ic-sticky-uom-right',`${codeWidth + nameWidth}px`);
}
function formatInventoryCountText(value){
  if(value===null || value===undefined) return '';
  return escapeHtml(String(value));
}
function inventoryCountStatusLabel(status){
  if(status==='draft') return 'جديد';
  if(status==='incomplete') return 'غير مكتمل';
  if(status==='complete') return 'مكتمل';
  if(status==='exception') return 'استثناء';
  return 'جديد';
}
function formatInventoryOpeningBalance(value){
  if(value===null || value===undefined || String(value).trim()==='') return '';
  const n=Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : '';
}
function inventoryCountOpeningBalanceInputValue(value){
  return formatInventoryOpeningBalance(value);
}
function inventoryCountOpeningBalanceKey(value){
  return formatInventoryOpeningBalance(value);
}
function roundInventoryOpeningBalanceValue(value){
  if(value===null || value===undefined || String(value).trim()==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n)) return NaN;
  return Math.round(n * 1000) / 1000;
}
function formatInventoryProductionQuantity(value){
  if(value===null || value===undefined || String(value).trim()==='') return '';
  const n=Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : '';
}
function inventoryCountProductionInputValue(value){
  return formatInventoryProductionQuantity(value);
}
function inventoryCountProductionKey(value){
  return formatInventoryProductionQuantity(value);
}
function roundInventoryProductionQuantityValue(value){
  if(value===null || value===undefined || String(value).trim()==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n)) return NaN;
  return Math.round(n * 1000) / 1000;
}
function formatInventoryManualThreeDecimal(value){
  if(value===null || value===undefined || String(value).trim()==='') return '';
  const n=Number(value);
  return Number.isFinite(n) ? n.toFixed(3) : '';
}
function inventoryCountManualThreeDecimalKey(value){
  return formatInventoryManualThreeDecimal(value);
}
function roundInventoryManualThreeDecimalValue(value){
  if(value===null || value===undefined || String(value).trim()==='') return null;
  const n=Number(value);
  if(!Number.isFinite(n)) return NaN;
  return Math.round(n * 1000) / 1000;
}
function formatInventoryDateInputValue(value){
  if(value===null || value===undefined) return '';
  const text=String(value).trim();
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0,10) : '';
}
function inventoryCountCounterOptionLabel(option){
  const name=String(option?.full_name || option?.name || '').trim();
  const job=String(option?.job_title || '').trim();
  return job ? `${name} — ${job}` : name;
}
let INVENTORY_COUNT_OPENING_BALANCE_MEASURE_CANVAS=null;
function inventoryCountCssPixels(value){
  const n=parseFloat(value || '0');
  return Number.isFinite(n) ? n : 0;
}
function measureInventoryOpeningBalanceInputWidth(input){
  if(!input) return 76;
  const styles=window.getComputedStyle ? getComputedStyle(input) : null;
  if(!INVENTORY_COUNT_OPENING_BALANCE_MEASURE_CANVAS){
    INVENTORY_COUNT_OPENING_BALANCE_MEASURE_CANVAS=document.createElement('canvas');
  }
  const ctx=INVENTORY_COUNT_OPENING_BALANCE_MEASURE_CANVAS.getContext('2d');
  if(styles && ctx){
    ctx.font=styles.font || `${styles.fontWeight || '400'} ${styles.fontSize || '14px'} ${styles.fontFamily || 'Arial'}`;
  }
  const text=String(input.value || '0');
  const textWidth=ctx ? Math.ceil(ctx.measureText(text).width) : (text.length * 9);
  const horizontalPadding=styles ? inventoryCountCssPixels(styles.paddingLeft) + inventoryCountCssPixels(styles.paddingRight) : 24;
  const horizontalBorder=styles ? inventoryCountCssPixels(styles.borderLeftWidth) + inventoryCountCssPixels(styles.borderRightWidth) : 2;
  return Math.max(76, Math.ceil(textWidth + horizontalPadding + horizontalBorder + 30));
}
function updateInventoryOpeningBalanceInputWidth(input){
  if(!input) return;
  const width=measureInventoryOpeningBalanceInputWidth(input);
  input.style.width=`${width}px`;
  const cell=input.closest('.inventory-opening-balance-cell');
  if(cell) cell.style.minWidth=`${width + 16}px`;
}
function updateInventoryProductionQuantityInputWidth(input){
  if(!input) return;
  const width=measureInventoryOpeningBalanceInputWidth(input);
  input.style.width=`${width}px`;
  const cell=input.closest('.inventory-production-quantity-cell');
  if(cell) cell.style.minWidth=`${width + 16}px`;
}
function updateInventoryPhysicalBalanceInputWidth(input){
  if(!input) return;
  const width=measureInventoryOpeningBalanceInputWidth(input);
  input.style.width=`${width}px`;
  const cell=input.closest('.inventory-physical-balance-cell');
  if(cell) cell.style.minWidth=`${width + 16}px`;
}
function updateInventoryOldestQuantityInputWidth(input){
  if(!input) return;
  const width=measureInventoryOpeningBalanceInputWidth(input);
  input.style.width=`${width}px`;
  const cell=input.closest('.inventory-oldest-quantity-cell');
  if(cell) cell.style.minWidth=`${width + 16}px`;
}
function updateInventoryOpeningBalanceInputsWidth(root=document){
  requestAnimationFrame(()=>{
    root.querySelectorAll?.('.inventory-opening-balance-input').forEach(updateInventoryOpeningBalanceInputWidth);
    root.querySelectorAll?.('.inventory-production-quantity-input').forEach(updateInventoryProductionQuantityInputWidth);
    root.querySelectorAll?.('.inventory-physical-balance-input').forEach(updateInventoryPhysicalBalanceInputWidth);
    root.querySelectorAll?.('.inventory-oldest-quantity-input').forEach(updateInventoryOldestQuantityInputWidth);
  });
}
function renderInventoryOpeningBalanceCell(row){
  const mode=INVENTORY_COUNT_STATE.openingBalanceMode || 'manual_first_day';
  if(mode==='carried_forward'){
    return `<td class="inventory-opening-balance-cell" title="مرحّل من اليوم السابق المعتمد">${formatInventoryCountManualQuantity(row.opening_balance)}</td>`;
  }
  const value=inventoryCountOpeningBalanceInputValue(row.opening_balance);
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-opening-balance-cell"><input class="inventory-opening-balance-input" type="number" step="0.001" inputmode="decimal" aria-label="رصيد أول" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(value)}" value="${escapeHtml(value)}"${lockAttrs} /></td>`;
}
function renderInventoryProductionQuantityCell(row){
  const value=inventoryCountProductionInputValue(row.production_quantity);
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-production-quantity-cell"><input class="inventory-production-quantity-input" type="number" min="0" step="0.001" inputmode="decimal" aria-label="الإنتاج" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(value)}" value="${escapeHtml(value)}"${lockAttrs} /></td>`;
}
function renderInventoryPhysicalBalanceCell(row){
  const value=formatInventoryManualThreeDecimal(row.physical_balance);
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-physical-balance-cell"><input class="inventory-physical-balance-input" type="number" min="0" step="0.001" inputmode="decimal" aria-label="الرصيد الفعلي" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(value)}" value="${escapeHtml(value)}"${lockAttrs} /></td>`;
}
function renderInventoryOldestQuantityCell(row){
  const value=formatInventoryManualThreeDecimal(row.oldest_quantity);
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-oldest-quantity-cell"><input class="inventory-oldest-quantity-input" type="number" min="0" step="0.001" inputmode="decimal" aria-label="كمية أقدم تاريخ" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(value)}" value="${escapeHtml(value)}"${lockAttrs} /></td>`;
}
function renderInventoryOldestDateCell(row){
  const value=formatInventoryDateInputValue(row.oldest_date);
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-oldest-date-cell"><input class="inventory-oldest-date-input" type="date" data-custom-date-picker data-custom-date-picker-placeholder="أقدم تاريخ" aria-label="أقدم تاريخ" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(value)}" value="${escapeHtml(value)}"${lockAttrs} /></td>`;
}
function updateInventoryCountFilterOptions(rows=[]){
  const uomSelect=$('#inventoryCountLinesTable thead [data-inventory-filter-key="uom"]');
  const counterSelect=$('#inventoryCountLinesTable thead [data-inventory-filter-key="inventory_counter"]');
  const fill=(select,values)=>{
    if(!select) return;
    const current=select.value;
    select.innerHTML='<option value="">الكل</option>'+values.map(value=>`<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join('');
    select.value=values.includes(current) ? current : '';
    if(current && !select.value) inventoryCountSetColumnFilter(select.dataset.inventoryFilterKey,'');
  };
  fill(uomSelect,[...new Set((rows||[]).map(row=>String(row.uom||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})));
  fill(counterSelect,[...new Set((rows||[]).map(row=>String(row.inventory_counter_name_snapshot||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar',{numeric:true})));
  syncInventoryCountSearchControls();
  renderInventoryCountMobileFilters();
}
function renderInventoryCountMobileFilters(){
  const list=$('#inventoryCountMobileFilterPanel .inventory-count-mobile-filter-list');
  const source=$('#inventoryCountLinesTable thead .inventory-count-filter-row');
  if(!list || !source) return;
  const labels=INVENTORY_COUNT_COLUMNS.map(column=>column.label);
  list.innerHTML=[...source.cells].map((cell,index)=>{
    const controls=[...cell.querySelectorAll('.inventory-count-column-filter,#inventoryCountClearFiltersBtn')];
    if(!controls.length) return '';
    const label=labels[index] || '';
    const html=controls.map(control=>{
      const clone=control.cloneNode(true);
      clone.removeAttribute('id');
      if(control.id==='inventoryCountClearFiltersBtn') clone.dataset.inventoryMobileClearFilters='1';
      return clone.outerHTML;
    }).join('');
    return `<label class="inventory-count-mobile-filter-item"><span>${escapeHtml(label)}</span>${html}</label>`;
  }).join('');
  syncInventoryCountFilterControls();
}

const INVENTORY_SETTLEMENT_REASONS = Object.freeze([
  { code:'production_difference', label:'فرق بسبب الإنتاج' },
  { code:'transfer_overloaded', label:'فرق تحويلات - تحميل زائد' },
  { code:'transfer_not_loaded', label:'فرق تحويلات - لم يتم تحميله' },
  { code:'sales_overloaded', label:'فرق مبيعات - تحميل زائد' },
  { code:'sales_not_loaded', label:'فرق مبيعات - لم يتم تحميله' },
  { code:'damaged_bags', label:'شكائر مقطوعة' },
  { code:'other', label:'أسباب أخرى' }
]);
function normalizeInventorySettlementNumber(value){
  if(value===null || value===undefined || value==='') return 0;
  const number=Number(value);
  return Number.isFinite(number) ? number : 0;
}
function roundInventorySettlementQuantity(value){
  const rounded=Math.round((normalizeInventorySettlementNumber(value)+Number.EPSILON)*1000)/1000;
  return Math.abs(rounded)<0.0005 ? 0 : rounded;
}
function formatInventorySettlementQuantity(value){
  return roundInventorySettlementQuantity(value).toFixed(3);
}
function inventorySettlementContextLine(lineId){
  return INVENTORY_COUNT_STATE.settlementContextByLine instanceof Map
    ? INVENTORY_COUNT_STATE.settlementContextByLine.get(String(lineId || '')) || null
    : null;
}
function inventoryCountLineHasActiveSave(lineId){
  const id=String(lineId || '');
  return [
    INVENTORY_COUNT_STATE.openingBalanceSaving,
    INVENTORY_COUNT_STATE.productionSaving,
    INVENTORY_COUNT_STATE.physicalBalanceSaving,
    INVENTORY_COUNT_STATE.oldestQuantitySaving,
    INVENTORY_COUNT_STATE.oldestDateSaving,
    INVENTORY_COUNT_STATE.inventoryCounterSaving,
    INVENTORY_COUNT_STATE.settlementSaving,
    INVENTORY_COUNT_STATE.reversalSaving
  ].some(set=>set instanceof Set && set.has(id));
}
function inventorySettlementSnapshotMatchesLine(row,contextLine){
  if(!row || !contextLine) return false;
  const identityMatches=String(contextLine.source_inventory_line_id || '')===String(row.id || '')
    && String(contextLine.material_code || '')===String(row.material_code || '');
  if(!identityMatches) return false;
  return ['ready','ready_after_reversal'].includes(String(contextLine.eligibility_status || ''));
}
function clearInventoryCountSettlementContext(options={}){
  const {closeModal=true}=options;
  INVENTORY_COUNT_STATE.settlementContextRequestSeq++;
  INVENTORY_COUNT_STATE.settlementContextVersionId=null;
  INVENTORY_COUNT_STATE.settlementContextSnapshot=null;
  INVENTORY_COUNT_STATE.settlementContextByLine=new Map();
  INVENTORY_COUNT_STATE.settlementContextLoading=false;
  INVENTORY_COUNT_STATE.settlementContextError='';
  INVENTORY_COUNT_STATE.settlementPhaseStarted=false;
  updateInventoryDifferenceSnapshotButton();
  if(closeModal){
    closeInventoryCountSettlementModal({restoreFocus:false,force:true});
    closeInventoryCountSettlementReversalModal({restoreFocus:false,force:true});
    closeInventoryCountPostCloseInvoiceModal({restoreFocus:false,force:true});
  }
  updateInventoryCountFinalizationControls();
}
function inventorySettlementContextErrorMessage(error){
  const message=String(error?.message || error || '').trim();
  if(/get_inventory_count_settlement_context|PGRST202|function .* does not exist/i.test(message)){
    return 'تحديث قاعدة البيانات الخاص بالتسويات غير مُطبق. شغّل ملف التراجع وسجل التسويات ثم أعد تحميل الصفحة.';
  }
  if(/permission_denied/i.test(message)) return 'لا تملك صلاحية عرض حالة تسويات الجرد.';
  if(/not_authenticated/i.test(message)) return 'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.';
  return 'تعذر تحميل حالة تسويات الجرد. اضغط لإعادة المحاولة.';
}
async function loadInventoryCountSettlementContext(versionId,inventoryRequestSeq=null){
  const normalizedVersionId=String(versionId || '');
  const contextRequestSeq=++INVENTORY_COUNT_STATE.settlementContextRequestSeq;
  INVENTORY_COUNT_STATE.settlementContextLoading=true;
  INVENTORY_COUNT_STATE.settlementContextError='';
  INVENTORY_COUNT_STATE.settlementContextVersionId=null;
  INVENTORY_COUNT_STATE.settlementContextSnapshot=null;
  INVENTORY_COUNT_STATE.settlementContextByLine=new Map();
  try{
    if(!normalizedVersionId || !window.WarehouseDB?.ready) return false;
    const {data,error}=await WarehouseDB.client.rpc('get_inventory_count_settlement_context',{p_version_id:normalizedVersionId});
    if(error) throw error;
    if(contextRequestSeq!==INVENTORY_COUNT_STATE.settlementContextRequestSeq) return false;
    if(inventoryRequestSeq!==null && inventoryRequestSeq!==INVENTORY_COUNT_STATE.requestSeq) return false;
    if(String(INVENTORY_COUNT_STATE.versionId || '')!==normalizedVersionId) return false;
    if(data?.status!=='ok' || String(data?.version_id || '')!==normalizedVersionId){
      throw new Error(String(data?.status || 'settlement_context_invalid'));
    }
    const snapshot=data?.has_current_snapshot ? data?.snapshot || null : null;
    const contextLines=Array.isArray(data?.lines) ? data.lines : [];
    INVENTORY_COUNT_STATE.settlementContextVersionId=normalizedVersionId;
    INVENTORY_COUNT_STATE.settlementContextSnapshot=snapshot;
    INVENTORY_COUNT_STATE.settlementContextByLine=new Map(
      contextLines
        .filter(line=>line?.source_inventory_line_id)
        .map(line=>[String(line.source_inventory_line_id),line])
    );
    INVENTORY_COUNT_STATE.settlementPhaseStarted=contextLines.some(line=>Boolean(
      line?.active_settlement_id
      || line?.latest_settlement_id
      || line?.latest_reversal_id
      || ['active','reversed'].includes(String(line?.current_state || ''))
    ));
    INVENTORY_COUNT_STATE.settlementContextError='';
    updateInventoryDifferenceSnapshotButton();
    return true;
  }catch(err){
    if(contextRequestSeq===INVENTORY_COUNT_STATE.settlementContextRequestSeq
      && (inventoryRequestSeq===null || inventoryRequestSeq===INVENTORY_COUNT_STATE.requestSeq)){
      INVENTORY_COUNT_STATE.settlementContextVersionId=normalizedVersionId;
      INVENTORY_COUNT_STATE.settlementContextSnapshot=null;
      INVENTORY_COUNT_STATE.settlementContextByLine=new Map();
      INVENTORY_COUNT_STATE.settlementContextError=inventorySettlementContextErrorMessage(err);
      console.warn('Inventory settlement context load failed',err);
    }
    return false;
  }finally{
    if(contextRequestSeq===INVENTORY_COUNT_STATE.settlementContextRequestSeq
      && (inventoryRequestSeq===null || inventoryRequestSeq===INVENTORY_COUNT_STATE.requestSeq)){
      INVENTORY_COUNT_STATE.settlementContextLoading=false;
    }
  }
}
async function refreshInventoryCountSettlementContextIfCurrent(versionId){
  const normalizedVersionId=String(versionId || '');
  if(!normalizedVersionId || String(INVENTORY_COUNT_STATE.versionId || '')!==normalizedVersionId) return;
  const contextPromise=loadInventoryCountSettlementContext(normalizedVersionId,INVENTORY_COUNT_STATE.requestSeq);
  renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  await contextPromise;
  if(String(INVENTORY_COUNT_STATE.versionId || '')===normalizedVersionId){
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  }
}
function getInventorySettlementReason(reasonCode){
  return INVENTORY_SETTLEMENT_REASONS.find(reason=>reason.code===String(reasonCode || '')) || null;
}
function calculateInventorySettlementPreview(contextLine,reasonCode,Q){
  const reason=getInventorySettlementReason(reasonCode);
  if(!reason) return {valid:false,message:'اختر سبب التسوية لعرض الإجراء الذي سينفذه النظام.'};
  if(!contextLine || contextLine.physical_balance===null || contextLine.physical_balance===undefined){
    return {valid:false,message:'يجب إدخال الرصيد الفعلي واستبدال مستند فروق الجرد قبل تنفيذ التسوية.'};
  }
  const variance=roundInventorySettlementQuantity(
    normalizeInventorySettlementNumber(contextLine.physical_balance)-normalizeInventorySettlementNumber(contextLine.book_balance)
  );
  const production=roundInventorySettlementQuantity(contextLine.production_quantity);
  const incoming=roundInventorySettlementQuantity(contextLine.incoming_transfers);
  const outgoing=roundInventorySettlementQuantity(contextLine.outgoing_transfers);
  const sales=roundInventorySettlementQuantity(contextLine.sales_quantity);

  if(['transfer_overloaded','transfer_not_loaded','sales_overloaded','sales_not_loaded'].includes(reason.code)){
    if(!Q || Q<=0 || isNaN(Q)) return {valid:false,message:'أدخل كمية التحميل الخاطئ لعرض تفاصيل التسوية المتوقعة.'};
    let stage1Message = '';
    let B1 = 0;
    const B0 = normalizeInventorySettlementNumber(contextLine.book_balance);
    const P0 = normalizeInventorySettlementNumber(contextLine.physical_balance);
    const Prod0 = normalizeInventorySettlementNumber(contextLine.production_quantity);

    if(reason.code === 'transfer_overloaded') {
      const out1 = outgoing + Q;
      B1 = B0 - Q;
      stage1Message = `تصحيح التحميل:\nكمية التحميل الخاطئ: ${formatInventorySettlementQuantity(Q)} طن.\nالتحويلات الصادرة: ${formatInventorySettlementQuantity(outgoing)} ← ${formatInventorySettlementQuantity(out1)} طن.\n`;
    } else if(reason.code === 'transfer_not_loaded') {
      const out1 = outgoing - Q;
      const in1 = incoming + Q;
      if (out1 < 0) return {valid:false, negative:true, message:'تحذير: لا يمكن تنفيذ التصحيح لأن كمية التحويلات الصادرة الحالية أقل من كمية التحميل الخاطئ المدخلة.'};
      B1 = B0 + (2 * Q);
      stage1Message = `تصحيح التحميل:\nكمية التحميل الخاطئ: ${formatInventorySettlementQuantity(Q)} طن.\nالتحويلات الصادرة: ${formatInventorySettlementQuantity(outgoing)} ← ${formatInventorySettlementQuantity(out1)} طن.\nالتحويلات الواردة: ${formatInventorySettlementQuantity(incoming)} ← ${formatInventorySettlementQuantity(in1)} طن.\n`;
    } else if(reason.code === 'sales_overloaded') {
      const s1 = sales + Q;
      B1 = B0 - Q;
      stage1Message = `تصحيح التحميل:\nكمية التحميل الخاطئ: ${formatInventorySettlementQuantity(Q)} طن.\nكمية البيع: ${formatInventorySettlementQuantity(sales)} ← ${formatInventorySettlementQuantity(s1)} طن.\n`;
    } else if(reason.code === 'sales_not_loaded') {
      const s1 = sales - Q;
      if (s1 < 0) return {valid:false, negative:true, message:'تحذير: لا يمكن تنفيذ التصحيح لأن كمية البيع الحالية أقل من كمية التحميل الخاطئ المدخلة.'};
      B1 = B0 + Q;
      stage1Message = `تصحيح التحميل:\nكمية التحميل الخاطئ: ${formatInventorySettlementQuantity(Q)} طن.\nكمية البيع: ${formatInventorySettlementQuantity(sales)} ← ${formatInventorySettlementQuantity(s1)} طن.\n`;
    }

    const R = P0 - B1;
    stage1Message += `الرصيد الدفتري (قبل): ${formatInventorySettlementQuantity(B0)} طن.\nالرصيد الدفتري (بعد المرحلة الأولى): ${formatInventorySettlementQuantity(B1)} طن.\nفرق الجرد المتبقي: ${formatInventorySettlementQuantity(R)} طن.\n\n`;

    let stage2Message = '';
    if(Prod0 > 0) {
      const ProdFinal = Prod0 + R;
      if (ProdFinal < 0) return {valid:false, negative:true, message: stage1Message + `تحذير: سيتم تسوية الفرق المتبقي في الإنتاج ولكن الإنتاج النهائي سيصبح سالبًا (${formatInventorySettlementQuantity(ProdFinal)} طن).`};
      stage2Message = `تسوية الفرق المتبقي:\nسيتم تسوية فرق الجرد المتبقي في الإنتاج.\nالإنتاج: ${formatInventorySettlementQuantity(Prod0)} ← ${formatInventorySettlementQuantity(ProdFinal)} طن.\nالرصيد الدفتري النهائي: ${formatInventorySettlementQuantity(P0)} طن.\nالرصيد الفعلي النهائي: ${formatInventorySettlementQuantity(P0)} طن.\nفرق الجرد النهائي: 0.000 طن.`;
    } else {
      stage2Message = `تسوية الفرق المتبقي:\nلا يوجد إنتاج لهذا الصنف؛ لذلك لن يتم إنشاء إنتاج وهمي. بعد تصحيح التحميل سيتم تعديل الرصيد الفعلي ليطابق الرصيد الدفتري.\nالرصيد الفعلي النهائي: ${formatInventorySettlementQuantity(B1)} طن.\nالرصيد الدفتري النهائي: ${formatInventorySettlementQuantity(B1)} طن.\nفرق الجرد النهائي: 0.000 طن.`;
      if (B1 < 0) return {valid:false, negative:true, message: stage1Message + `تحذير: لا يمكن إتمام التسوية لأن الرصيد الفعلي النهائي سيصبح سالبًا (${formatInventorySettlementQuantity(B1)} طن).`};
    }
    
    return {valid:true, message: stage1Message + stage2Message, variance: R};
  }

  let targetField='';
  let before=0;
  let after=0;
  let message='';
  if(reason.code==='production_difference'){
    if(production<=0) return {valid:false,message:'لا يمكن تسوية الفرق بسبب الإنتاج لأن الصنف لا يحتوي على إنتاج في هذا اليوم.'};
    targetField='production_quantity'; before=production; after=roundInventorySettlementQuantity(production+variance);
    message=`سيتم تعديل كمية الإنتاج من ${formatInventorySettlementQuantity(before)} طن إلى ${formatInventorySettlementQuantity(after)} طن، ثم إعادة احتساب الرصيد الدفتري ليصبح مساويًا للرصيد الفعلي ويصبح فرق الجرد 0.000 طن.`;
  }else if(production>0){
    targetField='production_quantity'; before=production; after=roundInventorySettlementQuantity(production+variance);
    message=`يوجد إنتاج لهذا الصنف؛ لذلك ستتم التسوية من خلال تعديل الإنتاج من ${formatInventorySettlementQuantity(before)} طن إلى ${formatInventorySettlementQuantity(after)} طن، ثم يصبح فرق الجرد 0.000 طن.`;
  }else{
    targetField='physical_balance';
    before=roundInventorySettlementQuantity(contextLine.physical_balance);
    after=roundInventorySettlementQuantity(contextLine.book_balance);
    message='لا يوجد إنتاج لهذا الصنف؛ لذلك لن يتم إنشاء إنتاج وهمي. سيتم تعديل الرصيد الفعلي ليصبح مساويًا للرصيد الدفتري، ثم يصبح فرق الجرد 0.000 طن.';
  }
  if(after<0){
    return {valid:false,negative:true,targetField,before,after,message:`تحذير: السبب المختار سيجعل قيمة ${reason.label} المستهدفة سالبة (${formatInventorySettlementQuantity(after)} طن). اختر سببًا آخر أو راجع بيانات الصنف.`};
  }
  return {valid:true,targetField,before,after,variance,message};
}


function inventorySettlementModalSetText(modal,key,value){
  const element=modal?.querySelector(`[data-inventory-settlement-value="${key}"]`);
  if(element) element.textContent=value===null || value===undefined || value==='' ? '—' : String(value);
}
function ensureInventoryCountSettlementModal(){
  let modal=$('#inventorySettlementModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='inventorySettlementModal';
  modal.className='inventory-settlement-modal app-liquid-modal-backdrop';
  modal.hidden=true;
  modal.setAttribute('aria-hidden','true');
  modal.innerHTML=`
    <div class="inventory-settlement-backdrop" aria-hidden="true"></div>
    <section class="inventory-settlement-dialog app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="inventorySettlementModalTitle" dir="rtl">
      <header class="inventory-settlement-header app-liquid-modal__header">
        <div>
          <p class="inventory-settlement-eyebrow">الجرد وتوثيق المخزون</p>
          <h2 id="inventorySettlementModalTitle">تسوية فرق الجرد</h2>
        </div>
        <button type="button" class="inventory-settlement-close app-liquid-modal__close" data-inventory-settlement-close="button" aria-label="إغلاق">×</button>
      </header>
      <div class="inventory-settlement-scroll app-liquid-modal__body">
        <section class="inventory-settlement-summary" aria-label="بيانات الصنف">
          <div class="inventory-settlement-material">
            <span data-inventory-settlement-value="material_code">—</span>
            <strong data-inventory-settlement-value="material_name">—</strong>
          </div>
          <div class="inventory-settlement-summary-grid">
            <div><span>الإنتاج الحالي</span><strong data-inventory-settlement-value="production_quantity">—</strong></div>
            <div><span>التحويلات الواردة</span><strong data-inventory-settlement-value="incoming_transfers">—</strong></div>
            <div><span>التحويلات الصادرة</span><strong data-inventory-settlement-value="outgoing_transfers">—</strong></div>
            <div><span>كمية البيع</span><strong data-inventory-settlement-value="sales_quantity">—</strong></div>
            <div><span>الرصيد الدفتري</span><strong data-inventory-settlement-value="book_balance">—</strong></div>
            <div><span>الرصيد الفعلي</span><strong data-inventory-settlement-value="physical_balance">—</strong></div>
            <div><span>فرق الجرد</span><strong data-inventory-settlement-value="inventory_variance">—</strong></div>
            <div><span>مستند الفروق</span><strong data-inventory-settlement-value="snapshot_number">—</strong></div>
          </div>
        </section>
        <div class="inventory-settlement-form">
          <label class="inventory-settlement-field">
            <span>سبب التسوية <b aria-hidden="true">*</b></span>
            <select id="inventorySettlementReason" required>
              <option value="">اختر سبب التسوية</option>
            </select>
          </label>
          <label class="inventory-settlement-field" id="inventorySettlementCorrectionField" hidden>
            <span>كمية التحميل الخاطئ (طن) <b aria-hidden="true">*</b></span>
            <input type="number" id="inventorySettlementCorrectionQuantity" step="0.001" min="0.001" placeholder="أدخل كمية التحميل الخاطئ (Q)">
          </label>
          <label class="inventory-settlement-field">
            <span>الإجراء <b aria-hidden="true">*</b></span>
            <textarea id="inventorySettlementAction" rows="5" maxlength="2000" placeholder="اكتب الإجراء والمراجعة التي تم تنفيذها..."></textarea>
            <small><span id="inventorySettlementActionCounter">0</span> / 2000</small>
          </label>
          <section class="inventory-settlement-preview" aria-live="polite">
            <h3>ملاحظة الإجراء المتوقع</h3>
            <p id="inventorySettlementPreviewText">اختر سبب التسوية لعرض الإجراء الذي سينفذه النظام.</p>
          </section>
          <p id="inventorySettlementModalError" class="inventory-settlement-error" role="alert" hidden></p>
        </div>
      </div>
      <footer class="inventory-settlement-actions app-liquid-modal__footer">
        <button type="button" class="secondary" data-inventory-settlement-close="button">إلغاء</button>
        <button type="button" class="primary inventory-settlement-submit" id="inventorySettlementSubmitBtn" disabled>حفظ التسوية</button>
      </footer>
    </section>`;
  document.body.appendChild(modal);
  const reasonSelect=modal.querySelector('#inventorySettlementReason');
  INVENTORY_SETTLEMENT_REASONS.forEach(reason=>{
    const option=document.createElement('option');
    option.value=reason.code;
    option.textContent=reason.label;
    reasonSelect?.appendChild(option);
  });
  modal.addEventListener('click',event=>{
    const closeTarget=event.target.closest('[data-inventory-settlement-close]');
    if(closeTarget && modal.contains(closeTarget) && closeTarget.dataset.inventorySettlementClose==='button'){
      event.preventDefault();
      closeInventoryCountSettlementModal();
      return;
    }
    const submit=event.target.closest('#inventorySettlementSubmitBtn');
    if(submit && modal.contains(submit)){
      event.preventDefault();
      submitInventoryCountSettlement();
    }
  });
  modal.addEventListener('input',event=>{
    if(event.target.matches('#inventorySettlementAction')){
      modal.dataset.serverError='';
      syncInventoryCountSettlementModal(modal);
    }
  });
  modal.addEventListener('change',event=>{
    if(event.target.matches('#inventorySettlementReason')){
      modal.dataset.serverError='';
      syncInventoryCountSettlementModal(modal);
    }
  });
  modal.addEventListener('input',event=>{
    if(event.target.matches('#inventorySettlementCorrectionQuantity')){
      modal.dataset.serverError='';
      syncInventoryCountSettlementModal(modal);
    }
  });
  modal.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      event.preventDefault();
      event.stopPropagation();
      closeInventoryCountSettlementModal();
    }
  });
  return modal;
}
function closeInventoryCountSettlementModal(options={}){
  const {restoreFocus=true,force=false}=options;
  const modal=$('#inventorySettlementModal');
  if(!modal) return;
  const lineId=String(INVENTORY_COUNT_STATE.settlementModalLineId || '');
  if(!force && lineId && INVENTORY_COUNT_STATE.settlementSaving.has(lineId)) return;
  const returnFocus=modal._inventorySettlementReturnFocus;
  unlockAppModalScroll('inventorySettlementModal');
  modal.remove();
  INVENTORY_COUNT_STATE.settlementModalLineId=null;
  INVENTORY_COUNT_STATE.settlementModalSnapshotId=null;
  if(restoreFocus && returnFocus?.isConnected){
    setTimeout(()=>returnFocus.focus({preventScroll:true}),0);
  }
}
function renderInventoryCountSettlementModal(modal,row,contextLine){
  if(!modal || !row || !contextLine) return;
  inventorySettlementModalSetText(modal,'material_code',row.material_code || '—');
  inventorySettlementModalSetText(modal,'material_name',row.material_name || '—');
  inventorySettlementModalSetText(modal,'production_quantity',formatInventorySettlementQuantity(contextLine.production_quantity));
  inventorySettlementModalSetText(modal,'incoming_transfers',formatInventorySettlementQuantity(contextLine.incoming_transfers));
  inventorySettlementModalSetText(modal,'outgoing_transfers',formatInventorySettlementQuantity(contextLine.outgoing_transfers));
  inventorySettlementModalSetText(modal,'sales_quantity',formatInventorySettlementQuantity(contextLine.sales_quantity));
  inventorySettlementModalSetText(modal,'book_balance',formatInventorySettlementQuantity(contextLine.book_balance));
  inventorySettlementModalSetText(modal,'physical_balance',contextLine.physical_balance===null || contextLine.physical_balance===undefined ? '—' : formatInventorySettlementQuantity(contextLine.physical_balance));
  inventorySettlementModalSetText(modal,'inventory_variance',formatInventorySettlementQuantity(contextLine.inventory_variance));
  inventorySettlementModalSetText(modal,'snapshot_number',INVENTORY_COUNT_STATE.settlementContextSnapshot?.snapshot_number || '—');
  const productionOption=modal.querySelector('#inventorySettlementReason option[value="production_difference"]');
  if(productionOption) productionOption.hidden=normalizeInventorySettlementNumber(contextLine.production_quantity)<=0;
}
function inventoryCountSettlementModalValidation(modal){
  const lineId=String(INVENTORY_COUNT_STATE.settlementModalLineId || '');
  const versionId=String(INVENTORY_COUNT_STATE.versionId || '');
  const snapshotId=String(INVENTORY_COUNT_STATE.settlementContextSnapshot?.snapshot_id || '');
  const row=(INVENTORY_COUNT_STATE.lines || []).find(item=>String(item.id || '')===lineId) || null;
  const contextLine=inventorySettlementContextLine(lineId);
  const reasonCode=String(modal?.querySelector('#inventorySettlementReason')?.value || '');
  const actionText=String(modal?.querySelector('#inventorySettlementAction')?.value || '').trim();
  const correctionInput=modal?.querySelector('#inventorySettlementCorrectionQuantity');
  const rawQ=correctionInput?.value;
  const correctionQty=rawQ ? normalizeInventorySettlementNumber(rawQ) : null;
  const requiresQ = ['transfer_overloaded','transfer_not_loaded','sales_overloaded','sales_not_loaded'].includes(reasonCode);
  let status='';
  if(!lineId || !row || !contextLine) status='line_not_found';
  else if(String(INVENTORY_COUNT_STATE.settlementContextVersionId || '')!==versionId) status='version_not_current';
  else if(!snapshotId || snapshotId!==String(INVENTORY_COUNT_STATE.settlementModalSnapshotId || '')) status='snapshot_not_current';
  else if(contextLine.is_reconciled) status='line_already_reconciled';
  else if(!inventorySettlementSnapshotMatchesLine(row,contextLine)) status='snapshot_stale';
  else if(contextLine.physical_balance===null || contextLine.physical_balance===undefined) status='physical_balance_required';
  else if(Math.abs(normalizeInventorySettlementNumber(row.inventory_variance))<0.0005) status='zero_variance';
  else if(!hasPermission('inventory_count','edit')) status='permission_denied';
  else if(inventoryCountLineHasActiveSave(lineId) && !INVENTORY_COUNT_STATE.settlementSaving.has(lineId)) status='row_version_conflict';
  else if(!getInventorySettlementReason(reasonCode)) status='invalid_reason';
  else if(requiresQ && (rawQ===null || rawQ===undefined || String(rawQ).trim()==='')) status='correction_quantity_required';
  else if(requiresQ && (!Number.isFinite(Number(rawQ)) || correctionQty<=0)) status='invalid_correction_quantity';
  else if(!actionText) status='action_required';
  else if(actionText.length>2000) status='action_too_long';
  const preview=calculateInventorySettlementPreview(contextLine,reasonCode,correctionQty);
  if(!status && !preview.valid) status=preview.negative ? 'negative_result_not_allowed' : (reasonCode==='production_difference' ? 'production_reason_not_allowed' : 'invalid_snapshot_values');
  return {valid:!status,row,contextLine,reasonCode,actionText,preview,status,versionId,snapshotId,lineId,correctionQty};
}
function syncInventoryCountSettlementModal(modal=$('#inventorySettlementModal')){
  if(!modal) return null;
  const validation=inventoryCountSettlementModalValidation(modal);
  const action=modal.querySelector('#inventorySettlementAction');
  const counter=modal.querySelector('#inventorySettlementActionCounter');
  const previewBox=modal.querySelector('.inventory-settlement-preview');
  const previewText=modal.querySelector('#inventorySettlementPreviewText');
  const errorBox=modal.querySelector('#inventorySettlementModalError');
  const submit=modal.querySelector('#inventorySettlementSubmitBtn');
  if(counter) counter.textContent=String(String(action?.value || '').length);
  if(previewText) previewText.textContent=validation.preview?.message || 'اختر سبب التسوية لعرض الإجراء الذي سينفذه النظام.';
  if(previewBox) previewBox.classList.toggle('is-warning',Boolean(validation.preview?.negative));
  const correctionField=modal.querySelector('#inventorySettlementCorrectionField');
  if(correctionField) correctionField.hidden=!['transfer_overloaded','transfer_not_loaded','sales_overloaded','sales_not_loaded'].includes(validation.reasonCode);
  const serverError=String(modal.dataset.serverError || '');
  const visibleError=serverError || (validation.status && !['invalid_reason','action_required'].includes(validation.status) ? inventorySettlementStatusMessage(validation.status,validation.reasonCode) : '');
  if(errorBox){
    errorBox.textContent=visibleError;
    errorBox.hidden=!visibleError;
  }
  if(submit){
    const disabled=!validation.valid || INVENTORY_COUNT_STATE.settlementSaving.has(validation.lineId);
    submit.disabled=disabled;
    submit.classList.toggle('is-disabled',disabled);
    submit.setAttribute('aria-disabled',disabled ? 'true' : 'false');
  }
  return validation;
}
function openInventoryCountSettlementModalFromButton(button){
  if(!button || button.disabled) return;
  const lineId=String(button.dataset.lineId || '');
  const versionId=String(button.dataset.versionId || '');
  const snapshotId=String(button.dataset.snapshotId || '');
  if(!lineId || versionId!==String(INVENTORY_COUNT_STATE.versionId || '')) return;
  const row=(INVENTORY_COUNT_STATE.lines || []).find(item=>String(item.id || '')===lineId);
  const contextLine=inventorySettlementContextLine(lineId);
  if(!row || !contextLine || snapshotId!==String(INVENTORY_COUNT_STATE.settlementContextSnapshot?.snapshot_id || '')) return;
  if(inventoryCountLineHasActiveSave(lineId)){
    showInventoryCountToast('انتظر اكتمال حفظ بيانات الصنف.','warning');
    return;
  }
  if(contextLine.is_reconciled){
    showInventoryCountToast('تمت تسوية فرق الجرد لهذا الصنف بالفعل.','info');
    return;
  }
  if(!inventorySettlementSnapshotMatchesLine(row,contextLine)){
    showInventoryCountToast('استبدل مستند فروق الجرد قبل تنفيذ التسوية.','warning');
    return;
  }
  if(contextLine.physical_balance===null || contextLine.physical_balance===undefined){
    showInventoryCountToast('يجب إدخال الرصيد الفعلي للصنف قبل تنفيذ التسوية.','warning');
    return;
  }
  if(Math.abs(normalizeInventorySettlementNumber(row.inventory_variance))<0.0005) return;
  if(!hasPermission('inventory_count','edit')){
    showInventoryCountToast('لا تملك صلاحية تعديل مستند الجرد.','error');
    return;
  }
  const modal=ensureInventoryCountSettlementModal();
  modal._inventorySettlementReturnFocus=button;
  modal.dataset.serverError='';
  INVENTORY_COUNT_STATE.settlementModalLineId=lineId;
  INVENTORY_COUNT_STATE.settlementModalSnapshotId=snapshotId;
  renderInventoryCountSettlementModal(modal,row,contextLine);
  const reason=modal.querySelector('#inventorySettlementReason');
  const action=modal.querySelector('#inventorySettlementAction');
  const correctionInput=modal.querySelector('#inventorySettlementCorrectionQuantity');
  if(reason) reason.value='';
  if(action) action.value='';
  if(correctionInput) correctionInput.value='';
  modal.hidden=false;
  modal.setAttribute('aria-hidden','false');
  modal._appModalClose=closeInventoryCountSettlementModal;
  lockAppModalScroll('inventorySettlementModal',modal);
  syncInventoryCountSettlementModal(modal);
  setTimeout(()=>reason?.focus({preventScroll:true}),0);
}


function setInventoryCountSettlementModalLoading(modal,loading){
  if(!modal) return;
  modal.classList.toggle('is-saving',Boolean(loading));
  modal.querySelectorAll('select,textarea,input,[data-inventory-settlement-close]').forEach(control=>{
    control.disabled=Boolean(loading);
  });
  const submit=modal.querySelector('#inventorySettlementSubmitBtn');
  if(submit){
    submit.disabled=Boolean(loading) || submit.disabled;
    submit.textContent=loading ? 'جارٍ حفظ التسوية…' : 'حفظ التسوية';
  }
}
function inventorySettlementStatusFromError(err){
  const message=String(err?.message || err || '');
  const statuses=[
    'line_already_reconciled','post_reversal_snapshot_stale','snapshot_stale','snapshot_not_current','current_snapshot_not_found',
    'snapshot_line_not_found','material_code_mismatch','row_version_conflict','physical_balance_required',
    'production_reason_not_allowed','negative_result_not_allowed','inventory_count_read_only',
    'permission_denied','inactive_user','not_authenticated','line_not_found','version_not_current',
    'zero_variance','invalid_reason','action_required','action_too_long','postcondition_failed',
    'invalid_snapshot_values','settlement_state_changed',
    'correction_quantity_required','invalid_correction_quantity',
    'insufficient_outgoing_transfers','insufficient_sales_quantity',
    'negative_production_after_residual','negative_physical_result_not_allowed'
  ];
  return statuses.find(status=>message.includes(status)) || '';
}
async function submitInventoryCountSettlement(){
  const modal=$('#inventorySettlementModal');
  if(!modal) return;
  const validation=syncInventoryCountSettlementModal(modal);
  if(!validation?.valid || INVENTORY_COUNT_STATE.settlementSaving.has(validation.lineId)) return;
  const lineId=validation.lineId;
  const versionId=validation.versionId;
  const inventoryRequestSeq=INVENTORY_COUNT_STATE.requestSeq;
  INVENTORY_COUNT_STATE.settlementSaving.add(lineId);
  modal.dataset.serverError='';
  setInventoryCountSettlementModalLoading(modal,true);
  try{
    const {data,error}=await WarehouseDB.client.rpc('reconcile_inventory_count_line_phase_locked',{
      p_line_id:lineId,
      p_snapshot_id:validation.snapshotId,
      p_reason_code:validation.reasonCode,
      p_action_text:validation.actionText,
      p_expected_row_version:Number(validation.row.row_version),
      p_correction_quantity:validation.correctionQty || null
    });
    if(error) throw error;
    if(data?.status!=='inventory_line_reconciled'){
      const failure=new Error(inventorySettlementStatusMessage(data?.status,validation.reasonCode));
      failure.inventorySettlementStatus=String(data?.status || '');
      throw failure;
    }
    markInventoryCountSettlementPhaseStarted();
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
    if(String(INVENTORY_COUNT_STATE.versionId || '')===versionId
      && inventoryRequestSeq===INVENTORY_COUNT_STATE.requestSeq){
      await loadInventoryCountLines(versionId,inventoryRequestSeq);
    }
    closeInventoryCountSettlementModal({restoreFocus:false,force:true});
    showInventoryCountToast('تم حفظ تسوية فرق الجرد بنجاح.','success');
  }catch(err){
    console.error('Inventory count line settlement failed',err);
    const status=String(err?.inventorySettlementStatus || inventorySettlementStatusFromError(err));
    const message=status ? inventorySettlementStatusMessage(status,validation.reasonCode) : (err?.message || 'تعذر حفظ تسوية فرق الجرد.');
    if(modal.isConnected){
      modal.dataset.serverError=message;
      const errorBox=modal.querySelector('#inventorySettlementModalError');
      if(errorBox){
        errorBox.textContent=message;
        errorBox.hidden=false;
      }
    }
    showInventoryCountToast(message,'error');
  }finally{
    INVENTORY_COUNT_STATE.settlementSaving.delete(lineId);
    if(modal.isConnected){
      setInventoryCountSettlementModalLoading(modal,false);
      syncInventoryCountSettlementModal(modal);
    }
    if(String(INVENTORY_COUNT_STATE.versionId || '')===versionId){
      renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
    }
  }
}

function inventorySettlementTargetFieldLabel(field){
  return ({
    production_quantity:'الإنتاج',incoming_transfers:'التحويلات الواردة',outgoing_transfers:'التحويلات الصادرة',
    sales_quantity:'كمية البيع',physical_balance:'الرصيد الفعلي',
    multiple:'عدة حقول (تسوية على مرحلتين)', 'outgoing_transfers+incoming_transfers':'التحويلات الصادرة والواردة'
  })[String(field || '')] || String(field || '—');
}
function inventorySettlementMethodLabel(method){
  return ({
    adjust_production:'تعديل الإنتاج',
    adjust_incoming_transfers:'تعديل التحويلات الواردة',
    adjust_outgoing_transfers:'تعديل التحويلات الصادرة',
    adjust_sales_quantity:'تعديل كمية البيع',
    align_physical_to_book:'مطابقة الرصيد الفعلي مع الرصيد الدفتري',
    increase_outgoing_transfer:'زيادة التحويلات الصادرة',
    shift_outgoing_to_incoming:'نقل كمية من التحويلات الصادرة إلى الواردة',
    increase_sales:'زيادة كمية البيع',
    decrease_sales:'خفض كمية البيع',
    two_stage_reconciliation:'تسوية على مرحلتين',
    none:'لا توجد تسوية متبقية'
  })[String(method || '')] || (method ? String(method) : '—');
}
function formatInventoryAuditHistoryValue(key,value){
  if(value===null || value===undefined || value==='') return '—';
  if(key==='oldest_date') return formatDisplayDate(value,'—');
  if(key==='inventory_counter_name_snapshot' || key==='inventory_counter_job_title_snapshot') return String(value || '—');
  const numeric=Number(value);
  return Number.isFinite(numeric) ? formatInventoryCountThreeDecimalQuantity(numeric) : String(value);
}
function inventorySettlementTargetValues(contextLine){
  const field=String(contextLine?.target_field || '');
  const map={
    production_quantity:['production_before','production_after'],
    incoming_transfers:['incoming_transfers_before','incoming_transfers_after'],
    outgoing_transfers:['outgoing_transfers_before','outgoing_transfers_after'],
    sales_quantity:['sales_quantity_before','sales_quantity_after'],
    physical_balance:['physical_balance_before','physical_balance_after']
  };
  const keys=map[field] || [];
  return {before:contextLine?.[keys[0]],after:contextLine?.[keys[1]]};
}
function inventorySettlementReversalStatusMessage(status){
  const messages={
    not_authenticated:'يجب تسجيل الدخول قبل تنفيذ التراجع.',
    inactive_user:'الحساب الحالي غير نشط.',
    permission_denied:'لا تملك صلاحية تعديل مستند الجرد.',
    reversal_reason_required:'سبب التراجع مطلوب.',
    reversal_reason_too_long:'سبب التراجع يجب ألا يتجاوز 2000 حرف.',
    settlement_not_found:'تعذر العثور على سجل التسوية.',
    line_not_found:'تعذر العثور على سطر الجرد.',
    version_not_found:'تعذر العثور على نسخة الجرد.',
    version_not_current:'نسخة الجرد لم تعد النسخة الحالية.',
    inventory_count_read_only:'نسخة الجرد الحالية لا تسمح بالتعديل.',
    settlement_not_active:'هذه التسوية ليست التسوية الفعالة حاليًا.',
    settlement_already_reversed:'تم التراجع عن هذه التسوية بالفعل.',
    row_version_conflict:'تم تعديل بيانات الصنف من مستخدم آخر. أعد تحميل المستند.',
    reversal_row_version_conflict:'تم تعديل بيانات الصنف من مستخدم آخر. أعد تحميل المستند.',
    settlement_state_changed:'تم تعديل بيانات الصنف بعد التسوية، ولا يمكن التراجع قبل مراجعة حالة السطر.',
    snapshot_line_not_found:'تعذر العثور على سطر الصنف في مستند فروق الجرد.',
    reversal_postcondition_failed:'تعذر إكمال التراجع لأن القيم النهائية لم تطابق الحالة الأصلية.'
  };
  return messages[String(status || '')] || 'تعذر التراجع عن تسوية فرق الجرد.';
}
function ensureInventoryCountSettlementReversalModal(){
  let modal=$('#inventorySettlementReversalModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='inventorySettlementReversalModal';
  modal.className='inventory-settlement-reversal-modal app-liquid-modal-backdrop';
  modal.innerHTML=`
    <div class="inventory-settlement-reversal-backdrop" aria-hidden="true"></div>
    <section class="inventory-settlement-reversal-dialog app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="inventorySettlementReversalTitle" dir="rtl">
      <header class="inventory-settlement-reversal-header app-liquid-modal__header">
        <div><p class="inventory-settlement-eyebrow">الجرد وتوثيق المخزون</p><h2 id="inventorySettlementReversalTitle" class="app-liquid-modal__title">التراجع عن تسوية فرق الجرد</h2></div>
        <button type="button" class="inventory-settlement-reversal-close app-liquid-modal__close" data-inventory-reversal-close="button" aria-label="إغلاق نافذة التراجع">×</button>
      </header>
      <div class="inventory-settlement-reversal-body app-liquid-modal__body">
        <section class="inventory-settlement-reversal-summary app-liquid-modal__section">
          <h3 data-inventory-reversal-value="material"></h3>
          <div class="inventory-settlement-reversal-grid">
          </div>
          <div class="inventory-settlement-reversal-action"><span>الإجراء المسجل</span><p data-inventory-reversal-value="action"></p></div>
        </section>
        <label class="inventory-settlement-field"><span>سبب التراجع <b aria-hidden="true">*</b></span><textarea id="inventorySettlementReversalReason" rows="5" maxlength="2000" placeholder="اكتب سبب التراجع..."></textarea><small><span id="inventorySettlementReversalCounter">0</span> / 2000</small></label>
        <p id="inventorySettlementReversalError" class="inventory-settlement-error app-liquid-modal__error" role="alert" hidden></p>
      </div>
      <footer class="inventory-settlement-reversal-actions app-liquid-modal__footer"><button type="button" class="secondary" data-inventory-reversal-close="button">إلغاء</button><button type="button" class="danger inventory-settlement-reversal-submit" id="inventorySettlementReversalSubmit" disabled>تأكيد التراجع</button></footer>
    </section>`;
  modal.addEventListener('click',event=>{
    const close=event.target.closest('[data-inventory-reversal-close]');
    if(close && modal.contains(close) && close.dataset.inventoryReversalClose==='button'){
      event.preventDefault(); closeInventoryCountSettlementReversalModal(); return;
    }
    if(event.target.closest('#inventorySettlementReversalSubmit')){event.preventDefault();submitInventoryCountSettlementReversal();}
  });
  modal.addEventListener('input',event=>{
    if(event.target.matches('#inventorySettlementReversalReason')){
      modal.dataset.serverError=''; syncInventoryCountSettlementReversalModal(modal);
    }
  });
  document.body.appendChild(modal);
  return modal;
}
function setInventorySettlementReversalText(modal,key,value){
  const el=modal?.querySelector(`[data-inventory-reversal-value="${key}"]`);
  if(el) el.textContent=value===null || value===undefined || value==='' ? '—' : String(value);
}
function syncInventoryCountSettlementReversalModal(modal){
  const reason=modal?.querySelector('#inventorySettlementReversalReason');
  const text=String(reason?.value || '');
  const trimmed=text.trim();
  const counter=modal?.querySelector('#inventorySettlementReversalCounter');
  if(counter) counter.textContent=String(text.length);
  const errorBox=modal?.querySelector('#inventorySettlementReversalError');
  const error=String(modal?.dataset.serverError || '');
  if(errorBox){errorBox.textContent=error;errorBox.hidden=!error;}
  const lineId=String(INVENTORY_COUNT_STATE.reversalModalLineId || '');
  const settlementId=String(INVENTORY_COUNT_STATE.reversalModalSettlementId || '');
  const busy=INVENTORY_COUNT_STATE.reversalSaving.has(lineId);
  const submit=modal?.querySelector('#inventorySettlementReversalSubmit');
  if(submit) submit.disabled=busy || !trimmed || text.length>2000 || !lineId || !settlementId;
  return {valid:!busy && Boolean(trimmed) && text.length<=2000 && Boolean(lineId) && Boolean(settlementId),reason:trimmed,lineId,settlementId};
}
function setInventoryCountSettlementReversalLoading(modal,loading){
  modal?.classList.toggle('is-saving',Boolean(loading));
  modal?.querySelectorAll('textarea,[data-inventory-reversal-close]').forEach(el=>{el.disabled=Boolean(loading);});
  const submit=modal?.querySelector('#inventorySettlementReversalSubmit');
  if(submit){submit.disabled=Boolean(loading) || submit.disabled;submit.textContent=loading?'جاري تنفيذ التراجع...':'تأكيد التراجع';}
}
function openInventoryCountSettlementReversalModalFromButton(button){
  if(!button || button.disabled) return;
  const lineId=String(button.dataset.lineId || '');
  const versionId=String(button.dataset.versionId || '');
  const settlementId=String(button.dataset.settlementId || '');
  if(!lineId || !settlementId || versionId!==String(INVENTORY_COUNT_STATE.versionId || '')) return;
  const row=(INVENTORY_COUNT_STATE.lines || []).find(item=>String(item?.id || '')===lineId);
  const contextLine=inventorySettlementContextLine(lineId);
  if(!row || !contextLine || String(contextLine.active_settlement_id || contextLine.settlement_id || '')!==settlementId) return;
  if(inventoryCountLineHasActiveSave(lineId)){showInventoryCountToast('انتظر اكتمال حفظ بيانات الصنف.','warning');return;}
  if(!hasPermission('inventory_count','edit')){showInventoryCountToast('لا تملك صلاحية تعديل مستند الجرد.','error');return;}
  const modal=ensureInventoryCountSettlementReversalModal();
  modal._inventorySettlementReversalReturnFocus=button;
  modal.dataset.serverError='';
  modal.dataset.versionId=versionId;
  modal.dataset.expectedRowVersion=String(row.row_version ?? '');
  INVENTORY_COUNT_STATE.reversalModalLineId=lineId;
  INVENTORY_COUNT_STATE.reversalModalSettlementId=settlementId;
  const grid=modal.querySelector('.inventory-settlement-reversal-grid');
  const actionContainer=modal.querySelector('.inventory-settlement-reversal-action');
  const target=inventorySettlementTargetValues(contextLine);

  if(contextLine.correction_quantity != null){
    if(actionContainer) actionContainer.hidden=true;
    grid?.classList.add('is-two-stage');
    const primaryChanges=[];
    if(contextLine.primary_target_field==='outgoing_transfers+incoming_transfers' || contextLine.primary_target_field==='multiple'){
      primaryChanges.push(`<div class="inventory-settlement-reversal-summary-row"><span>التحويلات الصادرة</span><strong>${formatInventorySettlementQuantity(contextLine.outgoing_transfers_before)} ← ${formatInventorySettlementQuantity(contextLine.outgoing_transfers_after)} طن</strong></div>`);
      primaryChanges.push(`<div class="inventory-settlement-reversal-summary-row"><span>التحويلات الواردة</span><strong>${formatInventorySettlementQuantity(contextLine.incoming_transfers_before)} ← ${formatInventorySettlementQuantity(contextLine.incoming_transfers_after)} طن</strong></div>`);
    }else if(contextLine.primary_target_field==='outgoing_transfers'){
      primaryChanges.push(`<div class="inventory-settlement-reversal-summary-row"><span>التحويلات الصادرة</span><strong>${formatInventorySettlementQuantity(contextLine.outgoing_transfers_before)} ← ${formatInventorySettlementQuantity(contextLine.outgoing_transfers_after)} طن</strong></div>`);
    }else if(contextLine.primary_target_field==='sales_quantity'){
      primaryChanges.push(`<div class="inventory-settlement-reversal-summary-row"><span>كمية البيع</span><strong>${formatInventorySettlementQuantity(contextLine.sales_quantity_before)} ← ${formatInventorySettlementQuantity(contextLine.sales_quantity_after)} طن</strong></div>`);
    }
    const secondaryChange=contextLine.secondary_target_field==='production_quantity'
      ? `<div class="inventory-settlement-reversal-summary-row"><span>الإنتاج</span><strong>${formatInventorySettlementQuantity(contextLine.production_before)} ← ${formatInventorySettlementQuantity(contextLine.production_after)} طن</strong></div>`
      : contextLine.secondary_target_field==='physical_balance'
        ? `<div class="inventory-settlement-reversal-summary-row"><span>الرصيد الفعلي</span><strong>${formatInventorySettlementQuantity(contextLine.physical_balance_before)} ← ${formatInventorySettlementQuantity(contextLine.physical_balance_after)} طن</strong></div>`
        : '<div class="inventory-settlement-reversal-summary-row"><span>المرحلة الثانية</span><strong>لا توجد تسوية متبقية</strong></div>';
    if(grid) grid.innerHTML=`
      <div class="inventory-settlement-reversal-two-stage">
        <div class="inventory-settlement-reversal-two-stage-meta">
          <div class="inventory-settlement-reversal-summary-row"><span>سبب التسوية</span><strong>${escapeHtml(contextLine.reason_label || '—')}</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>الإجراء</span><strong>${escapeHtml(contextLine.action_text || '—')}</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>منفذ التسوية</span><strong>${escapeHtml(contextLine.reconciled_by_name || '—')}</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>وقت التسوية</span><strong>${escapeHtml(formatDisplayDateTime(contextLine.reconciled_at,'—'))}</strong></div>
          <div class="inventory-settlement-reversal-summary-row is-accent"><span>كمية التحميل الخاطئ (Q)</span><strong>${formatInventorySettlementQuantity(contextLine.correction_quantity)} طن</strong></div>
        </div>
        <section class="inventory-settlement-reversal-stage-card">
          <h4>المرحلة الأولى: ${escapeHtml(inventorySettlementMethodLabel(contextLine.primary_reconciliation_method))}</h4>
          <div class="inventory-settlement-reversal-summary-row"><span>الحقول المعدلة</span><strong>${escapeHtml(inventorySettlementTargetFieldLabel(contextLine.primary_target_field))}</strong></div>
          ${primaryChanges.join('')}
          <div class="inventory-settlement-reversal-summary-row"><span>الرصيد الدفتري بعد المرحلة الأولى</span><strong>${formatInventorySettlementQuantity(contextLine.book_balance_after_primary)} طن</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>فرق الجرد المتبقي</span><strong>${formatInventorySettlementQuantity(contextLine.residual_variance_after_primary)} طن</strong></div>
        </section>
        <section class="inventory-settlement-reversal-stage-card">
          <h4>المرحلة الثانية: ${escapeHtml(inventorySettlementMethodLabel(contextLine.secondary_reconciliation_method))}</h4>
          <div class="inventory-settlement-reversal-summary-row"><span>الحقل الثانوي</span><strong>${escapeHtml(inventorySettlementTargetFieldLabel(contextLine.secondary_target_field))}</strong></div>
          ${secondaryChange}
          <div class="inventory-settlement-reversal-summary-row"><span>الرصيد الدفتري النهائي</span><strong>${formatInventorySettlementQuantity(contextLine.book_balance_after)} طن</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>الرصيد الفعلي النهائي</span><strong>${formatInventorySettlementQuantity(contextLine.physical_balance_after)} طن</strong></div>
          <div class="inventory-settlement-reversal-summary-row"><span>فرق الجرد النهائي</span><strong>${formatInventorySettlementQuantity(contextLine.variance_after)} طن</strong></div>
        </section>
      </div>`;
  }else{
    if(actionContainer) actionContainer.hidden=false;
    grid?.classList.remove('is-two-stage');
    if(grid) grid.innerHTML=`
      <div><span>سبب التسوية</span><strong>${escapeHtml(contextLine.reason_label || '—')}</strong></div>
      <div><span>منفذ التسوية</span><strong>${escapeHtml(contextLine.reconciled_by_name || '—')}</strong></div>
      <div><span>وقت التسوية</span><strong>${escapeHtml(formatDisplayDateTime(contextLine.reconciled_at,'—'))}</strong></div>
      <div><span>الحقل المستهدف</span><strong>${escapeHtml(inventorySettlementTargetFieldLabel(contextLine.target_field))}</strong></div>
      <div><span>القيمة قبل التسوية</span><strong>${formatInventorySettlementQuantity(target.before)} طن</strong></div>
      <div><span>القيمة بعد التسوية</span><strong>${formatInventorySettlementQuantity(target.after)} طن</strong></div>
      <div><span>فرق الجرد قبل التسوية</span><strong>${formatInventorySettlementQuantity(contextLine.variance_before)} طن</strong></div>
      <div><span>فرق الجرد بعد التسوية</span><strong>${formatInventorySettlementQuantity(contextLine.variance_after)} طن</strong></div>`;
    setInventorySettlementReversalText(modal,'action',contextLine.action_text || '—');
  }

  const reason=modal.querySelector('#inventorySettlementReversalReason'); if(reason) reason.value='';
  modal._appModalClose=closeInventoryCountSettlementReversalModal;
  lockAppModalScroll('inventorySettlementReversalModal',modal);
  syncInventoryCountSettlementReversalModal(modal);
  requestAnimationFrame(()=>reason?.focus({preventScroll:true}));
}
function closeInventoryCountSettlementReversalModal(options={}){
  const {restoreFocus=true,force=false}=options;
  const modal=$('#inventorySettlementReversalModal');
  if(!modal) return;
  const lineId=String(INVENTORY_COUNT_STATE.reversalModalLineId || '');
  if(!force && lineId && INVENTORY_COUNT_STATE.reversalSaving.has(lineId)) return;
  const returnFocus=modal._inventorySettlementReversalReturnFocus;
  unlockAppModalScroll('inventorySettlementReversalModal');
  modal.remove();
  INVENTORY_COUNT_STATE.reversalModalLineId=null;
  INVENTORY_COUNT_STATE.reversalModalSettlementId=null;
  if(restoreFocus && returnFocus?.isConnected) requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
}

function inventorySettlementReversalStatusFromError(err){
  const message=String(err?.message || err || '');
  const statuses=['settlement_already_reversed','settlement_not_active','settlement_state_changed','reversal_row_version_conflict','row_version_conflict','reversal_reason_required','reversal_reason_too_long','reversal_postcondition_failed','inventory_count_read_only','version_not_current','version_not_found','settlement_not_found','line_not_found','snapshot_line_not_found','permission_denied','inactive_user','not_authenticated'];
  return statuses.find(status=>message.includes(status)) || '';
}
async function submitInventoryCountSettlementReversal(){
  const modal=$('#inventorySettlementReversalModal');
  const validation=syncInventoryCountSettlementReversalModal(modal);
  if(!modal || !validation?.valid) return;
  const {lineId,settlementId}=validation;
  const versionId=String(modal.dataset.versionId || '');
  const expectedRowVersion=Number(modal.dataset.expectedRowVersion);
  const inventoryRequestSeq=INVENTORY_COUNT_STATE.requestSeq;
  if(versionId!==String(INVENTORY_COUNT_STATE.versionId || '') || !Number.isFinite(expectedRowVersion)) return;
  INVENTORY_COUNT_STATE.reversalSaving.add(lineId);
  modal.dataset.serverError='';
  setInventoryCountSettlementReversalLoading(modal,true);
  renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  try{
    const {data,error}=await WarehouseDB.client.rpc('reverse_inventory_count_line_settlement_phase_locked',{
      p_settlement_id:settlementId,p_reversal_reason:validation.reason,p_expected_row_version:expectedRowVersion
    });
    if(error) throw error;
    if(data?.status!=='inventory_line_settlement_reversed'){
      const failure=new Error(inventorySettlementReversalStatusMessage(data?.status));
      failure.inventorySettlementReversalStatus=String(data?.status || ''); throw failure;
    }
    if(versionId===String(INVENTORY_COUNT_STATE.versionId || '') && inventoryRequestSeq===INVENTORY_COUNT_STATE.requestSeq){
      await loadInventoryCountLines(versionId,inventoryRequestSeq);
    }
    closeInventoryCountSettlementReversalModal({restoreFocus:false,force:true});
    showInventoryCountToast('تم التراجع عن تسوية فرق الجرد بنجاح.','success');
  }catch(err){
    console.error('Inventory count settlement reversal failed',err);
    const status=String(err?.inventorySettlementReversalStatus || inventorySettlementReversalStatusFromError(err));
    const message=status?inventorySettlementReversalStatusMessage(status):(err?.message || 'تعذر التراجع عن تسوية فرق الجرد.');
    if(modal.isConnected){modal.dataset.serverError=message;syncInventoryCountSettlementReversalModal(modal);}
    showInventoryCountToast(message,'error');
  }finally{
    INVENTORY_COUNT_STATE.reversalSaving.delete(lineId);
    if(modal.isConnected){setInventoryCountSettlementReversalLoading(modal,false);syncInventoryCountSettlementReversalModal(modal);}
    if(versionId===String(INVENTORY_COUNT_STATE.versionId || '')) renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  }
}

function renderInventorySettlementCell(row){
  const empty='<td class="inventory-settlement-cell"></td>';
  const versionId=String(INVENTORY_COUNT_STATE.versionId || '');
  if(!versionId) return empty;
  if(inventoryCountIsFinalized()){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-finalized" type="button" disabled title="تم إنهاء مستند الجرد نهائيًا.">تم إنهاء الجرد</button></td>';
  }

  const contextVersionMatches=String(INVENTORY_COUNT_STATE.settlementContextVersionId || '')===versionId;
  const contextLine=contextVersionMatches ? inventorySettlementContextLine(row?.id) : null;

  // An active settlement must always expose its reversal action, even if the
  // Current Snapshot was later replaced or temporarily unavailable.
  if(contextLine && (contextLine.is_reconciled || contextLine.active_settlement_id)){
    const rawLineId=String(row?.id || '');
    const lineId=escapeHtml(rawLineId);
    const settlementId=escapeHtml(String(contextLine.active_settlement_id || contextLine.settlement_id || ''));
    if(!hasPermission('inventory_count','edit') || contextLine.can_reverse===false){
      return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-reverse-btn" type="button" disabled title="لا تملك صلاحية تعديل مستند الجرد.">تراجع</button></td>';
    }
    if(INVENTORY_COUNT_STATE.reversalSaving instanceof Set && INVENTORY_COUNT_STATE.reversalSaving.has(rawLineId)){
      return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-reverse-btn is-loading" type="button" disabled title="جاري تنفيذ التراجع على السطر.">جاري التراجع...</button></td>';
    }
    if(INVENTORY_COUNT_STATE.settlementSaving instanceof Set && INVENTORY_COUNT_STATE.settlementSaving.has(rawLineId)){
      return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-reverse-btn is-loading" type="button" disabled title="جاري إنهاء حفظ التسوية.">جارٍ حفظ التسوية...</button></td>';
    }
    return `<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-reverse-btn" type="button" title="التراجع عن تسوية فرق الجرد" data-line-id="${lineId}" data-version-id="${escapeHtml(versionId)}" data-settlement-id="${settlementId}" data-expected-row-version="${escapeHtml(row?.row_version ?? '')}">تراجع</button></td>`;
  }

  if(INVENTORY_COUNT_STATE.settlementContextLoading){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-loading" type="button" disabled title="جاري تحميل حالة التسويات.">جاري التحميل...</button></td>';
  }

  if(INVENTORY_COUNT_STATE.settlementContextError){
    const message=escapeHtml(INVENTORY_COUNT_STATE.settlementContextError);
    return `<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-context-retry-btn is-error" type="button" title="${message}" data-version-id="${escapeHtml(versionId)}">إعادة تحميل الحالة</button></td>`;
  }

  if(!contextVersionMatches){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-loading" type="button" disabled title="جاري مزامنة حالة التسويات.">جاري المزامنة...</button></td>';
  }

  // No Current Snapshot means settlement is intentionally unavailable.
  if(!INVENTORY_COUNT_STATE.settlementContextSnapshot) return empty;
  if(!contextLine){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-stale" type="button" disabled title="الصنف غير موجود داخل مستند فروق الجرد الحالي.">غير متاح</button></td>';
  }

  if(!inventorySettlementSnapshotMatchesLine(row,contextLine)){
    const staleTitle=String(contextLine.current_state || '')==='reversed'
      ? 'تم تعديل بيانات الصنف بعد التراجع. استبدل مستند فروق الجرد قبل تنفيذ تسوية جديدة.'
      : 'تم تعديل بيانات الصنف بعد إعداد مستند فروق الجرد.';
    return `<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-stale" type="button" disabled title="${escapeHtml(staleTitle)}">استبدل مستند الفروق</button></td>`;
  }
  if(contextLine.physical_balance===null || contextLine.physical_balance===undefined){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn" type="button" disabled title="يجب إدخال الرصيد الفعلي للصنف قبل تنفيذ التسوية.">تسوية الجرد</button></td>';
  }
  const variance=normalizeInventorySettlementNumber(row?.inventory_variance);
  if(Math.abs(variance)<0.0005){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn" type="button" disabled title="لا يوجد فرق جرد يحتاج إلى تسوية.">تسوية الجرد</button></td>';
  }
  if(!hasPermission('inventory_count','edit') || contextLine.can_settle===false){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn" type="button" disabled title="لا تملك صلاحية تعديل مستند الجرد أو أن السطر غير صالح للتسوية.">تسوية الجرد</button></td>';
  }
  if(inventoryCountLineHasActiveSave(row?.id)){
    return '<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn is-loading" type="button" disabled title="جاري حفظ بيانات السطر.">جاري الحفظ...</button></td>';
  }
  const snapshotId=String(INVENTORY_COUNT_STATE.settlementContextSnapshot?.snapshot_id || '');
  return `<td class="inventory-settlement-cell"><button class="secondary inventory-settlement-btn" type="button" title="تسوية فرق الجرد" data-line-id="${escapeHtml(row.id||'')}" data-version-id="${escapeHtml(versionId)}" data-snapshot-id="${escapeHtml(snapshotId)}" data-expected-row-version="${escapeHtml(row.row_version ?? '')}">تسوية الجرد</button></td>`;
}

function renderInventoryCounterCell(row){
  const currentId=String(row.inventory_counter_id || '').trim();
  const currentName=String(row.inventory_counter_name_snapshot || '').trim();
  const currentJob=String(row.inventory_counter_job_title_snapshot || '').trim();
  const options=INVENTORY_COUNT_STATE.inventoryCounterOptions || [];
  const hasCurrent=currentId && options.some(option=>String(option.id)===currentId);
  let html='<option value="">—</option>';
  if(currentId && !hasCurrent && currentName){
    const label=currentJob ? `${currentName} — ${currentJob}` : currentName;
    html += `<option value="${escapeHtml(currentId)}" selected>${escapeHtml(label)}</option>`;
  }
  html += options.map(option=>{
    const id=String(option.id || '');
    const selected=id===currentId ? ' selected' : '';
    return `<option value="${escapeHtml(id)}"${selected}>${escapeHtml(inventoryCountCounterOptionLabel(option))}</option>`;
  }).join('');
  const lockAttrs=inventoryCountManualControlLockAttributes();
  return `<td class="inventory-counter-cell"><select class="inventory-counter-select" aria-label="القائم بالجرد" data-line-id="${escapeHtml(row.id||'')}" data-row-version="${escapeHtml(row.row_version ?? '')}" data-last-saved="${escapeHtml(currentId)}"${lockAttrs}>${html}</select></td>`;
}
function renderInventoryCountLines(rows=[]){
  const tbody=$('#inventoryCountLinesTable tbody');
  if(!tbody) return;
  INVENTORY_COUNT_STATE.lines=rows;
  updateInventoryCountFilterOptions(rows);
  if(!rows.length){
    tbody.innerHTML=`<tr><td colspan="${inventoryCountVisibleColumnCount()}" class="empty-state">لا توجد بنود جرد للنسخة الحالية.</td></tr>`;
    renderInventoryCountTotals([]);
    applyInventoryCountColumnVisibility();
    updateInventoryCountFreezePanes();
    return;
  }
  const displayRows=inventoryCountDisplayRows(rows);
  if(!displayRows.length){
    tbody.innerHTML=`<tr><td colspan="${inventoryCountVisibleColumnCount()}" class="empty-state">لا توجد نتائج مطابقة.</td></tr>`;
    renderInventoryCountTotals(rows);
    applyInventoryCountColumnVisibility();
    updateInventoryCountFreezePanes();
    return;
  }
  tbody.innerHTML=displayRows.map(row=>`<tr>
    ${renderInventoryReviewTriggerCell(row,'material_code','كود المادة')}
    ${renderInventoryReviewTriggerCell(row,'material_name','وصف المادة')}
    <td>${formatInventoryCountText(row.uom)}</td>
    ${renderInventoryOpeningBalanceCell(row)}
    ${renderInventoryProductionQuantityCell(row)}
    <td>${formatInventoryCountThreeDecimalQuantity(row.incoming_transfers)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.actual_returns)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.adjustment_increase_z22)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.adjustment_shortage_z21)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.sales_quantity)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.outgoing_transfers)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.rework_311)}</td>
    <td>${formatInventoryCountThreeDecimalQuantity(row.book_balance)}</td>
    ${renderInventoryPhysicalBalanceCell(row)}
    ${renderInventoryVarianceCell(row.inventory_variance)}
    ${renderInventoryOldestQuantityCell(row)}
    ${renderInventoryOldestDateCell(row)}
    ${renderInventoryCounterCell(row)}
    ${renderInventorySettlementCell(row)}
  </tr>`).join('');
  updateInventoryOpeningBalanceInputsWidth(tbody);
  if(window.CustomDatePicker) window.CustomDatePicker.init(tbody);
  renderInventoryCountTotals(rows);
  updateInventoryCountFreezePanes();
  updateInventoryCountFinalizationControls();
}
async function filterInventoryCountLinesByCurrentWarehouse(rows=[]){
  const warehouseCode=inventoryCountReadInputs().warehouseCode;
  if(!warehouseCode || !rows.length || !window.WarehouseDB?.ready) return rows;
  const materialCodes=[...new Set(rows.map(row=>String(row.material_code||'').trim().toUpperCase()).filter(Boolean))];
  if(!materialCodes.length) return [];
  const {data,error}=await WarehouseDB.client
    .from('sales_product_warehouses')
    .select('material_code')
    .eq('warehouse_code',warehouseCode)
    .eq('is_active',true)
    .in('material_code',materialCodes);
  if(error) throw error;
  const allowed=new Set((data||[]).map(row=>String(row.material_code||'').trim().toUpperCase()));
  return rows.filter(row=>allowed.has(String(row.material_code||'').trim().toUpperCase()));
}
function resetInventoryCountView(message='لم يتم إنشاء جرد بعد.'){
  closeActiveApplicationModals({restoreFocus:false});
  closeInventoryReviewRecommendationsModal({restoreFocus:false});
  clearInventoryCountSettlementContext();
  INVENTORY_COUNT_STATE.status='idle';
  INVENTORY_COUNT_STATE.documentId=null;
  INVENTORY_COUNT_STATE.versionId=null;
  INVENTORY_COUNT_STATE.versionNo=null;
  INVENTORY_COUNT_STATE.documentStatus=null;
  INVENTORY_COUNT_STATE.versionStatus=null;
  INVENTORY_COUNT_STATE.openingBalanceMode='manual_first_day';
  INVENTORY_COUNT_STATE.reviewerUserId=null;
  INVENTORY_COUNT_STATE.reviewerName='—';
  renderInventoryCountLines([]);
  const meta=$('#inventoryCountCurrentVersionMeta');
  if(meta) meta.textContent='الإصدار: — | عدد الأصناف: 0';
  inventoryCountSetStatus(message);
  inventoryCountUpdateCreateButton();
}
async function loadInventoryCountCounterOptions(plantCode=inventoryCountReadInputs().plantCode){
  const normalizedPlant=String(plantCode || '').trim().toUpperCase();
  if(!normalizedPlant || !window.WarehouseDB?.ready){
    INVENTORY_COUNT_STATE.inventoryCounterOptions=[];
    INVENTORY_COUNT_STATE.inventoryCounterPlantCode='';
    return;
  }
  if(INVENTORY_COUNT_STATE.inventoryCounterPlantCode===normalizedPlant && Array.isArray(INVENTORY_COUNT_STATE.inventoryCounterOptions) && INVENTORY_COUNT_STATE.inventoryCounterOptions.length){
    return;
  }
  INVENTORY_COUNT_STATE.inventoryCounterLoading=true;
  try{
    const {data,error}=await WarehouseDB.client
      .from('storekeepers')
      .select('id,full_name,job_title,plant_code,is_active,sort_order')
      .eq('plant_code',normalizedPlant)
      .eq('is_active',true)
      .order('sort_order',{ascending:true})
      .order('full_name',{ascending:true});
    if(error) throw error;
    INVENTORY_COUNT_STATE.inventoryCounterOptions=(data||[]).filter(row=>String(row.plant_code||'').trim().toUpperCase()===normalizedPlant && row.is_active!==false);
    INVENTORY_COUNT_STATE.inventoryCounterPlantCode=normalizedPlant;
  }finally{
    INVENTORY_COUNT_STATE.inventoryCounterLoading=false;
  }
}
async function loadInventoryCountOpeningBalanceContext(versionId,requestSeq=null){
  if(!versionId){
    INVENTORY_COUNT_STATE.openingBalanceMode='manual_first_day';
    return;
  }
  if(!window.WarehouseDB?.ready) return;
  try{
    const {data,error}=await WarehouseDB.client.rpc('get_inventory_count_opening_balance_context',{p_version_id:versionId});
    if(error) throw error;
    if(requestSeq!==null && requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    if(String(INVENTORY_COUNT_STATE.versionId || '')!==String(versionId)) return;
    INVENTORY_COUNT_STATE.openingBalanceMode=String(data?.opening_balance_mode || '')==='carried_forward' ? 'carried_forward' : 'manual_first_day';
  }catch(err){
    console.error('Inventory count opening-balance context load failed',err);
  }
}

async function loadInventoryCountLines(versionId,requestSeq=null){
  if(!versionId) return;
  if(!window.WarehouseDB?.ready){
    inventoryCountSetStatus('قاعدة البيانات غير متصلة.','err');
    return;
  }
  await loadInventoryCountCounterOptions(inventoryCountReadInputs().plantCode);
  const openingBalanceContextPromise=loadInventoryCountOpeningBalanceContext(versionId,requestSeq);
  const {data,error}=await WarehouseDB.client
    .from('inventory_count_lines')
    .select('id,material_code,material_name,uom,opening_balance,row_version,production_quantity,physical_balance,oldest_quantity,oldest_date,inventory_counter_id,inventory_counter_name_snapshot,inventory_counter_job_title_snapshot,incoming_transfers,actual_returns,adjustment_increase_z22,adjustment_shortage_z21,sales_quantity,outgoing_transfers,rework_311,book_balance,inventory_variance')
    .eq('version_id',versionId)
    .order('material_code',{ascending:true});
  if(error) throw error;
  await openingBalanceContextPromise;
  if(requestSeq!==null && requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
  const rows=await filterInventoryCountLinesByCurrentWarehouse(data||[]);
  if(requestSeq!==null && requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
  INVENTORY_COUNT_STATE.lines=rows;
  const settlementContextPromise=loadInventoryCountSettlementContext(versionId,requestSeq);
  renderInventoryCountLines(rows);
  await settlementContextPromise;
  if(requestSeq!==null && requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
  if(String(INVENTORY_COUNT_STATE.versionId || '')!==String(versionId)) return;
  renderInventoryCountLines(rows);
  const meta=$('#inventoryCountCurrentVersionMeta');
  if(meta) meta.textContent=`الإصدار: ${INVENTORY_COUNT_STATE.versionNo || 1} | عدد الأصناف: ${rows.length}`;
  updateInventoryCountFinalizationControls();
}
function setInventoryCountInputsFromResult(data){
  const dateInput=$('#inventoryCountDateInput');
  const plantSelect=$('#inventoryCountPlantSelect');
  const warehouseSelect=$('#inventoryCountWarehouseSelect');
  const plantCode=String(data?.plant_code || '').trim().toUpperCase();
  const warehouseCode=String(data?.warehouse_code || '').trim().toUpperCase();
  const inventoryDate=formatInventoryDateInputValue(data?.inventory_date);
  if(plantSelect && plantCode) plantSelect.value=plantCode;
  syncInventoryCountWarehouse();
  if(warehouseSelect && warehouseCode) warehouseSelect.value=warehouseCode;
  if(dateInput){
    dateInput.value=inventoryDate;
    if(window.CustomDatePicker) window.CustomDatePicker.refresh(dateInput);
  }
  updateInventoryCountSelectedDateSummary();
  persistInventoryCountViewState();
}
async function openDefaultInventoryCountFromUi(options={}){
  closeInventoryReviewRecommendationsModal({restoreFocus:false});
  clearInventoryCountSettlementContext();
  const {showLoading=false}=options;
  const requestSeq=++INVENTORY_COUNT_STATE.requestSeq;
  if(!window.WarehouseDB?.ready){
    resetInventoryCountView('قاعدة البيانات غير متصلة.');
    inventoryCountSetStatus('قاعدة البيانات غير متصلة.','err');
    return;
  }
  INVENTORY_COUNT_STATE.status='loading';
  INVENTORY_COUNT_STATE.documentId=null;
  INVENTORY_COUNT_STATE.versionId=null;
  INVENTORY_COUNT_STATE.versionNo=null;
  INVENTORY_COUNT_STATE.documentStatus=null;
  INVENTORY_COUNT_STATE.versionStatus=null;
  INVENTORY_COUNT_STATE.reviewerUserId=null;
  INVENTORY_COUNT_STATE.reviewerName='—';
  renderInventoryCountLines([]);
  const meta=$('#inventoryCountCurrentVersionMeta');
  if(meta) meta.textContent='الإصدار: — | عدد الأصناف: 0';
  if(showLoading) inventoryCountSetLoading(true,'جاري تحميل آخر جرد...');
  inventoryCountSetStatus('جاري تحميل آخر جرد...');
  inventoryCountUpdateCreateButton();
  try{
    const {data,error}=await WarehouseDB.client.rpc('get_default_inventory_count');
    if(error) throw error;
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    const status=data?.status || '';
    if(status==='open_inventory_count_found' || status==='completed_inventory_count_found'){
      setInventoryCountInputsFromResult(data);
      INVENTORY_COUNT_STATE.documentId=data.document_id || null;
      INVENTORY_COUNT_STATE.versionId=data.version_id || null;
      INVENTORY_COUNT_STATE.versionNo=Number(data.version_no || 1) || 1;
      INVENTORY_COUNT_STATE.documentStatus=data.document_status || null;
      INVENTORY_COUNT_STATE.versionStatus=data.version_status || null;
      setInventoryCountReviewerFromResult(data);
      INVENTORY_COUNT_STATE.status='found';
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,requestSeq);
      if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
      inventoryCountSetStatus(status==='open_inventory_count_found' ? 'تم فتح آخر جرد مفتوح.' : 'تم فتح آخر جرد مكتمل.','ok');
      inventoryCountUpdateCreateButton();
      return;
    }
    resetInventoryCountView('لم يتم إنشاء أي جرد بعد.');
    INVENTORY_COUNT_STATE.status='not_found';
    inventoryCountUpdateCreateButton();
  }catch(err){
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    console.error('Default inventory count load failed',err);
    resetInventoryCountView('');
    inventoryCountSetStatus(err?.message || '', 'err');
  }finally{
    if(requestSeq===INVENTORY_COUNT_STATE.requestSeq){
      inventoryCountSetLoading(false);
      inventoryCountUpdateCreateButton();
    }
  }
}
async function openExistingInventoryCountFromUi(options={}){
  closeInventoryReviewRecommendationsModal({restoreFocus:false});
  clearInventoryCountSettlementContext();
  const {showLoading=false}=options;
  const {inventoryDate,plantCode,warehouseCode}=inventoryCountReadInputs();
  const requestSeq=++INVENTORY_COUNT_STATE.requestSeq;
  if(!inventoryDate || !plantCode || !warehouseCode){
    resetInventoryCountView('اختر التاريخ والمصنع ثم اضغط جرد جديد.');
    return;
  }
  if(!window.WarehouseDB?.ready){
    resetInventoryCountView('قاعدة البيانات غير متصلة.');
    inventoryCountSetStatus('قاعدة البيانات غير متصلة.','err');
    return;
  }
  INVENTORY_COUNT_STATE.status='loading';
  INVENTORY_COUNT_STATE.documentId=null;
  INVENTORY_COUNT_STATE.versionId=null;
  INVENTORY_COUNT_STATE.versionNo=null;
  INVENTORY_COUNT_STATE.documentStatus=null;
  INVENTORY_COUNT_STATE.versionStatus=null;
  INVENTORY_COUNT_STATE.reviewerUserId=null;
  INVENTORY_COUNT_STATE.reviewerName='—';
  renderInventoryCountLines([]);
  const meta=$('#inventoryCountCurrentVersionMeta');
  if(meta) meta.textContent='الإصدار: — | عدد الأصناف: 0';
  if(showLoading) inventoryCountSetLoading(true,'جاري تحميل الجرد...');
  inventoryCountSetStatus('جاري تحميل الجرد...');
  inventoryCountUpdateCreateButton();
  try{
    const {data,error}=await WarehouseDB.client.rpc('get_inventory_count',{
      p_inventory_date: inventoryDate,
      p_plant_code: plantCode,
      p_warehouse_code: warehouseCode
    });
    if(error) throw error;
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    const status=data?.status || '';
    if(status==='inventory_count_found'){
      INVENTORY_COUNT_STATE.documentId=data.document_id || null;
      INVENTORY_COUNT_STATE.versionId=data.version_id || null;
      INVENTORY_COUNT_STATE.versionNo=Number(data.version_no || 1) || 1;
      INVENTORY_COUNT_STATE.documentStatus=data.document_status || null;
      INVENTORY_COUNT_STATE.versionStatus=data.version_status || null;
      setInventoryCountReviewerFromResult(data);
      INVENTORY_COUNT_STATE.status='found';
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,requestSeq);
      if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
      inventoryCountSetStatus('الجرد موجود.','ok');
      inventoryCountUpdateCreateButton();
      return;
    }
    if(status==='not_found'){
      resetInventoryCountView('لم يتم إنشاء جرد بعد.');
      INVENTORY_COUNT_STATE.status='not_found';
      inventoryCountUpdateCreateButton();
      return;
    }
    if(status==='no_current_version'){
      INVENTORY_COUNT_STATE.status='no_current_version';
      INVENTORY_COUNT_STATE.documentId=data?.document_id || null;
      INVENTORY_COUNT_STATE.versionId=null;
      INVENTORY_COUNT_STATE.versionNo=null;
      INVENTORY_COUNT_STATE.documentStatus=data?.document_status || null;
      INVENTORY_COUNT_STATE.versionStatus=null;
      setInventoryCountReviewerFromResult(data);
      renderInventoryCountLines([]);
      const meta=$('#inventoryCountCurrentVersionMeta');
      if(meta) meta.textContent='الإصدار: — | عدد الأصناف: 0';
      inventoryCountSetStatus('مستند الجرد موجود، لكن لا توجد نسخة حالية صالحة.','err');
      inventoryCountUpdateCreateButton();
      return;
    }
    INVENTORY_COUNT_STATE.status='idle';
    resetInventoryCountView('لم يتم إنشاء جرد بعد.');
  }catch(err){
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    console.error('Inventory count load failed',err);
    resetInventoryCountView('');
    inventoryCountSetStatus(err?.message || '', 'err');
  }finally{
    if(requestSeq===INVENTORY_COUNT_STATE.requestSeq){
      inventoryCountSetLoading(false);
      inventoryCountUpdateCreateButton();
    }
  }
}
async function createInventoryCountFromUi(){
  closeInventoryReviewRecommendationsModal({restoreFocus:false});
  if(INVENTORY_COUNT_STATE.creating || INVENTORY_COUNT_STATE.loading) return;
  if(INVENTORY_COUNT_STATE.versionId || INVENTORY_COUNT_STATE.status==='found') return;
  if(INVENTORY_COUNT_STATE.status==='no_current_version') return;
  if(!hasPermission('inventory_count','add')){
    showInventoryCountToast('غير متاح للصلاحية الحالية','error');
    return;
  }
  if(!window.WarehouseDB?.ready){
    inventoryCountSetStatus('قاعدة البيانات غير متصلة.','err');
    return;
  }
  const {inventoryDate,plantCode,warehouseCode}=inventoryCountReadInputs();
  if(!inventoryDate){ inventoryCountSetStatus('تاريخ الجرد مطلوب.','err'); return; }
  if(!plantCode){ inventoryCountSetStatus('المصنع مطلوب.','err'); return; }
  if(!warehouseCode){ inventoryCountSetStatus('المخزن مطلوب.','err'); return; }
  clearInventoryCountSettlementContext();
  INVENTORY_COUNT_STATE.creating=true;
  const requestSeq=++INVENTORY_COUNT_STATE.requestSeq;
  inventoryCountSetLoading(true,'جارٍ إنشاء الجرد...');
  inventoryCountSetStatus('جارٍ إنشاء الجرد...');
  try{
    const {data,error}=await WarehouseDB.client.rpc('create_inventory_count',{
      p_inventory_date: inventoryDate,
      p_plant_code: plantCode,
      p_warehouse_code: warehouseCode
    });
    if(error) throw error;
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    INVENTORY_COUNT_STATE.documentId=data?.document_id || null;
    INVENTORY_COUNT_STATE.versionId=data?.version_id || null;
    INVENTORY_COUNT_STATE.versionNo=Number(data?.version_no || data?.versionNo || 1) || 1;
    INVENTORY_COUNT_STATE.documentStatus=data?.document_status || null;
    INVENTORY_COUNT_STATE.versionStatus=data?.version_status || null;
    INVENTORY_COUNT_STATE.reviewerUserId=CURRENT_AUTH_USER?.id || null;
    INVENTORY_COUNT_STATE.reviewerName=String(CURRENT_APP_PROFILE?.full_name || CURRENT_AUTH_USER?.email || '—').trim() || '—';
    updateInventoryCountReviewerFooter();
    INVENTORY_COUNT_STATE.status='found';
    await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,requestSeq);
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    inventoryCountSetStatus('تم إنشاء الجرد بنجاح.','ok');
    inventoryCountUpdateCreateButton();
    showInventoryCountToast('تم إنشاء الجرد بنجاح.','success');
  }catch(err){
    if(requestSeq!==INVENTORY_COUNT_STATE.requestSeq) return;
    console.error('Inventory count creation failed',err);
    const message=err?.message || '';
    if(message.includes('Inventory count already exists for this date and warehouse.')){
      await openExistingInventoryCountFromUi({showLoading:false});
      if(INVENTORY_COUNT_STATE.status==='found'){
        inventoryCountSetStatus('الجرد موجود.','ok');
        return;
      }
    }
    inventoryCountSetStatus(message, 'err');
  }finally{
    INVENTORY_COUNT_STATE.creating=false;
    if(requestSeq===INVENTORY_COUNT_STATE.requestSeq) inventoryCountSetLoading(false);
    applyPermissionActionGuards('inventory_closing');
    inventoryCountUpdateCreateButton();
  }
}
async function saveInventoryOpeningBalanceInput(input){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!input || INVENTORY_COUNT_STATE.openingBalanceMode!=='manual_first_day') return;
  const lineId=input.dataset.lineId || '';
  if(!lineId) return;
  if(input.validity && !input.validity.valid){
    input.value=input.dataset.lastSaved || '';
    updateInventoryOpeningBalanceInputWidth(input);
    return;
  }
  const currentValue=String(input.value || '').trim();
  const lastSaved=input.dataset.lastSaved || '';
  const normalizedDisplay=formatInventoryOpeningBalance(currentValue);
  if(inventoryCountOpeningBalanceKey(currentValue)===inventoryCountOpeningBalanceKey(lastSaved)){
    input.value=normalizedDisplay;
    updateInventoryOpeningBalanceInputWidth(input);
    return;
  }
  if(INVENTORY_COUNT_STATE.openingBalanceSaving.has(lineId)) return;
  const openingBalance=roundInventoryOpeningBalanceValue(currentValue);
  if(currentValue!=='' && !Number.isFinite(openingBalance)){
    input.value=lastSaved;
    updateInventoryOpeningBalanceInputWidth(input);
    return;
  }
  const expectedRowVersion=input.dataset.rowVersion ? Number(input.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.openingBalanceSaving.add(lineId);
  input.disabled=true;
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_opening_balance',{
      p_line_id: lineId,
      p_opening_balance: openingBalance,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.opening_balance=data?.opening_balance ?? null;
      row.row_version=data?.row_version ?? row.row_version;
    }
    renderInventoryCountTotals(INVENTORY_COUNT_STATE.lines);
    const savedValue=inventoryCountOpeningBalanceInputValue(data?.opening_balance);
    input.value=savedValue;
    updateInventoryOpeningBalanceInputWidth(input);
    input.dataset.lastSaved=savedValue;
    input.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    const productionInput=$(`#inventoryCountLinesTable .inventory-production-quantity-input[data-line-id="${CSS.escape(lineId)}"]`);
    if(productionInput) productionInput.dataset.rowVersion=input.dataset.rowVersion;
    showInventoryCountToast('تم حفظ رصيد أول.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    input.value=lastSaved;
    updateInventoryOpeningBalanceInputWidth(input);
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.openingBalanceSaving.delete(lineId);
    input.disabled=false;
  }
}
async function saveInventoryProductionQuantityInput(input){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!input) return;
  const lineId=input.dataset.lineId || '';
  if(!lineId) return;
  if(inventoryCountRejectNegativeManualValue(input,'الإنتاج',updateInventoryProductionQuantityInputWidth)) return;
  if(input.validity && !input.validity.valid){
    input.value=input.dataset.lastSaved || '';
    updateInventoryProductionQuantityInputWidth(input);
    return;
  }
  const currentValue=String(input.value || '').trim();
  const lastSaved=input.dataset.lastSaved || '';
  const normalizedDisplay=formatInventoryProductionQuantity(currentValue);
  if(inventoryCountProductionKey(currentValue)===inventoryCountProductionKey(lastSaved)){
    input.value=normalizedDisplay;
    updateInventoryProductionQuantityInputWidth(input);
    return;
  }
  if(INVENTORY_COUNT_STATE.productionSaving.has(lineId)) return;
  const productionQuantity=roundInventoryProductionQuantityValue(currentValue);
  if(currentValue!=='' && !Number.isFinite(productionQuantity)){
    input.value=lastSaved;
    updateInventoryProductionQuantityInputWidth(input);
    return;
  }
  const expectedRowVersion=input.dataset.rowVersion ? Number(input.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.productionSaving.add(lineId);
  input.disabled=true;
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_production_quantity',{
      p_line_id: lineId,
      p_production_quantity: productionQuantity,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.production_quantity=data?.production_quantity ?? null;
      row.row_version=data?.row_version ?? row.row_version;
    }
    renderInventoryCountTotals(INVENTORY_COUNT_STATE.lines);
    const savedValue=inventoryCountProductionInputValue(data?.production_quantity);
    input.value=savedValue;
    updateInventoryProductionQuantityInputWidth(input);
    input.dataset.lastSaved=savedValue;
    input.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    const openingInput=$(`#inventoryCountLinesTable .inventory-opening-balance-input[data-line-id="${CSS.escape(lineId)}"]`);
    if(openingInput) openingInput.dataset.rowVersion=input.dataset.rowVersion;
    showInventoryCountToast('تم حفظ الإنتاج.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    input.value=lastSaved;
    updateInventoryProductionQuantityInputWidth(input);
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.productionSaving.delete(lineId);
    input.disabled=false;
  }
}
async function saveInventoryPhysicalBalanceInput(input){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!input) return;
  const lineId=input.dataset.lineId || '';
  if(!lineId) return;
  if(inventoryCountRejectNegativeManualValue(input,'الرصيد الفعلي',updateInventoryPhysicalBalanceInputWidth)) return;
  if(input.validity && !input.validity.valid){
    input.value=input.dataset.lastSaved || '';
    updateInventoryPhysicalBalanceInputWidth(input);
    return;
  }
  const currentValue=String(input.value || '').trim();
  const lastSaved=input.dataset.lastSaved || '';
  const normalizedDisplay=formatInventoryManualThreeDecimal(currentValue);
  if(inventoryCountManualThreeDecimalKey(currentValue)===inventoryCountManualThreeDecimalKey(lastSaved)){
    input.value=normalizedDisplay;
    updateInventoryPhysicalBalanceInputWidth(input);
    return;
  }
  if(INVENTORY_COUNT_STATE.physicalBalanceSaving.has(lineId)) return;
  const physicalBalance=roundInventoryManualThreeDecimalValue(currentValue);
  if(currentValue!=='' && !Number.isFinite(physicalBalance)){
    input.value=lastSaved;
    updateInventoryPhysicalBalanceInputWidth(input);
    return;
  }
  const expectedRowVersion=input.dataset.rowVersion ? Number(input.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.physicalBalanceSaving.add(lineId);
  input.disabled=true;
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_physical_balance',{
      p_line_id: lineId,
      p_physical_balance: physicalBalance,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.physical_balance=data?.physical_balance ?? null;
      row.book_balance=data?.book_balance ?? row.book_balance;
      row.inventory_variance=data?.inventory_variance ?? row.inventory_variance;
      row.row_version=data?.row_version ?? row.row_version;
    }
    const savedValue=formatInventoryManualThreeDecimal(data?.physical_balance);
    input.value=savedValue;
    input.dataset.lastSaved=savedValue;
    input.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    updateInventoryPhysicalBalanceInputWidth(input);
    renderInventoryCountTotals(INVENTORY_COUNT_STATE.lines);
    showInventoryCountToast('تم حفظ الرصيد الفعلي.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    input.value=lastSaved;
    updateInventoryPhysicalBalanceInputWidth(input);
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.physicalBalanceSaving.delete(lineId);
    input.disabled=false;
  }
}
async function saveInventoryOldestQuantityInput(input){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!input) return;
  const lineId=input.dataset.lineId || '';
  if(!lineId) return;
  if(inventoryCountRejectNegativeManualValue(input,'كمية أقدم تاريخ',updateInventoryOldestQuantityInputWidth)) return;
  if(input.validity && !input.validity.valid){
    input.value=input.dataset.lastSaved || '';
    updateInventoryOldestQuantityInputWidth(input);
    return;
  }
  const currentValue=String(input.value || '').trim();
  const lastSaved=input.dataset.lastSaved || '';
  const normalizedDisplay=formatInventoryManualThreeDecimal(currentValue);
  if(inventoryCountManualThreeDecimalKey(currentValue)===inventoryCountManualThreeDecimalKey(lastSaved)){
    input.value=normalizedDisplay;
    updateInventoryOldestQuantityInputWidth(input);
    return;
  }
  if(INVENTORY_COUNT_STATE.oldestQuantitySaving.has(lineId)) return;
  const oldestQuantity=roundInventoryManualThreeDecimalValue(currentValue);
  if(currentValue!=='' && !Number.isFinite(oldestQuantity)){
    input.value=lastSaved;
    updateInventoryOldestQuantityInputWidth(input);
    return;
  }
  const expectedRowVersion=input.dataset.rowVersion ? Number(input.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.oldestQuantitySaving.add(lineId);
  input.disabled=true;
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_oldest_quantity',{
      p_line_id: lineId,
      p_oldest_quantity: oldestQuantity,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.oldest_quantity=data?.oldest_quantity ?? null;
      row.row_version=data?.row_version ?? row.row_version;
    }
    const savedValue=formatInventoryManualThreeDecimal(data?.oldest_quantity);
    input.value=savedValue;
    input.dataset.lastSaved=savedValue;
    input.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    updateInventoryOldestQuantityInputWidth(input);
    renderInventoryCountTotals(INVENTORY_COUNT_STATE.lines);
    showInventoryCountToast('تم حفظ كمية أقدم تاريخ.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    input.value=lastSaved;
    updateInventoryOldestQuantityInputWidth(input);
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.oldestQuantitySaving.delete(lineId);
    input.disabled=false;
  }
}
async function saveInventoryOldestDateInput(input){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!input) return;
  const lineId=input.dataset.lineId || '';
  if(!lineId) return;
  const currentValue=formatInventoryDateInputValue(input.value);
  const lastSaved=input.dataset.lastSaved || '';
  if(currentValue===lastSaved) return;
  if(INVENTORY_COUNT_STATE.oldestDateSaving.has(lineId)) return;
  const expectedRowVersion=input.dataset.rowVersion ? Number(input.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.oldestDateSaving.add(lineId);
  input.disabled=true;
  if(window.CustomDatePicker) window.CustomDatePicker.refresh(input);
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_oldest_date',{
      p_line_id: lineId,
      p_oldest_date: currentValue || null,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const savedValue=formatInventoryDateInputValue(data?.oldest_date);
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.oldest_date=savedValue || null;
      row.row_version=data?.row_version ?? row.row_version;
    }
    input.value=savedValue;
    if(window.CustomDatePicker) window.CustomDatePicker.refresh(input);
    input.dataset.lastSaved=savedValue;
    input.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    showInventoryCountToast('تم حفظ أقدم تاريخ.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    input.value=lastSaved;
    if(window.CustomDatePicker) window.CustomDatePicker.refresh(input);
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.oldestDateSaving.delete(lineId);
    input.disabled=false;
    if(window.CustomDatePicker) window.CustomDatePicker.refresh(input);
  }
}
async function saveInventoryCounterSelect(select){
  if(inventoryCountBlockManualEditIfSettlementPhaseStarted()) return;
  if(!select) return;
  const lineId=select.dataset.lineId || '';
  if(!lineId) return;
  const currentValue=String(select.value || '').trim();
  const lastSaved=select.dataset.lastSaved || '';
  if(currentValue===lastSaved) return;
  if(INVENTORY_COUNT_STATE.inventoryCounterSaving.has(lineId)) return;
  const expectedRowVersion=select.dataset.rowVersion ? Number(select.dataset.rowVersion) : null;
  INVENTORY_COUNT_STATE.inventoryCounterSaving.add(lineId);
  select.disabled=true;
  try{
    const {data,error}=await WarehouseDB.client.rpc('save_inventory_count_counter',{
      p_line_id: lineId,
      p_inventory_counter_id: currentValue || null,
      p_expected_row_version: expectedRowVersion
    });
    if(error) throw error;
    const row=INVENTORY_COUNT_STATE.lines.find(x=>String(x.id)===String(lineId));
    if(row){
      row.inventory_counter_id=data?.inventory_counter_id || null;
      row.inventory_counter_name_snapshot=data?.inventory_counter_name_snapshot || null;
      row.inventory_counter_job_title_snapshot=data?.inventory_counter_job_title_snapshot || null;
      row.row_version=data?.row_version ?? row.row_version;
    }
    select.dataset.lastSaved=String(data?.inventory_counter_id || '');
    select.dataset.rowVersion=String(data?.row_version ?? expectedRowVersion ?? '');
    showInventoryCountToast('تم حفظ القائم بالجرد.','success');
    if(INVENTORY_COUNT_STATE.versionId){
      await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId,INVENTORY_COUNT_STATE.requestSeq);
    }
  }catch(err){
    select.value=lastSaved;
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err),'error');
  }finally{
    INVENTORY_COUNT_STATE.inventoryCounterSaving.delete(lineId);
    select.disabled=false;
  }
}
function inventoryCountManualControlDescriptor(control){
  if(!control) return null;
  if(control.matches('.inventory-opening-balance-input')) return {selector:'.inventory-opening-balance-input',save:saveInventoryOpeningBalanceInput,normalize:inventoryCountOpeningBalanceKey,savingSet:INVENTORY_COUNT_STATE.openingBalanceSaving};
  if(control.matches('.inventory-production-quantity-input')) return {selector:'.inventory-production-quantity-input',save:saveInventoryProductionQuantityInput,normalize:inventoryCountProductionKey,savingSet:INVENTORY_COUNT_STATE.productionSaving};
  if(control.matches('.inventory-physical-balance-input')) return {selector:'.inventory-physical-balance-input',save:saveInventoryPhysicalBalanceInput,normalize:inventoryCountManualThreeDecimalKey,savingSet:INVENTORY_COUNT_STATE.physicalBalanceSaving};
  if(control.matches('.inventory-oldest-quantity-input')) return {selector:'.inventory-oldest-quantity-input',save:saveInventoryOldestQuantityInput,normalize:inventoryCountManualThreeDecimalKey,savingSet:INVENTORY_COUNT_STATE.oldestQuantitySaving};
  if(control.matches('.inventory-oldest-date-input')) return {selector:'.inventory-oldest-date-input',save:saveInventoryOldestDateInput,normalize:value=>formatInventoryDateInputValue(value),savingSet:INVENTORY_COUNT_STATE.oldestDateSaving};
  if(control.matches('.inventory-counter-select')) return {selector:'.inventory-counter-select',save:saveInventoryCounterSelect,normalize:value=>String(value || '').trim(),savingSet:INVENTORY_COUNT_STATE.inventoryCounterSaving};
  return null;
}
function inventoryCountNextManualControlTarget(control){
  const descriptor=inventoryCountManualControlDescriptor(control);
  const table=$('#inventoryCountLinesTable');
  if(!descriptor || !table) return null;
  const controls=[...table.querySelectorAll(`tbody ${descriptor.selector}`)].filter(item=>!item.disabled && item.getClientRects().length>0);
  const index=controls.indexOf(control);
  const next=index>=0 ? controls[index+1] : null;
  return next ? {selector:descriptor.selector,lineId:String(next.dataset.lineId || '')} : null;
}
async function waitForInventoryCountManualSave(savingSet,lineId,timeoutMs=12000){
  if(!savingSet || !lineId || !savingSet.has(lineId)) return true;
  const started=Date.now();
  while(savingSet.has(lineId)){
    if(Date.now()-started>=timeoutMs) return false;
    await new Promise(resolve=>setTimeout(resolve,35));
  }
  return true;
}
async function saveInventoryCountManualControlOnEnter(control){
  const descriptor=inventoryCountManualControlDescriptor(control);
  if(!descriptor || control.disabled) return false;
  const lineId=String(control.dataset.lineId || '');
  const desired=descriptor.normalize(control.value);
  if(descriptor.savingSet?.has(lineId)){
    const completed=await waitForInventoryCountManualSave(descriptor.savingSet,lineId);
    if(!completed) return false;
  }else{
    await descriptor.save(control);
    const completed=await waitForInventoryCountManualSave(descriptor.savingSet,lineId);
    if(!completed) return false;
  }
  const saved=descriptor.normalize(control.dataset.lastSaved ?? control.value);
  return desired===saved;
}
function focusInventoryCountManualControl(target){
  if(!target?.selector || !target?.lineId) return;
  requestAnimationFrame(()=>{
    const control=$(`#inventoryCountLinesTable tbody ${target.selector}[data-line-id="${CSS.escape(target.lineId)}"]`);
    if(!control || control.disabled) return;
    control.focus({preventScroll:false});
    if(typeof control.select==='function' && !control.matches('select,input[type="date"]')) control.select();
  });
}
function bindInventoryOpeningBalanceEvents(){
  const table=$('#inventoryCountLinesTable');
  if(!table || table.dataset.openingBalanceBound==='1') return;
  table.dataset.openingBalanceBound='1';
  table.addEventListener('focusin',event=>{
    const openingInput=event.target.closest('.inventory-opening-balance-input');
    if(openingInput && table.contains(openingInput)) updateInventoryOpeningBalanceInputWidth(openingInput);
    const productionInput=event.target.closest('.inventory-production-quantity-input');
    if(productionInput && table.contains(productionInput)) updateInventoryProductionQuantityInputWidth(productionInput);
    const physicalInput=event.target.closest('.inventory-physical-balance-input');
    if(physicalInput && table.contains(physicalInput)) updateInventoryPhysicalBalanceInputWidth(physicalInput);
    const oldestQuantityInput=event.target.closest('.inventory-oldest-quantity-input');
    if(oldestQuantityInput && table.contains(oldestQuantityInput)) updateInventoryOldestQuantityInputWidth(oldestQuantityInput);
  });
  table.addEventListener('focusout',event=>{
    const openingInput=event.target.closest('.inventory-opening-balance-input');
    if(openingInput && table.contains(openingInput)){
      updateInventoryOpeningBalanceInputWidth(openingInput);
      saveInventoryOpeningBalanceInput(openingInput);
    }
    const productionInput=event.target.closest('.inventory-production-quantity-input');
    if(productionInput && table.contains(productionInput)){
      updateInventoryProductionQuantityInputWidth(productionInput);
      saveInventoryProductionQuantityInput(productionInput);
    }
    const physicalInput=event.target.closest('.inventory-physical-balance-input');
    if(physicalInput && table.contains(physicalInput)){
      updateInventoryPhysicalBalanceInputWidth(physicalInput);
      saveInventoryPhysicalBalanceInput(physicalInput);
    }
    const oldestQuantityInput=event.target.closest('.inventory-oldest-quantity-input');
    if(oldestQuantityInput && table.contains(oldestQuantityInput)){
      updateInventoryOldestQuantityInputWidth(oldestQuantityInput);
      saveInventoryOldestQuantityInput(oldestQuantityInput);
    }
    const oldestDateInput=event.target.closest('.inventory-oldest-date-input');
    if(oldestDateInput && table.contains(oldestDateInput)) saveInventoryOldestDateInput(oldestDateInput);
  });
  table.addEventListener('input',event=>{
    const openingInput=event.target.closest('.inventory-opening-balance-input');
    if(openingInput && table.contains(openingInput)) updateInventoryOpeningBalanceInputWidth(openingInput);
    const productionInput=event.target.closest('.inventory-production-quantity-input');
    if(productionInput && table.contains(productionInput)) updateInventoryProductionQuantityInputWidth(productionInput);
    const physicalInput=event.target.closest('.inventory-physical-balance-input');
    if(physicalInput && table.contains(physicalInput)) updateInventoryPhysicalBalanceInputWidth(physicalInput);
    const oldestQuantityInput=event.target.closest('.inventory-oldest-quantity-input');
    if(oldestQuantityInput && table.contains(oldestQuantityInput)) updateInventoryOldestQuantityInputWidth(oldestQuantityInput);
  });
  table.addEventListener('click',event=>{
    const retryBtn=event.target.closest('.inventory-settlement-context-retry-btn');
    if(retryBtn && table.contains(retryBtn)){
      event.preventDefault();
      refreshInventoryCountSettlementContextIfCurrent(retryBtn.dataset.versionId || INVENTORY_COUNT_STATE.versionId);
      return;
    }
    const reversalBtn=event.target.closest('.inventory-settlement-reverse-btn');
    if(reversalBtn && table.contains(reversalBtn)){
      event.preventDefault();
      openInventoryCountSettlementReversalModalFromButton(reversalBtn);
      return;
    }
    const settlementBtn=event.target.closest('.inventory-settlement-btn');
    if(settlementBtn && table.contains(settlementBtn)){
      event.preventDefault();
      openInventoryCountSettlementModalFromButton(settlementBtn);
    }
  });
  table.addEventListener('change',event=>{
    const oldestDateInput=event.target.closest('.inventory-oldest-date-input');
    if(oldestDateInput && table.contains(oldestDateInput)) saveInventoryOldestDateInput(oldestDateInput);
    const counterSelect=event.target.closest('.inventory-counter-select');
    if(counterSelect && table.contains(counterSelect)) saveInventoryCounterSelect(counterSelect);
  });
  table.addEventListener('keydown',async event=>{
    const input=event.target.closest('.inventory-opening-balance-input,.inventory-production-quantity-input,.inventory-physical-balance-input,.inventory-oldest-quantity-input,.inventory-oldest-date-input,.inventory-counter-select');
    if(!input || !table.contains(input) || event.key!=='Enter') return;
    event.preventDefault();
    const nextTarget=inventoryCountNextManualControlTarget(input);
    const saved=await saveInventoryCountManualControlOnEnter(input);
    if(saved) focusInventoryCountManualControl(nextTarget);
  });
}
function scheduleInventoryCountOpen(){
  openExistingInventoryCountFromUi({showLoading:true});
}
function isInventoryCountMobileViewport(){
  return window.matchMedia ? window.matchMedia('(max-width: 700px)').matches : window.innerWidth<=700;
}
function closeInventoryCountMobilePanels(){
  document.body.classList.remove('inventory-count-settings-open','inventory-count-export-open','inventory-count-search-open');
  $('#inventoryCountMobileSettingsBtn')?.setAttribute('aria-expanded','false');
  $('#inventoryCountMobileExportBtn')?.setAttribute('aria-expanded','false');
  $('#inventoryCountMobileSearchBtn')?.setAttribute('aria-expanded','false');
  const overlay=$('#inventoryCountMobileSheetOverlay');
  if(overlay){ overlay.hidden=true; overlay.setAttribute('aria-hidden','true'); }
  const exportPanel=$('#inventoryCountMobileExportPanel');
  if(exportPanel){ exportPanel.hidden=true; exportPanel.setAttribute('aria-hidden','true'); }
  const filterPanel=$('#inventoryCountMobileFilterPanel');
  if(filterPanel){ filterPanel.hidden=true; filterPanel.setAttribute('aria-hidden','true'); }
  $('#inventoryCountSettingsBox')?.setAttribute('aria-hidden',isInventoryCountMobileViewport() ? 'true' : 'false');
  $('#inventoryCountMobileFilterPanel')?.setAttribute('aria-hidden','true');
}
function openInventoryCountMobilePanel(kind){
  closeInventoryCountColumnManager(false);
  closeInventoryCountMobilePanels();
  const overlay=$('#inventoryCountMobileSheetOverlay');
  if(overlay){ overlay.hidden=false; overlay.setAttribute('aria-hidden','false'); }
  if(kind==='settings'){
    document.body.classList.add('inventory-count-settings-open');
    $('#inventoryCountMobileSettingsBtn')?.setAttribute('aria-expanded','true');
    $('#inventoryCountSettingsBox')?.setAttribute('aria-hidden','false');
    setTimeout(()=>$('#inventoryCountMobileSettingsCloseBtn')?.focus({preventScroll:true}),0);
  }else if(kind==='export'){
    const panel=$('#inventoryCountMobileExportPanel');
    document.body.classList.add('inventory-count-export-open');
    $('#inventoryCountMobileExportBtn')?.setAttribute('aria-expanded','true');
    if(panel){ panel.hidden=false; panel.setAttribute('aria-hidden','false'); }
    setTimeout(()=>panel?.querySelector('button[data-inventory-mobile-export]')?.focus({preventScroll:true}),0);
  }else if(kind==='search'){
    document.body.classList.add('inventory-count-search-open');
    $('#inventoryCountMobileSearchBtn')?.setAttribute('aria-expanded','true');
    const panel=$('#inventoryCountMobileFilterPanel');
    if(panel){ panel.hidden=false; panel.setAttribute('aria-hidden','false'); }
    renderInventoryCountMobileFilters();
    setTimeout(()=>panel?.querySelector('.inventory-count-column-filter,button')?.focus({preventScroll:true}),0);
  }
}
function initInventoryCountMobilePanels(){
  const settingsBtn=$('#inventoryCountMobileSettingsBtn');
  if(!settingsBtn || settingsBtn.dataset.inventoryMobilePanelBound==='1') return;
  settingsBtn.dataset.inventoryMobilePanelBound='1';
  settingsBtn.addEventListener('click',event=>{ event.preventDefault(); openInventoryCountMobilePanel('settings'); });
  $('#inventoryCountMobileExportBtn')?.addEventListener('click',event=>{ event.preventDefault(); openInventoryCountMobilePanel('export'); });
  $('#inventoryCountMobileSearchBtn')?.addEventListener('click',event=>{ event.preventDefault(); openInventoryCountMobilePanel('search'); });
  $('#inventoryCountMobileSheetOverlay')?.addEventListener('click',event=>{ event.preventDefault(); });
  $('#inventoryCountMobileSettingsCloseBtn')?.addEventListener('click',event=>{ event.preventDefault(); closeInventoryCountMobilePanels(); });
  $('#inventoryCountMobileExportCloseBtn')?.addEventListener('click',event=>{ event.preventDefault(); closeInventoryCountMobilePanels(); });
  $('#inventoryCountMobileSearchCloseBtn')?.addEventListener('click',event=>{ event.preventDefault(); closeInventoryCountMobilePanels(); });
  $('#inventoryCountMobileFilterPanel')?.addEventListener('input',event=>{
    const control=event.target.closest('.inventory-count-column-filter');
    if(!control) return;
    inventoryCountSetColumnFilter(control.dataset.inventoryFilterKey,inventoryCountFilterControlValue(control));
    syncInventoryCountFilterControls();
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  });
  $('#inventoryCountMobileFilterPanel')?.addEventListener('change',event=>{
    const control=event.target.closest('.inventory-count-column-filter');
    if(!control) return;
    inventoryCountSetColumnFilter(control.dataset.inventoryFilterKey,inventoryCountFilterControlValue(control));
    syncInventoryCountFilterControls();
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
  });
  $('#inventoryCountMobileFilterPanel')?.addEventListener('click',event=>{
    if(event.target.closest('[data-inventory-mobile-clear-filters]')){
      event.preventDefault();
      resetInventoryCountSearchSort();
    }
  });
  $('#inventoryCountMobileExportPanel')?.addEventListener('click',event=>{
    const action=event.target.closest('[data-inventory-mobile-export]')?.dataset.inventoryMobileExport;
    if(!action) return;
    event.preventDefault();
    closeInventoryCountMobilePanels();
    if(action==='png') exportInventoryCountPng();
    if(action==='pdf') exportInventoryCountPdf();
    if(action==='excel') exportInventoryCountExcel();
  });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape') closeInventoryCountMobilePanels(); });
  window.addEventListener('resize',()=>{ if(!isInventoryCountMobileViewport()) closeInventoryCountMobilePanels(); });
  closeInventoryCountMobilePanels();
}


const INVENTORY_DIFFERENCE_PLANTS = [
  {code:'EL01', name:'مصنع الإيمان للأعلاف - السواقي'},
  {code:'EL02', name:'مصنع الإيمان للأعلاف - العامرية'},
  {code:'WF01', name:'مصنع الواحة للأعلاف'}
];
const INVENTORY_DIFFERENCE_STATE = { snapshots: [], selectedSnapshotId: null, activePlantCode: '', loading: false, requestSeq: 0, listRequestSeq: 0, historyRequestSeq: 0, historySourceVersionId: null, historyLoading: false, replaceVersionId: null, replacing: false };
function inventoryDifferencePlantName(code){
  const normalized=String(code||'').trim().toUpperCase();
  const plant=INVENTORY_DIFFERENCE_PLANTS.find(item=>item.code===normalized);
  return plant ? plant.code+' — '+plant.name : (normalized || '—');
}
function inventoryDifferenceSnapshotLabel(row){
  const date=formatDisplayDate(row && row.inventory_date,'—');
  const number=(row && (row.snapshot_number || row.source_document_number)) || '—';
  return number+' / '+date+' / '+((row && row.plant_code) || '—')+' / '+((row && row.warehouse_code) || '—');
}
function inventoryDifferenceSetLoading(active){
  INVENTORY_DIFFERENCE_STATE.loading=!!active;
  $$('#inventoryDifferencePlantTabs button,[data-inventory-difference-current],[data-inventory-difference-replaced]').forEach(btn=>{ btn.disabled=!!active || btn.dataset.wasDisabled==='1'; });
}
function inventoryDifferenceRowsForPlant(plantCode){
  const code=String(plantCode||'').trim().toUpperCase();
  return (INVENTORY_DIFFERENCE_STATE.snapshots||[]).filter(row=>String(row.plant_code||'').trim().toUpperCase()===code);
}
function inventoryDifferenceDefaultPlant(rows=[]){
  const current=String(INVENTORY_DIFFERENCE_STATE.activePlantCode||'').trim().toUpperCase();
  if(current && INVENTORY_DIFFERENCE_PLANTS.some(p=>p.code===current)) return current;
  const withData=INVENTORY_DIFFERENCE_PLANTS.find(plant=>rows.some(row=>String(row.plant_code||'').trim().toUpperCase()===plant.code));
  return (withData && withData.code) || 'EL01';
}
function renderInventoryDifferencePlantTabs(){
  const tabs=$('#inventoryDifferencePlantTabs');
  if(!tabs) return;
  const rows=INVENTORY_DIFFERENCE_STATE.snapshots || [];
  if(!INVENTORY_DIFFERENCE_STATE.activePlantCode) INVENTORY_DIFFERENCE_STATE.activePlantCode=inventoryDifferenceDefaultPlant(rows);
  tabs.innerHTML=INVENTORY_DIFFERENCE_PLANTS.map(plant=>{
    const count=rows.filter(row=>String(row.plant_code||'').trim().toUpperCase()===plant.code).length;
    const active=plant.code===INVENTORY_DIFFERENCE_STATE.activePlantCode;
    return '<button type="button" class="inventory-difference-plant-tab'+(active?' active':'')+'" role="tab" aria-selected="'+(active?'true':'false')+'" data-inventory-difference-plant="'+plant.code+'"><span>'+escapeHtml(plant.code)+'</span><strong>'+escapeHtml(plant.name)+'</strong><b>'+count+'</b></button>';
  }).join('');
}
function inventoryDifferenceShowEmpty(message='لم يتم إنشاء أي مستند فروق جرد بعد.'){
  const empty=$('#inventoryDifferenceEmptyState');
  const content=$('#inventoryDifferenceContent');
  const meta=$('#inventoryDifferenceMetaGrid');
  const tbody=$('#inventoryDifferenceLinesTable tbody');
  const tfoot=$('#inventoryDifferenceLinesTable tfoot');
  if(empty){ empty.hidden=false; empty.textContent=message; }
  if(content) content.hidden=true;
  if(meta) meta.innerHTML='';
  if(tbody) tbody.innerHTML='<tr><td colspan="18" class="empty-state">'+escapeHtml(message)+'</td></tr>';
  if(tfoot) tfoot.innerHTML='';
}
function inventoryDifferencePrepareSnapshotLoad(snapshotId){
  const requested=String(snapshotId||'').trim();
  INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=requested || null;
  inventoryDifferenceShowEmpty('جاري تحميل مستند فروق الجرد...');
}

function renderInventoryDifferenceDocumentsTable(){
  const tbody=$('#inventoryDifferenceDocumentsTable tbody');
  if(!tbody) return;
  const rows=inventoryDifferenceRowsForPlant(INVENTORY_DIFFERENCE_STATE.activePlantCode);
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="6" class="empty-state">لا توجد مستندات فروق جرد لهذا المصنع.</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const replacedCount=Number(row.replaced_snapshots_count || 0);
    const replacedDisabled=replacedCount<=0;
    const version=escapeHtml(row.source_inventory_version_id || '');
    const currentBtn='<button type="button" class="small-action" data-inventory-difference-current="'+escapeHtml(row.snapshot_id || '')+'">عرض النسخة الحالية</button>';
    const replacedBtn='<button type="button" class="small-action replace" data-inventory-difference-replaced="'+version+'" '+(replacedDisabled?'disabled data-was-disabled="1" title="لا توجد نسخة مستبدلة"':'title="عرض النسخة المستبدلة"')+'>عرض النسخة المستبدلة</button>';
    const cells=[
      formatDisplayDate(row.inventory_date,'—'),
      inventoryDifferencePlantName(row.plant_code),
      row.source_version_no != null ? row.source_version_no : '—',
      row.source_inventory_creator_name_snapshot || '—',
      row.reviewer_name_snapshot || '—'
    ];
    return '<tr>'+cells.map(value=>'<td>'+escapeHtml(String(value))+'</td>').join('')+'<td><div class="inventory-difference-actions">'+currentBtn+replacedBtn+'</div></td></tr>';
  }).join('');
}
function renderInventoryDifferenceMeta(header){
  const grid=$('#inventoryDifferenceMetaGrid');
  if(!grid) return;
  const meta=[
    ['رقم مستند الفروق', header && header.snapshot_number || '—'],
    ['حالة النسخة', header && header.snapshot_status === 'replaced' ? 'مستبدلة' : 'حالية'],
    ['تاريخ الجرد', formatDisplayDate(header && header.inventory_date,'—')],
    ['المصنع', inventoryDifferencePlantName(header && header.plant_code)],
    ['المخزن', header && header.warehouse_code || '—'],
    ['رقم مستند الجرد', header && header.source_document_number || '—'],
    ['الإصدار', header && header.source_version_no != null ? header.source_version_no : '—'],
    ['تاريخ إنشاء النسخة', formatDisplayDateTime(header && header.created_at,'—')],
    ['مُنشئ الجرد', header && header.source_inventory_creator_name_snapshot || '—'],
    ['منشئ النسخة', header && header.created_by_name || '—'],
    ['القائم بالمراجعة', header && header.reviewer_name_snapshot || '—'],
    ['عدد الأصناف', header && header.line_count != null ? header.line_count : 0]
  ];
  if(header && header.snapshot_status === 'replaced'){
    meta.push(['سبب الاستبدال', header.replacement_reason || '—']);
    meta.push(['تاريخ الاستبدال', formatDisplayDateTime(header.replaced_at,'—')]);
    meta.push(['من نفذ الاستبدال', header.replaced_by_name || '—']);
  }
  grid.innerHTML=meta.map(pair=>'<div class="inventory-difference-meta-card"><span>'+escapeHtml(pair[0])+'</span><strong>'+escapeHtml(String(pair[1] == null ? '—' : pair[1]))+'</strong></div>').join('');
}
function inventoryDifferenceCounterText(row){
  const name=String(row && row.inventory_counter_name_snapshot || '').trim();
  const job=String(row && row.inventory_counter_job_title_snapshot || '').trim();
  return name && job ? name+' / '+job : (name || '—');
}
function renderInventoryDifferenceLines(lines=[]){
  const tbody=$('#inventoryDifferenceLinesTable tbody');
  const tfoot=$('#inventoryDifferenceLinesTable tfoot');
  if(!tbody) return;
  if(!lines.length){
    tbody.innerHTML='<tr><td colspan="18" class="empty-state">لا توجد أصناف داخل مستند فروق الجرد.</td></tr>';
    if(tfoot) tfoot.innerHTML='';
    return;
  }
  tbody.innerHTML=lines.map(row=>'<tr>'+
    '<td>'+formatInventoryCountText(row.material_code)+'</td>'+
    '<td>'+formatInventoryCountText(row.material_name)+'</td>'+
    '<td>'+formatInventoryCountText(row.uom)+'</td>'+
    '<td>'+formatInventoryManualThreeDecimal(row.opening_balance)+'</td>'+
    '<td>'+formatInventoryManualThreeDecimal(row.production_quantity)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.incoming_transfers)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.actual_returns)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.adjustment_increase_z22)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.adjustment_shortage_z21)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.sales_quantity)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.outgoing_transfers)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.rework_311)+'</td>'+
    '<td>'+formatInventoryCountThreeDecimalQuantity(row.book_balance)+'</td>'+
    '<td>'+formatInventoryManualThreeDecimal(row.physical_balance)+'</td>'+
    renderInventoryVarianceCell(row.inventory_variance)+
    '<td>'+formatInventoryManualThreeDecimal(row.oldest_quantity)+'</td>'+
    '<td>'+escapeHtml(formatDisplayDate(row.oldest_date,''))+'</td>'+
    '<td>'+escapeHtml(inventoryDifferenceCounterText(row))+'</td></tr>').join('');
  if(tfoot){
    const total=key=>lines.reduce((sum,row)=>sum+inventoryCountTotalNumber(row && row[key]),0);
    tfoot.innerHTML='<tr class="inventory-count-total-row"><td>الإجمالي</td><td></td><td></td>'+
      '<td>'+formatInventoryManualThreeDecimal(total('opening_balance'))+'</td>'+
      '<td>'+formatInventoryManualThreeDecimal(total('production_quantity'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('incoming_transfers'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('actual_returns'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('adjustment_increase_z22'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('adjustment_shortage_z21'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('sales_quantity'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('outgoing_transfers'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('rework_311'))+'</td>'+
      '<td>'+formatInventoryCountThreeDecimalQuantity(total('book_balance'))+'</td>'+
      '<td>'+formatInventoryManualThreeDecimal(total('physical_balance'))+'</td>'+
      renderInventoryVarianceCell(total('inventory_variance'))+
      '<td>'+formatInventoryManualThreeDecimal(total('oldest_quantity'))+'</td><td></td><td></td></tr>';
  }
}
async function loadInventoryDifferenceSnapshot(snapshotId=null){
  const requestedSnapshotId=String(snapshotId||'').trim();
  if(!requestedSnapshotId){
    ++INVENTORY_DIFFERENCE_STATE.requestSeq;
    INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
    inventoryDifferenceShowEmpty('اختر مستند فروق الجرد.');
    return;
  }
  if(!WarehouseDB?.ready){
    ++INVENTORY_DIFFERENCE_STATE.requestSeq;
    INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
    inventoryDifferenceShowEmpty('قاعدة البيانات غير متصلة.');
    return;
  }
  const requestSeq=++INVENTORY_DIFFERENCE_STATE.requestSeq;
  inventoryDifferencePrepareSnapshotLoad(requestedSnapshotId);
  inventoryDifferenceSetLoading(true);
  try{
    const {data,error}=await WarehouseDB.client.rpc('get_inventory_difference_snapshot',{p_snapshot_id:requestedSnapshotId});
    if(error) throw error;
    if(requestSeq!==INVENTORY_DIFFERENCE_STATE.requestSeq) return;
    if(!data || data.status!=='inventory_difference_snapshot_found'){
      INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
      inventoryDifferenceShowEmpty('لم يتم العثور على مستند فروق الجرد المطلوب.');
      return;
    }
    const header=data.header || {};
    const returnedSnapshotId=String(header.snapshot_id||'').trim();
    if(!returnedSnapshotId || returnedSnapshotId.toLowerCase()!==requestedSnapshotId.toLowerCase()){
      INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
      inventoryDifferenceShowEmpty('تعذر التحقق من مستند فروق الجرد المطلوب.');
      return;
    }
    const lines=Array.isArray(data.lines) ? data.lines : [];
    INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=returnedSnapshotId;
    const empty=$('#inventoryDifferenceEmptyState');
    const content=$('#inventoryDifferenceContent');
    if(empty) empty.hidden=true;
    if(content) content.hidden=false;
    renderInventoryDifferenceMeta(header);
    renderInventoryDifferenceLines(lines);
  }catch(err){
    if(requestSeq!==INVENTORY_DIFFERENCE_STATE.requestSeq) return;
    INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
    inventoryDifferenceShowEmpty('تعذر تحميل مستند فروق الجرد.');
    showInventoryCountToast(err && err.message || 'تعذر تحميل مستند فروق الجرد.','error');
  }finally{
    if(requestSeq===INVENTORY_DIFFERENCE_STATE.requestSeq) inventoryDifferenceSetLoading(false);
  }
}
function hideInventoryDifferenceHistory(options={}){
  if(options.invalidate!==false){
    ++INVENTORY_DIFFERENCE_STATE.historyRequestSeq;
    INVENTORY_DIFFERENCE_STATE.historySourceVersionId=null;
    INVENTORY_DIFFERENCE_STATE.historyLoading=false;
  }
  const panel=$('#inventoryDifferenceHistoryPanel');
  const tbody=$('#inventoryDifferenceHistoryTable tbody');
  if(panel) panel.hidden=true;
  if(options.clear!==false && tbody) tbody.innerHTML='<tr><td colspan="7" class="empty-state">لا توجد نسخة مستبدلة</td></tr>';
}

function renderInventoryDifferenceHistory(rows=[]){
  const panel=$('#inventoryDifferenceHistoryPanel');
  const tbody=$('#inventoryDifferenceHistoryTable tbody');
  if(!panel || !tbody) return;
  panel.hidden=false;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="7" class="empty-state">لا توجد نسخة مستبدلة</td></tr>';
    return;
  }
  tbody.innerHTML=rows.map(row=>{
    const cells=[
      row.snapshot_number || '—',
      formatDisplayDateTime(row.created_at,'—'),
      row.created_by_name || '—',
      row.replacement_reason || '—',
      formatDisplayDateTime(row.replaced_at,'—'),
      row.replaced_by_name || '—'
    ];
    const action='<button type="button" class="small-action" data-inventory-difference-history-view="'+escapeHtml(row.snapshot_id || '')+'">عرض</button>';
    return '<tr>'+cells.map(value=>'<td>'+escapeHtml(String(value))+'</td>').join('')+'<td>'+action+'</td></tr>';
  }).join('');
}
async function loadInventoryDifferenceHistory(sourceVersionId){
  const requestedSourceVersionId=String(sourceVersionId||'').trim();
  if(!requestedSourceVersionId) return;
  if(!WarehouseDB?.ready){ showInventoryCountToast('قاعدة البيانات غير متصلة.','error'); return; }
  const requestSeq=++INVENTORY_DIFFERENCE_STATE.historyRequestSeq;
  INVENTORY_DIFFERENCE_STATE.historySourceVersionId=requestedSourceVersionId;
  INVENTORY_DIFFERENCE_STATE.historyLoading=true;
  const panel=$('#inventoryDifferenceHistoryPanel');
  const tbody=$('#inventoryDifferenceHistoryTable tbody');
  if(panel) panel.hidden=false;
  if(tbody) tbody.innerHTML='<tr><td colspan="7" class="empty-state">جاري تحميل النسخ المستبدلة...</td></tr>';
  try{
    const {data,error}=await WarehouseDB.client.rpc('list_replaced_inventory_difference_snapshots',{p_source_inventory_version_id:requestedSourceVersionId});
    if(error) throw error;
    if(requestSeq!==INVENTORY_DIFFERENCE_STATE.historyRequestSeq) return;
    if(INVENTORY_DIFFERENCE_STATE.historySourceVersionId!==requestedSourceVersionId) return;
    const rows=Array.isArray(data) ? data : [];
    const responseMatches=rows.every(row=>String(row.source_inventory_version_id||'').trim().toLowerCase()===requestedSourceVersionId.toLowerCase());
    if(!responseMatches){ hideInventoryDifferenceHistory({invalidate:false}); return; }
    renderInventoryDifferenceHistory(rows);
  }catch(err){
    if(requestSeq!==INVENTORY_DIFFERENCE_STATE.historyRequestSeq) return;
    if(INVENTORY_DIFFERENCE_STATE.historySourceVersionId!==requestedSourceVersionId) return;
    hideInventoryDifferenceHistory({invalidate:false});
    showInventoryCountToast(err && err.message || 'تعذر تحميل النسخ المستبدلة.','error');
  }finally{
    if(requestSeq===INVENTORY_DIFFERENCE_STATE.historyRequestSeq && INVENTORY_DIFFERENCE_STATE.historySourceVersionId===requestedSourceVersionId){
      INVENTORY_DIFFERENCE_STATE.historyLoading=false;
    }
  }
}
async function loadInventoryDifferenceScreen(options={}){
  const listRequestSeq=++INVENTORY_DIFFERENCE_STATE.listRequestSeq;
  ++INVENTORY_DIFFERENCE_STATE.requestSeq;
  INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
  hideInventoryDifferenceHistory();
  inventoryDifferenceShowEmpty('جاري تحميل مستندات فروق الجرد...');
  if(!WarehouseDB?.ready){
    if(listRequestSeq===INVENTORY_DIFFERENCE_STATE.listRequestSeq) inventoryDifferenceShowEmpty('قاعدة البيانات غير متصلة.');
    return [];
  }
  inventoryDifferenceSetLoading(true);
  try{
    const {data,error}=await WarehouseDB.client.rpc('list_inventory_difference_snapshots');
    if(error) throw error;
    if(listRequestSeq!==INVENTORY_DIFFERENCE_STATE.listRequestSeq) return [];
    const rows=Array.isArray(data) ? data : [];
    INVENTORY_DIFFERENCE_STATE.snapshots=rows;
    const preferredSnapshotId=String(options.preferredSnapshotId||'').trim();
    const preferredPlantCode=String(options.preferredPlantCode||'').trim().toUpperCase();
    const preferredRow=preferredSnapshotId
      ? rows.find(row=>String(row.snapshot_id||'').trim().toLowerCase()===preferredSnapshotId.toLowerCase())
      : null;
    if(preferredRow){
      INVENTORY_DIFFERENCE_STATE.activePlantCode=String(preferredRow.plant_code||'').trim().toUpperCase();
    }else if(preferredPlantCode && INVENTORY_DIFFERENCE_PLANTS.some(plant=>plant.code===preferredPlantCode)){
      INVENTORY_DIFFERENCE_STATE.activePlantCode=preferredPlantCode;
    }else{
      INVENTORY_DIFFERENCE_STATE.activePlantCode=inventoryDifferenceDefaultPlant(rows);
    }
    renderInventoryDifferencePlantTabs();
    renderInventoryDifferenceDocumentsTable();
    const plantRows=inventoryDifferenceRowsForPlant(INVENTORY_DIFFERENCE_STATE.activePlantCode);
    const targetRow=preferredRow && String(preferredRow.plant_code||'').trim().toUpperCase()===INVENTORY_DIFFERENCE_STATE.activePlantCode
      ? preferredRow
      : plantRows[0] || null;
    if(targetRow && targetRow.snapshot_id) await loadInventoryDifferenceSnapshot(targetRow.snapshot_id);
    else{
      INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
      inventoryDifferenceShowEmpty('لا توجد مستندات فروق جرد لهذا المصنع.');
    }
    return rows;
  }catch(err){
    if(listRequestSeq!==INVENTORY_DIFFERENCE_STATE.listRequestSeq) return [];
    INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
    inventoryDifferenceShowEmpty('تعذر تحميل مستندات فروق الجرد.');
    showInventoryCountToast(err && err.message || 'تعذر تحميل مستندات فروق الجرد.','error');
    return [];
  }finally{
    if(listRequestSeq===INVENTORY_DIFFERENCE_STATE.listRequestSeq) inventoryDifferenceSetLoading(false);
  }
}

function ensureInventoryDifferenceReplaceModal(){
  let modal=$('#inventoryDifferenceReplaceModal');
  if(modal) return modal;
  modal=document.createElement('div');
  modal.id='inventoryDifferenceReplaceModal';
  modal.className='inventory-difference-replace-modal app-liquid-modal-backdrop';
  modal.hidden=true;
  modal.innerHTML='<div class="inventory-difference-replace-dialog app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="inventoryDifferenceReplaceTitle"><button type="button" class="app-liquid-modal__close inventory-difference-replace-close" data-inventory-difference-replace-cancel aria-label="إغلاق نافذة استبدال مستند فروق الجرد">×</button><h3 id="inventoryDifferenceReplaceTitle">استبدال مستند فروق الجرد</h3><div class="inventory-difference-replace-confirm"><p>تم إنشاء نسخة بالفعل لهذا الجرد.<br>هل تريد استبدال النسخة الحالية؟</p><div class="inventory-difference-replace-actions"><button type="button" class="primary" data-inventory-difference-replace-step="reason">نعم، استبدال</button><button type="button" class="secondary" data-inventory-difference-replace-cancel>إلغاء</button></div></div><div class="inventory-difference-replace-reason" hidden><label>سبب الاستبدال<textarea id="inventoryDifferenceReplaceReason" maxlength="500" rows="4"></textarea></label><small id="inventoryDifferenceReplaceCounter">0 / 500</small><div class="inventory-difference-replace-actions"><button type="button" class="primary" id="inventoryDifferenceReplaceSubmitBtn" disabled>تأكيد الاستبدال</button><button type="button" class="secondary" data-inventory-difference-replace-cancel>إلغاء</button></div></div></div>';
  document.body.appendChild(modal);

  modal.querySelector('[data-inventory-difference-replace-step="reason"]')?.addEventListener('click',()=>showInventoryDifferenceReplaceReasonStep());
  modal.querySelectorAll('[data-inventory-difference-replace-cancel]').forEach(btn=>btn.addEventListener('click',closeInventoryDifferenceReplaceModal));
  modal.querySelector('#inventoryDifferenceReplaceReason')?.addEventListener('input',syncInventoryDifferenceReplaceReason);
  modal.querySelector('#inventoryDifferenceReplaceSubmitBtn')?.addEventListener('click',submitInventoryDifferenceReplacement);
  return modal;
}
function openInventoryDifferenceReplaceConfirm(versionId){
  if(String(versionId || '')===String(INVENTORY_COUNT_STATE.versionId || '') && inventoryCountSettlementPhaseStarted()){
    showInventoryCountToast(inventoryCountSettlementPhaseLockMessage(),'warning',6000);
    return;
  }
  const modal=ensureInventoryDifferenceReplaceModal();
  modal._appModalClose=closeInventoryDifferenceReplaceModal;
  modal._appModalReturnFocus=document.activeElement;
  INVENTORY_DIFFERENCE_STATE.replaceVersionId=versionId;
  modal.hidden=false;
  lockAppModalScroll('inventoryDifferenceReplaceModal',modal);
  modal.querySelector('.inventory-difference-replace-confirm').hidden=false;
  modal.querySelector('.inventory-difference-replace-reason').hidden=true;
  const reason=modal.querySelector('#inventoryDifferenceReplaceReason');
  if(reason) reason.value='';
  syncInventoryDifferenceReplaceReason();
}
function showInventoryDifferenceReplaceReasonStep(){
  const modal=ensureInventoryDifferenceReplaceModal();
  modal.querySelector('.inventory-difference-replace-confirm').hidden=true;
  modal.querySelector('.inventory-difference-replace-reason').hidden=false;
  setTimeout(()=>modal.querySelector('#inventoryDifferenceReplaceReason')?.focus({preventScroll:true}),0);
}
function closeInventoryDifferenceReplaceModal(options={}){
  const modal=$('#inventoryDifferenceReplaceModal');
  const returnFocus=modal?._appModalReturnFocus;
  if(modal) modal.hidden=true;
  unlockAppModalScroll('inventoryDifferenceReplaceModal');
  INVENTORY_DIFFERENCE_STATE.replaceVersionId=null;
  INVENTORY_DIFFERENCE_STATE.replacing=false;
  if(options.restoreFocus!==false && returnFocus?.isConnected) requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
}
function syncInventoryDifferenceReplaceReason(){
  const modal=ensureInventoryDifferenceReplaceModal();
  const reason=modal.querySelector('#inventoryDifferenceReplaceReason');
  const submit=modal.querySelector('#inventoryDifferenceReplaceSubmitBtn');
  const counter=modal.querySelector('#inventoryDifferenceReplaceCounter');
  const value=String(reason?.value || '');
  if(counter) counter.textContent=value.length+' / 500';
  if(submit) submit.disabled=value.trim().length<5 || value.length>500 || INVENTORY_DIFFERENCE_STATE.replacing;
}
async function submitInventoryDifferenceReplacement(){
  const modal=ensureInventoryDifferenceReplaceModal();
  const reason=String(modal.querySelector('#inventoryDifferenceReplaceReason')?.value || '').trim();
  if(reason.length<5){ showInventoryCountToast('سبب الاستبدال مطلوب.','warning',6000); return; }
  if(!INVENTORY_DIFFERENCE_STATE.replaceVersionId || INVENTORY_DIFFERENCE_STATE.replacing) return;
  const sourceVersionId=INVENTORY_DIFFERENCE_STATE.replaceVersionId;
  const sourceRow=(INVENTORY_DIFFERENCE_STATE.snapshots||[]).find(row=>String(row.source_inventory_version_id||'')===String(sourceVersionId));
  INVENTORY_DIFFERENCE_STATE.replacing=true;
  syncInventoryDifferenceReplaceReason();
  try{
    const {data,error}=await WarehouseDB.client.rpc('replace_inventory_difference_snapshot',{p_inventory_version_id:sourceVersionId,p_replacement_reason:reason});
    if(error) throw error;
    if(data && data.status==='snapshot_replaced'){
      const newSnapshotId=String(data.new_snapshot_id || data.snapshot_id || '').trim();
      const preferredPlantCode=String(data.plant_code || sourceRow?.plant_code || '').trim().toUpperCase();
      closeInventoryDifferenceReplaceModal();
      showInventoryCountToast('تم استبدال مستند فروق الجرد وحفظ النسخة السابقة بنجاح.','success');
      await refreshInventoryCountSettlementContextIfCurrent(sourceVersionId);
      await loadInventoryDifferenceScreen({preferredSnapshotId:newSnapshotId,preferredPlantCode});
      return;
    }
    throw new Error('تعذر استبدال مستند فروق الجرد.');
  }catch(err){
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err,'تعذر استبدال مستند فروق الجرد.',sourceVersionId),'error',6000);
  }finally{
    INVENTORY_DIFFERENCE_STATE.replacing=false;
    syncInventoryDifferenceReplaceReason();
  }
}

async function createInventoryDifferenceSnapshotFromUi(){
  if(!WarehouseDB?.ready){ showInventoryCountToast('قاعدة البيانات غير متصلة.','error'); return; }
  if(inventoryCountSettlementPhaseStarted()){ showInventoryCountToast(inventoryCountSettlementPhaseLockMessage(),'warning',6000); return; }
  if(!hasPermission('inventory_count','add')){ showInventoryCountToast('غير متاح للصلاحية الحالية','error'); return; }
  if(!INVENTORY_COUNT_STATE.versionId || !(INVENTORY_COUNT_STATE.lines || []).length){ showInventoryCountToast('افتح مستند جرد يحتوي على أصناف أولًا','warning'); return; }
  if(INVENTORY_COUNT_STATE.snapshotCreating) return;
  INVENTORY_COUNT_STATE.snapshotCreating=true;
  updateInventoryDifferenceSnapshotButton();
  try{
    const {data,error}=await WarehouseDB.client.rpc('create_inventory_difference_snapshot',{p_inventory_version_id:INVENTORY_COUNT_STATE.versionId});
    if(error) throw error;
    if(data && data.status==='snapshot_already_exists'){
      openInventoryDifferenceReplaceConfirm(INVENTORY_COUNT_STATE.versionId);
      return;
    }
    if(data && data.status==='inventory_difference_snapshot_created'){
      const newSnapshotId=String(data.snapshot_id||'').trim();
      const preferredPlantCode=String(data.plant_code||'').trim().toUpperCase();
      showInventoryCountToast('تم إنشاء مستند فروق الجرد بنجاح.','success');
      await refreshInventoryCountSettlementContextIfCurrent(INVENTORY_COUNT_STATE.versionId);
      await loadInventoryDifferenceScreen({preferredSnapshotId:newSnapshotId,preferredPlantCode});
      return;
    }
    showInventoryCountToast('تعذر إنشاء مستند فروق الجرد.','error');
  }catch(err){
    showInventoryCountToast(inventoryCountPhaseLockErrorMessage(err,'تعذر إنشاء مستند فروق الجرد.'),'error');
  }finally{
    INVENTORY_COUNT_STATE.snapshotCreating=false;
    updateInventoryDifferenceSnapshotButton();
  }
}

function initInventoryDifferenceScreen(){
  const tabs=$('#inventoryDifferencePlantTabs');
  const table=$('#inventoryDifferenceDocumentsTable');
  const history=$('#inventoryDifferenceHistoryTable');
  const historyClose=$('#inventoryDifferenceHistoryCloseBtn');
  ensureInventoryDifferenceReplaceModal();
  if(tabs && tabs.dataset.inventoryDifferenceBound!=='1'){
    tabs.dataset.inventoryDifferenceBound='1';
    tabs.addEventListener('click',event=>{
      const btn=event.target.closest('[data-inventory-difference-plant]');
      if(!btn) return;
      event.preventDefault();
      ++INVENTORY_DIFFERENCE_STATE.requestSeq;
      INVENTORY_DIFFERENCE_STATE.selectedSnapshotId=null;
      INVENTORY_DIFFERENCE_STATE.activePlantCode=btn.dataset.inventoryDifferencePlant;
      hideInventoryDifferenceHistory();
      renderInventoryDifferencePlantTabs();
      renderInventoryDifferenceDocumentsTable();
      const row=inventoryDifferenceRowsForPlant(INVENTORY_DIFFERENCE_STATE.activePlantCode)[0];
      if(row && row.snapshot_id) loadInventoryDifferenceSnapshot(row.snapshot_id);
      else inventoryDifferenceShowEmpty('لا توجد مستندات فروق جرد لهذا المصنع.');
    });
  }
  if(table && table.dataset.inventoryDifferenceBound!=='1'){
    table.dataset.inventoryDifferenceBound='1';
    table.addEventListener('click',event=>{
      const current=event.target.closest('[data-inventory-difference-current]');
      if(current){
        event.preventDefault();
        hideInventoryDifferenceHistory();
        loadInventoryDifferenceSnapshot(current.dataset.inventoryDifferenceCurrent);
        return;
      }
      const replaced=event.target.closest('[data-inventory-difference-replaced]');
      if(replaced && !replaced.disabled){
        event.preventDefault();
        loadInventoryDifferenceHistory(replaced.dataset.inventoryDifferenceReplaced);
      }
    });
  }
  if(history && history.dataset.inventoryDifferenceBound!=='1'){
    history.dataset.inventoryDifferenceBound='1';
    history.addEventListener('click',event=>{
      const btn=event.target.closest('[data-inventory-difference-history-view]');
      if(btn){
        event.preventDefault();
        loadInventoryDifferenceSnapshot(btn.dataset.inventoryDifferenceHistoryView);
      }
    });
  }
  if(historyClose && historyClose.dataset.inventoryDifferenceBound!=='1'){
    historyClose.dataset.inventoryDifferenceBound='1';
    historyClose.addEventListener('click',event=>{
      event.preventDefault();
      hideInventoryDifferenceHistory();
    });
  }
}


function inventoryCountFinalizationStatusMessage(status,data={}){
  const map={
    finalized:'تم إنهاء مستند الجرد بنجاح.',
    already_finalized:'تم إنهاء مستند الجرد بالفعل.',
    permission_denied:'لا تملك صلاحية إنهاء مستند الجرد.',
    version_not_found:'تعذر العثور على نسخة الجرد الحالية.',
    version_not_current:'نسخة الجرد لم تعد النسخة الحالية للمستند.',
    inventory_count_read_only:'مستند الجرد غير قابل للإنهاء في حالته الحالية.',
    unresolved_inventory_variance:'لا يمكن إنهاء الجرد قبل تسوية جميع فروق الجرد.',
    no_inventory_lines:'لا يمكن إنهاء مستند جرد لا يحتوي على أصناف.'
  };
  const base=map[String(status||'')] || 'تعذر إنهاء مستند الجرد.';
  const count=Number(data?.unresolved_lines || 0);
  return status==='unresolved_inventory_variance' && count>0 ? `${base} عدد الأصناف المتبقية: ${count}.` : base;
}
function inventoryCountPostCloseStatusMessage(status,data={}){
  const map={
    post_close_invoice_adjustment_saved:'تم اعتماد تعديل الفاتورة بعد إنهاء الجرد.',
    post_close_adjustment_batch_saved:'تم اعتماد تعديلات ما بعد إنهاء الجرد.',
    not_authenticated:'انتهت جلسة الدخول. سجّل الدخول مرة أخرى.',
    inactive_user:'المستخدم الحالي غير نشط.',
    permission_denied:'لا تملك صلاحية تنفيذ تعديلات ما بعد إنهاء الجرد.',
    version_not_found:'تعذر العثور على نسخة الجرد.',
    inventory_not_finalized:'لا يمكن تنفيذ التعديل قبل إنهاء الجرد.',
    version_not_current:'نسخة الجرد لم تعد النسخة الحالية.',
    line_not_found:'لم يتم العثور على الصنف داخل مستند الجرد.',
    invalid_items:'بيانات التعديلات غير صالحة أو لا تحتوي على أصناف.',
    too_many_items:'عدد الأصناف في عملية واحدة أكبر من الحد المسموح.',
    invalid_scope:'نوع التعديل غير صالح.',
    invalid_action:'اختر إجراءً صحيحًا للتعديل.',
    invalid_quantity:'أدخل كمية صحيحة أكبر من صفر وبحد أقصى ثلاث خانات عشرية.',
    reason_required:'يجب كتابة سبب التعديل والتفاصيل قبل الاعتماد.',
    reason_too_long:'تفاصيل التعديل لا يمكن أن تتجاوز 4000 حرف.',
    insufficient_sales_quantity:'لا يمكن تنفيذ المرتجع لأن الكمية المدخلة أكبر من كمية البيع الحالية.',
    insufficient_incoming_transfers:'لا يمكن تنفيذ عجز التحويل الوارد لأن الكمية المدخلة أكبر من كمية التحويلات الواردة الحالية.',
    insufficient_outgoing_transfers:'لا يمكن تنفيذ عجز التحويل الصادر لأن الكمية المدخلة أكبر من كمية التحويلات الصادرة الحالية.',
    insufficient_production_quantity:'لا يمكن خصم الإنتاج لأن الكمية المدخلة أكبر من كمية الإنتاج الحالية.',
    negative_physical_result_not_allowed:'لا يمكن تنفيذ التعديل لأن الرصيد الدفتري الناتج سيجعل الرصيد الفعلي سالبًا.',
    downstream_active_settlement_conflict:'يوجد جرد لاحق مفتوح يحتوي على تسوية فعالة لهذا الصنف. تراجع عن التسوية الفعالة أولاً ثم أعد تنفيذ التعديل حتى يمكن ترحيل الأثر بأمان.',
    downstream_version_not_propagatable:'تعذر ترحيل أثر التعديل لأن إحدى نسخ الجرد اللاحقة في حالة لا تسمح بالتحديث الآلي.',
    row_version_conflict:'تم تعديل بيانات الصنف من مستخدم آخر. أعد تحميل المستند ثم حاول مرة أخرى.',
    postcondition_failed:'تعذر تثبيت نتيجة التعديل بصورة صحيحة.'
  };
  const base=map[String(status||'')] || 'تعذر اعتماد تعديلات ما بعد إنهاء الجرد.';
  const itemIndex=Number(data?.item_index || 0);
  const materialCode=String(data?.material_code || '').trim();
  return itemIndex>0 ? `${base} الصف رقم ${itemIndex}${materialCode ? ` — الصنف ${materialCode}` : ''}.` : base;
}
async function finishInventoryCountFromUi(){
  if(INVENTORY_COUNT_STATE.finalizing || inventoryCountIsFinalized()) return;
  if(!INVENTORY_COUNT_STATE.versionId || !INVENTORY_COUNT_STATE.documentId){
    showInventoryCountToast('افتح مستند جرد أولاً.','warning');
    return;
  }
  if(!hasPermission('inventory_count','edit')){
    showInventoryCountToast('لا تملك صلاحية إنهاء مستند الجرد.','error');
    return;
  }
  const unresolved=inventoryCountUnresolvedVarianceCount();
  if(unresolved>0){
    showInventoryCountToast(`لا يمكن إنهاء الجرد قبل تسوية جميع الفروق. عدد الأصناف المتبقية: ${unresolved}.`,'warning',6000);
    return;
  }
  const confirmed=await showAppLiquidConfirm({
    title:'إنهاء مستند الجرد',
    message:'سيتم قفل مستند الجرد نهائيًا وإيقاف جميع خانات الجرد والتسويات والتراجعات. بعد الإنهاء ستكون تعديلات البيع والتحويلات والإنتاج متاحة فقط من زر «تعديلات بعد إنهاء الجرد». هل تريد المتابعة؟',
    confirmText:'إنهاء الجرد',
    cancelText:'إلغاء',
    tone:'danger'
  });
  if(!confirmed) return;
  INVENTORY_COUNT_STATE.finalizing=true;
  updateInventoryCountFinalizationControls();
  try{
    const {data,error}=await WarehouseDB.client.rpc('finalize_inventory_count',{p_version_id:INVENTORY_COUNT_STATE.versionId});
    if(error) throw error;
    const status=String(data?.status || '');
    if(!['finalized','already_finalized'].includes(status)){
      showInventoryCountToast(inventoryCountFinalizationStatusMessage(status,data),'error',6000);
      return;
    }
    INVENTORY_COUNT_STATE.documentStatus=data?.document_status || 'locked';
    INVENTORY_COUNT_STATE.versionStatus=data?.version_status || 'settled';
    renderInventoryCountLines(INVENTORY_COUNT_STATE.lines || []);
    inventoryCountUpdateCreateButton();
    showInventoryCountToast(status==='already_finalized' ? 'تم إنهاء مستند الجرد بالفعل.' : 'تم إنهاء مستند الجرد بنجاح.','success',5000);
  }catch(err){
    console.error('Inventory count finalization failed',err);
    showInventoryCountToast(err?.message || 'تعذر إنهاء مستند الجرد.','error',6000);
  }finally{
    INVENTORY_COUNT_STATE.finalizing=false;
    updateInventoryCountFinalizationControls();
  }
}
function normalizeInventoryCountPostCloseLookup(value){
  return String(value??'')
    .replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g,' ')
    .trim();
}
function inventoryCountPostCloseLineByCode(value){
  const key=normalizeInventoryCountPostCloseLookup(value).toUpperCase();
  if(!key) return null;
  return (INVENTORY_COUNT_STATE.lines || []).find(row=>normalizeInventoryCountPostCloseLookup(row?.material_code).toUpperCase()===key) || null;
}
function inventoryCountPostCloseLineByName(value){
  const key=normalizeInventoryCountPostCloseLookup(value).toLocaleLowerCase('ar');
  if(!key) return null;
  const rows=INVENTORY_COUNT_STATE.lines || [];
  const exact=rows.find(row=>normalizeInventoryCountPostCloseLookup(row?.material_name).toLocaleLowerCase('ar')===key);
  if(exact) return exact;
  const matches=rows.filter(row=>normalizeInventoryCountPostCloseLookup(row?.material_name).toLocaleLowerCase('ar').includes(key));
  return matches.length===1 ? matches[0] : null;
}
const INVENTORY_COUNT_POST_CLOSE_SCOPES={
  sales:{label:'البيع',actions:[['sale','بيع'],['return','مرتجع']]},
  incoming_transfer:{label:'التحويلات الواردة',actions:[['increase_transfer','زيادة في التحويل'],['shortage_transfer','عجز في التحويل']]},
  outgoing_transfer:{label:'التحويلات الصادرة',actions:[['increase_transfer','زيادة في التحويل'],['shortage_transfer','عجز في التحويل']]},
  production:{label:'الإنتاج',actions:[['add_production','إضافة إنتاج'],['deduct_production','خصم إنتاج']]}
};
const INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER=['sales','incoming_transfer','outgoing_transfer','production'];
function inventoryCountPostCloseScopeConfig(scope){return INVENTORY_COUNT_POST_CLOSE_SCOPES[String(scope||'')] || null;}
function inventoryCountPostClosePreview(row,scope,action,quantity){
  const q=roundInventoryManualThreeDecimalValue(quantity);
  const config=inventoryCountPostCloseScopeConfig(scope);
  if(!row || !config || !config.actions.some(item=>item[0]===action) || !Number.isFinite(q) || q<=0) return {valid:false,status:'invalid_quantity'};
  const state={
    sales_quantity:normalizeInventorySettlementNumber(row.sales_quantity),
    incoming_transfers:normalizeInventorySettlementNumber(row.incoming_transfers),
    outgoing_transfers:normalizeInventorySettlementNumber(row.outgoing_transfers),
    production_quantity:normalizeInventorySettlementNumber(row.production_quantity),
    book_balance:normalizeInventorySettlementNumber(row.book_balance)
  };
  const after={...state};
  let fieldLabel='';
  let beforeValue=0;
  let afterValue=0;
  if(scope==='production'){
    fieldLabel='الإنتاج';
    beforeValue=state.production_quantity;
    after.production_quantity=roundInventoryManualThreeDecimalValue(action==='add_production' ? state.production_quantity+q : state.production_quantity-q);
    if(action==='deduct_production' && after.production_quantity<0) return {valid:false,status:'insufficient_production_quantity'};
    after.book_balance=roundInventoryManualThreeDecimalValue(action==='add_production' ? state.book_balance+q : state.book_balance-q);
    afterValue=after.production_quantity;
  }else if(scope==='sales'){
    fieldLabel='كمية البيع';
    beforeValue=state.sales_quantity;
    after.sales_quantity=roundInventoryManualThreeDecimalValue(action==='sale' ? state.sales_quantity+q : state.sales_quantity-q);
    if(action==='return' && after.sales_quantity<0) return {valid:false,status:'insufficient_sales_quantity'};
    after.book_balance=roundInventoryManualThreeDecimalValue(action==='sale' ? state.book_balance-q : state.book_balance+q);
    afterValue=after.sales_quantity;
  }else if(scope==='incoming_transfer'){
    fieldLabel='التحويلات الواردة';
    beforeValue=state.incoming_transfers;
    after.incoming_transfers=roundInventoryManualThreeDecimalValue(action==='increase_transfer' ? state.incoming_transfers+q : state.incoming_transfers-q);
    if(action==='shortage_transfer' && after.incoming_transfers<0) return {valid:false,status:'insufficient_incoming_transfers'};
    after.book_balance=roundInventoryManualThreeDecimalValue(action==='increase_transfer' ? state.book_balance+q : state.book_balance-q);
    afterValue=after.incoming_transfers;
  }else{
    fieldLabel='التحويلات الصادرة';
    beforeValue=state.outgoing_transfers;
    after.outgoing_transfers=roundInventoryManualThreeDecimalValue(action==='increase_transfer' ? state.outgoing_transfers+q : state.outgoing_transfers-q);
    if(action==='shortage_transfer' && after.outgoing_transfers<0) return {valid:false,status:'insufficient_outgoing_transfers'};
    after.book_balance=roundInventoryManualThreeDecimalValue(action==='increase_transfer' ? state.book_balance-q : state.book_balance+q);
    afterValue=after.outgoing_transfers;
  }
  if(after.book_balance<0) return {valid:false,status:'negative_physical_result_not_allowed'};
  return {valid:true,q,scope,action,fieldLabel,beforeValue,afterValue,bookBefore:state.book_balance,bookAfter:after.book_balance,physicalAfter:after.book_balance,varianceAfter:0,stateAfter:after};
}
function closeInventoryCountPostCloseInvoiceModal(options={}){
  const modal=$('#inventoryCountPostCloseInvoiceModal');
  if(!modal) return;
  const returnFocus=modal._returnFocus;
  unlockAppModalScroll('inventory-count-post-close-invoice');
  modal.remove();
  INVENTORY_COUNT_STATE.postCloseInvoiceModalLineId=null;
  if(options.restoreFocus!==false && returnFocus?.isConnected) returnFocus.focus({preventScroll:true});
}
function inventoryCountPostCloseActionOptions(scope){
  const config=inventoryCountPostCloseScopeConfig(scope);
  return '<option value="">اختر الإجراء</option>'+(config?.actions || []).map(([value,label])=>`<option value="${value}">${label}</option>`).join('');
}
const INVENTORY_COUNT_POST_CLOSE_UI_BUILD='inv-postclose-firstrow-binding-20260813-1';
let INVENTORY_COUNT_POST_CLOSE_ENTRY_SEQ=0;
function inventoryCountPostCloseBuildLookup(modal){
  if(!modal) return;
  const codeMap=new Map();
  const exactNameMap=new Map();
  const rows=[];
  (INVENTORY_COUNT_STATE.lines || []).forEach(row=>{
    const codeKey=normalizeInventoryCountPostCloseLookup(row?.material_code).toUpperCase();
    const nameKey=normalizeInventoryCountPostCloseLookup(row?.material_name).toLocaleLowerCase('ar');
    if(codeKey && !codeMap.has(codeKey)) codeMap.set(codeKey,row);
    if(nameKey && !exactNameMap.has(nameKey)) exactNameMap.set(nameKey,row);
    rows.push(row);
  });
  modal._postCloseCodeMap=codeMap;
  modal._postCloseExactNameMap=exactNameMap;
  modal._postCloseLookupRows=rows;
}
function inventoryCountPostCloseResolveEntryFromModal(entry,source='auto'){
  if(!entry) return null;
  const modal=entry.closest('#inventoryCountPostCloseInvoiceModal');
  const codeInput=entry.querySelector('[data-post-close-code]');
  const nameInput=entry.querySelector('[data-post-close-name]');
  const uom=entry.querySelector('[data-post-close-uom]');
  const findByCode=()=>{
    const key=normalizeInventoryCountPostCloseLookup(codeInput?.value).toUpperCase();
    if(!key) return null;
    return modal?._postCloseCodeMap?.get(key) || inventoryCountPostCloseLineByCode(codeInput?.value);
  };
  const findByName=()=>{
    const key=normalizeInventoryCountPostCloseLookup(nameInput?.value).toLocaleLowerCase('ar');
    if(!key) return null;
    const exact=modal?._postCloseExactNameMap?.get(key);
    if(exact) return exact;
    const rows=modal?._postCloseLookupRows || INVENTORY_COUNT_STATE.lines || [];
    const matches=rows.filter(row=>normalizeInventoryCountPostCloseLookup(row?.material_name).toLocaleLowerCase('ar').includes(key));
    return matches.length===1 ? matches[0] : null;
  };
  let row=null;
  if(source==='code') row=findByCode();
  else if(source==='name') row=findByName();
  else row=findByCode() || findByName();
  if(row){
    entry.dataset.lineId=String(row.id||'');
    entry.dataset.materialCode=String(row.material_code||'');
    if(codeInput) codeInput.value=String(row.material_code||'');
    if(nameInput) nameInput.value=String(row.material_name||'');
    if(uom) uom.value=String(row.uom||'');
  }else{
    delete entry.dataset.lineId;
    delete entry.dataset.materialCode;
    if(source==='code' && nameInput) nameInput.value='';
    if(source==='name' && codeInput) codeInput.value='';
    if(uom) uom.value='';
  }
  return row;
}
function inventoryCountPostCloseBindEntry(entry){
  if(!entry || entry.dataset.postCloseBound==='1') return;
  entry.dataset.postCloseBound='1';
  const sync=(source)=>{
    inventoryCountPostCloseResolveEntryFromModal(entry,source);
    const modal=entry.closest('#inventoryCountPostCloseInvoiceModal');
    if(!modal) return;
    modal.dataset.serverError='';
    syncInventoryCountPostCloseInvoiceModal(modal);
  };
  const code=entry.querySelector('[data-post-close-code]');
  const name=entry.querySelector('[data-post-close-name]');
  const quantity=entry.querySelector('[data-post-close-quantity]');
  const action=entry.querySelector('[data-post-close-action]');
  ['input','change'].forEach(type=>{
    code?.addEventListener(type,()=>sync('code'));
    name?.addEventListener(type,()=>sync('name'));
    quantity?.addEventListener(type,()=>{
      const modal=entry.closest('#inventoryCountPostCloseInvoiceModal');
      if(modal){modal.dataset.serverError='';syncInventoryCountPostCloseInvoiceModal(modal);}
    });
    action?.addEventListener(type,()=>{
      const modal=entry.closest('#inventoryCountPostCloseInvoiceModal');
      if(modal){modal.dataset.serverError='';syncInventoryCountPostCloseInvoiceModal(modal);}
    });
  });
  code?.addEventListener('blur',()=>sync('code'));
  name?.addEventListener('blur',()=>sync('name'));
  code?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();sync('code');entry.querySelector('[data-post-close-quantity]')?.focus();}});
  name?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();sync('name');entry.querySelector('[data-post-close-quantity]')?.focus();}});
}
function inventoryCountPostCloseCreateEntry(scope){
  const tr=document.createElement('tr');
  const entrySeq=++INVENTORY_COUNT_POST_CLOSE_ENTRY_SEQ;
  tr.dataset.postCloseEntry='1';
  tr.dataset.postCloseScope=scope;
  tr.dataset.postCloseRowKey=String(entrySeq);
  tr.innerHTML=`<td><input type="text" name="post_close_code_${entrySeq}" data-post-close-code list="inventoryCountPostCloseCodeList" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="أدخل كود المادة"></td><td><input type="text" name="post_close_name_${entrySeq}" data-post-close-name list="inventoryCountPostCloseNameList" autocomplete="off" spellcheck="false" placeholder="ابحث باسم الصنف"></td><td><input type="text" data-post-close-uom readonly aria-label="وحدة القياس"></td><td><input type="number" min="0.001" step="0.001" inputmode="decimal" data-post-close-quantity placeholder="0.000"></td><td><div class="inventory-count-post-close-action-cell"><select data-post-close-action>${inventoryCountPostCloseActionOptions(scope)}</select><button class="inventory-count-post-close-remove" type="button" data-post-close-remove aria-label="حذف الصنف">×</button></div></td>`;
  return tr;
}
function inventoryCountPostCloseSyncRowControls(modal,scope){
  const body=modal?.querySelector(`[data-post-close-panel="${scope}"] tbody`);
  if(!body) return;
  const entries=[...body.querySelectorAll('[data-post-close-entry]')];
  entries.forEach((entry,index)=>{
    const first=index===0;
    entry.dataset.postClosePrimary=first?'1':'0';
    const remove=entry.querySelector('[data-post-close-remove]');
    if(remove){
      remove.hidden=first;
      remove.disabled=first;
      remove.tabIndex=first?-1:0;
      remove.setAttribute('aria-hidden',first?'true':'false');
    }
  });
}
function inventoryCountPostCloseAddRow(modal,scope){
  const body=modal?.querySelector(`[data-post-close-panel="${scope}"] tbody`);
  if(!body) return null;
  const row=inventoryCountPostCloseCreateEntry(scope);
  body.appendChild(row);
  inventoryCountPostCloseBindEntry(row);
  inventoryCountPostCloseSyncRowControls(modal,scope);
  return row;
}
function inventoryCountPostCloseSetActiveTab(modal,scope){
  if(!modal || !inventoryCountPostCloseScopeConfig(scope)) return;
  modal.dataset.activePostCloseTab=scope;
  modal.querySelectorAll('[data-post-close-tab]').forEach(button=>{
    const active=button.dataset.postCloseTab===scope;
    button.classList.toggle('is-active',active);
    button.setAttribute('aria-selected',active?'true':'false');
    button.tabIndex=active?0:-1;
  });
  modal.querySelectorAll('[data-post-close-panel]').forEach(panel=>{panel.hidden=panel.dataset.postClosePanel!==scope;});
  syncInventoryCountPostCloseInvoiceModal(modal);
  requestAnimationFrame(()=>modal.querySelector(`[data-post-close-panel="${scope}"] [data-post-close-code]`)?.focus({preventScroll:true}));
}
function inventoryCountPostCloseResolveEntry(entry,source='auto'){
  return inventoryCountPostCloseResolveEntryFromModal(entry,source);
}
function inventoryCountPostCloseEntryHasInput(entry){
  if(!entry) return false;
  return ['[data-post-close-code]','[data-post-close-name]','[data-post-close-quantity]','[data-post-close-action]']
    .some(selector=>String(entry.querySelector(selector)?.value || '').trim()!=='');
}
function inventoryCountPostCloseCollectItems(modal){
  const items=[];
  const errors=[];
  const previewLines=[];
  const simulatedByMaterial=new Map();
  let activeCount=0;
  INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.forEach(scope=>{
    const config=inventoryCountPostCloseScopeConfig(scope);
    const entries=[...modal.querySelectorAll(`[data-post-close-panel="${scope}"] [data-post-close-entry]`)];
    entries.forEach((entry,index)=>{
      const row=inventoryCountPostCloseResolveEntry(entry);
      if(!inventoryCountPostCloseEntryHasInput(entry)) return;
      activeCount++;
      const rowNumber=index+1;
      if(!row){errors.push(`${config.label} — الصف ${rowNumber}: اختر صنفًا صحيحًا بالكود أو الاسم.`);return;}
      const quantity=roundInventoryManualThreeDecimalValue(entry.querySelector('[data-post-close-quantity]')?.value);
      const action=String(entry.querySelector('[data-post-close-action]')?.value || '');
      const materialCode=String(row.material_code||'').trim().toUpperCase();
      const base=simulatedByMaterial.get(materialCode) || {
        sales_quantity:normalizeInventorySettlementNumber(row.sales_quantity),
        incoming_transfers:normalizeInventorySettlementNumber(row.incoming_transfers),
        outgoing_transfers:normalizeInventorySettlementNumber(row.outgoing_transfers),
        production_quantity:normalizeInventorySettlementNumber(row.production_quantity),
        book_balance:normalizeInventorySettlementNumber(row.book_balance)
      };
      const preview=inventoryCountPostClosePreview(base,scope,action,quantity);
      if(!action){errors.push(`${config.label} — الصف ${rowNumber}: اختر الإجراء.`);return;}
      if(!preview.valid){
        const message=inventoryCountPostCloseStatusMessage(preview.status || 'invalid_quantity');
        errors.push(`${config.label} — ${row.material_code}: ${message}`);
        return;
      }
      simulatedByMaterial.set(materialCode,preview.stateAfter);
      items.push({
        adjustment_scope:scope,
        material_code:materialCode,
        quantity:preview.q,
        action_code:action,
        expected_row_version:Number(row.row_version||0)
      });
      const actionLabel=config.actions.find(item=>item[0]===action)?.[1] || action;
      previewLines.push(`${config.label} | ${row.material_code} — ${row.material_name} | ${actionLabel}: ${formatInventoryCountThreeDecimalQuantity(preview.beforeValue)} → ${formatInventoryCountThreeDecimalQuantity(preview.afterValue)} طن | الدفتري: ${formatInventoryCountThreeDecimalQuantity(preview.bookBefore)} → ${formatInventoryCountThreeDecimalQuantity(preview.bookAfter)} طن`);
    });
  });
  return {items,errors,previewLines,activeCount,valid:activeCount>0 && errors.length===0 && items.length===activeCount};
}
function syncInventoryCountPostCloseInvoiceModal(modal){
  if(!modal) return;
  const reason=modal.querySelector('[data-post-close-reason]');
  const previewEl=modal.querySelector('[data-post-close-preview]');
  const submit=modal.querySelector('[data-post-close-submit]');
  const serverError=modal.querySelector('[data-post-close-error]');
  const collection=inventoryCountPostCloseCollectItems(modal);
  const reasonText=String(reason?.value || '').trim();
  const reasonValid=reasonText.length>0 && reasonText.length<=4000;
  if(previewEl){
    if(collection.activeCount===0) previewEl.textContent='أضف صنفًا واحدًا على الأقل في أحد التبويبات لعرض تأثير التعديل.';
    else if(collection.errors.length) previewEl.textContent=collection.errors.join('\n');
    else previewEl.textContent=`سيتم اعتماد ${collection.items.length} تعديل:\n${collection.previewLines.join('\n')}\nبعد كل تعديل سيصبح الرصيد الفعلي مساويًا للرصيد الدفتري وفرق الجرد 0.000 طن، ثم يُرحّل الأثر تلقائيًا للأيام اللاحقة.`;
  }
  const valid=inventoryCountIsFinalized() && collection.valid && reasonValid && !INVENTORY_COUNT_STATE.postCloseInvoiceSaving;
  if(submit){submit.disabled=!valid;submit.setAttribute('aria-disabled',valid?'false':'true');}
  if(serverError && !modal.dataset.serverError) serverError.hidden=true;
  modal._postCloseCollection=collection;
}
function openInventoryCountPostCloseInvoiceModal(){
  if(!inventoryCountIsFinalized()){
    showInventoryCountToast('يجب إنهاء مستند الجرد أولاً.','warning');
    return;
  }
  if(!hasPermission('inventory_count','edit')){
    showInventoryCountToast('لا تملك صلاحية تنفيذ تعديلات ما بعد إنهاء الجرد.','error');
    return;
  }
  closeInventoryCountPostCloseInvoiceModal({restoreFocus:false});
  const modal=document.createElement('div');
  modal.id='inventoryCountPostCloseInvoiceModal';
  modal.className='inventory-count-post-close-modal app-liquid-modal-backdrop';
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','inventoryCountPostCloseInvoiceTitle');
  modal.dataset.postCloseUiBuild=INVENTORY_COUNT_POST_CLOSE_UI_BUILD;
  const panels=INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.map(scope=>{
    const config=inventoryCountPostCloseScopeConfig(scope);
    return `<section class="inventory-count-post-close-panel" data-post-close-panel="${scope}" role="tabpanel"${scope==='sales'?'':' hidden'}><div class="inventory-count-post-close-table-wrap"><table class="inventory-count-post-close-table"><colgroup><col class="post-close-col-code"><col class="post-close-col-name"><col class="post-close-col-uom"><col class="post-close-col-quantity"><col class="post-close-col-action"></colgroup><thead><tr><th>كود المادة</th><th>وصف المادة</th><th>وحدة القياس</th><th>الكمية</th><th>الإجراء</th></tr></thead><tbody></tbody></table></div><div class="inventory-count-post-close-row-tools"><button class="secondary inventory-count-post-close-add-row" type="button" data-post-close-add="${scope}">إضافة صنف</button><span>يمكن إضافة أكثر من صنف في نفس العملية.</span></div></section>`;
  }).join('');
  modal.innerHTML=`<div class="inventory-count-post-close-dialog app-liquid-modal">
    <div class="inventory-count-post-close-header app-liquid-modal__header"><div><div class="inventory-count-post-close-eyebrow">الجرد وتوثيق المخزون</div><h2 class="app-liquid-modal__title" id="inventoryCountPostCloseInvoiceTitle">تعديلات بعد إنهاء الجرد</h2></div><button class="app-liquid-modal__close inventory-count-post-close-close" type="button" aria-label="إغلاق">×</button></div>
    <div class="inventory-count-post-close-tabs" role="tablist" aria-label="نوع التعديل">${INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.map(scope=>`<button type="button" role="tab" data-post-close-tab="${scope}" aria-selected="${scope==='sales'?'true':'false'}" class="${scope==='sales'?'is-active':''}">${inventoryCountPostCloseScopeConfig(scope).label}</button>`).join('')}</div>
    <div class="inventory-count-post-close-body app-liquid-modal__body">
      <div class="inventory-count-post-close-panels">${panels}</div>
      <datalist id="inventoryCountPostCloseCodeList"></datalist><datalist id="inventoryCountPostCloseNameList"></datalist>
      <label class="inventory-count-post-close-reason"><span>سبب التعديل والتفاصيل *</span><textarea maxlength="4000" rows="5" data-post-close-reason placeholder="اكتب سبب التعديل وتفاصيل الفاتورة أو التحويل أو الإنتاج والعميل/الجهة المرتبطة..."></textarea></label>
      <div class="inventory-count-post-close-preview app-liquid-modal__section" data-post-close-preview>أضف صنفًا واحدًا على الأقل لعرض النتيجة.</div>
      <div class="inventory-count-post-close-error app-liquid-modal__error" data-post-close-error hidden></div>
    </div>
    <div class="inventory-count-post-close-footer app-liquid-modal__footer"><button class="secondary" type="button" data-post-close-cancel>إلغاء</button><button class="primary" type="button" data-post-close-submit disabled>اعتماد التعديلات</button></div>
  </div>`;
  modal.querySelectorAll('.inventory-count-post-close-table').forEach(table=>{table.dataset.noUniversalTable='1';});
  document.body.appendChild(modal);
  lockAppModalScroll('inventory-count-post-close-invoice',modal);
  inventoryCountPostCloseBuildLookup(modal);
  const codeList=modal.querySelector('#inventoryCountPostCloseCodeList');
  const nameList=modal.querySelector('#inventoryCountPostCloseNameList');
  (modal._postCloseLookupRows || []).forEach(row=>{
    const codeOption=document.createElement('option');codeOption.value=String(row.material_code||'');codeOption.label=String(row.material_name||'');codeList?.appendChild(codeOption);
    const nameOption=document.createElement('option');nameOption.value=String(row.material_name||'');nameOption.label=String(row.material_code||'');nameList?.appendChild(nameOption);
  });
  INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.forEach(scope=>inventoryCountPostCloseAddRow(modal,scope));
  modal._returnFocus=$('#inventoryCountPostCloseInvoiceBtn');
  modal._appModalClose=closeInventoryCountPostCloseInvoiceModal;
  modal.addEventListener('click',event=>{
    if(event.target.closest('.inventory-count-post-close-close') || event.target.closest('[data-post-close-cancel]')){event.preventDefault();closeInventoryCountPostCloseInvoiceModal();return;}
    const tab=event.target.closest('[data-post-close-tab]');
    if(tab){event.preventDefault();inventoryCountPostCloseSetActiveTab(modal,tab.dataset.postCloseTab);return;}
    const add=event.target.closest('[data-post-close-add]');
    if(add){event.preventDefault();const row=inventoryCountPostCloseAddRow(modal,add.dataset.postCloseAdd);syncInventoryCountPostCloseInvoiceModal(modal);row?.querySelector('[data-post-close-code]')?.focus();return;}
    const remove=event.target.closest('[data-post-close-remove]');
    if(remove){
      event.preventDefault();
      const entry=remove.closest('[data-post-close-entry]');
      if(!entry) return;
      const scope=entry.dataset.postCloseScope || 'sales';
      const entries=[...modal.querySelectorAll(`[data-post-close-panel="${scope}"] [data-post-close-entry]`)];
      if(entries[0]===entry) return;
      entry.remove();
      if(!modal.querySelector(`[data-post-close-panel="${scope}"] [data-post-close-entry]`)) inventoryCountPostCloseAddRow(modal,scope);
      inventoryCountPostCloseSyncRowControls(modal,scope);
      syncInventoryCountPostCloseInvoiceModal(modal);
      return;
    }
    if(event.target.closest('[data-post-close-submit]')){event.preventDefault();submitInventoryCountPostCloseAdjustments(modal);}
  });
  modal.addEventListener('keydown',event=>{
    const tab=event.target.closest('[data-post-close-tab]');
    if(!tab || !['ArrowRight','ArrowLeft'].includes(event.key)) return;
    event.preventDefault();
    const current=INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.indexOf(tab.dataset.postCloseTab);
    const delta=event.key==='ArrowRight' ? -1 : 1;
    const next=(current+delta+INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.length)%INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER.length;
    inventoryCountPostCloseSetActiveTab(modal,INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER[next]);
    modal.querySelector(`[data-post-close-tab="${INVENTORY_COUNT_POST_CLOSE_SCOPE_ORDER[next]}"]`)?.focus({preventScroll:true});
  });
  const reason=modal.querySelector('[data-post-close-reason]');
  ['input','change'].forEach(type=>reason?.addEventListener(type,()=>{modal.dataset.serverError='';syncInventoryCountPostCloseInvoiceModal(modal);}));
  syncInventoryCountPostCloseInvoiceModal(modal);
  requestAnimationFrame(()=>modal.querySelector('[data-post-close-panel="sales"] [data-post-close-code]')?.focus({preventScroll:true}));
}
async function submitInventoryCountPostCloseAdjustments(modal){
  if(!modal || INVENTORY_COUNT_STATE.postCloseInvoiceSaving) return;
  syncInventoryCountPostCloseInvoiceModal(modal);
  const collection=modal._postCloseCollection || inventoryCountPostCloseCollectItems(modal);
  const reason=String(modal.querySelector('[data-post-close-reason]')?.value || '').trim();
  if(!collection.valid || !reason) return;
  INVENTORY_COUNT_STATE.postCloseInvoiceSaving=true;
  updateInventoryCountFinalizationControls();
  modal.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=true);
  try{
    const {data,error}=await WarehouseDB.client.rpc('apply_inventory_count_post_close_adjustment_batch',{
      p_version_id:INVENTORY_COUNT_STATE.versionId,
      p_items:collection.items,
      p_reason_details:reason
    });
    if(error) throw error;
    const status=String(data?.status || '');
    if(status!=='post_close_adjustment_batch_saved'){
      const message=inventoryCountPostCloseStatusMessage(status,data);
      modal.dataset.serverError=message;
      const errorBox=modal.querySelector('[data-post-close-error]');if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}
      return;
    }
    const versionId=String(INVENTORY_COUNT_STATE.versionId || '');
    const requestSeq=INVENTORY_COUNT_STATE.requestSeq;
    closeInventoryCountPostCloseInvoiceModal({restoreFocus:false});
    if(versionId && versionId===String(INVENTORY_COUNT_STATE.versionId || '')) await loadInventoryCountLines(versionId,requestSeq);
    const savedItems=Number(data?.saved_items || collection.items.length || 0);
    const propagated=Number(data?.propagated_documents_total || 0);
    const message=propagated>0
      ? `تم اعتماد ${savedItems} تعديل وترحيل أثر الأرصدة تلقائيًا للأيام اللاحقة.`
      : `تم اعتماد ${savedItems} تعديل بعد إنهاء الجرد.`;
    showInventoryCountToast(message,'success',6000);
  }catch(err){
    console.error('Post-close adjustment failed',err);
    const message=err?.message || 'تعذر اعتماد تعديلات ما بعد إنهاء الجرد.';
    modal.dataset.serverError=message;
    const errorBox=modal.querySelector('[data-post-close-error]');if(errorBox){errorBox.hidden=false;errorBox.textContent=message;}
    showInventoryCountToast(message,'error',6000);
  }finally{
    INVENTORY_COUNT_STATE.postCloseInvoiceSaving=false;
    if(modal.isConnected){modal.querySelectorAll('input,select,textarea,button').forEach(control=>control.disabled=false);syncInventoryCountPostCloseInvoiceModal(modal);}
    updateInventoryCountFinalizationControls();
  }
}

function initInventoryCountScreen(){
  const dateInput=$('#inventoryCountDateInput');
  const plantSelect=$('#inventoryCountPlantSelect');
  const warehouseSelect=$('#inventoryCountWarehouseSelect');
  const createBtn=$('#createInventoryCountBtn');
  const snapshotBtn=$('#createInventoryDifferenceSnapshotBtn');
  const finishBtn=$('#finishInventoryCountBtn');
  const postCloseInvoiceBtn=$('#inventoryCountPostCloseInvoiceBtn');
  if(!dateInput || !plantSelect || !createBtn) return;
  if(!dateInput.value) dateInput.value=inventoryCountTodayIso();
  if(window.CustomDatePicker) window.CustomDatePicker.init(dateInput.parentElement || document);
  updateInventoryCountSelectedDateSummary();
  syncInventoryCountWarehouse();
  inventoryCountSetLoading(false);
  bindInventoryOpeningBalanceEvents();
  initInventoryCountSearchSortControls();
  initInventoryCountMobilePanels();
  initInventoryCountColumnManager();
  initInventoryReviewRecommendations();
  updateInventoryCountReviewerFooter();
  inventoryCountUpdateCreateButton();
  if(createBtn.dataset.inventoryCountCreateBound!=='1'){
    createBtn.dataset.inventoryCountCreateBound='1';
    createBtn.addEventListener('click',createInventoryCountFromUi);
  }
  if(snapshotBtn && snapshotBtn.dataset.inventoryDifferenceSnapshotBound!=='1'){
    snapshotBtn.dataset.inventoryDifferenceSnapshotBound='1';
    snapshotBtn.addEventListener('click',createInventoryDifferenceSnapshotFromUi);
  }
  if(finishBtn && finishBtn.dataset.inventoryCountFinishBound!=='1'){
    finishBtn.dataset.inventoryCountFinishBound='1';
    finishBtn.addEventListener('click',finishInventoryCountFromUi);
  }
  if(postCloseInvoiceBtn && postCloseInvoiceBtn.dataset.inventoryPostCloseBound!=='1'){
    postCloseInvoiceBtn.dataset.inventoryPostCloseBound='1';
    postCloseInvoiceBtn.addEventListener('click',openInventoryCountPostCloseInvoiceModal);
  }
  if(dateInput.dataset.inventoryCountOpenBound!=='1'){
    dateInput.dataset.inventoryCountOpenBound='1';
    dateInput.addEventListener('change',()=>{
      closeInventoryReviewRecommendationsModal({restoreFocus:false});
      clearInventoryCountSettlementContext();
      updateInventoryCountSelectedDateSummary();
      persistInventoryCountViewState();
      scheduleInventoryCountOpen();
    });
  }
  if(plantSelect.dataset.inventoryCountWarehouseBound!=='1'){
    plantSelect.dataset.inventoryCountWarehouseBound='1';
    plantSelect.addEventListener('change',()=>{
      closeInventoryReviewRecommendationsModal({restoreFocus:false});
      clearInventoryCountSettlementContext();
      syncInventoryCountWarehouse();
      persistInventoryCountViewState();
      scheduleInventoryCountOpen();
    });
  }
  if(warehouseSelect && warehouseSelect.dataset.inventoryCountOpenBound!=='1'){
    warehouseSelect.dataset.inventoryCountOpenBound='1';
    warehouseSelect.addEventListener('change',()=>{
      closeInventoryReviewRecommendationsModal({restoreFocus:false});
      clearInventoryCountSettlementContext();
      persistInventoryCountViewState();
      scheduleInventoryCountOpen();
    });
  }
  const exportBindings=[
    ['#inventoryCountExportPngBtn',exportInventoryCountPng],
    ['#inventoryCountExportPdfBtn',exportInventoryCountPdf],
    ['#inventoryCountExportExcelBtn',exportInventoryCountExcel]
  ];
  exportBindings.forEach(([selector,handler])=>{
    const btn=$(selector);
    if(btn && btn.dataset.inventoryCountExportBound!=='1'){
      btn.dataset.inventoryCountExportBound='1';
      btn.addEventListener('click',handler);
    }
  });
  applyPermissionActionGuards('inventory_closing');
  inventoryCountUpdateCreateButton();
  updateInventoryCountFinalizationControls();
}
document.addEventListener('DOMContentLoaded', initInventoryClosing);
document.addEventListener('DOMContentLoaded', initInventoryCountScreen);
document.addEventListener('DOMContentLoaded', initInventoryDifferenceScreen);
// === Phase IC-02: Inventory Closing Upload Engine ===

const INVENTORY_CLOSING_CONFIG = {
  'inventory_closing_wf01': { plantCode: 'WF01', warehouseCode: 'W401', reportKey: 'closing_wf01' },
  'inventory_closing_el01': { plantCode: 'EL01', warehouseCode: 'N401', reportKey: 'closing_el01' },
  'inventory_closing_el02': { plantCode: 'EL02', warehouseCode: 'E401', reportKey: 'closing_el02' }
};

async function refreshOpenInventoryCountAfterClosingSource(reportDate, plantCode, warehouseCode) {
  if (!INVENTORY_COUNT_STATE?.versionId || INVENTORY_COUNT_STATE.status !== 'found') return;
  const current = inventoryCountReadInputs();
  const sourceDate = typeof normalizeDateISO === 'function'
    ? normalizeDateISO(reportDate)
    : String(reportDate || '').slice(0, 10);
  const sourcePlant = String(plantCode || '').trim().toUpperCase();
  const sourceWarehouse = String(warehouseCode || '').trim().toUpperCase();
  if (
    current.inventoryDate !== sourceDate ||
    current.plantCode !== sourcePlant ||
    current.warehouseCode !== sourceWarehouse
  ) {
    return;
  }

  try {
    await loadInventoryCountLines(INVENTORY_COUNT_STATE.versionId, INVENTORY_COUNT_STATE.requestSeq);
    if(inventoryCountSettlementPhaseStarted()){
      showInventoryCountToast('تم تحديث تقرير التقفيل، ولم يتم تعديل مستند الجرد لأن مرحلة تسوية فروق الجرد بدأت.','info',6000);
      return;
    }
    showInventoryCountToast('تم تحديث تقرير التقفيل وإعادة احتساب الجرد بنجاح.','success');
  } catch (err) {
    console.warn('Inventory count reload after closing source change failed', err);
    showInventoryCountToast(err?.message || 'تعذر تحديث بيانات الجرد بعد تقرير التقفيل.','error');
  }
}
const IC_ALLOWED_UOM = ['TO', 'TON', 'T', 'KG', 'KGS', 'KILOGRAM', 'طن', 'كجم'];

function icCleanHeader(h) {
  if (typeof h !== 'string') return '';
  return h.trim().replace(/\s+/g, ' ');
}

function icMapRow(row, headers, sourceRowNumber) {
  const getVal = (name) => {
    const idx = headers.indexOf(name);
    return idx > -1 ? row[idx] : null;
  };
  
  let tDate = getVal('التاريخ');
  if (tDate instanceof Date) {
    tDate = new Date(tDate.getTime() - (tDate.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }
  
  return {
    source_row_number: sourceRowNumber,
    material_code: String(getVal('كود المادة') || '').trim(),
    material_name: String(getVal('وصف المادة') || '').trim(),
    quantity: parseFloat(getVal('الكمية')),
    uom: String(getVal('وحدة القياس') || '').trim(),
    movement_type: String(getVal('نوع الحركة') || '').trim(),
    movement_text: String(getVal('وصف نوع الحركة') || '').trim(),
    warehouse_code: String(getVal('المخزن') || '').trim(),
    plant_code: String(getVal('المصنع') || '').trim(),
    plant_name: String(getVal('إسم المصنع') || '').trim(),
    transaction_date: String(tDate || '').trim(),
    worker_group: String(getVal('مجموعة العمال') || '').trim(),
    raw_row: JSON.stringify(row)
  };
}

function icInventoryClosingPairKey(row) {
  const quantity = Number(row?.quantity || 0);
  return [
    String(row?.plant_code || '').trim().toUpperCase(),
    String(row?.warehouse_code || '').trim().toUpperCase(),
    String(row?.material_code || '').trim().toUpperCase(),
    String(row?.uom || '').trim().toUpperCase(),
    String(Math.abs(quantity)),
    String(row?.transaction_date || '').trim(),
    String(row?.worker_group || '').trim()
  ].join('|');
}

function normalizeInventoryClosingUploadRows(rows) {
  const movement302ByKey = new Map();
  const excluded = new Set();

  rows.forEach((row, index) => {
    if (String(row?.movement_type || '').trim() !== '302') return;
    const key = icInventoryClosingPairKey(row);
    if (!movement302ByKey.has(key)) movement302ByKey.set(key, []);
    movement302ByKey.get(key).push(index);
  });

  rows.forEach((row, index) => {
    if (String(row?.movement_type || '').trim() !== '301') return;
    const matches = movement302ByKey.get(icInventoryClosingPairKey(row));
    const pairIndex = matches && matches.find(i => !excluded.has(i));
    if (pairIndex === undefined) return;
    excluded.add(index);
    excluded.add(pairIndex);
  });

  return rows.reduce((normalized, row, index) => {
    if (excluded.has(index)) return normalized;
    const next = {...row};
    const movementType = String(next.movement_type || '').trim();
    const quantity = Number(next.quantity || 0);

    if (movementType === '301' && quantity < 0) {
      next.movement_type = 'Z51';
      next.movement_text = 'ن.مخزون إلى م.منقول';
    } else if (movementType === '301' && quantity > 0) {
      next.movement_type = '101';
      next.movement_text = 'ا.بضائع لمخزون منقول';
    }

    if (Number.isFinite(quantity)) next.quantity = Math.abs(quantity);
    normalized.push(next);
    return normalized;
  }, []);
}
async function icLoadLastUploadBatch(tabKey) {
  const config = INVENTORY_CLOSING_CONFIG[tabKey];
  const prefix = tabKey.replace(/_(.)/g, (_, c) => c.toUpperCase());
  const tableSelector = '#' + prefix + 'BatchesTable';
  const tableEl = document.getElementById(prefix + 'BatchesTable');
  if (!tableEl) return;

  if(!window.WarehouseDB?.ready) {
    tableEl.innerHTML = '<tr><td colspan="7" class="empty-state">قاعدة البيانات غير متصلة</td></tr>';
    return;
  }

  try {
    // Order by `id` (primary key — always exists) to avoid 42703 on missing timestamp columns
    const {data, error} = await WarehouseDB.client
      .from('inventory_closing_upload_batches')
      .select('*')
      .eq('report_key', config.reportKey)
      .in('status', ['succeeded', 'replaced'])
      .order('id', { ascending: false })
      .limit(10);

    if (error) throw error;
    if (!data || data.length === 0) {
      tableEl.innerHTML = '<tr><td colspan="7" class="empty-state">لا يوجد عمليات رفع سابقة</td></tr>';
      return;
    }

    // Store metadata for each batch in an isolated Map (keyed by batch.id)
    data.forEach(batch => {
      const rowCount = batch.row_count ?? batch.received_rows ?? batch.final_row_count ?? batch.expected_rows ?? null;
      inventoryClosingBatchMeta.set(String(batch.id), {
        fileName: batch.file_name || '--',
        reportDate: batch.report_date || '--',
        rowCount: rowCount !== null ? rowCount : '--',
        status: batch.status,
        reportKey: batch.report_key,
        tabKey: tabKey
      });
    });

    const rows = data.map(batch => {
      // Resolve upload timestamp — try known possible column names defensively
      const rawTs = batch.completed_at ?? batch.created_at ?? batch.upload_date ?? batch.uploaded_at ?? batch.inserted_at ?? null;
      const bDate = formatDisplayDateTime(rawTs,'--');
      // Resolve row count — try known possible column names defensively
      const rowCount = batch.row_count ?? batch.received_rows ?? batch.final_row_count ?? batch.expected_rows ?? '--';
      
      const uploader = batch.uploaded_by_name || batch.uploaded_by || '--';
      const fileSize = typeof formatFileSize === 'function' ? formatFileSize(batch.file_size_bytes) : '-';
      const rDate = formatDisplayDate(batch.report_date,'--');
      
      // View button: carries ONLY data-action and data-batch-id (no file_name, report_date, row_count in DOM)
      const viewBtn = `<button type="button" class="ic-batch-view-btn" data-action="view-ic" data-batch-id="${escapeHtml(String(batch.id))}">عرض</button>`;
      
      let replaceBtn = '';
      if (batch.status === 'succeeded') {
        replaceBtn = `<button type="button" class="small-action replace" data-action="replace-ic" data-batch-id="${escapeHtml(String(batch.id))}">استبدال</button>`;
      }
      const deleteBtn = `<button type="button" class="small-action delete" data-action="delete-ic" data-batch-id="${escapeHtml(String(batch.id))}">حذف</button>`;
      
      const actionsHtml = `<div style="display:flex;gap:4px;align-items:center;">${viewBtn}${replaceBtn}${deleteBtn}</div>`;
      
      let statusIndicator = batch.status === 'replaced' ? ' <span style="font-size:10px;color:#f1bf35;background:rgba(241,191,53,0.15);padding:2px 4px;border-radius:4px;">(مستبدل)</span>' : '';

      return [
        (rDate || batch.report_date || '--') + statusIndicator,
        batch.file_name || '--',
        Number(rowCount || 0).toLocaleString('en-US'),
        fileSize,
        uploader,
        bDate,
        actionsHtml
      ];
    });

    if (typeof table === 'function') {
      table(tableSelector, ['تاريخ التقرير','اسم الملف','عدد السطور','الحجم','الرافع','تاريخ الرفع','الإجراءات'], rows);
    } else {
      let html = '<thead><tr><th>تاريخ التقرير</th><th>اسم الملف</th><th>عدد السطور</th><th>الحجم</th><th>الرافع</th><th>تاريخ الرفع</th><th>الإجراءات</th></tr></thead><tbody>';
      rows.forEach(r => {
        html += `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td><td>${r[5]}</td><td>${r[6]}</td></tr>`;
      });
      html += '</tbody>';
      tableEl.innerHTML = html;
    }

  } catch (err) {
    console.error('IC: Failed to load upload history:', err);
    tableEl.innerHTML = '<tr><td colspan="7" class="empty-state">فشل جلب سجل الرفع</td></tr>';
  }
}

// ============================================================
// IC Batch View Modal Engine — Phase IC-03.0
// ============================================================

/** Isolated metadata Map — key: batch.id (string), value: {fileName, reportDate, rowCount} */
const inventoryClosingBatchMeta = new Map();

/** Active request token for race-condition prevention */
let _icViewRequestToken = null;

function _icSetStatus(msg, type = '') {
  const el = document.getElementById('icBatchViewStatus');
  if (!el) return;
  el.textContent = msg;
  el.className = type ? 'ic-batch-view-status-' + type : '';
}

function _icFormatQty(val) {
  if (val === null || val === undefined || val === '') return '<span class="ic-batch-view-null">-</span>';
  const n = Number(val);
  if (isNaN(n)) return '<span class="ic-batch-view-null">-</span>';
  return escapeHtml(String(val));
}

async function openIcBatchViewModal(batchId, triggerBtn) {
  if (!batchId) return;

  const overlay = document.getElementById('icBatchViewOverlay');
  const modal   = document.getElementById('icBatchViewModal');
  const tbody   = document.querySelector('#icBatchViewTable tbody');
  const closeBtn = document.getElementById('icBatchViewCloseBtn');
  if (!overlay || !modal || !tbody) return;

  // Populate metadata from Map (not from DOM attributes)
  const meta = inventoryClosingBatchMeta.get(String(batchId)) || {};
  const fnEl = document.getElementById('icBatchViewFileName');
  const rdEl = document.getElementById('icBatchViewReportDate');
  const rcEl = document.getElementById('icBatchViewRowCount');
  if (fnEl) fnEl.textContent = meta.fileName || '--';
  if (rdEl) rdEl.textContent = formatDisplayDate(meta.reportDate,'--');
  if (rcEl) rcEl.textContent = meta.rowCount !== undefined && meta.rowCount !== null ? String(meta.rowCount) : '--';

  // Clear old data
  tbody.innerHTML = '';
  _icSetStatus('جاري تحميل البيانات...', '');

  // Open modal
  overlay._appModalClose=closeIcBatchViewModal;
  overlay.classList.add('ic-batch-view-open');
  lockAppModalScroll('icBatchViewOverlay',overlay);

  // Focus close button for accessibility
  requestAnimationFrame(() => { closeBtn && closeBtn.focus(); });

  // Issue a new request token — any previous request becomes stale
  const token = Symbol('ic-view-' + batchId);
  _icViewRequestToken = token;

  // Store trigger button for focus-restore on close
  overlay._icTriggerBtn = triggerBtn || null;

  // Paginated sequential fetch
  const PAGE_SIZE = 1000;
  let from = 0;
  let allRows = [];

  try {
    if (!window.WarehouseDB?.ready) throw new Error('قاعدة البيانات غير متصلة.');

    while (true) {
      // Race condition check before each page fetch
      if (_icViewRequestToken !== token) return;

      const to = from + PAGE_SIZE - 1;
      const { data, error } = await WarehouseDB.client
        .from('inventory_closing_transactions')
        .select('source_row_number,material_code,material_name,quantity_raw,uom_raw,quantity_to,uom,movement_type,movement_text,plant_code,warehouse_code,plant_name,transaction_date,worker_group')
        .eq('batch_id', batchId)
        .order('source_row_number', { ascending: true })
        .range(from, to);

      if (error) throw error;

      // Race condition check after fetch returns
      if (_icViewRequestToken !== token) return;

      if (data && data.length > 0) {
        allRows = allRows.concat(data);
      }

      const fetched = data ? data.length : 0;
      _icSetStatus('جاري تحميل البيانات: ' + allRows.length.toLocaleString('en-US') + ' صف', '');

      if (fetched < PAGE_SIZE) break; // Last page
      from += PAGE_SIZE;
    }

    // Final race condition check before rendering
    if (_icViewRequestToken !== token) return;

    if (allRows.length === 0) {
      _icSetStatus('لا توجد بيانات لهذه الدفعة.', 'empty');
      return;
    }

    // Render all rows
    const fragment = document.createDocumentFragment();
    allRows.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = [
        `<td class="ic-batch-view-row-num">${escapeHtml(String(row.source_row_number ?? ''))}</td>`,
        `<td class="ic-batch-view-code">${escapeHtml(String(row.material_code ?? ''))}</td>`,
        `<td class="ic-batch-view-name">${escapeHtml(String(row.material_name ?? ''))}</td>`,
        `<td class="ic-batch-view-qty">${_icFormatQty(row.quantity_raw)}</td>`,
        `<td>${escapeHtml(String(row.uom_raw ?? ''))}</td>`,
        `<td class="ic-batch-view-qty">${_icFormatQty(row.quantity_to)}</td>`,
        `<td>${escapeHtml(String(row.uom ?? ''))}</td>`,
        `<td>${escapeHtml(String(row.movement_type ?? ''))}</td>`,
        `<td>${escapeHtml(String(row.movement_text ?? ''))}</td>`,
        `<td>${escapeHtml(String(row.plant_code ?? ''))}</td>`,
        `<td>${escapeHtml(String(row.warehouse_code ?? ''))}</td>`,
        `<td>${escapeHtml(String(row.plant_name ?? ''))}</td>`,
        `<td>${escapeHtml(formatDisplayDate(row.transaction_date,''))}</td>`,
        `<td>${escapeHtml(String(row.worker_group ?? ''))}</td>`
      ].join('');
      fragment.appendChild(tr);
    });
    tbody.appendChild(fragment);

    _icSetStatus('تم تحميل ' + allRows.length.toLocaleString('en-US') + ' صف', '');
    if (rcEl && (meta.rowCount === '--' || meta.rowCount === null || meta.rowCount === undefined)) {
      rcEl.textContent = allRows.length.toLocaleString('en-US');
    }

  } catch (err) {
    if (_icViewRequestToken !== token) return;
    console.error('IC Batch View: fetch error', err);
    _icSetStatus('فشل تحميل البيانات: ' + (err.message || 'خطأ غير معروف'), 'error');
  }
}

function closeIcBatchViewModal() {
  // Invalidate any in-flight request
  _icViewRequestToken = null;

  const overlay = document.getElementById('icBatchViewOverlay');
  const tbody   = document.querySelector('#icBatchViewTable tbody');
  if (!overlay) return;

  overlay.classList.remove('ic-batch-view-open');
  unlockAppModalScroll('icBatchViewOverlay');

  // Clear tbody and status
  if (tbody) tbody.innerHTML = '';
  _icSetStatus('', '');

  // Restore focus to the trigger button
  const trigger = overlay._icTriggerBtn;
  overlay._icTriggerBtn = null;
  if (trigger && typeof trigger.focus === 'function') {
    requestAnimationFrame(() => trigger.focus());
  }
}

function initIcBatchViewModal() {
  const overlay  = document.getElementById('icBatchViewOverlay');
  const modal    = document.getElementById('icBatchViewModal');
  const closeBtn = document.getElementById('icBatchViewCloseBtn');
  if (!overlay || !modal || !closeBtn) return;
  overlay.classList.add('app-liquid-modal-backdrop');
  modal.classList.add('app-liquid-modal');
  modal.querySelector('.ic-batch-view-head')?.classList.add('app-liquid-modal__header');
  closeBtn.classList.add('app-liquid-modal__close');
  closeBtn.setAttribute('aria-label','إغلاق نافذة عرض دفعة التقفيل');

  // Close button
  closeBtn.addEventListener('click', closeIcBatchViewModal);

  // Backdrop clicks are intentionally ignored. Close only via Esc or explicit in-modal controls.
  modal.addEventListener('click', (e) => e.stopPropagation());

  // Delegate click events for view-ic buttons (works for dynamically rendered buttons)
  document.addEventListener('click', (e) => {
    const viewBtn = e.target.closest('[data-action="view-ic"]');
    if (viewBtn) {
      const batchId = viewBtn.dataset.batchId;
      if (batchId) openIcBatchViewModal(batchId, viewBtn);
      return;
    }
    
    const replaceBtn = e.target.closest('[data-action="replace-ic"]');
    if (replaceBtn) {
      const batchId = replaceBtn.dataset.batchId;
      if (batchId) handleReplaceIc(batchId);
      return;
    }
    
    const deleteBtn = e.target.closest('[data-action="delete-ic"]');
    if (deleteBtn) {
      const batchId = deleteBtn.dataset.batchId;
      if (batchId) handleDeleteIc(batchId);
      return;
    }
  });
}

async function handleReplaceIc(batchId) {
  const meta = inventoryClosingBatchMeta.get(String(batchId));
  if (!meta) return;
  
  const titles = {
    'closing_wf01': 'تقفيل الواحة',
    'closing_el01': 'تقفيل المصنع الرئيسي',
    'closing_el02': 'تقفيل مصنع العامرية'
  };
  const reportName = titles[meta.reportKey] || meta.reportKey;
  
  const msg = `سيتم استبدال النسخة الحالية بملف جديد.\nالملف الحالي: ${meta.fileName}\nتاريخ التقرير: ${formatDisplayDate(meta.reportDate,meta.reportDate)}\nالتقرير: ${reportName}\n\nهل تريد المتابعة؟`;

  if (!await showAppLiquidConfirm({message:msg})) return;
  
  const tab = document.querySelector(`.subtabs [data-inventory-closing-tab="${meta.tabKey}"]`);
  if (tab) tab.click();
  
  const prefix = meta.tabKey.replace(/_(.)/g, (_, c) => c.toUpperCase());
  const dateInput = document.getElementById(prefix + 'DateInput');
  if (dateInput) {
     dateInput.value = meta.reportDate;
  }
  
  const btn = document.getElementById('pick' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'FileBtn');
  if (btn) btn.click();
}

async function handleDeleteIc(batchId) {
  const meta = inventoryClosingBatchMeta.get(String(batchId));
  if (!meta) return;
  
  let msg = '';
  if (meta.status === 'succeeded') {
     msg = "هذه هي النسخة النشطة لهذا التقرير والتاريخ. سيتم حذف ملف الـBatch وكل صفوف البيانات المرتبطة به نهائيًا من قاعدة البيانات، ولن يمكن استعادتها، ولن يتم تنشيط نسخة قديمة تلقائيًا. هل تريد المتابعة؟";
  } else if (meta.status === 'replaced') {
     msg = "سيتم حذف النسخة المستبدلة وكل صفوفها نهائيًا من قاعدة البيانات لتحرير المساحة. لا يمكن التراجع عن هذا الإجراء. هل تريد المتابعة؟";
  } else {
     return;
  }
  
  if (!await showAppLiquidConfirm({message:msg})) return;
  
  try {
     const { error } = await WarehouseDB.client.rpc('delete_inventory_closing_batch', {
        p_batch_id: batchId
     });
     if (error) throw error;
     
     if (window.showToast) {
       window.showToast('تم الحذف بنجاح.', 'success');
     } else {
       alert('تم الحذف بنجاح.');
     }
     
     inventoryClosingBatchMeta.delete(String(batchId));
     await icLoadLastUploadBatch(meta.tabKey);
     const config = INVENTORY_CLOSING_CONFIG[meta.tabKey] || {};
     await refreshOpenInventoryCountAfterClosingSource(meta.reportDate, config.plantCode, config.warehouseCode);
  } catch (err) {
     console.error('Delete error', err);
     alert('فشل الحذف: ' + (err.message || 'خطأ غير معروف'));
  }
}

// Initialize modal after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initIcBatchViewModal);
} else {
  initIcBatchViewModal();
}

async function handleInventoryClosingReportFile(tabKey, file) {
  const config = INVENTORY_CLOSING_CONFIG[tabKey];
  const prefix = tabKey.replace(/_(.)/g, (_, c) => c.toUpperCase());
  const dateInput = document.getElementById(prefix + 'DateInput');
  const fileInput = document.getElementById(prefix + 'ExcelInput');
  const btn = document.getElementById('pick' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'FileBtn');
  const statusEl = document.getElementById(prefix + 'UploadStatus');
  
  const setStatus = (msg, type='') => {
    if(statusEl) {
      statusEl.className = 'upload-status ' + type;
      statusEl.textContent = msg;
    }
  };

  const reportDate = dateInput?.value;
  if (!reportDate) {
    alert('يرجى اختيار تاريخ المراجعة.');
    fileInput.value = '';
    return;
  }

  try {
    if(!window.WarehouseDB?.ready) throw new Error('قاعدة البيانات غير متصلة.');
    const {data: permData, error: permErr} = await WarehouseDB.client.rpc('can_upload_inventory_closing_reports');
    if (permErr) throw permErr;
    if (!permData) {
      alert('ليس لديك صلاحية لرفع تقارير الجرد.');
      fileInput.value = '';
      return;
    }
  } catch (err) {
    console.error(err);
    alert('حدث خطأ أثناء التحقق من الصلاحيات.');
    fileInput.value = '';
    return;
  }

  btn.disabled = true;
  dateInput.disabled = true;
  setStatus('جاري قراءة الملف...');

  let batchId = null;

  try {
    if (!window.XLSX) throw new Error('مكتبة Excel غير متوفرة.');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error('الملف لا يحتوي على أوراق صالحة.');

    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    
    let headerRowIdx = -1;
    for(let i=0; i<matrix.length; i++){
      if(matrix[i] && matrix[i].length > 0 && matrix[i].some(v => v !== null && String(v).trim() !== '')) {
        headerRowIdx = i;
        break;
      }
    }
    
    if(headerRowIdx === -1) throw new Error('الملف لا يحتوي على بيانات.');
    
    const headers = matrix[headerRowIdx].map(icCleanHeader);
    const required = [
      'كود المادة', 'وصف المادة', 'الكمية', 'وحدة القياس', 'نوع الحركة',
      'وصف نوع الحركة', 'المخزن', 'المصنع', 'إسم المصنع', 'التاريخ', 'مجموعة العمال'
    ];
    for (let r of required) {
      if (headers.indexOf(r) === -1) throw new Error('يوجد عمود مطلوب غير موجود: ' + r);
    }

    setStatus('جاري التحقق من البيانات...');
    const parsedRows = [];
    
    for (let i = headerRowIdx + 1; i < matrix.length; i++) {
      const row = matrix[i];
      if (!row || row.length === 0 || !row.some(v => v !== null && String(v).trim() !== '')) continue;
      
      const mapped = icMapRow(row, headers, i + 1);
      
      if (!mapped.material_code || !mapped.uom || !mapped.movement_type || !mapped.movement_text || !mapped.transaction_date || isNaN(mapped.quantity)) {
        if(isNaN(mapped.quantity)) {
            throw new Error('توجد قيمة كمية غير صالحة في الصف رقم ' + (i + 1));
        }
        throw new Error('يوجد قيم إلزامية مفقودة في الصف رقم ' + (i + 1));
      }
      
      const d = new Date(mapped.transaction_date);
      if (isNaN(d.getTime())) {
        throw new Error('يوجد تاريخ غير صالح في الصف رقم ' + (i + 1) + ': ' + mapped.transaction_date);
      }
      mapped.transaction_date = d.toISOString().split('T')[0];
      
      if (!IC_ALLOWED_UOM.includes(mapped.uom.toUpperCase())) {
         throw new Error('وحدة قياس غير مدعومة في الصف رقم ' + (i + 1) + ': ' + mapped.uom);
      }
      
      if (mapped.plant_code !== config.plantCode || mapped.warehouse_code !== config.warehouseCode) {
        throw new Error('بيانات المصنع أو المخزن لا تطابق تقرير التقفيل المختار في الصف رقم ' + (i + 1) + '. متوقع: ' + config.plantCode + '-' + config.warehouseCode);
      }
      
      parsedRows.push(mapped);
    }

    if(parsedRows.length === 0) throw new Error('الملف لا يحتوي على بيانات فعلية.');
    const normalizedRows = normalizeInventoryClosingUploadRows(parsedRows);

    setStatus('جاري رفع البيانات...');

    const { data: userData } = await WarehouseDB.getUser();
    const uploaderName = userData?.user?.user_metadata?.full_name || userData?.user?.email || null;

    const { data: beginData, error: beginErr } = await WarehouseDB.client.rpc('begin_inventory_closing_upload', {
      p_report_key: config.reportKey,
      p_report_date: reportDate,
      p_file_name: file.name,
      p_uploaded_by_name: uploaderName,
      p_expected_rows: normalizedRows.length,
      p_file_size_bytes: file.size || 0
    });
    
    if (beginErr) throw beginErr;
    const _beginResult = Array.isArray(beginData) ? beginData[0] : beginData;
    batchId = (_beginResult !== null && typeof _beginResult === 'object')
      ? (_beginResult.batch_id || _beginResult.id || _beginResult)
      : _beginResult;
    if(!batchId) throw new Error('لم يتم إرجاع batch_id من الخادم.');

    const CHUNK_SIZE = 250;
    for (let i = 0; i < normalizedRows.length; i += CHUNK_SIZE) {
      const chunk = normalizedRows.slice(i, i + CHUNK_SIZE);
      const { error: chunkErr } = await WarehouseDB.client.rpc('append_inventory_closing_upload_chunk', {
        p_batch_id: batchId,
        p_rows: chunk
      });
      if (chunkErr) throw chunkErr;
      
      const percent = Math.round((Math.min(i + CHUNK_SIZE, normalizedRows.length) / normalizedRows.length) * 100);
      setStatus('جاري رفع البيانات... (' + percent + '%)');
    }

    setStatus('جاري اعتماد التقرير...');
    const { data: finData, error: finErr } = await WarehouseDB.client.rpc('finalize_inventory_closing_upload', {
      p_batch_id: batchId
    });
    if (finErr) throw finErr;
    
    const _finResult = Array.isArray(finData) ? finData[0] : finData;
    const finStatus = (_finResult !== null && typeof _finResult === 'object')
      ? (_finResult.status || _finResult.new_status || _finResult)
      : _finResult;
    if (finStatus !== 'succeeded') {
      throw new Error('فشل اعتماد التقرير: الحالة ليست succeeded (الحالة المُرجَعة: ' + JSON.stringify(_finResult) + ')');
    }

    setStatus('تم رفع التقرير بنجاح. (' + normalizedRows.length + ' صف)', 'ok');
    fileInput.value = '';
    
    await icLoadLastUploadBatch(tabKey);
    await refreshOpenInventoryCountAfterClosingSource(reportDate, config.plantCode, config.warehouseCode);

  } catch (err) {
    if (batchId) {
      try {
        await WarehouseDB.client.rpc('fail_inventory_closing_upload', {
          p_batch_id: batchId,
          p_error_message: String(err.message || 'Upload failed').slice(0, 500)
        });
      } catch (failErr) {
        console.error('IC: fail_inventory_closing_upload cleanup failed', failErr);
      }
    }
    console.error('IC Upload Error:', err);
    setStatus('فشل رفع التقرير: ' + (err.message || 'خطأ غير معروف'), 'err');
  } finally {
    btn.disabled = false;
    dateInput.disabled = false;
    if (fileInput) fileInput.value = '';
  }
}

function bindInventoryClosingUploader(tabKey) {
  const prefix = tabKey.replace(/_(.)/g, (_, c) => c.toUpperCase());
  const input = document.getElementById(prefix + 'ExcelInput');
  const btn = document.getElementById('pick' + prefix.charAt(0).toUpperCase() + prefix.slice(1) + 'FileBtn');
  const dz = document.getElementById(prefix + 'DropZone');
  
  if (!input || !btn) return;
  
  btn.onclick = () => input.click();
  input.onchange = () => {
    if (input.files && input.files[0]) {
      handleInventoryClosingReportFile(tabKey, input.files[0]);
    }
  };
  
  if (dz) {
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('drag'); };
    dz.ondragleave = () => dz.classList.remove('drag');
    dz.ondrop = e => {
      e.preventDefault();
      dz.classList.remove('drag');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleInventoryClosingReportFile(tabKey, e.dataTransfer.files[0]);
      }
    };
  }
  
  icLoadLastUploadBatch(tabKey);
}

function initInventoryClosingUploaders() {
  bindInventoryClosingUploader('inventory_closing_wf01');
  bindInventoryClosingUploader('inventory_closing_el01');
  bindInventoryClosingUploader('inventory_closing_el02');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initInventoryClosingUploaders);
} else {
  initInventoryClosingUploaders();
}

// === Storekeepers Settings ===
let storekeepersLoaded = false;
async function ensureStorekeepersLoaded() {
  if (storekeepersLoaded) return;
  storekeepersLoaded = true;
  await loadStorekeepersTable();
}

async function loadStorekeepersTable() {
  const tbody = document.querySelector('#storekeepersSettingsTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري التحميل...</td></tr>';
  
  try {
    let query = WarehouseDB.client.from('storekeepers').select('*').order('created_at', { ascending: false });
    
    const searchVal = document.getElementById('storekeepersSearchInput')?.value.trim().toLowerCase();
    const plantVal = document.getElementById('storekeepersPlantFilter')?.value;
    const statusVal = document.getElementById('storekeepersStatusFilter')?.value;
    
    if (searchVal) {
      query = query.ilike('full_name', `%${searchVal}%`);
    }
    if (plantVal && plantVal !== 'all') {
      query = query.eq('plant_code', plantVal);
    }
    if (statusVal && statusVal !== 'all') {
      query = query.eq('is_active', statusVal === 'active');
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;" class="empty-row">لا يوجد بيانات لعرضها</td></tr>';
      return;
    }
    
    tbody.innerHTML = data.map(st => `
      <tr>
        <td>${escapeHtml(st.full_name || '')}</td>
        <td>${escapeHtml(st.job_title || '')}</td>
        <td>${escapeHtml(st.plant_code || '')}</td>
        <td>
          <span class="status-badge ${st.is_active ? 'status-active' : 'status-inactive'}">
            ${st.is_active ? 'نشط' : 'غير نشط'}
          </span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="small-action edit" type="button" data-action="edit-storekeeper"
              onclick="editStorekeeper('${st.id}', '${escapeHtml(st.full_name)}', '${escapeHtml(st.job_title)}', '${st.plant_code}', ${st.is_active})">
              تعديل
            </button>
            <button class="small-action ${st.is_active ? 'delete' : 'view'}" type="button" data-action="toggle-storekeeper"
              onclick="toggleStorekeeperStatus('${st.id}', ${!st.is_active})">
              ${st.is_active ? 'إيقاف' : 'تفعيل'}
            </button>
          </div>
        </td>
      </tr>
    `).join('');
    refreshSettingsTableControls('storekeepersSettingsTable');
    applySettingsSubPermissions();
    
  } catch (err) {
    console.error('Error loading storekeepers:', err);
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">حدث خطأ أثناء جلب البيانات</td></tr>';
  }
}

document.getElementById('storekeepersSearchInput')?.addEventListener('input', loadStorekeepersTable);
document.getElementById('storekeepersPlantFilter')?.addEventListener('change', loadStorekeepersTable);
document.getElementById('storekeepersStatusFilter')?.addEventListener('change', loadStorekeepersTable);

document.getElementById('storekeeperSettingsForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('storekeeperIdInput').value;
  const requiredAction = id ? 'edit' : 'add';
  if(!hasPermission('settings_storekeepers', requiredAction)){
    notifyStorekeepersPermissionDenied();
    applyStorekeepersSettingsPermissions();
    return;
  }
  const btn = document.getElementById('saveStorekeeperBtn');
  const originalText = btn.textContent;
  btn.textContent = 'جاري الحفظ...';
  btn.disabled = true;
  
  try {
    const full_name = document.getElementById('storekeeperNameInput').value.trim();
    const job_title = document.getElementById('storekeeperTitleInput').value.trim();
    const plant_code = document.getElementById('storekeeperPlantInput').value;
    const is_active = document.getElementById('storekeeperActiveInput').checked;
    
    if (id) {
      // Update
      const { error } = await WarehouseDB.client.from('storekeepers')
        .update({ full_name, job_title, plant_code, is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      if (window.showToast) window.showToast('تم التعديل بنجاح', 'success');
    } else {
      // Insert
      const { error } = await WarehouseDB.client.from('storekeepers')
        .insert([{ full_name, job_title, plant_code, is_active }]);
      if (error) throw error;
      if (window.showToast) window.showToast('تمت الإضافة بنجاح', 'success');
    }
    
    resetStorekeeperForm();
    await loadStorekeepersTable();
    await reloadInventoryCountStorekeepers(); // Refresh dropdowns in inventory closing
  } catch (err) {
    console.error('Error saving storekeeper:', err);
    alert('حدث خطأ أثناء الحفظ: ' + (err.message || ''));
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    applyStorekeepersSettingsPermissions();
  }
});

function editStorekeeper(id, full_name, job_title, plant_code, is_active) {
  if(!canEditStorekeepersSettings()){
    notifyStorekeepersPermissionDenied();
    applyStorekeepersSettingsPermissions();
    return;
  }
  document.getElementById('storekeeperIdInput').value = id;
  document.getElementById('storekeeperNameInput').value = full_name;
  document.getElementById('storekeeperTitleInput').value = job_title;
  document.getElementById('storekeeperPlantInput').value = plant_code;
  document.getElementById('storekeeperActiveInput').checked = is_active;
  
  document.getElementById('saveStorekeeperBtn').textContent = 'تحديث أمين المخزن';
  document.getElementById('cancelStorekeeperBtn').style.display = 'inline-block';
  applyStorekeepersSettingsPermissions();
}

function resetStorekeeperForm() {
  if(isStorekeepersSettingsEditing() && !canEditStorekeepersSettings()){
    notifyStorekeepersPermissionDenied();
    applyStorekeepersSettingsPermissions();
    return;
  }
  document.getElementById('storekeeperIdInput').value = '';
  document.getElementById('storekeeperSettingsForm').reset();
  document.getElementById('saveStorekeeperBtn').textContent = 'حفظ أمين المخزن';
  document.getElementById('cancelStorekeeperBtn').style.display = 'none';
  applyStorekeepersSettingsPermissions();
}

document.getElementById('cancelStorekeeperBtn')?.addEventListener('click', resetStorekeeperForm);

async function toggleStorekeeperStatus(id, newStatus) {
  if(!canEditStorekeepersSettings()){
    notifyStorekeepersPermissionDenied();
    applyStorekeepersSettingsPermissions();
    return;
  }
  try {
    const { error } = await WarehouseDB.client.from('storekeepers')
      .update({ is_active: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw error;
    if (window.showToast) window.showToast('تم تحديث الحالة بنجاح', 'success');
    await loadStorekeepersTable();
    await reloadInventoryCountStorekeepers();
  } catch (err) {
    console.error('Status update error', err);
    alert('حدث خطأ أثناء التحديث');
  }
}

// === Inventory Count integration ===
async function reloadInventoryCountStorekeepers() {
  try {
    const { data, error } = await WarehouseDB.client.from('storekeepers')
      .select('*')
      .eq('is_active', true)
      .order('full_name');
    if (error) throw error;
    
    const selects = document.querySelectorAll('.inventory-closing-storekeeper-select');
    selects.forEach(select => {
      const plant = select.dataset.plant;
      const currentVal = select.value;
      
      const filtered = (data || []).filter(st => st.plant_code === plant);
      
     let html = '<option value="">اختر القائم بالجرد</option>';

filtered.forEach((st) => {
  html += `<option value="${escapeHtml(st.id)}">${escapeHtml(st.full_name)} — ${escapeHtml(st.job_title)}</option>`;
});

select.innerHTML = html;

if (
  currentVal &&
  select.querySelector(`option[value="${CSS.escape(currentVal)}"]`)
) {
  select.value = currentVal;
}
    });
  } catch (error) {
    console.error('Failed to reload inventory count storekeepers:', error);
  }
}


// === Department personnel and shift/leave status coding settings ===
const DEPARTMENT_PERSONNEL_TABLE = 'department_personnel';
const DEPARTMENT_STATUS_CODES_TABLE = 'department_shift_status_codes';
const DEPARTMENT_PERSONNEL_JOB_TITLES = new Set([
  'مدير إدارة المخازن',
  'مدير مخازن قطع الغيار',
  'رئيس قسم',
  'مسئول جرد وتوثيق المخزون',
  'مشرف مخازن',
  'أمين مخزن',
  'مساعد أمين مخزن',
  'عامل مخازن'
]);
const DEPARTMENT_PERSONNEL_DEPARTMENTS = new Set(['منتج تام','قطع غيار']);
const DEPARTMENT_PERSONNEL_PLANTS = {
  WF01:'مصنع الواحة',
  EL01:'مصنع الإيمان للأعلاف - السواقي',
  EL02:'مصنع الإيمان للأعلاف - العامرية'
};
function formatDepartmentPersonnelDate(value){
  if(!value) return '—';
  return window.CustomDatePicker?.formatDisplayDate?.(value,'—') || String(value);
}
function isValidDepartmentPhone(value){
  const phone=String(value||'').trim();
  return !phone || /^\+?[0-9][0-9\s()\-]*$/.test(phone);
}
let DEPARTMENT_PERSONNEL_ROWS = [];
let DEPARTMENT_PERSONNEL_LOADED = false;
let DEPARTMENT_PERSONNEL_LOADING = false;
let DEPARTMENT_PERSONNEL_SAVING = false;
const DEPARTMENT_PERSONNEL_STATUS_PENDING = new Set();
let DEPARTMENT_STATUS_CODE_ROWS = [];
let DEPARTMENT_STATUS_CODES_LOADED = false;
let DEPARTMENT_STATUS_CODES_LOADING = false;
let DEPARTMENT_STATUS_CODE_SAVING = false;
const DEPARTMENT_STATUS_CODE_PENDING = new Set();
const DEPARTMENT_STATUS_BLOCKING_FIXED_CODES = new Set(['0','4','5','8','9']);
const DEPARTMENT_STATUS_COMMON_COLORS = [
  {value:'#0F766E',label:'تركواز'},{value:'#2563EB',label:'أزرق'},
  {value:'#059669',label:'أخضر زمردي'},{value:'#7C3AED',label:'بنفسجي'},
  {value:'#D97706',label:'كهرماني'},{value:'#DB2777',label:'وردي داكن'},
  {value:'#0891B2',label:'سماوي داكن'},{value:'#EA580C',label:'برتقالي'},
  {value:'#DC2626',label:'أحمر'},{value:'#64748B',label:'رمادي مزرق'}
];
const DEPARTMENT_STATUS_COLOR_PICKER_STATE={
  open:false,previous:'#0F766E',draft:'#0F766E',hue:174,saturation:87,brightness:46,
  valid:true,pointerId:null,returnFocus:null
};
function normalizeDepartmentStatusHex(value){
  const text=String(value||'').trim();
  return /^#[0-9A-Fa-f]{6}$/.test(text)?text.toUpperCase():'';
}
function departmentStatusHexToRgb(value){
  const hex=normalizeDepartmentStatusHex(value);
  return hex?{r:parseInt(hex.slice(1,3),16),g:parseInt(hex.slice(3,5),16),b:parseInt(hex.slice(5,7),16)}:null;
}
function departmentStatusRgbToHex(r,g,b){
  return '#'+[r,g,b].map(value=>Number(value).toString(16).padStart(2,'0')).join('').toUpperCase();
}
function departmentStatusRgbToHsv(r,g,b){
  const red=r/255,green=g/255,blue=b/255;
  const maximum=Math.max(red,green,blue),minimum=Math.min(red,green,blue),delta=maximum-minimum;
  let hue=0;
  if(delta){
    if(maximum===red) hue=60*(((green-blue)/delta)%6);
    else if(maximum===green) hue=60*(((blue-red)/delta)+2);
    else hue=60*(((red-green)/delta)+4);
  }
  if(hue<0) hue+=360;
  return {h:hue,s:maximum===0?0:(delta/maximum)*100,v:maximum*100};
}
function departmentStatusHsvToRgb(h,s,v){
  const hue=((Number(h)%360)+360)%360,saturation=Number(s)/100,brightness=Number(v)/100;
  const chroma=brightness*saturation,x=chroma*(1-Math.abs((hue/60)%2-1)),match=brightness-chroma;
  let red=0,green=0,blue=0;
  if(hue<60){red=chroma;green=x;}
  else if(hue<120){red=x;green=chroma;}
  else if(hue<180){green=chroma;blue=x;}
  else if(hue<240){green=x;blue=chroma;}
  else if(hue<300){red=x;blue=chroma;}
  else{red=chroma;blue=x;}
  return {r:Math.round((red+match)*255),g:Math.round((green+match)*255),b:Math.round((blue+match)*255)};
}
function departmentStatusHsvToHex(h,s,v){
  const rgb=departmentStatusHsvToRgb(h,s,v);
  return departmentStatusRgbToHex(rgb.r,rgb.g,rgb.b);
}
function departmentStatusTextColor(color){
  const hex=String(color||'').replace('#','');
  if(!/^[0-9A-Fa-f]{6}$/.test(hex)) return '#FFFFFF';
  const values=[0,2,4].map(index=>parseInt(hex.slice(index,index+2),16)/255).map(value=>value<=.03928?value/12.92:Math.pow((value+.055)/1.055,2.4));
  const luminance=.2126*values[0]+.7152*values[1]+.0722*values[2];
  return luminance>.48?'#041A13':'#FFFFFF';
}
function firstAvailableDepartmentStatusColor(editingId=''){
  const used=new Set(DEPARTMENT_STATUS_CODE_ROWS.filter(row=>row.is_active&&String(row.id)!==String(editingId)).map(row=>normalizeDepartmentStatusHex(row.display_color)).filter(Boolean));
  const preferred=DEPARTMENT_STATUS_COMMON_COLORS.find(item=>!used.has(item.value));
  if(preferred) return preferred.value;
  for(let index=0;index<360;index+=1){
    const candidate=departmentStatusHsvToHex((174+index*137.508)%360,72,78);
    if(!used.has(candidate)) return candidate;
  }
  return '#0F766E';
}
function departmentStatusColorPickerElements(){
  const root=$('#departmentStatusColorPicker');
  return {
    root,input:$('#departmentStatusDisplayColorInput'),trigger:$('#departmentStatusColorTrigger'),
    popover:$('#departmentStatusColorPopover'),spectrum:root?.querySelector('[data-status-color-spectrum]'),
    thumb:root?.querySelector('[data-status-color-spectrum-thumb]'),hue:$('#departmentStatusColorHueInput'),
    hex:$('#departmentStatusColorHexInput'),rgb:Array.from(root?.querySelectorAll('[data-status-color-rgb]')||[]),
    validation:root?.querySelector('[data-status-color-validation]'),common:root?.querySelector('[data-status-color-common]'),
    currentPreview:root?.querySelector('[data-status-color-current-preview]'),currentValue:root?.querySelector('[data-status-color-current-value]'),
    newPreview:root?.querySelector('[data-status-color-new-preview]'),newValue:root?.querySelector('[data-status-color-new-value]')
  };
}
function setDepartmentStatusColorValidation(message=''){
  const {validation}=departmentStatusColorPickerElements();
  if(validation) validation.textContent=message;
  DEPARTMENT_STATUS_COLOR_PICKER_STATE.valid=!message;
}
function renderDepartmentStatusColorPickerDraft(){
  const state=DEPARTMENT_STATUS_COLOR_PICKER_STATE,elements=departmentStatusColorPickerElements();
  const rgb=departmentStatusHsvToRgb(state.hue,state.saturation,state.brightness);
  state.draft=departmentStatusRgbToHex(rgb.r,rgb.g,rgb.b);
  elements.root?.style.setProperty('--department-picker-hue',departmentStatusHsvToHex(state.hue,100,100));
  if(elements.thumb){elements.thumb.style.left=state.saturation+'%';elements.thumb.style.top=(100-state.brightness)+'%';}
  if(elements.spectrum){
    elements.spectrum.setAttribute('aria-valuenow',String(Math.round(state.brightness)));
    elements.spectrum.setAttribute('aria-valuetext','تشبع '+Math.round(state.saturation)+'%، سطوع '+Math.round(state.brightness)+'%، '+state.draft);
  }
  if(elements.hue) elements.hue.value=String(Math.round(state.hue));
  elements.rgb.forEach(input=>{input.value=String(rgb[input.dataset.statusColorRgb]);});
  if(elements.hex) elements.hex.value=state.draft;
  if(elements.newPreview) elements.newPreview.style.background=state.draft;
  if(elements.newValue) elements.newValue.textContent=state.draft;
  setDepartmentStatusColorValidation('');
}
function setDepartmentStatusColorPickerFromHex(color){
  const normalized=normalizeDepartmentStatusHex(color);
  if(!normalized) return false;
  const rgb=departmentStatusHexToRgb(normalized),hsv=departmentStatusRgbToHsv(rgb.r,rgb.g,rgb.b);
  Object.assign(DEPARTMENT_STATUS_COLOR_PICKER_STATE,{draft:normalized,hue:hsv.h,saturation:hsv.s,brightness:hsv.v});
  renderDepartmentStatusColorPickerDraft();
  return true;
}
function setDepartmentStatusColorPickerFromHsv(hue,saturation,brightness){
  Object.assign(DEPARTMENT_STATUS_COLOR_PICKER_STATE,{hue:Number(hue),saturation:Number(saturation),brightness:Number(brightness)});
  renderDepartmentStatusColorPickerDraft();
}
function setDepartmentStatusColorValue(color){
  const normalized=normalizeDepartmentStatusHex(color)||'#0F766E';
  const {input,trigger,root}=departmentStatusColorPickerElements();
  if(input) input.value=normalized;
  root?.style.setProperty('--department-status-selected-color',normalized);
  const swatch=trigger?.querySelector('[data-status-color-trigger-swatch]');
  if(swatch) swatch.style.background=normalized;
  const value=trigger?.querySelector('[data-status-color-trigger-value]');
  if(value) value.textContent=normalized;
}
function positionDepartmentStatusColorPicker(){
  const {trigger,popover}=departmentStatusColorPickerElements();
  if(!trigger||!popover||popover.hidden) return;
  if(window.matchMedia('(max-width: 650px)').matches){
    popover.style.removeProperty('top');popover.style.removeProperty('left');popover.style.removeProperty('width');return;
  }
  const rect=trigger.getBoundingClientRect(),width=Math.min(380,window.innerWidth-24);
  popover.style.width=width+'px';
  const height=Math.min(popover.offsetHeight||560,window.innerHeight-24);
  const preferredTop=window.innerHeight-rect.bottom>=height+8?rect.bottom+8:rect.top-height-8;
  const top=Math.max(12,Math.min(window.innerHeight-height-12,preferredTop));
  popover.style.top=top+'px';
  popover.style.left=Math.max(12,Math.min(window.innerWidth-width-12,rect.right-width))+'px';
}
function openDepartmentStatusColorPicker(){
  const elements=departmentStatusColorPickerElements();
  if(!elements.root||!elements.input||!elements.trigger||elements.trigger.disabled) return;
  const committed=normalizeDepartmentStatusHex(elements.input.value)||firstAvailableDepartmentStatusColor($('#departmentStatusCodeIdInput')?.value);
  Object.assign(DEPARTMENT_STATUS_COLOR_PICKER_STATE,{open:true,previous:committed,draft:committed,pointerId:null,returnFocus:elements.trigger});
  if(elements.currentPreview) elements.currentPreview.style.background=committed;
  if(elements.currentValue) elements.currentValue.textContent=committed;
  setDepartmentStatusColorPickerFromHex(committed);
  elements.popover.hidden=false;
  elements.trigger.setAttribute('aria-expanded','true');
  positionDepartmentStatusColorPicker();
  requestAnimationFrame(()=>{positionDepartmentStatusColorPicker();elements.spectrum?.focus({preventScroll:true});});
}
function closeDepartmentStatusColorPicker(apply=false,restoreFocus=true){
  const state=DEPARTMENT_STATUS_COLOR_PICKER_STATE,elements=departmentStatusColorPickerElements();
  if(!state.open||!elements.popover) return false;
  if(apply&&!state.valid) return false;
  setDepartmentStatusColorValue(apply?state.draft:state.previous);
  elements.popover.hidden=true;
  elements.trigger?.setAttribute('aria-expanded','false');
  state.open=false;state.pointerId=null;
  if(restoreFocus) state.returnFocus?.focus({preventScroll:true});
  state.returnFocus=null;
  return true;
}
function updateDepartmentStatusSpectrumFromPointer(event){
  const state=DEPARTMENT_STATUS_COLOR_PICKER_STATE,{spectrum}=departmentStatusColorPickerElements();
  if(!spectrum) return;
  const rect=spectrum.getBoundingClientRect();
  const saturation=Math.max(0,Math.min(100,((event.clientX-rect.left)/rect.width)*100));
  const brightness=Math.max(0,Math.min(100,(1-(event.clientY-rect.top)/rect.height)*100));
  setDepartmentStatusColorPickerFromHsv(state.hue,saturation,brightness);
}
function validateDepartmentStatusRgbInputs(){
  const {rgb}=departmentStatusColorPickerElements(),values={};
  for(const input of rgb){
    const text=String(input.value||'').trim();
    if(!/^\d{1,3}$/.test(text)||Number(text)<0||Number(text)>255){
      setDepartmentStatusColorValidation('يجب أن تكون قيم RGB أعدادًا صحيحة من 0 إلى 255.');return false;
    }
    values[input.dataset.statusColorRgb]=Number(text);
  }
  setDepartmentStatusColorPickerFromHex(departmentStatusRgbToHex(values.r,values.g,values.b));
  return true;
}
function initDepartmentStatusColorPicker(){
  const elements=departmentStatusColorPickerElements();
  if(!elements.root||elements.root.dataset.bound==='1') return;
  elements.root.dataset.bound='1';
  elements.common.innerHTML=DEPARTMENT_STATUS_COMMON_COLORS.map(item=>
    '<button type="button" class="department-status-color-shortcut" data-status-common-color="'+item.value+'" aria-label="'+escapeHtml(item.label)+' '+item.value+'" title="'+escapeHtml(item.label)+'" style="--shortcut-color:'+item.value+'"></button>'
  ).join('');
  elements.trigger.addEventListener('click',()=>DEPARTMENT_STATUS_COLOR_PICKER_STATE.open?closeDepartmentStatusColorPicker(false):openDepartmentStatusColorPicker());
  elements.popover.addEventListener('click',event=>{
    const action=event.target.closest('[data-status-color-action]')?.dataset.statusColorAction;
    if(action==='cancel'){closeDepartmentStatusColorPicker(false);return;}
    if(action==='apply'){closeDepartmentStatusColorPicker(true);return;}
    const shortcut=event.target.closest('[data-status-common-color]');
    if(shortcut) setDepartmentStatusColorPickerFromHex(shortcut.dataset.statusCommonColor);
  });
  elements.hue.addEventListener('input',()=>setDepartmentStatusColorPickerFromHsv(elements.hue.value,DEPARTMENT_STATUS_COLOR_PICKER_STATE.saturation,DEPARTMENT_STATUS_COLOR_PICKER_STATE.brightness));
  elements.rgb.forEach(input=>input.addEventListener('input',validateDepartmentStatusRgbInputs));
  elements.hex.addEventListener('input',()=>{
    const raw=String(elements.hex.value||'').trim();
    if(!normalizeDepartmentStatusHex(raw)){setDepartmentStatusColorValidation('أدخل اللون بصيغة صحيحة مثل #0F766E.');return;}
    setDepartmentStatusColorPickerFromHex(raw);
  });
  elements.spectrum.addEventListener('pointerdown',event=>{
    if(event.pointerType==='mouse'&&event.button!==0) return;
    event.preventDefault();DEPARTMENT_STATUS_COLOR_PICKER_STATE.pointerId=event.pointerId;
    elements.spectrum.setPointerCapture?.(event.pointerId);updateDepartmentStatusSpectrumFromPointer(event);
  });
  elements.spectrum.addEventListener('pointermove',event=>{
    if(DEPARTMENT_STATUS_COLOR_PICKER_STATE.pointerId!==event.pointerId) return;
    event.preventDefault();updateDepartmentStatusSpectrumFromPointer(event);
  });
  const finishPointer=event=>{
    if(DEPARTMENT_STATUS_COLOR_PICKER_STATE.pointerId!==event.pointerId) return;
    elements.spectrum.releasePointerCapture?.(event.pointerId);DEPARTMENT_STATUS_COLOR_PICKER_STATE.pointerId=null;
  };
  elements.spectrum.addEventListener('pointerup',finishPointer);
  elements.spectrum.addEventListener('pointercancel',finishPointer);
  elements.spectrum.addEventListener('keydown',event=>{
    const state=DEPARTMENT_STATUS_COLOR_PICKER_STATE;
    let saturation=state.saturation,brightness=state.brightness;
    if(event.key==='ArrowRight') saturation=Math.min(100,saturation+1);
    else if(event.key==='ArrowLeft') saturation=Math.max(0,saturation-1);
    else if(event.key==='ArrowUp') brightness=Math.min(100,brightness+1);
    else if(event.key==='ArrowDown') brightness=Math.max(0,brightness-1);
    else return;
    event.preventDefault();setDepartmentStatusColorPickerFromHsv(state.hue,saturation,brightness);
  });
  elements.popover.addEventListener('keydown',event=>{
    if(event.key!=='Tab') return;
    const focusable=Array.from(elements.popover.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]'));
    if(!focusable.length) return;
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  document.addEventListener('pointerdown',event=>{
    if(DEPARTMENT_STATUS_COLOR_PICKER_STATE.open&&!elements.root.contains(event.target)) closeDepartmentStatusColorPicker(false);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&DEPARTMENT_STATUS_COLOR_PICKER_STATE.open){event.preventDefault();closeDepartmentStatusColorPicker(false);}
  });
  window.addEventListener('resize',positionDepartmentStatusColorPicker);
  window.addEventListener('scroll',positionDepartmentStatusColorPicker,true);
  setDepartmentStatusColorValue(firstAvailableDepartmentStatusColor());
}
function syncDepartmentStatusBlockingField(){
  const code=String($('#departmentStatusCodeInput')?.value||'').trim();
  const input=$('#departmentStatusBlocksEvaluationInput');
  if(!input) return;
  const fixed=DEPARTMENT_STATUS_BLOCKING_FIXED_CODES.has(code);
  if(fixed) input.checked=true;
  input.disabled=fixed || !(Boolean($('#departmentStatusCodeIdInput')?.value)?canEditDepartmentCodingSettings():canAddDepartmentCodingSettings());
  input.title=fixed?'هذا الكود يمنع التقييم حسب القواعد المعتمدة.':'حدد ما إذا كانت الحالة تمنع التقييم.';
}

function canAddDepartmentCodingSettings(){
  return hasPermission('settings','add') || hasPermission('settings','manage');
}
function canEditDepartmentCodingSettings(){
  return hasPermission('settings','edit') || hasPermission('settings','manage');
}
function setDepartmentPersonnelStatus(message,type=''){
  const status=$('#departmentPersonnelStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message||'';
}
function setDepartmentStatusCodesStatus(message,type=''){
  const status=$('#departmentStatusCodesStatus');
  if(!status) return;
  status.className='upload-status '+(type||'');
  status.textContent=message||'';
}
function departmentCodingErrorMessage(error,codeLabel){
  const message=String(error?.message||error||'').trim();
  if(error?.code==='23505' && /active_display_color|display_color/i.test(message)){
    return 'لون العرض مستخدم بالفعل لحالة نشطة أخرى. اختر لونًا مختلفًا.';
  }
  if(error?.code==='23505' || /duplicate key|unique constraint/i.test(message)){
    return codeLabel+' مستخدم بالفعل. أدخل كودًا مختلفًا.';
  }
  if(error?.code==='42501' || /row-level security|permission denied/i.test(message)){
    return 'غير مسموح بتنفيذ العملية حسب صلاحية الإعدادات الحالية.';
  }
  if(error?.code==='42P01' || /does not exist|schema cache/i.test(message)){
    return 'حقول تكويد الحالات غير متاحة. تحقّق من تطبيق أحدث Migration إضافية خاصة بإدارة أفراد القسم.';
  }
  return message ? 'تعذر تنفيذ العملية: '+message : 'تعذر تنفيذ العملية في Supabase.';
}
function applyDepartmentPersonnelPermissions(){
  const canAdd=canAddDepartmentCodingSettings();
  const canEdit=canEditDepartmentCodingSettings();
  const editing=Boolean($('#departmentPersonnelIdInput')?.value);
  const canUseForm=editing ? canEdit : canAdd;
  const form=$('#departmentPersonnelForm');
  if(form) form.classList.toggle('permission-hidden',!canUseForm);
  setElementsDisabled('#departmentPersonnelForm input:not([type="hidden"]),#departmentPersonnelForm input[data-custom-date-picker],#departmentPersonnelForm select,#saveDepartmentPersonnelBtn',!canUseForm,true);
  const hireDateInput=$('#departmentPersonnelHireDateInput');
  if(window.CustomDatePicker && hireDateInput){
    window.CustomDatePicker.configure?.(hireDateInput,{commitOnDoubleClick:true});
    window.CustomDatePicker.init(hireDateInput.parentElement || form || document);
    window.CustomDatePicker.refresh(hireDateInput);
  }
  setElementsDisabled('#cancelDepartmentPersonnelBtn',editing ? !canEdit : false,true);
  setElementsDisabled('#departmentPersonnelTable [data-action="edit-department-personnel"],#departmentPersonnelTable [data-action="toggle-department-personnel"]',!canEdit,true);
}
function applyDepartmentStatusCodesPermissions(){
  const canAdd=canAddDepartmentCodingSettings();
  const canEdit=canEditDepartmentCodingSettings();
  const editing=Boolean($('#departmentStatusCodeIdInput')?.value);
  const canUseForm=editing ? canEdit : canAdd;
  const form=$('#departmentStatusCodeForm');
  if(form) form.classList.toggle('permission-hidden',!canUseForm);
  setElementsDisabled('#departmentStatusCodeForm input:not([type="hidden"]),#departmentStatusCodeForm button:not(#cancelDepartmentStatusCodeBtn),#saveDepartmentStatusCodeBtn',!canUseForm,true);
  syncDepartmentStatusBlockingField();
  setElementsDisabled('#cancelDepartmentStatusCodeBtn',editing ? !canEdit : false,true);
  setElementsDisabled('#departmentStatusCodesTable [data-action="edit-department-status"],#departmentStatusCodesTable [data-action="toggle-department-status"]',!canEdit,true);
}
function renderDepartmentPersonnelTable(rows=[]){
  const tbody=$('#departmentPersonnelTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9" class="empty-row">لا توجد بيانات لأفراد القسم.</td></tr>';
  }else{
    tbody.innerHTML=rows.map(row=>{
      const id=escapeHtml(row.id||'');
      const plantCode=String(row.plant_code||'');
      const plantLabel=plantCode+(DEPARTMENT_PERSONNEL_PLANTS[plantCode] ? ' — '+DEPARTMENT_PERSONNEL_PLANTS[plantCode] : '');
      return '<tr data-record-id="'+id+'">'
        +'<td dir="ltr">'+escapeHtml(row.employee_code||'')+'</td>'
        +'<td>'+escapeHtml(row.full_name||'')+'</td>'
        +'<td>'+escapeHtml(row.job_title||'')+'</td>'
        +'<td>'+escapeHtml(plantLabel)+'</td>'
        +'<td>'+escapeHtml(row.department||'')+'</td>'
        +'<td dir="ltr">'+escapeHtml(row.phone_number||'—')+'</td>'
        +'<td>'+escapeHtml(formatDepartmentPersonnelDate(row.hire_date))+'</td>'
        +'<td><span class="status-badge '+(row.is_active?'status-active':'status-inactive')+'">'+(row.is_active?'نشط':'غير نشط')+'</span></td>'
        +'<td><div class="actions-cell">'
        +'<button class="small-action edit" type="button" data-action="edit-department-personnel" data-record-id="'+id+'">تعديل</button>'
        +'<button class="small-action '+(row.is_active?'delete':'view')+'" type="button" data-action="toggle-department-personnel" data-record-id="'+id+'" data-next-active="'+(!row.is_active)+'">'+(row.is_active?'إيقاف':'تفعيل')+'</button>'
        +'</div></td></tr>';
    }).join('');
  }
  refreshSettingsTableControls('departmentPersonnelTable');
  applyDepartmentPersonnelPermissions();
}
async function loadDepartmentPersonnelTable(options={}){
  const tbody=$('#departmentPersonnelTable tbody');
  if(!tbody) return false;
  if(!WarehouseDB?.ready){
    tbody.innerHTML='<tr><td colspan="9" class="empty-row">Supabase غير متصل.</td></tr>';
    setDepartmentPersonnelStatus('Supabase غير متصل. تعذر تحميل أفراد القسم.','err');
    return false;
  }
  if(!options.silent){
    tbody.innerHTML='<tr><td colspan="9" class="empty-row">جاري التحميل...</td></tr>';
    setDepartmentPersonnelStatus('');
  }
  try{
    const {data,error}=await WarehouseDB.client
      .from(DEPARTMENT_PERSONNEL_TABLE)
      .select('id,employee_code,full_name,job_title,plant_code,department,phone_number,hire_date,is_active,created_at,updated_at')
      .order('created_at',{ascending:false});
    if(error) throw error;
    DEPARTMENT_PERSONNEL_ROWS=data||[];
    renderDepartmentPersonnelTable(DEPARTMENT_PERSONNEL_ROWS);
    return true;
  }catch(error){
    tbody.innerHTML='<tr><td colspan="9" class="empty-row">تعذر تحميل بيانات أفراد القسم.</td></tr>';
    setDepartmentPersonnelStatus(departmentCodingErrorMessage(error,'الكود الوظيفي'),'err');
    return false;
  }
}
async function ensureDepartmentPersonnelLoaded(){
  if(DEPARTMENT_PERSONNEL_LOADED || DEPARTMENT_PERSONNEL_LOADING) return;
  DEPARTMENT_PERSONNEL_LOADING=true;
  try{
    DEPARTMENT_PERSONNEL_LOADED=await loadDepartmentPersonnelTable();
  }finally{
    DEPARTMENT_PERSONNEL_LOADING=false;
  }
}
function resetDepartmentPersonnelForm(){
  const form=$('#departmentPersonnelForm');
  if(!form) return;
  form.reset();
  $('#departmentPersonnelIdInput').value='';
  $('#departmentPersonnelActiveInput').checked=true;
  const hireDateInput=$('#departmentPersonnelHireDateInput');
  if(hireDateInput) hireDateInput.value='';
  if(window.CustomDatePicker) window.CustomDatePicker.refresh(hireDateInput);
  $('#saveDepartmentPersonnelBtn').textContent='حفظ الموظف';
  $('#cancelDepartmentPersonnelBtn').hidden=true;
  applyDepartmentPersonnelPermissions();
}
function editDepartmentPersonnel(recordId){
  if(!canEditDepartmentCodingSettings()){
    setDepartmentPersonnelStatus('غير متاح للصلاحية الحالية.','err');
    return;
  }
  const row=DEPARTMENT_PERSONNEL_ROWS.find(item=>String(item.id)===String(recordId));
  if(!row){
    setDepartmentPersonnelStatus('تعذر العثور على سجل الموظف. أعد تحميل الجدول.','err');
    return;
  }
  $('#departmentPersonnelIdInput').value=row.id||'';
  $('#departmentPersonnelCodeInput').value=row.employee_code||'';
  $('#departmentPersonnelNameInput').value=row.full_name||'';
  $('#departmentPersonnelJobTitleInput').value=row.job_title||'';
  $('#departmentPersonnelPlantInput').value=row.plant_code||'';
  $('#departmentPersonnelDepartmentInput').value=row.department||'';
  $('#departmentPersonnelPhoneInput').value=row.phone_number||'';
  $('#departmentPersonnelHireDateInput').value=row.hire_date||'';
  if(window.CustomDatePicker) window.CustomDatePicker.refresh($('#departmentPersonnelHireDateInput'));
  $('#departmentPersonnelActiveInput').checked=row.is_active===true;
  $('#saveDepartmentPersonnelBtn').textContent='تحديث الموظف';
  $('#cancelDepartmentPersonnelBtn').hidden=false;
  setDepartmentPersonnelStatus('');
  applyDepartmentPersonnelPermissions();
  $('#departmentPersonnelCodeInput')?.focus();
}
async function saveDepartmentPersonnel(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(DEPARTMENT_PERSONNEL_SAVING) return;
  if(!form.checkValidity()){
    setDepartmentPersonnelStatus('يرجى استكمال جميع الحقول الإجبارية.','err');
    form.reportValidity();
    return;
  }
  const id=String($('#departmentPersonnelIdInput')?.value||'').trim();
  const canSave=id ? canEditDepartmentCodingSettings() : canAddDepartmentCodingSettings();
  if(!canSave){
    setDepartmentPersonnelStatus('غير متاح للصلاحية الحالية.','err');
    applyDepartmentPersonnelPermissions();
    return;
  }
  const payload={
    employee_code:String($('#departmentPersonnelCodeInput')?.value||'').trim(),
    full_name:String($('#departmentPersonnelNameInput')?.value||'').trim(),
    job_title:String($('#departmentPersonnelJobTitleInput')?.value||'').trim(),
    plant_code:String($('#departmentPersonnelPlantInput')?.value||'').trim(),
    department:String($('#departmentPersonnelDepartmentInput')?.value||'').trim(),
    phone_number:String($('#departmentPersonnelPhoneInput')?.value||'').trim() || null,
    hire_date:String($('#departmentPersonnelHireDateInput')?.value||'').trim() || null,
    is_active:Boolean($('#departmentPersonnelActiveInput')?.checked)
  };
  if(!isValidDepartmentPhone(payload.phone_number)){
    setDepartmentPersonnelStatus('رقم التليفون يحتوي على حروف أو رموز غير مسموحة.','err');
    return;
  }
  if(!payload.employee_code || !payload.full_name || !DEPARTMENT_PERSONNEL_JOB_TITLES.has(payload.job_title) || !DEPARTMENT_PERSONNEL_PLANTS[payload.plant_code] || !DEPARTMENT_PERSONNEL_DEPARTMENTS.has(payload.department)){
    setDepartmentPersonnelStatus('يرجى إدخال قيم صحيحة في جميع الحقول الإجبارية.','err');
    return;
  }
  if(!WarehouseDB?.ready){
    setDepartmentPersonnelStatus('Supabase غير متصل. لم يتم حفظ البيانات.','err');
    return;
  }
  const button=$('#saveDepartmentPersonnelBtn');
  const originalText=button.textContent;
  let succeeded=false;
  DEPARTMENT_PERSONNEL_SAVING=true;
  button.disabled=true;
  button.textContent='جاري الحفظ...';
  setDepartmentPersonnelStatus('');
  try{
    const query=id
      ? WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE).update(payload).eq('id',id).select('id').maybeSingle()
      : WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE).insert([payload]).select('id').single();
    const {data,error}=await query;
    if(error) throw error;
    if(id && !data) throw new Error('لم يتم العثور على السجل المطلوب تعديله.');
    resetDepartmentPersonnelForm();
    const refreshed=await loadDepartmentPersonnelTable({silent:true});
    setDepartmentPersonnelStatus(refreshed ? (id?'تم تعديل بيانات الموظف بنجاح.':'تمت إضافة الموظف بنجاح.') : 'تم الحفظ، لكن تعذر تحديث الجدول. أعد فتح التبويب.','ok');
    succeeded=true;
  }catch(error){
    setDepartmentPersonnelStatus(departmentCodingErrorMessage(error,'الكود الوظيفي'),'err');
  }finally{
    DEPARTMENT_PERSONNEL_SAVING=false;
    if(!succeeded) button.textContent=originalText;
    button.disabled=false;
    applyDepartmentPersonnelPermissions();
  }
}
async function toggleDepartmentPersonnelStatus(recordId,nextActive){
  if(DEPARTMENT_PERSONNEL_STATUS_PENDING.has(recordId)) return;
  if(!canEditDepartmentCodingSettings()){
    setDepartmentPersonnelStatus('غير متاح للصلاحية الحالية.','err');
    return;
  }
  if(!WarehouseDB?.ready){
    setDepartmentPersonnelStatus('Supabase غير متصل. لم يتم تحديث الحالة.','err');
    return;
  }
  DEPARTMENT_PERSONNEL_STATUS_PENDING.add(recordId);
  applyDepartmentPersonnelPermissions();
  try{
    const {data,error}=await WarehouseDB.client
      .from(DEPARTMENT_PERSONNEL_TABLE)
      .update({is_active:nextActive})
      .eq('id',recordId)
      .select('id')
      .maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('لم يتم العثور على سجل الموظف.');
    const refreshed=await loadDepartmentPersonnelTable({silent:true});
    setDepartmentPersonnelStatus(refreshed ? (nextActive?'تم تفعيل الموظف بنجاح.':'تم إيقاف الموظف بنجاح.') : 'تم تحديث الحالة، لكن تعذر تحديث الجدول.','ok');
  }catch(error){
    setDepartmentPersonnelStatus(departmentCodingErrorMessage(error,'الكود الوظيفي'),'err');
  }finally{
    DEPARTMENT_PERSONNEL_STATUS_PENDING.delete(recordId);
    applyDepartmentPersonnelPermissions();
  }
}
function renderDepartmentStatusCodesTable(rows=[]){
  const tbody=$('#departmentStatusCodesTable tbody');
  if(!tbody) return;
  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="6" class="empty-row">لا توجد أكواد ورديات أو إجازات.</td></tr>';
  }else{
    tbody.innerHTML=rows.map(row=>{
      const id=escapeHtml(row.id||'');
      const color=String(row.display_color||'#0F766E').toUpperCase();
      return '<tr data-record-id="'+id+'">'
        +'<td dir="ltr">'+escapeHtml(row.shift_code||'')+'</td>'
        +'<td>'+escapeHtml(row.description||'')+'</td>'
        +'<td><span class="department-status-color-badge" style="--status-color:'+escapeHtml(color)+';--status-text:'+departmentStatusTextColor(color)+'"><i aria-hidden="true"></i>'+escapeHtml(color)+'</span></td>'
        +'<td><span class="status-badge '+(row.blocks_evaluation?'status-inactive':'status-active')+'">'+(row.blocks_evaluation?'نعم':'لا')+'</span></td>'
        +'<td><span class="status-badge '+(row.is_active?'status-active':'status-inactive')+'">'+(row.is_active?'نشط':'غير نشط')+'</span></td>'
        +'<td><div class="actions-cell">'
        +'<button class="small-action edit" type="button" data-action="edit-department-status" data-record-id="'+id+'">تعديل</button>'
        +'<button class="small-action '+(row.is_active?'delete':'view')+'" type="button" data-action="toggle-department-status" data-record-id="'+id+'" data-next-active="'+(!row.is_active)+'">'+(row.is_active?'إيقاف':'تفعيل')+'</button>'
        +'</div></td></tr>';
    }).join('');
  }
  refreshSettingsTableControls('departmentStatusCodesTable');

  applyDepartmentStatusCodesPermissions();
}
async function loadDepartmentStatusCodesTable(options={}){
  const tbody=$('#departmentStatusCodesTable tbody');
  if(!tbody) return false;
  if(!WarehouseDB?.ready){
    tbody.innerHTML='<tr><td colspan="6" class="empty-row">Supabase غير متصل.</td></tr>';
    setDepartmentStatusCodesStatus('Supabase غير متصل. تعذر تحميل أكواد الورديات والإجازات.','err');
    return false;
  }
  if(!options.silent){
    tbody.innerHTML='<tr><td colspan="6" class="empty-row">جاري التحميل...</td></tr>';
    setDepartmentStatusCodesStatus('');
  }
  try{
    const {data,error}=await WarehouseDB.client
      .from(DEPARTMENT_STATUS_CODES_TABLE)
      .select('id,shift_code,description,blocks_evaluation,display_color,is_active,created_at,updated_at')
      .order('created_at',{ascending:false});
    if(error) throw error;
    DEPARTMENT_STATUS_CODE_ROWS=data||[];
    window.dispatchEvent(new CustomEvent('department-status-codes-updated',{detail:{codes:DEPARTMENT_STATUS_CODE_ROWS.map(row=>({...row}))}}));
    renderDepartmentStatusCodesTable(DEPARTMENT_STATUS_CODE_ROWS);
    return true;
  }catch(error){
    tbody.innerHTML='<tr><td colspan="6" class="empty-row">تعذر تحميل أكواد الورديات والإجازات.</td></tr>';
    setDepartmentStatusCodesStatus(departmentCodingErrorMessage(error,'كود الوردية'),'err');
    return false;
  }
}
async function ensureDepartmentStatusCodesLoaded(){
  if(DEPARTMENT_STATUS_CODES_LOADED || DEPARTMENT_STATUS_CODES_LOADING) return;
  DEPARTMENT_STATUS_CODES_LOADING=true;
  try{
    DEPARTMENT_STATUS_CODES_LOADED=await loadDepartmentStatusCodesTable();
  }finally{
    DEPARTMENT_STATUS_CODES_LOADING=false;
  }
}
function resetDepartmentStatusCodeForm(){
  const form=$('#departmentStatusCodeForm');
  if(!form) return;
  form.reset();
  $('#departmentStatusCodeIdInput').value='';
  $('#departmentStatusActiveInput').checked=true;
  $('#departmentStatusBlocksEvaluationInput').checked=false;
  closeDepartmentStatusColorPicker(false,false);
  setDepartmentStatusColorValue(firstAvailableDepartmentStatusColor());
  syncDepartmentStatusBlockingField();
  $('#saveDepartmentStatusCodeBtn').textContent='حفظ الكود';
  $('#cancelDepartmentStatusCodeBtn').hidden=true;
  applyDepartmentStatusCodesPermissions();
}
function editDepartmentStatusCode(recordId){
  if(!canEditDepartmentCodingSettings()){
    setDepartmentStatusCodesStatus('غير متاح للصلاحية الحالية.','err');
    return;
  }
  const row=DEPARTMENT_STATUS_CODE_ROWS.find(item=>String(item.id)===String(recordId));
  if(!row){
    setDepartmentStatusCodesStatus('تعذر العثور على سجل الكود. أعد تحميل الجدول.','err');
    return;
  }
  $('#departmentStatusCodeIdInput').value=row.id||'';
  $('#departmentStatusCodeInput').value=row.shift_code||'';
  $('#departmentStatusDescriptionInput').value=row.description||'';
  $('#departmentStatusBlocksEvaluationInput').checked=row.blocks_evaluation===true;
  $('#departmentStatusActiveInput').checked=row.is_active===true;
  closeDepartmentStatusColorPicker(false,false);
  setDepartmentStatusColorValue(row.display_color);
  syncDepartmentStatusBlockingField();
  $('#saveDepartmentStatusCodeBtn').textContent='تحديث الكود';
  $('#cancelDepartmentStatusCodeBtn').hidden=false;
  setDepartmentStatusCodesStatus('');
  applyDepartmentStatusCodesPermissions();
  $('#departmentStatusCodeInput')?.focus();
}
async function saveDepartmentStatusCode(event){
  event.preventDefault();
  const form=event.currentTarget;
  if(DEPARTMENT_STATUS_CODE_SAVING) return;
  if(!form.checkValidity()){
    setDepartmentStatusCodesStatus('يرجى استكمال جميع الحقول الإجبارية.','err');
    form.reportValidity();
    return;
  }
  const id=String($('#departmentStatusCodeIdInput')?.value||'').trim();
  const canSave=id ? canEditDepartmentCodingSettings() : canAddDepartmentCodingSettings();
  if(!canSave){
    setDepartmentStatusCodesStatus('غير متاح للصلاحية الحالية.','err');
    applyDepartmentStatusCodesPermissions();
    return;
  }
  const payload={
    shift_code:String($('#departmentStatusCodeInput')?.value||'').trim(),
    description:String($('#departmentStatusDescriptionInput')?.value||'').trim(),
    blocks_evaluation:Boolean($('#departmentStatusBlocksEvaluationInput')?.checked),
    display_color:String($('#departmentStatusDisplayColorInput')?.value||'').trim().toUpperCase(),
    is_active:Boolean($('#departmentStatusActiveInput')?.checked)
  };
  if(DEPARTMENT_STATUS_BLOCKING_FIXED_CODES.has(payload.shift_code)) payload.blocks_evaluation=true;
  if(!payload.shift_code || !payload.description || !normalizeDepartmentStatusHex(payload.display_color)){
    setDepartmentStatusCodesStatus('يرجى استكمال جميع الحقول الإجبارية.','err');
    return;
  }
  if(!WarehouseDB?.ready){
    setDepartmentStatusCodesStatus('Supabase غير متصل. لم يتم حفظ البيانات.','err');
    return;
  }
  const button=$('#saveDepartmentStatusCodeBtn');
  const originalText=button.textContent;
  let succeeded=false;
  DEPARTMENT_STATUS_CODE_SAVING=true;
  button.disabled=true;
  button.textContent='جاري الحفظ...';
  setDepartmentStatusCodesStatus('');
  try{
    const query=id
      ? WarehouseDB.client.from(DEPARTMENT_STATUS_CODES_TABLE).update(payload).eq('id',id).select('id').maybeSingle()
      : WarehouseDB.client.from(DEPARTMENT_STATUS_CODES_TABLE).insert([payload]).select('id').single();
    const {data,error}=await query;
    if(error) throw error;
    if(id && !data) throw new Error('لم يتم العثور على السجل المطلوب تعديله.');
    resetDepartmentStatusCodeForm();
    const refreshed=await loadDepartmentStatusCodesTable({silent:true});
    setDepartmentStatusCodesStatus(refreshed ? (id?'تم تعديل الكود والوصف بنجاح.':'تمت إضافة الكود بنجاح.') : 'تم الحفظ، لكن تعذر تحديث الجدول. أعد فتح التبويب.','ok');
    succeeded=true;
  }catch(error){
    setDepartmentStatusCodesStatus(departmentCodingErrorMessage(error,'كود الوردية'),'err');
  }finally{
    DEPARTMENT_STATUS_CODE_SAVING=false;
    if(!succeeded) button.textContent=originalText;
    button.disabled=false;
    applyDepartmentStatusCodesPermissions();
  }
}
async function toggleDepartmentStatusCode(recordId,nextActive){
  if(DEPARTMENT_STATUS_CODE_PENDING.has(recordId)) return;
  if(!canEditDepartmentCodingSettings()){
    setDepartmentStatusCodesStatus('غير متاح للصلاحية الحالية.','err');
    return;
  }
  if(!WarehouseDB?.ready){
    setDepartmentStatusCodesStatus('Supabase غير متصل. لم يتم تحديث الحالة.','err');
    return;
  }
  DEPARTMENT_STATUS_CODE_PENDING.add(recordId);
  applyDepartmentStatusCodesPermissions();
  try{
    const {data,error}=await WarehouseDB.client
      .from(DEPARTMENT_STATUS_CODES_TABLE)
      .update({is_active:nextActive})
      .eq('id',recordId)
      .select('id')
      .maybeSingle();
    if(error) throw error;
    if(!data) throw new Error('لم يتم العثور على سجل الكود.');
    const refreshed=await loadDepartmentStatusCodesTable({silent:true});
    setDepartmentStatusCodesStatus(refreshed ? (nextActive?'تم تفعيل الكود بنجاح.':'تم إيقاف الكود بنجاح.') : 'تم تحديث الحالة، لكن تعذر تحديث الجدول.','ok');
  }catch(error){
    setDepartmentStatusCodesStatus(departmentCodingErrorMessage(error,'كود الوردية'),'err');
  }finally{
    DEPARTMENT_STATUS_CODE_PENDING.delete(recordId);
    applyDepartmentStatusCodesPermissions();
  }
}
function initDepartmentCodingSettings(){
  const personnelForm=$('#departmentPersonnelForm');
  if(personnelForm && personnelForm.dataset.bound!=='1'){
    personnelForm.dataset.bound='1';
    personnelForm.addEventListener('submit',saveDepartmentPersonnel);
    personnelForm.addEventListener('invalid',()=>setDepartmentPersonnelStatus('يرجى استكمال جميع الحقول الإجبارية.','err'),true);
    $('#cancelDepartmentPersonnelBtn')?.addEventListener('click',resetDepartmentPersonnelForm);
    $('#departmentPersonnelTable')?.addEventListener('click',event=>{
      const button=event.target.closest('button[data-action][data-record-id]');
      if(!button) return;
      const id=button.dataset.recordId;
      if(button.dataset.action==='edit-department-personnel') editDepartmentPersonnel(id);
      if(button.dataset.action==='toggle-department-personnel') toggleDepartmentPersonnelStatus(id,button.dataset.nextActive==='true');
    });
  }
  const statusForm=$('#departmentStatusCodeForm');
  if(statusForm && statusForm.dataset.bound!=='1'){
    statusForm.dataset.bound='1';
    statusForm.addEventListener('submit',saveDepartmentStatusCode);
    statusForm.addEventListener('invalid',()=>setDepartmentStatusCodesStatus('يرجى استكمال جميع الحقول الإجبارية.','err'),true);
    $('#cancelDepartmentStatusCodeBtn')?.addEventListener('click',resetDepartmentStatusCodeForm);
    $('#departmentStatusCodeInput')?.addEventListener('input',syncDepartmentStatusBlockingField);
    initDepartmentStatusColorPicker();
    setDepartmentStatusColorValue(firstAvailableDepartmentStatusColor());
    syncDepartmentStatusBlockingField();
    $('#departmentStatusCodesTable')?.addEventListener('click',event=>{
      const button=event.target.closest('button[data-action][data-record-id]');
      if(!button) return;
      const id=button.dataset.recordId;
      if(button.dataset.action==='edit-department-status') editDepartmentStatusCode(id);
      if(button.dataset.action==='toggle-department-status') toggleDepartmentStatusCode(id,button.dataset.nextActive==='true');
    });
  }
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',initDepartmentCodingSettings);
}else{
  initDepartmentCodingSettings();
}
