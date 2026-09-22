'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/lib/use-t';
import {
  AnnouncementBar,
  Footer,
  ShopHeader,
} from '@/components/peak-mall';
import { usePageChrome } from '@/lib/page-nav';

/**
 * HealthClient — polls /api/health every 30s and renders the result.
 *
 * Serverless endpoint returns:
 *   { ok, version, ts, checks: { build, supabase, stripe, resend } }
 *
 * Each check shows its latency + ok/error detail.
 */

interface HealthCheck {
  ok: boolean;
  detail?: string;
  ms: number;
}

interface HealthReport {
  ok: boolean;
  version: string;
  ts: string;
  checks: Record<string, HealthCheck>;
}

const POLL_MS = 30_000;

const CHECK_LABEL: Record<string, { zh: string; en: string }> = {
  build:    { zh: '构建版本', en: 'Build' },
  supabase: { zh: '数据库 (Supabase)', en: 'Database (Supabase)' },
  stripe:   { zh: '支付 (Stripe)', en: 'Payments (Stripe)' },
  resend:   { zh: '邮件 (Resend)', en: 'Email (Resend)' },
};

export function HealthClient() {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const t = useT();
  const chrome = usePageChrome('home', 'home');
  const announceText = t.home?.announce ?? '服务状态';

  useEffect(() => {
    let cancelled = false;
    const fetchHealth = async () => {
      try {
        const r = await fetch('/api/health', { cache: 'no-store' });
        const data = (await r.json()) as HealthReport;
        if (!cancelled) {
          setReport(data);
          setErr(null);
        }
      } catch (e) {
        if (!cancelled) setErr(String(e));
      }
    };
    void fetchHealth();
    const id = window.setInterval(fetchHealth, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const overallOk = report?.ok;

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
      <main className="min-h-[60vh] max-w-shell mx-auto px-5 py-12">
        <h1 className="text-[26px] font-bold text-neutral-800 mb-1">{t.status?.title ?? '服务状态'}</h1>
        <p className="text-[13px] text-neutral-500 mb-6">{t.status?.subtitle ?? '实时健康检查 · 每 30 秒刷新'}</p>
        <Body report={report} err={err} t={t} />
      </main>
      <Footer />
    </>
  );
}

function Body({ report, err, t }: { report: HealthReport | null; err: string | null; t: ReturnType<typeof useT> }) {
  const overallOk = report?.ok;
  return (
    <div>
      <div className={`mb-5 px-4 py-3 rounded-lg border text-[14px] font-bold ${
        err ? 'bg-rose-50 border-rose-200 text-rose-800' :
        overallOk === undefined ? 'bg-neutral-50 border-neutral-200 text-neutral-700' :
        overallOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
        'bg-amber-50 border-amber-200 text-amber-800'
      }`}>
        {err ? (t.status?.probeError ?? '无法连接到状态服务') :
         overallOk === undefined ? (t.status?.loading ?? '检查中…') :
         overallOk ? (t.status?.allOk ?? '所有服务正常') :
         (t.status?.someIssues ?? '部分服务异常,功能可能受限')}
      </div>

      {report && (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 text-left">
                <th className="px-4 py-2.5 font-medium">{t.status?.colService ?? '服务'}</th>
                <th className="px-4 py-2.5 font-medium">{t.status?.colStatus ?? '状态'}</th>
                <th className="px-4 py-2.5 font-medium">{t.status?.colLatency ?? '延迟'}</th>
                <th className="px-4 py-2.5 font-medium">{t.status?.colDetail ?? '详情'}</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(report.checks).map(([key, c]) => (
                <tr key={key} className="border-t border-neutral-100">
                  <td className="px-4 py-2.5 text-neutral-800 font-medium">
                    {CHECK_LABEL[key]?.zh ?? key}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11.5px] font-bold ${
                      c.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      {c.ok ? (t.status?.ok ?? 'OK') : (t.status?.down ?? 'DOWN')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-neutral-600 font-mono">
                    {c.ms > 0 ? `${c.ms}ms` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-500 font-mono text-[12px]">
                    {c.detail ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-[12px] text-neutral-400">
        {report?.ts ? (t.status?.lastCheck ?? '最后检查') + ' ' + new Date(report.ts).toLocaleString() : ''}
      </p>
    </div>
  );
}