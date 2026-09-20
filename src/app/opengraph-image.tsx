import { ImageResponse } from 'next/og';

/**
 * OG share card — 1200×630, served at /opengraph-image.png by Next 14
 * metadata routes. Uses plain HTML/CSS, no external assets, so it works
 * under output: 'export'.
 */
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Peak Mall · 顶峰商城 Demo';
export const dynamic = 'force-static';

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #fd560f 0%, #ff8a3d 60%, #ffb673 100%)',
          padding: 80,
          fontFamily: 'sans-serif',
          color: '#ffffff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 20,
              background: '#ffffff',
              color: '#fd560f',
              fontSize: 64,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            P
          </div>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>Peak Mall</div>
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 84, fontWeight: 800, lineHeight: 1.05, maxWidth: 1000 }}>
            顶峰商城 · Static Demo
          </div>
          <div style={{ marginTop: 28, fontSize: 32, opacity: 0.95, maxWidth: 900 }}>
            16 SKUs · zh + en · dark/light · Next.js static export
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 80,
            fontSize: 24,
            opacity: 0.85,
            fontWeight: 600,
          }}
        >
          peak-mall-demo.netlify.app
        </div>
      </div>
    ),
    size,
  );
}