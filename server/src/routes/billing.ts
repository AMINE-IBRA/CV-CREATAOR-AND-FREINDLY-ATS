import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { publicUser, requireLocalDevelopment } from './auth';
const router = Router();
router.post('/development-plan', authenticate, asyncRoute(async (req: AuthRequest, res) => {
  requireLocalDevelopment(req);
  const { plan } = z.object({ plan: z.enum(['free', 'pro', 'premium']) }).parse(req.body);
  const user = await prisma.user.update({ where: { id: req.user!.id }, data: { plan } });
  res.json({ user: publicUser(user), developmentMode: true, message: 'Development plan preview changed. No payment was made.' });
}));
router.post('/checkout', authenticate, asyncRoute(async () => { throw new HttpError(503, 'A payment provider must be connected before subscriptions are available.', 'BILLING_NOT_CONFIGURED'); }));
export default router;
