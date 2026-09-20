'use client';

import Link from 'next/link';
import { useT } from '@/lib/use-t';

export default function NotFound() {
  const t = useT();

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-ink-50 via-white to-primary-50/30 flex items-center justify-center px-5 py-16">
      <div className="relative max-w-[680px] w-full">
        {/* Decorative orbs */}
        <div className="absolute -top-20 -right-20 w-[280px] h-[280px] rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-20 -left-20 w-[260px] h-[260px] rounded-full bg-accent-violet/10 blur-3xl" aria-hidden="true" />

        <div className="relative bg-white rounded-2xl shadow-float border border-ink-100 p-8 md:p-12 text-center">
          {/* 404 hero */}
          <div className="mb-6">
            <div className="text-[80px] md:text-[120px] font-extrabold leading-none tracking-tight">
              <span className="text-gradient-orange">4</span>
              <span className="inline-block animate-float">0</span>
              <span className="text-gradient-orange">4</span>
            </div>
            <div className="mt-2 text-[11px] font-extrabold tracking-[4px] uppercase text-ink-500">
              {t.notFound.eyebrow}
            </div>
          </div>

          <h1 className="text-[28px] md:text-[36px] font-extrabold text-ink-900 leading-tight mb-3">
            {t.notFound.title}
          </h1>
          <p className="text-[15px] md:text-[16px] text-ink-700 leading-[1.7] max-w-[480px] mx-auto mb-8">
            {t.notFound.desc}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-orange-700 hover:bg-orange-800 text-white px-6 py-3 text-[14px] font-bold tracking-wide rounded-md shadow-glow transition-all hover:-translate-y-0.5"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M13 8H3M3 8l4-4M3 8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t.notFound.home}
            </Link>
            <Link
              href="/shop/49"
              className="inline-flex items-center gap-2 bg-ink-50 hover:bg-ink-100 border border-ink-200 text-ink-900 px-6 py-3 text-[14px] font-bold tracking-wide rounded-md transition-all hover:-translate-y-0.5"
            >
              {t.notFound.hot}
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>

          {/* Quote */}
          <blockquote className="text-[13px] text-ink-700 italic leading-[1.7] border-t border-ink-100 pt-5 max-w-[440px] mx-auto">
            &ldquo;{t.notFound.quote}&rdquo;
            <footer className="mt-2 text-[11.5px] text-ink-500 not-italic">{t.notFound.quoteBy}</footer>
          </blockquote>

          {/* Code */}
          <div className="mt-6 text-[10.5px] font-mono tracking-[2px] uppercase text-ink-500">
            {t.notFound.code} · 404 / NOT_FOUND
          </div>
        </div>
      </div>
    </div>
  );
}