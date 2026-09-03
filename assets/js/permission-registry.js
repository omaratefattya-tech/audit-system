(function permissionRegistryFactory(globalScope) {
  'use strict';

  /*
   * P1 canonical inventory, loaded by the P3 settings builder only.
   *
   * This file performs no authorization, data access, event binding, storage,
   * or UI mutation. Loading it in P3 exposes labels and hierarchy to the new
   * management UI only; the legacy resolver in app.js remains the sole runtime
   * permission engine until an approved cutover phase.
   */

  const nodes = [];
  const add = (type, key, label, parent, owner, selectors, notes) => {
    nodes.push(Object.freeze({
      type,
      key,
      label,
      parent: parent || null,
      owner,
      selectors: Object.freeze([].concat(selectors || []).filter(Boolean)),
      notes: notes || ''
    }));
    return key;
  };
  const screen = (key, label, owner, selectors, notes) => add('SCREEN', `${key}.view`, label, null, owner, selectors, notes);
  const subscreen = (key, label, parent, owner, selectors, notes) => add('SUBSCREEN', `${key}.view`, label, parent, owner, selectors, notes);
  const tab = (key, label, parent, owner, selectors, notes) => add('TAB', `${key}.view`, label, parent, owner, selectors, notes);
  const filter = (key, label, parent, owner, selectors, notes) => add('FILTER', `${key}.use`, label, parent, owner, selectors, notes);
  const button = (key, label, parent, owner, selectors, notes) => add('BUTTON', key, label, parent, owner, selectors, notes);
  const action = (key, label, parent, owner, selectors, notes) => add('ACTION', key, label, parent, owner, selectors, notes);

  const APP = 'assets/js/app.js';
  const PERMISSION_MANAGEMENT = 'assets/js/permission-management.js';
  const HTML = 'index.html';
  const WEEKLY = 'assets/js/department-weekly-operations.js';
  const HR = 'assets/js/department-hr-reports.js';
  const LOADING_ERRORS = 'assets/js/department-loading-errors.js';
  const PRODUCTION = 'assets/js/inventory-production-tracking.js';
  const WORKSPACE_TOOLS = 'assets/js/report-workspace-tools.js';

  const dashboard = screen('dashboard', 'الرئيسية', APP, '#dashboard');
  [
    ['plant', 'المصنع', '#dashboardPlantFilter'],
    ['warehouse', 'المخزن', '#dashboardWarehouseFilter'],
    ['from_date', 'من تاريخ', '#dashboardFromDate'],
    ['to_date', 'إلى تاريخ', '#dashboardToDate']
  ].forEach(([key, label, selector]) => filter(`dashboard.filter.${key}`, label, dashboard, APP, selector));
  button('dashboard.search', 'بحث', dashboard, APP, '#dashboardSearchBtn');
  button('dashboard.filters.reset', 'إعادة تعيين الفلاتر', dashboard, APP, '#dashboardResetBtn');
  button('dashboard.export.period_png', 'تصدير ملخص الفترة PNG', dashboard, APP, '#mobileDashboardPeriodPngBtn');
  button('dashboard.export.kpis_png', 'تصدير مؤشرات الأداء PNG', dashboard, APP, '#mobileKpiGroupPngBtn');

  const uploads = screen('upload_reports', 'رفع التقارير', APP, '#upload', 'Canonical replacement candidate for legacy upload/upload_reports.');
  const uploadTabs = [
    ['sales', 'مراجعة مبيعات المنتج التام والتحويلات المخزنية', true],
    ['incoming', 'الوارد من MB51', true],
    ['scale', 'تقرير الميزان', true],
    ['freight', 'نولون الوارد', true],
    ['current_plant_stock', 'رفع رصيد المصنع الحالي', false],
    ['consumption_rate', 'معدل الاستهلاك', false],
    ['inventory_closing_wf01', 'رفع تقرير تقفيل الواحة', true],
    ['inventory_closing_el01', 'رفع تقرير تقفيل المصنع الرئيسي', true],
    ['inventory_closing_el02', 'رفع تقرير تقفيل مصنع العامرية', true]
  ];
  const uploadControlIds = {
    sales: ['pickSalesFileBtn', 'downloadSalesTemplateBtn', 'salesReportDateInput'],
    incoming: ['pickIncomingFileBtn', 'downloadIncomingTemplateBtn', 'incomingReportDateInput'],
    scale: ['pickScaleFileBtn', 'downloadScaleTemplateBtn', 'scaleReportDateInput'],
    freight: ['pickFreightFileBtn', 'downloadFreightTemplateBtn', 'freightReferenceDateInput'],
    current_plant_stock: ['pickCurrentPlantStockFileBtn', 'downloadCurrentPlantStockTemplateBtn', ''],
    consumption_rate: ['pickConsumptionRateFileBtn', 'downloadConsumptionRateTemplateBtn', ''],
    inventory_closing_wf01: ['pickInventoryClosingWf01FileBtn', 'downloadInventoryClosingWf01TemplateBtn', 'inventoryClosingWf01DateInput'],
    inventory_closing_el01: ['pickInventoryClosingEl01FileBtn', 'downloadInventoryClosingEl01TemplateBtn', 'inventoryClosingEl01DateInput'],
    inventory_closing_el02: ['pickInventoryClosingEl02FileBtn', 'downloadInventoryClosingEl02TemplateBtn', 'inventoryClosingEl02DateInput']
  };
  uploadTabs.forEach(([key, label, hasDate]) => {
    const parent = tab(`upload_reports.${key}`, label, uploads, HTML, `[data-upload-tab="${key}"]`);
    const [uploadId, templateId, dateId] = uploadControlIds[key];
    if (hasDate) filter(`upload_reports.${key}.filter.report_date`, 'تاريخ التقرير', parent, APP, `#${dateId}`);
    action(`upload_reports.${key}.upload`, 'اختيار ورفع الملف', parent, APP, `#${uploadId}`);
    action(`upload_reports.${key}.download_template`, 'تحميل القالب', parent, APP, `#${templateId}`);
    action(`upload_reports.${key}.history.view`, 'عرض النسخة المرفوعة', parent, APP, `[data-action="view"]`, 'Row action is generated dynamically.');
    action(`upload_reports.${key}.history.replace`, 'استبدال النسخة المرفوعة', parent, APP, `[data-action="replace"]`, 'Availability depends on the uploader.');
    action(`upload_reports.${key}.history.delete`, 'حذف النسخة المرفوعة', parent, APP, `[data-action="delete"]`, 'Row action is generated dynamically.');
  });

  const sales = screen('sales_review', 'مراجعة البيع', APP, '#sales', 'Canonical replacement candidate for legacy sales/sales_audit.');
  filter('sales_review.filter.report_date', 'تاريخ التقرير', sales, APP, '#salesReportDateSelect');
  filter('sales_review.filter.warehouse', 'مخزن البيع', sales, APP, '#salesTabs button');
  filter('sales_review.table.column_filter', 'بحث أعمدة الجدول', sales, APP, '#salesTable .col-filter', 'Injected by the universal table enhancer.');
  button('sales_review.table.sort', 'ترتيب أعمدة الجدول', sales, APP, '#salesTable .sort-btn');
  ['excel', 'pdf', 'png'].forEach(format => button(`sales_review.export_${format}`, `تصدير ${format.toUpperCase()}`, sales, APP, `#salesExport${format === 'excel' ? 'Excel' : format === 'pdf' ? 'Pdf' : 'Png'}Btn`));
  button('sales_review.focus_mode', 'وضع التركيز', sales, APP, '#salesFocusModeBtn');

  const inbound = screen('inbound_review', 'مراجعة الوارد', APP, '#inbound', 'Canonical replacement candidate for legacy inbound/incoming_audit.');
  [
    ['plant', 'المصنع', '#plantFilter'],
    ['warehouse', 'المخزن', '#warehouseFilter'],
    ['warehouse_type', 'نوع المخزن', '#warehouseTypeFilter'],
    ['movement', 'نوع الحركة', '#movementFilter'],
    ['status', 'حالة الوارد', '#inboundStatusFilter'],
    ['from_date', 'من تاريخ', '#fromDate'],
    ['to_date', 'إلى تاريخ', '#toDate']
  ].forEach(([key, label, selector]) => filter(`inbound_review.filter.${key}`, label, inbound, APP, selector));
  button('inbound_review.search', 'بحث', inbound, APP, '#searchBtn');
  button('inbound_review.filters.reset', 'إعادة تعيين الفلاتر', inbound, APP, '#resetBtn');
  filter('inbound_review.table.column_filter', 'بحث أعمدة الجدول', inbound, APP, '#inboundTable .col-filter');
  button('inbound_review.table.sort', 'ترتيب أعمدة الجدول', inbound, APP, '#inboundTable .sort-btn');
  button('inbound_review.columns.manage', 'إدارة الأعمدة', inbound, APP, '#inboundColumnManagerBtn');
  button('inbound_review.export_excel', 'تصدير Excel', inbound, APP, '#inboundExportExcelBtn');
  button('inbound_review.export_pdf', 'تصدير PDF', inbound, APP, '#inboundExportPdfBtn');
  button('inbound_review.focus_mode', 'وضع التركيز', inbound, APP, '#inboundFocusModeBtn');

  const raw = screen('raw_materials', 'متابعة الخامات', APP, '#raw_materials');
  [
    ['plant', 'المصنع', '#rawMaterialsPlantFilter'],
    ['warehouse', 'المخزن', '#rawMaterialsWarehouseFilter'],
    ['warehouse_type', 'نوع المخزن', '#rawMaterialsWarehouseTypeFilter'],
    ['material_group', 'مجموعة المواد', '#rawMaterialsGroupFilter'],
    ['status', 'الحالة', '#rawMaterialsStatusFilter']
  ].forEach(([key, label, selector]) => filter(`raw_materials.filter.${key}`, label, raw, APP, selector));
  button('raw_materials.search', 'بحث', raw, APP, '#rawMaterialsSearchBtn');
  button('raw_materials.filters.reset', 'إعادة تعيين الفلاتر', raw, APP, '#rawMaterialsResetBtn');
  [['main', 'خامات رئيسية'], ['bran', 'مجموعة الردة'], ['packaging', 'مواد تعبئة وتغليف']].forEach(([key, label]) => {
    const parent = tab(`raw_materials.${key}`, label, raw, APP, `[data-raw-materials-tab="${key}"]`);
    filter(`raw_materials.${key}.table.column_filter`, 'بحث أعمدة الجدول', parent, APP, `[data-raw-materials-panel="${key}"] .col-filter`);
    button(`raw_materials.${key}.table.sort`, 'ترتيب أعمدة الجدول', parent, APP, `[data-raw-materials-panel="${key}"] .sort-btn`);
  });
  ['excel', 'pdf', 'png'].forEach(format => button(`raw_materials.export_${format}`, `تصدير ${format.toUpperCase()}`, raw, APP, `#rawMaterialsExport${format === 'excel' ? 'Excel' : format === 'pdf' ? 'Pdf' : 'Png'}Btn`));
  button('raw_materials.focus_mode', 'وضع التركيز', raw, APP, '#rawMaterialsFocusModeBtn');

  const inventory = screen('inventory', 'الجرد وتوثيق المخزون', APP, '[data-inventory-nav-group]', 'Container permission; legacy inventory_count currently owns all three subscreens.');
  const count = subscreen('inventory.count', 'مستند الجرد', inventory, APP, '#inventory_closing');
  [
    ['date', 'تاريخ الجرد', '#inventoryCountDateInput'],
    ['plant', 'المصنع', '#inventoryCountPlantSelect'],
    ['warehouse', 'المخزن', '#inventoryCountWarehouseSelect'],
    ['columns', 'بحث أعمدة الجرد', '.inventory-count-column-filter']
  ].forEach(([key, label, selector]) => filter(`inventory.count.filter.${key}`, label, count, APP, selector));
  action('inventory.count.create', 'جرد جديد', count, APP, '#createInventoryCountBtn');
  action('inventory.count.finish', 'إنهاء الجرد', count, APP, '#finishInventoryCountBtn');
  action('inventory.count.post_close_adjust', 'تعديلات بعد إنهاء الجرد', count, APP, '#inventoryCountPostCloseInvoiceBtn');
  action('inventory.count.differences.create', 'إنشاء مستند فروق الجرد', count, APP, '#createInventoryDifferenceSnapshotBtn');
  action('inventory.count.line.edit_actual_balance', 'تعديل الرصيد الفعلي', count, APP, '#inventoryCountLinesTable [data-actual-balance]');
  action('inventory.count.line.review', 'فتح توصيات مراجعة الصنف', count, APP, '[data-inventory-review-line]');
  action('inventory.count.line.audit_history', 'عرض سجل تعديلات الصنف', count, APP, '[data-inventory-review-history]');
  button('inventory.count.table.sort', 'ترتيب الجدول', count, APP, '.inventory-count-sort-btn');
  button('inventory.count.filters.reset', 'مسح الفلاتر', count, APP, '#inventoryCountClearFiltersBtn');
  button('inventory.count.columns.manage', 'إدارة الأعمدة', count, APP, '#inventoryCountColumnManagerBtn');
  ['excel', 'pdf', 'png'].forEach(format => button(`inventory.count.export_${format}`, `تصدير ${format.toUpperCase()}`, count, APP, `#inventoryCountExport${format === 'excel' ? 'Excel' : format === 'pdf' ? 'Pdf' : 'Png'}Btn`));
  button('inventory.count.focus_mode', 'وضع التركيز', count, APP, '#inventoryClosingFocusModeBtn');

  const differences = subscreen('inventory.differences', 'فروق الجرد', inventory, APP, '#inventory_differences');
  filter('inventory.differences.filter.plant', 'المصنع', differences, APP, '[data-inventory-difference-plant]');
  action('inventory.differences.document.view_current', 'عرض النسخة الحالية', differences, APP, '[data-inventory-difference-current]');
  action('inventory.differences.document.view_replaced', 'عرض النسخة المستبدلة', differences, APP, '[data-inventory-difference-replaced]');
  action('inventory.differences.history.view', 'عرض نسخة من سجل الاستبدال', differences, APP, '[data-inventory-difference-history-view]');
  action('inventory.differences.document.replace', 'استبدال مستند فروق الجرد', differences, APP, '#inventoryDifferenceReplaceSubmitBtn');

  const production = subscreen('inventory.production_dates', 'تتبع تواريخ الإنتاج', inventory, PRODUCTION, '#inventory_expiry_tracking');
  filter('inventory.production_dates.filter.report_date', 'تاريخ التقرير', production, PRODUCTION, '#inventoryProductionReportDateInput');
  [['wf01', 'WF01'], ['el01', 'EL01'], ['el02', 'EL02']].forEach(([key, label]) => tab(`inventory.production_dates.${key}`, label, production, PRODUCTION, `[data-inventory-expiry-tab="${label}"]`));
  filter('inventory.production_dates.filter.search', 'بحث', production, PRODUCTION, '[data-production-search]');
  filter('inventory.production_dates.filter.status', 'الحالة', production, PRODUCTION, '[data-production-filter]');
  button('inventory.production_dates.table.sort', 'ترتيب الجدول', production, PRODUCTION, '[data-production-sort]');
  button('inventory.production_dates.refresh', 'إعادة المحاولة', production, PRODUCTION, '[data-production-retry]');
  ['excel', 'pdf', 'png'].forEach(format => button(`inventory.production_dates.export_${format}`, `تصدير ${format.toUpperCase()}`, production, WORKSPACE_TOOLS, `#inventory_expiry_tracking [data-report-export="${format}"]`));
  button('inventory.production_dates.focus_mode', 'وضع التركيز', production, WORKSPACE_TOOLS, '#inventory_expiry_tracking [data-focus-target]');

  const reports = screen('reports', 'التقارير', APP, '#reports');
  [
    ['plant', 'المصنع', '#reportPlantFilter'],
    ['warehouse', 'المخزن', '#reportWarehouseFilter'],
    ['item', 'الصنف', '#itemAnalyticsItemFilter'],
    ['from_date', 'من تاريخ', '#reportFromDate'],
    ['to_date', 'إلى تاريخ', '#reportToDate']
  ].forEach(([key, label, selector]) => filter(`reports.filter.${key}`, label, reports, APP, selector));
  button('reports.search', 'بحث', reports, APP, '#reportSearchBtn');
  button('reports.filters.reset', 'إعادة تعيين الفلاتر', reports, APP, '#reportResetBtn');
  const reportTabs = [
    ['executive', 'التقرير التنفيذي'], ['sales_totals', 'ملخص مبيعات المخازن'], ['items', 'تقرير الأصناف'],
    ['item_analytics', 'تحليلات الأصناف'], ['warehouses', 'أداء المخازن'], ['exceptions', 'الاستثناءات'],
    ['smart', 'التحليلات الذكية'], ['production', 'تحليلات الإنتاج']
  ];
  reportTabs.forEach(([key, label]) => tab(`reports.${key}`, label, reports, APP, `[data-report-tab="${key === 'sales_totals' ? 'salesTotals' : key}"]`));
  ['excel', 'pdf', 'png'].forEach(format => button(`reports.export_${format}`, `تصدير التقرير النشط ${format.toUpperCase()}`, reports, APP, `#${format === 'excel' ? 'executiveReportExcelBtn' : format === 'pdf' ? 'activeReportPdfBtn' : 'activeReportPngBtn'}`));
  button('reports.items.export_summary_png', 'تصدير ملخص الأصناف PNG', 'reports.items.view', APP, '#itemsSummaryPngBtn');
  button('reports.items.export_table_png', 'تصدير جدول الأصناف PNG', 'reports.items.view', APP, '#itemsReviewTablePngBtn');
  filter('reports.item_analytics.filter.audit_search', 'بحث داخل حركة الصنف', 'reports.item_analytics.view', APP, '#itemAnalyticsAuditSearch');
  button('reports.item_analytics.table.sort', 'ترتيب حركة الصنف', 'reports.item_analytics.view', APP, '#itemAnalyticsAuditTrailTable [data-ia-sort]');
  button('reports.smart.export_visual_pdf', 'تصدير التحليلات الذكية PDF', 'reports.smart.view', APP, '#smartVisualPdfBtn');
  button('reports.smart.export_visual_png', 'تصدير التحليلات الذكية PNG', 'reports.smart.view', APP, '#smartVisualPngBtn');
  action('reports.smart.score_details.view', 'عرض تفاصيل درجة المراجعة', 'reports.smart.view', APP, '[data-audit-score-target]');

  const department = screen('department_personnel', 'إدارة أفراد القسم', APP, '[data-department-personnel-nav-group]', 'All child screens currently collapse to legacy reports permission.');
  const storekeepers = subscreen('department_personnel.storekeepers', 'جدول أمناء المخازن', department, WEEKLY, '#department_storekeepers');
  [
    ['search', 'بحث', '#departmentStorekeepersSearch'], ['plant', 'الموقع', '#departmentStorekeepersPlantFilter'],
    ['department', 'القسم', '#departmentStorekeepersDepartmentFilter'], ['job', 'الوظيفة', '#departmentStorekeepersJobFilter']
  ].forEach(([key, label, selector]) => filter(`department_personnel.storekeepers.filter.${key}`, label, storekeepers, WEEKLY, selector));
  button('department_personnel.storekeepers.table.sort', 'ترتيب الجدول', storekeepers, WEEKLY, '[data-storekeepers-sort]');
  button('department_personnel.storekeepers.refresh', 'إعادة المحاولة', storekeepers, WEEKLY, '#departmentStorekeepersRetryBtn');
  ['excel', 'pdf', 'png'].forEach(format => button(`department_personnel.storekeepers.export_${format}`, `تصدير ${format.toUpperCase()}`, storekeepers, WORKSPACE_TOOLS, `#department_storekeepers [data-report-export="${format}"]`));
  button('department_personnel.storekeepers.focus_mode', 'وضع التركيز', storekeepers, WORKSPACE_TOOLS, '#department_storekeepers [data-focus-target]');

  const weekly = subscreen('department_personnel.weekly_leave', 'جدول الأجازات الأسبوعي', department, WEEKLY, '#department_weekly_leave_schedule');
  const weeklyScopes = [
    ['wf01_finished', 'منتج تام الواحة - WF01', 'wf01-finished'], ['wf01_spare_parts', 'قطع غيار الواحة - WF01', 'wf01-spare-parts'],
    ['el01_finished', 'منتج تام الرئيسي - EL01', 'el01-finished'], ['el01_spare_parts', 'قطع غيار الرئيسي - EL01', 'el01-spare-parts'],
    ['el02_finished', 'منتج تام العامرية - EL02', 'el02-finished'], ['el02_spare_parts', 'قطع غيار العامرية - EL02', 'el02-spare-parts']
  ];
  weeklyScopes.forEach(([key, label, value]) => tab(`department_personnel.weekly_leave.${key}`, label, weekly, WEEKLY, `[data-weekly-tab="${value}"]`));
  filter('department_personnel.weekly_leave.filter.from_date', 'من تاريخ', weekly, WEEKLY, '[data-weekly-range="from"]');
  filter('department_personnel.weekly_leave.filter.to_date', 'إلى تاريخ', weekly, WEEKLY, '[data-weekly-range="to"]');
  button('department_personnel.weekly_leave.week.previous', 'الأسبوع السابق', weekly, WEEKLY, '[data-weekly-action="previous"]');
  button('department_personnel.weekly_leave.week.current', 'الأسبوع الحالي', weekly, WEEKLY, '[data-weekly-action="current"]');
  button('department_personnel.weekly_leave.week.next', 'الأسبوع التالي', weekly, WEEKLY, '[data-weekly-action="next"]');
  button('department_personnel.weekly_leave.table.sort', 'ترتيب الجدول', weekly, WEEKLY, '[data-weekly-sort]');
  action('department_personnel.weekly_leave.save', 'حفظ الأسبوع', weekly, WEEKLY, '[data-weekly-action="save"]');
  ['excel', 'pdf', 'png'].forEach(format => button(`department_personnel.weekly_leave.export_${format}`, `تصدير ${format.toUpperCase()}`, weekly, WORKSPACE_TOOLS, `#department_weekly_leave_schedule [data-report-export="${format}"]`));
  button('department_personnel.weekly_leave.export_weekend_png', 'تصدير الجمعة والسبت PNG', weekly, WORKSPACE_TOOLS, '#department_weekly_leave_schedule [data-report-export="weekend-png"]');
  button('department_personnel.weekly_leave.focus_mode', 'وضع التركيز', weekly, WORKSPACE_TOOLS, '#department_weekly_leave_schedule [data-focus-target]');

  const hr = subscreen('department_personnel.hr_reports', 'تقارير HR', department, HR, '#department_hr_reports');
  [
    ['from_date', 'من تاريخ', '#departmentHrFromDate'], ['to_date', 'إلى تاريخ', '#departmentHrToDate'],
    ['plant', 'الموقع الوظيفي', '#departmentHrPlantFilter'], ['department', 'القسم', '#departmentHrDepartmentFilter'],
    ['job', 'الوظيفة', '#departmentHrJobFilter'], ['personnel', 'الموظف', '#departmentHrPersonnelFilter'],
    ['search', 'البحث', '#departmentHrSearchInput']
  ].forEach(([key, label, selector]) => filter(`department_personnel.hr_reports.filter.${key}`, label, hr, HR, selector));
  button('department_personnel.hr_reports.filters.apply', 'تطبيق الفلاتر', hr, HR, '#departmentHrApplyFiltersBtn');
  const hrTabs = [
    ['cumulative_department_evaluation', 'التقييم التراكمي للقسم'], ['personnel_performance', 'تقرير أداء الأفراد'],
    ['attendance_compliance', 'الحضور والالتزام'], ['absence_violations', 'الغياب والمخالفات'],
    ['evaluation_analysis', 'تحليل التقييمات'], ['performance_trend', 'اتجاه الأداء']
  ];
  const hrSortOwners = {
    cumulative_department_evaluation: 'cumulative',
    personnel_performance: 'person',
    attendance_compliance: 'attendance',
    absence_violations: 'absence',
    evaluation_analysis: 'analysis',
    performance_trend: 'trend'
  };
  hrTabs.forEach(([key, label]) => {
    const parent = tab(`department_personnel.hr_reports.${key}`, label, hr, HR, `[data-department-hr-tab="${key}"]`);
    button(`department_personnel.hr_reports.${key}.table.sort`, 'ترتيب الجدول', parent, HR, `[data-hr-sort-report="${hrSortOwners[key]}"]`);
  });
  ['excel', 'pdf', 'png'].forEach(format => button(`department_personnel.hr_reports.export_${format}`, `تصدير التقرير النشط ${format.toUpperCase()}`, hr, WORKSPACE_TOOLS, `#department_hr_reports [data-report-export="${format}"]`));
  button('department_personnel.hr_reports.focus_mode', 'وضع التركيز', hr, WORKSPACE_TOOLS, '#department_hr_reports [data-focus-target]');

  const evaluations = subscreen('department_personnel.evaluations', 'التقييمات', department, WEEKLY, '#department_evaluations');
  weeklyScopes.forEach(([key, label, value]) => tab(`department_personnel.evaluations.${key}`, label, evaluations, WEEKLY, `#department_evaluations [data-weekly-tab="${value}"]`));
  filter('department_personnel.evaluations.filter.from_date', 'من تاريخ', evaluations, WEEKLY, '#department_evaluations [data-weekly-range="from"]');
  filter('department_personnel.evaluations.filter.to_date', 'إلى تاريخ', evaluations, WEEKLY, '#department_evaluations [data-weekly-range="to"]');
  button('department_personnel.evaluations.week.previous', 'الأسبوع السابق', evaluations, WEEKLY, '#department_evaluations [data-weekly-action="previous"]');
  button('department_personnel.evaluations.week.current', 'الأسبوع الحالي', evaluations, WEEKLY, '#department_evaluations [data-weekly-action="current"]');
  button('department_personnel.evaluations.week.next', 'الأسبوع التالي', evaluations, WEEKLY, '#department_evaluations [data-weekly-action="next"]');
  button('department_personnel.evaluations.table.sort', 'ترتيب الجدول', evaluations, WEEKLY, '#department_evaluations [data-weekly-sort]');
  action('department_personnel.evaluations.create', 'حفظ تقييم جديد', evaluations, WEEKLY, '[data-evaluation-modal-action="save"]');
  action('department_personnel.evaluations.saved.view', 'عرض تقييم محفوظ', evaluations, WEEKLY, '[data-evaluation-record-id]');
  ['excel', 'pdf', 'png'].forEach(format => button(`department_personnel.evaluations.export_${format}`, `تصدير ${format.toUpperCase()}`, evaluations, WORKSPACE_TOOLS, `#department_evaluations [data-report-export="${format}"]`));
  button('department_personnel.evaluations.focus_mode', 'وضع التركيز', evaluations, WORKSPACE_TOOLS, '#department_evaluations [data-focus-target]');

  const loadingErrors = subscreen('department_personnel.loading_errors', 'سجل أخطاء التحميل', department, LOADING_ERRORS, '#department_loading_errors');
  ['WF01', 'EL01', 'EL02'].forEach(code => tab(`department_personnel.loading_errors.plant.${code.toLowerCase()}`, code, loadingErrors, LOADING_ERRORS, `[data-loading-errors-plant="${code}"]`));
  const completed = tab('department_personnel.loading_errors.completed', 'سجل أخطاء التحميل', loadingErrors, LOADING_ERRORS, '[data-loading-errors-action="completed"]');
  const pending = tab('department_personnel.loading_errors.pending_review', 'أخطاء تحتاج مراجعة', loadingErrors, LOADING_ERRORS, '[data-loading-errors-action="pending"]');
  filter('department_personnel.loading_errors.completed.filter.registration_date', 'تاريخ تسجيل الخطأ', completed, LOADING_ERRORS, '[data-loading-errors-date-filter]');
  filter('department_personnel.loading_errors.completed.filter.table_search', 'بحث الجدول', completed, LOADING_ERRORS, '[data-loading-errors-column-filter]');
  button('department_personnel.loading_errors.completed.table.sort', 'ترتيب الجدول', completed, LOADING_ERRORS, '[data-loading-errors-sort]');
  button('department_personnel.loading_errors.completed.columns.manage', 'إدارة الأعمدة', completed, LOADING_ERRORS, '[data-loading-errors-action="columns"]');
  filter('department_personnel.loading_errors.pending_review.filter.table_search', 'بحث الجدول', pending, LOADING_ERRORS, '[data-loading-errors-column-filter]');
  button('department_personnel.loading_errors.pending_review.table.sort', 'ترتيب الجدول', pending, LOADING_ERRORS, '[data-loading-errors-sort]');
  button('department_personnel.loading_errors.pending_review.columns.manage', 'إدارة الأعمدة', pending, LOADING_ERRORS, '[data-loading-errors-action="columns"]');
  action('department_personnel.loading_errors.pending_review.create', 'تسجيل خطأ', pending, LOADING_ERRORS, '[data-loading-errors-action="register"]');
  action('department_personnel.loading_errors.pending_review.line.add', 'إضافة سطر', pending, LOADING_ERRORS, '[data-loading-error-modal-action="add-line"]');
  action('department_personnel.loading_errors.pending_review.line.remove', 'حذف سطر قبل الحفظ', pending, LOADING_ERRORS, '[data-loading-error-modal-action="remove-line"]');
  action('department_personnel.loading_errors.pending_review.review.complete', 'استكمال البيانات', pending, LOADING_ERRORS, '[data-loading-errors-action="review"]');
  ['excel', 'pdf', 'png'].forEach(format => button(`department_personnel.loading_errors.export_${format}`, `تصدير الشاشة النشطة ${format.toUpperCase()}`, loadingErrors, WORKSPACE_TOOLS, `#department_loading_errors [data-report-export="${format}"]`));
  button('department_personnel.loading_errors.focus_mode', 'وضع التركيز', loadingErrors, WORKSPACE_TOOLS, '#department_loading_errors [data-focus-target]');

  const users = screen('users', 'إدارة المستخدمين', APP, '#users');
  action('users.create', 'إضافة مستخدم', users, APP, '.users-open-create');
  action('users.edit', 'تعديل مستخدم', users, APP, '.edit-user-btn');
  action('users.status.toggle', 'تفعيل أو تعطيل مستخدم', users, APP, '.toggle-user-btn');
  action('users.delete', 'حذف مستخدم نهائيًا', users, APP, '.delete-user-btn');
  action('users.details.view', 'عرض بيانات المستخدم', users, APP, '.view-user-btn');
  button('users.refresh', 'تحديث', users, APP, '#refreshUsersBtn');
  filter('users.filter.search', 'بحث المستخدمين', users, APP, '#usersQuickSearch');
  filter('users.filter.role', 'الدور', users, APP, '#usersRoleFilter');
  filter('users.filter.status', 'الحالة', users, APP, '#usersStatusFilter');
  ['excel', 'pdf', 'png'].forEach(format => button(`users.export_${format}`, `تصدير ${format.toUpperCase()}`, users, APP, `#usersExport${format === 'excel' ? 'Excel' : format === 'pdf' ? 'Pdf' : 'Png'}Btn`));

  const permissions = screen('permissions', 'إدارة الصلاحيات', PERMISSION_MANAGEMENT, '#permissions', 'P6 Role-to-Bundle management UI; legacy enforcement remains unchanged.');
  filter('permissions.filter.role', 'اختيار الدور', permissions, PERMISSION_MANAGEMENT, '#permissionsRoleSelect');
  filter('permissions.filter.search', 'بحث الحزم', permissions, PERMISSION_MANAGEMENT, '#permissionsQuickSearch');
  action('permissions.assign', 'حفظ ربط الدور بالحزم', permissions, PERMISSION_MANAGEMENT, '#savePermissionsBtn');
  button('permissions.refresh', 'تحديث', permissions, PERMISSION_MANAGEMENT, '#reloadPermissionsBtn');
  button('permissions.selection.select_all', 'تحديد الحزم الظاهرة', permissions, PERMISSION_MANAGEMENT, '#permissionsSelectAllBtn');
  button('permissions.selection.clear_all', 'إلغاء الحزم الظاهرة', permissions, PERMISSION_MANAGEMENT, '#permissionsClearAllBtn');
  button('permissions.selection.restore_defaults', 'استعادة الربط المحفوظ', permissions, PERMISSION_MANAGEMENT, '#permissionsDefaultsBtn');

  const settings = screen('settings', 'الإعدادات', APP, '#settings');
  const settingsTabs = [
    ['profile', 'البيانات الشخصية', '#settingsProfileTab'], ['account', 'بيانات المستخدم وكلمة المرور', '#settingsAccountTab'],
    ['system', 'إعدادات النظام', '#settingsSystemTab'], ['general', 'إعدادات عامة', '#settingsGeneralTab'],
    ['plants', 'إعدادات المصانع', '#settingsPlantsTab'], ['warehouses', 'إعدادات المخازن', '#settingsWarehousesTab'],
    ['sales_products', 'إعدادات أصناف البيع', '#settingsSalesProductsTab'], ['storekeepers', 'أمناء المخازن', '#settingsStorekeepersTab'],
    ['department_personnel', 'تكويد أفراد القسم', '#settingsDepartmentPersonnelTab'],
    ['department_status_codes', 'حالة الوردية/موقف الإجازات', '#settingsDepartmentStatusCodesTab'],
    ['activity_log', 'سجل الحركات', '#settingsActivityLogTab']
  ];
  const settingsParents = {};
  settingsTabs.forEach(([key, label, selector]) => { settingsParents[key] = tab(`settings.${key}`, label, settings, APP, selector); });
  action('settings.profile.update', 'حفظ بيانات الحساب', settingsParents.profile, APP, '#saveProfileBtn');
  action('settings.profile.avatar.upload', 'رفع صورة الحساب', settingsParents.profile, APP, '#profileAvatarInput');
  action('settings.account.password.change', 'تغيير كلمة المرور', settingsParents.account, APP, '#savePasswordBtn');
  action('settings.system.update', 'حفظ إعدادات النظام', settingsParents.system, APP, '#saveSystemSettingsBtn');
  action('settings.system.cache.clear', 'مسح الكاش', settingsParents.system, APP, '#clearSystemCacheBtn');
  const generalPlants = tab('settings.general.plants_and_warehouses', 'مصانع ومخازن', settingsParents.general, APP, '#settingsGeneralPlantsTab');
  const generalMovements = tab('settings.general.movements', 'الحركات المخزنية', settingsParents.general, APP, '#settingsGeneralMovementsTab');
  filter('settings.general.plants_and_warehouses.table.column_filter', 'بحث أعمدة المصانع والمخازن', generalPlants, APP, '#plantsTable .col-filter');
  button('settings.general.plants_and_warehouses.table.sort', 'ترتيب المصانع والمخازن', generalPlants, APP, '#plantsTable .sort-btn');
  filter('settings.general.movements.table.column_filter', 'بحث أعمدة الحركات', generalMovements, APP, '#movementsTable .col-filter');
  button('settings.general.movements.table.sort', 'ترتيب الحركات', generalMovements, APP, '#movementsTable .sort-btn');

  const settingsCrud = [
    ['plants', 'المصنع', '#addPlantBtn', '[data-plant-code] .small-action', '#plantsSettingsTable'],
    ['warehouses', 'المخزن', '#addWarehouseBtn', '[data-warehouse-code] .small-action', '#warehousesSettingsTable'],
    ['sales_products', 'صنف البيع', '#addSalesProductBtn', '[data-material-code] .small-action', '#salesProductsSettingsTable'],
    ['storekeepers', 'أمين المخزن', '#saveStorekeeperBtn', '[data-action="edit-storekeeper"]', '#storekeepersSettingsTable'],
    ['department_personnel', 'فرد القسم', '#saveDepartmentPersonnelBtn', '[data-action="edit-department-personnel"]', '#departmentPersonnelTable'],
    ['department_status_codes', 'كود الحالة', '#saveDepartmentStatusCodeBtn', '[data-action="edit-department-status"]', '#departmentStatusCodesTable']
  ];
  settingsCrud.forEach(([key, label, createSelector, editSelector, tableSelector]) => {
    const parent = settingsParents[key];
    action(`settings.${key}.create`, `إضافة ${label}`, parent, APP, createSelector);
    action(`settings.${key}.edit`, `تعديل ${label}`, parent, APP, editSelector);
    filter(`settings.${key}.table.column_filter`, `بحث أعمدة ${label}`, parent, APP, `${tableSelector} .settings-col-filter`);
    button(`settings.${key}.table.sort`, `ترتيب جدول ${label}`, parent, APP, `${tableSelector} .settings-sort-btn`);
  });
  action('settings.sales_products.warehouses.assign', 'تحديد مخازن الصنف', settingsParents.sales_products, APP, '#saveSalesProductWarehousesBtn');
  filter('settings.storekeepers.filter.search', 'بحث أمناء المخازن', settingsParents.storekeepers, APP, '#storekeepersSearchInput');
  filter('settings.storekeepers.filter.plant', 'مصنع أمين المخزن', settingsParents.storekeepers, APP, '#storekeepersPlantFilter');
  filter('settings.storekeepers.filter.status', 'حالة أمين المخزن', settingsParents.storekeepers, APP, '#storekeepersStatusFilter');
  action('settings.storekeepers.status.toggle', 'تفعيل أو إيقاف أمين المخزن', settingsParents.storekeepers, APP, '[data-action="toggle-storekeeper"]');
  action('settings.department_personnel.status.toggle', 'تفعيل أو إيقاف فرد القسم', settingsParents.department_personnel, APP, '[data-action="toggle-department-personnel"]');
  action('settings.department_status_codes.status.toggle', 'تفعيل أو إيقاف كود الحالة', settingsParents.department_status_codes, APP, '[data-action="toggle-department-status"]');
  action('settings.department_status_codes.color.select', 'اختيار لون الحالة', settingsParents.department_status_codes, APP, '#departmentStatusColorTrigger');
  filter('settings.activity_log.filter.search', 'بحث سجل الحركات', settingsParents.activity_log, APP, '#activityLogSearchInput');
  filter('settings.activity_log.filter.columns', 'بحث أعمدة سجل الحركات', settingsParents.activity_log, APP, '.activity-log-col-filter');
  button('settings.activity_log.table.sort', 'ترتيب سجل الحركات', settingsParents.activity_log, APP, '[data-activity-sort]');
  button('settings.activity_log.pagination', 'التنقل بين الصفحات', settingsParents.activity_log, APP, '[data-activity-page]');
  button('settings.activity_log.refresh', 'تحديث سجل الحركات', settingsParents.activity_log, APP, '#activityLogRefreshBtn');
  button('settings.activity_log.export_excel', 'تصدير Excel', settingsParents.activity_log, APP, '#activityLogExportExcelBtn');
  button('settings.activity_log.export_pdf', 'تصدير PDF', settingsParents.activity_log, APP, '#activityLogExportPdfBtn');

  const permissionSettings = tab('settings.permission_settings', 'إعدادات الصلاحيات', settings, 'assets/js/permission-settings.js', '#settingsPermissionsTab', 'P3 management UI only; it does not participate in permission enforcement.');
  const permissionRoles = tab('settings.permission_settings.roles', 'إنشاء دور', permissionSettings, 'assets/js/permission-settings.js', '#permissionSettingsRolesTab');
  action('settings.permission_settings.roles.create', 'إنشاء دور', permissionRoles, 'assets/js/permission-settings.js', '#permissionRoleForm');
  action('settings.permission_settings.roles.edit', 'تعديل دور', permissionRoles, 'assets/js/permission-settings.js', '[data-permission-role-action="edit"]');
  action('settings.permission_settings.roles.delete', 'حذف دور', permissionRoles, 'assets/js/permission-settings.js', '[data-permission-role-action="delete"]');
  button('settings.permission_settings.roles.refresh', 'تحديث الأدوار', permissionRoles, 'assets/js/permission-settings.js', '#permissionRolesRefreshBtn');

  const permissionBundles = tab('settings.permission_settings.bundles', 'إنشاء حزمة صلاحيات', permissionSettings, 'assets/js/permission-settings.js', '#permissionSettingsBundlesTab');
  action('settings.permission_settings.bundles.create', 'إنشاء حزمة صلاحيات', permissionBundles, 'assets/js/permission-settings.js', '#permissionBundleForm');
  action('settings.permission_settings.bundles.edit', 'تعديل حزمة صلاحيات', permissionBundles, 'assets/js/permission-settings.js', '[data-permission-bundle-action="edit"]');
  action('settings.permission_settings.bundles.delete', 'حذف حزمة صلاحيات', permissionBundles, 'assets/js/permission-settings.js', '[data-permission-bundle-action="delete"]');
  button('settings.permission_settings.bundles.refresh', 'تحديث الحزم', permissionBundles, 'assets/js/permission-settings.js', '#permissionBundlesRefreshBtn');
  button('settings.permission_settings.bundles.screens.open', 'اختيار الشاشات', permissionBundles, 'assets/js/permission-settings.js', '#permissionBundleScreensBtn');
  filter('settings.permission_settings.bundles.screens.search', 'بحث الشاشات', permissionBundles, 'assets/js/permission-settings.js', '#permissionScreenSearchInput');
  action('settings.permission_settings.bundles.screen_permissions.edit', 'فتح صلاحيات الشاشة', permissionBundles, 'assets/js/permission-settings.js', '[data-permission-screen-key]');
  button('settings.permission_settings.bundles.screen_permissions.select_all', 'تحديد كل عناصر الشاشة', permissionBundles, 'assets/js/permission-settings.js', '#permissionEditorSelectAllBtn');
  button('settings.permission_settings.bundles.screen_permissions.clear_all', 'إلغاء كل عناصر الشاشة', permissionBundles, 'assets/js/permission-settings.js', '#permissionEditorClearAllBtn');
  action('settings.permission_settings.bundles.screen_permissions.save', 'حفظ اختيارات الشاشة', permissionBundles, 'assets/js/permission-settings.js', '#permissionEditorSaveBtn');

  const legacyScreenMappings = Object.freeze([
    ['dashboard', 'dashboard.view', 'MATCHED'],
    ['upload', 'upload_reports.view', 'MERGED_LEGACY'],
    ['upload_reports', 'upload_reports.view', 'MERGED_LEGACY'],
    ['sales', 'sales_review.view', 'MERGED_LEGACY'],
    ['sales_audit', 'sales_review.view', 'MERGED_LEGACY'],
    ['inbound', 'inbound_review.view', 'MERGED_LEGACY'],
    ['incoming_audit', 'inbound_review.view', 'MERGED_LEGACY'],
    ['raw_materials', 'raw_materials.view', 'MATCHED'],
    ['inventory_count', 'inventory.view', 'NEEDS_DECISION'],
    ['reports', 'reports.view', 'NEEDS_DECISION'],
    ['users', 'users.view', 'MATCHED'],
    ['permissions', 'permissions.view', 'MATCHED'],
    ['settings', 'settings.view', 'MATCHED'],
    ['plants', 'settings.general.plants_and_warehouses.view', 'MERGED_LEGACY'],
    ['movements', 'settings.general.movements.view', 'MERGED_LEGACY'],
    ['settings_profile', 'settings.profile.view', 'MATCHED'],
    ['settings_account', 'settings.account.view', 'MATCHED'],
    ['settings_system', 'settings.system.view', 'MATCHED'],
    ['settings_plants', 'settings.plants.view', 'MATCHED'],
    ['settings_warehouses', 'settings.warehouses.view', 'MATCHED'],
    ['settings_sales_products', 'settings.sales_products.view', 'MATCHED'],
    ['settings_sales_product_warehouses', 'settings.sales_products.warehouses.assign', 'MERGED_LEGACY'],
    ['settings_storekeepers', 'settings.storekeepers.view', 'MISSING_FRONTEND'],
    ['settings_activity_log', 'settings.activity_log.view', 'MATCHED']
  ].map(([legacyKey, canonicalKey, status]) => Object.freeze({ legacyKey, canonicalKey, status })));

  const legacyActionMappings = Object.freeze([
    ['can_view', 'view', 'MATCHED'],
    ['can_add', 'create/add (screen-specific)', 'MATCHED'],
    ['can_create', 'create (screen-specific)', 'NEEDS_DECISION'],
    ['can_edit', 'edit/update (screen-specific)', 'MATCHED'],
    ['can_delete', 'delete (screen-specific)', 'MATCHED'],
    ['can_upload', 'upload (screen-specific)', 'MATCHED'],
    ['can_export_excel', 'export_excel', 'MATCHED'],
    ['can_export_pdf', 'export_pdf', 'MATCHED'],
    ['can_export_png', 'export_png', 'MATCHED'],
    ['can_approve', 'approve/complete (screen-specific)', 'MATCHED'],
    ['can_manage', 'manage (screen-specific)', 'MATCHED']
  ].map(([legacyColumn, canonicalCapability, status]) => Object.freeze({ legacyColumn, canonicalCapability, status })));

  const registry = Object.freeze({
    version: 'P3-2026-09-03',
    phase: 'P3_PERMISSION_SETTINGS',
    enforcementEnabled: false,
    runtimeLoaded: true,
    namingConvention: '<domain>[.<subscreen>][.<tab>].<capability>',
    nodeTypes: Object.freeze(['SCREEN', 'SUBSCREEN', 'TAB', 'FILTER', 'BUTTON', 'ACTION']),
    nodes: Object.freeze(nodes.slice()),
    legacyScreenMappings,
    legacyActionMappings,
    unresolvedDecisions: Object.freeze([
      'Legacy reports currently authorizes the reports screen and every Department Personnel subscreen.',
      'Legacy inventory_count currently authorizes three distinct inventory subscreens.',
      'Production can_create has no frontend PERMISSION_ACTIONS equivalent; all stored values are false.',
      'app_users.plant_code is populated for zero users and is not read by frontend authorization.',
      'Plant-scoped bundle migration must preserve current all-access behavior until P5 evidence supports a narrower scope.',
      'The authenticated app_users role discrepancy must remain a guarded migration decision even though P0 found zero current users with that value.'
    ])
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = registry;
  if (globalScope && typeof globalScope === 'object') {
    Object.defineProperty(globalScope, 'AuditPermissionRegistry', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: registry
    });
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
