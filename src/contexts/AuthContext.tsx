
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db } from '@/lib/firebase';
import type { User as AppUser, Dispensary, UserDocData } from '@/types';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
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

const safeToISOString = (date: any): string | null => {
    if (!date) return null;
    if (date instanceof Timestamp) return date.toDate().toISOString();
    if (date instanceof Date) return date.toISOString();
    if (typeof date === 'string') {
        try {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) return parsed.toISOString();
        } catch (e) { /* ignore */ }
    }
    return null;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [currentDispensary, setCurrentDispensary] = useState<Dispensary | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const fetchUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<AppUser | null> => {
    try {
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        toast({ title: "Profile Incomplete", description: "Your user profile is not fully set up. Please try signing up again or contact support.", variant: "destructive"});
        await auth.signOut();
        return null;
      }

      const userData = userDocSnap.data() as UserDocData;
      let dispensaryData: Dispensary | null = null;
      
      if (userData.dispensaryId) {
        const dispensaryDocRef = doc(db, 'dispensaries', userData.dispensaryId);
        const dispensaryDocSnap = await getDoc(dispensaryDocRef);
        if (dispensaryDocSnap.exists()) {
          const rawDispensary = dispensaryDocSnap.data();
           dispensaryData = {
              ...rawDispensary,
              id: dispensaryDocSnap.id,
              applicationDate: safeToISOString(rawDispensary.applicationDate),
              approvedDate: safeToISOString(rawDispensary.approvedDate),
              lastActivityDate: safeToISOString(rawDispensary.lastActivityDate),
           } as Dispensary;
        }
      }
      
      // Force refresh of ID token to get custom claims
      await firebaseUser.getIdToken(true);
      const idTokenResult = await firebaseUser.getIdTokenResult();
      
      const fullProfile: AppUser = {
        uid: firebaseUser.uid,
        email: userData.email || firebaseUser.email || '',
        displayName: userData.displayName || firebaseUser.displayName || '',
        photoURL: userData.photoURL || firebaseUser.photoURL || null,
        role: idTokenResult.claims.role || userData.role || 'User',
        credits: userData.credits || 0,
        status: userData.status || 'Active',
        dispensaryId: idTokenResult.claims.dispensaryId || userData.dispensaryId || null,
        dispensary: dispensaryData,
        dispensaryStatus: dispensaryData?.status || null,
        createdAt: safeToISOString(userData.createdAt),
        lastLoginAt: safeToISOString(userData.lastLoginAt),
        preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
        welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
        signupSource: userData.signupSource || 'public',
      };
      
      setCurrentUser(fullProfile);
      setCurrentDispensary(dispensaryData);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(fullProfile));
      return fullProfile;

    } catch (error: any) {
      console.error("AuthContext: Failed to get user profile.", error);
      toast({ title: "Profile Load Error", description: "Could not load your user profile. Please try logging out and back in.", variant: "destructive" });
      await auth.signOut();
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true); // Always set loading to true when auth state changes
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
