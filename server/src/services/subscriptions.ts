import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { isOwner } from '../lib/owner';
import { billingSettings } from './providers';

export function validSignature(body: Buffer, signature: string, secret: string) {
  if (!secret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac('sha256', secret).update(body).digest(), Buffer.from(signature, 'hex'));
}
export function subscriptionActive(s: { status: string; endsAt: Date | null }) {
  return ['active', 'on_trial'].includes(s.status) && (!s.endsAt || s.endsAt.getTime() > Date.now())
    || s.status === 'cancelled' && Boolean(s.endsAt && s.endsAt.getTime() > Date.now());
}
export async function refreshSubscriptionPlan(userId: string, force = false) {
  await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return;
    if (isOwner(userId) && ['free', 'pro', 'premium'].includes(user.ownerPreviewPlan || '')) {
      if (user.plan !== user.ownerPreviewPlan) await tx.user.update({ where: { id: userId }, data: { plan: user.ownerPreviewPlan! } });
      return;
    }
    const subscriptions = await tx.subscription.findMany({ where: { userId } });
    if (!force && !subscriptions.length && !user.ownerPreviewPlan) return;
    const active = subscriptions.filter(s => s.provider === 'lemonsqueezy' && s.testMode === billingSettings().testMode && subscriptionActive(s));
    const plan = active.some(s => s.plan === 'premium') ? 'premium' : active.some(s => s.plan === 'pro') ? 'pro' : 'free';
    await tx.user.updateMany({ where: { id: userId }, data: { plan, ownerPreviewPlan: null } });
  });
}
