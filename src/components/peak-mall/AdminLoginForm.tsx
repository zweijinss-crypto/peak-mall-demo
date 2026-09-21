'use client';

/**
 * AdminLoginForm — 从原 admin/login-client 抽出的管理员登录表单
 *
 * 设计:
 * - 复用 admin/lib/auth.login() 函数
 * - 登录成功 → /admin/dashboard
 * - a11y:label htmlFor + input id + role=alert + focus ring
 * - demo 凭据提示(admin/admin123)放在表单底部,符合 zh 站点 admin 风格
 */

import { useEffect, useState, type FC, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthed, login } from '@/lib/admin/auth';
import { useT } from '@/lib/use-t';

export interface AdminLoginFormProps {
  /** 登录成功后跳转路径(默认 /admin/dashboard) */
  redirectTo?: string;
}

const AdminLoginForm: FC<AdminLoginFormProps> = ({ redirectTo = '/admin/dashboard' }) => {
  const router = useRouter();
  const t = useT();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAuthed()) {
      router.replace(redirectTo);
      return;
    }
    setChecking(false);
  }, [router, redirectTo]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const res = login(username.trim(), password);
    if (!res.ok) {
      setError(res.error ?? t.admin.loginErrorBad);
      return;
    }
    router.replace(redirectTo);
  };

  if (checking) {
    return (
      <div className="min-h-[calc(100vh-220px)] flex items-center justify-center text-[13px] text-neutral-500">
        {t.admin.loginChecking}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center px-4 py-10 bg-neutral-50">
      <form
        onSubmit={submit}
        aria-labelledby="admin-login-title"
        className="w-full max-w-[400px] bg-white rounded-2xl border border-neutral-200 shadow-sm p-6 space-y-4"
      >
        <header className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[11.5px] uppercase tracking-wider text-neutral-500 font-semibold">
              {t.admin.roleAdmin}
            </span>
          </div>
          <h2 id="admin-login-title" className="text-[20px] font-extrabold text-neutral-900">
            {t.auth.adminPanelTitle ?? t.admin.loginTitle}
          </h2>
          <p className="text-[12.5px] text-neutral-600 leading-relaxed">
            {t.auth.adminPanelSub ?? t.admin.loginIntro}
          </p>
        </header>

        <div className="space-y-1.5">
          <label htmlFor="admin-login-username" className="block text-[12px] text-neutral-700 font-medium">
            {t.admin.loginUsername}
          </label>
          <input
            id="admin-login-username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError(null);
            }}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="admin-login-password" className="block text-[12px] text-neutral-700 font-medium">
            {t.admin.loginPassword}
          </label>
          <input
            id="admin-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
          />
        </div>

        {error && (
          <div role="alert" className="text-[12.5px] text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full px-4 py-2.5 text-[14px] font-bold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {t.admin.loginSubmit}
        </button>

        <p className="text-[11.5px] text-neutral-500 text-center">{t.admin.loginHint}</p>
      </form>
    </div>
  );
};

export default AdminLoginForm;