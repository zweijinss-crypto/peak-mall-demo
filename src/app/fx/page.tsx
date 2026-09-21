'use client';

import { useMemo, useState } from 'react';
import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';

// G3: fx 汇率换算器 + 7 天走势 + 主要汇率表
// 静态 mock 汇率 (USD 锚定) — 真实接入 FX API 留接口
const RATES: Record<string, number> = {
  USD: 1,
  CNY: 7.18,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  KRW: 1325.4,
  AUD: 1.52,
  CAD: 1.36,
};

const CODES = Object.keys(RATES);

// 生成 7 天历史走势 (mock)
function genHistory(base: number, days: number, seed: number) {
  const arr: number[] = [];
  let v = base;
  for (let i = 0; i < days; i++) {
    // 用 seed 模拟每日波动 ±0.5%
    const r = Math.sin(seed * 7 + i * 1.3) * 0.0035;
    v = v * (1 + r);
    arr.push(v);
  }
  return arr;
}

export default function FxPage() {
  const t = useT();
  const tt = (t as any).fx || {
    title: '汇率换算', subtitle: '实时汇率换算 + 7 天走势',
    convertTitle: '汇率换算', amount: '金额', from: '从', to: '到',
    result: '结果', rate: '当前汇率', historyTitle: '7 天走势',
    ratesTitle: '主要汇率', noChange: '持平', upLabel: '涨',
    downLabel: '跌', lastUpdate: '更新于',
  };

  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('CNY');
  const [amount, setAmount] = useState('100');
  const [historyCode, setHistoryCode] = useState('CNY');

  // 换算结果
  const result = useMemo(() => {
    const a = parseFloat(amount) || 0;
    const usdValue = a / RATES[from];
    const out = usdValue * RATES[to];
    return out;
  }, [amount, from, to]);

  const rate = useMemo(() => RATES[to] / RATES[from], [from, to]);

  // 7 天历史 (基于目标汇率做 sin 波动)
  const history = useMemo(() => genHistory(RATES[historyCode], 7, historyCode.charCodeAt(0)), [historyCode]);

  // 主要汇率表 (USD → others)
  const majorRates = useMemo(() => {
    return CODES.filter((c) => c !== 'USD').map((c) => {
      const hist = genHistory(RATES[c], 7, c.charCodeAt(0));
      const change = ((hist[hist.length - 1] - hist[0]) / hist[0]) * 100;
      return { code: c, rate: RATES[c], change };
    });
  }, []);

  // 7-day SVG sparkline
  const Sparkline = ({ data }: { data: number[] }) => {
    const w = 120, h = 36, pad = 2;
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => {
      const x = pad + (i * (w - pad * 2)) / (data.length - 1);
      const y = pad + (1 - (v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const last = data[data.length - 1], first = data[0];
    const color = last >= first ? '#10b981' : '#ef4444';
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    );
  };

  return (
    <UserShell>
      <div className="max-w-shell mx-auto px-5 py-8">
        <h1 className="text-[22px] font-bold text-ink-900 mb-1">{tt.title}</h1>
        <p className="text-[13px] text-ink-500 mb-6">{tt.subtitle}</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
          {/* 汇率换算 */}
          <section className="bg-white rounded-xl border border-ink-100 p-5">
            <h2 className="text-[15px] font-bold text-ink-900 mb-4">{tt.convertTitle}</h2>
            <label className="block mb-3">
              <span className="block text-[12px] text-ink-600 mb-1.5 font-semibold">{tt.amount}</span>
              <input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-label={tt.amount}
                className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                placeholder="0.00"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[12px] text-ink-600 mb-1.5 font-semibold">{tt.from}</span>
                <select
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label={tt.from}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                >
                  {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[12px] text-ink-600 mb-1.5 font-semibold">{tt.to}</span>
                <select
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label={tt.to}
                  className="w-full px-3 py-2.5 border border-ink-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
                >
                  {CODES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            </div>
            <div className="mt-5 p-4 bg-ink-50 rounded-md border border-ink-100">
              <div className="text-[11px] uppercase tracking-[1.5px] text-ink-500 font-bold mb-1">
                {tt.result}
              </div>
              <div className="text-[24px] font-extrabold text-ink-900">
                {result.toLocaleString(undefined, { maximumFractionDigits: 4 })} <span className="text-[14px] text-ink-500 font-medium">{to}</span>
              </div>
              <div className="text-[11.5px] text-ink-500 mt-1.5">
                {tt.rate}: 1 {from} = {rate.toFixed(4)} {to}
              </div>
            </div>
          </section>

          {/* 7 天走势 */}
          <section className="bg-white rounded-xl border border-ink-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-ink-900">{tt.historyTitle}</h2>
              <select
                value={historyCode}
                onChange={(e) => setHistoryCode(e.target.value)}
                aria-label={tt.historyTitle}
                className="px-2.5 py-1.5 border border-ink-200 rounded text-[12.5px] outline-none focus:border-orange-500 bg-white"
              >
                {CODES.map((c) => <option key={c} value={c}>USD → {c}</option>)}
              </select>
            </div>
            <div className="flex items-end justify-center py-4">
              <svg width="100%" height="160" viewBox="0 0 320 160" preserveAspectRatio="none" className="overflow-visible">
                {/* grid */}
                {[0, 40, 80, 120].map((y) => (
                  <line key={y} x1="0" y1={y} x2="320" y2={y} stroke="#f1f1f4" strokeWidth="1" />
                ))}
                {(() => {
                  const min = Math.min(...history), max = Math.max(...history);
                  const range = max - min || 1;
                  const points = history.map((v, i) => {
                    const x = (i * 320) / (history.length - 1);
                    const y = 150 - ((v - min) / range) * 130;
                    return `${x.toFixed(1)},${y.toFixed(1)}`;
                  }).join(' ');
                  const last = history[history.length - 1], first = history[0];
                  const color = last >= first ? '#10b981' : '#ef4444';
                  return (
                    <g>
                      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                      {history.map((v, i) => {
                        const x = (i * 320) / (history.length - 1);
                        const y = 150 - ((v - min) / range) * 130;
                        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
                      })}
                    </g>
                  );
                })()}
              </svg>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-500 px-1">
              {history.map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return <span key={i}>{`${d.getMonth() + 1}/${d.getDate()}`}</span>;
              })}
            </div>
            <div className="mt-4 text-[12px] text-ink-600 text-center">
              1 USD = <b className="text-ink-900">{history[history.length - 1].toFixed(4)}</b> {historyCode}
              <span className={`ml-2 ${history[history.length - 1] >= history[0] ? 'text-emerald-700' : 'text-rose-700'}`}>
                {((history[history.length - 1] - history[0]) / history[0] * 100).toFixed(2)}%
              </span>
            </div>
          </section>
        </div>

        {/* 主要汇率表 */}
        <section className="bg-white rounded-xl border border-ink-100 p-5">
          <h2 className="text-[15px] font-bold text-ink-900 mb-4">{tt.ratesTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {majorRates.map(({ code, rate: r, change }) => {
              const hist = genHistory(RATES[code], 7, code.charCodeAt(0));
              const up = change >= 0;
              return (
                <button
                  key={code}
                  onClick={() => { setFrom('USD'); setTo(code); setAmount('100'); }}
                  className="flex items-center gap-3 p-3 border border-ink-100 rounded-md hover:border-orange-300 hover:bg-orange-50/30 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-bold text-ink-900">USD → {code}</div>
                    <div className="text-[11.5px] text-ink-500 mt-0.5">
                      {r.toFixed(4)} <span className={up ? 'text-emerald-700' : 'text-rose-700'}>
                        {up ? '↑' : '↓'} {Math.abs(change).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  <Sparkline data={hist} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 text-[11px] text-ink-400 text-center">
            {tt.lastUpdate}: {new Date().toLocaleString()}
          </div>
        </section>
      </div>
    </UserShell>
  );
}