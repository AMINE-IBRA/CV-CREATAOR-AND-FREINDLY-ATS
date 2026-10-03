import { randomBytes, createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { config } from '../lib/config';
import { asyncRoute, HttpError } from '../lib/errors';
import { refreshSubscriptionPlan } from '../services/subscriptions';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; name: string; plan: string };
  sessionId?: string;
}
export const sessionCookie = 'cv_session';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieOptions = () => ({ httpOnly: true, secure: config.production, sameSite: 'lax' as const, path: '/' });
export async function createSession(userId: string, res: Response) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + config.sessionDurationMs);
  await prisma.session.create({ data: { userId, token: hashToken(token), expiresAt } });
  res.cookie(sessionCookie, token, { ...cookieOptions(), expires: expiresAt });
}
export function clearSession(res: Response) { res.clearCookie(sessionCookie, cookieOptions()); }
export function cookieToken(req: Request): string | undefined {
  const pair = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${sessionCookie}=`));
  if (!pair) return;
  const token = pair.slice(sessionCookie.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : undefined;
}
export async function revokeRequestSession(req: Request) {
  const token = cookieToken(req);
  if (token) await prisma.session.deleteMany({ where: { token: hashToken(token) } });
}
export const authenticate = asyncRoute(async (req: AuthRequest, res, next) => {
  const token = cookieToken(req);
  if (!token) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
  const session = await prisma.session.findUnique({ where: { token: hashToken(token) }, include: { user: { select: { id: true, email: true, name: true, plan: true } } } });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    if (session) await prisma.session.deleteMany({ where: { id: session.id } });
    clearSession(res);
    throw new HttpError(401, 'Your session has expired. Please sign in again.', 'AUTH_REQUIRED');
  }
  await refreshSubscriptionPlan(session.user.id);
  const current = await prisma.user.findUniqueOrThrow({ where: { id: session.user.id }, select: { id: true, email: true, name: true, plan: true } });
  req.user = current; req.sessionId = session.id; next();
});
