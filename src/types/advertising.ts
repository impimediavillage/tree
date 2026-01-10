import { Timestamp } from 'firebase/firestore';
import type { SocialPlatform } from './social-share';
import type { AllowedUserRole } from '../types';

// ============== AD TYPES & ENUMS ==============

export type AdType = 
  | 'special_deal'        // Limited time offers, flash sales
  | 'featured_product'    // Highlight single products
  | 'product_bundle'      // Grouped products with special pricing
  | 'social_campaign'     // Connect to social hub & influencers
  | 'platform_promotion'  // Super admin only
  | 'custom';             // Custom ad format

export type AdStatus = 
  | 'draft'      // Being created
  | 'scheduled'  // Set to go live
  | 'active'     // Currently running
  | 'paused'     // Temporarily stopped
  | 'ended'      // Campaign finished
  | 'archived';  // Stored for history

export type AdPlacement = 
  | 'hero_banner'      // Full-width hero section
  | 'product_grid'     // Within product listings
  | 'sidebar'          // Sidebar ad space
  | 'inline'           // Between content
  | 'modal'            // Pop-up modal
  | 'floating'         // Floating corner badge
  | 'footer'           // Footer promotional block
  | 'navigation';      // Navigation bar promo

export type AdTemplate = 
  | 'gradient_hero'
  | 'product_showcase'
  | 'bundle_deal'
  | 'countdown_special'
  | 'seasonal_promo'
  | 'influencer_spotlight'
  | 'custom';

export type AnimationType = 
  | 'none'
  | 'fade'
  | 'slide'
  | 'pulse'
  | 'bounce'
  | 'zoom'
  | 'flip';

// ============== MAIN ADVERTISEMENT INTERFACE ==============

export interface Advertisement {
  id?: string;
  
  // Ownership & Creation
  creatorType: 'dispensary' | 'super_admin';
  creatorId: string; // dispensaryId or 'platform'
  creatorName: string;
  dispensaryId?: string; // For dispensary ads
  dispensaryName?: string;
  
  // Ad Details
  type: AdType;
  title: string;
  subtitle?: string;
  description: string;
  tagline?: string;
  
  // Media Assets
  imageUrl?: string;
  videoUrl?: string;
  customImages?: string[]; // Multiple images for carousel
  thumbnailUrl?: string;
  
  // Product Linking (KEY FEATURE!)
  productIds: string[]; // Products featured in this ad
  products?: Array<{
    id: string;
    name: string;
    price: number;
    imageUrl?: string;
    dispensaryName?: string;
  }>;
  
  // Bundle Configuration
  isBundle: boolean;
  bundleConfig?: {
    originalPrice: number;
    bundlePrice: number;
    discountPercent: number;
    discountAmount: number;
    savings: string; // "Save R150!"
  };
  
  // Special Deal Configuration
  dealConfig?: {
    discountPercent?: number;
    discountAmount?: number;
    couponCode?: string;
    minPurchase?: number;
    maxUses?: number;
    usedCount?: number;
  };
  
  // Influencer Marketplace (INNOVATIVE FEATURE!)
  availableToInfluencers: boolean; // Can influencers promote this?
  selectedByInfluencers?: string[]; // Array of influencer IDs who selected this ad
  influencerRestrictions?: {
    minTier?: string; // Only certain tiers can promote
    maxInfluencers?: number; // Limit how many can promote
    requiredNiches?: string[]; // Must match dispensary type
  };
  
  // Influencer Commission
  influencerCommission: {
    enabled: boolean;
    rate: number; // Percentage (e.g., 15 for 15%)
    bonusForTopPerformers?: number;
    availableToInfluencers?: boolean;
  };
  
  // Social Integration
  socialShareConfig?: {
    autoShare: boolean;
    platforms: SocialPlatform[];
    shareMessage: string;
    hashtags: string[];
    suggestedCaption?: string;
  };
  
  // Scheduling & Lifecycle
  status: AdStatus;
  startDate: Timestamp;
  endDate?: Timestamp;
  isAlwaysOn: boolean;
  timezone?: string;
  
  // Placement & Targeting
  placements: AdPlacement[];
  targetAudience?: {
    userRoles?: AllowedUserRole[];
    dispensaryTypes?: string[];
    locations?: string[];
    ageRange?: string;
  };
  
  // Call to Action
  ctaText?: string; // Button text
  ctaLink?: string; // Button link
  
  // Design & Styling
  design: {
    template: AdTemplate;
    backgroundColor?: string;
    textColor?: string;
    gradientFrom?: string;
    gradientTo?: string;
    animation: AnimationType;
    ctaButton: {
      text: string;
      link: string;
      style: 'primary' | 'secondary' | 'outline' | 'gradient';
      icon?: string;
    };
    showCountdown?: boolean;
    countdownTo?: Timestamp;
  };
  
