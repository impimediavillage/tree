export interface CreatorStore {
  id: string;
  ownerId: string;
  storeName: string;
  storeSlug: string;
  storeDescription: string;
  creatorNickname: string;
  storeBanner?: string;
  storeLogo?: string;
  
  // User info
  ownerEmail: string;
  userRole: 'LeafUser' | 'DispensaryOwner' | 'DispensaryStaff';
  
  // Dispensary linking (if applicable)
  dispensaryId?: string;
  dispensaryName?: string;
  dispensaryType?: string;
  
  // Stats
  stats: {
    totalProducts: number;
    totalSales: number;
    totalRevenue: number;
  };
  
  // Status
  isActive: boolean;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

export interface CreateStoreRequest {
  storeName: string;
  storeDescription: string;
  creatorNickname: string;
}

export interface UpdateStoreRequest {
  storeId: string;
  storeName?: string;
  storeDescription?: string;
  creatorNickname?: string;
  storeBanner?: string;
  storeLogo?: string;
}
