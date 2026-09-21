'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageBanner } from '@/components/peak-mall';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge, type StatusKind } from '@/components/admin/StatusBadge';
import { useT } from '@/lib/use-t';
import { adminStore, type AdminUser, type AdminOrder, type AdminWd, type AdminCommLog, type AdminTicket, orderStatusLabel, wdStatusLabel } from '@/lib/admin/fixtures';

const ORDER_STATUS_KIND: Record<string, StatusKind> = {
  pending: 'pending',
  paid: 'paid',
  shipped: 'info',
  completed: 'active',
  cancelled: 'danger',
};
const WD_STATUS_KIND: Record<string, StatusKind> = {
  pending: 'pending',
  approved: 'info',
  paid: 'active',
  rejected: 'danger',
};

/**
 * DashboardClient — admin overview.
 *
 * Computes everything from the live admin stores (orders / users / wd /
 * comm / tickets), so any change in another admin page immediately
 * reflects here. No mock data — that's the whole point.
 *
 * Layout:
 *   - 8 KPI tiles in a 4-col grid (responsive), each clickable to the
 *     underlying admin page
 *   - 7-day order sparkline (SVG, no chart lib)
 *   - 3 recent-activity lists (orders / wd / tickets), 5 rows each
 *   - System note (verbatim from source site)
 */
