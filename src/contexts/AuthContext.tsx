
'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { auth, db, functions } from '@/lib/firebase';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import type { User as AppUser, Dispensary } from '@/types';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable, FunctionsError } from 'firebase/functions';

const setDispensaryClaim = httpsCallable(functions, 'setDispensaryClaim');

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

const serializeDates = (data: any): any => {
    if (!data) return data;
    const serialized = { ...data };
    for (const key in serialized) {
        if (serialized[key] instanceof Timestamp) {
            serialized[key] = serialized[key].toDate().toISOString();
        }
    }
    return serialized;
};

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
      return null;
    }
    
    try {
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        console.error(`User document not found for uid: ${user.uid}. Logging out.`);
        await auth.signOut();
        return null;
      }
      
      const userData = userDocSnap.data();
      const userDispensaryId = userData.dispensaryId || null;

      // Securely set the claim and wait for the token to refresh
      await setDispensaryClaim({ dispensaryId: userDispensaryId });
      await user.getIdToken(true); 

      let dispensaryData: Dispensary | null = null;
      if (userDispensaryId) {
        const dispensaryDocRef = doc(db, 'dispensaries', userDispensaryId);
        const dispensaryDocSnap = await getDoc(dispensaryDocRef);
        if (dispensaryDocSnap.exists()) {
          dispensaryData = serializeDates(dispensaryDocSnap.data()) as Dispensary;
          dispensaryData.id = dispensaryDocSnap.id;
        }
      }
      
      const finalProfile: AppUser = {
          ...(serializeDates(userData) as AppUser),
          dispensary: dispensaryData,
          dispensaryStatus: dispensaryData?.status || null,
      };

      setCurrentUser(finalProfile);
      setCurrentDispensary(dispensaryData);
      localStorage.setItem('currentUserHolisticAI', JSON.stringify(finalProfile));
      return finalProfile;

    } catch (error: any) {
      console.error("Critical: Failed to get user profile or set claim.", error);
      let errorMessage = "Could not load your user profile. Please try logging in again.";
      if (error instanceof FunctionsError) {
        errorMessage = `Auth setup error: ${error.message}`;
      }
      toast({ title: "Profile Load Error", description: errorMessage, variant: "destructive" });
      await auth.signOut();
      return null;
    }
  }, [toast]);
  
  const logout = useCallback(async () => {
    await auth.signOut();
    setCurrentUser(null);
    setCurrentDispensary(null);
    localStorage.removeItem('currentUserHolisticAI');
    router.push('/auth/signin');
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
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
