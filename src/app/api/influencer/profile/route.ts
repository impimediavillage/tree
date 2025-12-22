import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';

export async function GET(req: NextRequest) {
  try {
    // Get auth token from header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Fetch influencer profile
    const influencerQuery = await adminDb
      .collection('influencers')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (influencerQuery.empty) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const profileDoc = influencerQuery.docs[0];
    const profile = { id: profileDoc.id, ...profileDoc.data() };

    // Fetch recent commissions
    const commissionsSnapshot = await adminDb
      .collection('influencerCommissions')
      .where('influencerId', '==', profileDoc.id)
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const commissions = commissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ profile, commissions });
  } catch (error: any) {
    console.error('Error fetching influencer profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: error.message },
      { status: 500 }
    );
  }
}
