
// This file can be used to share type definitions between your main app and Cloud Functions

// Re-export comprehensive types from the main application for use in seed functions, etc.
export type { Dispensary, User } from '../../src/types'; // Corrected path

export interface DispensaryDocData {
  fullName?: string | null; // Added for display name generation, allow null
  dispensaryName?: string | null; // Added to fix error, allow null
  status: string;
  ownerEmail: string;
  // Add other fields if accessed by functions and type safety is desired
}

export interface NoteData {
  byName: string;
  senderRole: 'requester' | 'owner' | 'super_admin'; // From context of existing JS
  note: string;
  timestamp: FirebaseFirestore.Timestamp;
}

// Export NoteDataCloud as an alias for NoteData (or define separately if intended to be different)
export type NoteDataCloud = NoteData;

export interface ProductRequestDocData {
  productId: string;
  productName: string;
  productOwnerDispensaryId: string;
  productOwnerEmail: string;
  productImage?: string | null;
  
  requesterDispensaryId: string;
  requesterDispensaryName: string;
  requesterEmail: string;
  
  quantityRequested: number;
  preferredDeliveryDate?: string | null;
  deliveryAddress: string;
  contactPerson: string;
  contactPhone: string;
  
  requestStatus: string; // Consider using a specific enum/union type if statuses are fixed
  notes?: NoteData[]; // Uses the NoteData defined above
  
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface PoolIssueDocData {
  productRequestId: string;
  productName: string;
  
  reporterDispensaryId: string;
  reporterDispensaryName: string;
  reporterEmail: string;
  
  reportedDispensaryId: string;
  reportedDispensaryName: string;
  reportedDispensaryEmail: string;
  
  issueType: string; // Consider enum/union
  description: string;
  
  issueStatus: string; // Consider enum/union
  resolutionDetails?: string | null;
  
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
}

export interface UserDocData {
  uid?: string; 
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  credits?: number;
  role?: string;
  dispensaryId?: string | null;
  status?: string;
  createdAt?: FirebaseFirestore.Timestamp | Date;
  lastLoginAt?: FirebaseFirestore.Timestamp | Date | null;
  signupSource?: string; // Added to match User type
  welcomeCreditsAwarded?: boolean; // Added to fix the deployment error
  // Add other fields if accessed by functions
}

export interface DeductCreditsRequestBody {
  userId: string;
  advisorSlug: string;
  creditsToDeduct: number;
  wasFreeInteraction: boolean;
}

export interface NotificationData {
  recipientUid: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  // Consider adding type and severity if needed by functions
}

// Scraper-related types
export interface JustBrandVariant {
  title: string;
  sku: string | null;
  price: number;
  image: string | null;
}

export interface JustBrandProduct {
  title: string;
  handle: string;
  productUrl: string;
  description: string;
  price: number;
  priceMin: number;
  priceMax: number;
  images: string[];
  variants: JustBrandVariant[];
}

export interface JustBrandCategory {
  name: string;
  slug: string;
  url: string;
  products: JustBrandProduct[];
}

export interface ScrapeLog {
  status: 'started' | 'completed' | 'failed';
  startTime: any;
  endTime?: any;
  itemCount: number;
  successCount: number;
  failCount: number;
  error?: string;
  messages: string[];
}
