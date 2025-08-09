'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';

interface AuthContextType {
  currentUser: AppUser | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  currentDispensary: Dispensary | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  isDispensaryStaff: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
  fetchUserProfile: (user: FirebaseUser) => Promise<AppUser | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getUserProfileCallable = httpsCallable<unknown, AppUser>(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (user: FirebaseUser): Promise<AppUser | null> => {
    if (!user) {
      setCurrentUser(null);
      setCurrentDispensary(null);
      localStorage.removeItem('currentUserHolisticAI');
      return null;
    }
    
    // This function can now be simplified or kept for other purposes,
    // but the sign-in page will perform the detailed client-side fetch.
    // For consistency, we can still use the Cloud Function here, but ensure it's robust.
    try {
      const result = await getUserProfileCallable();
      const userProfile = result.data as AppUser;

      if (!userProfile) {
          throw new Error("No profile data returned from function.");
      }

      setCurrentUser(userProfile);
      setCurrentDispensary(userProfile.dispensary || null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(userProfile));
      return userProfile;
    } catch (error: any) {
      console.error("AuthContext: Failed to get user profile.", error);
      toast({ title: "Profile Load Error", description: "Could not load your user profile.", variant: "destructive" });
      await auth.signOut();
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    try {
        await auth.signOut();
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        router.push('/auth/signin');
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
    } catch(error) {
        console.error("Logout failed", error);
        toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive"});
    }
  }, [router, toast]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Attempt to load from localStorage first for faster UI response
        const storedUserString = localStorage.getItem('currentUserHolisticAI');
        if (storedUserString) {
          try {
            const storedUser = JSON.parse(storedUserString);
            // Quick check to see if the stored user matches the auth user
            if (storedUser.uid === firebaseUser.uid) {
              setCurrentUser(storedUser);
              setCurrentDispensary(storedUser.dispensary || null);
              setLoading(false);
              // Optionally re-fetch in the background to sync data
              // fetchUserProfile(firebaseUser); 
            } else {
               // Mismatch, fetch fresh data
               await fetchUserProfile(firebaseUser);
            }
          } catch {
             await fetchUserProfile(firebaseUser);
          }
        } else {
          await fetchUserProfile(firebaseUser);
        }
      } else {
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [fetchUserProfile]); 
  
  const isSuperAdmin = currentUser?.role === 'Super Admin';
  const isDispensaryOwner = currentUser?.role === 'DispensaryOwner';
  const isDispensaryStaff = currentUser?.role === 'DispensaryStaff';
  const currentDispensaryStatus = currentUser?.dispensary?.status || null;
  const canAccessDispensaryPanel = (isDispensaryOwner || isDispensaryStaff) && currentDispensaryStatus === 'Approved';
  const isLeafUser = currentUser?.role === 'User' || currentUser?.role === 'LeafUser';
  
  const value: AuthContextType = {
    currentUser,
    setCurrentUser,
    currentDispensary,
    loading,
    isSuperAdmin,
    isDispensaryOwner,
    isDispensaryStaff,
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
