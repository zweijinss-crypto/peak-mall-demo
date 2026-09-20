// design-tokens.js
// 提取自 https://peak-mall.com/ 公开 CSS(:root + 内联 @media)
// 仅 token,无任何业务/法律敏感内容。所有 UI 文字 token 都进了 components/[COPY:xxx]
// 用法: 1) Tailwind config 2) CSS vars 3) 直接 import
// Red lines: 不包含 USDT/分销/邀请码/多级代理任何痕迹

export const tokens = {
  color: {
    // Brand
    primary:    '#fd560f',
    primaryDark:'#dc4a0c',
    // Status
    success:    '#16a34a',
    danger:     '#e54545',
    // Neutral (gray-50 → gray-900)
    gray50:     '#f8fafc',
    gray100:    '#f1f5f9',
    gray200:    '#e2e8f0',
    gray300:    '#cbd5e1',
    gray500:    '#64748b',
    gray700:    '#334155',
    gray900:    '#0f172a',
    // Surface accents (shop-only)
    blue50:     '#eff6ff',
    blue100:    '#dbeafe',
    blue200:    '#bfdbfe',
    blue700:    '#1d4ed8',
    yellow100:  '#fef9c3',
    yellow700:  '#a16207',
    red50:      '#fee2e2',
    red700:     '#dc2626',
    green50:    '#dcfce7',
    green700:   '#1a7f37',
    // Auth-hero gradient
    authGradFrom:'#0f172a',
    authGradMid: '#1e3a8a',
    authGradTo:  '#2563eb',
  },
  font: {
    family: '-apple-system,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif',
    size: {
      xs: '11px',
      sm: '12px',
      base: '13px',
      md: '14px',
      lg: '17px',
      xl: '21px',
      h1: '25px',
      h2X: '23px',
    },
    weight: {
      normal: 400,
      semibold: 600,
      bold: 700,
    },
  },
  radius: {
    sm: '8px',
    md: '9px',
    lg: '10px',
    xl: '12px',
    '2xl': '16px',
    chip: '20px',
  },
  spacing: {
    fieldGap: '16px',
    cardPad: '28px 30px',
    sectionPad: '36px 18px',
    gridGap: '16px',
  },
  shadow: {
    card: '0 20px 60px rgba(0,0,0,.28)',
    hover: '0 8px 20px rgba(0,0,0,.09)',
    focus: '0 0 0 3px rgba(37,99,235,.12)',
  },
  breakpoint: {
    sm: '520px',
    md: '780px',
    lg: '860px',
    xl: '1100px',
  },
  layout: {
    authCardW: '352px',
    prodMinW:  '176px',
    prodCoverH:'120px',
    cartCvW:   '56px',
    cartCvH:   '56px',
    badgeMinW: '17px',
    badgeH:    '17px',
    btnPx:     '11px 18px',
    btnPxSm:   '6px 12px',
    fieldPx:   '11px 12px',
    qtyW:      '98px',
    qtyBtn:    '30px',
  },
};

// Tailwind config 片段(在 tailwind.config.ts 中 extend.colors.extend 合并)
export const tailwindConfig = {
  theme: {
    extend: {
      colors: {
        primary:    { DEFAULT: '#fd560f', dark: '#dc4a0c' },
        success:    '#16a34a',
        danger:     '#e54545',
        ink: { 50: tokens.color.gray50, 100: tokens.color.gray100, 200: tokens.color.gray200,
                300: tokens.color.gray300, 500: tokens.color.gray500, 700: tokens.color.gray700,
                900: tokens.color.gray900 },
      },
      fontFamily: { sans: ['-apple-system','Segoe UI','Roboto','"PingFang SC"','"Microsoft YaHei"','sans-serif'] },
      borderRadius: { chip: '20px' },
      boxShadow: { card: '0 20px 60px rgba(0,0,0,.28)', prodHover: '0 8px 20px rgba(0,0,0,.09)' },
    },
  },
};

// CSS vars — drop into :root or globals.css
export const cssVars = `
:root{
  --primary:${tokens.color.primary};
  --primary-d:${tokens.color.primaryDark};
  --success:${tokens.color.success};
  --danger:${tokens.color.danger};
  --gray-50:${tokens.color.gray50};
  --gray-100:${tokens.color.gray100};
  --gray-200:${tokens.color.gray200};
  --gray-300:${tokens.color.gray300};
  --gray-500:${tokens.color.gray500};
  --gray-700:${tokens.color.gray700};
  --gray-900:${tokens.color.gray900};
}
`;

export default tokens;