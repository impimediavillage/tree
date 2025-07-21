
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import type { ReactNode} from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { db, auth as firebaseAuth } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';

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

  useEffect(() => {
    let unsubscribeUserSnapshot: Unsubscribe | undefined = undefined;
    let unsubscribeDispensarySnapshot: Unsubscribe | undefined = undefined;

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (firebaseUser: FirebaseUser | null) => {
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot();
      if (unsubscribeDispensarySnapshot) unsubscribeDispensarySnapshot();
      
      setCurrentUser(null);
      setCurrentDispensaryStatus(null);
      setLoading(true); 
      
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        try {
          const userDocSnap = await getDoc(userDocRef);
          
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData?.displayName || '',
              photoURL: firebaseUser.photoURL || userData?.photoURL || null,
              role: userData?.role || 'User',
              dispensaryId: userData?.dispensaryId || null,
              credits: userData?.credits || 0,
              status: userData?.status || 'Active',
            };
            
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));

            if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
              const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
              const dispensaryDocSnap = await getDoc(dispensaryDocRef);
              if (dispensaryDocSnap.exists()) {
                setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
              } else {
                console.warn(`Dispensary document ${appUser.dispensaryId} not found.`);
                setCurrentDispensaryStatus(null);
              }
            } else {
              setCurrentDispensaryStatus(null);
            }
          } else {
            console.warn(`User document not found for UID: ${firebaseUser.uid}. Logging out.`);
            await firebaseAuth.signOut();
          }
        } catch (error) {
            console.error("Error fetching initial user/dispensary data:", error);
            await firebaseAuth.signOut();
        } finally {
            setLoading(false);
        }

      } else {
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot();
      if (unsubscribeDispensarySnapshot) unsubscribeDispensarySnapshot();
    };
  }, []);

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
