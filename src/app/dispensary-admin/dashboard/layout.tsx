
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Users, Settings, LogOut, UserCircle, Store,
  Bell, ListOrdered, AlertTriangle, Menu, X, ShoppingBasket, History, BarChart3, Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { auth as firebaseAuthInstance, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { Dispensary } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator as DropdownMenuSeparatorComponent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';


interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string | number;
}

const mainSidebarNavItems: NavItem[] = [
  { title: 'Overview', href: '/dispensary-admin/dashboard', icon: LayoutDashboard },
  { title: 'My Products', href: '/dispensary-admin/products', icon: Package },
  { title: 'Browse Pool', href: '/dispensary-admin/browse-pool', icon: ShoppingBasket },
  { title: 'My Pool Activity', href: '/dispensary-admin/pool', icon: History },
  { title: 'Orders', href: '/dispensary-admin/orders', icon: ListOrdered, disabled: true, badge: 'Soon' },
];

const managementSidebarNavItems: NavItem[] = [
  { title: 'Analytics', href: '/dispensary-admin/analytics', icon: BarChart3 },
  { title: 'Manage Staff', href: '/dispensary-admin/users', icon: Users },
  { title: 'Marketing', href: '/dispensary-admin/marketing', icon: Megaphone, disabled: true, badge: 'Soon' },
];

const settingsSidebarNavItems: NavItem[] = [
  { title: 'Wellness Profile', href: '/dispensary-admin/profile', icon: Store },
  { title: 'Notifications', href: '/dispensary-admin/notifications', icon: Bell, disabled: true, badge: 'Soon' },
  { title: 'Account Settings', href: '/dispensary-admin/account', icon: UserCircle, disabled: true, badge: 'Soon' },
];


const getInitials = (name?: string | null, fallback = 'DO') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};


