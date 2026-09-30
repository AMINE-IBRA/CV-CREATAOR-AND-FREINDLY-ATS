import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2, Download, Trash2, Target, MessageSquare, FileCheck, KeyRound } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import { resumeToText } from '../types/resume';
import type { Resume } from '../types/resume';
import { downloadText } from '../lib/documentExports';

type Mode = 'review' | 'job-match' | 'interview' | 'keywords' | 'tailor';
interface Analysis {
  id: string; mode: Mode; title: string; date: string; resumeId?: string | null; result: Record<string, unknown>;
}
interface HistoryRecord { id: string; mode: string; title: string; createdAt: string; resumeId: string | null; result: Record<string, unknown> }
interface HistoryResponse { history: HistoryRecord[]; nextCursor: string | null }
const TOOLS = [
  { id: 'review' as const, name: 'Resume review', icon: FileCheck, description: 'Get content, clarity, and ATS guidance.' },
  { id: 'job-match' as const, name: 'Job match', icon: Target, description: 'Compare your experience with a job description.' },
  { id: 'keywords' as const, name: 'Keyword gaps', icon: KeyRound, description: 'Find relevant wording from the job description.' },
  { id: 'interview' as const, name: 'Interview prep', icon: MessageSquare, description: 'Practice questions tailored to your experience.' },
  { id: 'tailor' as const, name: 'Tailored draft', icon: Sparkles, description: 'Create a separate resume draft for a specific role.' },
];
const labels: Record<string, string> = {
  strengths: 'Strengths', improvements: 'Areas to improve', atsIssues: 'ATS considerations', grammarIssues: 'Clarity and grammar', suggestions: 'Recommended next steps',
  requiredSkills: 'Required skills', presentSkills: 'Skills found in your resume', missingSkills: 'Skills to verify', keywords: 'Relevant keywords', missingKeywords: 'Missing keywords', matchedKeywords: 'Matched keywords',
  technical: 'Technical questions', behavioral: 'Behavioral questions', resumeSpecific: 'Questions about your experience', presentKeywords: 'Keywords found in your resume', changes: 'Changes in the tailored draft',
};
function fromHistory(records: HistoryRecord[]): Analysis[] {
  return records.filter(r => TOOLS.some(t => t.id === r.mode)).map(r => ({ id: r.id, mode: r.mode as Mode, title: `${TOOLS.find(t => t.id === r.mode)?.name} · ${r.title}`, date: r.createdAt, resumeId: r.resumeId, result: r.result }));
}
function stringList(value: unknown): string[] { return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []; }
function analysisText(analysis: Analysis): string {
  return `${analysis.title}\n${new Date(analysis.date).toLocaleString()}\n\n` + Object.entries(analysis.result).map(([key, value]) => {
    if (typeof value === 'number') return `${key === 'matchScore' ? 'Estimated match' : 'Estimated review score'}: ${value}/100`;
    if (Array.isArray(value)) return `${labels[key] || key}:\n` + value.map(item => typeof item === 'string' ? `- ${item}` : item && typeof item === 'object' ? item.keyword ? `- ${String(item.keyword)}: ${String(item.reason || '')} (${String(item.suggestedSection || '')})` : `${String(item.question || '')}\nTip: ${String(item.hint || '')}` : '').join('\n');
    return typeof value === 'string' ? `${labels[key] || key}: ${value}` : '';
  }).filter(Boolean).join('\n\n');
}

