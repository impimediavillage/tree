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
import { initializeFCM } from '@/lib/fcm-token-service';

interface AuthContextType {
  currentUser: AppUser | null;
  user: AppUser | null; // Alias for compatibility
  setCurrentUser: React.Dispatch<React.SetStateAction<AppUser | null>>;
  currentDispensary: Dispensary | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isDispensaryOwner: boolean;
  isDispensaryStaff: boolean;
  canAccessDispensaryPanel: boolean;
  isLeafUser: boolean;
  currentDispensaryStatus: Dispensary['status'] | null;
  isVendor: boolean;
  isDriver: boolean;
  isInHouseStaff: boolean;
  fetchUserProfile: (user: FirebaseUser) => Promise<AppUser | null>;
  refreshUserProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get references to the callable functions
const getUserProfileCallable = httpsCallable(functions, 'getUserProfile');

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    try {
      console.log("AuthContext: Fetching user profile for UID:", firebaseUser.uid);
      
      const result = await getUserProfileCallable({}); // Pass empty object as data
      const fullProfile = result.data as AppUser;

      if (!fullProfile || !fullProfile.uid) {
        throw new Error("Received invalid user profile from server.");
      }
      
      console.log("AuthContext: Profile received:", fullProfile.role, "Dispensary:", fullProfile.dispensaryId);
      setCurrentUser(fullProfile);
      setCurrentDispensary(fullProfile.dispensary || null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(fullProfile));
      
      // Initialize FCM for push notifications
      if (fullProfile.uid) {
        initializeFCM(fullProfile.uid).catch(error => {
          console.error('Failed to initialize FCM:', error);
        });
      }
      
      return fullProfile;

    } catch (error: any) {
      console.error("AuthContext: Failed to get user profile.", error);
      
      let description = "Could not load your user profile. Please try logging in again.";
      if (error instanceof FunctionsError) {
          if (error.code === 'not-found') {
              description = "Your user profile data could not be found. If you just signed up, please wait a moment and try again.";
          } else {
              description = `An error occurred: ${error.message}`;
          }
      }
      
      toast({ title: "Profile Load Error", description, variant: "destructive" });
      await auth.signOut(); // Log out the user if their profile can't be fetched
      return null;
    }
  }, [toast]);
  
  const refreshUserProfile = useCallback(async () => {
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      await fetchUserProfile(firebaseUser);
    }
  }, [fetchUserProfile]);

  const logout = useCallback(async () => {
    try {
        await auth.signOut();
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/auth/signin');
    } catch(error) {
        console.error("Logout failed", error);
        toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive"});
    }
  }, [toast, router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      console.log("onAuthStateChanged fired. firebaseUser:", firebaseUser); // Add this log
      if (firebaseUser) {
        console.log("Authenticated user detected, fetching profile..."); // Add this log
        await fetchUserProfile(firebaseUser);
      } else {
        console.log("No authenticated user."); // Add this log
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
  
  // Crew member type checks
  const isVendor = isDispensaryStaff && currentUser?.crewMemberType === 'Vendor';
  const isDriver = isDispensaryStaff && (currentUser?.crewMemberType === 'Driver' || currentUser?.isDriver === true);
  const isInHouseStaff = isDispensaryStaff && currentUser?.crewMemberType === 'In-house Staff';
  
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
    isVendor,
    isDriver,
    isInHouseStaff,
    fetchUserProfile,
    refreshUserProfile,
    logout,
    user: currentUser, // Add alias
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
