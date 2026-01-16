'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  LayoutDashboard, Package, Users, Settings, LogOut, UserCircle, Store,
  Bell, ListOrdered, AlertTriangle, Menu, X, ShoppingBasket, History, BarChart3, Megaphone, CreditCard, Palette, Loader2, PackageCheck, DollarSign, Calendar, Tv, Truck, Share2, FolderTree
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import React, { useEffect, useState, type ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator as DropdownMenuSeparatorComponent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { DispensaryAdminProvider } from '@/contexts/DispensaryAdminContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationBell, NotificationCenter } from '@/components/notifications';
import { SocialShareHub } from '@/components/social-share/SocialShareHub';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string | number;
  ownerOnly?: boolean;
  dispensaryTypeOnly?: string; // Only show for specific dispensary type
}

const mainSidebarNavItems: NavItem[] = [
  { title: 'Overview', href: '/dispensary-admin/dashboard', icon: LayoutDashboard },
  { title: 'My Products', href: '/dispensary-admin/products', icon: Package },
  { title: 'Orders', href: '/dispensary-admin/orders', icon: ListOrdered },
];

const productPoolNavItems: NavItem[] = [
  { title: 'Browse Pool', href: '/dispensary-admin/browse-pool', icon: ShoppingBasket, ownerOnly: true },
  { title: 'My Pool Activity', href: '/dispensary-admin/pool', icon: History, ownerOnly: true },
  { title: 'Pool Orders', href: '/dispensary-admin/product-pool-orders', icon: PackageCheck, ownerOnly: true },
];

const managementSidebarNavItems: NavItem[] = [
  { title: 'Analytics', href: '/dispensary-admin/analytics', icon: BarChart3 },
  { title: 'Category Manager', href: '/dispensary-admin/category-manager', icon: FolderTree, ownerOnly: true, dispensaryTypeOnly: 'Mushroom store' },
  { title: 'Events Calendar', href: '/dispensary-admin/events', icon: Calendar, ownerOnly: true },
  { title: 'Advertising', href: '/dispensary-admin/advertising', icon: Tv, ownerOnly: true },
  { title: 'Social Share Hub', href: '#social-share', icon: Share2, ownerOnly: true },
  { title: 'Payouts', href: '/dispensary-admin/payouts', icon: DollarSign },
  { title: 'Credits', href: '/dispensary-admin/credits', icon: CreditCard },
  { title: 'The Creator Lab', href: '/dashboard/creator-lab', icon: Palette },
  { title: 'My Crew', href: '/dispensary-admin/users', icon: Users, ownerOnly: true },
  { title: 'Driver Management', href: '/dispensary-admin/drivers', icon: Truck, ownerOnly: true },
];

const settingsSidebarNavItems: NavItem[] = [
  { title: 'My Profile', href: '/dispensary-admin/profile', icon: Store },
  { title: 'Notifications', href: '#notifications', icon: Bell },
];


const getInitials = (name?: string | null, fallback = 'DO') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

function WellnessAdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading, canAccessDispensaryPanel, currentDispensary, isDispensaryOwner, isDispensaryStaff, isVendor, isDriver, isInHouseStaff, logout } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showSocialShareHub, setShowSocialShareHub] = useState(false);
  
  useEffect(() => {
    if (!authLoading && !canAccessDispensaryPanel) {
        if (!currentUser) {
            toast({ title: "Access Denied", description: "Please log in to access the wellness panel.", variant: "destructive" });
            router.replace('/auth/signin');
        } else {
            toast({ title: "Access Denied", description: "Your account does not have permission for this area or your dispensary is not yet approved.", variant: "destructive" });
            router.replace('/');
        }
    }
  }, [authLoading, canAccessDispensaryPanel, currentUser, router, toast]);

  // Redirect drivers to their dedicated panel
  useEffect(() => {
    if (!authLoading && currentUser && isDriver) {
      router.replace('/driver');
    }
  }, [authLoading, currentUser, isDriver, router]);

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === '#notifications') {
      e.preventDefault();
      setShowNotificationCenter(true);
      setIsMobileSidebarOpen(false);
      return false;
    }
    if (href === '#social-share') {
      e.preventDefault();
      setShowSocialShareHub(true);
      setIsMobileSidebarOpen(false);
      return false;
    }
    setIsMobileSidebarOpen(false);
  };

  if (authLoading || !canAccessDispensaryPanel || !currentUser || !currentDispensary) {
     return (
      <div className="flex flex-col items-center justify-center h-screen p-4 bg-background"> 
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading Wellness Panel...</p>
        {!authLoading && (
             <div className="mt-6 text-center">
               <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-2" />
               <p className="text-destructive font-semibold">Access Denied</p>
               <p className="text-sm text-muted-foreground">Redirecting...</p>
             </div>
        )}
      </div>
    );
  }
  
  // Filter navigation items based on crew member type
  const filterNavItems = (items: NavItem[]) => {
    return items.filter(item => {
      // Owners see everything
      if (isDispensaryOwner) return true;
      
      // Vendors: Only see products, orders (filtered), analytics, payouts, notifications
      if (isVendor) {
        const vendorAllowed = ['/dispensary-admin/products', '/dispensary-admin/orders', 
          '/dispensary-admin/analytics', '/dispensary-admin/payouts', '/dispensary-admin/profile'];
        return vendorAllowed.some(path => item.href.startsWith(path)) || item.href === '#notifications';
      }
      
      // Drivers: Only see driver-specific pages (redirected to driver panel in useEffect below)
      if (isDriver) {
        return false; // Drivers get redirected to driver panel
      }
      
      // In-house staff: See everything except owner-only items
      if (isInHouseStaff) {
        return !item.ownerOnly;
      }
      
      // Default: Check ownerOnly flag
      return !item.ownerOnly;
    });
  };
  
  const SidebarNavigation = () => (
    <>
       <div className="flex items-center gap-3 p-3 border-b border-sidebar-border">
          {/* Display Store Image (or Icon fallback or Store icon) */}
          {currentDispensary.storeImage || currentDispensary.storeIcon ? (
            <div className="relative h-12 w-12 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              <Image
                src={currentDispensary.storeImage || currentDispensary.storeIcon!}
                alt={currentDispensary.dispensaryName}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <Store className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
          )}
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="text-base sm:text-lg font-semibold text-foreground truncate" title={currentDispensary.dispensaryName}>
              {currentDispensary.dispensaryName}
            </p>
            <p className="text-xs text-muted-foreground">My Store Panel</p> 
          </div>
        </div>
        <ScrollArea className="flex-1">
          <nav className="flex flex-col space-y-1 p-2">
            {/* Main Section */}
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Main</p>
            </div>
            {filterNavItems(mainSidebarNavItems).map((item) => {
              const itemDisabled = item.disabled || (item.ownerOnly && !isDispensaryOwner);
              return (
                <Button
                  key={item.title}
                  variant={(pathname?.startsWith(item.href) && item.href !== '/dispensary-admin/dashboard') ? 'secondary' : ((pathname === item.href) ? 'secondary' : 'ghost')}
                  className={cn(
                    'w-full justify-start text-sm',
                    ((pathname?.startsWith(item.href) && item.href !== '/dispensary-admin/dashboard') || pathname === item.href)
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                    itemDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  asChild
                  onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                  disabled={itemDisabled}
                >
                  <Link href={itemDisabled ? '#' : item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                    {item.badge && (
                      <Badge className={cn(
                        "ml-auto",
                        item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                      )}>{item.badge}</Badge>
                    )}
                  </Link>
                </Button>
              );
            })}

            {/* Product Pool Section */}
            {(isDispensaryOwner && productPoolNavItems.length > 0) && (
              <>
                <Separator className="my-2" />
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Product Pool</p>
                </div>
                {productPoolNavItems.map((item) => {
                  const itemDisabled = item.disabled || (item.ownerOnly && !isDispensaryOwner);
                  return (
                    <Button
                      key={item.title}
                      variant={pathname?.startsWith(item.href) ? 'secondary' : 'ghost'}
                      className={cn(
                        'w-full justify-start text-sm',
                        pathname?.startsWith(item.href)
                          ? 'bg-primary/10 text-primary hover:bg-primary/20'
                          : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                        itemDisabled && 'opacity-50 cursor-not-allowed'
                      )}
                      asChild
                      onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                      disabled={itemDisabled}
                    >
                      <Link href={itemDisabled ? '#' : item.href}>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                        {item.badge && (
                          <Badge className={cn(
                            "ml-auto",
                            item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                          )}>{item.badge}</Badge>
                        )}
                      </Link>
                    </Button>
                  );
                })}
              </>
            )}

            {/* Management Section */}
            <Separator className="my-2" />
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Management</p>
            </div>
            {filterNavItems(managementSidebarNavItems).map((item) => {
              const itemDisabled = item.disabled || (item.ownerOnly && !isDispensaryOwner);
              const isSpecialHref = item.href.startsWith('#');
              // Hide item if it's for a specific dispensary type and current doesn't match
              if (item.dispensaryTypeOnly && currentDispensary?.dispensaryType !== item.dispensaryTypeOnly) {
                return null;
              }
              return (
                <Button
                  key={item.title}
                  variant={pathname?.startsWith(item.href) && !isSpecialHref ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start text-sm',
                    pathname?.startsWith(item.href) && !isSpecialHref
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                    itemDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  asChild={!isSpecialHref}
                  onClick={(e) => isSpecialHref ? handleNavClick(item.href, e) : isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                  disabled={itemDisabled}
                >
                  {isSpecialHref ? (
                    <>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge className={cn(
                          "ml-auto",
                          item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                        )}>{item.badge}</Badge>
                      )}
                    </>
                  ) : (
                    <Link href={itemDisabled ? '#' : item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge className={cn(
                          "ml-auto",
                          item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                        )}>{item.badge}</Badge>
                      )}
                    </Link>
                  )}
                </Button>
              );
            })}

            {/* Settings Section */}
            <Separator className="my-2" />
            <div className="px-2 py-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Settings</p>
            </div>
            {filterNavItems(settingsSidebarNavItems).map((item) => {
              const itemDisabled = item.disabled || (item.ownerOnly && !isDispensaryOwner);
              const isSpecialHref = item.href.startsWith('#');
              return (
                <Button
                  key={item.title}
                  variant={pathname?.startsWith(item.href) && !isSpecialHref ? 'secondary' : 'ghost'}
                  className={cn(
                    'w-full justify-start text-sm',
                    pathname?.startsWith(item.href) && !isSpecialHref
                      ? 'bg-primary/10 text-primary hover:bg-primary/20'
                      : 'hover:bg-accent/80 hover:text-accent-foreground text-foreground',
                    itemDisabled && 'opacity-50 cursor-not-allowed'
                  )}
                  asChild={!isSpecialHref}
                  onClick={(e) => isSpecialHref ? handleNavClick(item.href, e) : isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
                  disabled={itemDisabled}
                >
                  {isSpecialHref ? (
                    <>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge className={cn(
                          "ml-auto",
                          item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                        )}>{item.badge}</Badge>
                      )}
                    </>
                  ) : (
                    <Link href={itemDisabled ? '#' : item.href}>
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                      {item.badge && (
                        <Badge className={cn(
                          "ml-auto",
                          item.badge === 'Soon' && "bg-[#006B3E] hover:bg-[#005230] text-white"
                        )}>{item.badge}</Badge>
                      )}
                    </Link>
                  )}
                </Button>
              );
            })}
          </nav>
        </ScrollArea>
        <div className="mt-auto p-2 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="w-full justify-start p-2 hover:bg-muted/50">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'Owner'} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(currentUser.displayName, currentDispensary.dispensaryName?.[0])}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-2 text-left overflow-hidden">
                    <p className="text-sm font-medium text-foreground truncate max-w-[120px]">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {currentUser.role.replace('Dispensary', '')}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start" className="w-56">
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none truncate">
                          {currentUser.displayName || currentUser.email?.split('@')[0]}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground truncate">
                          {currentUser.email}
                        </p>
                        <p className="text-xs leading-none text-primary/90 mt-1 font-medium">
                          My Store Panel
                        </p>
                      </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparatorComponent />
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
    </>
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden"> 
      <aside className="hidden md:flex md:flex-col w-64 border-r bg-background shadow-sm flex-shrink-0">
          <SidebarNavigation />
      </aside>
      
      <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <div className="flex flex-1 flex-col min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 sm:gap-4 border-b bg-background/80 px-3 sm:px-4 backdrop-blur-sm sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 md:hidden"> 
              <SheetTrigger asChild>
                  <Button size="icon" variant="outline" className="md:hidden flex-shrink-0">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle Menu</span>
                  </Button>
              </SheetTrigger>
              <div className="flex-1 min-w-0">
                  <h1 
                      className="text-sm sm:text-lg font-semibold text-foreground truncate"
                      style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
                  >
                      {currentDispensary.dispensaryName}
                  </h1>
              </div>
              {/* Notification Bell - Mobile */}
              <div className="flex-shrink-0">
                <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
              </div>
          </header>
          
          {/* Desktop Top Bar with Notifications */}
          <div className="hidden md:flex items-center justify-end gap-4 border-b bg-background px-6 py-3">
            <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
          </div>
          
          <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
              {children}
          </main>
          </div>

          <SheetContent side="left" className="p-0 w-72 flex flex-col bg-background">
          <SheetHeader>
              <SheetTitle className="sr-only">Sidebar Navigation</SheetTitle>
          </SheetHeader>
          <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
          </SheetClose>
          <SidebarNavigation />
          </SheetContent>
      </Sheet>
      
      {/* Notification Center Drawer */}
      <NotificationCenter 
        isOpen={showNotificationCenter} 
        onClose={() => setShowNotificationCenter(false)} 
      />
      
      {/* Social Share Hub Dialog */}
      <SocialShareHub 
        isOpen={showSocialShareHub}
        onOpenChange={setShowSocialShareHub}
      />
    </div>
  );
}

export default function DispensaryAdminRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
      <DispensaryAdminProvider>
        <WellnessAdminLayoutContent>{children}</WellnessAdminLayoutContent>
      </DispensaryAdminProvider>
  );
}