export default function CareerAssistant() {
  const [mode, setMode] = useState<Mode>('review');
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [position, setPosition] = useState('');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<Analysis[]>([]);
  const [active, setActive] = useState<Analysis | null>(null);
  const [historyCursor, setHistoryCursor] = useState<string | null>(null);
  const [historyBusy, setHistoryBusy] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  const entitlements = config?.plans[user?.plan || 'free'];
  const allowed = mode === 'interview' ? entitlements?.interview : mode === 'tailor' ? entitlements?.tailoring : entitlements?.advancedAnalysis;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.get<{ resumes: Resume[] }>('/resumes', { signal: controller.signal }), api.get<AppConfig>('/config', { signal: controller.signal }), api.get<HistoryResponse>('/ai/history', { signal: controller.signal })])
      .then(([list, configuration, saved]) => { setResumes(list.resumes); setResumeId(list.resumes[0]?.id || ''); setConfig(configuration); setHistory(fromHistory(saved.history)); setHistoryCursor(saved.nextCursor); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function moreHistory() {
    setHistoryBusy(true);
    try { const saved = await api.get<HistoryResponse>(`/ai/history?cursor=${encodeURIComponent(historyCursor || '')}`); setHistory(previous => [...previous, ...fromHistory(saved.history)]); setHistoryCursor(saved.nextCursor); }
    catch (e) { toast.error('History unavailable', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setHistoryBusy(false); }
  }
  async function clearHistory() {
    if (!window.confirm('Remove saved career analyses from your account? Your resumes and AI allowance are kept.')) return;
    setHistoryBusy(true);
    try { await api.delete('/ai/history'); setHistory([]); setHistoryCursor(null); setActive(null); toast.success('Analysis history cleared'); }
    catch (e) { toast.error('History not cleared', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setHistoryBusy(false); }
  }

  async function analyze(e: React.FormEvent) {
    e.preventDefault(); if (!resumeId) return;
    setBusy(true); setError('');
    const selectedMode = mode;
    try {
      const { resume } = await api.get<{ resume: Resume }>(`/resumes/${resumeId}`);
      const body = selectedMode === 'tailor' ? { resumeId, jobDescription } : selectedMode === 'review' ? { resumeId, resumeText: resumeToText(resume) } : selectedMode === 'interview' ? { resumeId, resumeText: resumeToText(resume), jobDescription, position } : { resumeId, resumeText: resumeToText(resume), jobDescription };
      const result = await api.post<Record<string, unknown>>(`/ai/${selectedMode}`, body);
      const analysis: Analysis = { id: crypto.randomUUID(), mode: selectedMode, title: `${TOOLS.find(t => t.id === selectedMode)?.name} · ${resume.title}`, date: new Date().toISOString(), resumeId, result };
      setActive(analysis);
      try { const saved = await api.get<HistoryResponse>('/ai/history'); setHistory(fromHistory(saved.history)); setHistoryCursor(saved.nextCursor); }
      catch { toast.warning('History could not be loaded', 'Download this analysis to keep a copy.'); }
      toast.success('Analysis ready');
    } catch (e) { setError(e instanceof Error ? e.message : 'The analysis failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return <AppLayout title="Career Assistant">
    <h1 className="page-title mb-2">Make every application more focused</h1><p className="text-muted mb-8">Review your resume, compare a role, and practice your interview. AI feedback is guidance for you to assess.</p>
    {loading ? <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto my-20" /> : <>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">{TOOLS.map(t => <button className={`card p-4 text-left transition-all ${mode === t.id ? 'ring-2 ring-blue-500' : 'hover:border-blue-300'}`} disabled={busy} onClick={() => { setMode(t.id); setError(''); }} key={t.id} aria-pressed={mode === t.id}><t.icon className="w-5 h-5 text-blue-600 mb-2" /><h2 className="font-semibold text-sm mb-1">{t.name}</h2><p className="text-xs text-muted">{t.description}</p></button>)}</div>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6"><div className="space-y-6"><form className="card p-6 space-y-5" onSubmit={analyze}>
        <label className="block"><span className="label">Your saved resume</span><select className="input" required disabled={busy} value={resumeId} onChange={e => setResumeId(e.target.value)}><option value="">Choose a resume</option>{resumes.map(r => <option key={r.id} value={r.id}>{r.title}</option>)}</select></label>
        {resumes.length === 0 && <p className="text-sm text-muted">Create a resume first to get useful analysis. <Link className="text-blue-600 hover:underline" to="/resumes/new">Create resume</Link></p>}
        {mode === 'interview' && <label className="block"><span className="label">Target position</span><input className="input" required maxLength={200} disabled={busy} value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Frontend Engineer" /></label>}
        {mode !== 'review' && <label className="block"><span className="label">Job description {mode === 'interview' && '(optional)'}</span><textarea className="textarea" rows={9} required={mode !== 'interview'} maxLength={20000} disabled={busy} value={jobDescription} onChange={e => setJobDescription(e.target.value)} placeholder="Paste the role responsibilities and required skills" /></label>}
        <p className="text-xs text-muted">Your selected resume text and these application details are sent to the configured AI provider. Never add skills or achievements you cannot support.</p>
        {mode === 'tailor' && <p className="text-sm text-muted">This action creates a new saved draft. Your original resume is preserved. Review every change before applying.</p>}
        {config && !allowed && <p className="text-sm text-amber-600">This tool requires Pro or Premium. <Link to="/pricing" className="underline">View plans{config.billing.developmentMode ? ' and try Pro locally' : ''}</Link>.</p>}
        {config && !config.ai.configured && <p className="text-sm text-amber-600">AI is unavailable on this deployment. Editing and exports remain available.</p>}
        <button className="btn-primary w-full" disabled={busy || !resumeId || !config?.ai.configured || !allowed}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}{busy ? 'Preparing feedback…' : mode === 'tailor' ? 'Create tailored draft' : `Run ${TOOLS.find(t => t.id === mode)?.name.toLowerCase()}`}</button>
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      </form>
      <div className="card p-5"><div className="flex justify-between items-center gap-3 mb-3"><h2 className="font-semibold">Saved analyses</h2><button className="text-xs text-red-600 flex gap-1" disabled={historyBusy || history.length === 0} onClick={() => void clearHistory()}><Trash2 className="w-3 h-3" />Clear history</button></div><p className="text-xs text-muted mb-4">Your results are saved in your account. Download copies or clear saved results here.</p>{history.length ? <div className="space-y-2">{history.map(a => <button className={`w-full p-3 rounded-lg text-left text-sm ${a.id === active?.id ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`} key={a.id} onClick={() => setActive(a)}><span className="block font-medium">{a.title}</span><span className="text-xs text-muted">{new Date(a.date).toLocaleString()}</span></button>)}</div> : <p className="text-sm text-muted">Your results will appear here.</p>}{historyCursor && <button className="btn-secondary btn-sm mt-4" disabled={historyBusy} onClick={() => void moreHistory()}>{historyBusy && <Loader2 className="w-3 h-3 animate-spin" />}Load more</button>}</div></div>
      <div className="card p-6 min-h-96">{active ? <><div className="flex flex-wrap justify-between gap-3 items-start mb-6"><div><h2 className="font-semibold text-lg">{active.title}</h2><p className="text-xs text-muted mt-1">{new Date(active.date).toLocaleString()}</p></div><button className="btn-secondary btn-sm" onClick={() => downloadText('career-analysis.txt', analysisText(active))}><Download className="w-4 h-4" />Download</button></div>
        {(['overallScore', 'matchScore'] as const).map(key => typeof active.result[key] === 'number' && <div key={key} className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-5 mb-6"><span className="text-4xl font-bold text-blue-600">{Math.max(0, Math.min(100, Number(active.result[key])))}</span><span className="text-muted"> / 100</span><p className="text-sm font-medium mt-2">Estimated {key === 'matchScore' ? 'job match' : 'resume quality'}</p><p className="text-xs text-muted mt-1">This estimate is guidance, not a score from an employer's ATS.</p></div>)}
        <div className="space-y-6">{Object.entries(active.result).filter(([key]) => !['overallScore', 'matchScore'].includes(key)).map(([key, value]) => {
          const items = stringList(value);
          if (items.length) return <section key={key}><h3 className="font-semibold mb-3">{labels[key] || key}</h3><ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">{items.map((text, index) => <li className="flex gap-2" key={index}><span className="text-blue-500">•</span><span>{text}</span></li>)}</ul></section>;
          if (Array.isArray(value) && value.some(q => q && typeof q.question === 'string')) return <section key={key}><h3 className="font-semibold mb-3">{labels[key] || key}</h3><div className="space-y-3">{value.filter(q => q && typeof q.question === 'string').map((q, index) => <details className="border border-slate-200 dark:border-slate-700 rounded-lg p-4" key={index}><summary className="font-medium text-sm cursor-pointer">{q.question}</summary><p className="text-xs text-muted mt-3">{q.hint}</p><textarea className="textarea mt-3" rows={3} aria-label={`Practice answer for question ${index + 1}`} placeholder="Practice your answer here (not saved)" /></details>)}</div></section>;
          if (Array.isArray(value) && value.some(q => q && typeof q.keyword === 'string')) return <section key={key}><h3 className="font-semibold mb-3">{labels[key] || key}</h3><div className="space-y-3">{value.filter(q => q && typeof q.keyword === 'string').map((q, index) => <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4" key={index}><h4 className="font-semibold text-sm">{q.keyword}</h4><p className="text-sm text-muted mt-1">{q.reason}</p><p className="text-xs text-blue-600 mt-2">Suggested section: {q.suggestedSection}</p></div>)}</div></section>;
          if (key === 'draftResumeId') return null;
          return typeof value === 'string' && value ? <section key={key}><h3 className="font-semibold mb-2">{labels[key] || key}</h3><p className="text-sm text-muted whitespace-pre-wrap">{value}</p></section> : null;
        })}</div>
        {active.mode === 'tailor' && active.result.resume && typeof active.result.resume === 'object' && 'id' in active.result.resume && <Link to={`/resumes/${String(active.result.resume.id)}/edit`} className="btn-primary mt-8">Review tailored resume</Link>}
        {active.mode !== 'tailor' && active.resumeId && <Link to={`/resumes/${active.resumeId}/edit`} className="btn-primary mt-8">Open this resume</Link>}
      </> : <div className="flex flex-col items-center justify-center h-full text-center py-16"><Sparkles className="w-12 h-12 text-blue-400 mb-5" /><h2 className="text-lg font-semibold mb-2">Your next step, made clearer</h2><p className="text-sm text-muted max-w-sm">Select a resume and a tool. Review strengths, improvement suggestions, or practice questions here.</p></div>}</div></div>
    </>}
  </AppLayout>;
}
