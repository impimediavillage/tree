
import { type NextRequest, NextResponse } from 'next/server';
import { admin } from '@/lib/firebase-admin';
import type { Dispensary, User as AppUser, UserDocData } from '@/functions/src/types';

async function verifyIdToken(request: NextRequest): Promise<{uid: string, token: admin.auth.DecodedIdToken} | null> {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await admin.auth().verifyIdToken(token);
            return { uid: decodedToken.uid, token: decodedToken };
        } catch (error) {
            console.error("Error verifying Firebase ID token:", error);
            return null;
        }
    }
    return null;
}

async function handleGetUserProfile(uid: string, decodedToken: admin.auth.DecodedIdToken) {
    const db = admin.firestore();
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            // This is a critical case. The user is authenticated, but their profile doc doesn't exist yet.
            // This can happen in the brief moment between account creation and Firestore document creation.
            // Returning a 404 tells the client to wait or treat as not fully logged in yet.
            console.warn(`User document not found for authenticated user: ${uid}. This may be a new user signup.`);
            return NextResponse.json({ message: 'User profile not found.' }, { status: 404 });
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.dispensaryId) {
            try {
                const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
                const dispensaryDocSnap = await dispensaryDocRef.get();
                
                if (dispensaryDocSnap.exists()) {
                    dispensaryData = { id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary;
                } else {
                    console.warn(`User ${uid} is linked to a non-existent dispensary document: ${userData.dispensaryId}. Proceeding without dispensary data.`);
                    dispensaryData = null; 
                }
            } catch (dispensaryError) {
                console.error(`Error fetching dispensary doc for user ${uid}. Continuing without dispensary data.`, dispensaryError);
                dispensaryData = null; 
            }
        }
        
        const toISODateString = (date: any): string | null => {
            if (!date) return null;
            if (date instanceof admin.firestore.Timestamp) {
                return date.toDate().toISOString();
            }
            if (date instanceof Date) {
                return date.toISOString();
            }
            if (typeof date === 'string') {
                 try {
                     const parsedDate = new Date(date);
                     if (!isNaN(parsedDate.getTime())) {
                         return parsedDate.toISOString();
                     }
                 } catch (e) { 
                    console.warn(`Could not parse date string: ${date}`);
                 }
            }
            return null;
        };
        
        let dispensaryWithSerializableDates: Dispensary | null = null;
        if (dispensaryData) {
            dispensaryWithSerializableDates = {
                ...dispensaryData,
                applicationDate: toISODateString(dispensaryData.applicationDate),
                approvedDate: toISODateString(dispensaryData.approvedDate),
                lastActivityDate: toISODateString(dispensaryData.lastActivityDate),
            };
        }
        
        const profileResponse: AppUser = {
            uid: uid,
            email: userData.email || decodedToken.email || '',
            displayName: userData.displayName || decodedToken.name || '',
            photoURL: userData.photoURL || decodedToken.picture || null,
            role: userData.role || 'User',
            dispensaryId: userData.dispensaryId || null,
            credits: userData.credits || 0,
            status: userData.status || 'Active',
            createdAt: toISODateString(userData.createdAt),
            lastLoginAt: toISODateString(userData.lastLoginAt),
            dispensaryStatus: dispensaryData?.status || null,
            dispensary: dispensaryWithSerializableDates,
            preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
            welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
            signupSource: userData.signupSource || 'public',
        };

        return NextResponse.json(profileResponse);

    } catch (error: any) {
        console.error(`Error fetching user profile for ${uid}:`, error);
        return NextResponse.json({ message: error.message || 'An unexpected error occurred while fetching your profile.' }, { status: 500 });
    }
}


async function handleDeductCredits(uid: string, body: any) {
    const db = admin.firestore();
    const { advisorSlug, creditsToDeduct, wasFreeInteraction } = body as { advisorSlug: string, creditsToDeduct: number, wasFreeInteraction: boolean };
    
    if (!advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
        return NextResponse.json({ message: 'Missing or invalid arguments provided.' }, { status: 400 });
    }
    
    const userRef = db.collection("users").doc(uid);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new Error("User not found during transaction.");
            }
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct) {
                    throw new Error("Insufficient credits.");
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            } else {
                newCreditBalance = currentCredits;
            }

            const logEntry = {
                userId: uid,
                dispensaryId: userData.dispensaryId || null,
                advisorSlug,
                creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                wasFreeInteraction,
            };
            const logRef = db.collection("aiInteractionsLog").doc();
            transaction.set(logRef, logEntry);
        });

        return NextResponse.json({
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        });
    } catch (error: any) {
        console.error("Error in deductCreditsAndLogInteraction transaction:", error);
        return NextResponse.json({ message: error.message || "An internal error occurred." }, { status: 500 });
    }
}


export async function POST(request: NextRequest) {
    const authResult = await verifyIdToken(request);
    if (!authResult) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    const { uid, token } = authResult;

    const body = await request.json();
    const { action } = body;

    switch (action) {
        case 'getUserProfile':
            return handleGetUserProfile(uid, token);
        case 'deductCreditsAndLogInteraction':
            return handleDeductCredits(uid, body);
        default:
            return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
    }
}

