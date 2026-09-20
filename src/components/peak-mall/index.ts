/**
 * peak-mall components (TypeScript)
 *
 * 全部参考改写包,不带源站文案(都是 {{COPY:xxx}} 占位)
 * 业务逻辑留 TODO — 你接自己的后端
 */

export { default as AnnouncementBar } from './AnnouncementBar';
export type { AnnouncementBarProps } from './AnnouncementBar';

export { default as AuthSplit } from './AuthSplit';
export type {
  AuthSplitProps,
  AuthI18n,
  LoginPayload,
  RegisterPayload,
  AuthResult,
} from './AuthSplit';

export { default as CategoryBar } from './CategoryBar';
export type { CategoryBarProps } from './CategoryBar';

export { default as Footer } from './Footer';
export type { FooterProps } from './Footer';

export { default as ProductCard } from './ProductCard';
export type { ProductCardProps } from './ProductCard';

export { default as ProductModal } from './ProductModal';
export type { ProductModalProps } from './ProductModal';

export { default as ServiceStrip } from './ServiceStrip';
export type { ServiceStripProps } from './ServiceStrip';

export { default as ShopHeader } from './ShopHeader';
export type { ShopHeaderProps } from './ShopHeader';

export { default as SupportWidget } from './SupportWidget';
export type { SupportWidgetProps } from './SupportWidget';

export type {
  BannerItem,
  BrandInfo,
  ContactInfo,
  CurrencyOption,
  FooterColumn,
  FooterLink,
  LangCode,
  LangOption,
  NavItem,
  Product,
  ServiceItem,
  Slide,
} from './types';

// CurrencyCode is now defined in @/lib/store (single source of truth).
// Re-export from there for ergonomic imports:
//   import { type CurrencyCode } from '@/components/peak-mall';
export type { CurrencyCode } from '@/lib/store';
