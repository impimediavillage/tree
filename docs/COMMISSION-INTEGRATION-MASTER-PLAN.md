# 🎯 Commission Integration Master Plan
## Social Hub + Advertising + Influencer + Analytics + Payouts

**Date**: January 10, 2026  
**Status**: Pre-Implementation Blueprint  
**Goal**: Integrate ad commissions with existing tier-based system WITHOUT breaking current functionality

---

## 📋 **EXECUTIVE SUMMARY**

### **Current State (What Works ✅)**
- Influencer tier-based commissions (10-30% of platform's 25% fee)
- Advertising system with ad creation
- Influencer marketplace
- Order system with tracking codes
- Analytics dashboards
- Payout management

### **What We're Adding (New Features 🆕)**
- Ad-specific commissions (dispensary-set, 15-25%)
- Dual commission stacking (ad + platform)
- Enhanced analytics showing both commission types
- Updated payout breakdowns
- Social share integration with commission tracking
- Financial hub updates for super admin

### **Critical Constraint**
⚠️ **ZERO DOWNTIME** - All changes must be backward compatible

---

## 💰 **FINALIZED COMMISSION ARCHITECTURE**

### **System Overview**

```
CUSTOMER VIEW (Simple):
────────────────────────────────────────
Product Base Price:     R100
Platform Fee (25%):     + R25
────────────────────────────────────────
Total You Pay:          R125
────────────────────────────────────────

BEHIND THE SCENES (System Managed):
────────────────────────────────────────
Dispensary receives:    R100
  ├─ Ad Commission:     - R20 (if ad promo)
  └─ Net:               R80

Platform receives:      R25
  ├─ Influencer Share:  - R5 (tier-based)
  └─ Platform keeps:    R20

Influencer earns:       R25 total
  ├─ Ad Commission:     R20 (from dispensary)
  └─ Platform Share:    R5 (from platform)
────────────────────────────────────────

VISIBLE TO:
- Influencer: ✅ Sees both commission types
- Dispensary Owner: ✅ Sees ad commission deducted
- Super Admin: ✅ Sees complete breakdown
- Customer: ❌ Only sees R125 final price
```

---

## 🏗️ **SYSTEM ARCHITECTURE**

### **1. Dual Commission Flow**

```typescript
// COMMISSION CALCULATION PRIORITY
interface CommissionCalculation {
  // Step 1: Identify attribution source
  attribution: {
    hasAdTracking: boolean;      // AD-123-INF-xyz present?
    hasPlatformReferral: boolean; // user.referredBy exists?
    influencerId?: string;
  };
  
  // Step 2: Calculate ad commission (if applicable)
  adCommission?: {
    adId: string;
    rate: number;                 // Set by dispensary (15-25%)
    basePrice: number;            // R100
    amount: number;               // R100 × 0.20 = R20
    paidBy: 'dispensary';
  };
  
  // Step 3: Calculate platform commission (ALWAYS if influencer)
  platformCommission?: {
    tier: string;                 // 'growth'
    tierRate: number;             // 20% of platform fee
    platformFee: number;          // R25
    amount: number;               // R25 × 0.20 = R5
    paidBy: 'platform';
  };
  
  // Step 4: Total influencer earnings
  influencerTotal: number;        // R20 + R5 = R25
}
```

---

## 🔧 **IMPLEMENTATION PHASES**

### **Phase 0: Data Structure Updates** (Day 1 - Foundation)
**Goal**: Prepare schemas without breaking existing functionality

#### **0.1: Extend Order Schema** ✅ BACKWARD COMPATIBLE

```typescript
// File: src/types/order.ts

// EXISTING (keep as-is)
export interface Order {
  id: string;
  userId: string;
  trackingCode?: string; // KEEP THIS - existing ad tracking
  total: number;
  items: CartItem[];
  // ... existing fields
}

// ADD NEW (optional fields, won't break existing orders)
export interface OrderCommissionDetails {
  // Ad commission (new)
  adAttribution?: {
    adId: string;
    influencerId: string;
    trackingCode: string;
    commissionRate: number;      // 0.20 = 20%
    basePrice: number;            // R100
    commissionAmount: number;     // R20
  };
  
  // Platform commission (new)
  platformAttribution?: {
    influencerId: string;
    tier: string;                 // 'growth'
    tierRate: number;             // 0.20 = 20%
    platformFee: number;          // R25
    commissionAmount: number;     // R5
  };
  
  // Total (new)
  totalInfluencerCommission: number; // R25
  
  // Breakdown per dispensary (for multi-dispensary carts)
  dispensaryBreakdown: {
    [dispensaryId: string]: {
      grossRevenue: number;
      adCommission: number;
      netRevenue: number;
    };
  };
}

// EXTEND Order interface (backward compatible)
export interface Order {
  // ... existing fields
  
  // NEW OPTIONAL FIELD
  commissionDetails?: OrderCommissionDetails; // Optional - old orders won't have it
}
```

**Migration Strategy**:
- Existing orders continue working (no commissionDetails field)
- New orders include commissionDetails
- Analytics handles both old and new format

---

#### **0.2: Extend Influencer Schema** ✅ BACKWARD COMPATIBLE

```typescript
// File: src/types/influencer.ts

// EXISTING earnings structure
export interface InfluencerEarnings {
  available: number;
  pending: number;
  total: number;
}

// NEW enhanced earnings (add as optional)
export interface InfluencerEnhancedEarnings extends InfluencerEarnings {
  // NEW: Breakdown by source
  breakdown?: {
    adCommissions: {
      total: number;
      available: number;
      pending: number;
    };
    platformCommissions: {
      total: number;
      available: number;
      pending: number;
    };
  };
  
  // NEW: By dispensary
  byDispensary?: {
    [dispensaryId: string]: {
      adCommissions: number;
      platformCommissions: number;
      total: number;
    };
  };
}

// Update Influencer interface (backward compatible)
export interface Influencer {
  // ... existing fields
  
  earnings: InfluencerEnhancedEarnings; // Enhanced but still compatible
}
```

**Migration Strategy**:
- Existing influencer data shows simple totals
- New data includes breakdowns
- Analytics aggregates from both formats

---

#### **0.3: Extend Dispensary Schema** ✅ BACKWARD COMPATIBLE

```typescript
// File: src/types.ts (Dispensary interface)

// ADD to existing Dispensary
export interface Dispensary {
  // ... existing fields
  
  // NEW OPTIONAL FIELD
  financials?: {
    revenue: {
      totalSales: number;
      platformFees: number;
      commissionsTotal: number;
      netRevenue: number;
    };
    
    // Commission breakdown
    commissions: {
      adCommissions: {
        total: number;
        byInfluencer: {
          [influencerId: string]: number;
        };
      };
      // Note: Platform commissions paid by platform, not dispensary
    };
  };
}
```

---

#### **0.4: Update Advertisement Schema** ✅ ALREADY CORRECT

```typescript
// File: src/types/advertising.ts

export interface Advertisement {
  // ... existing fields
  
  influencerCommission: {
    availableToInfluencers: boolean;
    rate: number; // ✅ This is what dispensary sets (0.15 - 0.25)
    minInfluencerTier?: string;
  };
  
  // Keep existing analytics
  analytics: {
    impressions: number;
    clicks: number;
    conversions: number;
    revenue: number;
    
    // ADD NEW (optional, backward compatible)
    commissionsDistributed?: number; // Total ad commissions paid
  };
}
```

---

### **Phase 1: Core Commission Service** (Day 2-3 - Foundation Logic)
**Goal**: Create centralized commission calculator

#### **1.1: Create Commission Calculator Service**

```typescript
// File: src/lib/commission-calculator.ts

import { Influencer, Order, Advertisement } from '@/types';

// Tier rates configuration
const PLATFORM_FEE_RATE = 0.25; // 25%
const INFLUENCER_TIER_RATES = {
  seed: 0.10,    // 10% of platform fee
  sprout: 0.15,  // 15%
  growth: 0.20,  // 20%
  bloom: 0.25,   // 25%
  elite: 0.30,   // 30%
};

export interface CommissionCalculationResult {
  customer: {
    subtotal: number;          // R100
    platformFee: number;       // R25
    total: number;             // R125
  };
  
  dispensary: {
    grossRevenue: number;      // R100
    adCommission: number;      // R20 (if ad)
    netRevenue: number;        // R80
  };
  
  platform: {
    grossFee: number;          // R25
    influencerCommission: number; // R5 (tier-based)
    netRevenue: number;        // R20
  };
  
  influencer?: {
    id: string;
    tier: string;
    adCommission: number;      // R20
    platformCommission: number; // R5
    total: number;             // R25
    breakdown: Array<{
      type: 'ad' | 'platform';
      amount: number;
      source: string;
    }>;
  };
}

/**
 * Calculate commissions for a single product purchase
 * @param basePrice - Product price set by dispensary (before 25% fee)
 * @param attribution - How customer found product
 * @param influencer - Influencer data (if attributed)
 * @param ad - Advertisement data (if via ad)
 */
export function calculateProductCommissions(
  basePrice: number,
  attribution: {
    type: 'ad' | 'platform' | 'none';
    influencerId?: string;
    adId?: string;
  },
  influencer?: Influencer,
  ad?: Advertisement
): CommissionCalculationResult {
  
  // Step 1: Calculate customer-facing prices
  const platformFee = basePrice * PLATFORM_FEE_RATE; // R25
  const customerTotal = basePrice + platformFee;     // R125
  
  // Step 2: Initialize result
  const result: CommissionCalculationResult = {
    customer: {
      subtotal: basePrice,
      platformFee: platformFee,
      total: customerTotal
    },
    dispensary: {
      grossRevenue: basePrice,
      adCommission: 0,
      netRevenue: basePrice
    },
    platform: {
      grossFee: platformFee,
      influencerCommission: 0,
      netRevenue: platformFee
    }
  };
  
  // Step 3: Calculate ad commission (if applicable)
  if (attribution.type === 'ad' && ad && influencer && attribution.influencerId) {
    const adCommissionRate = ad.influencerCommission.rate; // e.g., 0.20
    const adCommissionAmount = basePrice * adCommissionRate; // R100 × 0.20 = R20
    
    result.dispensary.adCommission = adCommissionAmount;
    result.dispensary.netRevenue = basePrice - adCommissionAmount; // R80
    
    if (!result.influencer) {
      result.influencer = {
        id: attribution.influencerId,
        tier: influencer.tier,
        adCommission: 0,
        platformCommission: 0,
        total: 0,
        breakdown: []
      };
    }
    
    result.influencer.adCommission = adCommissionAmount;
    result.influencer.breakdown.push({
      type: 'ad',
      amount: adCommissionAmount,
      source: ad.id
    });
  }
  
  // Step 4: Calculate platform commission (if any influencer attribution)
  if (influencer && attribution.influencerId) {
    const tierRate = INFLUENCER_TIER_RATES[influencer.tier as keyof typeof INFLUENCER_TIER_RATES] || 0.20;
    const platformCommissionAmount = platformFee * tierRate; // R25 × 0.20 = R5
    
    result.platform.influencerCommission = platformCommissionAmount;
    result.platform.netRevenue = platformFee - platformCommissionAmount; // R20
    
    if (!result.influencer) {
      result.influencer = {
        id: attribution.influencerId,
        tier: influencer.tier,
        adCommission: 0,
        platformCommission: 0,
        total: 0,
        breakdown: []
      };
    }
    
    result.influencer.platformCommission = platformCommissionAmount;
    result.influencer.breakdown.push({
      type: 'platform',
      amount: platformCommissionAmount,
      source: 'platform'
    });
  }
  
  // Step 5: Calculate influencer total
  if (result.influencer) {
    result.influencer.total = 
      result.influencer.adCommission + result.influencer.platformCommission;
  }
  
  return result;
}

/**
 * Calculate commissions for entire order (may have multiple items/dispensaries)
 */
export function calculateOrderCommissions(
  order: Order,
  influencersMap: Map<string, Influencer>,
  adsMap: Map<string, Advertisement>
): {
  orderTotal: CommissionCalculationResult;
  perDispensary: Map<string, CommissionCalculationResult>;
  perInfluencer: Map<string, {
    adCommissions: number;
    platformCommissions: number;
    total: number;
  }>;
} {
  
  // Aggregate results
  const aggregated = {
    orderTotal: {
      customer: { subtotal: 0, platformFee: 0, total: 0 },
      dispensary: { grossRevenue: 0, adCommission: 0, netRevenue: 0 },
      platform: { grossFee: 0, influencerCommission: 0, netRevenue: 0 }
    } as CommissionCalculationResult,
    perDispensary: new Map<string, CommissionCalculationResult>(),
    perInfluencer: new Map<string, {
      adCommissions: number;
      platformCommissions: number;
      total: number;
    }>()
  };
  
  // Process each item
  order.items.forEach(item => {
    // Determine attribution
    const attribution = determineAttribution(order, item);
    
    // Get influencer and ad data
    const influencer = attribution.influencerId ? 
      influencersMap.get(attribution.influencerId) : undefined;
    const ad = attribution.adId ? adsMap.get(attribution.adId) : undefined;
    
    // Calculate commissions for this item
    const itemCommissions = calculateProductCommissions(
      item.price,
      attribution,
      influencer,
      ad
    );
    
    // Aggregate to order total
    aggregateCommissions(aggregated.orderTotal, itemCommissions);
    
    // Aggregate per dispensary
    if (!aggregated.perDispensary.has(item.dispensaryId)) {
      aggregated.perDispensary.set(item.dispensaryId, {
        customer: { subtotal: 0, platformFee: 0, total: 0 },
        dispensary: { grossRevenue: 0, adCommission: 0, netRevenue: 0 },
        platform: { grossFee: 0, influencerCommission: 0, netRevenue: 0 }
      });
    }
    const dispensaryTotal = aggregated.perDispensary.get(item.dispensaryId)!;
    aggregateCommissions(dispensaryTotal, itemCommissions);
    
    // Aggregate per influencer
    if (itemCommissions.influencer) {
      if (!aggregated.perInfluencer.has(itemCommissions.influencer.id)) {
        aggregated.perInfluencer.set(itemCommissions.influencer.id, {
          adCommissions: 0,
          platformCommissions: 0,
          total: 0
        });
      }
      const influencerTotal = aggregated.perInfluencer.get(itemCommissions.influencer.id)!;
      influencerTotal.adCommissions += itemCommissions.influencer.adCommission;
      influencerTotal.platformCommissions += itemCommissions.influencer.platformCommission;
      influencerTotal.total += itemCommissions.influencer.total;
    }
  });
  
  return aggregated;
}

// Helper: Determine attribution source
function determineAttribution(order: Order, item: CartItem): {
  type: 'ad' | 'platform' | 'none';
  influencerId?: string;
  adId?: string;
} {
  // Priority 1: Ad tracking code
  if (order.trackingCode?.startsWith('AD-')) {
    const parts = order.trackingCode.split('-');
    return {
      type: 'ad',
      adId: `${parts[0]}-${parts[1]}`, // AD-123
      influencerId: `${parts[2]}-${parts[3]}` // INF-xyz
    };
  }
  
  // Priority 2: Platform referral (stored in user)
  if (order.userId) {
    // Would need to fetch user.referredBy
    // For now, check if order has metadata
    if ((order as any).referredBy) {
      return {
        type: 'platform',
        influencerId: (order as any).referredBy
      };
    }
  }
  
  // Priority 3: No attribution
  return { type: 'none' };
}

// Helper: Aggregate commission results
function aggregateCommissions(
  target: CommissionCalculationResult,
  source: CommissionCalculationResult
): void {
  target.customer.subtotal += source.customer.subtotal;
  target.customer.platformFee += source.customer.platformFee;
  target.customer.total += source.customer.total;
  
  target.dispensary.grossRevenue += source.dispensary.grossRevenue;
  target.dispensary.adCommission += source.dispensary.adCommission;
  target.dispensary.netRevenue += source.dispensary.netRevenue;
  
  target.platform.grossFee += source.platform.grossFee;
  target.platform.influencerCommission += source.platform.influencerCommission;
  target.platform.netRevenue += source.platform.netRevenue;
}
```

---

#### **1.2: Update Order Creation** ✅ BACKWARD COMPATIBLE

```typescript
// File: src/lib/order-service.ts

import { calculateOrderCommissions } from './commission-calculator';

export async function createOrder(orderData: CreateOrderInput): Promise<Order> {
  // EXISTING order creation logic (keep as-is)
  const order: Order = {
    id: generateOrderId(),
    userId: orderData.userId,
    items: orderData.items,
    total: calculateTotal(orderData.items),
    trackingCode: orderData.trackingCode, // Keep existing tracking
    // ... other existing fields
  };
  
  // NEW: Calculate commissions (only for new orders)
  if (orderData.trackingCode) {
    try {
      // Fetch necessary data
      const influencersMap = await fetchRelevantInfluencers(order);
      const adsMap = await fetchRelevantAds(order);
      
      // Calculate commissions
      const commissions = calculateOrderCommissions(order, influencersMap, adsMap);
      
      // Add commission details to order
      order.commissionDetails = {
        totalInfluencerCommission: commissions.orderTotal.influencer?.total || 0,
        dispensaryBreakdown: {},
        // ... populate from commissions object
      };
    } catch (error) {
      console.error('Commission calculation failed:', error);
      // Continue without commission details (graceful degradation)
    }
  }
  
  // Save order (works with or without commissionDetails)
  await saveOrder(order);
  
  return order;
}
```

---

### **Phase 2: Cloud Function Updates** (Day 4-5 - Backend Logic)
**Goal**: Update conversion tracking to handle dual commissions

#### **2.1: Update trackAdConversion Function** ✅ CRITICAL

```typescript
// File: functions/src/advertising.ts

export const trackAdConversion = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    const order = snap.data() as Order;
    
    // EXISTING: Check for tracking code
    if (!order.trackingCode) {
      console.log('No tracking code, skipping conversion tracking');
      return null;
    }
    
    // EXISTING: Parse tracking code
    const trackingParts = order.trackingCode.split('-');
    if (trackingParts.length !== 4 || trackingParts[0] !== 'AD') {
      console.log('Invalid tracking code format');
      return null;
    }
    
    const adId = `${trackingParts[0]}-${trackingParts[1]}`;
    const influencerId = `${trackingParts[2]}-${trackingParts[3]}`;
    
    // EXISTING: Fetch ad and influencer
    const adDoc = await admin.firestore()
      .collection('advertisements')
      .doc(adId)
      .get();
    
    if (!adDoc.exists) {
      console.log('Ad not found');
      return null;
    }
    
    const ad = adDoc.data() as Advertisement;
    const influencerDoc = await admin.firestore()
      .collection('influencers')
      .doc(influencerId)
      .get();
    
    if (!influencerDoc.exists) {
      console.log('Influencer not found');
      return null;
    }
    
    const influencer = influencerDoc.data() as Influencer;
    
    // NEW: Calculate dual commissions using service
    const commissions = calculateProductCommissions(
      order.total / 1.25, // Remove platform fee to get base
      { type: 'ad', influencerId, adId },
      influencer,
      ad
    );
    
    // NEW: Record AD commission (paid by dispensary)
    const adCommission = commissions.influencer?.adCommission || 0;
    
    // NEW: Record PLATFORM commission (paid by platform)
    const platformCommission = commissions.influencer?.platformCommission || 0;
    
    // NEW: Total influencer earnings
    const totalCommission = commissions.influencer?.total || 0;
    
    // EXISTING: Update influencer earnings (ENHANCED)
    await admin.firestore()
      .collection('influencers')
      .doc(influencerId)
      .update({
        'earnings.total': admin.firestore.FieldValue.increment(totalCommission),
        'earnings.pending': admin.firestore.FieldValue.increment(totalCommission),
        
        // NEW: Breakdown by type
        'earnings.breakdown.adCommissions.total': admin.firestore.FieldValue.increment(adCommission),
        'earnings.breakdown.adCommissions.pending': admin.firestore.FieldValue.increment(adCommission),
        'earnings.breakdown.platformCommissions.total': admin.firestore.FieldValue.increment(platformCommission),
        'earnings.breakdown.platformCommissions.pending': admin.firestore.FieldValue.increment(platformCommission),
        
        // NEW: By dispensary
        [`earnings.byDispensary.${ad.dispensaryId}.adCommissions`]: admin.firestore.FieldValue.increment(adCommission),
        [`earnings.byDispensary.${ad.dispensaryId}.total`]: admin.firestore.FieldValue.increment(totalCommission),
      });
    
    // EXISTING: Update ad analytics (ENHANCED)
    await admin.firestore()
      .collection('advertisements')
      .doc(adId)
      .update({
        'analytics.conversions': admin.firestore.FieldValue.increment(1),
        'analytics.revenue': admin.firestore.FieldValue.increment(order.total),
        
        // NEW: Track commissions distributed
        'analytics.commissionsDistributed': admin.firestore.FieldValue.increment(totalCommission),
      });
    
    // EXISTING: Update influencer ad selection performance
    const selectionQuery = await admin.firestore()
      .collection('influencerAdSelections')
      .where('adId', '==', adId)
      .where('influencerId', '==', influencerId)
      .where('status', '==', 'active')
      .limit(1)
      .get();
    
    if (!selectionQuery.empty) {
      await selectionQuery.docs[0].ref.update({
        'performance.conversions': admin.firestore.FieldValue.increment(1),
        'performance.revenue': admin.firestore.FieldValue.increment(order.total),
        'performance.commission': admin.firestore.FieldValue.increment(totalCommission),
      });
    }
    
    // NEW: Record conversion event with breakdown
    await admin.firestore()
      .collection('adConversions')
      .add({
        adId,
        influencerId,
        orderId: context.params.orderId,
        trackingCode: order.trackingCode,
        dispensaryId: ad.dispensaryId,
        orderTotal: order.total,
        basePrice: commissions.customer.subtotal,
        
        // NEW: Commission breakdown
        commissions: {
          ad: {
            rate: ad.influencerCommission.rate,
            amount: adCommission,
            paidBy: 'dispensary'
          },
          platform: {
            tier: influencer.tier,
            rate: INFLUENCER_TIER_RATES[influencer.tier],
            amount: platformCommission,
            paidBy: 'platform'
          },
          total: totalCommission
        },
        
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    console.log(`Conversion tracked: Order ${context.params.orderId}, Total commission: R${totalCommission}`);
    return null;
  });
```

---

### **Phase 3: Analytics Dashboard Updates** (Day 6-8 - UI Updates)
**Goal**: Update all dashboards to show dual commissions

#### **3.1: Influencer Analytics Dashboard**

```typescript
// File: src/app/dashboard/influencer/analytics/page.tsx

export default function InfluencerAnalyticsPage() {
  const { currentUser } = useAuth();
  const [earnings, setEarnings] = useState<InfluencerEnhancedEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchEarnings = async () => {
      if (!currentUser?.influencerId) return;
      
      const influencerDoc = await getDoc(
        doc(db, 'influencers', currentUser.influencerId)
      );
      
      if (influencerDoc.exists()) {
        setEarnings(influencerDoc.data().earnings);
      }
      setLoading(false);
    };
    
    fetchEarnings();
  }, [currentUser]);
  
  if (loading) return <LoadingSkeleton />;
  
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Your Earnings"
        text="Track your commission breakdown"
      />
      
      {/* Total Earnings Card */}
      <Card>
        <CardHeader>
          <CardTitle>Total Earnings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold">
            R{earnings?.total.toFixed(2) || '0.00'}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="text-2xl font-semibold text-green-600">
                R{earnings?.available.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-semibold text-yellow-600">
                R{earnings?.pending.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* NEW: Commission Breakdown */}
      {earnings?.breakdown && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Breakdown</CardTitle>
            <CardDescription>
              How you earn: Ad promotions vs Platform referrals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Ad Commissions */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500">
                    <Megaphone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Ad Commissions</h4>
                    <p className="text-sm text-muted-foreground">
                      From promoting specific ads
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    R{earnings.breakdown.adCommissions.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available: R{earnings.breakdown.adCommissions.available.toFixed(2)}
                  </p>
                </div>
              </div>
              
              {/* Platform Commissions */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Platform Commissions</h4>
                    <p className="text-sm text-muted-foreground">
                      Tier-based share of platform fees
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">
                    R{earnings.breakdown.platformCommissions.total.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Available: R{earnings.breakdown.platformCommissions.available.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Chart: Commission composition */}
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={[
                      { 
                        name: 'Ad Commissions', 
                        value: earnings.breakdown.adCommissions.total,
                        fill: '#a855f7'
                      },
                      { 
                        name: 'Platform Commissions', 
                        value: earnings.breakdown.platformCommissions.total,
                        fill: '#10b981'
                      }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    dataKey="value"
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* NEW: Earnings by Dispensary */}
      {earnings?.byDispensary && (
        <Card>
          <CardHeader>
            <CardTitle>Earnings by Dispensary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(earnings.byDispensary).map(([dispensaryId, data]) => (
                <div key={dispensaryId} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{/* Dispensary name */}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                      <span>Ad: R{data.adCommissions.toFixed(2)}</span>
                      <span>Platform: R{data.platformCommissions?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                  <p className="text-lg font-semibold">
                    R{data.total.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

#### **3.2: Dispensary Analytics Dashboard**

```typescript
// File: src/app/dispensary-admin/analytics/page.tsx

export default function DispensaryAnalyticsPage() {
  const { currentDispensary } = useAuth();
  const [financials, setFinancials] = useState<DispensaryFinancials | null>(null);
  
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Financial Overview"
        text="Track your revenue and commissions"
      />
      
      {/* Revenue Card */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Gross Sales */}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gross Sales</span>
              <span className="text-2xl font-bold">
                R{financials?.revenue.totalSales.toFixed(2)}
              </span>
            </div>
            
            <Separator />
            
            {/* Deductions */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  - Platform Fees (25%)
                </span>
                <span className="text-red-600">
                  -R{financials?.revenue.platformFees.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">
                  - Ad Commissions (to influencers)
                </span>
                <span className="text-red-600">
                  -R{financials?.commissions.adCommissions.total.toFixed(2)}
                </span>
              </div>
            </div>
            
            <Separator />
            
            {/* Net Revenue */}
            <div className="flex justify-between items-center">
              <span className="font-semibold">Net Revenue</span>
              <span className="text-2xl font-bold text-green-600">
                R{financials?.revenue.netRevenue.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* NEW: Commission Details */}
      <Card>
        <CardHeader>
          <CardTitle>Influencer Commission Breakdown</CardTitle>
          <CardDescription>
            Commissions you've paid to influencers for promoting your ads
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Ad</TableHead>
                <TableHead>Sales Generated</TableHead>
                <TableHead>Commission Rate</TableHead>
                <TableHead className="text-right">Commission Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Map through influencer commissions */}
              {Object.entries(financials?.commissions.adCommissions.byInfluencer || {}).map(
                ([influencerId, amount]) => (
                  <TableRow key={influencerId}>
                    <TableCell>{/* Influencer name */}</TableCell>
                    <TableCell>{/* Ad title */}</TableCell>
                    <TableCell>R{/* Sales amount */}</TableCell>
                    <TableCell>20%</TableCell>
                    <TableCell className="text-right font-semibold">
                      R{amount.toFixed(2)}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
          
          <div className="mt-4 flex justify-end">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Ad Commissions Paid</p>
              <p className="text-2xl font-bold">
                R{financials?.commissions.adCommissions.total.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

#### **3.3: Super Admin Financial Hub**

```typescript
// File: src/app/admin/dashboard/financial-hub/page.tsx

export default function SuperAdminFinancialHub() {
  const [platformMetrics, setPlatformMetrics] = useState<PlatformFinancials | null>(null);
  
  return (
    <div className="space-y-6">
      <PageHeader
        heading="Platform Financial Hub"
        text="Complete revenue and commission tracking"
      />
      
      {/* Platform Revenue Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total GMV
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{platformMetrics?.totalGMV.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross Merchandise Value
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Platform Fees
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R{platformMetrics?.platformFeesCollected.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              25% of all sales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Influencer Commissions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              -R{platformMetrics?.totalInfluencerCommissions.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Platform paid: R{platformMetrics?.platformPaidCommissions.toFixed(2)}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Net Revenue
            </CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R{platformMetrics?.platformNetRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              After all commissions
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* NEW: Commission Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Breakdown</CardTitle>
          <CardDescription>
            Platform vs Dispensary commission payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Ad Commissions (paid by dispensaries) */}
              <div className="p-4 border rounded-lg bg-purple-50">
                <div className="flex items-center gap-2 mb-2">
                  <Megaphone className="h-5 w-5 text-purple-600" />
                  <h4 className="font-semibold">Ad Commissions</h4>
                </div>
                <p className="text-2xl font-bold text-purple-600">
                  R{platformMetrics?.breakdown.adCommissions.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Paid by dispensaries to influencers
                </p>
              </div>
              
              {/* Platform Commissions (paid by platform) */}
              <div className="p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">Platform Commissions</h4>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  R{platformMetrics?.breakdown.platformCommissions.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Paid by platform from 25% fees
                </p>
              </div>
            </div>
            
            {/* Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformMetrics?.commissionTrend || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="adCommissions" name="Ad Commissions" fill="#a855f7" />
                <Bar dataKey="platformCommissions" name="Platform Commissions" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Top Earning Influencers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Earning Influencers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Ad Commissions</TableHead>
                <TableHead>Platform Commissions</TableHead>
                <TableHead className="text-right">Total Earned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Map through top influencers */}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### **Phase 4: Payout Management Updates** (Day 9-10 - Payment Processing)
**Goal**: Handle payout requests with commission breakdowns

#### **4.1: Enhanced Payout Request**

```typescript
// File: src/app/dashboard/influencer/payouts/page.tsx

export default function InfluencerPayoutsPage() {
  const { currentUser } = useAuth();
  const [earnings, setEarnings] = useState<InfluencerEnhancedEarnings | null>(null);
  const [requestAmount, setRequestAmount] = useState<number>(0);
  
  const handlePayoutRequest = async () => {
    if (!currentUser?.influencerId || requestAmount < 500) {
      toast.error('Minimum payout is R500');
      return;
    }
    
    // NEW: Create payout request with breakdown
    const payoutRequest = {
      influencerId: currentUser.influencerId,
      amount: requestAmount,
      
      // NEW: Commission breakdown
      breakdown: {
        adCommissions: Math.min(
          requestAmount,
          earnings?.breakdown?.adCommissions.available || 0
        ),
        platformCommissions: Math.min(
          requestAmount - (earnings?.breakdown?.adCommissions.available || 0),
          earnings?.breakdown?.platformCommissions.available || 0
        )
      },
      
      status: 'pending',
      requestedAt: new Date(),
    };
    
    // Save request
    await addDoc(collection(db, 'payoutRequests'), payoutRequest);
    
    // Update influencer available balance
    await updateDoc(doc(db, 'influencers', currentUser.influencerId), {
      'earnings.available': increment(-requestAmount),
      'earnings.breakdown.adCommissions.available': increment(
        -payoutRequest.breakdown.adCommissions
      ),
      'earnings.breakdown.platformCommissions.available': increment(
        -payoutRequest.breakdown.platformCommissions
      ),
    });
    
    toast.success('Payout request submitted!');
  };
  
  return (
    <div className="space-y-6">
      {/* Payout Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Payout</CardTitle>
          <CardDescription>
            Available: R{earnings?.available.toFixed(2)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label>Amount (Minimum R500)</Label>
              <Input
                type="number"
                value={requestAmount}
                onChange={(e) => setRequestAmount(Number(e.target.value))}
                max={earnings?.available || 0}
              />
            </div>
            
            {/* NEW: Breakdown Preview */}
            {requestAmount > 0 && earnings?.breakdown && (
              <div className="p-3 border rounded-lg bg-muted">
                <h4 className="text-sm font-semibold mb-2">Payout Breakdown</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Ad Commissions:</span>
                    <span className="font-semibold">
                      R{Math.min(requestAmount, earnings.breakdown.adCommissions.available).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Commissions:</span>
                    <span className="font-semibold">
                      R{Math.min(
                        requestAmount - earnings.breakdown.adCommissions.available,
                        earnings.breakdown.platformCommissions.available
                      ).toFixed(2)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>R{requestAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              onClick={handlePayoutRequest}
              disabled={requestAmount < 500 || requestAmount > (earnings?.available || 0)}
            >
              Request Payout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

#### **4.2: Super Admin Payout Management**

```typescript
// File: src/app/admin/dashboard/dispensary-payouts/page.tsx

export default function SuperAdminPayoutsPage() {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  
  const approvePayout = async (request: PayoutRequest) => {
    // Process payout
    // ...
    
    // NEW: Track which commissions were paid out
    await addDoc(collection(db, 'payoutHistory'), {
      requestId: request.id,
      influencerId: request.influencerId,
      amount: request.amount,
      
      // NEW: Breakdown
      breakdown: request.breakdown,
      
      processedAt: new Date(),
      processedBy: currentUser?.uid,
    });
    
    toast.success('Payout approved and processed');
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Pending Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Influencer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Ad Commissions</TableHead>
                <TableHead>Platform Commissions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payoutRequests.map(request => (
                <TableRow key={request.id}>
                  <TableCell>{/* Influencer name */}</TableCell>
                  <TableCell className="font-semibold">
                    R{request.amount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R{request.breakdown.adCommissions.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    R{request.breakdown.platformCommissions.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button onClick={() => approvePayout(request)}>
                      Approve
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### **Phase 5: Social Integration** (Day 11-13 - Final Integration)
**Goal**: Connect social sharing with commission tracking

#### **5.1: Extend Social Share Hub**

```typescript
// File: src/components/social-share/SocialShareHub.tsx

// ADD new tab for sharing ads
<TabsList>
  <TabsTrigger value="share">Share Store</TabsTrigger>
  <TabsTrigger value="ads">Share Ads</TabsTrigger> {/* NEW */}
  <TabsTrigger value="analytics">Analytics</TabsTrigger>
  {/* ... rest */}
</TabsList>

<TabsContent value="ads">
  <Card>
    <CardHeader>
      <CardTitle>Share Your Ads</CardTitle>
      <CardDescription>
        Promote your advertising campaigns across social platforms.
        Influencers earn commissions when they promote your ads!
      </CardDescription>
    </CardHeader>
    <CardContent>
      {/* Display active ads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {myAds.map(ad => (
          <Card key={ad.id}>
            <CardHeader>
              <CardTitle>{ad.title}</CardTitle>
              <div className="flex gap-2">
                <Badge>{ad.type}</Badge>
                <Badge variant="secondary">
                  {ad.influencerCommission.rate * 100}% Commission
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {ad.description}
              </p>
              <Button
                onClick={() => shareAd(ad)}
                className="w-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share This Ad
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </CardContent>
  </Card>
</TabsContent>
```

---

## 📊 **TESTING STRATEGY**

### **Test Scenarios**

#### **Scenario 1: Simple Ad Commission**
```
Given: Influencer promotes ad (20% commission)
When: Customer purchases R100 product
Then:
  - Customer pays: R125
  - Dispensary gets: R80
  - Platform gets: R20
  - Influencer gets: R25 (R20 ad + R5 platform)
```

#### **Scenario 2: Platform Referral Only**
```
Given: User signed up via influencer referral
When: Customer purchases R100 product
Then:
  - Customer pays: R125
  - Dispensary gets: R100
  - Platform gets: R20
  - Influencer gets: R5 (platform only)
```

#### **Scenario 3: Multi-Dispensary Cart**
```
Given: Cart with 3 items from 3 dispensaries
When: 1 ad-tracked, 1 platform referral, 1 direct
Then: Correct commission split per item
```

#### **Scenario 4: Backward Compatibility**
```
Given: Existing order without commissionDetails
When: View in analytics
Then: Display gracefully with legacy data
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

### **Pre-Deployment**
- [ ] All TypeScript interfaces updated
- [ ] Commission calculator service tested
- [ ] Cloud Functions deployed to staging
- [ ] Database migrations (optional fields added)
- [ ] Analytics dashboards tested
- [ ] Payout flow tested

### **Deployment**
- [ ] Deploy schema updates (backward compatible)
- [ ] Deploy commission calculator service
- [ ] Deploy Cloud Functions
- [ ] Deploy UI updates
- [ ] Monitor for errors
- [ ] Verify existing functionality intact

### **Post-Deployment**
- [ ] Test with real data
- [ ] Verify old orders still display correctly
- [ ] Verify new orders calculate commissions
- [ ] Monitor analytics dashboards
- [ ] Test payout requests
- [ ] Gather user feedback

---

## ⚠️ **CRITICAL SAFEGUARDS**

### **1. Backward Compatibility**
```typescript
// Always check if new fields exist before using
if (order.commissionDetails) {
  // Use new structure
  const commission = order.commissionDetails.totalInfluencerCommission;
} else {
  // Use legacy calculation
  const commission = calculateLegacyCommission(order);
}
```

### **2. Graceful Degradation**
```typescript
// If commission calculation fails, continue order processing
try {
  const commissions = calculateOrderCommissions(...);
  order.commissionDetails = commissions;
} catch (error) {
  console.error('Commission calculation failed:', error);
  // Order still succeeds without commission details
}
```

### **3. Data Validation**
```typescript
// Validate commission percentages
function validateCommissionRate(rate: number): boolean {
  return rate >= 0.15 && rate <= 0.25; // 15-25%
}
```

### **4. Financial Accuracy**
```typescript
// Always use precise math for money
import Decimal from 'decimal.js';

const basePrice = new Decimal(100);
const platformFee = basePrice.times(0.25);
const customerTotal = basePrice.plus(platformFee);
```

---

## 📈 **SUCCESS METRICS**

### **Week 1 Post-Launch**
- [ ] 100+ orders with new commission structure
- [ ] 0 calculation errors
- [ ] 0 payout discrepancies
- [ ] Positive influencer feedback
- [ ] Positive dispensary owner feedback

### **Month 1 Post-Launch**
- [ ] 1000+ orders processed
- [ ] 50+ influencers actively promoting ads
- [ ] 20% increase in influencer earnings
- [ ] 15% increase in ad conversions
- [ ] Super admin financial hub shows accurate data

---

## 🎉 **FINAL SUMMARY**

This implementation plan:

✅ **Preserves existing functionality** - Backward compatible schemas  
✅ **Adds dual commissions** - Ad + Platform stacking  
✅ **Updates analytics** - All dashboards show breakdowns  
✅ **Enhances payouts** - Clear commission source tracking  
✅ **Integrates social** - Share ads via Social Hub  
✅ **Maintains accuracy** - Precise financial calculations  
✅ **Customer simplicity** - Only see final price  
✅ **Role-based visibility** - Commissions hidden from customers  

**Estimated Timeline**: 13 days (2 weeks + 1 day buffer)

**Risk Level**: ⚠️ LOW - All changes backward compatible

**Recommended Approach**: Implement phases sequentially, test after each phase

---

**Ready to start Phase 0? 🚀**
