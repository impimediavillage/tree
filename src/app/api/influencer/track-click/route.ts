import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, limit } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { referralCode, visitorId, userAgent, landingPage, source } = await req.json();

    if (!referralCode) {
      return NextResponse.json({ error: 'Referral code required' }, { status: 400 });
    }

    // Find influencer by referral code
    const influencerQueryRef = query(
      collection(db, 'influencers'),
      where('referralCode', '==', referralCode.toUpperCase()),
      limit(1)
    );
    const influencerQuery = await getDocs(influencerQueryRef);

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

    await addDoc(collection(db, 'referralClicks'), clickData);

    // Increment click count
    const influencerDocRef = doc(db, 'influencers', influencerId);
    await updateDoc(influencerDocRef, {
      'stats.totalClicks': (influencerDoc.data()?.stats?.totalClicks || 0) + 1
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
