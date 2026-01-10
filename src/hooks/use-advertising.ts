import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  doc,
  getDoc,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import type { Advertisement, InfluencerAdSelection, AdMarketplaceFilters } from '@/types/advertising';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to fetch ads for a dispensary owner
 */
export function useDispensaryAds(dispensaryId?: string) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!dispensaryId) {
      setLoading(false);
      return;
    }
    
    const fetchAds = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'advertisements'),
          where('dispensaryId', '==', dispensaryId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(q);
        const adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Advertisement));
        
        setAds(adsData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching ads:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAds();
  }, [dispensaryId]);
  
  return { ads, loading, error, refetch: useCallback(() => {}, []) };
}

/**
 * Hook for real-time ad updates
 */
export function useRealtimeAd(adId?: string) {
  const [ad, setAd] = useState<Advertisement | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!adId) {
      setLoading(false);
      return;
    }
    
    const adRef = doc(db, 'advertisements', adId);
    
    const unsubscribe = onSnapshot(adRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          setAd({
            id: snapshot.id,
            ...snapshot.data()
          } as Advertisement);
        } else {
          setAd(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to ad:', error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [adId]);
  
  return { ad, loading };
}

/**
 * Hook to fetch active ads for placement (public display)
 */
export function useActiveAdsForPlacement(
  placement: string,
  dispensaryId?: string,
  maxAds: number = 3
) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAds = async () => {
      try {
        setLoading(true);
        const now = Timestamp.now();
        
        let q = query(
          collection(db, 'advertisements'),
          where('status', '==', 'active'),
          where('placements', 'array-contains', placement),
          where('startDate', '<=', now),
          where('isActive', '==', true),
          orderBy('priority', 'desc'),
          limit(maxAds)
        );
        
        if (dispensaryId) {
          q = query(
            collection(db, 'advertisements'),
            where('dispensaryId', '==', dispensaryId),
            where('status', '==', 'active'),
            where('placements', 'array-contains', placement),
            where('startDate', '<=', now),
            where('isActive', '==', true),
            orderBy('priority', 'desc'),
            limit(maxAds)
          );
        }
        
        const snapshot = await getDocs(q);
        const adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Advertisement));
        
        // Filter by end date client-side
        const activeAds = adsData.filter(ad => {
          if (!ad.endDate) return true;
          return ad.endDate.toMillis() > Date.now();
        });
        
        setAds(activeAds);
      } catch (err) {
        console.error('Error fetching ads for placement:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAds();
  }, [placement, dispensaryId, maxAds]);
  
  return { ads, loading };
}

/**
 * Hook for influencer ad marketplace
 */
export function useInfluencerAdMarketplace(filters?: AdMarketplaceFilters) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchMarketplaceAds = async () => {
      try {
        setLoading(true);
        const now = Timestamp.now();
        
        const q = query(
          collection(db, 'advertisements'),
          where('status', '==', 'active'),
          where('availableToInfluencers', '==', true),
          where('startDate', '<=', now),
          orderBy('priority', 'desc'),
          limit(50)
        );
        
        const snapshot = await getDocs(q);
        let adsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Advertisement));
        
        // Filter by end date
        adsData = adsData.filter(ad => {
          if (!ad.endDate) return true;
          return ad.endDate.toMillis() > Date.now();
        });
        
        // Apply filters
        if (filters?.minCommissionRate) {
          adsData = adsData.filter(ad => 
            ad.influencerCommission.enabled && 
            ad.influencerCommission.rate >= (filters.minCommissionRate || 0)
          );
        }
        
        if (filters?.adTypes && filters.adTypes.length > 0) {
          adsData = adsData.filter(ad => filters.adTypes!.includes(ad.type));
        }
        
        if (filters?.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          adsData = adsData.filter(ad => 
            ad.title.toLowerCase().includes(query) ||
            ad.description.toLowerCase().includes(query) ||
            ad.dispensaryName?.toLowerCase().includes(query)
          );
        }
        
        // Sort
        if (filters?.sortBy) {
          switch (filters.sortBy) {
            case 'commission':
              adsData.sort((a, b) => b.influencerCommission.rate - a.influencerCommission.rate);
              break;
            case 'popularity':
              adsData.sort((a, b) => b.analytics.clicks - a.analytics.clicks);
              break;
            case 'newest':
              adsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
              break;
            case 'revenue':
              adsData.sort((a, b) => b.analytics.revenue - a.analytics.revenue);
              break;
          }
        }
        
        setAds(adsData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching marketplace ads:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMarketplaceAds();
  }, [filters]);
  
  return { ads, loading, error };
}

/**
 * Hook to get influencer's selected/promoted ads
 */
