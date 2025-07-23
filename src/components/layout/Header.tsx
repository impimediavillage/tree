
'use client';

import Link from 'next/link';
import { Trees, UserCircle, LogOut, LayoutDashboard, Settings, ShoppingCart, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CartIcon } from './CartIcon';

const getInitials = (name?: string | null, fallback = 'U') => {
  if (!name) return fallback;
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export function Header() {
  const { currentUser, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Clearing currentUser from AuthContext will be handled by onAuthStateChanged listener
      localStorage.removeItem('currentUserHolisticAI'); // Also explicitly clear localStorage
      toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
      router.push('/auth/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast({ title: 'Logout Failed', description: 'Could not log out. Please try again.', variant: 'destructive' });
    }
  };

  // Do not render header on auth pages or specific dashboard layouts
  const noHeaderPaths = ['/auth/', '/admin/dashboard', '/dashboard/leaf', '/dispensary-admin/dashboard'];
  if (noHeaderPaths.some(p => pathname.startsWith(p))) {
    return null;
  }

  return (
    <header className="bg-background/80 border-b border-border/80 shadow-sm sticky top-0 z-50 backdrop-blur-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-2xl font-bold text-primary hover:text-primary/90 transition-colors">
          <Trees className="h-8 w-8" />
          <span className="hidden sm:inline">The Wellness Tree</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary hover:bg-primary/10 px-2 sm:px-3">
            <Link href="/pricing">
                Pricing
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-primary hover:bg-primary/10 px-2 sm:px-3">
            <Link href="/browse-dispensary-types">
                <span className="sm:hidden">Browse</span>
                <span className="hidden sm:inline">Browse stores</span>
            </Link>
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1 sm:mx-2" />

          <CartIcon />

          {authLoading ? (
            <div className="h-9 w-9 flex items-center justify-center ml-1">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : currentUser ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ml-1">
                  <Avatar className="h-9 w-9 border-2 border-primary/50">
                    <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || 'User'} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      {getInitials(currentUser.displayName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
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
                <DropdownMenuSeparator />
                {currentUser.role === 'Super Admin' && (
                  <DropdownMenuItem onClick={() => router.push('/admin/dashboard')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                )}
                {currentUser.role === 'DispensaryOwner' && (
                  <DropdownMenuItem onClick={() => router.push('/dispensary-admin/dashboard')}>
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>My Store Panel</span>
                  </DropdownMenuItem>
                )}
                {(currentUser.role === 'User' || currentUser.role === 'LeafUser') && (
                  <DropdownMenuItem onClick={() => router.push('/dashboard/leaf')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>My Dashboard</span>
                  </DropdownMenuItem>
                )}
                {(currentUser.role === 'User' || currentUser.role === 'LeafUser') && (
                   <DropdownMenuItem onClick={() => router.push('/dashboard/leaf/profile')}>
                    <UserCircle className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Button variant="ghost" size="icon" asChild className="ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10">
                <Link href="/auth/signin" aria-label="Login or create account">
                    <UserCircle className="h-6 w-6" />
                </Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
