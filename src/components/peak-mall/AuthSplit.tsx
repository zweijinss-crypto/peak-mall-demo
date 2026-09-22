import { useState, useId, type FC, type ReactNode, type FormEvent, type ReactElement, isValidElement, cloneElement } from 'react';
import Link from 'next/link';
import { useT } from '@/lib/use-t';

/**
 * Phase 2.5 — current Terms of Service / Privacy Policy version
 * string. Bump when the documents change materially so the audit
 * trail on users.terms_accepted_version / privacy_accepted_version
 * tells us which document each user agreed to.
 */
const LEGAL_DOC_VERSION = '2026-09-22';

export interface AuthI18n {
  hero: string;
  loginTitle: string;
  registerTitle: string;
  email: string;
  emailPh: string;
  password: string;
  passwordPh: string;
  password2: string;
  password2Ph: string;
  nickname: string;
  nicknamePh: string;
  invite: string;
  invitePh: string;
  remember: string;
  login: string;
  register: string;
  pwMismatch: string;
  errGeneric: string;
  /** Phase 2.5 — terms + privacy consent (label text + inline links). */
  consentLabel: string;
  termsLinkText: string;
  privacyLinkText: string;
  consentRequired: string;
}

export interface LoginPayload {
  email: string;
  password: string;
  remember: boolean;
}

export interface RegisterPayload {
  email: string;
  nickname: string;
  password: string;
  password2: string;
  inviteCode: string;
}

export interface AuthResult {
  ok: boolean;
  error?: string;
}

export interface AuthSplitProps {
  onLogin?: (p: LoginPayload) => Promise<AuthResult | void>;
  onRegister?: (
    p: RegisterPayload & { consent: ConsentPayload },
  ) => Promise<AuthResult | void>;
  /** 是否显示邀请码字段(默认 false,业务建议邀请码可选) */
  requireInvite?: boolean;
  i18n?: AuthI18n;
}

/** Phase 2.5 — what the caller records on the user record at signup. */
export interface ConsentPayload {
  termsAcceptedAt: string; // ISO-8601
  privacyAcceptedAt: string; // ISO-8601
  termsVersion: string;
  privacyVersion: string;
}

function buildI18n(t: ReturnType<typeof useT>): AuthI18n {
  // Use the long-form keys (loginTitle / emailLabel / submitLogin) when
  // present, otherwise fall back to the short keys shared by both locales.
  const a = t.auth as Record<string, unknown>;
  const pick = (long: string, short: string) =>
    typeof a[long] === 'string' ? (a[long] as string) : (a[short] as string);
  return {
    hero: pick('hero', 'hero'),
    loginTitle: pick('loginTitle', 'login'),
    registerTitle: pick('registerTitle', 'register'),
    email: pick('emailLabel', 'email'),
    emailPh: pick('emailPh', 'emailPh'),
    password: pick('passwordLabel', 'password'),
    passwordPh: pick('passwordPh', 'passwordPh'),
    password2: pick('password2', 'password2'),
    password2Ph: pick('password2Ph', 'password2Ph'),
    nickname: pick('nicknameLabel', 'nickname'),
    nicknamePh: pick('nicknamePh', 'nicknamePh'),
    invite: pick('invite', 'invite'),
    invitePh: pick('invitePh', 'invitePh'),
    remember: pick('rememberMe', 'remember'),
    login: pick('submitLogin', 'login'),
    register: pick('submitRegister', 'register'),
    pwMismatch: pick('pwMismatch', 'pwMismatch'),
    errGeneric: pick('errGeneric', 'errGeneric'),
    consentLabel:
      (a.consentLabel as string) ??
      'I agree to the Terms of Service and Privacy Policy.',
    termsLinkText:
      (a.termsLinkText as string) ?? 'Terms of Service',
    privacyLinkText:
      (a.privacyLinkText as string) ?? 'Privacy Policy',
    consentRequired:
      (a.consentRequired as string) ??
      'Please agree to the Terms and Privacy Policy to continue.',
  };
}

const inputCls =
  'w-full px-3 py-2.5 border border-neutral-200 rounded-md text-[14px] outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100';

/**
 * AuthSplit - 双栏登录/注册 (参考源站 .auth-split)
 *
 * 业务说明:
 * - 不做强制邀请码 (requireInvite=false 是默认,且建议保持 false)
 * - onLogin / onRegister 由调用方传,可以接 next-auth / 自建 API
 */
