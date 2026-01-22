'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Truck, MapPin, DollarSign, History, LayoutDashboard, UserCircle, Menu, X, LogOut, Settings, Award, Trees } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator as DropdownMenuSeparatorComponent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { NotificationBell, NotificationCenter } from '@/components/notifications';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
}

const sidebarNavItems: NavItem[] = [
  { title: 'Dashboard', href: '/driver/dashboard', icon: LayoutDashboard },
  { title: 'Active Deliveries', href: '/driver/deliveries', icon: Truck },
  { title: 'Delivery History', href: '/driver/history', icon: History },
  { title: 'Earnings', href: '/driver/earnings', icon: DollarSign },
  { title: 'Map View', href: '/driver/map', icon: MapPin },
  { title: 'Profile', href: '/driver/profile', icon: UserCircle },
  { title: 'Achievements', href: '/driver/achievements', icon: Award },
];

const getInitials = (name?: string | null, fallback = 'DR') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function DriverDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    if (!authLoading && currentUser && !currentUser.isDriver) {
      toast({
        title: 'Access Denied',
        description: 'You must be a registered driver to access this page',
        variant: 'destructive'
      });
      router.push('/');
    }
  }, [authLoading, currentUser, router, toast]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading driver dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    router.push('/login');
    return null;
  }

  const SidebarContentLayout = () => (
    <>
      <div className="p-3 border-b">
        <Link href="/driver/dashboard" className="flex items-center gap-3 px-1 hover:opacity-80 transition-opacity">
          <Trees className="h-8 w-8 text-[#006B3E] flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold text-primary">Driver Portal</h2>
        </Link>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-1">
        <nav className="flex flex-col space-y-1">
          {sidebarNavItems.map((item) => (
            <Button
              key={item.title}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                pathname === item.href && 'bg-primary/10 text-primary hover:bg-primary/20',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              asChild={!item.disabled}
              onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
              disabled={item.disabled}
            >
              {item.disabled ? (
                <span className="flex items-center w-full">
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.title}
                </span>
              ) : (
                <Link href={item.href}>
                  <item.icon className="mr-2 h-5 w-5" />
                  {item.title}
                </Link>
              )}
            </Button>
          ))}
        </nav>
      </div>
      <div className="p-3 border-t mt-auto">
        {/* Footer kept minimal - main user menu moved to top ribbon */}
        <div className="text-center text-xs text-muted-foreground py-2">
          <p>Driver Portal v1.0</p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b bg-card text-card-foreground shadow-sm">
        <Link 
          href="/driver/dashboard" 
          className="flex items-center gap-2"
        >
          <Trees className="h-8 w-8 text-[#006B3E]" />
          <span 
            className="text-lg font-semibold text-foreground"
            style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
          >
            Driver Portal
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
          {/* User Menu - Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Driver'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(currentUser.displayName, 'DR')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-56">
              <DropdownMenuLabel>{currentUser.displayName || 'Driver'}</DropdownMenuLabel>
              <DropdownMenuSeparatorComponent />
              <DropdownMenuItem onClick={() => router.push('/driver/profile')}>
                <UserCircle className="mr-2 h-4 w-4" />
                <span>My Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/')}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Main Site</span>
              </DropdownMenuItem>
              <DropdownMenuSeparatorComponent />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card">
              <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary z-10">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </SheetClose>
              <SidebarContentLayout />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col w-64 border-r bg-card text-card-foreground shadow-sm">
        <SidebarContentLayout />
      </aside>
      
      <div className="flex-1 flex flex-col">
        {/* Desktop Top Ribbon - Full Width */}
        <div className="hidden md:flex items-center justify-between w-full border-b bg-background/95 backdrop-blur-sm px-6 py-3 sticky top-0 z-40">
          <Link href="/driver/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Trees className="h-10 w-10 text-[#006B3E]" />
            <h1 
              className="text-2xl font-extrabold text-[#3D2E17]"
              style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >
              Driver Portal
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
            
            {/* User Menu - Desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Driver'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(currentUser.displayName, 'DR')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground uppercase">
                      Driver
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-56">
                <DropdownMenuLabel>{currentUser.displayName || 'Driver'}</DropdownMenuLabel>
                <DropdownMenuSeparatorComponent />
                <DropdownMenuItem onClick={() => router.push('/driver/profile')}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  <span>Main Site</span>
                </DropdownMenuItem>
                <DropdownMenuSeparatorComponent />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
      
      {/* Notification Center Drawer */}
      <NotificationCenter 
        isOpen={showNotificationCenter} 
        onClose={() => setShowNotificationCenter(false)} 
      />
    </div>
  );
}
