
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
  fetchUserProfile: (user: FirebaseUser) => Promise<AppUser | null>; // Expose fetch function
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserProfileCallable = httpsCallable<void, AppUser | null>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchUserProfile = useCallback(async (user: FirebaseUser): Promise<AppUser | null> => {
    try {
      console.log("Calling getUserProfile function...");
      const result = await getUserProfileCallable();
      const profile = result.data;
      if (profile) {
        console.log("User profile received:", profile);
        setCurrentUser(profile);
        return profile;
      } else {
        console.warn("getUserProfile returned null, signing out.");
        await auth.signOut();
        return null;
      }
    } catch (error) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
      if (error instanceof FunctionsError) {
        console.error("Function error code:", error.code);
        console.error("Function error message:", error.message);
      }
      await auth.signOut();
      return null;
    }
  }, []);
  
  const logout = async () => {
    await auth.signOut();
    setCurrentUser(null);
    router.push('/auth/signin');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setLoading(true);
        await fetchUserProfile(firebaseUser);
        setLoading(false);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const currentDispensaryStatus = currentUser?.dispensary?.status || null;
  const canAccessDispensaryPanel = isDispensaryOwner && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  
  const value = {
    currentUser,
    setCurrentUser,
    currentDispensary: currentUser?.dispensary || null,
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
