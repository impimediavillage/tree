'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ReferralContextType {
  referralCode: string | null;
  setReferralCode: (code: string) => void;
  clearReferralCode: () => void;
  trackReferralClick: (influencerId: string, landingPage: string) => Promise<void>;
}

const ReferralContext = createContext<ReferralContextType | undefined>(undefined);

const REFERRAL_STORAGE_KEY = 'twt_referral_code';
const REFERRAL_EXPIRY_KEY = 'twt_referral_expiry';
const REFERRAL_VALID_DAYS = 30; // 30-day cookie

function ReferralProviderContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const [referralCode, setReferralCodeState] = useState<string | null>(null);

  // Initialize from localStorage or URL on mount
  useEffect(() => {
    // Check if there's a valid stored referral code
    const storedCode = localStorage.getItem(REFERRAL_STORAGE_KEY);
    const storedExpiry = localStorage.getItem(REFERRAL_EXPIRY_KEY);

    if (storedCode && storedExpiry) {
      const expiryDate = new Date(storedExpiry);
      if (expiryDate > new Date()) {
        setReferralCodeState(storedCode);
      } else {
        // Expired, clear it
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
        localStorage.removeItem(REFERRAL_EXPIRY_KEY);
      }
    }

    // Check URL for new referral code
    const urlRef = searchParams?.get('ref');
    if (urlRef) {
      setReferralCode(urlRef);
      
      // Track the click
      const landingPage = window.location.pathname + window.location.search;
      trackReferralClick(urlRef, landingPage);
    }
  }, [searchParams]);

  const setReferralCode = (code: string) => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + REFERRAL_VALID_DAYS);

    localStorage.setItem(REFERRAL_STORAGE_KEY, code);
    localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
    setReferralCodeState(code);
  };

  const clearReferralCode = () => {
    localStorage.removeItem(REFERRAL_STORAGE_KEY);
    localStorage.removeItem(REFERRAL_EXPIRY_KEY);
    setReferralCodeState(null);
  };

  const trackReferralClick = async (code: string, landingPage: string) => {
    try {
      // Get visitor ID (simple hash of user agent + timestamp)
      const visitorId = btoa(`${navigator.userAgent}-${Date.now()}`).substring(0, 32);
      
      const response = await fetch('/api/influencer/track-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: code,
          visitorId,
          userAgent: navigator.userAgent,
          landingPage,
          source: searchParams?.get('utm_source') || undefined
        })
      });

      if (!response.ok) {
        console.error('Failed to track referral click');
      }
    } catch (error) {
      console.error('Error tracking referral click:', error);
    }
  };

  return (
    <ReferralContext.Provider value={{ 
      referralCode, 
      setReferralCode, 
      clearReferralCode,
      trackReferralClick 
    }}>
      {children}
    </ReferralContext.Provider>
  );
}

export function ReferralProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={
      <ReferralContext.Provider value={{ 
        referralCode: null, 
        setReferralCode: () => {}, 
        clearReferralCode: () => {},
        trackReferralClick: async () => {} 
      }}>
        {children}
      </ReferralContext.Provider>
    }>
      <ReferralProviderContent>{children}</ReferralProviderContent>
    </Suspense>
  );
}

export function useReferral() {
  const context = useContext(ReferralContext);
  if (context === undefined) {
    throw new Error('useReferral must be used within a ReferralProvider');
  }
  return context;
}
