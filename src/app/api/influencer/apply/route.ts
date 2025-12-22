import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    // Note: Auth should be handled by middleware or client-side
    // This is a simplified version for client-side Firebase

    const {
      userId,
      displayName,
      email,
      photoURL,
      bio,
      healingStory,
      primaryNiche,
      socialLinks,
      referralCode,
      referralLink
    } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check if user already has an influencer profile
    const existingProfileQuery = query(
      collection(db, 'influencers'),
      where('userId', '==', userId),
      limit(1)
    );
    const existingProfile = await getDocs(existingProfileQuery);

    if (!existingProfile.empty) {
      return NextResponse.json({ error: 'You already have an influencer profile' }, { status: 400 });
    }

    // Check if referral code is already taken
    const existingCodeQuery = query(
      collection(db, 'influencers'),
      where('referralCode', '==', referralCode),
      limit(1)
    );
    const existingCode = await getDocs(existingCodeQuery);

    if (!existingCode.empty) {
      // Generate a new unique code
      const newReferralCode = referralCode + Math.random().toString(36).substring(2, 4).toUpperCase();
      const newReferralLink = referralLink.replace(referralCode, newReferralCode);

      // Create profile with new code
      return await createProfile({
        userId,
        displayName,
        email,
        photoURL,
        bio,
        healingStory,
        primaryNiche,
        socialLinks,
        referralCode: newReferralCode,
        referralLink: newReferralLink
      });
    }

    // Create profile
    return await createProfile({
      userId,
      displayName,
      email,
      photoURL,
      bio,
      healingStory,
      primaryNiche,
      socialLinks,
      referralCode,
      referralLink
    });
  } catch (error: any) {
    console.error('Error creating influencer application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application', details: error.message },
      { status: 500 }
    );
  }
}

async function createProfile(data: any) {
  const profile = {
    userId: data.userId,
    displayName: data.displayName,
    email: data.email,
    profileImage: data.photoURL || null,
    bio: data.bio,
    healingStory: data.healingStory || null,
    referralCode: data.referralCode,
    referralLink: data.referralLink,
    primaryNiche: data.primaryNiche || [],
    socialLinks: data.socialLinks || {},
    status: 'pending',
    tier: 'seed',
    commissionRate: 5,
    stats: {
      totalClicks: 0,
      totalConversions: 0,
      totalSales: 0,
      totalEarnings: 0,
      pendingEarnings: 0,
      lifetimeEarnings: 0,
      currentMonthSales: 0,
      currentMonthEarnings: 0,
      tribeMembers: 0,
      bundles: 0,
      liveEvents: 0,
      badges: [],
      level: 1,
      xp: 0
    },
    bonusMultipliers: {
      videoContent: false,
      tribeEngagement: false,
      seasonalBonus: 0
    },
    payoutInfo: {
      method: 'bank_transfer',
      minimumPayout: 500
    },
    appliedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await addDoc(collection(db, 'influencers'), profile);

  return NextResponse.json({ success: true, referralCode: data.referralCode });
}
