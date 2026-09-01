(function(){
  'use strict';

  const SECTION_KEY='department_loading_errors';
  const ROOT_ID='departmentLoadingErrorsApp';
  const MODAL_ID='departmentLoadingErrorModal';
  const PLANT_CODES=Object.freeze(['WF01','EL01','EL02']);
  const ERROR_TYPE_LABELS=Object.freeze({surplus:'زيادة',shortage:'عجز'});
  const VIEW_STATUS=Object.freeze({completed:'completed',pending:'pending_review'});
  const state={
    activePlant:'WF01',view:'completed',requestToken:0,loading:false,saving:false,
    documents:[],rows:[],lineSequence:0,lines:[],modalMode:'register',currentDocument:null,
    personnelByPlant:new Map(),products:null,lastTrigger:null
  };

  const byId=id=>document.getElementById(id);
  const root=()=>byId(ROOT_ID);
  const modal=()=>byId(MODAL_ID);
  const clean=value=>String(value??'').trim();
  const normalizeCode=value=>clean(value).toUpperCase();
  const escapeText=value=>{
    if(typeof window.escapeHtml==='function') return window.escapeHtml(String(value??''));
    return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  };
  const hasAction=action=>typeof window.hasPermission==='function' ? window.hasPermission(SECTION_KEY,action) : false;
  const canView=()=>hasAction('view');
  const canAdd=()=>hasAction('add')||hasAction('manage');
  const canReview=()=>hasAction('approve')||hasAction('manage');
  const plantCatalog=()=>typeof window.getPlantsCatalog==='function' ? window.getPlantsCatalog() : [];
  const plantName=code=>{
    const key=normalizeCode(code);
    const row=plantCatalog().find(item=>normalizeCode(item?.code)===key);
    return clean(row?.name)||key;
  };
  const displayDate=value=>window.CustomDatePicker?.formatDisplayDate?.(value,value)||clean(value)||'—';
  const registrationDate=value=>{
    if(!value) return '—';
    const parsed=new Date(value);
    if(Number.isNaN(parsed.getTime())) return clean(value)||'—';
    return new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',year:'numeric',month:'2-digit',day:'2-digit'}).format(parsed);
  };
  const documentPlantCode=()=>normalizeCode(state.currentDocument?.plant_code||state.activePlant);

  function setStatus(message,type=''){
    const element=byId('departmentLoadingErrorsStatus');
    if(!element) return;
    element.className=`upload-status department-loading-errors-status ${type}`.trim();
    element.textContent=message||'';
  }

  function setModalStatus(message,type=''){
    const element=byId('departmentLoadingErrorModalStatus');
    if(!element) return;
    element.className=`department-loading-error-modal-status ${type}`.trim();
    element.textContent=message||'';
    element.hidden=!message;
  }

  function renderShell(){
    const host=root();
    if(!host || host.dataset.loadingErrorsReady==='1') return;
    host.dataset.loadingErrorsReady='1';
    host.innerHTML=`
      <div class="department-loading-errors-tabs" role="tablist" aria-label="مصانع سجل أخطاء التحميل"></div>
      <div class="department-loading-errors-toolbar glass-soft">
        <div class="department-loading-errors-context"><span>المصنع النشط</span><strong id="departmentLoadingErrorsPlantLabel">—</strong></div>
        <div class="department-loading-errors-actions" id="departmentLoadingErrorsActions"></div>
      </div>
      <div class="upload-status department-loading-errors-status" id="departmentLoadingErrorsStatus" role="status" aria-live="polite"></div>
      <div class="table-wrap department-loading-errors-table-wrap">
        <table id="departmentLoadingErrorsTable" data-no-universal-table="1"><thead></thead><tbody></tbody></table>
      </div>`;
    host.addEventListener('click',handleRootClick);
    renderView();
  }

  function renderTabs(){
    const tabs=root()?.querySelector('.department-loading-errors-tabs');
    if(!tabs) return;
    tabs.innerHTML=PLANT_CODES.map(code=>{
      const active=code===state.activePlant;
      return `<button type="button" role="tab" class="department-loading-errors-tab${active?' active':''}" data-loading-errors-plant="${code}" aria-selected="${active?'true':'false'}" tabindex="${active?'0':'-1'}">${escapeText(code)} — ${escapeText(plantName(code))}</button>`;
    }).join('');
    const label=byId('departmentLoadingErrorsPlantLabel');
    if(label) label.textContent=`${state.activePlant} — ${plantName(state.activePlant)}`;
  }

  function renderView(){
    const isPending=state.view==='pending';
    const section=root()?.closest('.department-loading-errors-panel');
    const title=section?.querySelector('.department-screen-head h2');
    const hint=section?.querySelector('.department-screen-head .hint');
    if(title) title.textContent=isPending?'أخطاء تحتاج مراجعة':'سجل أخطاء التحميل';
    if(hint) hint.textContent=isPending
      ?'الأخطاء المسجلة التي تنتظر استكمال بيانات المراجعة والإجراء.'
      :'عرض أخطاء التحميل التي اكتملت مراجعتها حسب المصنع.';
    const actions=byId('departmentLoadingErrorsActions');
    if(actions){
      actions.innerHTML=isPending
        ?`<button class="secondary department-loading-error-back" type="button" data-loading-errors-action="completed">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg><span>العودة لسجل أخطاء التحميل</span>
          </button>
          <button class="primary department-loading-error-open" id="departmentLoadingErrorRegisterBtn" type="button" data-loading-errors-action="register">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>تسجيل خطأ</span>
          </button>`
        :`<button class="primary department-loading-error-open" id="departmentLoadingErrorPendingBtn" type="button" data-loading-errors-action="pending">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11h6M9 15h4M8 3h8l3 3v15H5V3h3Zm0 0v4h8V3"/></svg><span>أخطاء تحتاج مراجعة</span>
          </button>`;
    }
    const table=byId('departmentLoadingErrorsTable');
    if(table){
      table.classList.toggle('is-pending',isPending);
      table.querySelector('thead').innerHTML=isPending
        ?'<tr><th>رقم سجل الخطأ</th><th>كود الصنف</th><th>اسم الصنف</th><th>رقم أمر البيع</th><th>نوع الخطأ</th><th>اسم العميل</th><th>ملاحظات</th><th>استكمال</th></tr>'
        :'<tr><th>رقم سجل الخطأ</th><th>كود أمين المخزن</th><th>اسم أمين المخزن</th><th>كود الصنف</th><th>اسم الصنف</th><th>نوع الخطأ</th><th>رقم أمر البيع</th><th>اسم العميل</th><th>رقم السيارة</th><th>تاريخ الخطأ</th><th>تاريخ تسجيل الخطأ</th><th>المصنع</th><th>ملاحظات</th><th>الإجراء</th></tr>';
    }
    renderTabs();
    renderRows();
    syncPermissionState();
  }

  function syncPermissionState(){
    const registerButton=byId('departmentLoadingErrorRegisterBtn');
    if(registerButton){
      const allowed=canAdd();
      registerButton.disabled=!allowed;
      registerButton.classList.toggle('permission-disabled',!allowed);
      registerButton.title=allowed?'':'لا تملك صلاحية تسجيل خطأ تحميل';
    }
    root()?.querySelectorAll('[data-loading-errors-action="review"]').forEach(button=>{
      const allowed=canReview();
      button.disabled=!allowed;
      button.classList.toggle('permission-disabled',!allowed);
      button.title=allowed?'':'لا تملك صلاحية استكمال ومراجعة أخطاء التحميل';
    });
  }

  function handleRootClick(event){
    const tab=event.target.closest('[data-loading-errors-plant]');
    if(tab){
      const code=normalizeCode(tab.dataset.loadingErrorsPlant);
      if(PLANT_CODES.includes(code) && code!==state.activePlant){
        state.activePlant=code;
        clearLoadedRows();
        renderView();
        loadRecords();
      }
      return;
    }
    const actionButton=event.target.closest('[data-loading-errors-action]');
    const action=actionButton?.dataset.loadingErrorsAction;
    if(action==='pending'){switchView('pending');return;}
    if(action==='completed'){switchView('completed');return;}
    if(action==='register'){openRegisterModal(actionButton);return;}
    if(action==='review') openReviewModal(actionButton.dataset.documentId,actionButton);
  }

  function clearLoadedRows(){state.documents=[];state.rows=[];}

  function switchView(view,options={}){
    if(!['completed','pending'].includes(view)) return;
    state.view=view;
    clearLoadedRows();
    renderView();
    loadRecords(options);
  }

  function flattenDocuments(documents){
    const rows=[];
    (documents||[]).forEach(documentRow=>{
      const lines=Array.isArray(documentRow.department_loading_error_lines)
        ?documentRow.department_loading_error_lines.slice().sort((a,b)=>Number(a.line_no||0)-Number(b.line_no||0))
        :[];
      lines.forEach((line,lineIndex)=>rows.push({document:documentRow,line,lineIndex,lineCount:lines.length}));
    });
    return rows;
  }

  function renderRows(){
    const tbody=byId('departmentLoadingErrorsTable')?.querySelector('tbody');
    if(!tbody) return;
    const isPending=state.view==='pending';
    const columns=isPending?8:14;
    if(state.loading){
      tbody.innerHTML=`<tr><td colspan="${columns}" class="empty-row">${isPending?'جاري تحميل الأخطاء التي تحتاج مراجعة...':'جاري تحميل سجل أخطاء التحميل...'}</td></tr>`;
      return;
    }
    if(!state.rows.length){
      tbody.innerHTML=`<tr><td colspan="${columns}" class="empty-row">${isPending?'لا توجد أخطاء تحتاج مراجعة لهذا المصنع.':'لا توجد أخطاء تحميل مكتملة المراجعة لهذا المصنع.'}</td></tr>`;
      return;
    }
    tbody.innerHTML=isPending ? renderPendingRows() : renderCompletedRows();
    syncPermissionState();
  }

  function renderPendingRows(){
    return state.rows.map(({document:header,line,lineIndex,lineCount})=>{
      const type=ERROR_TYPE_LABELS[line.error_type]||clean(line.error_type)||'—';
      const typeClass=line.error_type==='surplus'?'surplus':line.error_type==='shortage'?'shortage':'';
      const reviewCell=lineIndex===0
        ?`<td rowspan="${lineCount}" class="department-loading-error-review-cell"><button type="button" class="primary department-loading-error-review-btn" data-loading-errors-action="review" data-document-id="${escapeText(header.id)}">استكمال البيانات</button></td>`
        :'';
      return `<tr>
        <td dir="ltr">${escapeText(header.document_no)}</td><td dir="ltr">${escapeText(line.material_code)}</td><td>${escapeText(line.material_name)}</td>
        <td dir="ltr">${escapeText(line.sales_order_no)}</td><td><span class="department-loading-error-type ${typeClass}">${escapeText(type)}</span></td>
        <td>${escapeText(line.customer_name)}</td><td class="department-loading-errors-text-cell">${escapeText(line.notes||'—')}</td>${reviewCell}
      </tr>`;
    }).join('');
  }

  function renderCompletedRows(){
    return state.rows.map(({document:header,line})=>{
      const type=ERROR_TYPE_LABELS[line.error_type]||clean(line.error_type)||'—';
      const typeClass=line.error_type==='surplus'?'surplus':line.error_type==='shortage'?'shortage':'';
      const plant=`${clean(header.plant_code)} — ${plantName(header.plant_code)}`;
      return `<tr>
        <td dir="ltr">${escapeText(header.document_no)}</td><td dir="ltr">${escapeText(header.storekeeper_code_snapshot)}</td><td>${escapeText(header.storekeeper_name_snapshot)}</td>
        <td dir="ltr">${escapeText(line.material_code)}</td><td>${escapeText(line.material_name)}</td><td><span class="department-loading-error-type ${typeClass}">${escapeText(type)}</span></td>
        <td dir="ltr">${escapeText(line.sales_order_no)}</td><td>${escapeText(line.customer_name)}</td><td dir="auto">${escapeText(header.vehicle_no)}</td>
        <td>${escapeText(displayDate(header.error_date))}</td><td>${escapeText(registrationDate(header.created_at))}</td><td>${escapeText(plant)}</td>
        <td class="department-loading-errors-text-cell">${escapeText(line.notes||'—')}</td><td class="department-loading-errors-text-cell">${escapeText(header.action_text)}</td>
      </tr>`;
    }).join('');
  }

  async function loadRecords(options={}){
    renderShell();
    if(!canView()) return false;
    const token=++state.requestToken;
    const requestedPlant=state.activePlant;
    const requestedView=state.view;
    state.loading=true;
    renderRows();
    setStatus(requestedView==='pending'?'جاري تحميل الأخطاء التي تحتاج مراجعة...':'جاري تحميل سجل أخطاء التحميل...');
    if(!window.WarehouseDB?.ready){
      state.loading=false;clearLoadedRows();renderRows();
      setStatus('Supabase غير متصل. تعذر تحميل أخطاء التحميل.','err');
      return false;
    }
    try{
      if(typeof window.loadPlantsCatalog==='function') await window.loadPlantsCatalog();
      if(token!==state.requestToken || requestedPlant!==state.activePlant || requestedView!==state.view) return false;
      renderTabs();
      const {data,error}=await window.WarehouseDB.client
        .from('department_loading_error_documents')
        .select('id,document_no,plant_code,status,storekeeper_code_snapshot,storekeeper_name_snapshot,error_date,vehicle_no,action_text,created_by,created_at,reviewed_by,reviewed_at,department_loading_error_lines(id,line_no,material_code,material_name,error_type,sales_order_no,customer_name,notes,created_at)')
        .eq('plant_code',requestedPlant).eq('status',VIEW_STATUS[requestedView])
        .order('created_at',{ascending:false}).order('document_no',{ascending:false});
      if(error) throw error;
      if(token!==state.requestToken || requestedPlant!==state.activePlant || requestedView!==state.view) return false;
      state.documents=data||[];
      state.rows=flattenDocuments(state.documents);
      state.loading=false;
      renderRows();
      const label=requestedView==='pending'?'قائمة المراجعة':'السجل المكتمل';
      setStatus(options.successMessage||`تم تحميل ${state.rows.length} سطر من ${label} للمصنع ${requestedPlant}.`,options.successMessage?'ok':'');
      return true;
    }catch(error){
      if(token!==state.requestToken) return false;
      console.error('[department-loading-errors] load failed',error);
      clearLoadedRows();state.loading=false;renderRows();
      setStatus(`تعذر تحميل أخطاء التحميل: ${error?.message||error}`,'err');
      return false;
    }
  }

  function createLine(){
    state.lineSequence+=1;
    return {key:`line-${state.lineSequence}`,materialCode:'',materialName:'',errorType:'',salesOrderNo:'',customerName:'',notes:''};
  }

  function ensureModal(){
    if(modal()) return modal();
    const element=document.createElement('div');
    element.id=MODAL_ID;
    element.className='department-loading-error-modal app-liquid-modal-backdrop';
    element.hidden=true;
    element.innerHTML=`
      <section class="department-loading-error-dialog app-liquid-modal" role="dialog" aria-modal="true" aria-labelledby="departmentLoadingErrorModalTitle" dir="rtl">
        <header class="department-loading-error-modal-head app-liquid-modal__header">
          <div><span>إدارة أفراد القسم</span><h2 class="app-liquid-modal__title" id="departmentLoadingErrorModalTitle"></h2></div>
          <button type="button" class="app-liquid-modal__close" data-loading-error-modal-action="close" aria-label="إغلاق النافذة">×</button>
        </header>
        <div class="department-loading-error-modal-body app-liquid-modal__body" id="departmentLoadingErrorModalBody"></div>
        <footer class="department-loading-error-modal-footer app-liquid-modal__footer">
          <button type="button" class="secondary" data-loading-error-modal-action="close">إلغاء</button>
          <button type="button" class="primary" id="departmentLoadingErrorSubmitBtn" data-loading-error-modal-action="submit"></button>
        </footer>
      </section>`;
    element._appModalClose=options=>closeModal(options||{});
    element.addEventListener('click',handleModalClick);
    element.addEventListener('input',handleModalInput);
    element.addEventListener('change',handleModalInput);
    document.body.appendChild(element);
    return element;
  }

  function renderRegisterModal(){
    ensureModal();
    byId('departmentLoadingErrorModalTitle').textContent='تسجيل خطأ تحميل';
    byId('departmentLoadingErrorModalBody').innerHTML=`
      <div class="department-loading-error-header-grid is-register app-liquid-modal__section">
        <label>المصنع<input id="departmentLoadingErrorPlant" type="text" value="${escapeText(`${state.activePlant} — ${plantName(state.activePlant)}`)}" readonly /></label>
      </div>
      <section class="department-loading-error-lines-section app-liquid-modal__section">
        <div class="department-loading-error-lines-head">
          <div><h3>بيانات الخطأ</h3><p>سجّل الأصناف التي اكتُشف بها الخطأ، وسيستكمل المراجع بقية بيانات المستند.</p></div>
          <button type="button" class="secondary" data-loading-error-modal-action="add-line"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>إضافة سطر</span></button>
        </div>
        <div class="department-loading-error-lines-wrap"><table class="department-loading-error-lines-table" data-no-universal-table="1">
          <thead><tr><th>كود المادة</th><th>اسم المادة</th><th>رقم أمر البيع</th><th>نوع الخطأ</th><th>اسم العميل</th><th>ملاحظات</th><th>حذف</th></tr></thead>
          <tbody id="departmentLoadingErrorLinesBody"></tbody>
        </table></div>
      </section>
      <p class="department-loading-error-modal-status" id="departmentLoadingErrorModalStatus" role="alert" aria-live="assertive" hidden></p>`;
    const submit=byId('departmentLoadingErrorSubmitBtn');
    if(submit) submit.textContent='حفظ وتوجيه للمراجعة';
    renderRegisterLines();
  }

  function renderReviewModal(){
    const header=state.currentDocument;
    if(!header) return;
    const plant=`${clean(header.plant_code)} — ${plantName(header.plant_code)}`;
    byId('departmentLoadingErrorModalTitle').textContent=`استكمال بيانات سجل رقم ${clean(header.document_no)}`;
    byId('departmentLoadingErrorModalBody').innerHTML=`
      <div class="department-loading-error-review-meta app-liquid-modal__section">
        <div><span>رقم سجل الخطأ</span><strong dir="ltr">${escapeText(header.document_no)}</strong></div>
        <div><span>تاريخ تسجيل الخطأ</span><strong>${escapeText(registrationDate(header.created_at))}</strong></div>
        <div><span>المصنع</span><strong>${escapeText(plant)}</strong></div>
      </div>
      <section class="department-loading-error-lines-section app-liquid-modal__section">
        <div class="department-loading-error-lines-head"><div><h3>بيانات المرحلة الأولى</h3><p>هذه البيانات للعرض فقط ولا يتم تعديلها أثناء المراجعة.</p></div></div>
        <div class="department-loading-error-lines-wrap"><table class="department-loading-error-lines-table department-loading-error-review-lines">
          <thead><tr><th>كود المادة</th><th>اسم المادة</th><th>رقم أمر البيع</th><th>نوع الخطأ</th><th>اسم العميل</th><th>ملاحظات</th></tr></thead>
          <tbody>${renderReviewLines(header)}</tbody>
        </table></div>
      </section>
      <div class="department-loading-error-header-grid is-review app-liquid-modal__section">
        <label>كود أمين المخزن<input id="departmentLoadingErrorStorekeeperCode" type="text" inputmode="text" autocomplete="off" dir="ltr" /></label>
        <label>اسم أمين المخزن<input id="departmentLoadingErrorStorekeeperName" type="text" readonly /></label>
        <label>تاريخ الخطأ<input id="departmentLoadingErrorDate" type="date" data-custom-date-picker data-custom-date-picker-label="تاريخ الخطأ" data-custom-date-picker-commit-on-double-click="true" aria-label="تاريخ خطأ التحميل" /></label>
        <label>رقم السيارة<input id="departmentLoadingErrorVehicleNo" type="text" autocomplete="off" dir="auto" /></label>
        <label>المصنع<input id="departmentLoadingErrorPlant" type="text" value="${escapeText(plant)}" readonly /></label>
      </div>
      <label class="department-loading-error-action-field">الإجراء<textarea id="departmentLoadingErrorActionText" rows="4" placeholder="اكتب الإجراء المتخذ..."></textarea><small>الإجراء إلزامي لإتمام المراجعة.</small></label>
      <p class="department-loading-error-modal-status" id="departmentLoadingErrorModalStatus" role="alert" aria-live="assertive" hidden></p>`;
    const submit=byId('departmentLoadingErrorSubmitBtn');
    if(submit) submit.textContent='إتمام المراجعة';
    window.CustomDatePicker?.init?.(byId('departmentLoadingErrorModalBody'));
  }

  function renderRegisterLines(){
    const body=byId('departmentLoadingErrorLinesBody');
    if(!body) return;
    body.innerHTML=state.lines.map((line,index)=>`
      <tr data-loading-error-line="${escapeText(line.key)}">
        <td><input type="text" data-loading-error-line-field="materialCode" value="${escapeText(line.materialCode)}" autocomplete="off" dir="ltr" aria-label="كود المادة للسطر ${index+1}" /></td>
        <td><input type="text" data-loading-error-line-field="materialName" value="${escapeText(line.materialName)}" readonly aria-label="اسم المادة للسطر ${index+1}" /></td>
        <td><input type="text" data-loading-error-line-field="salesOrderNo" value="${escapeText(line.salesOrderNo)}" autocomplete="off" dir="ltr" aria-label="رقم أمر البيع للسطر ${index+1}" /></td>
        <td><select data-loading-error-line-field="errorType" aria-label="نوع الخطأ للسطر ${index+1}"><option value="">اختر</option><option value="surplus"${line.errorType==='surplus'?' selected':''}>زيادة</option><option value="shortage"${line.errorType==='shortage'?' selected':''}>عجز</option></select></td>
        <td><input type="text" data-loading-error-line-field="customerName" value="${escapeText(line.customerName)}" autocomplete="off" aria-label="اسم العميل للسطر ${index+1}" /></td>
        <td><textarea data-loading-error-line-field="notes" rows="2" aria-label="ملاحظات السطر ${index+1}">${escapeText(line.notes)}</textarea></td>
        <td><button type="button" class="department-loading-error-remove-line" data-loading-error-modal-action="remove-line" data-line-key="${escapeText(line.key)}" aria-label="حذف السطر ${index+1}"${state.lines.length===1?' disabled':''}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></button></td>
      </tr>`).join('');
  }

  function renderReviewLines(header){
    const lines=(header.department_loading_error_lines||[]).slice().sort((a,b)=>Number(a.line_no||0)-Number(b.line_no||0));
    return lines.map(line=>`<tr>
      <td dir="ltr">${escapeText(line.material_code)}</td><td>${escapeText(line.material_name)}</td><td dir="ltr">${escapeText(line.sales_order_no)}</td>
      <td>${escapeText(ERROR_TYPE_LABELS[line.error_type]||line.error_type)}</td><td>${escapeText(line.customer_name)}</td>
      <td class="department-loading-errors-text-cell">${escapeText(line.notes||'—')}</td>
    </tr>`).join('');
  }

  async function loadProducts(){
    if(Array.isArray(state.products)) return state.products;
    const {data,error}=await window.WarehouseDB.client.from('sales_products')
      .select('id,material_code,material_name,is_active,sort_order')
      .eq('is_active',true).order('sort_order',{ascending:true}).order('material_code',{ascending:true});
    if(error) throw error;
    state.products=data||[];
    return state.products;
  }

  async function loadPersonnel(plantCode){
    if(state.personnelByPlant.has(plantCode)) return state.personnelByPlant.get(plantCode);
    const {data,error}=await window.WarehouseDB.client.from('department_personnel')
      .select('id,employee_code,full_name,job_title,plant_code,is_active')
      .eq('plant_code',plantCode).eq('is_active',true).order('full_name',{ascending:true});
    if(error) throw error;
    const rows=data||[];
    state.personnelByPlant.set(plantCode,rows);
    return rows;
  }

  async function openRegisterModal(trigger){
    if(!canAdd()){setStatus('لا تملك صلاحية تسجيل خطأ تحميل.','err');return;}
    if(!window.WarehouseDB?.ready){setStatus('Supabase غير متصل. لا يمكن تسجيل خطأ تحميل.','err');return;}
    state.modalMode='register';state.currentDocument=null;state.lines=[createLine()];state.lastTrigger=trigger||document.activeElement;
    const element=ensureModal();
    renderRegisterModal();
    element.hidden=false;
    if(typeof window.lockAppModalScroll==='function') window.lockAppModalScroll(MODAL_ID,element);
    setModalStatus('جاري تحميل أصناف البيع...');setModalBusy(true,false);
    try{
      await loadProducts();
      setModalBusy(false,false);setModalStatus('');
      requestAnimationFrame(()=>byId('departmentLoadingErrorLinesBody')?.querySelector('[data-loading-error-line-field="materialCode"]')?.focus({preventScroll:true}));
    }catch(error){
      console.error('[department-loading-errors] product lookup failed',error);
      setModalBusy(false,false);setModalStatus(`تعذر تحميل أصناف البيع: ${error?.message||error}`,'err');
    }
  }

  async function openReviewModal(documentId,trigger){
    if(!canReview()){setStatus('لا تملك صلاحية استكمال ومراجعة أخطاء التحميل.','err');return;}
    const header=state.documents.find(item=>String(item.id)===String(documentId));
    if(!header || header.status!==VIEW_STATUS.pending || normalizeCode(header.plant_code)!==state.activePlant){
      setStatus('تعذر فتح المستند؛ حدّث قائمة الأخطاء التي تحتاج مراجعة.','err');return;
    }
    state.modalMode='review';state.currentDocument=header;state.lastTrigger=trigger||document.activeElement;
    const element=ensureModal();renderReviewModal();element.hidden=false;
    if(typeof window.lockAppModalScroll==='function') window.lockAppModalScroll(MODAL_ID,element);
    setModalStatus('جاري تحميل بيانات أمناء المخازن...');setModalBusy(true,false);
    try{
      await loadPersonnel(documentPlantCode());
      setModalBusy(false,false);setModalStatus('');
      requestAnimationFrame(()=>byId('departmentLoadingErrorStorekeeperCode')?.focus({preventScroll:true}));
    }catch(error){
      console.error('[department-loading-errors] personnel lookup failed',error);
      setModalBusy(false,false);setModalStatus(`تعذر تحميل بيانات أمناء المخازن: ${error?.message||error}`,'err');
    }
  }

  function closeModal(options={}){
    if(state.saving && !options.force) return;
    const element=modal();
    if(!element || element.hidden) return;
    element.hidden=true;
    if(typeof window.unlockAppModalScroll==='function') window.unlockAppModalScroll(MODAL_ID);
    if(options.restoreFocus!==false && state.lastTrigger?.isConnected) state.lastTrigger.focus({preventScroll:true});
    state.lastTrigger=null;state.currentDocument=null;
  }

  function setModalBusy(busy,saving){
    const element=modal();
    if(!element) return;
    element.querySelectorAll('input,select,textarea,button').forEach(control=>{
      if(control.matches('[data-loading-error-modal-action="close"]')) control.disabled=Boolean(saving);
      else control.disabled=Boolean(busy);
    });
    const submit=byId('departmentLoadingErrorSubmitBtn');
    if(submit){submit.disabled=Boolean(busy);submit.textContent=saving?'جاري الحفظ...':state.modalMode==='review'?'إتمام المراجعة':'حفظ وتوجيه للمراجعة';}
    if(state.modalMode==='register') renderLinesDisabledState(busy);
  }

  function renderLinesDisabledState(busy){
    const body=byId('departmentLoadingErrorLinesBody');
    if(!body) return;
    body.querySelectorAll('input,select,textarea,button').forEach(control=>{
      if(!busy && control.matches('[data-loading-error-modal-action="remove-line"]')) control.disabled=state.lines.length===1;
      else control.disabled=Boolean(busy);
    });
  }

  function lineForElement(element){
    const row=element.closest('[data-loading-error-line]');
    if(!row) return null;
    return state.lines.find(line=>line.key===row.dataset.loadingErrorLine)||null;
  }

  function syncLineField(element){
    const line=lineForElement(element);
    const field=element.dataset.loadingErrorLineField;
    if(!line || !field) return;
    if(field==='materialCode'){
      line.materialCode=normalizeCode(element.value);element.value=line.materialCode;
      const product=(state.products||[]).find(row=>normalizeCode(row.material_code)===line.materialCode);
      line.materialName=clean(product?.material_name);
      const nameInput=element.closest('tr')?.querySelector('[data-loading-error-line-field="materialName"]');
      if(nameInput) nameInput.value=line.materialName;
      element.classList.toggle('invalid',Boolean(line.materialCode && !product));return;
    }
    line[field]=field==='errorType'?element.value:clean(element.value);
  }

  function syncAllLines(){byId('departmentLoadingErrorLinesBody')?.querySelectorAll('[data-loading-error-line-field]').forEach(syncLineField);}

  function resolveStorekeeper(){
    const codeInput=byId('departmentLoadingErrorStorekeeperCode');
    const nameInput=byId('departmentLoadingErrorStorekeeperName');
    if(!codeInput || !nameInput) return null;
    const code=clean(codeInput.value);
    const personnel=(state.personnelByPlant.get(documentPlantCode())||[]).find(row=>clean(row.employee_code).toLocaleLowerCase()===code.toLocaleLowerCase());
    nameInput.value=clean(personnel?.full_name);
    if(personnel) codeInput.dataset.personnelId=String(personnel.id||'');else delete codeInput.dataset.personnelId;
    codeInput.classList.toggle('invalid',Boolean(code && !personnel));
    return personnel||null;
  }

  function handleModalInput(event){
    const target=event.target;target.classList.remove('invalid');setModalStatus('');
    if(state.modalMode==='review' && target.id==='departmentLoadingErrorStorekeeperCode') resolveStorekeeper();
    if(state.modalMode==='register' && target.matches('[data-loading-error-line-field]')) syncLineField(target);
  }

  function handleModalClick(event){
    const action=event.target.closest('[data-loading-error-modal-action]')?.dataset.loadingErrorModalAction;
    if(!action) return;
    if(action==='close'){closeModal();return;}
    if(action==='add-line' && state.modalMode==='register'){
      syncAllLines();state.lines.push(createLine());renderRegisterLines();
      byId('departmentLoadingErrorLinesBody')?.querySelector('tr:last-child input')?.focus();return;
    }
    if(action==='remove-line' && state.modalMode==='register'){
      if(state.lines.length===1) return;
      syncAllLines();
      const key=event.target.closest('[data-line-key]')?.dataset.lineKey;
      state.lines=state.lines.filter(line=>line.key!==key);renderRegisterLines();return;
    }
    if(action==='submit') state.modalMode==='review'?submitReview():submitRegistration();
  }

  function focusInvalid(element,message){
    element?.classList.add('invalid');setModalStatus(message,'err');element?.focus({preventScroll:false});
    element?.scrollIntoView?.({block:'center',behavior:'smooth'});return null;
  }

  function validateRegistration(){
    modal()?.querySelectorAll('.invalid').forEach(element=>element.classList.remove('invalid'));
    syncAllLines();
    const usedLines=state.lines.filter(line=>[line.materialCode,line.errorType,line.salesOrderNo,line.customerName,line.notes].some(Boolean));
    if(!usedLines.length){
      const first=byId('departmentLoadingErrorLinesBody')?.querySelector('[data-loading-error-line-field="materialCode"]');
      return focusInvalid(first,'أضف سطر تفاصيل صحيحًا واحدًا على الأقل.');
    }
    for(const line of usedLines){
      const row=byId('departmentLoadingErrorLinesBody')?.querySelector(`[data-loading-error-line="${line.key}"]`);
      const product=(state.products||[]).find(item=>normalizeCode(item.material_code)===line.materialCode);
      if(!line.materialCode || !product) return focusInvalid(row?.querySelector('[data-loading-error-line-field="materialCode"]'),'كود المادة غير موجود أو غير نشط في أصناف البيع.');
      if(!line.materialName) return focusInvalid(row?.querySelector('[data-loading-error-line-field="materialName"]'),'تعذر تحديد اسم المادة من الكود.');
      if(!line.salesOrderNo) return focusInvalid(row?.querySelector('[data-loading-error-line-field="salesOrderNo"]'),'رقم أمر البيع مطلوب لكل سطر.');
      if(!ERROR_TYPE_LABELS[line.errorType]) return focusInvalid(row?.querySelector('[data-loading-error-line-field="errorType"]'),'اختر نوع الخطأ: زيادة أو عجز.');
      if(!line.customerName) return focusInvalid(row?.querySelector('[data-loading-error-line-field="customerName"]'),'اسم العميل مطلوب لكل سطر.');
    }
    return {plantCode:state.activePlant,lines:usedLines.map(line=>({
      material_code:line.materialCode,error_type:line.errorType,sales_order_no:line.salesOrderNo,
      customer_name:line.customerName,notes:line.notes||null
    }))};
  }

  function validateReview(){
    modal()?.querySelectorAll('.invalid').forEach(element=>element.classList.remove('invalid'));
    const codeInput=byId('departmentLoadingErrorStorekeeperCode');
    const dateInput=byId('departmentLoadingErrorDate');
    const vehicleInput=byId('departmentLoadingErrorVehicleNo');
    const actionInput=byId('departmentLoadingErrorActionText');
    const personnel=resolveStorekeeper();
    if(!clean(codeInput?.value)) return focusInvalid(codeInput,'كود أمين المخزن مطلوب.');
    if(!personnel) return focusInvalid(codeInput,'كود أمين المخزن غير موجود أو غير نشط في مصنع المستند.');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(clean(dateInput?.value)) || dateInput?.validity?.valid===false) return focusInvalid(dateInput,'تاريخ الخطأ مطلوب ويجب أن يكون صحيحًا.');
    if(!clean(vehicleInput?.value)) return focusInvalid(vehicleInput,'رقم السيارة مطلوب.');
    if(!clean(actionInput?.value)) return focusInvalid(actionInput,'الإجراء إلزامي ولا يمكن إتمام المراجعة بدونه.');
    return {documentId:state.currentDocument?.id,storekeeperCode:clean(personnel.employee_code),errorDate:clean(dateInput.value),vehicleNo:clean(vehicleInput.value),actionText:clean(actionInput.value)};
  }

  async function submitRegistration(){
    if(state.saving) return;
    if(!canAdd()){setModalStatus('لا تملك صلاحية تسجيل خطأ تحميل.','err');return;}
    const payload=validateRegistration();
    if(!payload) return;
    state.saving=true;setModalBusy(true,true);setModalStatus('جاري حفظ الخطأ وإنشاء رقم المستند...');
    try{
      const {data,error}=await window.WarehouseDB.client.rpc('create_department_loading_error_document',{p_plant_code:payload.plantCode,p_lines:payload.lines});
      if(error) throw error;
      if(!data || data.status!==VIEW_STATUS.pending || data.document_no===undefined) throw new Error('لم تُرجع قاعدة البيانات رقم مستند صحيحًا.');
      const documentNo=String(data.document_no);const returnFocus=state.lastTrigger;
      state.saving=false;closeModal({restoreFocus:false,force:true});
      await loadRecords({successMessage:`تم تسجيل خطأ التحميل برقم: ${documentNo} وإرساله للمراجعة.`});
      returnFocus?.focus?.({preventScroll:true});
    }catch(error){
      console.error('[department-loading-errors] registration failed',error);
      state.saving=false;setModalBusy(false,false);setModalStatus(`تعذر تسجيل خطأ التحميل: ${error?.message||error}`,'err');
    }
  }

  async function submitReview(){
    if(state.saving) return;
    if(!canReview()){setModalStatus('لا تملك صلاحية استكمال ومراجعة أخطاء التحميل.','err');return;}
    const payload=validateReview();
    if(!payload) return;
    state.saving=true;setModalBusy(true,true);setModalStatus('جاري استكمال المستند وإنهاء المراجعة...');
    try{
      const {data,error}=await window.WarehouseDB.client.rpc('review_department_loading_error_document',{
        p_document_id:payload.documentId,p_storekeeper_code:payload.storekeeperCode,p_error_date:payload.errorDate,
        p_vehicle_no:payload.vehicleNo,p_action_text:payload.actionText
      });
      if(error) throw error;
      if(!data || data.status!==VIEW_STATUS.completed || data.document_no===undefined) throw new Error('لم تؤكد قاعدة البيانات اكتمال المستند.');
      const documentNo=String(data.document_no);
      state.saving=false;closeModal({restoreFocus:false,force:true});
      switchView('completed',{successMessage:`تم استكمال سجل خطأ التحميل رقم: ${documentNo} ونقله إلى السجل المكتمل.`});
    }catch(error){
      console.error('[department-loading-errors] review failed',error);
      state.saving=false;setModalBusy(false,false);setModalStatus(`تعذر إتمام مراجعة سجل الخطأ: ${error?.message||error}`,'err');
    }
  }

  function init(){renderShell();ensureModal();}

  window.DepartmentLoadingErrors={load:loadRecords,close:closeModal};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
