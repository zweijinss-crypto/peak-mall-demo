'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { FC } from 'react';
import { AnnouncementBar, ShopHeader, Footer } from '@/components/peak-mall';
import { usePeakStore, type Locale, type Order, type PaymentRecord } from '@/lib/store';
import { useT } from '@/lib/use-t';
import { buildDemoOrders } from '@/lib/pay-fixtures';
import { aggregateByBrand, aggregateByStatus, classifyBin } from '@/lib/bin-classify';

const NAV_ITEMS_ZH = [
  { key: 'home', label: '首页' },
  { key: 'orders', label: '我的订单' },
  { key: 'pay', label: '支付记录' },
];
const NAV_ITEMS_EN = [
  { key: 'home', label: 'Home' },
  { key: 'orders', label: 'My orders' },
  { key: 'pay', label: 'Payments' },
];

const STATUS_STYLES: Record<PaymentRecord['status'], { bg: string; fg: string; label: { zh: string; en: string } }> = {
  success: { bg: 'bg-emerald-50', fg: 'text-emerald-700 border-emerald-200', label: { zh: '已支付', en: 'Paid' } },
  failed: { bg: 'bg-rose-50', fg: 'text-rose-700 border-rose-200', label: { zh: '失败', en: 'Failed' } },
  pending: { bg: 'bg-amber-50', fg: 'text-amber-700 border-amber-200', label: { zh: '处理中', en: 'Pending' } },
  refunded: { bg: 'bg-sky-50', fg: 'text-sky-700 border-sky-200', label: { zh: '已退款', en: 'Refunded' } },
};

const METHOD_LABEL: Record<PaymentRecord['method'], { zh: string; en: string }> = {
  card: { zh: '银行卡', en: 'Card' },
  wallet: { zh: '钱包', en: 'Wallet' },
  bank: { zh: '网银', en: 'Bank transfer' },
};

const BRAND_COLORS: Record<string, string> = {
  Visa: 'bg-blue-600',
  Mastercard: 'bg-orange-600',
  Amex: 'bg-cyan-600',
  Discover: 'bg-amber-500',
  JCB: 'bg-emerald-600',
  Diners: 'bg-violet-600',
  UnionPay: 'bg-red-600',
  Unknown: 'bg-neutral-500',
};

