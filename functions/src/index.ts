
'use server';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { Dispensary, User as AppUser, UserDocData, DeductCreditsRequestBody } from './types';
import * as cors from 'cors';

const corsHandler = cors({ origin: true });

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


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) ==============
export const onUserWriteSetClaims = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as UserDocData | undefined;

        if (!afterData) {
            logger.info(`User document ${userId} deleted. Revoking custom claims.`);
            try {
                await admin.auth().setCustomUserClaims(userId, null);
                logger.info(`Successfully revoked custom claims for deleted user ${userId}.`);
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


// ============== ROBUST HELPER FUNCTION for Date Conversion ==============
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
    logger.warn(`Unsupported date type encountered for conversion: ${typeof date}`);
    return null;
};


// ============== onRequest Function for getUserProfile ==============
export const getUserProfile = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            response.status(403).send({ error: { status: 'unauthenticated', message: 'Unauthorized' } });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];

        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            
            const userDocRef = db.collection('users').doc(uid);
            const userDocSnap = await userDocRef.get();

            if (!userDocSnap.exists) {
                logger.warn(`User document not found for uid: ${uid}.`);
                response.status(404).send({ error: { status: 'not-found', message: 'Your user profile data could not be found. If you just signed up, please wait a moment and try again.' }});
                return;
            }
            
            const userData = userDocSnap.data() as UserDocData;
            
            let dispensaryData: Dispensary | null = null;
            if (userData.dispensaryId) {
                const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
                const dispensaryDocSnap = await dispensaryDocRef.get();
                if (dispensaryDocSnap.exists()) {
                    const rawDispensaryData = dispensaryDocSnap.data()!;
                    dispensaryData = {
                        ...rawDispensaryData,
                        id: dispensaryDocSnap.id,
                        applicationDate: safeToISOString(rawDispensaryData.applicationDate),
                        approvedDate: safeToISOString(rawDispensaryData.approvedDate),
                        lastActivityDate: safeToISOString(rawDispensaryData.lastActivityDate),
                    } as Dispensary;
                }
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
                createdAt: safeToISOString(userData.createdAt),
                lastLoginAt: safeToISOString(userData.lastLoginAt),
                dispensaryStatus: dispensaryData?.status || null,
                dispensary: dispensaryData,
                preferredDispensaryTypes: userData.preferredDispensaryTypes || [],
                welcomeCreditsAwarded: userData.welcomeCreditsAwarded || false,
                signupSource: userData.signupSource || 'public',
            };

            response.status(200).send({ result: profileResponse });

        } catch (error) {
            logger.error(`CRITICAL ERROR in getUserProfile:`, error);
            response.status(500).send({ error: { status: 'internal', message: 'An unexpected server error occurred while fetching your profile.' } });
        }
    });
});


// ============== onRequest Function for deductCreditsAndLogInteraction ==============
export const deductCreditsAndLogInteraction = functions.https.onRequest((request, response) => {
    corsHandler(request, response, async () => {
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            response.status(403).send({ error: { status: 'unauthenticated', message: 'Unauthorized' } });
            return;
        }
        const idToken = authHeader.split('Bearer ')[1];
        
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.body.data as DeductCreditsRequestBody;
            
            if (userId !== decodedToken.uid) {
                response.status(403).send({ error: { status: 'permission-denied', message: 'You can only deduct your own credits.' } });
                return;
            }

            if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
                response.status(400).send({ error: { status: 'invalid-argument', message: 'Missing or invalid arguments provided.' } });
                return;
            }

            const userRef = db.collection("users").doc(userId);
            let newCreditBalance = 0;

            await db.runTransaction(async (transaction) => {
                const freshUserDoc = await transaction.get(userRef);
                if (!freshUserDoc.exists) {
                    throw { status: 'not-found', message: 'User not found during transaction.' };
                }
                
                const userData = freshUserDoc.data() as UserDocData;
                const currentCredits = userData.credits || 0;

                if (!wasFreeInteraction) {
                    if (currentCredits < creditsToDeduct) {
                        throw { status: 'failed-precondition', message: 'Insufficient credits.' };
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

            response.status(200).send({ result: {
                success: true,
                message: "Credits updated and interaction logged successfully.",
                newCredits: newCreditBalance,
            }});

        } catch (error: any) {
            logger.error("Error in deductCreditsAndLogInteraction:", error);
            if (error.status && error.message) {
                 response.status(400).send({ error }); // Send structured error
            } else {
                 response.status(500).send({ error: { status: 'internal', message: 'An internal error occurred while processing the transaction.' } });
            }
        }
    });
});
