
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable, FunctionsError } from 'firebase/functions';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  currentDispensary: Dispensary | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserProfileCallable = httpsCallable<void, AppUser>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const result = await getUserProfileCallable();
          const appUser = result.data as AppUser;
          
          setCurrentUser(appUser);
          localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
          
        } catch (error) {
          console.error("Critical: Failed to get user profile. Logging out.", error);
          if (error instanceof FunctionsError) {
              console.error("Function error code:", error.code);
              console.error("Function error message:", error.message);
          }
          await auth.signOut();
          setCurrentUser(null);
          localStorage.removeItem('currentUserHolisticAI');
        } finally {
          setLoading(false); 
        }
      } else {
        // User is signed out, clear everything.
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && currentUser) {
      const isAuthPage = pathname.startsWith('/auth');
      if (isAuthPage) {
        if (currentUser.role === 'Super Admin') {
          router.push('/admin/dashboard');
        } else if (currentUser.role === 'DispensaryOwner' && currentUser.dispensaryStatus === 'Approved') {
          router.push('/dispensary-admin/dashboard');
        } else if (currentUser.role === 'DispensaryOwner' && currentUser.dispensaryStatus !== 'Approved') {
          router.push('/'); 
        } else {
          router.push('/dashboard/leaf');
        }
      }
    }
  }, [currentUser, loading, pathname, router]);

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const canAccessDispensaryPanel = isDispensaryOwner && currentUser?.dispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  const currentDispensaryStatus = currentUser?.dispensaryStatus || null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        currentDispensary,
        loading,
        isSuperAdmin,
        isDispensaryOwner,
        canAccessDispensaryPanel,
        isLeafUser,
        currentDispensaryStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
