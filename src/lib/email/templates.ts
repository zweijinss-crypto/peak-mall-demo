/**
 * email/templates — bilingual (zh + en) HTML + plain-text templates
 * for transactional mail.
 *
 * Hand-rolled (no React Email dep) to keep the client bundle clean —
 * templates are server-side only and ship in netlify functions.
 *
 * Locale contract: each template accepts an optional `locale` field
 * on its data shape. Default 'zh' matches the site's primary market;
 * callers that know the user's preference (from public.users.locale,
 * the URL prefix, or the order origin) should pass it explicitly so
 * the email lands in the customer's language.
 *
 * Design choice: every string lives in the in-file `STRINGS` map.
 * No i18n library — templates are tiny and the keys are local to this
 * file. If we ever add ja/ko we can either extend STRINGS or pull
 * in react-email + i18next.
 *
 * Adding a new template: copy the existing function shape, define
 * the strings in STRINGS.<yourKind>.{ zh, en }, and pick them via
 *   const s = STRINGS.<yourKind>[locale];
 */

export type EmailLocale = 'zh' | 'en';

export interface OrderConfirmationData {
  orderNumber: string;
  customerName?: string;
  items: Array<{ name: string; quantity: number; priceFormatted: string }>;
  totalFormatted: string;
  siteUrl: string;
  currency?: string;
  locale?: EmailLocale;
}

export interface ShipmentNotificationData {
  orderNumber: string;
  customerName?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  siteUrl: string;
  locale?: EmailLocale;
}

export interface PasswordResetData {
  customerName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
  locale?: EmailLocale;
}

export interface WelcomeData {
  customerName?: string;
  siteUrl: string;
  locale?: EmailLocale;
}

export interface RefundNotificationData {
  orderNumber: string;
  customerName?: string;
  refundAmountFormatted: string;
  currency?: string;
  reason?: string;
  siteUrl: string;
  locale?: EmailLocale;
}

interface Strings {
  greeting: (name: string | undefined) => string;
  greetingBare: string;
  footerReason: string;
  brand: string;
}

const ZH: Strings = {
  greeting: (name) => (name ? `${name},您好:` : '您好:'),
  greetingBare: '您好:',
  footerReason:
    '您收到这封邮件是因为您在 Peak Mall 拥有账户。如认为是误发,请联系客服。',
  brand: 'Peak Mall',
};

