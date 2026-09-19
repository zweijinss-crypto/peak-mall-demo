/**
 * Demo auth - 纯客户端 mock,无后端依赖
 *
 * 任何 email + 密码 ≥ 6 位都视为成功
 * 真实接入时替换为 fetch 到真后端
 */
const KEY = 'peak_auth_user';

export interface AuthUser {
  email: string;
  nickname?: string;
  loggedInAt: number;
}

export function fakeLogin(email: string, password: string): { ok: boolean; error?: string; user?: AuthUser } {
  if (!email || !password) return { ok: false, error: 'MISSING_FIELDS' };
  if (password.length < 6) return { ok: false, error: 'PASSWORD_TOO_SHORT' };
  if (!email.includes('@')) return { ok: false, error: 'INVALID_EMAIL' };
  const user: AuthUser = { email, loggedInAt: Date.now() };
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(user));
  }
  return { ok: true, user };
}

export function fakeRegister(input: { email: string; password: string; nickname?: string }): { ok: boolean; error?: string; user?: AuthUser } {
  return fakeLogin(input.email, input.password);
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY);
  }
}
