(() => {
  'use strict';

  const STATE = {
    initialized: false,
    plantCode: 'WF01',
    reportDate: '',
    status: 'idle',
    message: '',
    rows: [],
    summary: null,
    loading: false,
    error: '',
    search: '',
    filter: 'all',
    sortKey: '',
    sortDirection: '',
    requestSequence: 0,
    requestController: null
  };

  const NUMBER_FIELDS = new Set([
    'previous_oldest_quantity',
    'sales_quantity',
    'outgoing_transfers',
    'effective_outbound',
    'expected_remaining_quantity',
    'current_oldest_quantity',
    'difference',
    'stagnation_days'
  ]);
  const DATE_FIELDS = new Set(['previous_oldest_date', 'current_oldest_date']);
  const ARABIC_COLLATOR = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

  function rootElement() {
    return document.getElementById('inventory_expiry_tracking');
  }

  function activePanel() {
    return rootElement()?.querySelector(`[data-inventory-expiry-panel="${STATE.plantCode}"]`) || null;
  }

  function todayIso() {
    if (typeof window.todayISO === 'function') return window.todayISO();
    const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Cairo' }));
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function shiftIsoDate(iso, days) {
    const match = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return '';
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    date.setUTCDate(date.getUTCDate() + Number(days || 0));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  }

  function dateOnlyUtcMilliseconds(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const milliseconds = Date.UTC(year, month - 1, day);
    const parsed = new Date(milliseconds);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
    return milliseconds;
  }

  function calculateStagnationDays(reportDate, currentOldestDate) {
    const reportMilliseconds = dateOnlyUtcMilliseconds(reportDate);
    const oldestMilliseconds = dateOnlyUtcMilliseconds(currentOldestDate);
    if (reportMilliseconds === null || oldestMilliseconds === null) return null;
    const days = (reportMilliseconds - oldestMilliseconds) / 86400000;
    return Number.isInteger(days) && days >= 0 ? days : null;
  }

  function formatStagnationDays(days) {
    if (!Number.isInteger(days) || days < 0) return '—';
    if (days === 0) return '0 يوم';
    if (days === 1) return '1 يوم';
    if (days === 2) return 'يومان';
    if (days <= 10) return `${days} أيام`;
    return `${days} يومًا`;
  }

  function sortableValue(row, key) {
    return key === 'stagnation_days'
      ? calculateStagnationDays(STATE.reportDate, row.current_oldest_date)
      : row[key];
  }

  function displayDate(value) {
    return typeof window.formatDisplayDate === 'function' ? window.formatDisplayDate(value, '—') : (value || '—');
  }

  function escapeValue(value) {
    return typeof window.escapeHtml === 'function'
      ? window.escapeHtml(value ?? '')
      : String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function plantConfig(plantCode) {
    const configs = typeof INVENTORY_CLOSING_CONFIG === 'object' && INVENTORY_CLOSING_CONFIG
      ? Object.values(INVENTORY_CLOSING_CONFIG)
      : [];
    return configs.find(config => config?.plantCode === plantCode) || null;
  }

  function updateComparisonDate() {
    const node = document.getElementById('inventoryProductionComparisonDate');
    if (node) node.textContent = displayDate(shiftIsoDate(STATE.reportDate, -1));
  }

  function setSharedStatus(message = '', type = '') {
    const status = document.getElementById('inventoryProductionReportStatus');
    const retry = document.getElementById('inventoryProductionRetryBtn');
    if (status) {
      status.textContent = message;
      status.className = `inventory-production-screen-status${type ? ` ${type}` : ''}`;
    }
    if (retry) retry.hidden = !['error', 'warning'].includes(type);
  }

  function formatNumber(value, options = {}) {
    if (value === null || value === undefined || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return '—';
    const normalized = Math.abs(number) < 0.0005 ? 0 : number;
    const text = normalized.toLocaleString('en-US', {
      useGrouping: false,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3
    });
    return options.signed && normalized > 0 ? `+${text}` : text;
  }

  function summaryValue(key) {
    const value = Number(STATE.summary?.[key]);
    return Number.isFinite(value) ? value : 0;
  }

  function summaryCardsHtml() {
    const cards = [
      ['total', 'إجمالي الأصناف', 'total'],
      ['healthy', 'سليم', 'healthy'],
      ['violations', 'مخالفات', 'violation'],
      ['old_date_returned', 'عودة تاريخ', 'returned'],
      ['premature_disappearance', 'اختفاء مبكر', 'premature'],
      ['review', 'يحتاج مراجعة', 'review']
    ];
    return `<div class="inventory-production-summary">${cards.map(([key, label, tone]) => `
      <article class="inventory-production-summary-card ${tone}">
        <span>${escapeValue(label)}</span><strong>${summaryValue(key)}</strong>
      </article>`).join('')}</div>`;
  }

  function rowMatchesFilter(row) {
    if (STATE.filter === 'all') return true;
    if (STATE.filter === 'healthy') return row.status_category === 'healthy';
    if (STATE.filter === 'violations') return row.status_category === 'violation';
    if (STATE.filter === 'review') return row.status_category === 'review';
    return row.status_code === STATE.filter;
  }

  function visibleRows() {
    const search = STATE.search.trim().toLocaleLowerCase('ar');
    const filtered = STATE.rows.filter(row => {
      if (!rowMatchesFilter(row)) return false;
      if (!search) return true;
      return [row.material_code, row.material_name, row.status_label, row.status_reason]
        .some(value => String(value || '').toLocaleLowerCase('ar').includes(search));
    });
    if (!STATE.sortKey || !STATE.sortDirection) return filtered;
    return filtered.map((row, index) => ({ row, index })).sort((left, right) => {
      const first = sortableValue(left.row, STATE.sortKey);
      const second = sortableValue(right.row, STATE.sortKey);
      const firstEmpty = first === null || first === undefined || first === '';
      const secondEmpty = second === null || second === undefined || second === '';
      if (firstEmpty !== secondEmpty) return firstEmpty ? 1 : -1;
      let comparison = 0;
      if (!firstEmpty) {
        if (NUMBER_FIELDS.has(STATE.sortKey)) comparison = Number(first) - Number(second);
        else if (DATE_FIELDS.has(STATE.sortKey)) comparison = String(first).localeCompare(String(second));
        else comparison = ARABIC_COLLATOR.compare(String(first), String(second));
      }
      if (comparison !== 0) return STATE.sortDirection === 'desc' ? -comparison : comparison;
      const codeComparison = ARABIC_COLLATOR.compare(String(left.row.material_code || ''), String(right.row.material_code || ''));
      return codeComparison || left.index - right.index;
    }).map(item => item.row);
  }

  function sortIndicator(key) {
    if (STATE.sortKey !== key || !STATE.sortDirection) return '↕';
    return STATE.sortDirection === 'asc' ? '↑' : '↓';
  }

  function sortHeading(key, label) {
    const active = STATE.sortKey === key && STATE.sortDirection;
    const directionText = active ? (STATE.sortDirection === 'asc' ? 'تصاعدي' : 'تنازلي') : 'بدون ترتيب';
    return `<button class="inventory-production-sort" type="button" data-production-sort="${escapeValue(key)}" aria-label="ترتيب ${escapeValue(label)} — ${directionText}"><span>${escapeValue(label)}</span><b aria-hidden="true">${sortIndicator(key)}</b></button>`;
  }

  function movementCell(row, field, negativeField) {
    const note = row[negativeField] ? (row.movement_note || 'القيمة السالبة لم تدخل في استهلاك FIFO.') : '';
    return `<td class="inventory-production-number${row[negativeField] ? ' movement-negative' : ''}"${note ? ` title="${escapeValue(note)}"` : ''}>
      <b>${formatNumber(row[field])}</b>${note ? '<small>لم تدخل في FIFO</small>' : ''}
    </td>`;
  }

  function renderRow(row) {
    const expected = row.expected_note
      ? `<span class="inventory-production-expected-note">${escapeValue(row.expected_note)}</span>`
      : `<span class="inventory-production-number-text">${formatNumber(row.expected_remaining_quantity)}</span>`;
    const stagnationDays = calculateStagnationDays(STATE.reportDate, row.current_oldest_date);
    const stagnationWarning = stagnationDays !== null && stagnationDays >= 15;
    return `<tr data-production-status="${escapeValue(row.status_code)}">
      <td class="inventory-production-code">${escapeValue(row.material_code || '—')}</td>
      <td class="inventory-production-description">${escapeValue(row.material_name || '—')}</td>
      <td>${escapeValue(displayDate(row.previous_oldest_date))}</td>
      <td class="inventory-production-number">${formatNumber(row.previous_oldest_quantity)}</td>
      ${movementCell(row, 'sales_quantity', 'sales_negative')}
      ${movementCell(row, 'outgoing_transfers', 'outgoing_negative')}
      <td class="inventory-production-number">${formatNumber(row.effective_outbound)}</td>
      <td class="inventory-production-expected">${expected}</td>
      <td>${escapeValue(displayDate(row.current_oldest_date))}</td>
      <td class="inventory-production-number">${formatNumber(row.current_oldest_quantity)}</td>
      <td class="inventory-production-number inventory-production-difference">${formatNumber(row.difference, { signed: true })}</td>
      <td class="inventory-production-number inventory-production-stagnation${stagnationWarning ? ' is-warning' : ''}">${formatStagnationDays(stagnationDays)}</td>
      <td class="inventory-production-result">
        <span class="inventory-production-status-pill ${escapeValue(row.status_category)}">${escapeValue(row.status_label)}</span>
        <small>${escapeValue(row.status_reason)}</small>
        ${row.movement_note ? `<em>${escapeValue(row.movement_note)}</em>` : ''}
      </td>
    </tr>`;
  }

  function tableHtml() {
    const rows = visibleRows();
    const headings = [
      ['material_code', 'كود المادة'],
      ['material_name', 'وصف المادة'],
      ['previous_oldest_date', 'أقدم تاريخ أمس'],
      ['previous_oldest_quantity', 'كمية أمس'],
      ['sales_quantity', 'كمية البيع'],
      ['outgoing_transfers', 'التحويل الصادر'],
      ['effective_outbound', 'حركة الخروج الفعلية'],
      ['expected_remaining_quantity', 'المتوقع'],
      ['current_oldest_date', 'أقدم تاريخ اليوم'],
      ['current_oldest_quantity', 'كمية اليوم'],
      ['difference', 'الفرق'],
      ['stagnation_days', 'مدة ركود الصنف في المخزن'],
      ['status_label', 'الحالة']
    ];
    return `<div class="inventory-production-table-wrap">
      <table class="inventory-production-table" data-no-universal-table="1">
        <thead><tr>${headings.map(([key, label]) => `<th>${sortHeading(key, label)}</th>`).join('')}</tr></thead>
        <tbody>${rows.length ? rows.map(renderRow).join('') : '<tr><td colspan="13" class="empty-row">لا توجد أصناف مطابقة للبحث أو الفلتر.</td></tr>'}</tbody>
      </table>
    </div>`;
  }

  function workspaceHtml() {
    return `${summaryCardsHtml()}
      <div class="inventory-production-toolbar glass-soft">
        <label>بحث
          <input type="search" data-production-search placeholder="ابحث بالكود أو الوصف أو الحالة" value="${escapeValue(STATE.search)}" />
        </label>
        <label>الحالة
          <select data-production-filter>
            <option value="all"${STATE.filter === 'all' ? ' selected' : ''}>الكل</option>
            <option value="healthy"${STATE.filter === 'healthy' ? ' selected' : ''}>سليم</option>
            <option value="violations"${STATE.filter === 'violations' ? ' selected' : ''}>مخالفات</option>
            <option value="premature_disappearance"${STATE.filter === 'premature_disappearance' ? ' selected' : ''}>اختفاء مبكر</option>
            <option value="date_should_have_ended"${STATE.filter === 'date_should_have_ended' ? ' selected' : ''}>تاريخ مستمر بعد نفاده</option>
            <option value="old_date_returned"${STATE.filter === 'old_date_returned' ? ' selected' : ''}>عودة تاريخ قديم</option>
            <option value="review"${STATE.filter === 'review' ? ' selected' : ''}>يحتاج مراجعة</option>
          </select>
        </label>
        <div class="inventory-production-toolbar-note">حركة الخروج الفعلية = البيع الموجب + التحويل الصادر الموجب</div>
      </div>
      ${tableHtml()}`;
  }

  function render(options = {}) {
    const root = rootElement();
    const panel = activePanel();
    if (!root || !panel) return;
    const focusedSearch = options.preserveSearchFocus && document.activeElement?.matches?.('[data-production-search]');
    const selectionStart = focusedSearch ? document.activeElement.selectionStart : null;
    root.querySelectorAll('[data-inventory-expiry-panel]').forEach(item => {
      if (item !== panel) item.innerHTML = '';
    });
    if (STATE.loading) {
      panel.innerHTML = '<div class="inventory-production-state loading"><span class="inventory-production-spinner" aria-hidden="true"></span><b>جاري تحميل تقرير تتبع تواريخ الإنتاج...</b></div>';
      return;
    }
    if (STATE.error) {
      panel.innerHTML = `<div class="inventory-production-state error"><b>تعذر تحميل التقرير</b><p>${escapeValue(STATE.error)}</p><button class="secondary" type="button" data-production-retry>إعادة المحاولة</button></div>`;
      return;
    }
    if (STATE.status !== 'ok') {
      panel.innerHTML = `<div class="inventory-production-state ${STATE.status === 'idle' ? 'empty' : 'warning'}"><b>${escapeValue(STATE.message || 'اختر تاريخ التقرير لعرض البيانات.')}</b>${STATE.status !== 'idle' ? '<button class="secondary" type="button" data-production-retry>إعادة المحاولة</button>' : ''}</div>`;
      return;
    }
    panel.innerHTML = workspaceHtml();
    if (focusedSearch) {
      requestAnimationFrame(() => {
        const input = panel.querySelector('[data-production-search]');
        input?.focus({ preventScroll: true });
        if (Number.isInteger(selectionStart)) input?.setSelectionRange(selectionStart, selectionStart);
      });
    }
  }

  function normalizePayload(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data;
  }

  async function load() {
    const canPlant=code=>window.PermissionRuntime?.can('inventory.production_dates.'+code.toLowerCase()+'.view',code) === true;
    if(!canPlant(STATE.plantCode)){
      const permitted=['WF01','EL01','EL02'].find(canPlant);
      if(!permitted) return;
      STATE.plantCode=permitted;
      document.querySelector('[data-inventory-expiry-tab="'+permitted+'"]')?.click();
    }
    if (!STATE.initialized) return;
    const config = plantConfig(STATE.plantCode);
    if (!config) {
      STATE.error = 'تعذر تحديد المخزن المرتبط بالمصنع من إعدادات مستند الجرد.';
      STATE.loading = false;
      setSharedStatus(STATE.error, 'error');
      render();
      return;
    }
    const sequence = ++STATE.requestSequence;
    STATE.requestController?.abort?.();
    STATE.requestController = typeof AbortController === 'function' ? new AbortController() : null;
    STATE.loading = true;
    STATE.error = '';
    STATE.status = 'loading';
    STATE.message = '';
    STATE.rows = [];
    STATE.summary = null;
    setSharedStatus(`جاري قراءة جرد ${displayDate(STATE.reportDate)} ومقارنته مع ${displayDate(shiftIsoDate(STATE.reportDate, -1))}...`);
    render();
    try {
      if (!window.WarehouseDB?.ready || !window.WarehouseDB?.client) throw new Error('قاعدة البيانات غير متصلة.');
      let request = window.WarehouseDB.client.rpc('get_inventory_production_tracking_report', {
        p_report_date: STATE.reportDate,
        p_plant_code: config.plantCode,
        p_warehouse_code: config.warehouseCode
      });
      if (STATE.requestController && typeof request?.abortSignal === 'function') {
        request = request.abortSignal(STATE.requestController.signal);
      }
      const { data, error } = await request;
      if (sequence !== STATE.requestSequence) return;
      if (error) throw error;
      const payload = normalizePayload(data);
      if (!payload) throw new Error('استجابة التقرير غير صالحة.');
      STATE.status = String(payload.status || 'error');
      STATE.message = String(payload.message || '');
      STATE.rows = Array.isArray(payload.rows) ? payload.rows : [];
      STATE.summary = payload.summary && typeof payload.summary === 'object' ? payload.summary : null;
      STATE.loading = false;
      if (STATE.status === 'ok') {
        setSharedStatus(`تمت مقارنة جرد ${displayDate(payload.report_date)} مع جرد ${displayDate(payload.comparison_date)} — ${STATE.rows.length} صنفًا.`, 'success');
      } else {
        setSharedStatus(STATE.message || 'بيانات التقرير غير مكتملة.', 'warning');
      }
      render();
    } catch (error) {
      if (sequence !== STATE.requestSequence) return;
      if (error?.name === 'AbortError') return;
      STATE.loading = false;
      STATE.status = 'error';
      STATE.error = String(error?.message || error || 'خطأ غير معروف');
      setSharedStatus(`تعذر تحميل التقرير: ${STATE.error}`, 'error');
      render();
    }
  }

  function onPlantChanged(plantCode) {
    const normalized = String(plantCode || '').trim().toUpperCase();
    if (!['WF01', 'EL01', 'EL02'].includes(normalized)) return;
    const changed = STATE.plantCode !== normalized;
    STATE.plantCode = normalized;
    if (STATE.initialized && changed && rootElement()?.classList.contains('active-section')) load();
  }

  function changeSort(key) {
    if (STATE.sortKey !== key) {
      STATE.sortKey = key;
      STATE.sortDirection = 'asc';
    } else if (STATE.sortDirection === 'asc') {
      STATE.sortDirection = 'desc';
    } else {
      STATE.sortKey = '';
      STATE.sortDirection = '';
    }
    render();
  }

  function bindEvents(root) {
    root.addEventListener('input', event => {
      if (!event.target.matches('[data-production-search]')) return;
      STATE.search = event.target.value || '';
      render({ preserveSearchFocus: true });
    });
    root.addEventListener('change', event => {
      if (event.target.matches('[data-production-filter]')) {
        STATE.filter = event.target.value || 'all';
        render();
        return;
      }
      if (event.target.id !== 'inventoryProductionReportDateInput') return;
      const nextDate = String(event.target.value || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate) || nextDate > todayIso()) {
        event.target.value = STATE.reportDate;
        window.CustomDatePicker?.refresh?.(event.target);
        setSharedStatus('اختر تاريخًا صحيحًا لا يتجاوز تاريخ اليوم.', 'error');
        return;
      }
      STATE.reportDate = nextDate;
      updateComparisonDate();
      load();
    });
    root.addEventListener('click', event => {
      const retry = event.target.closest('[data-production-retry],#inventoryProductionRetryBtn');
      if (retry) {
        event.preventDefault();
        load();
        return;
      }
      const sort = event.target.closest('[data-production-sort]');
      if (!sort) return;
      event.preventDefault();
      changeSort(sort.dataset.productionSort || '');
    });
  }

  function init() {
    const root = rootElement();
    const input = document.getElementById('inventoryProductionReportDateInput');
    if (!root || !input || root.dataset.inventoryProductionBound === '1') return;
    root.dataset.inventoryProductionBound = '1';
    STATE.initialized = true;
    STATE.reportDate = todayIso();
    input.value = STATE.reportDate;
    input.max = STATE.reportDate;
    updateComparisonDate();
    window.CustomDatePicker?.init?.(input.parentElement || root);
    window.CustomDatePicker?.refresh?.(input);
    bindEvents(root);
    render();
  }

  window.InventoryProductionTracking = Object.freeze({
    init,
    load,
    onPlantChanged,
    getState: () => ({ ...STATE, requestController: null })
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
