(function(){
  'use strict';

  const CONFIGS={
    inventory_expiry_tracking:{sectionId:'inventory_expiry_tracking',anchor:'.focus-mode-title-row',kind:'production'},
    department_storekeepers:{sectionId:'department_storekeepers',anchor:'.department-screen-head',kind:'storekeepers'},
    department_weekly_leave_schedule:{sectionId:'department_weekly_leave_schedule',anchor:'.department-screen-head',kind:'statuses'},
    department_hr_reports:{sectionId:'department_hr_reports',anchor:'.department-screen-head',kind:'hr'},
    department_evaluations:{sectionId:'department_evaluations',anchor:'.department-screen-head',kind:'evaluations'}
  };
  const HR_SLUGS={
    cumulative_department_evaluation:'cumulative',personnel_performance:'personnel-performance',
    attendance_compliance:'attendance',absence_violations:'absence-violations',
    evaluation_analysis:'evaluation-analysis',performance_trend:'performance-trend'
  };
  const ICONS={
    focus:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M21 16v5h-5M3 16v5h5"/></svg>',
    close:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>',
    png:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM7 16l3-4 3 3 2-2 3 3M15.5 8.5h.01"/></svg>',
    pdf:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v16H6zM14 2v5h5M8 17h8M8 13h8"/></svg>',
    excel:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4zM4 9h16M4 14h16M10 4v16M15 4v16"/></svg>'
  };
  const EXCLUDED_SELECTORS=[
    '.report-workspace-toolbar','.inventory-production-toolbar','.department-hr-inline-controls',
    '.department-weekly-period','.department-weekly-actions','.department-weekly-tabs','.department-hr-report-controls',
    '.inventory-production-controls','.department-storekeepers-toolbar','.upload-status',
    '.department-hr-report-status','.inventory-production-screen-status','.department-admin-alert',
    '.department-hr-state.loading','.inventory-production-state.loading','[data-export-exclude]',
    'script','style','template'
  ].join(',');

  const byId=id=>document.getElementById(id);
  const text=value=>String(value??'').replace(/\s+/g,' ').trim();
  const pad=value=>String(value).padStart(2,'0');
  const todayIso=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
  const selectedText=id=>{const node=byId(id);return text(node?.selectedOptions?.[0]?.textContent||node?.value||'الكل');};
  const inputValue=id=>String(byId(id)?.value||'').trim();
  const displayDate=value=>window.CustomDatePicker?.formatDisplayDate?.(value,value)||value||'—';
  const safeFilename=value=>text(value).normalize('NFKD').replace(/[^A-Za-z0-9_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').slice(0,160)||'report';
  const formatMeta=items=>items.filter(Boolean).map(item=>text(item)).filter(Boolean);
  const rowHasData=row=>Boolean(row && !row.querySelector('.empty-row') && text(row.textContent));
  const tableHasData=table=>Array.from(table?.tBodies?.[0]?.rows||[]).some(rowHasData);
  const tableColumnCount=table=>Math.max(0,...Array.from(table?.rows||[]).map(row=>Array.from(row.cells).reduce((n,cell)=>n+(Number(cell.colSpan)||1),0)));

  function setToolbarStatus(sectionId,message,type=''){
    const status=document.querySelector(`#${sectionId} [data-report-tools-status]`);
    if(!status) return;
    status.textContent=message||'';
    status.dataset.type=type||'';
  }
  function toolbarBusy(sectionId,busy){
    const toolbar=document.querySelector(`#${sectionId} .report-workspace-toolbar`);
    if(!toolbar) return;
    toolbar.dataset.busy=busy?'1':'0';
    toolbar.querySelectorAll('[data-report-export]').forEach(button=>{
      if(busy){
        if(button.dataset.reportOriginalHtml===undefined) button.dataset.reportOriginalHtml=button.innerHTML;
        button.disabled=true;
      }else{
        if(button.dataset.reportOriginalHtml!==undefined){button.innerHTML=button.dataset.reportOriginalHtml;delete button.dataset.reportOriginalHtml;}
        button.disabled=false;
      }
    });
  }
  function notifyExportUser(sectionId,message,type='error',silent=false){
    setToolbarStatus(sectionId,message,type);
    if(!silent && typeof window.showToast==='function') window.showToast(message,type==='warning'?'warning':'error');
  }
  function toolButton(action,label,icon,extra=''){
    return `<button type="button" class="secondary report-workspace-tool ${extra}" ${action} title="${label}" aria-label="${label}">${icon}<span>${label}</span></button>`;
  }
  function injectToolbar(config){
    const section=byId(config.sectionId);
    const anchor=section?.querySelector(config.anchor);
    if(!anchor || anchor.querySelector('.report-workspace-toolbar')) return;
    const toolbar=document.createElement('div');
    toolbar.className='report-workspace-toolbar focus-mode-actions';
    toolbar.dataset.reportToolsFor=config.sectionId;
    toolbar.innerHTML=
      toolButton(`data-focus-target="${config.sectionId}" aria-pressed="false"`,'وضع التركيز',ICONS.focus,'focus-mode-btn')+
      toolButton('data-focus-close hidden','الخروج من وضع التركيز',ICONS.close,'focus-mode-close-btn')+
      toolButton('data-report-export="png"','تصدير PNG',ICONS.png)+
      toolButton('data-report-export="pdf"','تصدير PDF',ICONS.pdf)+
      toolButton('data-report-export="excel"','تصدير Excel',ICONS.excel)+
      '<span class="report-workspace-tools-status" data-report-tools-status role="status" aria-live="polite"></span>';
    anchor.appendChild(toolbar);
  }

  function productionDescriptor(config){
    const state=window.InventoryProductionTracking?.getState?.()||{};
    const panel=document.querySelector(`#${config.sectionId} [data-inventory-expiry-panel="${state.plantCode||'WF01'}"]`);
    const tab=document.querySelector(`#${config.sectionId} [data-inventory-expiry-tab="${state.plantCode||'WF01'}"]`);
    return {
      ...config,title:'تتبع تواريخ الإنتاج',subtitle:text(tab?.textContent)||state.plantCode||'WF01',
      metadata:formatMeta([
        `المصنع: ${state.plantCode||'—'}`,`تاريخ التقرير: ${displayDate(state.reportDate)}`,
        `البحث: ${state.search||'الكل'}`,`الحالة: ${selectedTextFrom(panel?.querySelector('[data-production-filter]'))}`,
        `الترتيب: ${state.sortKey||'الافتراضي'} ${state.sortDirection||''}`
      ]),
      root:panel,tables:Array.from(panel?.querySelectorAll('.inventory-production-table')||[]),
      intro:Array.from(panel?.querySelectorAll('.inventory-production-summary')||[]),
      fileBase:safeFilename(`production-tracking-${state.plantCode||'WF01'}-${state.reportDate||todayIso()}`),
      landscape:true,freezeColumns:2,loading:Boolean(state.loading),hasUnsaved:false
    };
  }
  function selectedTextFrom(node){return text(node?.selectedOptions?.[0]?.textContent||node?.value||'الكل')||'الكل';}
  function storekeepersDescriptor(config){
    const state=window.DepartmentWeeklyOperations?.getStorekeepersState?.()||{};
    const table=byId('departmentStorekeepersTable');
    return {
      ...config,title:'جدول أمناء المخازن',subtitle:'بيانات الأفراد والورديات الحالية',
      metadata:formatMeta([
        `الموقع: ${selectedText('departmentStorekeepersPlantFilter')}`,
        `القسم: ${selectedText('departmentStorekeepersDepartmentFilter')}`,
        `الوظيفة: ${selectedText('departmentStorekeepersJobFilter')}`,
        `البحث: ${inputValue('departmentStorekeepersSearch')||'الكل'}`,
        `الترتيب: ${state.sortKey||'الافتراضي'} ${state.sortDirection||''}`
      ]),
      root:table?.closest('.department-operational-table-wrap'),tables:table?[table]:[],intro:[],
      fileBase:safeFilename(`department-storekeepers-${todayIso()}`),landscape:true,freezeColumns:2,
      loading:Boolean(state.loading),hasUnsaved:false
    };
  }
  function weeklyDescriptor(config,kind){
    const state=window.DepartmentWeeklyOperations?.getExportState?.(kind)||{};
    const root=byId(state.rootId||'');
    const table=root?.querySelector('.department-weekly-table');
    const title=kind==='statuses'?'جدول الإجازات الأسبوعي':'التقييمات';
    const slug=kind==='statuses'?'weekly-leave':'evaluations';
    return {
      ...config,title,subtitle:state.activeTabLabel||'—',
      metadata:formatMeta([
        `الموقع: ${state.plantCode||'—'}`,`القسم: ${state.department||'—'}`,
        `الأسبوع: ${displayDate(state.weekStart)} - ${displayDate(state.weekEnd)}`,
        `الفترة المحددة: ${displayDate(state.from)} - ${displayDate(state.to)}`,
        `الترتيب: ${state.sortKey||'الافتراضي'} ${state.sortDirection||''}`
      ]),
      root,tables:table?[table]:[],intro:[],
      fileBase:safeFilename(`${slug}-${state.activeTab||state.plantCode||'report'}-${state.weekStart||todayIso()}`),
      landscape:true,freezeColumns:kind==='statuses'?4:3,loading:Boolean(state.loading||state.saving),
      hasUnsaved:Boolean(state.hasUnsaved),draftKind:kind
    };
  }
  function hrDescriptor(config){
    const state=window.DepartmentHrReports?.getState?.()||{};
    const active=state.activeTab||'cumulative_department_evaluation';
    const panel=document.querySelector(`#department_hr_reports [data-department-hr-panel="${active}"]`);
    const tab=document.querySelector(`#department_hr_reports [data-department-hr-tab="${active}"]`);
    const tables=Array.from(panel?.querySelectorAll('.department-hr-table')||[]);
    const maxColumns=Math.max(0,...tables.map(tableColumnCount));
    return {
      ...config,title:'تقارير HR',subtitle:text(tab?.textContent)||'التقرير النشط',
      metadata:formatMeta([
        `الفترة: ${displayDate(inputValue('departmentHrFromDate'))} - ${displayDate(inputValue('departmentHrToDate'))}`,
        `الموقع: ${selectedText('departmentHrPlantFilter')}`,`القسم: ${selectedText('departmentHrDepartmentFilter')}`,
        `الوظيفة: ${selectedText('departmentHrJobFilter')}`,`الموظف: ${selectedText('departmentHrPersonnelFilter')}`,
        `البحث: ${inputValue('departmentHrSearchInput')||state.search||'الكل'}`,
        active==='performance_trend'?`طريقة التجميع: ${{day:'يومي',week:'أسبوعي',month:'شهري'}[state.trendGrouping]||state.trendGrouping||'شهري'}`:'',
        active==='absence_violations'?`طريقة العرض: ${state.absenceMode==='employees'?'مجمّع حسب الموظف':'السجلات'}`:''
      ]),
      root:panel,tables,intro:Array.from(panel?.querySelectorAll('.department-hr-summary,.department-hr-person-card,.department-hr-note')||[]),
      fileBase:safeFilename(`hr-${HR_SLUGS[active]||'report'}-${inputValue('departmentHrFromDate')||todayIso()}-to-${inputValue('departmentHrToDate')||todayIso()}`),
      landscape:maxColumns>7,freezeColumns:1,loading:Boolean(state.loading),hasUnsaved:false
    };
  }
  function describe(sectionId){
    const config=CONFIGS[sectionId];
    if(!config) return null;
    if(config.kind==='production') return productionDescriptor(config);
    if(config.kind==='storekeepers') return storekeepersDescriptor(config);
    if(config.kind==='statuses'||config.kind==='evaluations') return weeklyDescriptor(config,config.kind);
    return hrDescriptor(config);
  }

  function replaceButton(button){
    const isSort=button.matches('.inventory-production-sort,.department-sort-button,.department-hr-sort');
    const isValue=button.matches('.department-status-cell-display,.department-locked-evaluation');
    if(!isSort && !isValue){button.remove();return;}
    const replacement=document.createElement(isSort?'span':'div');
    replacement.className=button.className;
    if(isSort){
      const label=button.cloneNode(true);
      label.querySelectorAll('.department-sort-indicator,.inventory-production-sort b').forEach(node=>node.remove());
      replacement.innerHTML=label.innerHTML||escapeHtml(text(label.textContent).replace(/[↕↑↓]/g,''));
    }else{
      replacement.innerHTML=button.innerHTML;
    }
    Array.from(button.attributes).forEach(attribute=>{
      if(attribute.name==='class'||attribute.name.startsWith('data-')||attribute.name.startsWith('aria-')||attribute.name==='tabindex') return;
      replacement.setAttribute(attribute.name,attribute.value);
    });
    button.replaceWith(replacement);
  }
  function sanitizeClone(source){
    const clone=source.cloneNode(true);
    clone.querySelectorAll('[hidden]').forEach(node=>node.remove());
    clone.querySelectorAll(EXCLUDED_SELECTORS).forEach(node=>node.remove());
    clone.querySelectorAll('button').forEach(replaceButton);
    clone.querySelectorAll('input,select,textarea').forEach(control=>{
      if(control.closest('table')){
        const value=text(control.value);
        const span=document.createElement('span');
        span.className='report-export-cell-value';
        span.textContent=value||'—';
        control.replaceWith(span);
      }else control.remove();
    });
    clone.querySelectorAll('.department-sort-indicator,.inventory-production-sort b').forEach(node=>node.remove());
    clone.querySelectorAll('[contenteditable]').forEach(node=>node.removeAttribute('contenteditable'));
    if(clone.matches?.('table')) clone.classList.add('report-export-table');
    clone.querySelectorAll('table').forEach(table=>table.classList.add('report-export-table'));
    clone.querySelectorAll('[id]').forEach(node=>node.removeAttribute('id'));
    clone.removeAttribute?.('id');
    return clone;
  }
  function statusExportText(cell){
    const visual=cell.querySelector('.department-status-visual');
    if(visual){
      const title=text(visual.getAttribute('title'));
      if(title) return title;
    }
    const input=cell.querySelector('input,textarea,select');
    if(input && text(input.value)) return text(input.value);
    const cloned=cell.cloneNode(true);
    cloned.querySelectorAll('.department-sort-indicator,.inventory-production-sort b').forEach(node=>node.remove());
    return text(cloned.textContent)||'—';
  }
  function sanitizedTable(table){
    const clone=sanitizeClone(table);
    clone.classList.add('report-export-table');
    return clone;
  }
  function buildHeader(descriptor,compact=false){
    const header=document.createElement('header');
    header.className='report-export-header'+(compact?' compact':'');
    header.innerHTML=`<div><h1>${escapeHtml(descriptor.title)}</h1><h2>${escapeHtml(descriptor.subtitle)}</h2></div><div class="report-export-meta">${descriptor.metadata.map(item=>`<span>${escapeHtml(item)}</span>`).join('')}</div>`;
    return header;
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function buildExportDocument(descriptor){
    const stage=document.createElement('section');
    stage.className='report-export-stage report-export-document';
    stage.dir='rtl';
    stage.dataset.reportExportSurface='1';
    stage.dataset.reportOwner=descriptor.sectionId;
    stage.appendChild(buildHeader(descriptor));
    const content=document.createElement('div');
    content.className='report-export-content';
    const rootClone=descriptor.root?sanitizeClone(descriptor.root):null;
    if(rootClone && (descriptor.tables.length||text(rootClone.textContent))) content.appendChild(rootClone);
    else content.innerHTML='<div class="report-export-empty">لا توجد بيانات</div>';
    stage.appendChild(content);
    return stage;
  }
  async function readyForCapture(element){
    document.body.appendChild(element);
    if(document.fonts?.ready) await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  }
  function captureScale(width,height,preferred=2){
    const maxEdge=30000,maxArea=90000000;
    const scale=Math.min(preferred,maxEdge/Math.max(width,1),maxEdge/Math.max(height,1),Math.sqrt(maxArea/Math.max(width*height,1)));
    return Math.max(.2,Math.floor(scale*100)/100);
  }
  const UNSUPPORTED_COLOR_FUNCTION=/(?:^|[\s,(])(color|color-mix|lab|lch|oklab|oklch)\s*\(/i;
  const EXPORT_COLOR_PROPERTIES=[
    'color','background-color','border-top-color','border-right-color','border-bottom-color','border-left-color',
    'outline-color','text-decoration-color','fill','stroke','stop-color','flood-color','lighting-color','column-rule-color'
  ];
  const EXPORT_DECORATIVE_COLOR_PROPERTIES=['box-shadow','text-shadow','filter'];
  const EXPORT_IMAGE_COLOR_PROPERTIES=['background-image','border-image-source','mask-image'];
  let EXPORT_COLOR_CANVAS=null;
  let EXPORT_COLOR_CONTEXT=null;
  let LAST_EXPORT_COLOR_AUDIT=Object.freeze({captures:0,unsupportedBefore:0,unsupportedAfter:0,converted:0,disabled:0,pseudoDisabled:0,failures:[],samples:[]});

  function hasUnsupportedColorValue(value){return UNSUPPORTED_COLOR_FUNCTION.test(String(value||''));}
  function createExportColorAudit(){
    return {captures:0,unsupportedBefore:0,unsupportedAfter:0,converted:0,disabled:0,pseudoDisabled:0,failures:[],samples:[]};
  }
  function rememberColorSample(audit,entry){
    if(audit.samples.length<24) audit.samples.push(entry);
  }
  function exportColorContext(){
    if(EXPORT_COLOR_CONTEXT) return EXPORT_COLOR_CONTEXT;
    EXPORT_COLOR_CANVAS=document.createElement('canvas');
    EXPORT_COLOR_CANVAS.width=1;EXPORT_COLOR_CANVAS.height=1;
    EXPORT_COLOR_CONTEXT=EXPORT_COLOR_CANVAS.getContext('2d',{willReadFrequently:true,colorSpace:'srgb'})
      ||EXPORT_COLOR_CANVAS.getContext('2d',{willReadFrequently:true});
    return EXPORT_COLOR_CONTEXT;
  }
  function resolveCssColorToRgba(value){
    const candidate=String(value||'').trim();
    if(!candidate) return null;
    const context=exportColorContext();
    if(!context) return null;
    try{
      context.fillStyle='rgb(1, 2, 3)';
      const firstSentinel=context.fillStyle;
      context.fillStyle=candidate;
      const firstResult=context.fillStyle;
      context.fillStyle='rgb(4, 5, 6)';
      const secondSentinel=context.fillStyle;
      context.fillStyle=candidate;
      const secondResult=context.fillStyle;
      if(firstResult===firstSentinel && secondResult===secondSentinel) return null;
      context.clearRect(0,0,1,1);
      context.fillStyle=candidate;
      context.fillRect(0,0,1,1);
      const rgba=context.getImageData(0,0,1,1).data;
      const alpha=Math.round((rgba[3]/255)*10000)/10000;
      return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${alpha})`;
    }catch(_){return null;}
  }
  function safeStatusColorFallback(computed,property){
    const variable=property==='color'?'--status-text':'--status-color';
    const value=String(computed.getPropertyValue(variable)||'').trim();
    if(!value||hasUnsupportedColorValue(value)) return null;
    return resolveCssColorToRgba(value);
  }
  function inspectPseudoColorValues(element,pseudo,audit,apply){
    let computed;
    try{computed=getComputedStyle(element,pseudo);}catch(_){return;}
    const content=String(computed.content||'').trim();
    if(!content||content==='none'||content==='normal') return;
    const properties=[...EXPORT_COLOR_PROPERTIES,...EXPORT_DECORATIVE_COLOR_PROPERTIES,...EXPORT_IMAGE_COLOR_PROPERTIES];
    const hits=properties.map(property=>({property,value:String(computed.getPropertyValue(property)||'').trim()})).filter(item=>hasUnsupportedColorValue(item.value));
    if(!hits.length) return;
    audit.unsupportedBefore+=hits.length;
    hits.forEach(item=>rememberColorSample(audit,{pseudo,property:item.property,value:item.value}));
    if(apply){
      element.dataset[pseudo==='::before'?'exportDisableBefore':'exportDisableAfter']='1';
      audit.disabled+=hits.length;
      audit.pseudoDisabled+=1;
    }
  }
  function ensurePseudoSanitizerStyle(root){
    if(root.querySelector?.('[data-export-color-sanitizer-style]')) return;
    root.classList.add('report-export-color-sanitized');
    const style=document.createElement('style');
    style.dataset.exportColorSanitizerStyle='1';
    style.textContent=[
      '.report-export-color-sanitized[data-export-disable-before]::before,.report-export-color-sanitized [data-export-disable-before]::before{content:none}',
      '.report-export-color-sanitized[data-export-disable-after]::after,.report-export-color-sanitized [data-export-disable-after]::after{content:none}'
    ].join('');
    root.appendChild(style);
  }
  function auditUnsupportedExportColors(root){
    let count=0;
    const samples=[];
    const elements=[root,...Array.from(root.querySelectorAll?.('*')||[])];
    const properties=[...EXPORT_COLOR_PROPERTIES,...EXPORT_DECORATIVE_COLOR_PROPERTIES,...EXPORT_IMAGE_COLOR_PROPERTIES];
    elements.forEach(element=>{
      let computed;
      try{computed=getComputedStyle(element);}catch(_){return;}
      properties.forEach(property=>{
        const value=String(computed.getPropertyValue(property)||'').trim();
        if(!hasUnsupportedColorValue(value)) return;
        count+=1;
        if(samples.length<12) samples.push({tag:element.tagName||'',className:String(element.className||''),property,value});
      });
      ['::before','::after'].forEach(pseudo=>{
        let pseudoStyle;
        try{pseudoStyle=getComputedStyle(element,pseudo);}catch(_){return;}
        const pseudoContent=String(pseudoStyle.content||'').trim();
        if(!pseudoContent||pseudoContent==='none'||pseudoContent==='normal') return;
        properties.forEach(property=>{
          const value=String(pseudoStyle.getPropertyValue(property)||'').trim();
          if(!hasUnsupportedColorValue(value)) return;
          count+=1;
          if(samples.length<12) samples.push({tag:element.tagName||'',className:String(element.className||''),pseudo,property,value});
        });
      });
    });
    return {count,samples};
  }
  function sanitizeExportCloneColors(root,audit=createExportColorAudit()){
    if(!root?.matches?.('.report-export-stage,.report-pdf-page') && !root?.closest?.('.report-pdf-stage')){
      throw new Error('Color sanitization is restricted to the export clone.');
    }
    audit.captures+=1;
    const elements=[root,...Array.from(root.querySelectorAll('*'))];
    let pseudoRulesNeeded=false;
    elements.forEach(element=>{
      let computed;
      try{computed=getComputedStyle(element);}catch(_){return;}
      EXPORT_COLOR_PROPERTIES.forEach(property=>{
        const value=String(computed.getPropertyValue(property)||'').trim();
        if(!hasUnsupportedColorValue(value)) return;
        audit.unsupportedBefore+=1;
        rememberColorSample(audit,{tag:element.tagName||'',className:String(element.className||''),property,value});
        const safe=resolveCssColorToRgba(value)||safeStatusColorFallback(computed,property);
        if(safe){element.style.setProperty(property,safe);audit.converted+=1;}
        else audit.failures.push({tag:element.tagName||'',className:String(element.className||''),property,value});
      });
      EXPORT_DECORATIVE_COLOR_PROPERTIES.forEach(property=>{
        const value=String(computed.getPropertyValue(property)||'').trim();
        if(!hasUnsupportedColorValue(value)) return;
        audit.unsupportedBefore+=1;audit.disabled+=1;
        rememberColorSample(audit,{tag:element.tagName||'',className:String(element.className||''),property,value});
        element.style.setProperty(property,'none');
      });
      EXPORT_IMAGE_COLOR_PROPERTIES.forEach(property=>{
        const value=String(computed.getPropertyValue(property)||'').trim();
        if(!hasUnsupportedColorValue(value)) return;
        audit.unsupportedBefore+=1;audit.disabled+=1;
        rememberColorSample(audit,{tag:element.tagName||'',className:String(element.className||''),property,value});
        element.style.setProperty(property,'none');
      });
      const beforeCount=audit.pseudoDisabled;
      inspectPseudoColorValues(element,'::before',audit,true);
      inspectPseudoColorValues(element,'::after',audit,true);
      if(audit.pseudoDisabled>beforeCount) pseudoRulesNeeded=true;
    });
    if(pseudoRulesNeeded) ensurePseudoSanitizerStyle(root);
    const after=auditUnsupportedExportColors(root);
    audit.unsupportedAfter+=after.count;
    if(after.count||audit.failures.length){
      const error=new Error('Export clone still contains unsupported color values.');
      error.name='ExportColorSanitizationError';
      error.colorAudit={...audit,afterSamples:after.samples};
      throw error;
    }
    return audit;
  }
  function finalizeExportColorAudit(audit){
    if(!audit) return null;
    LAST_EXPORT_COLOR_AUDIT=Object.freeze({...audit,failures:Object.freeze(audit.failures.slice()),samples:Object.freeze(audit.samples.slice())});
    console.info('Report export color audit',{
      captures:audit.captures,
      unsupported_color_values_before:audit.unsupportedBefore,
      unsupported_color_values:audit.unsupportedAfter,
      converted:audit.converted,
      disabled_decorative_values:audit.disabled,
      pseudo_elements_disabled:audit.pseudoDisabled
    });
    return LAST_EXPORT_COLOR_AUDIT;
  }
  async function captureElement(element,preferredScale=2,colorAudit=createExportColorAudit()){
    if(typeof window.html2canvas!=='function') throw new Error('مكتبة PNG غير متاحة.');
    sanitizeExportCloneColors(element,colorAudit);
    await new Promise(resolve=>requestAnimationFrame(resolve));
    const width=Math.ceil(Math.max(element.scrollWidth,element.getBoundingClientRect().width));
    const height=Math.ceil(Math.max(element.scrollHeight,element.getBoundingClientRect().height));
    if(!width||!height) throw new Error('أبعاد التقرير غير صالحة للتصدير.');
    return window.html2canvas(element,{scale:captureScale(width,height,preferredScale),backgroundColor:'#f8fbf8',useCORS:true,allowTaint:false,logging:false,scrollX:0,scrollY:0,width,height,windowWidth:width,windowHeight:height});
  }
  const canvasBlob=(canvas,type='image/png',quality=1)=>new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('تعذر إنشاء ملف الصورة.')),type,quality));

  async function exportPng(descriptor){
    const stage=buildExportDocument(descriptor);
    try{
      await readyForCapture(stage);
      const desired=Math.max(960,...Array.from(stage.querySelectorAll('table')).map(table=>table.scrollWidth+48));
      stage.style.width=Math.min(14000,desired)+'px';
      await new Promise(resolve=>requestAnimationFrame(resolve));
      const canvas=await captureElement(stage,2,descriptor.colorAudit);
      return canvasBlob(canvas);
    }finally{stage.remove();}
  }

  function createPdfPage(descriptor,index){
    const page=document.createElement('section');
    page.className='report-pdf-page '+(descriptor.landscape?'landscape':'portrait');
    page.dir='rtl';
    page.appendChild(buildHeader(descriptor,index>0));
    const content=document.createElement('div');content.className='report-pdf-page-content';page.appendChild(content);
    return {page,content};
  }
  function pageOverflow(page){return page.scrollHeight>page.clientHeight+1;}
  function appendIntro(pageInfo,descriptor){
    descriptor.intro.forEach(node=>pageInfo.content.appendChild(sanitizeClone(node)));
  }
  function newPdfTable(source){
    const table=document.createElement('table');
    table.className=source.className+' report-export-table';
    if(source.tHead) table.appendChild(sanitizeClone(source.tHead));
    table.appendChild(document.createElement('tbody'));
    return table;
  }
  async function buildPdfPages(descriptor){
    const host=document.createElement('div');host.className='report-pdf-stage';document.body.appendChild(host);
    try{
    const pages=[];
    const addPage=()=>{const info=createPdfPage(descriptor,pages.length);host.appendChild(info.page);pages.push(info);return info;};
    let current=addPage();appendIntro(current,descriptor);
    if(!descriptor.tables.length){
      const empty=document.createElement('div');empty.className='report-export-empty';empty.textContent='لا توجد بيانات';current.content.appendChild(empty);
    }
    for(const source of descriptor.tables){
      let table=newPdfTable(source);current.content.appendChild(table);
      const rows=Array.from(source.tBodies?.[0]?.rows||[]);
      if(!rows.length){
        const row=table.insertRow();const cell=row.insertCell();cell.colSpan=Math.max(1,tableColumnCount(source));cell.className='empty-row';cell.textContent='لا توجد بيانات';
      }
      for(const sourceRow of rows){
        const row=sanitizeClone(sourceRow);table.tBodies[0].appendChild(row);
        if(pageOverflow(current.page)){
          row.remove();
          const tableAlreadyHasRows=table.tBodies[0].rows.length>0;
          if(!tableAlreadyHasRows) table.remove();
          current=addPage();table=newPdfTable(source);current.content.appendChild(table);table.tBodies[0].appendChild(row);
          if(pageOverflow(current.page)) current.page.classList.add('has-tall-row');
        }
      }
    }
    if(document.fonts?.ready) await document.fonts.ready;
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    return {host,pages};
    }catch(error){host.remove();throw error;}
  }
  async function exportPdf(descriptor){
    const JsPDF=window.jspdf?.jsPDF;
    if(!JsPDF) throw new Error('مكتبة PDF غير متاحة.');
    const built=await buildPdfPages(descriptor);
    try{
      const pdf=new JsPDF({orientation:descriptor.landscape?'landscape':'portrait',unit:'pt',format:'a4',compress:true});
      const pageWidth=pdf.internal.pageSize.getWidth(),pageHeight=pdf.internal.pageSize.getHeight();
      for(let index=0;index<built.pages.length;index++){
        if(index) pdf.addPage('a4',descriptor.landscape?'landscape':'portrait');
        const canvas=await captureElement(built.pages[index].page,1.55,descriptor.colorAudit);
        pdf.addImage(canvas.toDataURL('image/jpeg',.94),'JPEG',0,0,pageWidth,pageHeight,undefined,'FAST');
        pdf.setFontSize(8);pdf.setTextColor(70,82,76);pdf.text(`${index+1} / ${built.pages.length}`,pageWidth/2,pageHeight-8,{align:'center'});
      }
      return pdf.output('blob');
    }finally{built.host.remove();}
  }

  function normalizeDigits(value){
    return String(value??'').replace(/[٠-٩]/g,d=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]).replace(/[۰-۹]/g,d=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(d)]);
  }
  function excelValue(value,header){
    const raw=text(value);
    if(!raw||raw==='—') return '';
    const normalized=normalizeDigits(raw).replace(/٬/g,',').replace(/٫/g,'.');
    const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    const display=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
    if(/تاريخ|اليوم/.test(header||'') && (iso||display)){
      const parts=iso?[+iso[1],+iso[2],+iso[3]]:[+display[3],+display[2],+display[1]];
      return new Date(Date.UTC(parts[0],parts[1]-1,parts[2]));
    }
    if(/كود|الموقع|المصنع|الهاتف|التليفون/.test(header||'')) return raw;
    const numeric=normalized.replace(/,/g,'').replace(/%$/,'').replace(/^\+/,'');
    if(/^[-+]?\d+(?:\.\d+)?$/.test(numeric)) return Number(numeric);
    return raw;
  }
  function rgbToArgb(value){
    const match=String(value||'').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!match) return '';
    return 'FF'+[match[1],match[2],match[3]].map(n=>Number(n).toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function cellFill(cell){
    const target=cell.querySelector('.department-status-visual,.inventory-production-stagnation.is-warning,.inventory-production-status-pill')||cell;
    const inline=target.style?.getPropertyValue('--status-color');
    if(/^#[0-9a-f]{6}$/i.test(inline||'')) return 'FF'+inline.slice(1).toUpperCase();
    return rgbToArgb(getComputedStyle(target).backgroundColor);
  }
  function tableMatrix(table){
    const headers=[];
    const headRow=table.tHead?.rows?.[table.tHead.rows.length-1];
    if(headRow) Array.from(headRow.cells).forEach(cell=>headers.push(statusExportText(cell).replace(/[↕↑↓]/g,'').trim()));
    const rows=Array.from(table.tBodies?.[0]?.rows||[]).filter(row=>!row.querySelector('.empty-row')).map(row=>{
      const values=[];Array.from(row.cells).forEach((cell,index)=>values.push(excelValue(statusExportText(cell),headers[index]||'')));return {values,cells:Array.from(row.cells)};
    });
    return {headers,rows};
  }
  function applyCellStyle(sheet,address,sourceCell,isHeader=false){
    const cell=sheet[address];if(!cell)return;
    const fill=sourceCell?cellFill(sourceCell):'';
    cell.s={
      font:{name:'Cairo',sz:isHeader?11:10,bold:isHeader,color:{rgb:isHeader?'FFFFFFFF':'FF122019'}},
      alignment:{horizontal:'right',vertical:'center',wrapText:true,readingOrder:2},
      border:{top:{style:'thin',color:{rgb:'FF9CB9AA'}},bottom:{style:'thin',color:{rgb:'FF9CB9AA'}},left:{style:'thin',color:{rgb:'FF9CB9AA'}},right:{style:'thin',color:{rgb:'FF9CB9AA'}}},
      fill:{patternType:'solid',fgColor:{rgb:fill||(isHeader?'FF06452F':'FFF7FBF8')}}
    };
    if(cell.v instanceof Date) cell.z='dd/mm/yyyy';
    else if(typeof cell.v==='number') cell.z='0.000';
  }
  function buildWorkbook(descriptor){
    if(!window.XLSX) throw new Error('مكتبة Excel غير متاحة.');
    const aoa=[[descriptor.title],[descriptor.subtitle],...descriptor.metadata.map(item=>[item]),[]];
    const tableRecords=[];
    let maxColumns=1,firstFilter=null;
    descriptor.tables.forEach((table,tableIndex)=>{
      const matrix=tableMatrix(table);maxColumns=Math.max(maxColumns,matrix.headers.length||1);
      if(tableIndex) aoa.push([]);
      const headerRow=aoa.length;aoa.push(matrix.headers.length?matrix.headers:['لا توجد بيانات']);
      const dataStart=aoa.length;
      if(matrix.rows.length) matrix.rows.forEach(row=>aoa.push(row.values));else aoa.push(['لا توجد بيانات']);
      const dataEnd=aoa.length-1;
      tableRecords.push({table,matrix,headerRow,dataStart,dataEnd});
      if(!firstFilter&&matrix.headers.length)firstFilter={s:{r:headerRow,c:0},e:{r:dataEnd,c:matrix.headers.length-1}};
    });
    if(!descriptor.tables.length) aoa.push(['لا توجد بيانات']);
    const sheet=window.XLSX.utils.aoa_to_sheet(aoa,{cellDates:true,dateNF:'dd/mm/yyyy'});
    sheet['!rtl']=true;
    sheet['!cols']=Array.from({length:maxColumns},(_,column)=>({wch:column<descriptor.freezeColumns?22:Math.min(38,Math.max(13,...aoa.map(row=>text(row[column]).length+2)))}));
    sheet['!rows']=aoa.map((_,index)=>({hpt:index<2?24:20}));
    sheet['!merges']=[{s:{r:0,c:0},e:{r:0,c:maxColumns-1}},{s:{r:1,c:0},e:{r:1,c:maxColumns-1}}];
    sheet['!freeze']={xSplit:descriptor.freezeColumns||0,ySplit:tableRecords[0]?.headerRow+1||1,topLeftCell:window.XLSX.utils.encode_cell({r:tableRecords[0]?.headerRow+1||1,c:descriptor.freezeColumns||0}),activePane:'bottomRight',state:'frozen'};
    if(firstFilter)sheet['!autofilter']={ref:window.XLSX.utils.encode_range(firstFilter)};
    Object.keys(sheet).filter(key=>key[0]!=='!').forEach(address=>applyCellStyle(sheet,address,null,false));
    tableRecords.forEach(record=>{
      const headerCells=Array.from(record.table.tHead?.rows?.[record.table.tHead.rows.length-1]?.cells||[]);
      record.matrix.headers.forEach((_,column)=>applyCellStyle(sheet,window.XLSX.utils.encode_cell({r:record.headerRow,c:column}),headerCells[column],true));
      record.matrix.rows.forEach((row,rowIndex)=>row.values.forEach((_,column)=>applyCellStyle(sheet,window.XLSX.utils.encode_cell({r:record.dataStart+rowIndex,c:column}),row.cells[column],false)));
    });
    const sheetName=safeFilename(descriptor.fileBase||`${descriptor.title}-${descriptor.subtitle}`).slice(0,31)||'Report';
    const workbook=window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook,sheet,sheetName);
    workbook.Workbook={Views:[{RTL:true}]};
    const array=window.XLSX.write(workbook,{bookType:'xlsx',type:'array',cellStyles:true,compression:true});
    window.XLSX.read(array,{type:'array',cellDates:true});
    return {workbook,array,sheetName};
  }
  async function exportExcel(descriptor){
    const built=buildWorkbook(descriptor);
    return new Blob([built.array],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  async function saveBlob(blob,fileName,mime){
    if(typeof window.saveBlobWithPicker==='function') return window.saveBlobWithPicker(blob,fileName,mime);
    const url=URL.createObjectURL(blob);
    try{const anchor=document.createElement('a');anchor.href=url;anchor.download=fileName;document.body.appendChild(anchor);anchor.click();anchor.remove();}
    finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
  }
  async function exportSection(sectionId,format,options={}){
    const descriptor=describe(sectionId);
    if(!descriptor) throw new Error('الشاشة غير مدعومة للتصدير.');
    if(descriptor.loading){notifyExportUser(sectionId,'انتظر اكتمال تحميل البيانات.','warning',options.silent===true);return {blocked:'loading'};}
    if(descriptor.hasUnsaved){
      const message='لا يمكن التصدير مع وجود تعديلات غير محفوظة. احفظ التعديلات أو تراجع عنها أولًا.';
      notifyExportUser(sectionId,message,'warning',options.silent===true);
      return {blocked:'draft'};
    }
    if(format==='png'||format==='pdf') descriptor.colorAudit=createExportColorAudit();
    toolbarBusy(sectionId,true);setToolbarStatus(sectionId,`جاري إعداد ${String(format).toUpperCase()}...`,'busy');
    try{
      let blob,mime,extension;
      if(format==='png'){blob=await exportPng(descriptor);mime='image/png';extension='png';}
      else if(format==='pdf'){blob=await exportPdf(descriptor);mime='application/pdf';extension='pdf';}
      else if(format==='excel'){blob=await exportExcel(descriptor);mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';extension='xlsx';}
      else throw new Error('صيغة التصدير غير مدعومة.');
      const fileName=`${descriptor.fileBase}.${extension}`;
      if(options.download!==false) await saveBlob(blob,fileName,mime);
      setToolbarStatus(sectionId,`تم إعداد ${fileName}`,'success');
      return {blob,fileName,descriptor};
    }catch(error){
      const friendlyMessage='تعذر إنشاء ملف التصدير. تمت استعادة الشاشة ويمكنك المحاولة مرة أخرى.';
      console.error('Report workspace export failed',{
        sectionId,format,errorName:error?.name||'Error',technicalMessage:error?.message||String(error),
        colorAudit:error?.colorAudit||descriptor.colorAudit||null
      },error);
      notifyExportUser(sectionId,friendlyMessage,'error',options.silent===true);
      throw error;
    }finally{
      if(descriptor.colorAudit) finalizeExportColorAudit(descriptor.colorAudit);
      toolbarBusy(sectionId,false);
    }
  }
  function bind(){
    if(document.documentElement.dataset.reportWorkspaceToolsBound==='1') return;
    document.documentElement.dataset.reportWorkspaceToolsBound='1';
    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-report-export]');
      if(!button)return;
      const section=button.closest('.section');
      if(!section||!CONFIGS[section.id])return;
      event.preventDefault();exportSection(section.id,button.dataset.reportExport).catch(()=>{});
    });
  }
  function init(){Object.values(CONFIGS).forEach(injectToolbar);bind();}

  window.ReportWorkspaceTools=Object.freeze({init,describe,exportSection,buildWorkbook,buildExportDocument,safeFilename,tableMatrix,captureScale,hasUnsupportedColorValue,resolveCssColorToRgba,sanitizeExportCloneColors,auditUnsupportedExportColors,getLastColorAudit:()=>({...LAST_EXPORT_COLOR_AUDIT,failures:[...LAST_EXPORT_COLOR_AUDIT.failures],samples:[...LAST_EXPORT_COLOR_AUDIT.samples]})});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();