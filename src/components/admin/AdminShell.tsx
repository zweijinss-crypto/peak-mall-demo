'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_GROUPS, type AdminKey } from '@/lib/admin/sidebar';
import { useT } from '@/lib/use-t';
import { logout } from '@/lib/admin/auth';

/**
 * AdminShell — shared layout chrome for every /admin/* page.
 *
 * Layout mirrors the source site's left nav:
 *   ┌─────────────────────────────────┐
 *   │ 品牌(品牌名 + 角色)              │   ← .brand  padding 20px 22px
 *   ├─────────────────────────────────┤
 *   │ nav group                       │   ← .nav-group  uppercase 11px
 *   │   nav-item icon + label         │   ← .nav-item  padding 10px 22px
 *   │   nav-item                      │
 *   ├─────────────────────────────────┤
 *   │ … (flex-1 fills remaining)       │
 *   ├─────────────────────────────────┤
 *   │ user@ + logout                  │   ← .side-foot  pinned bottom
 *   └─────────────────────────────────┘
 *
 * Why flex-col + flex-1 on the nav wrapper: a fixed min-h leaves a half-black
 * bar at the bottom of short viewports. Letting nav grow fills the gap.
 */
export function AdminShell({ active, children }: { active: AdminKey; children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const t = useT();
  const isEn = pathname.startsWith('/en/') || pathname === '/en';

  const handleLogout = async () => {
    await logout();
    window.location.href = isEn ? '/en/admin/login' : '/admin/login';
  };

  const handleBackToShop = () => {
    if (typeof window === 'undefined') return;
    if (window.confirm(isEn ? 'Leave the admin and go back to the shop?' : '确认离开管理后台,返回前台商城?')) {
      window.location.href = isEn ? '/en' : '/';
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 md:pl-[236px]">
      {/* Sidebar — dark, full-height column with brand on top + footer pinned */}
      {/* Why fixed (not sticky): sticky on a flex item lets the bottom fall
          behind the viewport when the user scrolls a long page, exposing
          the page background where the sidebar should be. position:fixed
          pins the sidebar to the viewport so it always covers the full
          height regardless of how long main content is. The wrapper uses
          md:pl-[236px] to reserve space for the fixed sidebar. */}
      <aside className="bg-[#1c1c1c] text-neutral-100 flex flex-col w-full md:w-[236px] md:fixed md:top-0 md:left-0 md:h-screen md:overflow-y-auto">
        {/* Brand block — mirrors source .brand: 20px 22px padding, brand name bold, role label muted */}
        <div className="px-[22px] py-5 border-b border-white/10">
          <Link href="/" className="block group">
            <div className="text-[18px] font-bold leading-tight tracking-wide text-white group-hover:text-neutral-200 transition-colors">
              顶峰商城
            </div>
            <small className="block text-[11px] font-normal text-neutral-300 mt-1 tracking-wider">
              PEAK MALL · {t.admin.roleAdmin}
            </small>
          </Link>
          </div>

        {/* Nav groups — flex-1 fills the middle so .side-foot stays at the bottom */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {ADMIN_GROUPS.map((g, gi) => (
            <div key={gi} className="mb-1">
              <div className="px-[22px] pt-3 pb-1.5 text-[10.5px] uppercase tracking-[0.08em] text-neutral-400 font-semibold">
                {t.admin[g.labelKey]}
              </div>
              {g.items.map((item) => {
                const localizedHref = isEn ? `/en${item.href}` : item.href;
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={localizedHref}
                    className={`flex items-center gap-2.5 px-[22px] py-[10px] text-[13.5px] transition-colors ${
                      isActive
                        ? 'bg-white/10 text-white font-semibold border-l-[3px] border-orange-500'
                        : 'text-neutral-300 hover:bg-white/5 hover:text-white border-l-[3px] border-transparent'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span aria-hidden="true" className="text-[15px] leading-none">
                      {item.icon}
                    </span>
                    <span>{t.admin[item.key].title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Side footer — mirrors source .side-foot: user label + logout button, pinned bottom */}
        <div className="px-[22px] py-4 border-t border-white/10 bg-[#161616]">
          <div className="text-[12px] text-neutral-200 mb-2 truncate" title={t.admin.userSystem}>
            {t.admin.userSystem}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full px-3 py-1.5 text-[12px] font-medium rounded-md border border-white/15 text-neutral-100 hover:bg-white/10 transition-colors flex items-center justify-center gap-1.5"
          >
            <span aria-hidden="true">⎋</span>
            <span>{t.admin.logout}</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <main className="flex-1 p-4 md:p-6 min-w-0">
        {/* Topbar — slim: only meta + reset/back. Logout moved to sidebar footer. */}
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3 text-[12px] text-neutral-500">
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-medium text-neutral-700">{t.admin.online}</span>
            </span>
            <span className="text-neutral-300">·</span>
            <span>{t.admin.topbarHint}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBackToShop}
              className="px-3 py-1.5 text-[12px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-white transition-colors"
            >
              ← {t.admin.backToShop}
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}
