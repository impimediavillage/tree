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
exports.getShiplogicRates = exports.adminUpdateUser = exports.createDispensaryUser = exports.searchStrains = exports.getCannabinoidProductCategories = exports.deductCreditsAndLogInteraction = exports.getUserProfile = exports.onUserWriteSetClaims = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
const params_1 = require("firebase-functions/params");
// ============== FIREBASE ADMIN SDK INITIALIZATION ==============/
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
    if (!afterData) {
        logger.info(`User document ${userId} deleted. Revoking custom claims.`);
        try {
            await admin.auth().setCustomUserClaims(userId, null);
            logger.info(`Successfully revoked custom claims for deleted user ${userId}.`);
        }
        catch (error) {
            logger.error(`Error revoking custom claims for deleted user ${userId}:`, error);
        }
        return;
    }
    const validRoles = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
    const role = afterData.role && validRoles.includes(afterData.role)
        ? afterData.role
        : 'User';
    const dispensaryId = afterData.dispensaryId || null;
    let dispensaryType = null;
    if (dispensaryId) {
        try {
            const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
            if (dispensaryDoc.exists) {
                dispensaryType = dispensaryDoc.data()?.dispensaryType || null;
            }
        }
        catch (error) {
            logger.error(`Failed to fetch dispensary type for dispensaryId ${dispensaryId}:`, error);
        }
    }
    const claims = {
        role,
        dispensaryId,
        dispensaryType
    };
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
    const { uid, token } = request.auth;
    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();
        if (!userDocSnap.exists) {
            logger.warn(`User document not found for uid: ${uid}.`);
            throw new https_1.HttpsError('not-found', 'Your user profile data could not be found.');
        }
        const userData = userDocSnap.data();
        let dispensaryData = null;
        if (userData.dispensaryId) {
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
                if (currentCredits < creditsToDeduct && creditsToDeduct > 0) {
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
                dispensaryId: dispensaryId,
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
exports.getCannabinoidProductCategories = (0, https_1.onCall)({ cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { stream } = request.data;
    if (!stream || (stream !== 'THC' && stream !== 'CBD')) {
        throw new https_1.HttpsError('invalid-argument', 'A valid stream ("THC" or "CBD") must be provided.');
    }
    try {
        const categoriesRef = db.collection('dispensaryTypeProductCategories');
        const q = categoriesRef.where('name', '==', "Cannibinoid store").limit(1);
        const querySnapshot = await q.get();
        if (querySnapshot.empty) {
            throw new https_1.HttpsError('not-found', 'Cannabinoid product category configuration not found.');
        }
        const docData = querySnapshot.docs[0].data();
        const deliveryMethods = docData?.categoriesData?.thcCbdProductCategories?.[stream]?.['Delivery Methods'];
        if (!deliveryMethods || typeof deliveryMethods !== 'object') {
            throw new https_1.HttpsError('not-found', `The 'Delivery Methods' structure for the '${stream}' stream is invalid or missing.`);
        }
        return deliveryMethods;
    }
    catch (error) {
        logger.error("Error fetching cannabinoid product categories:", error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An error occurred while fetching product categories.');
    }
});
exports.searchStrains = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { searchTerm } = request.data;
    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'A valid search term must be provided.');
    }
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
exports.createDispensaryUser = (0, https_1.onCall)(async (request) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can create dispensary users.');
    }
    const { email, displayName, dispensaryId } = request.data;
    if (!email || !displayName || !dispensaryId) {
        throw new https_1.HttpsError('invalid-argument', 'Email, display name, and dispensary ID are required.');
    }
    try {
        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);
        if (existingUser) {
            const userDoc = await db.collection('users').doc(existingUser.uid).get();
            if (userDoc.exists && userDoc.data()?.dispensaryId) {
                throw new https_1.HttpsError('already-exists', `User with email ${email} already exists and is linked to a dispensary.`);
            }
            await db.collection('users').doc(existingUser.uid).update({
                dispensaryId: dispensaryId,
                role: 'DispensaryOwner',
                status: 'Active',
            });
            return { success: true, message: `Existing user ${email} successfully linked as DispensaryOwner.` };
        }
        else {
            const temporaryPassword = Math.random().toString(36).slice(-8);
            const newUserRecord = await admin.auth().createUser({
                email: email,
                emailVerified: false,
                password: temporaryPassword,
                displayName: displayName,
                disabled: false,
            });
            const userDocData = {
                uid: newUserRecord.uid,
                email: email,
                displayName: displayName,
                photoURL: null,
                role: 'DispensaryOwner',
                dispensaryId: dispensaryId,
                credits: 0,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                lastLoginAt: null,
                status: 'Active',
                welcomeCreditsAwarded: false,
                signupSource: 'admin_created',
            };
            await db.collection('users').doc(newUserRecord.uid).set(userDocData);
            return {
                success: true,
                message: 'New user account created successfully. Please provide them with their temporary password.',
                temporaryPassword: temporaryPassword
            };
        }
    }
    catch (error) {
        logger.error(`Error creating dispensary user for ${email}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while creating the user account.');
    }
});
exports.adminUpdateUser = (0, https_1.onCall)(async (request) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can update users.');
    }
    const { userId, password, ...firestoreData } = request.data;
    if (!userId) {
        throw new https_1.HttpsError('invalid-argument', 'User ID is required.');
    }
    try {
        if (password) {
            await admin.auth().updateUser(userId, { password: password });
        }
        const userDocRef = db.collection('users').doc(userId);
        if (firestoreData.role !== 'DispensaryOwner') {
            firestoreData.dispensaryId = null;
        }
        await userDocRef.update({ ...firestoreData, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        logger.info(`Admin successfully updated user ${userId}.`);
        return { success: true, message: 'User updated successfully.' };
    }
    catch (error) {
        logger.error(`Error in adminUpdateUser for ${userId}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        if (error.code === 'auth/user-not-found') {
            throw new https_1.HttpsError('not-found', 'The specified user does not exist.');
        }
        throw new https_1.HttpsError('internal', 'An unexpected error occurred while updating the user.');
    }
});
// ============== FINAL, HARDENED SHIPPING FUNCTION ==============/
const shiplogicApiKeySecret = (0, params_1.defineSecret)('SHIPLOGIC_API_KEY');
const SHIPLOGIC_API_URL = 'https://api.shiplogic.com/v2/rates';
const parseLocationString = (location) => {
    const parts = location.split(',').map(part => part.trim());
    if (parts.length >= 3) {
        return {
            street_address: parts.slice(0, parts.length - 2).join(', '),
            local_area: parts[parts.length - 2],
            city: parts[parts.length - 2],
            postal_code: parts[parts.length - 1]
        };
    }
    return { street_address: parts[0] || '', city: parts[1] || '', postal_code: parts[2] || '', local_area: parts[1] || '' };
};
exports.getShiplogicRates = (0, https_1.onCall)({ secrets: [shiplogicApiKeySecret], cors: true }, async (request) => {
    logger.info("getShiplogicRates invoked (v5 - Corrected Types).");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated.');
    }
    const data = request.data;
    if (!data.cart || data.cart.length === 0 || !data.dispensaryId || !data.deliveryAddress || !data.customer) {
        throw new https_1.HttpsError('invalid-argument', 'Request is missing required data: cart, dispensaryId, deliveryAddress, or customer.');
    }
    const shiplogicApiKey = shiplogicApiKeySecret.value();
    if (!shiplogicApiKey) {
        throw new https_1.HttpsError('internal', "Server configuration error: ShipLogic API key not found.");
    }
    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(data.dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new https_1.HttpsError('not-found', `Dispensary '${data.dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data();
        // --- CORRECTED PROPERTY ACCESS --- 
        if (!dispensary.location || !dispensary.dispensaryName || !dispensary.phone) {
            throw new https_1.HttpsError('failed-precondition', 'Dispensary is missing address, name, or phone.');
        }
        let totalWeight = 0, maxLength = 0, maxWidth = 0, maxHeight = 0;
        for (const item of data.cart) {
            const isValid = (val) => typeof val === 'number' && val > 0;
            const quantity = isValid(item.quantity) ? item.quantity : 1;
            if (!isValid(item.weight) || !isValid(item.length) || !isValid(item.width) || !isValid(item.height)) {
                throw new https_1.HttpsError('invalid-argument', `Cart item '${item.name}' has invalid dimensions or weight. Values must be positive numbers.`);
            }
            totalWeight += (item.weight || 0) * quantity;
            maxLength = Math.max(maxLength, item.length || 0);
            maxWidth = Math.max(maxWidth, item.width || 0);
            maxHeight = Math.max(maxHeight, item.height || 0);
        }
        // --- FINAL VALIDATION GATE --- 
        if (maxLength <= 0 || maxWidth <= 0 || maxHeight <= 0 || totalWeight <= 0) {
            throw new https_1.HttpsError('failed-precondition', `The final calculated parcel dimensions are invalid. L:${maxLength}, W:${maxWidth}, H:${maxHeight}, Wt:${totalWeight}.`);
        }
        const parcel = { description: 'Customer Order', weight: totalWeight, length: maxLength, width: maxWidth, height: maxHeight };
        // --- CORRECTED PROPERTY ACCESS --- 
        const parsedCollectionAddress = parseLocationString(dispensary.location);
        const shipLogicPayload = {
            collection_address: { ...parsedCollectionAddress, country: 'ZA' },
            // --- CORRECTED PROPERTY ACCESS ---
            collection_contact: { name: dispensary.dispensaryName, telephone: dispensary.phone, email: dispensary.ownerEmail },
            delivery_address: { address: data.deliveryAddress.address, local_area: data.deliveryAddress.locality, city: data.deliveryAddress.locality, postal_code: data.deliveryAddress.postal_code, country: 'ZA' },
            recipient_contact: { name: data.customer.name, telephone: data.customer.phone, email: data.customer.email },
            parcels: [parcel],
            declared_value: data.cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0),
            service_level: 'economy',
        };
        logger.info("Sending final payload to ShipLogic:", { payload: shipLogicPayload });
        const response = await fetch(SHIPLOGIC_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${shiplogicApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(shipLogicPayload)
        });
        // --- CORRECTED, CRASH-PROOF ERROR HANDLING --- 
        if (!response.ok) {
            const errorText = await response.text(); // Get the raw error text from ShipLogic
            logger.error('ShipLogic API returned an error:', { status: response.status, body: errorText });
            // Send the actual error message back to the client
            throw new https_1.HttpsError('internal', `Shipping Provider Error: ${errorText}`);
        }
        const responseData = await response.json();
        const formattedRates = (responseData || []).map((rate) => ({
            id: rate.id, // Important for selection on the frontend
            name: rate.service_level.name,
            rate: parseFloat(rate.rate),
            service_level: rate.service_level.name,
            delivery_time: rate.service_level.description,
            courier_name: rate.courier_name,
        }));
        logger.info(`Successfully fetched ${formattedRates.length} rates.`);
        return { rates: formattedRates };
    }
    catch (error) {
        logger.error('Error in getShiplogicRates function:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching shipping rates.');
    }
});
//# sourceMappingURL=index.js.map