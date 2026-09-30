/* P15.5: passive reviewer comparison; existing inventory business actions stay in app.js. */
'use strict';
(() => {
  const state={versionId:'',sequence:0,kind:'opening',file:null,matrix:null,results:{},notes:{},busy:false,context:null};
  const byId=id=>document.getElementById(id);
  const field=key=>byId('balanceMatch_'+key);
  const label=()=>state.kind==='opening'?'الرصيد الإفتتاحي':'الرصيد الفعلي';
  const can=(key)=>hasCanonicalPermission('inventory.count.balance_match.'+key,[inventoryCountReadInputs().plantCode]);
  const canView=(kind=state.kind)=>['opening','physical'].includes(kind)&&can('view')&&can(kind+'.view');
  const canAction=(action,kind=state.kind)=>canView(kind)&&can(kind+'.'+action);
  function requireAction(action,kind=state.kind){
    if(canAction(action,kind))return true;
    notice('لا تملك صلاحية هذا الإجراء في تبويب المطابقة والمصنع المحددين.',true);return false;
  }
  const aliases={
    code:['كود الصنف','كود المادة','المادة','material','material code','material number'],
    name:['وصف الصنف','وصف المادة','اسم الصنف','material description','description'],
    plant:['المصنع','كود المصنع','plant'],warehouse:['المخزن','كود المخزن','storage location','sloc'],
    opening:['رصيد SAP','SAP balance','الرصيد الإفتتاحي','الرصيد الافتتاحي','رصيد أول','opening balance','الرصيد','الرصيد المرفوع','balance','quantity','unrestricted'],
    physical:['رصيد SAP','SAP balance','الرصيد الفعلي','physical balance','الرصيد','الرصيد المرفوع','balance','quantity','unrestricted']
  };
  const headerKey=value=>String(value??'').trim().toLowerCase().replace(/[أإآ]/g,'ا').replace(/\s+/g,' ');
  const esc=value=>escapeHtml(String(value??''));
  const qty=value=>new Intl.NumberFormat('en-US',{minimumFractionDigits:3,maximumFractionDigits:9}).format(Number(value));
  function notice(message,error=false){const node=field('notice');node.textContent=message;node.dataset.error=String(error);}
  function busy(value){
    state.busy=value;
    byId('inventoryBalanceMatchPage').setAttribute('aria-busy',String(value));
    byId('inventoryBalanceMatchPage').querySelectorAll('input,select,button:not([data-bm-back])').forEach(x=>x.disabled=value);
    field('file').disabled=value || !state.context || !canAction('upload');
    field('mapping').querySelectorAll('input,select').forEach(x=>x.disabled=value || !canAction('upload'));
    field('template').disabled=value || !canAction('download_template');
    field('compare').disabled=value || !state.context || !state.matrix || !canAction('upload') || !canAction('compare');
  }
  function clearFile(){state.file=null;state.matrix=null;field('file').value='';field('mapping').hidden=true;field('compare').disabled=true;}
  function isCurrent(seq,version=state.versionId){
    return seq===state.sequence && version===state.versionId && version===String(INVENTORY_COUNT_STATE.versionId||'') && canView() && !byId('inventoryBalanceMatchPage').hidden;
  }
  function close(){
    state.sequence++;state.versionId='';state.results={};state.notes={};state.context=null;clearFile();
    byId('inventoryBalanceMatchPage').hidden=true;byId('inventory_closing').classList.remove('balance-match-open');
    field('body').replaceChildren();field('summary').textContent='';field('ignored').hidden=true;field('ignoredText').textContent='';
    byId('inventoryBalanceMatchBtn')?.focus({preventScroll:true});
  }
  function render(){
    byId('inventoryBalanceMatchPage').dataset.bmKind=state.kind;
    const result=state.results[state.kind];
    field('systemHeader').textContent=label();
    const differences=result?.differences||[];
    field('body').innerHTML=differences.length ? differences.map(row=>`<tr><td>${esc(row.material_code)}</td><td>${esc(row.material_name)}</td><td>${esc(row.uom)}</td><td class="bm-number">${qty(row.system_balance)}</td><td class="bm-number">${qty(row.uploaded_balance)}</td><td class="bm-number ${Number(row.difference)>0?'bm-positive':'bm-negative'}">${Number(row.difference)>0?'+':''}${qty(row.difference)}</td></tr>`).join('') : `<tr><td colspan="6" class="bm-empty">${result?'لا توجد فروق في الأصناف التي تمت مقارنتها.':'ارفع تقرير Excel لبدء المطابقة.'}</td></tr>`;
    field('summary').textContent=result ? `أصناف تمت مقارنتها: ${result.uploaded_count} · متطابق: ${result.matched_count} · به فرق: ${differences.length} · وقت المطابقة: ${new Date(result.compared_at).toLocaleString('ar-EG')}` : 'لم تُحفظ مطابقة لهذا التبويب بعد.';
    field('warning').textContent=[result?.stale?'تغيّرت بيانات الجرد منذ هذه المطابقة؛ ارفع التقرير مجددًا لقراءة الأرصدة الحالية.':'',result?.unreported_count?`${result.unreported_count} صنف من الجرد غير موجود في التقرير؛ لم يدخل في المقارنة ولم يُعتبر رصيده صفرًا.`:''].filter(Boolean).join(' ');
    field('warning').hidden=!field('warning').textContent;
    const ignored=state.notes[state.kind]||[];
    field('ignored').hidden=!ignored.length;
    field('ignoredSummary').textContent=`ملاحظة: ${ignored.length} صف برصيد غير صفر لأصناف غير موجودة في نطاق الجرد الحالي — لم تدخل في المطابقة.`;
    field('ignoredText').textContent=ignored.map(row=>`${row.material_code}${row.material_name?` — ${row.material_name}`:''}: رصيد SAP ${qty(row.uploaded_balance)}`).join('؛ ');
    byId('inventoryBalanceMatchPage').querySelectorAll('[data-bm-tab]').forEach(x=>{const active=x.dataset.bmTab===state.kind;x.setAttribute('aria-selected',String(active));x.tabIndex=active?0:-1;});
    field('panel').setAttribute('aria-labelledby','balanceMatch_tab_'+state.kind);
    window.PermissionUI?.apply();
  }
  async function request(rows=null){
    if(!canView() || (rows!==null&&(!canAction('upload')||!canAction('compare'))))throw new Error('لا تملك صلاحية عرض المطابقة أو حفظها في هذا التبويب.');
    const {data,error}=await WarehouseDB.client.rpc('inventory_balance_match',{p_version_id:state.versionId,p_kind:state.kind,p_rows:rows});
    if(error) throw error;
    if(!data || !['ok','input_review_required','no_comparable_rows'].includes(data.status)) throw new Error('استجابة المطابقة غير مكتملة.');
    return data;
  }
  function errorMessage(error){
    if(error?.code==='PGRST202' || /could not find the function/i.test(error?.message||'')) return 'يلزم تشغيل ملف تثبيت P15.5 على Supabase أولًا.';
    return error?.message || 'تعذر الاتصال لإتمام المطابقة. أعد المحاولة.';
  }
  async function load(){
    const seq=++state.sequence;
    busy(true);notice('جاري قراءة آخر نتيجة محفوظة...');
    try{
      const data=await request();if(!isCurrent(seq)) return;
      state.context=data.context;state.results[state.kind]=data.result;state.notes[state.kind]=[];
      field('context').textContent=`تاريخ الجرد: ${formatDisplayDate(data.context.inventory_date,'—')} · المصنع: ${data.context.plant_code} · المخزن: ${data.context.warehouse_code}`;
      render();notice('المطابقة للمراجعة فقط؛ لا تغيّر أي رصيد ولا توقف إجراءات الجرد.');
    }catch(error){if(isCurrent(seq)){state.context=null;clearFile();state.results[state.kind]=null;field('context').textContent='تعذر التحقق من نطاق الجرد المفتوح.';render();notice(errorMessage(error),true);}}
    finally{if(isCurrent(seq)) busy(false);}
  }
  async function open(){
    if(!INVENTORY_COUNT_STATE.versionId || INVENTORY_COUNT_STATE.loading || INVENTORY_COUNT_STATE.status==='loading'){
      showInventoryCountToast('افتح مستند الجرد الحالي أولًا.','error');return;
    }
    const scope=inventoryCountReadInputs();
    const firstKind=['opening','physical'].find(kind=>canView(kind));
    if(!hasCanonicalPermission('inventory.count.view',[scope.plantCode])||!firstKind){showInventoryCountToast('لا تملك صلاحية عرض مطابقة هذا الجرد.','error');return;}
    if(!window.WarehouseDB?.ready){showInventoryCountToast('قاعدة البيانات غير متصلة.','error');return;}
    state.versionId=String(INVENTORY_COUNT_STATE.versionId);state.kind=firstKind;state.results={};state.notes={};state.context=null;clearFile();render();
    byId('inventory_closing').classList.add('balance-match-open');byId('inventoryBalanceMatchPage').hidden=false;
    field('context').textContent='جاري التحقق من الجرد المفتوح...';byId('balanceMatch_title').focus({preventScroll:true});
    await load();
  }
  async function tab(kind){if(state.busy || kind===state.kind || !canView(kind)) return;state.kind=kind;clearFile();render();await load();}
  function mapHeaders(){
    const index=Number(field('header').value)-1;
    const headers=state.matrix?.[index]||[];
    if(!headers.some(x=>String(x).trim())){notice('اختر صفًا يحتوي على أسماء الأعمدة.',true);field('compare').disabled=true;return;}
    const options=headers.map((value,index)=>`<option value="${index}">${esc(XLSX.utils.encode_col(index))} — ${esc(String(value||'عمود بلا عنوان').slice(0,120))}</option>`).join('');
    for(const key of ['code','name','balance','plant','warehouse']){
      const select=field(key);select.innerHTML='<option value="">'+(['plant','warehouse'].includes(key)?'غير موجود — الملف للمخزن الحالي فقط':'اختر العمود')+'</option>'+options;
      const names=(aliases[key==='balance'?state.kind:key]||[]).map(headerKey);
      const found=headers.findIndex(x=>names.includes(headerKey(x)));select.value=found>=0?String(found):'';
    }
    field('compare').disabled=false;
    notice('راجع الأعمدة ثم اضغط «مطابقة وحفظ الفروق». كل رفع ناجح يستبدل نتيجة هذا التبويب فقط.');
  }
  async function parseFile(sheetName){
    if(!state.context){notice('تعذر تجهيز نطاق الجرد للمطابقة. أعد فتح المطابقة؛ وإذا استمرت الرسالة راجع خطأ الاتصال الظاهر قبل رفع الملف.',true);return;}
    if(!state.file || state.busy || !requireAction('upload')) return;
    const seq=++state.sequence,selectedFile=state.file;busy(true);
    try{
      const buffer=await selectedFile.arrayBuffer();if(!isCurrent(seq))return;
      // Reuse the existing bounded worker; no main-thread Excel parsing or database staging.
      const data=await parseExcelBufferWithWorker(buffer,'balance_match',{sheetName});
      if(!isCurrent(seq))return;
      state.matrix=data.matrix;
      field('sheet').innerHTML=data.sheetNames.map(name=>`<option value="${esc(name)}">${esc(name)}</option>`).join('');field('sheet').value=data.sheetName;
      const known=aliases.code.map(headerKey);
      const header=state.matrix.slice(0,30).findIndex(row=>row.some(x=>known.includes(headerKey(x))));
      field('header').max=String(Math.min(state.matrix.length,100));field('header').value=String(header>=0?header+1:1);
      field('mapping').hidden=false;mapHeaders();
    }catch(error){if(isCurrent(seq)){clearFile();notice(error?.excelWorkerInfrastructure?'تعذر تشغيل قارئ Excel. حدّث الصفحة وتأكد من رفع ملف excel-parser-worker.js الجديد.':errorMessage(error),true);}}
    finally{if(isCurrent(seq))busy(false);}
  }
  function numeric(value,row){
    let text=String(value??'').trim().replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/٫/g,'.').replace(/٬/g,',');
    if(text.endsWith('-'))text='-'+text.slice(0,-1).trim();
    if(/^\(.*\)$/.test(text))text='-'+text.slice(1,-1);
    if(/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(text))text=text.replace(/,/g,'');
    if(/^[-+]?\.\d+$/.test(text))text=text.replace('.','0.');
    if(text.startsWith('+'))text=text.slice(1);
    if(!/^-?\d{1,12}(\.\d{1,6})?$/.test(text))throw new Error(`رصيد غير صالح في صف Excel رقم ${row}: استخدم رقمًا حتى 6 منازل عشرية؛ الخانة الفارغة ليست صفرًا.`);
    return text;
  }
  function collect(){
    if(!state.context || !state.matrix)throw new Error('أعد فتح المطابقة وارفع الملف.');
    const map=Object.fromEntries(['code','name','balance','plant','warehouse'].map(key=>[key,field(key).value===''?null:Number(field(key).value)]));
    if(['code','name','balance'].some(key=>map[key]===null))throw new Error('اختر أعمدة كود الصنف ووصف الصنف ورصيد SAP.');
    const chosen=Object.values(map).filter(x=>x!==null);if(new Set(chosen).size!==chosen.length)throw new Error('يجب اختيار عمود مختلف لكل حقل.');
    const start=Number(field('header').value);
    if(!Number.isInteger(start)||start<1||start>=state.matrix.length||start>100)throw new Error('رقم صف العناوين غير صالح أو لا توجد بيانات بعده.');
    const rows=[];let filtered=0;
    for(let i=start;i<state.matrix.length;i++){
      const row=state.matrix[i];if(!row.some(value=>String(value??'').trim()!==''))continue;
      if((map.plant!==null&&String(row[map.plant]??'').trim().toUpperCase()!==state.context.plant_code)||(map.warehouse!==null&&String(row[map.warehouse]??'').trim().toUpperCase()!==state.context.warehouse_code)){filtered++;continue;}
      const code=String(row[map.code]??'').trim(),name=String(row[map.name]??'').trim();
      if(!code||code.length>80||name.length>500)throw new Error(`كود الصنف غير صالح أو الوصف أطول من 500 حرف في صف ${i+1}. احذف صفوف الإجمالي إن وجدت.`);
      // The server checks duplicate known items after discarding items outside this inventory.
      rows.push({material_code:code,material_name:name,balance:numeric(row[map.balance],i+1)});
    }
    if(!rows.length)throw new Error('لا توجد أصناف تخص المصنع والمخزن الحاليين في البيانات المحددة.');
    return {rows,filtered};
  }
  async function compare(){
    if(state.busy || !requireAction('upload') || !requireAction('compare'))return;
    let payload;try{payload=collect();}catch(error){notice(errorMessage(error),true);return;}
    const seq=++state.sequence;busy(true);notice('جاري مقارنة أرصدة السيرفر وحفظ الفروق فقط...');
    try{
      const data=await request(payload.rows);if(!isCurrent(seq))return;
      state.notes[state.kind]=data.ignored_nonzero||[];
      if(data.status==='input_review_required'){
        render();
        notice('لم تُستبدل النتيجة السابقة. راجع الملف: '+data.issues.map(x=>`${x.code}: ${x.reason}`).join('؛ '),true);return;
      }
      if(data.status==='no_comparable_rows'){
        render();notice('لا توجد أصناف في الملف تخص نطاق الجرد الحالي؛ لم تتغير النتيجة المحفوظة.');return;
      }
      state.results[state.kind]=data.result;clearFile();render();
      notice(`تمت المطابقة وحُفظت الفروق فقط.${payload.filtered?` تم استبعاد ${payload.filtered} صف يخص مصنعًا أو مخزنًا آخر.`:''}`);
    }catch(error){if(isCurrent(seq))notice(errorMessage(error)+' إذا انقطع الاتصال بعد الحفظ، افتح التبويب مجددًا لمعرفة آخر نتيجة.',true);}
    finally{payload=null;if(isCurrent(seq))busy(false);}
  }
  async function template(){
    const kind=state.kind;
    if(!requireAction('download_template',kind))return;
    try{
      const response=await fetch(`assets/templates/inventory-balance-match/${kind}.xlsx?v=p15-5-t2-20260929-1`);
      if(!response.ok)throw new Error('تعذر تنزيل القالب. تأكد من رفع ملفَي قوالب المطابقة ثم أعد المحاولة.');
      const blob=await response.blob();
      if(!canAction('download_template',kind))return;
      await saveBlobWithPicker(blob,`مطابقة-${kind}.xlsx`,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }catch(error){if(error.name!=='AbortError')notice(errorMessage(error),true);}
  }
  function init(){
    const section=byId('inventory_closing'),button=byId('inventoryBalanceMatchBtn');if(!section||!button)return;
    const page=document.createElement('article');page.id='inventoryBalanceMatchPage';page.className='panel';page.hidden=true;
    page.innerHTML=`<header class="bm-head"><div><h2 id="balanceMatch_title" tabindex="-1">مطابقة الأرصدة</h2><p id="balanceMatch_context"></p></div><button type="button" data-bm-back>الرجوع إلى الجرد</button></header>
      <div class="bm-tabs" role="tablist" aria-label="نوع مطابقة الأرصدة"><button type="button" role="tab" id="balanceMatch_tab_opening" data-bm-tab="opening" aria-controls="balanceMatch_panel" aria-selected="true">مطابقة الرصيد الإفتتاحي</button><button type="button" role="tab" id="balanceMatch_tab_physical" data-bm-tab="physical" aria-controls="balanceMatch_panel" aria-selected="false" tabindex="-1">مطابقة الرصيد الفعلي</button></div>
      <section id="balanceMatch_panel" role="tabpanel" aria-labelledby="balanceMatch_tab_opening"><div class="bm-upload"><label>تقرير Excel<input type="file" id="balanceMatch_file" accept=".xlsx,.xls" /></label><button type="button" id="balanceMatch_template">تنزيل قالب Excel</button><p>أعمدة الملف: كود الصنف / وصف الصنف / رصيد SAP. وحدة القياس من سيستم المراجعة؛ أدخل رصيد SAP بنفس وحدة الصنف المسجلة فيه. ارفع صفًا واحدًا لكل صنف للمخزن والتاريخ الموضّحين أعلاه. إذا تضمن الملف مخازن أخرى، حدّد أعمدة المصنع والمخزن.</p></div>
      <div id="balanceMatch_mapping" class="bm-mapping" hidden><label>ورقة العمل<select id="balanceMatch_sheet"></select></label><label>رقم صف العناوين<input id="balanceMatch_header" type="number" min="1" max="100" value="1" /></label><label>كود الصنف<select id="balanceMatch_code"></select></label><label>وصف الصنف<select id="balanceMatch_name"></select></label><label>رصيد SAP<select id="balanceMatch_balance"></select></label><label>المصنع (اختياري)<select id="balanceMatch_plant"></select></label><label>المخزن (اختياري)<select id="balanceMatch_warehouse"></select></label></div>
      <div class="bm-action"><button id="balanceMatch_compare" type="button" disabled>مطابقة وحفظ الفروق</button><span>تُحفظ آخر نتيجة لكل تبويب؛ الصفوف المتطابقة وملف الرفع لا تُخزّن.</span></div>
      <p id="balanceMatch_notice" role="status" aria-live="polite"></p><p id="balanceMatch_warning" class="bm-warning" hidden></p><p id="balanceMatch_summary"></p>
      <details id="balanceMatch_ignored" class="bm-warning" hidden><summary id="balanceMatch_ignoredSummary"></summary><p id="balanceMatch_ignoredText"></p></details>
      <div class="bm-table-wrap" tabindex="0" aria-label="جدول فروق الأرصدة"><table id="balanceMatch_table" data-no-universal-table="1"><thead><tr><th scope="col">كود الصنف</th><th scope="col">وصف الصنف</th><th scope="col">وحدة القياس</th><th scope="col" id="balanceMatch_systemHeader">الرصيد الإفتتاحي</th><th scope="col">رصيد SAP</th><th scope="col">الفرق (SAP − السيستم)</th></tr></thead><tbody id="balanceMatch_body"></tbody></table></div></section>`;
    section.appendChild(page);button.addEventListener('click',open);page.querySelector('[data-bm-back]').addEventListener('click',close);
    page.querySelectorAll('[data-bm-tab]').forEach(button=>{
      button.addEventListener('click',()=>tab(button.dataset.bmTab));
      button.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();if(state.busy)return;const kinds=['opening','physical'].filter(kind=>canView(kind));if(!kinds.length)return;const kind=event.key==='Home'?kinds[0]:event.key==='End'?kinds.at(-1):kinds.find(kind=>kind!==state.kind)||state.kind;byId('balanceMatch_tab_'+kind).focus();tab(kind);}});
    });
    field('file').addEventListener('change',()=>{
      if(!requireAction('upload'))return;
      const file=field('file').files?.[0];if(!file)return;
      if(!/\.(xlsx|xls)$/i.test(file.name)||file.size>10*1024*1024){clearFile();notice('اختر ملف XLSX أو XLS بحجم لا يتجاوز 10 MB.',true);return;}
      state.file=file;state.matrix=null;parseFile();
    });
    field('sheet').addEventListener('change',()=>parseFile(field('sheet').value));field('header').addEventListener('change',mapHeaders);
    field('compare').addEventListener('click',compare);field('template').addEventListener('click',template);
    window.addEventListener('audit-permission-runtime-updated',()=>{
      if(!page.hidden){if(!canView())close();else {if(!canAction('upload'))clearFile();render();busy(state.busy);}}
    });
    const observer=new MutationObserver(()=>{if(!page.hidden&&(!section.classList.contains('active-section')||byId('appShell')?.classList.contains('app-hidden')))close();});
    observer.observe(section,{attributes:true,attributeFilter:['class']});
    observer.observe(byId('appShell'),{attributes:true,attributeFilter:['class']});
  }
  document.addEventListener('DOMContentLoaded',init);
})();
