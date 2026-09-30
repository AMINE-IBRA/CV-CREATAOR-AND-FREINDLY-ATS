import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, Loader2, Palette, FileText } from 'lucide-react';
import PublicLayout from '../components/PublicLayout';
import { TEMPLATE_LIST } from '../components/templates/ResumeTemplates';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import type { Resume } from '../types/resume';

const example: Resume = {
  id: 'preview', userId: 'preview', title: 'Sample resume', templateId: 'classic-professional',
  fullName: 'Alex Morgan', professionalTitle: 'Product Designer', email: 'alex@example.com',
  phone: '+1 555 010 2040', city: 'London', country: 'United Kingdom',
  linkedinUrl: 'https://linkedin.com/in/example', portfolioUrl: 'https://example.com',
  summary: 'Product designer with experience turning customer research into accessible digital experiences. Works closely with engineering and product teams to ship clear, useful interfaces.',
  fontFamily: 'Inter', fontSize: 'medium', accentColor: '#2563EB', pageMargin: 'normal', lineSpacing: 'normal', paperSize: 'a4',
  sectionOrder: ['summary', 'experience', 'education', 'skills', 'projects', 'languages'],
  enabledSections: { summary: true, experience: true, education: true, skills: true, projects: true, languages: true },
  completionScore: 90,
  experiences: [{ id: 'example-role', jobTitle: 'Product Designer', company: 'Example Studio', location: 'London', startDate: '2022', isCurrent: true, description: 'Led discovery interviews and usability testing for a customer dashboard.\nPartnered with engineers to maintain an accessible design system.', achievements: 'Delivered a reusable library of interface patterns.' }],
  educations: [{ institution: 'Example University', degree: 'BA', fieldOfStudy: 'Design', startDate: '2017', endDate: '2020' }],
  skills: [{ name: 'Figma', category: 'tool' }, { name: 'User research', category: 'technical' }, { name: 'Accessibility', category: 'technical' }, { name: 'Collaboration', category: 'soft' }],
  projects: [{ name: 'Community toolkit', description: 'Designed a resource directory with clear navigation and inclusive typography.', technologies: 'Figma, React', projectUrl: 'https://example.com/project' }],
  certifications: [], languages: [{ name: 'English', level: 'Fluent' }, { name: 'French', level: 'Professional' }], awards: [],
  createdAt: '', updatedAt: '',
};

export default function TemplatesPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [atsOnly, setAtsOnly] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  useEffect(() => { const controller = new AbortController(); api.get<AppConfig>('/config', { signal: controller.signal }).then(setConfig).catch(() => {}); return () => controller.abort(); }, []);
  const allowedTemplates = config?.plans[user?.plan || 'free']?.templates;
  const categories = [...new Set(TEMPLATE_LIST.map(t => t.category))];
  const filtered = useMemo(() => TEMPLATE_LIST.filter(t =>
    (category === 'all' || t.category === category) && (!atsOnly || t.atsFriendly) &&
    `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase())), [query, category, atsOnly]);
  const selected = TEMPLATE_LIST.find(t => t.id === previewId);

  async function selectTemplate(id: string) {
    if (!isAuthenticated) { navigate('/register', { state: { from: `/resumes/new?template=${encodeURIComponent(id)}` } }); return; }
    const template = TEMPLATE_LIST.find(t => t.id === id)!;
    setCreating(id);
    try {
      const { resume } = await api.post<{ resume: Resume }>('/resumes', { title: `My ${template.name} Resume`, templateId: id, accentColor: template.accentColor });
      navigate(`/resumes/${resume.id}/edit`);
    } catch (error) { toast.error('Cannot use this template', error instanceof Error ? error.message : 'Please try again.'); }
    finally { setCreating(null); }
  }

  return <PublicLayout title="Find your next resume style" description="Preview every layout with the same sample content. Single-column templates are the simplest choice when an employer asks for an ATS-friendly resume.">
    <div className="card p-4 flex flex-wrap gap-4 items-center mb-8">
      <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input aria-label="Search templates" className="input pl-9" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search templates" /></div>
      <select aria-label="Template category" className="input w-auto capitalize" value={category} onChange={e => setCategory(e.target.value)}><option value="all">All styles</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <label className="text-sm flex items-center gap-2"><input type="checkbox" checked={atsOnly} onChange={e => setAtsOnly(e.target.checked)} />ATS-focused layouts</label>
    </div>
    <p className="text-sm text-muted mb-4">{filtered.length} templates · {user?.plan ? `Your ${user.plan} plan` : 'Create an account to save your resume'}</p>
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {filtered.map(t => { const Template = t.component; return <article className="card overflow-hidden" key={t.id}>
        <button type="button" className="w-full h-80 bg-slate-100 relative overflow-hidden text-left" onClick={() => setPreviewId(t.id)} aria-label={`Preview ${t.name}`}>
          <div className="absolute top-3 left-1/2 origin-top" style={{ width: 794, transform: 'translateX(-50%) scale(0.29)' }}><Template resume={{ ...example, templateId: t.id, accentColor: t.accentColor }} /></div>
        </button>
        <div className="p-4"><h2 className="font-semibold mb-2">{t.name}</h2><p className="text-xs text-muted min-h-10 mb-3">{t.description}</p><span className="text-xs inline-flex gap-1 items-center mb-4 text-blue-600">{t.atsFriendly ? <CheckCircle className="w-3 h-3" /> : <Palette className="w-3 h-3" />}{t.atsFriendly ? 'ATS-focused' : 'Visual layout'}{allowedTemplates && !allowedTemplates.includes(t.id) ? ' · Pro template' : ''}</span>
          <button className="btn-primary w-full" disabled={creating !== null} onClick={() => void selectTemplate(t.id)}>{creating === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}Use template</button>
        </div>
      </article>; })}
    </div>
    {filtered.length === 0 && <div className="card p-12 text-center"><p className="text-muted mb-4">No templates match your search.</p><button className="btn-secondary" onClick={() => { setQuery(''); setCategory('all'); setAtsOnly(false); }}>Clear filters</button></div>}
    {selected && <div className="fixed inset-0 z-50 bg-black/60 overflow-y-auto p-4 flex justify-center" role="dialog" aria-modal="true" aria-label={`${selected.name} preview`} onClick={() => setPreviewId(null)}>
      <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}><div className="bg-white dark:bg-slate-800 rounded-t-xl p-4 flex justify-between items-center gap-4 sticky top-0 z-10"><h2 className="font-semibold">{selected.name} · Sample content</h2><div className="flex gap-2"><button className="btn-primary btn-sm" disabled={creating !== null} onClick={() => void selectTemplate(selected.id)}>Use template</button><button className="btn-secondary btn-sm" onClick={() => setPreviewId(null)}>Close</button></div></div><div className="bg-slate-200 p-4 overflow-x-auto"><selected.component resume={{ ...example, templateId: selected.id, accentColor: selected.accentColor }} /></div></div>
    </div>}
  </PublicLayout>;
}

