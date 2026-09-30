import { Link } from 'react-router-dom';
import { FileText, LayoutDashboard, Mail, Compass, Settings, LogOut, Menu, X, Layers, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Layers, label: 'Templates', href: '/templates' },
  { icon: Mail, label: 'Cover Letters', href: '/cover-letters' },
  { icon: Compass, label: 'Career Assistant', href: '/career-assistant' },
  { icon: Settings, label: 'Settings', href: '/settings' },
  { icon: CreditCard, label: 'Plans', href: '/pricing' },
];

export default function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try { await logout(); navigate('/'); }
    catch (e) { toast.error('Unable to log out', e instanceof Error ? e.message : 'Please try again.'); }
    finally { setLoggingOut(false); }
  }

  const sidebar = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-700">
        <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-900 dark:text-white">CV Creator Pro</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.href + item.label}
            to={item.href}
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white transition-all text-sm font-medium group"
          >
            <item.icon className="w-5 h-5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</div>
          </div>
        </div>
        <button
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full transition-all text-sm"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Logging out…' : 'Log out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-900">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 xl:w-72 flex-col bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Mobile sidebar */}
      <aside className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="absolute top-4 right-4">
          <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Main content */}
      <main className="flex-1 lg:ml-64 xl:ml-72 min-h-screen flex flex-col">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 sm:px-6 h-16 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
              className="lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600"
            >
              <Menu className="w-5 h-5" />
            </button>
            {title && (
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300 capitalize">{user?.plan || 'free'}</span>
            </div>
            <Link to="/settings" className="w-9 h-9 bg-gradient-to-br from-blue-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Link>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

