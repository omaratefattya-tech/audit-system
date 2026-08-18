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
  const REQUIRED_SUMMARY_CODES={rest:'0',month:'4',eid:'5'};
  const PLANT_LABELS={
    WF01:'مصنع الواحة',
    EL01:'مصنع الإيمان للأعلاف - السواقي',
    EL02:'مصنع الإيمان للأعلاف - العامرية'
  };
  const WEEKLY_STATES={
    statuses:createWeeklyState('statuses','departmentWeeklyScheduleApp','department_weekly_leave_schedule'),
    evaluations:createWeeklyState('evaluations','departmentEvaluationsApp','department_evaluations')
  };
  const STOREKEEPERS_STATE={rows:[],requestToken:0,loading:false};

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

  function createWeeklyState(kind,rootId,sectionId){
    const currentYear=new Date().getFullYear();
    const range=yearRange(currentYear);
    const today=localTodayIso();
    return {
      kind,rootId,sectionId,from:range.from,to:range.to,
      weekStart:isBetween(today,range.from,range.to)?fridayStart(today):fridayStart(range.from),
      activeTab:WEEKLY_TABS[0].key,requestToken:0,initialized:false,loading:false,saving:false,
      personnel:[],records:[],statusCodes:[],baseline:new Map(),dirty:new Map(),invalid:new Set()
    };
  }
  function canManageWeeklyData(){
    return hasPermission('reports','add') || hasPermission('reports','edit') || hasPermission('reports','manage');
  }
  function hasDirtyWeeklyState(state){return Boolean(state && state.dirty.size);}
  function confirmDiscardWeeklyChanges(state){
    if(!hasDirtyWeeklyState(state)) return true;
    const confirmed=window.confirm('توجد تعديلات غير محفوظة. هل تريد تجاهلها والمتابعة؟');
    if(confirmed){state.dirty.clear();state.invalid.clear();}
    return confirmed;
  }
  function canLeaveDepartmentWeeklyWorkspace(nextSection){
    const active=activeSectionId();
    const state=Object.values(WEEKLY_STATES).find(item=>item.sectionId===active);
    if(!state || nextSection===active || !hasDirtyWeeklyState(state)) return true;
    return confirmDiscardWeeklyChanges(state);
  }
  window.canLeaveDepartmentWeeklyWorkspace=canLeaveDepartmentWeeklyWorkspace;

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
      +'<div class="department-weekly-actions"><button class="secondary" type="button" data-weekly-action="retry" hidden>إعادة المحاولة</button><button class="primary" type="button" data-weekly-action="save">حفظ الأسبوع</button></div>'
      +'</div>'
      +'<div class="department-admin-alert" data-weekly-codes-alert hidden></div>'
      +'<div class="department-weekly-help hint" data-weekly-help>'+(state.kind==='statuses'?'اكتب كود الوردية أو الإجازة داخل الخلية.':'أدخل تقييمًا من 0 إلى 10 وبحد أقصى منزلتين عشريتين.')+'</div>'
      +'<div class="upload-status" data-weekly-status aria-live="polite"></div>'
      +'<div class="table-wrap department-weekly-table-wrap"><table class="department-weekly-table" data-no-universal-table="1"><thead></thead><tbody><tr><td class="empty-row">يتم تحميل البيانات عند فتح الشاشة.</td></tr></tbody></table></div>';
    state.initialized=true;
    root.addEventListener('click',event=>handleWeeklyClick(state,event));
    root.addEventListener('change',event=>handleWeeklyRangeChange(state,event));
    root.addEventListener('input',event=>handleWeeklyCellInput(state,event));
    root.addEventListener('focusin',event=>handleWeeklyCellFocus(state,event));
    root.addEventListener('focusout',event=>normalizeWeeklyCell(state,event));
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
    const allowed=canManageWeeklyData();
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
    });
    container.hidden=issues.length===0;
    container.textContent=issues.length?'تنبيه إداري: '+issues.join('، ')+'؛ لن تُعرض قيمة إحصائية مضللة لهذا الكود.':'';
    return valid;
  }

  async function handleWeeklyClick(state,event){
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
    if(action==='save'){await saveWeeklyChanges(state);return;}
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
  }
  async function handleWeeklyRangeChange(state,event){
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
    records.forEach(row=>{
      const date=state.kind==='statuses'?row.work_date:row.evaluation_date;
      const value=row.is_voided?'':(state.kind==='statuses'?String(row.shift_code_snapshot||'').trim():String(Number(row.score)));
      state.baseline.set(cellKey(row.personnel_id,date),{
        value,expectedUpdatedAt:row.updated_at||null,
        description:state.kind==='statuses'?String(row.shift_description_snapshot||''):''
      });
    });
  }
  function renderWeeklyTable(state){
    const root=weeklyRoot(state);
    const table=root?.querySelector('.department-weekly-table');
    if(!table) return;
    const dates=WEEK_DAYS.map(day=>({label:day.label,date:addDays(state.weekStart,day.offset)}));
    const fixedHeaders=state.kind==='statuses'?['الكود الوظيفي','اسم أمين المخزن','الوظيفة','الموقع']:['الكود الوظيفي','اسم الموظف','الوظيفة'];
    table.querySelector('thead').innerHTML='<tr>'+fixedHeaders.map(label=>'<th>'+label+'</th>').join('')+dates.map(day=>'<th class="department-day-heading '+(isBetween(day.date,state.from,state.to)?'':'outside-range')+'"><span>'+day.label+'</span><small>'+displayDate(day.date)+'</small></th>').join('')+'</tr>';
    const tbody=table.querySelector('tbody');
    if(!state.personnel.length){
      tbody.innerHTML='<tr><td colspan="'+(fixedHeaders.length+7)+'" class="empty-row">لا يوجد أفراد نشطون مطابقون لهذا الموقع والقسم.</td></tr>';
      return;
    }
    const editable=canManageWeeklyData();
    tbody.innerHTML=state.personnel.map(person=>{
      const plant=String(person.plant_code||'');
      let row='<tr data-personnel-id="'+escapeHtml(person.id||'')+'">'
        +'<td dir="ltr">'+escapeHtml(person.employee_code||'')+'</td>'
        +'<td>'+escapeHtml(person.full_name||'')+'</td>'
        +'<td>'+escapeHtml(person.job_title||'')+'</td>';
      if(state.kind==='statuses') row+='<td>'+escapeHtml(plant+(PLANT_LABELS[plant]?' — '+PLANT_LABELS[plant]:''))+'</td>';
      row+=dates.map(day=>{
        const key=cellKey(person.id,day.date);
        const baseline=state.baseline.get(key)||{value:'',expectedUpdatedAt:null,description:''};
        const inRange=isBetween(day.date,state.from,state.to);
        const disabled=!editable || !inRange;
        const title=state.kind==='statuses'?(baseline.description||'أدخل كودًا فعالًا'):'أدخل قيمة من 0 إلى 10';
        return '<td class="department-weekly-cell '+(inRange?'':'outside-range')+'"><input type="text" inputmode="decimal" autocomplete="off" class="department-weekly-input" data-weekly-cell data-personnel-id="'+escapeHtml(person.id||'')+'" data-date="'+day.date+'" value="'+escapeHtml(baseline.value)+'" title="'+escapeHtml(title)+'" '+(disabled?'disabled':'')+'></td>';
      }).join('');
      return row+'</tr>';
    }).join('');
  }

  async function loadDepartmentWeeklyWorkspace(kind){
    const state=WEEKLY_STATES[kind];
    if(!state) return false;
    renderWeeklyShell(state);
    updateWeeklyChrome(state);
    const root=weeklyRoot(state);
    const tbody=root?.querySelector('tbody');
    const retry=root?.querySelector('[data-weekly-action="retry"]');
    if(!root || !tbody) return false;
    const token=++state.requestToken;
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
    const weekEnd=addDays(state.weekStart,6);
    try{
      const personnelResult=await WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE)
        .select('id,employee_code,full_name,job_title,plant_code,department')
        .eq('plant_code',tab.plantCode).eq('department',tab.department).eq('is_active',true)
        .order('full_name',{ascending:true});
      if(personnelResult.error) throw personnelResult.error;
      if(token!==state.requestToken) return false;
      let personnel=(personnelResult.data||[]).slice().sort((a,b)=>String(a.full_name||'').localeCompare(String(b.full_name||''),'ar',{sensitivity:'base'}));
      if(kind==='evaluations') personnel=personnel.filter(row=>!EVALUATION_EXCLUDED_JOBS.has(String(row.job_title||'').trim()));
      const ids=personnel.map(row=>row.id);
      const dateColumn=kind==='statuses'?'work_date':'evaluation_date';
      const tableName=kind==='statuses'?DAILY_STATUSES_TABLE:DAILY_EVALUATIONS_TABLE;
      const fields=kind==='statuses'?'id,personnel_id,work_date,shift_code_snapshot,shift_description_snapshot,is_voided,updated_at':'id,personnel_id,evaluation_date,score,is_voided,updated_at';
      let records=[];
      if(ids.length){
        const recordResult=await WarehouseDB.client.from(tableName).select(fields)
          .in('personnel_id',ids).gte(dateColumn,state.weekStart).lte(dateColumn,weekEnd);
        if(recordResult.error) throw recordResult.error;
        records=recordResult.data||[];
      }
      let statusCodes=[];
      if(kind==='statuses'){
        const codeResult=await WarehouseDB.client.from(DEPARTMENT_STATUS_CODES_TABLE)
          .select('id,shift_code,description,is_active').order('shift_code',{ascending:true});
        if(codeResult.error) throw codeResult.error;
        statusCodes=codeResult.data||[];
      }
      if(token!==state.requestToken || tab.key!==state.activeTab || state.weekStart!==fridayStart(state.weekStart)) return false;
      state.personnel=personnel;state.records=records;state.statusCodes=statusCodes;
      state.invalid.clear();
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
    if(cleaned==='') return {valid:true,value:'',description:''};
    if(state.kind==='evaluations'){
      if(!/^(?:10(?:\.0{1,2})?|[0-9](?:\.[0-9]{1,2})?)$/.test(cleaned)) return {valid:false,value:cleaned,description:''};
      return {valid:true,value:String(Number(cleaned)),description:''};
    }
    if(cleaned===baseline.value) return {valid:true,value:cleaned,description:baseline.description||''};
    const match=state.statusCodes.find(row=>row.is_active && String(row.shift_code||'').trim().toLocaleLowerCase()===cleaned.toLocaleLowerCase());
    if(!match) return {valid:false,value:cleaned,description:''};
    return {valid:true,value:String(match.shift_code||'').trim(),description:String(match.description||'')};
  }
  function updateWeeklyDirtyFromInput(state,input){
    const key=cellKey(input.dataset.personnelId,input.dataset.date);
    const baseline=state.baseline.get(key)||{value:'',expectedUpdatedAt:null,description:''};
    const result=validateWeeklyValue(state,key,String(input.value||'').trim());
    const same=result.valid && result.value===baseline.value;
    input.classList.toggle('invalid',!result.valid);
    input.closest('td')?.classList.toggle('invalid',!result.valid);
    if(same){state.dirty.delete(key);state.invalid.delete(key);input.classList.remove('dirty');input.closest('td')?.classList.remove('dirty');}
    else{
      state.dirty.set(key,{personnelId:input.dataset.personnelId,date:input.dataset.date,value:result.value,expectedUpdatedAt:baseline.expectedUpdatedAt});
      input.classList.add('dirty');input.closest('td')?.classList.add('dirty');
      if(result.valid) state.invalid.delete(key); else state.invalid.add(key);
    }
    input.title=result.description || (state.kind==='statuses'?'أدخل كودًا فعالًا':'أدخل قيمة من 0 إلى 10');
    updateWeeklySaveButton(state);
    return result;
  }
  function handleWeeklyCellInput(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    const result=updateWeeklyDirtyFromInput(state,input);
    setWeeklyStatus(state,result.valid?'':'القيمة غير صحيحة ولن يتم حفظها. راجع الكود أو نطاق التقييم.','err');
  }
  function normalizeWeeklyCell(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    const result=updateWeeklyDirtyFromInput(state,input);
    if(result.valid) input.value=result.value;
  }
  function handleWeeklyCellFocus(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    const help=weeklyRoot(state)?.querySelector('[data-weekly-help]');
    const key=cellKey(input.dataset.personnelId,input.dataset.date);
    const result=validateWeeklyValue(state,key,String(input.value||'').trim());
    if(help) help.textContent=state.kind==='statuses'
      ? (result.description?'وصف الكود: '+result.description:'أدخل كود وردية أو إجازة فعالًا، ثم احفظ الأسبوع.')
      :'التقييم يقبل القيم من 0 إلى 10 وبحد أقصى منزلتين عشريتين.';
  }
  function handleWeeklyCellKeydown(state,event){
    const input=event.target.closest('[data-weekly-cell]');
    if(!input) return;
    if(event.key==='Escape'){
      event.preventDefault();
      const key=cellKey(input.dataset.personnelId,input.dataset.date);
      const baseline=state.baseline.get(key)||{value:'',description:''};
      input.value=baseline.value;input.title=baseline.description||input.title;
      state.dirty.delete(key);state.invalid.delete(key);
      input.classList.remove('dirty','invalid');input.closest('td')?.classList.remove('dirty','invalid');
      updateWeeklySaveButton(state);
      return;
    }
    if(event.key==='Enter'){
      event.preventDefault();
      normalizeWeeklyCell(state,{target:input});
      const enabled=Array.from(weeklyRoot(state).querySelectorAll('[data-weekly-cell]:not([disabled])'));
      const sameDay=enabled.filter(cell=>cell.dataset.date===input.dataset.date);
      const dayIndex=sameDay.indexOf(input);
      const target=sameDay[dayIndex+1] || enabled[enabled.indexOf(input)+1] || enabled[0];
      target?.focus();target?.select();
    }
  }

  async function saveWeeklyChanges(state){
    if(state.saving || !state.dirty.size) return;
    if(!canManageWeeklyData()){setWeeklyStatus(state,'الصلاحية الحالية للعرض فقط.','err');return;}
    if(state.invalid.size){setWeeklyStatus(state,'صحح الخلايا المميزة قبل حفظ الأسبوع.','err');return;}
    if(!WarehouseDB?.ready){setWeeklyStatus(state,'Supabase غير متصل. احتفظنا بالتعديلات غير المحفوظة.','err');return;}
    const changes=Array.from(state.dirty.values()).map(change=>state.kind==='statuses'
      ?{personnel_id:change.personnelId,work_date:change.date,shift_code:change.value,expected_updated_at:change.expectedUpdatedAt}
      :{personnel_id:change.personnelId,evaluation_date:change.date,score:change.value,expected_updated_at:change.expectedUpdatedAt});
    state.saving=true;updateWeeklySaveButton(state);setWeeklyStatus(state,'جاري حفظ الخلايا المعدلة فقط...');
    try{
      const rpcName=state.kind==='statuses'?'save_department_personnel_daily_statuses':'save_department_personnel_daily_evaluations';
      const {data,error}=await WarehouseDB.client.rpc(rpcName,{p_changes:changes});
      if(error) throw error;
      const saved=Number(data||changes.length);
      state.dirty.clear();state.invalid.clear();state.saving=false;
      await loadDepartmentWeeklyWorkspace(state.kind);
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
  function buildStorekeepersRows(personnel,statuses,validSummaryCodes){
    const today=localTodayIso();
    return personnel.map(person=>{
      const rows=statuses.filter(item=>String(item.personnel_id)===String(person.id) && !item.is_voided);
      const todayRow=rows.find(item=>item.work_date===today);
      const countCode=code=>new Set(rows.filter(item=>String(item.shift_code_snapshot||'').trim()===code).map(item=>item.work_date)).size;
      return {...person,
        currentShift:todayRow?String(todayRow.shift_code_snapshot||'').trim():'',
        currentShiftDescription:todayRow?String(todayRow.shift_description_snapshot||''):'',
        restCount:validSummaryCodes.has('0')?countCode('0'):null,
        monthCount:validSummaryCodes.has('4')?countCode('4'):null,
        eidCount:validSummaryCodes.has('5')?countCode('5'):null
      };
    });
  }
  function filteredStorekeepersRows(){
    const search=String(document.getElementById('departmentStorekeepersSearch')?.value||'').trim().toLocaleLowerCase();
    const plant=document.getElementById('departmentStorekeepersPlantFilter')?.value||'';
    const department=document.getElementById('departmentStorekeepersDepartmentFilter')?.value||'';
    const job=document.getElementById('departmentStorekeepersJobFilter')?.value||'';
    return STOREKEEPERS_STATE.rows.filter(row=>{
      if(plant && row.plant_code!==plant) return false;
      if(department && row.department!==department) return false;
      if(job && row.job_title!==job) return false;
      if(!search) return true;
      const haystack=[row.employee_code,row.full_name,row.job_title,row.plant_code,PLANT_LABELS[row.plant_code],row.department,row.phone_number].join(' ').toLocaleLowerCase();
      return haystack.includes(search);
    });
  }
  function renderDepartmentStorekeepers(){
    const tbody=document.querySelector('#departmentStorekeepersTable tbody');
    if(!tbody) return;
    const rows=filteredStorekeepersRows();
    if(!rows.length){tbody.innerHTML='<tr><td colspan="11" class="empty-row">لا يوجد أفراد نشطون مطابقون للبحث والفلاتر.</td></tr>';return;}
    tbody.innerHTML=rows.map(row=>{
      const plant=String(row.plant_code||'');
      const shift=row.currentShift?'<span class="department-current-shift" title="'+escapeHtml(row.currentShiftDescription)+'"><b dir="ltr">'+escapeHtml(row.currentShift)+'</b>'+(row.currentShiftDescription?'<small>'+escapeHtml(row.currentShiftDescription)+'</small>':'')+'</span>':'—';
      return '<tr><td dir="ltr">'+escapeHtml(row.employee_code||'')+'</td><td>'+escapeHtml(row.full_name||'')+'</td><td>'+escapeHtml(row.job_title||'')+'</td>'
        +'<td>'+escapeHtml(plant+(PLANT_LABELS[plant]?' — '+PLANT_LABELS[plant]:''))+'</td><td>'+escapeHtml(row.department||'')+'</td>'
        +'<td dir="ltr">'+escapeHtml(row.phone_number||'—')+'</td><td>'+escapeHtml(displayDate(row.hire_date))+'</td><td>'+shift+'</td>'
        +'<td>'+escapeHtml(row.restCount===null?'—':row.restCount)+'</td><td>'+escapeHtml(row.monthCount===null?'—':row.monthCount)+'</td><td>'+escapeHtml(row.eidCount===null?'—':row.eidCount)+'</td></tr>';
    }).join('');
  }
  async function loadDepartmentStorekeepers(){
    const tbody=document.querySelector('#departmentStorekeepersTable tbody');
    const retry=document.getElementById('departmentStorekeepersRetryBtn');
    if(!tbody) return false;
    const token=++STOREKEEPERS_STATE.requestToken;
    STOREKEEPERS_STATE.loading=true;tbody.innerHTML='<tr><td colspan="11" class="empty-row">جاري تحميل أفراد القسم والملخص السنوي...</td></tr>';
    setStorekeepersStatus('جاري التحميل...');if(retry) retry.hidden=true;
    if(!WarehouseDB?.ready){setStorekeepersStatus('Supabase غير متصل. تعذر تحميل الجدول.','err');if(retry) retry.hidden=false;return false;}
    const year=new Date().getFullYear();const range=yearRange(year);
    try{
      const personnelResult=await WarehouseDB.client.from(DEPARTMENT_PERSONNEL_TABLE)
        .select('id,employee_code,full_name,job_title,plant_code,department,phone_number,hire_date')
        .eq('is_active',true).order('full_name',{ascending:true});
      if(personnelResult.error) throw personnelResult.error;
      const ids=(personnelResult.data||[]).map(row=>row.id);
      let statuses=[];
      if(ids.length){
        const statusResult=await WarehouseDB.client.from(DAILY_STATUSES_TABLE)
          .select('personnel_id,work_date,shift_code_snapshot,shift_description_snapshot,is_voided')
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
      tbody.innerHTML='<tr><td colspan="11" class="empty-row">تعذر تحميل جدول أفراد القسم.</td></tr>';
      setStorekeepersStatus(weeklyErrorMessage(error,'load'),'err');if(retry) retry.hidden=false;
      STOREKEEPERS_STATE.loading=false;return false;
    }
  }
  window.loadDepartmentStorekeepers=loadDepartmentStorekeepers;

  function initDepartmentWeeklyOperations(){
    Object.values(WEEKLY_STATES).forEach(renderWeeklyShell);
    ['departmentStorekeepersSearch','departmentStorekeepersPlantFilter','departmentStorekeepersDepartmentFilter','departmentStorekeepersJobFilter'].forEach(id=>document.getElementById(id)?.addEventListener(id.endsWith('Search')?'input':'change',renderDepartmentStorekeepers));
    document.getElementById('departmentStorekeepersRetryBtn')?.addEventListener('click',loadDepartmentStorekeepers);
    window.addEventListener('beforeunload',event=>{
      if(!Object.values(WEEKLY_STATES).some(hasDirtyWeeklyState)) return;
      event.preventDefault();event.returnValue='';
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',initDepartmentWeeklyOperations);
  else initDepartmentWeeklyOperations();
})();
