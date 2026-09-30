import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Loader2, Save, Shield, Download, Trash2, Palette, UserRound, Sparkles } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import { useAuth, applyTheme } from '../contexts/AuthContext';
import type { Theme } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import type { AppConfig, PlanEntitlements } from '../lib/api';
import type { User, Resume, CoverLetter } from '../types/resume';
import { TEMPLATE_LIST } from '../components/templates/ResumeTemplates';
import { downloadBlob } from '../lib/documentExports';

interface Usage { plan: string; aiUsageCount: number; aiLimit: number; resumeCount: number; resumeLimit: number | null; resetAt: string; entitlements: PlanEntitlements }
type PreferencesUser = User & { theme?: Theme; defaultTemplateId?: string };
export default function SettingsPage() {
  const { user, updateUser, clearSession } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [theme, setTheme] = useState<Theme>((user as PreferencesUser)?.theme || 'system');
  const [defaultTemplateId, setDefaultTemplateId] = useState((user as PreferencesUser)?.defaultTemplateId || 'classic-professional');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [usage, setUsage] = useState<Usage | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => { const controller = new AbortController(); Promise.all([api.get<Usage>('/auth/usage', { signal: controller.signal }), api.get<AppConfig>('/config', { signal: controller.signal })]).then(([stats, configuration]) => { setUsage(stats); setConfig(configuration); }).catch(e => { if (!controller.signal.aborted) setError(e.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, []);
  async function profile(e: React.FormEvent) {
    e.preventDefault(); setBusy('profile');
    try { const { user: updated } = await api.put<{ user: User }>('/auth/profile', { name: name.trim(), avatarUrl: avatarUrl.trim() || null }); updateUser(updated); toast.success('Profile saved'); }
    catch (e) { toast.error('Profile not saved', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function preferences(e: React.FormEvent) {
    e.preventDefault(); setBusy('preferences');
    try { const { user: updated } = await api.put<{ user: User }>('/auth/preferences', { theme, defaultTemplateId }); updateUser(updated); applyTheme(theme); toast.success('Preferences saved'); }
    catch (e) { toast.error('Preferences not saved', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function changePassword(e: React.FormEvent) {
    e.preventDefault(); if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; } setBusy('password');
    try { await api.put('/auth/password', { currentPassword, newPassword }); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); toast.success('Password changed', 'Other sessions have been signed out.'); }
    catch (e) { toast.error('Password not changed', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function exportData() {
    setBusy('export');
    try {
      const [resumeList, letters] = await Promise.all([api.get<{ resumes: Resume[] }>('/resumes'), api.get<{ coverLetters: CoverLetter[] }>('/cover-letters')]);
      const resumes = await Promise.all(resumeList.resumes.map(r => api.get<{ resume: Resume }>(`/resumes/${r.id}`).then(result => result.resume)));
      downloadBlob('cv-creator-account-data.json', new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), profile: user, resumes, coverLetters: letters.coverLetters }, null, 2)], { type: 'application/json' }));
      toast.success('Account data downloaded');
    } catch (e) { toast.error('Data export failed', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault(); if (deleteConfirmation !== 'DELETE') return;
    if (!window.confirm('Permanently delete your account, all saved resumes, cover letters and sessions? This cannot be undone.')) return;
    setBusy('delete');
    try { await api.delete('/auth/account', { password: deletePassword }); clearSession(); navigate('/', { replace: true }); toast.success('Account deleted'); }
    catch (e) { toast.error('Account not deleted', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setBusy(''); }
  }
  const saveButton = (key: string, text = 'Save changes') => <button className="btn-primary" disabled={!!busy}>{busy === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{text}</button>;
  return <AppLayout title="Account Settings">
    <h1 className="page-title mb-2">Your account, your preferences</h1><p className="text-muted mb-8">Manage your profile, document defaults, password, and saved data.</p>
    {loading ? <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto my-20" /> : <>
      {error && <p role="alert" className="card p-4 text-red-600 mb-6">{error}</p>}
      <div className="grid lg:grid-cols-2 gap-6">
        <form className="card p-6 space-y-5" onSubmit={profile}><h2 className="text-lg font-semibold flex items-center gap-2"><UserRound className="w-5 h-5 text-blue-600" />Profile</h2><label className="block"><span className="label">Full name</span><input className="input" value={name} onChange={e => setName(e.target.value)} minLength={2} maxLength={100} required autoComplete="name" /></label><label className="block"><span className="label">Email</span><input className="input" value={user?.email || ''} readOnly type="email" /></label><label className="block"><span className="label">Avatar image URL (optional)</span><input className="input" type="url" value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} maxLength={2000} placeholder="https://…" /></label>{saveButton('profile', 'Save profile')}</form>
        <form className="card p-6 space-y-5" onSubmit={preferences}><h2 className="text-lg font-semibold flex items-center gap-2"><Palette className="w-5 h-5 text-violet-600" />Appearance and defaults</h2><label className="block"><span className="label">Theme</span><select className="input" value={theme} onChange={e => setTheme(e.target.value as Theme)}><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label className="block"><span className="label">Default resume template</span><select className="input" value={defaultTemplateId} onChange={e => setDefaultTemplateId(e.target.value)}>{TEMPLATE_LIST.filter(t => !usage || usage.entitlements.templates.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label><p className="text-xs text-muted">The default applies to new resumes. Existing documents keep their chosen template.</p>{saveButton('preferences', 'Save preferences')}</form>
        <form className="card p-6 space-y-5" onSubmit={changePassword}><h2 className="text-lg font-semibold flex items-center gap-2"><Shield className="w-5 h-5 text-green-600" />Change password</h2><label className="block"><span className="label">Current password</span><input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required /></label><label className="block"><span className="label">New password</span><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={100} value={newPassword} onChange={e => setNewPassword(e.target.value)} required /></label><label className="block"><span className="label">Confirm new password</span><input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required /></label>{saveButton('password', 'Update password')}</form>
        <div className="card p-6 space-y-5"><h2 className="text-lg font-semibold flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-600" />Plan and usage</h2>{usage ? <><div className="flex justify-between gap-3"><span className="font-semibold capitalize">{usage.plan} plan</span><Link className="text-sm text-blue-600 hover:underline" to="/pricing">View plans</Link></div><div><p className="text-sm mb-2">{usage.aiUsageCount} / {usage.aiLimit} AI requests used</p><div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"><div className="h-full bg-blue-600" style={{ width: `${Math.min(100, usage.aiUsageCount / Math.max(1, usage.aiLimit) * 100)}%` }} /></div><p className="text-xs text-muted mt-2">Allowance resets {new Date(usage.resetAt).toLocaleDateString()}</p></div><p className="text-sm">{usage.resumeCount} {usage.resumeLimit === null ? 'saved resumes · Unlimited allowance' : `/ ${usage.resumeLimit} saved resumes`}</p></> : <p className="text-sm text-muted">Usage is unavailable. Try reopening Settings when the service is connected.</p>}<div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-2 text-sm"><p>AI provider: <span className={config?.ai.configured ? 'text-green-600' : 'text-amber-600'}>{config?.ai.configured ? 'Available' : 'Unavailable'}</span></p><p>Email recovery: {config?.email.configured ? 'Available' : config?.billing.developmentMode ? 'Development reset link' : 'Not configured'}</p><p>Subscriptions: {config?.billing.configured ? 'Available' : 'Not enabled'}</p></div></div>
        <div className="card p-6"><h2 className="text-lg font-semibold mb-3">Download your data</h2><p className="text-sm text-muted mb-5">Get a JSON copy of your account profile, saved resumes, and cover letters. Keep this file private: it contains your personal information.</p><button className="btn-secondary" disabled={!!busy} onClick={() => void exportData()}>{busy === 'export' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Download account data</button></div>
        <form className="card p-6 border-red-200 dark:border-red-900 space-y-4" onSubmit={deleteAccount}><h2 className="text-lg font-semibold text-red-600 flex items-center gap-2"><Trash2 className="w-5 h-5" />Delete account</h2><p className="text-sm text-muted">This permanently removes your account and saved documents. Download a copy first if you need it.</p><label className="block"><span className="label">Confirm your password</span><input className="input" type="password" autoComplete="current-password" required value={deletePassword} onChange={e => setDeletePassword(e.target.value)} /></label><label className="block"><span className="label">Type DELETE to confirm</span><input className="input" required value={deleteConfirmation} onChange={e => setDeleteConfirmation(e.target.value)} autoComplete="off" /></label><button className="btn-danger" disabled={!!busy || deleteConfirmation !== 'DELETE' || !deletePassword}>{busy === 'delete' && <Loader2 className="w-4 h-4 animate-spin" />}Permanently delete account</button></form>
      </div>
    </>}
  </AppLayout>;
}
