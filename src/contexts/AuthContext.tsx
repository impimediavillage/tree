
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean; // True if role is DispensaryOwner AND dispensary is Approved
  canAccessDispensaryPanel: boolean; // Explicit flag for panel access
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentDispensaryStatus, setCurrentDispensaryStatus] = useState<Dispensary['status'] | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // This listener only sets the basic Firebase user or logs them out.
    // It triggers the second useEffect to fetch detailed data.
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (firebaseUser) => {
      if (firebaseUser) {
        // At this point, we know the user is authenticated with Firebase,
        // but we don't have their custom data yet.
        // We set a temporary state to trigger the data fetching effect.
        const basicUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'User', // Default role until fetched
            credits: 0,
            status: 'PendingApproval'
        };
        setCurrentUser(basicUser);
      } else {
        localStorage.removeItem('currentUserHolisticAI');
        setCurrentUser(null);
        setCurrentDispensaryStatus(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // This effect runs *after* the currentUser state has been updated by the auth listener.
  // This ensures the auth token is ready before we query Firestore.
  useEffect(() => {
    if (!currentUser || !currentUser.uid) {
      // If there's no user, we're done loading.
      if (!loading) setLoading(false);
      return;
    }

    // A flag to prevent setting state on an unmounted component
    let isMounted = true;
    
    // Create a real-time listener for the user's document
    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (userDocSnap) => {
      if (!isMounted) return;

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const appUser: AppUser = {
          ...currentUser, // Keep basic info from auth
          role: userData?.role || 'User',
          dispensaryId: userData?.dispensaryId || null,
          credits: userData?.credits || 0,
          status: userData?.status || 'Active',
          displayName: userData?.displayName || currentUser.displayName,
          photoURL: userData?.photoURL || currentUser.photoURL,
        };
        setCurrentUser(appUser);
        localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
      } else {
        console.warn(`User document not found for UID: ${currentUser.uid}. Logging out.`);
        firebaseAuth.signOut();
      }
    }, (error) => {
      console.error("Error on user snapshot:", error);
      // This is where "Missing or insufficient permissions" will be caught.
      // We log out the user as they can't even read their own profile.
      firebaseAuth.signOut();
    });

    // Create a listener for the dispensary status if applicable
    let unsubscribeDispensary: Unsubscribe | undefined;
    if (currentUser.dispensaryId) {
        const dispensaryDocRef = doc(db, 'dispensaries', currentUser.dispensaryId);
        unsubscribeDispensary = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
            if (!isMounted) return;
            if (dispensaryDocSnap.exists()) {
                setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
            } else {
                setCurrentDispensaryStatus(null);
            }
        });
    } else {
        setCurrentDispensaryStatus(null);
    }
    
    // We are done with the initial loading process.
    setLoading(false);
    
    return () => {
      isMounted = false;
      unsubscribeUser();
      if (unsubscribeDispensary) {
        unsubscribeDispensary();
      }
    };
  // We only re-run this ENTIRE effect if the user's UID changes (login/logout).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid]);


  // Centralized redirection logic
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, loading, pathname]);

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner' && currentDispensaryStatus === 'Approved';
  const canAccessDispensaryPanel = currentUser?.role === 'DispensaryOwner' && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'LeafUser' || currentUser?.role === 'User';

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
