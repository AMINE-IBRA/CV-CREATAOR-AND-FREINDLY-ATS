import { config as loadEnv } from 'dotenv';
import { billingConfigured, billingSettings, emailConfigured } from '../services/providers';
loadEnv();

// SQLite paths resolve relative to the Prisma schema directory. Production can
// supply an absolute persistent-volume path without changing the application.
process.env.DATABASE_URL ||= 'file:./dev.db';

export const config = {
  production: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT || 3001),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  aiConfigured: Boolean(process.env.OPENROUTER_API_KEY?.trim()),
  aiModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  maxUploadBytes: Math.min(20, Math.max(1, Number(process.env.MAX_FILE_SIZE_MB) || 10)) * 1024 * 1024,
  sessionDurationMs: 7 * 24 * 60 * 60 * 1000,
};

export const allowedOrigins = new Set([
  config.clientUrl.replace(/\/$/, ''),
  ...(!config.production ? ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'] : []),
]);

export const templateIds = [
  'classic-professional', 'modern-minimalist', 'two-column',
  'executive-serif', 'technical-compact', 'academic', 'graduate',
  'contemporary', 'elegant-sidebar', 'creative-banner', 'consultant', 'bold-accent',
] as const;

export const plans = {
  free: { resumeLimit: 3, aiLimit: 20, templates: templateIds.slice(0, 3), docxExport: false, tailoring: false, coverLetters: false, advancedAnalysis: false, interview: false, advancedCustomization: false },
  pro: { resumeLimit: null, aiLimit: 200, templates: [...templateIds], docxExport: true, tailoring: true, coverLetters: true, advancedAnalysis: true, interview: true, advancedCustomization: true },
  premium: { resumeLimit: null, aiLimit: 1000, templates: [...templateIds], docxExport: true, tailoring: true, coverLetters: true, advancedAnalysis: true, interview: true, advancedCustomization: true },
};

export function planFor(plan: string) { return plans[plan as keyof typeof plans] || plans.free; }

export function publicConfig() {
  return {
    ai: { configured: config.aiConfigured, model: config.aiModel },
    // Provider setup is deliberately explicit; no mock charges or emails.
    billing: { configured: billingConfigured(), testMode: billingSettings().testMode, intervals: { pro: { monthly: Boolean(billingSettings().variants.pro.monthly), annual: Boolean(billingSettings().variants.pro.annual) }, premium: { monthly: Boolean(billingSettings().variants.premium.monthly), annual: Boolean(billingSettings().variants.premium.annual) } }, developmentMode: !config.production && !billingConfigured(), message: billingConfigured() ? 'Subscriptions are managed through Lemon Squeezy.' : 'Paid subscriptions are not available yet.' },
    email: { configured: emailConfigured(), developmentMode: !config.production && !emailConfigured(), message: emailConfigured() ? 'Password recovery is delivered by email.' : 'Production password recovery requires an email provider.' },
    plans,
    supportedUploadTypes: ['.pdf', '.docx'],
    maxUploadSizeMB: config.maxUploadBytes / 1024 / 1024,
  };
}

