import { Timestamp } from 'firebase/firestore';

export type InfluencerTier = 'seed' | 'sprout' | 'growth' | 'bloom' | 'forest';
export type InfluencerStatus = 'pending' | 'active' | 'suspended' | 'deactivated';
export type CommissionType = 'product' | 'bundle' | 'collaboration' | 'bonus';

export interface InfluencerProfile {
  id?: string;
  userId: string;
  displayName: string;
  profileImage?: string;
  bio: string;
  healingStory?: string;
  tier: InfluencerTier;
  status: InfluencerStatus;
  
  // Referral Details
  referralCode: string; // e.g., "RASTA420"
  referralLink: string; // e.g., "wellnesstree.com?ref=rasta420"
  
  // Wellness Focus
  primaryNiche: string[]; // dispensary types they focus on
  secondaryNiches?: string[];
  
  // Social Media
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    facebook?: string;
  };
  
  // Stats
  stats: {
    totalClicks: number;
    totalConversions: number;
    totalSales: number;
    totalEarnings: number;
    currentMonthSales: number;
    currentMonthEarnings: number;
    tribeMembers: number;
    bundles: number;
    liveEvents: number;
    badges: string[];
    level: number;
    xp: number;
  };
  
  // Commissions
  commissionRate: number; // percentage
  bonusMultipliers: {
    videoContent: number;
    tribeEngagement: number;
    seasonal: number;
  };
  
  // Payout
  payoutInfo: {
    method: 'payfast' | 'bank' | 'credits';
    minimumPayout: number;
    pendingBalance: number;
    availableBalance: number;
    lastPayout?: Timestamp;
    bankDetails?: {
      accountHolder: string;
      accountNumber: string;
      bankName: string;
      branchCode: string;
    };
  };
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
}

