/**
 * admin/sidebar — single source of truth for the admin console navigation.
 * Mirrors the source site peak-mall.com `#admin-*` hash routes, rendered
 * as Next.js pages under /admin/*. Public — no credential required to read.
 *
 * 4 groups, 14 nav items. Each route has a real /admin/<slug> page.
 */
export type AdminKey =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'users'
  | 'agents'
  | 'invite'
  | 'tickets'
  | 'rules'
  | 'comm'
  | 'wd'
  | 'wdCenter'
  | 'home'
  | 'support'
  | 'audit';

export interface AdminItem {
  key: AdminKey;
  /** Public URL (no locale; /admin/en mirrors via the i18n segment). */
  href: string;
  /** emoji icon (1-2 chars). */
  icon: string;
}

export interface AdminGroup {
  /** Group label key, translated via copy.admin.groupOverview etc. */
  labelKey: 'groupOverview' | 'groupMall' | 'groupDistribute' | 'groupFunds' | 'groupTools';
  items: AdminItem[];
}

export const ADMIN_GROUPS: AdminGroup[] = [
  {
    labelKey: 'groupOverview',
    items: [
      { key: 'dashboard', href: '/admin/dashboard', icon: '📊' },
    ],
  },
  {
    labelKey: 'groupMall',
    items: [
      { key: 'products', href: '/admin/products', icon: '📦' },
      { key: 'orders', href: '/admin/orders', icon: '🧾' },
    ],
  },
  {
    labelKey: 'groupDistribute',
    items: [
      { key: 'users', href: '/admin/users', icon: '👥' },
      { key: 'agents', href: '/admin/agents', icon: '🤝' },
      { key: 'invite', href: '/admin/invite', icon: '🎟️' },
      { key: 'tickets', href: '/admin/tickets', icon: '🛠️' },
    ],
  },
  {
    labelKey: 'groupFunds',
    items: [
      { key: 'rules', href: '/admin/rules', icon: '⚙️' },
      { key: 'comm', href: '/admin/comm', icon: '📈' },
      { key: 'wd', href: '/admin/wd', icon: '💰' },
      { key: 'wdCenter', href: '/admin/wd-center', icon: '💳' },
    ],
  },
  {
    labelKey: 'groupTools',
    items: [
      { key: 'home', href: '/admin/home', icon: '🏠' },
      { key: 'support', href: '/admin/support', icon: '🎧' },
      { key: 'audit', href: '/admin/audit', icon: '📜' },
    ],
  },
];

export const ROLE_NAME: Record<'admin' | 'agent' | 'fx', string> = {
  admin: '总后台 · 管理员',
  agent: '代理后台',
  fx: '分销中心',
};