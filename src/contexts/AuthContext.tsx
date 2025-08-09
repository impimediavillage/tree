
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, functions } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable, FunctionsError } from 'firebase/functions';

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

const getUserProfileCallable = httpsCallable(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    try {
      // The callable function automatically includes the user's ID token.
      const result = await getUserProfileCallable();
      const fullProfile = result.data as AppUser;

      if (!fullProfile || !fullProfile.uid) {
        throw new FunctionsError("invalid-argument", "Received invalid user profile from server.");
      }
      
      setCurrentUser(fullProfile);
      setCurrentDispensary(fullProfile.dispensary || null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(fullProfile));
      return fullProfile;

    } catch (error: any) {
      console.error("AuthContext: Failed to get user profile.", error);
      
      let description = "Could not load your user profile. Please try logging in again.";
      if (error instanceof FunctionsError) {
          if (error.code === 'not-found') {
              description = "Your user profile data could not be found. If you just signed up, please wait a moment and try again."
          } else {
            description = error.message;
          }
      }
      
      toast({ title: "Profile Load Error", description, variant: "destructive" });
      // Logout if we can't fetch profile, as the user is in an inconsistent state
      await auth.signOut();
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    try {
        await auth.signOut();
        // The onAuthStateChanged listener below will handle cleanup
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/auth/signin');
    } catch(error) {
        console.error("Logout failed", error);
        toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive"});
    }
  }, [toast, router]);

  useEffect(() => {
    // This effect runs only once on mount to set up the auth state listener.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Always start in a loading state when auth changes
      if (firebaseUser) {
        // User is signed in. Fetch their full profile.
        // The loading state will be set to false inside fetchUserProfile's logic flow.
        await fetchUserProfile(firebaseUser);
      } else {
        // User is signed out. Clear all user state.
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
      }
      setLoading(false); // End loading state after processing
    });

    // Cleanup subscription on unmount
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
