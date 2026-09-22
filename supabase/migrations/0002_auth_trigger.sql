-- ============================================================
-- 0002_auth_trigger.sql
--
-- Auto-create public.users row on auth.users insert.
-- Runs with SECURITY DEFINER so it can insert into public.users
-- regardless of the calling user's RLS context.
--
-- Idempotent: drop + recreate trigger and function on each run.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
security definer
set search_path = public
language plpgsql
as $$
declare
  v_nickname text;
  v_invite_code text;
begin
  -- Pull optional nickname from raw_user_meta_data set by the client
  v_nickname := nullif(coalesce(new.raw_user_meta_data->>'nickname', ''), '');

  -- Auto-generate an 8-char invite code (uppercase alnum, no 0/O/1/I)
  v_invite_code := upper(substr(replace(replace(replace(replace(
    encode(gen_random_bytes(6), 'hex'),
    '0', 'X'), '1', 'Y'), 'o', 'Z'), 'i', 'W'), 1, 8));

  insert into public.users (id, email, nickname, role, status, invite_code, created_at, updated_at)
  values (
    new.id,
    new.email,
    v_nickname,
    'user',
    'active',
    v_invite_code,
    now(),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Bootstrap admin: pick the first user with this email and grant
-- admin role. Replace the placeholder with your real admin email.
-- This is a one-shot idempotent grant.
-- ============================================================
update public.users
   set role = 'admin'
 where email = 'admin@peak-mall.local'
   and role <> 'admin';
