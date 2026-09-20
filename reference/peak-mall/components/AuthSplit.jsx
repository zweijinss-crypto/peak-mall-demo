// AuthSplit.jsx
// 登录/注册左右两列 — 原站 auth-split 结构
// 红线: 已剔除「强制邀请码」字段。注册只保留 email/nickname/password/confirmPassword。
// 注册成功后,业务侧自行决定是否提供「可选邀请码」(本组件不内置,避免 skill 红线 6)
// props: onLogin({email, password, remember}), onRegister({email, nickname, password})

export default function AuthSplit({ onLogin, onRegister }) {
  return (
    <div className="min-h-[100vh] flex flex-col items-center justify-center gap-5 py-9 px-4"
         style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%)' }}>
      <div className="text-center text-white">
        <h1 className="text-[25px] tracking-wide font-bold">{'__COPY_auth.brandTitle__'}</h1>
        <p className="text-[13px] text-white/60 mt-1.5">{'__COPY_auth.brandSubtitle__'}</p>
      </div>

      <div className="flex gap-5 items-stretch justify-center flex-wrap">
        {/* Login card */}
        <form
          onSubmit={(e) => { e.preventDefault(); onLogin?.({ email: e.target.lg_u.value, password: e.target.lg_p.value, remember: e.target.lg_rem.checked }); }}
          className="bg-white rounded-2xl p-7 w-[352px] shadow-[0_20px_60px_rgba(0,0,0,.28)] flex flex-col"
        >
          <h2 className="text-[21px] text-[var(--gray-900)] mb-4">{'__COPY_auth.login.title__'}</h2>
          <Field label={'__COPY_auth.field.email__'} required>
            <input name="lg_u" type="email" placeholder={'__COPY_auth.placeholder.email__'} autoComplete="username" required />
          </Field>
          <Field label={'__COPY_auth.field.password__'} required>
            <input name="lg_p" type="password" placeholder={'__COPY_auth.placeholder.password__'} autoComplete="current-password" required />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-[var(--gray-700)] mb-4">
            <input name="lg_rem" type="checkbox" defaultChecked />
            {'__COPY_auth.remember__'}
          </label>
          <button type="submit" className="bg-[var(--primary)] text-white py-2.5 rounded-lg font-semibold hover:bg-[var(--primary-d)] transition-colors">
            {'__COPY_auth.login.cta__'}
          </button>
        </form>

        <div className="hidden md:block w-px bg-white/20" aria-hidden />

        {/* 注册卡 — 已剔除强制邀请码字段(避免 skill 红线 6) */}
        <form
          onSubmit={(e) => { e.preventDefault(); onRegister?.({ email: e.target.rg_u.value, nickname: e.target.rg_n.value, password: e.target.rg_p.value }); }}
          className="bg-white rounded-2xl p-7 w-[352px] shadow-[0_20px_60px_rgba(0,0,0,.28)] flex flex-col"
        >
          <h2 className="text-[21px] text-[var(--gray-900)] mb-4">{'__COPY_auth.register.title__'}</h2>
          <Field label={'__COPY_auth.field.email__'} required>
            <input name="rg_u" type="email" placeholder={'__COPY_auth.placeholder.email__'} autoComplete="email" required />
          </Field>
          <Field label={'__COPY_auth.field.nickname__'}>
            <input name="rg_n" placeholder={'__COPY_auth.placeholder.nickname__'} />
          </Field>
          <Field label={'__COPY_auth.field.password__'} required>
            <input name="rg_p" type="password" placeholder={'__COPY_auth.placeholder.passwordNew__'} autoComplete="new-password" required minLength={6} />
          </Field>
          <Field label={'__COPY_auth.field.confirmPassword__'} required>
            <input name="rg_p2" type="password" placeholder={'__COPY_auth.placeholder.passwordConfirm__'} autoComplete="new-password" required minLength={6} />
          </Field>
          <button type="submit" className="bg-[var(--primary)] text-white py-2.5 rounded-lg font-semibold hover:bg-[var(--primary-d)] transition-colors">
            {'__COPY_auth.register.cta__'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] text-[var(--gray-700)] mb-1.5 font-semibold">
        {required && <span className="text-[var(--danger)] mr-0.5">*</span>}
        {label}
      </label>
      {children}
    </div>
  );
}