'use client';
import Image from "next/image";

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
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Settings,
  Warehouse,
  LifeBuoy,
  FileText,
  Receipt,
  Printer,
  ChevronDown,
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
  children: Array<NavLinkItem | NavGroupItem>;
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
      { type: 'link', href: '/inventory', label: 'Inward Entry', roles: ['SUB_ADMIN'], icon: Warehouse },
      { type: 'link', href: '/outward', label: 'Outward Entry', roles: ['SUB_ADMIN'], icon: Warehouse },
      { type: 'link', href: '/bill-processing', label: 'Bill Processing', roles: ['SUB_ADMIN'], icon: FileText },
      { type: 'link', href: '/printing/sale-bill', label: 'Sale Bill Printing', roles: ['SUB_ADMIN'], icon: Printer },
      { type: 'link', href: '/customer-rate-master', label: 'Customer Rate', roles: ['SUB_ADMIN'], icon: FileText },
      { type: 'link', href: '/clients', label: 'Clients', roles: ['SUB_ADMIN'], icon: FileText },
    ],
  },
  {
    type: 'group',
    label: 'Printing',
    icon: Printer,
    roles: ['SUB_ADMIN'],
    children: [
      { type: 'link', href: '/printing/inward-register', label: 'Inward Register', roles: ['SUB_ADMIN'], icon: Printer },
      { type: 'link', href: '/printing/outward-register', label: 'Outward Register', roles: ['SUB_ADMIN'], icon: Printer },
      {
        type: 'group',  
        label: 'Stock Report',
        icon: Receipt,
        roles: ['SUB_ADMIN'],
        children: [
          { type: 'link', href: '/printing/stock-report/item-wise', label: 'Item Wise', roles: ['SUB_ADMIN'], icon: Receipt },
          { type: 'link', href: '/printing/stock-report/chamber-wise', label: 'Chamber Wise', roles: ['SUB_ADMIN'], icon: Receipt },
          { type: 'link', href: '/printing/stock-report/all-customer-wise', label: 'All Customer Wise', roles: ['SUB_ADMIN'], icon: Receipt },
        ],
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
  // {
  //   type: 'link',
  //   href: '/reports',
  //   label: 'Reports',
  //   icon: Receipt,
  //   roles: ['MASTER_ADMIN', 'ADMIN'],
  // },
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
  if (item.type === 'link') return item.roles.includes(role);
  return item.roles.includes(role) && item.children.some((c) => c.roles.includes(role));
}

function isChildActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user, logout } = useUser();

  const role = user?.role as UserRole | undefined;

  // Memoized: only recomputes when role changes (not on every navigation)
  const menuItems = useMemo(
    () => allMenuItems.filter((item) => isNavItemAccessible(item, role)),
    [role]
  );

  // Memoized: only recomputes when pathname changes
  const defaultVoucherOpen = useMemo(
    () =>
      pathname.startsWith('/inventory') ||
      pathname.startsWith('/outward') ||
      pathname.startsWith('/invoices') ||
      pathname.startsWith('/clients') ||
      pathname.startsWith('/bill-processing') ||
      pathname.startsWith('/customer-rate-master'),
    [pathname]
  );

  const defaultPrintingOpen = useMemo(
    () => pathname.startsWith('/printing') || pathname.startsWith('/reports'),
    [pathname]
  );

  return (
    <>
      <SidebarHeader>
        <div className="flex items-center justify-center p-1">
          <Image src="/logo1.png" alt="Fresh Link" width={120} height={20} className="object-contain" priority />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            if (item.type === 'link') {
              return (
                <SidebarMenuItem key={item.href + item.label}>
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
            const groupDefaultOpen = isVoucherGroup
              ? defaultVoucherOpen
              : isPrintingGroup
              ? defaultPrintingOpen
              : false;
            const groupIsActive = item.children.some((child) => {
              if (child.type === 'group' && child.children) {
                return child.children.some((subChild) => {
                  if (subChild.type === 'link') {
                    return isChildActive(pathname, subChild.href);
                  }
                  return false;
                });
              }
              if (child.type === 'link') {
                return isChildActive(pathname, child.href);
              }
              return false;
            });

            return (
              <Collapsible key={item.label} defaultOpen={groupDefaultOpen} className="w-full">
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
                        .filter((child) => {
                          if (child.type === 'link') {
                            return role ? child.roles.includes(role) : true;
                          }
                          if (child.type === 'group') {
                            return role ? child.roles.includes(role) : true;
                          }
                          return false;
                        })
                        .map((child) => {
                          if (child.type === 'group' && child.children && child.icon) {
                            const subGroupIsActive = child.children.some((subChild) => {
                              if (subChild.type === 'link') {
                                return isChildActive(pathname, subChild.href);
                              }
                              return false;
                            });
                            const subGroupDefaultOpen = pathname.startsWith('/printing/stock-report');

                            return (
                              <Collapsible key={child.label} defaultOpen={subGroupDefaultOpen} className="w-full">
                                <SidebarMenuSubItem>
                                  <CollapsibleTrigger asChild>
                                    <SidebarMenuSubButton
                                      className="group"
                                      isActive={subGroupIsActive}
                                    >
                                      <span className="mr-2 h-2 w-2 rounded-full bg-current flex-shrink-0"></span>
                                      <span>{child.label}</span>
                                      <ChevronDown className="ml-auto h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                                    </SidebarMenuSubButton>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent>
                                    <SidebarMenuSub className="ml-4">
                                      {child.children
                                        .filter((subChild) => {
                                          if (subChild.type === 'link') {
                                            return role ? subChild.roles.includes(role) : true;
                                          }
                                          return false;
                                        })
                                        .map((subChild) => {
                                          if (subChild.type === 'link') {
                                            return (
                                              <SidebarMenuSubItem key={`${child.label}:${subChild.label}:${subChild.href}`}>
                                                <SidebarMenuSubButton
                                                  asChild
                                                  isActive={isChildActive(pathname, subChild.href)}
                                                >
                                                 <Link href={subChild.href} className="flex items-center gap-2"> <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                                 <span>{subChild.label}</span>
</Link>
                                                </SidebarMenuSubButton>
                                              </SidebarMenuSubItem>
                                            );
                                          }
                                          return null;
                                        })}
                                    </SidebarMenuSub>
                                  </CollapsibleContent>
                                </SidebarMenuSubItem>
                              </Collapsible>
                            );
                          }

                          // Regular link item
                          if (child.type === 'link') {
                            return (
                              <SidebarMenuSubItem key={`${item.label}:${child.label}:${child.href}`}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isChildActive(pathname, child.href)}
                                >
                                  <Link href={child.href} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-current"></span>
                                    <span>{child.label}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          }

                          return null;
                        })}
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
          {user && (
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
