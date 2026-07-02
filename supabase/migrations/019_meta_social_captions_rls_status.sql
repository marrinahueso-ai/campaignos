-- Repair meta_social_captions RLS (upsert needs with check) + caption approval status

alter table public.meta_social_captions
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'approved'));

drop policy if exists "Allow public read access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public insert access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public update access on meta_social_captions"
  on public.meta_social_captions;
drop policy if exists "Allow public delete access on meta_social_captions"
  on public.meta_social_captions;

create policy "Allow public read access on meta_social_captions"
  on public.meta_social_captions for select to anon, authenticated using (true);

create policy "Allow public insert access on meta_social_captions"
  on public.meta_social_captions for insert to anon, authenticated with check (true);

create policy "Allow public update access on meta_social_captions"
  on public.meta_social_captions for update to anon, authenticated
  using (true) with check (true);

create policy "Allow public delete access on meta_social_captions"
  on public.meta_social_captions for delete to anon, authenticated using (true);
