// Shared document model. _key is a local editor identity, never sent to the API.
export interface Entry { id?: string; _key?: string; sortOrder?: number }
export interface WorkExperience extends Entry { jobTitle: string; company: string; location?: string; employmentType?: string; startDate?: string; endDate?: string; isCurrent: boolean; description?: string; achievements?: string; technologies?: string }
export interface Education extends Entry { institution: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }
export interface Skill extends Entry { name: string; category: string; level?: string }
export interface Project extends Entry { name: string; description?: string; technologies?: string; projectUrl?: string; githubUrl?: string; achievements?: string; startDate?: string; endDate?: string }
export interface Certification extends Entry { name: string; issuer?: string; issueDate?: string; expiryDate?: string; credentialId?: string; credentialUrl?: string }
export interface Language extends Entry { name: string; level?: string }
export interface Award extends Entry { title: string; issuer?: string; date?: string; description?: string }
export interface Publication extends Entry { title: string; publisher?: string; date?: string; url?: string; description?: string }
export interface Volunteer extends Entry { organization: string; role?: string; startDate?: string; endDate?: string; isCurrent?: boolean; description?: string }
export interface Interest extends Entry { name: string }
export interface Reference extends Entry { name: string; position?: string; company?: string; email?: string; phone?: string }
export interface Resume {
  id: string; userId: string; title: string; templateId: string; targetRole?: string; targetCompany?: string;
  fullName?: string; professionalTitle?: string; email?: string; phone?: string; city?: string; country?: string;
  linkedinUrl?: string; githubUrl?: string; portfolioUrl?: string; photoUrl?: string; summary?: string;
  fontFamily: string; fontSize: string; accentColor: string; pageMargin: string; lineSpacing: string; paperSize: string;
  sectionOrder: string | string[]; enabledSections: string | Record<string, boolean>; completionScore: number;
  experiences: WorkExperience[]; educations: Education[]; skills: Skill[]; projects: Project[];
  certifications: Certification[]; languages: Language[]; awards: Award[];
  publications?: Publication[]; volunteer?: Volunteer[]; interests?: Interest[]; references?: Reference[];
  createdAt: string; updatedAt: string;
}
export interface User { id: string; email: string; name: string; plan: string; avatarUrl?: string; aiUsageCount?: number; createdAt?: string }
export interface CoverLetter { id: string; userId: string; resumeId?: string; title: string; company?: string; position?: string; content?: string; createdAt: string; updatedAt: string }

