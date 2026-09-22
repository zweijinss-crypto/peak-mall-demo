import { getFundPassword, setFundPassword, verifyFundPassword, resetFundPasswordForTest, FUND_PASSWORD_DEFAULT } from '../src/lib/fund-password.ts';

const tests = [];
function t(name, fn) {
  try { fn(); tests.push({ name, ok: true }); }
  catch (e) { tests.push({ name, ok: false, err: e.message }); }
}
function eq(a, b) { if (a !== b) throw new Error(`${a} !== ${b}`); }

// 模拟 localStorage
globalThis.localStorage = {
  _store: {},
  getItem(k) { return this._store[k] ?? null; },
  setItem(k, v) { this._store[k] = String(v); },
  removeItem(k) { delete this._store[k]; },
};
globalThis.window = { localStorage: globalThis.localStorage };

t('default before set', () => eq(getFundPassword(), '123456'));
t('default matches FUND_PASSWORD_DEFAULT', () => eq(FUND_PASSWORD_DEFAULT, '123456'));
t('set valid', () => {
  const r = setFundPassword('654321');
  eq(r.ok, true);
  eq(getFundPassword(), '654321');
});
t('verify correct', () => eq(verifyFundPassword('654321'), true));
t('verify wrong', () => eq(verifyFundPassword('000000'), false));
t('set invalid (5 digits)', () => {
  const r = setFundPassword('12345');
  eq(r.ok, false);
  eq(r.error, 'INVALID_FORMAT');
});
t('set invalid (letters)', () => {
  const r = setFundPassword('abcdef');
  eq(r.ok, false);
});
t('set invalid (7 digits)', () => {
  const r = setFundPassword('1234567');
  eq(r.ok, false);
});
t('reset works', () => {
  resetFundPasswordForTest();
  eq(getFundPassword(), '123456');
});

let failed = 0;
for (const t of tests) {
  console.log(`${t.ok ? '✅' : '❌'} ${t.name}${t.err ? ' — ' + t.err : ''}`);
  if (!t.ok) failed++;
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);
