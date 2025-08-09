
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import type { User as AppUser, Dispensary } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    try {
      const idToken = await firebaseUser.getIdToken(true); 
      
      const response = await fetch('/api/firebase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ action: 'getUserProfile' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }
      
      const fullProfile = await response.json() as AppUser;

      if (!fullProfile || !fullProfile.uid) {
        throw new Error("Received invalid user profile from API route.");
      }

      setCurrentUser(fullProfile);
      setCurrentDispensary(fullProfile.dispensary || null);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(fullProfile));
      return fullProfile;

    } catch (error: any) {
      console.error("AuthContext: Failed to get user profile.", error);
      
      let description = "Could not load your user profile. Please try logging in again.";
      if (error.message) {
        description = error.message;
      }
      
      toast({ title: "Profile Load Error", description, variant: "destructive" });
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    try {
        await auth.signOut();
    } catch(error) {
        console.error("Logout failed", error);
        toast({ title: "Logout Failed", description: "An error occurred while logging out.", variant: "destructive"});
    } finally {
        setCurrentUser(null);
        setCurrentDispensary(null);
        localStorage.removeItem('currentUserHolisticAI');
        router.push('/auth/signin');
    }
  }, [router, toast]);

  useEffect(() => {
    const cachedUserStr = localStorage.getItem('currentUserHolisticAI');
    if (cachedUserStr) {
       try {
        const parsedUser = JSON.parse(cachedUserStr);
        setCurrentUser(parsedUser);
        if (parsedUser.dispensary) setCurrentDispensary(parsedUser.dispensary);
       } catch(e) {
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
