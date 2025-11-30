import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const auth = getAuth();
const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    // Auth validation
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await auth.verifyIdToken(idToken);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const userId = decodedToken.uid;

    // Fetch creator earnings
    const earningsDoc = await db.collection('creatorEarnings').doc(userId).get();

    if (!earningsDoc.exists) {
      // Return default empty earnings
      return NextResponse.json({
        success: true,
        earnings: {
          userId,
          totalSales: 0,
          totalCommission: 0,
          pendingPayout: 0,
          paidOut: 0,
          productsSold: 0,
          activeProducts: 0,
          salesHistory: [],
          payoutHistory: [],
        },
      });
    }

    const earnings = earningsDoc.data();

    return NextResponse.json({
      success: true,
      earnings: {
        userId,
        ...earnings,
      },
    });

  } catch (error: any) {
    console.error('Error fetching earnings:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to fetch earnings',
      },
      { status: 500 }
    );
  }
}
