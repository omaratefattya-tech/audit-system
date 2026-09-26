(function(){
  'use strict';
  const SESSION_ID_KEY='warehouse-audit-app-session-id-v1';
  const DEVICE_ID_KEY='warehouse-audit-device-id-v1';
  const FORCED_NOTICE_KEY='warehouse-audit-forced-signout-notice-v1';
  const HEARTBEAT_MS=30000;
  let currentUserId='';
  let currentSessionId='';
  let monitorTimer=null;
  let realtimeChannel=null;
  let handlingRemoteLogout=false;
  let lastAccessToken='';
  let currentDeviceInfo=null;

  function uuid(){
    if(globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{
      const r=Math.random()*16|0,v=c==='x'?r:(r&3|8);return v.toString(16);
    });
  }
  function getSessionId(){
    try{
      let id=sessionStorage.getItem(SESSION_ID_KEY);
      if(!id){id=uuid();sessionStorage.setItem(SESSION_ID_KEY,id);}return id;
    }catch(_){ return currentSessionId || uuid(); }
  }
  function getDeviceId(){
    try{
      let id=localStorage.getItem(DEVICE_ID_KEY);
      if(!id){id=uuid();localStorage.setItem(DEVICE_ID_KEY,id);}return id;
    }catch(_){ return uuid(); }
  }
  function browserName(){
    const brands=navigator.userAgentData?.brands;
    if(Array.isArray(brands)){
      const known=brands.find(item=>!/Not.A.Brand/i.test(item.brand));
      if(known?.brand) return known.brand.replace('Google Chrome','Chrome').replace('Microsoft Edge','Edge');
    }
    const ua=navigator.userAgent||'';
    if(/Edg\//.test(ua)) return 'Edge';
    if(/Chrome\//.test(ua)) return 'Chrome';
    if(/Firefox\//.test(ua)) return 'Firefox';
    if(/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'Safari';
    return 'Browser';
  }
  function platformName(){
    const raw=navigator.userAgentData?.platform || navigator.platform || '';
    if(/Win/i.test(raw)) return 'Windows';
    if(/Android/i.test(raw) || /Android/i.test(navigator.userAgent||'')) return 'Android';
    if(/iPhone|iPad|iPod|iOS/i.test(raw) || /iPhone|iPad|iPod/i.test(navigator.userAgent||'')) return 'iOS';
    if(/Mac/i.test(raw)) return 'macOS';
    if(/Linux/i.test(raw)) return 'Linux';
    return raw || 'Unknown OS';
  }
  async function collectDeviceInfo(){
    if(currentDeviceInfo) return currentDeviceInfo;
    let model='';
    try{
      if(navigator.userAgentData?.getHighEntropyValues){
        const data=await navigator.userAgentData.getHighEntropyValues(['model']);
        model=String(data?.model||'').trim();
      }
    }catch(_){ }
    const platform=platformName(),browser=browserName();
    const form=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent||'')?'جهاز محمول':'جهاز مكتبي';
    currentDeviceInfo={
      device_id:getDeviceId(),
      platform_name:platform,
      browser_name:browser,
      device_model:model,
      device_label:[model,platform,browser,form].filter(Boolean).join(' • '),
      user_agent:navigator.userAgent||''
    };
    return currentDeviceInfo;
  }
  function rpc(name,args){
    if(!window.WarehouseDB?.client) return Promise.resolve({data:null,error:new Error('Supabase client is not ready')});
    return window.WarehouseDB.client.rpc(name,args||{});
  }
  function sessionFeatureError(error){
    const message=String(error?.message||'');
    if(/app_session_|Could not find the function|schema cache|does not exist/i.test(message)){
      const e=new Error('ميزة إدارة الجلسات غير مثبتة على قاعدة البيانات. شغّل ملف AUTH-SESSION-CONTROL-01-install.sql أولاً.');
      e.code='SESSION_CONTROL_NOT_INSTALLED';return e;
    }
    return error instanceof Error?error:new Error(message||'تعذر إدارة جلسة تسجيل الدخول.');
  }
  function conflictDeviceLines(conflicts){
    return (Array.isArray(conflicts)?conflicts:[]).slice(0,5).map((item,index)=>{
      const label=String(item?.device_label||'جهاز آخر').trim();
      let seen='';
      try{ seen=item?.last_seen_at?new Date(item.last_seen_at).toLocaleString('ar-EG',{dateStyle:'short',timeStyle:'short'}):''; }catch(_){ }
      return `${index+1}. ${label}${seen?' — آخر نشاط '+seen:''}`;
    });
  }
  function removeModal(){ document.querySelector('.session-conflict-overlay')?.remove(); }
  function openConflictModal(userName,conflicts){
    removeModal();
    return new Promise(resolve=>{
      const overlay=document.createElement('div');
      overlay.className='session-conflict-overlay';
      const deviceLines=conflictDeviceLines(conflicts);
      const count=Math.max(1,Array.isArray(conflicts)?conflicts.length:1);
      overlay.innerHTML=`<div class="session-conflict-modal" role="dialog" aria-modal="true" aria-labelledby="sessionConflictTitle">
        <div class="session-conflict-head">
          <div>
            <h2 id="sessionConflictTitle">الحساب مفتوح على جهاز آخر</h2>
            <p>هذا الحساب <strong>(${escapeHtml(userName||'المستخدم')})</strong> لديه ${count>1?count+' جلسات أخرى نشطة':'جلسة أخرى نشطة'}.</p>
          </div>
          <span class="session-conflict-icon" aria-hidden="true">!</span>
        </div>
        <div class="session-device-list">${deviceLines.map(line=>`<div>${escapeHtml(line)}</div>`).join('')}</div>
        <div class="session-choice-list" role="radiogroup" aria-label="إجراء تسجيل الدخول">
          <label><input type="radio" name="sessionConflictChoice" value="terminate_others"><span><b>متابعة تسجيل الدخول وإنهاء أي تسجيلات دخول أخرى</b><small>سيتم إخطار المستخدمين الآخرين ثم إنهاء جلساتهم.</small></span></label>
          <label><input type="radio" name="sessionConflictChoice" value="keep_others"><span><b>متابعة تسجيل الدخول وعدم إنهاء أي تسجيلات دخول أخرى</b><small>سيفتح النظام هنا وتظل الجلسات الأخرى كما هي.</small></span></label>
          <label><input type="radio" name="sessionConflictChoice" value="end_current"><span><b>إنهاء تسجيل الدخول هذا</b><small>يلغي محاولة الدخول الحالية فقط ولا يؤثر على أي جلسة أخرى.</small></span></label>
        </div>
        <div class="session-conflict-actions">
          <button type="button" class="session-continue-btn" disabled>استمرار</button>
          <button type="button" class="session-end-btn">إنهاء</button>
        </div>
      </div>`;
      document.body.appendChild(overlay);
      const continueBtn=overlay.querySelector('.session-continue-btn');
      const radios=[...overlay.querySelectorAll('input[name="sessionConflictChoice"]')];
      radios.forEach(r=>r.addEventListener('change',()=>{continueBtn.disabled=!radios.some(x=>x.checked);}));
      const finish=value=>{removeModal();resolve(value);};
      continueBtn.addEventListener('click',()=>finish(radios.find(r=>r.checked)?.value||'end_current'));
      overlay.querySelector('.session-end-btn')?.addEventListener('click',()=>finish('end_current'));
    });
  }
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));}
  async function rememberAccessToken(){
    try{const {data}=await WarehouseDB.client.auth.getSession();lastAccessToken=data?.session?.access_token||'';}catch(_){lastAccessToken='';}
  }
  async function maintenanceStatus(){
    const {data,error}=await rpc('app_maintenance_status',{});
    if(error){
      const message=String(error?.message||'');
      if(/app_maintenance_status|schema cache|Could not find the function|does not exist/i.test(message)) return {enabled:false,feature_missing:true};
      throw error;
    }
    return data||{enabled:false};
  }
  async function maintenanceGate(user){
    const state=await maintenanceStatus();
    if(state?.enabled && !state?.actor_is_super_admin){
      const message=String(state?.message||'النظام في وضع الصيانة. يرجى المحاولة مرة أخرى لاحقًا.');
      try{sessionStorage.setItem(FORCED_NOTICE_KEY,message);}catch(_){ }
      try{await WarehouseDB.signOut('local');}catch(_){ }
      return {allowed:false,maintenance:true,message};
    }
    return {allowed:true,state};
  }
  async function tryResumeServerSession(user){
    // A browser refresh/hard-refresh must keep the same logical application session.
    // sessionStorage survives reloads in the same tab, so first heartbeat the stored
    // session_id. If it is still active, resume it without starting a new login gate
    // and without re-showing conflicts that belong to other genuinely active devices.
    currentSessionId=getSessionId();
    currentUserId=user.id;
    await rememberAccessToken();
    const {data,error}=await rpc('app_session_heartbeat',{p_session_id:currentSessionId});
    if(error){
      console.warn('[session-control] refresh-resume heartbeat failed',error);
      return {resumed:false,status:'error'};
    }
    const status=String(data?.status||'missing');
    if(status==='active'){
      startMonitoring();
      return {resumed:true,status};
    }
    if(status==='revoked'){
      forceRemoteLogout(data?.message||'تم تسجيل الدخول من مكان آخر وإنهاء جلستك.');
      return {resumed:false,status,blocked:true};
    }
    return {resumed:false,status};
  }
  async function beginServerSession(user){
    const info=await collectDeviceInfo();
    currentSessionId=getSessionId();
    currentUserId=user.id;
    await rememberAccessToken();
    const {data,error}=await rpc('app_session_begin',{
      p_session_id:currentSessionId,
      p_device_id:info.device_id,
      p_device_label:info.device_label,
      p_platform_name:info.platform_name,
      p_browser_name:info.browser_name,
      p_device_model:info.device_model||null,
      p_user_agent:info.user_agent,
      p_client_version:'P14.6-SESSION-REFRESH-RESUME'
    });
    if(error) throw sessionFeatureError(error);
    return data||{};
  }
  async function activateCurrent(terminateOthers){
    const {data,error}=await rpc('app_session_activate',{p_session_id:currentSessionId,p_terminate_others:Boolean(terminateOthers)});
    if(error) throw sessionFeatureError(error);
    if(terminateOthers){
      const out=await WarehouseDB.signOutOthers();
      if(out?.error) console.warn('[session-control] auth others revoke failed',out.error);
    }
    startMonitoring();
    return data||{};
  }
  async function ensureAccess(user){
    if(!user?.id) return {allowed:false,message:'لا توجد جلسة مستخدم صالحة.'};
    const maintenance=await maintenanceGate(user);
    if(!maintenance.allowed) return maintenance;
    if(currentUserId===user.id && currentSessionId && monitorTimer){
      const status=await heartbeat();
      return {allowed:status!=='revoked'&&status!=='ended',resumed:true};
    }
    // P14.6: on reload/hard reload, resume the already-active server session first.
    // Only enter the normal conflict/login flow when the stored session is not active.
    const resume=await tryResumeServerSession(user);
    if(resume.blocked) return {allowed:false,revoked:true,message:'تم إنهاء جلسة تسجيل الدخول الحالية.'};
    if(resume.resumed) return {allowed:true,resumed:true,refreshResume:true};
    const begin=await beginServerSession(user);
    const conflicts=Array.isArray(begin?.conflicts)?begin.conflicts:[];
    if(conflicts.length){
      const choice=await openConflictModal(begin?.user_name||user.email||'المستخدم',conflicts);
      if(choice==='end_current'){
        await endCurrent('cancelled_login').catch(()=>{});
        await WarehouseDB.signOut('local').catch(()=>{});
        return {allowed:false,cancelled:true,message:'تم إلغاء تسجيل الدخول الحالي.'};
      }
      await activateCurrent(choice==='terminate_others');
      return {allowed:true,terminatedOthers:choice==='terminate_others'};
    }
    await activateCurrent(false);
    return {allowed:true};
  }
  async function heartbeat(){
    if(!currentSessionId || !currentUserId) return 'missing';
    const {data,error}=await rpc('app_session_heartbeat',{p_session_id:currentSessionId});
    if(error){console.warn('[session-control] heartbeat failed',error);return 'error';}
    const status=String(data?.status||'missing');
    if(status==='revoked') forceRemoteLogout(data?.message||'تم تسجيل الدخول من مكان آخر وإنهاء جلستك.');
    else if(status==='ended' || status==='missing') forceRemoteLogout('انتهت جلسة تسجيل الدخول الحالية. سجل الدخول مرة أخرى.');
    return status;
  }
  function startMonitoring(){
    stopMonitoring(false);
    monitorTimer=setInterval(()=>heartbeat().catch(()=>{}),HEARTBEAT_MS);
    if(WarehouseDB?.client?.channel && currentSessionId){
      realtimeChannel=WarehouseDB.client.channel('app-session-'+currentSessionId)
        .on('postgres_changes',{event:'UPDATE',schema:'public',table:'app_user_sessions',filter:`session_id=eq.${currentSessionId}`},payload=>{
          const row=payload?.new||{};
          if(row.status==='revoked') forceRemoteLogout(row.revoked_message||'تم تسجيل الدخول من مكان آخر وإنهاء جلستك.');
          if(row.status==='ended') forceRemoteLogout('انتهت جلسة تسجيل الدخول الحالية.');
        }).subscribe();
    }
  }
  function stopMonitoring(removeRealtime=true){
    if(monitorTimer){clearInterval(monitorTimer);monitorTimer=null;}
    if(removeRealtime && realtimeChannel && WarehouseDB?.client?.removeChannel){WarehouseDB.client.removeChannel(realtimeChannel).catch(()=>{});}
    realtimeChannel=null;
  }
  async function endCurrent(reason='local_sign_out'){
    const id=currentSessionId||getSessionId();
    if(!id || !WarehouseDB?.client) return false;
    const {data,error}=await rpc('app_session_end',{p_session_id:id,p_reason:reason});
    if(error) throw sessionFeatureError(error);
    stopMonitoring();
    return Boolean(data);
  }
  function bestEffortEnd(reason='window_closed'){
    if(!currentSessionId || !lastAccessToken || !window.WAREHOUSE_SUPABASE_CONFIG?.url) return;
    try{
      fetch(window.WAREHOUSE_SUPABASE_CONFIG.url+'/rest/v1/rpc/app_session_end',{
        method:'POST',
        headers:{
          apikey:window.WAREHOUSE_SUPABASE_CONFIG.anonKey,
          Authorization:'Bearer '+lastAccessToken,
          'Content-Type':'application/json'
        },
        body:JSON.stringify({p_session_id:currentSessionId,p_reason:reason}),
        keepalive:true
      }).catch(()=>{});
    }catch(_){ }
  }
  async function forceRemoteLogout(message){
    if(handlingRemoteLogout) return;
    handlingRemoteLogout=true;
    stopMonitoring();
    try{sessionStorage.setItem(FORCED_NOTICE_KEY,message);}catch(_){ }
    const overlay=document.createElement('div');
    overlay.className='session-forced-logout-overlay';
    overlay.innerHTML=`<div class="session-forced-logout-card"><div class="session-forced-logout-mark">!</div><h2>تم إنهاء الجلسة</h2><p>${escapeHtml(message)}</p><small>سيتم الرجوع إلى شاشة تسجيل الدخول.</small></div>`;
    document.body.appendChild(overlay);
    try{await WarehouseDB.signOut('local');}catch(_){ }
    setTimeout(()=>window.location.reload(),1800);
  }
  function consumeForcedNotice(){
    let message='';
    try{message=sessionStorage.getItem(FORCED_NOTICE_KEY)||'';sessionStorage.removeItem(FORCED_NOTICE_KEY);}catch(_){ }
    if(!message) return;
    setTimeout(()=>{
      const el=document.getElementById('mainLoginStatus');
      if(el){el.textContent=message;el.className='login-status err';}
    },0);
  }
  function resetLocalState(){stopMonitoring();currentUserId='';currentSessionId='';lastAccessToken='';handlingRemoteLogout=false;}

  // P14.6: do NOT end the application session on pagehide.
  // Browsers fire pagehide for refresh/hard-refresh as well as real tab/window closes,
  // and treating it as a logout made every refresh look like a new login. Real closes
  // are safely retired by the existing 5-minute stale-session window on the server.
  window.addEventListener('pagehide',()=>stopMonitoring());
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&currentSessionId) heartbeat().catch(()=>{});});
  document.addEventListener('DOMContentLoaded',consumeForcedNotice);

  window.AppSessionControl={ensureAccess,endCurrent,heartbeat,resetLocalState,bestEffortEnd,getCurrentSessionId:()=>currentSessionId||getSessionId(),maintenanceStatus};
})();
