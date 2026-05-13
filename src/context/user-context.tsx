'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { loadUsers, normalizeStatus } from '@/lib/user-storage';

interface UserContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  refreshCurrentUser: () => void;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const clearSession = () => {
    setUser(null);
    try {
      localStorage.removeItem('currentUser');
    } catch (error) {
      console.error('Failed to remove user from localStorage', error);
    }
  };

  const isAllowedRole = (role: unknown): role is User['role'] => {
    return role === 'MASTER_ADMIN' || role === 'ADMIN' || role === 'SUB_ADMIN';
  };

  const validateAndSyncUser = (candidate: User | null) => {
    if (!candidate) return null;

    if (!isAllowedRole(candidate.role)) {
      clearSession();
      return null;
    }

    const existing = loadUsers().find((u) => u.id === candidate.id);
    if (!existing) {
      clearSession();
      return null;
    }

    if (normalizeStatus(existing.status) === 'INACTIVE') {
      try {
        localStorage.setItem('authError', 'Your account is inactive. Please contact the administrator.');
      } catch (error) {
        console.error('Failed to store auth error', error);
      }
      clearSession();
      return null;
    }

    return existing;
  };

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsed = JSON.parse(storedUser) as User;
        const validated = validateAndSyncUser(parsed);
        setUser(validated);
      }
    } catch (error) {
        console.error("Failed to parse user from localStorage", error)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  const login = (userData: User) => {
    const validated = validateAndSyncUser(userData);
    if (!validated) {
      router.push('/login');
      return;
    }

    setUser(validated);
    try {
        localStorage.setItem('currentUser', JSON.stringify(validated));
    } catch (error) {
        console.error("Failed to save user to localStorage", error)
    }
  };

  const logout = () => {
    clearSession();
    router.push('/login');
  };

  const refreshCurrentUser = () => {
    setUser((prev) => {
      const next = validateAndSyncUser(prev);
      if (!next && pathname !== '/login') {
        router.push('/login');
      }
      return next;
    });
  };
  
  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading spinner component
  }

  if (!user && pathname !== '/login') {
    return null; // Don't render children if no user and not on login page
  }

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
