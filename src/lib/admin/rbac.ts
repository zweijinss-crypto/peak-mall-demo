/**
 * admin/rbac — role + permission lookup for /admin/*.
 *
 * Reads the caller's `admin_roles` JSONB column (set in migration 0010)
 * and checks against the permission matrix. All admin pages should
 * gate via this — not via a hardcoded `role === 'admin'` check.
 *
 * Use:
 *   const ok = await can('orders', 'refund');
 *   const roles = await getMyAdminRoles();
 *
 * Permission matrix mirrors supabase/migrations/0010_admin_rbac.sql —
 * if you add a row there, add the matching entry in PERMISSIONS below.
 */
import { getSupabase } from '@/lib/api/supabase-client';

export type AdminRole = 'super_admin' | 'ops' | 'cs' | 'finance';

export type AdminResource =
  | 'orders'
  | 'products'
  | 'users'
  | 'agents'
  | 'tickets'
  | 'rules'
  | 'comm'
  | 'wd'
  | 'home_cfg'
  | 'support_cfg'
  | 'audit_log';

export type AdminAction = 'read' | 'create' | 'update' | 'delete' | 'refund' | 'payout';

/**
 * Client-side mirror of the permission matrix. Used for:
 *  - UI gating (hide buttons the caller can't use)
 *  - early bail in client handlers (no flash of forbidden action)
 *
 * Server-side enforcement (Netlify functions, RLS) is the source of
 * truth — this matrix is for UX, not security. If the two ever drift,
 * trust the server.
 */
export const PERMISSIONS: Record<AdminRole, Partial<Record<AdminResource, AdminAction[]>>> = {
  super_admin: {
    orders:      ['read', 'update', 'refund'],
    products:    ['read', 'create', 'update', 'delete'],
    users:       ['read', 'update'],
    agents:      ['read', 'update'],
    tickets:     ['read', 'update'],
    rules:       ['read', 'update'],
    comm:        ['read', 'update'],
    wd:          ['read', 'update'],
    home_cfg:    ['read', 'update'],
    support_cfg: ['read', 'update'],
    audit_log:   ['read'],
  },
  // ops/cs/finance: audit_log.read NOT granted — only super_admin.
  ops: {
    products: ['read', 'create', 'update'],
    orders:   ['read', 'update'],
    tickets:  ['read', 'update'],
  },
  cs: {
    tickets: ['read', 'update'],
    orders:  ['read'],
    users:   ['read'],
  },
  finance: {
    orders: ['read', 'refund'],
    wd:     ['read', 'update'],
    comm:   ['read'],
    rules:  ['read'],
  },
};

/**
 * Whether the current user holds any of the requested roles.
 *
 * Empty array = any admin role is acceptable.
 * ['super_admin'] = only super_admin allowed.
 */
export async function hasRole(allowed: AdminRole[] = []): Promise<boolean> {
  const roles = await getMyAdminRoles();
  if (allowed.length === 0) return roles.length > 0;
  return roles.some((r) => allowed.includes(r));
}

/**
 * Permission check. Returns true iff any of the caller's admin roles
 * grants the requested (resource, action).
 */
export async function can(resource: AdminResource, action: AdminAction): Promise<boolean> {
  const roles = await getMyAdminRoles();
  if (roles.length === 0) return false;
  for (const role of roles) {
    const actions = PERMISSIONS[role]?.[resource];
    if (actions && actions.includes(action)) return true;
  }
  return false;
}

/**
 * Synchronous check, used after the initial role fetch. Pair with
 * `getMyAdminRoles()` once on mount, then call `canSync()` from
 * render functions to avoid hammering Supabase.
 */
export function canSync(
  roles: AdminRole[],
  resource: AdminResource,
  action: AdminAction,
): boolean {
  if (roles.length === 0) return false;
  for (const role of roles) {
    const actions = PERMISSIONS[role]?.[resource];
    if (actions && actions.includes(action)) return true;
  }
  return false;
}

/**
 * Fetch the caller's admin roles. Falls back to [] if Supabase isn't
 * configured (so the demo login still works).
 */
export async function getMyAdminRoles(): Promise<AdminRole[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const sess = supabase.auth.getSession() as unknown as {
      data: { session: { user?: { id?: string } } | null };
    };
    const uid = sess.data.session?.user?.id;
    if (!uid) return [];
    const { data } = await supabase
      .from('users')
      .select('admin_roles')
      .eq('id', uid)
      .maybeSingle();
    const raw = (data as { admin_roles?: unknown } | null)?.admin_roles;
    if (!Array.isArray(raw)) return [];
    // Narrow to AdminRole — drop unknowns.
    const known: AdminRole[] = ['super_admin', 'ops', 'cs', 'finance'];
    return raw.filter((r): r is AdminRole => known.includes(r as AdminRole));
  } catch {
    return [];
  }
}

/**
 * Resource-specific routes for finer-grained gating. Used by the
 * admin shell to decide whether to render a page at all.
 *
 * Resource map for admin nav:
 *   - /admin/dashboard → read across (any admin)
 *   - /admin/products  → products
 *   - /admin/orders    → orders
 *   - /admin/users     → users
 *   - /admin/agents    → agents
 *   - /admin/invite    → users (creates invite codes)
 *   - /admin/tickets   → tickets
 *   - /admin/rules     → rules
 *   - /admin/comm      → comm
 *   - /admin/wd        → wd
 *   - /admin/wd-center → wd (operator view of pending withdrawals)
 *   - /admin/home      → home_cfg
 *   - /admin/support   → support_cfg
 *   - /admin/audit     → audit_log (super_admin only)
 */
export const ROUTE_RESOURCE: Record<string, AdminResource> = {
  '/admin/dashboard':  'orders',   // any admin can see the dashboard
  '/admin/products':   'products',
  '/admin/orders':     'orders',
  '/admin/users':      'users',
  '/admin/agents':     'agents',
  '/admin/invite':     'users',
  '/admin/tickets':    'tickets',
  '/admin/rules':      'rules',
  '/admin/comm':       'comm',
  '/admin/wd':         'wd',
  '/admin/wd-center':  'wd',
  '/admin/home':       'home_cfg',
  '/admin/support':    'support_cfg',
  '/admin/audit':      'audit_log',
};

/**
 * UI label per role. Used in the admin shell footer / user menu.
 */
export const ROLE_LABEL: Record<AdminRole, { zh: string; en: string }> = {
  super_admin: { zh: '超级管理员', en: 'Super admin' },
  ops:         { zh: '运营',       en: 'Operations' },
  cs:          { zh: '客服',       en: 'Customer support' },
  finance:     { zh: '财务',       en: 'Finance' },
};
