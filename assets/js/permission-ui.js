(function permissionUIFactory(globalScope) {
  'use strict';
  const runtime = globalScope.PermissionRuntime;
  const registry = globalScope.AuditPermissionRegistry;
  const doc = globalScope.document;
  if (!runtime || !registry || !doc) return;
  const nodes = registry.nodes;
  const q = selector => doc.querySelector(selector);
  const all = selector => [...doc.querySelectorAll(selector)];
  const globalKey = key => /^(users|permissions|settings)(\.|$)/.test(key);
  const reportKey = () => 'reports.' + ((q('[data-report-tab].active')?.dataset.reportTab || 'executive').replace('salesTotals', 'sales_totals')) + '.view';
  const values = id => typeof globalScope.enterpriseSelectValues === 'function' ? globalScope.enterpriseSelectValues(id) : q('#' + id)?.value || 'all';
  function fixedPlant(key, element) {
    const match = key.match(/(?:^|[._])(wf01|el01|el02)(?:[._]|$)/i);
    if (match) return match[1].toUpperCase();
    const tab = element?.closest?.('[data-loading-errors-plant],[data-inventory-expiry-tab],[data-inventory-difference-plant],[data-weekly-tab]');
    return tab?.dataset.loadingErrorsPlant || tab?.dataset.inventoryExpiryTab || tab?.dataset.inventoryDifferencePlant || tab?.dataset.weeklyTab?.slice(0,4).toUpperCase() || '';
  }
  function scopeFor(key, element) {
    const fixed = fixedPlant(key, element);
    if (fixed) return [fixed];
    if (globalKey(key)) return runtime.plantCodes();
    if (key.startsWith('upload_reports.')) return runtime.plantCodes();
    if (key.startsWith('dashboard.')) return runtime.scope('dashboard.view', values('dashboardPlantFilter'));
    if (key.startsWith('reports.')) return runtime.scope(reportKey(), values('reportPlantFilter'));
    if (key.startsWith('raw_materials.')) return runtime.scope('raw_materials.'+(q('[data-raw-materials-tab].active')?.dataset.rawMaterialsTab || 'main')+'.view', values('rawMaterialsPlantFilter'));
    if (key.startsWith('inbound_review.')) return runtime.scope('inbound_review.view', q('#plantFilter')?.value || 'all');
    if (key.startsWith('sales_review.')) {
      const warehouse = element?.closest?.('[data-warehouse]')?.dataset.warehouse || q('#salesTabs .active')?.dataset.warehouse;
      return [globalScope.warehouseMetaByCode?.(warehouse)?.plant_code || ''];
    }
    if (key.startsWith('inventory.count.')) return [q('#inventoryCountPlantSelect')?.value || ''];
    if (key === 'inventory.differences.document.replace') return [q('#inventoryCountPlantSelect')?.value || ''];
    if (key.startsWith('inventory.differences.')) return [q('[data-inventory-difference-plant].active')?.dataset.inventoryDifferencePlant || ''];
    if (key.startsWith('inventory.production_dates.')) return [q('[data-inventory-expiry-tab].active')?.dataset.inventoryExpiryTab || ''];
    if (key.startsWith('department_personnel.loading_errors.')) return [q('[data-loading-errors-plant].active')?.dataset.loadingErrorsPlant || ''];
    if (key.startsWith('department_personnel.weekly_leave.') || key.startsWith('department_personnel.evaluations.')) {
      const section = key.startsWith('department_personnel.evaluations.') ? '#department_evaluations' : '#department_weekly_leave_schedule';
      return [q(section + ' [data-weekly-tab].active')?.dataset.weeklyTab?.slice(0,4).toUpperCase() || ''];
    }
    if (key.startsWith('department_personnel.hr_reports.')) return runtime.scope('department_personnel.hr_reports.'+(q('[data-department-hr-tab].active')?.dataset.departmentHrTab || 'cumulative_department_evaluation')+'.view', q('#departmentHrPlantFilter')?.value || 'all');
    if (key.startsWith('department_personnel.storekeepers.')) return runtime.scope('department_personnel.storekeepers.view', q('#departmentStorekeepersPlantFilter')?.value || 'all');
    return runtime.plantCodes();
  }
  function allowed(node, element) {
    if (!runtime.isReady()) return false;
    if(node.key==='inventory.view') return ['inventory.count.view','inventory.differences.view','inventory.production_dates.view'].some(key=>runtime.any(key));
    if(node.key==='department_personnel.view') return ['storekeepers','weekly_leave','hr_reports','evaluations','loading_errors'].some(key=>runtime.any('department_personnel.'+key+'.view'));
    if (globalKey(node.key)) return runtime.can(node.key);
    if (['SCREEN','SUBSCREEN'].includes(node.type)) return runtime.any(node.key);
    if (node.type === 'TAB') {
      if(node.key==='department_personnel.loading_errors.completed.view' || node.key==='department_personnel.loading_errors.pending_review.view') return runtime.can(node.key,scopeFor(node.key,element));
      const fixed = fixedPlant(node.key, element);
      if (fixed) return runtime.can(node.key, fixed);
      // Upload histories contain multiple plants; only the three closing tabs
      // have a reliable single-plant contract in this frontend phase.
      if (node.key.startsWith('upload_reports.')) return runtime.can(node.key);
      return runtime.any(node.key);
    }
    if (element?.matches?.('[data-inventory-difference-plant]')) return runtime.can(node.key,scopeFor(node.key,element));
    if (node.type === 'FILTER' && /\.filter\.plant\.use$/.test(node.key)) return runtime.any(node.key);
    const scope = scopeFor(node.key, element);
    if (!runtime.can(node.key, scope)) return false;
    // Exports and shared controls also require the currently displayed tab.
    if (node.key.startsWith('reports.') && !runtime.can(reportKey(), scope)) return false;
    const rawTab = q('[data-raw-materials-tab].active')?.dataset.rawMaterialsTab;
    if (node.key.startsWith('raw_materials.') && rawTab && !runtime.can('raw_materials.' + rawTab + '.view', scope)) return false;
    return true;
  }
  const bindings = nodes.flatMap(node => node.selectors.map(selector => ({ node, selector })));
  // Inputs/drop zones and form submits enter the same permission as the visible
  // action. Close/cancel controls deliberately have no action binding.
  function extraKey(element, event) {
    const file = element.closest?.('[data-upload-panel]');
    if (file && (element.matches('input[type="file"]') || event?.type === 'drop')) return 'upload_reports.' + file.dataset.uploadPanel + '.upload';
    if (element.closest?.('#userManagementForm') && (event?.type === 'submit' || element.id === 'saveManagedUserBtn')) return 'users.' + (q('#managedUserId')?.value ? 'edit' : 'create');
    if (element.closest?.('#storekeeperSettingsForm') && (event?.type === 'submit' || element.id === 'saveStorekeeperBtn')) return 'settings.storekeepers.' + (q('#storekeeperIdInput')?.value ? 'edit' : 'create');
    if (element.closest?.('#departmentPersonnelForm') && (event?.type === 'submit' || element.id === 'saveDepartmentPersonnelBtn')) return 'settings.department_personnel.' + (q('#departmentPersonnelIdInput')?.value ? 'edit' : 'create');
    if (element.closest?.('#departmentStatusCodeForm') && (event?.type === 'submit' || element.id === 'saveDepartmentStatusCodeBtn')) return 'settings.department_status_codes.' + (q('#departmentStatusCodeIdInput')?.value ? 'edit' : 'create');
    if (element.matches?.('[data-loading-error-modal-action="submit"]')) return 'department_personnel.loading_errors.pending_review.' + (q('#departmentLoadingErrorModal')?.dataset.permissionMode === 'review' ? 'review.complete' : 'create');
    return '';
  }
  function targetElement(event) {
    let element = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const dateWrapper = element?.closest?.('.custom-date-picker');
    if(dateWrapper) element=dateWrapper.querySelector('input[data-custom-date-picker]') || element;
    const wrapper = element?.closest?.('.enterprise-multiselect');
    if (wrapper?.previousElementSibling?.matches('select')) element = wrapper.previousElementSibling;
    return element;
  }
  function exempt(element, event) {
    return event?.key === 'Escape' || Boolean(element.closest?.('[data-app-modal-close],[data-permission-editor-action="close"],[data-permission-screen-picker-action="close"],.app-liquid-modal__close,[data-weekly-action="close-evaluation"],[data-evaluation-modal-action="cancel"],[data-loading-error-modal-action="close"],[data-loading-error-modal-action="cancel"]'));
  }
  function blockingNode(element, event) {
    const extra = extraKey(element, event);
    if (extra) {
      const node = nodes.find(item => item.key === extra);
      if (node && !allowed(node, element)) return node;
    }
    for (const { node, selector } of bindings) {
      const target = element.closest?.(selector);
      if (!target) continue;
      // Forms reused for edits use the dynamic action above, never create AND edit.
      if (extra && /^(settings\.(storekeepers|department_personnel|department_status_codes)\.create|users\.create)$/.test(node.key)) continue;
      if (node.key.endsWith('.table.sort') && element.closest('input,select,textarea')) continue;
      if (!allowed(node, target)) return node;
    }
    return null;
  }
  function guard(event) {
    const element = targetElement(event);
    if (!element || exempt(element,event)) return;
    if (event.type === 'keydown' && ['Tab','Escape'].includes(event.key)) return;
    const node = blockingNode(element, event);
    if (!node) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (['click','submit','drop'].includes(event.type)) globalScope.alert?.('لا تملك صلاحية: ' + node.label + ' ضمن المصنع المحدد.');
  }
  let applying = false;
  let scheduled = false;
  const denied = new Map();
  function mark(element, deny, hide) {
    if (deny) {
      if (!denied.has(element)) denied.set(element, { hidden: element.classList.contains('permission-hidden'), disabled: element.getAttribute('aria-disabled') });
      if (hide) element.classList.add('permission-hidden');
      else { element.classList.add('permission-disabled'); element.setAttribute('aria-disabled','true'); }
    }
  }
  const panels = [
    ['[data-upload-tab]', 'uploadTab', value => '[data-upload-panel="' + value + '"]'],
    ['[data-raw-materials-tab]', 'rawMaterialsTab', value => '[data-raw-materials-panel="' + value + '"]'],
    ['[data-inventory-expiry-tab]', 'inventoryExpiryTab', value => '[data-inventory-expiry-panel="' + value + '"]'],
    ['[data-department-hr-tab]', 'departmentHrTab', value => '[data-department-hr-panel="' + value + '"]']
  ];
  const reportPanels = { executive:'executiveReportContent', salesTotals:'salesTotalsReportContent',items:'itemsReportContent',item_analytics:'itemAnalyticsContent',warehouses:'warehousesReportContent',exceptions:'exceptionsReportContent',smart:'smartAnalyticsContent',production:'productionAnalyticsContent' };
  function nodeFor(element) { return bindings.find(({node,selector}) => node.type === 'TAB' && element.matches(selector))?.node; }
  function apply() {
    if (applying) return;
    applying = true;
    try {
      for (const [element, previous] of denied) {
        if (!previous.hidden) element.classList.remove('permission-hidden');
        element.classList.remove('permission-disabled');
        if (previous.disabled == null) element.removeAttribute('aria-disabled'); else element.setAttribute('aria-disabled',previous.disabled);
      }
      denied.clear();
      for (const {node,selector} of bindings) {
        for (const element of all(selector)) {
          // Keep table headers/cells in place; native business locks stay owned
          // by their component. Capture guards enforce pointer/keyboard actions.
          const hide = ['SCREEN','SUBSCREEN','TAB'].includes(node.type) || (!element.matches('th,td,form,input,select,textarea') && node.type !== 'FILTER');
          const dynamicKey=extraKey(element,{type:'click'});
          const effective=dynamicKey ? nodes.find(item=>item.key===dynamicKey) || node : node;
          mark(element,!allowed(effective,element),hide);
          if (node.type === 'FILTER' && element.nextElementSibling?.classList.contains('enterprise-multiselect')) mark(element.nextElementSibling,!allowed(node,element),false);
          if (node.type === 'TAB' && element.getAttribute('aria-controls')) {
            const panel = doc.getElementById(element.getAttribute('aria-controls'));
            if (panel) mark(panel,!allowed(node,element),true);
          }
        }
      }
      for (const [selector,dataKey,panelSelector] of panels) for (const tab of all(selector)) {
        const node=nodeFor(tab); if (!node) continue;
        for (const panel of all(panelSelector(tab.dataset[dataKey]))) mark(panel,!allowed(node,tab),true);
      }
      for (const tab of all('[data-report-tab]')) {
        const node=nodeFor(tab); const panel=doc.getElementById(reportPanels[tab.dataset.reportTab]);
        if(node && panel) mark(panel,!allowed(node,tab),true);
      }
      // Mirror desktop grants in mobile selects (their owners forward clicks).
      for (const [selectId,selector,dataKey] of [['mobileReportsTabSelect','[data-report-tab]','reportTab'],['mobileUploadReportType','[data-upload-tab]','uploadTab']]) {
        const select=q('#'+selectId); if(!select) continue;
        for(const option of select.options) {
          const tab=all(selector).find(item=>item.dataset[dataKey]===option.value); const node=tab && nodeFor(tab);
          option.disabled=Boolean(node && !allowed(node,tab)); option.hidden=option.disabled;
        }
      }
      // The selected tab may belong to the previous user. Use the component's
      // existing tab handler to select a permitted tab and load its data.
      if(runtime.isReady()) for(const selector of ['[data-report-tab]','[data-upload-tab]','[data-raw-materials-tab]','[data-inventory-expiry-tab]','[data-department-hr-tab]','#department_weekly_leave_schedule [data-weekly-tab]','#department_evaluations [data-weekly-tab]','[data-loading-errors-plant]']) {
        const tabs=all(selector); const active=tabs.find(tab=>tab.classList.contains('active'));
        if(active && nodeFor(active) && !allowed(nodeFor(active),active)) {
          const first=tabs.find(tab=>nodeFor(tab) && allowed(nodeFor(tab),tab));
          if(first) first.click();
        }
      }
    } finally { applying = false; }
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    globalScope.setTimeout(() => { scheduled=false; apply(); },0);
  }
  for (const event of ['pointerdown','click','dblclick','beforeinput','input','paste','change','submit','drop','keydown']) globalScope.addEventListener(event,guard,true);
  doc.addEventListener('change',schedule);
  doc.addEventListener('click',schedule);
  globalScope.addEventListener('audit-permission-runtime-updated',schedule);
  function init() {
    // Child lists cover generated rows/modals without reacting to our own classes.
    new MutationObserver(schedule).observe(doc.body,{childList:true,subtree:true});
    apply();
  }
  if(doc.readyState==='loading') doc.addEventListener('DOMContentLoaded',init,{once:true}); else init();
  Object.defineProperty(globalScope,'PermissionUI',{value:Object.freeze({apply,scopeFor,reportKey}),writable:false});
})(typeof globalThis !== 'undefined' ? globalThis : this);
