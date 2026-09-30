import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest, createSession, clearSession, revokeRequestSession, hashToken } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { registerSchema, loginSchema, profileSchema, passwordSchema, preferencesSchema } from '../lib/schemas';
import { config, planFor } from '../lib/config';
import { rateLimit } from '../middleware/rateLimit';
import { usageFor } from '../lib/usage';

const router = Router();
const userSelect = { id: true, email: true, name: true, plan: true, avatarUrl: true, preferences: true, createdAt: true, aiUsageCount: true } as const;
export function publicUser(user: any) {
  let preferences: Record<string, string> = { theme: 'system', language: 'en', defaultTemplateId: 'classic-professional' };
  try { preferences = { ...preferences, ...preferencesSchema.parse(JSON.parse(user.preferences || '{}')) }; } catch { /* Defaults preserve old accounts. */ }
  return { id: user.id, email: user.email, name: user.name, plan: user.plan, avatarUrl: user.avatarUrl, preferences, createdAt: user.createdAt, aiUsageCount: user.aiUsageCount };
}
async function userByEmail(email: string) {
  const matches = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM "User" WHERE lower("email") = ${email.toLowerCase()} LIMIT 1`;
  return matches[0] ? prisma.user.findUnique({ where: { id: matches[0].id } }) : null;
}
export function requireLocalDevelopment(req: AuthRequest) {
  if (config.production || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip || '')) {
    throw new HttpError(503, 'This development preview is only available on the local computer.', 'PROVIDER_NOT_CONFIGURED');
  }
}

router.post('/register', rateLimit(10, 60 * 60 * 1000), asyncRoute(async (req, res) => {
  const input = registerSchema.parse(req.body);
  if (await userByEmail(input.email)) throw new HttpError(409, 'An account with this email already exists.');
  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash }, select: userSelect });
    await createSession(user.id, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error: any) {
    if (error?.code === 'P2002') throw new HttpError(409, 'An account with this email already exists.');
    throw error;
  }
}));
router.post('/login', rateLimit(20, 15 * 60 * 1000), asyncRoute(async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await userByEmail(input.email);
  const hash = user?.passwordHash || '$2a$12$C6UzMDM.H6dfI/f/IKcEe.3OtOmJqFM0CLtQVZo/lIEhSiI.CnKJG';
  const valid = await bcrypt.compare(input.password, hash);
  if (!user || !valid) throw new HttpError(401, 'Invalid email or password.');
  await revokeRequestSession(req);
  await createSession(user.id, res);
  res.json({ user: publicUser(user) });
}));
router.post('/logout', asyncRoute(async (req, res) => {
  await revokeRequestSession(req); clearSession(res); res.json({ message: 'Signed out.' });
}));
router.get('/me', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: userSelect });
  res.json({ user: publicUser(user) });
}));
router.get('/usage', authenticate, asyncRoute(async (req: AuthRequest, res) => { res.json(await usageFor(req.user!.id, req.user!.plan)); }));
router.put('/profile', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const input = profileSchema.parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: input, select: userSelect });
  res.json({ user: publicUser(user) });
}));
router.put('/preferences', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const input = preferencesSchema.parse(req.body);
  if (input.defaultTemplateId && !(planFor(req.user!.plan).templates as readonly string[]).includes(input.defaultTemplateId)) throw new HttpError(403, 'This template requires a Pro subscription.');
  const original = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id }, select: userSelect });
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { preferences: JSON.stringify({ ...publicUser(original).preferences, ...input }) }, select: userSelect });
  res.json({ user: publicUser(user) });
}));
router.put('/password', authenticate, rateLimit(10, 15 * 60 * 1000, req => req.user.id), asyncRoute(async (req: AuthRequest, res) => {
  const input = z.object({ currentPassword: z.string().min(1).max(100), newPassword: passwordSchema }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!await bcrypt.compare(input.currentPassword, user.passwordHash)) throw new HttpError(400, 'Current password is incorrect.');
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
  ]);
  await createSession(user.id, res);
  res.json({ message: 'Password updated. Other devices have been signed out.' });
}));
router.delete('/account', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  const input = z.object({ password: z.string().min(1).max(100) }).parse(req.body);
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user!.id } });
  if (!await bcrypt.compare(input.password, user.passwordHash)) throw new HttpError(400, 'Password is incorrect.');
  await prisma.user.delete({ where: { id: user.id } });
  clearSession(res); res.json({ message: 'Your account and its documents have been deleted.' });
}));
router.post('/forgot-password', rateLimit(5, 15 * 60 * 1000), asyncRoute(async (req, res) => {
  const { email } = z.object({ email: z.string().trim().email().max(254) }).parse(req.body);
  if (config.production) throw new HttpError(503, 'Password recovery requires an email provider. Contact the application owner.', 'EMAIL_NOT_CONFIGURED');
  requireLocalDevelopment(req);
  const user = await userByEmail(email);
  const message = 'If this account exists, a development reset link is available below. No email was sent.';
  if (!user) { res.json({ message }); return; }
  const token = randomBytes(32).toString('base64url');
  await prisma.$transaction([
    prisma.passwordReset.deleteMany({ where: { userId: user.id } }),
    prisma.passwordReset.create({ data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } }),
  ]);
  res.json({ message, developmentResetUrl: `${config.clientUrl.replace(/\/$/, '')}/reset-password?token=${token}` });
}));
router.post('/reset-password', rateLimit(10, 15 * 60 * 1000), asyncRoute(async (req, res) => {
  const { token, password } = z.object({ token: z.string().min(1).max(256), password: passwordSchema }).parse(req.body);
  if (config.production) throw new HttpError(503, 'Password recovery requires an email provider.', 'EMAIL_NOT_CONFIGURED');
  requireLocalDevelopment(req);
  const reset = await prisma.passwordReset.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!reset || reset.expiresAt.getTime() < Date.now()) throw new HttpError(400, 'This reset link has expired or was already used.');
  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async tx => {
    const consumed = await tx.passwordReset.deleteMany({ where: { id: reset.id, expiresAt: { gt: new Date() } } });
    if (consumed.count !== 1) throw new HttpError(400, 'This reset link has expired or was already used.');
    await tx.user.update({ where: { id: reset.userId }, data: { passwordHash } });
    await tx.session.deleteMany({ where: { userId: reset.userId } });
  });
  clearSession(res); res.json({ message: 'Password reset. You can now sign in with the new password.' });
}));
export default router;
