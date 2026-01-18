/**
 * 🔧 Cloud Function: Migrate Product Creator Fields
 * 
 * Adds createdBy and vendorUserId to all existing products
 * Can be triggered by Super Admin via HTTP endpoint
 * 
 * Usage: POST /migrateProductCreatorFields
 */

import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// All product collections
const PRODUCT_COLLECTIONS = [
  'cannabis_products',
  'cbd_products',
  'hemp_products',
  'mushroom_products',
  'traditional_medicine_products',
  'homeopathy_products',
  'permaculture_products',
  'apparel_products',
];

interface MigrationResult {
  success: boolean;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  details: {
    [collectionName: string]: {
      found: number;
      updated: number;
      skipped: number;
      errors: number;
    };
  };
  errors: string[];
}

/**
 * HTTP Cloud Function to migrate product fields
 * 
 * Security: Only Super Admins can call this
 */
export const migrateProductCreatorFields = onCall(
  {
    timeoutSeconds: 540, // 9 minutes (max for Cloud Functions)
    memory: '1GiB'
  },
  async (request: CallableRequest) => {
    // Security check: Only Super Admins
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Must be authenticated'
      );
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'Super Admin') {
      throw new HttpsError(
        'permission-denied',
        'Only Super Admins can run migrations'
      );
    }

    logger.info(`🔐 Migration initiated by Super Admin: ${request.auth.uid}`);

    const result: MigrationResult = {
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
          const batches: FirebaseFirestore.WriteBatch[] = [];
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

            } catch (error: any) {
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

        } catch (error: any) {
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

    } catch (error: any) {
      logger.error('💥 Migration failed:', error);
      result.success = false;
      result.errors.push(`Fatal error: ${error.message}`);
      return result;
    }
  });
