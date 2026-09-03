(function permissionShadowFactory(globalScope) {
  'use strict';

  /*
   * P4 shadow resolver.
   *
   * This module never grants, denies, hides, disables, redirects, or saves.
   * The legacy permission engine in app.js remains the sole enforcement owner.
   */

  const PHASE = 'P4_PERMISSION_SHADOW_RESOLVER';
  const EMPTY_COMPARISON = Object.freeze({
    scope: 'ROOT_SCREEN_VIEW_ONLY',
    parityEligible: false,
    total: 0,
    comparable: 0,
    matches: 0,
    differences: 0,
    unresolved: 0,
    rows: Object.freeze([])
  });

  let generation = 0;
  let inFlight = null;
  let state = {
    phase: PHASE,
    status: 'IDLE',
    reason: '',
    loadedAt: '',
    payload: null,
    comparison: EMPTY_COMPARISON,
    error: ''
  };

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function publish() {
    if (typeof globalScope.dispatchEvent !== 'function' || typeof globalScope.CustomEvent !== 'function') return;
    globalScope.dispatchEvent(new globalScope.CustomEvent('audit-permission-shadow-updated', {
      detail: {
        phase: PHASE,
        status: state.status,
        comparison: clone(state.comparison)
      }
    }));
  }

  function setState(next) {
    state = next;
    publish();
  }

  function normalizeRpcPayload(raw) {
    const value = Array.isArray(raw) && raw.length === 1 ? raw[0] : raw;
    if (!value || typeof value !== 'object') throw new Error('P4_INVALID_SHADOW_PAYLOAD');
    const plants = Array.isArray(value.plants) ? value.plants.map(plant => ({
      plant_code: String(plant?.plant_code || '').trim().toUpperCase(),
      permission_count: Number(plant?.permission_count || 0),
      permissions: Array.isArray(plant?.permissions)
        ? [...new Set(plant.permissions.map(key => String(key || '').trim()).filter(Boolean))].sort()
        : []
    })).filter(plant => plant.plant_code) : [];
    return {
      phase: String(value.phase || PHASE),
      status: String(value.status || 'UNKNOWN'),
      legacy_role_key: String(value.legacy_role_key || ''),
      role_key: String(value.role_key || ''),
      role_source: String(value.role_source || ''),
      legacy_mapping_status: value.legacy_mapping_status == null ? null : String(value.legacy_mapping_status),
      is_super_admin: value.is_super_admin === true,
      resolver_ready: value.resolver_ready === true,
      active_plant_count: Number(value.active_plant_count || plants.length),
      assigned_bundle_count: Number(value.assigned_bundle_count || 0),
      plants,
      read_only_resolution: value.read_only_resolution === true,
      legacy_enforcement_changed: value.legacy_enforcement_changed === true,
      new_enforcement_enabled: value.new_enforcement_enabled === true,
      permission_cutover_started: value.permission_cutover_started === true
    };
  }

  function buildLegacyRootComparison(payload) {
    const registry = globalScope.AuditPermissionRegistry;
    const legacyHasPermission = globalScope.hasPermission;
    const mappings = registry?.legacyScreenMappings;
    if (!Array.isArray(mappings) || typeof legacyHasPermission !== 'function') {
      return EMPTY_COMPARISON;
    }

    const grouped = new Map();
    mappings.forEach(mapping => {
      const canonicalKey = String(mapping?.canonicalKey || '').trim();
      const legacyKey = String(mapping?.legacyKey || '').trim();
      if (!canonicalKey || !legacyKey) return;
      if (!grouped.has(canonicalKey)) grouped.set(canonicalKey, []);
      grouped.get(canonicalKey).push({
        legacyKey,
        mappingStatus: String(mapping?.status || 'NEEDS_DECISION')
      });
    });

    const plantSets = new Map((payload.plants || []).map(plant => [
      plant.plant_code,
      new Set(plant.permissions || [])
    ]));
    const rows = [];

    grouped.forEach((sources, canonicalKey) => {
      const mappingResolved = sources.every(source => ['MATCHED', 'MERGED_LEGACY'].includes(source.mappingStatus));
      const legacyAllowed = sources.some(source => legacyHasPermission(source.legacyKey, 'view') === true);
      plantSets.forEach((permissionSet, plantCode) => {
        const shadowAllowed = permissionSet.has(canonicalKey);
        rows.push({
          plant_code: plantCode,
          canonical_key: canonicalKey,
          legacy_sources: sources.map(source => source.legacyKey),
          mapping_statuses: [...new Set(sources.map(source => source.mappingStatus))],
          old_allowed: legacyAllowed,
          new_allowed: shadowAllowed,
          result: mappingResolved ? (legacyAllowed === shadowAllowed ? 'MATCH' : 'DIFFERENCE') : 'UNRESOLVED'
        });
      });
    });

    const comparableRows = rows.filter(row => row.result !== 'UNRESOLVED');
    const differences = comparableRows.filter(row => row.result === 'DIFFERENCE').length;
    return {
      scope: 'ROOT_SCREEN_VIEW_ONLY',
      parityEligible: false,
      total: rows.length,
      comparable: comparableRows.length,
      matches: comparableRows.length - differences,
      differences,
      unresolved: rows.length - comparableRows.length,
      rows
    };
  }

  function failedState(reason, error) {
    return {
      phase: PHASE,
      status: 'LOAD_FAILED',
      reason,
      loadedAt: new Date().toISOString(),
      payload: null,
      comparison: EMPTY_COMPARISON,
      error: String(error?.message || error || 'P4_SHADOW_LOAD_FAILED')
    };
  }

  function refresh(reason = 'manual') {
    if (inFlight) return inFlight;

    const requestGeneration = ++generation;
    setState({
      phase: PHASE,
      status: 'LOADING',
      reason,
      loadedAt: '',
      payload: null,
      comparison: EMPTY_COMPARISON,
      error: ''
    });

    let request;
    request = (async () => {
      try {
        if (!globalScope.WarehouseDB?.ready || !globalScope.WarehouseDB?.client?.rpc) {
          throw new Error('P4_SHADOW_DATABASE_UNAVAILABLE');
        }
        const { data, error } = await globalScope.WarehouseDB.client.rpc(
          'app_permission_p4_resolve_current_user_shadow'
        );
        if (error) throw error;
        if (requestGeneration !== generation) return getSnapshot();

        const payload = normalizeRpcPayload(data);
        if (payload.new_enforcement_enabled || payload.permission_cutover_started || payload.legacy_enforcement_changed) {
          throw new Error('P4_SHADOW_SAFETY_CONTRACT_VIOLATION');
        }
        const comparison = buildLegacyRootComparison(payload);
        setState({
          phase: PHASE,
          status: payload.status === 'READY' ? 'READY' : 'NOT_READY',
          reason,
          loadedAt: new Date().toISOString(),
          payload,
          comparison,
          error: ''
        });
      } catch (error) {
        if (requestGeneration === generation) setState(failedState(reason, error));
      } finally {
        if (inFlight === request) inFlight = null;
      }
      return getSnapshot();
    })();
    inFlight = request;
    return request;
  }

  function inspect(permissionKey, plantCode) {
    const key = String(permissionKey || '').trim();
    const plant = String(plantCode || '').trim().toUpperCase();
    const row = state.payload?.plants?.find(item => item.plant_code === plant);
    return Object.freeze({
      phase: PHASE,
      diagnosticOnly: true,
      ready: state.status === 'READY',
      permissionKey: key,
      plantCode: plant,
      shadowAllowed: Boolean(row && row.permissions.includes(key))
    });
  }

  function getSnapshot() {
    return clone(state);
  }

  function reset() {
    generation += 1;
    inFlight = null;
    setState({
      phase: PHASE,
      status: 'IDLE',
      reason: '',
      loadedAt: '',
      payload: null,
      comparison: EMPTY_COMPARISON,
      error: ''
    });
  }

  const api = Object.freeze({
    phase: PHASE,
    enforcementEnabled: false,
    refresh,
    reset,
    inspect,
    getSnapshot
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope && typeof globalScope === 'object') {
    Object.defineProperty(globalScope, 'PermissionShadow', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: api
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
