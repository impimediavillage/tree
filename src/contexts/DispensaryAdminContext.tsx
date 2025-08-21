
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Dispensary } from '@/types';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface DispensaryAdminContextType {
  allDispensaries: Dispensary[];
  isLoadingDispensaries: boolean;
}

const DispensaryAdminContext = createContext<DispensaryAdminContextType | undefined>(undefined);

export const DispensaryAdminProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [allDispensaries, setAllDispensaries] = useState<Dispensary[]>([]);
  const [isLoadingDispensaries, setIsLoadingDispensaries] = useState(true);

  const fetchAllDispensaries = useCallback(async () => {
    setIsLoadingDispensaries(true);
    try {
      const q = query(
        collection(db, 'dispensaries'),
        where('status', '==', 'Approved'),
        orderBy('dispensaryName')
      );
      const querySnapshot = await getDocs(q);
      const dispensaries = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Dispensary));

      // Filter out the current user's own dispensary from the list
      const filteredDispensaries = dispensaries.filter(d => d.id !== currentUser?.dispensaryId);
      setAllDispensaries(filteredDispensaries);

    } catch (error) {
      toast({ title: 'Error Fetching Stores', description: 'Could not fetch list of other dispensaries for sharing.', variant: 'destructive'});
      console.error("Error fetching all dispensaries:", error);
    } finally {
      setIsLoadingDispensaries(false);
    }
  }, [toast, currentUser?.dispensaryId]);

  useEffect(() => {
    if (currentUser) {
      fetchAllDispensaries();
    } else {
        setAllDispensaries([]); // Clear list if no user
        setIsLoadingDispensaries(false);
    }
  }, [currentUser, fetchAllDispensaries]);

  return (
    <DispensaryAdminContext.Provider value={{ allDispensaries, isLoadingDispensaries }}>
      {children}
    </DispensaryAdminContext.Provider>
  );
};

export const useDispensaryAdmin = (): DispensaryAdminContextType => {
  const context = useContext(DispensaryAdminContext);
  if (context === undefined) {
    throw new Error('useDispensaryAdmin must be used within a DispensaryAdminProvider');
  }
  return context;
};
