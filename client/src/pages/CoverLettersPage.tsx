import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Edit3, FileText, Loader2, Download, Copy, Search } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { api } from '../lib/api';
import type { AppConfig } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { CoverLetter } from '../types/resume';
import { downloadText, exportTextPDF } from '../lib/documentExports';

export default function CoverLettersPage() {
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const allowed = config?.plans[user?.plan || 'free']?.coverLetters;

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([api.get<{ coverLetters: CoverLetter[] }>('/cover-letters', { signal: controller.signal }), api.get<AppConfig>('/config', { signal: controller.signal })])
      .then(([letters, configuration]) => { setCoverLetters(letters.coverLetters); setConfig(configuration); })
      .catch(e => { if (!controller.signal.aborted) setError(e.message); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  async function create() {
    setBusy('create');
    try { const { coverLetter } = await api.post<{ coverLetter: CoverLetter }>('/cover-letters', { title: 'New Cover Letter' }); navigate(`/cover-letters/${coverLetter.id}/edit`); }
    catch (e) { toast.error('Could not create cover letter', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function remove(id: string) {
    if (!window.confirm('Permanently delete this cover letter?')) return;
    setBusy(id);
    try { await api.delete(`/cover-letters/${id}`); setCoverLetters(old => old.filter(c => c.id !== id)); toast.success('Cover letter deleted'); }
    catch (e) { toast.error('Could not delete cover letter', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function duplicate(id: string) {
    setBusy(id);
    try { const { coverLetter } = await api.post<{ coverLetter: CoverLetter }>(`/cover-letters/${id}/duplicate`); setCoverLetters(old => [coverLetter, ...old]); toast.success('Cover letter duplicated'); }
    catch (e) { toast.error('Could not duplicate cover letter', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function download(letter: CoverLetter, format: 'pdf' | 'txt') {
    const filename = letter.title.replace(/[<>:"/\\|?*]/g, '-');
    try {
      if (format === 'txt') downloadText(`${filename}.txt`, letter.content || '');
      else await exportTextPDF({ title: '', sections: [{ heading: '', text: letter.content || '' }], filename });
      toast.success('Letter downloaded');
    } catch (e) { toast.error('Export failed', e instanceof Error ? e.message : 'Please try again.'); }
  }
  const filtered = coverLetters.filter(c => `${c.title} ${c.company || ''} ${c.position || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <AppLayout title="Cover Letters">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-8"><div><h1 className="page-title">Cover Letters</h1><p className="text-muted mt-1">Turn your experience into a focused introduction.</p></div><button disabled={!!busy || !allowed} onClick={() => void create()} className="btn-primary">{busy === 'create' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}New Cover Letter</button></div>
    {config && !allowed && <div className="card border-amber-200 p-5 mb-6"><h2 className="font-semibold mb-1">Cover-letter writing is included with Pro</h2><p className="text-sm text-muted mb-3">You can still read and delete existing documents. {config.billing.developmentMode ? 'Try Pro on this local development server to create and generate letters.' : 'Paid subscriptions are not enabled on this deployment.'}</p><Link className="btn-secondary btn-sm" to="/pricing">View plans</Link></div>}
    {error && <div role="alert" className="card p-5 text-red-600 mb-6">{error}</div>}
    {coverLetters.length > 0 && <div className="relative max-w-sm mb-6"><Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" /><input className="input pl-9" aria-label="Search cover letters" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by title, company, or role" /></div>}
    {loading ? <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div> : coverLetters.length === 0 ? <div className="card flex flex-col items-center justify-center py-20 px-6 text-center"><FileText className="w-12 h-12 text-violet-500 mb-5" /><h2 className="text-lg font-semibold mb-2">Your next introduction starts here</h2><p className="text-muted mb-6 max-w-sm">Create a cover letter, connect a resume, and review a tailored AI draft before using it.</p><button disabled={!!busy || !allowed} className="btn-primary" onClick={() => void create()}><Plus className="w-4 h-4" />Create your first letter</button></div> : filtered.length === 0 ? <div className="card p-10 text-center text-muted">No cover letters match your search.</div> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(letter => <article key={letter.id} className="card p-5 flex flex-col"><div className="flex justify-between gap-3 mb-2"><h2 className="font-semibold">{letter.title}</h2><button aria-label={`Delete ${letter.title}`} disabled={!!busy} onClick={() => void remove(letter.id)} className="text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div><p className="text-sm text-muted">{letter.position}{letter.company ? ` at ${letter.company}` : ''}</p><p className="text-xs text-muted mt-1">Updated {new Date(letter.updatedAt).toLocaleDateString()}</p><p className="text-sm text-slate-600 dark:text-slate-300 my-5 line-clamp-4 flex-1">{letter.content || 'Open the editor to write your letter or generate a draft.'}</p><div className="flex flex-wrap gap-2"><Link to={`/cover-letters/${letter.id}/edit`} className="btn-primary btn-sm"><Edit3 className="w-3 h-3" />Open</Link><button className="btn-secondary btn-sm" disabled={!!busy || !allowed} onClick={() => void duplicate(letter.id)}><Copy className="w-3 h-3" />Duplicate</button>{letter.content && <><button className="btn-secondary btn-sm" onClick={() => download(letter, 'pdf')}><Download className="w-3 h-3" />PDF</button><button className="btn-secondary btn-sm" onClick={() => download(letter, 'txt')}>TXT</button></>}</div></article>)}</div>}
  </AppLayout>;
}

