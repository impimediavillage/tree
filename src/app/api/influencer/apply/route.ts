import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const {
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

    // Check if user already has an influencer profile
    const existingProfile = await adminDb
      .collection('influencers')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (!existingProfile.empty) {
      return NextResponse.json({ error: 'You already have an influencer profile' }, { status: 400 });
    }

    // Check if referral code is already taken
    const existingCode = await adminDb
      .collection('influencers')
      .where('referralCode', '==', referralCode)
      .limit(1)
      .get();

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
    appliedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  };

  await adminDb.collection('influencers').add(profile);

  return NextResponse.json({ success: true, referralCode: data.referralCode });
}
