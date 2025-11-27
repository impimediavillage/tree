import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import type { Dispensary, User as AppUser, UserDocData, AllowedUserRole, DeductCreditsRequestBody, CartItem, OwnerUpdateDispensaryPayload } from './types';

// ============== FIREBASE ADMIN SDK INITIALIZATION ==============//
if (admin.apps.length === 0) {
    try {
        admin.initializeApp();
        logger.info("Firebase Admin SDK initialized successfully.");
    } catch (e: any) {
        logger.error("CRITICAL: Firebase Admin SDK initialization failed:", e);
    }
}
const db = admin.firestore();
// ============== END INITIALIZATION =============


// ============== AUTH TRIGGER FOR CUSTOM CLAIMS (CRITICAL FOR SECURITY) - V2 SYNTAX =============
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
             // Return the UID of the existing user
             return { 
                success: true, 
                message: `Existing user ${email} successfully linked as DispensaryOwner.`,
                uid: existingUser.uid 
            };
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
            
            // Return the UID of the newly created user
            return {
                success: true,
                message: 'New user account created successfully. Please provide them with their temporary password.',
                temporaryPassword: temporaryPassword,
                uid: newUserRecord.uid
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

// ========================================================================================================
//                                       SHIPPING FUNCTIONS
// ========================================================================================================

// --- DEFINE SECRETS AND ENDPOINTS ---
const shiplogicApiKeySecret = defineSecret('SHIPLOGIC_API_KEY');
const pudoApiKeySecret = defineSecret('PUDO_API_KEY'); // Pudo/TCG API Key

const SHIPLOGIC_RATES_API_URL = 'https://api.shiplogic.com/v2/rates';
const PUDO_BASE_URL = 'https://sandbox.api-pudo.co.za/api/v1';


// --- TYPE INTERFACES ---
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
    deliveryAddress?: ShipLogicDeliveryAddress;
    type: 'std' | 'dtl' | 'ltd' | 'ltl';
    originLockerCode?: string;
    destinationLockerCode?: string;
}

interface FormattedRate {
    id: any;
    name: any;
    rate: number;
    service_level: any;
    delivery_time: any;
    courier_name: any;
}


