'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnnouncementBar, ShopHeader, Footer, AuthSplit } from '@/components/peak-mall';
import { fakeLogin, fakeRegister, getCurrentUser } from '@/lib/auth';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('home', 'home');
  const [error, setError] = useState<string | null>(null);
  const currentUser = getCurrentUser();

  const announceText = t.auth.announce;

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
        {currentUser && (
          <div className="max-w-shell mx-auto px-5 pt-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-md text-[13px]">
              {t.auth.loggedInAs(currentUser.email, new Date(currentUser.loggedInAt).toLocaleString())}
            </div>
          </div>
        )}
        <AuthSplit
          requireInvite={false}
          onLogin={async (p) => {
            setError(null);
            const r = fakeLogin(p.email, p.password);
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
            const r = fakeRegister({ email: p.email, password: p.password, nickname: p.nickname });
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
          <div className="text-center text-rose-600 text-[13px] -mt-8 mb-8">{error}</div>
        )}
      </main>

      <Footer />
    </>
  );
}
