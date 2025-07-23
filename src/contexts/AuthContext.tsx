
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
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    let unsubscribeDispensary: Unsubscribe | undefined;

    const fetchUserData = async () => {
      if (!firebaseUser) {
        setCurrentUser(null);
        setCurrentDispensaryStatus(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await firebaseUser.getIdToken(true); // Force refresh of the token
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
          };

          setCurrentUser(appUser);
          localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
          
          if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
            const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
            unsubscribeDispensary = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
              setCurrentDispensaryStatus(dispensaryDocSnap.exists() ? (dispensaryDocSnap.data()?.status as Dispensary['status']) : null);
            });
          } else {
            setCurrentDispensaryStatus(null);
          }
        } else {
          console.error(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
          auth.signOut();
        }
      } catch (error) {
        console.error("Error fetching user document:", error);
        auth.signOut();
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

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
