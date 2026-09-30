import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { config, planFor } from '../lib/config';
import { authenticate, AuthRequest } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';
import { asyncRoute, HttpError } from '../lib/errors';
import { aiInputs, resumeSchema } from '../lib/schemas';
import { reserveAiUsage, settleAiUsage } from '../lib/usage';
import { createResume, normalizeResume, ownedResume, validatedContent } from '../lib/resumeStore';
import { aiServices, AiServices, outputSchemas } from '../services/openrouter';

export function createAiRouter(services: AiServices = aiServices) {
  const router = Router();
  router.use(authenticate);
  const limiter = rateLimit(12, 60 * 1000, req => req.user.id);
  function execute(feature: string, schema: z.ZodTypeAny, handler: (input: any, req: AuthRequest) => Promise<any>, entitlement?: 'advancedAnalysis' | 'coverLetters' | 'interview' | 'tailoring') {
    router.post(`/${feature}`, limiter, asyncRoute(async (req: AuthRequest, res) => {
      const input = schema.parse(req.body);
      if (entitlement && !planFor(req.user!.plan)[entitlement]) throw new HttpError(403, 'This AI tool requires a Pro subscription.', 'PLAN_REQUIRED');
      const { resumeId } = z.object({ resumeId: z.string().min(1).max(128).optional() }).parse(req.body);
      const selected = resumeId ? await ownedResume(resumeId, req.user!.id) : null;
      if (services === aiServices && !config.aiConfigured) throw new HttpError(503, 'AI is unavailable until OpenRouter is configured.', 'AI_NOT_CONFIGURED');
      const usage = await reserveAiUsage(req.user!.id, req.user!.plan, feature);
      if (selected) await prisma.aiUsageRecord.update({ where: { id: usage.id }, data: { resumeId: selected.id, title: selected.title } });
      try {
        const result = await handler(input, req);
        await settleAiUsage(usage, true, result);
        res.status(feature === 'tailor' ? 201 : 200).json(result);
      } catch (error) {
        await settleAiUsage(usage, false);
        throw error;
      }
    }));
  }
  function validated<T>(schema: z.ZodTypeAny, result: T) {
    const parsed = schema.safeParse(result);
    if (!parsed.success) throw new HttpError(502, 'The AI response did not match the expected format. Please try again.', 'AI_RESPONSE_INVALID');
    return parsed.data;
  }
  execute('summary', aiInputs.summary, async input => validated(outputSchemas.summary, await services.generateSummary(input)));
  execute('enhance', aiInputs.enhance, async input => validated(outputSchemas.enhance, await services.enhanceBulletPoints(input)));
  execute('job-match', aiInputs.jobMatch, async input => validated(outputSchemas.jobMatch, await services.analyzeJobMatch(input)), 'advancedAnalysis');
  execute('review', aiInputs.review, async input => validated(outputSchemas.review, await services.reviewResume(input)), 'advancedAnalysis');
  execute('cover-letter', aiInputs.coverLetter, async (input, req) => validated(outputSchemas.coverLetter, await services.generateCoverLetter({ ...input, userName: req.user!.name })), 'coverLetters');
  execute('interview', aiInputs.interview, async input => validated(outputSchemas.interview, await services.generateInterviewQuestions(input)), 'interview');
  execute('generate-resume', aiInputs.generateResume, async input => validated(outputSchemas.generatedResume, await services.generateResumeFromInfo(input)));
  execute('import-resume', aiInputs.importResume, async input => validated(outputSchemas.generatedResume, await services.importResume(input)));
  execute('keywords', aiInputs.jobMatch, async input => validated(outputSchemas.keywords, await services.optimizeKeywords(input)), 'advancedAnalysis');
  execute('tailor', aiInputs.tailor, async (input, req) => {
    const original = await ownedResume(input.resumeId, req.user!.id);
    const content = validatedContent(original);
    const changes = validated(outputSchemas.tailoring, await services.tailorResume({ resume: normalizeResume(original), jobDescription: input.jobDescription }));
    const experiences = content.experiences || [];
    const seen = new Set<number>();
    for (const change of changes.experiences) {
      if (change.index >= experiences.length || seen.has(change.index)) throw new HttpError(502, 'The AI returned an invalid experience reference.', 'AI_RESPONSE_INVALID');
      seen.add(change.index);
      // Only wording changes. Identity, dates, employers and qualifications stay fixed.
      experiences[change.index] = { ...experiences[change.index], description: change.description };
    }
    const skills = content.skills || [];
    if (changes.skillsOrder.some((index: number) => index >= skills.length) || new Set(changes.skillsOrder).size !== changes.skillsOrder.length) throw new HttpError(502, 'The AI returned an invalid skill reference.', 'AI_RESPONSE_INVALID');
    const reordered = [...changes.skillsOrder, ...skills.map((_, index) => index).filter(index => !changes.skillsOrder.includes(index))].map(index => skills[index]);
    const tailored = resumeSchema.parse({ ...content, title: input.title || `${original.title.slice(0, 145)} (Tailored)`, summary: changes.summary, experiences, skills: reordered });
    const resume = await createResume(req.user!.id, req.user!.plan, tailored);
    return { resume: normalizeResume(resume), changes: changes.changes };
  }, 'tailoring');
  router.get('/history', asyncRoute(async (req: AuthRequest, res) => {
    const query = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.string().max(128).optional() }).parse(req.query);
    if (query.cursor && !await prisma.aiUsageRecord.findFirst({ where: { id: query.cursor, userId: req.user!.id } })) throw new HttpError(404, 'History page not found.');
    const records = await prisma.aiUsageRecord.findMany({ where: { userId: req.user!.id, status: 'succeeded', result: { not: null } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) });
    const page = records.slice(0, query.limit);
    res.json({ history: page.map(record => ({ id: record.id, mode: record.feature, title: record.title || record.feature, createdAt: record.createdAt, resumeId: record.resumeId, result: JSON.parse(record.result!) })), nextCursor: records.length > query.limit ? page[page.length - 1].id : null });
  }));
  router.delete('/history', asyncRoute(async (req: AuthRequest, res) => {
    await prisma.aiUsageRecord.updateMany({ where: { userId: req.user!.id }, data: { result: null } });
    res.json({ message: 'Saved AI results cleared. Usage totals are unchanged.' });
  }));
  return router;
}
export default createAiRouter();
