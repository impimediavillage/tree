"use strict";
/**
 * Shipping Label Generation Cloud Functions
 * Handles bulk and individual label creation for ShipLogic and PUDO/TCG
 */
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
exports.createPudoShipment = exports.createShiplogicShipment = void 0;
const https_1 = require("firebase-functions/v2/https");
const params_1 = require("firebase-functions/params");
const logger = __importStar(require("firebase-functions/logger"));
const admin = __importStar(require("firebase-admin"));
// Define secrets
const shiplogicApiKeySecret = (0, params_1.defineSecret)('SHIPLOGIC_API_KEY');
const pudoApiKeySecret = (0, params_1.defineSecret)('PUDO_API_KEY');
// API Endpoints
const SHIPLOGIC_SHIPMENTS_API_URL = 'https://api.shiplogic.com/v2/shipments';
const PUDO_BASE_URL = 'https://sandbox.api-pudo.co.za/api/v1'; // Switch to production when ready
// ============== SHIPLOGIC LABEL GENERATION ==============
exports.createShiplogicShipment = (0, https_1.onCall)({ secrets: [shiplogicApiKeySecret], cors: true }, async (request) => {
    logger.info('createShiplogicShipment invoked');
    // Validate authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to generate shipping labels.');
    }
    const { orderId, orderNumber, dispensaryId, collectionAddress, collectionContact, deliveryAddress, deliveryContact, parcels, serviceLevelCode, declaredValue, specialInstructions } = request.data;
    // Validate required fields
    if (!orderId || !orderNumber || !dispensaryId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required order information.');
    }
    if (!collectionAddress || !deliveryAddress) {
        throw new https_1.HttpsError('invalid-argument', 'Missing address information.');
    }
    if (!collectionContact || !deliveryContact) {
        throw new https_1.HttpsError('invalid-argument', 'Missing contact information.');
    }
    if (!parcels || parcels.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'At least one parcel is required.');
    }
    const shiplogicApiKey = shiplogicApiKeySecret.value();
    if (!shiplogicApiKey) {
        logger.error('CRITICAL: ShipLogic API key not found in secrets.');
        throw new https_1.HttpsError('internal', 'Server configuration error: Shipping API key not found.');
    }
    try {
        // Prepare ShipLogic API payload
        const payload = {
            collection_address: collectionAddress,
            collection_contact: collectionContact,
            delivery_address: deliveryAddress,
            delivery_contact: deliveryContact,
            parcels: parcels,
            service_level_code: serviceLevelCode || 'ECO',
            declared_value: declaredValue || 0,
            special_instructions: specialInstructions || '',
            customer_reference: orderNumber
        };
        logger.info(`Creating ShipLogic shipment for order ${orderNumber}`, {
            orderId,
            dispensaryId,
            serviceLevelCode
        });
        // Call ShipLogic API
        const response = await fetch(SHIPLOGIC_SHIPMENTS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${shiplogicApiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            logger.error('ShipLogic API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: result
            });
            throw new Error(result.message || result.error || 'Failed to create ShipLogic shipment');
        }
        logger.info(`ShipLogic shipment created successfully:`, {
            shipmentId: result.id,
            trackingNumber: result.tracking_reference,
            orderId
        });
        // Update order document with tracking information
        try {
            const orderRef = admin.firestore().collection('orders').doc(orderId);
            await orderRef.update({
                [`shipments.${dispensaryId}.trackingNumber`]: result.tracking_reference,
                [`shipments.${dispensaryId}.trackingUrl`]: result.tracking_url || `https://www.shiplogic.com/track/${result.tracking_reference}`,
                [`shipments.${dispensaryId}.shipmentId`]: result.id,
                [`shipments.${dispensaryId}.labelGeneratedAt`]: admin.firestore.FieldValue.serverTimestamp(),
                [`shipments.${dispensaryId}.status`]: 'ready_for_pickup',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            logger.info(`Updated order ${orderId} with ShipLogic tracking info`);
        }
        catch (updateError) {
            logger.error(`Failed to update order document:`, updateError);
            // Don't fail the entire operation if Firestore update fails
        }
        // Return standardized response
        const response_data = {
            success: true,
            shipmentId: result.id,
            trackingNumber: result.tracking_reference,
            shortTrackingReference: result.short_tracking_reference,
            status: result.status || 'created',
            rate: result.rate || 0,
            provider: 'shiplogic',
            trackingUrl: result.tracking_url || `https://www.shiplogic.com/track/${result.tracking_reference}`
        };
        return response_data;
    }
    catch (error) {
        logger.error('Error creating ShipLogic shipment:', error);
        throw new https_1.HttpsError('internal', error.message || 'Failed to create shipping label. Please try again.');
    }
});
// ============== PUDO LABEL GENERATION ==============
exports.createPudoShipment = (0, https_1.onCall)({ secrets: [pudoApiKeySecret], cors: true }, async (request) => {
    logger.info('createPudoShipment invoked');
    // Validate authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated to generate shipping labels.');
    }
    const { orderId, orderNumber, dispensaryId, collectionAddress, collectionContact, deliveryAddress, deliveryContact, parcels, serviceLevelCode, serviceLevelId, declaredValue, specialInstructionsCollection, specialInstructionsDelivery } = request.data;
    // Validate required fields
    if (!orderId || !orderNumber || !dispensaryId) {
        throw new https_1.HttpsError('invalid-argument', 'Missing required order information.');
    }
    if (!collectionAddress || !deliveryAddress) {
        throw new https_1.HttpsError('invalid-argument', 'Missing address information.');
    }
    if (!collectionContact || !deliveryContact) {
        throw new https_1.HttpsError('invalid-argument', 'Missing contact information.');
    }
    if (!parcels || parcels.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'At least one parcel is required.');
    }
    const pudoApiKey = pudoApiKeySecret.value();
    if (!pudoApiKey) {
        logger.error('CRITICAL: PUDO API key not found in secrets.');
        throw new https_1.HttpsError('internal', 'Server configuration error: PUDO API key not found.');
    }
    try {
        // Prepare PUDO API payload
        const payload = {
            collection_address: collectionAddress,
            collection_contact: collectionContact,
            delivery_address: deliveryAddress,
            delivery_contact: deliveryContact,
            parcels: parcels,
            service_level_code: serviceLevelCode,
            service_level_id: serviceLevelId,
            declared_value: declaredValue || 0,
            special_instructions_collection: specialInstructionsCollection || '',
            special_instructions_delivery: specialInstructionsDelivery || '',
            customer_reference: orderNumber
        };
        logger.info(`Creating PUDO shipment for order ${orderNumber}`, {
            orderId,
            dispensaryId,
            serviceLevelCode,
            collectionType: collectionAddress.terminal_id ? 'locker' : 'address',
            deliveryType: deliveryAddress.terminal_id ? 'locker' : 'address'
        });
        // Call PUDO API
        const response = await fetch(`${PUDO_BASE_URL}/shipments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${pudoApiKey}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok) {
            logger.error('PUDO API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: result
            });
            throw new Error(result.message || result.error || 'Failed to create PUDO shipment');
        }
        logger.info(`PUDO shipment created successfully:`, {
            shipmentId: result.id,
            trackingNumber: result.tracking_number,
            accessCode: result.access_code,
            orderId
        });
        // Update order document with tracking information
        try {
            const orderRef = admin.firestore().collection('orders').doc(orderId);
            const updateData = {
                [`shipments.${dispensaryId}.trackingNumber`]: result.tracking_number,
                [`shipments.${dispensaryId}.trackingUrl`]: result.tracking_url || `https://pudo.co.za/track/${result.tracking_number}`,
                [`shipments.${dispensaryId}.shipmentId`]: result.id,
                [`shipments.${dispensaryId}.labelGeneratedAt`]: admin.firestore.FieldValue.serverTimestamp(),
                [`shipments.${dispensaryId}.status`]: 'ready_for_pickup',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };
            // Add access code if present (for locker deliveries)
            if (result.access_code) {
                updateData[`shipments.${dispensaryId}.accessCode`] = result.access_code;
            }
            await orderRef.update(updateData);
            logger.info(`Updated order ${orderId} with PUDO tracking info`);
        }
        catch (updateError) {
            logger.error(`Failed to update order document:`, updateError);
            // Don't fail the entire operation if Firestore update fails
        }
        // Return standardized response
        const response_data = {
            success: true,
            shipmentId: result.id,
            trackingNumber: result.tracking_number,
            shortTrackingReference: result.short_reference,
            accessCode: result.access_code, // For locker deliveries
            status: result.status || 'created',
            rate: result.rate || 0,
            provider: 'pudo',
            trackingUrl: result.tracking_url || `https://pudo.co.za/track/${result.tracking_number}`
        };
        return response_data;
    }
    catch (error) {
        logger.error('Error creating PUDO shipment:', error);
        throw new https_1.HttpsError('internal', error.message || 'Failed to create shipping label. Please try again.');
    }
});
//# sourceMappingURL=shipping-label-generation.js.map