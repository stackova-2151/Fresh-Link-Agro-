'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { Header } from '@/components/layout/header';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import {
  Sidebar,
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Memoize so the check doesn't recompute on unrelated state changes
  const isPrintRoute = useMemo(
    () => pathname.split('/').includes('print'),
    [pathname]
  );

  if (isPrintRoute) {
    return <main className="p-0 m-0">{children}</main>;
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <Header />
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
