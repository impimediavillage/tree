
import type { firestore } from 'firebase-admin';

// This file can be used to share type definitions between your main app and Cloud Functions
export type { Dispensary, User } from '../../src/types'; 

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
  timestamp: firestore.Timestamp;
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
  
  createdAt?: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
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
  
  createdAt?: firestore.Timestamp;
  updatedAt?: firestore.Timestamp;
}

export interface UserDocData {
  uid?: string; 
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  credits?: number;
  role?: string;
  dispensaryId?: string | null;
  status?: 'Active' | 'Suspended' | 'PendingApproval' | 'Rejected';
  createdAt?: firestore.Timestamp | firestore.FieldValue;
  lastLoginAt?: firestore.Timestamp | firestore.FieldValue | null;
  signupSource?: string; // Added to match User type
  welcomeCreditsAwarded?: boolean; // Added to fix the deployment error
}

export interface NotificationData {
  recipientUid: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: firestore.Timestamp;
  // Consider adding type and severity if needed by functions
}