export const getPudoLockers = onCall({ secrets: [pudoApiKeySecret], cors: true }, async (request: CallableRequest<{ latitude?: number; longitude?: number; radius?: number; city?: string; }>) => {
    logger.info("getPudoLockers invoked with dynamic radius logic.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo lockers.');
    }
    
    const { latitude, longitude, radius = 100, city } = request.data;

    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }

    const url = `${PUDO_BASE_URL}/lockers-data`;

    // --- Haversine formula function to calculate distance ---
    const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            0.5 - Math.cos(dLat)/2 + 
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
            throw new HttpsError('internal', 'Received an invalid response format from the locker provider.');
        }

        let formattedLockers: any[] = [];

        if (latitude != null && longitude != null) {
            logger.info(`Filtering and enriching lockers by radius (${radius}km) around lat: ${latitude}, lng: ${longitude}`);
            
            formattedLockers = allLockers.reduce((acc: any[], locker: any) => {
                const lockerLat = parseFloat(locker.latitude);
                const lockerLng = parseFloat(locker.longitude);

                if (isNaN(lockerLat) || isNaN(lockerLng)) {
                    return acc; // Skip lockers with invalid coordinates
                }
                
                const distance = getDistanceInKm(latitude, longitude, lockerLat, lockerLng);
                
                if (distance <= radius) {
                    // Return complete PUDO locker structure for shipping compatibility
                    acc.push({
                        id: locker.code,
                        name: locker.name || '',
                        address: locker.street_address || '',
                        street_address: locker.street_address || '',
                        city: locker.city || '',
                        province: locker.province || '',
                        postalCode: locker.postal_code || '',
                        suburb: locker.suburb || '',
                        status: locker.status || 'active',
                        availableCompartments: locker.available_compartments || 0,
                        location: {
                            lat: lockerLat,
                            lng: lockerLng
                        },
                        distanceKm: distance // Temporary field for sorting (removed before saving)
                    });
                }
                return acc;
            }, []);
            
            // Sort by distance, closest first
            formattedLockers.sort((a, b) => a.distanceKm - b.distanceKm);

        } else if (city) {
            logger.warn(`Lat/Lng not provided. Falling back to inefficient city string filter for: ${city}`);
            formattedLockers = allLockers
                .filter((locker: any) => locker.street_address && locker.street_address.toLowerCase().includes(city.toLowerCase()))
                .map((locker: any) => {
                    const lockerLat = parseFloat(locker.latitude);
                    const lockerLng = parseFloat(locker.longitude);
                    return {
                        id: locker.code,
                        name: locker.name || '',
                        address: locker.street_address || '',
                        street_address: locker.street_address || '',
                        city: locker.city || '',
                        province: locker.province || '',
                        postalCode: locker.postal_code || '',
                        suburb: locker.suburb || '',
                        status: locker.status || 'active',
                        availableCompartments: locker.available_compartments || 0,
                        location: !isNaN(lockerLat) && !isNaN(lockerLng) ? {
                            lat: lockerLat,
                            lng: lockerLng
                        } : undefined,
                        distanceKm: null // No distance can be calculated
                    };
                });
        } else {
            logger.error("No location data (lat/lng or city) provided to getPudoLockers.");
            throw new HttpsError('invalid-argument', 'No location data was provided to find lockers.');
        }

        logger.info(`Successfully fetched and formatted ${formattedLockers.length} Pudo lockers with complete structure.`);
        if (formattedLockers.length === 0) {
             logger.warn("No lockers found within the specified radius or matching the city.");
        }
        
        return { data: formattedLockers };

    } catch (error: any) {
        logger.error('CRITICAL ERROR in getPudoLockers function:', error);
        if (error instanceof HttpsError) {
          // If it's already an HttpsError, just re-throw it
          throw error;
        }
        // Otherwise, wrap it in a generic 'internal' HttpsError
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo lockers.');
    }
});


