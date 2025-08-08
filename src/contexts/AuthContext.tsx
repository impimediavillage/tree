
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { httpsCallable, FunctionsError } from 'firebase/functions';

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

// Define the callable function once
const getUserProfileCallable = httpsCallable(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = useCallback(() => {
    setCurrentUser(null);
    setCurrentDispensary(null);
    localStorage.removeItem('currentUserHolisticAI');
    setLoading(false);
  }, []);

  const fetchUserProfile = useCallback(async (user: FirebaseUser) => {
    try {
      const result = await getUserProfileCallable();
      const profile = result.data as AppUser;

      if (profile) {
        setCurrentUser(profile);
        localStorage.setItem('currentUserHolisticAI', JSON.stringify(profile));
        
        if (profile.role === 'DispensaryOwner' && profile.dispensary) {
          setCurrentDispensary(profile.dispensary);
        } else {
          setCurrentDispensary(null);
        }
        return profile;
      }
      // If profile is null/undefined from the function, it's a problem.
      throw new Error("User profile data could not be retrieved from the server.");
    } catch (error) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
      if (error instanceof FunctionsError) {
          console.error("Function error code:", error.code);
          console.error("Function error message:", error.message);
      }
      await auth.signOut(); // Force sign out on profile fetch failure
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        const profile = await fetchUserProfile(user);
        if (profile) {
          const isAuthPage = pathname.startsWith('/auth');
          if (isAuthPage) {
            if (profile.role === 'Super Admin') {
              router.push('/admin/dashboard');
            } else if (profile.role === 'DispensaryOwner' && profile.dispensaryStatus === 'Approved') {
              router.push('/dispensary-admin/dashboard');
            } else if (profile.role === 'DispensaryOwner') {
              router.push('/'); 
            } else {
              router.push('/dashboard/leaf');
            }
          }
        }
        // If profile fetch fails, fetchUserProfile handles sign-out, so no need for else block here.
      } else {
        handleSignOut();
      }
      setLoading(false); // ALWAYS set loading to false after processing
    });

    return () => unsubscribe();
  }, [handleSignOut, pathname, router, fetchUserProfile]);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const canAccessDispensaryPanel = isDispensaryOwner && currentUser?.dispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  const currentDispensaryStatus = currentUser?.dispensaryStatus || null;

  const value = {
    currentUser,
    setCurrentUser,
    currentDispensary,
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