const AuthSplit: FC<AuthSplitProps> = ({
  onLogin,
  onRegister,
  requireInvite = false,
  i18n,
}) => {
  const t = useT();
  const resolved = i18n ?? buildI18n(t);
  return (
    <>
      <div className="text-center py-9">
        <h1 className="text-[27px] font-bold text-neutral-800 tracking-wide">
          {resolved.hero}
        </h1>
      </div>
      <div className="max-w-[1280px] mx-auto px-5 pb-16">
        <div className="flex flex-col md:flex-row md:justify-center items-stretch gap-0">
          <LoginPanel onLogin={onLogin} i18n={resolved ?? buildI18n(t)} />
          <div className="hidden md:block w-px bg-neutral-200 self-stretch mx-8" />
          <RegisterPanel
            onRegister={onRegister}
            requireInvite={requireInvite}
            i18n={resolved ?? buildI18n(t)}
          />
        </div>
      </div>
    </>
  );
};

interface LoginPanelProps {
  onLogin?: AuthSplitProps['onLogin'];
  i18n: AuthI18n;
}

const LoginPanel: FC<LoginPanelProps> = ({ onLogin, i18n }) => {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [rem, setRem] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const loginMsgId = 'auth-login-msg';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await onLogin?.({ email: u, password: p, remember: rem });
      if (r && !r.ok) setMsg(r.error || i18n.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full md:w-[376px] bg-white rounded-lg overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-3.5 text-[14px] font-bold text-neutral-700">
        {i18n.loginTitle}
      </div>
      <form onSubmit={submit} className="p-6" noValidate>
        <Field label={i18n.email} required>
          <input
            id="auth-login-email"
            type="email" value={u} onChange={(e) => setU(e.target.value)}
            placeholder={i18n.emailPh} autoComplete="username"
            aria-invalid={msg ? true : undefined}
            aria-describedby={msg ? loginMsgId : undefined}
            className={inputCls}
          />
        </Field>
        <Field label={i18n.password} required>
          <input
            id="auth-login-password"
            type="password" value={p} onChange={(e) => setP(e.target.value)}
            placeholder={i18n.passwordPh} autoComplete="current-password"
            aria-invalid={msg ? true : undefined}
            aria-describedby={msg ? loginMsgId : undefined}
            className={inputCls}
          />
        </Field>
        <label className="flex items-center gap-3 text-[13px] text-neutral-700 -mt-1 mb-4 cursor-pointer min-h-[28px] py-1">
          <input type="checkbox" checked={rem} onChange={(e) => setRem(e.target.checked)} className="w-6 h-6 accent-orange-700 cursor-pointer shrink-0 m-1" />
          {i18n.remember}
        </label>
        <button
          type="submit" disabled={busy}
          className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white border border-orange-700 hover:border-orange-800 text-[14.5px] font-bold tracking-wide rounded transition-colors disabled:opacity-60"
        >
          {busy ? '...' : i18n.login}
        </button>
        {msg && <div id={loginMsgId} role="alert" className="mt-3.5 px-3 py-2.5 rounded text-[13px] bg-rose-50 text-rose-600">{msg}</div>}
      </form>
    </div>
  );
};

interface RegisterPanelProps {
  onRegister?: AuthSplitProps['onRegister'];
  requireInvite: boolean;
  i18n: AuthI18n;
}