const PayRecordsClient: FC = () => {
  const router = useRouter();
  const t = useT();
  const locale = usePeakStore((s) => s.locale);
  const setLocale = usePeakStore((s) => s.setLocale);
  const ordersInStore = usePeakStore((s) => s.orders);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isEn = mounted && locale === 'en';

  // 用户没真实订单时,展示演示数据
  const orders = useMemo<Order[]>(() => {
    if (ordersInStore.length > 0) return ordersInStore;
    return buildDemoOrders();
  }, [ordersInStore]);

  const records = useMemo(
    () =>
      orders
        .map((o) => ({ order: o, payment: o.payment }))
        .filter((r) => r.payment) as Array<{ order: Order; payment: PaymentRecord }>,
    [orders]
  );

  // 汇总
  const counts = useMemo(() => {
    const c = { success: 0, failed: 0, pending: 0, refunded: 0, total: 0, captured: 0 };
    for (const r of records) {
      c.total += 1;
      c[r.payment.status] += 1;
      if (r.payment.status === 'success') c.captured += r.payment.amount;
    }
    return c;
  }, [records]);

  const brandAgg = useMemo(() => aggregateByBrand(records), [records]);
  const statusAgg = useMemo(() => aggregateByStatus(records), [records]);

  // 按天聚合(成功)
  const dayAgg = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    for (const r of records) {
      if (r.payment.status !== 'success') continue;
      const d = new Date(r.payment.paidAt ?? r.order.createdAt).toISOString().slice(0, 10);
      const cur = map.get(d) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += r.payment.amount;
      map.set(d, cur);
    }
    return Array.from(map.entries())
      .map(([day, v]) => ({ day, count: v.count, total: v.total }))
      .sort((a, b) => a.day.localeCompare(b.day));
  }, [records]);

  const maxDayTotal = Math.max(1, ...dayAgg.map((d) => d.total));

  return (
    <>
      <AnnouncementBar
        tag={isEn ? 'Demo' : '演示'}
        text={isEn ? 'Payment records demo · public test BINs only' : '支付记录演示 · 仅展示公开测试 BIN,不涉及真实卡号'}
      />
      <ShopHeader
        brand={{ name: t.brand.name, slogan: t.brand.slogan }}
        navItems={isEn ? NAV_ITEMS_EN : NAV_ITEMS_ZH}
        active="pay"
        currencyOptions={[{ code: 'USD' as const, label: 'USD' }]}
        currency="USD"
        onCurrencyChange={() => {}}
        langOptions={[{ code: 'zh', label: '中文' }, { code: 'en', label: 'EN' }]}
        lang={locale}
        onLangChange={(l) => setLocale(l as Locale)}
      />

      <main className="max-w-shell mx-auto px-5 py-8">
        <header className="mb-6">
          <h1 className="text-[28px] font-extrabold text-ink-900 mb-1.5">{t.payRecords.title}</h1>
          <p className="text-[13px] text-ink-500">{t.payRecords.sub}</p>
        </header>

        {/* 汇总卡片 4 + 1 */}
        <section
          aria-label="summary"
          className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"
        >
          <SummaryCard label={t.payRecords.summaryAll} value={counts.total} accent="bg-ink-50 text-ink-900" />
          <SummaryCard label={t.payRecords.summarySuccess} value={counts.success} accent="bg-emerald-50 text-emerald-700" />
          <SummaryCard label={t.payRecords.summaryFailed} value={counts.failed} accent="bg-rose-50 text-rose-700" />
          <SummaryCard label={t.payRecords.summaryRefund} value={counts.refunded} accent="bg-sky-50 text-sky-700" />
          <SummaryCard
            label={t.payRecords.summaryAmount}
            value={`$${counts.captured.toFixed(2)}`}
            accent="bg-orange-50 text-orange-700"
          />
        </section>

        {/* 三栏分布 */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* 按品牌 */}
          <div className="bg-white border border-ink-100 rounded-xl p-5">
            <h2 className="text-[14px] font-bold text-ink-900 mb-3">{t.payRecords.byBrand}</h2>
            <ul className="space-y-2">
              {brandAgg.length === 0 && (
                <li className="text-[12.5px] text-ink-500">—</li>
              )}
              {brandAgg.map((b) => {
                const total = brandAgg.reduce((s, x) => s + x.count, 0);
                const pct = total > 0 ? Math.round((b.count / total) * 100) : 0;
                return (
                  <li key={b.brand} className="flex items-center gap-2 text-[12.5px]">
                    <span className={`w-2.5 h-2.5 rounded-full ${BRAND_COLORS[b.brand] ?? BRAND_COLORS.Unknown}`} aria-hidden />
                    <span className="flex-1 text-ink-900 font-semibold">{b.brand}</span>
                    <span className="text-ink-500 tabular-nums">{b.count}</span>
                    <span className="text-ink-400 tabular-nums w-9 text-right">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 按状态 */}
          <div className="bg-white border border-ink-100 rounded-xl p-5">
            <h2 className="text-[14px] font-bold text-ink-900 mb-3">{t.payRecords.byStatus}</h2>
            <ul className="space-y-2">
              {statusAgg.length === 0 && (
                <li className="text-[12.5px] text-ink-500">—</li>
              )}
              {statusAgg.map((s) => {
                const total = statusAgg.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
                const style = STATUS_STYLES[s.status as PaymentRecord['status']];
                return (
                  <li key={s.status} className="flex items-center gap-2 text-[12.5px]">
                    <span className={`w-2.5 h-2.5 rounded-full ${style?.bg.replace('bg-', 'bg-').replace('-50', '-500') ?? 'bg-ink-300'}`} aria-hidden />
                    <span className="flex-1 text-ink-900 font-semibold">
                      {style?.label[isEn ? 'en' : 'zh'] ?? s.status}
                    </span>
                    <span className="text-ink-500 tabular-nums">{s.count}</span>
                    <span className="text-ink-400 tabular-nums w-9 text-right">{pct}%</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 近 10 天柱状图 */}
          <div className="bg-white border border-ink-100 rounded-xl p-5">
            <h2 className="text-[14px] font-bold text-ink-900 mb-3">{t.payRecords.byDay}</h2>
            <div className="flex items-end gap-1.5 h-[120px]" role="img" aria-label="daily success amount">
              {dayAgg.length === 0 && (
                <div className="text-[12.5px] text-ink-500 m-auto">—</div>
              )}
              {dayAgg.map((d) => {
                const h = Math.round((d.total / maxDayTotal) * 100);
                const day = d.day.slice(5); // MM-DD
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                    <div className="w-full flex flex-col items-center justify-end" style={{ height: '90px' }}>
                      <div
                        className="w-full bg-emerald-500/80 rounded-sm hover:bg-emerald-600 transition-colors"
                        style={{ height: `${Math.max(h, 4)}%` }}
                        title={`${d.day}: $${d.total.toFixed(2)} (${d.count})`}
                      />
                    </div>
                    <span className="text-[10px] text-ink-400 tabular-nums">{day}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] text-ink-400 text-right tabular-nums">
              max ${maxDayTotal.toFixed(2)}
            </div>
          </div>
        </section>

        {/* 记录表格 */}
        <section className="bg-white border border-ink-100 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-ink-100">
            <h2 className="text-[14px] font-bold text-ink-900">{t.payRecords.title}</h2>
            <div className="flex items-center gap-3 text-[11px] text-ink-500">
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t.payRecords.legend.test}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ink-400" />
                {t.payRecords.legend.live}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-ink-50 text-ink-600 text-[11.5px]">
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.time}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.orderId}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.method}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.brand}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.bin}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.last4}</th>
                  <th className="px-3 py-2 text-right font-semibold">{t.payRecords.tableHead.amount}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.status}</th>
                  <th className="px-3 py-2 text-left font-semibold">{t.payRecords.tableHead.authCode}</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-ink-500">
                      —
                    </td>
                  </tr>
                )}
                {records.map(({ order, payment }) => {
                  const info = classifyBin(payment.bin);
                  const st = STATUS_STYLES[payment.status];
                  const ts = new Date(payment.paidAt ?? order.createdAt).toLocaleString();
                  const errText = payment.errorCode
                    ? ` · ${(t.payRecords.errorCode as Record<string, string>)[payment.errorCode] ?? payment.errorCode}`
                    : '';
                  return (
                    <tr key={order.id} className="border-t border-ink-100 hover:bg-ink-50/50 transition-colors">
                      <td className="px-3 py-2.5 text-ink-700 tabular-nums whitespace-nowrap">{ts}</td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => router.push(`/orders`)}
                          className="font-mono text-ink-900 hover:text-orange-700 transition-colors"
                        >
                          {order.id}
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-ink-700">{METHOD_LABEL[payment.method][isEn ? 'en' : 'zh']}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center justify-center min-w-[36px] h-[18px] px-1.5 rounded-sm text-white text-[9.5px] font-extrabold tracking-wide ${
                              BRAND_COLORS[info.brand] ?? BRAND_COLORS.Unknown
                            }`}
                          >
                            {info.brand.slice(0, 4).toUpperCase()}
                          </span>
                          {info.isTest && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9.5px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50"
                              title="public test BIN"
                            >
                              {t.payRecords.testBinTag}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-700 tabular-nums">{payment.bin}</td>
                      <td className="px-3 py-2.5 font-mono text-ink-700 tabular-nums">•••• {payment.last4}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-orange-700 tabular-nums">
                        ${payment.amount.toFixed(2)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border ${st.fg}`}>
                          {st.label[isEn ? 'en' : 'zh']}
                          {errText}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-ink-500 tabular-nums">
                        {payment.authCode ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

const SummaryCard: FC<{ label: string; value: number | string; accent: string }> = ({ label, value, accent }) => (
  <div className="bg-white border border-ink-100 rounded-xl p-4">
    <div className="text-[11.5px] text-ink-500 mb-1">{label}</div>
    <div className={`inline-block px-2 py-0.5 rounded-md text-[20px] font-extrabold tabular-nums ${accent}`}>
      {value}
    </div>
  </div>
);

export default PayRecordsClient;