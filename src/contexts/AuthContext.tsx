
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '../../functions/src/types';
import { useRouter } from 'next/navigation';
import { httpsCallable, FunctionsError } from "firebase/functions";
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (user: FirebaseUser): Promise<AppUser | null> => {
    try {
      console.log(`Fetching profile for user: ${user.uid}`);
      const result = await getUserProfileCallable();
      const profile = result.data;

      if (!profile || !profile.uid) {
         console.error("Received invalid profile from function, signing out.", profile);
         toast({ title: "Authentication Error", description: "Could not load a valid user profile.", variant: "destructive" });
         await auth.signOut();
         return null;
      }
      
      setCurrentUser(profile);
      return profile;

    } catch (error) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
       if (error instanceof FunctionsError) {
           console.error("Function error code:", error.code);
           console.error("Function error message:", error.message);
           toast({ title: `Error: ${error.code}`, description: error.message, variant: "destructive" });
       } else {
           toast({ title: "Authentication Error", description: "An unexpected error occurred while fetching your profile.", variant: "destructive" });
       }
      await auth.signOut(); // Force sign out on profile fetch failure
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    await auth.signOut();
    setCurrentUser(null);
    router.push('/auth/signin');
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const currentDispensaryStatus = currentUser?.dispensary?.status || null;
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
