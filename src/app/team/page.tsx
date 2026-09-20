'use client';

import { useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
} from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';

interface Member {
  id: string;
  nickname: string;
  level: 1 | 2 | 3;
  joinedAt: string; // ISO — static to avoid hydration mismatch
  orderCount: number;
  commission: number;
}

const INVITE_CODE = 'PEAK-' + 'DEMO-7F3K';

const MEMBERS: Member[] = [
  { id: 'M1', nickname: '推广者 莉莉',   level: 1, joinedAt: '2026-08-12T04:00:00.000Z', orderCount: 24, commission:  68.40 },
  { id: 'M2', nickname: '推广者 阿明',   level: 1, joinedAt: '2026-08-19T04:00:00.000Z', orderCount: 17, commission:  45.10 },
  { id: 'M3', nickname: '推广者 小张',   level: 2, joinedAt: '2026-09-02T04:00:00.000Z', orderCount:  9, commission:  18.20 },
  { id: 'M4', nickname: '推广者 Jenny',  level: 2, joinedAt: '2026-09-08T04:00:00.000Z', orderCount:  6, commission:  12.50 },
  { id: 'M5', nickname: '推广者 老王',   level: 3, joinedAt: '2026-09-14T04:00:00.000Z', orderCount:  2, commission:   4.10 },
];

const LEVEL_BADGE: Record<1 | 2 | 3, string> = {
  1: 'bg-orange-100 text-orange-700',
  2: 'bg-blue-100 text-blue-700',
  3: 'bg-violet-100 text-violet-700',
};

export default function TeamPage() {
  const t = useT();
  const chrome = usePageChrome('team');
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_CODE);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback: do nothing visible
    }
  };

  const levelCounts = (lv: 1 | 2 | 3) =>
    MEMBERS.filter((m) => m.level === lv).length;

  const totalCommission = MEMBERS.reduce((s, m) => s + m.commission, 0);
  const thisMonthCommission = MEMBERS
    .filter((m) => m.joinedAt.startsWith('2026-09'))
    .reduce((s, m) => s + m.commission, 0);

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
        <header className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink-900 leading-tight">{t.team.title}</h1>
          <p className="text-[13.5px] text-ink-500 mt-1.5">{t.team.subtitle}</p>
        </header>

        {/* Summary */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 border border-ink-100">
            <div className="text-[12.5px] text-ink-500 mb-2">{t.team.level1}</div>
            <div className="text-[26px] font-extrabold text-orange-700 leading-none">
              {t.team.memberCount(levelCounts(1))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-ink-100">
            <div className="text-[12.5px] text-ink-500 mb-2">{t.team.level2}</div>
            <div className="text-[26px] font-extrabold text-blue-700 leading-none">
              {t.team.memberCount(levelCounts(2))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-ink-100">
            <div className="text-[12.5px] text-ink-500 mb-2">{t.team.level3}</div>
            <div className="text-[26px] font-extrabold text-violet-700 leading-none">
              {t.team.memberCount(levelCounts(3))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-ink-100">
            <div className="text-[12.5px] text-ink-500 mb-2">{t.team.totalCommission}</div>
            <div className="text-[26px] font-extrabold text-emerald-700 leading-none">
              ${totalCommission.toFixed(2)}
            </div>
            <div className="text-[11.5px] text-ink-500 mt-2">
              {t.team.thisMonthCommission}: ${thisMonthCommission.toFixed(2)}
            </div>
          </div>
        </section>

        {/* Invite code */}
        <section className="bg-gradient-to-r from-orange-50 to-rose-50 border border-orange-200 rounded-xl p-5 md:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="text-[12.5px] tracking-[1.5px] uppercase font-bold text-orange-700 mb-1">
                {t.team.inviteTitle}
              </div>
              <div className="text-[12.5px] text-ink-600">{t.team.inviteDesc}</div>
            </div>
            <div className="flex items-center gap-2">
              <code className="px-4 py-2.5 bg-white border border-orange-300 rounded-md text-[15px] font-mono font-bold text-ink-900">
                {INVITE_CODE}
              </code>
              <button
                onClick={onCopy}
                className="px-4 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[12.5px] font-bold rounded-md transition-colors"
              >
                {copied ? t.team.inviteCopied : t.team.inviteCopy}
              </button>
            </div>
          </div>
        </section>

        {/* Members table */}
        <section className="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <h2 className="px-5 py-4 text-[15px] font-bold text-ink-900 border-b border-ink-100">
            {t.team.sectionMembers} · {MEMBERS.length}
          </h2>
          {MEMBERS.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="text-[48px] mb-3" aria-hidden="true">👥</div>
              <div className="text-[15px] font-bold text-ink-900 mb-1">{t.team.empty}</div>
              <div className="text-[13px] text-ink-500">{t.team.emptyDesc}</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13.5px]">
                <thead className="bg-ink-50 text-ink-600 text-[12px] uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3 text-left">ID</th>
                    <th className="px-5 py-3 text-left">Nickname</th>
                    <th className="px-5 py-3 text-left">Level</th>
                    <th className="px-5 py-3 text-left">{t.team.memberJoinDate}</th>
                    <th className="px-5 py-3 text-right">{t.team.memberOrderCount}</th>
                    <th className="px-5 py-3 text-right">{t.team.memberCommission}</th>
                  </tr>
                </thead>
                <tbody>
                  {MEMBERS.map((m) => (
                    <tr key={m.id} className="border-t border-ink-100">
                      <td className="px-5 py-3 text-ink-500 font-mono text-[12.5px]">{m.id}</td>
                      <td className="px-5 py-3 font-semibold text-ink-900">{m.nickname}</td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[11.5px] font-bold ${LEVEL_BADGE[m.level]}`}
                        >
                          L{m.level}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-ink-500 text-[12.5px]">
                        {m.joinedAt.slice(0, 10)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">{m.orderCount}</td>
                      <td className="px-5 py-3 text-right font-bold tabular-nums text-emerald-700">
                        ${m.commission.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}