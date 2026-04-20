import * as SecureStore from 'expo-secure-store';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { config } from './config';

const TOKEN_KEY = 'resolvd.session.token';

/**
 * Bearer-token-based auth for React Native.
 *
 * We POST to Better Auth's /api/auth/sign-in/email endpoint directly.
 * The response includes a `token` field (Better Auth's session token when the
 * bearer plugin is enabled on the server). We persist it to iOS Keychain via
 * expo-secure-store, attach it as `Authorization: Bearer <token>` on every
 * subsequent request (via lib/api.ts), and check its validity by hitting
 * /api/auth/get-session.
 *
 * We deliberately do NOT use better-auth/react's useSession + signIn helpers
 * because they assume a browser context (window.location) and throw "Invalid
 * currentURL" in React Native.
 */

export async function getBearerToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setBearerToken(token: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch { /* ignore */ }
}

export async function clearBearerToken(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch { /* ignore */ }
}

type SessionUser = {
  id: string;
  email: string;
  name: string;
  image: string | null;
  emailVerified: boolean;
};

type SessionResponse = {
  session: { token: string; expiresAt: string; userId: string } | null;
  user: SessionUser | null;
} | null;

/** Sign in with email+password. Saves the token to SecureStore on success. */
export async function signInEmail(email: string, password: string): Promise<SessionUser> {
  const res = await fetch(`${config.API_URL}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string; error?: string })?.message
      ?? (body as { error?: string })?.error
      ?? 'Ugyldig e-post eller passord.');
  }
  const data = (await res.json()) as { token?: string; user?: SessionUser };
  if (!data.token || !data.user) throw new Error('Uventet svar fra server.');
  await setBearerToken(data.token);
  return data.user;
}

/** Sign out — clears token both server-side (best-effort) and locally. */
export async function signOut(): Promise<void> {
  const token = await getBearerToken();
  if (token) {
    await fetch(`${config.API_URL}/api/auth/sign-out`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  await clearBearerToken();
}

/** Hook — returns the current session if the stored bearer token is still valid. */
export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: ['session'],
    queryFn: async () => {
      const token = await getBearerToken();
      if (!token) return null;
      const res = await fetch(`${config.API_URL}/api/auth/get-session`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        await clearBearerToken();
        return null;
      }
      const body = await res.json().catch(() => null);
      if (!body || !body.user) return null;
      return body as SessionResponse;
    },
    staleTime: 60_000,
    retry: false,
  });
}

/** Invalidate the cached session — call after signOut or delete-account. */
export function useInvalidateSession() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ['session'] });
}
