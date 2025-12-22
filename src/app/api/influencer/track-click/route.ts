import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  try {
    const { referralCode, visitorId, userAgent, landingPage, source } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Find influencer by referral code
    const influencerQuery = await adminDb
      .collection('influencers')
      .where('referralCode', '==', referralCode.toUpperCase())
      .limit(1)
      .get();

    if (influencerQuery.empty) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    const influencerDoc = influencerQuery.docs[0];
    const influencerId = influencerDoc.id;

    // Log the click
    const clickData = {
      influencerId,
      referralCode: referralCode.toUpperCase(),
      visitorId,
      userAgent,
      landingPage,
      source: source || null,
      ipAddress: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || null,
      timestamp: new Date(),
      converted: false
    };

    await adminDb.collection('referralClicks').add(clickData);

    // Increment click count
    await adminDb.collection('influencers').doc(influencerId).update({
      'stats.totalClicks': (influencerDoc.data().stats?.totalClicks || 0) + 1
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking referral click:', error);
    return NextResponse.json(
      { error: 'Failed to track click', details: error.message },
      { status: 500 }
    );
  }
}
