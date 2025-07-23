
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { functions, auth } from '@/lib/firebase';
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

// **NEW**: URL for the getUserProfile function. This should be in an env file in a real project.
const GET_USER_PROFILE_URL = 'https://us-central1-dispensary-tree.cloudfunctions.net/getUserProfile';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in. Fetch their profile from the backend function.
        try {
          // Force refresh the token to ensure it's up-to-date before calling the function.
          const idToken = await user.getIdToken(true); 
          
          const response = await fetch(GET_USER_PROFILE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({ uid: user.uid }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred' }));
             throw new Error(errorData.message || `Server responded with status ${response.status}`);
          }

          const appUser = await response.json() as AppUser;

          if (appUser) {
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
          } else {
            // Handle case where user exists in Auth but not in Firestore.
            throw new Error("User profile not found in database.");
          }
        } catch (error: any) {
          console.error("Error fetching user profile:", error);
          // If fetching fails, log them out to prevent being in a broken state.
          await auth.signOut();
          setCurrentUser(null);
          localStorage.removeItem('currentUserHolisticAI');
        }
      } else {
        // User is signed out.
        setCurrentUser(null);
        localStorage.removeItem('currentUserHolisticAI');
      }
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);
  
  // This effect handles redirection after login
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
