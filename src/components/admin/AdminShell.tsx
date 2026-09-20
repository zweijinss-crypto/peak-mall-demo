'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ADMIN_GROUPS, type AdminKey } from '@/lib/admin/sidebar';
import { useT } from '@/lib/use-t';
import { adminStore } from '@/lib/admin/fixtures';
import { logout } from '@/lib/admin/auth';

/**
 * AdminShell — shared layout chrome for every /admin/* page.
 *
 * Dark sidebar (mirrors source site's #1c1c1c nav) + light main area with
 * role badge + reset-data + back-to-shop buttons in the top bar.
 */
export function AdminShell({ active, children }: { active: AdminKey; children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const t = useT();
  const isEn = pathname.startsWith('/en/') || pathname === '/en';

  const handleReset = () => {
    if (typeof window === 'undefined') return;
    if (window.confirm(isEn ? 'Reset all admin demo data?' : '重置所有 admin 演示数据?')) {
      adminStore.reset();
      window.location.reload();
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = isEn ? '/en/admin/login' : '/admin/login';
  };

  return (
    <div className="min-h-[calc(100vh-120px)] flex flex-col md:flex-row">
      <aside className="w-full md:w-[236px] md:min-h-[calc(100vh-120px)] bg-[#1c1c1c] text-neutral-100 md:flex-shrink-0">
        <div className="px-[22px] py-5 border-b border-white/10">
          <div className="text-[17px] font-bold leading-tight">{t.admin.roleAdmin}</div>
          <small className="block text-[11px] font-normal text-neutral-200 mt-1">{t.admin.roleSwitchHint}</small>
        </div>
        <nav className="py-2">
          {ADMIN_GROUPS.map((g, gi) => (
            <div key={gi} className="mb-1">
              <div className="px-[22px] py-2 text-[11px] uppercase tracking-wider text-neutral-300 font-semibold">
                {t.admin[g.labelKey]}
              </div>
              {g.items.map((item) => {
                const localizedHref = isEn ? `/en${item.href}` : item.href;
                const isActive = item.key === active;
                return (
                  <Link
                    key={item.key}
                    href={localizedHref}
                    className={`flex items-center gap-2.5 px-[22px] py-[10px] text-[14px] cursor-pointer transition-colors ${
                      isActive ? 'bg-white/10 text-white font-semibold' : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span>{t.admin[item.key].title}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>
      <main className="flex-1 bg-neutral-50 p-4 md:p-6 min-w-0">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="inline-flex items-center gap-2 text-[11.5px] uppercase tracking-wider text-neutral-500 font-semibold">
            <span aria-hidden="true" className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{t.admin.roleAdmin}</span>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-3 py-1.5 text-[12px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-white"
            >
              ← {t.admin.backToShop}
            </Link>
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-1.5 text-[12px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-white"
            >
              ↻ {t.admin.resetData}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-[12px] font-medium border border-neutral-300 rounded-md text-neutral-700 hover:bg-white"
            >
              ⎋ {t.admin.logout}
            </button>
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}