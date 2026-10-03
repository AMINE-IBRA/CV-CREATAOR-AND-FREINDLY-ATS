import { Router, raw } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { config } from '../lib/config';
import { publicUser, requireLocalDevelopment } from './auth';
import { billingConfigured, billingSettings, paddleRequest } from '../services/providers';
import { refreshSubscriptionPlan, validSignature } from '../services/subscriptions';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const paddleId = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[a-z0-9]{26}$`));
function requireBilling() { if (!billingConfigured()) throw new HttpError(503, 'Paid subscriptions are not available yet.', 'BILLING_NOT_CONFIGURED'); }
function portalUrl(value: unknown) {
  if (typeof value !== 'string') throw new HttpError(502, 'Paddle did not return a portal link.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !['customer-portal.paddle.com', 'sandbox-customer-portal.paddle.com'].includes(url.hostname)) throw new HttpError(502, 'Invalid billing portal link.');
  return url.href;
}
router.post('/development-plan', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireLocalDevelopment(req);
  if (billingConfigured()) throw new HttpError(409, 'Use the billing portal when a provider is configured.');
  const { plan } = z.object({ plan: z.enum(['free', 'pro', 'premium']) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { plan } });
  res.json({ user: publicUser(user), developmentMode: true, message: 'Development plan preview changed. No payment was made.' });
}));
router.get('/status', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const subscription = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'paddle', testMode: billingSettings().testMode }, orderBy: { providerUpdatedAt: 'desc' } });
  res.json({ hasSubscription: Boolean(subscription), status: subscription?.status || null, plan: req.user!.plan });
}));
router.post('/checkout', authenticate, rateLimit(10, 60000, req => req.user.id), asyncRoute(async (req: AuthRequest, res) => {
  requireBilling();
  const { plan } = z.object({ plan: z.enum(['pro', 'premium']) }).parse(req.body);
  const b = billingSettings();
  const existing = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'paddle', testMode: b.testMode, status: { not: 'canceled' } } });
  if (existing) throw new HttpError(409, 'Manage your existing subscription in the billing portal.');
  const pendingKey = `${req.user!.id}:${b.testMode ? 'sandbox' : 'production'}`;
  const pending = await prisma.billingCheckout.findUnique({ where: { pendingKey } });
  if (pending) {
    if (!pending.transactionId) throw new HttpError(409, 'Your checkout is being prepared. Please try again shortly or contact support.');
    const transaction = await paddleRequest(`/transactions/${pending.transactionId}`);
    if (['draft', 'ready'].includes(transaction.data?.status)) {
      if (pending.plan !== plan) throw new HttpError(409, `You already have a ${pending.plan} checkout. Resume that checkout or contact support to change it.`);
      res.json({ transactionId: pending.transactionId }); return;
    }
    if (transaction.data?.status !== 'canceled') throw new HttpError(409, 'Your payment is being confirmed. Please refresh your account shortly.');
    await prisma.billingCheckout.update({ where: { id: pending.id }, data: { pendingKey: null } });
  }
  const checkoutId = randomUUID();
  try { await prisma.billingCheckout.create({ data: { id: checkoutId, userId: req.user!.id, plan, testMode: b.testMode, pendingKey } }); }
  catch (error: any) { if (error?.code === 'P2002') throw new HttpError(409, 'A checkout is already being prepared. Please try again shortly.'); throw error; }
  // Persist the owner before contacting Paddle. A timeout must not cause a second chargeable transaction.
  const result = await paddleRequest('/transactions', {
    items: [{ price_id: b.prices[plan], quantity: 1 }], collection_mode: 'automatic',
    custom_data: { checkout_id: checkoutId }, checkout: { url: `${config.clientUrl.replace(/\/$/, '')}/checkout` },
  });
  const transactionId = paddleId('txn').parse(result?.data?.id);
  await prisma.billingCheckout.update({ where: { id: checkoutId }, data: { transactionId } });
  res.json({ transactionId });
}));
router.get('/checkout/:transactionId', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireBilling();
  const transactionId = paddleId('txn').parse(req.params.transactionId);
  const checkout = await prisma.billingCheckout.findFirst({ where: { transactionId, userId: req.user!.id, testMode: billingSettings().testMode } });
  if (!checkout) throw new HttpError(404, 'Checkout not found for this account.');
  res.json({ transactionId });
}));
router.post('/portal', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireBilling();
  const subscription = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'paddle', testMode: billingSettings().testMode }, orderBy: { providerUpdatedAt: 'desc' } });
  if (!subscription) throw new HttpError(404, 'No subscription found for this account.');
  const result = await paddleRequest(`/customers/${paddleId('ctm').parse(subscription.customerId)}/portal-sessions`, { subscription_ids: [subscription.id] });
  res.json({ url: portalUrl(result?.data?.urls?.general?.overview) });
}));

const subscriptionEvent = z.object({
  event_type: z.string(), occurred_at: z.string().datetime({ offset: true }),
  data: z.object({
    id: paddleId('sub'), customer_id: paddleId('ctm'),
    status: z.enum(['active', 'trialing', 'past_due', 'paused', 'canceled']),
    items: z.array(z.object({ price: z.object({ id: paddleId('pri') }), quantity: z.number().int().positive() })).min(1),
    transaction_id: paddleId('txn').optional(),
    custom_data: z.object({ checkout_id: z.string() }).passthrough().nullable().optional(),
    scheduled_change: z.object({ action: z.string(), effective_at: z.string().datetime({ offset: true }) }).passthrough().nullable().optional(),
  }).passthrough(),
});
export const billingWebhook = [raw({ type: 'application/json', limit: '256kb' }), asyncRoute(async (req, res) => {
  requireBilling();
  const b = billingSettings();
  if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('Paddle-Signature') || '', b.secret)) throw new HttpError(401, 'Invalid webhook signature.');
  let event: any;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new HttpError(400, 'Invalid webhook payload.'); }
  if (typeof event.event_type !== 'string') throw new HttpError(400, 'Missing event type.');
  if (!event.event_type.startsWith('subscription.')) { res.sendStatus(200); return; }
  const parsed = subscriptionEvent.parse(event);
  const a = parsed.data;
  const updatedAt = new Date(parsed.occurred_at);
  const price = a.items.length === 1 && a.items[0].quantity === 1 ? a.items[0].price.id : '';
  const plan = price === b.prices.pro ? 'pro' : price === b.prices.premium ? 'premium' : 'free';
  const endsAt = a.scheduled_change && ['cancel', 'pause'].includes(a.scheduled_change.action) ? new Date(a.scheduled_change.effective_at) : null;
  const userId = await prisma.$transaction(async tx => {
    const old = await tx.subscription.findUnique({ where: { id: a.id } });
    if (old && (old.provider !== 'paddle' || old.testMode !== b.testMode || old.customerId !== a.customer_id)) throw new HttpError(400, 'Subscription identity mismatch.');
    const checkout = a.custom_data?.checkout_id ? await tx.billingCheckout.findUnique({ where: { id: a.custom_data.checkout_id } }) : null;
    if (!old && !checkout) return null; // Unrelated/deleted account: never grant access from client-supplied user IDs.
    if (!old && checkout) {
      if (checkout.testMode !== b.testMode) throw new HttpError(400, 'Checkout environment mismatch.');
      if (parsed.event_type !== 'subscription.created') throw new HttpError(503, 'Awaiting the subscription creation event.');
      if (!a.transaction_id || (checkout.transactionId && checkout.transactionId !== a.transaction_id)) throw new HttpError(400, 'Checkout transaction mismatch.');
      if (checkout.plan !== plan) throw new HttpError(400, 'Checkout price mismatch.');
    }
    const owner = old?.userId || checkout!.userId;
    if (old && old.providerUpdatedAt >= updatedAt) return owner;
    await tx.subscription.upsert({ where: { id: a.id }, create: { id: a.id, userId: owner, provider: 'paddle', customerId: a.customer_id, plan, status: a.status, endsAt, providerUpdatedAt: updatedAt, testMode: b.testMode }, update: { plan, status: a.status, endsAt, providerUpdatedAt: updatedAt } });
    if (checkout) await tx.billingCheckout.update({ where: { id: checkout.id }, data: { pendingKey: null } });
    return owner;
  });
  if (userId) await refreshSubscriptionPlan(userId);
  res.sendStatus(200);
})];
export default router;
