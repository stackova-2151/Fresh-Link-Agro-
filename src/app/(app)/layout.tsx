 'use client';

 import { Header } from '@/components/layout/header';
 import { SidebarNav } from '@/components/layout/sidebar-nav';
 import {
   Sidebar,
   SidebarInset,
   SidebarProvider,
 } from '@/components/ui/sidebar';
 import { UserProvider } from '@/context/user-context';
 import { usePathname } from 'next/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPrintRoute = pathname.split('/').includes('print');

  return (
    <UserProvider>
      {isPrintRoute ? (
        <main className="p-0 m-0">{children}</main>
      ) : (
        <SidebarProvider>
          <Sidebar>
            <SidebarNav />
          </Sidebar>
          <SidebarInset>
            <Header />
            <main className="p-4 sm:p-6 lg:p-8">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      )}
    </UserProvider>
  );
}
