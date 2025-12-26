
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { DollarSign, History, LayoutDashboard, UserCircle, Menu, X, LogOut, Settings, Package, Brain, Sparkles, Loader2, AlertTriangle, UserCheck, BarChart3, Video } from 'lucide-react'; 
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
        <h2 className="text-xl font-semibold text-primary px-1">Leaf Dashboard</h2>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="w-full justify-start p-2 hover:bg-muted/50">
              <Avatar className="h-9 w-9">
                <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getInitials(currentUser.displayName, 'LU')}
                </AvatarFallback>
              </Avatar>
              <div className="ml-2 text-left overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </p>
                <p className="text-xs text-muted-foreground">
                  Credits: <span className="font-semibold text-primary">{currentUser.credits ?? 0}</span>
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
                  </div>
            </DropdownMenuLabel>
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
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-theme(space.16))] md:min-h-[calc(100vh-theme(space.20))]">
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b bg-card text-card-foreground shadow-sm">
        <Link 
          href="/dashboard/leaf" 
          className="text-lg font-semibold text-foreground"
          style={{ textShadow: '0 0 8px #fff, 0 0 15px #fff, 0 0 20px #fff' }}
        >
          Leaf Dashboard
        </Link>
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
      </header>

      <aside className="hidden md:flex md:flex-col w-64 border-r bg-card text-card-foreground shadow-sm">
        <SidebarContentLayout />
      </aside>
      
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
