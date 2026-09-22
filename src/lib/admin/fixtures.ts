/**
 * admin/fixtures — localStorage-backed mock data for the /admin/* console.
 *
 * Why: the demo is fully static (output: 'export'), so we can't talk to a
 * real server. Instead we keep all admin tables in localStorage and seed
 * sensible defaults on first read. Every mutation routes through here so
 * reloads persist (matches the user-side wishlist/cart experience).
 *
 * All identifiers are stable ISO timestamps so SSR + client hydrate to
 * the same value before any client mutation kicks in.
 */

import type { Locale } from '../store';

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
export type WdStatus = 'pending' | 'approved' | 'paid' | 'rejected';
export type UserStatus = 'active' | 'frozen';
export type UserRole = 'fx' | 'agent';

export interface AdminProduct {
  id: number;
  name: string;
  sku: string;
  category: string;
  price: number; // 售价
  comparePrice?: number; // 划线价(展示原价)
  cost?: number; // 成本(管理员可见)
  stock: number;
  stockAlert: number; // 库存阈值:≤此值提示补货
  description: string;
  images: string[]; // 多图(图标 emoji 或 URL)
  cover: string; // 主图(图标 emoji),从 images[0] 取或独立
  status: boolean; // true = 上架
  seoSlug?: string;
  created_at: string;
  updated_at?: string;
}

export interface AdminOrder {
  id: number;
  order_no: string;
  nickname: string;
  username: string;
  amount: number;
  status: OrderStatus;
  pay_method?: string;
  card_brand?: string;
  card_last4?: string;
  card_expiry?: string;
  contact_name?: string;
  address?: string;
  created_at: string; // ISO slice(0,19)
  updated_at?: string;
  cancel_reason?: string;
  refunded?: boolean;
  /** Phase 2.2 — buyer email for shipment notifications. */
  buyer_email?: string;
  refund_at?: string;
}

export interface AdminUser {
  id: number;
  nickname: string;
  username: string;
  role: UserRole;
  referrer?: string;
  teamCount?: number;
  status: UserStatus;
  created_at: string;
  balance: number;
  withdraw_address?: string;
}

export interface AdminAgent {
  id: number;
  nickname: string;
  username: string;
  balance: number;
  own_rate: number;
  sub_rate: number;
  sub_rate_limit: number;
  withdraw_address?: string;
}

export interface AdminInvite {
  code: string;
  used: number;
  limit: number;
  created_at: string;
  status: 'active' | 'disabled';
}

export interface AdminTicket {
  id: number;
  order_no: string;
  username: string;
  reason: string;
  status: 'open' | 'replied' | 'closed';
  created_at: string;
}

export interface AdminCommLog {
  id: number;
  username: string;
  amount: number;
  source: string; // 订单号
  rate: number;
  status: 'settled' | 'pending';
  created_at: string;
}

export interface AdminWd {
  id: number;
  username: string;
  amount: number;
  fee: number;
  method: 'usdt_trc20' | 'card';
  status: WdStatus;
  reject_reason?: string;
  bound_address?: string;
  account?: string;
  created_at: string;
}

export interface AdminRules {
  rates: number[]; // rates[0] = 自购返佣 %
  min_withdraw: number;
  withdraw_fee: number; // %
  commission_on: boolean;
  auto_approve: boolean;
}

export interface AdminHomeCfg {
  title: string;
  sub: string;
  notice: string;
}

export interface AdminSupportCfg {
  name: string;
  url: string;
  hours: string;
}

/* ──────────────── Seed ──────────────── */

