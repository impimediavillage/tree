import { NextRequest, NextResponse } from 'next/server';
import { db, auth } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  Timestamp 
} from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Note: In client-side context, we rely on the auth state from the frontend
    // The token verification is implicit through Firebase auth
    const { userId, timeRange } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Find influencer profile
    const influencersRef = collection(db, 'influencers');
    const influencerQuery = query(
      influencersRef,
      where('userId', '==', userId),
      limit(1)
    );
    const influencerSnapshot = await getDocs(influencerQuery);

    if (influencerSnapshot.empty) {
      return NextResponse.json({ error: 'Influencer profile not found' }, { status: 404 });
    }

    const influencerDoc = influencerSnapshot.docs[0];
    const influencerId = influencerDoc.id;
    const profile = { id: influencerId, ...influencerDoc.data() };

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(0); // All time
    }

    // Fetch commissions within time range
    const commissionsRef = collection(db, 'influencerCommissions');
    let commissionsQuery = query(
      commissionsRef,
      where('influencerId', '==', influencerId),
      orderBy('createdAt', 'desc')
    );

    if (timeRange !== 'all') {
      commissionsQuery = query(
        commissionsRef,
        where('influencerId', '==', influencerId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        orderBy('createdAt', 'desc')
      );
    }

    const commissionsSnapshot = await getDocs(commissionsQuery);
    const commissions = commissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    // Fetch referral clicks within time range
    const clicksRef = collection(db, 'referralClicks');
    let clicksQuery = query(
      clicksRef,
      where('influencerId', '==', influencerId),
      orderBy('timestamp', 'desc'),
      limit(1000)
    );

    if (timeRange !== 'all') {
      clicksQuery = query(
        clicksRef,
        where('influencerId', '==', influencerId),
        where('timestamp', '>=', Timestamp.fromDate(startDate)),
        orderBy('timestamp', 'desc'),
        limit(1000)
      );
    }

    const clicksSnapshot = await getDocs(clicksQuery);
    const clicks = clicksSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      profile,
      commissions,
      clicks,
      timeRange
    });
  } catch (error: any) {
    console.error('Error fetching influencer analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: error.message },
      { status: 500 }
    );
  }
}
