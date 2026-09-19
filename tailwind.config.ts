import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '520px',
      sm: '780px',
      md: '860px',
      lg: '1100px',
      xl: '1280px',
    },
    extend: {
      colors: {
        primary: {
          DEFAULT: '#fd560f',
          dark: '#dc4a0c',
          light: '#ff8a3d',
          50: '#fff4ec',
          100: '#ffe5d4',
          200: '#ffcfaa',
        },
        ink: {
          900: '#0f0f12',
          800: '#1c1c20',
          700: '#374151',
          600: '#4b5563',
          500: '#6b7280',
          400: '#9ca3af',
          300: '#d1d5db',
          200: '#e5e7eb',
          100: '#f3f4f6',
          50: '#f9fafb',
        },
        accent: {
          gold: '#f59e0b',
          teal: '#0d9488',
          rose: '#e11d48',
          violet: '#7c3aed',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
        mono: ['ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      maxWidth: {
        shell: '1280px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(15,15,18,0.06)',
        glow: '0 8px 32px rgba(253,86,15,0.18)',
        float: '0 12px 40px rgba(15,15,18,0.10)',
      },
      animation: {
        'fade-up': 'fadeUp 0.6s ease-out both',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 20s linear infinite',
        'marquee-x': 'marqueeX 30s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        marqueeX: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h40v40H0z' fill='none'/%3E%3Cpath d='M0 0h40M0 40h40M0 0v40M40 0v40' stroke='%23fd560f' stroke-opacity='0.05' stroke-width='1'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
};

export default config;
