
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

    const unsubscribeAuth = onAuthStateChanged(firebaseAuth, (firebaseUser: FirebaseUser | null) => {
      // Clean up previous listeners when auth state changes
      if (unsubscribeUserSnapshot) unsubscribeUserSnapshot();
      if (unsubscribeDispensarySnapshot) unsubscribeDispensarySnapshot();
      
      setCurrentUser(null);
      setCurrentDispensaryStatus(null);
      
      if (firebaseUser) {
        setLoading(true); // Ensure loading is true while we fetch Firestore data
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        
        unsubscribeUserSnapshot = onSnapshot(userDocRef, (userDocSnap) => {
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: AppUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData?.displayName || '',
              photoURL: firebaseUser.photoURL || userData?.photoURL || null,
              role: userData?.role || 'User', // Fallback role
              dispensaryId: userData?.dispensaryId || null,
              credits: userData?.credits || 0,
              status: userData?.status || 'Active',
              // Add other fields from userData as needed
            };
            
            setCurrentUser(appUser);
            localStorage.setItem('currentUserHolisticAI', JSON.stringify(appUser));

            // Now, check for dispensary status if applicable
            if (appUser.role === 'DispensaryOwner' && appUser.dispensaryId) {
              const dispensaryDocRef = doc(db, 'dispensaries', appUser.dispensaryId);
              unsubscribeDispensarySnapshot = onSnapshot(dispensaryDocRef, (dispensaryDocSnap) => {
                if (dispensaryDocSnap.exists()) {
                  setCurrentDispensaryStatus(dispensaryDocSnap.data()?.status as Dispensary['status']);
                } else {
                  console.warn(`Dispensary document ${appUser.dispensaryId} not found for owner ${appUser.uid}.`);
                  setCurrentDispensaryStatus(null);
                }
                setLoading(false); // FINALLY, set loading to false after all data is fetched
              }, (error) => {
                console.error("Error fetching dispensary document for status:", error);
                setCurrentDispensaryStatus(null);
                setLoading(false);
              });
            } else {
              setCurrentDispensaryStatus(null); // Not an owner or no dispensaryId
              setLoading(false); // Set loading to false as there's no more data to fetch
            }
          } else {
            console.warn(`User document not found in Firestore for UID: ${firebaseUser.uid}. Logging out.`);
            firebaseAuth.signOut(); // This will re-trigger onAuthStateChanged
            setLoading(false);
          }
        }, (error) => {
            console.error("Error fetching user document from Firestore:", error);
            firebaseAuth.signOut();
            setLoading(false);
        });

      } else {
        // User is signed out, no data to load.
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
