
'use server';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Import types from the main app source to ensure consistency
import type {
  Dispensary,
  User as AppUser,
  UserDocData,
} from "../../src/types";


// ============== FIREBASE ADMIN SDK INITIALIZATION ==============
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== END INITIALIZATION ==============


// ============== CALLABLE FUNCTIONS ==============

export const getUserProfile = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to get your profile.');
    }
    const uid = request.auth.uid;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            logger.error(`User document not found for authenticated user: ${uid}`);
            throw new HttpsError('not-found', 'Your user profile could not be found in the database.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.dispensaryId) {
            try {
                const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
                const dispensaryDocSnap = await dispensaryDocRef.get();
                // **THE CORE FIX IS HERE**
                // Check if the dispensary document actually exists before trying to read from it.
                if (dispensaryDocSnap.exists()) {
                    dispensaryData = { id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary;
                } else {
                    // This prevents the function from crashing if a user is linked to a non-existent dispensary.
                    logger.warn(`User ${uid} is linked to a non-existent dispensary document: ${userData.dispensaryId}`);
                    dispensaryData = null; // Ensure dispensaryData is null if not found
                }
            } catch (dispensaryError) {
                logger.error(`Error fetching dispensary doc for user ${uid}.`, dispensaryError);
                 dispensaryData = null; // Ensure we fail gracefully
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
                    logger.warn(`Could not parse date string: ${date}`);
                 }
            }
            return null;
        };
        
        let dispensaryWithSerializableDates: Dispensary | null = null;
        // This check is now safe because we ensured dispensaryData is null if the doc doesn't exist.
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
            email: userData.email || request.auth.token.email || '',
            displayName: userData.displayName || request.auth.token.name || '',
            photoURL: userData.photoURL || request.auth.token.picture || null,
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

        return profileResponse;

    } catch (error) {
        logger.error(`Error fetching user profile for ${uid}:`, error);
        throw new HttpsError('internal', 'An error occurred while fetching your profile.');
    }
});


export const deductCreditsAndLogInteraction = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data as { userId: string, advisorSlug: string, creditsToDeduct: number, wasFreeInteraction: boolean };

    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined || userId !== request.auth.uid) {
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        const userDoc = await userRef.get();
        if (!userDoc.exists) throw new HttpsError("not-found", "User not found.");
        const userData = userDoc.data() as UserDocData;

        if (!wasFreeInteraction) {
            await db.runTransaction(async (transaction) => {
                const freshUserDoc = await transaction.get(userRef);
                if (!freshUserDoc.exists) throw new HttpsError("not-found", "User not found during transaction.");
                
                const currentCredits = (freshUserDoc.data() as UserDocData)?.credits || 0;
                if (currentCredits < creditsToDeduct) throw new HttpsError("failed-precondition", "Insufficient credits.");
                
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            });
        } else {
            newCreditBalance = userData.credits || 0;
        }

        const logEntry = {
            userId,
            dispensaryId: userData.dispensaryId || null,
            advisorSlug,
            creditsUsed: wasFreeInteraction ? 0 : creditsToDeduct,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            wasFreeInteraction,
        };
        await db.collection("aiInteractionsLog").add(logEntry);

        return {
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        };
    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An internal error occurred.");
    }
});