export const SEED_PRODUCTS: AdminProduct[] = [
  {
    id: 1,
    name: '笔记本 Pro 14',
    sku: 'NB-PRO-14-2026',
    category: '数码电子',
    price: 1299,
    comparePrice: 1499,
    cost: 980,
    stock: 28,
    stockAlert: 5,
    description: '## 卖点\n- 14 寸高清屏\n- 16GB RAM\n- 1TB SSD\n\n## 售后\n7 天无理由 · 1 年保修',
    images: ['💻', '🖥️', '⌨️'],
    cover: '💻',
    status: true,
    seoSlug: 'notebook-pro-14',
    created_at: '2026-08-12 10:23:00',
    updated_at: '2026-08-12 10:23:00',
  },
  {
    id: 2,
    name: '降噪耳机 WH-5',
    sku: 'HP-WH5-BLK',
    category: '数码电子',
    price: 289,
    comparePrice: 399,
    cost: 150,
    stock: 64,
    stockAlert: 10,
    description: '主动降噪 40dB · 无线蓝牙 5.3 · 续航 30h',
    images: ['🎧', '🎵'],
    cover: '🎧',
    status: true,
    seoSlug: 'anc-headphone-wh5',
    created_at: '2026-08-15 14:05:11',
    updated_at: '2026-08-15 14:05:11',
  },
  {
    id: 3,
    name: '扫地机器人 S2',
    sku: 'RB-S2-LDS',
    category: '智能家居',
    price: 599,
    comparePrice: 799,
    cost: 320,
    stock: 19,
    stockAlert: 5,
    description: '激光导航 · 自动回充 · 200ml 电控水箱',
    images: ['🤖', '🧹'],
    cover: '🤖',
    status: true,
    seoSlug: 'robot-vacuum-s2',
    created_at: '2026-08-20 09:42:33',
    updated_at: '2026-08-20 09:42:33',
  },
  {
    id: 4,
    name: '机械键盘 K1',
    sku: 'KB-K1-BLU',
    category: '数码电子',
    price: 199,
    comparePrice: 249,
    cost: 95,
    stock: 0,
    stockAlert: 5,
    description: '青轴 · RGB · 87 键',
    images: ['⌨️'],
    cover: '⌨️',
    status: false,
    seoSlug: 'mech-keyboard-k1',
    created_at: '2026-08-25 16:18:00',
    updated_at: '2026-08-25 16:18:00',
  },
  {
    id: 5,
    name: '智能手表 W3',
    sku: 'WT-W3-BLK',
    category: '智能家居',
    price: 459,
    comparePrice: 599,
    cost: 220,
    stock: 31,
    stockAlert: 8,
    description: '运动健康 · 14 天续航 · 5ATM 防水',
    images: ['⌚', '📱'],
    cover: '⌚',
    status: true,
    seoSlug: 'smartwatch-w3',
    created_at: '2026-09-01 11:30:45',
    updated_at: '2026-09-01 11:30:45',
  },
  {
    id: 6,
    name: '便携相机 C6',
    sku: 'CAM-C6-4K',
    category: '数码电子',
    price: 899,
    comparePrice: 1199,
    cost: 510,
    stock: 12,
    stockAlert: 5,
    description: '4K 录制 · 六轴防抖 · 翻转屏',
    images: ['📷', '🎥'],
    cover: '📷',
    status: true,
    seoSlug: 'camera-c6',
    created_at: '2026-09-08 18:55:21',
    updated_at: '2026-09-08 18:55:21',
  },
];

export const SEED_ORDERS: AdminOrder[] = [
  { id: 1001, order_no: 'PM-20260920-001', nickname: '小张', username: 'zhang_88', amount: 1588, status: 'paid', pay_method: 'card', card_brand: 'VISA', card_last4: '1111', card_expiry: '12/28', contact_name: '张先生', address: '上海市浦东新区世纪大道 100 号', created_at: '2026-09-20 11:23:08' },
  { id: 1002, order_no: 'PM-20260920-002', nickname: 'Lily', username: 'lily_us', amount: 459, status: 'shipped', pay_method: 'wallet', contact_name: 'Lily Chen', address: '北京市朝阳区建国路 88 号', created_at: '2026-09-20 13:47:21' },
  { id: 1003, order_no: 'PM-20260920-003', nickname: '老王', username: 'wang_old', amount: 299, status: 'completed', pay_method: 'card', card_brand: 'MasterCard', card_last4: '4242', card_expiry: '06/29', contact_name: '王先生', address: '广州市天河区珠江新城 12 号', created_at: '2026-09-19 09:11:54' },
  { id: 1004, order_no: 'PM-20260920-004', nickname: 'Anna', username: 'anna_eu', amount: 899, status: 'pending', contact_name: 'Anna Müller', address: 'Berlin Mitte 5', created_at: '2026-09-20 14:55:02' },
  { id: 1005, order_no: 'PM-20260920-005', nickname: 'Tom', username: 'tom_jp', amount: 199, status: 'cancelled', contact_name: 'Tom Tanaka', address: 'Tokyo Shibuya 1-1', created_at: '2026-09-18 22:08:33' },
  { id: 1006, order_no: 'PM-20260920-006', nickname: '小李', username: 'li_cn', amount: 1299, status: 'paid', pay_method: 'card', card_brand: 'VISA', card_last4: '0005', card_expiry: '03/30', contact_name: '李女士', address: '深圳市南山区科技园 1 路', created_at: '2026-09-20 15:32:19' },
];

