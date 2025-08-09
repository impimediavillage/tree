
'use server';
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import type { Dispensary, User as AppUser, UserDocData } from "./types";
import {onRequest} from "firebase-functions/v2/https";

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
export const onUserWriteSetClaims = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as UserDocData | undefined;

        // If the document is deleted, do nothing for claims.
        if (!afterData) {
            logger.info(`User document ${userId} deleted. Revoking custom claims.`);
            try {
                await admin.auth().setCustomUserClaims(userId, null);
            } catch (error) {
                logger.error(`Error revoking custom claims for deleted user ${userId}:`, error);
            }
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

export const getUserProfile = onRequest({cors: true}, async (request, response) => {
    logger.info("getUserProfile function triggered");
    
    if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.status(204).send();
        return;
    }

    if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
        logger.error("No authorization token found");
        response.status(403).send('Unauthorized');
        return;
    }

    const idToken = request.headers.authorization.split('Bearer ')[1];
    
    let decodedIdToken;
    try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        logger.error("Error verifying token:", error);
        response.status(403).send('Unauthorized');
        return;
    }
    
    const uid = decodedIdToken.uid;
    logger.info(`Fetching profile for authenticated user: ${uid}`);

    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            logger.error(`User document not found for authenticated user: ${uid}`);
            response.status(404).json({error: 'Your user profile could not be found. This may happen if the account was just created. Please try again.'});
            return;
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
            email: userData.email || decodedIdToken.email || '',
            displayName: userData.displayName || decodedIdToken.name || '',
            photoURL: userData.photoURL || decodedIdToken.picture || null,
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

        response.status(200).json(profileResponse);

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof HttpsError) {
             response.status(500).json({error: error.message});
        } else {
            response.status(500).json({error: 'An unexpected server error occurred while fetching your profile.'});
        }
    }
});


export const deductCreditsAndLogInteraction = onRequest({cors: true}, async (request, response) => {
    
    if (request.method === "OPTIONS") {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        response.status(204).send();
        return;
    }

    if (!request.headers.authorization || !request.headers.authorization.startsWith('Bearer ')) {
        logger.error("No authorization token found for deductCredits");
        response.status(403).json({ success: false, error: 'Unauthorized' });
        return;
    }

    const idToken = request.headers.authorization.split('Bearer ')[1];
    
    let decodedIdToken;
    try {
        decodedIdToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
        logger.error("Error verifying token for deductCredits:", error);
        response.status(403).json({ success: false, error: 'Unauthorized' });
        return;
    }

    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.body;

    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined || userId !== decodedIdToken.uid) {
        logger.error("Invalid arguments for deductCreditsAndLogInteraction", { body: request.body, auth: decodedIdToken });
        response.status(400).json({ success: false, error: 'Missing or invalid arguments provided.' });
        return;
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

        response.status(200).json({
            success: true,
            message: "Credits updated and interaction logged successfully.",
            newCredits: newCreditBalance,
        });

    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
        if (error instanceof HttpsError) {
            response.status(500).json({ success: false, error: error.message });
        } else {
             response.status(500).json({ success: false, error: "An internal error occurred while processing the transaction." });
        }
    }
});

    