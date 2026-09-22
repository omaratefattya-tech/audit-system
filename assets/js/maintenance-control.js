(function(){
  'use strict';
  let bound=false;
  let loading=false;
  let currentState=null;
  const $=s=>document.querySelector(s);
  const escapeHtml=v=>String(v??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const formatDate=value=>{
    if(!value) return '—';
    try{return new Date(value).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'});}catch(_){return String(value);}
  };
  function setStatus(message='',type=''){
    const el=$('#maintenanceSettingsStatus'); if(!el) return;
    el.textContent=message; el.className='upload-status maintenance-settings-status'+(type?' '+type:'');
  }
  function isSuperAdmin(){return window.PermissionRuntime?.isSuperAdmin?.()===true;}
  async function rpc(name,args={}){
    if(!window.WarehouseDB?.client) return {data:null,error:new Error('Supabase غير متصل.')};
    return WarehouseDB.client.rpc(name,args);
  }
  function render(state){
    currentState=state||{};
    const enabled=state?.enabled===true;
    const pill=$('#maintenanceStatePill');
    if(pill){pill.dataset.state=enabled?'active':'inactive';pill.textContent=enabled?'وضع الصيانة مفعّل':'النظام متاح للمستخدمين';}
    const title=$('#maintenanceStatusTitle'); if(title) title.textContent=enabled?'النظام في وضع الصيانة':'النظام يعمل بصورة طبيعية';
    const desc=$('#maintenanceStatusDescription'); if(desc) desc.textContent=enabled?(state?.message||'النظام في وضع الصيانة.'):'يمكن للمستخدمين المصرح لهم تسجيل الدخول واستخدام النظام.';
    const by=$('#maintenanceEnabledBy'); if(by) by.textContent=enabled?(state?.enabled_by_name||state?.enabled_by||'سوبر أدمن'):'—';
    const at=$('#maintenanceEnabledAt'); if(at) at.textContent=enabled?formatDate(state?.enabled_at):'—';
    const input=$('#maintenanceMessageInput'); if(input && enabled && state?.message) input.value=state.message;
    const toggleBtn=$('#maintenanceToggleBtn');
    const toggleText=$('#maintenanceToggleText');
    if(toggleBtn){
      toggleBtn.dataset.mode=enabled?'disable':'enable';
      toggleBtn.setAttribute('aria-pressed',enabled?'true':'false');
      toggleBtn.setAttribute('aria-label',enabled?'إغلاق وضع الصيانة':'تفعيل وضع الصيانة');
      toggleBtn.title=enabled?'إغلاق وضع الصيانة والسماح للمستخدمين بالدخول':'تفعيل وضع الصيانة ومنع المستخدمين من الدخول';
    }
    if(toggleText) toggleText.textContent=enabled?'إغلاق وضع الصيانة':'تفعيل وضع الصيانة';
    if(input) input.disabled=enabled;
  }
  async function loadPanel(options={}){
    if(!isSuperAdmin()) return false;
    if(loading) return false;
    loading=true;
    if(!options.silent) setStatus('جاري تحميل حالة الصيانة...');
    try{
      const {data,error}=await rpc('app_maintenance_status',{});
      if(error) throw error;
      render(data||{enabled:false});
      if(!options.silent) setStatus('تم تحديث حالة الصيانة.','ok');
      return true;
    }catch(error){
      console.warn('[maintenance] load failed',error);
      const msg=String(error?.message||'');
      setStatus(/app_maintenance_status|schema cache|Could not find the function|does not exist/i.test(msg)?'ميزة وضع الصيانة غير مثبتة على قاعدة البيانات. شغّل ملف MAINTENANCE-MODE-01-install.sql أولًا.':'تعذر تحميل حالة وضع الصيانة.','err');
      return false;
    }finally{loading=false;}
  }
  async function setMaintenance(enabled){
    if(!isSuperAdmin()){setStatus('هذه الوظيفة متاحة للسوبر أدمن فقط.','err');return;}
    const input=$('#maintenanceMessageInput');
    const message=String(input?.value||'').trim()||'النظام في وضع الصيانة. يرجى المحاولة مرة أخرى لاحقًا.';
    if(enabled){
      const ok=window.confirm('سيتم تفعيل وضع الصيانة وإنهاء جميع جلسات المستخدمين الأخرى فورًا. هل تريد المتابعة؟');
      if(!ok) return;
    }else{
      const ok=window.confirm('سيتم إنهاء وضع الصيانة والسماح للمستخدمين بتسجيل الدخول مرة أخرى. هل تريد المتابعة؟');
      if(!ok) return;
    }
    const toggleBtn=$('#maintenanceToggleBtn'),refreshBtn=$('#refreshMaintenanceStatusBtn');
    [toggleBtn,refreshBtn].forEach(b=>{if(b)b.disabled=true;});
    setStatus(enabled?'جاري تفعيل وضع الصيانة وإنهاء الجلسات الأخرى...':'جاري إنهاء وضع الصيانة...');
    try{
      const sessionId=window.AppSessionControl?.getCurrentSessionId?.()||null;
      const {data,error}=await rpc('app_maintenance_set',{p_enabled:Boolean(enabled),p_message:message,p_keep_session_id:sessionId});
      if(error) throw error;
      render(data||{enabled});
      setStatus(enabled?'تم تفعيل وضع الصيانة. تم إنهاء جلسات المستخدمين الأخرى.':'تم إنهاء وضع الصيانة. يمكن للمستخدمين تسجيل الدخول الآن.','ok');
    }catch(error){
      console.error('[maintenance] update failed',error);
      setStatus(String(error?.message||'تعذر تحديث وضع الصيانة.'),'err');
      await loadPanel({silent:true});
    }finally{[toggleBtn,refreshBtn].forEach(b=>{if(b)b.disabled=false;});}
  }
  function bind(){
    if(bound) return; bound=true;
    document.addEventListener('click',e=>{
      if(e.target.closest('#maintenanceToggleBtn')) setMaintenance(!(currentState?.enabled===true));
      if(e.target.closest('#refreshMaintenanceStatusBtn')) loadPanel();
    });
  }
  document.addEventListener('DOMContentLoaded',bind);
  window.MaintenanceControl={loadPanel,setMaintenance,getState:()=>currentState};
})();
