/**
 * admin/auth — mock client-side auth for the admin demo gate.
 *
 * Demo credentials (hard-coded for the static demo; never use this for
 * anything real):
 *   username: admin
 *   password: admin123
 *
 * The state is stored in localStorage so it survives reload. There is no
 * server round-trip — this is purely a UX gate matching the source
 * site's "click in" admin entry, except we ask for a demo password too.
 */
const STORAGE_KEY = 'peak_admin_authed';
export const DEMO_USERNAME = 'admin';
export const DEMO_PASSWORD = 'admin123';

export function isAuthed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function login(username: string, password: string): { ok: boolean; error?: string } {
  if (!username || !password) return { ok: false, error: '请输入账号与密码' };
  if (username !== DEMO_USERNAME || password !== DEMO_PASSWORD) {
    return { ok: false, error: '账号或密码错误' };
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // ignore quota errors
  }
  return { ok: true };
}

export function logout(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}