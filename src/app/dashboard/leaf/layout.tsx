
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { DollarSign, History, LayoutDashboard, UserCircle, Menu, X, LogOut, Settings, Package, Brain, Sparkles, Loader2, AlertTriangle, UserCheck, BarChart3, Video, Calendar, Trees } from 'lucide-react'; 
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator as DropdownMenuSeparatorComponent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { NotificationBell, NotificationCenter } from '@/components/notifications';
import { TutorialLauncher, TutorialManager, TutorialTriggerButton } from '@/components/tutorial';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  disabled?: boolean;
  badge?: string;
}

const sidebarNavItems: NavItem[] = [
  { title: 'Overview', href: '/dashboard/leaf', icon: LayoutDashboard },
  { title: 'My Profile', href: '/dashboard/leaf/profile', icon: UserCircle },
  { title: 'My Orders', href: '/dashboard/orders', icon: Package },
  { title: 'My Credits', href: '/dashboard/leaf/credits', icon: DollarSign },
  { title: 'Interaction History', href: '/dashboard/leaf/history', icon: History },
  { title: 'Community Events', href: '/dashboard/leaf/events', icon: Calendar },
  { title: 'Video Library', href: '/dashboard/leaf/video-library', icon: Video },
  { title: 'AI Advisors', href: '/dashboard/advisors', icon: Brain },
  { title: 'The Creator Lab', href: '/dashboard/creator-lab', icon: Sparkles },
  { title: 'Influencer Dashboard', href: '/dashboard/influencer', icon: UserCheck },
  { title: 'Influencer Analytics', href: '/dashboard/influencer/analytics', icon: BarChart3 },
  { title: 'Triple S Club', href: '/triple-s-club', icon: Sparkles },
];

const getInitials = (name?: string | null, fallback = 'LU') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default function LeafDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { currentUser, loading: authLoading, logout, isLeafUser } = useAuth();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    if (!authLoading && !isLeafUser) {
      toast({
        title: "Access Denied",
        description: "This dashboard is for Leaf Users only.",
        variant: "destructive",
      });
      router.replace(currentUser ? '/' : '/auth/signin');
    }
  }, [authLoading, isLeafUser, router, toast, currentUser]);

  if (authLoading || !currentUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-center p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-bold">Loading Your Dashboard...</h2>
        <p className="mt-2 text-muted-foreground">Please wait while we prepare your space.</p>
         {!authLoading && !currentUser && (
             <div className="mt-6 text-center">
               <AlertTriangle className="h-10 w-10 mx-auto text-destructive mb-2" />
               <p className="text-destructive font-semibold">Access Denied</p>
               <p className="text-sm text-muted-foreground">Redirecting...</p>
             </div>
        )}
      </div>
    );
  }
  
  const SidebarContentLayout = () => (
    <>
      <div className="p-3 border-b">
        <Link href="/dashboard/leaf" className="flex items-center gap-3 px-1 hover:opacity-80 transition-opacity">
          <Trees className="h-8 w-8 text-[#006B3E] flex-shrink-0" />
          <h2 className="text-lg sm:text-xl font-semibold text-primary">Leaf Dashboard</h2>
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
                  {item.badge && <Badge className="ml-auto bg-[#006B3E] hover:bg-[#005230] text-white">{item.badge}</Badge>}
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
          <p>Credits: <span className="font-semibold text-primary">{currentUser.credits ?? 0}</span></p>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-theme(space.16))] md:min-h-[calc(100vh-theme(space.20))]">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b bg-card text-card-foreground shadow-sm">
        <Link 
          href="/dashboard/leaf" 
          className="flex items-center gap-2"
        >
          <Trees className="h-8 w-8 text-[#006B3E]" />
          <span 
            className="text-lg font-semibold text-foreground"
            style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
          >
            Leaf Dashboard
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
          {/* User Menu - Mobile */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(currentUser.displayName, 'LU')}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end" className="w-56">
              <DropdownMenuLabel>{currentUser.displayName || 'Leaf User'}</DropdownMenuLabel>
              <DropdownMenuSeparatorComponent />
              <DropdownMenuItem onClick={() => router.push('/dashboard/leaf/profile')}>
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

      <aside className="hidden md:flex md:flex-col w-64 border-r bg-card text-card-foreground shadow-sm">
        <SidebarContentLayout />
      </aside>
      
      <div className="flex-1 flex flex-col">
        {/* Desktop Top Ribbon - Full Width */}
        <div className="hidden md:flex items-center justify-between w-full border-b bg-background/95 backdrop-blur-sm px-6 py-3 sticky top-0 z-40">
          <Link href="/dashboard/leaf" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Trees className="h-10 w-10 text-[#006B3E]" />
            <h1 
              className="text-2xl font-extrabold text-[#3D2E17]"
              style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
            >
              Leaf Dashboard
            </h1>
          </Link>
          <div className="flex items-center gap-3">
            <NotificationBell onOpenCenter={() => setShowNotificationCenter(true)} />
            
            {/* User Menu - Desktop */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-accent">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {getInitials(currentUser.displayName, 'LU')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left hidden lg:block">
                    <p className="text-sm font-medium text-foreground">
                      {currentUser.displayName || currentUser.email?.split('@')[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Credits: {currentUser.credits ?? 0}
                    </p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end" className="w-56">
                <DropdownMenuLabel>{currentUser.displayName || 'Leaf User'}</DropdownMenuLabel>
                <DropdownMenuSeparatorComponent />
                <DropdownMenuItem onClick={() => router.push('/dashboard/leaf/profile')}>
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
      
      {/* Tutorial System Components */}
      <TutorialLauncher userType="leaf" />
      <TutorialManager userType="leaf" />
      <TutorialTriggerButton />
      
      {/* Notification Center Drawer */}
      <NotificationCenter 
        isOpen={showNotificationCenter} 
        onClose={() => setShowNotificationCenter(false)} 
      />
    </div>
  );
}
