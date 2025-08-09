
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { usePathname, useRouter } from 'next/navigation';
import { httpsCallable, FunctionsError } from "firebase/functions";

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
  fetchUserProfile: (user: FirebaseUser) => Promise<AppUser | null>; 
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserProfileCallable = httpsCallable<void, AppUser>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserProfile = useCallback(async (user: FirebaseUser): Promise<AppUser | null> => {
    try {
      console.log(`Fetching profile for user: ${user.uid}`);
      const result = await getUserProfileCallable();
      const profile = result.data;

      if (!profile || !profile.uid) {
         console.error("Received invalid profile from function, signing out.", profile);
         await auth.signOut();
         setCurrentUser(null);
         return null;
      }
      
      setCurrentUser(profile);
      // Persist a minimal, safe version of the user profile to local storage
      const userToStore = {
        uid: profile.uid,
        email: profile.email,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
        role: profile.role,
        credits: profile.credits,
        dispensaryId: profile.dispensaryId,
        dispensaryStatus: profile.dispensaryStatus,
      };
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(userToStore));
      
      return profile;

    } catch (error) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
       if (error instanceof FunctionsError) {
           console.error("Function error code:", error.code);
           console.error("Function error message:", error.message);
       }
      await auth.signOut();
      localStorage.removeItem('currentUserHolisticAI');
      setCurrentUser(null);
      return null;
    }
  }, []);
  
  const logout = async () => {
    await auth.signOut();
    localStorage.removeItem('currentUserHolisticAI');
    setCurrentUser(null);
    if (!pathname.startsWith('/auth')) {
        router.push('/auth/signin');
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        // Only fetch profile if not already loaded from a recent login
        if (!currentUser || currentUser.uid !== firebaseUser.uid) {
           await fetchUserProfile(firebaseUser);
        }
      } else {
        localStorage.removeItem('currentUserHolisticAI');
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const currentDispensaryStatus = currentUser?.dispensary?.status || currentUser?.dispensaryStatus || null;
  const canAccessDispensaryPanel = isDispensaryOwner && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  
  const value: AuthContextType = {
    currentUser,
    setCurrentUser,
    loading,
    isSuperAdmin,
    isDispensaryOwner,
    canAccessDispensaryPanel,
    isLeafUser,
    currentDispensaryStatus,
    fetchUserProfile,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
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
