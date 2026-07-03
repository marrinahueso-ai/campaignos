-- One pending approval request per communication item.
-- Cancel older duplicates before adding the unique index.

with ranked as (
  select
    id,
    row_number() over (
      partition by communication_item_id
      order by requested_at desc
    ) as rn
  from public.approval_requests
  where status = 'pending'
    and communication_item_id is not null
)
update public.approval_requests
set
  status = 'rejected',
  resolved_at = now(),
  notes = coalesce(
    notes,
    'Superseded by duplicate approval request cleanup.'
  )
where id in (
  select id
  from ranked
  where rn > 1
);

create unique index if not exists approval_requests_one_pending_per_item_idx
  on public.approval_requests (communication_item_id)
  where status = 'pending'
    and communication_item_id is not null;
