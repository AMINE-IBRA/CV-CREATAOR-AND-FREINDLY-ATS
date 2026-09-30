import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { coverLetterSchema } from '../lib/schemas';
import { planFor } from '../lib/config';
const router = Router();
router.use(authenticate);
async function checkResume(resumeId: string | null | undefined, userId: string) {
  if (resumeId && !await prisma.resume.findFirst({ where: { id: resumeId, userId }, select: { id: true } })) throw new HttpError(404, 'Selected resume not found.');
}
function canWrite(req: AuthRequest) { if (!planFor(req.user!.plan).coverLetters) throw new HttpError(403, 'Cover letters require a Pro subscription.', 'PLAN_REQUIRED'); }
router.get('/', asyncRoute(async (req: AuthRequest, res) => {
  res.json({ coverLetters: await prisma.coverLetter.findMany({ where: { userId: req.user!.id }, orderBy: { updatedAt: 'desc' } }) });
}));
router.get('/:id', asyncRoute(async (req: AuthRequest, res) => {
  const coverLetter = await prisma.coverLetter.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!coverLetter) throw new HttpError(404, 'Cover letter not found.');
  res.json({ coverLetter });
}));
router.post('/', asyncRoute(async (req: AuthRequest, res) => {
  canWrite(req);
  const input = coverLetterSchema.parse(req.body);
  await checkResume(input.resumeId, req.user!.id);
  const coverLetter = await prisma.coverLetter.create({ data: { ...input, userId: req.user!.id } });
  res.status(201).json({ coverLetter });
}));
router.put('/:id', asyncRoute(async (req: AuthRequest, res) => {
  canWrite(req);
  const input = coverLetterSchema.parse(req.body);
  await checkResume(input.resumeId, req.user!.id);
  const existing = await prisma.coverLetter.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!existing) throw new HttpError(404, 'Cover letter not found.');
  const coverLetter = await prisma.coverLetter.update({ where: { id: existing.id }, data: input });
  res.json({ coverLetter });
}));
router.post('/:id/duplicate', asyncRoute(async (req: AuthRequest, res) => {
  canWrite(req);
  const original = await prisma.coverLetter.findFirst({ where: { id: req.params.id, userId: req.user!.id } });
  if (!original) throw new HttpError(404, 'Cover letter not found.');
  const { id, createdAt, updatedAt, ...content } = original;
  const coverLetter = await prisma.coverLetter.create({ data: { ...content, title: `${original.title.slice(0, 153)} (Copy)` } });
  res.status(201).json({ coverLetter });
}));
router.delete('/:id', asyncRoute(async (req: AuthRequest, res) => {
  const result = await prisma.coverLetter.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  if (!result.count) throw new HttpError(404, 'Cover letter not found.');
  res.json({ message: 'Cover letter deleted.' });
}));
export default router;
