
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, type CallableRequest, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { info, error, warn } from 'firebase-functions/logger';
import type { Dispensary, User, UserDocData, DeductCreditsRequestBody, AllowedUserRole } from './types';
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) ==============

export const onUserWriteSetClaims = onDocumentWritten('users/{userId}', async (event) => {
        const afterData = event.data?.after.data() as UserDocData | undefined; // Access after data
        const userId = event.params.userId;

        // Ensure role is one of the allowed types
        const validRoles: AllowedUserRole[] = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
        const role = afterData?.role && validRoles.includes(afterData.role as AllowedUserRole)
            ? afterData.role as AllowedUserRole
            : 'User'; // Default to 'User' if role is missing or invalid

        const dispensaryId = afterData?.dispensaryId || null;

        if (!afterData) {
            info(`User document ${userId} deleted. Revoking custom claims.`);
            try {
                await admin.auth().setCustomUserClaims(userId, null);
                info(`Successfully revoked custom claims for deleted user ${userId}.`);
            } catch (error: any) {
                error(`Error revoking custom claims for deleted user ${userId}:`, error as any);
            }
            return null;
        }


        try {
            const claims: { [key: string]: any } = { role, dispensaryId };
            await admin.auth().setCustomUserClaims(userId, claims);
            info(`Successfully set custom claims for user ${userId}:`, claims);
        } catch (error: any) {
            error(`Error setting custom claims for user ${userId}:`, error);
        }
        return null;
    });


// ============== ROBUST HELPER FUNCTION for Date Conversion ==============
const safeToISOString = (date: any): string | null => {
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') {
        try {
            return date.toDate().toISOString();
        } catch (e) {
            warn(`Could not convert Firestore Timestamp to Date:`, e);
            return null;
        }
    }
    if (date instanceof Date) {
        if (!isNaN(date.getTime())) return date.toISOString();
        return null;
    }
    if (typeof date === 'string') {
         try {
             const parsedDate = new Date(date);
             if (!isNaN(parsedDate.getTime())) return parsedDate.toISOString();
         } catch (e) {
            warn(`Could not parse date string: ${date}`);
         }
    }
    warn(`Unsupported date type encountered for conversion: ${typeof date}`);
    return null;
};


export const getUserProfile = onCall(async (request: CallableRequest) => {
    const context = request; // Use request as context in v2
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = context.auth.uid;
    const token = context.auth.token;

    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get(); // .get() returns a DocumentSnapshot

        if (!userDocSnap.exists) { // exists is a boolean property on DocumentSnapshot
            warn(`User document not found for uid: ${uid}. This can happen briefly after signup.`, { uid });
            throw new HttpsError('not-found', 'Your user profile data could not be found. If you just signed up, please wait a moment and try again.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.dispensaryId && typeof userData.dispensaryId === 'string' && userData.dispensaryId.trim() !== '') {
            const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
            const dispensaryDocSnap = await dispensaryDocRef.get();
            
            if (dispensaryDocSnap.exists) { // exists is a boolean property
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
        
        const profileResponse: User = {
            uid: uid,
            email: userData.email || token.email || '',
            displayName: userData.displayName || token.name || '',
            photoURL: userData.photoURL || token.picture || null,
            role: userData.role as AllowedUserRole || 'User', // Ensure role is one of the allowed types
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

        return profileResponse;
    } catch (error: any) {
        error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});


export const deductCreditsAndLogInteraction = onCall(async (request: CallableRequest<DeductCreditsRequestBody>) => {
    const context = request; // Use request as context in v2
    if (!context.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data; // Access data via request.data
    const dispensaryId = context.auth.token.dispensaryId || null;
    if (userId !== context.auth.uid) {
        throw new HttpsError('permission-denied', 'You can only deduct your own credits.');
    }
    
    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new HttpsError('not-found', 'User not found during transaction.');
            }
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct && creditsToDeduct > 0) { // Only check if credits are needed
                    throw new HttpsError('failed-precondition', 'Insufficient credits.');
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            } else {
                newCreditBalance = currentCredits;
            }

            const logEntry = {
                userId,
                dispensaryId: dispensaryId, // Use dispensaryId from auth token
                advisorSlug,
                creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                wasFreeInteraction,
            };
            const logRef = db.collection("aiInteractionsLog").doc();
            transaction.set(logRef, logEntry);
        });

        return {
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        };

    } catch (error: any) {
        error("Error in deductCreditsAndLogInteraction transaction:", error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An internal error occurred while processing the transaction.');
    }
});
