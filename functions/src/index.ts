
'use server';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// All types are now sourced from the local types.ts file
import type {
  Dispensary,
  User as AppUser,
  UserDocData,
} from "./types";


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
                
                if (dispensaryDocSnap.exists()) {
                    dispensaryData = { id: dispensaryDocSnap.id, ...dispensaryDocSnap.data() } as Dispensary;
                } else {
                    logger.warn(`User ${uid} is linked to a non-existent dispensary document: ${userData.dispensaryId}. Proceeding without dispensary data.`);
                    dispensaryData = null; 
                }
            } catch (dispensaryError) {
                logger.error(`Error fetching dispensary doc for user ${uid}. Continuing without dispensary data.`, dispensaryError);
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
                    logger.warn(`Could not parse date string: ${date}`);
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
        throw new HttpsError('internal', 'An unexpected error occurred while fetching your profile.');
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
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError("internal", "An internal error occurred while processing the transaction.");
    }
});

export const updateUserProfileAdmin = onCall({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in.');
    }
    const adminUid = request.auth.uid;
    const adminUserDoc = await db.collection('users').doc(adminUid).get();
    if (adminUserDoc.data()?.role !== 'Super Admin') {
         throw new HttpsError('permission-denied', 'Only Super Admins can perform this action.');
    }
    
    const { userId, updates } = request.data;
    if (!userId || !updates || typeof updates !== 'object') {
        throw new HttpsError('invalid-argument', 'User ID and updates object are required.');
    }

    try {
        const userDocRef = db.collection('users').doc(userId);
        await userDocRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        
        logger.info(`Admin ${adminUid} successfully updated user ${userId}.`, { updates });
        return { success: true, message: "User profile updated successfully." };

    } catch (error) {
        logger.error(`Admin ${adminUid} failed to update user ${userId}.`, error);
        throw new HttpsError('internal', 'An unexpected error occurred while updating the user profile.');
    }
});
