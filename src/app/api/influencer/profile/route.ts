import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Fetch influencer profile
    const influencerQueryRef = query(
      collection(db, 'influencers'),
      where('userId', '==', userId),
      limit(1)
    );
    const influencerQuery = await getDocs(influencerQueryRef);

    if (influencerQuery.empty) {
      return NextResponse.json({ profile: null }, { status: 200 });
    }

    const profileDoc = influencerQuery.docs[0];
    const profile = { id: profileDoc.id, ...profileDoc.data() };

    // Fetch recent commissions
    const commissionsQueryRef = query(
      collection(db, 'influencerCommissions'),
      where('influencerId', '==', profileDoc.id),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const commissionsSnapshot = await getDocs(commissionsQueryRef);

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
