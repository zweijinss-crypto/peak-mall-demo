import { useT } from '@/lib/ref-translations';

interface BannerSlot {
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  href?: string;
  onCta?: () => void;
  background?: string;
}

// 双栏推广 banner
// 红线: 不含 USDT/分销/邀请码任何痕迹
export default function DoubleBanner({ items = [] }: { items?: BannerSlot[] }) {
  const { t } = useT();
  const fallback: BannerSlot[] = [
    { title: t('doubleBanner.slot1Title'), subtitle: t('doubleBanner.slot1Subtitle'), ctaLabel: t('doubleBanner.slot1Cta') },
    { title: t('doubleBanner.slot2Title'), subtitle: t('doubleBanner.slot2Subtitle'), ctaLabel: t('doubleBanner.slot2Cta') },
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