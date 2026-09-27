-- Fix production-date tracking source selection and add read-only HR report data.
-- The initial verification run intentionally ends with ROLLBACK. It is changed to
-- COMMIT only after the transaction-level tests pass.

begin;

create or replace function public.get_inventory_production_tracking_report(
  p_report_date date,
  p_plant_code text,
  p_warehouse_code text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_user_id uuid := auth.uid();
  v_report_date date := p_report_date;
  v_previous_date date;
  v_plant_code text := upper(btrim(coalesce(p_plant_code, '')));
  v_warehouse_code text := upper(btrim(coalesce(p_warehouse_code, '')));
  v_expected_warehouse text;
  v_current_document_id uuid;
  v_current_document_status text;
  v_current_version_id uuid;
  v_current_version_status text;
  v_current_batch_id uuid;
  v_current_line_count bigint := 0;
  v_previous_document_id uuid;
  v_previous_document_status text;
  v_previous_version_id uuid;
  v_previous_version_status text;
  v_previous_batch_id uuid;
  v_previous_line_count bigint := 0;
  v_rows jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
  v_tolerance constant numeric := 0.0005;
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.can_inventory_count_action('view') then
    raise exception using errcode = '42501', message = 'Inventory count view permission is required.';
  end if;

  if v_report_date is null then
    raise exception using errcode = '22023', message = 'Report date is required.';
  end if;

  if v_report_date > (now() at time zone 'Africa/Cairo')::date then
    raise exception using errcode = '22023', message = 'Future report dates are not allowed.';
  end if;

  select mapping.warehouse_code
  into v_expected_warehouse
  from (
    values
      ('WF01'::text, 'W401'::text),
      ('EL01'::text, 'N401'::text),
      ('EL02'::text, 'E401'::text)
  ) as mapping(plant_code, warehouse_code)
  where mapping.plant_code = v_plant_code;

  if v_expected_warehouse is null or v_warehouse_code is distinct from v_expected_warehouse then
    raise exception using errcode = '22023', message = 'Plant and warehouse mapping is invalid.';
  end if;

  v_previous_date := v_report_date - 1;

  select d.id, d.document_status, d.current_version_id, d.source_closing_batch_id
  into v_current_document_id, v_current_document_status, v_current_version_id, v_current_batch_id
  from public.inventory_count_documents d
  where d.inventory_date = v_report_date
    and d.plant_code = v_plant_code
    and d.warehouse_code = v_warehouse_code
  order by d.updated_at desc nulls last, d.id desc
  limit 1;

  if v_current_document_id is null then
    return jsonb_build_object(
      'status', 'current_inventory_missing',
      'message', 'جرد تاريخ التقرير غير موجود.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'rows', '[]'::jsonb
    );
  end if;

  if v_current_document_status is distinct from 'locked' then
    return jsonb_build_object(
      'status', 'current_document_not_final',
      'message', 'مستند جرد تاريخ التقرير موجود لكنه غير مقفل ونهائي.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'current_document_id', v_current_document_id,
      'rows', '[]'::jsonb
    );
  end if;

  if v_current_version_id is null then
    return jsonb_build_object(
      'status', 'current_document_no_final_version',
      'message', 'مستند جرد تاريخ التقرير موجود لكن بلا نسخة نهائية.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'current_document_id', v_current_document_id,
      'rows', '[]'::jsonb
    );
  end if;

  select v.version_status
  into v_current_version_status
  from public.inventory_count_versions v
  where v.id = v_current_version_id
    and v.document_id = v_current_document_id;

  if not found or v_current_version_status not in ('settled', 'approved', 'locked') then
    return jsonb_build_object(
      'status', 'current_document_no_final_version',
      'message', 'مستند جرد تاريخ التقرير موجود لكن بلا نسخة نهائية.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'current_document_id', v_current_document_id,
      'current_version_id', v_current_version_id,
      'rows', '[]'::jsonb
    );
  end if;

  select count(*)
  into v_current_line_count
  from public.inventory_count_lines l
  where l.version_id = v_current_version_id;

  if v_current_line_count = 0 then
    return jsonb_build_object(
      'status', 'current_final_version_no_lines',
      'message', 'النسخة النهائية لجرد تاريخ التقرير موجودة لكن بلا سطور.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'current_document_id', v_current_document_id,
      'current_version_id', v_current_version_id,
      'rows', '[]'::jsonb
    );
  end if;

  select d.id, d.document_status, d.current_version_id, d.source_closing_batch_id
  into v_previous_document_id, v_previous_document_status, v_previous_version_id, v_previous_batch_id
  from public.inventory_count_documents d
  where d.inventory_date = v_previous_date
    and d.plant_code = v_plant_code
    and d.warehouse_code = v_warehouse_code
  order by d.updated_at desc nulls last, d.id desc
  limit 1;

  if v_previous_document_id is null then
    return jsonb_build_object(
      'status', 'previous_inventory_missing',
      'message', 'جرد اليوم السابق غير موجود.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'current_document_id', v_current_document_id,
      'current_version_id', v_current_version_id,
      'rows', '[]'::jsonb
    );
  end if;

  if v_previous_document_status is distinct from 'locked' then
    return jsonb_build_object(
      'status', 'previous_document_not_final',
      'message', 'مستند جرد اليوم السابق موجود لكنه غير مقفل ونهائي.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'previous_document_id', v_previous_document_id,
      'rows', '[]'::jsonb
    );
  end if;

  if v_previous_version_id is null then
    return jsonb_build_object(
      'status', 'previous_document_no_final_version',
      'message', 'مستند جرد اليوم السابق موجود لكن بلا نسخة نهائية.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'previous_document_id', v_previous_document_id,
      'rows', '[]'::jsonb
    );
  end if;

  select v.version_status
  into v_previous_version_status
  from public.inventory_count_versions v
  where v.id = v_previous_version_id
    and v.document_id = v_previous_document_id;

  if not found or v_previous_version_status not in ('settled', 'approved', 'locked') then
    return jsonb_build_object(
      'status', 'previous_document_no_final_version',
      'message', 'مستند جرد اليوم السابق موجود لكن بلا نسخة نهائية.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'previous_document_id', v_previous_document_id,
      'previous_version_id', v_previous_version_id,
      'rows', '[]'::jsonb
    );
  end if;

  select count(*)
  into v_previous_line_count
  from public.inventory_count_lines l
  where l.version_id = v_previous_version_id;

  if v_previous_line_count = 0 then
    return jsonb_build_object(
      'status', 'previous_final_version_no_lines',
      'message', 'النسخة النهائية لجرد اليوم السابق موجودة لكن بلا سطور.',
      'report_date', v_report_date,
      'comparison_date', v_previous_date,
      'plant_code', v_plant_code,
      'warehouse_code', v_warehouse_code,
      'previous_document_id', v_previous_document_id,
      'previous_version_id', v_previous_version_id,
      'rows', '[]'::jsonb
    );
  end if;

  with previous_lines_raw as (
    select
      l.*,
      upper(btrim(l.material_code)) as normalized_material_code,
      count(*) over (partition by upper(btrim(l.material_code))) as duplicate_count
    from public.inventory_count_lines l
    where l.version_id = v_previous_version_id
  ),
  previous_lines as (
    select
      case
        when nullif(normalized_material_code, '') is null then '__INVALID_PREVIOUS__' || id::text
        else normalized_material_code
      end as material_key,
      p.*
    from previous_lines_raw p
  ),
  current_lines_raw as (
    select
      l.*,
      upper(btrim(l.material_code)) as normalized_material_code,
      count(*) over (partition by upper(btrim(l.material_code))) as duplicate_count
    from public.inventory_count_lines l
    where l.version_id = v_current_version_id
  ),
  current_lines as (
    select
      case
        when nullif(normalized_material_code, '') is null then '__INVALID_CURRENT__' || id::text
        else normalized_material_code
      end as material_key,
      c.*
    from current_lines_raw c
  ),
  material_universe as (
    select material_key from previous_lines
    union
    select material_key from current_lines
  ),
  history_rows as (
    select
      upper(btrim(l.material_code)) as material_key,
      d.inventory_date,
      l.oldest_date
    from public.inventory_count_documents d
    join public.inventory_count_versions v
      on v.id = d.current_version_id
     and v.document_id = d.id
    join public.inventory_count_lines l
      on l.version_id = v.id
    where d.plant_code = v_plant_code
      and d.warehouse_code = v_warehouse_code
      and d.inventory_date < v_report_date
      and d.document_status = 'locked'
      and v.version_status in ('settled', 'approved', 'locked')
      and nullif(upper(btrim(l.material_code)), '') is not null
      and l.oldest_date is not null
      and upper(btrim(l.material_code)) in (
        select u.material_key
        from material_universe u
        where u.material_key not like '__INVALID_%'
      )
  ),
  history_ranked as (
    select
      h.*,
      max(h.oldest_date) over (
        partition by h.material_key
        order by h.inventory_date
        rows between 1 following and unbounded following
      ) as later_max_oldest_date
    from history_rows h
  ),
  surpassed_history as (
    select distinct h.material_key, h.oldest_date
    from history_ranked h
    where h.later_max_oldest_date > h.oldest_date
  ),
  paired as (
    select
      u.material_key,
      p.id as previous_line_id,
      c.id as current_line_id,
      coalesce(c.material_code, p.material_code, '') as material_code,
      coalesce(nullif(btrim(c.material_name), ''), nullif(btrim(p.material_name), ''), '—') as material_name,
      p.normalized_material_code as previous_normalized_code,
      c.normalized_material_code as current_normalized_code,
      coalesce(p.duplicate_count, 0) as previous_duplicate_count,
      coalesce(c.duplicate_count, 0) as current_duplicate_count,
      p.oldest_date as previous_oldest_date,
      p.oldest_quantity as previous_oldest_quantity,
      c.sales_quantity,
      c.outgoing_transfers,
      c.oldest_date as current_oldest_date,
      c.oldest_quantity as current_oldest_quantity,
      exists (
        select 1
        from surpassed_history sh
        where sh.material_key = u.material_key
          and sh.oldest_date = c.oldest_date
      ) as is_returned_old_date
    from material_universe u
    left join previous_lines p on p.material_key = u.material_key
    left join current_lines c on c.material_key = u.material_key
  ),
  prepared as (
    select
      p.*,
      case
        when p.previous_line_id is null then 'لا يوجد سطر مطابق للمادة في Snapshot اليوم السابق.'
        when p.current_line_id is null then 'لا يوجد سطر مطابق للمادة في Snapshot تاريخ التقرير.'
        when p.previous_duplicate_count > 1 or p.current_duplicate_count > 1 then 'يوجد أكثر من سطر للمادة نفسها داخل أحد الـSnapshots.'
        when nullif(p.previous_normalized_code, '') is null or nullif(p.current_normalized_code, '') is null then 'كود المادة فارغ أو غير صالح.'
        when p.previous_oldest_date is null or p.previous_oldest_quantity is null then 'أقدم تاريخ أو كميته غير مسجل في Snapshot اليوم السابق.'
        when p.previous_oldest_quantity < 0 then 'كمية أقدم تاريخ في اليوم السابق سالبة وغير صالحة.'
        when p.previous_oldest_date > v_previous_date then 'أقدم تاريخ في Snapshot اليوم السابق يقع بعد تاريخ الجرد.'
        when p.current_oldest_date is not null and p.current_oldest_quantity is null then 'تاريخ اليوم موجود دون كمية أقدم تاريخ.'
        when p.current_oldest_quantity is not null and p.current_oldest_quantity < 0 then 'كمية أقدم تاريخ اليوم سالبة وغير صالحة.'
        when p.current_oldest_date is null and p.current_oldest_quantity is not null and abs(p.current_oldest_quantity) > v_tolerance then 'كمية أقدم تاريخ اليوم موجودة دون تاريخ إنتاج.'
        when p.current_oldest_date > v_report_date then 'أقدم تاريخ في Snapshot اليوم يقع بعد تاريخ الجرد.'
        else null
      end as snapshot_issue,
      p.sales_quantity is null as sales_missing,
      p.outgoing_transfers is null as outgoing_missing,
      p.sales_quantity < 0 as sales_negative,
      p.outgoing_transfers < 0 as outgoing_negative,
      case when p.sales_quantity is null then null else greatest(p.sales_quantity, 0::numeric) end as sales_for_fifo_raw,
      case when p.outgoing_transfers is null then null else greatest(p.outgoing_transfers, 0::numeric) end as outgoing_for_fifo_raw
    from paired p
  ),
  calculated as (
    select
      p.*,
      case
        when p.sales_missing or p.outgoing_missing then null
        else p.sales_for_fifo_raw + p.outgoing_for_fifo_raw
      end as effective_outbound_raw,
      case
        when p.sales_missing or p.outgoing_missing or p.previous_oldest_quantity is null then null
        else greatest(p.previous_oldest_quantity - (p.sales_for_fifo_raw + p.outgoing_for_fifo_raw), 0::numeric)
      end as expected_remaining_quantity_raw,
      case
        when p.sales_negative and p.outgoing_negative then 'القيمتان السالبتان للبيع والتحويل الصادر معروضتان للتتبع ولم تدخلا في استهلاك FIFO.'
        when p.sales_negative then 'قيمة البيع السالبة معروضة للتتبع ولم تدخل في استهلاك FIFO.'
        when p.outgoing_negative then 'قيمة التحويل الصادر السالبة معروضة للتتبع ولم تدخل في استهلاك FIFO.'
        else null
      end as movement_note
    from prepared p
  ),
  classified as (
    select
      c.*,
      case
        when c.snapshot_issue is not null then 'insufficient_data'
        when c.is_returned_old_date then 'old_date_returned'
        when c.current_oldest_date is not null and c.current_oldest_date < c.previous_oldest_date then 'date_rolled_back'
        when c.sales_missing or c.outgoing_missing then 'insufficient_data'
        when c.effective_outbound_raw >= c.previous_oldest_quantity
          and c.current_oldest_date is null
          and (c.current_oldest_quantity is null or abs(c.current_oldest_quantity) <= v_tolerance)
          then 'ok_oldest_exhausted'
        when c.effective_outbound_raw >= c.previous_oldest_quantity
          and c.current_oldest_date > c.previous_oldest_date
          then 'ok_transition_newer'
        when c.effective_outbound_raw >= c.previous_oldest_quantity
          and c.current_oldest_date = c.previous_oldest_date
          then 'date_should_have_ended'
        when c.effective_outbound_raw < c.previous_oldest_quantity
          and (c.current_oldest_date is null or c.current_oldest_date > c.previous_oldest_date)
          then 'premature_disappearance'
        when c.effective_outbound_raw < c.previous_oldest_quantity
          and c.current_oldest_date = c.previous_oldest_date
          and abs(c.current_oldest_quantity - c.expected_remaining_quantity_raw) <= v_tolerance
          then 'ok_continuing'
        when c.effective_outbound_raw < c.previous_oldest_quantity
          and c.current_oldest_date = c.previous_oldest_date
          and c.current_oldest_quantity > c.expected_remaining_quantity_raw + v_tolerance
          then 'quantity_not_reduced'
        when c.effective_outbound_raw < c.previous_oldest_quantity
          and c.current_oldest_date = c.previous_oldest_date
          and c.current_oldest_quantity < c.expected_remaining_quantity_raw - v_tolerance
          then 'quantity_shortfall'
        else 'insufficient_data'
      end as status_code
    from calculated c
  ),
  final_rows as (
    select
      c.material_code,
      c.material_name,
      c.previous_oldest_date,
      case when c.previous_oldest_quantity is null then null else round(c.previous_oldest_quantity, 3) end as previous_oldest_quantity,
      case when c.sales_quantity is null then null else round(c.sales_quantity, 3) end as sales_quantity,
      case when c.outgoing_transfers is null then null else round(c.outgoing_transfers, 3) end as outgoing_transfers,
      case when c.sales_for_fifo_raw is null then null else round(c.sales_for_fifo_raw, 3) end as sales_for_fifo,
      case when c.outgoing_for_fifo_raw is null then null else round(c.outgoing_for_fifo_raw, 3) end as outgoing_for_fifo,
      case when c.effective_outbound_raw is null then null else round(c.effective_outbound_raw, 3) end as effective_outbound,
      case
        when c.status_code in ('ok_transition_newer', 'old_date_returned', 'date_rolled_back') then null
        when c.expected_remaining_quantity_raw is null then null
        else round(c.expected_remaining_quantity_raw, 3)
      end as expected_remaining_quantity,
      case
        when c.status_code = 'ok_transition_newer' then 'انتهاء التاريخ السابق — كمية التاريخ الجديد غير قابلة للحساب'
        else null
      end as expected_note,
      c.current_oldest_date,
      case when c.current_oldest_quantity is null then null else round(c.current_oldest_quantity, 3) end as current_oldest_quantity,
      case
        when c.status_code in ('ok_continuing', 'quantity_not_reduced', 'quantity_shortfall', 'date_should_have_ended')
          and c.current_oldest_quantity is not null
          and c.expected_remaining_quantity_raw is not null
          then round(c.current_oldest_quantity - c.expected_remaining_quantity_raw, 3)
        else null
      end as difference,
      c.sales_negative,
      c.outgoing_negative,
      c.movement_note,
      c.status_code,
      case c.status_code
        when 'ok_continuing' then 'سليم — استمرار التاريخ'
        when 'ok_transition_newer' then 'سليم — انتقال لتاريخ أحدث'
        when 'ok_oldest_exhausted' then 'سليم — انتهاء أقدم تاريخ'
        when 'quantity_not_reduced' then 'كمية لم تنخفض حسب الصرف'
        when 'quantity_shortfall' then 'نقص أكبر من الصرف'
        when 'premature_disappearance' then 'اختفاء مبكر للتاريخ'
        when 'date_should_have_ended' then 'تاريخ كان يجب أن ينتهي'
        when 'old_date_returned' then 'عودة تاريخ قديم'
        when 'date_rolled_back' then 'رجوع للخلف في التاريخ'
        else 'لا توجد حركة كافية للحكم'
      end as status_label,
      case
        when c.status_code in ('ok_continuing', 'ok_transition_newer', 'ok_oldest_exhausted') then 'healthy'
        when c.status_code = 'insufficient_data' then 'review'
        else 'violation'
      end as status_category,
      case c.status_code
        when 'ok_continuing' then 'استمر أقدم تاريخ وكمية اليوم تطابق المتوقع بعد البيع والتحويل الصادر.'
        when 'ok_transition_newer' then 'حركة الخروج غطت كمية أقدم تاريخ وظهر تاريخ أحدث؛ كمية الـBatch الجديد غير قابلة للحساب من Snapshot أمس.'
        when 'ok_oldest_exhausted' then 'حركة الخروج غطت كمية أقدم تاريخ ولم يعد له تاريخ أو رصيد ظاهر اليوم.'
        when 'quantity_not_reduced' then 'استمر التاريخ لكن كمية اليوم أعلى من المتوقع بعد البيع والتحويل الصادر.'
        when 'quantity_shortfall' then 'استمر التاريخ لكن كمية اليوم أقل من المتوقع بأكثر من حركة الخروج المثبتة.'
        when 'premature_disappearance' then 'اختفى تاريخ أمس أو ظهر تاريخ أحدث رغم بقاء كمية متوقعة منه.'
        when 'date_should_have_ended' then 'حركة الخروج غطت كمية أمس لكن التاريخ نفسه ما زال ظاهرًا اليوم.'
        when 'old_date_returned' then 'تاريخ اليوم سبق ظهوره ثم تجاوزه تاريخ أحدث داخل History المادة نفسها.'
        when 'date_rolled_back' then 'أقدم تاريخ اليوم أقدم من أقدم تاريخ أمس دون إثبات عودة تاريخ سبق تجاوزه.'
        else coalesce(
          c.snapshot_issue,
          case
            when c.sales_missing and c.outgoing_missing then 'بيانات البيع والتحويل الصادر غير مكتملة.'
            when c.sales_missing then 'بيانات البيع غير مكتملة.'
            when c.outgoing_missing then 'بيانات التحويل الصادر غير مكتملة.'
            else 'بيانات المقارنة غير مكتملة أو غير صالحة.'
          end
        )
      end as status_reason
    from classified c
  )
  select
    coalesce(jsonb_agg(to_jsonb(f) order by f.material_code), '[]'::jsonb),
    jsonb_build_object(
      'total', count(*),
      'healthy', count(*) filter (where f.status_category = 'healthy'),
      'violations', count(*) filter (where f.status_category = 'violation'),
      'old_date_returned', count(*) filter (where f.status_code = 'old_date_returned'),
      'premature_disappearance', count(*) filter (where f.status_code = 'premature_disappearance'),
      'incomplete_movements', count(*) filter (where f.status_code = 'insufficient_data' and f.status_reason like 'بيانات%غير مكتملة.'),
      'review', count(*) filter (where f.status_category = 'review')
    )
  into v_rows, v_summary
  from final_rows f;

  return jsonb_build_object(
    'status', 'ok',
    'message', 'تم تحميل تقرير تتبع تواريخ الإنتاج.',
    'report_date', v_report_date,
    'comparison_date', v_previous_date,
    'plant_code', v_plant_code,
    'warehouse_code', v_warehouse_code,
    'current_document_id', v_current_document_id,
    'current_version_id', v_current_version_id,
    'current_source_batch_id', v_current_batch_id,
    'current_line_count', v_current_line_count,
    'previous_document_id', v_previous_document_id,
    'previous_version_id', v_previous_version_id,
    'previous_source_batch_id', v_previous_batch_id,
    'previous_line_count', v_previous_line_count,
    'tolerance', v_tolerance,
    'effective_outbound_formula', 'max(sales_quantity, 0) + max(outgoing_transfers, 0)',
    'summary', v_summary,
    'rows', v_rows
  );
end;
$function$;

comment on function public.get_inventory_production_tracking_report(date, text, text)
is 'Read-only production-date control report using exact finalized D-1/D inventory document snapshots; closing-batch linkage is optional metadata.';

revoke all on function public.get_inventory_production_tracking_report(date, text, text) from public;
revoke all on function public.get_inventory_production_tracking_report(date, text, text) from anon;
grant execute on function public.get_inventory_production_tracking_report(date, text, text) to authenticated;

create or replace function public.get_department_hr_reports_data(
  p_from_date date,
  p_to_date date,
  p_plant_code text default null,
  p_department text default null,
  p_job_title text default null,
  p_personnel_id uuid default null
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $function$
declare
  v_from_date date := p_from_date;
  v_to_date date := p_to_date;
  v_plant_code text := nullif(upper(btrim(coalesce(p_plant_code, ''))), '');
  v_department text := nullif(btrim(coalesce(p_department, '')), '');
  v_job_title text := nullif(btrim(coalesce(p_job_title, '')), '');
  v_personnel jsonb;
  v_status_codes jsonb;
  v_statuses jsonb;
  v_evaluations jsonb;
begin
  if auth.uid() is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if not public.can_view_department_personnel_daily_data() then
    raise exception using errcode = '42501', message = 'Reports view permission is required.';
  end if;

  if v_from_date is null or v_to_date is null then
    raise exception using errcode = '22023', message = 'From and to dates are required.';
  end if;

  if v_from_date > v_to_date then
    raise exception using errcode = '22023', message = 'From date must not be after to date.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'employee_code', p.employee_code,
    'full_name', p.full_name,
    'job_title', p.job_title,
    'plant_code', p.plant_code,
    'department', p.department,
    'phone_number', p.phone_number,
    'hire_date', p.hire_date,
    'is_active', p.is_active
  ) order by p.plant_code, p.department, p.full_name, p.employee_code), '[]'::jsonb)
  into v_personnel
  from public.department_personnel p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'shift_code', c.shift_code,
    'description', c.description,
    'display_color', c.display_color,
    'blocks_evaluation', c.blocks_evaluation,
    'is_active', c.is_active
  ) order by c.shift_code), '[]'::jsonb)
  into v_status_codes
  from public.department_shift_status_codes c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'personnel_id', p.id,
    'work_date', s.work_date,
    'employee_code', p.employee_code,
    'full_name', p.full_name,
    'plant_code', p.plant_code,
    'department', p.department,
    'job_title', p.job_title,
    'shift_code', c.shift_code,
    'shift_description', c.description,
    'display_color', c.display_color
  ) order by s.work_date, p.employee_code), '[]'::jsonb)
  into v_statuses
  from public.department_personnel_daily_statuses s
  join public.department_personnel p on p.id = s.personnel_id
  join public.department_shift_status_codes c on c.id = s.shift_status_code_id
  where s.is_voided = false
    and s.work_date between v_from_date and v_to_date
    and (v_plant_code is null or upper(btrim(p.plant_code)) = v_plant_code)
    and (v_department is null or p.department = v_department)
    and (v_job_title is null or p.job_title = v_job_title)
    and (p_personnel_id is null or p.id = p_personnel_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'personnel_id', p.id,
    'evaluation_date', e.evaluation_date,
    'employee_code', p.employee_code,
    'full_name', p.full_name,
    'plant_code', p.plant_code,
    'department', p.department,
    'job_title', p.job_title,
    'score', e.score,
    'reason', e.reason,
    'saved_by_id', coalesce(e.locked_by, e.created_by),
    'saved_by_name', coalesce(nullif(btrim(u.full_name), ''), '—'),
    'saved_at', coalesce(e.locked_at, e.created_at),
    'locked_at', e.locked_at
  ) order by e.evaluation_date, p.employee_code), '[]'::jsonb)
  into v_evaluations
  from public.department_personnel_daily_evaluations e
  join public.department_personnel p on p.id = e.personnel_id
  left join public.app_users u on u.id = coalesce(e.locked_by, e.created_by)
  where e.is_voided = false
    and e.evaluation_date between v_from_date and v_to_date
    and (v_plant_code is null or upper(btrim(p.plant_code)) = v_plant_code)
    and (v_department is null or p.department = v_department)
    and (v_job_title is null or p.job_title = v_job_title)
    and (p_personnel_id is null or p.id = p_personnel_id);

  return jsonb_build_object(
    'status', 'ok',
    'from_date', v_from_date,
    'to_date', v_to_date,
    'filters', jsonb_build_object(
      'plant_code', v_plant_code,
      'department', v_department,
      'job_title', v_job_title,
      'personnel_id', p_personnel_id
    ),
    'counts', jsonb_build_object(
      'personnel', jsonb_array_length(v_personnel),
      'status_codes', jsonb_array_length(v_status_codes),
      'statuses', jsonb_array_length(v_statuses),
      'evaluations', jsonb_array_length(v_evaluations)
    ),
    'personnel', v_personnel,
    'status_codes', v_status_codes,
    'statuses', v_statuses,
    'evaluations', v_evaluations
  );
end;
$function$;

comment on function public.get_department_hr_reports_data(date, date, text, text, text, uuid)
is 'Read-only RLS-respecting source payload for the six HR reports, restricted to authenticated reports viewers.';

revoke all on function public.get_department_hr_reports_data(date, date, text, text, text, uuid) from public;
revoke all on function public.get_department_hr_reports_data(date, date, text, text, text, uuid) from anon;
grant execute on function public.get_department_hr_reports_data(date, date, text, text, text, uuid) to authenticated;

commit;
