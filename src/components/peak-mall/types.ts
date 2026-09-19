// 共用类型定义
export type CurrencyCode = 'USD' | 'CNY' | 'EUR' | 'GBP' | 'JPY' | 'KRW' | 'AUD' | 'CAD';
export type LangCode = 'zh' | 'en';

export interface Product {
  id: number;
  name: string;
  category: string;
  /** 价格以 USD 为基准的字符串,组件内换算 */
  price: string | number;
  stock: number;
  cover: string;
  description?: string;
  status?: number;
  created_at?: string;
}

export interface CurrencyOption {
  code: CurrencyCode;
  label: string;
}

export interface LangOption {
  code: LangCode;
  label: string;
}

export interface NavItem {
  key: string;
  label: string;
  /** 显示在顶部细条 */
  top?: boolean;
  onClick?: () => void;
}

export interface BrandInfo {
  name: string;
  slogan: string;
  intro?: string;
}

export interface FooterLink {
  label: string;
  onClick?: () => void;
}

export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

export interface ContactInfo {
  telegram: string;
  hours: string;
  email: string;
}

export interface BannerItem {
  title: string;
  subtitle: string;
  cta: string;
  /** CSS background-image 值 (linear-gradient / url) */
  bg: string;
}

export interface ServiceItem {
  icon: string;
  title: string;
  desc: string;
}

export interface Slide {
  eyebrow: string;
  h1: string;
  p: string;
  cta: string;
  bg: string;
}
