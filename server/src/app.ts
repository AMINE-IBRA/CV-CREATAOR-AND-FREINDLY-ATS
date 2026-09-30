import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { config, allowedOrigins, publicConfig } from './lib/config';
import { HttpError, errorHandler } from './lib/errors';
import authRouter from './routes/auth';
import resumeRouter from './routes/resumes';
import coverLetterRouter from './routes/coverLetters';
import uploadRouter from './routes/upload';
import billingRouter from './routes/billing';
import { createAiRouter } from './routes/ai';
import type { AiServices } from './services/openrouter';
import { rateLimit } from './middleware/rateLimit';

export function createApp(options: { ai?: AiServices; serveClient?: boolean } = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use(cors({ origin(origin, callback) { callback(null, !origin || allowedOrigins.has(origin.replace(/\/$/, ''))); }, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type'] }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.production) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (req.path.startsWith('/api/')) res.setHeader('Cache-Control', 'no-store');
    // Cookies require an origin check for mutations, including unauthenticated
    // sign-in/sign-out routes. SameSite is an additional browser protection.
    const origin = req.headers.origin;
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && origin && !allowedOrigins.has(origin.replace(/\/$/, ''))) { next(new HttpError(403, 'This request came from an untrusted website.')); return; }
    next();
  });
  app.use('/api', rateLimit(300, 60 * 1000));
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: false, limit: '4mb' }));
  app.get('/api/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });
  app.get('/api/config', (_req, res) => { res.json(publicConfig()); });
  app.use('/api/auth', authRouter);
  app.use('/api/resumes', resumeRouter);
  app.use('/api/ai', createAiRouter(options.ai));
  app.use('/api/cover-letters', coverLetterRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api', (_req, res) => { res.status(404).json({ error: 'API route not found.' }); });
  const clientDirectory = path.resolve(__dirname, '../../client/dist');
  if ((options.serveClient ?? config.production) && fs.existsSync(path.join(clientDirectory, 'index.html'))) {
    app.use(express.static(clientDirectory));
    app.get('*', (_req, res) => { res.sendFile(path.join(clientDirectory, 'index.html')); });
  }
  app.use((_req, res) => { res.status(404).json({ error: 'Page not found.' }); });
  app.use(errorHandler);
  return app;
}
export default createApp;
