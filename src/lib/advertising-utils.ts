import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  serverTimestamp,
  increment
} from 'firebase/firestore';
import type { 
  Advertisement, 
  AdImpression, 
  AdClick, 
  AdConversion,
  InfluencerAdSelection 
} from '@/types/advertising';

// ============== AD CREATION & MANAGEMENT ==============

/**
 * Generate a unique tracking code for influencer ad selection
 */
export function generateTrackingCode(adId: string, influencerId: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `AD${adId.substring(0, 6)}-INF${influencerId.substring(0, 6)}-${timestamp}${random}`.toUpperCase();
}

/**
 * Generate tracking URL with parameters
 */
export function generateTrackingUrl(
  adId: string, 
  influencerId: string, 
  trackingCode: string,
  baseUrl?: string
): string {
  const base = baseUrl || window.location.origin;
  return `${base}/ad/${adId}?ref=${influencerId}&track=${trackingCode}`;
}

/**
 * Calculate bundle savings
 */
export function calculateBundleSavings(originalPrice: number, bundlePrice: number) {
  const savings = originalPrice - bundlePrice;
  const discountPercent = Math.round((savings / originalPrice) * 100);
  return {
    savings,
    discountPercent,
    discountAmount: savings,
    savingsText: `Save R${savings.toFixed(2)}!`
  };
}

/**
 * Calculate ad performance score (0-100)
 */
export function calculateAdPerformanceScore(analytics: Advertisement['analytics']): number {
  const ctrWeight = 0.3;
  const conversionWeight = 0.4;
  const roiWeight = 0.3;
  
  // Normalize CTR (assume 5% is excellent)
  const normalizedCTR = Math.min(analytics.ctr / 5, 1) * 100;
  
  // Normalize conversion rate (assume 2% is excellent)
  const normalizedConversion = Math.min(analytics.conversionRate / 2, 1) * 100;
  
  // Normalize ROI (assume 500% is excellent)
  const normalizedROI = Math.min(analytics.roi / 500, 1) * 100;
  
  const score = 
    (normalizedCTR * ctrWeight) +
    (normalizedConversion * conversionWeight) +
    (normalizedROI * roiWeight);
  
  return Math.round(score);
}

/**
 * Get performance badge based on score
 */
export function getPerformanceBadge(score: number): {
  level: string;
  color: string;
  icon: string;
  name: string;
} {
  if (score >= 90) return { 
    level: 'diamond', 
    color: 'from-cyan-400 to-blue-500', 
    icon: '💎', 
    name: 'Diamond' 
  };
  if (score >= 75) return { 
    level: 'platinum', 
    color: 'from-purple-400 to-pink-500', 
    icon: '🏆', 
    name: 'Platinum' 
  };
  if (score >= 60) return { 
    level: 'gold', 
    color: 'from-yellow-400 to-orange-500', 
    icon: '🥇', 
    name: 'Gold' 
  };
  if (score >= 40) return { 
    level: 'silver', 
    color: 'from-gray-300 to-gray-400', 
    icon: '🥈', 
    name: 'Silver' 
  };
  return { 
    level: 'bronze', 
    color: 'from-orange-600 to-orange-700', 
    icon: '🥉', 
    name: 'Bronze' 
  };
}

/**
 * Format large numbers for display
 */
export function formatMetricNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Calculate time remaining for ad campaign
 */
export function getTimeRemaining(endDate: Timestamp): {
  days: number;
  hours: number;
  minutes: number;
  isExpiring: boolean;
  text: string;
} {
  const now = Date.now();
  const end = endDate.toMillis();
  const diff = end - now;
  
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpiring: true, text: 'Ended' };
  }
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  const isExpiring = days === 0 && hours < 24;
  
  let text = '';
  if (days > 0) text = `${days}d ${hours}h`;
  else if (hours > 0) text = `${hours}h ${minutes}m`;
  else text = `${minutes}m`;
  
  return { days, hours, minutes, isExpiring, text };
}

// ============== FIRESTORE OPERATIONS ==============

/**
 * Fetch active ads for a specific placement
 */
