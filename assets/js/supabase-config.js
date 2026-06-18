// Supabase client configuration for Warehouse Audit System.
// Publishable key only. Never put service_role key in frontend code.
window.WAREHOUSE_SUPABASE_CONFIG = {
  url: 'https://myeltyygvyxbopskescg.supabase.co',
  anonKey: 'sb_publishable_b-YcrSrysujEOBAdd_hy6Q_R7sYRMZC'
};

window.WarehouseDB = (() => {
  const cfg = window.WAREHOUSE_SUPABASE_CONFIG || {};
  const ready = Boolean(window.supabase && cfg.url && cfg.anonKey && !cfg.url.includes('YOUR_PROJECT_ID'));
  const client = ready ? window.supabase.createClient(cfg.url, cfg.anonKey) : null;

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

  async function signOut() {
    if (!client) return { error: new Error('Supabase config is not ready') };
    return client.auth.signOut();
  }

  async function getUser() {
    if (!client) return { data: { user: null }, error: new Error('Supabase config is not ready') };
    return client.auth.getUser();
  }

  return { client, ready, list, insert, signIn, signOut, getUser };
})();
