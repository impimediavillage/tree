/**
 * The Treehouse Marketplace - Creator Lab Type Definitions
 * Commission Structure: 25% Creator | 75% Platform
 * Black apparel items only (initial launch)
 */

// ============ APPAREL & PRICING ============

export type ApparelType = 'T-Shirt' | 'Hoodie' | 'Long T-Shirt' | 'Cap' | 'Beanie' | 'Backpack';

export type ApparelColor = 'Black'; // Only black for now, can expand later

export type ApparelSurface = 'front' | 'back' | 'both'; // For T-Shirt, Long Sleeve, Hoodie

export type ProductCategory = 'Apparel' | 'Art' | 'Metalwork' | 'Furniture' | 'Resin';

export interface ApparelPricing {
  type: ApparelType;
  price: number; // ZAR, including VAT
  color: ApparelColor;
  currency: 'ZAR';
}

// NEW PRICING MODEL:
// - basePrice: Cost to platform (manufacturing)
// - retailPrice: Platform selling price
// - customerPrice: retailPrice + (retailPrice × 0.25) - what customer pays
// - creatorCommission: retailPrice × 0.25 - creator earns 25% of retailPrice
// - platformProfit: retailPrice - basePrice

// Default pricing (fallback if apparel_items not available)
// These are retailPrice values - customer pays retailPrice * 1.25
export const DEFAULT_APPAREL_RETAIL_PRICES: Record<ApparelType, number> = {
  'T-Shirt': 500,      // Customer pays: R625
  'Long T-Shirt': 750, // Customer pays: R937.50
  'Hoodie': 1000,      // Customer pays: R1250
  'Cap': 350,          // Customer pays: R437.50
  'Beanie': 350,       // Customer pays: R437.50
  'Backpack': 600,     // Customer pays: R750
};

// Deprecated - use getApparelPricing() instead
export const APPAREL_PRICES: Record<ApparelType, number> = DEFAULT_APPAREL_RETAIL_PRICES;

export interface ApparelPricingData {
  itemType: string;
  basePrice: number;    // Cost to platform
  retailPrice: number;  // Platform selling price
  customerPrice: number; // What customer pays (retailPrice * 1.25)
  creatorCommission: number; // Creator earns (retailPrice * 0.25)
  platformProfit: number; // Platform profit (retailPrice - basePrice)
}

/**
 * Calculate customer-facing price from retailPrice
 */
export function calculateCustomerPrice(retailPrice: number): number {
  return Math.round(retailPrice * 1.25 * 100) / 100; // Round to 2 decimals
}

/**
 * Calculate creator commission from retailPrice
 */
export function calculateCreatorCommission(retailPrice: number): number {
  return Math.round(retailPrice * 0.25 * 100) / 100;
}

// Available sizes per apparel type
export const APPAREL_SIZES: Record<ApparelType, string[]> = {
  'T-Shirt': ['S', 'M', 'L', 'XL', '2XL'],
  'Long T-Shirt': ['S', 'M', 'L', 'XL', '2XL'],
  'Hoodie': ['S', 'M', 'L', 'XL', '2XL'],
  'Cap': ['Standard'],
  'Beanie': ['Standard'],
  'Backpack': ['Standard'],
};

// Commission split
export const CREATOR_COMMISSION_RATE = 0.25; // 25% to creator
export const PLATFORM_COMMISSION_RATE = 0.75; // 75% to platform

// ============ DESIGN GENERATION ============

export type DesignStatus = 
  | 'generating' 
  | 'completed' 
  | 'failed' 
  | 'published' 
  | 'unpublished';

export type DesignOperationType = 
  | 'generate' 
  | 'variation' 
  | 'upscale';

