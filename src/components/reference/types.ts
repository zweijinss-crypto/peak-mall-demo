// types.ts — 共享类型
// 红线: 不含 USDT/分销/邀请码/多级代理任何类型定义

export type CurrencyCode = 'USD' | 'EUR' | 'CNY' | 'JPY' | 'KRW' | string;

export type StockStatus = 'in_stock' | 'low' | 'out';

export interface Product {
  id: string | number;
  price: number;
  currency?: CurrencyCode;
  stockStatus?: StockStatus;
  cover?: string;     // url
  coverEmoji?: string;
  // strings come from <T>() — UI text not on product
}

export interface ProductWithText extends Product {
  name: string;       // resolved copy
  subtitle?: string;
  description?: string;
}

export interface Category {
  name: string;
  count?: number;
}

export interface CartItem {
  id: string | number;
  qty: number;
  cover?: string;
  coverEmoji?: string;
  // strings come from <T>() — UI text not on item
}

export interface CartLineItem extends CartItem {
  name: string;
  subtitle?: string;
  price: number;
  currency?: CurrencyCode;
}

export interface BannerSlot {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
  onCta?: () => void;
  background?: string; // css background image
}

export interface LoginPayload {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterPayload {
  email: string;
  nickname?: string;
  password: string;
}

export interface AuthHandlers {
  onLogin?: (payload: LoginPayload) => void;
  onRegister?: (payload: RegisterPayload) => void;
}