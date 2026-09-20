'use client';

import { UserShell } from '@/components/peak-mall';
import { useT } from '@/lib/use-t';
import { usePageChrome } from '@/lib/page-nav';
import Link from 'next/link';

export default function AgentDashboardPage() {
  const t = useT();
  const chrome = usePageChrome('commissions');
  const tDash = (t as Record<string, any>).fxDash || (t as Record<string, any>).agentDash || {
    title: '分销商中心',
    balance: '我的余额',
    quickActions: '快捷操作',
    withdraw: '提现中心',
    bindAddress: '绑定提现地址',
    commDetail: '佣金明细',
    teamMgmt: '团队管理',
  };

  return (
    <>
      <UserShell>
        <div className="max-w-shell mx-auto px-5 py-8">
          <h1 className="text-[22px] font-bold text-ink-900 mb-6">{tDash.title}</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card label={tDash.balance} value="USD 1,284.50" color="text-emerald-600" />
            <Card label={tDash.quickActions} value="—" color="text-ink-700" />
            <Card label="" value="" color="" />
          </div>

          <div className="bg-white rounded-xl border border-ink-100 p-6">
            <h2 className="text-[16px] font-bold text-ink-900 mb-4">{tDash.quickActions}</h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/withdraw"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-[14px] font-semibold transition-colors"
              >
                {tDash.withdraw}
              </Link>
              <Link
                href="/withdraw-address"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-900 text-[14px] font-semibold transition-colors"
              >
                {tDash.bindAddress}
              </Link>
              <Link
                href="/commissions"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-900 text-[14px] font-semibold transition-colors"
              >
                {tDash.commDetail}
              </Link>
              <Link
                href="/team"
                className="inline-flex items-center px-5 py-2.5 rounded-md bg-ink-100 hover:bg-ink-200 text-ink-900 text-[14px] font-semibold transition-colors"
              >
                {tDash.teamMgmt}
              </Link>
            </div>
          </div>
        </div>
      </UserShell>
    </>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-ink-100 p-5">
      <div className="text-[11.5px] uppercase tracking-wider text-ink-500 mb-1">{label}</div>
      <div className={`text-[24px] font-extrabold ${color}`}>{value}</div>
    </div>
  );
}
