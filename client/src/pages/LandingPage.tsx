import { Link } from 'react-router-dom';
import {
  FileText, Sparkles, Target, Download, CheckCircle, ArrowRight,
  Star, BarChart2, Layers,
  ChevronDown, Menu, X
} from 'lucide-react';
import { useState } from 'react';

const TEMPLATES_PREVIEW = [
  { name: 'Classic Professional', color: '#2563EB', accent: '#1e40af' },
  { name: 'Modern Minimalist', color: '#059669', accent: '#047857' },
  { name: 'Software Engineer', color: '#7C3AED', accent: '#6d28d9' },
  { name: 'Executive', color: '#1e293b', accent: '#0f172a' },
  { name: 'Graduate', color: '#0891b2', accent: '#0e7490' },
  { name: 'Creative Pro', color: '#dc2626', accent: '#b91c1c' },
];

const FEATURES = [
  { icon: Sparkles, title: 'AI-Powered Writing', desc: 'Generate professional summaries, enhance bullet points, and tailor your resume for any job using OpenRouter AI.' },
  { icon: Target, title: 'ATS Optimization', desc: 'Analyze your resume against job descriptions and identify critical keywords to improve your application.' },
  { icon: Layers, title: '12 Professional Templates', desc: 'Choose from classic, modern, and visual layouts, including dedicated ATS-focused designs.' },
  { icon: Download, title: 'Document Export', desc: 'Download a resume with selectable PDF text. Plain text is included; DOCX is available on Pro.' },
  { icon: FileText, title: 'Cover Letters', desc: 'Generate tailored cover letters that match your resume to specific job opportunities.' },
  { icon: BarChart2, title: 'Resume Analytics', desc: 'Track your resume completion score and get actionable improvement suggestions.' },
];