export async function fetchActiveAdsForPlacement(
  placement: string,
  dispensaryId?: string,
  limitCount: number = 5
): Promise<Advertisement[]> {
  try {
    const now = Timestamp.now();
    
    let q = query(
      collection(db, 'advertisements'),
      where('status', '==', 'active'),
      where('placements', 'array-contains', placement),
      where('startDate', '<=', now),
      where('isActive', '==', true),
      orderBy('priority', 'desc'),
      limit(limitCount)
    );
    
    // If dispensaryId provided, filter by it
    if (dispensaryId) {
      q = query(
        collection(db, 'advertisements'),
        where('status', '==', 'active'),
        where('dispensaryId', '==', dispensaryId),
        where('placements', 'array-contains', placement),
        where('startDate', '<=', now),
        where('isActive', '==', true),
        orderBy('priority', 'desc'),
        limit(limitCount)
      );
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Advertisement));
  } catch (error) {
    console.error('Error fetching ads:', error);
    return [];
  }
}

/**
 * Fetch ads available for influencers to promote
 */
export async function fetchInfluencerMarketplaceAds(
  filters?: {
    dispensaryTypes?: string[];
    minCommissionRate?: number;
    searchQuery?: string;
  }
): Promise<Advertisement[]> {
  try {
    const now = Timestamp.now();
    
    let q = query(
      collection(db, 'advertisements'),
      where('status', '==', 'active'),
      where('availableToInfluencers', '==', true),
      where('startDate', '<=', now),
      orderBy('analytics.impressions', 'desc'),
      limit(50)
    );
    
    const snapshot = await getDocs(q);
    let ads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Advertisement));
    
    // Client-side filtering
    if (filters?.minCommissionRate) {
      ads = ads.filter(ad => 
        ad.influencerCommission.enabled && 
        (ad.influencerCommission.displayRate || ad.influencerCommission.adBonusRate) >= (filters.minCommissionRate || 0)
      );
    }
    
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      ads = ads.filter(ad => 
        ad.title.toLowerCase().includes(query) ||
        ad.description.toLowerCase().includes(query) ||
        ad.dispensaryName?.toLowerCase().includes(query)
      );
    }
    
    return ads;
  } catch (error) {
    console.error('Error fetching marketplace ads:', error);
    return [];
  }
}

/**
 * Track ad impression
 */
