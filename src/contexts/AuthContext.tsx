
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
    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      let userSnapshotUnsubscribe: Unsubscribe | undefined;
      let dispensarySnapshotUnsubscribe: Unsubscribe | undefined;

      const cleanup = () => {
        if (userSnapshotUnsubscribe) userSnapshotUnsubscribe();
        if (dispensarySnapshotUnsubscribe) dispensarySnapshotUnsubscribe();
      };
      
      cleanup();

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        userSnapshotUnsubscribe = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData?.displayName || firebaseUser.displayName || '',
              photoURL: userData?.photoURL || firebaseUser.photoURL || null,
              role: userData?.role || 'User',
              dispensaryId: userData?.dispensaryId || null,
              credits: userData?.credits || 0,
              status: userData?.status || 'Active',
            };
            
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));
            
            if (dispensarySnapshotUnsubscribe) dispensarySnapshotUnsubscribe();

            if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
              const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
              dispensarySnapshotUnsubscribe = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
                if (dispensaryDocSnap.exists()) {
                  setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
                } else {
                  console.warn(`Dispensary document ${appUser.dispensaryId} not found.`);
                  setCurrentDispensaryStatus(null);
                }
                setLoading(false);
              }, (error) => {
                console.error("Error on dispensary snapshot:", error);
                setCurrentDispensaryStatus(null);
                setLoading(false);
              });
            } else {
              setCurrentDispensaryStatus(null);
              setLoading(false);
            }

          } else {
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
            firebaseAuth.signOut(); 
          }
        }, (error) => {
            console.error("Error on user snapshot:", error);
            firebaseAuth.signOut(); 
        });

      } else { 
        localStorage.removeItem('currentUserHolisticAI');
        setCurrentUser(null);
        setCurrentDispensaryStatus(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

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
