'use client';

import { useState } from 'react';
import {
  AnnouncementBar,
  ShopHeader,
  Footer,
  PageBanner,
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
  /** F1: 详情 modal 额外字段 */
  avgOrder: number;
  recent: Array<{ orderId: string; date: string; amount: number }>;
}

const INVITE_CODE = 'PEAK-' + 'DEMO-7F3K';

const MEMBERS: Member[] = [
  {
    id: 'M1', nickname: '推广者 莉莉', level: 1, joinedAt: '2026-08-12T04:00:00.000Z',
    orderCount: 24, commission: 68.40, avgOrder: 57.00,
    recent: [
      { orderId: 'O-L-2491', date: '2026-09-18T03:12:00.000Z', amount: 5.20 },
      { orderId: 'O-L-2480', date: '2026-09-15T07:42:00.000Z', amount: 3.10 },
      { orderId: 'O-L-2465', date: '2026-09-11T11:24:00.000Z', amount: 4.80 },
    ],
  },
  {
    id: 'M2', nickname: '推广者 阿明', level: 1, joinedAt: '2026-08-19T04:00:00.000Z',
    orderCount: 17, commission: 45.10, avgOrder: 53.00,
    recent: [
      { orderId: 'O-A-2391', date: '2026-09-17T03:12:00.000Z', amount: 4.50 },
      { orderId: 'O-A-2380', date: '2026-09-12T07:42:00.000Z', amount: 2.80 },
      { orderId: 'O-A-2365', date: '2026-09-08T11:24:00.000Z', amount: 3.40 },
    ],
  },
  {
    id: 'M3', nickname: '推广者 小张', level: 2, joinedAt: '2026-09-02T04:00:00.000Z',
    orderCount: 9, commission: 18.20, avgOrder: 81.00,
    recent: [
      { orderId: 'O-X-2201', date: '2026-09-16T03:12:00.000Z', amount: 2.10 },
      { orderId: 'O-X-2189', date: '2026-09-10T07:42:00.000Z', amount: 1.80 },
    ],
  },
  {
    id: 'M4', nickname: '推广者 Jenny', level: 2, joinedAt: '2026-09-08T04:00:00.000Z',
    orderCount: 6, commission: 12.50, avgOrder: 42.00,
    recent: [
      { orderId: 'O-J-2087', date: '2026-09-14T03:12:00.000Z', amount: 1.95 },
      { orderId: 'O-J-2075', date: '2026-09-09T07:42:00.000Z', amount: 2.20 },
    ],
  },
  {
    id: 'M5', nickname: '推广者 老王', level: 3, joinedAt: '2026-09-14T04:00:00.000Z',
    orderCount: 2, commission: 4.10, avgOrder: 41.00,
    recent: [
      { orderId: 'O-W-2001', date: '2026-09-15T03:12:00.000Z', amount: 2.10 },
    ],
  },
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
  /** B6: fixed-position copy success toast */
  const [copyToast, setCopyToast] = useState<string | null>(null);

  /** F1: 成员详情 modal — selectedId = 当前打开的成员 id, null = 关闭 */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [linkToast, setLinkToast] = useState<string | null>(null);
  const selected = selectedId ? MEMBERS.find((m) => m.id === selectedId) ?? null : null;

  /** F1: 复制专属邀请链接 */
  const handleCopyInviteLink = async (memberId: string) => {
    const link = `https://peak-mall-demo.netlify.app/?invite=${INVITE_CODE}&ref=${memberId}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkToast(t.team.memberLinkCopied);
      window.setTimeout(() => setLinkToast(null), 1800);
    } catch {
      /* clipboard 不可用时静默 */
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(INVITE_CODE);
      setCopied(true);
      setCopyToast(t.team.inviteCopiedToast(INVITE_CODE));
      setTimeout(() => setCopied(false), 1800);
      setTimeout(() => setCopyToast(null), 2200);
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
        <PageBanner
          title={t.team.title}
          subtitle={t.team.subtitle}
          stats={[
            { label: t.team.level1, value: t.team.memberCount(levelCounts(1)), tone: 'accent' as const },
            { label: t.team.level2, value: t.team.memberCount(levelCounts(2)) },
            { label: t.team.level3, value: t.team.memberCount(levelCounts(3)) },
            { label: t.team.totalCommission, value: `$${totalCommission.toFixed(2)}` },
          ]}
        />

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

        {/* B6: 复制成功 fixed toast */}
        {copyToast && (
          <div
            role="status"
            className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-float text-[14px] font-semibold animate-fade-up z-50"
          >
            ✓ {copyToast}
          </div>
        )}

        {/* Members table */}
        <section className="bg-white rounded-xl border border-ink-100 overflow-hidden">
          <h2 className="px-5 py-4 text-[15px] font-bold text-ink-900 border-b border-ink-100">
            {t.team.sectionMembers} · {MEMBERS.length}
          </h2>
          {MEMBERS.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <div className="text-[40px] mb-3" aria-hidden="true">👥</div>
              <div className="text-[14px] font-bold text-ink-900 mb-1.5">{t.team.empty}</div>
              <div className="text-[12px] text-ink-500">{t.team.emptyDesc}</div>
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
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedId(m.id);
                        }
                      }}
                      aria-label={`${m.nickname} — L${m.level} — ${m.orderCount} orders — $${m.commission.toFixed(2)}`}
                      className="border-t border-ink-100 hover:bg-ink-50 cursor-pointer focus:outline-none focus-visible:bg-orange-50"
                    >
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

      {/* F1: 成员详情 modal */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="memberDetailTitle"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
        >
          <div className="bg-white rounded-2xl w-full max-w-[480px] p-6 shadow-float max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">
                  {t.team.memberDetailTitle}
                </div>
                <h3 id="memberDetailTitle" className="text-[18px] font-extrabold text-ink-900 truncate">
                  {selected.nickname}
                </h3>
              </div>
              <button
                onClick={() => setSelectedId(null)}
                aria-label={t.team.memberClose}
                className="w-8 h-8 flex-shrink-0 text-ink-400 hover:text-ink-700 hover:bg-ink-50 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className={`inline-block px-2 py-0.5 rounded text-[11.5px] font-bold ${LEVEL_BADGE[selected.level]}`}>
                L{selected.level}
              </span>
              <span className="text-[12px] text-ink-500 font-mono">{selected.id}</span>
            </div>

            {/* 统计 grid: 4 个 KPI */}
            <div className="grid grid-cols-2 gap-2.5 mb-4 text-[12.5px]">
              <div className="bg-ink-50 border border-ink-100 rounded-md p-3">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">{t.team.memberJoinDate}</div>
                <div className="text-ink-900 font-bold tabular-nums" suppressHydrationWarning>
                  {selected.joinedAt.slice(0, 10)}
                </div>
              </div>
              <div className="bg-ink-50 border border-ink-100 rounded-md p-3">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">{t.team.memberOrderCount}</div>
                <div className="text-ink-900 font-bold tabular-nums">{selected.orderCount}</div>
              </div>
              <div className="bg-ink-50 border border-ink-100 rounded-md p-3">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">{t.team.memberCommission}</div>
                <div className="text-emerald-700 font-bold tabular-nums">${selected.commission.toFixed(2)}</div>
              </div>
              <div className="bg-ink-50 border border-ink-100 rounded-md p-3">
                <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-1">{t.team.memberAvgOrder}</div>
                <div className="text-ink-900 font-bold tabular-nums">${selected.avgOrder.toFixed(2)}</div>
              </div>
            </div>

            {/* 最近佣金记录 */}
            <div className="mb-4">
              <div className="text-[10px] tracking-[1.5px] uppercase text-ink-500 font-bold mb-2">
                {t.team.memberRecent}
              </div>
              {selected.recent.length === 0 ? (
                <div className="text-[12.5px] text-ink-500 italic py-3 text-center">
                  {t.team.memberRecentEmpty}
                </div>
              ) : (
                <ul className="space-y-1.5 text-[12.5px]">
                  {selected.recent.map((r) => (
                    <li key={r.orderId} className="flex items-center justify-between bg-white border border-ink-100 rounded-md px-3 py-2">
                      <span className="font-mono text-ink-700 truncate mr-2">{r.orderId}</span>
                      <span className="text-ink-500 text-[11px] tabular-nums" suppressHydrationWarning>
                        {r.date.slice(0, 10)}
                      </span>
                      <span className="text-emerald-700 font-bold tabular-nums ml-3">${r.amount.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleCopyInviteLink(selected.id)}
                className="flex-1 py-2.5 border border-orange-700 text-orange-700 hover:bg-orange-700 hover:text-white text-[13px] font-bold rounded-md transition-colors"
              >
                🔗 {t.team.memberCopyInviteLink}
              </button>
              <button
                onClick={() => setSelectedId(null)}
                className="px-5 py-2.5 bg-orange-700 hover:bg-orange-800 text-white text-[13.5px] font-bold rounded-md transition-colors"
              >
                {t.team.memberClose}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* F1: 邀请链接复制成功 toast */}
      {linkToast && (
        <div role="status" className="fixed bottom-6 right-6 bg-emerald-500 text-white px-5 py-3 rounded-lg shadow-float text-[14px] font-semibold z-50">
          ✓ {linkToast}
        </div>
      )}

      <Footer />
    </>
  );
}