export async function trackAdImpression(
  adId: string,
  placement: string,
  influencerId?: string,
  trackingCode?: string
): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    const impression: Partial<AdImpression> = {
      adId,
      sessionId,
      placement: placement as any,
      pageUrl: window.location.href,
      referrer: document.referrer,
      deviceType: getDeviceType(),
      timestamp: serverTimestamp() as any,
      interacted: false,
      influencerId,
      trackingCode
    };
    
    // Add impression to Firestore
    await addDoc(collection(db, 'adImpressions'), impression);
    
    // Update ad analytics
    const adRef = doc(db, 'advertisements', adId);
    await updateDoc(adRef, {
      'analytics.impressions': increment(1)
    });
    
    // If influencer-attributed, update their selection
    if (influencerId && trackingCode) {
      const selectionQuery = query(
        collection(db, 'influencerAdSelections'),
        where('trackingCode', '==', trackingCode),
        limit(1)
      );
      const selectionSnapshot = await getDocs(selectionQuery);
      
      if (!selectionSnapshot.empty) {
        const selectionRef = selectionSnapshot.docs[0].ref;
        await updateDoc(selectionRef, {
          'performance.impressions': increment(1),
          lastActivityAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error tracking impression:', error);
  }
}

/**
 * Track ad click
 */
export async function trackAdClick(
  adId: string,
  destination: string,
  influencerId?: string,
  trackingCode?: string
): Promise<void> {
  try {
    const sessionId = getSessionId();
    
    const click: Partial<AdClick> = {
      adId,
      sessionId,
      clickedElement: 'cta_button',
      destination,
      placement: 'hero_banner' as any, // Would be dynamic
      pageUrl: window.location.href,
      deviceType: getDeviceType(),
      timestamp: serverTimestamp() as any,
      influencerId,
      trackingCode
    };
    
    // Add click to Firestore
    await addDoc(collection(db, 'adClicks'), click);
    
    // Update ad analytics
    const adRef = doc(db, 'advertisements', adId);
    const adDoc = await getDoc(adRef);
    const impressions = adDoc.data()?.analytics?.impressions || 1;
    const clicks = (adDoc.data()?.analytics?.clicks || 0) + 1;
    const ctr = (clicks / impressions) * 100;
    
    await updateDoc(adRef, {
      'analytics.clicks': increment(1),
      'analytics.ctr': ctr
    });
    
    // If influencer-attributed, update their selection
    if (influencerId && trackingCode) {
      const selectionQuery = query(
        collection(db, 'influencerAdSelections'),
        where('trackingCode', '==', trackingCode),
        limit(1)
      );
      const selectionSnapshot = await getDocs(selectionQuery);
      
      if (!selectionSnapshot.empty) {
        const selectionRef = selectionSnapshot.docs[0].ref;
        await updateDoc(selectionRef, {
          'performance.clicks': increment(1),
          lastActivityAt: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

/**
 * Influencer selects an ad to promote (MARKETPLACE FEATURE!)
 */
export async function influencerSelectAd(
  adId: string,
  influencerId: string,
  influencerName: string,
  influencerTier: string
): Promise<InfluencerAdSelection | null> {
  try {
    // Get the ad details
    const adDoc = await getDoc(doc(db, 'advertisements', adId));
    if (!adDoc.exists()) {
      throw new Error('Ad not found');
    }
    
    const ad = { id: adDoc.id, ...adDoc.data() } as Advertisement;
    
    // Check if influencer already selected this ad
    const existingSelection = query(
      collection(db, 'influencerAdSelections'),
      where('influencerId', '==', influencerId),
      where('adId', '==', adId),
      limit(1)
    );
    const existingSnapshot = await getDocs(existingSelection);
    
    if (!existingSnapshot.empty) {
      return {
        id: existingSnapshot.docs[0].id,
        ...existingSnapshot.docs[0].data()
      } as InfluencerAdSelection;
    }
    
    // Generate unique tracking
    const trackingCode = generateTrackingCode(adId, influencerId);
    const trackingUrl = generateTrackingUrl(adId, influencerId, trackingCode);
    
    // Create selection
    const selection: Partial<InfluencerAdSelection> = {
      influencerId,
      influencerName,
      influencerTier,
      adId,
      adTitle: ad.title,
      dispensaryId: ad.dispensaryId!,
      dispensaryName: ad.dispensaryName!,
      uniqueTrackingCode: trackingCode,
      trackingUrl,
      selectedAt: serverTimestamp() as any,
      status: 'active',
      commissionRate: ad.influencerCommission.displayRate || ad.influencerCommission.adBonusRate,
      performance: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        revenue: 0,
        baseCommission: 0,
        adBonus: 0,
        totalCommission: 0,
        pendingCommission: 0,
        paidCommission: 0
      },
      shareCount: 0,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    };
    
    const selectionRef = await addDoc(collection(db, 'influencerAdSelections'), selection);
    
    // Update ad with influencer selection
    await updateDoc(doc(db, 'advertisements', adId), {
      selectedByInfluencers: increment(1),
      updatedAt: serverTimestamp()
    });
    
    return {
      id: selectionRef.id,
      ...selection
    } as InfluencerAdSelection;
  } catch (error) {
    console.error('Error selecting ad:', error);
    return null;
  }
}

/**
 * Get influencer's selected ads
 */
export async function getInfluencerSelectedAds(
  influencerId: string
): Promise<InfluencerAdSelection[]> {
  try {
    const q = query(
      collection(db, 'influencerAdSelections'),
      where('influencerId', '==', influencerId),
      where('status', '==', 'active'),
      orderBy('selectedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as InfluencerAdSelection));
  } catch (error) {
    console.error('Error fetching selected ads:', error);
    return [];
  }
}

// ============== HELPER FUNCTIONS ==============

/**
 * Get or create session ID
 */
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('ad_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem('ad_session_id', sessionId);
  }
  return sessionId;
}

/**
 * Detect device type
 */
function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Export analytics to CSV
 */
export function exportAdAnalyticsToCSV(ads: Advertisement[]): void {
  const headers = [
    'Ad Title',
    'Status',
    'Type',
    'Impressions',
    'Clicks',
    'CTR',
    'Conversions',
    'Conversion Rate',
    'Revenue',
    'ROI',
    'Influencer Sales',
    'Created'
  ];
  
  const rows = ads.map(ad => [
    ad.title,
    ad.status,
    ad.type,
    ad.analytics.impressions,
    ad.analytics.clicks,
    `${ad.analytics.ctr.toFixed(2)}%`,
    ad.analytics.conversions,
    `${ad.analytics.conversionRate.toFixed(2)}%`,
    `R${ad.analytics.revenue.toFixed(2)}`,
    `${ad.analytics.roi.toFixed(0)}%`,
    `R${ad.analytics.influencerRevenue.toFixed(2)}`,
    new Date(ad.createdAt.toMillis()).toLocaleDateString()
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ad-analytics-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
