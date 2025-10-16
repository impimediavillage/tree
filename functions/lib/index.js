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
// ============== FIREBASE ADMIN SDK INITIALIZATION ==============//
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
// ========================================================================================================
//                                       SHIPPING FUNCTIONS
// ========================================================================================================
// --- DEFINE SECRETS AND ENDPOINTS ---
const shiplogicApiKeySecret = (0, params_1.defineSecret)('SHIPLOGIC_API_KEY');
const pudoApiKeySecret = (0, params_1.defineSecret)('PUDO_API_KEY'); // Pudo/TCG API Key
const SHIPLOGIC_RATES_API_URL = 'https://api.shiplogic.com/v2/rates';
const PUDO_BASE_URL = 'https://sandbox.api-pudo.co.za/api/v1';
// --- NEW: FUNCTION TO FETCH LOCKER LOCATIONS (from Pudo/TCG) ---
exports.getPudoLockers = (0, https_1.onCall)({ secrets: [pudoApiKeySecret], cors: true }, async (request) => {
    logger.info("getPudoLockers invoked with dynamic radius logic.");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo lockers.');
    }
    const { latitude, longitude, radius = 100, city } = request.data;
    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new https_1.HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }
    const url = `${PUDO_BASE_URL}/lockers-data`;
    // --- Haversine formula function to calculate distance ---
    const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 0.5 - Math.cos(dLat) / 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                (1 - Math.cos(dLon)) / 2;
        return R * 2 * Math.asin(Math.sqrt(a));
    };
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${pudoApiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
        });
        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.message || 'Failed to fetch lockers from Pudo provider.';
            logger.error('Pudo API Error:', { status: response.status, message: errorMessage });
            throw new Error(errorMessage);
        }
        const allLockers = responseData;
        if (!Array.isArray(allLockers)) {
            throw new https_1.HttpsError('internal', 'Received an invalid response format from the locker provider.');
        }
        let formattedLockers = [];
        if (latitude != null && longitude != null) {
            logger.info(`Filtering and enriching lockers by radius (${radius}km) around lat: ${latitude}, lng: ${longitude}`);
            formattedLockers = allLockers.reduce((acc, locker) => {
                const lockerLat = parseFloat(locker.latitude);
                const lockerLng = parseFloat(locker.longitude);
                if (isNaN(lockerLat) || isNaN(lockerLng)) {
                    return acc; // Skip lockers with invalid coordinates
                }
                const distance = getDistanceInKm(latitude, longitude, lockerLat, lockerLng);
                if (distance <= radius) {
                    acc.push({
                        id: locker.code,
                        name: locker.name,
                        address: locker.street_address, // Use 'address' to match schema and frontend
                        distanceKm: distance // Attach the calculated distance
                    });
                }
                return acc;
            }, []);
            // Sort by distance, closest first
            formattedLockers.sort((a, b) => a.distanceKm - b.distanceKm);
        }
        else if (city) {
            logger.warn(`Lat/Lng not provided. Falling back to inefficient city string filter for: ${city}`);
            formattedLockers = allLockers
                .filter((locker) => locker.street_address && locker.street_address.toLowerCase().includes(city.toLowerCase()))
                .map((locker) => ({
                id: locker.code,
                name: locker.name,
                address: locker.street_address, // Use 'address' field
                distanceKm: null // No distance can be calculated
            }));
        }
        else {
            logger.error("No location data (lat/lng or city) provided to getPudoLockers.");
            throw new https_1.HttpsError('invalid-argument', 'No location data was provided to find lockers.');
        }
        logger.info(`Successfully fetched and formatted ${formattedLockers.length} Pudo lockers.`);
        if (formattedLockers.length === 0) {
            logger.warn("No lockers found within the specified radius or matching the city.");
        }
        return { data: formattedLockers };
    }
    catch (error) {
        logger.error('CRITICAL ERROR in getPudoLockers function:', error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', 'An unexpected server error occurred while fetching Pudo lockers.');
    }
});
// --- FUNCTION FOR LOCKER-BASED RATES (dtl, ltd, ltl) using PUDO Sandbox ---
exports.getPudoRates = (0, https_1.onCall)({ secrets: [pudoApiKeySecret], cors: true }, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo rates.');
    }
    // CORRECTED: The cart IS required to calculate parcel dimensions.
    const { cart, dispensaryId, deliveryAddress, type, originLockerCode, destinationLockerCode } = request.data;
    if (!cart || cart.length === 0 || !dispensaryId || !type) {
        throw new https_1.HttpsError('invalid-argument', 'Request is missing required cart, dispensaryId, or type data.');
    }
    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new https_1.HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }
    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new https_1.HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data();
        // --- CORRECTED: Logic to build 'parcels' array from cart items IS included ---
        // Pudo expects string values for parcel dimensions from the docs.
        const parcels = cart.map(item => {
            const quantity = (typeof item.quantity === 'number' && item.quantity > 0) ? item.quantity : 1;
            // Ensure all dimension fields exist before creating a parcel
            if (item.length == null || item.width == null || item.height == null || item.weight == null) {
                logger.warn(`Skipping item ${item.name} due to missing dimensions.`);
                return null;
            }
            return Array(quantity).fill({
                submitted_length_cm: String(item.length),
                submitted_width_cm: String(item.width),
                submitted_height_cm: String(item.height),
                submitted_weight_kg: String(item.weight),
                parcel_description: item.name,
            });
        }).flat().filter(p => p !== null);
        if (parcels.length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
        }
        // Base collection address from the dispensary's physical location for D2L
        const dispensaryCollectionAddress = {
            lat: dispensary.latitude,
            lng: dispensary.longitude,
            street_address: dispensary.streetAddress,
            local_area: dispensary.suburb || dispensary.city,
            city: dispensary.city,
            code: dispensary.postalCode,
            zone: dispensary.province,
            country: "South Africa",
            type: "business",
            company: dispensary.dispensaryName
        };
        // --- CORRECTED PAYLOAD: INCLUDES 'parcels' ARRAY ---
        let pudoPayload = {
            parcels: parcels,
            opt_in_rates: [],
            opt_in_time_based_rates: [],
        };
        switch (type) {
            case 'dtl': // Door-to-Locker
                if (!destinationLockerCode)
                    throw new https_1.HttpsError('invalid-argument', 'Destination locker is required for DTL.');
                pudoPayload.collection_address = dispensaryCollectionAddress;
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;
            case 'ltd': // Locker-to-Door
                if (!originLockerCode || !deliveryAddress)
                    throw new https_1.HttpsError('invalid-argument', 'Origin locker and delivery address are required for LTD.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { ...deliveryAddress, type: 'residential' };
                break;
            case 'ltl': // Locker-to-Locker
                if (!originLockerCode || !destinationLockerCode)
                    throw new https_1.HttpsError('invalid-argument', 'Origin and destination lockers are required for LTL.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;
            default:
                throw new https_1.HttpsError('invalid-argument', `Invalid type '${type}' sent to getPudoRates.`);
        }
        logger.info(`Requesting Pudo rate for type ${type}`, { payload: pudoPayload });
        const url = `${PUDO_BASE_URL}/rates`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${pudoApiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(pudoPayload)
        });
        const responseData = await response.json();
        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('Pudo API returned an error:', { status: response.status, body: errorMessage });
            throw new https_1.HttpsError('unavailable', `Pudo Provider Error: ${errorMessage}`);
        }
        const ratesSource = responseData?.rates;
        if (!Array.isArray(ratesSource)) {
            logger.warn("Pudo response did not contain a 'rates' array as expected.", { responseData });
            return { rates: [] };
        }
        const formattedRates = ratesSource.map((rate) => {
            if (!rate || !rate.service_level || rate.service_level.id == null || typeof rate.rate !== 'string') {
                logger.warn("Skipping malformed rate from Pudo:", rate);
                return null;
            }
            return {
                id: rate.service_level.id,
                name: rate.service_level.name || 'Unnamed Service',
                rate: parseFloat(rate.rate),
                service_level: rate.service_level.code || 'N/A',
                delivery_time: rate.service_level.description || 'No delivery estimate',
                courier_name: 'Pudo',
            };
        }).filter((rate) => rate !== null);
        logger.info(`Successfully parsed ${formattedRates.length} rates from Pudo.`);
        return { rates: formattedRates };
    }
    catch (error) {
        logger.error(`CRITICAL ERROR in getPudoRates function:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo rates.');
    }
});
// --- FUNCTION FOR DOOR-TO-DOOR RATES ('std') using SHIPLOGIC ---
exports.getShiplogicRates = (0, https_1.onCall)({ secrets: [shiplogicApiKeySecret], cors: true }, async (request) => {
    logger.info("getShiplogicRates invoked for standard (door-to-door) delivery.");
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }
    const { cart, dispensaryId, deliveryAddress, type } = request.data;
    // This function should only handle 'std' (door-to-door)
    if (type !== 'std') {
        throw new https_1.HttpsError('invalid-argument', `This function only handles 'std' rates. Received '${type}'.`);
    }
    if (!cart || cart.length === 0 || !dispensaryId || !deliveryAddress) {
        throw new https_1.HttpsError('invalid-argument', 'Request for standard delivery is missing cart, dispensaryId, or deliveryAddress.');
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
        let shipLogicPayload = {
            parcels: parcels,
            declared_value: cart.reduce((total, item) => total + (item.price || 0) * (item.quantity || 1), 0),
            collection_address: collectionAddress,
            delivery_address: { ...deliveryAddress, type: 'residential' }
        };
        logger.info(`Requesting ShipLogic rate for type ${type}`, { payload: shipLogicPayload });
        const response = await fetch(SHIPLOGIC_RATES_API_URL, {
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
            logger.warn("Shiplogic returned 0 valid rates. Full response:", { ratesSource });
        }
        logger.info(`Successfully parsed ${formattedRates.length} rates from ShipLogic.`);
        return { rates: formattedRates };
    }
    catch (error) {
        logger.error(`CRITICAL ERROR in getShiplogicRates (dtd) function:`, error);
        if (error instanceof https_1.HttpsError) {
            throw error;
        }
        throw new https_1.HttpsError('internal', error.message || 'An unexpected server error occurred while fetching shipping rates.');
    }
});
//# sourceMappingURL=index.js.map