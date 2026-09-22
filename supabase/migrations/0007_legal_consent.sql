-- ============================================================
-- 0007_legal_consent.sql
--
-- Phase 2.5 — legal consent tracking.
--
-- Adds `terms_accepted_at` and `privacy_accepted_at` to public.users
-- and extends the auth.users -> public.users trigger so the values
-- are forwarded from raw_user_meta_data. The client must set these
-- at sign-up time; missing values mean the user registered before
-- Phase 2.5 and will be prompted to re-consent on next login
-- (logic lives in the AuthSplit register panel).
--
-- Idempotent: all DDL uses IF NOT EXISTS / OR REPLACE.
-- ============================================================

alter table public.users
  add column if not exists terms_accepted_at   timestamptz;

alter table public.users
  add column if not exists terms_accepted_version text;

alter table public.users
  add column if not exists privacy_accepted_at timestamptz;

alter table public.users
  add column if not exists privacy_accepted_version text;

create index if not exists users_terms_idx on public.users(terms_accepted_at);
create index if not exists users_privacy_idx on public.users(privacy_accepted_at);

-- Extend the handle_new_user() trigger to capture consent
-- metadata. Existing users (registered before this migration) keep
-- null values; the auth UI prompts them to re-consent.
create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_nickname text;
  v_invite_code text;
  v_terms_at    timestamptz;
  v_privacy_at  timestamptz;
  v_terms_ver   text;
  v_privacy_ver text;
begin
  -- Pull optional nickname from raw_user_meta_data set by the client
  v_nickname := nullif(coalesce(new.raw_user_meta_data->>'nickname', ''), '');

  -- Phase 2.5 — legal consent. The client sets ISO-8601 timestamps
  -- and document version strings; the trigger stores them so we
  -- have an audit trail of which Terms / Privacy version each user
  -- accepted.
  begin
    v_terms_at := nullif(new.raw_user_meta_data->>'terms_accepted_at', '')::timestamptz;
  exception when others then
    v_terms_at := null;
  end;
  begin
    v_privacy_at := nullif(new.raw_user_meta_data->>'privacy_accepted_at', '')::timestamptz;
  exception when others then
    v_privacy_at := null;
  end;
  v_terms_ver   := nullif(coalesce(new.raw_user_meta_data->>'terms_version',   ''), '');
  v_privacy_ver := nullif(coalesce(new.raw_user_meta_data->>'privacy_version', ''), '');

  -- Auto-generate an 8-char invite code (uppercase alnum, no 0/O/1/I)
  v_invite_code := upper(substr(replace(replace(replace(replace(
    encode(gen_random_bytes(6), 'hex'),
    '0', 'X'), '1', 'Y'), 'o', 'Z'), 'i', 'W'), 1, 8));

  insert into public.users (
    id, email, nickname, role, status, invite_code,
    terms_accepted_at, terms_accepted_version,
    privacy_accepted_at, privacy_accepted_version,
    created_at, updated_at
  )
  values (
    new.id,
    new.email,
    v_nickname,
    'user',
    'active',
    v_invite_code,
    v_terms_at,
    v_terms_ver,
    v_privacy_at,
    v_privacy_ver,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Re-create trigger so the updated function takes effect for future
-- signups.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

comment on column public.users.terms_accepted_at is
  'ISO timestamp the user accepted the current Terms of Service. Null = not yet accepted.';
comment on column public.users.privacy_accepted_at is
  'ISO timestamp the user accepted the current Privacy Policy. Null = not yet accepted.';
comment on column public.users.terms_accepted_version is
  'Document version string (e.g. "2026-09-22") of the accepted Terms.';
comment on column public.users.privacy_accepted_version is
  'Document version string (e.g. "2026-09-22") of the accepted Privacy Policy.';
