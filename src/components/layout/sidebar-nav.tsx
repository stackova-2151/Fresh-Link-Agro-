'use client';

import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  Warehouse,
  LifeBuoy,
  FileText,
  Receipt,
  Printer,
  ChevronDown
} from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@/context/user-context';
import type { UserRole } from '@/lib/types';

import type React from 'react';

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type NavLinkItem = {
  type: 'link';
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

type NavGroupItem = {
  type: 'group';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children: Array<{
    href: string;
    label: string;
    roles: UserRole[];
  }>;
};

type NavItem = NavLinkItem | NavGroupItem;

const allMenuItems: NavItem[] = [
  {
    type: 'link',
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['MASTER_ADMIN', 'ADMIN', 'SUB_ADMIN'],
  },
  {
    type: 'group',
    label: 'Voucher Entry',
    icon: FileText,
    roles: ['SUB_ADMIN'],
    children: [
      {
        href: '/inventory',
        label: 'Inward Entry',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/outward',
        label: 'Outward Entry',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/bill-processing',
        label: 'Bill Processing',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/clients',
        label: 'Customer Rate',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/clients',
        label: 'Clients',
        roles: ['SUB_ADMIN'],
      },
    ],
  },
  {
    type: 'group',
    label: 'Printing',
    icon: Printer,
    roles: ['SUB_ADMIN'],
    children: [
      {
        href: '/printing/inward-register',
        label: 'Inward Register',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/printing/outward-register',
        label: 'Outward Register',
        roles: ['SUB_ADMIN'],
      },
      {
        href: '/reports',
        label: 'Stock Report',
        roles: ['SUB_ADMIN'],
      },
    ],
  },
  {
    type: 'link',
    href: '/admin-management',
    label: 'Admin Management',
    icon: Settings,
    roles: ['MASTER_ADMIN'],
  },
  {
    type: 'link',
    href: '/sub-admin-management',
    label: 'Sub Admin Management',
    icon: Settings,
    roles: ['ADMIN'],
  },
  {
    type: 'link',
    href: '/reports',
    label: 'Reports',
    icon: Receipt,
    roles: ['MASTER_ADMIN', 'ADMIN'],
  },
  {
    type: 'link',
    href: '/chambers',
    label: 'Chambers',
    icon: Warehouse,
    roles: ['SUB_ADMIN'],
  },
  {
    type: 'link',
    href: '/invoices',
    label: 'Invoices',
    icon: Receipt,
    roles: ['SUB_ADMIN'],
  },
];

function isNavItemAccessible(item: NavItem, role: UserRole | undefined) {
  if (!role) return false;

  if (item.type === 'link') {
    return item.roles.includes(role);
  }

  const hasParentAccess = item.roles.includes(role);
  const hasAnyChildAccess = item.children.some((child) => child.roles.includes(role));
  return hasParentAccess && hasAnyChildAccess;
}

function isChildActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const role = user?.role as UserRole | undefined;

  const menuItems = allMenuItems.filter((item) => isNavItemAccessible(item, role));

  const defaultVoucherOpen = pathname.startsWith('/inventory') || pathname.startsWith('/outward') || pathname.startsWith('/invoices') || pathname.startsWith('/clients') || pathname.startsWith('/bill-processing');
  const defaultPrintingOpen = pathname.startsWith('/printing') || pathname.startsWith('/reports');

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
          {menuItems.map((item) => {
            if (item.type === 'link') {
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isChildActive(pathname, item.href)}
                    tooltip={{ children: item.label, side: 'right' }}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            }

            const isVoucherGroup = item.label === 'Voucher Entry';
            const isPrintingGroup = item.label === 'Printing';

            const groupDefaultOpen = isVoucherGroup ? defaultVoucherOpen : isPrintingGroup ? defaultPrintingOpen : false;
            const groupIsActive = item.children.some((child) => isChildActive(pathname, child.href));

            return (
              <Collapsible
                key={item.label}
                defaultOpen={groupDefaultOpen}
                className="w-full"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton
                      className="group"
                      isActive={groupIsActive}
                      tooltip={{ children: item.label, side: 'right' }}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                      <ChevronDown className="ml-auto transition-transform group-data-[state=open]:rotate-180" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children
                        .filter((child) => (role ? child.roles.includes(role) : false))
                        .map((child) => (
                          <SidebarMenuSubItem key={`${item.label}:${child.label}:${child.href}`}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isChildActive(pathname, child.href)}
                            >
                              <Link href={child.href}>
                                <span>{child.label}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {user?.role === 'MASTER_ADMIN' && (
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
          )}
          {(user?.role === 'MASTER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'SUB_ADMIN') && (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={logout} tooltip={{ children: 'Logout', side: 'right' }}>
                <LifeBuoy />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}