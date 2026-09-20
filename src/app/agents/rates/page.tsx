'use client';

import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import { useState, useEffect } from 'react';

interface RateData {
  own_rate: number;
  sub_rate: number;
  sub_rate_limit: number;
}

export default function AgentRatesPage() {
  const t = useT();
  const chrome = usePageChrome('commissions');
  const tRates = (t as Record<string, any>).agentRates || {
    title: '佣金比例调节',
    intro: (subLimit: number, ownRate: number) =>
      `你可调节直推下级的一级佣金比例，不能超过总后台设定的上限 ${subLimit}%。自有费率（${ownRate}%）由总后台设定。`,
    curSub: '当前直推比例',
    subLimit: '比例上限（不可改）',
    save: '保存',
    saved: '已保存',
    overLimit: '比例不能超过上限',
  };

  // Seed values (mirrors SEED_AGENTS[0])
  const seed: RateData = { own_rate: 12, sub_rate: 8, sub_rate_limit: 15 };
  const [sub, setSub] = useState<string>(String(seed.sub_rate));
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    // hydrate from localStorage if any
    try {
      const raw = localStorage.getItem('peak_agent_rates_v1');
      if (raw) {
        const data = JSON.parse(raw);
        if (typeof data.sub_rate === 'number') setSub(String(data.sub_rate));
      }
    } catch {}
  }, []);

  const handleSave = () => {
    const v = Number(sub);
    if (Number.isNaN(v) || v < 0 || v > seed.sub_rate_limit) {
      setMsg(tRates.overLimit);
      return;
    }
    try {
      localStorage.setItem(
        'peak_agent_rates_v1',
        JSON.stringify({ sub_rate: v, sub_rate_limit: seed.sub_rate_limit }),
      );
    } catch {}
    setMsg(tRates.saved);
    setTimeout(() => setMsg(null), 1800);
  };

  return (
    <>
      <UserShell>
        <div className="max-w-shell mx-auto px-5 py-8">
          <div className="bg-white rounded-xl border border-ink-100 p-6">
            <h1 className="text-[18px] font-bold text-ink-900 mb-3">{tRates.title}</h1>
            <p className="text-[13px] text-ink-700 leading-relaxed mb-5">
              {tRates.intro(seed.sub_rate_limit, seed.own_rate)}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-ink-700">{tRates.curSub}</span>
                <input
                  type="number"
                  min={0}
                  max={seed.sub_rate_limit}
                  step={0.5}
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                  className="px-3 py-2 border border-ink-200 rounded-md text-[14px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[12.5px] text-ink-700">{tRates.subLimit}</span>
                <input
                  type="text"
                  value={seed.sub_rate_limit}
                  disabled
                  className="px-3 py-2 border border-ink-200 rounded-md text-[14px] bg-ink-50 text-ink-500"
                />
              </label>
            </div>
            <button
              onClick={handleSave}
              className="inline-flex items-center px-5 py-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold transition-colors"
            >
              {tRates.save}
            </button>
            {msg && (
              <div className="mt-3 text-[13px] text-emerald-700">{msg}</div>
            )}
          </div>
        </div>
      </UserShell>
    </>
  );
}