export const SECTION_LABELS = {
  summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills',
  projects: 'Projects', certifications: 'Certifications', languages: 'Languages', awards: 'Awards',
  publications: 'Publications', volunteer: 'Volunteering', interests: 'Interests', references: 'References',
} as const;
export type SectionId = keyof typeof SECTION_LABELS;
export const SECTION_IDS = Object.keys(SECTION_LABELS) as SectionId[];
export const RELATION_KEYS = ['experiences', 'educations', 'skills', 'projects', 'certifications', 'languages', 'awards', 'publications', 'volunteer', 'interests', 'references'] as const;
export type RelationKey = typeof RELATION_KEYS[number];
export const ENTRY_FIELDS: Record<RelationKey, string[]> = {
  experiences:['jobTitle','company','location','employmentType','startDate','endDate','description','achievements','technologies'],
  educations:['institution','degree','fieldOfStudy','startDate','endDate','grade','description'],
  skills:['name','category','level'], projects:['name','description','technologies','projectUrl','githubUrl','achievements','startDate','endDate'],
  certifications:['name','issuer','issueDate','expiryDate','credentialId','credentialUrl'],languages:['name','level'],awards:['title','issuer','date','description'],
  publications:['title','publisher','date','url','description'],volunteer:['organization','role','startDate','endDate','description'],interests:['name'],references:['name','position','company','email','phone'],
};
export function parseSectionOrder(value: unknown): SectionId[] {
  let parsed = value;
  if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { parsed = []; } }
  const known = Array.isArray(parsed) ? parsed.filter((v): v is SectionId => typeof v === 'string' && Object.hasOwn(SECTION_LABELS, v)) : [];
  return [...new Set([...known, ...SECTION_IDS])];
}
export function parseEnabledSections(value: unknown): Record<SectionId, boolean> {
  let parsed = value;
  if (typeof value === 'string') { try { parsed = JSON.parse(value); } catch { parsed = {}; } }
  const record = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  return Object.fromEntries(SECTION_IDS.map(id => [id, typeof record[id] === 'boolean' ? record[id] : !['awards', 'publications', 'volunteer', 'interests', 'references'].includes(id)])) as Record<SectionId, boolean>;
}
export function normalizeResume(input: Partial<Resume>): Resume {
  const scalarKeys=['id','userId','title','templateId','targetRole','targetCompany','fullName','professionalTitle','email','phone','city','country','linkedinUrl','githubUrl','portfolioUrl','photoUrl','summary','fontFamily','fontSize','accentColor','pageMargin','lineSpacing','paperSize','createdAt','updatedAt'];
  const safeInput=Object.fromEntries(scalarKeys.filter(key=>typeof (input as Record<string,unknown>)[key]==='string').map(key=>[key,(input as Record<string,unknown>)[key]]));
  const resume = {
    id: '', userId: '', title: 'My Resume', templateId: 'classic-professional', fontFamily: 'Helvetica', fontSize: 'medium',
    accentColor: '#2563EB', pageMargin: 'normal', lineSpacing: 'normal', paperSize: 'a4',
    createdAt: '', updatedAt: '', ...safeInput, completionScore:Number.isFinite(input.completionScore)?input.completionScore:0, sectionOrder: parseSectionOrder(input.sectionOrder), enabledSections: parseEnabledSections(input.enabledSections),
  } as Resume;
  for (const key of RELATION_KEYS) {
    (resume as unknown as Record<string, unknown>)[key] = (Array.isArray(input[key]) ? input[key] : []).filter(entry=>entry&&typeof entry==='object'&&!Array.isArray(entry)).map(entry => {
      const raw=entry as unknown as Record<string,unknown>;
      return {...Object.fromEntries(ENTRY_FIELDS[key].map(field=>[field,typeof raw[field]==='string'?raw[field]:''])),...(key==='experiences'||key==='volunteer'?{isCurrent:raw.isCurrent===true}:{}),...(key==='skills'?{category:typeof raw.category==='string'&&raw.category?raw.category:'technical'}:{}),id:typeof raw.id==='string'?raw.id:undefined,_key:typeof raw._key==='string'&&raw._key?raw._key:crypto.randomUUID()};
    });
  }
  if(input.enabledSections==null){const enabled=parseEnabledSections(resume.enabledSections);for(const section of ['awards','publications','volunteer','interests','references'] as SectionId[])if((resume as unknown as Record<string,unknown[]>)[section]?.length)enabled[section]=true;resume.enabledSections=enabled;}
  return resume;
}
export function resumePayload(resume: Resume): Record<string, unknown> {
  const { id: _id, userId: _userId, createdAt: _createdAt, updatedAt: _updatedAt, completionScore: _score, ...data } = resume;
  const payload: Record<string, unknown> = { ...data, sectionOrder: parseSectionOrder(resume.sectionOrder), enabledSections: parseEnabledSections(resume.enabledSections) };
  for (const key of RELATION_KEYS) payload[key] = (resume[key] || []).map(({ _key: _localKey, id: _entryId, ...entry }, index) => ({ ...entry, sortOrder: index }));
  return payload;
}
export interface ResumeBlock { id: SectionId; heading: string; entries: { title?: string; subtitle?: string; date?: string; lines: string[]; links?: string[] }[] }
const joined = (...values: (string | undefined)[]) => values.filter(v => v?.trim()).join(' · ');
const dateRange = (start?: string, end?: string, current?: boolean) => [start, current ? 'Present' : end].filter(Boolean).join(' – ');
const lines = (...values: (string | undefined)[]) => values.flatMap(v => v?.split('\n').map(s => s.trim()).filter(Boolean) || []);
export function resumeBlocks(resume: Resume, includeHidden = false): ResumeBlock[] {
  const enabled = parseEnabledSections(resume.enabledSections);
  const blocks: Record<SectionId, ResumeBlock['entries']> = {
    summary: resume.summary?.trim() ? [{ lines: lines(resume.summary) }] : [],
    experience: (resume.experiences || []).map(e => ({ title: e.jobTitle, subtitle: joined(e.company, e.location, e.employmentType), date: dateRange(e.startDate, e.endDate, e.isCurrent), lines: lines(e.description, e.achievements, e.technologies ? `Technologies: ${e.technologies}` : '') })),
    education: (resume.educations || []).map(e => ({ title: e.institution, subtitle: joined(e.degree, e.fieldOfStudy), date: dateRange(e.startDate, e.endDate), lines: lines(e.grade ? `Grade: ${e.grade}` : '', e.description) })),
    skills: (resume.skills || []).map(e => ({ lines: [joined(e.name, e.category, e.level)] })),
    projects: (resume.projects || []).map(e => ({ title: e.name, date: dateRange(e.startDate, e.endDate), lines: lines(e.description, e.achievements, e.technologies ? `Technologies: ${e.technologies}` : ''), links: [e.projectUrl, e.githubUrl].filter(Boolean) as string[] })),
    certifications: (resume.certifications || []).map(e => ({ title: e.name, subtitle: e.issuer, date: joined(e.issueDate, e.expiryDate ? `Expires ${e.expiryDate}` : ''), lines: lines(e.credentialId ? `Credential: ${e.credentialId}` : ''), links: e.credentialUrl ? [e.credentialUrl] : [] })),
    languages: (resume.languages || []).map(e => ({ lines: [joined(e.name, e.level)] })),
    awards: (resume.awards || []).map(e => ({ title: e.title, subtitle: e.issuer, date: e.date, lines: lines(e.description) })),
    publications: (resume.publications || []).map(e => ({ title: e.title, subtitle: e.publisher, date: e.date, lines: lines(e.description), links: e.url ? [e.url] : [] })),
    volunteer: (resume.volunteer || []).map(e => ({ title: e.role || e.organization, subtitle: e.role ? e.organization : '', date: dateRange(e.startDate, e.endDate, e.isCurrent), lines: lines(e.description) })),
    interests: (resume.interests || []).map(e => ({ lines: [e.name] })),
    references: (resume.references || []).map(e => ({ title: e.name, subtitle: joined(e.position, e.company), lines: lines(joined(e.email, e.phone)) })),
  };
  return parseSectionOrder(resume.sectionOrder).filter(id => includeHidden || enabled[id]).map(id => ({ id, heading: SECTION_LABELS[id], entries: blocks[id].filter(e => [e.title, e.subtitle, e.date, ...e.lines, ...(e.links || [])].some(v => v?.trim())) })).filter(b => b.entries.length);
}
export function resumeToText(resume: Resume): string {
  const contact = joined(resume.email, resume.phone, joined(resume.city, resume.country), resume.linkedinUrl, resume.githubUrl, resume.portfolioUrl);
  return [resume.fullName, resume.professionalTitle, contact, ...resumeBlocks(resume).map(b => `${b.heading}\n${b.entries.map(e => [e.title, e.subtitle, e.date, ...e.lines, ...(e.links || [])].filter(Boolean).join('\n')).join('\n\n')}`)].filter(Boolean).join('\n\n');
}
