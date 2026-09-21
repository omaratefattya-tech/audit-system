// Supabase client configuration for Warehouse Audit System.
// Publishable key only. Never put service_role key in frontend code.
window.WAREHOUSE_SUPABASE_CONFIG = {
  url: 'https://myeltyygvyxbopskescg.supabase.co',
  anonKey: 'sb_publishable_b-YcrSrysujEOBAdd_hy6Q_R7sYRMZC'
};

window.WarehouseDB = (() => {
  const cfg = window.WAREHOUSE_SUPABASE_CONFIG || {};
  const ready = Boolean(window.supabase && cfg.url && cfg.anonKey && !cfg.url.includes('YOUR_PROJECT_ID'));
  const AUTH_STORAGE_KEY='warehouse-audit-session-auth-v1';
  const authStorage={
    getItem(key){ try{return window.sessionStorage.getItem(key);}catch(_){return null;} },
    setItem(key,value){ try{window.sessionStorage.setItem(key,value);}catch(_){} },
    removeItem(key){ try{window.sessionStorage.removeItem(key);}catch(_){} }
  };
  const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth:{
      storage:authStorage,
      storageKey:AUTH_STORAGE_KEY,
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  }) : null;

  async function list(tableName, select = '*') {
    if (!client) return { data: null, error: new Error('Supabase config is not ready') };
    return client.from(tableName).select(select);
  }

  async function insert(tableName, payload) {
    if (!client) return { data: null, error: new Error('Supabase config is not ready') };
    return client.from(tableName).insert(payload).select();
  }

  async function signIn(email, password) {
    if (!client) return { data: null, error: new Error('Supabase config is not ready') };
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut(scope='local') {
    if (!client) return { error: new Error('Supabase config is not ready') };
    return client.auth.signOut({scope});
  }

  async function signOutOthers() {
    if (!client) return { error: new Error('Supabase config is not ready') };
    return client.auth.signOut({scope:'others'});
  }

  async function getUser() {
    if (!client) return { data: { user: null }, error: new Error('Supabase config is not ready') };
    return client.auth.getUser();
  }

  return { client, ready, list, insert, signIn, signOut, signOutOthers, getUser, authStorageKey:AUTH_STORAGE_KEY };
})();
