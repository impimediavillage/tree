"use strict";
/**
 * 🔧 Cloud Function: Migrate Product Creator Fields
 *
 * Adds createdBy and vendorUserId to all existing products
 * Can be triggered by Super Admin via HTTP endpoint
 *
 * Usage: POST /migrateProductCreatorFields
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
exports.migrateProductCreatorFields = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
// All REAL product collections (from src/lib/utils.ts and dispensary pages)
const PRODUCT_COLLECTIONS = [
    'cannibinoid_store_products',
    'traditional_medicine_dispensary_products',
    'homeopathy_store_products',
    'mushroom_store_products',
    'permaculture_store_products',
];
/**
 * HTTP Cloud Function to migrate product fields
 *
 * Security: Only Super Admins can call this
 */
exports.migrateProductCreatorFields = (0, https_1.onCall)({
    timeoutSeconds: 540, // 9 minutes (max for Cloud Functions)
    memory: '1GiB'
}, async (request) => {
    // Security check: Only Super Admins
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Must be authenticated');
    }
    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.role !== 'Super Admin') {
        throw new https_1.HttpsError('permission-denied', 'Only Super Admins can run migrations');
    }
    logger.info(`🔐 Migration initiated by Super Admin: ${request.auth.uid}`);
    const result = {
        success: true,
        totalUpdated: 0,
        totalSkipped: 0,
        totalErrors: 0,
        details: {},
        errors: []
    };
    try {
        for (const collectionName of PRODUCT_COLLECTIONS) {
            logger.info(`\n📦 Processing: ${collectionName}`);
            const collectionResult = {
                found: 0,
                updated: 0,
                skipped: 0,
                errors: 0
            };
            try {
                const snapshot = await db.collection(collectionName).get();
                collectionResult.found = snapshot.size;
                if (snapshot.empty) {
                    logger.info(`   ⚠️  Empty collection: ${collectionName}`);
                    result.details[collectionName] = collectionResult;
                    continue;
                }
                logger.info(`   Found ${snapshot.size} products`);
                // Process in batches of 500 (Firestore limit)
                const batches = [];
                let currentBatch = db.batch();
                let operationCount = 0;
                for (const doc of snapshot.docs) {
                    const data = doc.data();
                    // Skip if already has createdBy
                    if (data.createdBy) {
                        collectionResult.skipped++;
                        result.totalSkipped++;
                        continue;
                    }
                    // Find user by productOwnerEmail and dispensaryId
                    try {
                        if (!data.productOwnerEmail || !data.dispensaryId) {
                            const errorMsg = `Product ${doc.id} missing productOwnerEmail or dispensaryId`;
                            logger.warn(`   ❌ ${errorMsg}`);
                            result.errors.push(errorMsg);
                            collectionResult.errors++;
                            result.totalErrors++;
                            continue;
                        }
                        const userSnapshot = await db.collection('users')
                            .where('email', '==', data.productOwnerEmail)
                            .where('dispensaryId', '==', data.dispensaryId)
                            .limit(1)
                            .get();
                        if (userSnapshot.empty) {
                            const errorMsg = `No user found: ${data.productOwnerEmail} in dispensary ${data.dispensaryId}`;
                            logger.warn(`   ❌ ${errorMsg}`);
                            result.errors.push(errorMsg);
                            collectionResult.errors++;
                            result.totalErrors++;
                            continue;
                        }
                        const userId = userSnapshot.docs[0].id;
                        // Add to batch
                        currentBatch.update(doc.ref, {
                            createdBy: userId,
                            vendorUserId: userId,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                        operationCount++;
                        collectionResult.updated++;
                        result.totalUpdated++;
                        // Create new batch if current is full
                        if (operationCount >= 500) {
                            batches.push(currentBatch);
                            currentBatch = db.batch();
                            operationCount = 0;
                        }
                    }
                    catch (error) {
                        const errorMsg = `Error processing product ${doc.id}: ${error.message}`;
                        logger.error(`   ❌ ${errorMsg}`);
                        result.errors.push(errorMsg);
                        collectionResult.errors++;
                        result.totalErrors++;
                    }
                }
                // Add final batch if not empty
                if (operationCount > 0) {
                    batches.push(currentBatch);
                }
                // Commit all batches
                logger.info(`   💾 Committing ${batches.length} batches...`);
                for (const batch of batches) {
                    await batch.commit();
                }
                logger.info(`   ✅ ${collectionName}: Updated ${collectionResult.updated}, Skipped ${collectionResult.skipped}`);
            }
            catch (error) {
                const errorMsg = `Collection ${collectionName} error: ${error.message}`;
                logger.error(`   ❌ ${errorMsg}`);
                result.errors.push(errorMsg);
                collectionResult.errors++;
                result.totalErrors++;
            }
            result.details[collectionName] = collectionResult;
        }
        // Log summary
        logger.info('\n' + '='.repeat(60));
        logger.info('📊 MIGRATION SUMMARY');
        logger.info('='.repeat(60));
        logger.info(`✅ Total Updated: ${result.totalUpdated}`);
        logger.info(`⚠️  Total Skipped: ${result.totalSkipped}`);
        logger.info(`❌ Total Errors: ${result.totalErrors}`);
        logger.info('='.repeat(60));
        return result;
    }
    catch (error) {
        logger.error('💥 Migration failed:', error);
        result.success = false;
        result.errors.push(`Fatal error: ${error.message}`);
        return result;
    }
});
//# sourceMappingURL=migrate-products.js.map