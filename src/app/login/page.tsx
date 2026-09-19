'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AnnouncementBar, ShopHeader, Footer, AuthSplit } from '@/components/peak-mall';
import { COPY } from '@/lib/copy';
import { fakeLogin, fakeRegister, getCurrentUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const currentUser = getCurrentUser();

  return (
    <>
      <AnnouncementBar tag="公告" text="登录后享受会员价 · 历史订单随时查" />
      <ShopHeader
        brand={{ name: COPY.brand.name, slogan: COPY.brand.slogan }}
        navItems={[
          { key: 'home', label: '首页' },
          { key: 'all', label: '全部' },
          { key: 'new', label: '新品' },
          { key: 'hot', label: '热卖' },
        ]}
        active="home"
        currencyOptions={[{ code: 'USD', label: 'USD 美元' }]}
        currency="USD"
        onCurrencyChange={() => {}}
        langOptions={[
          { code: 'zh', label: '中文' },
          { code: 'en', label: 'EN' },
        ]}
        lang="zh"
        onLangChange={() => {}}
      />

      <main>
        {currentUser && (
          <div className="max-w-shell mx-auto px-5 pt-6">
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-md text-[13px]">
              已登录为 <b>{currentUser.email}</b> · 登录于 {new Date(currentUser.loggedInAt).toLocaleString()}
            </div>
          </div>
        )}
        <AuthSplit
          requireInvite={false}
          onLogin={async (p) => {
            setError(null);
            const r = fakeLogin(p.email, p.password);
            if (!r.ok) {
              const msg = r.error === 'PASSWORD_TOO_SHORT' ? '密码至少 6 位' : '登录失败';
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
              const msg = r.error === 'PASSWORD_TOO_SHORT' ? '密码至少 6 位' : '注册失败';
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
