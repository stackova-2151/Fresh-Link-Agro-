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
  Thermometer,
  Truck,
  Warehouse,
  LifeBuoy,
  FileText
} from 'lucide-react';
import Link from 'next/link';

const menuItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/inventory',
    label: 'Inventory',
    icon: Archive,
  },
  {
    href: '/chambers',
    label: 'Chambers',
    icon: Warehouse,
  },
  {
    href: '/gate-pass',
    label: 'Gate Pass',
    icon: Truck,
  },
  {
    href: '/monitoring',
    label: 'Monitoring',
    icon: Thermometer,
  },
  {
    href: '/optimization',
    label: 'AI Optimizer',
    icon: BrainCircuit,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: FileText
  }
];

export function SidebarNav() {
  const pathname = usePathname();

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
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={{ children: item.label, side: 'right' }}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === '/settings'}
                tooltip={{ children: 'Settings', side: 'right' }}
              >
                <Settings />
                <span>Settings</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <Link href="/support" legacyBehavior passHref>
              <SidebarMenuButton
                isActive={pathname === '/support'}
                tooltip={{ children: 'Support', side: 'right' }}
              >
                <LifeBuoy />
                <span>Support</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
