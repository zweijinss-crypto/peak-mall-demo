/**
 * reference/peak-mall/ demo bilingual copy
 *
 * 单一来源。改这里,zh / en 两个 demo 都同步生效。
 * 跟现有 src/lib/copy.ts 隔离。
 *
 * 用法:
 *   // page.tsx (top-level 'use client' component)
 *   <RefI18nProvider>
 *     <AnnouncementBar />
 *     ...
 *   </RefI18nProvider>
 *
 *   // 子组件
 *   const { t, lang, setLang } = useT();
 *   <h2>{t('hero.title')}</h2>
 */

'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export type Lang = 'zh' | 'en';

export const REF_I18N = {
  // 通用 (含 page.tsx 硬编码 section 标题)
  common: {
    shopNow: { zh: '立即选购', en: 'Shop now' },
    recommended: { zh: '推荐商品', en: 'Recommended' },
    itemsTotal: { zh: '共 {n} 件商品', en: '{n} items' },
    cartDemo: { zh: '购物车演示', en: 'Cart demo' },
    subtotal: { zh: '小计', en: 'Subtotal' },
    about: { zh: '关于本演示', en: 'About this demo' },
    loginToggle: { zh: '登录 / 注册', en: 'Sign in / Sign up' },
    backToShop: { zh: '回到商城', en: 'Back to shop' },
  },

  // 顶栏公告
  announcement: {
    tag: { zh: '公告', en: 'Notice' },
    text: {
      zh: '新用户注册即享专属礼遇 · 全场正品保障 · 多仓直发 48 小时出库',
      en: 'New member perks · Authenticity guaranteed · 48h dispatch from multiple warehouses',
    },
  },

  // 分类条
  category: {
    all: { zh: '全部', en: 'All' },
    electronics: { zh: '数码电子', en: 'Electronics' },
    appliances: { zh: '家用电器', en: 'Home appliances' },
    fashion: { zh: '服饰鞋包', en: 'Fashion & bags' },
    beauty: { zh: '美妆个护', en: 'Beauty & care' },
  },

  // 商品卡 / modal
  product: {
    name: { zh: '商品名称', en: 'Product name' },
    subtitle: { zh: '官方直采 · 正品保障', en: 'Authentic · Direct from brand' },
    coverFallback: { zh: '📦', en: '📦' },
    addToCart: { zh: '加入购物车', en: 'Add to cart' },
    stock: {
      in: { zh: '现货', en: 'In stock' },
      low: { zh: '紧张', en: 'Low stock' },
      out: { zh: '售罄', en: 'Sold out' },
    },
  },

  // 购物车行
  cart: {
    name: { zh: '商品', en: 'Item' },
    coverFallback: { zh: '📦', en: '📦' },
    remove: { zh: '移除', en: 'Remove' },
  },

  // 双 banner
  doubleBanner: {
    slot1Title: { zh: '数码电子', en: 'Electronics' },
    slot1Subtitle: {
      zh: '从笔记本电脑到蓝牙耳机,精选全球智能数码,官方直采正品。',
      en: 'From laptops to wireless earbuds — global smart gadgets, sourced direct from the brand.',
    },
    slot1Cta: { zh: '去逛逛', en: 'Browse' },
    slot2Title: { zh: '家用电器', en: 'Home appliances' },
    slot2Subtitle: {
      zh: '扫地机器人、智能家电,让科技融入日常,省心更省电。',
      en: 'Robot vacuums and smart home gear — tech that saves effort and energy.',
    },
    slot2Cta: { zh: '立即抢购', en: 'Shop now' },
  },

  // 登录 / 注册 split
  auth: {
    brandTitle: { zh: '顶峰商城', en: 'Peak Mall' },
    brandSubtitle: {
      zh: '全球精选 · 正品保障 · 安心购物',
      en: 'Curated globally · Authenticity guaranteed · Shop with confidence',
    },
    login: {
      title: { zh: '登录账户', en: 'Sign in' },
      cta: { zh: '登录', en: 'Sign in' },
    },
    register: {
      title: { zh: '注册新账号', en: 'Create account' },
      cta: { zh: '注册', en: 'Sign up' },
    },
    field: {
      email: { zh: '邮箱', en: 'Email' },
      password: { zh: '密码', en: 'Password' },
      nickname: { zh: '昵称', en: 'Nickname' },
      confirmPassword: { zh: '确认密码', en: 'Confirm password' },
    },
    placeholder: {
      email: { zh: 'name@example.com', en: 'name@example.com' },
      password: { zh: '请输入密码', en: 'Enter your password' },
      passwordNew: { zh: '至少 6 位', en: 'At least 6 characters' },
      passwordConfirm: { zh: '请再次输入密码', en: 'Re-enter your password' },
      nickname: { zh: '展示名称(可留空)', en: 'Display name (optional)' },
    },
    remember: { zh: '记住我', en: 'Remember me' },
  },

  // modal 通用
  modal: {
    close: { zh: '关闭', en: 'Close' },
  },

  // Hero
  hero: {
    title: { zh: '全球精选 · 品质好物', en: 'Curated globally · Quality goods' },
    subtitle: {
      zh: '为每一次选择负责 · 官方直采 · 正品保障',
      en: 'Proudly sourced · Authentic guaranteed · Every choice counts',
    },
  },

  // 关于本演示 section 列表
  aboutItems: {
    source: {
      zh: '数据来源:{src} 8 个 React+Tailwind 组件',
      en: 'Source: {src} — 8 React + Tailwind components',
    },
    copySrc: {
      zh: '文案来源:{src}(单一双语字典,zh + en)',
      en: 'Copy source: {src} — single bilingual dictionary, zh + en',
    },
    register: {
      zh: '注册字段:仅 email + nickname + password + confirmPassword(已剔除邀请码)',
      en: 'Signup fields: email + nickname + password + confirmPassword only (invite code removed)',
    },
    payment: {
      zh: '支付:故意不实现(合规版需接 Stripe / 微信 / 支付宝)',
      en: 'Payments: intentionally omitted (compliant version must wire Stripe / WeChat / Alipay)',
    },
    tokens: {
      zh: '所有 UI 风格遵循 {src}',
      en: 'All UI styles follow {src}',
    },
  },

  // 演示商品数据 — 6 件 (id / price / coverEmoji / stockStatus 跟语言无关)
  mockProducts: {
    p1: { name: { zh: '无线降噪耳机 Pro', en: 'Wireless ANC Headphones Pro' }, subtitle: { zh: '官方直采 · 30 小时续航', en: 'Authentic · 30h battery' } },
    p2: { name: { zh: '智能手表 X5', en: 'Smartwatch X5' }, subtitle: { zh: 'GPS + 心率监测', en: 'GPS + heart rate' } },
    p3: { name: { zh: '便携蓝牙音箱', en: 'Portable Bluetooth Speaker' }, subtitle: { zh: 'IPX7 防水', en: 'IPX7 waterproof' } },
    p4: { name: { zh: '4K 显示器 27"', en: '4K Monitor 27"' }, subtitle: { zh: 'HDR400 · Type-C', en: 'HDR400 · Type-C' } },
    p5: { name: { zh: '机械键盘 87 键', en: 'Mechanical Keyboard 87 keys' }, subtitle: { zh: '红轴 · RGB 背光', en: 'Red switch · RGB' } },
    p6: { name: { zh: '人体工学椅', en: 'Ergonomic Chair' }, subtitle: { zh: '腰托 + 4D 扶手', en: 'Lumbar support · 4D armrest' } },
  },

  // 演示购物车数据 — 2 行
  mockCart: {
    c1: { name: { zh: '无线降噪耳机 Pro', en: 'Wireless ANC Headphones Pro' }, subtitle: { zh: '官方直采', en: 'Authentic' } },
  },
} as const;

