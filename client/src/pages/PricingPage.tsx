import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, CreditCard, Loader2 } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import { SITE } from '../lib/site';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { User } from '../types/resume';

export default function PricingPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  const { user, updateUser } = useAuth();
  const [switching, setSwitching] = useState('');
  const [interval, setInterval] = useState<'monthly' | 'annual'>('monthly');
  const [status, setStatus] = useState<{ hasSubscription: boolean; ownerPreviewPlan: string | null } | null>(null);
  const toast = useToast();
  async function refreshStatus() { if (user) setStatus(await api.get('/billing/status')); }
  async function openBilling(plan?: string) {
    setSwitching(plan || 'portal');
    try {
      const { url } = await api.post<{ url: string }>(plan ? '/billing/checkout' : '/billing/portal', plan ? { plan, interval } : {});
      window.location.assign(url);
    } catch (e) { toast.error('Cannot open billing', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSwitching(''); }
  }
  async function previewPlan(plan: string | null) {
    setSwitching(plan || 'restore');
    try {
      const { user: updated } = await api.post<{ user: User }>(user?.isOwner ? '/billing/owner-plan' : '/billing/development-plan', { plan });
      updateUser(updated); await refreshStatus();
      toast.success(plan ? 'Preview active: ' + plan : 'Subscription access restored');
    } catch (e) { toast.error('Cannot change preview', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSwitching(''); }
  }
  useEffect(() => { const c = new AbortController(); api.get<AppConfig>('/config', { signal: c.signal }).then(setConfig).catch(e => { if (!c.signal.aborted) setError(e.message); }); return () => c.abort(); }, []);
  useEffect(() => { if (user) api.get<{ hasSubscription: boolean; ownerPreviewPlan: string | null }>('/billing/status').then(setStatus).catch(() => setStatus(null)); else setStatus(null); }, [user?.id]);
  return <PublicLayout title="A clear plan for your next application" description="Start with a free resume. Choose more templates, writing tools, and a larger AI allowance when you need them.">
    {error ? <div className="card p-6 text-red-600" role="alert">{error}</div> : !config ? <Loader2 className="w-8 h-8 animate-spin text-blue-600 my-12" /> : <>
      <div className="flex justify-center mb-8"><div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">{(['monthly', 'annual'] as const).map(value => <button key={value} aria-pressed={interval === value} className={interval === value ? 'btn-primary' : 'btn-ghost'} onClick={() => setInterval(value)}>{value === 'monthly' ? 'Monthly' : 'Annual · save about 17%'}</button>)}</div></div>
      <div className="card p-5 mb-8 flex items-start gap-3 border-blue-200"><CreditCard className="w-6 h-6 text-blue-600 shrink-0" /><div><h2 className="font-semibold mb-1">{config.billing.configured ? config.billing.testMode ? 'Test checkout — no real payments' : 'Secure checkout with Lemon Squeezy' : 'Free accounts are open. Paid plans are coming soon.'}</h2><p className="text-sm text-muted">{config.billing.configured ? 'Access updates after payment confirmation. You can manage or cancel your subscription in the billing portal.' : 'Prices below describe the planned paid offering. You cannot be charged while upgrades are unavailable.'}</p>{status?.hasSubscription && config.billing.configured && <button className="btn-secondary mt-3" disabled={!!switching} onClick={() => void openBilling()}>Manage subscription</button>}</div></div>
      {user && (user.isOwner || config.billing.developmentMode) && <section className="card p-5 mb-8 border-amber-200"><h2 className="font-semibold mb-2">{user.isOwner ? 'Owner workspace' : 'Local development preview'}</h2><p className="text-sm text-muted mb-4">Test each plan without a payment. Normal feature limits and AI usage still apply. {user.isOwner ? 'These controls are restricted to your owner account.' : 'This preview is disabled in production.'}</p><div className="flex flex-wrap gap-2">{(['free', 'pro', 'premium'] as const).map(plan => <button key={plan} className="btn-secondary capitalize" disabled={!!switching} aria-pressed={status?.ownerPreviewPlan === plan} onClick={() => void previewPlan(plan)}>Try {plan}</button>)}{user.isOwner && <button className="btn-ghost" disabled={!!switching} onClick={() => void previewPlan(null)}>End preview</button>}</div>{status?.ownerPreviewPlan && <p className="text-sm mt-3">Current preview: <strong className="capitalize">{status.ownerPreviewPlan}</strong>. Open the dashboard to try its tools.</p>}</section>}
      <div className="grid md:grid-cols-3 gap-6">{(['free', 'pro', 'premium'] as const).map(name => {
        const plan = config.plans[name];
        const amount = name === 'free' ? 0 : SITE.plans[name][interval];
        return <article className={'card p-7 flex flex-col ' + (name === 'pro' ? 'ring-2 ring-blue-500' : '')} key={name}><h2 className="capitalize text-xl font-bold mb-2">{name}</h2><p className="text-4xl font-bold mb-2">{amount === 0 ? '$0' : '$' + amount.toFixed(2)}<span className="text-sm font-normal text-muted">{name === 'free' ? '' : interval === 'annual' ? ' / year' : ' / month'}</span></p><p className="text-sm text-muted mb-6">{name === 'free' ? 'No card required.' : interval === 'annual' ? 'Billed annually in USD. Applicable tax is shown at checkout.' : 'Billed monthly in USD. Applicable tax is shown at checkout.'}</p>
          <ul className="space-y-3 text-sm mb-8 flex-1">{[`${plan.resumeLimit === null ? 'Unlimited' : plan.resumeLimit} saved resumes`, `${plan.aiLimit} successful AI requests per month`, `${plan.templates.length} resume templates`, plan.docxExport ? 'PDF, DOCX and TXT export' : 'PDF and TXT export', plan.advancedAnalysis ? 'Job tailoring and advanced ATS guidance' : 'AI writing assistance', ...(plan.coverLetters ? ['Cover-letter writing'] : []), ...(plan.interview ? ['Interview preparation'] : [])].map(feature => <li key={feature} className="flex gap-2"><CheckCircle className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />{feature}</li>)}</ul>
          {name === 'free' ? <Link to={user ? '/dashboard' : '/register'} className="btn-primary w-full">{user ? 'Open dashboard' : 'Create free account'}</Link> : <button disabled={!config.billing.configured || !config.billing.intervals?.[name]?.[interval] || !!switching || !!status?.hasSubscription} className="btn-primary w-full" onClick={() => user ? void openBilling(name) : window.location.assign('/register')}>{status?.hasSubscription ? 'Use billing portal to change plan' : config.billing.configured && config.billing.intervals?.[name]?.[interval] ? 'Continue to checkout' : 'Upgrades unavailable'}</button>}
        </article>;
      })}</div>
      <p className="text-sm text-muted mt-6 text-center">Paid plans renew automatically until cancelled. Cancel before renewal in your billing portal. Request a refund within 14 days of your initial purchase. Read our <Link className="underline" to="/refunds">refund policy</Link> and <Link className="underline" to="/terms">terms</Link>.</p>
      <div className="mt-10 grid md:grid-cols-2 gap-6"><div className="card p-6"><h2 className="font-semibold mb-2">AI that supports your writing</h2><p className="text-sm text-muted">Each successful generation or analysis uses one request. Allowances reset monthly, including on annual plans. Review suggestions for accuracy; ATS guidance cannot guarantee a hiring outcome.</p>{!config.ai.configured && <p className="mt-3 text-sm text-amber-600">AI is temporarily unavailable on this deployment.</p>}</div><div className="card p-6"><h2 className="font-semibold mb-2">Your documents stay editable</h2><p className="text-sm text-muted">Editing, saving, template previews, and exports work independently of AI. Pro and Premium include the same tools; Premium provides a larger monthly AI allowance.</p><Link className="text-blue-600 text-sm underline mt-3 inline-block" to="/contact">Questions? Contact support</Link></div></div>
    </>}
  </PublicLayout>;
}
