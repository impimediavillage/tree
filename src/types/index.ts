
import type { Timestamp } from 'firebase/firestore';

// Represents the structure of a Dispensary document in Firestore
export interface Dispensary {
  id?: string; // Firestore document ID
  fullName: string;
  phone: string;
  ownerEmail: string;
  dispensaryName: string;
  dispensaryType: string; 
  currency: string;
  openTime?: string | null;
  closeTime?: string | null;
  operatingDays: string[];
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  deliveryRadius?: string | null;
  bulkDeliveryRadius?: string | null;
  collectionOnly?: boolean;
  orderType?: 'small' | 'bulk' | 'both' | null;
  participateSharing?: 'yes' | 'no' | null;
  leadTime?: string | null;
  message?: string | null;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Suspended';
  applicationDate: Timestamp | Date | string; 
  approvedDate?: Timestamp | Date | string | null;
  lastActivityDate?: Timestamp | Date | string | null;
  publicStoreUrl?: string | null; 

  productCount?: number;
  incomingRequestCount?: number;
  outgoingRequestCount?: number;

  averageRating?: number | null;
  reviewCount?: number;
}

// Represents the structure for Dispensary Type documents
export interface DispensaryType {
  id?: string; 
  name: string;
  description?: string | null;
  iconPath?: string | null; 
  image?: string | null; 
  advisorFocusPrompt?: string | null; 
  productCategories?: string[]; // Added field for product categories
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// Represents a Product document in Firestore
export interface Product {
  id?: string; 
  dispensaryId: string; // Foreign key to Dispensaries collection
  dispensaryName: string; // Denormalized for easier display
  dispensaryType: string; // Denormalized from dispensary
  productOwnerEmail: string; // Denormalized from dispensary owner
  name: string;
  description: string;
  category: string; // e.g., Flower, Edible, Tincture, Concentrate, Topical, Seed, Clone, Accessory
  strain?: string | null; // e.g., Blue Dream, OG Kush. Optional.
  thcContent?: number | null; // Percentage
  cbdContent?: number | null; // Percentage
  price: number;
  currency: string; // Should match dispensary's currency
  unit: string; // e.g., gram, oz, ml, piece, pack of 5 seeds
  quantityInStock: number;
  imageUrl?: string | null; // URL to product image
  labTested?: boolean;
  effects?: string[]; // e.g., Relaxed, Happy, Uplifted, Focused, Energetic
  flavors?: string[]; // e.g., Earthy, Sweet, Citrus, Pine, Diesel
  medicalUses?: string[]; // e.g., Pain Relief, Anxiety, Insomnia, Nausea
  isAvailableForPool?: boolean; // If the product can be shared/requested by other dispensaries
  tags?: string[]; // General tags for searching/filtering
  createdAt: Timestamp | Date | string; 
  updatedAt: Timestamp | Date | string;
  dispensaryLocation?: { // Denormalized for easier map display/filtering if products are shown on a general map
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}

export interface NoteData {
  note: string;
  byName: string;
  senderRole: 'requester' | 'owner' | 'super_admin';
  timestamp: Timestamp | Date;
}

// Represents a Product Request document in Firestore
export interface ProductRequest {
  id?: string; 
  productId: string;
  productName: string; // Denormalized from Product
  productOwnerDispensaryId: string;
  productOwnerEmail: string; // Denormalized from Product Owner
  productImage?: string | null; // Denormalized from Product
  
  requesterDispensaryId: string;
  requesterDispensaryName: string;
  requesterEmail: string;
  
  quantityRequested: number;
  preferredDeliveryDate?: string | null; 
  deliveryAddress: string;
  contactPerson: string;
  contactPhone: string;
  
  requestStatus: 
    | "pending_owner_approval"
    | "accepted"
    | "rejected"
    | "cancelled"
    | "fulfilled_by_sender"
    | "received_by_requester"
    | "issue_reported";
  
  notes?: NoteData[];
  
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;

  productDetails?: { 
    name: string;
    category: string;
    unit: string;
    price: number;
    currency: string;
    imageUrl?: string | null;
  } | null;
}

// Represents a Pool Issue document in Firestore
export interface PoolIssue {
  id?: string; 
  productRequestId: string;
  productName: string;
  
  reporterDispensaryId: string;
  reporterDispensaryName: string;
  reporterEmail: string;
  
  reportedDispensaryId: string;
  reportedDispensaryName: string;
  reportedDispensaryEmail: string;
  