export const SEED_USERS: AdminUser[] = [
  { id: 1, nickname: '小张', username: 'zhang_88', role: 'fx', referrer: '—', teamCount: 3, status: 'active', created_at: '2026-08-12', balance: 156.32, withdraw_address: 'TXyZ...a91d' },
  { id: 2, nickname: 'Lily', username: 'lily_us', role: 'fx', referrer: 'anna_eu', teamCount: 0, status: 'active', created_at: '2026-08-30', balance: 42.00 },
  { id: 3, nickname: '老王', username: 'wang_old', role: 'agent', referrer: '—', teamCount: 12, status: 'active', created_at: '2026-07-04', balance: 1284.50, withdraw_address: 'TLa...aA2f' },
  { id: 4, nickname: 'Anna', username: 'anna_eu', role: 'agent', referrer: '—', teamCount: 5, status: 'active', created_at: '2026-06-21', balance: 762.10, withdraw_address: 'TAn...8Bc1' },
  { id: 5, nickname: 'Tom', username: 'tom_jp', role: 'fx', referrer: 'anna_eu', teamCount: 1, status: 'frozen', created_at: '2026-09-01', balance: 0 },
  { id: 6, nickname: '小李', username: 'li_cn', role: 'fx', referrer: 'wang_old', teamCount: 0, status: 'active', created_at: '2026-09-10', balance: 12.00 },
];

export const SEED_AGENTS: AdminAgent[] = [
  { id: 3, nickname: '老王', username: 'wang_old', balance: 1284.50, own_rate: 12, sub_rate: 8, sub_rate_limit: 15, withdraw_address: 'TLa...aA2f' },
  { id: 4, nickname: 'Anna', username: 'anna_eu', balance: 762.10, own_rate: 10, sub_rate: 5, sub_rate_limit: 12, withdraw_address: 'TAn...8Bc1' },
];

export const SEED_INVITES: AdminInvite[] = [
  { code: 'PM-WELCOME-2026', used: 32, limit: 100, created_at: '2026-08-01', status: 'active' },
  { code: 'PM-PARTNER-Q4', used: 14, limit: 50, created_at: '2026-09-15', status: 'active' },
  { code: 'PM-LEGACY-2025', used: 100, limit: 100, created_at: '2025-11-20', status: 'disabled' },
];

export const SEED_TICKETS: AdminTicket[] = [
  { id: 1, order_no: 'PM-20260920-001', username: 'zhang_88', reason: '颜色与描述不符,申请换货', status: 'open', created_at: '2026-09-20 12:01:44' },
  { id: 2, order_no: 'PM-20260918-007', username: 'lily_us', reason: '物流 3 天未更新', status: 'replied', created_at: '2026-09-19 08:30:12' },
  { id: 3, order_no: 'PM-20260915-022', username: 'wang_old', reason: '退款 7 天未到账', status: 'closed', created_at: '2026-09-16 10:14:08' },
];

export const SEED_COMM: AdminCommLog[] = [
  { id: 1, username: 'zhang_88', amount: 158.80, source: 'PM-20260920-001', rate: 10, status: 'settled', created_at: '2026-09-20 11:24:00' },
  { id: 2, username: 'lily_us', amount: 45.90, source: 'PM-20260920-002', rate: 10, status: 'settled', created_at: '2026-09-20 13:48:00' },
  { id: 3, username: 'wang_old', amount: 153.84, source: 'PM-20260920-003', rate: 12, status: 'pending', created_at: '2026-09-19 09:12:30' },
  { id: 4, username: 'anna_eu', amount: 89.90, source: 'PM-20260919-014', rate: 10, status: 'settled', created_at: '2026-09-19 14:00:00' },
];

export const SEED_WD: AdminWd[] = [
  { id: 901, username: 'zhang_88', amount: 100, fee: 2, method: 'usdt_trc20', status: 'pending', bound_address: 'TXyZ...a91d', account: 'TXyZ...a91d', created_at: '2026-09-20 12:11:30' },
  { id: 902, username: 'wang_old', amount: 500, fee: 10, method: 'usdt_trc20', status: 'approved', bound_address: 'TLa...aA2f', account: 'TLa...aA2f', created_at: '2026-09-20 10:42:18' },
  { id: 903, username: 'anna_eu', amount: 200, fee: 4, method: 'card', status: 'paid', created_at: '2026-09-18 15:08:22' },
  { id: 904, username: 'lily_us', amount: 40, fee: 1, method: 'usdt_trc20', status: 'rejected', reject_reason: '余额不足', created_at: '2026-09-17 09:30:00' },
];

