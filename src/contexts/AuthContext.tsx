
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions, db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';

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

const getUserProfile = httpsCallable<void, AppUser>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchFullUserProfile = useCallback(async (user: FirebaseUser) => {
    try {
      const result = await getUserProfile();
      const appUser = result.data as AppUser;

      setCurrentUser(appUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
      
      if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
        const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
        const dispensaryDocSnap = await getDoc(dispensaryDocRef);
        if (dispensaryDocSnap.exists()) {
          setCurrentDispensary({ id: dispensaryDocSnap.id, ...dispensaryDocSnap.data()} as Dispensary);
        } else {
          // Handle case where dispensary document doesn't exist, though the user is linked
          console.warn(`User ${user.uid} is linked to non-existent dispensary ${appUser.dispensaryId}`);
          setCurrentDispensary(null);
        }
      } else {
        setCurrentDispensary(null);
      }
    } catch (error) {
      console.error("Error fetching full user profile. Logging out.", error);
      // This is a critical failure, sign the user out.
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in. Fetch their full profile.
        setLoading(true);
        await fetchFullUserProfile(user);
      } else {
        // User is signed out. Clear all state.
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [fetchFullUserProfile]);

  useEffect(() => {
    // This effect handles redirection based on user state once loading is complete
    if (!loading && currentUser) {
      const isAuthPage = pathname.startsWith('/auth');
      if (isAuthPage) {
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
