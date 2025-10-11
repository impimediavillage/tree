
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import type { Dispensary, User as AppUser, UserDocData, AllowedUserRole, DeductCreditsRequestBody, CartItem } from './types';

// ============== FIREBASE ADMIN SDK INITIALIZATION ==============/
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


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) - V2 SYNTAX ==============
export const onUserWriteSetClaims = onDocumentWritten("users/{userId}", async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after.data() as UserDocData | undefined;

    if (!afterData) {
        logger.info(`User document ${userId} deleted. Revoking custom claims.`);
        try {
            await admin.auth().setCustomUserClaims(userId, null);
            logger.info(`Successfully revoked custom claims for deleted user ${userId}.`);
        } catch (error) {
            logger.error(`Error revoking custom claims for deleted user ${userId}:`, error);
        }
        return;
    }

    const validRoles: AllowedUserRole[] = ['User', 'LeafUser', 'DispensaryOwner', 'Super Admin', 'DispensaryStaff'];
    const role: AllowedUserRole = afterData.role && validRoles.includes(afterData.role as AllowedUserRole)
        ? afterData.role as AllowedUserRole
        : 'User';
        
    const dispensaryId = afterData.dispensaryId || null;
    let dispensaryType: string | null = null;

    if (dispensaryId) {
        try {
            const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
            if (dispensaryDoc.exists) {
                dispensaryType = dispensaryDoc.data()?.dispensaryType || null;
            }
        } catch (error) {
            logger.error(`Failed to fetch dispensary type for dispensaryId ${dispensaryId}:`, error);
        }
    }
    
    const claims: { [key: string]: any } = { 
        role, 
        dispensaryId, 
        dispensaryType 
    };

    try {
        await admin.auth().setCustomUserClaims(userId, claims);
        logger.info(`Successfully set custom claims for user ${userId}:`, claims);
    } catch (error) {
        logger.error(`Error setting custom claims for user ${userId}:`, error);
    }
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

// ============== Callable Functions (v2) ==============

export const getUserProfile = onCall(async (request: CallableRequest): Promise<AppUser> => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { uid, token } = request.auth; 

    try {
        const userDocRef = db.collection('users').doc(uid);
        const userDocSnap = await userDocRef.get();

        if (!userDocSnap.exists) {
            logger.warn(`User document not found for uid: ${uid}.`);
            throw new HttpsError('not-found', 'Your user profile data could not be found.');
        }
        
        const userData = userDocSnap.data() as UserDocData;
        
        let dispensaryData: Dispensary | null = null;
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
                    } as Dispensary;
                }
            }
        }
        
        const profileResponse: AppUser = {
            uid: uid,
            email: userData.email || token.email || '',
            displayName: userData.displayName || token.name || '',
            photoURL: userData.photoURL || token.picture || null,
            role: (token.role as AllowedUserRole || 'User'),
            dispensaryId: (token.dispensaryId as string || null),
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
    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getUserProfile for ${uid}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while fetching your profile.');
    }
});

export const deductCreditsAndLogInteraction = onCall(async (request: CallableRequest<DeductCreditsRequestBody>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    
    const { userId, advisorSlug, creditsToDeduct, wasFreeInteraction } = request.data;
    const dispensaryId = request.auth.token.dispensaryId || null;
    
    if (userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'You can only deduct your own credits.');
    }
    
    if (!userId || !advisorSlug || creditsToDeduct === undefined || wasFreeInteraction === undefined) {
        throw new HttpsError('invalid-argument', 'Missing or invalid arguments provided.');
    }

    const userRef = db.collection("users").doc(userId);
    let newCreditBalance = 0;

    try {
        await db.runTransaction(async (transaction) => {
            const freshUserDoc = await transaction.get(userRef);
            if (!freshUserDoc.exists) {
                throw new HttpsError('not-found', 'User not found during transaction.');
            }
            
            const userData = freshUserDoc.data() as UserDocData;
            const currentCredits = userData.credits || 0;

            if (!wasFreeInteraction) {
                if (currentCredits < creditsToDeduct && creditsToDeduct > 0) {
                    throw new HttpsError('failed-precondition', 'Insufficient credits.');
                }
                newCreditBalance = currentCredits - creditsToDeduct;
                transaction.update(userRef, { credits: newCreditBalance });
            } else {
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

    } catch (error: any) {
        logger.error("Error in deductCreditsAndLogInteraction transaction:", error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An internal error occurred while processing the transaction.');
    }
});

export const getCannabinoidProductCategories = onCall({ cors: true }, async (request: CallableRequest<{ stream: 'THC' | 'CBD' }>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
    }
    const { stream } = request.data;
    if (!stream || (stream !== 'THC' && stream !== 'CBD')) {
        throw new HttpsError('invalid-argument', 'A valid stream ("THC" or "CBD") must be provided.');
    }

    try {
        const categoriesRef = db.collection('dispensaryTypeProductCategories');
        const q = categoriesRef.where('name', '==', "Cannibinoid store").limit(1);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            throw new HttpsError('not-found', 'Cannabinoid product category configuration not found.');
        }

        const docData = querySnapshot.docs[0].data();
        
        const deliveryMethods = docData?.categoriesData?.thcCbdProductCategories?.[stream]?.['Delivery Methods'];
        
        if (!deliveryMethods || typeof deliveryMethods !== 'object') {
            throw new HttpsError('not-found', `The 'Delivery Methods' structure for the '${stream}' stream is invalid or missing.`);
        }
        
        return deliveryMethods;

    } catch (error: any) {
        logger.error("Error fetching cannabinoid product categories:", error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', 'An error occurred while fetching product categories.');
    }
});

export const searchStrains = onCall({ cors: true }, async (request: CallableRequest<{ searchTerm: string; }>) => {
    const { searchTerm } = request.data;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        throw new HttpsError('invalid-argument', 'A valid search term must be provided.');
    }
    
    const toTitleCase = (str: string) => str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
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

    } catch (error: any) {
        logger.error(`Error searching strains with term "${searchTerm}":`, error);
        throw new HttpsError('internal', 'An error occurred while searching for strains.');
    }
});