export interface CreatorDesign {
  id: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  prompt: string;
  revisedPrompt?: string; // DALL-E often revises prompts
  imageUrl?: string; // Legacy field
  logoImageUrl?: string; // High-res logo ONLY (for POD printing)
  designImageUrl?: string; // Apparel mockup with logo (for display)
  thumbnailUrl?: string;
  status?: DesignStatus;
  operationType?: DesignOperationType;
  creditsUsed?: number;
  createdAt: any; // Firestore ServerTimestamp or Date
  updatedAt?: any;
  publishedAt?: any;
  unpublishedAt?: any;
  isPublished?: boolean;
  productId?: string;
  variations?: string[]; // URLs of variation images
  parentDesignId?: string; // If this is a variation, reference parent
  metadata?: {
    width?: number;
    height?: number;
    format?: string;
  };
  // Multi-category support
  category?: ProductCategory;
  // Apparel-specific fields
  apparelType?: ApparelType;
  surface?: ApparelSurface; // front/back/both for t-shirts, hoodies, long sleeve
  modelImageUrl?: string; // Human model showcase image
  modelPrompt?: string; // Prompt used for model generation
}

// Credit costs for operations
export const DESIGN_CREDIT_COSTS = {
  generate: 10,
  variation: 5,
  upscale: 3,
};

// ============ TREEHOUSE PRODUCTS ============

export interface TreehouseProduct {
  id: string;
  designId: string; // Reference to CreatorDesign
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
  category: ProductCategory;
  productName: string; // Custom funky name for the product
  productDescription?: string; // Marketing description
  // Apparel-specific fields
  apparelType?: ApparelType;
  apparelColor?: ApparelColor;
  surface?: ApparelSurface; // front/back/both
  logoImageUrl?: string; // High-res logo for POD printing
  modelImageUrl?: string; // Human model showcase
  designImageUrl: string;
  designThumbnailUrl?: string;
  price: number; // Fixed based on product type (incl. 25% surcharge)
  currency: 'ZAR';
  isActive: boolean;
  publishedAt: any; // Firestore ServerTimestamp
  unpublishedAt?: any;
  lastUpdated: any;
  salesCount: number; // Total units sold
  totalRevenue: number; // Total sales in ZAR
  viewCount: number; // Product page views
  addToCartCount: number; // Times added to cart
  tags?: string[]; // Searchable tags (auto-generated from prompt)
  // Shipping fields (for Pudo API integration)
  weight?: number; // Weight in kg
  dimensions?: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  // Dispensary fields (if created by dispensary owner/staff)
  dispensaryId?: string;
  dispensaryName?: string;
  dispensaryType?: string;
}

// ============ CREATOR EARNINGS ============

export interface CreatorEarnings {
  userId: string;
  userEmail: string;
  userName?: string;
  totalSales: number; // Total revenue from all sales (ZAR)
  totalCommission: number; // Total 25% commission earned (ZAR)
  pendingPayout: number; // Commission not yet paid out (ZAR)
  paidOut: number; // Total amount paid to creator (ZAR)
  productsSold: number; // Total units sold across all products
  activeProducts: number; // Currently published products
  lastSaleDate?: any;
  lastPayoutDate?: any;
  createdAt: any;
  updatedAt: any;
  salesHistory: SaleRecord[];
  payoutHistory: PayoutRecord[];
}

export interface SaleRecord {
  orderId: string;
  productId: string;
  apparelType: ApparelType;
  quantity: number;
  saleAmount: number;      // Total customer paid (ZAR)
  retailPrice: number;     // Platform retail price (ZAR)
  basePrice: number;       // Platform cost (ZAR)
  commission: number;      // 25% of retailPrice (ZAR)
  platformProfit: number;  // retailPrice - basePrice (ZAR)
  orderDate: any; // Firestore ServerTimestamp
  shippedDate?: any;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
}

export interface PayoutRecord {
  payoutId: string;
  amount: number; // ZAR
  payoutMethod: 'bank_transfer' | 'store_credit' | 'other';
  payoutDate: any;
  transactionReference?: string;
  status: 'pending' | 'completed' | 'failed';
  notes?: string;
}

// ============ ORDER EXTENSIONS ============

export type OrderType = 'dispensary' | 'treehouse' | 'healer-service';

export interface TreehouseOrderItem {
  productId: string; // TreehouseProduct ID
  designId: string; // CreatorDesign ID
  creatorId: string;
  creatorName: string;
  apparelType: ApparelType;
  apparelColor: ApparelColor;
  designImageUrl: string;
  quantity: number;
  
