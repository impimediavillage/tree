
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

// Define the URLs for the Cloud Functions
const GET_USER_PROFILE_URL = 'https://us-central1-dispensary-tree.cloudfunctions.net/getUserProfile';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    try {
      const idToken = await firebaseUser.getIdToken(true); 
      
      const response = await fetch(GET_USER_PROFILE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({}) // onCall functions expect a 'data' property
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new FunctionsError(errorData.error.status || 'internal', errorData.error.message || 'Failed to fetch user profile.');
      }
      
      const { result: fullProfile } = await response.json();

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
      if (error instanceof FunctionsError || (error.details && error.details.code)) {
          const code = error.code || error.details.code;
          if (code === 'not-found') {
              description = "Your user profile data could not be found. If you just signed up, please wait a moment and try again."
          } else {
            description = error.message;
          }
      } else if (error instanceof Error) {
          description = error.message;
      }
      
      toast({ title: "Profile Load Error", description, variant: "destructive" });
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    try {
        await auth.signOut();
        toast({ title: 'Logged Out', description: 'You have been successfully logged out.' });
        router.push('/');
    } catch(error) {
        console.error("Logout failed", error);
        toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive"});
    }
  }, [toast, router]);

  useEffect(() => {
    const cachedUserStr = localStorage.getItem('currentUserHolisticAI');
    if (cachedUserStr) {
       try {
        const parsedUser = JSON.parse(cachedUserStr);
        setCurrentUser(parsedUser);
        if (parsedUser.dispensary) setCurrentDispensary(parsedUser.dispensary);
       } catch(e) {
         console.warn("Could not parse cached user, clearing.", e);
         localStorage.removeItem('currentUserHolisticAI');
       }
    }
    setLoading(true); 

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser); 
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
