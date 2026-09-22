-- ============================================================
-- 0003_email_settings.sql
--
-- Phase 1.4 — Resend / Supabase Auth password reset plumbing.
--
-- Supabase Auth sends its own password-reset emails using the project's
-- built-in SMTP. To customize the redirect URL the user lands on
-- after clicking the email link, set the `redirect_to` parameter at
-- sign-in/reset-call time on the client (we do this in
-- src/lib/auth.ts). No DB change is strictly required, but we add a
-- small `notification_prefs` table so future marketing / transactional
-- preferences can live alongside the user.
--
-- Run this after 0001_init.sql + 0002_auth_trigger.sql.
-- ============================================================

create table if not exists public.notification_prefs (
  user_id        uuid primary key references public.users(id) on delete cascade,
  order_updates  boolean not null default true,
  shipment       boolean not null default true,
  marketing      boolean not null default false,
  updated_at     timestamptz not null default now()
);

drop trigger if exists notification_prefs_updated_at on public.notification_prefs;
create trigger notification_prefs_updated_at
  before update on public.notification_prefs
  for each row execute function public.set_updated_at();

-- Auto-create a notification_prefs row when a user is created (same
-- trigger family as handle_new_user).
create or replace function public.handle_new_notification_prefs()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
begin
  insert into public.notification_prefs (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_user_created_notification_prefs on public.users;
create trigger on_user_created_notification_prefs
  after insert on public.users
  for each row execute function public.handle_new_notification_prefs();

alter table public.notification_prefs enable row level security;

drop policy if exists notification_prefs_select_own on public.notification_prefs;
create policy on public.notification_prefs_select_own
  for select using (auth.uid() = user_id);

drop policy if exists notification_prefs_update_own on public.notification_prefs;
create policy on public.notification_prefs_update_own
  for update using (auth.uid() = user_id);

-- Service-role bypass for backend writers (e.g. admin updates)
drop policy if exists notification_prefs_service_all on public.notification_prefs;
create policy on public.notification_prefs_service_all
  for all using (auth.role() = 'service_role');

-- ============================================================
-- Email log — track outbound transactional emails so admin can audit
-- ============================================================

create table if not exists public.email_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.users(id) on delete set null,
  to_email      text not null,
  kind          text not null check (kind in (
    'order_confirmation',
    'shipment_notification',
    'password_reset',
    'welcome'
  )),
  provider_id   text,
  status        text not null check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  sent_at       timestamptz not null default now()
);

create index if not exists email_log_user_idx on public.email_log(user_id);
create index if not exists email_log_kind_idx on public.email_log(kind);
create index if not exists email_log_sent_at_idx on public.email_log(sent_at desc);

alter table public.email_log enable row level security;

-- Users can read their own email log
drop policy if exists email_log_select_own on public.email_log;
create policy on public.email_log_select_own
  for select using (auth.uid() = user_id);

-- Service role bypass (used by webhook handlers)
drop policy if exists email_log_service_all on public.email_log;
create policy on public.email_log_service_all
  for all using (auth.role() = 'service_role');