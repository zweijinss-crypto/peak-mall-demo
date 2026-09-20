'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { FC } from 'react';
import { useT } from '@/lib/use-t';

/**
 * Hero - 重设计:左侧大字 + 双 CTA + 装饰徽章,右侧浮动商品预览
 * 渐变背景 + 两个 blurred orbs + 网格 pattern
 */
const Hero: FC = () => {
  const router = useRouter();
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [q, setQ] = useState('');
  useEffect(() => setMounted(true), []);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) {
      router.push('/#recommended');
      return;
    }
    router.push(`/#recommended?q=${encodeURIComponent(term)}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-800 to-ink-900 text-white">
      {/* Background layers */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30" />
      <div className="hero-orb bg-primary w-[420px] h-[420px] top-[-100px] right-[-80px]" />
      <div className="hero-orb bg-accent-violet w-[360px] h-[360px] bottom-[-100px] left-[-80px]" />

      <div className="relative max-w-shell mx-auto px-5 pt-16 pb-24 md:pt-24 md:pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Copy */}
          <div className={`${mounted ? 'animate-fade-up' : 'opacity-0'}`}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/20 border border-primary/40 rounded-full text-[12px] font-semibold tracking-wide mb-6">
              <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-slow" />
              {t.hero.eyebrow}
            </div>

            <h1 className="text-[40px] md:text-[56px] lg:text-[64px] leading-[1.05] font-extrabold tracking-[-0.02em] mb-6">
              <span className="block">{t.hero.h1}</span>
              <span className="block text-gradient-orange">{t.hero.h2}</span>
            </h1>

            <p className="text-[16px] md:text-[18px] text-white/70 leading-[1.7] max-w-[520px] mb-8">
              {t.hero.sub}
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link
                href="#recommended"
                className="inline-flex items-center gap-2 bg-orange-700 hover:bg-orange-800 text-white px-7 py-3.5 text-[14px] font-bold tracking-wide rounded-md shadow-glow transition-all hover:-translate-y-0.5"
              >
                {t.hero.ctaPrimary}
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <Link
                href="/shop/49"
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-7 py-3.5 text-[14px] font-bold tracking-wide rounded-md transition-all hover:-translate-y-0.5"
              >
                {t.hero.ctaSecondary}
              </Link>
            </div>

            {/* Search */}
            <form
              onSubmit={onSearch}
              role="search"
              aria-label="站内搜索"
              className="mb-4 max-w-[560px]"
            >
              <div className="flex items-stretch gap-0 bg-white/95 backdrop-blur-md rounded-lg shadow-float overflow-hidden border border-white/40">
                <div className="flex items-center justify-center pl-4 pr-2 text-ink-500">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={t.hero.searchPlaceholder}
                  aria-label="搜索商品"
                  className="flex-1 min-w-0 bg-transparent text-ink-900 placeholder:text-ink-500 text-[14px] px-1 py-3 outline-none"
                />
                <button
                  type="submit"
                  className="bg-orange-700 hover:bg-orange-800 text-white text-[13px] font-bold px-5 py-3 transition-colors"
                >
                  搜索
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[12px] text-white/70">
                <span className="font-semibold text-white/85">{t.hero.searchHint}</span>
                {t.hero.searchTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => router.push(`/#recommended?q=${encodeURIComponent(t)}`)}
                    className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white/85 text-[11.5px] transition-colors cursor-pointer"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </form>

            {/* Trust strip */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[12.5px] text-white/60">
              <div className="flex items-center gap-2">
                <span className="flex -space-x-1.5">
                  {['👨', '👩', '👨', '👩'].map((e, i) => (
                    <span key={i} className="w-6 h-6 rounded-full bg-white/15 border-2 border-ink-900 flex items-center justify-center text-[11px]">{e}</span>
                  ))}
                </span>
                <span><b className="text-white font-bold">{t.hero.socialProof}</b></span>
              </div>
              <span className="hidden sm:block w-1 h-1 bg-white/30 rounded-full" />
              <div className="flex items-center gap-1.5">
                <span className="text-accent-gold tracking-wider text-[14px]">★★★★★</span>
                <span><b className="text-white font-bold">{t.hero.rating}</b></span>
              </div>
            </div>
          </div>

          {/* Right — Floating product preview */}
          <div className={`relative hidden lg:block ${mounted ? 'animate-fade-up' : 'opacity-0'}`} style={{ animationDelay: '0.15s' }}>
            <div className="relative w-full aspect-square max-w-[480px] mx-auto">
              {/* Center hero card */}
              <div className="absolute inset-x-8 inset-y-12 bg-gradient-to-br from-primary to-primary-dark rounded-2xl shadow-float overflow-hidden animate-float">
                <div className="absolute inset-0 bg-grid-pattern opacity-20" />
                <div className="relative h-full flex flex-col items-center justify-center text-white p-8 text-center">
                  <div className="text-[140px] mb-4">💻</div>
                  <div className="text-[11px] tracking-[3px] uppercase opacity-80 mb-2">PEAK MALL</div>
                  <div className="text-[24px] font-extrabold leading-tight">Ultra-Slim<br/>Business Laptop</div>
                  <div className="mt-4 text-[28px] font-bold">$499.00</div>
                </div>
              </div>

              {/* Floating mini cards */}
              <div className="absolute -left-4 top-8 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-float w-[180px] animate-float-delayed">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-8 h-8 rounded-md bg-accent-teal/15 text-accent-teal flex items-center justify-center text-[14px]">📦</div>
                  <div className="text-[10px] text-ink-500">订单状态</div>
                </div>
                <div className="text-[13px] font-bold text-ink-900">{t.hero.floatingCard1}</div>
                <div className="text-[10px] text-ink-500 mt-0.5">{t.hero.floatingCard1Sub}</div>
              </div>

              <div className="absolute -right-4 bottom-16 bg-white/95 backdrop-blur-md rounded-xl p-3 shadow-float w-[200px] animate-float-delayed-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-accent-gold text-[12px]">★★★★★</span>
                  <span className="text-[10px] text-ink-500">5.0</span>
                </div>
                <div className="text-[11px] text-ink-700 leading-snug">{t.hero.floatingCard2}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes floatDelayed {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-float-delayed { animation: floatDelayed 7s ease-in-out infinite; animation-delay: 1s; }
        .animate-float-delayed-2 { animation: floatDelayed 8s ease-in-out infinite; animation-delay: 2s; }
      `}</style>
    </section>
  );
};

export default Hero;
