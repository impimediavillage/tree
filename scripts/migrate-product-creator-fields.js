/**
 * Migration Script: Add createdBy and vendorUserId to Existing Products
 * 
 * This script updates all existing products in all product collections
 * to include createdBy and vendorUserId fields based on productOwnerEmail
 * 
 * Run this ONCE after deploying the new product creation code
 * 
 * Usage:
 *   node scripts/migrate-product-creator-fields.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You need to download this from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// All product collections by dispensaryType
const PRODUCT_COLLECTIONS = [
  'cannabis_products',      // THC
  'cbd_products',           // CBD
  'hemp_products',          // Hemp
  'mushroom_products',      // Mushroom
  'traditional_medicine_products',  // Traditional Medicine
  'homeopathy_products',    // Homeopathy
  'permaculture_products',  // Permaculture
  'apparel_products',       // Apparel (if it exists)
];

async function migrateProducts() {
  console.log('🚀 Starting product migration...\n');
  
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const collectionName of PRODUCT_COLLECTIONS) {
    console.log(`\n📦 Processing collection: ${collectionName}`);
    
    try {
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`   ⚠️  No products found in ${collectionName}`);
        continue;
      }

      console.log(`   Found ${snapshot.size} products`);
      
      const batch = db.batch();
      let batchCount = 0;
      let collectionUpdated = 0;

      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Skip if already has createdBy field
        if (data.createdBy) {
          totalSkipped++;
          continue;
        }

        // Find user by productOwnerEmail
        try {
          const userSnapshot = await db.collection('users')
            .where('email', '==', data.productOwnerEmail)
            .where('dispensaryId', '==', data.dispensaryId)
            .limit(1)
            .get();

          if (userSnapshot.empty) {
            console.log(`   ❌ No user found for email: ${data.productOwnerEmail} in dispensary ${data.dispensaryId}`);
            totalErrors++;
            continue;
          }

          const userId = userSnapshot.docs[0].id;
          
          // Update product with createdBy and vendorUserId
          batch.update(doc.ref, {
            createdBy: userId,
            vendorUserId: userId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });

          batchCount++;
          collectionUpdated++;
          totalUpdated++;

          // Commit batch every 500 operations (Firestore limit)
          if (batchCount >= 500) {
            await batch.commit();
            console.log(`   ✅ Committed ${batchCount} updates`);
            batchCount = 0;
          }

        } catch (userError) {
          console.error(`   ❌ Error finding user for ${data.productOwnerEmail}:`, userError.message);
          totalErrors++;
        }
      }

      // Commit remaining updates
      if (batchCount > 0) {
        await batch.commit();
        console.log(`   ✅ Committed final ${batchCount} updates`);
      }

      console.log(`   ✅ ${collectionName}: Updated ${collectionUpdated} products`);

    } catch (error) {
      console.error(`   ❌ Error processing ${collectionName}:`, error);
      totalErrors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Total Updated: ${totalUpdated}`);
  console.log(`⚠️  Total Skipped (already had createdBy): ${totalSkipped}`);
  console.log(`❌ Total Errors: ${totalErrors}`);
  console.log('='.repeat(60));
  console.log('\n✨ Migration complete!');
  
  process.exit(0);
}

// Run migration
migrateProducts().catch(error => {
  console.error('💥 Migration failed:', error);
  process.exit(1);
});