  issueType: 
    | "product_not_as_described"
    | "product_not_received"
    | "product_damaged"
    | "payment_issue"
    | "communication_issue"
    | "other";
  description: string;
  
  issueStatus: 
    | "new" 
    | "under_review" 
    | "awaiting_reporter_response" 
    | "awaiting_reported_party_response" 
    | "resolved" 
    | "closed";
  resolutionDetails?: string | null;
  
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
}

// Represents a User document in Firestore (can be extended)
export interface User {
  id?: string; 
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
  role: 'User' | 'LeafUser' | 'DispensaryOwner' | 'Super Admin' | 'DispensaryStaff'; 
  dispensaryId?: string | null; 
  dispensaryStatus?: Dispensary['status'] | null; 
  credits: number;
  createdAt?: Timestamp | Date | string;
  lastLoginAt?: Timestamp | Date | string | null;
  status?: 'Active' | 'Suspended' | 'PendingApproval'; 
  preferredDispensaryTypes?: string[];
  welcomeCreditsAwarded?: boolean; 
}

// Represents a Credit Package document in Firestore
export interface CreditPackage {
  id?: string; 
  name: string;
  credits: number;
  price: number;
  currency: string; 
  description?: string | null;
  isActive: boolean;
  bonusCredits?: number;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// Represents a Notification document
export interface Notification {
  id?: string;
  recipientUid: string;
  message: string;
  link?: string | null;
  read: boolean;
  type?: 
    | "product_request_new"
    | "product_request_update"
    | "pool_issue_new"
    | "pool_issue_update"
    | "credits_purchased"
    | "dispensary_approved"
    | "dispensary_rejected"
    | "general_announcement";
  severity?: "low" | "medium" | "high" | "critical";
  createdAt: Timestamp | Date | string;
}

// Represents an AI Interaction Log document
export interface AIInteractionLog {
  id?: string;
  userId: string;
  advisorSlug: string;
  creditsUsed: number;
  wasFreeInteraction: boolean;
  timestamp: Timestamp | Date | string; 
  promptUsed?: string | null;
  responseSummary?: string | null;
}

// Represents an AI Advisor Configuration (e.g., for storing in Firestore)
export interface AIAdvisorConfig {
  id?: string; 
  slug: string; 
  title: string;
  description: string;
  icon?: string | null; 
  flowName: string; 
  inputSchemaPrompt?: string | null; 
  creditsPerQuery: number;
  freeQueriesAllowed?: number;
  isEnabled: boolean;
  dataAiHint?: string | null;
}

// For Cloud Functions that might deal with raw document data before type casting
export type DispensaryDocData = Omit<Dispensary, 'id' | 'applicationDate' | 'approvedDate' | 'lastActivityDate' | 'publicStoreUrl'> & {
  fullName?: string; 
  dispensaryName?: string; 
  applicationDate: Timestamp;
  approvedDate?: Timestamp;
  lastActivityDate?: Timestamp;
  publicStoreUrl?: string | null;
};

export type ProductRequestDocData = Omit<ProductRequest, 'id' | 'createdAt' | 'updatedAt' | 'notes'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notes?: Array<Omit<NoteData, 'timestamp'> & { timestamp: Timestamp }>;
};

export type PoolIssueDocData = Omit<PoolIssue, 'id' | 'createdAt' | 'updatedAt'> & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

export type UserDocData = Omit<User, 'id' | 'createdAt' | 'lastLoginAt' | 'dispensaryStatus' | 'preferredDispensaryTypes' | 'welcomeCreditsAwarded'> & {
  uid: string; 
  email: string; 
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp | null; 
  dispensaryStatus?: Dispensary['status'] | null;
  preferredDispensaryTypes?: string[];
  welcomeCreditsAwarded?: boolean;
};

export type DeductCreditsRequestBody = {
  userId: string;
  advisorSlug: string;
  creditsToDeduct: number;
  wasFreeInteraction: boolean;
};

export type NotificationData = Omit<Notification, 'id' | 'createdAt'> & {
  createdAt: Timestamp;
};

export type NoteDataCloud = Omit<NoteData, 'timestamp'> & {
  timestamp: Timestamp;
};


// Generic Firestore Document with ID
export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}

// Specific types for Analytics
export interface ProductCategoryCount {
  name: string; // Category name
  count: number; // Number of products in this category
  fill: string; // Color for the chart
}

// Cart Item type
export interface CartItem extends Product {
  quantity: number;
}
