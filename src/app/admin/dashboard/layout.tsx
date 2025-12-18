
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Building, ListChecks, Package,
  CreditCard, ShieldAlert, Bell, Settings, LogOut, UserCircle, ShoppingCart, Menu, Loader2, AlertTriangle, Brain, Store, TrendingUp, DollarSign, Truck, Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator as DropdownMenuSeparatorComponent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import React from 'react';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string | number;
}

const mainSidebarNavItems: NavItem[] = [
  { title: 'Overview', href: '/admin/dashboard', icon: LayoutDashboard },
  { title: 'View all stores', href: '/admin/dashboard/dispensaries', icon: Building },
  { title: 'Users', href: '/admin/dashboard/users', icon: Users },
  { title: 'Store types', href: '/admin/dashboard/dispensary-types', icon: ListChecks },
  { title: 'AI Advisors', href: '/admin/dashboard/ai-advisors', icon: Brain },
];

const treehouseSidebarNavItems: NavItem[] = [
  { title: 'Treehouse Products', href: '/admin/treehouse', icon: Store },
  { title: 'Treehouse Orders', href: '/admin/dashboard/treehouse-orders', icon: ShoppingCart },
  { title: 'Treehouse Analytics', href: '/admin/dashboard/treehouse-analytics', icon: TrendingUp },
  { title: 'Treehouse Payouts', href: '/admin/treehouse?tab=payouts', icon: DollarSign },
];

const dispensarySidebarNavItems: NavItem[] = [
  { title: 'Dispensary Payouts', href: '/admin/dashboard/dispensary-payouts', icon: DollarSign },
];

const managementSidebarNavItems: NavItem[] = [
  { title: 'Product Pool', href: '/admin/dashboard/product-pool', icon: Package },
  { title: 'Credit System', href: '/admin/dashboard/credits', icon: CreditCard },
  { title: 'Financial Hub', href: '/admin/dashboard/financial-hub', icon: Wallet },
  { title: 'Shipping Reconciliation', href: '/admin/dashboard/shipping-reconciliation', icon: Truck },
  { title: 'Pool Issues', href: '/admin/dashboard/pool-issues', icon: ShieldAlert },
  { title: 'Notifications', href: '/admin/dashboard/notifications', icon: Bell, disabled: true, badge: 'Soon' },
];

const getInitials = (name?: string | null, fallback = 'SA') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};


export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading: authLoading, isSuperAdmin, logout } = useAuth();

  // This effect handles redirection after the auth state is confirmed.
  React.useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/auth/signin');
    }
  }, [authLoading, isSuperAdmin, router]);

  // Render a loading state while the authentication context is being populated.
  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-bold">Verifying Admin Access...</h2>
        <p className="mt-2 text-muted-foreground">Please wait while we confirm your permissions.</p>
      </div>
    );
  }

  // Render an access denied message if the user is not a super admin after loading is complete.
  if (!isSuperAdmin) {
     return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-2xl font-bold">Access Denied</h2>
            <p className="mt-2 text-muted-foreground">You do not have permission to access the admin dashboard.</p>
             <Button onClick={() => router.push('/')} className="mt-6">Go to Home</Button>
        </div>
    );
  }

  const getPageTitle = () => {
    if (!pathname) return 'Admin Panel';
    
    const allItems = [...mainSidebarNavItems, ...treehouseSidebarNavItems, ...dispensarySidebarNavItems, ...managementSidebarNavItems];
    const activeItem = allItems
        .filter(item => pathname.startsWith(item.href))
        .sort((a,b) => b.href.length - a.href.length)[0];

    if (activeItem) return activeItem.title;
    
    if (pathname.includes('/admin/dashboard/dispensaries/create')) return 'Create Store';
    if (pathname.includes('/admin/treehouse')) return 'Treehouse Management';
    return 'Admin Panel';
  };
  
  const isNavItemActive = (itemHref: string) => {
    if (!pathname) return false;
    if (itemHref === '/admin/dashboard') {
      return pathname === itemHref;
    }
    return pathname.startsWith(itemHref);
  };

  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-screen"> 
        <Sidebar collapsible="icon" className="border-r shadow-md">
          <SidebarHeader className="p-3 border-b">
             <Link href="/admin/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
                <Settings className="h-7 w-7 text-primary transition-transform duration-300 group-hover/sidebar:rotate-[30deg]" />
                <span className="text-xl font-semibold text-primary group-data-[collapsible=icon]:hidden transition-opacity duration-200">Admin Panel</span>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <SidebarMenu>
              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:px-2">Main</SidebarGroupLabel>
                {mainSidebarNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.disabled ? '#' : item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isNavItemActive(item.href)}
                        disabled={item.disabled}
                        className={cn(
                          isNavItemActive(item.href)
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                          item.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
              
              <SidebarSeparator />

              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:px-2">Treehouse</SidebarGroupLabel>
                {treehouseSidebarNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.disabled ? '#' : item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isNavItemActive(item.href)}
                        disabled={item.disabled}
                        className={cn(
                          isNavItemActive(item.href)
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                          item.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:px-2">Dispensaries</SidebarGroupLabel>
                {dispensarySidebarNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <Link href={item.disabled ? '#' : item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isNavItemActive(item.href)}
                        disabled={item.disabled}
                        className={cn(
                          isNavItemActive(item.href)
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                          item.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>

              <SidebarSeparator />

              <SidebarGroup>
                <SidebarGroupLabel className="group-data-[collapsible=icon]:px-2">Management</SidebarGroupLabel>
                {managementSidebarNavItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                     <Link href={item.disabled ? '#' : item.href} legacyBehavior passHref>
                      <SidebarMenuButton
                        tooltip={item.title}
                        isActive={isNavItemActive(item.href)}
                        disabled={item.disabled}
                         className={cn(
                          isNavItemActive(item.href)
                            ? 'bg-primary/10 text-primary hover:bg-primary/20'
                            : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                          item.disabled && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                         {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
                      </SidebarMenuButton>
                    </Link>
                  </SidebarMenuItem>
                ))}
              </SidebarGroup>
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-auto p-2 hover:bg-muted/50">
                  <Avatar className="h-9 w-9 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                    <AvatarImage src={currentUser?.photoURL || undefined} alt={currentUser?.displayName || 'Admin'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(currentUser?.displayName, 'SA')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-2 group-data-[collapsible=icon]:hidden text-left">
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {currentUser?.displayName || currentUser?.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {currentUser?.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>{currentUser?.displayName || 'Admin Profile'}</DropdownMenuLabel>
                <DropdownMenuSeparatorComponent />
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Main Site</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparatorComponent />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
          <SidebarRail />
        </Sidebar>

        <main className="flex-1 flex flex-col">
           <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 md:hidden"> 
            <SidebarTrigger className="md:hidden" />
            <div className="flex-1">
              <h1 
                className="text-lg font-semibold text-foreground"
                style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
              >
                {getPageTitle()}
              </h1>
            </div>
          </header>
          <div className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto"> 
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
