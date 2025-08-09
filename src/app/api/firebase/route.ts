
import { type NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin'; // Server-side admin SDK
import type { Dispensary, User as AppUser, UserDocData, DeductCreditsRequestBody } from '@/types';

// Robust helper to safely convert various date types to ISO string
const safeToISOString = (date: any): string | null => {
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') { // Firestore Timestamp
        try { return date.toDate().toISOString(); } catch (e) { return null; }
    }
    if (date instanceof Date) {
        if (!isNaN(date.getTime())) return date.toISOString(); return null;
    }
    return null; // Fallback for other types
};


async function handleGetUserProfile(uid: string, token: admin.auth.DecodedIdToken) {
    const db = admin.firestore();
    const userDocRef = db.collection('users').doc(uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
        return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
    }
    
    const userData = userDocSnap.data() as UserDocData;
    
    let dispensaryData: Dispensary | null = null;
    if (userData.dispensaryId && typeof userData.dispensaryId === 'string' && userData.dispensaryId.trim() !== '') {
        const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
        const dispensaryDocSnap = await dispensaryDocRef.get();
        
        if (dispensaryDocSnap.exists()) {
            const rawDispensaryData = dispensaryDocSnap.data();
            if (rawDispensaryData) {
                dispensaryData = {
                    ...rawDispensaryData,
                    id: dispensaryDocSnap.id,
                    applicationDate: safeToISOString(rawDispensaryData.applicationDate),
                    approvedDate: safeToISOString(rawDispensaryData.approvedDate),
                    lastActivityDate: safeToISOString(rawDispensaryData.lastActivityDate),
                } as Dispensary;
            }
        }
    }
    
    const profileResponse: AppUser = {
        uid: uid,
        email: userData.email || token.email || '',
        displayName: userData.displayName || token.name || '',
        photoURL: userData.photoURL || token.picture || null,
        role: userData.role || 'User',
        dispensaryId: userData.dispensaryId || null,
        credits: userData.credits || 0,
        status: userData.status || 'Active',
        createdAt: safeToISOString(userData.createdAt),
        lastLoginAt: safeToISOString(userData.lastLoginAt),
        dispensaryStatus: dispensaryData?.status || null,
        dispensary: dispensaryData,
        preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
        welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
        signupSource: userData.signupSource || 'public',
    };

    return NextResponse.json(profileResponse);
}


async function handleDeductCredits(uid: string, body: DeductCreditsRequestBody) {
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = body;
    if (userId !== uid) {
        return NextResponse.json({ message: 'User ID mismatch.' }, { status: 403 });
    }

    const db = admin.firestore();
    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) throw new Error("User not found during transaction.");
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct) throw new Error("Insufficient credits.");
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            } else {
                newCreditBalance = currentCredits;
            }

            const logEntry = {
                userId,
                dispensaryId: userData.dispensaryId || null,
                advisorSlug,
                creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                wasFreeInteraction,
            };
            transaction.set(db.collection("aiInteractionsLog").doc(), logEntry);
        });

        return NextResponse.json({ success: true, newCredits: newCreditBalance });

    } catch (error: any) {
        if (error.message === "Insufficient credits.") {
            return NextResponse.json({ message: error.message }, { status: 412 });
        }
        console.error("Deduct credits transaction failed:", error);
        return NextResponse.json({ message: 'An internal error occurred.' }, { status: 500 });
    }
}


export async function POST(req: NextRequest) {
    const authorization = req.headers.get('Authorization');
    if (!authorization?.startsWith('Bearer ')) {
        return NextResponse.json({ message: 'Unauthorized: No token provided.' }, { status: 401 });
    }
    const idToken = authorization.split('Bearer ')[1];
  
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const body = await req.json();

        switch (body.action) {
            case 'getUserProfile':
                return await handleGetUserProfile(uid, decodedToken);
            case 'deductCreditsAndLogInteraction':
                return await handleDeductCredits(uid, body.payload as DeductCreditsRequestBody);
            default:
                return NextResponse.json({ message: 'Invalid action specified.' }, { status: 400 });
        }
    } catch (error) {
        console.error("API Route Error:", error);
        return NextResponse.json({ message: 'Unauthorized: Invalid token or server error.' }, { status: 401 });
    }
}

// Handler for browser preflight requests
export async function OPTIONS(request: NextRequest) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
}