const HOW_IT_WORKS = [
  { step: '01', title: 'Create Your Profile', desc: 'Add your work experience, education, skills, and accomplishments.' },
  { step: '02', title: 'Choose a Template', desc: 'Select from 12 professional templates and customize colors, fonts, and layout.' },
  { step: '03', title: 'Enhance with AI', desc: 'Use AI tools to write better bullet points, generate summaries, and optimize for ATS.' },
  { step: '04', title: 'Download & Apply', desc: 'Export your polished, ATS-friendly resume as a PDF and start applying.' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Software Engineer', text: '[Sample review] The AI summary generator saved me hours. My resume finally sounds professional and targeted.', stars: 5 },
  { name: 'James K.', role: 'Marketing Manager', text: '[Sample review] The ATS analysis helped me understand exactly what keywords were missing from my applications.', stars: 5 },
  { name: 'Priya L.', role: 'Data Scientist', text: '[Sample review] I went from zero interviews to multiple callbacks after using the job match feature to tailor my resume.', stars: 5 },
];

const FAQS = [
  { q: 'Are the resumes really ATS-friendly?', a: 'Our ATS-focused templates use single-column layouts, standard headings, and selectable text to maximize parsing compatibility. However, no tool can guarantee results with every employer\'s ATS system.' },
  { q: 'How does the AI work?', a: 'We use the OpenRouter API to connect to advanced language models. All AI requests are processed server-side — your API key is never exposed in the browser.' },
  { q: 'How is my data used?', a: 'Your documents are stored in your account. When you request AI assistance, relevant content is sent to OpenRouter and the configured model provider. You can edit, export, or delete your saved data in Settings. Read our Privacy Policy for details.' },
  { q: 'What\'s included in the free plan?', a: 'The free plan includes up to 3 resumes, 6 templates, basic AI features (20 uses/month), and PDF export.' },
  { q: 'Can I import my existing resume?', a: 'Yes! You can upload a PDF or DOCX file. We extract the text and help you organize it into our structured format using AI.' },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-slate-900 dark:text-white">CV Creator Pro</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              <Link to="/templates" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Templates</Link>
              <Link to="/pricing" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Pricing</Link>
              <a href="#features" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
              <a href="#faq" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQ</a>
            </div>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="btn-secondary btn-sm">Log In</Link>
              <Link to="/register" className="btn-primary btn-sm">Get Started Free</Link>
            </div>

            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-4 py-4 space-y-3">
            <Link to="/templates" className="block text-slate-700 dark:text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Templates</Link>
            <Link to="/pricing" className="block text-slate-700 dark:text-slate-300 py-2" onClick={() => setMenuOpen(false)}>Pricing</Link>
            <Link to="/login" className="block btn-secondary w-full text-center" onClick={() => setMenuOpen(false)}>Log In</Link>
            <Link to="/register" className="block btn-primary w-full text-center" onClick={() => setMenuOpen(false)}>Get Started Free</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="hero-gradient pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-8 border border-white/20">
            <Sparkles className="w-4 h-4" />
            AI-Powered Resume Builder
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight tracking-tight">
            Build Resumes That<br />
            <span className="text-yellow-300">Get You Hired</span>
          </h1>

          <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
            Create professional, ATS-optimized resumes with AI assistance.
            Tailor every application. Land more interviews.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/register" className="btn-primary btn-lg text-base px-8 py-4 shadow-xl hover:shadow-2xl bg-white text-blue-700 hover:bg-blue-50">
              Build My Resume Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/templates" className="btn-lg text-base px-8 py-4 text-white border-2 border-white/30 rounded-xl hover:bg-white/10 transition-all inline-flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Explore Templates
            </Link>
          </div>

          {/* Mini resume preview */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-white/20" style={{ aspectRatio: '16/9' }}>
              <div className="flex h-full">
                {/* Left sidebar preview */}
                <div className="w-1/3 bg-blue-700 p-6 flex flex-col gap-3">
                  <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-2" />
                  <div className="h-4 bg-white/30 rounded w-3/4 mx-auto" />
                  <div className="h-3 bg-white/20 rounded w-1/2 mx-auto" />
                  <div className="mt-4 space-y-2">
                    {[80, 95, 70, 85].map((w, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="h-2 bg-white/20 rounded flex-1" />
                        <div className="h-2 bg-yellow-300 rounded" style={{ width: `${w * 0.4}%` }} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right content preview */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="space-y-1">
                    <div className="h-5 bg-slate-200 rounded w-1/2" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="h-3 bg-blue-600 rounded w-24 mb-2" />
                    {[100, 90, 80].map((w, i) => (
                      <div key={i} className="h-2 bg-slate-100 rounded mb-1.5" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="h-3 bg-blue-600 rounded w-20 mb-2" />
                    {[90, 75].map((w, i) => (
                      <div key={i} className="h-2 bg-slate-100 rounded mb-1.5" style={{ width: `${w}%` }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 bg-slate-50 dark:bg-slate-800 border-y border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: 'Resume Templates', value: '12' },
              { label: 'Writing Assistance', value: 'AI' },
              { label: 'Export Formats', value: 'PDF, TXT' },
              { label: 'Preview', value: 'Live' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stat.value}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Everything You Need to Land Your Next Role
            </h2>
            <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Powerful AI tools combined with beautiful templates to help you create the perfect resume.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Template Gallery */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Professional Templates</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400">Choose from 12 beautifully designed, templates with ATS-focused options.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {TEMPLATES_PREVIEW.map((t) => (
              <Link to="/register" key={t.name} className="group">
                <div className="aspect-[3/4] rounded-xl overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all shadow-sm">
                  <div className="h-full flex flex-col" style={{ backgroundColor: t.color }}>
                    <div className="h-1/4 p-2 flex flex-col gap-1">
                      <div className="h-2 bg-white/30 rounded w-3/4" />
                      <div className="h-1 bg-white/20 rounded w-1/2" />
                    </div>
                    <div className="flex-1 bg-white p-2 space-y-1">
                      {[100, 85, 90, 70, 80, 65].map((w, i) => (
                        <div key={i} className="h-1 bg-slate-200 rounded" style={{ width: `${w}%` }} />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-center mt-2 text-slate-600 dark:text-slate-400 font-medium">{t.name}</p>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link to="/templates" className="btn-primary btn-lg">
              View All Templates <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">How It Works</h2>
            <p className="text-xl text-slate-500 dark:text-slate-400">Get your professional resume in minutes.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={step.step} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
              <div className="hidden md:block mt-6 h-0.5 bg-gradient-to-r from-blue-200 to-violet-200 dark:from-blue-800 dark:to-violet-800" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ATS Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-blue-900 to-violet-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6 border border-white/20">
                <Target className="w-4 h-4" />
                ATS Optimization
              </div>
              <h2 className="text-4xl font-bold mb-6">Beat the Bots. Reach Human Eyes.</h2>
              <p className="text-blue-100 text-lg leading-relaxed mb-6">
                A clear, well-structured resume makes your experience easier to understand.
                Our ATS analysis helps you assess relevant keywords, identify content issues,
                and how well your resume matches the job description.
              </p>
              <div className="space-y-3">
                {[
                  'Keyword gap analysis against job descriptions',
                  'Formatting compatibility check',
                  'Section completeness review',
                  'Grammar and clarity suggestions',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-blue-100">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-blue-300 text-xs mt-4 italic">
                * ATS scores shown are estimated internal heuristics and do not represent actual scores from any employer's system.
              </p>
            </div>
            <div className="bg-white/10 rounded-2xl p-6 border border-white/20">
              <div className="text-sm font-medium text-blue-200 mb-4">Resume Analysis</div>
              {[
                { label: 'ATS Compatibility', score: 85, color: 'bg-green-400' },
                { label: 'Keyword Match', score: 72, color: 'bg-blue-400' },
                { label: 'Content Quality', score: 91, color: 'bg-violet-400' },
                { label: 'Completeness', score: 78, color: 'bg-yellow-400' },
              ].map(item => (
                <div key={item.label} className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/80">{item.label}</span>
                    <span className="font-semibold">{item.score}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color} transition-all`} style={{ width: `${item.score}%` }} />
                  </div>
                </div>
              ))}
              <p className="text-xs text-blue-300 mt-2 italic">Example scores for illustration purposes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">What Users Say</h2>
            <p className="text-slate-500 dark:text-slate-400">Sample testimonials — real reviews coming soon as we grow!</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="card p-6">
                <div className="flex mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-4 italic">"{t.text}"</p>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">{t.name}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-4 bg-slate-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-slate-500 dark:text-slate-400 mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: 'Free', price: '$0', features: ['3 resumes', '6 templates', '20 AI uses/month', 'PDF export'], cta: 'Get Started' },
              { name: 'Pro', price: 'Coming soon', features: ['Unlimited resumes', 'All 12 templates', '200 AI uses/month', 'ATS analysis', 'Cover letters', 'DOCX export'], cta: 'View Plans', highlight: true },
              { name: 'Premium', price: 'Coming soon', features: ['Everything in Pro', '1000 AI uses/month', 'All template styles', 'Interview preparation', 'AI tailoring'], cta: 'View Plans' },
            ].map((plan) => (
              <div key={plan.name} className={`card p-8 ${plan.highlight ? 'border-2 border-blue-500 ring-4 ring-blue-100 dark:ring-blue-900/40' : ''}`}>
                {plan.highlight && (
                  <div className="badge-blue mb-3">Most Popular</div>
                )}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-6">{plan.price}</div>
                <ul className="space-y-2 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to={plan.name === 'Free' ? '/register' : '/pricing'} className={plan.highlight ? 'btn-primary w-full justify-center' : 'btn-secondary w-full justify-center'}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 mt-8 text-blue-600 dark:text-blue-400 font-medium hover:underline">
            See full pricing details <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left"
                >
                  <span className="font-semibold text-slate-900 dark:text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-slate-600 dark:text-slate-300 text-sm leading-relaxed border-t border-slate-100 dark:border-slate-700 pt-4">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 hero-gradient">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Build Your Perfect Resume?</h2>
            <p className="text-xl text-blue-100 mb-10">Create a clear application that reflects your experience.</p>
          <Link to="/register" className="btn-primary btn-lg bg-white text-blue-700 hover:bg-blue-50 shadow-xl text-lg px-10 py-4">
            Start Building for Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-violet-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white text-lg">CV Creator Pro</span>
              </div>
              <p className="text-sm leading-relaxed">AI-powered resume builder helping professionals land their next opportunity.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/templates" className="hover:text-white transition-colors">Templates</Link></li>
                <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/register" className="hover:text-white transition-colors">Sign Up</Link></li>
                <li><Link to="/login" className="hover:text-white transition-colors">Log In</Link></li>
                <li><Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm">© {new Date().getFullYear()} CV Creator Pro. All rights reserved.</p>
            <Link to="/templates" className="hover:text-white transition-colors">Explore resume templates</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
