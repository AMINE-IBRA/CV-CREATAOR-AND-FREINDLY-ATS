import PublicLayout from '../components/PublicLayout';
import { SITE, supportMailto } from '../lib/site';

export default function RefundPage() {
  return <PublicLayout title="Refund policy" description={`Last updated ${SITE.lastUpdated}`}>
    <article className="card p-6 sm:p-10 max-w-4xl space-y-7 leading-relaxed text-sm">
      <section><h2 className="text-lg font-semibold mb-2">Your first 14 days</h2><p>We offer a full refund of your initial subscription payment if you request it within 14 days of purchase. This applies to both monthly and annual plans. Email <a className="text-blue-600 hover:underline" href={supportMailto}>{SITE.supportEmail}</a> with the email used at checkout and your order number, if available. A reason is helpful but is not required to request this refund.</p></section>
      <section><h2 className="text-lg font-semibold mb-2">Renewals</h2><p>Subscriptions renew automatically at the interval shown at checkout until cancelled. Cancel through the customer billing portal before the next renewal to stop future charges. Access continues until the end of the paid period. Renewal payments are normally non-refundable once the new period begins, except where required by law. Contact us about duplicate charges, an incorrect charge, or a material service problem so we can review it.</p></section>
      <section><h2 className="text-lg font-semibold mb-2">How refunds are processed</h2><p>When paid subscriptions are enabled, payments and refunds are processed through Lemon Squeezy as merchant of record. Refunds are returned to the original payment method. Your bank or payment provider determines when the funds appear.</p></section>
      <section><h2 className="text-lg font-semibold mb-2">Your statutory rights</h2><p>This policy does not remove any mandatory consumer rights. Lemon Squeezy may also issue refunds under its own policies, including to resolve payment disputes. Suspected fraud is handled under applicable law and payment-provider rules.</p></section>
    </article>
  </PublicLayout>;
}
