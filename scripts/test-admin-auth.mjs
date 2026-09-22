import { login, isAuthed } from '../src/lib/admin/auth.ts';

const tests = [];
function t(name, fn) {
  try { fn(); tests.push({ name, ok: true }); }
  catch (e) { tests.push({ name, ok: false, err: e.message }); }
}

// Static checks via fresh import — if exports are gone, the module
// will throw on import with a clear message.
// (We've already imported login/isAuthed above, so if those resolved
// the module is loadable.)

t('DEMO_USERNAME no longer in module exports', async () => {
  const mod = await import('../src/lib/admin/auth.ts');
  if ('DEMO_USERNAME' in mod) throw new Error(`DEMO_USERNAME still exported: ${mod.DEMO_USERNAME}`);
});
t('DEMO_PASSWORD no longer in module exports', async () => {
  const mod = await import('../src/lib/admin/auth.ts');
  if ('DEMO_PASSWORD' in mod) throw new Error(`DEMO_PASSWORD still exported: ${mod.DEMO_PASSWORD}`);
});

t('isAuthed returns true in demo mode (by design fast-path)', () => {
  globalThis.localStorage = { _s:{}, getItem(k){return this._s[k]??null;}, setItem(k,v){this._s[k]=String(v);}, removeItem(k){delete this._s[k];} };
  globalThis.window = { localStorage: globalThis.localStorage };
  // No Supabase env → demo mode short-circuit returns true so deep-
  // links like /admin/mfa don't bounce. Real auth gate is login()
  // returning NOT_CONFIGURED + AdminLayout's Supabase branch.
  if (!isAuthed()) throw new Error('isAuthed should be true in demo mode (no Supabase env)');
});

t('login without Supabase returns NOT_CONFIGURED', async () => {
  const r = await login('admin', 'abc123');
  if (r.ok) throw new Error('login should fail without Supabase');
  if (r.error !== 'NOT_CONFIGURED') throw new Error(`Expected NOT_CONFIGURED, got ${r.error}`);
});

t('login with empty fields returns MISSING_FIELDS', async () => {
  const r = await login('', '');
  if (r.error !== 'MISSING_FIELDS') throw new Error(`Expected MISSING_FIELDS, got ${r.error}`);
});

let failed = 0;
for (const t of tests) {
  console.log(`${t.ok ? '✅' : '❌'} ${t.name}${t.err ? ' — ' + t.err : ''}`);
  if (!t.ok) failed++;
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
process.exit(failed ? 1 : 0);