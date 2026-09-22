/**
 * email/templates — HTML + plain-text templates for transactional mail.
 *
 * Hand-rolled (no React Email dep) to keep the client bundle clean —
 * templates are server-side only and ship in netlify functions.
 *
 * All templates accept a minimal data shape so callers don't need to
 * import the full Supabase/Stripe row types.
 */

export interface OrderConfirmationData {
  orderNumber: string;
  customerName?: string;
  items: Array<{ name: string; quantity: number; priceFormatted: string }>;
  totalFormatted: string;
  siteUrl: string;
  currency?: string;
}

export interface ShipmentNotificationData {
  orderNumber: string;
  customerName?: string;
  carrier?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  siteUrl: string;
}

export interface PasswordResetData {
  customerName?: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export interface WelcomeData {
  customerName?: string;
  siteUrl: string;
}

export interface RefundNotificationData {
  orderNumber: string;
  customerName?: string;
  refundAmountFormatted: string;
  currency?: string;
  reason?: string;
  siteUrl: string;
}

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
): string {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(previewText)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1d1d1f;">
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
      You received this email because you have an account at ${escapeHtml(brand)}.
      If you believe this was sent in error, please contact support.
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
  const greeting = data.customerName ? `Hi ${escapeHtml(data.customerName)},` : 'Hi,';
  const itemsHtml = data.items
    .map(
      (it) => `<tr>
  <td style="padding:8px 0;font-size:14px;color:#1d1d1f;">${escapeHtml(it.name)}</td>
  <td style="padding:8px 0;font-size:14px;color:#6b6b70;text-align:right;">× ${it.quantity}</td>
  <td style="padding:8px 0;font-size:14px;color:#1d1d1f;text-align:right;">${escapeHtml(it.priceFormatted)}</td>
</tr>`,
    )
    .join('');
  const subject = `Order ${data.orderNumber} confirmed`;
  const html = shell(
    'Peak Mall',
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Thanks for your order</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} your order <strong>#${escapeHtml(data.orderNumber)}</strong> is confirmed. We'll send a shipping update once it leaves the warehouse.</p>
</td></tr>
<tr><td style="padding:0 36px 8px 36px;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    ${itemsHtml}
    <tr><td colspan="3" style="border-top:1px solid #eeeef0;padding-top:12px;margin-top:8px;font-size:14px;font-weight:600;color:#1d1d1f;">Total</td>
    <td style="border-top:1px solid #eeeef0;padding-top:12px;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;">${escapeHtml(data.totalFormatted)}</td></tr>
  </table>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, 'View order details')}
</td></tr>`,
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
  const greeting = data.customerName ? `Hi ${escapeHtml(data.customerName)},` : 'Hi,';
  const trackingBlock =
    data.trackingUrl && data.trackingNumber
      ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${data.carrier ? escapeHtml(data.carrier) + ' • ' : ''}Tracking: <a href="${escapeHtml(data.trackingUrl)}" style="color:#1d1d1f;">${escapeHtml(data.trackingNumber)}</a></p>`
      : '';
  const subject = `Your order ${data.orderNumber} has shipped`;
  const html = shell(
    'Peak Mall',
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Your order is on its way</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} order <strong>#${escapeHtml(data.orderNumber)}</strong> has shipped.</p>
  ${trackingBlock}
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/orders`, 'Track your order')}
</td></tr>`,
  );
  const text = `Your order ${data.orderNumber} has shipped.
${data.carrier ? data.carrier + '\n' : ''}${data.trackingNumber ? `Tracking: ${data.trackingNumber}` : ''}
${data.trackingUrl ?? ''}

Track: ${data.siteUrl}/orders`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 3. Password reset
// ---------------------------------------------------------------

export function passwordReset(
  data: PasswordResetData,
): { subject: string; html: string; text: string } {
  const greeting = data.customerName ? `Hi ${escapeHtml(data.customerName)},` : 'Hi,';
  const expires = data.expiresInMinutes ?? 60;
  const subject = 'Reset your password';
  const html = shell(
    'Peak Mall',
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Reset your password</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} we received a request to reset the password for your account. Click the button below to choose a new one.</p>
  <p style="margin:12px 0 0 0;font-size:13px;color:#8a8a8e;">This link expires in ${expires} minutes. If you didn't request this, you can safely ignore this email.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(data.resetUrl, 'Reset password')}
</td></tr>`,
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
  const greeting = data.customerName ? `Hi ${escapeHtml(data.customerName)},` : 'Hi,';
  const subject = 'Welcome to Peak Mall';
  const html = shell(
    'Peak Mall',
    subject,
    `<tr><td style="padding:16px 36px 8px 36px;">
  <h1 style="margin:0;font-size:22px;line-height:1.3;color:#1d1d1f;">Welcome to Peak Mall</h1>
  <p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">${greeting} your account is ready. Browse our latest arrivals and complete your profile to get personalized recommendations.</p>
</td></tr>
<tr><td style="padding:0 36px 16px 36px;">
  ${ctaButton(`${data.siteUrl}/`, 'Start shopping')}
</td></tr>`,
  );
  const text = `Welcome to Peak Mall

Your account is ready. Start shopping: ${data.siteUrl}/`;
  return { subject, html, text };
}

// ---------------------------------------------------------------
// 5. Refund notification (Phase 2.4)
// ---------------------------------------------------------------

export function refundNotification(
  data: RefundNotificationData,
): { subject: string; html: string; text: string } {
  const greeting = data.customerName ? `Hi ${escapeHtml(data.customerName)},` : 'Hi,';
  const reasonLine = data.reason
    ? `<p style="margin:8px 0 0 0;font-size:14px;line-height:1.6;color:#6b6b70;">Reason: ${escapeHtml(data.reason)}</p>`
    : '';
  const subject = `Refund issued for order ${data.orderNumber}`;
  const html = shell(
    'Peak Mall',
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
  );
  const text = `Your refund is on its way

Order: ${data.orderNumber}
Refund amount: ${data.refundAmountFormatted}${data.currency ? ' ' + data.currency : ''}
${data.reason ? 'Reason: ' + data.reason + '\n' : ''}
Funds typically arrive within 5–10 business days.

View order: ${data.siteUrl}/orders`;
  return { subject, html, text };
}