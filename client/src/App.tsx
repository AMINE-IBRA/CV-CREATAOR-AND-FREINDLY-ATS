import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { safeDestination } from './lib/api';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const ResumeEditor = lazy(() => import('./pages/ResumeEditor'));
const TemplatesPage = lazy(() => import('./pages/TemplatesPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const CoverLettersPage = lazy(() => import('./pages/CoverLettersPage'));
const CoverLetterEditor = lazy(() => import('./pages/CoverLetterEditor'));
const CareerAssistant = lazy(() => import('./pages/CareerAssistant'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PasswordRecoveryPage = lazy(() => import('./pages/PasswordRecoveryPage'));

function RouteLoading() {
  return <div className="min-h-screen flex items-center justify-center" role="status" aria-label="Loading page"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;
}

class PageBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Page could not load', error, info.componentStack); }
  render() {
    if (this.state.failed) return <div className="min-h-screen p-6 flex items-center justify-center"><div className="card p-8 max-w-md text-center"><h1 className="text-xl font-bold mb-3">This page could not load</h1><p className="text-muted mb-6">Reload the page to reconnect and try again.</p><button className="btn-primary" onClick={() => window.location.reload()}>Reload page</button></div></div>;
    return this.props.children;
  }
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, sessionError, refreshSession } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (sessionError) return <SessionRetry message={sessionError} retry={() => void refreshSession()} />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
}

function SessionRetry({ message, retry }: { message: string; retry: () => void }) {
  return <div className="min-h-screen flex items-center justify-center p-6"><div className="card p-8 max-w-md text-center"><h1 className="text-xl font-bold mb-3">Unable to connect</h1><p className="text-muted mb-6">{message}</p><button className="btn-primary" onClick={retry}>Retry connection</button></div></div>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return !isAuthenticated ? <>{children}</> : <Navigate to={safeDestination(location.state?.from)} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <PageBoundary><Suspense fallback={<RouteLoading />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            {/* Auth routes */}
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/forgot-password" element={<PasswordRecoveryPage />} />
            <Route path="/reset-password" element={<PasswordRecoveryPage reset />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/resumes/new" element={<ProtectedRoute><ResumeEditor isNew /></ProtectedRoute>} />
            <Route path="/resumes/:id/edit" element={<ProtectedRoute><ResumeEditor /></ProtectedRoute>} />
            <Route path="/cover-letters" element={<ProtectedRoute><CoverLettersPage /></ProtectedRoute>} />
            <Route path="/cover-letters/:id/edit" element={<ProtectedRoute><CoverLetterEditor /></ProtectedRoute>} />
            <Route path="/career-assistant" element={<ProtectedRoute><CareerAssistant /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />

            {/* 404 */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense></PageBoundary>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
