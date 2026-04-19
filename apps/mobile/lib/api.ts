import { config } from './config';
import { getBearerToken, setBearerToken } from './auth';

const DEFAULT_TIMEOUT_MS = 15_000;

type ApiOptions = Omit<RequestInit, 'body'> & { body?: unknown; timeoutMs?: number };

export class ApiError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API ${status}`);
  }

  /** User-facing Norwegian message. */
  get messageNO(): string {
    const b = this.body as { error?: unknown } | null;
    if (b && typeof b.error === 'string') return b.error;
    if (this.status === 401) return 'Du må logge inn på nytt.';
    if (this.status === 403) return 'Du har ikke tilgang til dette.';
    if (this.status === 404) return 'Finner ikke det du ser etter.';
    if (this.status === 0)   return 'Nettverksfeil. Prøv igjen.';
    return 'Noe gikk galt. Prøv igjen.';
  }
}

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { body, headers, timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = opts;
  const token = await getBearerToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${config.API_URL}${path}`, {
      ...rest,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    // Persist bearer token from Better Auth's set-auth-token header.
    const newToken = res.headers.get('set-auth-token');
    if (newToken) await setBearerToken(newToken);

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({ error: res.statusText }));
      throw new ApiError(res.status, errorBody);
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (e: unknown) {
    if (e instanceof ApiError) throw e;
    const err = e as { name?: string };
    if (err?.name === 'AbortError') throw new ApiError(0, { error: 'Tidsavbrudd. Sjekk nettet.' });
    throw new ApiError(0, { error: 'Nettverksfeil. Prøv igjen.' });
  } finally {
    clearTimeout(timeoutId);
  }
}
