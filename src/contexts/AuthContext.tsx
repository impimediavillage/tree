
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  currentDispensary: Dispensary | null; // Add dispensary to the context
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define this function once, outside of the component, for efficiency
const getUserProfile = httpsCallable<void, AppUser>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchFullUserProfile = useCallback(async (user: FirebaseUser) => {
    try {
      // Use the callable function to securely get the full user profile
      const result = await getUserProfile();
      const appUser = result.data as AppUser;

      setCurrentUser(appUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
      
      // If the user is an owner and has a dispensary, we can derive the dispensary info
      // from the returned profile data (if we included it in the callable function response)
      // This part depends on what getUserProfile returns. For now, we assume it might not return full dispensary data.
      // A more robust implementation might fetch the dispensary separately if needed, but this is a start.
      if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
        // You could fetch full dispensary details here if they are not already on the AppUser object
      } else {
        setCurrentDispensary(null);
      }

    } catch (error) {
      console.error("Error fetching user profile via callable function:", error);
      await auth.signOut(); // Log out user if their profile is invalid or inaccessible
      setCurrentUser(null);
      setCurrentDispensary(null);
      localStorage.removeItem('currentUserHolisticAI');
    } finally {
      setLoading(false);
    }
  }, []);
  

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchFullUserProfile(user);
      } else {
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [fetchFullUserProfile]);
  
  // This effect handles redirection after login
  useEffect(() => {
    if (!loading && currentUser) {
        const authPages = ['/auth/signin', '/auth/signup'];
        if(authPages.includes(pathname)) {
            if (currentUser.role === 'Super Admin') {
                router.push('/admin/dashboard');
            } else if (currentUser.role === 'DispensaryOwner' && currentUser.dispensaryStatus === 'Approved') {
                router.push('/dispensary-admin/dashboard');
            } else if (currentUser.role === 'DispensaryOwner' && currentUser.dispensaryStatus !== 'Approved') {
                router.push('/'); // Or a dedicated "pending approval" page
            } else { // LeafUser or other roles
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
        currentDispensary,
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
