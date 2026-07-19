-- Phase C2b — remaining open "Allow public …" tables after 065.
-- Reuses private.drop_all_policies, private.is_active_org_member, private.can_access_event.

-- ---------------------------------------------------------------------------
-- Event-scoped
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.activity_log');
alter table public.activity_log enable row level security;
create policy activity_log_select_event_member on public.activity_log
  for select to authenticated using (private.can_access_event(event_id));
create policy activity_log_insert_event_member on public.activity_log
  for insert to authenticated with check (private.can_access_event(event_id));

select private.drop_all_policies('public.publication_schedule');
alter table public.publication_schedule enable row level security;
create policy publication_schedule_select_event_member on public.publication_schedule
  for select to authenticated using (private.can_access_event(event_id));
create policy publication_schedule_insert_event_member on public.publication_schedule
  for insert to authenticated with check (private.can_access_event(event_id));
create policy publication_schedule_update_event_member on public.publication_schedule
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy publication_schedule_delete_event_member on public.publication_schedule
  for delete to authenticated using (private.can_access_event(event_id));

select private.drop_all_policies('public.event_creative_briefs');
alter table public.event_creative_briefs enable row level security;
create policy event_creative_briefs_select_event_member on public.event_creative_briefs
  for select to authenticated using (private.can_access_event(event_id));
create policy event_creative_briefs_insert_event_member on public.event_creative_briefs
  for insert to authenticated with check (private.can_access_event(event_id));
create policy event_creative_briefs_update_event_member on public.event_creative_briefs
  for update to authenticated
  using (private.can_access_event(event_id))
  with check (private.can_access_event(event_id));
create policy event_creative_briefs_delete_event_member on public.event_creative_briefs
  for delete to authenticated using (private.can_access_event(event_id));

-- ---------------------------------------------------------------------------
-- Org-scoped
-- ---------------------------------------------------------------------------
select private.drop_all_policies('public.analytics_sync_runs');
alter table public.analytics_sync_runs enable row level security;
create policy analytics_sync_runs_select_active_member on public.analytics_sync_runs
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy analytics_sync_runs_insert_active_member on public.analytics_sync_runs
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy analytics_sync_runs_update_active_member on public.analytics_sync_runs
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy analytics_sync_runs_delete_active_member on public.analytics_sync_runs
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.calendar_imports');
alter table public.calendar_imports enable row level security;
create policy calendar_imports_select_active_member on public.calendar_imports
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy calendar_imports_insert_active_member on public.calendar_imports
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy calendar_imports_update_active_member on public.calendar_imports
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy calendar_imports_delete_active_member on public.calendar_imports
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.import_event_preferences');
alter table public.import_event_preferences enable row level security;
create policy import_event_preferences_select_active_member on public.import_event_preferences
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy import_event_preferences_insert_active_member on public.import_event_preferences
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy import_event_preferences_update_active_member on public.import_event_preferences
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy import_event_preferences_delete_active_member on public.import_event_preferences
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.organization_creative_style_memory');
alter table public.organization_creative_style_memory enable row level security;
create policy organization_creative_style_memory_select_active_member
  on public.organization_creative_style_memory
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy organization_creative_style_memory_insert_active_member
  on public.organization_creative_style_memory
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy organization_creative_style_memory_update_active_member
  on public.organization_creative_style_memory
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy organization_creative_style_memory_delete_active_member
  on public.organization_creative_style_memory
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.social_account_insights');
alter table public.social_account_insights enable row level security;
create policy social_account_insights_select_active_member on public.social_account_insights
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy social_account_insights_insert_active_member on public.social_account_insights
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy social_account_insights_update_active_member on public.social_account_insights
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy social_account_insights_delete_active_member on public.social_account_insights
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.social_activity_events');
alter table public.social_activity_events enable row level security;
create policy social_activity_events_select_active_member on public.social_activity_events
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy social_activity_events_insert_active_member on public.social_activity_events
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy social_activity_events_update_active_member on public.social_activity_events
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy social_activity_events_delete_active_member on public.social_activity_events
  for delete to authenticated
  using (private.is_active_org_member(organization_id));

select private.drop_all_policies('public.social_post_insights');
alter table public.social_post_insights enable row level security;
create policy social_post_insights_select_active_member on public.social_post_insights
  for select to authenticated
  using (private.is_active_org_member(organization_id));
create policy social_post_insights_insert_active_member on public.social_post_insights
  for insert to authenticated
  with check (private.is_active_org_member(organization_id));
create policy social_post_insights_update_active_member on public.social_post_insights
  for update to authenticated
  using (private.is_active_org_member(organization_id))
  with check (private.is_active_org_member(organization_id));
create policy social_post_insights_delete_active_member on public.social_post_insights
  for delete to authenticated
  using (private.is_active_org_member(organization_id));