  // Performance Metrics
  analytics: AdAnalytics;
  
  // Budget & Limits
  budget?: {
    maxSpend?: number;
    spentSoFar?: number;
    maxImpressions?: number;
    maxClicks?: number;
  };
  
  // Priority & Visibility
  priority: number; // Higher = shows first (1-100)
  weight: number; // For A/B testing (0-1)
  isActive: boolean;
  isFeatured: boolean;
  
  // Metadata
  tags?: string[];
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  publishedAt?: Timestamp;
  lastModifiedBy?: string;
}

// ============== AD ANALYTICS ==============

export interface AdAnalytics {
  // Core Metrics
  impressions: number;
  uniqueImpressions: number;
  clicks: number;
  uniqueClicks: number;
  conversions: number;
  
  // Financial
  revenue: number;
  spent: number;
  profit: number;
  
  // Calculated Rates
  ctr: number; // Click-through rate (clicks/impressions * 100)
  conversionRate: number; // (conversions/clicks * 100)
  revenuePerImpression: number;
  revenuePerClick: number;
  costPerClick?: number;
  costPerConversion?: number;
  roi: number; // Return on investment
  
  // Time-based
  averageViewDuration?: number; // For video ads
  bounceRate?: number;
  
  // Influencer Impact
  influencerDrivenSales: number;
  influencerRevenue: number;
  influencerCommissionPaid: number;
  topPerformingInfluencer?: {
    id: string;
    name: string;
    sales: number;
    revenue: number;
  };
  
  // Placement Performance
  performanceByPlacement?: {
    [key in AdPlacement]?: {
      impressions: number;
      clicks: number;
      conversions: number;
      revenue: number;
    };
  };
}

// ============== INFLUENCER AD SELECTION (MARKETPLACE!) ==============

export interface InfluencerAdSelection {
  id?: string;
  
  // Core Relationship
  influencerId: string;
  influencerName: string;
  influencerTier: string;
  adId: string;
  adTitle: string;
  dispensaryId: string;
  dispensaryName: string;
  
  // Unique Tracking
  uniqueTrackingCode: string; // e.g., "AD123-INF456-TRACK789"
  trackingUrl: string; // Full URL with tracking params
  shortUrl?: string; // Shortened version for easy sharing
  qrCodeUrl?: string; // QR code image for offline promotion
  
  // Selection Details
  selectedAt: Timestamp;
  status: 'active' | 'paused' | 'ended';
  
  // Commission Configuration
  commissionRate: number; // Percentage agreed upon
  bonusMultiplier?: number; // Extra for this influencer
  
  // Performance Tracking
  performance: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  
  // Influencer Customization
  customization?: {
    personalMessage?: string;
    customHashtags?: string[];
    scheduledPosts?: Timestamp[];
  };
  
  // Engagement
  sharedOn?: SocialPlatform[];
  lastSharedAt?: Timestamp;
  shareCount: number;
  
  // Metadata
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastActivityAt?: Timestamp;
}

// ============== AD IMPRESSION TRACKING ==============

export interface AdImpression {
  id?: string;
  adId: string;
  adTitle: string;
  dispensaryId?: string;
  
  // Viewer Info
  userId?: string;
  sessionId: string;
  ipAddress?: string; // Hashed for privacy
  
  // Context
  placement: AdPlacement;
  pageUrl: string;
  referrer?: string;
  
  // Influencer Attribution
  influencerId?: string; // If came from influencer link
  trackingCode?: string;
  
  // Device & Browser
  deviceType: 'mobile' | 'tablet' | 'desktop';
  browser?: string;
  os?: string;
  screenResolution?: string;
  
  // Geographic
  country?: string;
  city?: string;
  region?: string;
  
  // Timing
  timestamp: Timestamp;
  viewDuration?: number; // Seconds
  scrollDepth?: number; // Percentage
  
  // Engagement
  interacted: boolean; // Did they hover/tap?
  watchedVideo?: boolean;
  videoWatchPercent?: number;
}

// ============== AD CLICK TRACKING ==============

export interface AdClick {
  id?: string;
  adId: string;
  impressionId?: string; // Link to impression
  
  // User Info
  userId?: string;
  sessionId: string;
  
  // Influencer Attribution (KEY!)
  influencerId?: string;
  trackingCode?: string;
  influencerAdSelectionId?: string;
  
  // Click Details
  clickedElement: string; // 'cta_button', 'image', 'title'
  destination: string;
  
  // Context
  placement: AdPlacement;
  pageUrl: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  
  // Timing
  timestamp: Timestamp;
  timeSinceImpression?: number; // Seconds
  
  // Conversion Prediction
  likelyToBuy?: number; // 0-1 score
}

// ============== AD CONVERSION TRACKING ==============

export interface AdConversion {
  id?: string;
  
