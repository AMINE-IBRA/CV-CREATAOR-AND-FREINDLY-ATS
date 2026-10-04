import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PublicLayout({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  const { isAuthenticated } = useAuth();
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
    <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4" aria-label="Main navigation">
        <Link to="/" className="font-bold text-lg flex gap-2 items-center"><FileText className="text-blue-600 w-6 h-6" />CV Creator Pro</Link>
        <div className="flex flex-wrap gap-4 text-sm items-center"><Link to="/templates" className="hover:text-blue-600">Templates</Link><Link to="/pricing" className="hover:text-blue-600">Plans</Link><Link to={isAuthenticated ? '/dashboard' : '/login'} className="btn-primary btn-sm">{isAuthenticated ? 'Dashboard' : 'Log in'}</Link></div>
      </nav>
    </header>
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <Link to={isAuthenticated ? '/dashboard' : '/'} className="inline-flex items-center gap-1 text-sm text-slate-500 mb-6 hover:text-blue-600"><ArrowLeft className="w-4 h-4" />{isAuthenticated ? 'Back to dashboard' : 'Back to home'}</Link>
      <h1 className="text-3xl font-bold mb-3">{title}</h1>{description && <p className="text-muted max-w-3xl mb-8">{description}</p>}
      {children}
    </main>
    <footer className="max-w-7xl mx-auto border-t border-slate-200 dark:border-slate-700 px-4 sm:px-6 py-6 text-sm text-muted flex flex-wrap justify-between gap-4"><span>© {new Date().getFullYear()} CV Creator Pro</span><div className="flex flex-wrap gap-4"><Link to="/contact">Contact</Link><Link to="/refunds">Refunds</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>
  </div>;
}
