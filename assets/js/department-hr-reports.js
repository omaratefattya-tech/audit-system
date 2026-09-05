(() => {
  'use strict';
  const TABS = ['cumulative_department_evaluation','personnel_performance','attendance_compliance','absence_violations','evaluation_analysis','performance_trend'];
  const EVALUATION_MAX_SCORE = 10;
  const PERSONNEL_PERFORMANCE_EXCLUDED_JOBS = new Set(['مدير إدارة المخازن','مدير مخازن قطع الغيار','رئيس قسم']);
  const S = { initialized:false, loading:false, loaded:false, error:'', activeTab:TABS[0], seq:0, controller:null, data:null, search:'', personPreviewId:'', absenceMode:'records', trendGrouping:'month', sort:{} };
  const $ = id => document.getElementById(id);
  const root = () => $('department_hr_reports');
  const panel = key => root()?.querySelector(`[data-department-hr-panel="${key}"]`);
  const arr = value => Array.isArray(value) ? value : [];

  function today(){
    const d=new Date(), offset=d.getTimezoneOffset();
    return new Date(d.getTime()-offset*60000).toISOString().slice(0,10);
  }
  function shift(value,days){
    const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value||''));
    if(!m) return '';
    return new Date(Date.UTC(+m[1],+m[2]-1,+m[3]+days)).toISOString().slice(0,10);
  }
  function esc(value){
    return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  }
  const norm=value=>String(value??'').trim().toLocaleLowerCase('ar');
  function dateText(value){
    const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(value||''));
    return m?`${m[3]}/${m[2]}/${m[1]}`:'—';
  }
  function dateTime(value){
    if(!value) return '—';
    const d=new Date(value);
    return Number.isNaN(d.getTime())?'—':new Intl.DateTimeFormat('ar-EG-u-nu-latn',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(d);
  }
  function numberText(value,digits=2){
    if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))) return '—';
    const numeric=Object.is(Number(value),-0)?0:Number(value);
    return new Intl.NumberFormat('en-US-u-nu-latn',{useGrouping:false,minimumFractionDigits:digits,maximumFractionDigits:digits}).format(numeric);
  }
  const integerText=value=>numberText(value,0);
  const ratingText=value=>numberText(value,2);
  function percentageText(value){
    if(value===null||value===undefined||value===''||!Number.isFinite(Number(value))||!Number.isFinite(EVALUATION_MAX_SCORE)||EVALUATION_MAX_SCORE<=0) return '—';
    return `${numberText((Number(value)/EVALUATION_MAX_SCORE)*100,2)}%`;
  }
  function westernText(value){
    return String(value??'').replace(/[٠-٩]/g,digit=>'0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(digit)])
      .replace(/[۰-۹]/g,digit=>'0123456789'['۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)]).replace(/٫/g,'.').replace(/٬/g,',');
  }
  const color=value=>/^#[0-9A-F]{6}$/.test(String(value||'').toUpperCase())?String(value).toUpperCase():'#64748B';
  function filters(){
    return {
      from:String($('departmentHrFromDate')?.value||'').slice(0,10),
      to:String($('departmentHrToDate')?.value||'').slice(0,10),
      plant:String($('departmentHrPlantFilter')?.value||'').trim(),
      department:String($('departmentHrDepartmentFilter')?.value||'').trim(),
      job:String($('departmentHrJobFilter')?.value||'').trim(),
      person:String($('departmentHrPersonnelFilter')?.value||'').trim()
    };
  }
  function status(message,type=''){
    const el=$('departmentHrReportStatus');
    if(el){ el.className=`department-hr-report-status ${type}`.trim(); el.textContent=message||''; }
    const retry=$('departmentHrRetryBtn');
    if(retry) retry.hidden=type!=='error';
  }
  const stateMarkup=(kind,message,button='')=>`<div class="department-hr-state ${kind}">${kind==='loading'?'<span class="department-hr-spinner" aria-hidden="true"></span>':''}<b>${kind==='error'?'تعذر تحميل التقرير':kind==='empty'?'لا توجد بيانات':'جاري تحميل البيانات...'}</b><span>${esc(message||'')}</span>${button}</div>`;
  const empty=message=>stateMarkup('empty',message);
  const card=(label,value,note='',numeric=false)=>`<article class="department-hr-summary-card"><span>${esc(label)}</span><b${numeric?' class="department-hr-numeric-value" dir="ltr"':''}>${esc(value)}</b>${note?`<small>${esc(note)}</small>`:''}</article>`;
  const cards=(items,enhanced=false)=>`<div class="department-hr-summary${enhanced?' department-hr-summary-enhanced':''}">${items.join('')}</div>`;

  function searchMatch(row){
    const q=norm(S.search);
    if(!q) return true;
    return ['employee_code','full_name','plant_code','department','job_title','reason','shift_code','shift_description','description'].some(key=>norm(row?.[key]).includes(q));
  }
  function current(){
    const data=S.data||{};
    const key='department_personnel.hr_reports.'+S.activeTab+'.view';
    if(window.PermissionRuntime?.can(key)) return {personnel:arr(data.personnel),codes:arr(data.status_codes),statuses:arr(data.statuses).filter(searchMatch),evaluations:arr(data.evaluations).filter(searchMatch)};
    const personnel=arr(data.personnel).filter(person=>window.PermissionRuntime?.can(key,person.plant_code || []));
    const ids=new Set(personnel.map(person=>String(person.id)));
    return {
      personnel,
      codes:arr(data.status_codes),
      statuses:arr(data.statuses).filter(row=>row.plant_code ? window.PermissionRuntime?.can(key,row.plant_code) : ids.has(String(row.personnel_id))).filter(searchMatch),
      evaluations:arr(data.evaluations).filter(row=>row.plant_code ? window.PermissionRuntime?.can(key,row.plant_code) : ids.has(String(row.personnel_id))).filter(searchMatch)
    };
  }
  function matchingPersonnel(data=current(),f=filters()){
    const scope={...f,person:''};
    return data.personnel.filter(person=>scopedPerson(person,scope)&&searchMatch(person));
  }
  const isPersonnelPerformanceExcluded=person=>PERSONNEL_PERFORMANCE_EXCLUDED_JOBS.has(String(person?.job_title||'').trim());
  function scopedPerson(person,f=filters()){
    return (!f.plant||String(person.plant_code||'').toUpperCase()===f.plant.toUpperCase())
      &&(!f.department||person.department===f.department)&&(!f.job||person.job_title===f.job)&&(!f.person||person.id===f.person);
  }
  function optionHtml(value,label,selected){ return `<option value="${esc(value)}"${String(value)===String(selected)?' selected':''}>${esc(label)}</option>`; }
  function setOptions(select,values,placeholder,selected,label=x=>x,value=x=>x){
    if(!select) return;
    select.innerHTML=optionHtml('',placeholder,selected)+values.map(item=>optionHtml(value(item),label(item),selected)).join('');
  }
  function syncOptions(){
    const people=arr(S.data?.personnel);
    if(!people.length) return;
    const before=filters();
    const departments=[...new Set(people.filter(p=>!before.plant||String(p.plant_code).toUpperCase()===before.plant.toUpperCase()).map(p=>p.department).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
    setOptions($('departmentHrDepartmentFilter'),departments,'كل الأقسام',before.department);
    const middle=filters();
    const jobs=[...new Set(people.filter(p=>(!middle.plant||String(p.plant_code).toUpperCase()===middle.plant.toUpperCase())&&(!middle.department||p.department===middle.department)).map(p=>p.job_title).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ar'));
    setOptions($('departmentHrJobFilter'),jobs,'كل الوظائف',before.job);
    const after=filters();
    const peopleOptions=people.filter(p=>(!after.plant||String(p.plant_code).toUpperCase()===after.plant.toUpperCase())&&(!after.department||p.department===after.department)&&(!after.job||p.job_title===after.job)).sort((a,b)=>String(a.full_name).localeCompare(String(b.full_name),'ar'));
    setOptions($('departmentHrPersonnelFilter'),peopleOptions,'كل الموظفين',before.person,p=>`${p.employee_code} — ${p.full_name}`,p=>p.id);
  }

  function scoreStats(rows){
    const scores=rows.map(r=>Number(r.score)).filter(Number.isFinite);
    return {
      count:scores.length,
      people:new Set(rows.map(r=>r.personnel_id)).size,
      avg:scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null,
      min:scores.length?Math.min(...scores):null,
      max:scores.length?Math.max(...scores):null
    };
  }
  function compare(a,b){
    if(a===b) return 0;
    if(a===null||a===undefined||a==='') return 1;
    if(b===null||b===undefined||b==='') return -1;
    const an=Number(a),bn=Number(b);
    return Number.isFinite(an)&&Number.isFinite(bn)?an-bn:String(a).localeCompare(String(b),'ar',{numeric:true,sensitivity:'base'});
  }
  function sorted(report,rows,key,direction='asc'){
    if(!S.sort[report]) S.sort[report]={key,direction};
    const state=S.sort[report], factor=state.direction==='desc'?-1:1;
    return [...rows].sort((a,b)=>(compare(a[state.key],b[state.key])||compare(a._order,b._order))*factor);
  }
  function sortHead(report,key,label){
    const state=S.sort[report]||{key,direction:'asc'};
    const arrow=state.key===key?(state.direction==='asc'?'↑':'↓'):'';
    return `<button class="department-hr-sort" type="button" data-export-label="${esc(label)}" data-hr-sort-report="${report}" data-hr-sort-key="${key}"><span class="department-hr-sort-label">${esc(label)}</span>${arrow?`<span class="department-sort-indicator" aria-hidden="true">${arrow}</span>`:''}</button>`;
  }
  function table(report,columns,rows,message,options={}){
    if(!rows.length) return empty(message);
    const head=columns.map(c=>`<th${c.className?` class="${c.className}"`:''} data-export-label="${esc(c.label)}">${c.sort?sortHead(report,c.key,c.label):esc(c.label)}</th>`).join('');
    const body=rows.map(row=>`<tr${typeof options.rowAttributes==='function'?options.rowAttributes(row):''}>${columns.map(c=>`<td${c.className?` class="${c.className}"`:''}${c.exportType?` data-export-type="${esc(c.exportType)}"`:''}>${c.render?c.render(row):esc(row[c.key]??'—')}</td>`).join('')}</tr>`).join('');
    return `<div class="department-hr-table-wrap"><table class="department-hr-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }
  function renderAll(){
    if(S.loading){ TABS.forEach(key=>{if(panel(key)) panel(key).innerHTML=stateMarkup('loading','');}); return; }
    if(S.error){ TABS.forEach(key=>{if(panel(key)) panel(key).innerHTML=stateMarkup('error',S.error,'<button class="secondary" type="button" data-hr-retry>إعادة المحاولة</button>');}); return; }
    if(!S.loaded){ TABS.forEach(key=>{if(panel(key)) panel(key).innerHTML=empty('اضغط «تطبيق الفلاتر» لتحميل البيانات الحالية.');}); return; }
    renderCumulative(); renderPerson(); renderAttendance(); renderAbsence(); renderAnalysis(); renderTrend();
  }
  async function load(){
    init();
    const f=filters();
    const plants=window.PermissionRuntime?.scope('department_personnel.hr_reports.'+S.activeTab+'.view',f.plant || 'all') || [];
    if(!plants.length){S.data=null;S.loaded=false;S.error='لا تملك صلاحية عرض المصنع المحدد.';renderAll();return;}
    // This existing RPC accepts one plant or null. A scoped role starts at its
    // first permitted plant and can select another permitted plant explicitly.
    if(!f.plant && plants.length < window.PermissionRuntime.plantCodes().length){f.plant=plants[0];if($('departmentHrPlantFilter')) $('departmentHrPlantFilter').value=f.plant;}
    if(!/^\d{4}-\d{2}-\d{2}$/.test(f.from)||!/^\d{4}-\d{2}-\d{2}$/.test(f.to)||f.from>f.to){
      S.error='تحقق من تاريخ البداية والنهاية.'; status(S.error,'error'); renderAll(); return;
    }
    if(!window.WarehouseDB?.ready){ S.error='قاعدة البيانات غير متصلة.'; status(S.error,'error'); renderAll(); return; }
    const seq=++S.seq;
    S.controller?.abort?.();
    S.controller=typeof AbortController==='function'?new AbortController():null;
    S.loading=true; S.error=''; status(`جاري تحميل بيانات HR من ${dateText(f.from)} إلى ${dateText(f.to)}...`); renderAll();
    try{
      let request=WarehouseDB.client.rpc('get_department_hr_reports_data',{p_from_date:f.from,p_to_date:f.to,p_plant_code:f.plant||null,p_department:f.department||null,p_job_title:f.job||null,p_personnel_id:f.person||null});
      if(S.controller&&typeof request?.abortSignal==='function') request=request.abortSignal(S.controller.signal);
      const {data,error}=await request;
      if(seq!==S.seq) return;
      if(error) throw error;
      if(!data||data.status!=='ok') throw new Error('استجابة غير صالحة.');
      S.data=data; S.loaded=true; S.loading=false; S.error=''; syncOptions();
      status(`تم تحميل ${Number(data.counts?.statuses||0)} حالة مسجلة و${Number(data.counts?.evaluations||0)} تقييم محفوظ.`,'success');
      renderAll();
    }catch(error){
      if(seq!==S.seq||error?.name==='AbortError') return;
      S.loading=false;
      const raw=String(error?.message||error||'خطأ غير معروف');
      S.error=/42501|permission|Reports view/i.test(raw)?'لا تملك صلاحية عرض reports أو انتهت جلسة الدخول.':raw;
      status(`تعذر تحميل تقارير HR: ${S.error}`,'error'); renderAll();
    }
  }

  function renderCumulative(){
    const target=panel('cumulative_department_evaluation'), rows=current().evaluations;
    if(!target) return;
    if(!rows.length){ target.innerHTML=empty('لا توجد تقييمات يومية محفوظة فعليًا ضمن الفترة والفلاتر.'); return; }
    const summary=scoreStats(rows), aggregates=[];
    const add=(level,levelKey,key,label)=>{
      const groups=new Map();
      rows.forEach(row=>{const k=key(row);if(!groups.has(k))groups.set(k,{label:label(row),rows:[]});groups.get(k).rows.push(row);});
      groups.forEach(group=>{const x=scoreStats(group.rows);aggregates.push({_order:aggregates.length,level,levelKey,label:group.label,employees:x.people,count:x.count,avg:x.avg,min:x.min,max:x.max});});
    };
    add('الموقع','site',r=>r.plant_code,r=>r.plant_code);
    add('القسم','department',r=>`${r.plant_code}|${r.department}`,r=>`${r.plant_code} / ${r.department}`);
    add('الموظف','employee',r=>r.personnel_id,r=>`${westernText(r.employee_code)} — ${r.full_name}`);
    const rowsOut=sorted('cumulative',aggregates,'level');
    const columns=[
      {key:'level',label:'المستوى',sort:true,className:'department-hr-text-column'},{key:'label',label:'الموقع/القسم/الموظف',sort:true,className:'department-hr-text-column'},
      {key:'employees',label:'عدد الموظفين',sort:true,className:'department-hr-numeric-cell',exportType:'integer',render:r=>esc(integerText(r.employees))},
      {key:'count',label:'عدد التقييمات',sort:true,className:'department-hr-numeric-cell',exportType:'integer',render:r=>esc(integerText(r.count))},
      {key:'avg',label:'المتوسط',sort:true,className:'department-hr-numeric-cell',exportType:'percentage',render:r=>esc(percentageText(r.avg))},
      {key:'min',label:'أقل تقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.min))},
      {key:'max',label:'أعلى تقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.max))}
    ];
    target.innerHTML=cards([
      card('إجمالي التقييمات المسجلة',integerText(summary.count),'',true),card('موظفون لديهم تقييمات',integerText(summary.people),'',true),
      card('المتوسط العام',percentageText(summary.avg),'',true),card('أقل تقييم',ratingText(summary.min),'',true),card('أعلى تقييم',ratingText(summary.max),'',true)
    ],true)+table('cumulative',columns,rowsOut,'لا توجد مقارنات متاحة.',{
      rowAttributes:row=>` data-hr-cumulative-level="${esc(row.levelKey)}"`
    });
  }

  function renderPerson(){
    const target=panel('personnel_performance');
    if(!target) return;
    const data=current(), f=filters();
    const selectedCandidate=f.person?data.personnel.find(p=>String(p.id)===String(f.person)&&scopedPerson(p,f)):null;
    const people=selectedCandidate&&isPersonnelPerformanceExcluded(selectedCandidate)
      ?[]
      :matchingPersonnel(data,f).filter(person=>!isPersonnelPerformanceExcluded(person));
    const selectedId=f.person||S.personPreviewId;
    let person=selectedId?data.personnel.find(p=>String(p.id)===String(selectedId)&&scopedPerson(p,{...f,person:selectedId})&&!isPersonnelPerformanceExcluded(p)):null;
    if(!person && !f.person && !S.personPreviewId && norm(S.search) && people.length===1) person=people[0];
    if(!person){
      if(!people.length){target.innerHTML=empty('لا يوجد موظفون مطابقون للفترة والفلاتر والبحث.');return;}
      const summaryRows=people.map((p,index)=>{
        const evals=data.evaluations.filter(r=>String(r.personnel_id)===String(p.id));
        const summary=scoreStats(evals);
        return {
          _order:index,id:p.id,employee_code:p.employee_code,full_name:p.full_name,job_title:p.job_title,
          plant_code:p.plant_code,department:p.department,avg:summary.avg,min:summary.min,max:summary.max
        };
      });
      const summaryColumns=[
        {key:'employee_code',label:'كود الموظف',sort:true,className:'department-hr-code-cell',exportType:'text',render:r=>esc(westernText(r.employee_code))},
        {key:'full_name',label:'اسم الموظف',sort:true,className:'department-hr-text-column'},
        {key:'plant_code',label:'المصنع',sort:true,className:'department-hr-code-cell',exportType:'text'},
        {key:'department',label:'القسم',sort:true,className:'department-hr-text-column'},
        {key:'job_title',label:'الوظيفة',sort:true,className:'department-hr-text-column'},
        {key:'avg',label:'متوسط التقييم',sort:true,className:'department-hr-numeric-cell',exportType:'percentage',render:r=>esc(percentageText(r.avg))},
        {key:'max',label:'أعلى تقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.max))},
        {key:'min',label:'أقل تقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.min))}
      ];
      target.innerHTML='<p class="department-hr-note">اختر صف موظف لفتح تقريره التفصيلي دون إعادة تحميل البيانات.</p>'
        +table('person_summary',summaryColumns,sorted('person_summary',summaryRows,'employee_code'),'لا يوجد موظفون مطابقون.',{
          rowAttributes:row=>` class="department-hr-person-summary-row" data-hr-open-person="${esc(row.id)}" tabindex="0" role="button" aria-label="فتح تقرير ${esc(row.full_name)}"`
        });
      return;
    }
    const id=person.id;
    const evals=data.evaluations.filter(r=>String(r.personnel_id)===String(id)), statuses=data.statuses.filter(r=>String(r.personnel_id)===String(id)), summary=scoreStats(evals);
    const counts=new Map();
    statuses.forEach(r=>counts.set(String(r.shift_code),(counts.get(String(r.shift_code))||0)+1));
    const codeCards=`<div class="department-hr-status-counts">${data.codes.map(code=>`<article><span class="department-hr-status-dot" style="--status-color:${color(code.display_color)}"></span><div><b>${esc(westernText(code.shift_code))} — ${esc(code.description)}</b><small>عدد الحالات المسجلة</small></div><strong class="department-hr-numeric-value" dir="ltr">${integerText(counts.get(String(code.shift_code))||0)}</strong></article>`).join('')}</div>`;
    const rows=sorted('person',evals.map((r,i)=>({...r,_order:i})),'evaluation_date','desc');
    const columns=[
      {key:'evaluation_date',label:'التاريخ',sort:true,render:r=>esc(dateText(r.evaluation_date))},
      {key:'score',label:'التقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.score))},
      {key:'reason',label:'سبب التقييم',sort:true,className:'department-hr-text-cell',render:r=>esc(r.reason||'—')},
      {key:'saved_by_name',label:'المستخدم الذي حفظه',sort:true},
      {key:'saved_at',label:'وقت الحفظ',sort:true,render:r=>esc(dateTime(r.saved_at))},
      {key:'locked_at',label:'الحالة',render:()=>'<span class="department-hr-lock-badge">مقفل</span>'}
    ];
    target.innerHTML=`<div class="department-hr-person-card">
      <div><span>الكود الوظيفي</span><b class="department-hr-numeric-value" dir="ltr">${esc(westernText(person.employee_code))}</b></div><div><span>اسم الموظف</span><b>${esc(person.full_name)}</b></div>
      <div><span>الموقع</span><b>${esc(person.plant_code)}</b></div><div><span>القسم</span><b>${esc(person.department)}</b></div>
      <div><span>الوظيفة</span><b>${esc(person.job_title)}</b></div><div><span>تاريخ التعيين</span><b>${esc(dateText(person.hire_date))}</b></div>
    </div>${cards([card('عدد التقييمات',integerText(summary.count),'',true),card('المتوسط',percentageText(summary.avg),'',true),card('أقل تقييم',ratingText(summary.min),'',true),card('أعلى تقييم',ratingText(summary.max),'',true),card('أيام لها حالة مسجلة',integerText(statuses.length),'',true)],true)}
    <h3 class="department-hr-subtitle">الحالات المسجلة حسب التكويد الحالي</h3>${codeCards}
    <h3 class="department-hr-subtitle">التقييمات اليومية النهائية</h3>${table('person',columns,rows,'لا توجد تقييمات محفوظة فعليًا لهذا الموظف ضمن الفترة.')}`;
  }

  function renderAttendance(){
    const target=panel('attendance_compliance');
    if(!target) return;
    const data=current(), people=data.personnel.filter(p=>scopedPerson(p)&&searchMatch(p));
    if(!people.length){ target.innerHTML=empty('لا يوجد موظفون مطابقون للفلاتر والبحث.'); return; }
    const grouped=new Map();
    data.statuses.forEach(r=>{if(!grouped.has(r.personnel_id))grouped.set(r.personnel_id,[]);grouped.get(r.personnel_id).push(r);});
    const rows=people.map((p,i)=>{
      const items=grouped.get(p.id)||[], counts={};
      items.forEach(r=>counts[r.shift_code]=(counts[r.shift_code]||0)+1);
      return {_order:i,employee_code:p.employee_code,full_name:p.full_name,plant_code:p.plant_code,department:p.department,job_title:p.job_title,recorded:items.length,counts};
    });
    const columns=[
      {key:'employee_code',label:'الكود الوظيفي',sort:true},{key:'full_name',label:'اسم الموظف',sort:true},{key:'plant_code',label:'الموقع',sort:true},
      {key:'department',label:'القسم',sort:true},{key:'job_title',label:'الوظيفة',sort:true},{key:'recorded',label:'إجمالي الأيام المسجلة',sort:true}
    ];
    data.codes.forEach(code=>{
      const key=`code_${code.shift_code}`;
      rows.forEach(row=>row[key]=row.counts[code.shift_code]||0);
      columns.push({key,label:`${code.shift_code} — ${code.description}`,sort:true,render:r=>`<span class="department-hr-code-value"><i style="--status-color:${color(code.display_color)}"></i>${r[key]}</span>`});
    });
    target.innerHTML=`<p class="department-hr-note">تُحسب الأيام التي لها حالة مسجلة فقط. الأيام بلا سجل لا تُعامل كغياب ولا تدخل في أي نسبة.</p>${table('attendance',columns,sorted('attendance',rows,'employee_code'),'لا توجد حالات مسجلة.')}`;
  }

  function renderAbsence(){
    const target=panel('absence_violations');
    if(!target) return;
    const records=current().statuses.filter(r=>['8','9'].includes(String(r.shift_code))), affected=new Map();
    records.forEach(r=>affected.set(r.personnel_id,(affected.get(r.personnel_id)||0)+1));
    const controls=`<div class="department-hr-inline-controls"><label>طريقة العرض<select data-hr-absence-mode><option value="records"${S.absenceMode==='records'?' selected':''}>السجلات اليومية</option><option value="employees"${S.absenceMode==='employees'?' selected':''}>تجميع حسب الموظف</option></select></label></div>`;
    const summary=cards([
      card('إجمالي أيام الخصم',String(records.filter(r=>String(r.shift_code)==='8').length)),
      card('إجمالي الغياب بدون إذن',String(records.filter(r=>String(r.shift_code)==='9').length)),
      card('الموظفون المتأثرون',String(affected.size)),card('موظفون بحالات متكررة',String([...affected.values()].filter(n=>n>1).length))
    ]);
    if(!records.length){ target.innerHTML=controls+summary+empty('لا توجد سجلات فعالة للكودين 8 أو 9 ضمن الفترة.'); return; }
    if(S.absenceMode==='employees'){
      const map=new Map();
      records.forEach(r=>{
        if(!map.has(r.personnel_id))map.set(r.personnel_id,{_order:map.size,employee_code:r.employee_code,full_name:r.full_name,plant_code:r.plant_code,department:r.department,job_title:r.job_title,discount:0,absence:0,total:0});
        const item=map.get(r.personnel_id); if(String(r.shift_code)==='8')item.discount++;else item.absence++;item.total++;
      });
      const columns=[
        {key:'employee_code',label:'الكود الوظيفي',sort:true},{key:'full_name',label:'اسم الموظف',sort:true},{key:'plant_code',label:'الموقع',sort:true},
        {key:'department',label:'القسم',sort:true},{key:'job_title',label:'الوظيفة',sort:true},{key:'discount',label:'أيام الخصم',sort:true},
        {key:'absence',label:'غياب بدون إذن',sort:true},{key:'total',label:'عدد التكرارات',sort:true}
      ];
      target.innerHTML=controls+summary+table('absence_group',columns,sorted('absence_group',[...map.values()],'total','desc'),'لا توجد حالات مجمعة.'); return;
    }
    const columns=[
      {key:'work_date',label:'التاريخ',sort:true,render:r=>esc(dateText(r.work_date))},{key:'employee_code',label:'الكود الوظيفي',sort:true},
      {key:'full_name',label:'اسم الموظف',sort:true},{key:'plant_code',label:'الموقع',sort:true},{key:'department',label:'القسم',sort:true},
      {key:'job_title',label:'الوظيفة',sort:true},{key:'shift_code',label:'كود الحالة',sort:true},
      {key:'shift_description',label:'وصف الحالة',sort:true,render:r=>`<span class="department-hr-status-label"><i style="--status-color:${color(r.display_color)}"></i>${esc(r.shift_description)}</span>`}
    ];
    target.innerHTML=controls+summary+table('absence_records',columns,sorted('absence_records',records.map((r,i)=>({...r,_order:i})),'work_date','desc'),'لا توجد مخالفات.');
  }

  function renderAnalysis(){
    const target=panel('evaluation_analysis'), evals=current().evaluations;
    if(!target) return;
    if(!evals.length){ target.innerHTML=empty('لا توجد تقييمات يومية محفوظة فعليًا ضمن الفترة والفلاتر.'); return; }
    const summary=scoreStats(evals);

    const reasonColumns=[
      {key:'evaluation_date',label:'التاريخ',sort:true,render:r=>esc(dateText(r.evaluation_date))},{key:'full_name',label:'الموظف',sort:true},
      {key:'job_title',label:'الوظيفة',sort:true},{key:'score',label:'التقييم',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.score))},
      {key:'reason',label:'السبب',sort:true,className:'department-hr-text-cell',render:r=>esc(r.reason||'—')}
    ];
    target.innerHTML=cards([card('إجمالي التقييمات',integerText(summary.count),'',true),card('المتوسط',percentageText(summary.avg),'',true),card('أقل تقييم',ratingText(summary.min),'',true),card('أعلى تقييم',ratingText(summary.max),'',true)],true)
      +'<h3 class="department-hr-subtitle">أسباب التقييم</h3>'
      +table('analysis_reasons',reasonColumns,sorted('analysis_reasons',evals.map((r,i)=>({...r,_order:i})),'evaluation_date','desc'),'لا توجد أسباب مسجلة.');
  }

  function period(date,grouping){
    if(grouping==='day') return {key:date,label:dateText(date),start:date,end:date};
    if(grouping==='week'){
      const day=new Date(`${date}T00:00:00Z`).getUTCDay(), start=shift(date,-(day===0?6:day-1)), end=shift(start,6);
      return {key:start,label:`${dateText(start)} — ${dateText(end)}`,start,end};
    }
    const start=`${date.slice(0,7)}-01`, [year,month]=start.split('-').map(Number), end=new Date(Date.UTC(year,month,0)).toISOString().slice(0,10);
    return {key:start.slice(0,7),label:new Intl.DateTimeFormat('ar-EG-u-nu-latn',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${start}T00:00:00Z`)),start,end};
  }
  function renderTrend(){
    const target=panel('performance_trend'), evals=current().evaluations;
    if(!target) return;
    const controls=`<div class="department-hr-inline-controls"><label>طريقة التجميع<select data-hr-trend-grouping><option value="day"${S.trendGrouping==='day'?' selected':''}>يومي</option><option value="week"${S.trendGrouping==='week'?' selected':''}>أسبوعي</option><option value="month"${S.trendGrouping==='month'?' selected':''}>شهري</option></select></label></div>`;
    if(!evals.length){target.innerHTML=controls+empty('لا توجد تقييمات مسجلة لتكوين اتجاه أداء.');return;}
    const groups=new Map();
    evals.forEach(r=>{const p=period(r.evaluation_date,S.trendGrouping);if(!groups.has(p.key))groups.set(p.key,{...p,scores:[]});groups.get(p.key).scores.push(Number(r.score));});
    const f=filters(), completedThrough=f.to<today()?f.to:shift(today(),-1);
    const raw=[...groups.values()].sort((a,b)=>a.start.localeCompare(b.start));
    const rows=raw.map((p,i)=>{
      const avg=p.scores.reduce((a,b)=>a+b,0)/p.scores.length, previous=i?raw[i-1].scores.reduce((a,b)=>a+b,0)/raw[i-1].scores.length:null;
      return {_order:i,period:p.label,start:p.start,count:p.scores.length,avg,change:previous===null?null:avg-previous,complete:p.start>=f.from&&p.end<=completedThrough};
    });
    const complete=rows.filter(r=>r.complete), first=complete.length>=2?complete[0].avg:null, last=complete.length>=2?complete.at(-1).avg:null;
    const trend=complete.length<2?'بيانات غير كافية':Math.abs(last-first)<1e-12?'ثابت':last>first?'تحسن':'تراجع';
    const columns=[
      {key:'period',label:'الفترة',sort:true,render:r=>`${esc(r.period)}${r.complete?'':'<small class="department-hr-period-note">غير مكتملة</small>'}`},
      {key:'count',label:'عدد التقييمات',sort:true,className:'department-hr-numeric-cell',exportType:'integer',render:r=>esc(integerText(r.count))},
      {key:'avg',label:'المتوسط',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>esc(ratingText(r.avg))},
      {key:'change',label:'التغير عن الفترة السابقة',sort:true,className:'department-hr-numeric-cell',exportType:'rating',render:r=>r.change===null?'—':`<span class="${r.change>0?'positive':r.change<0?'negative':'neutral'}">${r.change>0?'+':''}${esc(ratingText(r.change))}</span>`}
    ];
    target.innerHTML=controls+cards([
      card('الاتجاه',trend,'أول وآخر فترة مكتملة بهما تقييمات'),card('الفترات المكتملة ذات البيانات',integerText(complete.length),'',true),
      card('متوسط أول فترة مكتملة',percentageText(first),'',true),card('متوسط آخر فترة مكتملة',percentageText(last),'',true)
    ],true)+'<p class="department-hr-note">لا تُضاف الفترات الخالية كصفر. المقارنة تعتمد فقط على فترات مكتملة تحتوي تقييمات محفوظة.</p>'
      +table('trend',columns,sorted('trend',rows,'start'),'لا توجد فترات تحتوي تقييمات.');
  }

  function bind(){
    const host=root();
    if(!host||host.dataset.departmentHrReportsBound==='1') return;
    host.dataset.departmentHrReportsBound='1';
    host.addEventListener('click',event=>{
      if(event.target.closest('#departmentHrApplyFiltersBtn')){event.preventDefault();S.personPreviewId='';load();return;}
      if(event.target.closest('#departmentHrRetryBtn,[data-hr-retry]')){event.preventDefault();load();return;}
      const personRow=event.target.closest('[data-hr-open-person]');
      if(personRow){event.preventDefault();S.personPreviewId=personRow.dataset.hrOpenPerson||'';renderPerson();return;}
      const button=event.target.closest('[data-hr-sort-key]');
      if(button){event.preventDefault();const report=button.dataset.hrSortReport,key=button.dataset.hrSortKey,current=S.sort[report];S.sort[report]=!current||current.key!==key?{key,direction:'asc'}:{key,direction:current.direction==='asc'?'desc':'asc'};renderAll();}
    });
    host.addEventListener('keydown',event=>{
      const personRow=event.target.closest('[data-hr-open-person]');
      if(!personRow || !['Enter',' '].includes(event.key)) return;
      event.preventDefault();S.personPreviewId=personRow.dataset.hrOpenPerson||'';renderPerson();
    });
    host.addEventListener('input',event=>{if(event.target.id==='departmentHrSearchInput'){S.search=event.target.value||'';S.personPreviewId='';renderAll();}});
    host.addEventListener('change',event=>{
      if(event.target.matches('#departmentHrPlantFilter,#departmentHrDepartmentFilter,#departmentHrJobFilter')){syncOptions();return;}
      if(event.target.matches('[data-hr-absence-mode]')){S.absenceMode=event.target.value==='employees'?'employees':'records';renderAbsence();return;}
      if(event.target.matches('[data-hr-trend-grouping]')){S.trendGrouping=['day','week','month'].includes(event.target.value)?event.target.value:'month';renderTrend();}
    });
  }
  function init(){
    if(S.initialized) return;
    const host=root(); if(!host) return;
    S.initialized=true;
    const from=$('departmentHrFromDate'),to=$('departmentHrToDate');
    if(from&&!from.value)from.value=shift(today(),-30);
    if(to&&!to.value)to.value=today();
    if(from)from.max=today();if(to)to.max=today();
    window.CustomDatePicker?.init?.($('departmentHrReportControls')||host);
    window.CustomDatePicker?.refresh?.(from);window.CustomDatePicker?.refresh?.(to);
    bind();renderAll();
  }
  function setActiveTab(key){if(!window.PermissionRuntime?.any('department_personnel.hr_reports.'+key+'.view')) return;if(TABS.includes(key))S.activeTab=key;init();renderAll();}
  window.DepartmentHrReports=Object.freeze({
    init,load,setActiveTab,
    getState:()=>({...S,controller:null,data:S.data?{counts:S.data.counts,personnel:arr(S.data.personnel).length,statusCodes:arr(S.data.status_codes).length,statuses:arr(S.data.statuses).length,evaluations:arr(S.data.evaluations).length}:null})
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
