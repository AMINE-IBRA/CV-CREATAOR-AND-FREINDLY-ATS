// Authentication is carried by the server's HttpOnly session cookie.
const API_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const SESSION_EXPIRED_EVENT = 'cv:session-expired';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions { signal?: AbortSignal }

async function request<T>(method: string, path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
  const isFormData = data instanceof FormData;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (data !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
  const timeout = AbortSignal.timeout(75000);
  const signal = options.signal ? AbortSignal.any([timeout, options.signal]) : timeout;
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method, headers, credentials: 'include', signal,
      body: data === undefined ? undefined : isFormData ? data : JSON.stringify(data),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(timeout.aborted ? 'The request timed out. Please try again.' : 'Cannot reach the service. Check your connection and try again.', 0);
  }
  const result = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    if (response.status === 401 && !['/auth/me', '/auth/login', '/auth/register', '/auth/forgot-password', '/auth/reset-password'].includes(path)) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    }
    throw new ApiError(result?.error || `Request failed (${response.status}). Please try again.`, response.status, result?.code);
  }
  if (result === undefined && response.status !== 204) throw new ApiError('The service returned an invalid response. Please try again.', response.status);
  return result as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('POST', path, data, options),
  put: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('PUT', path, data, options),
  patch: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('PATCH', path, data, options),
  delete: <T>(path: string, data?: unknown, options?: RequestOptions) => request<T>('DELETE', path, data, options),
  upload: <T>(path: string, formData: FormData, options?: RequestOptions) => request<T>('POST', path, formData, options),
};

export interface PlanEntitlements {
  aiLimit: number; resumeLimit: number | null; templates: string[];
  docxExport: boolean; tailoring: boolean; coverLetters: boolean; advancedAnalysis: boolean; interview: boolean;
  [key: string]: unknown;
}
export interface AppConfig {
  ai: { configured: boolean; model: string };
  billing: { testMode?: boolean; configured: boolean; intervals?: Record<string, Record<string, boolean>>; developmentMode?: boolean; message?: string };
  email: { developmentMode?: boolean; configured: boolean; message?: string };
  plans: Record<string, PlanEntitlements>;
  supportedUploadTypes: string[];
  maxUploadSizeMB: number;
}

export function safeDestination(value: unknown, fallback = '/dashboard'): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/^\/(login|register|forgot-password|reset-password)(\/|\?|$)/.test(value) ? value : fallback;
}
