
import type { Timestamp } from 'firebase/firestore';

// Price Tier Interface
export interface PriceTier {
  unit: string;
  price: number;
  quantityInStock?: number | null;
  description?: string | null;
}

// Updated ProductCategory to support nesting
export interface ProductCategory {
  name: string;
  subcategories?: ProductCategory[]; // Recursive
}

// Represents the structure of a Dispensary document in Firestore
export interface Dispensary {
  id?: string; 
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

// Represents the structure for Wellness Type documents (basic info)
export interface DispensaryType {
  id?: string;
  name: string; 
  description?: string | null;
  iconPath?: string | null;
  image?: string | null;
  advisorFocusPrompt?: string | null;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// Represents a document in the 'dispensaryTypeProductCategories' collection
export interface DispensaryTypeProductCategoriesDoc {
  id?: string;
  name?: string; 
  categoriesData: ProductCategory[] | Record<string, any>; 
  updatedAt?: Timestamp | Date | string;
}

export interface ProductAttribute {
  name: string;
  percentage: string;
}

// Represents a Product document in Firestore
export interface Product {
  id?: string;
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType: string; 
  productOwnerEmail: string;
  name: string;
  description: string;
  category: string; 
  productType?: string | null;
  productSubCategory?: string | null;
  
  strain?: string | null;
  strainType?: string | null;
  homeGrow?: string[] | null;
  feedingType?: 'Organic feed in Pots' | 'Organic feed Hydro' | 'Chemical feed in Pots with flush' | 'Chemical feed hydro with flush' | 'Organic & Chemical in Pots Flushed' | 'Organic & Chemical hydro Flushed' | null;
  thcContent?: string | null;
  cbdContent?: string | null;
  effects?: ProductAttribute[] | null;
  flavors?: string[] | null;
  medicalUses?: ProductAttribute[] | null;
  stickerProgramOptIn?: 'yes' | 'no' | null; 

  gender?: 'Mens' | 'Womens' | 'Unisex' | null;
  sizingSystem?: 'UK/SA' | 'US' | 'EURO' | 'Alpha (XS-XXXL)' | 'Other' | null;
  sizes?: string[] | null;
  
  currency: string; 
  priceTiers: PriceTier[]; 
  poolPriceTiers?: PriceTier[] | null;
  quantityInStock: number;
  imageUrls?: string[] | null;
  imageUrl?: string | null;
  labTested?: boolean;
  labTestReportUrl?: string | null;
  isAvailableForPool?: boolean;
  tags?: string[] | null;
  
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  dispensaryLocation?: {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  mostCommonTerpene?: string | null;
  
  stickerDetails?: {
    linkedStrainId?: string | null;
    theme?: string | null;
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
    currency: string;
    priceTiers: PriceTier[]; 
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
  signupSource?: string; 
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
  dispensaryId?: string | null;
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

export type UserDocData = Omit<User, 'id' | 'createdAt' | 'lastLoginAt' | 'dispensaryStatus' | 'preferredDispensaryTypes' | 'welcomeCreditsAwarded' | 'signupSource'> & {
  uid: string;
  email: string;
  createdAt?: Timestamp;
  lastLoginAt?: Timestamp | null;
  dispensaryStatus?: Dispensary['status'] | null;
  preferredDispensaryTypes?: string[];
  welcomeCreditsAwarded?: boolean;
  signupSource?: string;
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
  name: string; 
  count: number; 
  fill: string; 
}

// Cart Item type
export interface CartItem {
  id: string; // Unique ID for the cart item, e.g., `${productId}-${unit}`
  productId: string; // Original product ID
  name: string;
  description: string;
  category: string;
  strain?: string | null;
  dispensaryId: string;
  dispensaryName: string;
  currency: string;
  price: number;
  unit: string;
  quantity: number;
  quantityInStock: number;
  imageUrl?: string | null;
}

// Types for generated brand assets
export interface GenerateInitialLogosInput {
    name: string;
    isStore: boolean;
}

export interface GenerateInitialLogosOutput {
    clayLogoUrl: string;
    comicLogoUrl: string;
    rastaLogoUrl: string;
    farmstyleLogoUrl: string;
    imaginativeLogoUrl: string;
}

export interface GenerateApparelInput {
    style: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative';
    circularStickerUrl: string;
    subjectName: string;
    isStore: boolean;
}

export interface ThemeAssetSet {
    circularStickerUrl: string;
    rectangularStickerUrl: string;
    capUrl: string;
    tShirtUrl: string;
    hoodieUrl: string;
    circularStickerSheetUrl: string;
    rectangularStickerSheetUrl: string;
    trippySticker1Url: string;
    trippySticker2Url: string;
}

export interface StickerSet {
  id?: string;
  creatorUid: string;
  creatorDisplayName: string;
  creatorRole: User['role'];
  dispensaryId?: string | null; // For store-created sets
  name: string; // e.g., "Lemon Haze"
  theme: 'clay' | 'comic' | 'rasta' | 'farmstyle' | 'imaginative';
  assets: ThemeAssetSet;
  isPublic: boolean;
  salesCount: number;
  viewCount: number;
  createdAt: Timestamp | Date | string;
}
