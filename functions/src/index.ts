
'use server';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { Dispensary, User as AppUser, UserDocData } from './types';
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


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS ==============
export const onUserWriteSetClaims = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as UserDocData | undefined;

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


// ============== MANUALLY HANDLED CORS HTTP REQUEST FUNCTIONS ==============

const verifyToken = async (req: functions.https.Request, res: functions.Response): Promise<admin.auth.DecodedIdToken | null> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).send({ error: 'Unauthorized', message: 'No authorization token was found.' });
        return null;
    }
    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        logger.error('Error verifying Firebase ID token:', error);
        res.status(403).send({ error: 'Forbidden', message: 'Invalid or expired authorization token.' });
        return null;
    }
};

export const getUserProfile = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send({ error: 'Method Not Allowed' });
            return;
        }

        const decodedToken = await verifyToken(req, res);
        if (!decodedToken) return; // verifyToken already sent the response

        const uid = decodedToken.uid;

        try {
            const userDocRef = db.collection('users').doc(uid);
            const userDocSnap = await userDocRef.get();

            if (!userDocSnap.exists) {
                logger.error(`User document not found for authenticated user: ${uid}`);
                res.status(404).send({ error: 'Not Found', message: 'Your user profile could not be found.' });
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
                    }
                } catch (dispensaryError) {
                    logger.error(`Error fetching dispensary doc for user ${uid}.`, dispensaryError);
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

            res.status(200).send(profileResponse);
        } catch (error: any) {
            logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
            res.status(500).send({ error: 'Internal Server Error', message: 'An unexpected server error occurred.' });
        }
    });
});


export const deductCreditsAndLogInteraction = functions.https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).send({ error: 'Method Not Allowed' });
            return;
        }

        const decodedToken = await verifyToken(req, res);
        if (!decodedToken) return;

        const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = req.body as { userId: string, advisorSlug: string, creditsToDeduct: number, wasFreeInteraction: boolean };
        
        if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined || userId !== decodedToken.uid) {
            logger.error("Invalid arguments for deductCreditsAndLogInteraction", { body: req.body, auth: decodedToken });
            res.status(400).send({ error: 'Bad Request', message: 'Missing or invalid arguments provided.' });
            return;
        }

        const userRef = db.collection("users").doc(userId);
        let newCreditBalance = 0;

        try {
            await db.runTransaction(async (transaction) => {
                const freshUserDoc = await transaction.get(userRef);
                if (!freshUserDoc.exists) {
                    throw { code: 'not-found', message: 'User not found during transaction.' };
                }
                
                const userData = freshUserDoc.data() as UserDocData;
                const currentCredits = userData.credits || 0;

                if (!wasFreeInteraction) {
                    if (currentCredits < creditsToDeduct) {
                        throw { code: 'failed-precondition', message: 'Insufficient credits.' };
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

            res.status(200).send({
                success: true,
                message: "Credits updated and interaction logged successfully.",
                newCredits: newCreditBalance,
            });

        } catch (error: any) {
            logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
            if (error.code === 'failed-precondition') {
                res.status(412).send({ error: 'Failed Precondition', message: error.message });
            } else if (error.code === 'not-found') {
                res.status(404).send({ error: 'Not Found', message: error.message });
            } else {
                res.status(500).send({ error: 'Internal Server Error', message: 'An internal error occurred while processing the transaction.' });
            }
        }
    });
});
