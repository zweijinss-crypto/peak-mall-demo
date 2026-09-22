import { orderConfirmation, shipmentNotification, passwordReset, welcome, refundNotification } from '../src/lib/email/templates.ts';

const tests = [];

function t(name, fn) {
  try {
    fn();
    tests.push({ name, ok: true });
  } catch (e) {
    tests.push({ name, ok: false, err: e.message });
  }
}

function assertContains(haystack, needle, label) {
  if (!haystack.includes(needle)) {
    throw new Error(`${label}: expected "${needle}" in:\n${haystack.slice(0, 200)}...`);
  }
}

function assertNotContains(haystack, needle, label) {
  if (haystack.includes(needle)) {
    throw new Error(`${label}: did NOT expect "${needle}" in:\n${haystack.slice(0, 200)}...`);
  }
}

const ZH = 'zh';
const EN = 'en';

t('orderConfirmation zh subject', () => {
  const r = orderConfirmation({ orderNumber: 'O001', items: [{name:'A',quantity:1,priceFormatted:'$10'}], totalFormatted: '$10', siteUrl: 'http://x', locale: ZH });
  assertContains(r.subject, '已确认', 'subject');
  assertContains(r.html, '感谢您的订单', 'html');
  assertNotContains(r.html, 'Thanks for your order', 'no english leakage');
  assertContains(r.html, 'lang="zh-CN"', 'html lang attr');
});
t('orderConfirmation en subject', () => {
  const r = orderConfirmation({ orderNumber: 'O001', items: [{name:'A',quantity:1,priceFormatted:'$10'}], totalFormatted: '$10', siteUrl: 'http://x', locale: EN });
  assertContains(r.subject, 'confirmed', 'subject');
  assertContains(r.html, 'Thanks for your order', 'html');
  assertNotContains(r.html, '感谢您的订单', 'no zh leakage');
  assertContains(r.html, 'lang="en"', 'html lang attr');
});
t('orderConfirmation default = zh', () => {
  const r = orderConfirmation({ orderNumber: 'O001', items: [{name:'A',quantity:1,priceFormatted:'$10'}], totalFormatted: '$10', siteUrl: 'http://x' });
  assertContains(r.subject, '已确认', 'default subject');
});
t('shipmentNotification zh+en', () => {
  const zh = shipmentNotification({ orderNumber: 'O001', siteUrl: 'http://x', locale: ZH });
  assertContains(zh.subject, '已发货', 'zh subject');
  const en = shipmentNotification({ orderNumber: 'O001', siteUrl: 'http://x', locale: EN });
  assertContains(en.subject, 'shipped', 'en subject');
});
t('passwordReset zh+en', () => {
  const zh = passwordReset({ resetUrl: 'http://x', locale: ZH });
  assertContains(zh.html, '重置您的密码', 'zh html');
  const en = passwordReset({ resetUrl: 'http://x', locale: EN });
  assertContains(en.html, 'Reset your password', 'en html');
});
t('welcome zh+en', () => {
  const zh = welcome({ siteUrl: 'http://x', locale: ZH });
  assertContains(zh.html, '欢迎加入', 'zh html');
  const en = welcome({ siteUrl: 'http://x', locale: EN });
  assertContains(en.html, 'Welcome', 'en html');
});
t('refundNotification zh+en', () => {
  const zh = refundNotification({ orderNumber: 'O001', refundAmountFormatted: '$10', siteUrl: 'http://x', locale: ZH });
  assertContains(zh.subject, '已退款', 'zh subject');
  const en = refundNotification({ orderNumber: 'O001', refundAmountFormatted: '$10', siteUrl: 'http://x', locale: EN });
  assertContains(en.subject, 'Refund', 'en subject');
});
t('customerName greeting renders', () => {
  const zh = orderConfirmation({ orderNumber: 'O001', items: [], totalFormatted: '$0', siteUrl: 'http://x', customerName: '张三', locale: ZH });
  assertContains(zh.html, '张三,您好', 'zh greeting');
  const en = orderConfirmation({ orderNumber: 'O001', items: [], totalFormatted: '$0', siteUrl: 'http://x', customerName: 'Alice', locale: EN });
  assertContains(en.html, 'Hi Alice', 'en greeting');
});

let failed = 0;
for (const t of tests) {
  console.log(`${t.ok ? '✅' : '❌'} ${t.name}${t.err ? ' — ' + t.err : ''}`);
  if (!t.ok) failed++;
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
