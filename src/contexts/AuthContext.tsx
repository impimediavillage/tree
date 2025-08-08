
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { getUserProfileFlow } from '@/ai/flows/get-user-profile';
import { run } from 'genkit/flow';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchFullProfile = useCallback(async (uid: string) => {
    try {
      // Use the new, robust Genkit flow to fetch the user profile
      const appUser = await run(getUserProfileFlow);

      setCurrentUser(appUser);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
      
      // If the user is a dispensary owner, fetch their dispensary data
      if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
          const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
          const dispensaryDocSnap = await getDoc(dispensaryDocRef);
          if (dispensaryDocSnap.exists()) {
              setCurrentDispensary({ id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary);
          } else {
              console.warn(`Dispensary document ${appUser.dispensaryId} not found for owner ${uid}.`);
              setCurrentDispensary(null);
          }
      } else {
          setCurrentDispensary(null);
      }

    } catch (error) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
      await auth.signOut();
      // State will be cleared by the onAuthStateChanged listener below
    } finally {
      // This setLoading(false) is crucial for unblocking the UI.
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchFullProfile(user.uid);
      } else {
        // User is signed out, clear everything.
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchFullProfile]);

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
