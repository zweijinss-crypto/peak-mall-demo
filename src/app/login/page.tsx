'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  AuthSplit,
  AuthTabs,
  AdminLoginForm,
} from '@/components/peak-mall';
import { fakeLogin, fakeRegister, getCurrentUser } from '@/lib/auth';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const chrome = usePageChrome('home', 'home');
  const [error, setError] = useState<string | null>(null);
  const currentUser = getCurrentUser();
  const reason = searchParams.get('reason');
  const reasonMessage =
    reason === 'not_admin'
      ? (t.admin as Record<string, string>).loginReasonNotAdmin ??
        '当前账号已被取消管理员权限'
      : null;
  // 管理员 tab 内 AdminLoginForm 自带已登录检测(自动 redirect 到 /admin/dashboard)

  const announceText = t.auth.announce;
  const loginErrId = 'login-page-error';

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag === 'Notice' ? 'Notice' : '公告'} text={announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active="home"
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main>
        <div className="max-w-shell mx-auto px-5 pt-5">
          <div className="bg-amber-50 border border-amber-200 px-4 py-2.5 text-[12.5px] text-amber-900 flex flex-col md:flex-row md:items-center gap-1.5 md:gap-3">
            <span className="inline-flex items-center gap-1.5 font-bold">
              <span aria-hidden="true">🎬</span>
              {t.auth.demoBannerTitle}
            </span>
            <span className="text-amber-800">{t.auth.demoBannerBody}</span>
            <code className="text-[11.5px] font-mono px-2 py-0.5 bg-white border border-amber-300 text-amber-900 md:ml-auto whitespace-nowrap">
              {t.auth.demoCredsHint}
            </code>
          </div>
        </div>
        {currentUser && (
          <div className="max-w-shell mx-auto px-5 pt-3">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 text-[12.5px]">
              {t.auth.loggedInAs(currentUser.email, new Date(currentUser.loggedInAt).toLocaleString('en-US', { timeZone: 'UTC' }))}
            </div>
          </div>
        )}
        {reasonMessage && (
          <div className="max-w-shell mx-auto px-5 pt-3">
            <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-2.5 text-[12.5px]">
              {reasonMessage}
            </div>
          </div>
        )}

        <AuthTabs
          initial="user"
          userPanel={
            <>
              <AuthSplit
                requireInvite={false}
                i18n={{
                  hero: t.auth.hero,
                  loginTitle: t.auth.loginTitle,
                  registerTitle: t.auth.registerTitle,
                  email: t.auth.email,
                  emailPh: t.auth.emailPh,
                  password: t.auth.password,
                  passwordPh: t.auth.passwordPh,
                  password2: t.auth.password2,
                  password2Ph: t.auth.password2Ph,
                  nickname: t.auth.nickname,
                  nicknamePh: t.auth.nicknamePh,
                  invite: t.auth.invite,
                  invitePh: t.auth.invitePh,
                  remember: t.auth.remember,
                  login: t.auth.login,
                  register: t.auth.register,
                  pwMismatch: t.auth.pwMismatch,
                  errGeneric: t.auth.errGeneric,
                }}
                onLogin={async (p) => {
                  setError(null);
                  const r = await fakeLogin(p.email, p.password);
                  if (!r.ok) {
                    const msg = r.error === 'PASSWORD_TOO_SHORT' ? t.auth.loginErrorShort : t.auth.loginErrorGeneric;
                    setError(msg);
                    return { ok: false, error: msg };
                  }
                  setTimeout(() => router.push('/profile'), 600);
                  return { ok: true };
                }}
                onRegister={async (p) => {
                  setError(null);
                  const r = await fakeRegister({ email: p.email, password: p.password, nickname: p.nickname });
                  if (!r.ok) {
                    const msg = r.error === 'PASSWORD_TOO_SHORT' ? t.auth.registerErrorShort : t.auth.registerErrorGeneric;
                    setError(msg);
                    return { ok: false, error: msg };
                  }
                  setTimeout(() => router.push('/profile'), 600);
                  return { ok: true };
                }}
              />
              {error && (
                <div id={loginErrId} role="alert" className="text-center text-rose-600 text-[13px] -mt-8 mb-8">{error}</div>
              )}
            </>
          }
          adminPanel={<AdminLoginForm redirectTo="/admin/dashboard" />}
        />
      </main>

      <Footer />
    </>
  );
}