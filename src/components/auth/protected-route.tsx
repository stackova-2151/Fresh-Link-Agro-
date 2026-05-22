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

  // Show a lightweight spinner while auth restores — no blank flash
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) return null;

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return null;

  return <>{children}</>;
}