const EN: Strings = {
  greeting: (name) => (name ? `Hi ${name},` : 'Hi,'),
  greetingBare: 'Hi,',
  footerReason:
    'You received this email because you have an account at Peak Mall. If you believe this was sent in error, please contact support.',
  brand: 'Peak Mall',
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function shell(
  brand: string,
  previewText: string,
  bodyHtml: string,
  footerReason: string,
  locale: EmailLocale,
): string {
  const htmlLang = locale === 'zh' ? 'zh-CN' : 'en';
  const html = `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(previewText)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'PingFang SC','Hiragino Sans GB','Microsoft YaHei',sans-serif;color:#1d1d1f;">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${escapeHtml(previewText)}</span>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f5f7;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
  <tr><td style="padding:32px 36px 8px 36px;">
    <div style="font-size:13px;font-weight:600;letter-spacing:0.06em;color:#6b6b70;text-transform:uppercase;">${escapeHtml(brand)}</div>
  </td></tr>
  ${bodyHtml}
  <tr><td style="padding:24px 36px 32px 36px;border-top:1px solid #eeeef0;margin-top:32px;">
    <div style="font-size:12px;line-height:1.6;color:#8a8a8e;">
      ${escapeHtml(footerReason)}
    </div>
  </td></tr>
</table>
<div style="font-size:11px;color:#9a9a9e;margin-top:16px;">© ${new Date().getFullYear()} ${escapeHtml(brand)}. All rights reserved.</div>
</td></tr>
</table>
</body></html>`;
  return html;
}

function ctaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
<tr><td align="center" style="background:#1d1d1f;border-radius:10px;">
  <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

// ---------------------------------------------------------------
// 1. Order confirmation
// ---------------------------------------------------------------

export function orderConfirmation(
  data: OrderConfirmationData,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = data.locale ?? 'zh';
  const s = locale === 'zh' ? ZH : EN;
  const greeting = s.greeting(data.customerName);
  const itemsHtml = data.items
    .map(
      (it) => `<tr>
  <td style="padding:8px 0;font-size:14px;color:#1d1d1f;">${escapeHtml(it.name)}</td>
  <td style="padding:8px 0;font-size:14px;color:#6b6b70;text-align:right;">× ${it.quantity}</td>
  <td style="padding:8px 0;font-size:14px;color:#1d1d1f;text-align:right;">${escapeHtml(it.priceFormatted)}</td>
</tr>`,
    )
    .join('');

  if (locale === 'zh') {
    const subject = `订单 ${data.orderNumber} 已确认`;
    const totalLabel = '合计';
    const itemsLabel = '商品明细';
    const ctaLabel = '查看订单详情';
    const html = shell(
      s.brand,
      subject,
      `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">感谢您的订单</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting}您的订单 <strong>#${escapeHtml(data.orderNumber)}</strong> 已确认。仓库发货后我们会再发一封通知邮件。</p>
</td></tr>
<tr><td style="padding:8px 36px;">
  <h2 style="margin:0 0 8px 0;font-size:14px;color:#1d1d1f;">${itemsLabel}</h2>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    ${itemsHtml}
    <tr><td colspan="2" style="border-top:1px solid #eeeef0;padding-top:12px;margin-top:8px;font-size:14px;font-weight:600;color:#1d1d1f;">${totalLabel}</td>
    <td style="border-top:1px solid #eeeef0;padding-top:12px;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;">${escapeHtml(data.totalFormatted)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, ctaLabel)}
</td></tr>`,
      s.footerReason,
      locale,
    );
    const text =
      `感谢您的订单\n\n订单号:${data.orderNumber}\n` +
      data.items.map((it) => `- ${it.name} × ${it.quantity} — ${it.priceFormatted}`).join('\n') +
      `\n合计:${data.totalFormatted}\n\n查看订单:${data.siteUrl}/orders`;
    return { subject, html, text };
  }

  // en
  const subject = `Order ${data.orderNumber} confirmed`;
  const html = shell(
    s.brand,
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Thanks for your order</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} your order <strong>#${escapeHtml(data.orderNumber)}</strong> is confirmed. We'll send a shipping update once it leaves the warehouse.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    ${itemsHtml}
    <tr><td colspan="3" style="border-top:1px solid #eeeef0;padding-top:12px;margin-top:8px;font-size:14px;font-weight:600;color:#1d1d1f;">Total</td>
    <td style="border-top:1px solid #eeeef0;padding-top:12px;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;">${escapeHtml(data.totalFormatted)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, 'View order details')}
</td></tr>`,
    s.footerReason,
    locale,
  );
  const text = `Thanks for your order

Order: ${data.orderNumber}
${data.items.map((it) => `- ${it.name} × ${it.quantity} — ${it.priceFormatted}`).join('\n')}
Total: ${data.totalFormatted}

View order: ${data.siteUrl}/orders`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 2. Shipment notification
// ---------------------------------------------------------------

export function shipmentNotification(
  data: ShipmentNotificationData,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = data.locale ?? 'zh';
  const s = locale === 'zh' ? ZH : EN;
  const greeting = s.greeting(data.customerName);

  if (locale === 'zh') {
    const trackingBlock =
      data.trackingUrl && data.trackingNumber
        ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${data.carrier ? escapeHtml(data.carrier) + ' · ' : ''}物流单号:<a href="${escapeHtml(data.trackingUrl)}" style="color:#1d1d1f;">${escapeHtml(data.trackingNumber)}</a></p>`
        : '';
    const subject = `您的订单 ${data.orderNumber} 已发货`;
    const html = shell(
      s.brand,
      subject,
      `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">您的订单已发货</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting}订单 <strong>#${escapeHtml(data.orderNumber)}</strong> 已从仓库发出,正在派送中。</p>
  ${trackingBlock}
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, '查看物流详情')}
</td></tr>`,
      s.footerReason,
      locale,
    );
    const text =
      `您的订单 ${data.orderNumber} 已发货\n` +
      (data.carrier ? `${data.carrier}\n` : '') +
      (data.trackingNumber ? `物流单号:${data.trackingNumber}\n` : '') +
      (data.trackingUrl ? `${data.trackingUrl}\n` : '') +
      `\n查看物流:${data.siteUrl}/orders`;
    return { subject, html, text };
  }

  // en
  const trackingBlock =
    data.trackingUrl && data.trackingNumber
      ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${data.carrier ? escapeHtml(data.carrier) + ' • ' : ''}Tracking: <a href="${escapeHtml(data.trackingUrl)}" style="color:#1d1d1f;">${escapeHtml(data.trackingNumber)}</a></p>`
      : '';
  const subject = `Your order ${data.orderNumber} has shipped`;
  const html = shell(
    s.brand,
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Your order is on its way</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} order <strong>#${escapeHtml(data.orderNumber)}</strong> has shipped.</p>
  ${trackingBlock}
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, 'Track your order')}
</td></tr>`,
    s.footerReason,
    locale,
  );
  const text =
    `Your order ${data.orderNumber} has shipped.\n` +
    (data.carrier ? data.carrier + '\n' : '') +
    (data.trackingNumber ? `Tracking: ${data.trackingNumber}\n` : '') +
    (data.trackingUrl ? `${data.trackingUrl}\n` : '') +
    `\nTrack: ${data.siteUrl}/orders`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 3. Password reset
// ---------------------------------------------------------------

