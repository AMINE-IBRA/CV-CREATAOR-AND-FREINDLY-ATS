import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncRoute, HttpError } from '../lib/errors';
import { resumeSchema } from '../lib/schemas';
import { collections, resumeInclude, normalizeResume, validatedContent, ownedResume, createResume, updateResume } from '../lib/resumeStore';
import { planFor } from '../lib/config';
const router = Router();
router.use(authenticate);
router.get('/', asyncRoute(async (req: AuthRequest, res) => {
  const resumes = await prisma.resume.findMany({ where: { userId: req.user!.id }, include: resumeInclude, orderBy: { updatedAt: 'desc' } });
  res.json({ resumes: resumes.map(normalizeResume) });
}));
router.post('/', asyncRoute(async (req: AuthRequest, res) => {
  const input = resumeSchema.parse(req.body);
  const resume = await createResume(req.user!.id, req.user!.plan, input);
  res.status(201).json({ resume: normalizeResume(resume) });
}));
router.get('/:id', asyncRoute(async (req: AuthRequest, res) => { res.json({ resume: normalizeResume(await ownedResume(req.params.id, req.user!.id)) }); }));
router.put('/:id', asyncRoute(async (req: AuthRequest, res) => {
  const input = resumeSchema.parse(req.body); // Always parse before any delete/write.
  const resume = await updateResume(req.params.id, req.user!.id, req.user!.plan, input);
  res.json({ resume: normalizeResume(resume) });
}));
router.post('/:id/duplicate', asyncRoute(async (req: AuthRequest, res) => {
  const original = await ownedResume(req.params.id, req.user!.id);
  const input = validatedContent(original);
  input.title = `${original.title.slice(0, 153)} (Copy)`;
  const resume = await createResume(req.user!.id, req.user!.plan, input);
  res.status(201).json({ resume: normalizeResume(resume) });
}));
router.delete('/:id', asyncRoute(async (req: AuthRequest, res) => {
  const result = await prisma.resume.deleteMany({ where: { id: req.params.id, userId: req.user!.id } });
  if (!result.count) throw new HttpError(404, 'Resume not found.');
  res.json({ message: 'Resume deleted.' });
}));
router.get('/:id/versions', asyncRoute(async (req: AuthRequest, res) => {
  await ownedResume(req.params.id, req.user!.id);
  const versions = await prisma.resumeVersion.findMany({ where: { resumeId: req.params.id }, orderBy: { createdAt: 'desc' }, select: { id: true, label: true, createdAt: true } });
  res.json({ versions });
}));
router.post('/:id/versions/:versionId/restore', asyncRoute(async (req: AuthRequest, res) => {
  await ownedResume(req.params.id, req.user!.id);
  const version = await prisma.resumeVersion.findFirst({ where: { id: req.params.versionId, resumeId: req.params.id } });
  if (!version) throw new HttpError(404, 'Saved version not found.');
  const input = validatedContent(JSON.parse(version.snapshot));
  const resume = await updateResume(req.params.id, req.user!.id, req.user!.plan, input, 'Before restoring a saved version');
  res.json({ resume: normalizeResume(resume) });
}));
router.post('/:id/export-check', asyncRoute(async (req: AuthRequest, res) => {
  const { format } = z.object({ format: z.enum(['pdf', 'docx', 'txt', 'json']) }).parse(req.body);
  await ownedResume(req.params.id, req.user!.id);
  if (format === 'docx' && !planFor(req.user!.plan).docxExport) throw new HttpError(403, 'DOCX export requires a Pro subscription.', 'PLAN_REQUIRED');
  res.json({ allowed: true });
}));
export default router;
