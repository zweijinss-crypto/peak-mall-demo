-- ============================================================
-- 0009_admin_totp.sql
--
-- Phase 3.2 — TOTP-based 2FA for admin accounts.
--
-- Flow:
--   1. admin clicks "Enroll" in /admin/mfa. Netlify function
--      admin-mfa-enroll generates a TOTP secret, persists it to
--      users.totp_secret, returns the otpauth URI.
--   2. Frontend renders a QR code from the URI, the admin scans
--      with Google Authenticator / 1Password.
--   3. Admin enters a 6-digit code; admin-mfa-verify calls
--      otplib.authenticator.verify() with the secret. On success,
--      sets users.totp_enabled = true and stamps totp_verified_at.
--   4. AdminGuard reads totp_enabled + totp_verified_at; if the
--      latter is older than 30 minutes, redirects to /admin/mfa.
--
-- The secret is plaintext (we have no KMS). Risk: DB read leaks
-- the secret. Mitigated by RLS: only service_role can read/write.
-- Idempotent: standard IF NOT EXISTS / OR REPLACE guards.
-- ============================================================

alter table public.users
  add column if not exists totp_enabled     boolean     not null default false;

alter table public.users
  add column if not exists totp_secret      text;

alter table public.users
  add column if not exists totp_verified_at timestamptz;

create index if not exists users_totp_enabled_idx
  on public.users(totp_enabled) where totp_enabled = true;

-- ------------------------------------------------------------
-- get_admin_totp_secret(email) — returns the secret if the user
-- is an enrolled admin, null otherwise. Service-role callable only
-- (security definer + RLS).
-- ------------------------------------------------------------
create or replace function public.get_admin_totp_secret(p_email text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select totp_secret into v_secret
    from public.users
   where lower(email) = lower(p_email)
     and role = 'admin'
     and totp_enabled = true;
  return v_secret;
end;
$$;

-- ------------------------------------------------------------
-- mark_totp_verified(email) — stamps totp_verified_at = now().
-- ------------------------------------------------------------
create or replace function public.mark_totp_verified(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
     set totp_verified_at = now()
   where lower(email) = lower(p_email)
     and role = 'admin';
end;
$$;

comment on column public.users.totp_secret is
  'Base32 TOTP shared secret. Plaintext acceptable for a single-tenant admin (low N). Only the netlify admin-mfa-* functions read it via service-role key.';
comment on column public.users.totp_verified_at is
  'Timestamp of the most recent successful TOTP verification. AdminGuard refreshes if older than 30 minutes.';
comment on function public.get_admin_totp_secret(text) is
  'Returns the enrolled admin TOTP secret by email, or null. Service-role only.';
comment on function public.mark_totp_verified(text) is
  'Stamps users.totp_verified_at = now(). Service-role only.';