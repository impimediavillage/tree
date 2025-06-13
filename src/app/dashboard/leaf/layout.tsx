
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Card, DollarSign, History, LayoutDashboard, UserCircle, Menu, X } from 'lucide-react'; // Added Menu, X
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { User } from '@/types';
import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet'; // Added Sheet components

const sidebarNavItems = [
  { title: 'Overview', href: '/dashboard/leaf', icon: LayoutDashboard },
  { title: 'My Credits', href: '/dashboard/leaf/credits', icon: DollarSign },
  { title: 'Interaction History', href: '/dashboard/leaf/history', icon: History },
  { title: 'My Profile', href: '/dashboard/leaf/profile', icon: UserCircle },
];

export default function LeafDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const storedUserString = localStorage.getItem('currentUserHolisticAI');
    if (storedUserString) {
      try {
        const user = JSON.parse(storedUserString) as User;
        setCurrentUser(user);
      } catch (e) {
        console.error("Error parsing current user from localStorage", e);
      }
    }
    setIsLoadingUser(false);
  }, []);

  if (isLoadingUser) {
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

  const SidebarContent = () => (
    <>
      <h2 className="text-xl font-semibold text-primary mb-1 px-2">Leaf Dashboard</h2>
      <div className="flex items-center space-x-3 p-2 rounded-md bg-muted mb-3">
        <UserCircle className="h-8 w-8 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground truncate max-w-[150px]">
            {currentUser.displayName || currentUser.email}
          </p>
          <p className="text-xs text-muted-foreground">
            Credits: <span className="font-semibold text-primary">{currentUser.credits ?? 0}</span>
          </p>
        </div>
      </div>
      <Separator className="mb-3" />
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
            onClick={() => isMobileSidebarOpen && setIsMobileSidebarOpen(false)} // Close mobile sidebar on click
          >
            <Link href={item.href}>
              <item.icon className="mr-2 h-5 w-5" />
              {item.title}
            </Link>
          </Button>
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-theme(space.16))] md:min-h-[calc(100vh-theme(space.20))]">
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between p-3 border-b bg-card text-card-foreground shadow-sm">
        <Link href="/dashboard/leaf" className="text-lg font-semibold text-primary">Leaf Dashboard</Link>
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4 pt-8 bg-card"> {/* Added pt-8 for SheetClose */}
            <SheetClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
            </SheetClose>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 border-r bg-card text-card-foreground p-4 space-y-4 shadow-sm">
        <SidebarContent />
      </aside>
      
      <main className="flex-1 p-4 sm:p-6 bg-muted/30 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
