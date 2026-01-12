'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import {
  Archive,
  BrainCircuit,
  LayoutDashboard,
  Settings,
  Truck,
  Warehouse,
  LifeBuoy,
  FileText,
  Users
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/context/user-context';
import { User } from '@/lib/types';

const allMenuItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: Archive,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/chambers',
    label: 'Chambers',
    icon: Warehouse,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/clients',
    label: 'Clients',
    icon: Users,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/gate-pass',
    label: 'Gate Pass',
    icon: Truck,
    roles: ['Admin', 'Gatekeeper', 'Storekeeper'],
  },
  {
    href: '/optimization',
    label: 'AI Optimizer',
    icon: BrainCircuit,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: FileText,
    roles: ['Admin', 'Storekeeper'],
  },
  {
    href: '/invoices',
    label: 'Invoices',
    icon: FileText,
    roles: ['Admin', 'Storekeeper'],
  }
];

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useUser();

  const menuItems = allMenuItems.filter(item => 
    user?.role && item.roles.includes(user.role)
  );

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
           <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-primary"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
          <h1 className="text-xl font-bold font-headline text-primary">FoodSafe</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname.startsWith(item.href)}
                tooltip={{ children: item.label, side: 'right' }}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip={{ children: 'Settings', side: 'right' }}
            >
              <Link href="/settings">
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton
                asChild
                isActive={pathname === '/support'}
                tooltip={{ children: 'Support', side: 'right' }}
              >
                <Link href="/support">
                    <LifeBuoy />
                    <span>Support</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