export function useInfluencerSelectedAds(influencerId?: string) {
  const [selections, setSelections] = useState<InfluencerAdSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!influencerId) {
      setLoading(false);
      return;
    }
    
    const fetchSelections = async () => {
      try {
        setLoading(true);
        const q = query(
          collection(db, 'influencerAdSelections'),
          where('influencerId', '==', influencerId),
          orderBy('selectedAt', 'desc'),
          limit(100)
        );
        
        const snapshot = await getDocs(q);
        const selectionsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as InfluencerAdSelection));
        
        setSelections(selectionsData);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching influencer selections:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSelections();
  }, [influencerId]);
  
  return { selections, loading, error };
}

/**
 * Hook for ad analytics aggregation
 */
export function useAdAnalytics(dispensaryId?: string, dateRange?: { start: Date; end: Date }) {
  const [analytics, setAnalytics] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    averageCTR: 0,
    averageConversionRate: 0,
    totalInfluencerRevenue: 0,
    topPerformingAd: null as Advertisement | null,
    topPerformingInfluencer: null as any,
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!dispensaryId) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Fetch all ads for dispensary
        let q = query(
          collection(db, 'advertisements'),
          where('dispensaryId', '==', dispensaryId),
          orderBy('createdAt', 'desc')
        );
        
        const snapshot = await getDocs(q);
        const ads = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Advertisement));
        
        // Filter by date range if provided
        let filteredAds = ads;
        if (dateRange) {
          filteredAds = ads.filter(ad => {
            const createdAt = ad.createdAt.toMillis();
            return createdAt >= dateRange.start.getTime() && createdAt <= dateRange.end.getTime();
          });
        }
        
        // Aggregate analytics
        const aggregated = filteredAds.reduce((acc, ad) => ({
          totalImpressions: acc.totalImpressions + ad.analytics.impressions,
          totalClicks: acc.totalClicks + ad.analytics.clicks,
          totalConversions: acc.totalConversions + ad.analytics.conversions,
          totalRevenue: acc.totalRevenue + ad.analytics.revenue,
          totalInfluencerRevenue: acc.totalInfluencerRevenue + ad.analytics.influencerRevenue,
        }), {
          totalImpressions: 0,
          totalClicks: 0,
          totalConversions: 0,
          totalRevenue: 0,
          totalInfluencerRevenue: 0,
        });
        
        // Calculate averages
        const averageCTR = filteredAds.length > 0
          ? filteredAds.reduce((sum, ad) => sum + ad.analytics.ctr, 0) / filteredAds.length
          : 0;
        
        const averageConversionRate = filteredAds.length > 0
          ? filteredAds.reduce((sum, ad) => sum + ad.analytics.conversionRate, 0) / filteredAds.length
          : 0;
        
        // Find top performing ad
        const topAd = filteredAds.sort((a, b) => b.analytics.revenue - a.analytics.revenue)[0] || null;
        
        setAnalytics({
          ...aggregated,
          averageCTR,
          averageConversionRate,
          topPerformingAd: topAd,
          topPerformingInfluencer: null,
        });
      } catch (err) {
        console.error('Error fetching analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [dispensaryId, dateRange]);
  
  return { analytics, loading };
}

/**
 * Hook for super admin platform-wide analytics
 */
export function usePlatformAdAnalytics() {
  const [analytics, setAnalytics] = useState({
    totalAds: 0,
    activeAds: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalRevenue: 0,
    totalDispensaries: 0,
    totalInfluencerSelections: 0,
    topDispensary: null as any,
    topInfluencer: null as any,
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPlatformAnalytics = async () => {
      try {
        setLoading(true);
        
        // Fetch all ads
        const adsSnapshot = await getDocs(collection(db, 'advertisements'));
        const ads = adsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Advertisement));
        
        const activeAds = ads.filter(ad => ad.status === 'active');
        
        // Aggregate
        const aggregated = ads.reduce((acc, ad) => ({
          totalImpressions: acc.totalImpressions + ad.analytics.impressions,
          totalClicks: acc.totalClicks + ad.analytics.clicks,
          totalRevenue: acc.totalRevenue + ad.analytics.revenue,
        }), {
          totalImpressions: 0,
          totalClicks: 0,
          totalRevenue: 0,
        });
        
        // Unique dispensaries
        const uniqueDispensaries = new Set(ads.map(ad => ad.dispensaryId).filter(Boolean));
        
        // Fetch influencer selections
        const selectionsSnapshot = await getDocs(collection(db, 'influencerAdSelections'));
        
        setAnalytics({
          totalAds: ads.length,
          activeAds: activeAds.length,
          ...aggregated,
          totalDispensaries: uniqueDispensaries.size,
          totalInfluencerSelections: selectionsSnapshot.size,
          topDispensary: null,
          topInfluencer: null,
        });
      } catch (err) {
        console.error('Error fetching platform analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPlatformAnalytics();
  }, []);
  
  return { analytics, loading };
}
