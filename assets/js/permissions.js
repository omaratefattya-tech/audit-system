(function permissionRuntimeFactory(globalScope) {
  'use strict';

  // This remains the only frontend grant owner; P8 enforces the same grants on the server. No local storage, legacy defaults,
  // per-control RPCs, or fallback to an earlier user's grants.
  const PHASE = 'P8_BACKEND_ENFORCEMENT';
  const RPC = 'app_permission_p7_resolve_current_user';
  const registry = globalScope.AuditPermissionRegistry;
  const nodes = new Map((registry?.nodes || []).map(node => [node.key, node]));
  let generation = 0;
  let pending = null;
  let grants = new Map();
  let state = { phase: PHASE, status: 'IDLE', userId: '', reason: '', loadedAt: '', error: '', payload: null };
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));

  function publish() {
    if (typeof globalScope.dispatchEvent === 'function' && typeof globalScope.CustomEvent === 'function') {
      globalScope.dispatchEvent(new globalScope.CustomEvent('audit-permission-runtime-updated', {
        detail: { status: state.status, userId: state.userId, error: state.error }
      }));
    }
  }
  function clear(status, userId = '', reason = '', error = '', errorCode = '') {
    grants = new Map();
    state = { phase: PHASE, status, userId, reason, error, errorCode, loadedAt: '', payload: null };
    publish();
  }
  function reset(reason = 'signed-out') {
    generation += 1;
    pending?.controller?.abort();
    pending = null;
    clear('IDLE', '', reason);
  }
  function normalize(raw, userId) {
    const payload = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
    const fail = code => { throw new Error(code); };
    if (!payload || payload.phase !== PHASE || payload.contract_version !== 2) fail('P8_INVALID_CONTRACT');
    if (payload.resolved_user_id !== userId) fail('P8_USER_MISMATCH');
    if (payload.status !== 'READY' || payload.resolver_ready !== true) fail('P8_' + (payload.status || 'NOT_READY'));
    if (payload.role_source !== 'NEW_USER_ROLE') fail('P8_USER_ROLE_REQUIRED');
    if (payload.read_only_resolution !== true || payload.backend_enforcement !== 'BUNDLES_PLANT_SCOPED') fail('P8_INVALID_CONTRACT');
    if (typeof payload.is_super_admin !== 'boolean' || !payload.role_key || !Number.isInteger(payload.assigned_bundle_count) || payload.assigned_bundle_count < 1) fail('P8_INVALID_ROLE');
    if (payload.is_super_admin && (payload.role_key !== 'super_admin' || payload.legacy_role_key !== 'super_admin')) fail('P8_INVALID_SUPER_ADMIN');
    if (!nodes.size || nodes.size !== 384 || !Array.isArray(payload.registry) || payload.registry.length !== nodes.size) fail('P8_REGISTRY_MISMATCH');
    const seenKeys = new Set();
    for (const entry of payload.registry) {
      const node = nodes.get(entry.permission_key);
      if (!node || seenKeys.has(node.key) || (entry.parent_key || null) !== node.parent) fail('P8_REGISTRY_MISMATCH');
      seenKeys.add(node.key);
    }
    if (!Array.isArray(payload.plants) || !payload.plants.length || payload.active_plant_count !== payload.plants.length) fail('P8_INCOMPLETE_PLANTS');
    const resolved = new Map();
    for (const plant of payload.plants) {
      const code = plant.plant_code;
      if (typeof code !== 'string' || !/^[A-Z0-9_-]+$/.test(code) || resolved.has(code)) fail('P8_INVALID_PLANT');
      if (!Array.isArray(plant.permissions) || plant.permission_count !== plant.permissions.length) fail('P8_INCOMPLETE_PERMISSIONS');
      const keys = new Set(plant.permissions);
      if (keys.size !== plant.permission_count) fail('P8_DUPLICATE_PERMISSIONS');
      for (const key of keys) {
        const node = nodes.get(key);
        if (!node || (node.parent && !keys.has(node.parent))) fail('P8_INVALID_PERMISSION_TREE');
      }
      if (payload.is_super_admin && keys.size !== nodes.size) fail('P8_INCOMPLETE_SUPER_ADMIN');
      resolved.set(code, keys);
    }
    return { payload: clone(payload), resolved };
  }
  async function refresh({ userId = state.userId, reason = 'manual', signal } = {}) {
    if (!userId) { reset('missing-user'); return false; }
    if (pending?.userId === userId) return pending.promise;
    const request = ++generation;
    pending?.controller?.abort();
    const controller=new AbortController();
    const cancel=()=>controller.abort();
    signal?.addEventListener('abort',cancel,{once:true});
    if(signal?.aborted) controller.abort();
    let timer;
    clear('LOADING', userId, reason);
    const promise = Promise.resolve().then(async () => {
      try {
        if (!globalScope.WarehouseDB?.ready) throw new Error('P8_DATABASE_UNAVAILABLE');
        const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{
          const error=new Error('انتهت مهلة تحميل الصلاحيات.');
          error.code='P8_PERMISSION_TIMEOUT';reject(error);controller.abort();
        },15000);});
        const { data, error } = await Promise.race([
          globalScope.WarehouseDB.client.rpc(RPC).abortSignal(controller.signal),timeout
        ]);
        if (request !== generation) return false;
        if (error) throw error;
        const result = normalize(data, userId);
        grants = result.resolved;
        state = { ...state, status: 'READY', payload: result.payload, loadedAt: new Date().toISOString(), error: '', errorCode: '' };
        publish();
        return true;
      } catch (error) {
        if (request === generation) clear('ERROR', userId, reason, String(error?.message || 'P8_LOAD_FAILED'), String(error?.code || ''));
        return false;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort',cancel);
        if (request === generation) pending = null;
      }
    });
    pending = { userId, promise, controller };
    return promise;
  }
  function plantCodes() { return state.status === 'READY' ? [...grants.keys()] : []; }
  function normalizeScope(scope) {
    if (scope === 'all' || scope == null) return plantCodes();
    const codes = [].concat(scope).map(value => String(value || '').trim().toUpperCase());
    return [...new Set(codes)];
  }
  function keyAllowed(key, code) {
    if (state.status !== 'READY' || !nodes.has(key) || !grants.has(code)) return false;
    if (key.startsWith('settings.permission_settings') && !state.payload.is_super_admin && state.payload.role_key !== 'admin') return false;
    const selected = grants.get(code);
    let node = nodes.get(key);
    const visited = new Set();
    while (node) {
      if (visited.has(node.key) || !selected.has(node.key)) return false;
      visited.add(node.key);
      if (!node.parent) return true;
      node = nodes.get(node.parent);
    }
    return false;
  }
  function can(key, scope = 'all') {
    const codes = normalizeScope(scope);
    return codes.length > 0 && codes.every(code => keyAllowed(key, code));
  }
  function any(key) { return plantCodes().some(code => keyAllowed(key, code)); }
  function allowedPlants(key) { return plantCodes().filter(code => keyAllowed(key, code)); }
  // Empty/all filter means all plants the user may view, never an unscoped
  // database query. Invalid explicit selections return no scope.
  function scope(key, requested = []) {
    const values = [].concat(requested == null ? [] : requested).map(value => String(value).trim().toUpperCase()).filter(Boolean);
    if (!values.length || values.includes('ALL')) return allowedPlants(key);
    return values.every(code => keyAllowed(key, code)) ? [...new Set(values)] : [];
  }
  function getSnapshot() {
    return clone({ ...state, frontend_enforcement: 'BUNDLES', new_enforcement_enabled: true,
      permission_cutover_started: true, backend_enforcement: state.payload?.backend_enforcement || 'UNVERIFIED', persisted_grants: false });
  }
  Object.defineProperty(globalScope, 'PermissionRuntime', { configurable: false, writable: false, value: Object.freeze({
    phase: PHASE, enforcementEnabled: true, refresh, reset, can, any, scope, allowedPlants, plantCodes, getSnapshot,
    isReady: () => state.status === 'READY', isSuperAdmin: () => state.status === 'READY' && state.payload.is_super_admin === true,
    isAdmin: () => state.status === 'READY' && state.payload?.role_key === 'admin' && state.payload?.is_super_admin !== true,
    roleKey: () => state.status === 'READY' ? String(state.payload?.role_key || '') : '',
    userId: () => state.userId
  }) });
})(typeof globalThis !== 'undefined' ? globalThis : this);
