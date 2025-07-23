
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { functions, auth } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserProfile = httpsCallable(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Force refresh the token to ensure it's up-to-date before calling the function.
          await user.getIdToken(true); 
          const result = await getUserProfile({ uid: user.uid });
          const appUser = result.data as AppUser;

          if (appUser) {
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
          } else {
            throw new Error("User profile not found in database.");
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
          await auth.signOut();
          setCurrentUser(null);
          localStorage.removeItem('currentUserHolisticAI');
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUserHolisticAI');
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);
  
  useEffect(() => {
    if (!loading && currentUser) {
        const authPages = ['/auth/signin', '/auth/signup'];
        if(authPages.includes(pathname)) {
            if (currentUser.role === 'Super Admin') {
                router.push('/admin/dashboard');
            } else if (currentUser.role === 'DispensaryOwner') {
                router.push('/dispensary-admin/dashboard');
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
    <AuthContext.Provider value={{
        currentUser,
        setCurrentUser,
        loading,
        isSuperAdmin,
        isDispensaryOwner,
        canAccessDispensaryPanel,
        isLeafUser,
        currentDispensaryStatus
    }}>
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
