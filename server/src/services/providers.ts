import { HttpError } from '../lib/errors';

export const billingSettings = () => ({
  key: process.env.LEMONSQUEEZY_API_KEY?.trim() || '',
  storeId: process.env.LEMONSQUEEZY_STORE_ID?.trim() || '',
  secret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim() || '',
  testMode: process.env.LEMONSQUEEZY_TEST_MODE !== 'false',
  variants: {
    pro: { monthly: process.env.LEMONSQUEEZY_PRO_VARIANT_ID?.trim() || '', annual: process.env.LEMONSQUEEZY_PRO_ANNUAL_VARIANT_ID?.trim() || '' },
    premium: { monthly: process.env.LEMONSQUEEZY_PREMIUM_VARIANT_ID?.trim() || '', annual: process.env.LEMONSQUEEZY_PREMIUM_ANNUAL_VARIANT_ID?.trim() || '' },
  },
});
export function billingConfigured() {
  const b = billingSettings();
  const ids = Object.values(b.variants).flatMap(v => Object.values(v)).filter(Boolean);
  return Boolean(b.key && b.secret && /^\d+$/.test(b.storeId) && /^\d+$/.test(b.variants.pro.monthly) && /^\d+$/.test(b.variants.premium.monthly) && ids.every(id => /^\d+$/.test(id)) && new Set(ids).size === ids.length);
}
export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

export async function lemonRequest(path: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch('https://api.lemonsqueezy.com/v1' + path, {
      method: body === undefined ? 'GET' : 'POST', signal: AbortSignal.timeout(15000),
      headers: { Authorization: 'Bearer ' + billingSettings().key, Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new HttpError(502, 'Billing could not be reached. Please try again.'); }
  if (!response.ok) throw new HttpError(502, 'Billing is temporarily unavailable. Please contact support if this continues.');
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
