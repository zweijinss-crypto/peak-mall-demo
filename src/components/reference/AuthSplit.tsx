import type { ReactNode } from 'react';
import { useT } from '@/lib/ref-translations.tsx';
// 红线: 已剔除「强制邀请码」字段。注册只剩 email/nickname/password/confirmPassword。
import type { AuthHandlers } from './types';

export type AuthSplitProps = AuthHandlers;

export default function AuthSplit({ onLogin, onRegister }: AuthSplitProps) {
  const { t } = useT();
  return (
    <div className="min-h-[100vh] flex flex-col items-center justify-center gap-5 py-9 px-4"
         style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 55%,#2563eb 100%)' }}>
      <div className="text-center text-white">
        <h1 className="text-[25px] tracking-wide font-bold">{t('auth.brandTitle')}</h1>
        <p className="text-[13px] text-white/60 mt-1.5">{t('auth.brandSubtitle')}</p>
      </div>

      <div className="flex gap-5 items-stretch justify-center flex-wrap">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            onLogin?.({ email: f.lg_u.value, password: f.lg_p.value, remember: f.lg_rem.checked });
          }}
          className="bg-white rounded-2xl p-7 w-[352px] shadow-[0_20px_60px_rgba(0,0,0,.28)] flex flex-col"
        >
          <h2 className="text-[21px] text-[var(--ref-gray-900)] mb-4">{t('auth.login.title')}</h2>
          <Field label={t('auth.field.email')} required>
            <input name="lg_u" type="email" placeholder={t('auth.placeholder.email')} autoComplete="username" required />
          </Field>
          <Field label={t('auth.field.password')} required>
            <input name="lg_p" type="password" placeholder={t('auth.placeholder.password')} autoComplete="current-password" required />
          </Field>
          <label className="flex items-center gap-2 text-[13px] text-[var(--ref-gray-700)] mb-4">
            <input name="lg_rem" type="checkbox" defaultChecked />
            {t('auth.remember')}
          </label>
          <button type="submit" className="bg-[var(--ref-primary)] text-white py-2.5 rounded-lg font-semibold hover:bg-[var(--ref-primary-d)] transition-colors">
            {t('auth.login.cta')}
          </button>
        </form>

        <div className="hidden md:block w-px bg-white/20" aria-hidden />

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            onRegister?.({ email: f.rg_u.value, nickname: f.rg_n.value, password: f.rg_p.value });
          }}
          className="bg-white rounded-2xl p-7 w-[352px] shadow-[0_20px_60px_rgba(0,0,0,.28)] flex flex-col"
        >
          <h2 className="text-[21px] text-[var(--ref-gray-900)] mb-4">{t('auth.register.title')}</h2>
          <Field label={t('auth.field.email')} required>
            <input name="rg_u" type="email" placeholder={t('auth.placeholder.email')} autoComplete="email" required />
          </Field>
          <Field label={t('auth.field.nickname')}>
            <input name="rg_n" placeholder={t('auth.placeholder.nickname')} />
          </Field>
          <Field label={t('auth.field.password')} required>
            <input name="rg_p" type="password" placeholder={t('auth.placeholder.passwordNew')} autoComplete="new-password" required minLength={6} />
          </Field>
          <Field label={t('auth.field.confirmPassword')} required>
            <input name="rg_p2" type="password" placeholder={t('auth.placeholder.passwordConfirm')} autoComplete="new-password" required minLength={6} />
          </Field>
          <button type="submit" className="bg-[var(--ref-primary)] text-white py-2.5 rounded-lg font-semibold hover:bg-[var(--ref-primary-d)] transition-colors">
            {t('auth.register.cta')}
          </button>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

function Field({ label, required, children }: FieldProps) {
  return (
    <div className="mb-4">
      <label className="block text-[12px] text-[var(--ref-gray-700)] mb-1.5 font-semibold">
        {required && <span className="text-[var(--ref-danger)] mr-0.5">*</span>}
        {label}
      </label>
      {children}
    </div>
  );
}