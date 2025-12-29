/**
 * Migration Script: Add New Fields to All Dispensaries
 * 
 * Adds:
 * - taxRate: 15 (South Africa VAT)
 * - inHouseDeliveryPrice: null
 * - sameDayDeliveryCutoff: null
 * - inHouseDeliveryCutoffTime: null
 * 
 * Run this script in Firebase Console or as a Cloud Function
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function migrateDispensaries() {
  console.log('🚀 Starting dispensary migration...');
  
  try {
    const dispensariesRef = db.collection('dispensaries');
    const snapshot = await dispensariesRef.get();
    
    if (snapshot.empty) {
      console.log('❌ No dispensaries found');
      return;
    }
    
    console.log(`📋 Found ${snapshot.size} dispensaries to update`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const batch = db.batch();
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      // Check if already has taxRate (skip if already migrated)
      if (data.taxRate !== undefined) {
        console.log(`⏭️  Skipping ${data.dispensaryName} - already has taxRate`);
        skippedCount++;
        return;
      }
      
      // Update with new fields
      batch.update(doc.ref, {
        taxRate: 15, // South Africa VAT
        inHouseDeliveryPrice: null,
        sameDayDeliveryCutoff: null,
        inHouseDeliveryCutoffTime: null
      });
      
      console.log(`✅ Queued update for: ${data.dispensaryName}`);
      updatedCount++;
    });
    
    // Commit all updates
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\n🎉 Successfully updated ${updatedCount} dispensaries`);
    }
    
    if (skippedCount > 0) {
      console.log(`⏭️  Skipped ${skippedCount} dispensaries (already migrated)`);
    }
    
    console.log('\n✨ Migration complete!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run the migration
migrateDispensaries()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
