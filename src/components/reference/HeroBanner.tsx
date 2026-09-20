import { useT } from '@/lib/ref-translations.tsx';

interface HeroBannerProps {
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
  background?: string;
}

export default function HeroBanner({ title, subtitle, ctaLabel, onCta, background }: HeroBannerProps) {
  const { t } = useT();
  return (
    <section
      className="relative overflow-hidden rounded-2xl text-white py-16 px-8 md:py-24"
      style={{
        background: background || 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%)',
      }}
    >
      <div className="max-w-2xl">
        <h1 className="text-[25px] md:text-[34px] font-bold tracking-wide leading-tight">
          {title || t('hero.title')}
        </h1>
        <p className="mt-3 text-[14px] md:text-[16px] opacity-80">
          {subtitle || t('hero.subtitle')}
        </p>
        {ctaLabel && (
          <button
            onClick={onCta}
            className="mt-6 px-5 py-2.5 bg-[var(--ref-primary)] hover:bg-[var(--ref-primary-d)] text-white rounded-lg font-semibold transition-colors"
          >
            {ctaLabel}
          </button>
        )}
      </div>
    </section>
  );
}