export const DEFAULT_RULES: AdminRules = {
  rates: [10],
  min_withdraw: 10,
  withdraw_fee: 2,
  commission_on: true,
  auto_approve: false,
};

export const DEFAULT_HOME: AdminHomeCfg = {
  title: '全球精选 · 品质好物',
  sub: '官方直采 · 正品保障 · 多仓直发',
  notice: '新用户注册即享专属礼遇 · 全场正品保障',
};

export const DEFAULT_SUPPORT: AdminSupportCfg = {
  name: 'Memento Care',
  url: 'https://t.me/MementoCare',
  hours: '13:00 - 23:30',
};

/* ──────────────── Helpers ──────────────── */

/** Read a single seed (static), useful for SSR-safe defaults. */
export function seedOf<T>(arr: T[]): T[] {
  return arr;
}

/** localStorage namespace. */
const NS = 'peak_admin_v1';

function read<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(`${NS}:${key}`);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, val: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(`${NS}:${key}`, JSON.stringify(val));
  } catch {
    /* quota or sandbox; ignore */
  }
}

export const adminStore = {
  products: {
    read: () => read<AdminProduct[]>('products', SEED_PRODUCTS),
    write: (v: AdminProduct[]) => write('products', v),
  },
  orders: {
    read: () => read<AdminOrder[]>('orders', SEED_ORDERS),
    write: (v: AdminOrder[]) => write('orders', v),
  },
  users: {
    read: () => read<AdminUser[]>('users', SEED_USERS),
    write: (v: AdminUser[]) => write('users', v),
  },
  agents: {
    read: () => read<AdminAgent[]>('agents', SEED_AGENTS),
    write: (v: AdminAgent[]) => write('agents', v),
  },
  invites: {
    read: () => read<AdminInvite[]>('invites', SEED_INVITES),
    write: (v: AdminInvite[]) => write('invites', v),
  },
  tickets: {
    read: () => read<AdminTicket[]>('tickets', SEED_TICKETS),
    write: (v: AdminTicket[]) => write('tickets', v),
  },
  comm: {
    read: () => read<AdminCommLog[]>('comm', SEED_COMM),
    write: (v: AdminCommLog[]) => write('comm', v),
  },
  wd: {
    read: () => read<AdminWd[]>('wd', SEED_WD),
    write: (v: AdminWd[]) => write('wd', v),
  },
  rules: {
    read: () => read<AdminRules>('rules', DEFAULT_RULES),
    write: (v: AdminRules) => write('rules', v),
  },
  homeCfg: {
    read: () => read<AdminHomeCfg>('homeCfg', DEFAULT_HOME),
    write: (v: AdminHomeCfg) => write('homeCfg', v),
  },
  supportCfg: {
    read: () => read<AdminSupportCfg>('supportCfg', DEFAULT_SUPPORT),
    write: (v: AdminSupportCfg) => write('supportCfg', v),
  },
  reset: () => {
    if (typeof window === 'undefined') return;
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(`${NS}:`))
      .forEach((k) => window.localStorage.removeItem(k));
  },
};

/** Locale-independent formatter (used in admin tables — currency in USD only). */
export function usd(n: number): string {
  return '$' + n.toFixed(2);
}

/** Status badge label helper for tables. */
export function orderStatusLabel(s: OrderStatus, locale: Locale): string {
  const map: Record<OrderStatus, Record<Locale, string>> = {
    pending: { zh: '待支付', en: 'Pending' },
    paid: { zh: '已支付', en: 'Paid' },
    shipped: { zh: '已发货', en: 'Shipped' },
    completed: { zh: '已完成', en: 'Completed' },
    cancelled: { zh: '已取消', en: 'Cancelled' },
  };
  return map[s][locale];
}

export function wdStatusLabel(s: WdStatus, locale: Locale): string {
  const map: Record<WdStatus, Record<Locale, string>> = {
    pending: { zh: '待审核', en: 'Pending' },
    approved: { zh: '已通过', en: 'Approved' },
    paid: { zh: '已到账', en: 'Paid' },
    rejected: { zh: '已驳回', en: 'Rejected' },
  };
  return map[s][locale];
}