export default function WellnessAdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading, canAccessDispensaryPanel, currentDispensaryStatus } = useAuth();
  const [wellnessProfile, setWellnessProfile] = useState<Dispensary | null>(null);
  const [isLoadingWellness, setIsLoadingWellness] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      toast({ title: "Access Denied", description: "Please log in.", variant: "destructive" });
      router.push('/auth/signin');
      return;
    }
    
    if (currentUser.role !== 'DispensaryOwner') {
      toast({ title: "Access Denied", description: "This area is for Wellness Owners.", variant: "destructive" });
      router.push('/');
      return;
    }

    if (!canAccessDispensaryPanel) {
        if (currentDispensaryStatus === 'Pending Approval') {
            toast({ title: "Account Pending", description: "Your wellness application is still pending approval.", variant: "default" });
        } else if (currentDispensaryStatus === 'Suspended') {
            toast({ title: "Account Suspended", description: "Your wellness account is suspended. Please contact support.", variant: "destructive" });
        } else if (currentDispensaryStatus === 'Rejected') {
             toast({ title: "Application Rejected", description: "Your wellness application was not approved. Please contact support for details.", variant: "destructive" });
        } else if (!currentUser.dispensaryId) {
             toast({ title: "No Wellness Linked", description: "Your account is not linked to a wellness profile.", variant: "destructive" });
        } else {
            toast({ title: "Access Issue", description: "You do not have permission to access the wellness panel at this time.", variant: "destructive" });
        }
      router.push('/'); 
      return;
    }

    if (currentUser.dispensaryId) {
      setIsLoadingWellness(true);
      const fetchWellnessData = async () => {
        const wellnessDocRef = doc(db, 'dispensaries', currentUser.dispensaryId!);
        try {
          const docSnap = await getDoc(wellnessDocRef);
          if (docSnap.exists()) {
            setWellnessProfile({ id: docSnap.id, ...docSnap.data() } as Dispensary);
          } else {
            toast({ title: "Wellness Profile Not Found", description: "Your associated wellness data could not be found.", variant: "destructive" });
            firebaseAuthInstance.signOut(); 
            router.push('/auth/signin');
          }
        } catch (error) {
          console.error("Error fetching wellness data:", error);
          toast({ title: "Error", description: "Could not load wellness data.", variant: "destructive" });
        } finally {
          setIsLoadingWellness(false);
        }
      };
      fetchWellnessData();
    } else {
       toast({ title: "Configuration Error", description: "No wellness profile associated with your account.", variant: "destructive" });
       firebaseAuthInstance.signOut();
       router.push('/auth/signin');
       setIsLoadingWellness(false);
    }
  }, [currentUser, authLoading, canAccessDispensaryPanel, currentDispensaryStatus, router, toast]);

  const handleLogout = async () => {
    try {
      await firebaseAuthInstance.signOut();
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  if (authLoading || isLoadingWellness) {
    return (
      <div className="flex items-center justify-center h-screen"> 
        <Store className="h-12 w-12 animate-pulse text-primary mr-4" />
        <p className="text-lg text-muted-foreground">Loading Wellness Panel...</p>
      </div>
    );
  }

  if (!currentUser || !canAccessDispensaryPanel || !wellnessProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4"> 
        <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
        <p className="text-xl text-center text-destructive-foreground mb-2">Access Denied or Data Error.</p>
        <p className="text-md text-center text-muted-foreground mb-6">Please ensure you are logged in with an approved Wellness Owner account.</p>
        <Button onClick={() => router.push('/auth/signin')}>Go to Login</Button>
      </div>
    );
  }
  
  const SidebarNavigation = () => (
    <>
       <div className="flex items-center gap-2 p-3 border-b border-border">
          <Store className="h-7 w-7 text-primary" />
          <div className="overflow-hidden">
            <p className="text-lg font-semibold text-foreground truncate" title={wellnessProfile.dispensaryName}>
              {wellnessProfile.dispensaryName}
            </p>
            <p className="text-xs text-muted-foreground">Wellness Store Panel</p>
          </div>
        </div>
        <nav className="flex flex-col space-y-1 p-2">
            {mainSidebarNavItems.map((item) => (
            <Button
                key={item.title}
                variant={pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dispensary-admin/dashboard') ? 'secondary' : 'ghost'}
                className={cn(
                'w-full justify-start text-sm',
                 (pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dispensary-admin/dashboard'))
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                asChild
                onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                disabled={item.disabled}
            >
                <Link href={item.disabled ? '#' : item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge && <Badge className="ml-auto">{item.badge}</Badge>}
                </Link>
            </Button>
            ))}
            <Separator className="my-2" />
            {managementSidebarNavItems.map((item) => (
            <Button
                key={item.title}
                variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                className={cn(
                'w-full justify-start text-sm',
                 pathname.startsWith(item.href)
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                asChild
                onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                disabled={item.disabled}
            >
                <Link href={item.disabled ? '#' : item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge && <Badge className="ml-auto">{item.badge}</Badge>}
                </Link>
            </Button>
            ))}
            <Separator className="my-2" />
             {settingsSidebarNavItems.map((item) => (
            <Button
                key={item.title}
                variant={pathname.startsWith(item.href) ? 'secondary' : 'ghost'}
                className={cn(
                'w-full justify-start text-sm',
                 pathname.startsWith(item.href)
                    ? 'bg-primary/10 text-primary hover:bg-primary/20'
                    : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                item.disabled && 'opacity-50 cursor-not-allowed'
                )}
                asChild
                onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                disabled={item.disabled}
            >
                <Link href={item.disabled ? '#' : item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge && <Badge className="ml-auto">{item.badge}</Badge>}
                </Link>
            </Button>
            ))}
        </nav>
        <div className="mt-auto p-2 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 hover:bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Owner'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(currentUser.displayName, wellnessProfile.dispensaryName?.[0])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-2 text-left overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Owner
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel>{currentUser.displayName || 'Owner Profile'}</DropdownMenuLabel>
                <DropdownMenuSeparatorComponent />
                 <DropdownMenuItem onClick={() => router.push('/')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Main Site</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </>
  );

  return (
    <div className="flex min-h-screen"> 
      <aside className="hidden md:flex md:flex-col w-64 border-r bg-background shadow-sm">
        <SidebarNavigation />
      </aside>
      
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden"> 
              <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="md:hidden">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle Menu</span>
                  </Button>
              </SheetTrigger>
              <div className="flex-1">
                  <h1 
                    className="text-lg font-semibold text-foreground truncate"
                    style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
                  >
                    {wellnessProfile.dispensaryName}
                  </h1>
              </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
              {children}
          </main>
        </div>

        <SheetContent side="left" className="p-0 w-72 flex flex-col bg-background">
            <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </SheetClose>
            <SidebarNavigation />
        </SheetContent>
      </Sheet>
    </div>
  );
}