const RegisterPanel: FC<RegisterPanelProps> = ({ onRegister, requireInvite, i18n }) => {
  const [email, setEmail] = useState('');
  const [nick, setNick] = useState('');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [invite, setInvite] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  // Phase 2.5 — terms + privacy consent. Required to submit.
  const [consent, setConsent] = useState(false);
  const regMsgId = 'auth-register-msg';
  const consentId = 'auth-register-consent';

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (p1 !== p2) {
      setMsg(i18n.pwMismatch);
      return;
    }
    if (!consent) {
      setMsg(i18n.consentRequired);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const now = new Date().toISOString();
      const r = await onRegister?.({
        email,
        nickname: nick,
        password: p1,
        password2: p2,
        inviteCode: invite,
        consent: {
          termsAcceptedAt: now,
          privacyAcceptedAt: now,
          termsVersion: LEGAL_DOC_VERSION,
          privacyVersion: LEGAL_DOC_VERSION,
        },
      });
      if (r && !r.ok) setMsg(r.error || i18n.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full md:w-[376px] bg-white rounded-lg overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
      <div className="bg-neutral-50 border-b border-neutral-100 px-5 py-3.5 text-[14px] font-bold text-neutral-700">
        {i18n.registerTitle}
      </div>
      <form onSubmit={submit} className="p-6" noValidate>
        <Field label={i18n.email} required>
          <input id="auth-register-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={i18n.emailPh} autoComplete="email" aria-invalid={msg ? true : undefined} aria-describedby={msg ? regMsgId : undefined} className={inputCls} />
        </Field>
        <Field label={i18n.nickname}>
          <input id="auth-register-nickname" value={nick} onChange={(e) => setNick(e.target.value)} placeholder={i18n.nicknamePh} className={inputCls} />
        </Field>
        <Field label={i18n.password} required>
          <input id="auth-register-password" type="password" value={p1} onChange={(e) => setP1(e.target.value)} placeholder={i18n.passwordPh} autoComplete="new-password" aria-invalid={msg ? true : undefined} aria-describedby={msg ? regMsgId : undefined} className={inputCls} />
        </Field>
        <Field label={i18n.password2} required>
          <input id="auth-register-password2" type="password" value={p2} onChange={(e) => setP2(e.target.value)} placeholder={i18n.password2Ph} autoComplete="new-password" aria-invalid={msg ? true : undefined} aria-describedby={msg ? regMsgId : undefined} className={inputCls} />
        </Field>
        {requireInvite && (
          <Field label={i18n.invite} required>
            <input id="auth-register-invite" value={invite} onChange={(e) => setInvite(e.target.value)} placeholder={i18n.invitePh} className={inputCls} />
          </Field>
        )}
        {/* Phase 2.5 — Terms + Privacy consent. Required to enable submit. */}
        <label htmlFor={consentId} className="flex items-start gap-2.5 text-[12.5px] text-neutral-700 mb-4 cursor-pointer leading-relaxed min-h-[28px] py-1">
          <input
            id={consentId}
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            aria-required="true"
            aria-invalid={msg === i18n.consentRequired ? true : undefined}
            aria-describedby={msg === i18n.consentRequired ? regMsgId : undefined}
            className="w-5 h-5 mt-0.5 accent-orange-700 cursor-pointer shrink-0"
          />
          <span>
            {i18n.consentLabel.replace('{terms}', '').replace('{privacy}', '').trim()}
            {' '}
            <Link href="/terms" target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">{i18n.termsLinkText}</Link>
            {' '}
            {i18n.consentLabel.includes('和') ? '和' : '&'}
            {' '}
            <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="text-orange-700 hover:underline">{i18n.privacyLinkText}</Link>
          </span>
        </label>
        <button
          type="submit"
          disabled={busy || !consent}
          aria-disabled={busy || !consent}
          className="w-full py-3 bg-orange-700 hover:bg-orange-800 text-white border border-orange-700 hover:border-orange-800 text-[14.5px] font-bold tracking-wide rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? '...' : i18n.register}
        </button>
        {msg && <div id={regMsgId} role="alert" className="mt-3.5 px-3 py-2.5 rounded text-[13px] bg-rose-50 text-rose-600">{msg}</div>}
      </form>
    </div>
  );
};

interface FieldProps {
  label: string;
  required?: boolean;
  children: ReactNode;
}

const Field: FC<FieldProps> = ({ label, required, children }) => {
  // If the child input has an explicit id (preferred), wire htmlFor to it.
  // Otherwise auto-generate one so label and control are programmatically
  // associated — Lighthouse label-content-name-mismatch audit fails otherwise.
  const child = isValidElement(children) ? (children as ReactElement<{ id?: string }>) : null;
  const explicitId = child?.props.id;
  const reactId = useId();
  const inputId = explicitId ?? `auth-field-${reactId}`;
  return (
    <div className="mb-4.5">
      <label htmlFor={inputId} className="block text-[13px] text-neutral-600 mb-2 font-normal">
        {required && <span className="text-orange-700 mr-1 font-bold" aria-hidden="true">*</span>}
        {required && <span className="sr-only">(required)</span>}
        {label}
      </label>
      {child ? cloneElement(child, { id: inputId }) : children}
    </div>
  );
};

export default AuthSplit;
