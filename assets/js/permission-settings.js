(function permissionSettingsModule(globalScope){
  'use strict';

  const ROLE_SAVE_RPC='app_permission_p3_save_role';
  const ROLE_DELETE_RPC='app_permission_p3_delete_role';
  const BUNDLE_SAVE_RPC='app_permission_p3_save_bundle';
  const BUNDLE_DELETE_RPC='app_permission_p3_delete_bundle';
  const SCREEN_PICKER_MODAL_ID='permissionScreenPickerOverlay';
  const SCREEN_EDITOR_MODAL_ID='permissionScreenEditorOverlay';
  const MANAGEMENT_ACTION_SELECTOR='#permissionSettingsShell [data-permission-settings-management-action], #permissionScreenEditorOverlay [data-permission-settings-management-action]';

  const state={
    initialized:false,
    loaded:false,
    loadingPromise:null,
    roles:[],
    bundles:[],
    plants:[],
    bundlePlants:new Map(),
    bundleItems:new Map(),
    bundleRoleCounts:new Map(),
    roleDirty:false,
    bundleDirty:false,
    bundlePermissionDraft:new Set(),
    bundlePlantDraft:new Set(),
    editorRootKey:'',
    editorDraft:new Set(),
    lastFocus:new Map()
  };

  const q=selector=>document.querySelector(selector);
  const qa=selector=>[...document.querySelectorAll(selector)];
  const safeHtml=value=>typeof globalScope.escapeHtml==='function'
    ? globalScope.escapeHtml(value)
    : String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));
  const registry=()=>globalScope.AuditPermissionRegistry;
  const nodes=()=>Array.isArray(registry()?.nodes) ? registry().nodes : [];
  const nodeMap=()=>new Map(nodes().map(node=>[node.key,node]));
  const roots=()=>nodes().filter(node=>node.type==='SCREEN' && !node.parent);
  const isAuthorized=()=>typeof globalScope.isSuperAdmin==='function' && globalScope.isSuperAdmin();
  const isReady=()=>Boolean(globalScope.WarehouseDB?.ready && globalScope.WarehouseDB?.client);
  const hasCompleteData=()=>state.loaded && !state.loadingPromise;

  function syncManagementActionAccess(){
    const allowed=isAuthorized();
    qa(MANAGEMENT_ACTION_SELECTOR).forEach(button=>{
      const saving=button.dataset.permissionSettingsSaving==='1';
      button.disabled=!allowed || saving || !hasCompleteData();
      button.classList.toggle('permission-disabled',!allowed);
      if(allowed && button.title==='لا تملك صلاحية التعديل') button.removeAttribute('title');
    });
  }

  function setStatus(id,message,type=''){
    const element=q(id);
    if(!element) return;
    element.className='upload-status permission-settings-status '+(type||'');
    element.textContent=message||'';
  }

  function errorMessage(error){
    const message=String(error?.message || error || '');
    if(/PERMISSION_DATA_INCOMPLETE|PERMISSION_DATA_CHANGED|PERMISSION_DATA_LOADER_UNAVAILABLE/.test(message)) return 'لم يكتمل تحميل بيانات الصلاحيات أو تغيّرت أثناء التحميل. تم منع الحفظ؛ اضغط تحديث لإعادة تحميل البيانات كاملة.';
    if(/42501|permission denied|row-level security|P3_PERMISSION_DENIED/i.test(message)) return 'غير مسموح بإدارة نموذج الصلاحيات الجديد. يلزم تسجيل الدخول بحساب Super Admin نشط.';
    if(/PGRST202|Could not find the function|does not exist|schema cache/i.test(message)) return 'ملفات قاعدة بيانات P3 غير مطبقة أو لم يتم تحديث Schema Cache بعد.';
    if(/23505|duplicate key|unique constraint/i.test(message)) return 'المفتاح أو الاسم مستخدم بالفعل. استخدم قيمة مختلفة.';
    if(/ROLE_SYSTEM_PROTECTED/i.test(message)) return 'الدور النظامي محمي خلال الهجرة المرحلية ولا يمكن تعديله أو حذفه.';
    if(/ROLE_KEY_IMMUTABLE/i.test(message)) return 'لا يمكن تغيير مفتاح الدور بعد إنشائه.';
    if(/ROLE_HAS_USER_ASSIGNMENTS/i.test(message)) return 'لا يمكن حذف الدور لأنه مرتبط بمستخدمين.';
    if(/ROLE_HAS_BUNDLE_ASSIGNMENTS/i.test(message)) return 'لا يمكن حذف الدور لأنه مرتبط بحزم صلاحيات.';
    if(/PERMISSION_BUNDLE_REQUIRES_PERMISSION/i.test(message)) return 'يجب اختيار صلاحية واحدة على الأقل داخل الحزمة.';
    if(/INVALID_PERMISSION_BUNDLE_PLANT_SCOPE|PERMISSION_BUNDLE_REQUIRES_PLANT/i.test(message)) return 'اختر «كل المصانع» أو حدد مصنعًا واحدًا على الأقل.';
    if(/UNKNOWN_PERMISSION_KEY|PERMISSION_PARENT_REQUIRED/i.test(message)) return 'اختيارات الصلاحيات غير متوافقة مع الـRegistry الحالية. أعد فتح شاشة الاختيارات.';
    if(/UNKNOWN_OR_INACTIVE_PLANT/i.test(message)) return 'تحتوي الحزمة على مصنع غير موجود أو غير نشط.';
    if(/BUNDLE_LINKED_TO_ROLES/i.test(message)) return 'الحزمة مرتبطة بدور أو أكثر وتحتاج تأكيد الحذف.';
    if(/BUNDLE_NOT_FOUND|ROLE_NOT_FOUND/i.test(message)) return 'السجل المطلوب لم يعد موجودًا. حدّث البيانات وحاول مرة أخرى.';
    return message ? 'تعذر تنفيذ العملية: '+message : 'تعذر تنفيذ العملية.';
  }

  function validateRegistry(){
    const current=registry();
    if(!current || current.enforcementEnabled!==false) throw new Error('P3_REGISTRY_UNAVAILABLE');
    const list=nodes();
    if(list.length<378) throw new Error('P3_REGISTRY_INCOMPLETE');
    const keys=new Set();
    list.forEach(node=>{
      if(!node?.key || keys.has(node.key)) throw new Error('P3_REGISTRY_DUPLICATE_KEY');
      keys.add(node.key);
    });
    list.forEach(node=>{ if(node.parent && !keys.has(node.parent)) throw new Error('P3_REGISTRY_ORPHAN_PARENT'); });
    return list;
  }

  function descendants(rootKey){
    const byParent=new Map();
    nodes().forEach(node=>{
      const parent=node.parent||'';
      if(!byParent.has(parent)) byParent.set(parent,[]);
      byParent.get(parent).push(node);
    });
    const result=[];
    const visit=key=>{
      const item=nodeMap().get(key);
      if(!item) return;
      result.push(item);
      (byParent.get(key)||[]).forEach(child=>visit(child.key));
    };
    visit(rootKey);
    return result;
  }

  function normalizedPermissionSet(values){
    const map=nodeMap();
    const result=new Set();
    (values||[]).forEach(value=>{
      let key=String(value||'').trim();
      while(key && map.has(key) && !result.has(key)){
        result.add(key);
        key=map.get(key).parent||'';
      }
    });
    return result;
  }

  function selectedRoots(permissionSet=state.bundlePermissionDraft){
    return roots().filter(root=>permissionSet.has(root.key));
  }

  function renderSelectionSummary(){
    const summary=q('#permissionBundleSelectionSummary');
    if(!summary) return;
    const selected=state.bundlePermissionDraft.size;
    const screenCount=selectedRoots().length;
    summary.textContent=selected
      ? `${selected} صلاحية داخل ${screenCount} شاشة رئيسية.`
      : 'لم يتم اختيار صلاحيات بعد.';
  }

  function renderPlantOptions(){
    const container=q('#permissionBundlePlantOptions');
    const allPlants=q('#permissionBundleAllPlantsInput')?.checked!==false;
    if(!container) return;
    if(!state.plants.length){
      container.innerHTML='<div class="permission-settings-empty-inline">لا توجد مصانع نشطة متاحة.</div>';
      return;
    }
    container.innerHTML=state.plants.map(plant=>{
      const code=String(plant.code||'').trim().toUpperCase();
      const checked=state.bundlePlantDraft.has(code);
      return `<label class="permission-settings-plant-option${allPlants?' is-disabled':''}"><input type="checkbox" data-permission-plant-code="${safeHtml(code)}" ${checked?'checked':''} ${allPlants?'disabled':''}/><span><b dir="ltr">${safeHtml(code)}</b><small>${safeHtml(plant.name||code)}</small></span></label>`;
    }).join('');
  }

  function roleTypeLabel(role){
    if(role.is_super_admin) return '<span class="permission-settings-kind-badge is-super">Super Admin</span>';
    if(role.is_system) return '<span class="permission-settings-kind-badge">نظامي</span>';
    return '<span class="permission-settings-kind-badge is-custom">مخصص</span>';
  }

  function renderRoles(){
    const tbody=q('#permissionRolesTable tbody');
    if(!tbody) return;
    if(!state.loaded){
      tbody.innerHTML=`<tr><td colspan="5" class="empty-row">${state.loadingPromise?'جاري تحميل الأدوار كاملة...':'لم يكتمل تحميل الأدوار. اضغط تحديث.'}</td></tr>`;
      return;
    }
    if(!state.roles.length){
      tbody.innerHTML='<tr><td colspan="5" class="empty-row">لا توجد أدوار في النموذج الجديد.</td></tr>';
      return;
    }
    tbody.innerHTML=state.roles.map(role=>{
      const protectedRole=role.is_system===true;
      const actions=protectedRole
        ? '<span class="permission-settings-protected">محمي أثناء الهجرة</span>'
        : `<div class="actions-cell"><button class="small-action edit" type="button" data-permission-role-action="edit" data-role-id="${safeHtml(role.id)}">تعديل</button><button class="small-action delete" type="button" data-permission-role-action="delete" data-role-id="${safeHtml(role.id)}">حذف</button></div>`;
      return `<tr><td dir="ltr"><code>${safeHtml(role.role_key)}</code></td><td><b>${safeHtml(role.role_name)}</b>${role.description?`<small class="permission-settings-row-note">${safeHtml(role.description)}</small>`:''}</td><td>${roleTypeLabel(role)}</td><td><span class="status-badge ${role.is_active?'status-active':'status-inactive'}">${role.is_active?'نشط':'غير نشط'}</span></td><td>${actions}</td></tr>`;
    }).join('');
  }

  function bundlePlantLabel(bundle){
    if(bundle.all_plants) return '<span class="permission-settings-scope-badge">كل المصانع</span>';
    const codes=state.bundlePlants.get(bundle.id)||[];
    return codes.length ? codes.map(code=>`<span class="permission-settings-scope-badge" dir="ltr">${safeHtml(code)}</span>`).join(' ') : '—';
  }

  function renderBundles(){
    const tbody=q('#permissionBundlesTable tbody');
    if(!tbody) return;
    if(!state.loaded){
      tbody.innerHTML=`<tr><td colspan="6" class="empty-row">${state.loadingPromise?'جاري تحميل حزم الصلاحيات كاملة...':'لم يكتمل تحميل الحزم. اضغط تحديث.'}</td></tr>`;
      return;
    }
    if(!state.bundles.length){
      tbody.innerHTML='<tr><td colspan="6" class="empty-row">لا توجد حزم صلاحيات بعد.</td></tr>';
      return;
    }
    tbody.innerHTML=state.bundles.map(bundle=>{
      const permissionCount=(state.bundleItems.get(bundle.id)||[]).length;
      const roleCount=state.bundleRoleCounts.get(bundle.id)||0;
      return `<tr><td><b>${safeHtml(bundle.bundle_name)}</b>${bundle.description?`<small class="permission-settings-row-note">${safeHtml(bundle.description)}</small>`:''}</td><td><div class="permission-settings-scope-list">${bundlePlantLabel(bundle)}</div></td><td><span class="permission-settings-count-badge">${permissionCount}</span></td><td><span class="permission-settings-count-badge${roleCount?' has-links':''}">${roleCount}</span></td><td><span class="status-badge ${bundle.is_active?'status-active':'status-inactive'}">${bundle.is_active?'نشطة':'غير نشطة'}</span></td><td><div class="actions-cell"><button class="small-action edit" type="button" data-permission-bundle-action="edit" data-bundle-id="${safeHtml(bundle.id)}">تعديل</button><button class="small-action delete" type="button" data-permission-bundle-action="delete" data-bundle-id="${safeHtml(bundle.id)}">حذف</button></div></td></tr>`;
    }).join('');
  }

  function renderAll(){
    renderRoles();
    renderBundles();
    renderPlantOptions();
    renderSelectionSummary();
  }

  function mapRelations(rows,keyField,valueField){
    const map=new Map();
    (rows||[]).forEach(row=>{
      const key=String(row[keyField]||'');
      if(!map.has(key)) map.set(key,[]);
      map.get(key).push(row[valueField]);
    });
    return map;
  }

  async function fetchP3Data(){
    validateRegistry();
    if(!isAuthorized()) throw new Error('P3_PERMISSION_DENIED');
    if(!isReady()) throw new Error('Supabase غير متصل.');
    const client=globalScope.WarehouseDB.client;
    const readAll=globalScope.AuditPermissionData?.readAll;
    if(typeof readAll!=='function') throw new Error('PERMISSION_DATA_LOADER_UNAVAILABLE');
    const plantPromise=typeof globalScope.loadPlantsCatalog==='function'
      ? globalScope.loadPlantsCatalog({force:true})
      : Promise.resolve([]);
    const [plantRows,rolesResult,bundlesResult,plantsResult,itemsResult,linksResult]=await Promise.all([
      plantPromise,
      readAll(client,'app_permission_roles','id,role_key,role_name,description,is_system,is_super_admin,is_active,created_at,updated_at',{order:[['is_system',false],['role_name',true]]}),
      readAll(client,'app_permission_bundles','id,bundle_name,description,all_plants,is_active,created_at,updated_at',{order:[['created_at',false]]}),
      readAll(client,'app_permission_bundle_plants','bundle_id,plant_code',{keys:['bundle_id','plant_code']}),
      readAll(client,'app_permission_bundle_items','bundle_id,permission_key',{keys:['bundle_id','permission_key']}),
      readAll(client,'app_permission_role_bundles','role_id,bundle_id',{keys:['role_id','bundle_id']})
    ]);
    const failed=[rolesResult,bundlesResult,plantsResult,itemsResult,linksResult].find(result=>result.error);
    if(failed?.error) throw failed.error;
    const catalog=Array.isArray(plantRows) ? plantRows : [];
    if(!catalog.length || catalog.some(plant=>plant.source!=='supabase')) throw new Error('تعذر تحميل Plant Registry الحقيقي من Supabase.');
    state.roles=rolesResult.data||[];
    state.bundles=bundlesResult.data||[];
    state.plants=catalog.map(plant=>({...plant,code:String(plant.code||'').trim().toUpperCase()}));
    state.bundlePlants=mapRelations(plantsResult.data,'bundle_id','plant_code');
    state.bundleItems=mapRelations(itemsResult.data,'bundle_id','permission_key');
    state.bundleRoleCounts=new Map();
    (linksResult.data||[]).forEach(row=>state.bundleRoleCounts.set(row.bundle_id,(state.bundleRoleCounts.get(row.bundle_id)||0)+1));
  }

  async function load(options={}){
    if(!q('#permissionSettingsShell')) return false;
    syncManagementActionAccess();
    if(!isAuthorized()){
      setStatus('#permissionRoleStatus','هذا التبويب متاح لـSuper Admin فقط.','err');
      setStatus('#permissionBundleStatus','هذا التبويب متاح لـSuper Admin فقط.','err');
      return false;
    }
    if(state.loadingPromise) return state.loadingPromise;
    if(state.loaded && isDirty() && !options.force){
      renderAll();
      return true;
    }
    state.loaded=false;
    state.loadingPromise=(async()=>{
      setStatus('#permissionRoleStatus','جاري تحميل الأدوار...');
      setStatus('#permissionBundleStatus','جاري تحميل حزم الصلاحيات...');
      try{
        await fetchP3Data();
        state.loaded=true;
        renderAll();
        setStatus('#permissionRoleStatus','تم تحميل الأدوار من النموذج الجديد.','ok');
        setStatus('#permissionBundleStatus','تم تحميل الحزم من النموذج الجديد.','ok');
        return true;
      }catch(error){
        state.loaded=false;
        state.roles=[];
        state.bundles=[];
        state.plants=[];
        state.bundlePlants=new Map();
        state.bundleItems=new Map();
        state.bundleRoleCounts=new Map();
        renderAll();
        const message=errorMessage(error);
        setStatus('#permissionRoleStatus',message,'err');
        setStatus('#permissionBundleStatus',message,'err');
        return false;
      }finally{
        state.loadingPromise=null;
        syncManagementActionAccess();
        renderRoles();
        renderBundles();
      }
    })();
    syncManagementActionAccess();
    renderRoles();
    renderBundles();
    return state.loadingPromise;
  }

  function resetRoleForm(){
    const form=q('#permissionRoleForm');
    if(!form) return;
    form.reset();
    q('#permissionRoleIdInput').value='';
    q('#permissionRoleKeyInput').disabled=false;
    q('#permissionRoleActiveInput').checked=true;
    q('#permissionRoleFormTitle').textContent='إنشاء دور جديد';
    q('#permissionRoleSaveBtn').innerHTML='<span class="button-svg-icon" data-modern-icon="save" aria-hidden="true"></span> حفظ الدور';
    if(typeof globalScope.renderModernSidebarIcons==='function') globalScope.renderModernSidebarIcons();
    state.roleDirty=false;
  }

  function resetBundleForm(){
    const form=q('#permissionBundleForm');
    if(!form) return;
    form.reset();
    q('#permissionBundleIdInput').value='';
    q('#permissionBundleAllPlantsInput').checked=true;
    q('#permissionBundleActiveInput').checked=true;
    q('#permissionBundleFormTitle').textContent='إنشاء حزمة صلاحيات';
    q('#permissionBundleSaveBtn').innerHTML='<span class="button-svg-icon" data-modern-icon="save" aria-hidden="true"></span> حفظ الحزمة';
    if(typeof globalScope.renderModernSidebarIcons==='function') globalScope.renderModernSidebarIcons();
    state.bundlePlantDraft=new Set();
    state.bundlePermissionDraft=new Set();
    state.bundleDirty=false;
    renderPlantOptions();
    renderSelectionSummary();
  }

  async function confirmDiscard(mode){
    const dirty=mode==='role' ? state.roleDirty : state.bundleDirty;
    if(!dirty) return true;
    if(typeof globalScope.showAppLiquidConfirm!=='function') return globalScope.confirm('توجد تعديلات غير محفوظة. هل تريد تجاهلها؟');
    return globalScope.showAppLiquidConfirm({title:'تعديلات غير محفوظة',message:'سيتم تجاهل البيانات التي لم تُحفظ في النموذج الحالي.',confirmText:'تجاهل التعديلات'});
  }

  async function refreshModel(mode){
    if(!(await confirmDiscard(mode))) return;
    if(mode==='role') resetRoleForm();
    if(mode==='bundle') resetBundleForm();
    await load({force:true});
  }

  function normalizeRoleKey(value){ return String(value||'').trim().toLowerCase(); }

  function setSaving(button,saving,text){
    if(!button) return;
    if(saving){
      button.dataset.originalHtml=button.innerHTML;
      button.dataset.permissionSettingsSaving='1';
      button.textContent=text;
    }else{
      delete button.dataset.permissionSettingsSaving;
      if(button.dataset.originalHtml) button.innerHTML=button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
    syncManagementActionAccess();
  }

  async function saveRole(event){
    event.preventDefault();
    if(!hasCompleteData()){ setStatus('#permissionRoleStatus','انتظر اكتمال تحميل البيانات أو اضغط تحديث قبل الحفظ.','err'); return; }
    if(q('#permissionRoleSaveBtn')?.dataset.permissionSettingsSaving==='1') return;
    const id=String(q('#permissionRoleIdInput')?.value||'').trim()||null;
    const roleKey=normalizeRoleKey(q('#permissionRoleKeyInput')?.value);
    const roleName=String(q('#permissionRoleNameInput')?.value||'').trim();
    const description=String(q('#permissionRoleDescriptionInput')?.value||'').trim()||null;
    const active=q('#permissionRoleActiveInput')?.checked!==false;
    if(!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)*$/.test(roleKey)){
      setStatus('#permissionRoleStatus','مفتاح الدور يجب أن يبدأ بحرف إنجليزي صغير ويحتوي على حروف وأرقام، مع شرطة سفلية أو نقاط فاصلة فقط.','err');
      q('#permissionRoleKeyInput')?.focus();
      return;
    }
    if(!roleName){
      setStatus('#permissionRoleStatus','اسم الدور مطلوب.','err');
      q('#permissionRoleNameInput')?.focus();
      return;
    }
    if(!isAuthorized() || !isReady()){
      setStatus('#permissionRoleStatus',!isAuthorized()?'غير مسموح بحفظ الأدوار.':'Supabase غير متصل.','err');
      return;
    }
    const button=q('#permissionRoleSaveBtn');
    setSaving(button,true,'جاري الحفظ...');
    try{
      const {error}=await globalScope.WarehouseDB.client.rpc(ROLE_SAVE_RPC,{p_role_id:id,p_role_key:roleKey,p_role_name:roleName,p_description:description,p_is_active:active});
      if(error) throw error;
      button.disabled=false;
      delete button.dataset.originalHtml;
      resetRoleForm();
      const reloaded=await load({force:true});
      setStatus('#permissionRoleStatus',reloaded?(id?'تم تعديل الدور بنجاح.':'تم إنشاء الدور بنجاح.'):'تم حفظ الدور، لكن تعذر إعادة تحميل البيانات كاملة. اضغط تحديث قبل أي تعديل آخر.',reloaded?'ok':'err');
    }catch(error){
      setStatus('#permissionRoleStatus',errorMessage(error),'err');
    }finally{
      setSaving(button,false,'');
    }
  }

  async function editRole(roleId){
    if(!(await confirmDiscard('role'))) return;
    if(!hasCompleteData()){ setStatus('#permissionRoleStatus','أعد تحميل البيانات كاملة قبل التعديل.','err'); return; }
    const role=state.roles.find(item=>String(item.id)===String(roleId));
    if(!role){ setStatus('#permissionRoleStatus','تعذر العثور على الدور. اضغط تحديث.','err'); return; }
    if(role.is_system){ setStatus('#permissionRoleStatus','الدور النظامي محمي خلال الهجرة المرحلية.','err'); return; }
    q('#permissionRoleIdInput').value=role.id;
    q('#permissionRoleKeyInput').value=role.role_key||'';
    q('#permissionRoleKeyInput').disabled=true;
    q('#permissionRoleNameInput').value=role.role_name||'';
    q('#permissionRoleDescriptionInput').value=role.description||'';
    q('#permissionRoleActiveInput').checked=role.is_active===true;
    q('#permissionRoleFormTitle').textContent='تعديل الدور';
    q('#permissionRoleSaveBtn').textContent='حفظ التعديلات';
    state.roleDirty=false;
    q('#permissionRoleNameInput')?.focus();
  }

  async function deleteRole(roleId){
    if(!hasCompleteData()){ setStatus('#permissionRoleStatus','أعد تحميل البيانات كاملة قبل الحذف.','err'); return; }
    const role=state.roles.find(item=>String(item.id)===String(roleId));
    if(!role || role.is_system){ setStatus('#permissionRoleStatus','لا يمكن حذف هذا الدور.','err'); return; }
    const accepted=typeof globalScope.showAppLiquidConfirm==='function'
      ? await globalScope.showAppLiquidConfirm({title:'حذف الدور',message:`سيتم حذف الدور «${role.role_name}» فقط إذا لم يكن مرتبطًا بمستخدمين أو حزم.`,confirmText:'حذف الدور'})
      : globalScope.confirm('هل تريد حذف الدور؟');
    if(!accepted) return;
    if(!hasCompleteData()){ setStatus('#permissionRoleStatus','أعد تحميل البيانات كاملة قبل الحذف.','err'); return; }
    try{
      const {error}=await globalScope.WarehouseDB.client.rpc(ROLE_DELETE_RPC,{p_role_id:role.id});
      if(error) throw error;
      if(String(q('#permissionRoleIdInput')?.value)===String(role.id)) resetRoleForm();
      await load({force:true});
      setStatus('#permissionRoleStatus','تم حذف الدور غير المرتبط بنجاح.','ok');
    }catch(error){ setStatus('#permissionRoleStatus',errorMessage(error),'err'); }
  }

  function editBundle(bundle){
    q('#permissionBundleIdInput').value=bundle.id;
    q('#permissionBundleNameInput').value=bundle.bundle_name||'';
    q('#permissionBundleDescriptionInput').value=bundle.description||'';
    q('#permissionBundleAllPlantsInput').checked=bundle.all_plants===true;
    q('#permissionBundleActiveInput').checked=bundle.is_active===true;
    state.bundlePlantDraft=new Set((state.bundlePlants.get(bundle.id)||[]).map(code=>String(code||'').trim().toUpperCase()));
    state.bundlePermissionDraft=normalizedPermissionSet(state.bundleItems.get(bundle.id)||[]);
    q('#permissionBundleFormTitle').textContent='تعديل حزمة الصلاحيات';
    q('#permissionBundleSaveBtn').textContent='حفظ التعديلات';
    state.bundleDirty=false;
    renderPlantOptions();
    renderSelectionSummary();
    q('#permissionBundleNameInput')?.focus();
  }

  async function requestEditBundle(bundleId){
    if(!(await confirmDiscard('bundle'))) return;
    if(!hasCompleteData()){ setStatus('#permissionBundleStatus','أعد تحميل الصلاحيات كاملة قبل التعديل.','err'); return; }
    const bundle=state.bundles.find(item=>String(item.id)===String(bundleId));
    if(!bundle){ setStatus('#permissionBundleStatus','تعذر العثور على الحزمة. اضغط تحديث.','err'); return; }
    editBundle(bundle);
  }

  async function saveBundle(event){
    event.preventDefault();
    if(!hasCompleteData()){ setStatus('#permissionBundleStatus','انتظر اكتمال تحميل الصلاحيات أو اضغط تحديث قبل الحفظ.','err'); return; }
    if(q('#permissionBundleSaveBtn')?.dataset.permissionSettingsSaving==='1') return;
    const id=String(q('#permissionBundleIdInput')?.value||'').trim()||null;
    const name=String(q('#permissionBundleNameInput')?.value||'').trim();
    const description=String(q('#permissionBundleDescriptionInput')?.value||'').trim()||null;
    const allPlants=q('#permissionBundleAllPlantsInput')?.checked!==false;
    const active=q('#permissionBundleActiveInput')?.checked!==false;
    const permissions=[...normalizedPermissionSet(state.bundlePermissionDraft)].sort();
    const plants=allPlants ? [] : [...state.bundlePlantDraft].sort();
    if(!name){ setStatus('#permissionBundleStatus','اسم الحزمة مطلوب.','err'); q('#permissionBundleNameInput')?.focus(); return; }
    if(!allPlants && !plants.length){ setStatus('#permissionBundleStatus','حدد مصنعًا واحدًا على الأقل أو اختر «كل المصانع».','err'); q('#permissionBundlePlantOptions input')?.focus(); return; }
    if(!permissions.length){ setStatus('#permissionBundleStatus','اختر صلاحية واحدة على الأقل من زر «الشاشات».','err'); q('#permissionBundleScreensBtn')?.focus(); return; }
    if(!isAuthorized() || !isReady()){ setStatus('#permissionBundleStatus',!isAuthorized()?'غير مسموح بحفظ الحزم.':'Supabase غير متصل.','err'); return; }
    const button=q('#permissionBundleSaveBtn');
    setSaving(button,true,'جاري الحفظ...');
    try{
      const {error}=await globalScope.WarehouseDB.client.rpc(BUNDLE_SAVE_RPC,{p_bundle_id:id,p_bundle_name:name,p_description:description,p_all_plants:allPlants,p_plant_codes:plants,p_permission_keys:permissions,p_is_active:active});
      if(error) throw error;
      button.disabled=false;
      delete button.dataset.originalHtml;
      resetBundleForm();
      const reloaded=await load({force:true});
      setStatus('#permissionBundleStatus',reloaded?(id?'تم تعديل الحزمة بنجاح.':'تم إنشاء الحزمة بنجاح.'):'تم حفظ الحزمة، لكن تعذر إعادة تحميل الصلاحيات كاملة. اضغط تحديث قبل أي تعديل آخر.',reloaded?'ok':'err');
    }catch(error){
      setStatus('#permissionBundleStatus',errorMessage(error),'err');
    }finally{
      setSaving(button,false,'');
    }
  }

  async function deleteBundle(bundleId){
    if(!hasCompleteData()){ setStatus('#permissionBundleStatus','أعد تحميل الصلاحيات كاملة قبل الحذف.','err'); return; }
    const bundle=state.bundles.find(item=>String(item.id)===String(bundleId));
    if(!bundle){ setStatus('#permissionBundleStatus','تعذر العثور على الحزمة. اضغط تحديث.','err'); return; }
    const roleCount=state.bundleRoleCounts.get(bundle.id)||0;
    const message=roleCount
      ? `الحزمة «${bundle.bundle_name}» مرتبطة بعدد ${roleCount} من الأدوار. سيؤدي الحذف إلى إزالة هذه الروابط داخل عملية واحدة. لا يؤثر ذلك على النظام القديم في P3.`
      : `سيتم حذف الحزمة «${bundle.bundle_name}» ومصانعها وعناصرها من النموذج الجديد.`;
    const accepted=typeof globalScope.showAppLiquidConfirm==='function'
      ? await globalScope.showAppLiquidConfirm({title:'حذف حزمة الصلاحيات',message,confirmText:'حذف الحزمة'})
      : globalScope.confirm('هل تريد حذف الحزمة؟');
    if(!accepted) return;
    if(!hasCompleteData()){ setStatus('#permissionBundleStatus','أعد تحميل الصلاحيات كاملة قبل الحذف.','err'); return; }
    try{
      const {error}=await globalScope.WarehouseDB.client.rpc(BUNDLE_DELETE_RPC,{p_bundle_id:bundle.id,p_confirm_linked_roles:roleCount>0});
      if(error) throw error;
      if(String(q('#permissionBundleIdInput')?.value)===String(bundle.id)) resetBundleForm();
      await load({force:true});
      setStatus('#permissionBundleStatus','تم حذف الحزمة وعلاقاتها داخل عملية ذرية.','ok');
    }catch(error){ setStatus('#permissionBundleStatus',errorMessage(error),'err'); }
  }

  function openModal(overlay,modalId,closeHandler,focusTarget){
    if(!overlay || !isAuthorized()) return;
    state.lastFocus.set(modalId,document.activeElement);
    overlay.hidden=false;
    overlay.setAttribute('aria-hidden','false');
    overlay.classList.add('open');
    overlay._appModalClose=closeHandler;
    if(typeof globalScope.lockAppModalScroll==='function') globalScope.lockAppModalScroll(modalId,overlay);
    requestAnimationFrame(()=>focusTarget?.focus({preventScroll:true}));
  }

  function closeModal(overlay,modalId,restoreFocus=true){
    if(!overlay || overlay.hidden) return;
    overlay.classList.remove('open');
    overlay.hidden=true;
    overlay.setAttribute('aria-hidden','true');
    if(typeof globalScope.unlockAppModalScroll==='function') globalScope.unlockAppModalScroll(modalId);
    const previous=state.lastFocus.get(modalId);
    state.lastFocus.delete(modalId);
    if(restoreFocus && previous?.isConnected) previous.focus({preventScroll:true});
  }

  function screenIcon(){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M3 9h18M8 9v11"></path></svg>';
  }

  function renderScreenCards(){
    const container=q('#permissionScreenGrid');
    if(!container) return;
    const search=String(q('#permissionScreenSearchInput')?.value||'').trim().toLocaleLowerCase('ar');
    const visible=roots().filter(root=>!search || `${root.label} ${root.key}`.toLocaleLowerCase('ar').includes(search));
    if(!visible.length){ container.innerHTML='<div class="permission-settings-empty-inline">لا توجد شاشة مطابقة للبحث.</div>'; return; }
    container.innerHTML=visible.map(root=>{
      const branch=descendants(root.key);
      const selected=branch.filter(node=>state.bundlePermissionDraft.has(node.key)).length;
      return `<button class="permission-settings-screen-card${selected?' has-selection':''}" type="button" data-permission-screen-key="${safeHtml(root.key)}"><span class="permission-settings-screen-icon">${screenIcon()}</span><span class="permission-settings-screen-copy"><b>${safeHtml(root.label)}</b><small dir="ltr">${safeHtml(root.key)}</small></span><span class="permission-settings-screen-count">${selected}/${branch.length}</span></button>`;
    }).join('');
  }

  function updatePickerSummary(){
    const element=q('#permissionScreenPickerSummary');
    if(element) element.textContent=`تم اختيار ${state.bundlePermissionDraft.size} صلاحية داخل ${selectedRoots().length} شاشة رئيسية.`;
  }

  function openScreenPicker(){
    try{ validateRegistry(); }
    catch(error){ setStatus('#permissionBundleStatus','تعذر تحميل Permission Registry الخاصة بـP3.','err'); return; }
    q('#permissionScreenSearchInput').value='';
    renderScreenCards();
    updatePickerSummary();
    const overlay=q('#permissionScreenPickerOverlay');
    openModal(overlay,SCREEN_PICKER_MODAL_ID,options=>closeScreenPicker(options),q('#permissionScreenSearchInput'));
  }

  function closeScreenPicker(options={}){
    if(!q('#permissionScreenEditorOverlay')?.hidden) closeScreenEditor({restoreFocus:false});
    closeModal(q('#permissionScreenPickerOverlay'),SCREEN_PICKER_MODAL_ID,options.restoreFocus!==false);
  }

  function childrenMap(){
    const result=new Map();
    nodes().forEach(node=>{
      if(!node.parent) return;
      if(!result.has(node.parent)) result.set(node.parent,[]);
      result.get(node.parent).push(node);
    });
    return result;
  }

  const typeLabels={SCREEN:'شاشة رئيسية',SUBSCREEN:'شاشة فرعية',TAB:'تبويب',FILTER:'فلتر',BUTTON:'زر',ACTION:'إجراء'};

  function treeNodeHtml(node,children){
    const childNodes=children.get(node.key)||[];
    const checked=state.editorDraft.has(node.key);
    return `<div class="permission-settings-tree-item" data-permission-tree-item="${safeHtml(node.key)}"><label><input type="checkbox" data-permission-key="${safeHtml(node.key)}" ${checked?'checked':''}/><span class="permission-settings-tree-check" aria-hidden="true"></span><span class="permission-settings-tree-copy"><b>${safeHtml(node.label)}</b><small><em>${safeHtml(typeLabels[node.type]||node.type)}</em><code dir="ltr">${safeHtml(node.key)}</code></small></span></label>${childNodes.length?`<div class="permission-settings-tree-children">${childNodes.map(child=>treeNodeHtml(child,children)).join('')}</div>`:''}</div>`;
  }

  function syncEditorTreeSelection(){
    const container=q('#permissionScreenPermissionTree');
    const root=nodeMap().get(state.editorRootKey);
    if(!container || !root) return;
    const branchKeys=new Set(descendants(root.key).map(node=>node.key));
    container.querySelectorAll('input[data-permission-key]').forEach(input=>{
      const key=input.dataset.permissionKey;
      input.checked=state.editorDraft.has(key);
      const branch=descendants(key).map(node=>node.key).filter(itemKey=>branchKeys.has(itemKey));
      const selected=branch.filter(key=>state.editorDraft.has(key)).length;
      input.indeterminate=selected>0 && selected<branch.length;
    });
    const count=q('#permissionEditorSelectionCount');
    if(count) count.textContent=`${state.editorDraft.size} صلاحية محددة`;
  }

  function renderEditorTree(){
    const container=q('#permissionScreenPermissionTree');
    const root=nodeMap().get(state.editorRootKey);
    if(!container || !root) return;
    container.innerHTML=treeNodeHtml(root,childrenMap());
    syncEditorTreeSelection();
  }

  function openScreenEditor(rootKey){
    const root=nodeMap().get(rootKey);
    if(!root || root.type!=='SCREEN') return;
    state.editorRootKey=root.key;
    const branchKeys=new Set(descendants(root.key).map(node=>node.key));
    state.editorDraft=new Set([...state.bundlePermissionDraft].filter(key=>branchKeys.has(key)));
    q('#permissionScreenEditorTitle').textContent=`صلاحيات: ${root.label}`;
    q('#permissionScreenEditorHint').textContent='يتم حفظ الاختيارات داخل Draft الحزمة، ولن تصل إلى قاعدة البيانات قبل حفظ الحزمة نهائيًا.';
    renderEditorTree();
    syncManagementActionAccess();
    const overlay=q('#permissionScreenEditorOverlay');
    openModal(overlay,SCREEN_EDITOR_MODAL_ID,options=>closeScreenEditor(options),q('#permissionScreenPermissionTree input'));
  }

  function closeScreenEditor(options={}){
    closeModal(q('#permissionScreenEditorOverlay'),SCREEN_EDITOR_MODAL_ID,options.restoreFocus!==false);
    state.editorRootKey='';
    state.editorDraft=new Set();
  }

  function updateEditorSelection(key,checked){
    const map=nodeMap();
    if(!map.has(key)) return;
    if(checked){
      descendants(key).slice(0,1).forEach(node=>state.editorDraft.add(node.key));
      let current=map.get(key);
      while(current && current.key!==state.editorRootKey){
        current=map.get(current.parent);
        if(current) state.editorDraft.add(current.key);
      }
    }else{
      descendants(key).forEach(node=>state.editorDraft.delete(node.key));
    }
    syncEditorTreeSelection();
  }

  function selectEditorBranch(value){
    const branch=descendants(state.editorRootKey).map(node=>node.key);
    state.editorDraft=value ? new Set(branch) : new Set();
    syncEditorTreeSelection();
  }

  function saveEditorSelection(){
    const branchKeys=new Set(descendants(state.editorRootKey).map(node=>node.key));
    [...state.bundlePermissionDraft].forEach(key=>{ if(branchKeys.has(key)) state.bundlePermissionDraft.delete(key); });
    state.editorDraft.forEach(key=>state.bundlePermissionDraft.add(key));
    state.bundlePermissionDraft=normalizedPermissionSet(state.bundlePermissionDraft);
    state.bundleDirty=true;
    closeScreenEditor();
    renderScreenCards();
    updatePickerSummary();
    renderSelectionSummary();
  }

  function activateInnerTab(key){
    qa('#permissionSettingsShell [data-permission-settings-tab]').forEach(tab=>{
      const selected=tab.dataset.permissionSettingsTab===key;
      tab.classList.toggle('active',selected);
      tab.setAttribute('aria-selected',selected?'true':'false');
    });
    qa('#permissionSettingsShell [data-permission-settings-panel]').forEach(panel=>{
      const selected=panel.dataset.permissionSettingsPanel===key;
      panel.classList.toggle('active',selected);
      panel.hidden=!selected;
    });
  }

  function bindEvents(){
    const shell=q('#permissionSettingsShell');
    if(!shell || shell.dataset.permissionSettingsBound==='1') return;
    shell.dataset.permissionSettingsBound='1';
    shell.addEventListener('click',async event=>{
      const tab=event.target.closest('[data-permission-settings-tab]');
      if(tab){ activateInnerTab(tab.dataset.permissionSettingsTab); return; }
      const roleAction=event.target.closest('[data-permission-role-action]');
      if(roleAction){
        if(roleAction.dataset.permissionRoleAction==='edit') await editRole(roleAction.dataset.roleId);
        if(roleAction.dataset.permissionRoleAction==='delete') await deleteRole(roleAction.dataset.roleId);
        return;
      }
      const bundleAction=event.target.closest('[data-permission-bundle-action]');
      if(bundleAction){
        if(bundleAction.dataset.permissionBundleAction==='edit') await requestEditBundle(bundleAction.dataset.bundleId);
        if(bundleAction.dataset.permissionBundleAction==='delete') await deleteBundle(bundleAction.dataset.bundleId);
      }
    });
    q('#permissionRoleForm')?.addEventListener('submit',saveRole);
    q('#permissionBundleForm')?.addEventListener('submit',saveBundle);
    q('#permissionRoleForm')?.addEventListener('input',()=>{ state.roleDirty=true; });
    q('#permissionBundleForm')?.addEventListener('input',event=>{
      if(event.target.matches('[data-permission-plant-code]')) return;
      state.bundleDirty=true;
    });
    q('#permissionRoleResetBtn')?.addEventListener('click',resetRoleForm);
    q('#permissionBundleResetBtn')?.addEventListener('click',resetBundleForm);
    q('#permissionRolesRefreshBtn')?.addEventListener('click',()=>refreshModel('role'));
    q('#permissionBundlesRefreshBtn')?.addEventListener('click',()=>refreshModel('bundle'));
    q('#permissionBundleAllPlantsInput')?.addEventListener('change',()=>{ state.bundleDirty=true; renderPlantOptions(); });
    q('#permissionBundlePlantOptions')?.addEventListener('change',event=>{
      const input=event.target.closest('[data-permission-plant-code]');
      if(!input) return;
      input.checked ? state.bundlePlantDraft.add(input.dataset.permissionPlantCode) : state.bundlePlantDraft.delete(input.dataset.permissionPlantCode);
      state.bundleDirty=true;
    });
    q('#permissionBundleScreensBtn')?.addEventListener('click',openScreenPicker);
    q('#permissionScreenPickerOverlay')?.addEventListener('click',event=>{
      if(event.target.closest('[data-permission-screen-picker-action="close"]')) closeScreenPicker();
      const screenCard=event.target.closest('[data-permission-screen-key]');
      if(screenCard) openScreenEditor(screenCard.dataset.permissionScreenKey);
    });
    q('#permissionScreenSearchInput')?.addEventListener('input',renderScreenCards);
    q('#permissionScreenEditorOverlay')?.addEventListener('click',event=>{
      if(event.target.closest('[data-permission-editor-action="close"]')) closeScreenEditor();
    });
    q('#permissionScreenPermissionTree')?.addEventListener('change',event=>{
      const input=event.target.closest('input[data-permission-key]');
      if(input) updateEditorSelection(input.dataset.permissionKey,input.checked);
    });
    q('#permissionEditorSelectAllBtn')?.addEventListener('click',()=>selectEditorBranch(true));
    q('#permissionEditorClearAllBtn')?.addEventListener('click',()=>selectEditorBranch(false));
    q('#permissionEditorSaveBtn')?.addEventListener('click',saveEditorSelection);
  }

  function init(){
    if(state.initialized) return;
    state.initialized=true;
    bindEvents();
    resetRoleForm();
    resetBundleForm();
    syncManagementActionAccess();
  }

  function isDirty(){ return state.roleDirty || state.bundleDirty; }

  function closeModals(){
    closeScreenEditor({restoreFocus:false});
    closeScreenPicker({restoreFocus:false});
  }

  function resetSession(){
    closeModals();
    state.loaded=false;
    state.loadingPromise=null;
    state.roles=[];
    state.bundles=[];
    state.plants=[];
    state.bundlePlants=new Map();
    state.bundleItems=new Map();
    state.bundleRoleCounts=new Map();
    state.roleDirty=false;
    state.bundleDirty=false;
    state.bundlePermissionDraft=new Set();
    state.bundlePlantDraft=new Set();
    resetRoleForm();
    resetBundleForm();
    const rolesBody=q('#permissionRolesTable tbody');
    const bundlesBody=q('#permissionBundlesTable tbody');
    if(rolesBody) rolesBody.innerHTML='<tr><td colspan="5" class="empty-row">يتم تحميل الأدوار عند فتح التبويب.</td></tr>';
    if(bundlesBody) bundlesBody.innerHTML='<tr><td colspan="6" class="empty-row">يتم تحميل الحزم عند فتح التبويب.</td></tr>';
    setStatus('#permissionRoleStatus','');
    setStatus('#permissionBundleStatus','');
    syncManagementActionAccess();
  }

  globalScope.PermissionSettings=Object.freeze({init,load,isDirty,closeModals,resetSession});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})(typeof globalThis!=='undefined' ? globalThis : window);
