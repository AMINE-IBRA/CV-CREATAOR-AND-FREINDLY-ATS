import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { billingSettings } from './providers';

export function validSignature(body: Buffer, signature: string, secret: string, now = Date.now()) {
  if (!secret) return false;
  const parts = signature.split(';').map(part => part.trim().split('='));
  const timestamps = parts.filter(([key]) => key === 'ts').map(([, value]) => value);
  if (timestamps.length !== 1 || !/^\d+$/.test(timestamps[0])) return false;
  const timestamp = timestamps[0];
  if (Math.abs(now / 1000 - Number(timestamp)) > 5) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}:`).update(body).digest();
  return parts.some(([key, value]) => key === 'h1' && /^[a-f0-9]{64}$/i.test(value || '') && timingSafeEqual(expected, Buffer.from(value, 'hex')));
}
export function subscriptionActive(s: { status: string; endsAt: Date | null }) {
  return ['active', 'trialing'].includes(s.status) && (!s.endsAt || s.endsAt.getTime() > Date.now());
}
export async function refreshSubscriptionPlan(userId: string) {
  // Read and update in one transaction so concurrent notifications cannot leave a stale plan.
  await prisma.$transaction(async tx => {
    const subscriptions = await tx.subscription.findMany({ where: { userId } });
    if (!subscriptions.length) return;
    const active = subscriptions.filter(s => s.provider === 'paddle' && s.testMode === billingSettings().testMode && subscriptionActive(s));
    const plan = active.some(s => s.plan === 'premium') ? 'premium' : active.some(s => s.plan === 'pro') ? 'pro' : 'free';
    await tx.user.updateMany({ where: { id: userId, plan: { not: plan } }, data: { plan } });
  });
}
