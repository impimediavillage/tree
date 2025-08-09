
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/functions/src/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable, FunctionsError } from 'firebase/functions';

const getUserProfileCallable = httpsCallable(functions, 'getUserProfile');

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
  currentDispensary: Dispensary | null;
  fetchUserProfile: (user: FirebaseUser) => Promise<AppUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (user: FirebaseUser): Promise<AppUser | null> => {
    if (!user) return null;
    
    try {
      const result = await getUserProfileCallable();
      const profile = result.data as AppUser;

      if (!profile || !profile.uid) {
         console.error("Received invalid profile from callable function, signing out.", profile);
         toast({ title: "Authentication Error", description: "Could not load a valid user profile.", variant: "destructive" });
         await auth.signOut();
         return null;
      }
      
      setCurrentUser(profile);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(profile));
      return profile;

    } catch (error: any) {
      console.error("Critical: Failed to get user profile. Logging out.", error);
      
      let errorMessage = "An unexpected error occurred while fetching your profile.";
      if (error instanceof FunctionsError) {
        errorMessage = error.message;
        console.error("Function error code:", error.code);
        console.error("Function error message:", error.message);
      }
      
      toast({ title: "Authentication Error", description: errorMessage, variant: "destructive" });
      await auth.signOut();
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    await auth.signOut();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Attempt to load from localStorage first for faster UI response
        const storedUser = localStorage.getItem('currentUserHolisticAI');
        if (storedUser) {
            try {
                const parsedUser = JSON.parse(storedUser);
                if (parsedUser.uid === firebaseUser.uid) {
                    setCurrentUser(parsedUser);
                    setLoading(false); // Stop loading early
                }
            } catch (e) {
                // Invalid JSON, proceed to fetch
            }
        }
        await fetchUserProfile(firebaseUser);
        setLoading(false);
      } else {
        setCurrentUser(null);
        localStorage.removeItem('currentUserHolisticAI');
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [fetchUserProfile]);


  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const currentDispensaryStatus = currentUser?.dispensary?.status || null;
  const currentDispensary = currentUser?.dispensary || null;
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
    currentDispensary,
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