  // NEW PRICING MODEL:
  basePrice: number;         // Cost to platform per unit (ZAR)
  retailPrice: number;       // Platform retail price per unit (ZAR)
  customerPrice: number;     // What customer pays per unit: retailPrice * 1.25 (ZAR)
  
  totalCustomerPayment: number;  // customerPrice * quantity (ZAR)
  creatorCommission: number;     // retailPrice * 0.25 * quantity (ZAR)
  platformRevenue: number;       // retailPrice * quantity (ZAR)
  platformProfit: number;        // (retailPrice - basePrice) * quantity (ZAR)
}

export interface TreehouseOrderMetadata {
  orderType: 'treehouse';
  creatorIds: string[]; // Multiple creators if mixed cart
  
  // NEW PRICING MODEL:
  totalCustomerPayment: number;  // Sum of all customerPrice (what customer paid)
  totalCreatorCommission: number; // Sum of all retailPrice * 0.25 commissions (ZAR)
  totalPlatformRevenue: number;   // Sum of all retailPrice (ZAR)
  totalPlatformProfit: number;    // Sum of all (retailPrice - basePrice) (ZAR)
  totalBasePrice: number;         // Sum of all basePrices (platform costs)
  
  podStatus: PODStatus;
  printedDate?: any;
  shippedDate?: any;
  trackingNumber?: string;
}

export type PODStatus = 
  | 'pending_print' 
  | 'printing' 
  | 'printed' 
  | 'packaging' 
  | 'shipped' 
  | 'delivered'
  | 'cancelled';

// ============ ANALYTICS ============

export interface VendorAnalytics {
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  startDate: any;
  endDate: any;
  totalSales: number; // Total revenue (ZAR)
  totalOrders: number;
  totalUnits: number;
  platformRevenue: number; // 75% of totalSales (ZAR)
  creatorPayouts: number; // 25% of totalSales (ZAR)
  topCreators: TopCreatorStats[];
  topProducts: TopProductStats[];
  apparelBreakdown: ApparelStats[];
  pendingPayouts: number; // Total unpaid creator commissions (ZAR)
}

export interface TopCreatorStats {
  userId: string;
  userName: string;
  userEmail: string;
  totalSales: number; // ZAR
  commission: number; // 25% (ZAR)
  productsSold: number; // Units
  activeProducts: number;
  conversionRate: number; // Sales per view
}

export interface TopProductStats {
  productId: string;
  designImageUrl: string;
  apparelType: ApparelType;
  creatorName: string;
  sales: number; // ZAR
  units: number;
  views: number;
  conversionRate: number;
}

export interface ApparelStats {
  apparelType: ApparelType;
  unitsSold: number;
  revenue: number; // ZAR
  percentage: number; // % of total sales
}

// ============ UI HELPERS ============

export interface DesignGenerationRequest {
  prompt: string;
  userId: string;
  operationType: DesignOperationType;
  parentDesignId?: string; // For variations
}

export interface DesignGenerationResponse {
  success: boolean;
  designId?: string;
  imageUrl?: string;
  revisedPrompt?: string;
  creditsUsed?: number;
  newCreditBalance?: number;
  message?: string;
}

export interface PublishProductRequest {
  designId: string;
  apparelTypes: ApparelType[]; // Can publish same design to multiple apparel types
  tags?: string[];
}

export interface PublishProductResponse {
  success: boolean;
  productIds?: string[];
  message?: string;
}

// ============ ADMIN INTERFACES ============

export interface PODOrderSummary {
  orderId: string;
  orderNumber: string;
  items: TreehouseOrderItem[];
  customerName: string;
  shippingAddress: {
    streetAddress: string;
    suburb: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };
  podStatus: PODStatus;
  orderDate: any;
  totalAmount: number; // ZAR
  platformRevenue: number; // 75% (ZAR)
  creatorCommissions: number; // 25% (ZAR)
  trackingNumber?: string;
  notes?: string;
}

export interface CreatorPayoutRequest {
  userId: string;
  amount: number; // ZAR
  payoutMethod: 'bank_transfer' | 'store_credit';
  notes?: string;
}
