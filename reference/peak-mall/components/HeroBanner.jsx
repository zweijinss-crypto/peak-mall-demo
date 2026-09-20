// HeroBanner.jsx
// 首页顶部 Hero — 原站 .sec-hd + 标题 + 副标题结构,辅以背景渐变
// props: title, subtitle, ctaLabel?, onCta?
// 红线: 不含 USDT/分销/邀请码任何痕迹

export default function HeroBanner({ title, subtitle, ctaLabel, onCta, background }) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white py-16 px-8 md:py-24"
      style={{
        background: background || 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%)',
      }}
    >
      <div className="max-w-2xl">
        <h1 className="text-[25px] md:text-[34px] font-bold tracking-wide leading-tight">
          {title || '__COPY_hero.title__'}
        </h1>
        <p className="mt-3 text-[14px] md:text-[16px] opacity-80">
          {subtitle || '__COPY_hero.subtitle__'}
        </p>
        {ctaLabel && (
          <button
            onClick={onCta}
            className="mt-6 px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-d)] text-white rounded-lg font-semibold transition-colors"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </section>
  );
}