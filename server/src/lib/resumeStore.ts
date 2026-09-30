import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { resumeSchema, ResumeInput, sections } from './schemas';
import { planFor } from './config';
import { HttpError } from './errors';

export const collections = ['experiences', 'educations', 'skills', 'projects', 'certifications', 'languages', 'awards', 'publications', 'volunteer', 'interests', 'references'] as const;
export const resumeInclude = Object.fromEntries(collections.map(key => [key, { orderBy: { sortOrder: 'asc' } }])) as Record<typeof collections[number], { orderBy: { sortOrder: 'asc' } }>;
export function completionScore(resume: any) {
  return Math.min(100, (resume.fullName ? 10 : 0) + (resume.email ? 10 : 0) + (resume.phone ? 5 : 0) + (resume.professionalTitle ? 5 : 0) + (resume.summary ? 15 : 0) + (resume.city ? 5 : 0) + (resume.experiences?.some((e: any) => e.jobTitle && e.company) ? 25 : 0) + (resume.educations?.some((e: any) => e.institution) ? 15 : 0) + (resume.skills?.some((e: any) => e.name) ? 10 : 0));
}
export function normalizeResume(resume: any) {
  const result = { ...resume };
  try { if (typeof result.sectionOrder === 'string') result.sectionOrder = JSON.parse(result.sectionOrder); } catch { result.sectionOrder = [...sections]; }
  try { if (typeof result.enabledSections === 'string') result.enabledSections = JSON.parse(result.enabledSections); } catch { result.enabledSections = {}; }
  return result;
}
export function validatedContent(resume: any) { return resumeSchema.parse(normalizeResume(resume)); }
function contentData(input: ResumeInput, replacement: boolean) {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(input)) {
    if ((collections as readonly string[]).includes(key)) {
      const items = (value as Array<any>).map(({ id, sortOrder, ...row }, index) => ({ ...row, sortOrder: index }));
      result[key] = replacement ? { deleteMany: {}, create: items } : { create: items };
    } else if (key === 'sectionOrder' || key === 'enabledSections') result[key] = JSON.stringify(value);
    else result[key] = value;
  }
  return result;
}
export function checkTemplate(input: ResumeInput, plan: string) {
  if (input.templateId && !(planFor(plan).templates as readonly string[]).includes(input.templateId)) throw new HttpError(403, 'This template requires a Pro subscription.', 'PLAN_REQUIRED');
}
export async function createResume(userId: string, plan: string, input: ResumeInput) {
  checkTemplate(input, plan);
  return prisma.$transaction(async tx => {
    // Serialize SQLite writers before counting, so concurrent creation cannot
    // bypass the plan cap. The no-op update acquires a write lock.
    await tx.user.update({ where: { id: userId }, data: { updatedAt: new Date() } });
    const limit = planFor(plan).resumeLimit;
    if (limit !== null && await tx.resume.count({ where: { userId } }) >= limit) throw new HttpError(403, `Your plan supports ${limit} resumes.`, 'RESUME_LIMIT_REACHED');
    const data = contentData(input, false);
    data.userId = userId;
    data.sectionOrder ||= JSON.stringify(sections);
    const result = await tx.resume.create({ data: data as Prisma.ResumeUncheckedCreateInput, include: resumeInclude });
    const completion = completionScore(result);
    return tx.resume.update({ where: { id: result.id }, data: { completionScore: completion }, include: resumeInclude });
  });
}
export async function ownedResume(id: string, userId: string) {
  const resume = await prisma.resume.findFirst({ where: { id, userId }, include: resumeInclude });
  if (!resume) throw new HttpError(404, 'Resume not found.');
  return resume;
}
export async function updateResume(id: string, userId: string, plan: string, input: ResumeInput, label = 'Before edit') {
  checkTemplate(input, plan);
  return prisma.$transaction(async tx => {
    const previous = await tx.resume.findFirst({ where: { id, userId }, include: resumeInclude });
    if (!previous) throw new HttpError(404, 'Resume not found.');
    await tx.resumeVersion.create({ data: { resumeId: id, snapshot: JSON.stringify(normalizeResume(previous)), label } });
    const result = await tx.resume.update({ where: { id }, data: contentData(input, true), include: resumeInclude });
    const keep = await tx.resumeVersion.findMany({ where: { resumeId: id }, orderBy: { createdAt: 'desc' }, skip: 20, select: { id: true } });
    if (keep.length) await tx.resumeVersion.deleteMany({ where: { id: { in: keep.map(v => v.id) } } });
    return tx.resume.update({ where: { id }, data: { completionScore: completionScore(result) }, include: resumeInclude });
  });
}
