-- Engine 6.1 — Communication Strategy on events
-- Not every event needs a full marketing campaign.

alter table public.events
  add column if not exists communication_strategy text not null default 'full_campaign'
  check (
    communication_strategy in (
      'full_campaign',
      'reminder_only',
      'calendar_only',
      'custom'
    )
  );

create index if not exists events_communication_strategy_idx
  on public.events (communication_strategy);

comment on column public.events.communication_strategy is
  'full_campaign | reminder_only | calendar_only | custom';