export function DashboardClient() {
  const t = useT();
  const pathname = usePathname() ?? '';
  const isEn = pathname.startsWith('/en/') || pathname === '/en';
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [wd, setWd] = useState<AdminWd[]>([]);
  const [comm, setComm] = useState<AdminCommLog[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setUsers(adminStore.users.read());
    setOrders(adminStore.orders.read());
    setWd(adminStore.wd.read());
    setComm(adminStore.comm.read());
    setTickets(adminStore.tickets.read());
    setMounted(true);
  }, []);

  const computed = useMemo(() => {
    const members = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const frozen = users.filter((u) => u.status === 'frozen').length;
    const agentCount = users.filter((u) => u.role === 'agent').length;
    const fxCount = users.filter((u) => u.role === 'fx').length;

    const validOrders = orders.filter((o) => o.status !== 'cancelled');
    const totalOrder = validOrders.reduce((acc, o) => acc + o.amount, 0);
    const totalCommission = comm.reduce((acc, c) => (c.status === 'settled' ? acc + c.amount : acc), 0);
    const pendingCommission = comm.reduce((acc, c) => (c.status === 'pending' ? acc + c.amount : acc), 0);

    // Demo data is seeded around 2026-09-20; use the latest order date as
    // the "today" anchor so KPIs never look stale as wall-clock time moves
    // past the seed. Falls back to real today if no orders exist.
    const latestOrderDate = orders
      .map((o) => o.created_at.slice(0, 10))
      .sort()
      .pop();
    const todayKey = latestOrderDate ?? new Date().toISOString().slice(0, 10);
    const todayComm = comm
      .filter((c) => c.status === 'settled' && c.created_at.startsWith(todayKey))
      .reduce((a, b) => a + b.amount, 0);

    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const paidOrders = orders.filter((o) => o.status === 'paid');
    const shippedOrders = orders.filter((o) => o.status === 'shipped');
    const completedOrders = orders.filter((o) => o.status === 'completed');

    const pendingWd = wd.filter((w) => w.status === 'pending');
    const pendingWdAmt = pendingWd.reduce((a, b) => a + b.amount, 0);

    const openTickets = tickets.filter((tk) => tk.status === 'open');

    // 7-day sparkline data — orders grouped by date.
    const sparkline = (() => {
      const days: Array<{ date: string; amt: number; count: number }> = [];
      // Anchor on the same date we use for the KPI card so the sparkline
      // and the "today" total line up visually.
      const anchor = new Date(todayKey + 'T00:00:00Z');
      for (let i = 6; i >= 0; i--) {
        const d = new Date(anchor.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        const dayOrders = orders.filter(
          (o) => !o.status.includes('cancel') && o.created_at.startsWith(key),
        );
        days.push({
          date: key,
          amt: dayOrders.reduce((a, b) => a + b.amount, 0),
          count: dayOrders.length,
        });
      }
      return days;
    })();

    return {
      members, active, frozen, agentCount, fxCount,
      totalOrder, totalCommission, pendingCommission, todayComm,
      pendingOrders, paidOrders, shippedOrders, completedOrders,
      pendingWd, pendingWdAmt, openTickets,
      sparkline,
      orderCount: orders.length,
      gmv: totalOrder + totalCommission, // crude but illustrative
    };
  }, [users, orders, wd, comm, tickets]);

  if (!mounted) {
    return <div className="text-neutral-500 text-[13px]">{isEn ? 'Loading…' : '加载中…'}</div>;
  }

  const usdStr = (n: number) => '$' + n.toFixed(2);
  const locale = isEn ? 'en' : 'zh';

  return (
    <div>
      <PageBanner
        title={t.admin.dashboard.title}
        subtitle={isEn ? 'Overview of members, orders and withdrawals' : '会员、订单与提现概览'}
        accent="emerald"
      />

      {/* KPI strip — 4 × 2 grid; clickable tiles for the ones with detail pages. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Link href="/admin/users">
          <StatCard
            label={t.admin.dashboard.kpiMembers}
            value={String(computed.members)}
            sub={`${t.admin.dashboard.kpiMembersSub(String(computed.active), String(computed.frozen))} · agent ${computed.agentCount} / fx ${computed.fxCount}`}
            accent={computed.frozen > 0 ? 'warning' : 'default'}
          />
        </Link>
        <Link href="/admin/orders">
          <StatCard
            label={t.admin.dashboard.kpiTotalOrder}
            value={usdStr(computed.totalOrder)}
            sub={`${t.admin.dashboard.kpiOrderCount} ${computed.orderCount}`}
          />
        </Link>
        <Link href="/admin/comm">
          <StatCard
            label={t.admin.dashboard.kpiTotalComm}
            value={usdStr(computed.totalCommission)}
            sub={`${t.admin.dashboard.kpiToday} ${usdStr(computed.todayComm)} · 待结算 ${usdStr(computed.pendingCommission)}`}
            accent="positive"
          />
        </Link>
        <Link href="/admin/wd">
          <StatCard
            label={t.admin.dashboard.kpiPendingWd}
            value={t.admin.dashboard.pendingCount(String(computed.pendingWd.length))}
            sub={usdStr(computed.pendingWdAmt)}
            accent={computed.pendingWd.length > 0 ? 'danger' : 'default'}
          />
        </Link>
        <Link href="/admin/orders">
          <StatCard
            label={t.admin.dashboard.kpiPendingOrders}
            value={String(computed.pendingOrders.length)}
            sub={usdStr(computed.pendingOrders.reduce((a, b) => a + b.amount, 0))}
            accent={computed.pendingOrders.length > 0 ? 'warning' : 'default'}
          />
        </Link>
        <Link href="/admin/orders">
          <StatCard
            label={t.admin.dashboard.kpiShippable}
            value={String(computed.paidOrders.length)}
            sub={`已发货 ${computed.shippedOrders.length} / 已完成 ${computed.completedOrders.length}`}
          />
        </Link>
        <Link href="/admin/tickets">
          <StatCard
            label={t.admin.dashboard.kpiOpenTickets}
            value={String(computed.openTickets.length)}
            sub={computed.openTickets.length === 0 ? '✓' : '需处理'}
            accent={computed.openTickets.length > 0 ? 'danger' : 'positive'}
          />
        </Link>
        <StatCard
          label={t.admin.dashboard.kpiGmv}
          value={usdStr(computed.gmv)}
        />
      </div>

      {/* 7-day sparkline */}
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-[18px] mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-neutral-900">{t.admin.dashboard.kpi7dTrend}</h2>
          <span className="text-[11px] text-neutral-500">
            {computed.sparkline[0].date} → {computed.sparkline[6].date}
          </span>
        </div>
        <Sparkline data={computed.sparkline.map((d) => d.amt)} labels={computed.sparkline.map((d) => d.date.slice(5))} usd={usdStr} />
      </div>

      {/* 3 recent-activity panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RecentCard
          title={t.admin.dashboard.recentOrders}
          empty={t.admin.dashboard.emptyRecent}
          viewAllHref="/admin/orders"
          viewAllLabel={t.admin.dashboard.viewAll}
        >
          {orders.slice(-5).reverse().map((o) => (
            <div key={o.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11.5px] text-neutral-500 truncate">{o.order_no}</div>
                <div className="text-[12.5px] text-neutral-800 truncate">{o.nickname} · @{o.username}</div>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <span className="font-bold tabular-nums text-[12.5px] text-orange-700">{usdStr(o.amount)}</span>
                <StatusBadge kind={ORDER_STATUS_KIND[o.status] || 'mute'}>{orderStatusLabel(o.status, locale as any)}</StatusBadge>
              </div>
            </div>
          ))}
        </RecentCard>

        <RecentCard
          title={t.admin.dashboard.recentWd}
          empty={t.admin.dashboard.emptyRecent}
          viewAllHref="/admin/wd"
          viewAllLabel={t.admin.dashboard.viewAll}
        >
          {wd.slice(-5).reverse().map((w) => (
            <div key={w.id} className="flex items-center justify-between py-2 border-b border-neutral-100 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11.5px] text-neutral-500">#{w.id}</div>
                <div className="text-[12.5px] text-neutral-800 truncate">@{w.username} · {w.method === 'usdt_trc20' ? 'USDT' : w.method}</div>
              </div>
              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                <span className="font-bold tabular-nums text-[12.5px] text-orange-700">{usdStr(w.amount)}</span>
                <StatusBadge kind={WD_STATUS_KIND[w.status] || 'mute'}>{wdStatusLabel(w.status, locale as any)}</StatusBadge>
              </div>
            </div>
          ))}
        </RecentCard>

        <RecentCard
          title={t.admin.dashboard.recentTickets}
          empty={t.admin.dashboard.emptyRecent}
          viewAllHref="/admin/tickets"
          viewAllLabel={t.admin.dashboard.viewAll}
        >
          {tickets.slice(-5).reverse().map((tk) => (
            <div key={tk.id} className="flex items-start justify-between py-2 border-b border-neutral-100 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11.5px] text-neutral-500">#{tk.id} · @{tk.username}</div>
                <div className="text-[12.5px] text-neutral-800 truncate">{tk.reason}</div>
              </div>
              <StatusBadge kind={tk.status === 'open' ? 'pending' : 'mute'}>{tk.status}</StatusBadge>
            </div>
          ))}
        </RecentCard>
      </div>

      {/* System note — preserved verbatim. */}
      <div className="bg-white rounded-xl border border-neutral-200 px-5 py-[18px]">
        <h2 className="text-[15px] font-bold text-neutral-900 mb-2">{t.admin.dashboard.systemNote}</h2>
        <p className="text-[13.5px] text-neutral-700 leading-[1.85] whitespace-pre-line">
          {t.admin.dashboard.systemNoteBody}
        </p>
      </div>
    </div>
  );
}

