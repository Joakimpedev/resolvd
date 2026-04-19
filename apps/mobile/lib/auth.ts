import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';
import { config } from './config';

const TOKEN_KEY = 'resolvd.session.token';

/**
 * Better Auth client. Uses the default fetch — cookies are handled by the
 * React Native HTTP layer's native cookie jar on iOS. We ALSO persist a
 * bearer token to SecureStore (iOS Keychain) as a redundant path, in case
 * the cookie jar clears between sessions.
 */
export const authClient = createAuthClient({
  baseURL: config.API_URL,
});

export const { signIn, signOut, useSession, getSession } = authClient;

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
