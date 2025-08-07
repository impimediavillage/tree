
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Product, User, ProductRequest, StickerSet } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface DispensaryDataContextType {
  products: Product[];
  staff: User[];
  incomingRequests: ProductRequest[];
  outgoingRequests: ProductRequest[];
  stickerSets: StickerSet[];
  isLoading: boolean;
  fetchDispensaryData: () => Promise<void>;
}

const DispensaryDataContext = createContext<DispensaryDataContextType | undefined>(undefined);

export const DispensaryDataProvider = ({ children }: { children: ReactNode }) => {
  const { currentUser, canAccessDispensaryPanel } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<ProductRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ProductRequest[]>([]);
  const [stickerSets, setStickerSets] = useState<StickerSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDispensaryData = useCallback(async () => {
    if (!canAccessDispensaryPanel || !currentUser?.dispensaryId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const dispensaryId = currentUser.dispensaryId;
      
      const productsQuery = query(collection(db, "products"), where("dispensaryId", "==", dispensaryId));
      const staffQuery = query(collection(db, "users"), where("dispensaryId", "==", dispensaryId), where("uid", "!=", currentUser.uid));
      const incomingRequestsQuery = query(collection(db, "productRequests"), where("productOwnerDispensaryId", "==", dispensaryId));
      const outgoingRequestsQuery = query(collection(db, "productRequests"), where("requesterDispensaryId", "==", dispensaryId));
      const stickerSetsQuery = query(collection(db, 'stickersets'), where('creatorUid', '==', currentUser.uid), orderBy('createdAt', 'desc'));

      const [
        productsSnapshot, 
        staffSnapshot, 
        incomingRequestsSnapshot, 
        outgoingRequestsSnapshot,
        stickerSetsSnapshot
      ] = await Promise.all([
        getDocs(productsQuery),
        getDocs(staffQuery),
        getDocs(incomingRequestsQuery),
        getDocs(outgoingRequestsQuery),
        getDocs(stickerSetsQuery)
      ]);

      setProducts(productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      setStaff(staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      setIncomingRequests(incomingRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));
      setOutgoingRequests(outgoingRequestsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductRequest)));
      setStickerSets(stickerSetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), createdAt: (doc.data().createdAt as any).toDate() } as StickerSet)));

    } catch (error) {
      console.error("Error fetching comprehensive dispensary data:", error);
      toast({ title: "Data Loading Error", description: "Could not load all store management data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [canAccessDispensaryPanel, currentUser, toast]);

  useEffect(() => {
    if (canAccessDispensaryPanel) {
      fetchDispensaryData();
    } else {
      // Clear data if user loses access
      setProducts([]);
      setStaff([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setStickerSets([]);
      setIsLoading(false);
    }
  }, [canAccessDispensaryPanel, fetchDispensaryData]);

  return (
    <DispensaryDataContext.Provider value={{
      products,
      staff,
      incomingRequests,
      outgoingRequests,
      stickerSets,
      isLoading,
      fetchDispensaryData,
    }}>
      {children}
    </DispensaryDataContext.Provider>
  );
};

export const useDispensaryData = (): DispensaryDataContextType => {
  const context = useContext(DispensaryDataContext);
  if (context === undefined) {
    throw new Error('useDispensaryData must be used within a DispensaryDataProvider');
  }
  return context;
};