  // Ad Attribution
  adId: string;
  adTitle: string;
  clickId?: string;
  impressionId?: string;
  
  // Influencer Attribution (CRITICAL FOR COMMISSIONS!)
  influencerId?: string;
  influencerName?: string;
  trackingCode?: string;
  influencerAdSelectionId?: string;
  
  // Transaction Details
  userId: string;
  orderId: string;
  orderTotal: number;
  
  // Revenue Attribution
  attributedRevenue: number; // Portion attributed to this ad
  commission: number; // Platform commission
  influencerCommission?: number; // Influencer's cut
  dispensaryRevenue: number; // What dispensary keeps
  
  // Products Purchased
  productsPurchased: Array<{
    id: string;
    name: string;
    quantity: number;
    price: number;
  }>;
  
  // Timing & Journey
  timestamp: Timestamp;
  timeSinceClick?: number; // Minutes
  touchpoints?: number; // How many times they saw the ad
  
  // Conversion Type
  conversionType: 'direct' | 'assisted' | 'view-through';
  
  // Payment Status
  paymentStatus: 'pending' | 'completed' | 'refunded';
  commissionPaidOut: boolean;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ============== AD ZONES (SUPER ADMIN CONFIGURATION) ==============

export interface AdZone {
  id?: string;
  
  // Zone Definition
  name: string; // "Homepage Hero", "Store Sidebar", etc.
  description: string;
  placement: AdPlacement;
  
  // Technical Specs
  dimensions: {
    width: string; // "100%", "300px"
    height: string;
    minHeight?: string;
    maxHeight?: string;
    aspectRatio?: string; // "16:9", "1:1"
  };
  
  // Availability
  isActive: boolean;
  availableFor: 'super_admin' | 'dispensary' | 'both';
  
  // Display Rules
  displayRules: {
    maxAdsPerPage: number;
    rotationInterval?: number; // Seconds
    requiresApproval: boolean;
  };
  
  // Pricing (Optional)
  pricing?: {
    costPerImpression?: number;
    costPerClick?: number;
    monthlyFee?: number;
  };
  
  // Performance
  analytics: {
    totalImpressions: number;
    averageCTR: number;
    topPerformingAd?: string;
  };
  
  // Metadata
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============== AD TEMPLATES ==============

export interface AdTemplateConfig {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: 'special' | 'product' | 'bundle' | 'seasonal' | 'custom';
  
  // Pre-configured Design
  defaultDesign: {
    gradientFrom: string;
    gradientTo: string;
    textColor: string;
    animation: AnimationType;
    layout: 'full_width' | 'split' | 'overlay' | 'card';
  };
  
  // Usage
  usageCount: number;
  isPopular: boolean;
  isPremium: boolean;
}

// ============== AD CAMPAIGN (GROUP OF ADS) ==============

export interface AdCampaign {
  id?: string;
  name: string;
  description: string;
  
  // Ownership
  dispensaryId?: string;
  creatorType: 'dispensary' | 'super_admin';
  
  // Campaign Configuration
  adIds: string[]; // All ads in this campaign
  budget: number;
  spent: number;
  
  // Timing
  startDate: Timestamp;
  endDate?: Timestamp;
  status: 'draft' | 'active' | 'paused' | 'ended';
  
  // Goals
  goals: {
    targetImpressions?: number;
    targetClicks?: number;
    targetConversions?: number;
    targetRevenue?: number;
  };
  
  // Aggregate Analytics
  analytics: {
    totalImpressions: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
    roi: number;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============== INFLUENCER AD MARKETPLACE FILTERS ==============

export interface AdMarketplaceFilters {
  dispensaryTypes?: string[];
  minCommissionRate?: number;
  adTypes?: AdType[];
  minBundleValue?: number;
  dispensaryRating?: number;
  searchQuery?: string;
  sortBy: 'commission' | 'popularity' | 'newest' | 'trending' | 'revenue';
  onlyFeatured?: boolean;
}

// ============== AD PERFORMANCE BADGE ==============

export interface AdPerformanceBadge {
  level: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  name: string;
  description: string;
  icon: string;
  minMetrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    revenue?: number;
    roi?: number;
  };
}

// ============== HELPER TYPES ==============

export interface AdDraft {
  // Same as Advertisement but status is always 'draft'
  // Used during creation process
  [key: string]: any;
}

export interface AdSchedule {
  adId: string;
  scheduledPublishAt: Timestamp;
  scheduledEndAt?: Timestamp;
  reminderSent: boolean;
}

export interface AdABTest {
  id?: string;
  name: string;
  adVariantA: string; // Ad ID
  adVariantB: string; // Ad ID
  trafficSplit: number; // 0.5 = 50/50 split
  winningVariant?: 'A' | 'B';
  isActive: boolean;
  startedAt: Timestamp;
  endedAt?: Timestamp;
}
