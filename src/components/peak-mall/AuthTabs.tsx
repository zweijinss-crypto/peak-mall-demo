'use client';

/**
 * AuthTabs — 登录 / 管理后台合页 tab 容器
 *
 * 设计:
 * - 一个 URL (/login),两个 tab:用户登录 + 管理员登录
 * - URL hash 同步:/?tab=admin 直达管理员 tab (兼容旧 /admin/login redirect)
 * - 完整 a11y:role=tablist + role=tab + aria-selected + role=tabpanel
 * - 键盘:←/→ 切换 tab,Enter/Space 激活
 * - 用户 tab 内容是现有 AuthSplit(无侵入)
 * - 管理员 tab 内容是 AdminLoginForm(从原 admin/login-client 抽)
 *
 * Next 15 static export 注意:
 * useSearchParams() 必须在 <Suspense> 内才能 build 通过。
 * 默认 export 已经包了 Suspense,使用方直接 <AuthTabs ... /> 即可。
 */

import { Suspense, useEffect, useRef, useState, type FC, type ReactNode, type KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { useT } from '@/lib/use-t';

export type AuthTabId = 'user' | 'admin';

export interface AuthTabsProps {
  /** 用户登录 tab 内容 */
  userPanel: ReactNode;
  /** 管理员登录 tab 内容 */
  adminPanel: ReactNode;
  /** 默认 tab(user) */
  initial?: AuthTabId;
}

const TAB_IDS: AuthTabId[] = ['user', 'admin'];

// 内部组件 — 实际使用 useSearchParams,被 Suspense 包裹
const AuthTabsInner: FC<AuthTabsProps> = ({ userPanel, adminPanel, initial = 'user' }) => {
  const t = useT();
  const params = useSearchParams();
  const queryTab = params.get('tab');
  const requested: AuthTabId = queryTab === 'admin' ? 'admin' : initial;

  const [active, setActive] = useState<AuthTabId>(requested);
  const tabRefs = useRef<Record<AuthTabId, HTMLButtonElement | null>>({
    user: null,
    admin: null,
  });
  const panelRef = useRef<HTMLDivElement | null>(null);

  /** URL → state(支持浏览器后退) */
  useEffect(() => {
    setActive(requested);
    // 只随 URL 变化更新,避免循环
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryTab]);

  /** state → URL(轻同步,不 push 历史) */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (active === 'admin') {
      if (url.searchParams.get('tab') !== 'admin') {
        url.searchParams.set('tab', 'admin');
        window.history.replaceState({}, '', url.toString());
      }
    } else {
      if (url.searchParams.has('tab')) {
        url.searchParams.delete('tab');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [active]);

  /**
   * Focus management — 鼠标点击 tab 切换时,把焦点移到 panel 内的第一个
   * 可聚焦元素(input / button),让键盘/SR 用户立刻进入新 panel 的内容
   * 而不是卡在 tab button 上。键盘 Arrow/Home/End 切换时不要抢焦点
   * (tabRef 已经在 onKey 里显式 focus)。
   *
   * 也处理 /login?tab=admin 直达:页面首次渲染后,如果焦点不在 tab 上
   * (即用户来自外链/刷新),主动把焦点送到 panel 第一个 input。
   *
   * Panel 内容可能是异步渲染的(比如 AdminLoginForm 在 useEffect 跑完
   * 之前显示 loading 占位),所以这里用 rAF + 100ms 重试一次拿焦点。
   */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!panelRef.current) return;
    const tryFocus = () => {
      if (!panelRef.current) return;
      const first = panelRef.current.querySelector<HTMLElement>(
        'input, button, select, textarea, a[href]'
      );
      if (!first) return;
      const onTab = tabRefs.current[active] === document.activeElement;
      const noFocus =
        document.activeElement === document.body || document.activeElement === null;
      if (onTab || noFocus) {
        first.focus({ preventScroll: true });
      }
    };
    // 第一轮等 paint 后立刻试;第二轮 120ms 后再试,给 AdminLoginForm 的
    // checking → form 状态切换留出时间窗
    const raf = requestAnimationFrame(tryFocus);
    const t = window.setTimeout(tryFocus, 120);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [active]);

  const labels: Record<AuthTabId, string> = {
    user: t.auth.tabUser ?? '用户登录',
    admin: t.auth.tabAdmin ?? '管理员登录',
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const idx = TAB_IDS.indexOf(active);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = TAB_IDS[(idx + 1) % TAB_IDS.length];
      setActive(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = TAB_IDS[(idx - 1 + TAB_IDS.length) % TAB_IDS.length];
      setActive(prev);
      tabRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive('user');
      tabRefs.current.user?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive('admin');
      tabRefs.current.admin?.focus();
    }
  };

  return (
    <section aria-label={t.auth.tabUser ?? '登录'} className="w-full">
      {/* Tab 列表 — sticky 在主内容顶部 */}
      <div
        role="tablist"
        aria-label={t.auth.tabUser ?? '登录'}
        className="max-w-[640px] mx-auto px-5 pt-6"
      >
        <div className="inline-flex w-full bg-white border border-neutral-200 rounded-xl p-1 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          {TAB_IDS.map((id) => {
            const on = id === active;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabRefs.current[id] = el;
                }}
                type="button"
                role="tab"
                id={`auth-tab-${id}`}
                aria-selected={on}
                aria-controls={`auth-panel-${id}`}
                tabIndex={on ? 0 : -1}
                onClick={() => setActive(id)}
                onKeyDown={on ? onKey : undefined}
                className={`flex-1 px-4 py-2.5 text-[14px] font-bold rounded-lg transition-colors ${
                  on
                    ? 'bg-orange-700 text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                    : 'bg-transparent text-neutral-600 hover:text-orange-700 hover:bg-orange-50/50'
                }`}
              >
                {labels[id]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Panel — 仅渲染 active(省 DOM) */}
      <div
        ref={panelRef}
        role="tabpanel"
        id={`auth-panel-${active}`}
        aria-labelledby={`auth-tab-${active}`}
        tabIndex={0}
      >
        {active === 'user' ? userPanel : adminPanel}
      </div>
    </section>
  );
};

/**
 * 默认导出:包了 <Suspense> 的 AuthTabs,以满足 Next.js 15
 * static export 对 useSearchParams() 的强制要求。
 * 使用方写 <AuthTabs ... /> 即可,不需额外包 Suspense。
 */
const AuthTabs: FC<AuthTabsProps> = (props) => (
  <Suspense
    fallback={
      <section aria-label="加载中" className="w-full">
        <div className="max-w-[640px] mx-auto px-5 pt-6">
          <div className="inline-flex w-full bg-white border border-neutral-200 rounded-xl p-1 h-[60px] animate-pulse" />
        </div>
      </section>
    }
  >
    <AuthTabsInner {...props} />
  </Suspense>
);

export default AuthTabs;