/**
 * Sparkline — minimal SVG 7-day amount chart. No axes labels, just the
 * curve + dots at the data points. Hover on each dot to see the date +
 * amount in a <title>.
 */
function Sparkline({ data, labels, usd }: { data: number[]; labels: string[]; usd: (n: number) => string }) {
  const W = 600;
  const H = 90;
  const PAD = 8;
  const max = Math.max(1, ...data);
  const min = 0;
  const stepX = (W - PAD * 2) / Math.max(1, data.length - 1);
  const points = data.map((v, i) => {
    const x = PAD + stepX * i;
    const y = H - PAD - ((v - min) / (max - min || 1)) * (H - PAD * 2);
    return { x, y, v, label: labels[i] };
  });
  const path = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');
  const areaPath = `${path} L ${points[points.length - 1].x} ${H - PAD} L ${points[0].x} ${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[90px]" preserveAspectRatio="none" aria-label="7-day order trend">
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16a34a" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#spark-fill)" />
      <path d={path} fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="#16a34a" />
          <title>{p.label} · {usd(p.v)}</title>
        </g>
      ))}
      <text x={PAD} y={H - 1} fontSize="10" fill="#9ca3af">{labels[0]}</text>
      <text x={W - PAD} y={H - 1} fontSize="10" fill="#9ca3af" textAnchor="end">{labels[labels.length - 1]}</text>
    </svg>
  );
}

function RecentCard({
  title, viewAllHref, viewAllLabel, empty, children,
}: {
  title: string;
  viewAllHref: string;
  viewAllLabel: string;
  empty: string;
  children: React.ReactNode;
}) {
  const arr = Array.isArray(children) ? children : [children];
  const isEmpty = arr.length === 0 || (arr.length === 1 && (arr[0] as any)?.key == null);
  return (
    <div className="bg-white rounded-xl border border-neutral-200 px-4 py-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-bold text-neutral-900">{title}</h3>
        <Link href={viewAllHref} className="text-[11.5px] text-orange-700 hover:text-orange-800">
          {viewAllLabel} →
        </Link>
      </div>
      {isEmpty ? (
        <div className="text-[12px] text-neutral-400 py-4 text-center">{empty}</div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}