export type ProductType = 'THC' | 'CBD' | 'HEMP' | 'Apparel' | 'Gear' | 'Other' | 'Homeopathy' | 'Mushroom' | 'Permaculture' | 'Traditional Medicine';

export interface ProductAttribute {
  name: string;
  level: number;
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
  productType: ProductType;
  labTested: boolean;
  labTestReportUrl?: string | null;
  poolSharingRule?: 'same_type' | 'all_types' | 'specific_stores' | null;
  allowedPoolDispensaryIds?: string[];
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
