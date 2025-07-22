
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Building, ListChecks, Package,
  CreditCard, ShieldAlert, Bell, Settings, LogOut, UserCircle, ShoppingCart, Menu, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
];

const managementSidebarNavItems: NavItem[] = [
  { title: 'Product Pool', href: '/admin/dashboard/product-pool', icon: Package },
  { title: 'Credit System', href: '/admin/dashboard/credits', icon: CreditCard },
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
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        if (user.role !== 'Super Admin') {
          toast({ title: "Access Denied", description: "You do not have permission to access this area.", variant: "destructive" });
          router.push('/');
        } else {
          setCurrentUser(user);
        }
      } catch (e) {
        console.error("Error parsing current user from localStorage", e);
        toast({ title: "Authentication Error", description: "Please log in again.", variant: "destructive" });
        router.push('/auth/signin');
      }
    } else {
      toast({ title: "Not Authenticated", description: "Please log in to access the admin dashboard.", variant: "destructive" });
      router.push('/auth/signin');
    }
    setIsLoadingUser(false);
  }, [router, toast]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      localStorage.removeItem('currentUserHolisticAI');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  const getPageTitle = () => {
    const allItems = [...mainSidebarNavItems, ...managementSidebarNavItems];
    const activeItem = allItems.find(item => pathname.startsWith(item.href) && item.href !== '/admin/dashboard');
    if (pathname === '/admin/dashboard') return 'Overview';
    if (activeItem) return activeItem.title;
    // Fallback for nested pages like edit pages
    if (pathname.includes('/admin/dashboard/dispensaries/edit')) return 'Edit Store';
    if (pathname.includes('/admin/dashboard/dispensaries/create')) return 'Create Store';
    return 'Admin Panel';
  };

  if (isLoadingUser || !currentUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Admin Dashboard...</p>
      </div>
    );
  }

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
                        isActive={pathname === item.href}
                        disabled={item.disabled}
                        className={cn(
                          pathname === item.href
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
                        isActive={pathname.startsWith(item.href)}
                        disabled={item.disabled}
                         className={cn(
                          pathname.startsWith(item.href)
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
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Admin'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(currentUser.displayName, 'SA')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-2 group-data-[collapsible=icon]:hidden text-left">
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {currentUser.role}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>{currentUser.displayName || 'Admin Profile'}</DropdownMenuLabel>
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
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
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
