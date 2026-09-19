'use client';

import { useEffect, useState } from 'react';
import type { FC } from 'react';
import Link from 'next/link';
import { COPY } from '@/lib/copy';

const STORAGE_KEY = 'pm_cookie_consent_v1';

/**
 * CookieBanner - 一次性 localStorage 持久化的同意条
 * Hydration-safe: 初始不渲染,只读 localStorage,只在用户首次访问且未确认时显示
 */
const CookieBanner: FC = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (!v) setShow(true);
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'accepted');
    } catch {}
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      role="region"
      aria-label="Cookie 同意"
      className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-[440px] z-50"
    >
      <div className="bg-ink-900 text-white rounded-xl shadow-float border border-white/10 p-4 md:p-5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="text-[20px] leading-none mt-0.5">🍪</span>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-bold mb-1">{COPY.cookie.title}</div>
            <div className="text-[12.5px] text-white/70 leading-[1.6]">{COPY.cookie.desc}</div>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={accept}
                className="bg-orange-700 hover:bg-orange-800 text-white text-[12.5px] font-bold px-4 py-2 rounded-md transition-colors"
              >
                {COPY.cookie.accept}
              </button>
              <Link
                href="/#privacy-info"
                className="text-white/70 hover:text-white text-[12.5px] underline underline-offset-2 transition-colors"
              >
                {COPY.cookie.settings}
              </Link>
            </div>
          </div>
          <button
            onClick={accept}
            aria-label="关闭"
            className="text-white/60 hover:text-white w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;