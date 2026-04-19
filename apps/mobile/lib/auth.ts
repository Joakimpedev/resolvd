import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const TOKEN_KEY = 'resolvd.session.token';

/**
 * Better Auth on React Native: we use the server's bearer plugin (Authorization header)
 * rather than cookies because RN's cookie jar behaves inconsistently across Expo SDK versions.
 *
 * The server's bearer plugin responds to sign-in with a `set-auth-token` header containing
 * the session token. We intercept that via a custom fetch wrapper, persist to iOS Keychain
 * via SecureStore, and attach as `Authorization: Bearer <token>` on every subsequent request.
 */
export const authClient = createAuthClient({
  baseURL: config.API_URL,
  fetchOptions: {
    customFetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      const token = await getBearerToken();
      const headers = new Headers(init?.headers);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      const res = await fetch(url, { ...init, headers });
      // Capture token from set-auth-token response header (Better Auth bearer plugin).
      const newToken = res.headers.get('set-auth-token');
      if (newToken) {
        await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      }
      return res;
    },
  },
});

export const { signIn, signOut, useSession, getSession } = authClient;

/** Read the current bearer token (iOS Keychain). */
export async function getBearerToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
}

/** Clear the stored token on sign-out (auth client does not auto-clear SecureStore). */
export async function clearBearerToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
}
