'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PageBanner } from '@/components/peak-mall';
import { StatCard } from '@/components/admin/StatCard';
import { useT } from '@/lib/use-t';
import { adminStore, type AdminUser, type AdminOrder, type AdminWd, type AdminCommLog } from '@/lib/admin/fixtures';

export function DashboardClient() {
  const t = useT();
  const pathname = usePathname() ?? '';
  const isEn = pathname.startsWith('/en/') || pathname === '/en';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [wd, setWd] = useState<AdminWd[]>([]);
  const [comm, setComm] = useState<AdminCommLog[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUsers(adminStore.users.read());
    setOrders(adminStore.orders.read());
    setWd(adminStore.wd.read());
    setComm(adminStore.comm.read());
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="text-neutral-500 text-[13px]">{isEn ? 'Loading…' : '加载中…'}</div>;
  }

  const members = users.length;
  const active = users.filter((u) => u.status === 'active').length;
  const frozen = users.filter((u) => u.status === 'frozen').length;
  const totalOrder = orders.reduce((acc, o) => (o.status === 'cancelled' ? acc : acc + o.amount), 0);
  const totalCommission = comm.reduce((acc, c) => (c.status === 'settled' ? acc + c.amount : acc), 0);
  const todayKey = '2026-09-20';
  const todayComm = comm
    .filter((c) => c.status === 'settled' && c.created_at.startsWith(todayKey))
    .reduce((a, b) => a + b.amount, 0);
  const pendingWd = wd.filter((w) => w.status === 'pending');
  const pendingAmt = pendingWd.reduce((a, b) => a + b.amount, 0);

  const usdStr = (n: number) => '$' + n.toFixed(2);

  return (
    <div>
      <PageBanner
        title={t.admin.dashboard.title}
        subtitle={isEn ? 'Overview of members, orders and withdrawals' : '会员、订单与提现概览'}
        accent="emerald"
      />

      {/* KPI strip — 4 tiles aligned with source site's .stat layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
        <StatCard
          label={t.admin.dashboard.kpiMembers}
          value={String(members)}
          sub={t.admin.dashboard.kpiMembersSub(String(active), String(frozen))}
          accent={frozen > 0 ? 'warning' : 'default'}
        />
        <StatCard
          label={t.admin.dashboard.kpiTotalOrder}
          value={usdStr(totalOrder)}
        />
        <StatCard
          label={t.admin.dashboard.kpiTotalComm}
          value={usdStr(totalCommission)}
          sub={`${t.admin.dashboard.kpiToday} ${usdStr(todayComm)}`}
          accent="positive"
        />
        <StatCard
          label={t.admin.dashboard.kpiPendingWd}
          value={t.admin.dashboard.pendingCount(String(pendingWd.length))}
          sub={usdStr(pendingAmt)}
          accent={pendingWd.length > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* System note card — same border-radius 12, padding 18×20, larger body */}
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-[18px]">
        <h2 className="text-[15px] font-bold text-neutral-900 mb-2">{t.admin.dashboard.systemNote}</h2>
        <p className="text-[13.5px] text-neutral-700 leading-[1.85] whitespace-pre-line">
          {t.admin.dashboard.systemNoteBody}
        </p>
      </div>
    </div>
  );
}
