import { prisma } from './prisma';
import { planFor } from './config';
import { HttpError } from './errors';
export function currentPeriod(now = new Date()) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)); }
export function nextPeriod(now = new Date()) { return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)); }
export async function usageFor(userId: string, plan: string) {
  const period = currentPeriod();
  await prisma.user.updateMany({ where: { id: userId, aiUsageReset: { lt: period } }, data: { aiUsageCount: 0, aiUsageReset: period } });
  const [user, resumeCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { aiUsageCount: true } }),
    prisma.resume.count({ where: { userId } }),
  ]);
  const entitlements = planFor(plan);
  return { plan, aiUsageCount: user.aiUsageCount, aiLimit: entitlements.aiLimit, resumeCount, resumeLimit: entitlements.resumeLimit, resetAt: nextPeriod().toISOString(), entitlements };
}
export async function reserveAiUsage(userId: string, plan: string, feature: string) {
  const period = currentPeriod();
  return prisma.$transaction(async tx => {
    await tx.user.updateMany({ where: { id: userId, aiUsageReset: { lt: period } }, data: { aiUsageCount: 0, aiUsageReset: period } });
    const result = await tx.user.updateMany({ where: { id: userId, aiUsageCount: { lt: planFor(plan).aiLimit } }, data: { aiUsageCount: { increment: 1 } } });
    if (result.count !== 1) throw new HttpError(429, 'Your monthly AI usage limit has been reached.', 'AI_LIMIT_REACHED');
    return tx.aiUsageRecord.create({ data: { userId, feature, period } });
  });
}
export async function settleAiUsage(record: { id: string; userId: string; period: Date }, success: boolean, result?: unknown) {
  await prisma.$transaction(async tx => {
    const updated = await tx.aiUsageRecord.updateMany({ where: { id: record.id, status: 'reserved' }, data: { status: success ? 'succeeded' : 'failed', result: success && result ? JSON.stringify(result) : null } });
    if (!success && updated.count === 1) {
      await tx.user.updateMany({ where: { id: record.userId, aiUsageCount: { gt: 0 }, aiUsageReset: { gte: record.period, lt: nextPeriod(record.period) } }, data: { aiUsageCount: { decrement: 1 } } });
    }
  });
}
