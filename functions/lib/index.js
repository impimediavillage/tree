"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchStrains = exports.deductCreditsAndLogInteraction = exports.getUserProfile = exports.onUserWriteSetClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
// ============== FIREBASE ADMIN SDK INITIALIZATION ==============
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    }
    catch (e) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== END INITIALIZATION ==============
// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) - V2 SYNTAX ==============
exports.onUserWriteSetClaims = (0, firestore_1.onDocumentWritten)("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data();
    // Handle user deletion
    if (!afterData) {
        logger.info(`User document ${userId} deleted. Revoking custom claims.`);
        try {
            await admin.auth().setCustomUserClaims(userId, null);
            logger.info(`Successfully revoked custom claims for deleted user ${userId}.`);
        }
        catch (error) {
            logger.error(`Error revoking custom claims for deleted user ${userId}:`, error);
        }
        return; // Exit function
    }
    // Handle user creation or update
    const validRoles = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
    const role = afterData.role && validRoles.includes(afterData.role)
        ? afterData.role
        : 'User'; // Default to 'User'
    const dispensaryId = afterData.dispensaryId || null;
    const claims = { role, dispensaryId };
    try {
        await admin.auth().setCustomUserClaims(userId, claims);
        logger.info(`Successfully set custom claims for user ${userId}:`, claims);
    }
    catch (error) {
        logger.error(`Error setting custom claims for user ${userId}:`, error);
    }
});
// ============== ROBUST HELPER FUNCTION for Date Conversion ==============
const safeToISOString = (date) => {
    if (!date)
        return null;
    if (date.toDate && typeof date.toDate === 'function') {
        try {
            return date.toDate().toISOString();
        }
        catch (e) {
            logger.warn(`Could not convert Firestore Timestamp to Date:`, e);
            return null;
        }
    }
    if (date instanceof Date) {
        if (!isNaN(date.getTime()))
            return date.toISOString();
        return null;
    }
    if (typeof date === 'string') {
        try {
            const parsedDate = new Date(date);
            if (!isNaN(parsedDate.getTime()))
                return parsedDate.toISOString();
        }
        catch (e) {
            logger.warn(`Could not parse date string: ${date}`);
        }
    }
    logger.warn(`Unsupported date type encountered for conversion: ${typeof date}`);
    return null;
};
// ============== Callable Functions (v2) ==============
exports.getUserProfile = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { uid, token } = request.auth; // The decoded token IS the auth object in v2 onCall
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();
        if (!userDocSnap.exists) {
            logger.warn(`User document not found for uid: ${uid}. This can happen briefly after signup.`);
            throw new https_1.HttpsError('not-found', 'Your user profile data could not be found. If you just signed up, please wait a moment and try again.');
        }
        const userData = userDocSnap.data();
        let dispensaryData = null;
        if (userData.dispensaryId && typeof userData.dispensaryId === 'string' && userData.dispensaryId.trim() !== '') {
            const dispensaryDocRef = db.collection('dispensaries').doc(userData.dispensaryId);
            const dispensaryDocSnap = await dispensaryDocRef.get();
            if (dispensaryDocSnap.exists) {
                const rawDispensaryData = dispensaryDocSnap.data();
                if (rawDispensaryData) {
                    dispensaryData = {
                        ...rawDispensaryData,
                        id: dispensaryDocSnap.id,
                        applicationDate: safeToISOString(rawDispensaryData.applicationDate),
                        approvedDate: safeToISOString(rawDispensaryData.approvedDate),
                        lastActivityDate: safeToISOString(rawDispensaryData.lastActivityDate),
                    };
                }
            }
        }
        const profileResponse = {
            uid: uid,
            email: userData.email || token.email || '',
            displayName: userData.displayName || token.name || '',
            photoURL: userData.photoURL || token.picture || null,
            role: (token.role || 'User'),
            dispensaryId: (token.dispensaryId || null),
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
    }
    catch (error) {
        logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});
exports.deductCreditsAndLogInteraction = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data;
    const dispensaryId = request.auth.token.dispensaryId || null;
    if (userId !== request.auth.uid) {
        throw new https_1.HttpsError('permission-denied', 'You can only deduct your own credits.');
    }
    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
        throw new https_1.HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }
    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;
    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new https_1.HttpsError('not-found', 'User not found during transaction.');
            }
            const userData = freshUserDoc.data();
            const currentCredits = userData.credits || 0;
            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct && creditsToDeduct > 0) { // Only check if credits are needed
                    throw new https_1.HttpsError('failed-precondition', 'Insufficient credits.');
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            }
            else {
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
    }
    catch (error) {
        logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An internal error occurred while processing the transaction.');
    }
});
// New Cloud Function to search for strains
exports.searchStrains = (0, https_1.onCall)(async (request) => {
    // This function is publicly callable, no auth check needed as per requirements.
    const { searchTerm } = request.data;
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'A valid search term must be provided.');
    }
    // Capitalize the first letter of each word for case-insensitive-like matching
    const toTitleCase = (str) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    const processedTerm = toTitleCase(searchTerm.trim());
    try {
        const strainsRef = db.collection('my-seeded-collection');
        const query = strainsRef
            .where('name', '>=', processedTerm)
            .where('name', '<=', processedTerm + '\uf8ff')
            .limit(10);
        const snapshot = await query.get();
        if (snapshot.empty) {
            return [];
        }
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return results;
    }
    catch (error) {
        logger.error(`Error searching strains with term "${searchTerm}":`, error);
        throw new https_1.HttpsError('internal', 'An error occurred while searching for strains.');
    }
});
//# sourceMappingURL=index.js.map