export const createDispensaryUser = onCall(async (request: CallableRequest<{ email: string; displayName: string; dispensaryId: string; }>) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can create dispensary users.');
    }

    const { email, displayName, dispensaryId } = request.data;
    if (!email || !displayName || !dispensaryId) {
        throw new HttpsError('invalid-argument', 'Email, display name, and dispensary ID are required.');
    }

    try {
        const existingUser = await admin.auth().getUserByEmail(email).catch(() => null);

        if (existingUser) {
            const userDoc = await db.collection('users').doc(existingUser.uid).get();
            if (userDoc.exists && userDoc.data()?.dispensaryId) {
                throw new HttpsError('already-exists', `User with email ${email} already exists and is linked to a dispensary.`);
            }
            await db.collection('users').doc(existingUser.uid).update({
                dispensaryId: dispensaryId,
                role: 'DispensaryOwner',
                status: 'Active',
            });
             return { success: true, message: `Existing user ${email} successfully linked as DispensaryOwner.` };
        } else {
            const temporaryPassword = Math.random().toString(36).slice(-8);
            const newUserRecord = await admin.auth().createUser({
                email: email,
                emailVerified: false,
                password: temporaryPassword,
                displayName: displayName,
                disabled: false,
            });

            const userDocData: UserDocData = {
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
    } catch (error: any) {
        logger.error(`Error creating dispensary user for ${email}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while creating the user account.');
    }
});

export const adminUpdateUser = onCall(async (request) => {
    if (request.auth?.token.role !== 'Super Admin') {
        throw new HttpsError('permission-denied', 'Only Super Admins can update users.');
    }

    const { userId, password, ...firestoreData } = request.data;
    if (!userId) {
        throw new HttpsError('invalid-argument', 'User ID is required.');
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
    } catch (error: any) {
        logger.error(`Error in adminUpdateUser for ${userId}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        if (error.code === 'auth/user-not-found') {
            throw new HttpsError('not-found', 'The specified user does not exist.');
        }
        throw new HttpsError('internal', 'An unexpected error occurred while updating the user.');
    }
});

// ============== SHIPPING FUNCTIONS ==============//

const shiplogicApiKeySecret = defineSecret('SHIPLOGIC_API_KEY'); 
const pudoEmailSecret = defineSecret('PUDO_EMAIL');
const pudoPasswordSecret = defineSecret('PUDO_PASSWORD');


const SHIPLOGIC_API_URL = 'https://api.shiplogic.com/v2/rates';
const PUDO_API_URL = 'https://api.pudo.co.za/api/v1';

let pudoAuthToken: {
    token: string;
    expiresAt: number;
} | null = null;

/**
 * Fetches and caches a Pudo authentication token.
 * This function retrieves a new token only when the cached one is null or nearing expiration.
 * @returns {Promise<string>} The valid bearer token.
 */
const getPudoAuthToken = async (): Promise<string> => {
    const now = Date.now();

    // Return cached token if it's still valid (with a 5-minute buffer)
    if (pudoAuthToken && pudoAuthToken.expiresAt > now + 5 * 60 * 1000) {
        logger.info("Using cached Pudo auth token.");
        return pudoAuthToken.token;
    }

    logger.info("Fetching new Pudo auth token...");
    const email = pudoEmailSecret.value();
    const password = pudoPasswordSecret.value();

    if (!email || !password) {
        logger.error("CRITICAL: Pudo email or password not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Pudo credentials are not set.');
    }

    try {
        const response = await fetch(`${PUDO_API_URL}/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok || !data.token || !data.expires_in) {
            const errorMessage = data.error || data.message || JSON.stringify(data);
            logger.error('Failed to fetch Pudo auth token:', { status: response.status, body: errorMessage });
            throw new HttpsError('unavailable', `Pudo authentication failed: ${errorMessage}`);
        }

        // Cache the new token and its expiration time (expires_in is in seconds)
        pudoAuthToken = {
            token: data.token,
            expiresAt: now + (data.expires_in * 1000),
        };

        logger.info("Successfully fetched and cached new Pudo auth token.");
        return pudoAuthToken.token;

    } catch (error: any) {
        logger.error("CRITICAL ERROR in getPudoAuthToken:", error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected error occurred during Pudo authentication.');
    }
};

interface ShipLogicDeliveryAddress {
    street_address: string;
    local_area: string; 
    city: string;
    zone: string; 
    code: string; 
    country: string;
    lat: number;
    lng: number;
}

interface GetRatesRequestPayload {
    cart: CartItem[];
    dispensaryId: string;
    deliveryAddress: ShipLogicDeliveryAddress; 
}

// Specific payload for Pudo DTL
interface GetPudoRatesRequestPayload {
    cart: CartItem[];
    dispensaryId: string;
    destinationLockerCode: string;
}


interface FormattedRate {
    id: any;
    name: any;
    rate: number;
    service_level: any;
    delivery_time: any;
    courier_name: any;
}

export const getPudoLockers = onCall({ secrets: [pudoEmailSecret, pudoPasswordSecret], cors: true }, async (request: CallableRequest) => {
    logger.info("getPudoLockers invoked.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch lockers.');
    }

    try {
        const authToken = await getPudoAuthToken();

        const response = await fetch(`${PUDO_API_URL}/lockers`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('Pudo API returned an error while fetching lockers:', { status: response.status, body: errorMessage });
            throw new HttpsError('unavailable', `Shipping Provider Error: ${errorMessage}`);
        }

        return responseData; // Return the raw locker data

    } catch (error: any) {
        logger.error('CRITICAL ERROR in getPudoLockers function:', error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo lockers.');
    }
});

// New function to get Pudo rates
export const getPudoRates = onCall({ secrets: [pudoEmailSecret, pudoPasswordSecret], cors: true }, async (request: CallableRequest<GetPudoRatesRequestPayload>) => {
    logger.info("getPudoRates invoked.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }

    const { cart, dispensaryId, destinationLockerCode } = request.data;

    if (!cart || cart.length === 0 || !dispensaryId || !destinationLockerCode) {
        throw new HttpsError('invalid-argument', 'Request is missing required cart, dispensary, or locker code.');
    }

    try {
        const authToken = await getPudoAuthToken();

        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data() as Dispensary;

        if (!dispensary.streetAddress || !dispensary.city || !dispensary.postalCode) {
             logger.error('Dispensary is missing structured address fields.', { dispensaryId: dispensary.id });
             throw new HttpsError('failed-precondition', 'Dispensary location address is incomplete.');
        }

        // 1. Calculate total dimensions and weight
        let totalWeight = 0;
        let maxLength = 0;
        let maxWidth = 0;
        let maxHeight = 0;

        cart.forEach(item => {
            const quantity = item.quantity || 1;
            totalWeight += (item.weight || 0) * quantity;
            maxLength = Math.max(maxLength, item.length || 0);
            maxWidth = Math.max(maxWidth, item.width || 0);
            maxHeight += (item.height || 0) * quantity; // Stack height for simplicity
        });

        // 2. Determine parcel size based on provided definitions
        let parcelSize = '';
        if (totalWeight <= 2 && maxLength <= 60 && maxWidth <= 17 && maxHeight <= 8) {
            parcelSize = 'XS';
        } else if (totalWeight <= 5 && maxLength <= 60 && maxWidth <= 41 && maxHeight <= 8) {
            parcelSize = 'S';
        } else if (totalWeight <= 10 && maxLength <= 60 && maxWidth <= 41 && maxHeight <= 19) {
            parcelSize = 'M';
        } else if (totalWeight <= 15 && maxLength <= 60 && maxWidth <= 41 && maxHeight <= 41) {
            parcelSize = 'L';
        } else if (totalWeight <= 20 && maxLength <= 60 && maxWidth <= 41 && maxHeight <= 69) {
            parcelSize = 'XL';
        } else {
            throw new HttpsError('failed-precondition', 'The combined items exceed the largest parcel dimensions (XL).');
        }

        const collectionAddress = {
            street_address: dispensary.streetAddress,
            local_area: dispensary.suburb || '',
            city: dispensary.city,
            code: dispensary.postalCode,
            country: 'ZA',
        };

        const pudoPayload = {
            collection_address: collectionAddress,
            destination_locker_code: destinationLockerCode,
            parcel_size: parcelSize,
        };

        // 3. Call Pudo API
        const response = await fetch(`${PUDO_API_URL}/quotes`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(pudoPayload)
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMessage = responseData.error || responseData.message || JSON.stringify(responseData);
            logger.error('Pudo API returned an error:', { status: response.status, body: errorMessage });
            throw new HttpsError('unavailable', `Shipping Provider Error: ${errorMessage}`);
        }

        const rateValue = responseData.price || responseData.rate;
        if (typeof rateValue !== 'number') {
             logger.error('Pudo quote response did not contain a valid rate field.', { responseData });
             throw new HttpsError('internal', 'Could not parse the shipping rate from the provider.');
        }

        const formattedRate: FormattedRate = {
            id: `pudo-dtl-${destinationLockerCode}`,
            name: 'Door-to-Locker',
            rate: rateValue,
            service_level: 'Standard',
            delivery_time: '1-4 business days',
            courier_name: 'Pudo (The Courier Guy)',
        };

        return { rates: [formattedRate] };

    } catch (error: any) {
        logger.error('CRITICAL ERROR in getPudoRates function:', error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo rates.');
    }
});


export const getShiplogicRates = onCall({ secrets: [shiplogicApiKeySecret], cors: true }, async (request: CallableRequest<GetRatesRequestPayload>) => {
    logger.info("getShiplogicRates invoked (v16 - Corrected Rate Parsing).");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }

    const { cart, dispensaryId, deliveryAddress } = request.data;

    if (
        !cart || cart.length === 0 || !dispensaryId || !deliveryAddress || 
        !deliveryAddress.street_address || !deliveryAddress.city || !deliveryAddress.code || 
        !deliveryAddress.lat || !deliveryAddress.lng
    ) {
        logger.error('Request is missing required structured snake_case data.', { deliveryAddress });
        throw new HttpsError('invalid-argument', 'Request is missing required cart, dispensary, or structured address data.');
    }

    const shiplogicApiKey = shiplogicApiKeySecret.value();
    if (!shiplogicApiKey) {
        logger.error("CRITICAL: ShipLogic API key not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Shipping API key not found.');
    }

    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data() as Dispensary;

        if (!dispensary.streetAddress || !dispensary.city || !dispensary.postalCode) {
             logger.error('Dispensary is missing structured address fields.', { dispensaryId: dispensary.id });
             throw new HttpsError('failed-precondition', 'Dispensary location address is incomplete. Please ask the dispensary to update their profile.');
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
            if (!item.length || !item.width || !item.height || !item.weight) return null;
            return Array(quantity).fill({
                submitted_length_cm: item.length,
                submitted_width_cm: item.width,
                submitted_height_cm: item.height,
                submitted_weight_kg: item.weight,
                parcel_description: item.name,
            });
        }).flat().filter(p => p !== null) as object[];

        if (parcels.length === 0) {
            throw new HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
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
            throw new HttpsError('unavailable', `Shipping Provider Error: ${errorMessage}`);
        }

        const ratesSource = responseData?.rates || (Array.isArray(responseData) ? responseData : []);
        
        if (!Array.isArray(ratesSource)) {
            logger.warn("Shiplogic response was not an array as expected.", { responseData });
            return { rates: [] };
        }
        
        const formattedRates = ratesSource.map((rate: any): FormattedRate | null => {
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
        }).filter((rate): rate is FormattedRate => rate !== null);

        if (formattedRates.length === 0) {
            logger.warn("Shiplogic returned 0 valid rates for the address. Full response:", { ratesSource });
        }

        logger.info(`Successfully parsed ${formattedRates.length} rates from ShipLogic.`);
        return { rates: formattedRates };

    } catch (error: any) {
        logger.error('CRITICAL ERROR in getShiplogicRates function:', error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching shipping rates.');
    }
});
