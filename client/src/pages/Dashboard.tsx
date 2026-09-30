import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Clock, MoreVertical, Copy, Trash2, Edit3, Search,
  BarChart2, CheckCircle, TrendingUp, Mail, Compass
} from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import type { Resume } from '../types/resume';

function ResumeCard({ resume, onDelete, onDuplicate, onRename }: {
  resume: Resume;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(resume.title);

  function handleRename() {
    if (title.trim() && title !== resume.title) {
      onRename(resume.id, title.trim());
    }
    setRenaming(false);
    setMenuOpen(false);
  }

  const score = resume.completionScore || 0;
  const scoreColor = score >= 80 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-500';

  return (
    <div className="card group hover:shadow-md transition-all duration-200">
      {/* Template preview */}
      <Link to={`/resumes/${resume.id}/edit`} className="block">
        <div className="aspect-[3/4] rounded-t-xl overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 relative">
          <div className="absolute inset-0 flex flex-col p-4">
            <div className="h-3 bg-blue-400 rounded w-3/4 mb-2" />
            <div className="h-2 bg-slate-300 rounded w-1/2 mb-4" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-1.5 bg-slate-300 dark:bg-slate-500 rounded mb-1.5" style={{ width: `${85 - i * 5}%` }} />
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
            <span className="text-white text-sm font-medium flex items-center gap-1.5">
              <Edit3 className="w-4 h-4" /> Open Editor
            </span>
          </div>
        </div>
      </Link>

      {/* Card footer */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {renaming ? (
              <input
                autoFocus
                value={title}
                onChange={e => setTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setRenaming(false); }}
                className="input py-1 text-sm font-semibold"
              />
            ) : (
              <h3 className="font-semibold text-slate-900 dark:text-white text-sm truncate">{resume.title}</h3>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(resume.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="relative flex-shrink-0">
            <button
              onClick={(e) => { e.preventDefault(); setMenuOpen(!menuOpen); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 w-44">
                  <button onClick={() => { setRenaming(true); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <Edit3 className="w-4 h-4" /> Rename
                  </button>
                  <button onClick={() => { onDuplicate(resume.id); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300">
                    <Copy className="w-4 h-4" /> Duplicate
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-700 my-1" />
                  <button onClick={() => { onDelete(resume.id); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600">
                    <Trash2 className="w-4 h-4" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Completion indicator */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500 dark:text-slate-400">Completion</span>
            <span className={`text-xs font-semibold ${scoreColor}`}>{score}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
              style={{ width: `${score}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchResumes();
  }, []);

  async function fetchResumes() {
    try {
      const { resumes } = await api.get<{ resumes: Resume[] }>('/resumes');
      setResumes(resumes);
    } catch (err: any) {
      toast.error('Failed to load resumes', err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    navigate('/resumes/new');
  }

  async function handleDelete(id: string) {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }
    try {
      await api.delete(`/resumes/${id}`);
      setResumes(prev => prev.filter(r => r.id !== id));
      toast.success('Resume deleted');
    } catch (err: any) {
      toast.error('Delete failed', err.message);
    }
    setDeleteConfirm(null);
  }

  async function handleDuplicate(id: string) {
    try {
      const { resume } = await api.post<{ resume: Resume }>(`/resumes/${id}/duplicate`);
      setResumes(prev => [resume, ...prev]);
      toast.success('Resume duplicated!');
    } catch (err: any) {
      toast.error('Duplicate failed', err.message);
    }
  }

  async function handleRename(id: string, title: string) {
    try {
      const { resume } = await api.put<{ resume: Resume }>(`/resumes/${id}`, { title });
      setResumes(prev => prev.map(r => r.id === id ? { ...r, title: resume.title } : r));
      toast.success('Resume renamed');
    } catch (err: any) {
      toast.error('Rename failed', err.message);
    }
  }

  const filtered = resumes.filter(r =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.professionalTitle || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AppLayout title="Dashboard">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {resumes.length === 0 ? 'Create your first resume to get started.' : `You have ${resumes.length} resume${resumes.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
        <button onClick={handleCreate} className="btn-primary btn-lg flex-shrink-0">
          <Plus className="w-5 h-5" />
          New Resume
        </button>
      </div>

      {/* Quick stats */}
      {resumes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { icon: FileText, label: 'Total Resumes', value: resumes.length, color: 'text-blue-600' },
            { icon: CheckCircle, label: 'Avg. Completion', value: `${Math.round(resumes.reduce((a, r) => a + (r.completionScore || 0), 0) / resumes.length)}%`, color: 'text-green-600' },
            { icon: TrendingUp, label: 'Best Score', value: `${Math.max(...resumes.map(r => r.completionScore || 0))}%`, color: 'text-violet-600' },
            { icon: BarChart2, label: 'Plan', value: user?.plan || 'Free', color: 'text-amber-600', capitalize: true },
          ].map(stat => (
            <div key={stat.label} className="card p-4">
              <div className="flex items-center gap-2 mb-2">
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
              </div>
              <div className={`text-2xl font-bold ${stat.color} ${stat.capitalize ? 'capitalize' : ''}`}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {resumes.length > 2 && (
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search resumes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
      )}

      {/* Resume grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card">
              <div className="aspect-[3/4] skeleton rounded-t-xl" />
              <div className="p-4 space-y-2">
                <div className="skeleton h-4 rounded w-3/4" />
                <div className="skeleton h-3 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-24 px-4 text-center">
          {resumes.length === 0 ? (
            <>
              <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">No resumes yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
                Create your first resume and let AI help you craft the perfect application.
              </p>
              <button onClick={handleCreate} className="btn-primary btn-lg">
                <Plus className="w-5 h-5" />
                Create My First Resume
              </button>
            </>
          ) : (
            <>
              <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">No results found</h3>
              <p className="text-slate-500 dark:text-slate-400">Try a different search term.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {/* Create new card */}
          <button
            onClick={handleCreate}
            className="card border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 flex flex-col items-center justify-center aspect-[3/4] cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-all group rounded-xl"
          >
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 rounded-full flex items-center justify-center mb-3 transition-colors">
              <Plus className="w-6 h-6 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </div>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">New Resume</span>
          </button>

          {filtered.map(resume => (
            <div key={resume.id} className={deleteConfirm === resume.id ? 'ring-2 ring-red-400 rounded-xl' : ''}>
              <ResumeCard
                resume={resume}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
              {deleteConfirm === resume.id && (
                <div className="mt-1 text-center">
                  <p className="text-xs text-red-600 font-medium mb-2">Permanently delete this resume?</p><button className="btn-danger btn-sm mr-2" onClick={() => void handleDelete(resume.id)}>Confirm delete</button><button className="btn-secondary btn-sm" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link to="/cover-letters" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer">
          <div className="w-12 h-12 bg-violet-50 dark:bg-violet-900/30 rounded-xl flex items-center justify-center group-hover:bg-violet-100 transition-colors">
            <Mail className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Cover Letters</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Generate AI-powered cover letters</p>
          </div>
        </Link>

        <Link to="/career-assistant" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer">
          <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <Compass className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Career Assistant</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Interview prep & job match analysis</p>
          </div>
        </Link>

        <Link to="/settings" className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow group cursor-pointer">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-green-100 transition-colors">
            <BarChart2 className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Account Settings</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Manage your profile and plan</p>
          </div>
        </Link>
      </div>
    </AppLayout>
  );
}
