import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, Download, Loader2, CheckCircle } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import type { CoverLetter, Resume } from '../types/resume';
import { resumeToText } from '../types/resume';
import { downloadText, exportTextPDF, exportTextDOCX } from '../lib/documentExports';

export default function CoverLetterEditor() {
  const { id } = useParams<{ id: string }>();
  const [letter, setLetter] = useState<CoverLetter | null>(null);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [motivation, setMotivation] = useState('');
  const [generatedDraft, setGeneratedDraft] = useState('');
  const revision = useRef(0);
  const identity = useRef(id);
  identity.current = id;
  const toast = useToast();
  const { user } = useAuth();
  const entitlements = config?.plans[user?.plan || 'free'];

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setLetter(null); setDirty(false); setGeneratedDraft(''); revision.current++;
    Promise.all([
      api.get<{ coverLetter: CoverLetter }>(`/cover-letters/${id}`, { signal: controller.signal }),
      api.get<{ resumes: Resume[] }>('/resumes', { signal: controller.signal }),
      api.get<AppConfig>('/config', { signal: controller.signal }),
    ]).then(([data, list, configuration]) => { setLetter(data.coverLetter); setResumes(list.resumes); setConfig(configuration); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    const confirmLink = (e: MouseEvent) => {
      const target = (e.target as Element | null)?.closest('a');
      if (dirty && target?.href && target.origin === window.location.origin && target.pathname !== window.location.pathname && !window.confirm('You have unsaved cover letter changes. Leave without saving?')) { e.preventDefault(); e.stopPropagation(); }
    };
    window.addEventListener('beforeunload', warn); document.addEventListener('click', confirmLink, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', confirmLink, true); };
  }, [dirty]);

  function edit(changes: Partial<CoverLetter>) { setLetter(current => current ? { ...current, ...changes } : current); revision.current++; setDirty(true); }

  async function save() {
    if (!letter || saving) return;
    const snapshot = letter; const currentRevision = revision.current; const documentId = id;
    setSaving(true);
    try {
      await api.put(`/cover-letters/${documentId}`, { title: snapshot.title.trim(), company: snapshot.company, position: snapshot.position, resumeId: snapshot.resumeId || null, content: snapshot.content });
      if (documentId === identity.current && currentRevision === revision.current) setDirty(false);
      toast.success('Cover letter saved');
    } catch (e) { toast.error('Could not save cover letter', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setSaving(false); }
  }
  async function generate() {
    if (!letter?.resumeId || !letter.company?.trim() || !letter.position?.trim()) { toast.warning('Add your application details', 'Select a resume and enter a company and position first.'); return; }
    setGenerating(true); setGeneratedDraft(''); const documentId = id;
    try {
      const { resume } = await api.get<{ resume: Resume }>(`/resumes/${letter.resumeId}`);
      const { coverLetter } = await api.post<{ coverLetter: string }>('/ai/cover-letter', { resumeId: letter.resumeId, resumeText: resumeToText(resume), company: letter.company, position: letter.position, jobDescription, motivation });
      if (identity.current === documentId) setGeneratedDraft(coverLetter);
    } catch (e) { toast.error('Generation unavailable', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setGenerating(false); }
  }
  async function exportDocument(format: 'pdf' | 'docx' | 'txt') {
    if (!letter?.content?.trim()) { toast.warning('Write your letter first'); return; }
    setExporting(true);
    try {
      const filename = (letter.title || 'cover-letter').replace(/[<>:"/\\|?*]/g, '-');
      const options = { title: '', sections: [{ heading: '', text: letter.content }], filename, paperSize: 'a4', fontFamily: 'Inter', fontSize: 'medium', pageMargin: 'normal', lineSpacing: 'normal' };
      if (format === 'txt') downloadText(`${filename}.txt`, letter.content);
      else if (format === 'pdf') await exportTextPDF(options);
      else await exportTextDOCX(options);
      toast.success('Export downloaded');
    } catch (e) { toast.error('Export failed', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setExporting(false); }
  }

  return <AppLayout title="Cover Letter Editor">
    <div className="flex flex-wrap gap-3 justify-between items-center mb-6"><Link to="/cover-letters" className="btn-secondary"><ArrowLeft className="w-4 h-4" />Cover letters</Link><div className="flex items-center gap-3"><span className={`text-xs ${dirty ? 'text-amber-600' : 'text-green-600'}`}>{dirty ? 'Unsaved changes' : letter ? 'Saved' : ''}</span><button className="btn-primary" disabled={!letter || saving || !letter.title.trim() || !entitlements?.coverLetters} onClick={() => void save()}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}Save</button></div></div>
    {config && !entitlements?.coverLetters && <p className="card p-4 text-sm text-amber-600 mb-6">Your current plan permits reading and exporting this existing letter. Writing and AI generation require Pro. <Link to="/pricing" className="underline">View plans</Link>.</p>}
    {loading ? <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto my-20" /> : error ? <div className="card p-8 text-red-600" role="alert">{error}<Link to="/cover-letters" className="btn-secondary mt-4">Back to cover letters</Link></div> : letter && <div className="grid xl:grid-cols-2 gap-6">
      <div className="space-y-6"><div className="card p-6 space-y-5"><h2 className="font-semibold text-lg">Application details</h2><label className="block"><span className="label">Document title</span><input className="input" maxLength={200} value={letter.title} onChange={e => edit({ title: e.target.value })} /></label>
        <div className="grid sm:grid-cols-2 gap-4"><label><span className="label">Company</span><input className="input" disabled={generating} maxLength={200} value={letter.company || ''} onChange={e => edit({ company: e.target.value })} /></label><label><span className="label">Position</span><input className="input" disabled={generating} maxLength={200} value={letter.position || ''} onChange={e => edit({ position: e.target.value })} /></label></div>
        <label className="block"><span className="label">Base resume</span><select className="input" disabled={generating} value={letter.resumeId || ''} onChange={e => edit({ resumeId: e.target.value })}><option value="">Choose a saved resume for AI generation</option>{resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
      </div><div className="card p-6 space-y-5"><h2 className="font-semibold text-lg flex gap-2 items-center"><Sparkles className="text-violet-600 w-5 h-5" />Draft with AI</h2><label className="block"><span className="label">Job description</span><textarea className="textarea" disabled={generating} rows={5} maxLength={20000} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the responsibilities and requirements" /></label><label className="block"><span className="label">Why this company? What should the letter emphasize?</span><textarea className="textarea" disabled={generating} rows={3} maxLength={10000} value={motivation} onChange={e => setMotivation(e.target.value)} placeholder="Use facts from your experience and your own motivation" /></label>
        <p className="text-xs text-muted">Relevant resume content and application details will be sent to the AI provider. Review the draft before using it.</p>{config && !config.ai.configured && <p className="text-sm text-amber-600">AI is unavailable on this deployment. You can still write, save, and export your letter.</p>}
        <button className="btn-primary" disabled={generating || !config?.ai.configured || !entitlements?.coverLetters || !letter.resumeId || !letter.company?.trim() || !letter.position?.trim()} onClick={() => void generate()}>{generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Generate a draft</button>
      </div></div>
      <div className="space-y-6"><div className="card p-6"><div className="flex flex-wrap gap-3 items-center justify-between mb-4"><h2 className="font-semibold text-lg">Your letter</h2><div className="flex gap-2">{(['pdf', 'docx', 'txt'] as const).filter(f => f !== 'docx' || entitlements?.docxExport).map(f => <button className="btn-secondary btn-sm uppercase" disabled={exporting || !letter.content?.trim()} onClick={() => void exportDocument(f)} key={f}><Download className="w-3 h-3" />{f}</button>)}</div></div><textarea className="textarea min-h-96" aria-label="Cover letter content" rows={22} maxLength={50000} value={letter.content || ''} onChange={e => edit({ content: e.target.value })} placeholder="Dear hiring team, …" /><p className="text-xs text-muted mt-3">Exports include the current letter text. Save to keep these changes in your account.</p></div>
        {generatedDraft && <div className="card p-6 border-violet-300"><h2 className="font-semibold text-lg mb-2">Review AI draft</h2><p className="text-xs text-muted mb-4">Check facts, tone, names, and dates. Applying this draft replaces the letter text in the editor.</p><textarea className="textarea mb-4" aria-label="AI draft to review" rows={16} value={generatedDraft} onChange={e => setGeneratedDraft(e.target.value)} /><div className="flex gap-3"><button className="btn-primary" onClick={() => { if (!letter.content?.trim() || window.confirm('Replace the current letter with this reviewed draft?')) { edit({ content: generatedDraft }); setGeneratedDraft(''); } }}><CheckCircle className="w-4 h-4" />Apply draft</button><button className="btn-secondary" onClick={() => setGeneratedDraft('')}>Discard</button></div></div>}
      </div>
    </div>}
  </AppLayout>;
}
