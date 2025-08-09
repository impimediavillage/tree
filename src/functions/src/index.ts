
'use server';
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import type { UserDocData } from './types';


// ============== FIREBASE ADMIN SDK INITIALIZATION ==============
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
// ============== END INITIALIZATION ==============


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) ==============
/**
 * Sets custom user claims when a user document is created or updated.
 * This is CRITICAL for Firestore security rules to work correctly.
 */
export const onUserWriteSetClaims = functions.firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        const userId = context.params.userId;
        const afterData = change.after.data() as UserDocData | undefined;

        // If the document is deleted, revoke custom claims.
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

// NOTE: The getUserProfile and deductCreditsAndLogInteraction functions have been
// moved to a Next.js API Route (src/app/api/firebase/route.ts) to resolve
// persistent CORS issues in the Firebase App Hosting environment. This is the
// architecturally correct approach.
