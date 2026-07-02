-- Engine 18 repair: RLS policies for Creative Director tables (MVP open access)

alter table public.event_creative_briefs enable row level security;
alter table public.organization_creative_style_memory enable row level security;

drop policy if exists "Allow public read access on event_creative_briefs"
  on public.event_creative_briefs;
drop policy if exists "Allow public insert access on event_creative_briefs"
  on public.event_creative_briefs;
drop policy if exists "Allow public update access on event_creative_briefs"
  on public.event_creative_briefs;
drop policy if exists "Allow public delete access on event_creative_briefs"
  on public.event_creative_briefs;

create policy "Allow public read access on event_creative_briefs"
  on public.event_creative_briefs for select using (true);
create policy "Allow public insert access on event_creative_briefs"
  on public.event_creative_briefs for insert with check (true);
create policy "Allow public update access on event_creative_briefs"
  on public.event_creative_briefs for update using (true);
create policy "Allow public delete access on event_creative_briefs"
  on public.event_creative_briefs for delete using (true);

drop policy if exists "Allow public read access on organization_creative_style_memory"
  on public.organization_creative_style_memory;
drop policy if exists "Allow public insert access on organization_creative_style_memory"
  on public.organization_creative_style_memory;
drop policy if exists "Allow public update access on organization_creative_style_memory"
  on public.organization_creative_style_memory;
drop policy if exists "Allow public delete access on organization_creative_style_memory"
  on public.organization_creative_style_memory;

create policy "Allow public read access on organization_creative_style_memory"
  on public.organization_creative_style_memory for select using (true);
create policy "Allow public insert access on organization_creative_style_memory"
  on public.organization_creative_style_memory for insert with check (true);
create policy "Allow public update access on organization_creative_style_memory"
  on public.organization_creative_style_memory for update using (true);
create policy "Allow public delete access on organization_creative_style_memory"
  on public.organization_creative_style_memory for delete using (true);

-- Engine 17 tables that may also lack RLS when 013 was applied manually

alter table public.event_asset_versions enable row level security;
alter table public.organization_brand_kit_items enable row level security;

drop policy if exists "Allow public read access on event_asset_versions"
  on public.event_asset_versions;
drop policy if exists "Allow public insert access on event_asset_versions"
  on public.event_asset_versions;
drop policy if exists "Allow public update access on event_asset_versions"
  on public.event_asset_versions;
drop policy if exists "Allow public delete access on event_asset_versions"
  on public.event_asset_versions;

create policy "Allow public read access on event_asset_versions"
  on public.event_asset_versions for select using (true);
create policy "Allow public insert access on event_asset_versions"
  on public.event_asset_versions for insert with check (true);
create policy "Allow public update access on event_asset_versions"
  on public.event_asset_versions for update using (true);
create policy "Allow public delete access on event_asset_versions"
  on public.event_asset_versions for delete using (true);

drop policy if exists "Allow public read access on organization_brand_kit_items"
  on public.organization_brand_kit_items;
drop policy if exists "Allow public insert access on organization_brand_kit_items"
  on public.organization_brand_kit_items;
drop policy if exists "Allow public update access on organization_brand_kit_items"
  on public.organization_brand_kit_items;
drop policy if exists "Allow public delete access on organization_brand_kit_items"
  on public.organization_brand_kit_items;

create policy "Allow public read access on organization_brand_kit_items"
  on public.organization_brand_kit_items for select using (true);
create policy "Allow public insert access on organization_brand_kit_items"
  on public.organization_brand_kit_items for insert with check (true);
create policy "Allow public update access on organization_brand_kit_items"
  on public.organization_brand_kit_items for update using (true);
create policy "Allow public delete access on organization_brand_kit_items"
  on public.organization_brand_kit_items for delete using (true);