// --- FUNCTION FOR LOCKER-BASED RATES (dtl, ltd, ltl) using PUDO Sandbox ---
export const getPudoRates = onCall({ secrets: [pudoApiKeySecret], cors: true }, async (request: CallableRequest<GetRatesRequestPayload>) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch Pudo rates.');
    }
    
    // CORRECTED: The cart IS required to calculate parcel dimensions.
    const { cart, dispensaryId, deliveryAddress, type, originLockerCode, destinationLockerCode } = request.data;

    if (!cart || cart.length === 0 || !dispensaryId || !type) {
        throw new HttpsError('invalid-argument', 'Request is missing required cart, dispensaryId, or type data.');
    }

    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error("CRITICAL: PUDO_API_KEY not found in secrets.");
        throw new HttpsError('internal', 'Server configuration error: Pudo API key not found.');
    }

    try {
        const dispensaryDoc = await db.collection('dispensaries').doc(dispensaryId).get();
        if (!dispensaryDoc.exists) {
            throw new HttpsError('not-found', `Dispensary '${dispensaryId}' not found.`);
        }
        const dispensary = dispensaryDoc.data() as Dispensary;
        
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
        }).flat().filter(p => p !== null) as object[];

        if (parcels.length === 0) {
            throw new HttpsError('invalid-argument', 'No items in the cart have valid shipping dimensions.');
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
        let pudoPayload: any = {
            parcels: parcels,
            opt_in_rates: [],
            opt_in_time_based_rates: [],
        };

        switch (type) {
            case 'dtl': // Door-to-Locker
                if (!destinationLockerCode) throw new HttpsError('invalid-argument', 'Destination locker is required for DTL.');
                pudoPayload.collection_address = dispensaryCollectionAddress;
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;

            case 'ltd': // Locker-to-Door
                if (!originLockerCode || !deliveryAddress) throw new HttpsError('invalid-argument', 'Origin locker and delivery address are required for LTD.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { ...deliveryAddress, type: 'residential' };
                break;

            case 'ltl': // Locker-to-Locker
                if (!originLockerCode || !destinationLockerCode) throw new HttpsError('invalid-argument', 'Origin and destination lockers are required for LTL.');
                pudoPayload.collection_address = { terminal_id: originLockerCode };
                pudoPayload.delivery_address = { terminal_id: destinationLockerCode };
                break;
            
            default:
                throw new HttpsError('invalid-argument', `Invalid type '${type}' sent to getPudoRates.`);
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
            throw new HttpsError('unavailable', `Pudo Provider Error: ${errorMessage}`);
        }

        const ratesSource = responseData?.rates;
        
        if (!Array.isArray(ratesSource)) {
            logger.warn("Pudo response did not contain a 'rates' array as expected.", { responseData });
            return { rates: [] };
        }
        
        const formattedRates = ratesSource.map((rate: any): FormattedRate | null => {
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
        }).filter((rate): rate is FormattedRate => rate !== null);

        logger.info(`Successfully parsed ${formattedRates.length} rates from Pudo.`);
        return { rates: formattedRates };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getPudoRates function:`, error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching Pudo rates.');
    }
});

// --- FUNCTION FOR DOOR-TO-DOOR RATES ('std') using SHIPLOGIC ---
export const getShiplogicRates = onCall({ secrets: [shiplogicApiKeySecret], cors: true }, async (request: CallableRequest<GetRatesRequestPayload>) => {
    logger.info("getShiplogicRates invoked for standard (door-to-door) delivery.");

    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'Must be authenticated to fetch rates.');
    }
    
    const { cart, dispensaryId, deliveryAddress, type } = request.data;

    // This function should only handle 'std' (door-to-door)
    if (type !== 'std') {
        throw new HttpsError('invalid-argument', `This function only handles 'std' rates. Received '${type}'.`);
    }

    if (!cart || cart.length === 0 || !dispensaryId || !deliveryAddress) {
        throw new HttpsError('invalid-argument', 'Request for standard delivery is missing cart, dispensaryId, or deliveryAddress.');
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
            logger.warn("Shiplogic returned 0 valid rates. Full response:", { ratesSource });
        }

        logger.info(`Successfully parsed ${formattedRates.length} rates from ShipLogic.`);
        return { rates: formattedRates };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in getShiplogicRates (dtd) function:`, error);
         if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', error.message || 'An unexpected server error occurred while fetching shipping rates.');
    }
});
export const updateDispensaryProfile = onCall({ cors: true }, async (request: CallableRequest<OwnerUpdateDispensaryPayload>) => {
    // 1. Authentication & Authorization Check
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'You must be logged in to update a dispensary.');
    }
    const userRole = request.auth.token.role;
    if (userRole !== 'DispensaryOwner') {
        throw new HttpsError('permission-denied', 'Only dispensary owners can update their profile.');
    }

    // 2. Ownership Verification (get dispensaryId from the user's token)
    const dispensaryId = request.auth.token.dispensaryId;
    if (!dispensaryId) {
        throw new HttpsError('failed-precondition', 'Your user account is not associated with a dispensary.');
    }

    // 3. Data Sanitization & Mapping
    // We explicitly map the data from the request to a new object.
    // This is a critical security step to prevent malicious users from injecting forbidden fields.
    const data = request.data;
    const allowedUpdateData = {
        dispensaryName: data.dispensaryName,
        phone: data.phone,
        currency: data.currency,
        streetAddress: data.streetAddress || null,
        suburb: data.suburb || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        latitude: data.latitude === undefined ? null : data.latitude,
        longitude: data.longitude === undefined ? null : data.longitude,
        showLocation: data.showLocation ?? true,
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
        operatingDays: data.operatingDays || [],
        shippingMethods: data.shippingMethods || [],
        deliveryRadius: data.deliveryRadius || 'none',
        message: data.message || '',
        originLocker: data.originLocker || null, 
        lastActivityDate: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 4. Database Operation
    try {
        const dispensaryDocRef = db.collection('dispensaries').doc(dispensaryId);
        
        const docSnap = await dispensaryDocRef.get();
        if (!docSnap.exists) {
            throw new HttpsError('not-found', 'The specified dispensary does not exist.');
        }
        
        await dispensaryDocRef.update(allowedUpdateData);
        
        logger.info(`Dispensary profile ${dispensaryId} updated successfully by owner ${request.auth.uid}.`);
        
        return { success: true, message: "Dispensary profile updated successfully." };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in updateDispensaryProfile for dispensary ${dispensaryId}:`, error);
        if (error instanceof HttpsError) {
          throw error;
        }
        throw new HttpsError('internal', 'An unexpected server error occurred while updating the profile.');
    }
});


export const submitDispensaryApplication = onCall({ cors: true }, async (request: CallableRequest<any>) => {
    // 1. Data Validation & Sanitization
    const data = request.data;
    if (!data.ownerEmail || !data.fullName || !data.dispensaryName || !data.dispensaryType || !data.currency || !data.acceptTerms) {
        logger.error("submitDispensaryApplication validation failed: Missing required fields.", { 
            required: { 
                ownerEmail: !!data.ownerEmail, 
                fullName: !!data.fullName, 
                dispensaryName: !!data.dispensaryName, 
                dispensaryType: !!data.dispensaryType,
                currency: !!data.currency,
                acceptTerms: !!data.acceptTerms
            }
        });
        throw new HttpsError('invalid-argument', 'Please fill out all required fields, including currency.');
    }

    if (data.acceptTerms !== true) {
        throw new HttpsError('failed-precondition', 'You must accept the Terms of Usage Agreement to submit an application.');
    }

    // 2. Prepare the New Dispensary Document
    // CORRECTED: This version captures all fields from the signup form.
    const newApplicationData = {
        // --- Core Application Data ---
        dispensaryName: data.dispensaryName,
        dispensaryType: data.dispensaryType,
        ownerEmail: data.ownerEmail,
        fullName: data.fullName,
        phone: data.phone || null,
        
        // --- Address & Location Data ---
        streetAddress: data.streetAddress || null,
        suburb: data.suburb || null,
        city: data.city || null,
        province: data.province || null,
        postalCode: data.postalCode || null,
        country: data.country || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        showLocation: data.showLocation || false,
        
        // --- Operational Data (from form) ---
        currency: data.currency, // CORRECTED: Included from form
        openTime: data.openTime || null, // CORRECTED: Included from form
        closeTime: data.closeTime || null, // CORRECTED: Included from form
        operatingDays: data.operatingDays || [], // CORRECTED: Included from form
        deliveryRadius: data.deliveryRadius || 'none', // CORRECTED: Included from form
        message: data.message || '', // CORRECTED: Included from form

        // --- System-set initial values ---
        status: 'Pending Approval',
        acceptTerms: true,
        
        // --- Server-side timestamps for data integrity ---
        applicationDate: admin.firestore.FieldValue.serverTimestamp(),
        lastActivityDate: admin.firestore.FieldValue.serverTimestamp(),
        
        // --- Fields to be populated later in the workflow ---
        ownerId: null,
        approvedDate: null,
        publicStoreUrl: null,
        shippingMethods: [], // This is managed in the owner's profile after approval
        originLocker: null  // This is managed in the owner's profile after approval
    };

    // 3. Database Operation
    try {
        const dispensaryRef = await db.collection('dispensaries').add(newApplicationData);
        logger.info(`New dispensary application created with ID: ${dispensaryRef.id} for email: ${data.ownerEmail}`);
        
        return { 
            success: true, 
            message: "Your application has been submitted successfully. You will be notified once it has been reviewed by an administrator." 
        };

    } catch (error: any) {
        logger.error(`CRITICAL ERROR in submitDispensaryApplication for email ${data.ownerEmail}:`, error);
        throw new HttpsError('internal', 'An unexpected server error occurred while submitting your application. Please try again later.');
    }
});





