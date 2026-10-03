import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { User } from '../types/resume';

export default function PricingPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const { user, updateUser } = useAuth();
  const [switching, setSwitching] = useState('');
  const toast = useToast();
  async function openBilling(plan?: string) {
    setSwitching(plan || 'portal');
    try {
      const { url } = await api.post<{ url: string }>(plan ? '/billing/checkout' : '/billing/portal', plan ? { plan } : {});
      window.location.assign(url);
    } catch (e) { toast.error('Cannot open billing', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSwitching(''); }
  }
  async function previewPlan(plan: string) {
    setSwitching(plan);
    try { const { user: updated } = await api.post<{ user: User }>('/billing/development-plan', { plan }); updateUser(updated); toast.success(`Development preview: ${plan}`); }
    catch (e) { toast.error('Cannot change development plan', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSwitching(''); }
  }
  useEffect(() => { const controller = new AbortController(); api.get<AppConfig>('/config', { signal: controller.signal }).then(setConfig).catch(e => { if (!controller.signal.aborted) setError(e.message); }); return () => controller.abort(); }, []);
  return <PublicLayout title="Choose the plan that fits your applications" description="Your account limits are enforced by the service. You can build, save, and export resumes on the free plan.">
    {error ? <div className="card p-6 text-red-600" role="alert">{error}</div> : !config ? <Loader2 className="w-8 h-8 animate-spin text-blue-600 my-12" /> : <>
      <div className="card p-5 mb-8 flex items-start gap-3 border-blue-200"><CreditCard className="w-6 h-6 text-blue-600 shrink-0" /><div><h2 className="font-semibold mb-1">{config.billing.configured ? config.billing.testMode ? 'Test checkout — no real payments' : 'Secure checkout with Lemon Squeezy' : 'Paid subscriptions are not enabled'}</h2><p className="text-sm text-muted">{config.billing.configured ? 'Review the price and billing interval at checkout before confirming. Your plan updates after payment confirmation. Manage or cancel an existing subscription in the billing portal.' : 'Free accounts are available now. Paid upgrades will open when billing is ready.'}</p>{user && config.billing.configured && <button className="btn-secondary mt-3" disabled={!!switching} onClick={() => void openBilling()}>Manage subscription</button>}</div></div>
      {config.billing.developmentMode && <div className="card p-5 mb-8 border-amber-200"><h2 className="font-semibold mb-1">Local development preview</h2><p className="text-sm text-muted">You can test each plan on this local development server. This changes feature access without billing and is disabled in production.</p></div>}
      <div className="grid md:grid-cols-3 gap-6">{(['free', 'pro', 'premium'] as const).map(name => {
        const plan = config.plans[name];
        const limit = plan?.resumeLimit;
        return <article className={`card p-7 ${user?.plan === name ? 'ring-2 ring-blue-500' : ''}`} key={name}><h2 className="capitalize text-xl font-bold mb-2">{name}</h2><p className="text-3xl font-bold text-blue-600 mb-1">{name === 'free' ? 'Free' : config.billing.configured ? 'See checkout' : 'Coming soon'}</p><p className="text-xs text-muted mb-6">{user?.plan === name ? 'Your current plan' : name === 'free' ? 'No card required' : config.billing.configured ? 'Price and interval shown before payment' : 'Billing setup required'}</p>
          <ul className="space-y-3 text-sm mb-8">{[`${limit === null || limit === undefined ? 'Unlimited' : limit} saved resumes`, `${plan?.aiLimit ?? 0} successful AI requests per month`, `${plan?.templates.length || 0} professional templates`, plan?.docxExport ? 'PDF, DOCX and TXT export' : 'Selectable-text PDF and TXT export', plan?.advancedAnalysis ? 'Advanced job match and ATS guidance' : 'Resume writing and import with AI', ...(plan?.coverLetters ? ['AI cover letters'] : []), ...(plan?.interview ? ['Interview preparation'] : [])].map(feature => <li key={feature} className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{feature}</li>)}</ul>
          {user && config.billing.developmentMode ? <button disabled={!!switching || user.plan === name} className="btn-primary w-full" onClick={() => void previewPlan(name)}>{switching === name && <Loader2 className="w-4 h-4 animate-spin" />}{user.plan === name ? 'Current development plan' : `Try ${name} locally`}</button> : name === 'free' ? <Link to={user ? '/dashboard' : '/register'} className="btn-primary w-full">{user ? 'Open dashboard' : 'Create free account'}</Link> : <button disabled={!config.billing.configured || !!switching || user?.plan === name} className="btn-secondary w-full" onClick={() => user ? void openBilling(name) : window.location.assign('/register')}>{user?.plan === name ? 'Current plan' : config.billing.configured ? 'Continue to checkout' : 'Upgrades unavailable'}</button>}
        </article>;
      })}</div>
      <div className="mt-10 grid md:grid-cols-2 gap-6"><div className="card p-6"><h2 className="font-semibold mb-2">How AI usage works</h2><p className="text-sm text-muted">A successful generation or analysis counts toward your monthly allowance. AI availability depends on the configured provider. You can see your current allowance and reset date in account settings.</p></div><div className="card p-6"><h2 className="font-semibold mb-2">Can I keep working without AI?</h2><p className="text-sm text-muted">Yes. Editing, saving, template previews, and document exports work independently of the AI provider. AI output is a draft for you to review.</p></div></div>
    </>}
  </PublicLayout>;
}
