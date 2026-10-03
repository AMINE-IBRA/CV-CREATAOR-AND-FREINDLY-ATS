import { HttpError } from '../lib/errors';

export const billingSettings = () => ({
  key: process.env.PADDLE_API_KEY?.trim() || '',
  token: process.env.PADDLE_CLIENT_TOKEN?.trim() || '',
  secret: process.env.PADDLE_WEBHOOK_SECRET?.trim() || '',
  testMode: process.env.PADDLE_ENVIRONMENT !== 'production',
  prices: { pro: process.env.PADDLE_PRO_PRICE_ID?.trim() || '', premium: process.env.PADDLE_PREMIUM_PRICE_ID?.trim() || '' },
});
export function billingConfigured() {
  const b = billingSettings();
  const tokenPrefix = b.testMode ? 'test_' : 'live_';
  return Boolean(b.key && b.secret && b.token.startsWith(tokenPrefix) && /^pri_[a-z0-9]{26}$/.test(b.prices.pro) && /^pri_[a-z0-9]{26}$/.test(b.prices.premium) && b.prices.pro !== b.prices.premium);
}
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function paddleRequest(path: string, body?: unknown) {
  const settings = billingSettings();
  const host = settings.testMode ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  let response: Response;
  try {
    response = await fetch(`${host}${path}`, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${settings.key}`, 'Paddle-Version': '1', 'Content-Type': 'application/json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new HttpError(502, 'Paddle could not be reached. Please try again.'); }
  if (!response.ok) throw new HttpError(502, 'Paddle is temporarily unavailable. Please try again.');
  return response.json() as Promise<any>;
}

export async function sendPasswordReset(email: string, url: string, tokenHash: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `password-reset/${tokenHash}` },
    body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: 'Reset your CV Creator Pro password', text: `Use this link to reset your password. It expires in one hour:\n\n${url}\n\nIf you did not request this, you can ignore this email.` }),
  });
  if (!response.ok) throw new Error('Password reset email delivery failed');
}
