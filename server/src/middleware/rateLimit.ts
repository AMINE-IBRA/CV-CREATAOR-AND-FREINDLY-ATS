import type { RequestHandler } from 'express';

// A bounded, process-local limiter. Shared deployments should replace this store
// with Redis or enforce the same limits at their API gateway.
export function rateLimit(max: number, windowMs: number, key: (req: any) => string = req => req.ip || 'unknown'): RequestHandler {
  const entries = new Map<string, { count: number; reset: number }>();
  return (req, res, next) => {
    const now = Date.now();
    if (entries.size > 10000) for (const [id, item] of entries) if (item.reset <= now) entries.delete(id);
    const id = key(req);
    const existing = entries.get(id);
    const entry = existing && existing.reset > now ? existing : { count: 0, reset: now + windowMs };
    entry.count++;
    entries.set(id, entry);
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((entry.reset - now) / 1000)));
      res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
      return;
    }
    next();
  };
}
