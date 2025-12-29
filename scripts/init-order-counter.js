/**
 * Initialize Order Counter
 * 
 * Creates the global order counter document for the new order numbering system.
 * Format: ORD-WELL-2412291345-A0000001
 * 
 * Run this once before processing new orders.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

async function initializeOrderCounter() {
  console.log('🚀 Initializing order counter...');
  
  try {
    const counterRef = db.collection('order_counters').doc('global');
    const counterDoc = await counterRef.get();
    
    if (counterDoc.exists()) {
      const data = counterDoc.data();
      console.log(`⏭️  Counter already exists: ${data.letter}${data.number.toString().padStart(7, '0')}`);
      console.log('✅ No action needed');
      return;
    }
    
    // Create initial counter
    await counterRef.set({
      letter: 'A',
      number: 0, // Will increment to 1 on first order
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Order counter initialized: A0000000');
    console.log('📝 First order will be: ORD-WELL-YYMMDDHHHMM-A0000001');
    console.log('\n✨ Initialization complete!');
    
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

// Run the initialization
initializeOrderCounter()
  .then(() => {
    console.log('✅ Script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
