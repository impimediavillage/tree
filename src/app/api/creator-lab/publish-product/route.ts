import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { APPAREL_PRICES, CREATOR_COMMISSION_RATE } from '@/types/creator-lab';
import type { ApparelType, TreehouseProduct } from '@/types/creator-lab';

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

export async function POST(request: NextRequest) {
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
    const { designId, apparelTypes, tags } = await request.json();

    // Validate input
    if (!designId || !apparelTypes || !Array.isArray(apparelTypes) || apparelTypes.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Design ID and at least one apparel type required' },
        { status: 400 }
      );
    }

    // Verify design exists and belongs to user
    const designRef = db.collection('creatorDesigns').doc(designId);
    const designDoc = await designRef.get();

    if (!designDoc.exists) {
      return NextResponse.json(
        { success: false, message: 'Design not found' },
        { status: 404 }
      );
    }

    const designData = designDoc.data();
    if (designData?.userId !== userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - Design does not belong to you' },
        { status: 403 }
      );
    }

    // Get user data
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const userEmail = userData?.email || '';
    const userName = userData?.name || 'Anonymous Creator';

    // Create products for each apparel type
    const productIds: string[] = [];
    const batch = db.batch();
    const timestamp = FieldValue.serverTimestamp();

    for (const apparelType of apparelTypes as ApparelType[]) {
      const price = APPAREL_PRICES[apparelType];
      if (!price) {
        continue; // Skip invalid apparel types
      }

      const productId = `product_${designId}_${apparelType.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`;
      const productRef = db.collection('treehouseProducts').doc(productId);

      const productData: Partial<TreehouseProduct> = {
        id: productId,
        designId,
        creatorId: userId,
        creatorName: userName,
        creatorEmail: userEmail,
        apparelType,
        apparelColor: 'Black',
        designImageUrl: designData?.imageUrl || '',
        designThumbnailUrl: designData?.imageUrl || '',
        price,
        currency: 'ZAR',
        isActive: true,
        publishedAt: timestamp,
        lastUpdated: timestamp,
        salesCount: 0,
        totalRevenue: 0,
        viewCount: 0,
        addToCartCount: 0,
        tags: tags || [],
      };

      batch.set(productRef, productData);
      productIds.push(productId);
    }

    // Update design status to published
    batch.update(designRef, {
      status: 'published',
      publishedAt: timestamp,
      updatedAt: timestamp,
    });

    // Initialize creator earnings if not exists
    const earningsRef = db.collection('creatorEarnings').doc(userId);
    const earningsDoc = await earningsRef.get();

    if (!earningsDoc.exists) {
      batch.set(earningsRef, {
        userId,
        userEmail,
        userName,
        totalSales: 0,
        totalCommission: 0,
        pendingPayout: 0,
        paidOut: 0,
        productsSold: 0,
        activeProducts: apparelTypes.length,
        createdAt: timestamp,
        updatedAt: timestamp,
        salesHistory: [],
        payoutHistory: [],
      });
    } else {
      // Increment active products count
      const currentActive = earningsDoc.data()?.activeProducts || 0;
      batch.update(earningsRef, {
        activeProducts: currentActive + apparelTypes.length,
        updatedAt: timestamp,
      });
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      productIds,
      message: `Successfully published ${apparelTypes.length} product(s) to The Treehouse!`,
    });

  } catch (error: any) {
    console.error('Publish product error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to publish product',
      },
      { status: 500 }
    );
  }
}
