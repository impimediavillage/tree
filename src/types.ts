
import type { Timestamp } from 'firebase/firestore';
import type { firestore } from 'firebase-admin';

// Price Tier Interface
export interface PriceTier {
  unit: string;
  price: number;
  quantityInStock?: number | null;
  description?: string | null;
  // Explicitly defining shipping dimensions
  weightKgs?: number | null;
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
}

// Updated ProductCategory to support nesting
export interface ProductCategory {
  name: string;
  subcategories?: ProductCategory[]; // Recursive
}
export type AllowedUserRole = 'User' | 'LeafUser' | 'DispensaryOwner' | 'Super Admin' | 'DispensaryStaff';

// Represents a PUDO Locker, often used as an origin or destination
export interface PUDOLocker {
  id: string;
  name: string;
  address: string;
  distanceKm?: number;
  city?: string;
  province?: string;
  postalCode?: string;
  suburb?: string;
  street_address?: string;
  status?: string;
  availableCompartments?: number;
  location?: {
    lat: number;
    lng: number;
  };
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
  streetAddress?: string;
  suburb?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  originLocker?: PUDOLocker | null;
  deliveryRadius?: string | null;
  leadTime?: string | null;
  message?: string | null;
  status: 'Pending Approval' | 'Approved' | 'Rejected' | 'Suspended';
  applicationDate: Timestamp | Date | string | null; // Changed to allow null
  approvedDate?: Timestamp | Date | string | null;
  lastActivityDate?: Timestamp | Date | string | null;
  publicStoreUrl?: string | null;
  showLocation: boolean;
  shippingMethods: string[];
  productCount?: number;
  incomingRequestCount?: number;
  outgoingRequestCount?: number;
  averageRating?: number | null;
  reviewCount?: number;
  inHouseDeliveryFee?: number;
  bannerUrl?: string | null;
}

// Represents the structure for Wellness Type documents (basic info)
export interface DispensaryType {
  id?: string;
  name: string; 
  description?: string | null;
  iconPath?: string | null;
  image?: string | null;
  advisorFocusPrompt?: string | null;
  recommendedAdvisorIds?: string[]; // Array of AI Advisor IDs linked to this dispensary type
  storeCount?: number;
  createdAt?: Timestamp | Date | string;
  updatedAt?: Timestamp | Date | string;
}

// Represents a document in the 'dispensaryTypeProductCategories' collection
export interface DispensaryTypeProductCategoriesDoc {
  id?: string;
  name?: string; 
  categoriesData: ProductCategory[];
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
  subcategory?: string | null;
  subSubcategory?: string | null;
  
  // Cannabinoid Specific
  deliveryMethod?: string | null;
  productSubCategory?: string | null;
  
  // Traditional Medicine & Mushroom Specific
  productType?: string | null;
  baseProductData?: any | null; // For storing the selected base product
  
  // Strain details (shared)
  strain?: string | null;
  strainType?: string | null;
  homeGrow?: string[] | null;
  growingMedium?: 'Organic Soil' | 'Hydroponic' | 'Coco Coir' | 'Aeroponic' | 'Living Soil' | null;
  feedingType?: 'Organic feed in Pots' | 'Organic feed Hydro' | 'Chemical feed in Pots with flush' | 'Chemical feed hydro with flush' | 'Organic & Chemical in Pots Flushed' | 'Organic & Chemical hydro Flushed' | null;
  thcContent?: string | null;
  cbdContent?: string | null;
  effects?: ProductAttribute[] | null;
  flavors?: string[] | null;
  medicalUses?: ProductAttribute[] | null;
  mostCommonTerpene?: string | null;
  
  stickerProgramOptIn?: 'yes' | 'no' | null; 

  // Apparel Specific
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
  poolSharingRule?: 'same_type' | 'all_types' | 'specific_stores' | null;
  allowedPoolDispensaryIds?: string[];
  tags?: string[] | null;
  
