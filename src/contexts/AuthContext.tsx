
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { httpsCallable, FunctionsError } from "firebase/functions";

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

const getUserProfileCallable = httpsCallable<void, AppUser | null>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          // Always call the function to get the latest profile and roles
          const result = await getUserProfileCallable();
          const profile = result.data;
          
          if (profile) {
            setCurrentUser(profile);
            const isAuthPage = pathname.startsWith('/auth');
            if (isAuthPage) {
              // Redirect based on role after successful login
              if (profile.role === 'Super Admin') {
                router.push('/admin/dashboard');
              } else if (profile.role === 'DispensaryOwner' && profile.dispensaryStatus === 'Approved') {
                router.push('/dispensary-admin/dashboard');
              } else {
                router.push('/dashboard/leaf');
              }
            }
          } else {
            // If profile is null, something is wrong, sign out.
            await auth.signOut();
            setCurrentUser(null);
          }
        } catch (error) {
          console.error("Critical: Failed to get user profile. Logging out.", error);
          if (error instanceof FunctionsError) {
              console.error("Function error code:", error.code);
              console.error("Function error message:", error.message);
          }
          await auth.signOut();
          setCurrentUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        // No firebase user, so clear our state
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router, pathname]);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const currentDispensaryStatus = currentUser?.dispensary?.status || null;
  const canAccessDispensaryPanel = isDispensaryOwner && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  
  const value = {
    currentUser,
    setCurrentUser,
    currentDispensary: currentUser?.dispensary || null,
    loading,
    isSuperAdmin,
    isDispensaryOwner,
    canAccessDispensaryPanel,
    isLeafUser,
    currentDispensaryStatus,
  };

  return (
    <AuthContext.Provider value={value}>
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
