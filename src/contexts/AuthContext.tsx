
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentDispensaryStatus, setCurrentDispensaryStatus] = useState<Dispensary['status'] | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (!user) {
        // Clear all state on logout
        setCurrentUser(null);
        setCurrentDispensaryStatus(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser) {
      setLoading(false);
      return;
    }

    setLoading(true);
    let unsubscribeDispensary: Unsubscribe | undefined;

    const fetchUserDocument = async () => {
      try {
        // Force refresh the token to ensure it's up-to-date before any Firestore call.
        // This is the key fix for the race condition.
        await firebaseUser.getIdToken(true); 
        
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          const appUser: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: userData?.displayName || firebaseUser.displayName || '',
            photoURL: userData?.photoURL || firebaseUser.photoURL || null,
            role: userData?.role || 'User',
            dispensaryId: userData?.dispensaryId || null,
            credits: userData?.credits ?? 0,
            status: userData?.status || 'Active',
            preferredDispensaryTypes: userData?.preferredDispensaryTypes || [],
            welcomeCreditsAwarded: userData?.welcomeCreditsAwarded || false,
            signupSource: userData?.signupSource || 'public',
          };

          setCurrentUser(appUser);
          localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
          
          if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
            const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
            unsubscribeDispensary = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
              if (dispensaryDocSnap.exists()) {
                setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
              } else {
                setCurrentDispensaryStatus(null);
              }
            });
          } else {
            setCurrentDispensaryStatus(null);
          }
        } else {
          console.error(`User document not found for UID: ${firebaseUser.uid}. Forcing logout.`);
          await auth.signOut();
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
        await auth.signOut();
      } finally {
        setLoading(false);
      }
    };

    fetchUserDocument();

    return () => {
      if (unsubscribeDispensary) unsubscribeDispensary();
    };
  }, [firebaseUser]);

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
