import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { safeDestination } from '../lib/api';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = safeDestination(location.state?.from);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error('Password too short', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      navigate(destination, { replace: true });
      toast.success('Welcome to CV Creator Pro! 🎉', 'Your account is ready. Start building your resume.');
    } catch (err: any) {
      toast.error('Registration failed', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 hero-gradient flex-col items-center justify-center p-12 text-white">
        <Link to="/" className="flex items-center gap-2 mb-16">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold">CV Creator Pro</span>
        </Link>
        <h2 className="text-4xl font-bold mb-6 text-center">Build your career story</h2>
        <div className="space-y-4 text-blue-100">
          {[
            'AI-powered writing assistance',
            '12 professional templates',
            'ATS optimization analysis',
            'Unlimited edits, instant PDF exports',
          ].map(f => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">CV Creator Pro</span>
          </Link>

          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Create your free account</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Already have an account? <Link to="/login" state={{ from: destination }} className="text-blue-600 hover:underline font-medium">Log in</Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="name" className="label">Full name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="input"
                placeholder="Jane Doe"
                required
                minLength={2}
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="register-email" className="label">Email address</label>
              <input
                id="register-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input"
                placeholder="jane@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="register-password" className="label">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className={`flex-1 h-1 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-slate-200'}`} />
                  <span className={`text-xs ${password.length >= 8 ? 'text-green-600' : 'text-slate-400'}`}>
                    {password.length >= 8 ? 'Minimum length met' : 'Too short'}
                  </span>
                </div>
              )}
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center btn-lg">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Free Account'}
            </button>
          </form>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-6 text-center">
            By creating an account, you agree to our{' '}
            <Link to="/terms" className="hover:underline">Terms of Service</Link> and{' '}
            <Link to="/privacy" className="hover:underline">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
