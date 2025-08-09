
'use server';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import type { Dispensary, User as AppUser, UserDocData } from "./types";


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


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FIX) ==============
/**
 * Sets custom user claims when a user document is created or updated.
 * This is CRITICAL for Firestore security rules to work correctly.
 */
export const onUserCreateOrUpdate = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as UserDocData | undefined;

        // If the document is deleted, do nothing.
        if (!afterData) {
            logger.info(`User document ${userId} deleted. No claims to update.`);
            return null;
        }

        const role = afterData.role || null;
        const dispensaryId = afterData.dispensaryId || null;

        const claims: { [key: string]: any } = { role, dispensaryId };

        try {
            await admin.auth().setCustomUserClaims(userId, claims);
            logger.info(`Successfully set custom claims for user ${userId}:`, claims);
        } catch (error) {
            logger.error(`Error setting custom claims for user ${userId}:`, error);
        }
        return null;
    });


// ============== ROBUST HELPER FUNCTION ==================
const safeToISOString = (date: any): string | null => {
    if (!date) return null;
    if (date.toDate && typeof date.toDate === 'function') {
        try {
            return date.toDate().toISOString();
        } catch (e) {
            logger.warn(`Could not convert Firestore Timestamp to Date:`, e);
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
            logger.warn(`Could not parse date string: ${date}`);
         }
    }
    if (typeof date === 'number') {
        try {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime())) return parsedDate.toISOString();
        } catch (e) {
            logger.warn(`Could not parse number to date: ${date}`);
        }
    }
    
    logger.warn(`Unsupported date type encountered: ${typeof date}`);
    return null;
};


// ============== ROBUST CALLABLE FUNCTIONS ==============

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
            throw new HttpsError('not-found', 'Your user profile could not be found in the database. This may happen if the account was just created. Please try again.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
        if (userData.dispensaryId && typeof userData.dispensaryId === 'string' && userData.dispensaryId.trim() !== '') {
            try {
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
                } else {
                    logger.warn(`User ${uid} is linked to a non-existent dispensary document: ${userData.dispensaryId}. Proceeding without dispensary data.`);
                }
            } catch (dispensaryError) {
                logger.error(`Error fetching dispensary doc for user ${uid}. Continuing without dispensary data.`, dispensaryError);
            }
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
        logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});


export const deductCreditsAndLogInteraction = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data as { userId: string, advisorSlug: string, creditsToDeduct: number, wasFreeInteraction: boolean };

    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined || userId !== request.auth.uid) {
        logger.error("Invalid arguments for deductCreditsAndLogInteraction", { data: request.data, auth: request.auth });
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new HttpsError("not-found", "User not found during transaction.");
            }
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct) {
                    throw new HttpsError("failed-precondition", "Insufficient credits.");
                }
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
            const logRef = db.collection("aiInteractionsLog").doc();
            transaction.set(logRef, logEntry);
        });

        return {
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        };
    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", "An internal error occurred while processing the transaction.");
    }
});