// ---------- runtime hooks ----------

const STORAGE_KEY = 'ref-peak-mall-lang';

type RefI18nContextValue = {
  lang: Lang;
  setLang: (next: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const RefI18nContext = createContext<RefI18nContextValue | null>(null);

function readLang(): Lang {
  if (typeof window === 'undefined') return 'zh';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved === 'en' ? 'en' : 'zh';
  } catch {
    return 'zh';
  }
}

function buildT(lang: Lang): RefI18nContextValue['t'] {
  return (key: string, vars?: Record<string, string | number>) => {
    const segments = key.split('.');
    let node: unknown = REF_I18N;
    for (const seg of segments) {
      if (node && typeof node === 'object' && seg in (node as Record<string, unknown>)) {
        node = (node as Record<string, unknown>)[seg];
      } else {
        return key;
      }
    }
    const dict = node as Record<Lang, string> | undefined;
    if (!dict || (typeof dict.zh !== 'string' && typeof dict.en !== 'string')) {
      return key;
    }
    let s = dict[lang] ?? dict.zh ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return s;
  };
}

export function RefI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  // hydrate from localStorage on mount
  useEffect(() => {
    setLangState(readLang());
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore (private mode, quota, etc.)
    }
  }, []);

  const t = useCallback(buildT(lang), [lang]);

  return (
    <RefI18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </RefI18nContext.Provider>
  );
}

export function useT(): RefI18nContextValue {
  const ctx = useContext(RefI18nContext);
  if (!ctx) {
    // 未包 Provider — 退化到独立实例(只读 zh)
    return {
      lang: 'zh',
      setLang: () => {},
      t: buildT('zh'),
    };
  }
  return ctx;
}

// ---------- 产品 / 购物车数据 hook ----------
// 返回带头文 + 副文 的扁平对象(其他字段从页面常量取)

export interface LocalizedProduct {
  name: string;
  subtitle?: string;
}

export function useMockProducts(): Record<'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6', LocalizedProduct> {
  const { t } = useT();
  return {
    p1: { name: t('mockProducts.p1.name'), subtitle: t('mockProducts.p1.subtitle') },
    p2: { name: t('mockProducts.p2.name'), subtitle: t('mockProducts.p2.subtitle') },
    p3: { name: t('mockProducts.p3.name'), subtitle: t('mockProducts.p3.subtitle') },
    p4: { name: t('mockProducts.p4.name'), subtitle: t('mockProducts.p4.subtitle') },
    p5: { name: t('mockProducts.p5.name'), subtitle: t('mockProducts.p5.subtitle') },
    p6: { name: t('mockProducts.p6.name'), subtitle: t('mockProducts.p6.subtitle') },
  };
}

export function useMockCategories(): { name: string }[] {
  const { t } = useT();
  return [
    { name: t('category.electronics') },
    { name: t('category.appliances') },
    { name: t('category.fashion') },
    { name: t('category.beauty') },
  ];
}

export interface LocalizedCartItem {
  name: string;
  subtitle?: string;
}

export function useMockCart(): { c1: LocalizedCartItem } {
  const { t } = useT();
  return {
    c1: { name: t('mockCart.c1.name'), subtitle: t('mockCart.c1.subtitle') },
  };
}