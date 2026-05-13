'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import type { UserRole } from '@/lib/types';
import { useUser } from '@/context/user-context';

type ProtectedRouteProps = {
  children: ReactNode;
  allowedRoles?: UserRole[];
};

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (pathname !== '/login') router.push('/login');
      return;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      router.push('/dashboard');
    }
  }, [allowedRoles, isLoading, pathname, router, user]);

  if (isLoading) return null;

  if (!user) return null;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

  return children;
}
