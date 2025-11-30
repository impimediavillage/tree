import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateDesign, validatePrompt } from '@/lib/dalle-service';
import type { CreatorDesign } from '@/types/creator-lab';

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
    // Get auth token from header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized - No token provided' },
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
    const { prompt } = await request.json();

    // Validate prompt
    const validation = validatePrompt(prompt);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, message: validation.message },
        { status: 400 }
      );
    }

    // Check user credits and deduct in a transaction
    const userRef = db.collection('users').doc(userId);
    
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const credits = userData?.credits || 0;
      const userEmail = userData?.email || '';
      const userName = userData?.name || '';

      if (credits < 10) {
        throw new Error('Insufficient credits. You need 10 credits to generate a design.');
      }

      // Deduct credits
      const newCredits = credits - 10;
      transaction.update(userRef, { credits: newCredits });

      // Generate design with DALL-E 3
      const designResult = await generateDesign({
        prompt,
        userId,
        size: '1024x1024',
        quality: 'hd',
        style: 'vivid',
      });

      // Create design document
      const designId = `design_${userId}_${Date.now()}`;
      const designRef = db.collection('creatorDesigns').doc(designId);
      
      const designData: Partial<CreatorDesign> = {
        id: designId,
        userId,
        userEmail,
        userName,
        prompt: prompt.trim(),
        revisedPrompt: designResult.revisedPrompt,
        imageUrl: designResult.imageUrl,
        status: 'completed',
        operationType: 'generate',
        creditsUsed: 10,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        metadata: {
          width: designResult.width,
          height: designResult.height,
          format: 'png',
        },
      };

      transaction.set(designRef, designData);

      // Log interaction
      const interactionRef = db.collection('aiInteractionsLog').doc();
      transaction.set(interactionRef, {
        userId,
        advisorSlug: 'creator-lab-generate',
        advisorName: 'Creator Lab - Design Generation',
        creditsDeducted: 10,
        tokensUsed: 0,
        model: 'dall-e-3',
        messageLength: prompt.length,
        responseLength: designResult.revisedPrompt.length,
        wasFreeInteraction: false,
        timestamp: FieldValue.serverTimestamp(),
      });

      return {
        design: { ...designData, id: designId },
        newCreditBalance: newCredits,
      };
    });

    return NextResponse.json({
      success: true,
      design: result.design,
      newCreditBalance: result.newCreditBalance,
      message: 'Design generated successfully',
    });

  } catch (error: any) {
    console.error('Design generation error:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to generate design',
      },
      { status: 500 }
    );
  }
}
