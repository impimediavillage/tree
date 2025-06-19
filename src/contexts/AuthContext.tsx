
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
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean; // True if role is DispensaryOwner AND wellness store is Approved
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
      // Clean up previous listeners
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot();
      if (unsubscribeDispensarySnapshot) unsubscribeDispensarySnapshot();
      setCurrentDispensaryStatus(null); // Reset wellness store status

      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserSnapshot = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData?.displayName,
              photoURL: firebaseUser.photoURL || userData?.photoURL,
              ...userData,
            } as AppUser;
            
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));

            // If user is a DispensaryOwner, fetch and listen to their wellness store status
            if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
              const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
              unsubscribeDispensarySnapshot = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
                if (dispensaryDocSnap.exists()) {
                  setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
                } else {
                  console.warn(`Wellness store document ${appUser.dispensaryId} not found for owner ${appUser.uid}.`);
                  setCurrentDispensaryStatus(null); // Wellness store not found
                }
              }, (error) => {
                console.error("Error fetching wellness store document for status:", error);
                setCurrentDispensaryStatus(null);
              });
            } else {
              setCurrentDispensaryStatus(null); // Not an owner or no dispensaryId
            }
            setLoading(false);
          } else {
            console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            firebaseAuth.signOut(); 
            setCurrentUser(null);
            localStorage.removeItem('currentUserHolisticAI');
            setLoading(false);
          }
        }, (error) => {
            console.error("Error fetching user document from Firestore:", error);
            firebaseAuth.signOut();
            setCurrentUser(null);
            localStorage.removeItem('currentUserHolisticAI');
            setLoading(false);
        });

      } else {
        // User is signed out
        setCurrentUser(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribeAuth();
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot();
      if (unsubscribeDispensarySnapshot) unsubscribeDispensarySnapshot();
    };
  }, []);

  const isSuperAdmin = currentUser?.role === 'Super Admin';
  // isDispensaryOwner is true if role is DispensaryOwner AND their wellness store status is 'Approved'
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner' && currentDispensaryStatus === 'Approved';
  const canAccessDispensaryPanel = currentUser?.role === 'DispensaryOwner' && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'LeafUser' || currentUser?.role === 'User';


  return (
    <AuthContext.Provider value={{ 
        currentUser, 
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
