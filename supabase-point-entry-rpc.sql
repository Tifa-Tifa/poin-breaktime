-- Penyimpanan poin atomik untuk Poin Breaktime.
-- Fungsi ini tidak mengubah data lama. Seluruh operasi berhasil bersama-sama
-- atau dibatalkan seluruhnya oleh transaksi PostgreSQL.

create or replace function public.save_point_entry_batch(
  p_batch jsonb,
  p_entries jsonb,
  p_updated_entries jsonb default '[]'::jsonb,
  p_audit jsonb default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.batches (
    id, rule_id, entry_date, notes, created_by, created_at
  ) values (
    p_batch->>'id',
    nullif(p_batch->>'ruleId', ''),
    (p_batch->>'date')::date,
    nullif(p_batch->>'notes', ''),
    nullif(p_batch->>'createdBy', ''),
    (p_batch->>'createdAt')::timestamptz
  );

  insert into public.point_entries (
    id, batch_id, employee_id, rule_id, outlet_id, entry_date,
    quantity, multiplier, base_points, total_points, entry_kind,
    status, created_at, updated_at, voided_by_cancellation_id,
    cancelled_entry_id
  )
  select
    item->>'id',
    nullif(item->>'batchId', ''),
    item->>'employeeId',
    item->>'ruleId',
    nullif(item->>'outletId', ''),
    (item->>'date')::date,
    coalesce((item->>'quantity')::numeric, 1),
    coalesce((item->>'multiplier')::numeric, 1),
    coalesce((item->>'basePoints')::numeric, 0),
    coalesce((item->>'totalPoints')::numeric, 0),
    coalesce(nullif(item->>'entryKind', ''), 'MANUAL'),
    coalesce(nullif(item->>'status', ''), 'CONFIRMED'),
    nullif(item->>'createdAt', '')::timestamptz,
    nullif(item->>'updatedAt', '')::timestamptz,
    nullif(item->>'voidedByCancellationId', ''),
    nullif(item->>'cancelledEntryId', '')
  from jsonb_array_elements(coalesce(p_entries, '[]'::jsonb)) as item;

  update public.point_entries as existing
  set
    status = coalesce(update_row.status, existing.status),
    updated_at = coalesce(update_row.updated_at, existing.updated_at),
    voided_by_cancellation_id = coalesce(
      update_row.voided_by_cancellation_id,
      existing.voided_by_cancellation_id
    ),
    cancelled_entry_id = coalesce(
      update_row.cancelled_entry_id,
      existing.cancelled_entry_id
    )
  from jsonb_to_recordset(coalesce(p_updated_entries, '[]'::jsonb)) as update_row(
    id text,
    status text,
    updated_at timestamptz,
    voided_by_cancellation_id text,
    cancelled_entry_id text
  )
  where existing.id = update_row.id;

  if p_audit is not null then
    insert into public.audit_logs (
      id, action, entity_type, entity_id, actor,
      before_data, after_data, occurred_at
    ) values (
      p_audit->>'id',
      p_audit->>'action',
      nullif(p_audit->>'entityType', ''),
      nullif(p_audit->>'entityId', ''),
      nullif(p_audit->>'actor', ''),
      p_audit->'before',
      p_audit->'after',
      (p_audit->>'at')::timestamptz
    );
  end if;

  return jsonb_build_object(
    'ok', true,
    'entries_saved', jsonb_array_length(coalesce(p_entries, '[]'::jsonb))
  );
end;
$$;

-- Hanya backend tepercaya dengan service role yang boleh menjalankannya.
revoke all on function public.save_point_entry_batch(jsonb, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_point_entry_batch(jsonb, jsonb, jsonb, jsonb)
  to service_role;

-- Pemeriksaan instalasi, tidak mengubah data.
select
  routine_name,
  security_type
from information_schema.routines
where routine_schema = 'public'
  and routine_name = 'save_point_entry_batch';
