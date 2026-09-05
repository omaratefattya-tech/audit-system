(function(){
  'use strict';

  const DAILY_STATUSES_TABLE='department_personnel_daily_statuses';
  const DAILY_EVALUATIONS_TABLE='department_personnel_daily_evaluations';
  const WEEK_DAYS=[
    {label:'الجمعة',offset:0},{label:'السبت',offset:1},{label:'الأحد',offset:2},
    {label:'الاثنين',offset:3},{label:'الثلاثاء',offset:4},{label:'الأربعاء',offset:5},{label:'الخميس',offset:6}
  ];
  const WEEKLY_TABS=[
    {key:'wf01-finished',label:'منتج تام الواحة - WF01',plantCode:'WF01',department:'منتج تام'},
    {key:'wf01-spare-parts',label:'قطع غيار الواحة - WF01',plantCode:'WF01',department:'قطع غيار'},
    {key:'el01-finished',label:'منتج تام الرئيسي - EL01',plantCode:'EL01',department:'منتج تام'},
    {key:'el01-spare-parts',label:'قطع غيار الرئيسي - EL01',plantCode:'EL01',department:'قطع غيار'},
    {key:'el02-finished',label:'منتج تام العامرية - EL02',plantCode:'EL02',department:'منتج تام'},
    {key:'el02-spare-parts',label:'قطع غيار العامرية - EL02',plantCode:'EL02',department:'قطع غيار'}
  ];
  const EVALUATION_EXCLUDED_JOBS=new Set(['مدير إدارة المخازن','مدير مخازن قطع الغيار','رئيس قسم']);
  const REQUIRED_SUMMARY_CODES={rest:'0',month:'4',eid:'5',deduction:'8',absence:'9'};
  const PLANT_LABELS={
    WF01:'مصنع الواحة',
    EL01:'مصنع الإيمان للأعلاف - السواقي',
    EL02:'مصنع الإيمان للأعلاف - العامرية'
  };
  const WEEKLY_STATES={
    statuses:createWeeklyState('statuses','departmentWeeklyScheduleApp','department_weekly_leave_schedule'),
    evaluations:createWeeklyState('evaluations','departmentEvaluationsApp','department_evaluations')
  };
  const STOREKEEPERS_STATE={rows:[],requestToken:0,loading:false,sortKey:'full_name',sortDirection:'asc'};
  let APPROVED_APPLICATION_RELOAD=false;

  function pad(value){return String(value).padStart(2,'0');}
  function localTodayIso(){
    const date=new Date();
    return date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
  }
  function parseIso(value){
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!match) return null;
    const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
    if(date.getUTCFullYear()!==Number(match[1]) || date.getUTCMonth()!==Number(match[2])-1 || date.getUTCDate()!==Number(match[3])) return null;
    return date;
  }
  function isoFromDate(date){return date.getUTCFullYear()+'-'+pad(date.getUTCMonth()+1)+'-'+pad(date.getUTCDate());}
  function addDays(iso,days){
    const date=parseIso(iso);
    if(!date) return '';
    date.setUTCDate(date.getUTCDate()+days);
    return isoFromDate(date);
  }
  function fridayStart(iso){
    const date=parseIso(iso);
    if(!date) return '';
    const delta=(date.getUTCDay()-5+7)%7;
    date.setUTCDate(date.getUTCDate()-delta);
    return isoFromDate(date);
  }
  function displayDate(iso){return window.CustomDatePicker?.formatDisplayDate?.(iso,'—') || iso || '—';}
  function yearRange(year){return {from:year+'-01-01',to:year+'-12-31'};}
  function isBetween(iso,from,to){return Boolean(iso && from && to && iso>=from && iso<=to);}
  function weekIntersectsRange(weekStart,state){return addDays(weekStart,6)>=state.from && weekStart<=state.to;}
  function currentTab(state){return WEEKLY_TABS.find(tab=>tab.key===state.activeTab) || WEEKLY_TABS[0];}
  function cellKey(personnelId,date){return String(personnelId)+'|'+date;}
  function activeSectionId(){return document.querySelector('.section.active-section')?.id || '';}
  function compareArabic(left,right){return String(left??'').localeCompare(String(right??''),'ar',{numeric:true,sensitivity:'base'});}
  function compareNullable(left,right,type='text'){
    const leftEmpty=left===null || left===undefined || left==='';
    const rightEmpty=right===null || right===undefined || right==='';
    if(leftEmpty || rightEmpty) return leftEmpty===rightEmpty?0:(leftEmpty?1:-1);
    if(type==='number') return Number(left)-Number(right);
    if(type==='date') return String(left).localeCompare(String(right));
    return compareArabic(left,right);
  }
  function compareSortValues(left,right,direction){
    const leftEmpty=left.value===null || left.value===undefined || left.value==='';
    const rightEmpty=right.value===null || right.value===undefined || right.value==='';
    if(leftEmpty || rightEmpty) return leftEmpty===rightEmpty?0:(leftEmpty?1:-1);
    if((left.group??0)!==(right.group??0)) return (left.group??0)-(right.group??0);
    const result=compareNullable(left.value,right.value,left.type);
    return direction==='desc'?-result:result;
  }
  function nextSortDirection(currentKey,currentDirection,nextKey){
    if(currentKey!==nextKey) return 'asc';
    if(currentDirection==='asc') return 'desc';
    if(currentDirection==='desc') return '';
    return 'asc';
  }
  function sortIndicator(active,direction){
    return '<span class="department-sort-indicator" aria-hidden="true">'+(!active?'↕':(direction==='asc'?'↑':(direction==='desc'?'↓':'↕')))+'</span>';
  }
  function contrastTextColor(hex){
    const clean=String(hex||'').replace('#','');
    if(!/^[0-9a-f]{6}$/i.test(clean)) return '#FFFFFF';
    const r=parseInt(clean.slice(0,2),16),g=parseInt(clean.slice(2,4),16),b=parseInt(clean.slice(4,6),16);
    return ((r*299+g*587+b*114)/1000)>=150?'#111827':'#FFFFFF';
  }
  function statusVisual(description,code,color,extraClass=''){
    const safeColor=/^#[0-9A-F]{6}$/i.test(String(color||''))?String(color):'#64748B';
    const label=String(description||code||'—');
    const title=[code,label].filter(Boolean).join(' — ');
    return '<span class="department-status-visual '+extraClass+'" style="--status-color:'+safeColor+';--status-text:'+contrastTextColor(safeColor)+'" title="'+escapeHtml(title)+'"><span>'+escapeHtml(label)+'</span></span>';
  }
  function currentStatusDisplayColor(state,code,snapshotColor=''){
    const normalized=String(code||'').trim().toLocaleLowerCase();
    const current=state.statusCodes.find(row=>String(row.shift_code||'').trim().toLocaleLowerCase()===normalized);
    const currentColor=String(current?.display_color||'').toUpperCase();
    if(/^#[0-9A-F]{6}$/.test(currentColor)) return currentColor;
    const fallback=String(snapshotColor||'').toUpperCase();
    return /^#[0-9A-F]{6}$/.test(fallback)?fallback:'#64748B';
  }

  function createWeeklyState(kind,rootId,sectionId){
    const currentYear=new Date().getFullYear();
    const range=yearRange(currentYear);
    const today=localTodayIso();
    return {
      kind,rootId,sectionId,from:range.from,to:range.to,
      weekStart:isBetween(today,range.from,range.to)?fridayStart(today):fridayStart(range.from),
      activeTab:WEEKLY_TABS[0].key,requestToken:0,initialized:false,loading:false,saving:false,
      personnel:[],records:[],statusCodes:[],blockingStatuses:new Map(),evaluatorNames:new Map(),
      baseline:new Map(),dirty:new Map(),invalid:new Set(),sortKey:'full_name',sortDirection:'asc',modalDraft:null
    };
  }
  function weeklyPermissionBase(state){ return state.kind==='evaluations'?'department_personnel.evaluations':'department_personnel.weekly_leave'; }
  function canViewWeeklyTab(state,tab){ return window.PermissionRuntime?.can(weeklyPermissionBase(state)+'.'+tab.key.replace(/-/g,'_')+'.view',tab.plantCode) === true; }
  function canManageWeeklyData(state){
    return canViewWeeklyTab(state,currentTab(state)) && window.PermissionRuntime?.can(weeklyPermissionBase(state)+(state.kind==='evaluations'?'.create':'.save'),currentTab(state).plantCode) === true;
  }
  function hasDirtyWeeklyState(state){return Boolean(state && (state.dirty.size || state.modalDraft?.mode==='new'));}
  function confirmDiscardWeeklyChanges(state){
    if(!hasDirtyWeeklyState(state)){
      if(state?.modalDraft?.mode==='view') closeEvaluationModal(state,false);
      return true;
    }
    const confirmed=window.confirm('توجد تعديلات غير محفوظة. هل تريد تجاهلها والمتابعة؟');
    if(confirmed){
      state.dirty.clear();state.invalid.clear();
      if(state.modalDraft) closeEvaluationModal(state,false);
    }
    return confirmed;
  }
  function canLeaveDepartmentWeeklyWorkspace(nextSection){
    const active=activeSectionId();
    const state=Object.values(WEEKLY_STATES).find(item=>item.sectionId===active);
    if(!state || nextSection===active) return true;
    return confirmDiscardWeeklyChanges(state);
  }
  window.canLeaveDepartmentWeeklyWorkspace=canLeaveDepartmentWeeklyWorkspace;
  window.hasUnsavedDepartmentPersonnelWork=()=>Object.values(WEEKLY_STATES).some(hasDirtyWeeklyState);
  window.approveDepartmentPersonnelReloadOnce=()=>{APPROVED_APPLICATION_RELOAD=true;};
  function weeklyPublicState(kind){
    const state=WEEKLY_STATES[kind];
    if(!state) return null;
    const tab=currentTab(state);
    return Object.freeze({
      kind:state.kind,
      rootId:state.rootId,
      sectionId:state.sectionId,
      from:state.from,
      to:state.to,
      weekStart:state.weekStart,
      weekEnd:addDays(state.weekStart,6),
      activeTab:state.activeTab,
      activeTabLabel:tab.label,
      plantCode:tab.plantCode,
      department:tab.department,
      sortKey:state.sortKey,
      sortDirection:state.sortDirection,
      loading:state.loading,
      saving:state.saving,
      rowCount:state.personnel.length,
      dirtyCount:state.dirty.size,
      invalidCount:state.invalid.size,
      hasUnsaved:hasDirtyWeeklyState(state)
    });
  }
  function weeklyJobOrder(){
    return Array.from(document.querySelectorAll('#departmentStorekeepersJobFilter option'))
      .map(option=>String(option.value||'').trim()).filter(Boolean);
  }
  function weeklySavedExportDataset(kind){
    const state=WEEKLY_STATES[kind];
    if(!state) return null;
    const tab=currentTab(state);
    const dates=WEEK_DAYS.map(day=>Object.freeze({label:day.label,date:addDays(state.weekStart,day.offset)}));
    const rows=sortedWeeklyPersonnel(state).map(person=>{
      const days=dates.map(day=>{
        const key=cellKey(person.id,day.date);
        const baseline=state.baseline.get(key);
        const blocked=state.kind==='evaluations'?state.blockingStatuses.get(key):null;
        return Object.freeze({
          label:day.label,date:day.date,
          value:baseline?.value??'',
          description:baseline?.description||blocked?.description||'',
          color:baseline?.color||blocked?.color||'',
          code:state.kind==='statuses'?(baseline?.value??''):(blocked?.code||''),
          blocked:Boolean(blocked&&!baseline),
          saved:Boolean(baseline)
        });
      });
      return Object.freeze({
        id:String(person.id||''),employee_code:String(person.employee_code||''),full_name:String(person.full_name||''),
        job_title:String(person.job_title||''),plant_code:String(person.plant_code||''),department:String(person.department||''),
        days:Object.freeze(days)
      });
    });
    return Object.freeze({
      kind:state.kind,from:state.from,to:state.to,weekStart:state.weekStart,weekEnd:addDays(state.weekStart,6),
      activeTab:state.activeTab,activeTabLabel:tab.label,plantCode:tab.plantCode,department:tab.department,
      sortKey:state.sortKey,sortDirection:state.sortDirection,hasUnsaved:hasDirtyWeeklyState(state),
      jobOrder:Object.freeze(weeklyJobOrder()),dates:Object.freeze(dates),rows:Object.freeze(rows)
    });
  }
  window.DepartmentWeeklyOperations=Object.freeze({
    getExportState:weeklyPublicState,
    getSavedExportDataset:weeklySavedExportDataset,
    hasUnsaved:kind=>hasDirtyWeeklyState(WEEKLY_STATES[kind]),
    getStorekeepersState:()=>Object.freeze({
      loading:STOREKEEPERS_STATE.loading,
      rowCount:STOREKEEPERS_STATE.rows.length,
      sortKey:STOREKEEPERS_STATE.sortKey,
      sortDirection:STOREKEEPERS_STATE.sortDirection
    })
  });

  function weeklyRoot(state){return document.getElementById(state.rootId);}
  function setWeeklyStatus(state,message,type=''){
    const status=weeklyRoot(state)?.querySelector('[data-weekly-status]');
    if(!status) return;
    status.className='upload-status '+(type||'');
    status.textContent=message||'';
  }
  function weeklyErrorMessage(error,kind){
    const message=String(error?.message||error||'').trim();
    if(error?.code==='40001' || /مستخدم آخر|أعد تحميل/i.test(message)) return 'تغيرت إحدى الخلايا بواسطة مستخدم آخر. احتفظنا بتعديلاتك؛ أعد تحميل الأسبوع ثم راجعها.';
    if(error?.code==='42501' || /row-level security|permission denied|غير مسموح/i.test(message)) return 'غير مسموح بالقراءة أو الحفظ حسب صلاحية التقارير الحالية.';
    if(error?.code==='22023') return message;
    if(error?.code==='42P01' || error?.code==='PGRST202' || /does not exist|schema cache/i.test(message)) return 'مصدر البيانات اليومية غير متاح. تحقق من تطبيق Migration المرحلة الحالية.';
    return message ? 'تعذر '+(kind==='save'?'الحفظ: ':'تحميل البيانات: ')+message : 'تعذر الاتصال بـSupabase.';
  }

  function renderWeeklyShell(state){
    const root=weeklyRoot(state);
    if(!root || state.initialized) return;
    const saveAction=state.kind==='statuses'?'<button class="primary" type="button" data-weekly-action="save">حفظ الأسبوع</button>':'';
    const evaluationModal=state.kind==='evaluations'
      ?'<div class="department-evaluation-modal" data-evaluation-modal hidden><div class="department-evaluation-dialog" role="dialog" aria-modal="true" aria-labelledby="departmentEvaluationModalTitle">'
        +'<div class="department-evaluation-modal-head"><h3 id="departmentEvaluationModalTitle" data-evaluation-modal-title>حفظ التقييم</h3><button type="button" class="department-evaluation-close" data-evaluation-modal-action="close" aria-label="إغلاق">×</button></div>'
        +'<dl class="department-evaluation-details"><div><dt>الموظف</dt><dd data-evaluation-detail="name">—</dd></div><div><dt>الكود الوظيفي</dt><dd dir="ltr" data-evaluation-detail="code">—</dd></div><div><dt>الوظيفة</dt><dd data-evaluation-detail="job">—</dd></div><div><dt>اليوم والتاريخ</dt><dd data-evaluation-detail="date">—</dd></div><div><dt>التقييم</dt><dd data-evaluation-detail="score">—</dd></div><div data-evaluation-saved-meta hidden><dt>الحفظ</dt><dd data-evaluation-detail="saved">—</dd></div></dl>'
        +'<label class="department-evaluation-reason-label">سبب التقييم<textarea rows="4" maxlength="1000" data-evaluation-reason placeholder="اكتب سبب التقييم"></textarea></label>'
        +'<div class="upload-status" data-evaluation-modal-status aria-live="polite"></div><div class="department-evaluation-modal-actions"><button type="button" class="secondary" data-evaluation-modal-action="cancel">إلغاء</button><button type="button" class="primary" data-evaluation-modal-action="save">حفظ التقييم</button><button type="button" class="primary" data-evaluation-modal-action="close" hidden>إغلاق</button></div>'
        +'</div></div>'
      :'';
    root.innerHTML=''
      +'<div class="department-weekly-tabs" role="tablist" aria-label="تبويبات الموقع والقسم">'
      +WEEKLY_TABS.map((tab,index)=>'<button type="button" role="tab" class="department-weekly-tab '+(index===0?'active':'')+'" aria-selected="'+(index===0?'true':'false')+'" data-weekly-tab="'+tab.key+'">'+escapeHtml(tab.label)+'</button>').join('')
      +'</div>'
      +'<div class="department-weekly-period glass-soft">'
      +'<label>من تاريخ<input type="date" data-custom-date-picker data-custom-date-picker-label="من تاريخ" data-weekly-range="from" value="'+state.from+'"></label>'
      +'<label>إلى تاريخ<input type="date" data-custom-date-picker data-custom-date-picker-label="إلى تاريخ" data-weekly-range="to" value="'+state.to+'"></label>'
      +'<div class="department-weekly-navigation">'
      +'<button class="secondary" type="button" data-weekly-action="previous">الأسبوع السابق</button>'
      +'<button class="secondary" type="button" data-weekly-action="current">الأسبوع الحالي</button>'
      +'<button class="secondary" type="button" data-weekly-action="next">الأسبوع التالي</button>'
      +'</div><strong class="department-weekly-label" data-weekly-label></strong>'
      +'<div class="department-weekly-actions"><button class="secondary" type="button" data-weekly-action="retry" hidden>إعادة المحاولة</button>'+saveAction+'</div>'
      +'</div>'
      +'<div class="department-admin-alert" data-weekly-codes-alert hidden></div>'
      +'<div class="department-weekly-help hint" data-weekly-help>'+(state.kind==='statuses'?'اكتب كود الوردية أو الإجازة داخل الخلية.':'كل تقييم صحيح يُحفظ منفردًا بعد إدخال سبب إجباري، ثم يُقفل نهائيًا.')+'</div>'
      +'<div class="upload-status" data-weekly-status aria-live="polite"></div>'
      +'<div class="table-wrap department-weekly-table-wrap"><table class="department-weekly-table" data-no-universal-table="1"><thead></thead><tbody><tr><td class="empty-row">يتم تحميل البيانات عند فتح الشاشة.</td></tr></tbody></table></div>'
      +evaluationModal;
    state.initialized=true;
    root.addEventListener('click',event=>handleWeeklyClick(state,event));
    root.addEventListener('change',event=>handleWeeklyRangeChange(state,event));
    root.addEventListener('input',event=>handleWeeklyCellInput(state,event));
    root.addEventListener('focusin',event=>handleWeeklyCellFocus(state,event));
    root.addEventListener('focusout',event=>handleWeeklyCellBlur(state,event));
    root.addEventListener('keydown',event=>handleWeeklyCellKeydown(state,event));
    window.CustomDatePicker?.init(root);
    updateWeeklyChrome(state);
  }
  function updateWeeklyChrome(state){
    const root=weeklyRoot(state);
    if(!root) return;
    root.querySelectorAll('[data-weekly-tab]').forEach(button=>{
      const active=button.dataset.weeklyTab===state.activeTab;
      button.classList.toggle('active',active);
      button.setAttribute('aria-selected',active?'true':'false');
    });
    const fromInput=root.querySelector('[data-weekly-range="from"]');
    const toInput=root.querySelector('[data-weekly-range="to"]');
    if(fromInput && fromInput.value!==state.from){fromInput.value=state.from;window.CustomDatePicker?.refresh(fromInput);}
    if(toInput && toInput.value!==state.to){toInput.value=state.to;window.CustomDatePicker?.refresh(toInput);}
    const end=addDays(state.weekStart,6);
    const label=root.querySelector('[data-weekly-label]');
    if(label) label.textContent='الأسبوع: '+displayDate(state.weekStart)+' — '+displayDate(end);
    const previous=addDays(state.weekStart,-7);
    const next=addDays(state.weekStart,7);
    const previousButton=root.querySelector('[data-weekly-action="previous"]');
    const nextButton=root.querySelector('[data-weekly-action="next"]');
    if(previousButton) previousButton.disabled=!weekIntersectsRange(previous,state);
    if(nextButton) nextButton.disabled=!weekIntersectsRange(next,state);
    updateWeeklySaveButton(state);
  }
  function updateWeeklySaveButton(state){
    const button=weeklyRoot(state)?.querySelector('[data-weekly-action="save"]');
    if(!button) return;
    const allowed=canManageWeeklyData(state);
    button.disabled=!allowed || state.saving || state.dirty.size===0;
    button.textContent=state.saving?'جاري الحفظ...':(state.dirty.size?'حفظ الأسبوع ('+state.dirty.size+')':'حفظ الأسبوع');
    button.title=allowed?'حفظ الخلايا المعدلة فقط':'الصلاحية الحالية للعرض فقط.';
  }
  function showRequiredCodesAlert(container,codes){
    if(!container) return new Set();
    const valid=new Set();
    const issues=[];
    Object.values(REQUIRED_SUMMARY_CODES).forEach(code=>{
      const row=codes.find(item=>String(item.shift_code||'').trim()===code);
      if(row?.is_active) valid.add(code);
      else issues.push('الكود '+code+(row?' متوقف':' غير موجود'));
      if(code==='8' && row && String(row.description||'').trim()!=='أيام بالخصم'){
        issues.push('وصف الكود 8 الحالي «'+String(row.description||'').trim()+'» يتعارض مع الوصف المعتمد «أيام بالخصم» ولم يتم تغييره تلقائيًا');
      }
    });
    container.hidden=issues.length===0;
    container.textContent=issues.length?'تنبيه إداري: '+issues.join('، ')+'؛ لن تُعرض قيمة إحصائية مضللة لهذا الكود.':'';
    return valid;
  }

  async function handleWeeklyClick(state,event){
    const modalAction=event.target.closest('[data-evaluation-modal-action]')?.dataset.evaluationModalAction;
    if(modalAction){
      if(modalAction==='save') await saveSingleEvaluation(state);
      else closeEvaluationModal(state,modalAction==='cancel' || state.modalDraft?.mode==='new');
      return;
    }
    const savedEvaluation=event.target.closest('[data-evaluation-record-id]');
    if(savedEvaluation && state.kind==='evaluations'){
      openSavedEvaluationModal(state,savedEvaluation.dataset.evaluationRecordId);
      return;
    }
    const statusDisplay=event.target.closest('[data-status-cell-display]');
    if(statusDisplay){
      const cell=statusDisplay.closest('.department-weekly-cell');
      const input=cell?.querySelector('[data-weekly-cell]');
      if(input && !input.disabled){cell.classList.add('editing');input.focus();input.select();}
      return;
    }
    const sortButton=event.target.closest('[data-weekly-sort]');
    if(sortButton){
      const key=sortButton.dataset.weeklySort;
      const direction=nextSortDirection(state.sortKey,state.sortDirection,key);
      state.sortKey=direction?key:'full_name';
      state.sortDirection=direction||'asc';
      renderWeeklyTable(state);
      return;
    }
    const tab=event.target.closest('[data-weekly-tab]');
    if(tab){
      if(tab.dataset.weeklyTab===state.activeTab) return;
      if(!confirmDiscardWeeklyChanges(state)) return;
      state.activeTab=tab.dataset.weeklyTab;
      await loadDepartmentWeeklyWorkspace(state.kind);
      return;
    }
    const action=event.target.closest('[data-weekly-action]')?.dataset.weeklyAction;
    if(!action) return;
    if(action==='save' && state.kind==='statuses'){await saveWeeklyChanges(state);return;}
    if(action==='retry'){await loadDepartmentWeeklyWorkspace(state.kind);return;}
    if(!confirmDiscardWeeklyChanges(state)) return;
    if(action==='previous') state.weekStart=addDays(state.weekStart,-7);
    if(action==='next') state.weekStart=addDays(state.weekStart,7);
    if(action==='current'){
      const today=localTodayIso();
      state.weekStart=isBetween(today,state.from,state.to)?fridayStart(today):fridayStart(state.from);
    }
    if(!weekIntersectsRange(state.weekStart,state)) state.weekStart=fridayStart(state.from);
    await loadDepartmentWeeklyWorkspace(state.kind);
  }  async function handleWeeklyRangeChange(state,event){
    const input=event.target.closest('[data-weekly-range]');
    if(!input) return;
    const root=weeklyRoot(state);
    const nextFrom=root.querySelector('[data-weekly-range="from"]')?.value||'';
    const nextTo=root.querySelector('[data-weekly-range="to"]')?.value||'';
    if(!parseIso(nextFrom) || !parseIso(nextTo) || nextFrom>nextTo){
      setWeeklyStatus(state,'يجب اختيار نطاق تاريخ صحيح بحيث يكون «من» قبل «إلى».','err');
      updateWeeklyChrome(state);
      return;
    }
    if(!confirmDiscardWeeklyChanges(state)){updateWeeklyChrome(state);return;}
    state.from=nextFrom;state.to=nextTo;
    const today=localTodayIso();
    if(!weekIntersectsRange(state.weekStart,state)) state.weekStart=isBetween(today,state.from,state.to)?fridayStart(today):fridayStart(state.from);
    await loadDepartmentWeeklyWorkspace(state.kind);
  }

  function prepareWeeklyBaseline(state,records){
    state.baseline.clear();
    records.filter(row=>!row.is_voided).forEach(row=>{
      const date=state.kind==='statuses'?row.work_date:row.evaluation_date;
      const value=state.kind==='statuses'?String(row.shift_code_snapshot||'').trim():String(Number(row.score));
      state.baseline.set(cellKey(row.personnel_id,date),{
        value,expectedUpdatedAt:row.updated_at||null,recordId:row.id||'',
        description:state.kind==='statuses'?String(row.shift_description_snapshot||''):String(row.reason||''),
        color:state.kind==='statuses'?String(row.display_color_snapshot||''):'',
        blocksEvaluation:state.kind==='statuses' && row.blocks_evaluation_snapshot===true,
        record:row
      });
    });
  }
  function weeklySortValue(state,person,key){
    if(key==='employee_code') return {value:person.employee_code,type:'text'};
    if(key==='full_name') return {value:person.full_name,type:'text'};
    if(key==='job_title') return {value:person.job_title,type:'text'};
    if(key==='plant_code') return {value:person.plant_code,type:'text'};
    if(!key.startsWith('date:')) return {value:person.full_name,type:'text'};
    const date=key.slice(5);
    const cell=cellKey(person.id,date);
    if(state.kind==='statuses'){
      const draft=state.dirty.get(cell);
      const baseline=state.baseline.get(cell);
      return {value:draft?.description||baseline?.description||'',type:'text'};
    }
    const baseline=state.baseline.get(cell);
    if(baseline) return {value:Number(baseline.value),type:'number',group:0};
    const blocked=state.blockingStatuses.get(cell);
    if(blocked) return {value:blocked.description||blocked.code||'',type:'text',group:1};
    return {value:'',type:'text',group:2};
  }
  function sortedWeeklyPersonnel(state){
    const decorated=state.personnel.map((row,index)=>({row,index}));
    decorated.sort((left,right)=>{
      const a=weeklySortValue(state,left.row,state.sortKey);
      const b=weeklySortValue(state,right.row,state.sortKey);
      let result=compareSortValues(a,b,state.sortDirection);
      if(!result) result=compareArabic(left.row.employee_code,right.row.employee_code);
      if(!result) result=left.index-right.index;
      return result;
    });
    return decorated.map(item=>item.row);
  }
  function sortButton(state,key,label,extraClass=''){
    const active=state.sortKey===key;
    const direction=active?state.sortDirection:'';
    const ariaLabel=String(label).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    const content=extraClass?label:'<span>'+escapeHtml(label)+'</span>';
    return '<button type="button" class="department-sort-button '+extraClass+'" data-weekly-sort="'+escapeHtml(key)+'" aria-label="ترتيب حسب '+escapeHtml(ariaLabel)+'" aria-sort="'+(active?(direction==='desc'?'descending':'ascending'):'none')+'">'+content+sortIndicator(active,direction)+'</button>';
  }
  function renderStatusCell(state,person,date,inRange,editable){
    const key=cellKey(person.id,date);
    const baseline=state.baseline.get(key)||{value:'',expectedUpdatedAt:null,description:'',color:''};
    const draft=state.dirty.get(key);
    const invalid=state.invalid.has(key);
    const value=draft?draft.value:baseline.value;
    const description=draft?.description||baseline.description||'';
    const color=currentStatusDisplayColor(state,value,draft?.color||baseline.color||'');
    const classes=['department-weekly-cell'];
    if(!inRange) classes.push('outside-range');
    if(draft) classes.push('dirty');
    if(invalid) classes.push('invalid');
    const disabled=!editable || !inRange;
    const display=invalid?'<span class="department-status-invalid-value">'+escapeHtml(value||'—')+'</span>':statusVisual(description,value,color);
    return '<td class="'+classes.join(' ')+'" data-cell-date="'+date+'" data-weekly-cell-container>'
      +'<button type="button" class="department-status-cell-display" data-status-cell-display '+(disabled?'disabled':'')+'>'+display+'</button>'
      +'<input type="text" autocomplete="off" class="department-weekly-input department-status-code-input" data-weekly-cell data-personnel-id="'+escapeHtml(person.id||'')+'" data-date="'+date+'" value="'+escapeHtml(value)+'" title="'+escapeHtml(description||'أدخل كودًا فعالًا')+'" '+(disabled?'disabled':'')+'>'
      +'</td>';
  }
  function renderEvaluationCell(state,person,date,inRange,editable){
    const key=cellKey(person.id,date);
    const baseline=state.baseline.get(key);
    const blocked=state.blockingStatuses.get(key);
    const classes=['department-weekly-cell','department-evaluation-cell'];
    if(!inRange) classes.push('outside-range');
    if(baseline){
      classes.push('locked');
      return '<td class="'+classes.join(' ')+'" data-cell-date="'+date+'"><button type="button" class="department-locked-evaluation" data-evaluation-record-id="'+escapeHtml(baseline.recordId)+'" title="عرض التقييم النهائي وسببه"><strong>'+escapeHtml(baseline.value)+'</strong><span>/ 10</span><small>محفوظ نهائيًا 🔒</small></button></td>';
    }
    if(blocked){
      classes.push('blocked');
      return '<td class="'+classes.join(' ')+'" data-cell-date="'+date+'" title="'+escapeHtml((blocked.code||'')+' — '+(blocked.description||''))+'">'+statusVisual(blocked.description,blocked.code,currentStatusDisplayColor(state,blocked.code,blocked.color),'evaluation-blocked-status')+'<small class="department-evaluation-blocked-note">غير مؤهل للتقييم</small></td>';
    }
    const draft=state.dirty.get(key);
    if(draft) classes.push('dirty');
    if(state.invalid.has(key)) classes.push('invalid');
    const disabled=!editable || !inRange;
    return '<td class="'+classes.join(' ')+'" data-cell-date="'+date+'" data-weekly-cell-container><input type="text" inputmode="decimal" autocomplete="off" class="department-weekly-input" data-weekly-cell data-personnel-id="'+escapeHtml(person.id||'')+'" data-date="'+date+'" value="'+escapeHtml(draft?.value||'')+'" title="أدخل تقييمًا من 0 إلى 10" '+(disabled?'disabled':'')+'></td>';
  }
  function renderWeeklyTable(state){
    const root=weeklyRoot(state);
    const table=root?.querySelector('.department-weekly-table');
    if(!table) return;
    const dates=WEEK_DAYS.map(day=>({label:day.label,date:addDays(state.weekStart,day.offset)}));
    const fixedHeaders=state.kind==='statuses'
      ?[{key:'employee_code',label:'الكود الوظيفي'},{key:'full_name',label:'اسم أمين المخزن'},{key:'job_title',label:'الوظيفة'},{key:'plant_code',label:'الموقع'}]
      :[{key:'employee_code',label:'الكود الوظيفي'},{key:'full_name',label:'اسم الموظف'},{key:'job_title',label:'الوظيفة'}];
    table.querySelector('thead').innerHTML='<tr>'
      +fixedHeaders.map(header=>'<th>'+sortButton(state,header.key,header.label)+'</th>').join('')
      +dates.map(day=>'<th class="department-day-heading '+(isBetween(day.date,state.from,state.to)?'':'outside-range')+'">'+sortButton(state,'date:'+day.date,'<span>'+day.label+'</span><small>'+displayDate(day.date)+'</small>','department-day-sort')+'</th>').join('')
      +'</tr>';
    const tbody=table.querySelector('tbody');
    if(!state.personnel.length){
      tbody.innerHTML='<tr><td colspan="'+(fixedHeaders.length+7)+'" class="empty-row">لا يوجد أفراد نشطون مطابقون لهذا الموقع والقسم.</td></tr>';
      return;
    }
    const editable=canManageWeeklyData(state);
    tbody.innerHTML=sortedWeeklyPersonnel(state).map(person=>{
      const plant=String(person.plant_code||'');
      let row='<tr data-personnel-id="'+escapeHtml(person.id||'')+'">'
        +'<td dir="ltr">'+escapeHtml(person.employee_code||'')+'</td>'
        +'<td>'+escapeHtml(person.full_name||'')+'</td>'
        +'<td>'+escapeHtml(person.job_title||'')+'</td>';
      if(state.kind==='statuses') row+='<td>'+escapeHtml(plant+(PLANT_LABELS[plant]?' — '+PLANT_LABELS[plant]:''))+'</td>';
      row+=dates.map(day=>{
        const inRange=isBetween(day.date,state.from,state.to);
        return state.kind==='statuses'
          ?renderStatusCell(state,person,day.date,inRange,editable)
          :renderEvaluationCell(state,person,day.date,inRange,editable);
      }).join('');
      return row+'</tr>';
    }).join('');
  }
  async function loadDepartmentWeeklyWorkspace(kind){
    const state=WEEKLY_STATES[kind];
    if(!state) return false;
    if(!canViewWeeklyTab(state,currentTab(state))){
      const permitted=WEEKLY_TABS.find(tab=>canViewWeeklyTab(state,tab));
      if(!permitted) return false;
      state.activeTab=permitted.key;
    }
    renderWeeklyShell(state);
    updateWeeklyChrome(state);
    const root=weeklyRoot(state);
    const tbody=root?.querySelector('tbody');
    const retry=root?.querySelector('[data-weekly-action="retry"]');
    if(!root || !tbody) return false;
    const token=++state.requestToken;
    const requestedTab=state.activeTab;
    const requestedWeek=state.weekStart;
    state.loading=true;
    tbody.innerHTML='<tr><td colspan="11" class="empty-row">جاري تحميل الأسبوع...</td></tr>';
    setWeeklyStatus(state,'جاري تحميل بيانات الأسبوع...');
    if(retry) retry.hidden=true;
    if(!WarehouseDB?.ready){
      tbody.innerHTML='<tr><td colspan="11" class="empty-row">Supabase غير متصل.</td></tr>';
      setWeeklyStatus(state,'Supabase غير متصل. تعذر تحميل الأسبوع.','err');
      if(retry) retry.hidden=false;
      state.loading=false;
      return false;
    }
    const tab=currentTab(state);
    const weekEnd=addDays(requestedWeek,6);
    try{
      const personnelResult=await WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE)
        .select('id,employee_code,full_name,job_title,plant_code,department')
        .eq('plant_code',tab.plantCode).eq('department',tab.department).eq('is_active',true)
        .order('full_name',{ascending:true});
      if(personnelResult.error) throw personnelResult.error;
      if(token!==state.requestToken) return false;
      let personnel=(personnelResult.data||[]).slice().sort((a,b)=>compareArabic(a.full_name,b.full_name));
      if(kind==='evaluations') personnel=personnel.filter(row=>!EVALUATION_EXCLUDED_JOBS.has(String(row.job_title||'').trim()));
      const ids=personnel.map(row=>row.id);
      let records=[];
      let blockingStatuses=[];
      let statusCodes=[];
      if(ids.length){
        const dateColumn=kind==='statuses'?'work_date':'evaluation_date';
        const tableName=kind==='statuses'?DAILY_STATUSES_TABLE:DAILY_EVALUATIONS_TABLE;
        const fields=kind==='statuses'
          ?'id,personnel_id,work_date,shift_code_snapshot,shift_description_snapshot,blocks_evaluation_snapshot,display_color_snapshot,is_voided,updated_at'
          :'id,personnel_id,evaluation_date,score,reason,locked_at,locked_by,created_at,created_by,is_voided,updated_at';
        const recordResult=await WarehouseDB.client.from(tableName).select(fields)
          .in('personnel_id',ids).gte(dateColumn,requestedWeek).lte(dateColumn,weekEnd);
        if(recordResult.error) throw recordResult.error;
        records=recordResult.data||[];
        if(kind==='evaluations'){
          const statusResult=await WarehouseDB.client.from(DAILY_STATUSES_TABLE)
            .select('personnel_id,work_date,shift_code_snapshot,shift_description_snapshot,blocks_evaluation_snapshot,display_color_snapshot,is_voided')
            .in('personnel_id',ids).gte('work_date',requestedWeek).lte('work_date',weekEnd)
            .eq('is_voided',false).eq('blocks_evaluation_snapshot',true);
          if(statusResult.error) throw statusResult.error;
          blockingStatuses=statusResult.data||[];
        }
      }
      const codeResult=await WarehouseDB.client.from(DEPARTMENT_STATUS_CODES_TABLE)
        .select('id,shift_code,description,is_active,blocks_evaluation,display_color').order('shift_code',{ascending:true});
      if(codeResult.error) throw codeResult.error;
      statusCodes=codeResult.data||[];
      const evaluatorNames=new Map();
      if(kind==='evaluations'){
        const evaluatorIds=[...new Set(records.map(row=>row.locked_by||row.created_by).filter(Boolean))];
        if(evaluatorIds.length){
          const usersResult=await WarehouseDB.client.from('app_users').select('id,full_name').in('id',evaluatorIds);
          if(!usersResult.error) (usersResult.data||[]).forEach(user=>evaluatorNames.set(String(user.id),String(user.full_name||'')));
        }
      }
      if(token!==state.requestToken || requestedTab!==state.activeTab || requestedWeek!==state.weekStart) return false;
      state.personnel=personnel;
      state.records=records;
      state.statusCodes=statusCodes;
      state.evaluatorNames=evaluatorNames;
      state.blockingStatuses=new Map(blockingStatuses.filter(row=>!row.is_voided).map(row=>[
        cellKey(row.personnel_id,row.work_date),
        {code:String(row.shift_code_snapshot||'').trim(),description:String(row.shift_description_snapshot||''),color:String(row.display_color_snapshot||'')}
      ]));
      prepareWeeklyBaseline(state,records);
      renderWeeklyTable(state);
      if(kind==='statuses') showRequiredCodesAlert(root.querySelector('[data-weekly-codes-alert]'),statusCodes);
      setWeeklyStatus(state,personnel.length?'تم تحميل '+personnel.length+' من أفراد القسم النشطين.':'');
      state.loading=false;
      updateWeeklyChrome(state);
      return true;
    }catch(error){
      if(token!==state.requestToken) return false;
      tbody.innerHTML='<tr><td colspan="11" class="empty-row">تعذر تحميل بيانات هذا الأسبوع.</td></tr>';
      setWeeklyStatus(state,weeklyErrorMessage(error,'load'),'err');
      if(retry) retry.hidden=false;
      state.loading=false;
      return false;
    }
  }
  window.loadDepartmentWeeklyWorkspace=loadDepartmentWeeklyWorkspace;

  function validateWeeklyValue(state,key,cleaned){
    const baseline=state.baseline.get(key)||{value:''};
    if(cleaned==='') return {valid:true,value:'',description:'',color:''};
    if(state.kind==='evaluations'){
      if(!/^(?:10(?:\.0{1,2})?|[0-9](?:\.[0-9]{1,2})?)$/.test(cleaned)) return {valid:false,value:cleaned,description:'',color:''};
      return {valid:true,value:String(Number(cleaned)),description:'',color:''};
    }
    if(cleaned===baseline.value) return {valid:true,value:cleaned,description:baseline.description||'',color:baseline.color||''};
    const match=state.statusCodes.find(row=>row.is_active && String(row.shift_code||'').trim().toLocaleLowerCase()===cleaned.toLocaleLowerCase());
    if(!match) return {valid:false,value:cleaned,description:'',color:''};
    return {valid:true,value:String(match.shift_code||'').trim(),description:String(match.description||''),color:String(match.display_color||'')};
  }
  function updateWeeklyDirtyFromInput(state,input){
    const key=cellKey(input.dataset.personnelId,input.dataset.date);
    const baseline=state.baseline.get(key)||{value:'',expectedUpdatedAt:null,description:'',color:''};
    const result=validateWeeklyValue(state,key,String(input.value||'').trim());
    const same=result.valid && result.value===baseline.value;
    input.classList.toggle('invalid',!result.valid);
    input.closest('td')?.classList.toggle('invalid',!result.valid);
    if(same){
      state.dirty.delete(key);state.invalid.delete(key);
      input.classList.remove('dirty');input.closest('td')?.classList.remove('dirty');
    }else{
      state.dirty.set(key,{
        personnelId:input.dataset.personnelId,date:input.dataset.date,value:result.value,
        expectedUpdatedAt:baseline.expectedUpdatedAt,description:result.description,color:result.color
      });
      input.classList.add('dirty');input.closest('td')?.classList.add('dirty');
      if(result.valid) state.invalid.delete(key); else state.invalid.add(key);
    }
    input.title=result.description || (state.kind==='statuses'?'أدخل كودًا فعالًا':'أدخل قيمة من 0 إلى 10');
    updateWeeklySaveButton(state);
    return result;
  }
  function updateStatusCellPresentation(state,input,result){
    const cell=input.closest('[data-weekly-cell-container]');
    const display=cell?.querySelector('[data-status-cell-display]');
    if(!cell || !display) return;
    const content=result.valid
      ?statusVisual(result.description,result.value,result.color)
      :'<span class="department-status-invalid-value">'+escapeHtml(result.value||'—')+'</span>';
    display.innerHTML=content;
    display.title=result.valid?[result.value,result.description].filter(Boolean).join(' — '):'الكود غير موجود أو متوقف';
  }
  function handleWeeklyCellInput(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    const result=updateWeeklyDirtyFromInput(state,input);
    if(state.kind==='statuses') updateStatusCellPresentation(state,input,result);
    setWeeklyStatus(state,result.valid?'':'القيمة غير صحيحة ولن يتم حفظها. راجع الكود أو نطاق التقييم.','err');
  }
  function normalizeWeeklyCell(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return null;
    const result=updateWeeklyDirtyFromInput(state,input);
    if(result.valid) input.value=result.value;
    if(state.kind==='statuses') updateStatusCellPresentation(state,input,result);
    return result;
  }
  function handleWeeklyCellBlur(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    const result=normalizeWeeklyCell(state,{target:input});
    input.closest('td')?.classList.remove('editing');
    if(state.kind==='evaluations' && result?.valid && result.value!==''){
      const key=cellKey(input.dataset.personnelId,input.dataset.date);
      if(state.dirty.has(key)) setTimeout(()=>openNewEvaluationModal(state,input.dataset.personnelId,input.dataset.date),0);
    }
  }
  function handleWeeklyCellFocus(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    input.closest('td')?.classList.add('editing');
    const help=weeklyRoot(state)?.querySelector('[data-weekly-help]');
    const key=cellKey(input.dataset.personnelId,input.dataset.date);
    const result=validateWeeklyValue(state,key,String(input.value||'').trim());
    if(help) help.textContent=state.kind==='statuses'
      ?(result.description?'وصف الكود: '+result.description:'أدخل كود وردية أو إجازة فعالًا، ثم احفظ الأسبوع.')
      :'التقييم يقبل القيم من 0 إلى 10 وبحد أقصى منزلتين عشريتين؛ سيُطلب سبب التقييم قبل الحفظ.';
  }
  function resetDraftCell(state,input){
    const key=cellKey(input.dataset.personnelId,input.dataset.date);
    const baseline=state.baseline.get(key)||{value:'',description:'',color:''};
    input.value=baseline.value;
    input.title=baseline.description||input.title;
    state.dirty.delete(key);state.invalid.delete(key);
    input.classList.remove('dirty','invalid');
    input.closest('td')?.classList.remove('dirty','invalid','editing');
    if(state.kind==='statuses') updateStatusCellPresentation(state,input,{valid:true,value:baseline.value,description:baseline.description,color:baseline.color});
    updateWeeklySaveButton(state);
  }
  function handleWeeklyCellKeydown(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    if(event.key==='Escape'){
      event.preventDefault();
      resetDraftCell(state,input);
      return;
    }
    if(event.key==='Tab' && state.kind==='statuses'){
      event.preventDefault();
      const result=normalizeWeeklyCell(state,{target:input});
      if(!result?.valid){setWeeklyStatus(state,'الكود غير موجود أو متوقف. صحح الخلية قبل الانتقال.','err');return;}
      const enabled=Array.from(weeklyRoot(state).querySelectorAll('[data-weekly-cell]:not([disabled])'));
      const index=enabled.indexOf(input);
      const target=enabled[(index+(event.shiftKey?-1:1)+enabled.length)%enabled.length];
      input.closest('td')?.classList.remove('editing');
      target?.closest('td')?.classList.add('editing');
      target?.focus();target?.select();
      return;
    }
    if(event.key==='Enter'){
      event.preventDefault();
      const result=normalizeWeeklyCell(state,{target:input});
      if(!result?.valid){
        setWeeklyStatus(state,'القيمة غير صحيحة ولن يتم حفظها.','err');
        return;
      }
      if(state.kind==='evaluations'){
        if(result.value!=='') openNewEvaluationModal(state,input.dataset.personnelId,input.dataset.date);
        return;
      }
      const enabled=Array.from(weeklyRoot(state).querySelectorAll('[data-weekly-cell]:not([disabled])'));
      const sameDay=enabled.filter(cell=>cell.dataset.date===input.dataset.date);
      const dayIndex=sameDay.indexOf(input);
      const target=sameDay[dayIndex+1] || enabled[enabled.indexOf(input)+1] || enabled[0];
      target?.closest('td')?.classList.add('editing');
      target?.focus();target?.select();
    }
  }
  function personForState(state,personnelId){
    return state.personnel.find(person=>String(person.id)===String(personnelId));
  }
  function dayAndDateLabel(date){
    const day=WEEK_DAYS.find(item=>addDays(fridayStart(date),item.offset)===date);
    return (day?.label||'اليوم')+' — '+displayDate(date);
  }
  function setEvaluationModalStatus(state,message,type=''){
    const status=weeklyRoot(state)?.querySelector('[data-evaluation-modal-status]');
    if(!status) return;
    status.className='upload-status '+(type||'');
    status.textContent=message||'';
  }
  function populateEvaluationModalDetails(state,person,date,score){
    const root=weeklyRoot(state);
    const values={name:person?.full_name||'—',code:person?.employee_code||'—',job:person?.job_title||'—',date:dayAndDateLabel(date),score:String(score)+' / 10'};
    Object.entries(values).forEach(([key,value])=>{const el=root?.querySelector('[data-evaluation-detail="'+key+'"]');if(el) el.textContent=value;});
  }
  function setEvaluationModalSaving(state,saving){
    state.saving=Boolean(saving);
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    if(!modal) return;
    const saveButton=modal.querySelector('[data-evaluation-modal-action="save"]');
    if(saveButton){saveButton.disabled=state.saving;saveButton.textContent=state.saving?'جاري الحفظ...':'حفظ التقييم';}
    modal.querySelectorAll('[data-evaluation-modal-action="cancel"],[data-evaluation-modal-action="close"]').forEach(button=>{button.disabled=state.saving;});
  }
  function resetEvaluationModalControls(state,clearReason=false){
    setEvaluationModalSaving(state,false);
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    const reason=modal?.querySelector('[data-evaluation-reason]');
    if(clearReason && reason){reason.value='';reason.readOnly=false;}
  }
  function openNewEvaluationModal(state,personnelId,date){
    if(state.kind!=='evaluations' || state.modalDraft) return;
    const key=cellKey(personnelId,date);
    const draft=state.dirty.get(key);
    const person=personForState(state,personnelId);
    if(!draft || !person || !validateWeeklyValue(state,key,draft.value).valid) return;
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    if(!modal) return;
    resetEvaluationModalControls(state,true);
    state.modalDraft={mode:'new',key,personnelId,date,score:draft.value};
    modal.hidden=false;
    modal.querySelector('[data-evaluation-modal-title]').textContent='حفظ تقييم نهائي';
    populateEvaluationModalDetails(state,person,date,draft.value);
    const reason=modal.querySelector('[data-evaluation-reason]');
    reason.readOnly=false;reason.value='';
    modal.querySelector('.department-evaluation-reason-label').hidden=false;
    modal.querySelector('[data-evaluation-saved-meta]').hidden=true;
    modal.querySelector('[data-evaluation-modal-action="save"]').hidden=false;
    modal.querySelector('[data-evaluation-modal-action="cancel"]').hidden=false;
    modal.querySelectorAll('[data-evaluation-modal-action="close"]').forEach((button,index)=>button.hidden=index>0?true:false);
    setEvaluationModalStatus(state,'');
    document.body.classList.add('modal-open');
    setTimeout(()=>reason.focus(),0);
  }
  function formatSavedAt(value){
    if(!value) return '—';
    try{return new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value));}
    catch(_){return String(value);}
  }
  function openSavedEvaluationModal(state,recordId){
    const baseline=[...state.baseline.values()].find(item=>String(item.recordId)===String(recordId));
    const record=baseline?.record;
    if(!record) return;
    const person=personForState(state,record.personnel_id);
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    if(!modal) return;
    resetEvaluationModalControls(state,true);
    state.modalDraft={mode:'view',recordId:String(recordId)};
    modal.hidden=false;
    modal.querySelector('[data-evaluation-modal-title]').textContent='تفاصيل التقييم النهائي';
    populateEvaluationModalDetails(state,person,record.evaluation_date,record.score);
    const reason=modal.querySelector('[data-evaluation-reason]');
    reason.readOnly=true;reason.value=String(record.reason||'');
    modal.querySelector('.department-evaluation-reason-label').hidden=false;
    const savedMeta=modal.querySelector('[data-evaluation-saved-meta]');
    savedMeta.hidden=false;
    const actorId=record.locked_by||record.created_by||'';
    const actor=state.evaluatorNames.get(String(actorId)) || (actorId?'المستخدم '+actorId:'غير متاح');
    modal.querySelector('[data-evaluation-detail="saved"]').textContent=actor+' — '+formatSavedAt(record.locked_at||record.created_at);
    modal.querySelector('[data-evaluation-modal-action="save"]').hidden=true;
    modal.querySelector('[data-evaluation-modal-action="cancel"]').hidden=true;
    modal.querySelectorAll('[data-evaluation-modal-action="close"]').forEach(button=>button.hidden=false);
    setEvaluationModalStatus(state,'');
    document.body.classList.add('modal-open');
  }
  function closeEvaluationModal(state,cancelDraft=false){
    if(state.saving) return false;
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    const draft=state.modalDraft;
    if(cancelDraft && draft?.mode==='new'){
      state.dirty.delete(draft.key);state.invalid.delete(draft.key);
    }
    state.modalDraft=null;
    if(modal) modal.hidden=true;
    resetEvaluationModalControls(state,true);
    document.body.classList.remove('modal-open');
    if(cancelDraft) renderWeeklyTable(state);
    return true;
  }
  async function saveSingleEvaluation(state){
    const draft=state.modalDraft;
    if(state.kind!=='evaluations' || draft?.mode!=='new' || state.saving) return;
    const modal=weeklyRoot(state)?.querySelector('[data-evaluation-modal]');
    const reasonInput=modal?.querySelector('[data-evaluation-reason]');
    const reason=String(reasonInput?.value||'').trim();
    const validation=validateWeeklyValue(state,draft.key,String(draft.score||'').trim());
    if(!validation.valid || validation.value===''){setEvaluationModalStatus(state,'التقييم غير صحيح. أدخل قيمة من 0 إلى 10 وبحد أقصى منزلتين.','err');return;}
    if(!reason){setEvaluationModalStatus(state,'سبب التقييم إجباري ولا يمكن أن يكون مسافات فقط.','err');reasonInput?.focus();return;}
    if(!canManageWeeklyData(state)){setEvaluationModalStatus(state,'الصلاحية الحالية للعرض فقط.','err');return;}
    if(!WarehouseDB?.ready){setEvaluationModalStatus(state,'Supabase غير متصل. احتفظنا بالتقييم والسبب.','err');return;}
    setEvaluationModalSaving(state,true);
    setEvaluationModalStatus(state,'جاري حفظ التقييم النهائي...');
    try{
      const {data,error}=await WarehouseDB.client.rpc('save_department_personnel_daily_evaluations',{p_changes:[{
        personnel_id:draft.personnelId,evaluation_date:draft.date,score:validation.value,reason
      }]});
      if(error) throw error;
      state.dirty.delete(draft.key);state.invalid.delete(draft.key);
      setEvaluationModalSaving(state,false);
      closeEvaluationModal(state,false);
      await loadDepartmentWeeklyWorkspace('evaluations');
      setWeeklyStatus(state,'تم حفظ التقييم وقَفله نهائيًا بنجاح.','ok');
    }catch(error){
      setEvaluationModalStatus(state,weeklyErrorMessage(error,'save')+' احتفظنا بالتقييم والسبب.','err');
    }finally{
      setEvaluationModalSaving(state,false);
    }
  }
  async function saveWeeklyChanges(state){
    if(state.kind!=='statuses' || state.saving || !state.dirty.size) return;
    if(!canManageWeeklyData(state)){setWeeklyStatus(state,'الصلاحية الحالية للعرض فقط.','err');return;}
    if(state.invalid.size){setWeeklyStatus(state,'صحح الخلايا المميزة قبل حفظ الأسبوع.','err');return;}
    if(!WarehouseDB?.ready){setWeeklyStatus(state,'Supabase غير متصل. احتفظنا بالتعديلات غير المحفوظة.','err');return;}
    const changes=Array.from(state.dirty.values()).map(change=>({
      personnel_id:change.personnelId,work_date:change.date,shift_code:change.value,expected_updated_at:change.expectedUpdatedAt
    }));
    state.saving=true;updateWeeklySaveButton(state);setWeeklyStatus(state,'جاري حفظ الخلايا المعدلة فقط...');
    try{
      const {data,error}=await WarehouseDB.client.rpc('save_department_personnel_daily_statuses',{p_changes:changes});
      if(error) throw error;
      const saved=Number(data||changes.length);
      state.dirty.clear();state.invalid.clear();state.saving=false;
      await loadDepartmentWeeklyWorkspace('statuses');
      setWeeklyStatus(state,'تم حفظ '+saved+' من الخلايا المعدلة بنجاح.','ok');
    }catch(error){
      state.saving=false;updateWeeklySaveButton(state);
      setWeeklyStatus(state,weeklyErrorMessage(error,'save')+' لم نفقد أي تعديل محلي.','err');
    }
  }
  function setStorekeepersStatus(message,type=''){
    const status=document.getElementById('departmentStorekeepersStatus');
    if(!status) return;
    status.className='upload-status '+(type||'');status.textContent=message||'';
  }
  function storekeeperDaysInMonth(year,month){
    if(month<1 || month>12) return 0;
    if(month===2) return (year%4===0 && (year%100!==0 || year%400===0))?29:28;
    return [4,6,9,11].includes(month)?30:31;
  }
  function storekeeperDateOnlyParts(value){
    if(value && typeof value==='object'){
      const parts={year:Number(value.year),month:Number(value.month),day:Number(value.day)};
      return Number.isInteger(parts.year) && Number.isInteger(parts.month) && Number.isInteger(parts.day)
        && parts.year>=1 && parts.month>=1 && parts.month<=12 && parts.day>=1 && parts.day<=storekeeperDaysInMonth(parts.year,parts.month)
        ? parts:null;
    }
    const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||'').trim());
    if(!match) return null;
    const parts={year:Number(match[1]),month:Number(match[2]),day:Number(match[3])};
    return parts.year>=1 && parts.month>=1 && parts.month<=12 && parts.day>=1 && parts.day<=storekeeperDaysInMonth(parts.year,parts.month)?parts:null;
  }
  function compareStorekeeperDateOnly(left,right){
    if(left.year!==right.year) return left.year-right.year;
    if(left.month!==right.month) return left.month-right.month;
    return left.day-right.day;
  }
  function addStorekeeperCalendarMonths(parts,months){
    const monthIndex=(parts.year*12)+(parts.month-1)+months;
    const year=Math.floor(monthIndex/12);
    const month=(monthIndex-(year*12))+1;
    return {year,month,day:Math.min(parts.day,storekeeperDaysInMonth(year,month))};
  }
  function storekeeperDateOnlyOrdinal(parts){
    const date=new Date(0);
    date.setUTCHours(0,0,0,0);
    date.setUTCFullYear(parts.year,parts.month-1,parts.day);
    return Math.floor(date.getTime()/86400000);
  }
  function formatStorekeeperWorkDuration(years,months,days){
    const parts=[];
    if(years===1) parts.push('سنة');
    else if(years===2) parts.push('سنتان');
    else if(years>0) parts.push(years+' '+(years%100>=3 && years%100<=10?'سنوات':'سنة'));
    if(months===1) parts.push('شهر');
    else if(months===2) parts.push('شهران');
    else if(months>0) parts.push(months+' '+(months%100>=3 && months%100<=10?'أشهر':'شهرًا'));
    if(days===1) parts.push('يوم');
    else if(days===2) parts.push('يومان');
    else if(days>0) parts.push(days+' '+(days%100>=3 && days%100<=10?'أيام':'يومًا'));
    return parts.length?parts.join(' و'):'0 يوم';
  }
  function storekeeperWorkDuration(hireDate,currentDate){
    const hire=storekeeperDateOnlyParts(hireDate);
    let now=storekeeperDateOnlyParts(currentDate);
    if(!currentDate){
      const localNow=new Date();
      now=storekeeperDateOnlyParts({year:localNow.getFullYear(),month:localNow.getMonth()+1,day:localNow.getDate()});
    }
    if(!hire || !now || compareStorekeeperDateOnly(hire,now)>0) return null;
    let years=now.year-hire.year;
    let yearAnchor=addStorekeeperCalendarMonths(hire,years*12);
    if(compareStorekeeperDateOnly(yearAnchor,now)>0){years-=1;yearAnchor=addStorekeeperCalendarMonths(hire,years*12);}
    let months=((now.year-yearAnchor.year)*12)+(now.month-yearAnchor.month);
    let monthAnchor=addStorekeeperCalendarMonths(yearAnchor,months);
    if(compareStorekeeperDateOnly(monthAnchor,now)>0){months-=1;monthAnchor=addStorekeeperCalendarMonths(yearAnchor,months);}
    const days=storekeeperDateOnlyOrdinal(now)-storekeeperDateOnlyOrdinal(monthAnchor);
    const totalDays=storekeeperDateOnlyOrdinal(now)-storekeeperDateOnlyOrdinal(hire);
    return {years,months,days,totalDays,label:formatStorekeeperWorkDuration(years,months,days)};
  }
  function buildStorekeepersRows(personnel,statuses,validSummaryCodes){
    const today=localTodayIso();
    return personnel.map(person=>{
      const rows=statuses.filter(item=>String(item.personnel_id)===String(person.id) && !item.is_voided);
      const todayRow=rows.find(item=>item.work_date===today);
      const countCode=code=>new Set(rows.filter(item=>String(item.shift_code_snapshot||'').trim()===code).map(item=>item.work_date)).size;
      return {...person,
        currentShift:todayRow?String(todayRow.shift_code_snapshot||'').trim():'',
        currentShiftDescription:todayRow?String(todayRow.shift_description_snapshot||''):'',
        currentShiftColor:todayRow?String(todayRow.display_color_snapshot||''):'',
        restCount:validSummaryCodes.has('0')?countCode('0'):null,
        monthCount:validSummaryCodes.has('4')?countCode('4'):null,
        eidCount:validSummaryCodes.has('5')?countCode('5'):null,
        deductionCount:validSummaryCodes.has('8')?countCode('8'):null,
        absenceCount:validSummaryCodes.has('9')?countCode('9'):null
      };
    });
  }
  function storekeepersSortValue(row,key){
    const numericKeys=new Set(['restCount','monthCount','eidCount','deductionCount','absenceCount']);
    if(numericKeys.has(key)) return {value:row[key],type:'number'};
    if(key==='workDuration') return {value:storekeeperWorkDuration(row.hire_date)?.totalDays??null,type:'number'};
    if(key==='hire_date') return {value:row.hire_date,type:'date'};
    if(key==='plant_code') return {value:[row.plant_code,PLANT_LABELS[row.plant_code]].filter(Boolean).join(' '),type:'text'};
    if(key==='currentShift') return {value:row.currentShiftDescription||row.currentShift,type:'text'};
    return {value:row[key],type:'text'};
  }
  function filteredStorekeepersRows(){
    const search=String(document.getElementById('departmentStorekeepersSearch')?.value||'').trim().toLocaleLowerCase();
    const plant=document.getElementById('departmentStorekeepersPlantFilter')?.value||'';
    const department=document.getElementById('departmentStorekeepersDepartmentFilter')?.value||'';
    const job=document.getElementById('departmentStorekeepersJobFilter')?.value||'';
    const rows=STOREKEEPERS_STATE.rows.filter(row=>{
      if(plant && row.plant_code!==plant) return false;
      if(department && row.department!==department) return false;
      if(job && row.job_title!==job) return false;
      if(!search) return true;
      const haystack=[row.employee_code,row.full_name,row.job_title,row.plant_code,PLANT_LABELS[row.plant_code],row.department,row.phone_number].join(' ').toLocaleLowerCase();
      return haystack.includes(search);
    });
    return rows.map((row,index)=>({row,index})).sort((left,right)=>{
      const a=storekeepersSortValue(left.row,STOREKEEPERS_STATE.sortKey);
      const b=storekeepersSortValue(right.row,STOREKEEPERS_STATE.sortKey);
      let result=compareSortValues(a,b,STOREKEEPERS_STATE.sortDirection);
      if(!result) result=compareArabic(left.row.employee_code,right.row.employee_code);
      if(!result) result=left.index-right.index;
      return result;
    }).map(item=>item.row);
  }
  function renderStorekeepersHeader(){
    const head=document.querySelector('#departmentStorekeepersTable thead');
    if(!head) return;
    const headers=[
      ['employee_code','الكود الوظيفي'],['full_name','اسم أمين المخزن'],['job_title','الوظيفة'],
      ['plant_code','الموقع'],['department','القسم'],['phone_number','رقم التليفون'],['hire_date','تاريخ التعيين'],
      ['workDuration','مدة العمل'],['currentShift','الوردية الحالية'],['restCount','عدد الراحات'],['monthCount','عدد أيام الشهر'],
      ['eidCount','عدد أيام العيد'],['deductionCount','أيام بالخصم'],['absenceCount','غياب بدون إذن']
    ];
    head.innerHTML='<tr>'+headers.map(([key,label])=>{
      const active=STOREKEEPERS_STATE.sortKey===key;
      return '<th'+(key==='workDuration'?' class="department-work-duration-heading"':'')+'><button type="button" class="department-sort-button" data-storekeeper-sort="'+key+'" aria-label="ترتيب حسب '+escapeHtml(label)+'" aria-sort="'+(active?(STOREKEEPERS_STATE.sortDirection==='desc'?'descending':'ascending'):'none')+'"><span>'+escapeHtml(label)+'</span>'+sortIndicator(active,active?STOREKEEPERS_STATE.sortDirection:'')+'</button></th>';
    }).join('')+'</tr>';
  }
  function renderDepartmentStorekeepers(){
    const tbody=document.querySelector('#departmentStorekeepersTable tbody');
    if(!tbody) return;
    renderStorekeepersHeader();
    const rows=filteredStorekeepersRows();
    if(!rows.length){tbody.innerHTML='<tr><td colspan="14" class="empty-row">لا يوجد أفراد نشطون مطابقون للبحث والفلاتر.</td></tr>';return;}
    tbody.innerHTML=rows.map(row=>{
      const plant=String(row.plant_code||'');
      const shift=row.currentShift?'<span class="department-current-shift"><b dir="ltr">'+escapeHtml(row.currentShift)+'</b>'+statusVisual(row.currentShiftDescription,row.currentShift,row.currentShiftColor)+'</span>':'—';
      const workDuration=storekeeperWorkDuration(row.hire_date);
      return '<tr><td dir="ltr">'+escapeHtml(row.employee_code||'')+'</td><td>'+escapeHtml(row.full_name||'')+'</td><td>'+escapeHtml(row.job_title||'')+'</td>'
        +'<td>'+escapeHtml(plant+(PLANT_LABELS[plant]?' — '+PLANT_LABELS[plant]:''))+'</td><td>'+escapeHtml(row.department||'')+'</td>'
        +'<td dir="ltr">'+escapeHtml(row.phone_number||'—')+'</td><td>'+escapeHtml(displayDate(row.hire_date))+'</td>'
        +'<td class="department-work-duration-cell" data-sort-value="'+escapeHtml(workDuration?.totalDays??'')+'">'+escapeHtml(workDuration?.label||'—')+'</td><td>'+shift+'</td>'
        +'<td>'+escapeHtml(row.restCount===null?'—':row.restCount)+'</td><td>'+escapeHtml(row.monthCount===null?'—':row.monthCount)+'</td><td>'+escapeHtml(row.eidCount===null?'—':row.eidCount)+'</td>'
        +'<td>'+escapeHtml(row.deductionCount===null?'—':row.deductionCount)+'</td><td>'+escapeHtml(row.absenceCount===null?'—':row.absenceCount)+'</td></tr>';
    }).join('');
  }  async function loadDepartmentStorekeepers(){
    if(!window.PermissionRuntime?.any('department_personnel.storekeepers.view')) return false;
    const tbody=document.querySelector('#departmentStorekeepersTable tbody');
    const retry=document.getElementById('departmentStorekeepersRetryBtn');
    if(!tbody) return false;
    const token=++STOREKEEPERS_STATE.requestToken;
    STOREKEEPERS_STATE.loading=true;tbody.innerHTML='<tr><td colspan="14" class="empty-row">جاري تحميل أفراد القسم والملخص السنوي...</td></tr>';
    setStorekeepersStatus('جاري التحميل...');if(retry) retry.hidden=true;
    if(!WarehouseDB?.ready){setStorekeepersStatus('Supabase غير متصل. تعذر تحميل الجدول.','err');if(retry) retry.hidden=false;return false;}
    const year=new Date().getFullYear();const range=yearRange(year);
    try{
      const personnelResult=await WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE)
        .select('id,employee_code,full_name,job_title,plant_code,department,phone_number,hire_date')
        .eq('is_active',true).order('full_name',{ascending:true});
      if(personnelResult.error) throw personnelResult.error;
      personnelResult.data=(personnelResult.data||[]).filter(row=>window.PermissionRuntime?.can('department_personnel.storekeepers.view',row.plant_code || []));
      const ids=personnelResult.data.map(row=>row.id);
      let statuses=[];
      if(ids.length){
        const statusResult=await WarehouseDB.client.from(DAILY_STATUSES_TABLE)
          .select('personnel_id,work_date,shift_code_snapshot,shift_description_snapshot,display_color_snapshot,is_voided')
          .in('personnel_id',ids).gte('work_date',range.from).lte('work_date',range.to);
        if(statusResult.error) throw statusResult.error;
        statuses=statusResult.data||[];
      }
      const codesResult=await WarehouseDB.client.from(DEPARTMENT_STATUS_CODES_TABLE)
        .select('shift_code,description,is_active').order('shift_code',{ascending:true});
      if(codesResult.error) throw codesResult.error;
      if(token!==STOREKEEPERS_STATE.requestToken) return false;
      const validCodes=showRequiredCodesAlert(document.getElementById('departmentStorekeepersCodesAlert'),codesResult.data||[]);
      STOREKEEPERS_STATE.rows=buildStorekeepersRows((personnelResult.data||[]).slice().sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''),'ar',{sensitivity:'base'})),statuses,validCodes);
      renderDepartmentStorekeepers();
      setStorekeepersStatus('تم تحميل '+STOREKEEPERS_STATE.rows.length+' من أفراد القسم النشطين وملخص سنة '+year+'.');
      STOREKEEPERS_STATE.loading=false;return true;
    }catch(error){
      if(token!==STOREKEEPERS_STATE.requestToken) return false;
      tbody.innerHTML='<tr><td colspan="14" class="empty-row">تعذر تحميل جدول أفراد القسم.</td></tr>';
      setStorekeepersStatus(weeklyErrorMessage(error,'load'),'err');if(retry) retry.hidden=false;
      STOREKEEPERS_STATE.loading=false;return false;
    }
  }
  window.loadDepartmentStorekeepers=loadDepartmentStorekeepers;

  function handleDepartmentStatusCodeUpdates(event){
    const codes=Array.isArray(event.detail?.codes)?event.detail.codes.map(row=>({...row})):[];
    Object.values(WEEKLY_STATES).forEach(state=>{
      state.statusCodes=codes.map(row=>({...row}));
      if(state.initialized && weeklyRoot(state)) renderWeeklyTable(state);
    });
  }  function initDepartmentWeeklyOperations(){
    Object.values(WEEKLY_STATES).forEach(renderWeeklyShell);
    window.addEventListener('department-status-codes-updated',handleDepartmentStatusCodeUpdates);
    ['departmentStorekeepersSearch','departmentStorekeepersPlantFilter','departmentStorekeepersDepartmentFilter','departmentStorekeepersJobFilter'].forEach(id=>document.getElementById(id)?.addEventListener(id.endsWith('Search')?'input':'change',renderDepartmentStorekeepers));
    document.getElementById('departmentStorekeepersRetryBtn')?.addEventListener('click',loadDepartmentStorekeepers);
    document.getElementById('departmentStorekeepersTable')?.addEventListener('click',event=>{
      const button=event.target.closest('[data-storekeeper-sort]');
      if(!button) return;
      const key=button.dataset.storekeeperSort;
      const direction=nextSortDirection(STOREKEEPERS_STATE.sortKey,STOREKEEPERS_STATE.sortDirection,key);
      STOREKEEPERS_STATE.sortKey=direction?key:'full_name';
      STOREKEEPERS_STATE.sortDirection=direction||'asc';
      renderDepartmentStorekeepers();
    });
    window.addEventListener('beforeunload',event=>{
      if(APPROVED_APPLICATION_RELOAD || !Object.values(WEEKLY_STATES).some(hasDirtyWeeklyState)) return;
      event.preventDefault();event.returnValue='';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDepartmentWeeklyOperations);
  else initDepartmentWeeklyOperations();
})();
