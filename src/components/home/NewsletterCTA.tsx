'use client';

import { useState, type FC, type FormEvent } from 'react';
import { COPY } from '@/lib/copy';

/**
 * NewsletterCTA - 邮件订阅 + 双 CTA
 */
const NewsletterCTA: FC = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'ok' | 'err'>('idle');

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('err');
      return;
    }
    setState('ok');
    setEmail('');
    setTimeout(() => setState('idle'), 4000);
  };

  return (
    <section className="relative max-w-shell mx-auto px-5 py-12">
      <div className="relative bg-gradient-to-br from-primary via-primary-dark to-rose-700 rounded-2xl overflow-hidden text-white p-8 md:p-12 shadow-float">
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />
        <div className="hero-orb bg-white w-[300px] h-[300px] top-[-100px] right-[-50px]" />

        <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-[12px] font-extrabold tracking-[3px] uppercase opacity-90 mb-2">{COPY.cta.label}</div>
            <h2 className="text-[28px] md:text-[36px] font-extrabold leading-tight mb-3">
              {COPY.cta.title}
            </h2>
            <p className="text-[14.5px] opacity-90 leading-relaxed max-w-[440px]">{COPY.cta.sub}</p>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setState('idle'); }}
                placeholder={COPY.cta.emailPh}
                aria-label={COPY.cta.emailLabel}
                className="flex-1 px-4 py-3.5 bg-white/15 backdrop-blur-md border border-white/30 rounded-md text-[14px] text-white placeholder-white/60 focus:bg-white/25 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
                required
              />
              <button
                type="submit"
                className="px-6 py-3.5 bg-white text-orange-700 hover:bg-ink-900 hover:text-white text-[13.5px] font-extrabold tracking-wide rounded-md transition-all whitespace-nowrap"
              >
                {COPY.cta.subscribe}
              </button>
            </div>
            {state === 'ok' && <div className="text-[12.5px] text-white bg-white/15 px-3 py-2 rounded">{COPY.cta.success}</div>}
            {state === 'err' && <div className="text-[12.5px] text-white bg-rose-700/60 px-3 py-2 rounded">{COPY.cta.error}</div>}
            <p className="text-[11px] opacity-70 leading-relaxed">{COPY.cta.disclaimer}</p>
          </form>
        </div>
      </div>
    </section>
  );
};

export default NewsletterCTA;