export interface HealingJourney {
  id?: string;
  influencerId: string;
  title: string;
  description: string;
  milestones: JourneyMilestone[];
  coverImage?: string;
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JourneyMilestone {
  id: string;
  date: Timestamp;
  title: string;
  description: string;
  images?: string[];
  videoUrl?: string;
  productTags?: string[]; // product IDs
  emotions?: string[];
  achievements?: string[];
}

export interface WellnessTribe {
  id?: string;
  influencerId: string;
  name: string;
  description: string;
  coverImage?: string;
  memberCount: number;
  isPrivate: boolean;
  perks: string[];
  challenges: TribeChallenge[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface TribeChallenge {
  id: string;
  title: string;
  description: string;
  startDate: Timestamp;
  endDate: Timestamp;
  participants: number;
  prize?: string;
  isActive: boolean;
}

export interface TribeMembership {
  id?: string;
  userId: string;
  tribeId: string;
  influencerId: string;
  joinedAt: Timestamp;
  isActive: boolean;
  engagementScore: number;
}

export interface HealingBundle {
  id?: string;
  influencerId: string;
  name: string;
  description: string;
  tagline?: string;
  products: BundleProduct[];
  totalPrice: number;
  discountedPrice: number;
  discountPercent: number;
  coverImage?: string;
  tags: string[];
  stats: {
    views: number;
    conversions: number;
    revenue: number;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BundleProduct {
  productId: string;
  dispensaryId: string;
  productName: string;
  price: number;
  imageUrl?: string;
}

export interface InfluencerCollaboration {
  id?: string;
  primaryInfluencerId: string;
  collaboratorInfluencerId: string;
  type: 'bundle' | 'event' | 'campaign';
  name: string;
  description: string;
  commissionSplit: {
    primary: number; // percentage
    collaborator: number; // percentage
  };
  stats: {
    totalSales: number;
    primaryEarnings: number;
    collaboratorEarnings: number;
  };
  startDate: Timestamp;
  endDate?: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
}

export interface LiveShoppingEvent {
  id?: string;
  influencerId: string;
  title: string;
  description: string;
  scheduledFor: Timestamp;
  endTime?: Timestamp;
  coverImage?: string;
  streamUrl?: string;
  replayUrl?: string;
  featuredProducts: string[]; // product IDs
  flashSales: FlashSale[];
  stats: {
    viewers: number;
    peakViewers: number;
    sales: number;
    revenue: number;
  };
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FlashSale {
  productId: string;
  originalPrice: number;
  flashPrice: number;
  quantity: number;
  sold: number;
  startTime: Timestamp;
  endTime: Timestamp;
}

export interface InfluencerTransaction {
  id?: string;
  influencerId: string;
  type: CommissionType;
  orderId?: string;
  bundleId?: string;
  collaborationId?: string;
  amount: number;
  commissionRate: number;
  bonusMultiplier?: number;
  description: string;
  status: 'pending' | 'confirmed' | 'paid';
  createdAt: Timestamp;
  paidAt?: Timestamp;
}

export interface InfluencerCommission {
  id?: string;
  influencerId: string;
  influencerName: string;
  orderId: string;
  orderNumber?: string;
  
  // New pricing breakdown fields
  orderTotal: number; // Total customer paid
  dispensaryEarnings: number; // Total base prices (what dispensaries get)
  platformCommission: number; // Total platform commission from order
  influencerEarnings: number; // Influencer's share of platform commission
  influencerCommissionRate: number; // % of platform commission (e.g., 0.40 for 40%)
  
  // Legacy fields (keep for compatibility)
  orderDate?: Timestamp;
  baseCommissionRate: number;
  effectiveRate: number;
  commissionAmount: number; // Same as influencerEarnings
  bonusAmount?: number;
  bonusMultipliers?: {
    videoContent: number;
    tribeEngagement: number;
    seasonal: number;
  };
  
  // Products breakdown
  products?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    dispensarySetPrice: number;
    basePrice: number;
    commission: number;
  }>;
  
  status: 'pending' | 'completed' | 'paid';
  createdAt: Timestamp;
  completedAt?: Timestamp;
  paidAt?: Timestamp;
  orderStatus?: string;
  dispensaryId?: string;
  dispensaryName?: string;
  customerId?: string;
  customerName?: string;
}

export interface InfluencerPayout {
  id?: string;
  influencerId: string;
  amount: number;
  method: 'payfast' | 'bank' | 'credits';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionIds: string[]; // references to InfluencerTransaction IDs
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  failureReason?: string;
  paymentReference?: string;
}

export interface ReferralClick {
  id?: string;
  influencerId: string;
  referralCode: string;
  userId?: string; // if logged in
  sessionId: string;
  source?: string; // e.g., 'instagram', 'tiktok', 'direct'
  device?: string;
  timestamp: Timestamp;
  converted: boolean;
  conversionAt?: Timestamp;
  orderId?: string;
}

export interface SeasonalCampaign {
  id?: string;
  name: string;
  description: string;
  theme: string;
  startDate: Timestamp;
  endDate: Timestamp;
  bonusCommission: number; // percentage
  targetSales: number;
  prizes: CampaignPrize[];
  graphics: {
    banner: string;
    badge: string;
    socialMedia: string[];
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CampaignPrize {
  rank: number;
  title: string;
  description: string;
  reward: string;
  winnerId?: string;
}

export interface InfluencerBadge {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: InfluencerTier;
  requirement: string;
  rewardXP: number;
  rewardPerks?: string[];
}

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  requirement: {
    type: 'shares' | 'sales' | 'events' | 'members' | 'content';
    count: number;
  };
  expiresAt: Timestamp;
}

export interface InfluencerLeaderboard {
  period: 'daily' | 'weekly' | 'monthly' | 'all-time';
  category: 'earnings' | 'engagement' | 'rising' | 'niche';
  entries: LeaderboardEntry[];
  updatedAt: Timestamp;
}

export interface LeaderboardEntry {
  rank: number;
  influencerId: string;
  displayName: string;
  profileImage?: string;
  value: number; // earnings, engagement score, etc.
  tier: InfluencerTier;
  badges: string[];
}

export interface InfluencerSettings {
  isSystemEnabled: boolean;
  defaultCommissionRates: Record<InfluencerTier, number>;
  minimumPayout: number;
  payoutSchedule: 'weekly' | 'biweekly' | 'monthly';
  approvalRequired: boolean;
  updatedAt: Timestamp;
  updatedBy: string;
}
