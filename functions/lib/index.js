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
exports.getShiplogicRates = exports.getPudoRates = exports.getPudoLockers = exports.adminUpdateUser = exports.createDispensaryUser = exports.searchStrains = exports.getCannabinoidProductCategories = exports.deductCreditsAndLogInteraction = exports.getUserProfile = exports.onUserWriteSetClaims = void 0;
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
// ============== END INITIALIZATION =============
// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) - V2 SYNTAX =============
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
// ============== SHIPPING FUNCTIONS ==============//
const shiplogicApiKeySecret = (0, params_1.defineSecret)('SHIPLOGIC_API_KEY');
const pudoApiKeySecret = (0, params_1.defineSecret)('PUDO_API_KEY');
// This remains for the getShiplogicRates function
const SHIPLOGIC_API_URL = 'https://api.shiplogic.com/v2/rates';
// Define the new Pudo base URL for clarity
const PUDO_API_URL = 'https://sandbox.api-pudo.co.za/api/v1';
exports.getPudoLockers = (0, https_1.onCall)({ secrets: [pudoApiKeySecret], cors: true }, async (request) => {
    logger.info("getPudoLockers invoked.");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch lockers.');
    }
    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: Pudo API key not found in secrets.");
        throw new https_1.HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }
    // Using API Key in header as per observed behavior, not contract
    const keyParts = pudoApiKey.split('|');
    const apiToken = keyParts.length === 2 ? keyParts[1] : pudoApiKey;
    const PUDO_LOCKERS_URL = `${PUDO_API_URL}/lockers`;
    logger.info(`Fetching Pudo lockers from: ${PUDO_LOCKERS_URL}`);
    try {
        const response = await fetch(PUDO_LOCKERS_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        const responseText = await response.text();
        if (!response.ok) {
            logger.error('Pudo API returned an error while fetching lockers:', { status: response.status, body: responseText });
            const detail = responseText.includes("Unauthenticated") ? "Authentication failed." : "Could not retrieve lockers.";
            throw new https_1.HttpsError('unavailable', `Shipping Provider Error: ${detail}`);
        }
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        }
        catch (e) {
            logger.error("Failed to parse JSON from Pudo API response:", { responseText });
            throw new https_1.HttpsError('internal', 'Received an invalid response from the shipping provider.');
        }
        // --- ROBUST FIX ---
        // As seen in logs, the API wraps the array in a 'responseData' field.
        // We check for that field first, otherwise fall back to other possibilities.
        const allLockers = responseData.responseData || responseData.lockers || (Array.isArray(responseData) ? responseData : null);
        if (!Array.isArray(allLockers)) {
            logger.error("Pudo locker response was not in any expected format.", { responseData });
            throw new https_1.HttpsError('internal', 'Received an invalid response format from the shipping provider.');
        }
        // --- END FIX ---
        logger.info(`Successfully fetched ${allLockers.length} Pudo lockers.`);
        return { data: allLockers };
    }
    catch (error) {
        logger.error('CRITICAL ERROR in getPudoLockers function:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching Pudo lockers.');
    }
});
exports.getPudoRates = (0, https_1.onCall)({ secrets: [pudoApiKeySecret], cors: true }, async (request) => {
    logger.info("getPudoRates invoked.");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }
    const { cart, dispensaryId, destinationLockerCode, originLockerCode, deliveryAddress, type } = request.data;
    if (!cart || cart.length === 0 || !dispensaryId || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required data: cart, dispensaryId, or type.');
    }
    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: Pudo API key not found in secrets. Check function configuration and permissions.");
        throw new https_1.HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }
    const keyParts = pudoApiKey.split('|');
    const apiToken = keyParts.length === 2 ? keyParts[1] : pudoApiKey;
    const PUDO_RATES_URL = `${PUDO_API_URL}/rates`;
    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new https_1.HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data();
        const collectionAddress = {
            street_address: dispensary.streetAddress,
            local_area: dispensary.suburb,
            code: dispensary.postalCode,
            city: dispensary.city,
            zone: dispensary.province,
            country: "ZA",
        };
        if (!collectionAddress.street_address || !collectionAddress.city || !collectionAddress.code || !collectionAddress.zone) {
            throw new https_1.HttpsError('failed-precondition', 'The dispensary address is incomplete and required for Pudo rates.');
        }
        const parcels = cart.map((item) => ({
            submitted_weight_kg: item.weight || 0.1,
            submitted_height_cm: item.height || 10,
            submitted_width_cm: item.width || 10,
            submitted_length_cm: item.length || 10,
            parcel_description: item.name,
        }));
        let apiPayload = { parcels };
        // --- FINAL FIX: Stricter address validation to match working ShipLogic function ---
        switch (type) {
            case 'dtl': // Door-to-Locker
                if (!destinationLockerCode || !deliveryAddress) {
                    throw new https_1.HttpsError('invalid-argument', 'Destination locker and a complete delivery address are required for DTL.');
                }
                if (!deliveryAddress.street_address || !deliveryAddress.city || !deliveryAddress.code || !deliveryAddress.zone || !deliveryAddress.lat || !deliveryAddress.lng) {
                    logger.error('Incomplete delivery address (missing lat/lng) provided for DTL rate request.', { deliveryAddress });
                    throw new https_1.HttpsError('invalid-argument', 'The provided delivery address is incomplete. Please ensure all fields, including coordinates, are filled out.');
                }
                apiPayload.collection_address = collectionAddress;
                apiPayload.delivery_pickup_point_id = destinationLockerCode;
                apiPayload.delivery_pickup_point_provider = "tcg-locker";
                apiPayload.delivery_address = deliveryAddress;
                break;
            case 'ltd': // Locker-to-Door
                if (!originLockerCode || !deliveryAddress) {
                    throw new https_1.HttpsError('invalid-argument', 'Origin locker and a complete delivery address are required for LTD.');
                }
                if (!deliveryAddress.street_address || !deliveryAddress.city || !deliveryAddress.code || !deliveryAddress.zone || !deliveryAddress.lat || !deliveryAddress.lng) {
                    logger.error('Incomplete delivery address (missing lat/lng) provided for LTD rate request.', { deliveryAddress });
                    throw new https_1.HttpsError('invalid-argument', 'The provided delivery address is incomplete. Please ensure all fields, including coordinates, are filled out.');
                }
                apiPayload.collection_pickup_point_id = originLockerCode;
                apiPayload.collection_pickup_point_provider = "tcg-locker";
                apiPayload.delivery_address = deliveryAddress;
                break;
            case 'ltl': // Locker-to-Locker
                if (!originLockerCode || !destinationLockerCode) {
                    throw new https_1.HttpsError('invalid-argument', 'Origin and destination lockers are required for LTL.');
                }
                apiPayload.collection_pickup_point_id = originLockerCode;
                apiPayload.collection_pickup_point_provider = "tcg-locker";
                apiPayload.delivery_pickup_point_id = destinationLockerCode;
                apiPayload.delivery_pickup_point_provider = "tcg-locker";
                break;
            default:
                throw new https_1.HttpsError('invalid-argument', `Invalid Pudo shipping type specified: ${type}`);
        }
        // --- END OF FIX ---
        logger.info(`Requesting Pudo Sandbox rate for type ${type}`, { payload: apiPayload });
        const response = await fetch(PUDO_RATES_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(apiPayload)
        });
        const responseText = await response.text();
        if (!response.ok) {
            let errorBody;
            try {
                errorBody = JSON.parse(responseText);
            }
            catch (e) {
                logger.error('Pudo Sandbox API returned non-JSON error:', { status: response.status, body: responseText });
                throw new https_1.HttpsError('unavailable', `The Pudo shipping provider returned an unreadable error.`);
            }
            logger.error('Pudo Sandbox API returned an error for rate:', { status: response.status, body: errorBody });
            const errorMessage = errorBody.message || 'The Pudo shipping provider returned an error while fetching rates.';
            throw new https_1.HttpsError('unavailable', errorMessage);
        }
        let responseData;
        try {
            responseData = JSON.parse(responseText);
        }
        catch (e) {
            logger.error("Failed to parse JSON from Pudo rates API response:", { responseText });
            throw new https_1.HttpsError('internal', 'Received an invalid response from the Pudo shipping provider.');
        }
        const ratesSource = responseData.responseData || responseData.rates || (Array.isArray(responseData) ? responseData : null);
        if (!Array.isArray(ratesSource)) {
            logger.warn("Pudo rates response was not an array as expected.", { responseData });
            return { rates: [] };
        }
        const formattedRates = ratesSource.map((rate, index) => {
            if (!rate || !rate.service_level_code || !rate.total_price) {
                logger.warn("Skipping malformed rate from Pudo:", { rate });
                return null;
            }
            return {
                id: rate.service_level_code || index,
                name: rate.service_name || 'Pudo Service',
                rate: parseFloat(rate.total_price),
                service_level: rate.service_level_code,
                delivery_time: (rate.eta_days_min && rate.eta_days_max) ? `${rate.eta_days_min}-${rate.eta_days_max} business days` : 'No delivery estimate',
                courier_name: 'Pudo (Sandbox)',
            };
        }).filter((rate) => rate !== null);
        logger.info(`Successfully parsed ${formattedRates.length} rates from Pudo.`);
        return { rates: formattedRates };
    }
    catch (error) {
        logger.error(`CRITICAL ERROR in getPudoRates function for type ${type}:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching Pudo rates.');
    }
});
exports.getShiplogicRates = (0, https_1.onCall)({ secrets: [shiplogicApiKeySecret], cors: true }, async (request) => {
    logger.info("getShiplogicRates invoked (using ShipLogic API Key).");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }
    const { cart, dispensaryId, deliveryAddress } = request.data;
    if (!cart || cart.length === 0 || !dispensaryId || !deliveryAddress ||
        !deliveryAddress.street_address || !deliveryAddress.city || !deliveryAddress.code ||
        !deliveryAddress.lat || !deliveryAddress.lng) {
        logger.error('Request is missing required structured snake_case data.', { deliveryAddress });
        throw new https_1.HttpsError('invalid-argument', 'Request is missing required cart, dispensary, or structured address data.');
    }
    const shiplogicApiKey = shiplogicApiKeySecret.value();
    if (!shiplogicApiKey) {
        logger.error("CRITICAL: ShipLogic API key not found in secrets.");
        throw new https_1.HttpsError('internal', 'Server configuration error: Shipping API key not found.');
    }
    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new https_1.HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data();
        if (!dispensary.streetAddress || !dispensary.city || !dispensary.postalCode) {
            logger.error('Dispensary is missing structured address fields.', { dispensaryId: dispensary.id });
            throw new https_1.HttpsError('failed-precondition', 'Dispensary location address is incomplete. Please ask the dispensary to update their profile.');
        }
        const collectionAddress = {
            street_address: dispensary.streetAddress,
            local_area: dispensary.suburb || '',
            city: dispensary.city,
            code: dispensary.postalCode,
            country: 'ZA',
            type: 'business',
            company: dispensary.dispensaryName
        };
        const parcels = cart.map(item => {
            const quantity = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1;
            if (!item.length || !item.width || !item.height || !item.weight)
                return null;
            return Array(quantity).fill({
                submitted_length_cm: item.length,
                submitted_width_cm: item.width,
                submitted_height_cm: item.height,
                submitted_weight_kg: item.weight,
                parcel_description: item.name,
            });
        }).flat().filter(p => p !== null);
        if (parcels.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
        }
        const shipLogicPayload = {
            collection_address: collectionAddress,
            delivery_address: {
                ...deliveryAddress,
                type: 'residential',
            },
            parcels: parcels,
            declared_value: cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0),
        };
        const response = await fetch(SHIPLOGIC_API_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${shiplogicApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(shipLogicPayload)
        });
        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('ShipLogic API returned an error:', { status: response.status, body: errorMessage });
            throw new https_1.HttpsError('unavailable', `Shipping Provider Error: ${errorMessage}`);
        }
        const ratesSource = responseData?.rates || (Array.isArray(responseData) ? responseData : []);
        if (!Array.isArray(ratesSource)) {
            logger.warn("Shiplogic response was not an array as expected.", { responseData });
            return { rates: [] };
        }
        const formattedRates = ratesSource.map((rate) => {
            if (!rate || !rate.service_level || rate.service_level.id == null || typeof rate.rate !== 'number') {
                logger.warn("Skipping malformed rate from Shiplogic:", rate);
                return null;
            }
            return {
                id: rate.service_level.id,
                name: rate.service_level.name || 'Unnamed Service',
                rate: parseFloat(rate.rate),
                service_level: rate.service_level.name || 'N/A',
                delivery_time: rate.service_level.description || 'No delivery estimate',
                courier_name: rate.courier_name || rate.service_level.name || 'Unknown Courier',
            };
        }).filter((rate) => rate !== null);
        if (formattedRates.length === 0) {
            logger.warn("Shiplogic returned 0 valid rates for the address. Full response:", { ratesSource });
        }
        logger.info(`Successfully parsed ${formattedRates.length} rates from ShipLogic.`);
        return { rates: formattedRates };
    }
    catch (error) {
        logger.error('CRITICAL ERROR in getShiplogicRates function:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An unexpected server error occurred while fetching shipping rates.');
    }
});
//# sourceMappingURL=index.js.map