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
exports.deductCreditsAndLogInteraction = exports.getUserProfile = exports.onUserWriteSetClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("firebase-functions/logger");
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        (0, logger_1.info)("Firebase Admin SDK initialized successfully.");
    }
    catch (e) {
        (0, logger_1.error)("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) ==============
exports.onUserWriteSetClaims = (0, firestore_1.onDocumentWritten)('users/{userId}', async (event) => {
    const afterData = event.data?.after.data(); // Access after data
    const userId = event.params.userId;
    // Ensure role is one of the allowed types
    const validRoles = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
    const role = afterData?.role && validRoles.includes(afterData.role)
        ? afterData.role
        : 'User'; // Default to 'User' if role is missing or invalid
    const dispensaryId = afterData?.dispensaryId || null;
    if (!afterData) {
        (0, logger_1.info)(`User document ${userId} deleted. Revoking custom claims.`);
        try {
            await admin.auth().setCustomUserClaims(userId, null);
            (0, logger_1.info)(`Successfully revoked custom claims for deleted user ${userId}.`);
        }
        catch (error) {
            error(`Error revoking custom claims for deleted user ${userId}:`, error);
        }
        return null;
    }
    try {
        const claims = { role, dispensaryId };
        await admin.auth().setCustomUserClaims(userId, claims);
        (0, logger_1.info)(`Successfully set custom claims for user ${userId}:`, claims);
    }
    catch (error) {
        error(`Error setting custom claims for user ${userId}:`, error);
    }
    return null;
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
            (0, logger_1.warn)(`Could not convert Firestore Timestamp to Date:`, e);
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
            (0, logger_1.warn)(`Could not parse date string: ${date}`);
        }
    }
    (0, logger_1.warn)(`Unsupported date type encountered for conversion: ${typeof date}`);
    return null;
};
exports.getUserProfile = (0, https_1.onCall)(async (request) => {
    // CORS is handled automatically for Callable Functions by Firebase
    const context = request; // Use request as context in v2
    if (!context.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const uid = context.auth.uid;
    const token = context.auth.token;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get(); // .get() returns a DocumentSnapshot
        if (!userDocSnap.exists) { // exists is a boolean property on DocumentSnapshot
            (0, logger_1.warn)(`User document not found for uid: ${uid}. This can happen briefly after signup.`, { uid });
            throw new https_1.HttpsError('not-found', 'Your user profile data could not be found. If you just signed up, please wait a moment and try again.');
        }
        const userData = userDocSnap.data();
        let dispensaryData = null;
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
                    };
                }
            }
        }
        const profileResponse = {
            uid: uid,
            email: userData.email || token.email || '',
            displayName: userData.displayName || token.name || '',
            photoURL: userData.photoURL || token.picture || null,
            role: userData.role || 'User', // Ensure role is one of the allowed types
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
    }
    catch (error) {
        error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});
exports.deductCreditsAndLogInteraction = (0, https_1.onCall)(async (request) => {
    const context = request; // Use request as context in v2
    if (!context.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data; // Access data via request.data
    const dispensaryId = context.auth.token.dispensaryId || null;
    if (userId !== context.auth.uid) {
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
        error("Error in deductCreditsAndLogInteraction transaction:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An internal error occurred while processing the transaction.');
    }
});
//# sourceMappingURL=index.js.map