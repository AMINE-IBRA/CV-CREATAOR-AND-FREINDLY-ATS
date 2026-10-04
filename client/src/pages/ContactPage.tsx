import { Mail, MessageCircle, CreditCard } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { SITE, supportMailto } from '../lib/site';

export default function ContactPage() {
  return <PublicLayout title="Contact and support" description="Questions about your account, subscription, privacy, or a document? We are here to help.">
    <div className="grid md:grid-cols-3 gap-6 max-w-5xl">
      <article className="card p-6"><Mail className="w-6 h-6 text-blue-600 mb-4"/><h2 className="font-semibold mb-2">Email support</h2><a className="text-blue-600 hover:underline break-all" href={supportMailto}>{SITE.supportEmail}</a></article>
      <article className="card p-6"><MessageCircle className="w-6 h-6 text-violet-600 mb-4"/><h2 className="font-semibold mb-2">What to include</h2><p className="text-sm text-muted">Include your account email, the page or feature involved, and what happened. Share screenshots only after removing sensitive information. Do not send passwords or payment security codes.</p></article>
      <article className="card p-6"><CreditCard className="w-6 h-6 text-emerald-600 mb-4"/><h2 className="font-semibold mb-2">Billing and refunds</h2><p className="text-sm text-muted">Include the checkout email and order number, if available. You can cancel a subscription in the customer billing portal. Read our <a className="text-blue-600 underline" href="/refunds">14-day refund policy</a> for details.</p></article>
    </div>
    <div className="card p-6 max-w-5xl mt-6"><h2 className="font-semibold mb-2">Service operator</h2><p className="text-sm text-muted">{SITE.name} is operated by {SITE.operator}, {SITE.location}.</p></div>
  </PublicLayout>;
}
