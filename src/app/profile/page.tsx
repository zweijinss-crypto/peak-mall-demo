'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { usePeakStore } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

export default function ProfilePage() {
  const router = useRouter();
  const t = useT();
  const chrome = usePageChrome('profile');
  const cartCount = usePeakStore((s) => s.cart.reduce((sum, c) => sum + c.qty, 0));
  const wishCount = usePeakStore((s) => s.wishlist.length);
  const orderCount = usePeakStore((s) => s.orders.length);

  // Change password form state
  const [pwdOpen, setPwdOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [n1, setN1] = useState('');
  const [n2, setN2] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);

  // Fund password form state
  const [fundOpen, setFundOpen] = useState(false);
  const [fundCur, setFundCur] = useState('');
  const [fund1, setFund1] = useState('');
  const [fund2, setFund2] = useState('');
  const [fundMsg, setFundMsg] = useState<string | null>(null);

  const submitPwd = () => {
    if (n1.length < 6) { setPwdMsg(t.security.pwdTooShort); return; }
    if (n1 !== n2) { setPwdMsg(t.security.pwdMismatch); return; }
    setPwdMsg(t.security.savedOk);
    setCur(''); setN1(''); setN2('');
    setTimeout(() => { setPwdOpen(false); setPwdMsg(null); }, 1200);
  };
  const submitFund = () => {
    if (!/^\d{6}$/.test(fund1)) { setFundMsg(t.security.pwdTooShort); return; }
    if (fund1 !== fund2) { setFundMsg(t.security.pwdMismatch); return; }
    setFundMsg(t.security.savedOk);
    setFundCur(''); setFund1(''); setFund2('');
    setTimeout(() => { setFundOpen(false); setFundMsg(null); }, 1200);
  };

  return (
    <>
      <AnnouncementBar tag={chrome.announceTag} text={chrome.announceText} />
      <ShopHeader
        brand={chrome.brand}
        navItems={chrome.navItems}
        active={chrome.active}
        currencyOptions={chrome.currencyOptions}
        currency={chrome.currency}
        onCurrencyChange={(c) => chrome.onCurrencyChange(c as typeof chrome.currency)}
        langOptions={chrome.langOptions}
        lang={chrome.lang}
        onLangChange={(l) => chrome.onLangChange(l as typeof chrome.lang)}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <h1 className="text-[28px] font-extrabold text-ink-900 mb-6">{t.profile.title}</h1>

        {/* Distribute / Withdraw shortcuts — mirrors source sidebar entries */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { label: t.commissions.title, path: '/commissions', emoji: '📊' },
            { label: t.withdraw.title,   path: '/withdraw',     emoji: '💳' },
            { label: t.withdrawAddress.title, path: '/withdraw-address', emoji: '🏦' },
          ].map((l) => (
            <button
              key={l.path}
              onClick={() => router.push(l.path)}
              className="bg-white rounded-xl border border-ink-100 p-4 text-left hover:shadow-soft hover:-translate-y-0.5 transition-all flex items-center gap-3"
            >
              <span className="text-[24px]">{l.emoji}</span>
              <span className="flex-1 text-[14px] font-bold text-ink-900">{l.label}</span>
              <span className="text-ink-300">→</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sidebar / stats */}
          <aside className="bg-gradient-to-br from-primary to-primary-dark text-white rounded-2xl p-6 md:p-7 md:col-span-1 shadow-soft">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-[26px]">
                👤
              </div>
              <div>
                <div className="text-[15px] font-bold">{chrome.isEn ? 'Guest user' : '访客用户'}</div>
                <div className="text-[11.5px] opacity-80 mt-0.5">{t.profile.memberSince}: 2026</div>
              </div>
            </div>
            <p className="text-[13px] opacity-90 leading-relaxed mb-5">{t.profile.notLoggedIn}</p>
            <button
              onClick={() => router.push('/login')}
              className="w-full py-2.5 bg-white text-orange-700 text-[13px] font-extrabold rounded-md hover:bg-ink-50 transition-colors"
            >
              {chrome.isEn ? 'Sign in' : t.profile.goLogin} →
            </button>
          </aside>

          {/* Right column */}
          <div className="md:col-span-2 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-orange-700">{orderCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.myOrders}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-rose-700">{wishCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.myWishlist}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-ink-100 text-center">
                <div className="text-[28px] font-extrabold text-accent-teal">{cartCount}</div>
                <div className="text-[11.5px] text-ink-500 mt-0.5">{t.profile.cart}</div>
              </div>
            </div>

            {/* Quick links */}
            <section aria-labelledby="profile-quicklinks-heading" className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <h2 id="profile-quicklinks-heading" className="px-5 py-3 border-b border-ink-100 text-[13px] font-bold text-ink-900">{t.profile.quickLinks}</h2>
              {[
                { label: t.profile.myOrders, path: '/orders', emoji: '📦', hint: `${orderCount}` },
                { label: t.profile.myWishlist, path: '/wishlist', emoji: '♡', hint: `${wishCount}` },
                { label: t.profile.cart, path: '/cart', emoji: '🛒', hint: `${cartCount}` },
                { label: t.profile.settings, path: '#', emoji: '⚙️', hint: '' },
              ].map((l, i) => (
                <button
                  key={i}
                  onClick={() => l.path !== '#' && router.push(l.path)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left border-b border-ink-100 last:border-b-0"
                >
                  <span className="text-[18px]">{l.emoji}</span>
                  <span className="flex-1 text-[13.5px] font-medium text-ink-900">{l.label}</span>
                  {l.hint && <span className="text-[11px] text-ink-500">{l.hint}</span>}
                  <span className="text-ink-300">→</span>
                </button>
              ))}
            </section>

            {/* Security — change password + fund password */}
            <section aria-labelledby="profile-security-heading" className="bg-white rounded-xl border border-ink-100 overflow-hidden">
              <h2 id="profile-security-heading" className="px-5 py-3 border-b border-ink-100 text-[13px] font-bold text-ink-900">Security</h2>

              {!pwdOpen ? (
                <button
                  onClick={() => setPwdOpen(true)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left border-b border-ink-100"
                >
                  <span className="text-[18px]">🔑</span>
                  <span className="flex-1 text-[13.5px] font-medium text-ink-900">{t.security.changePassword}</span>
                  <span className="text-ink-300">→</span>
                </button>
              ) : (
                <div className="p-5 border-b border-ink-100 bg-ink-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input type="password" value={cur} onChange={(e) => setCur(e.target.value)} placeholder={t.security.currentPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                    <input type="password" value={n1} onChange={(e) => setN1(e.target.value)} placeholder={t.security.newPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                    <input type="password" value={n2} onChange={(e) => setN2(e.target.value)} placeholder={t.security.confirmPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                  </div>
                  {pwdMsg && <div className="text-[12.5px] text-ink-600 mb-3">{pwdMsg}</div>}
                  <div className="flex gap-2">
                    <button onClick={submitPwd} className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md">{t.security.save}</button>
                    <button onClick={() => { setPwdOpen(false); setPwdMsg(null); }} className="px-4 py-2 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13px] font-bold rounded-md">{t.security.cancel}</button>
                  </div>
                </div>
              )}

              {!fundOpen ? (
                <button
                  onClick={() => setFundOpen(true)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ink-50 transition-colors text-left"
                >
                  <span className="text-[18px]">🔒</span>
                  <span className="flex-1 text-[13.5px] font-medium text-ink-900">{t.security.changeFundPassword}</span>
                  <span className="text-[11px] text-ink-500 hidden md:inline">{t.security.fundPwdHint}</span>
                  <span className="text-ink-300">→</span>
                </button>
              ) : (
                <div className="p-5 bg-ink-50">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input type="password" value={fundCur} onChange={(e) => setFundCur(e.target.value)} placeholder={t.security.currentPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                    <input type="password" inputMode="numeric" maxLength={6} value={fund1} onChange={(e) => setFund1(e.target.value.replace(/\D/g, ''))} placeholder={t.security.newPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                    <input type="password" inputMode="numeric" maxLength={6} value={fund2} onChange={(e) => setFund2(e.target.value.replace(/\D/g, ''))} placeholder={t.security.confirmPassword} className="px-3 py-2 border border-ink-200 rounded-md text-[13px] focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none" />
                  </div>
                  {fundMsg && <div className="text-[12.5px] text-ink-600 mb-3">{fundMsg}</div>}
                  <div className="flex gap-2">
                    <button onClick={submitFund} className="px-4 py-2 bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold rounded-md">{t.security.save}</button>
                    <button onClick={() => { setFundOpen(false); setFundMsg(null); }} className="px-4 py-2 bg-white border border-ink-200 hover:bg-ink-50 text-ink-700 text-[13px] font-bold rounded-md">{t.security.cancel}</button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
