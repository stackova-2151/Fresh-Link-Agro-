'use client';

import { auth } from '@/lib/firebase';

/**
 * Returns the current Firebase ID token.
 * Uses auth.authStateReady() to wait for session restoration before reading currentUser.
 * This prevents the race condition where auth.currentUser is null on page load
 * while Firebase is still restoring the persisted session from IndexedDB.
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // authStateReady() resolves once Firebase has finished restoring the persisted
    // auth session. After this, auth.currentUser is guaranteed to be set (or null
    // if the user is genuinely signed out).
    await (auth as unknown as { authStateReady: () => Promise<void> }).authStateReady();

    if (!auth.currentUser) return null;

    // forceRefresh=false: Firebase SDK auto-refreshes tokens before expiry.
    return await auth.currentUser.getIdToken(false);
  } catch (err) {
    console.error('[auth-client] getAuthToken failed:', err);
    return null;
  }
}

/**
 * Builds Authorization headers for authenticated API calls.
 * Always includes Content-Type: application/json.
 * Adds Authorization: Bearer <token> when a valid session exists.
 *
 * Usage:
 *   const headers = await authHeaders();
 *   const res = await fetch('/api/admin/create-user', { method: 'POST', headers, body: JSON.stringify(data) });
 */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();

  if (!token) {
    console.warn('[auth-client] No Firebase ID token available. Request will be sent without Authorization header.');
    return { 'Content-Type': 'application/json' };
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}
