import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';

export default function PasswordRecoveryPage({ reset = false }: { reset?: boolean }) {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [developmentResetUrl, setDevelopmentResetUrl] = useState('');
  useEffect(() => { const controller = new AbortController(); api.get<AppConfig>('/config', { signal: controller.signal }).then(setConfig).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setMessage('');
    if (reset && password !== confirmation) { setError('Passwords do not match.'); return; }
    setBusy(true);
    try {
      const result = await api.post<{ message: string; developmentResetUrl?: string }>(reset ? '/auth/reset-password' : '/auth/forgot-password', reset ? { token: params.get('token'), password } : { email: email.trim() });
      setMessage(result.message); setDevelopmentResetUrl(result.developmentResetUrl || ''); setPassword(''); setConfirmation('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(false); }
  }
  return <PublicLayout title={reset ? 'Choose a new password' : 'Reset your password'}><div className="card max-w-md p-7">
    {config && !config.email.configured && <p className="text-sm text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-lg mb-5">{config.billing.developmentMode ? 'Local development recovery: a one-time reset link is displayed here instead of being emailed. This is disabled in production.' : 'Password recovery email is not available on this deployment. You can change your password in Settings while signed in. The operator must connect an email service before recovery emails can be sent.'}</p>}
    {reset && !params.get('token') && <p role="alert" className="text-red-600 mb-4">The reset link is missing its token. Open the full link from your recovery email.</p>}
    <form onSubmit={submit} className="space-y-5">
      {reset ? <><label className="block"><span className="label">New password</span><input className="input" type="password" minLength={8} maxLength={100} required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></label><label className="block"><span className="label">Confirm new password</span><input className="input" type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /></label></> : <label className="block"><span className="label">Account email</span><input className="input" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></label>}
      <button disabled={busy || (!config?.email.configured && !config?.billing.developmentMode) || (reset && !params.get('token'))} className="btn-primary w-full">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{reset ? 'Update password' : config?.billing.developmentMode ? 'Create local recovery link' : 'Send recovery email'}</button>
    </form>
    {error && <p role="alert" className="text-sm text-red-600 mt-4">{error}</p>}{message && <p role="status" className="text-sm text-green-700 mt-4">{message}</p>}
    {developmentResetUrl && <div className="mt-5 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-4"><p className="text-xs text-amber-700 dark:text-amber-300 mb-2">Development only · single-use link</p><Link to={new URL(developmentResetUrl, window.location.origin).pathname + new URL(developmentResetUrl, window.location.origin).search} className="btn-secondary">Open local reset page</Link></div>}
    <Link to="/login" className="text-sm text-blue-600 inline-block mt-6">Back to log in</Link>
  </div></PublicLayout>;
}
