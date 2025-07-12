
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Card, DollarSign, History, LayoutDashboard, UserCircle, Menu, X, LogOut, Settings, Palette } from 'lucide-react'; 
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
import { auth as firebaseAuthInstance } from '@/lib/firebase';

const sidebarNavItems = [
  { title: 'Overview', href: '/dashboard/leaf', icon: LayoutDashboard },
  { title: 'My Profile', href: '/dashboard/leaf/profile', icon: UserCircle },
  { title: 'My Sticker Sets', href: '/dashboard/leaf/sticker-sets', icon: Palette },
  { title: 'My Credits', href: '/dashboard/leaf/credits', icon: DollarSign },
  { title: 'Interaction History', href: '/dashboard/leaf/history', icon: History },
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
  const { currentUser, loading: authLoading } = useAuth(); // Get currentUser from useAuth
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await firebaseAuthInstance.signOut();
      localStorage.removeItem('currentUserHolisticAI');
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  if (authLoading) { // Use authLoading from useAuth
    return <div className="p-4">Loading user data...</div>;
  }

  if (!currentUser) {
    return (
      <div className="p-4 text-center">
        <p>You need to be logged in to access this dashboard.</p>
        <Button asChild className="mt-4">
          <Link href="/auth/signin">Go to Login</Link>
        </Button>
      </div>
    );
  }
  
  if (currentUser.role !== 'User' && currentUser.role !== 'LeafUser') {
     return (
      <div className="p-4 text-center">
        <p>This dashboard is for Leaf Users. Your role is: {currentUser.role}</p>
         <Button asChild className="mt-4">
          <Link href="/">Back to Home</Link>
        </Button>
      </div>
    );
  }

  const SidebarContentLayout = () => (
    <>
      <div className="p-3 border-b">
        <h2 className="text-xl font-semibold text-primary px-1">Leaf Dashboard</h2>
      </div>
      <div className="flex-grow overflow-y-auto p-2 space-y-1"> {/* Ensure this container can scroll */}
        <nav className="flex flex-col space-y-1">
          {sidebarNavItems.map((item) => (
            <Button
              key={item.title}
              variant={pathname === item.href ? 'secondary' : 'ghost'}
              className={cn(
                'w-full justify-start',
                pathname === item.href && 'bg-primary/10 text-primary hover:bg-primary/20'
              )}
              asChild
              onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-5 w-5" />
                {item.title}
              </Link>
            </Button>
          ))}
        </nav>
      </div>
      <div className="p-3 border-t mt-auto"> {/* Profile Dropdown section */}
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
          <SheetContent side="left" className="w-72 p-0 flex flex-col bg-card"> {/* Removed pt-8, handled by flex-col and mt-auto */}
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
