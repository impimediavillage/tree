
export interface PUDOLocker {
  id: string;
  name: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface Dispensary {
  id?: string;
  dispensaryName: string;
  dispensaryType: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  website?: string;
  socialLinks?: Record<string, string>;
  operatingHours?: Record<string, string>;
  isVerified: boolean;
  ownerId: string;
  createdAt: any; // Firestore ServerTimestamp
  updatedAt: any; // Firestore ServerTimestamp
  bio?: string;
  currency: 'ZAR' | 'USD' | 'EUR' | 'GBP';
  minimumOrderAmount?: number;
  originLocker?: PUDOLocker | null;
}

export interface PriceTier {
  unit: string;
  price: number;
  quantityInStock: number;
  description?: string;
  weightKgs?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface PoolPriceTier {
  unit: string;
  price: number;
  quantityInStock: number;
  description?: string;
  weightKgs?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
}

export interface ProductAttribute {
  name: string;
  level: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string | null;
  subSubcategory?: string | null;
  priceTiers: PriceTier[];
  isAvailableForPool: boolean;
  poolPriceTiers?: PoolPriceTier[];
  tags?: string[];
  productType: 'THC' | 'CBD' | 'HEMP' | 'Apparel' | 'Gear' | 'Other' | 'Homeopathy' | 'Mushroom' | 'Permaculture' | 'Traditional Medicine';
  labTested: boolean;
  labTestReportUrl?: string | null;
  effects?: ProductAttribute[];
  medicalUses?: ProductAttribute[];
  flavors?: string[];
  genetics?: string;
  thcContent?: string;
  cbdContent?: string;
  terpeneProfile?: string;
  dispensaryId: string;
  dispensaryName: string;
  productOwnerEmail: string;
  createdAt: any; 
  updatedAt: any;
  quantityInStock: number;
  imageUrl?: string | null;
  imageUrls?: string[];
  currency?: string;
  gender?: 'Mens' | 'Womens' | 'Unisex' | null;
  sizingSystem?: 'UK/SA' | 'US' | 'EURO' | 'Alpha (XS-XXXL)' | 'Other' | null;
  sizes?: string[];
  dispensaryType?: string | null;
  poolSharingRule?: 'same_type' | 'all_types' | 'specific_stores' | null;
  allowedPoolDispensaryIds?: string[];
}

// --- DEFINITIVE CART ITEM TYPE ---
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  originalName?: string;
  description?: string;
  category: string;
  strain?: string | null;
  dispensaryId: string;
  dispensaryName: string;
  dispensaryType?: string | null;
  productOwnerEmail: string;
  currency?: string;
  price: number;
  unit: string;
  quantity: number;
  quantityInStock: number;
  imageUrl?: string | null;
  sampleAmount?: number;
  productType: Product['productType'];
  // Correct, simple names for the backend
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

// --- OCR Result Interfaces ---
export interface OcrFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrRecognitionResult {
  text: string;
  confidence: number;
  frame: OcrFrame;
}

export interface OcrResult {
  results: OcrRecognitionResult[][];
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

// --- USER TYPES ---
export interface User {
  uid: string;
  email: string;
  name?: string;
  phoneNumber?: string;
  role: 'Super Admin' | 'DispensaryOwner' | 'DispensaryStaff' | 'approved' | 'pending';
  dispensaryId?: string;
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
  credits?: number;
  freeInteractionsRemaining?: number;
  createdAt?: any;
  updatedAt?: any;
}

// --- SHIPPING & CHECKOUT TYPES ---
export interface ShippingRate {
  id: string | number;
  name: string;
  rate: number;
  service_level: string;
  delivery_time: string;
  courier_name: string;
}

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

// Strain Sticker Generation Types
export interface GenerateStrainStickerInput {
  strainName: string;
  dispensaryName: string;
  flavors?: string[];
}

export interface GenerateStrainStickerOutput {
  imageUrl: string;
}

// Cart grouping type for checkout
export type GroupedCart = Record<string, {
  dispensaryName: string;
  dispensaryType?: string;
  items: CartItem[];
  shippingRate?: any;
}>;
