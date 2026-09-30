import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code?: string) { super(message); }
}

export function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Please check the submitted fields.', details: error.issues.map(({ path, message }) => ({ path, message })) });
    return;
  }
  if (error instanceof multer.MulterError) {
    res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'The file is larger than the upload limit.' : 'Please upload one PDF or DOCX file.' });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message, ...(error.code ? { code: error.code } : {}) });
    return;
  }
  if (error?.type === 'entity.too.large') { res.status(413).json({ error: 'The submitted document is too large.' }); return; }
  if (error instanceof SyntaxError && 'body' in error) { res.status(400).json({ error: 'Invalid JSON request.' }); return; }
  // Never log the raw exception: Prisma errors can contain supplied personal data.
  console.error('Request failed', { category: error?.name || 'Error', code: error?.code || 'UNEXPECTED' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
};
