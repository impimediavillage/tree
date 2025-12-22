import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

export async function GET(req: NextRequest) {
  try {
    // Note: Auth is handled by Firestore security rules and client-side context
    // This follows the same pattern as your existing admin pages
    
    // Fetch all influencers
    const influencersRef = collection(db, 'influencers');
    const influencersQuery = query(influencersRef, orderBy('createdAt', 'desc'));
    const influencersSnapshot = await getDocs(influencersQuery);

    const influencers = influencersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ influencers });
  } catch (error: any) {
    console.error('Error fetching influencers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch influencers', details: error.message },
      { status: 500 }
    );
  }
}
