// Referral tracking utilities

import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import type { ReferralClick } from '@/types/influencer';

// Generate unique session ID for tracking
export const generateSessionId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Extract referral code from URL
export const extractReferralCode = (url: string): string | null => {
  const urlParams = new URLSearchParams(url.split('?')[1] || '');
  return urlParams.get('ref');
};

// Store referral code in localStorage for attribution
export const storeReferralCode = (code: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('wt_referral_code', code);
    localStorage.setItem('wt_referral_timestamp', Date.now().toString());
  }
};

// Get stored referral code (valid for 30 days)
export const getStoredReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const code = localStorage.getItem('wt_referral_code');
  const timestamp = localStorage.getItem('wt_referral_timestamp');
  
  if (!code || !timestamp) return null;
  
  const daysPassed = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
  if (daysPassed > 30) {
    localStorage.removeItem('wt_referral_code');
    localStorage.removeItem('wt_referral_timestamp');
    return null;
  }
  
  return code;
};

// Get or create session ID
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return generateSessionId();
  
  let sessionId = sessionStorage.getItem('wt_session_id');
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem('wt_session_id', sessionId);
  }
  return sessionId;
};

// Track referral click
export const trackReferralClick = async (
  referralCode: string,
  userId?: string,
  source?: string
): Promise<void> => {
  try {
    // Find influencer by referral code
    const influencersRef = collection(db, 'influencerProfiles');
    const q = query(influencersRef, where('referralCode', '==', referralCode.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.warn('Invalid referral code:', referralCode);
      return;
    }
    
    const influencerDoc = snapshot.docs[0];
    const influencerId = influencerDoc.id;
    
    // Store click
    await addDoc(collection(db, 'referralClicks'), {
      influencerId,
      referralCode: referralCode.toUpperCase(),
      userId: userId || null,
      sessionId: getSessionId(),
      source: source || detectSource(),
      device: detectDevice(),
      timestamp: serverTimestamp(),
      converted: false
    } as Omit<ReferralClick, 'id'>);
    
    // Update influencer stats
    await updateDoc(doc(db, 'influencerProfiles', influencerId), {
      'stats.totalClicks': increment(1)
    });
    
    // Store referral code for attribution
    storeReferralCode(referralCode);
    
  } catch (error) {
    console.error('Error tracking referral click:', error);
  }
};

// Mark referral as converted
export const trackReferralConversion = async (
  orderId: string,
  userId: string
): Promise<string | null> => {
  try {
    const referralCode = getStoredReferralCode();
    if (!referralCode) return null;
    
    // Find influencer
    const influencersRef = collection(db, 'influencerProfiles');
    const q = query(influencersRef, where('referralCode', '==', referralCode.toUpperCase()));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const influencerId = snapshot.docs[0].id;
    const sessionId = getSessionId();
    
    // Update click record
    const clicksRef = collection(db, 'referralClicks');
    const clickQuery = query(
      clicksRef,
      where('influencerId', '==', influencerId),
      where('sessionId', '==', sessionId),
      where('converted', '==', false)
    );
    const clickSnapshot = await getDocs(clickQuery);
    
    if (!clickSnapshot.empty) {
      await updateDoc(clickSnapshot.docs[0].ref, {
        converted: true,
        conversionAt: serverTimestamp(),
        orderId
      });
    }
    
    // Update influencer stats
    await updateDoc(doc(db, 'influencerProfiles', influencerId), {
      'stats.totalConversions': increment(1)
    });
    
    return influencerId;
    
  } catch (error) {
    console.error('Error tracking conversion:', error);
    return null;
  }
};

// Detect traffic source
const detectSource = (): string => {
  if (typeof window === 'undefined') return 'direct';
  
  const referrer = document.referrer.toLowerCase();
  if (referrer.includes('instagram.com')) return 'instagram';
  if (referrer.includes('tiktok.com')) return 'tiktok';
  if (referrer.includes('youtube.com')) return 'youtube';
  if (referrer.includes('facebook.com')) return 'facebook';
  if (referrer.includes('twitter.com') || referrer.includes('x.com')) return 'twitter';
  if (referrer) return 'referral';
  return 'direct';
};

// Detect device type
const detectDevice = (): string => {
  if (typeof window === 'undefined') return 'unknown';
  
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet') || ua.includes('ipad')) return 'tablet';
  return 'desktop';
};

// Calculate commission for order
export const calculateInfluencerCommission = (
  orderTotal: number,
  commissionRate: number,
  bonusMultipliers?: { videoContent?: number; tribeEngagement?: number; seasonal?: number }
): number => {
  let commission = orderTotal * (commissionRate / 100);
  
  // Apply bonus multipliers
  if (bonusMultipliers) {
    const totalBonus = (bonusMultipliers.videoContent || 0) + 
                       (bonusMultipliers.tribeEngagement || 0) + 
                       (bonusMultipliers.seasonal || 0);
    commission += orderTotal * (totalBonus / 100);
  }
  
  return Math.round(commission * 100) / 100; // Round to 2 decimal places
};

// Get tier from sales
export const calculateTierFromSales = (monthSales: number): 'seed' | 'sprout' | 'growth' | 'bloom' | 'forest' => {
  if (monthSales >= 251) return 'forest';
  if (monthSales >= 101) return 'bloom';
  if (monthSales >= 51) return 'growth';
  if (monthSales >= 11) return 'sprout';
  return 'seed';
};

// Get commission rate for tier
export const getCommissionRateForTier = (tier: string): number => {
  const rates = {
    seed: 5,
    sprout: 8,
    growth: 12,
    bloom: 15,
    forest: 20
  };
  return rates[tier as keyof typeof rates] || 5;
};

// Generate unique referral code
export const generateReferralCode = (displayName: string): string => {
  const base = displayName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const random = Math.random().toString(36).substr(2, 4).toUpperCase();
  return `${base}${random}`;
};

// Create referral link
export const createReferralLink = (referralCode: string): string => {
  if (typeof window === 'undefined') return `https://wellnesstree.com?ref=${referralCode}`;
  return `${window.location.origin}?ref=${referralCode}`;
};
