import { z } from 'zod';
import { templateIds } from './config';

const text = (max = 500) => z.string().max(max);
const optionalText = (max = 500) => text(max).nullable().optional();
const email = z.union([z.literal(''), z.string().email().max(254)]).nullable().optional();
const url = z.union([z.literal(''), z.string().url().max(2000).refine(v => /^https?:\/\//i.test(v), 'Use an HTTP or HTTPS URL.')]).nullable().optional();
const image = z.union([
  z.literal(''),
  z.string().max(1400000).refine(v => /^https?:\/\//i.test(v) || /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/i.test(v), 'Use a PNG, JPEG, WEBP image or an HTTP URL.'),
]).nullable().optional();
const row = { id: text(128).optional(), sortOrder: z.number().int().nonnegative().optional() };
const date = optionalText(100);
const rows = <T extends z.ZodTypeAny>(item: T) => z.array(item).max(100).optional();
export const sections = ['summary', 'experience', 'education', 'skills', 'projects', 'certifications', 'languages', 'awards', 'publications', 'volunteer', 'interests', 'references'] as const;

export const resumeSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  templateId: z.enum(templateIds).optional(),
  targetRole: optionalText(160), targetCompany: optionalText(160),
  fullName: optionalText(160), professionalTitle: optionalText(160), email,
  phone: optionalText(100), city: optionalText(160), country: optionalText(160),
  linkedinUrl: url, githubUrl: url, portfolioUrl: url, photoUrl: image,
  summary: optionalText(12000),
  fontFamily: z.enum(['Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Times-Roman', 'Courier', 'Roboto', 'Open Sans', 'Lato', 'Merriweather']).optional(),
  fontSize: z.enum(['small', 'medium', 'large']).optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  pageMargin: z.enum(['narrow', 'normal', 'wide']).optional(),
  lineSpacing: z.enum(['compact', 'normal', 'relaxed']).optional(),
  paperSize: z.enum(['a4', 'letter']).optional(),
  sectionOrder: z.array(z.enum(sections)).max(sections.length).refine(v => new Set(v).size === v.length, 'Sections must appear only once.').optional(),
  enabledSections: z.record(z.enum(sections), z.boolean()).optional(),
  experiences: rows(z.object({ ...row, jobTitle: text(200), company: text(200), location: optionalText(200), employmentType: optionalText(100), startDate: date, endDate: date, isCurrent: z.boolean().optional(), description: optionalText(20000), achievements: optionalText(10000), technologies: optionalText(2000) })),
  educations: rows(z.object({ ...row, institution: text(200), degree: optionalText(200), fieldOfStudy: optionalText(200), startDate: date, endDate: date, grade: optionalText(100), description: optionalText(12000) })),
  skills: rows(z.object({ ...row, name: text(160), category: text(100).optional(), level: optionalText(100) })),
  projects: rows(z.object({ ...row, name: text(200), description: optionalText(12000), technologies: optionalText(2000), projectUrl: url, githubUrl: url, achievements: optionalText(10000), startDate: date, endDate: date })),
  certifications: rows(z.object({ ...row, name: text(200), issuer: optionalText(200), issueDate: date, expiryDate: date, credentialId: optionalText(200), credentialUrl: url })),
  languages: rows(z.object({ ...row, name: text(160), level: optionalText(100) })),
  awards: rows(z.object({ ...row, title: text(200), issuer: optionalText(200), date, description: optionalText(12000) })),
  publications: rows(z.object({ ...row, title: text(200), publisher: optionalText(200), date, url, description: optionalText(12000) })),
  volunteer: rows(z.object({ ...row, organization: text(200), role: optionalText(200), startDate: date, endDate: date, isCurrent: z.boolean().optional(), description: optionalText(12000) })),
  interests: rows(z.object({ ...row, name: text(200) })),
  references: rows(z.object({ ...row, name: text(200), position: optionalText(200), company: optionalText(200), email, phone: optionalText(100) })),
});
export type ResumeInput = z.infer<typeof resumeSchema>;

export const passwordSchema = z.string().min(8).max(100).refine(v => Buffer.byteLength(v, 'utf8') <= 72, 'Password must contain at most 72 UTF-8 bytes.');
export const registerSchema = z.object({ name: z.string().trim().min(2).max(100), email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: passwordSchema });
export const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(100) });
export const preferencesSchema = z.object({ theme: z.enum(['light', 'dark', 'system']).optional(), language: z.enum(['en', 'fr', 'ar']).optional(), defaultTemplateId: z.enum(templateIds).optional() });
export const profileSchema = z.object({ name: z.string().trim().min(2).max(100).optional(), avatarUrl: image });
export const coverLetterSchema = z.object({ title: z.string().trim().min(1).max(160).optional(), company: optionalText(200), position: optionalText(200), content: optionalText(30000), resumeId: z.string().min(1).max(128).nullable().optional() });
const inputText = (max = 40000) => z.string().trim().min(1).max(max);
export const aiInputs = {
  summary: z.object({ name: text(200).optional().default(''), title: inputText(200), experience: text(15000).optional().default(''), skills: text(10000).optional().default(''), tone: z.enum(['professional', 'concise', 'technical', 'leadership', 'entry-level']).optional().default('professional') }),
  enhance: z.object({ original: inputText(15000), jobTitle: text(200).optional().default(''), company: text(200).optional().default('') }),
  jobMatch: z.object({ resumeText: inputText(), jobDescription: inputText(25000) }),
  review: z.object({ resumeText: inputText() }),
  coverLetter: z.object({ resumeText: text(40000).optional().default(''), position: inputText(200), company: inputText(200), jobDescription: text(25000).optional().default(''), motivation: text(5000).optional() }),
  interview: z.object({ resumeText: text(40000).optional().default(''), position: inputText(200), jobDescription: text(25000).optional() }),
  generateResume: z.object({ basicInfo: inputText() }),
  importResume: z.object({ text: inputText(60000) }),
  tailor: z.object({ resumeId: inputText(128), jobDescription: inputText(25000), title: z.string().trim().min(1).max(160).optional() }),
};
