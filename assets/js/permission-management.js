(function permissionManagementModule(globalScope){
  'use strict';

  const SAVE_RPC='app_permission_p6_save_role_bundles';
  const MANAGEMENT_SELECTOR='#permissionsManagementCapture [data-permission-settings-management-action]';
  const state={
    initialized:false,
    loaded:false,
    loadingPromise:null,
    saving:false,
    roles:[],
    bundles:[],
    bundlePlants:new Map(),
    bundlePermissions:new Map(),
    roleBundles:new Map(),
    roleUserCounts:new Map(),
    selectedRoleId:'',
    originalBundleIds:new Set(),
    draftBundleIds:new Set(),
    blockedBundleIds:new Set(),
    search:''
  };

  const q=selector=>document.querySelector(selector);
  const qa=selector=>[...document.querySelectorAll(selector)];
  const safeHtml=value=>typeof globalScope.escapeHtml==='function'
    ? globalScope.escapeHtml(value)
    : String(value??'').replace(/[&<>\"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[char]));
  const isAuthorized=()=>typeof globalScope.isSuperAdmin==='function' && globalScope.isSuperAdmin();
  const isReady=()=>Boolean(globalScope.WarehouseDB?.ready && globalScope.WarehouseDB?.client);
  const hasCompleteData=()=>state.loaded && !state.loadingPromise;

  function setStatus(message,type=''){
    const element=q('#permissionsManagementStatus');
    if(!element) return;
    element.className='upload-status permissions-status-bar '+(type||'');
    element.textContent=message||'';
  }

  function errorMessage(error){
    const message=String(error?.message || error || '');
    if(/PERMISSION_DATA_INCOMPLETE|PERMISSION_DATA_CHANGED|PERMISSION_DATA_LOADER_UNAVAILABLE/.test(message)) return 'لم يكتمل تحميل بيانات الصلاحيات أو تغيّرت أثناء التحميل. تم منع الحفظ؛ اضغط تحديث لإعادة تحميل البيانات كاملة.';
    if(/P6_PROTECTED_BASELINE_BUNDLE/i.test(message)) return 'إحدى حزم الترحيل المحمية مخصصة لدور نظامي آخر ولا يمكن إسنادها لهذا الدور.';
    if(/P6_SYSTEM_BASELINE_REQUIRED/i.test(message)) return 'لا يمكن إزالة حزمة الترحيل الأساسية المحمية من الدور النظامي.';
    if(/42501|permission denied|row-level security|P6_PERMISSION_DENIED/i.test(message)) return 'غير مسموح بإدارة ربط الأدوار بالحزم. يلزم حساب Super Admin نشط.';
    if(/PGRST202|Could not find the function|does not exist|schema cache/i.test(message)) return 'ملف قاعدة بيانات P6 غير مطبق أو لم يتم تحديث Schema Cache بعد.';
    if(/P6_ROLE_NOT_FOUND|P6_BUNDLE_NOT_FOUND/i.test(message)) return 'الدور أو إحدى الحزم لم يعد موجودًا. حدّث البيانات وحاول مرة أخرى.';
    if(/P6_ROLE_INACTIVE/i.test(message)) return 'لا يمكن تعديل دور غير نشط.';
    if(/P6_SUPER_ADMIN_ROLE_PROTECTED/i.test(message)) return 'دور Super Admin محمي ولا يمكن تغيير حزمته.';
    if(/P6_BUNDLE_REQUIRED/i.test(message)) return 'يجب اختيار حزمة صلاحيات نشطة واحدة على الأقل.';
    if(/P6_INACTIVE_OR_UNKNOWN_BUNDLE/i.test(message)) return 'الاختيار يحتوي على حزمة غير موجودة أو غير نشطة.';
    if(/P6_INVALID_BUNDLE_CONFIGURATION/i.test(message)) return 'إحدى الحزم المختارة بلا صلاحيات أو بلا نطاق مصنع صالح.';
    if(/P6_ASSIGNED_USERS_CONFIRMATION_REQUIRED/i.test(message)) return 'الدور مرتبط بمستخدمين حاليين ويحتاج تأكيدًا صريحًا قبل تغيير حزم الصلاحيات.';
    return message ? 'تعذر تنفيذ العملية: '+message : 'تعذر تنفيذ العملية.';
  }

  function mapSetRelations(rows,keyField,valueField){
    const map=new Map();
    (rows||[]).forEach(row=>{
      const key=String(row[keyField]||'');
      if(!map.has(key)) map.set(key,new Set());
      map.get(key).add(String(row[valueField]||''));
    });
    return map;
  }

  function setsEqual(a,b){
    if(a.size!==b.size) return false;
    for(const value of a) if(!b.has(value)) return false;
    return true;
  }

  function isDirty(){
    return !setsEqual(state.originalBundleIds,state.draftBundleIds);
  }

  function selectedRole(){
    return state.roles.find(role=>role.id===state.selectedRoleId) || null;
  }

  function legacyBaselineRoleKey(bundle){
    const match=String(bundle?.description||'').match(/^P5_LEGACY_BASELINE:([^:]+):/);
    return match ? match[1] : '';
  }

  function isBundleAllowedForRole(bundle,role){
    if(!bundle || !role) return false;
    const baselineRoleKey=legacyBaselineRoleKey(bundle);
    if(baselineRoleKey) return baselineRoleKey===role.role_key;
    return !role.is_super_admin;
  }

  function sanitizedBundleIds(bundleIds,role){
    const allowedIds=new Set();
    (bundleIds||new Set()).forEach(bundleId=>{
      const bundle=state.bundles.find(item=>item.id===bundleId);
      if(isBundleAllowedForRole(bundle,role)) allowedIds.add(bundleId);
    });
    return allowedIds;
  }

  function requiredSystemBaselineIds(role){
    if(!role?.is_system || role.is_super_admin) return new Set();
    return new Set(state.bundles
      .filter(bundle=>legacyBaselineRoleKey(bundle)===role.role_key)
      .map(bundle=>bundle.id));
  }

  function hasRequiredSystemBaseline(role){
    const requiredIds=requiredSystemBaselineIds(role);
    if(role?.is_system && !role.is_super_admin && requiredIds.size!==1) return false;
    for(const bundleId of requiredIds){
      if(!state.draftBundleIds.has(bundleId)) return false;
    }
    return true;
  }

  function selectedBundles(){
    return state.bundles.filter(bundle=>state.draftBundleIds.has(bundle.id));
  }

  function effectivePermissionCount(){
    const union=new Set();
    selectedBundles().forEach(bundle=>{
      (state.bundlePermissions.get(bundle.id)||new Set()).forEach(key=>union.add(key));
    });
    return union.size;
  }

  function effectivePlantLabel(){
    const bundles=selectedBundles();
    if(!bundles.length) return '—';
    if(bundles.some(bundle=>bundle.all_plants)) return 'كل المصانع';
    const plants=new Set();
    bundles.forEach(bundle=>{
      (state.bundlePlants.get(bundle.id)||new Set()).forEach(code=>plants.add(code));
    });
    return plants.size ? [...plants].sort().join('، ') : 'لا يوجد نطاق مصنع';
  }

  function syncActionState(){
    const role=selectedRole();
    const authorized=isAuthorized();
    const save=q('#savePermissionsBtn');
    const canSave=authorized && hasCompleteData() && role && !role.is_super_admin && role.is_active && state.draftBundleIds.size>0 && hasRequiredSystemBaseline(role) && isDirty() && !state.saving;
    if(save){
      save.disabled=!canSave;
      save.dataset.permissionSettingsSaving=state.saving?'1':'0';
      save.classList.toggle('permission-disabled',!authorized);
      save.title=!authorized
        ? 'يلزم حساب Super Admin'
        : !hasCompleteData()
          ? 'يلزم اكتمال تحميل بيانات الصلاحيات'
        : role?.is_super_admin
          ? 'دور Super Admin محمي'
          : !isDirty()
            ? 'لا توجد تغييرات للحفظ'
            : state.draftBundleIds.size===0
              ? 'اختر حزمة واحدة على الأقل'
              : !hasRequiredSystemBaseline(role)
                ? 'حزمة الترحيل الأساسية للدور النظامي محمية ولا يمكن إزالتها'
              : '';
    }
    qa(MANAGEMENT_SELECTOR).forEach(button=>{
      if(button===save) return;
      button.classList.toggle('permission-disabled',!authorized);
      button.disabled=!authorized || Boolean(state.loadingPromise) || state.saving || (button.id!=='reloadPermissionsBtn' && !state.loaded);
    });
  }

  function renderRoleOptions(){
    const select=q('#permissionsRoleSelect');
    if(!select) return;
    const activeRoles=state.roles.filter(role=>role.is_active);
    if(!activeRoles.length){
      select.innerHTML='<option value="">لا توجد أدوار نشطة</option>';
      select.disabled=true;
      state.selectedRoleId='';
      return;
    }
    if(!activeRoles.some(role=>role.id===state.selectedRoleId)){
      state.selectedRoleId=(activeRoles.find(role=>!role.is_super_admin)||activeRoles[0]).id;
    }
    select.disabled=false;
    select.innerHTML=activeRoles.map(role=>`<option value="${safeHtml(role.id)}" ${role.id===state.selectedRoleId?'selected':''}>${safeHtml(role.role_name)}${role.is_super_admin?' — محمي':''}</option>`).join('');
  }

  function bundleScopeLabel(bundle){
    if(bundle.all_plants) return 'كل المصانع';
    const plants=[...(state.bundlePlants.get(bundle.id)||new Set())].sort();
    return plants.length ? plants.join('، ') : 'بدون مصنع';
  }

  function renderBundles(){
    const container=q('#permissionsBundleGrid');
    if(!container) return;
    if(!state.loaded){
      container.innerHTML=`<div class="permissions-empty-state">${state.loadingPromise?'جاري تحميل حزم الصلاحيات كاملة...':'لم يكتمل تحميل الحزم. اضغط تحديث.'}</div>`;
      return;
    }
    const role=selectedRole();
    const search=state.search.trim().toLowerCase();
    const rows=state.bundles.filter(bundle=>{
      if(!isBundleAllowedForRole(bundle,role)) return false;
      const haystack=[bundle.bundle_name,bundle.description,bundleScopeLabel(bundle)].join(' ').toLowerCase();
      return !search || haystack.includes(search);
    });
    if(!rows.length){
      container.innerHTML='<div class="permissions-empty-state">لا توجد حزم قابلة للإسناد مطابقة للبحث.</div>';
      return;
    }
    const protectedRole=Boolean(role?.is_super_admin);
    container.innerHTML=rows.map(bundle=>{
      const selected=state.draftBundleIds.has(bundle.id);
      const protectedBaseline=Boolean(legacyBaselineRoleKey(bundle));
      const disabled=protectedRole || protectedBaseline || !bundle.is_active || !isAuthorized();
      const permissionCount=(state.bundlePermissions.get(bundle.id)||new Set()).size;
      return `<label class="permission-bundle-option ${selected?'is-selected':''} ${!bundle.is_active?'is-inactive':''} ${protectedBaseline?'is-protected':''}">
        <input type="checkbox" data-permission-bundle-id="${safeHtml(bundle.id)}" ${selected?'checked':''} ${disabled?'disabled':''} />
        <span class="permission-bundle-option-mark" aria-hidden="true"></span>
        <span class="permission-bundle-option-body">
          <b>${safeHtml(bundle.bundle_name)}</b>
          <small>${safeHtml(bundle.description||'بدون وصف')}</small>
          <span class="permission-bundle-option-meta"><em>${safeHtml(bundleScopeLabel(bundle))}</em><em>${permissionCount} صلاحية</em><em>${bundle.is_active?'نشطة':'غير نشطة'}</em>${protectedBaseline?'<em>حزمة ترحيل محمية</em>':''}</span>
        </span>
      </label>`;
    }).join('');
  }

  function renderSummary(){
    const role=selectedRole();
    const selectedCount=state.draftBundleIds.size;
    const setText=(selector,value)=>{ const element=q(selector); if(element) element.textContent=String(value); };
    setText('#permissionsRolesCount',state.roles.filter(item=>item.is_active).length);
    setText('#permissionsBundlesCount',state.bundles.filter(item=>item.is_active && isBundleAllowedForRole(item,role)).length);
    setText('#permissionsSelectedBundlesCount',selectedCount);
    setText('#permissionsEffectiveCount',state.loaded?effectivePermissionCount():'—');
    setText('#permissionsSelectedRoleName',role?.role_name||'—');
    setText('#permissionsSelectedRoleKey',role?.role_key||'—');
    setText('#permissionsSelectedRoleType',role?.is_super_admin?'Super Admin محمي':role?.is_system?'دور نظامي':'دور مخصص');
    setText('#permissionsSelectedRoleUsers',state.roleUserCounts.get(role?.id)||0);
    setText('#permissionsSelectedRolePlants',effectivePlantLabel());
    const warning=q('#permissionsRoleSafetyNote');
    if(warning){
      warning.className='permissions-role-safety-note '+(role?.is_super_admin?'is-protected':state.blockedBundleIds.size?'is-blocked':isDirty()?'is-dirty':'');
      warning.textContent=role?.is_super_admin
        ? 'دور Super Admin محمي؛ يعرض الربط الحالي فقط ولا يقبل التعديل.'
        : state.blockedBundleIds.size
          ? `تم استبعاد ${state.blockedBundleIds.size} حزمة ترحيل محمية مرتبطة بدور غير مطابق. اختر حزمة صالحة واحفظ لإزالة الربط غير الآمن من ربط الدور.`
        : isDirty()
          ? 'التغييرات المحفوظة تحدد الشاشات والإجراءات المتاحة للمستخدمين عند تحديث صلاحيات حساباتهم.'
          : 'الوصول إلى الواجهة يعتمد على حزم الدور ونطاق المصانع.';
    }
    syncActionState();
  }

  function renderAll(){
    renderRoleOptions();
    renderBundles();
    renderSummary();
  }

  function selectRole(roleId){
    state.selectedRoleId=String(roleId||'');
    const role=selectedRole();
    state.originalBundleIds=new Set(state.roleBundles.get(state.selectedRoleId)||[]);
    state.draftBundleIds=sanitizedBundleIds(state.originalBundleIds,role);
    state.blockedBundleIds=new Set([...state.originalBundleIds].filter(bundleId=>!state.draftBundleIds.has(bundleId)));
    renderAll();
  }

  async function fetchData(){
    if(!isAuthorized()) throw new Error('P6_PERMISSION_DENIED');
    if(!isReady()) throw new Error('Supabase غير متصل.');
    const client=globalScope.WarehouseDB.client;
    const readAll=globalScope.AuditPermissionData?.readAll;
    if(typeof readAll!=='function') throw new Error('PERMISSION_DATA_LOADER_UNAVAILABLE');
    const [rolesResult,bundlesResult,plantsResult,itemsResult,linksResult,userRolesResult,usersResult]=await Promise.all([
      readAll(client,'app_permission_roles','id,role_key,role_name,description,is_system,is_super_admin,is_active',{order:[['is_system',false],['role_name',true]]}),
      readAll(client,'app_permission_bundles','id,bundle_name,description,all_plants,is_active',{order:[['bundle_name',true]]}),
      readAll(client,'app_permission_bundle_plants','bundle_id,plant_code',{keys:['bundle_id','plant_code']}),
      readAll(client,'app_permission_bundle_items','bundle_id,permission_key',{keys:['bundle_id','permission_key']}),
      readAll(client,'app_permission_role_bundles','role_id,bundle_id',{keys:['role_id','bundle_id']}),
      readAll(client,'app_permission_user_roles','role_id,user_id',{keys:['role_id','user_id']}),
      readAll(client,'app_users','id,is_active')
    ]);
    const failed=[rolesResult,bundlesResult,plantsResult,itemsResult,linksResult,userRolesResult,usersResult].find(result=>result.error);
    if(failed?.error) throw failed.error;
    state.roles=rolesResult.data||[];
    state.bundles=bundlesResult.data||[];
    state.bundlePlants=mapSetRelations(plantsResult.data,'bundle_id','plant_code');
    state.bundlePermissions=mapSetRelations(itemsResult.data,'bundle_id','permission_key');
    state.roleBundles=mapSetRelations(linksResult.data,'role_id','bundle_id');
    const activeUsers=new Set((usersResult.data||[]).filter(user=>user.is_active).map(user=>String(user.id)));
    state.roleUserCounts=new Map();
    (userRolesResult.data||[]).forEach(row=>{
      if(!activeUsers.has(String(row.user_id))) return;
      state.roleUserCounts.set(String(row.role_id),(state.roleUserCounts.get(String(row.role_id))||0)+1);
    });
  }

  async function load(options={}){
    if(!q('#permissionsManagementCapture')) return false;
    syncActionState();
    if(!isAuthorized()){
      setStatus('هذه الشاشة متاحة لـSuper Admin فقط.','err');
      return false;
    }
    if(state.loadingPromise) return state.loadingPromise;
    if(state.loaded && isDirty() && !options.force){
      renderAll();
      return true;
    }
    const preferredRoleId=options.roleId || state.selectedRoleId;
    state.loaded=false;
    state.loadingPromise=(async()=>{
      setStatus('جاري تحميل الأدوار وحزم الصلاحيات...');
      try{
        await fetchData();
        state.loaded=true;
        if(preferredRoleId && state.roles.some(role=>role.id===preferredRoleId && role.is_active)) state.selectedRoleId=preferredRoleId;
        renderRoleOptions();
        selectRole(state.selectedRoleId);
        setStatus(state.blockedBundleIds.size
          ? 'تم اكتشاف ربط محمي غير مطابق واستبعاده من المسودة. اختر حزمة صالحة واحفظ لإزالة الربط غير الآمن.'
          : 'تم تحميل ربط الأدوار بالحزم من النموذج الجديد.',state.blockedBundleIds.size?'err':'ok');
        return true;
      }catch(error){
        state.loaded=false;
        state.roles=[];
        state.bundles=[];
        state.bundlePlants=new Map();
        state.bundlePermissions=new Map();
        state.roleBundles=new Map();
        state.roleUserCounts=new Map();
        state.selectedRoleId='';
        state.originalBundleIds=new Set();
        state.draftBundleIds=new Set();
        state.blockedBundleIds=new Set();
        renderAll();
        setStatus(errorMessage(error),'err');
        return false;
      }finally{
        state.loadingPromise=null;
        syncActionState();
        renderBundles();
      }
    })();
    syncActionState();
    renderBundles();
    renderSummary();
    return state.loadingPromise;
  }

  async function confirmDiscard(){
    if(!isDirty()) return true;
    if(typeof globalScope.showAppLiquidConfirm!=='function') return globalScope.confirm('توجد تعديلات غير محفوظة. هل تريد تجاهلها؟');
    return globalScope.showAppLiquidConfirm({
      title:'تعديلات غير محفوظة',
      message:'سيتم تجاهل تعديلات ربط الحزم للدور الحالي.',
      confirmText:'تجاهل التعديلات'
    });
  }

  async function onRoleChange(event){
    if(!hasCompleteData() || state.saving){ event.target.value=state.selectedRoleId; return; }
    const nextRoleId=event.target.value;
    if(nextRoleId===state.selectedRoleId) return;
    const currentRoleId=state.selectedRoleId;
    if(!await confirmDiscard()){
      event.target.value=currentRoleId;
      return;
    }
    selectRole(nextRoleId);
    setStatus(state.blockedBundleIds.size
      ? 'تم اكتشاف ربط محمي غير مطابق واستبعاده من المسودة. احفظ بعد اختيار حزمة صالحة لإزالة الربط غير الآمن.'
      : 'تم تحميل الحزم المرتبطة بالدور المحدد.',state.blockedBundleIds.size?'err':'ok');
  }

  function onBundleChange(event){
    if(!hasCompleteData() || state.saving){ renderBundles(); return; }
    const checkbox=event.target.closest('[data-permission-bundle-id]');
    if(!checkbox) return;
    const bundleId=checkbox.dataset.permissionBundleId;
    const bundle=state.bundles.find(item=>item.id===bundleId);
    const role=selectedRole();
    if(checkbox.disabled || !isBundleAllowedForRole(bundle,role) || legacyBaselineRoleKey(bundle)){
      checkbox.checked=state.draftBundleIds.has(bundleId);
      setStatus('حزم الترحيل الأساسية محمية ولا يمكن نقلها أو تعديل ربطها.','err');
      return;
    }
    if(checkbox.checked) state.draftBundleIds.add(bundleId);
    else state.draftBundleIds.delete(bundleId);
    checkbox.closest('.permission-bundle-option')?.classList.toggle('is-selected',checkbox.checked);
    renderSummary();
    setStatus('توجد تعديلات غير محفوظة على ربط الحزم.','');
  }

  function setVisibleBundles(value){
    if(!hasCompleteData() || state.saving) return;
    const role=selectedRole();
    if(!role || role.is_super_admin || !isAuthorized()) return;
    qa('#permissionsBundleGrid [data-permission-bundle-id]').forEach(checkbox=>{
      if(checkbox.disabled) return;
      checkbox.checked=value;
      if(value) state.draftBundleIds.add(checkbox.dataset.permissionBundleId);
      else state.draftBundleIds.delete(checkbox.dataset.permissionBundleId);
    });
    renderBundles();
    renderSummary();
    setStatus('توجد تعديلات غير محفوظة على ربط الحزم.','');
  }

  function restoreSavedBundles(){
    if(!hasCompleteData() || state.saving) return;
    const role=selectedRole();
    if(!role || role.is_super_admin || !isAuthorized()) return;
    state.draftBundleIds=sanitizedBundleIds(state.originalBundleIds,role);
    renderBundles();
    renderSummary();
    setStatus('تمت استعادة آخر اختيارات محفوظة لهذا الدور.','ok');
  }

  async function save(){
    if(state.saving) return;
    if(!hasCompleteData()){ setStatus('انتظر اكتمال تحميل الصلاحيات أو اضغط تحديث قبل الحفظ.','err'); return; }
    const role=selectedRole();
    if(!isAuthorized()){ setStatus('يلزم حساب Super Admin للحفظ.','err'); return; }
    if(!isReady()){ setStatus('Supabase غير متصل.','err'); return; }
    if(!role){ setStatus('اختر دورًا أولًا.','err'); return; }
    if(role.is_super_admin){ setStatus('دور Super Admin محمي ولا يمكن تغيير حزمته.','err'); return; }
    if(!state.draftBundleIds.size){ setStatus('اختر حزمة صلاحيات نشطة واحدة على الأقل.','err'); return; }
    if(!hasRequiredSystemBaseline(role)){ setStatus('حزمة الترحيل الأساسية للدور النظامي محمية ولا يمكن إزالتها.','err'); return; }
    if([...state.draftBundleIds].some(bundleId=>!isBundleAllowedForRole(state.bundles.find(bundle=>bundle.id===bundleId),role))){
      setStatus('الاختيار يحتوي على حزمة ترحيل محمية مخصصة لدور آخر.','err');
      return;
    }
    if(!isDirty()){ setStatus('لا توجد تغييرات للحفظ.','ok'); return; }
    const activeUserCount=state.roleUserCounts.get(role.id)||0;
    let confirmed=false;
    if(activeUserCount>0){
      const message=`الدور «${role.role_name}» مرتبط بعدد ${activeUserCount} مستخدم نشط. الحفظ سيغير صلاحيات واجهة هؤلاء المستخدمين عند تحديث صلاحيات حساباتهم. هل تريد المتابعة؟`;
      confirmed=typeof globalScope.showAppLiquidConfirm==='function'
        ? await globalScope.showAppLiquidConfirm({title:'تأكيد تغيير حزم دور مستخدم',message,confirmText:'حفظ ربط الحزم'})
        : globalScope.confirm(message);
      if(!confirmed) return;
    }
    if(state.saving) return;
    if(!hasCompleteData() || selectedRole()?.id!==role.id){ setStatus('تغيّرت بيانات الدور أثناء التأكيد. أعد تحميل البيانات وراجع الاختيارات قبل الحفظ.','err'); return; }
    state.saving=true;
    syncActionState();
    setStatus('جاري حفظ ربط الدور بالحزم...');
    try{
      const {data,error}=await globalScope.WarehouseDB.client.rpc(SAVE_RPC,{
        p_role_id:role.id,
        p_bundle_ids:[...state.draftBundleIds],
        p_confirm_assigned_users:confirmed
      });
      if(error) throw error;
      state.originalBundleIds=new Set(state.draftBundleIds);
      state.blockedBundleIds=new Set();
      if(typeof globalScope.logSystemActivity==='function'){
        await globalScope.logSystemActivity('الصلاحيات','ربط دور بحزم صلاحيات',`ربط الحزم: ${role.role_key} ← ${state.draftBundleIds.size} حزمة`);
      }
      const reloaded=await load({force:true,roleId:role.id});
      setStatus(reloaded?`تم حفظ ${Number(data?.bundle_count||state.draftBundleIds.size)} حزمة للدور «${role.role_name}». تظهر صلاحيات الواجهة الجديدة للمستخدمين بعد تحديث صلاحيات حساباتهم.`:'تم حفظ الربط، لكن تعذر إعادة تحميل الصلاحيات كاملة. اضغط تحديث قبل أي تعديل آخر.',reloaded?'ok':'err');
    }catch(error){
      setStatus(errorMessage(error),'err');
    }finally{
      state.saving=false;
      syncActionState();
    }
  }

  async function refresh(){
    if(!await confirmDiscard()) return;
    await load({force:true,roleId:state.selectedRoleId});
  }

  function init(){
    if(state.initialized || !q('#permissionsManagementCapture')) return;
    state.initialized=true;
    q('#permissionsRoleSelect')?.addEventListener('change',onRoleChange);
    q('#permissionsQuickSearch')?.addEventListener('input',event=>{
      state.search=event.target.value||'';
      renderBundles();
    });
    q('#permissionsBundleGrid')?.addEventListener('change',onBundleChange);
    q('#savePermissionsBtn')?.addEventListener('click',save);
    q('#reloadPermissionsBtn')?.addEventListener('click',refresh);
    q('#permissionsSelectAllBtn')?.addEventListener('click',()=>setVisibleBundles(true));
    q('#permissionsClearAllBtn')?.addEventListener('click',()=>setVisibleBundles(false));
    q('#permissionsDefaultsBtn')?.addEventListener('click',restoreSavedBundles);
    syncActionState();
  }

  globalScope.PermissionManagement=Object.freeze({init,load,isDirty});
})(window);
