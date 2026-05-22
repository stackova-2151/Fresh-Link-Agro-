'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter, usePathname } from 'next/navigation';

import { auth, db } from '@/lib/firebase';
import type { User, UserRole, UserStatus } from '@/lib/types';

// ─── Context shape ────────────────────────────────────────────────────────────

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function fetchFirestoreUser(uid: string): Promise<User | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;

    const data = snap.data() as {
      name: string;
      email: string;
      username?: string;
      mobile?: string;
      role: UserRole;
      status: UserStatus;
      createdBy?: string;
      createdAt?: { toDate?: () => Date } | string;
      updatedAt?: { toDate?: () => Date } | string;
    };

    if (data.status === 'INACTIVE') return null;

    const toIso = (v: unknown): string | undefined => {
      if (!v) return undefined;
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v !== null && 'toDate' in v) {
        return (v as { toDate: () => Date }).toDate().toISOString();
      }
      return undefined;
    };

    return {
      id: uid,
      uid,
      name: data.name,
      email: data.email,
      username: data.username,
      mobile: data.mobile,
      role: data.role,
      status: data.status,
      createdBy: data.createdBy,
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
// KEY CHANGE: isLoading no longer blocks rendering of the entire app.
// The app shell renders immediately. Pages that need auth use useUser() and
// handle their own loading state, or rely on ProtectedRoute.

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // ── Session restore via onAuthStateChanged ──────────────────────────────────
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser: FirebaseUser | null) => {
        if (!firebaseUser) {
          setUser(null);
          setIsLoading(false);
          return;
        }

        const appUser = await fetchFirestoreUser(firebaseUser.uid);

        if (!appUser) {
          await signOut(auth);
          setUser(null);
          setIsLoading(false);
          return;
        }

        setUser(appUser);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // ── Single redirect: unauthenticated users → /login ─────────────────────────
  // Only fires after auth restore is complete (isLoading=false).
  // Does NOT block rendering — the redirect happens in the background.
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [user, isLoading, pathname, router]);

  // ── login ───────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password);
        const appUser = await fetchFirestoreUser(credential.user.uid);

        if (!appUser) {
          await signOut(auth);
          return { error: 'Your account is inactive or not found. Contact the administrator.' };
        }

        setUser(appUser);
        return {};
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (
          code === 'auth/user-not-found' ||
          code === 'auth/wrong-password' ||
          code === 'auth/invalid-credential' ||
          code === 'auth/invalid-email'
        ) {
          return { error: 'Invalid credentials.' };
        }
        if (code === 'auth/too-many-requests') {
          return { error: 'Too many failed attempts. Try again later.' };
        }
        return { error: 'Login failed. Please try again.' };
      }
    },
    []
  );

  // ── logout ──────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    router.push('/login');
  }, [router]);

  // ── refreshCurrentUser ──────────────────────────────────────────────────────
  const refreshCurrentUser = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) {
      setUser(null);
      return;
    }

    const appUser = await fetchFirestoreUser(firebaseUser.uid);
    if (!appUser) {
      await signOut(auth);
      setUser(null);
      router.push('/login');
      return;
    }

    setUser(appUser);
  }, [router]);

  // ── Render ──────────────────────────────────────────────────────────────────
  // NO full-screen blocking spinner.
  // Children render immediately. ProtectedRoute handles per-page auth gating.
  return (
    <UserContext.Provider value={{ user, login, logout, refreshCurrentUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
