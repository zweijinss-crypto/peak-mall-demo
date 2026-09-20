// DoubleBanner.jsx
// 双栏推广 banner — 原站 .dbl / .bx 结构
// props: items: [{ title, subtitle, ctaLabel?, background?, href?, onCta? }]
// 红线: 不含 USDT/分销/邀请码任何痕迹

export default function DoubleBanner({ items = [] }) {
  const fallback = [
    { title: '__COPY_doubleBanner.slot1Title__', subtitle: '__COPY_doubleBanner.slot1Subtitle__', ctaLabel: '__COPY_doubleBanner.slot1Cta__' },
    { title: '__COPY_doubleBanner.slot2Title__', subtitle: '__COPY_doubleBanner.slot2Subtitle__', ctaLabel: '__COPY_doubleBanner.slot2Cta__' },
  ];
  const list = items.length ? items : fallback;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-12">
      {list.map((b, i) => (
        <a
          key={i}
          href={b.href || '#'}
          onClick={(e) => { if (b.onCta) { e.preventDefault(); b.onCta(); } }}
          className="relative rounded-2xl overflow-hidden h-[180px] md:h-[220px] flex items-end p-6 group"
          style={{
            backgroundImage: b.background || 'linear-gradient(135deg,#1e3a8a,#2563eb)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="text-white max-w-[80%]">
            <h3 className="text-[18px] md:text-[22px] font-bold mb-1.5">{b.title}</h3>
            <p className="text-[13px] opacity-90 mb-3">{b.subtitle}</p>
            {b.ctaLabel && (
              <span className="inline-block px-3 py-1.5 bg-white/15 backdrop-blur-sm rounded-lg text-[13px] font-semibold group-hover:bg-white/25 transition-colors">
                {b.ctaLabel} →
              </span>
            )}
          </div>
        </a>
      ))}
    </div>
  );
}