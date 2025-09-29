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
}

export interface PriceTier {
  unit: string;
  price: number;
  quantityInStock: number;
  description?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface PoolPriceTier {
  unit: string;
  price: number;
  description?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
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
