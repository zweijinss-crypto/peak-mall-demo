import type { FC } from 'react';
import { COPY } from '@/lib/copy';

/**
 * Testimonials - 用户故事:评测聚合卡片,3 列,带星级 + 头像 + 引用
 */
const Testimonials: FC = () => {
  const items = [
    {
      stars: 5,
      quote: COPY.testimonial.q1,
      name: COPY.testimonial.n1,
      role: COPY.testimonial.r1,
      avatar: '👩‍💼',
      bg: 'from-primary-50 to-rose-50',
    },
    {
      stars: 5,
      quote: COPY.testimonial.q2,
      name: COPY.testimonial.n2,
      role: COPY.testimonial.r2,
      avatar: '👨‍💻',
      bg: 'from-accent-violet/10 to-primary-50',
    },
    {
      stars: 5,
      quote: COPY.testimonial.q3,
      name: COPY.testimonial.n3,
      role: COPY.testimonial.r3,
      avatar: '👩‍🎨',
      bg: 'from-accent-teal/10 to-primary-50',
    },
  ];

  return (
    <section className="max-w-shell mx-auto px-5 py-12">
      <div className="text-center mb-10">
        <div className="text-[12px] font-extrabold tracking-[3px] uppercase text-ink-500 mb-2">{COPY.testimonial.label}</div>
        <h2 className="text-[28px] md:text-[32px] font-extrabold text-ink-900 leading-tight">{COPY.testimonial.title}</h2>
        <div className="flex items-center justify-center gap-1 mt-3">
          {[1,2,3,4,5].map((i) => <span key={i} className="text-accent-gold text-[20px]">★</span>)}
          <span className="text-[14px] font-bold text-ink-700 ml-2">{COPY.testimonial.aggregate}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {items.map((t, i) => (
          <article
            key={i}
            className={`relative bg-gradient-to-br ${t.bg} rounded-2xl p-7 border border-white shadow-soft hover:shadow-float hover:-translate-y-1 transition-all`}
          >
            <div className="absolute -top-3 -left-3 text-[40px] text-primary/20 font-serif leading-none">"</div>
            <div className="text-accent-gold text-[14px] tracking-wider mb-3">★★★★★</div>
            <p className="text-[14px] text-ink-700 leading-[1.75] mb-5">{t.quote}</p>
            <div className="flex items-center gap-3 pt-4 border-t border-white/60">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[18px]">{t.avatar}</div>
              <div>
                <div className="text-[13px] font-bold text-ink-900">{t.name}</div>
                <div className="text-[11.5px] text-ink-500">{t.role}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default Testimonials;
