-- CampaignOS Engine 4: Communications Brain — link timeline steps to communication drafts

alter table public.communication_items
  add column if not exists event_communication_step_id uuid
    references public.event_communication_steps (id) on delete cascade;

alter table public.communication_items
  drop constraint if exists communication_items_event_id_channel_key;

create unique index if not exists communication_items_event_channel_hub_idx
  on public.communication_items (event_id, channel)
  where event_communication_step_id is null;

create unique index if not exists communication_items_step_id_idx
  on public.communication_items (event_communication_step_id)
  where event_communication_step_id is not null;

create index if not exists communication_items_step_lookup_idx
  on public.communication_items (event_id, event_communication_step_id);
