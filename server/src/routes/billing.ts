import { Router, raw } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { config } from '../lib/config';
import { isOwner } from '../lib/owner';
import { publicUser, requireLocalDevelopment } from './auth';
import { billingConfigured, billingSettings, lemonRequest } from '../services/providers';
import { refreshSubscriptionPlan, validSignature } from '../services/subscriptions';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
function requireBilling() { if (!billingConfigured()) throw new HttpError(503, 'Paid subscriptions are not available yet.', 'BILLING_NOT_CONFIGURED'); }
function billingUrl(value: unknown) {
  if (typeof value !== 'string') throw new HttpError(502, 'Billing did not return a link.');
  const url = new URL(value);
  if (url.protocol !== 'https:' || !(url.hostname === 'lemonsqueezy.com' || url.hostname.endsWith('.lemonsqueezy.com'))) throw new HttpError(502, 'Invalid billing link.');
  return url.href;
}
router.post('/owner-plan', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  if (!isOwner(req.user!.id)) throw new HttpError(403, 'Owner access required.');
  const { plan } = z.object({ plan: z.enum(['free', 'pro', 'premium']).nullable() }).parse(req.body);
  await prisma.user.update({ where: { id: req.user!.id }, data: { ownerPreviewPlan: plan } });
  await refreshSubscriptionPlan(req.user!.id, true);
  res.json({ user: publicUser((await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } }))) });
}));
router.post('/development-plan', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireLocalDevelopment(req);
  if (billingConfigured()) throw new HttpError(409, 'Use the billing portal when a provider is configured.');
  const { plan } = z.object({ plan: z.enum(['free', 'pro', 'premium']) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { plan } });
  res.json({ user: publicUser(user), developmentMode: true });
}));
router.get('/status', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const subscription = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'lemonsqueezy', testMode: billingSettings().testMode }, orderBy: { providerUpdatedAt: 'desc' } });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  res.json({ hasSubscription: Boolean(subscription), status: subscription?.status || null, plan: user.plan, ownerPreviewPlan: isOwner(user.id) ? user.ownerPreviewPlan : null });
}));
router.post('/checkout', authenticate, rateLimit(10, 60000, req => req.user.id), asyncRoute(async (req: AuthRequest, res) => {
  requireBilling();
  const { plan, interval } = z.object({ plan: z.enum(['pro', 'premium']), interval: z.enum(['monthly', 'annual']).default('monthly') }).parse(req.body);
  const b = billingSettings();
  const variant = b.variants[plan][interval];
  if (!variant) throw new HttpError(503, 'This billing interval is not available yet.');
  const existing = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'lemonsqueezy', testMode: b.testMode, status: { not: 'expired' } } });
  if (existing) throw new HttpError(409, 'Manage your existing subscription in the billing portal.');
  const pendingKey = req.user!.id + ':' + b.testMode;
  const pending = await prisma.billingCheckout.findUnique({ where: { pendingKey } });
  if (pending && Date.now() - pending.createdAt.getTime() < 3600000) {
    if (!pending.transactionId) throw new HttpError(409, 'A checkout is being prepared. Please try again shortly.');
    if (pending.plan !== plan + ':' + interval) throw new HttpError(409, 'An earlier checkout is still open. Resume it or wait one hour before changing the plan.');
    const result = await lemonRequest('/checkouts/' + encodeURIComponent(pending.transactionId));
    res.json({ url: billingUrl(result.data?.attributes?.url) }); return;
  }
  if (pending) await prisma.billingCheckout.update({ where: { id: pending.id }, data: { pendingKey: null } });
  const checkoutId = randomUUID();
  try { await prisma.billingCheckout.create({ data: { id: checkoutId, userId: req.user!.id, plan: plan + ':' + interval, testMode: b.testMode, pendingKey } }); }
  catch (e: any) { if (e.code === 'P2002') throw new HttpError(409, 'A checkout is already being prepared.'); throw e; }
  try {
  const result = await lemonRequest('/checkouts', { data: {
    type: 'checkouts',
    attributes: {
      checkout_data: { email: req.user!.email, custom: { checkout_id: checkoutId } },
      product_options: { enabled_variants: [Number(variant)], redirect_url: config.clientUrl.replace(/\/$/, '') + '/pricing?payment=received' },
      test_mode: b.testMode, expires_at: new Date(Date.now() + 3600000).toISOString(),
    },
    relationships: { store: { data: { type: 'stores', id: b.storeId } }, variant: { data: { type: 'variants', id: variant } } },
  } });
  const transactionId = z.string().uuid().parse(result.data?.id);
  const url = billingUrl(result.data?.attributes?.url);
  await prisma.billingCheckout.update({ where: { id: checkoutId }, data: { transactionId } });
  res.json({ url });
  } catch (error) {
    // Checkout creation does not charge a card. Keep the nonce for any late
    // signed notification but allow retry when no usable URL was returned.
    await prisma.billingCheckout.update({ where: { id: checkoutId }, data: { pendingKey: null } });
    throw error;
  }
}));
router.post('/portal', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireBilling();
  const b = billingSettings();
  const subscription = await prisma.subscription.findFirst({ where: { userId: req.user!.id, provider: 'lemonsqueezy', testMode: b.testMode }, orderBy: { providerUpdatedAt: 'desc' } });
  if (!subscription) throw new HttpError(404, 'No subscription found for this account.');
  const result = await lemonRequest('/subscriptions/' + encodeURIComponent(subscription.id));
  const a = result.data?.attributes;
  if (String(a?.store_id) !== b.storeId || String(a?.customer_id) !== subscription.customerId || a?.test_mode !== b.testMode) throw new HttpError(502, 'Billing account mismatch.');
  res.json({ url: billingUrl(a?.urls?.customer_portal) });
}));
const eventSchema = z.object({
  meta: z.object({ event_name: z.string(), custom_data: z.object({ checkout_id: z.string().optional() }).passthrough().optional() }),
  data: z.object({ type: z.literal('subscriptions'), id: z.string().regex(/^\d+$/), attributes: z.object({
    store_id: z.number().int(), customer_id: z.number().int(), variant_id: z.number().int(), test_mode: z.boolean(),
    status: z.enum(['active', 'on_trial', 'cancelled', 'expired', 'past_due', 'unpaid', 'paused']),
    ends_at: z.string().datetime({ offset: true }).nullable(), updated_at: z.string().datetime({ offset: true }),
  }).passthrough() }),
});
export const billingWebhook = [raw({ type: 'application/json', limit: '256kb' }), asyncRoute(async (req, res) => {
  requireBilling();
  const b = billingSettings();
  if (!Buffer.isBuffer(req.body) || !validSignature(req.body, req.get('X-Signature') || '', b.secret)) throw new HttpError(401, 'Invalid webhook signature.');
  let event: any;
  try { event = JSON.parse(req.body.toString('utf8')); } catch { throw new HttpError(400, 'Invalid webhook payload.'); }
  if (typeof event.meta?.event_name !== 'string') throw new HttpError(400, 'Missing event type.');
  if (!event.meta.event_name.startsWith('subscription_')) { res.sendStatus(200); return; }
  // Payment events are not subscription objects.
  if (event.data?.type !== 'subscriptions') { res.sendStatus(200); return; }
  const parsed = eventSchema.parse(event);
  const a = parsed.data.attributes;
  if (String(a.store_id) !== b.storeId || a.test_mode !== b.testMode) throw new HttpError(400, 'Billing environment mismatch.');
  const selected = Object.entries(b.variants).flatMap(([plan, intervals]) => Object.entries(intervals).map(([interval, id]) => ({ plan, interval, id }))).find(v => v.id === String(a.variant_id));
  if (!selected) throw new HttpError(400, 'Unknown product variant.');
  const updatedAt = new Date(a.updated_at);
  const userId = await prisma.$transaction(async tx => {
    const old = await tx.subscription.findUnique({ where: { id: parsed.data.id } });
    if (old && (old.provider !== 'lemonsqueezy' || old.testMode !== b.testMode || old.customerId !== String(a.customer_id))) throw new HttpError(400, 'Subscription identity mismatch.');
    const checkout = parsed.meta.custom_data?.checkout_id ? await tx.billingCheckout.findUnique({ where: { id: parsed.meta.custom_data.checkout_id } }) : null;
    if (!old && !checkout) return null;
    if (!old && checkout && (checkout.testMode !== b.testMode || checkout.plan !== selected.plan + ':' + selected.interval)) throw new HttpError(400, 'Checkout mismatch.');
    if (old && checkout && old.userId !== checkout.userId) throw new HttpError(400, 'Checkout owner mismatch.');
    const owner = old?.userId || checkout!.userId;
    if (old && old.providerUpdatedAt >= updatedAt) return owner;
    await tx.subscription.upsert({ where: { id: parsed.data.id }, create: {
      id: parsed.data.id, userId: owner, provider: 'lemonsqueezy', customerId: String(a.customer_id), plan: selected.plan,
      status: a.status, endsAt: a.ends_at ? new Date(a.ends_at) : null, providerUpdatedAt: updatedAt, testMode: b.testMode,
    }, update: { plan: selected.plan, status: a.status, endsAt: a.ends_at ? new Date(a.ends_at) : null, providerUpdatedAt: updatedAt } });
    if (checkout) await tx.billingCheckout.update({ where: { id: checkout.id }, data: { pendingKey: null } });
    return owner;
  });
  if (userId) await refreshSubscriptionPlan(userId);
  res.sendStatus(200);
})];
export default router;