  createdAt: Timestamp | Date | string;
  updatedAt: Timestamp | Date | string;
  dispensaryLocation?: {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  
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
  requestedTier?: {
    unit: string;
    price: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    weightKgs?: number;
  };
  preferredDeliveryDate?: string | null;
  deliveryAddress: string;
  destinationLocker?: PUDOLocker | null;
  contactPerson: string;
  contactPhone: string;
  orderDate?: string | null;
  actualDeliveryDate?: string | null;
  requesterConfirmed?: boolean;

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
    dispensaryName?: string;
    dispensaryType?: string;
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
  dispensary?: Dispensary | null; // <-- Include full dispensary data
  credits: number;
  createdAt?: Timestamp | Date | string | null; // Allow null
  lastLoginAt?: Timestamp | Date | string | null;
  status?: 'Active' | 'Suspended' | 'PendingApproval' | 'Rejected';
  preferredDispensaryTypes?: string[];
  welcomeCreditsAwarded?: boolean;
  signupSource?: string; 
  updatedAt?: Timestamp | Date | string | null;
  
  // Checkout workflow fields (optional for backward compatibility)
  name?: string; // Alternative to displayName for checkout forms
  phoneNumber?: string;
  shippingAddress?: {
    address?: string;
    streetAddress?: string;
    suburb?: string;
    city?: string;
    province?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
  billingAddress?: {
    streetAddress?: string;
    suburb?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Represents a User document in Firestore (for server-side functions)
export interface UserDocData {
  uid?: string; 
  email?: string;
  displayName?: string | null;
  photoURL?: string | null;
  credits?: number;
  role?: string;
  dispensaryId?: string | null;
  status?: 'Active' | 'Suspended' | 'PendingApproval' | 'Rejected';
  createdAt?: Timestamp | Date | string | null | firestore.FieldValue;
  lastLoginAt?: Timestamp | Date | string | null | firestore.FieldValue;
  signupSource?: string;
  welcomeCreditsAwarded?: boolean;
  preferredDispensaryTypes?: string[];
  updatedAt?: Timestamp | Date | string | null | firestore.FieldValue;
}

// Address values for checkout forms
export interface AddressValues {
  fullName: string;
  email: string;
  phoneNumber: string;
  shippingAddress: {
    address: string;
    streetAddress: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
    latitude: number;
    longitude: number;
  };
  billingAddress?: {
    streetAddress?: string;
    suburb?: string;
    city?: string;
    postalCode?: string;
    province?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  };
}

// Grouped cart type for checkout (matches CartContext structure)
export interface GroupedCart {
  [dispensaryId: string]: {
    dispensaryName: string;
    dispensaryType?: string;
    items: CartItem[];
  };
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

export interface DeductCreditsRequestBody {
  userId: string;
  advisorSlug: string;
  creditsToDeduct: number;
  wasFreeInteraction: boolean;
}

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

// Cart Item type - CORRECTED FOR SHIPPING
export interface CartItem {
  id: string; // Unique ID for the cart item, e.g., `${productId}-${unit}`
  productId: string; // Original product ID
  name: string;
  originalName?: string; // For THC products that override display name
  description: string;
  price: number;
  currency: string;
  unit: string;
  quantity: number;
  quantityInStock: number;
  imageUrl?: string | null;
  category: string;
  strain?: string | null; // For cannabis products
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType: string; 
  productOwnerEmail: string;
  productType: 'THC' | 'CBD' | 'HEMP' | 'Apparel' | 'Gear' | 'Other' | 'Homeopathy' | 'Mushroom' | 'Permaculture' | 'Traditional Medicine';
  // Shipping-related dimension fields, mapped from PriceTier
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  // Treehouse-specific field
  creatorId?: string; // Creator UID for Treehouse marketplace orders
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

// --- ADDED: Definition for ShippingRate to match backend ---
export interface ShippingRate {
  id: any;
  name: any;
  rate: number;
  service_level: any;
  delivery_time: any;
  courier_name: any;
}

// --- AI ADVISOR INTERFACES ---
export type AdvisorTier = 'basic' | 'standard' | 'premium';
export type AdvisorModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo';

export interface AIAdvisor {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  longDescription: string;
  imageUrl: string;
  iconName: string; // Lucide icon name as string (e.g., 'Leaf', 'Brain', 'Sparkles')
  systemPrompt: string;
  isActive: boolean;
  order: number;
  tier: AdvisorTier;
  creditCostBase: number; // Minimum credits per interaction
  creditCostPerTokens: number; // Additional credits per X tokens
  model: AdvisorModel;
  tags: string[];
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
}

export interface AdvisorInteraction {
  id?: string;
  userId: string;
  advisorSlug: string;
  advisorName: string;
  creditsDeducted: number;
  tokensUsed: number;
  model: string;
  messageLength: number;
  responseLength: number;
  wasFreeInteraction: boolean;
  timestamp: any; // Firestore ServerTimestamp
}
