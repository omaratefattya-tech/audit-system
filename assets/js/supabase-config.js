// ضع بيانات مشروع Supabase هنا بعد إنشائه.
// لا تستخدم Service Role Key داخل GitHub Pages نهائياً. استخدم publishable / anon key فقط.
window.WAREHOUSE_SUPABASE_CONFIG = {
  url: 'https://YOUR_PROJECT_ID.supabase.co',
  anonKey: 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY'
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

  return { client, ready, list, insert };
})();