export function passwordReset(
  data: PasswordResetData,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = data.locale ?? 'zh';
  const s = locale === 'zh' ? ZH : EN;
  const greeting = s.greeting(data.customerName);
  const expires = data.expiresInMinutes ?? 60;

  if (locale === 'zh') {
    const subject = '重置您的密码';
    const html = shell(
      s.brand,
      subject,
      `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">重置您的密码</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting}我们收到了您重置账户密码的请求。点击下方按钮设置新密码。</p>
  <p style="margin:12px 0 0 0;font-size:13px;color:#8a8a8e;">链接 ${expires} 分钟内有效。如非本人操作,请直接忽略本邮件。</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(data.resetUrl, '重置密码')}
</td></tr>`,
      s.footerReason,
      locale,
    );
    const text =
      `重置您的密码\n\n点击下方链接设置新密码(${expires} 分钟内有效):\n${data.resetUrl}\n\n如非本人操作,请直接忽略本邮件。`;
    return { subject, html, text };
  }

  // en
  const subject = 'Reset your password';
  const html = shell(
    s.brand,
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Reset your password</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} we received a request to reset the password for your account. Click the button below to choose a new one.</p>
  <p style="margin:12px 0 0 0;font-size:13px;color:#8a8a8e;">This link expires in ${expires} minutes. If you didn't request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(data.resetUrl, 'Reset password')}
</td></tr>`,
    s.footerReason,
    locale,
  );
  const text = `Reset your password

Open this link to choose a new password (expires in ${expires} minutes):
${data.resetUrl}

If you didn't request this, you can safely ignore this email.`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 4. Welcome
// ---------------------------------------------------------------

export function welcome(
  data: WelcomeData,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = data.locale ?? 'zh';
  const s = locale === 'zh' ? ZH : EN;
  const greeting = s.greeting(data.customerName);

  if (locale === 'zh') {
    const subject = '欢迎加入 Peak Mall';
    const html = shell(
      s.brand,
      subject,
      `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">欢迎加入 Peak Mall</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting}您的账户已创建完成。浏览我们的新品上架,获取个性化推荐。</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/`, '开始购物')}
</td></tr>`,
      s.footerReason,
      locale,
    );
    const text = `欢迎加入 Peak Mall\n\n您的账户已就绪。开始购物:${data.siteUrl}/`;
    return { subject, html, text };
  }

  // en
  const subject = 'Welcome to Peak Mall';
  const html = shell(
    s.brand,
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Welcome to Peak Mall</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} your account is ready. Browse our latest arrivals and complete your profile to get personalized recommendations.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/`, 'Start shopping')}
</td></tr>`,
    s.footerReason,
    locale,
  );
  const text = `Welcome to Peak Mall\n\nYour account is ready. Start shopping: ${data.siteUrl}/`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 5. Refund notification
// ---------------------------------------------------------------

export function refundNotification(
  data: RefundNotificationData,
): { subject: string; html: string; text: string } {
  const locale: EmailLocale = data.locale ?? 'zh';
  const s = locale === 'zh' ? ZH : EN;
  const greeting = s.greeting(data.customerName);

  if (locale === 'zh') {
    const reasonLine = data.reason
      ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">退款原因:${escapeHtml(data.reason)}</p>`
      : '';
    const subject = `订单 ${data.orderNumber} 已退款`;
    const html = shell(
      s.brand,
      subject,
      `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">您的退款已发起</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting}订单 <strong>#${escapeHtml(data.orderNumber)}</strong> 已退款 <strong>${escapeHtml(data.refundAmountFormatted)}</strong>${data.currency ? ' ' + escapeHtml(data.currency) : ''}。</p>
  ${reasonLine}
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">根据银行处理时效,资金一般 5–10 个工作日到账。</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, '查看订单详情')}
</td></tr>`,
      s.footerReason,
      locale,
    );
    const text =
      `您的退款已发起\n\n订单号:${data.orderNumber}\n退款金额:${data.refundAmountFormatted}${data.currency ? ' ' + data.currency : ''}\n` +
      (data.reason ? `退款原因:${data.reason}\n` : '') +
      `\n资金一般 5–10 个工作日到账。\n\n查看订单:${data.siteUrl}/orders`;
    return { subject, html, text };
  }

  // en
  const reasonLine = data.reason
    ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">Reason: ${escapeHtml(data.reason)}</p>`
    : '';
  const subject = `Refund issued for order ${data.orderNumber}`;
  const html = shell(
    s.brand,
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Your refund is on its way</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} we've issued a refund of <strong>${escapeHtml(data.refundAmountFormatted)}</strong>${data.currency ? ' ' + escapeHtml(data.currency) : ''} for order <strong>#${escapeHtml(data.orderNumber)}</strong>.</p>
  ${reasonLine}
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">Depending on your bank, the funds typically arrive within 5–10 business days.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, 'View order details')}
</td></tr>`,
    s.footerReason,
    locale,
  );
  const text =
    `Your refund is on its way\n\nOrder: ${data.orderNumber}\nRefund amount: ${data.refundAmountFormatted}${data.currency ? ' ' + data.currency : ''}\n` +
    (data.reason ? `Reason: ${data.reason}\n` : '') +
    `\nFunds typically arrive within 5–10 business days.\n\nView order: ${data.siteUrl}/orders`;
  return { subject, html, text };
}