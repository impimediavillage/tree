#!/usr/bin/env node

/**
 * Quick Add Script: Apothecary Dispensary Type
 * 
 * Run from project root: node scripts/add-apothecary-type.js
 * 
 * This script adds the Apothecary dispensary type to Firestore with:
 * - Generic workflow enabled
 * - Proper structure matching existing types
 * - Ready for category structure configuration
 */

require('dotenv').config();
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../serviceAccountKey.json');

try {
  const serviceAccount = require(serviceAccountPath);
  
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'dispensary-tree.firebasestorage.app'
    });
  }
} catch (error) {
  console.error('❌ Error loading service account:', error.message);
  console.log('\n💡 Make sure serviceAccountKey.json exists in the project root.');
  process.exit(1);
}

const db = admin.firestore();

async function addApothecaryType() {
  console.log('🚀 Starting Apothecary Type Addition...\n');

  // Check if Apothecary already exists
  const existingQuery = await db.collection('dispensaryTypes')
    .where('name', '==', 'Apothecary')
    .get();

  if (!existingQuery.empty) {
    console.log('⚠️  Apothecary type already exists!');
    console.log('   Document ID:', existingQuery.docs[0].id);
    console.log('\n   To update instead, use the admin dashboard or modify this script.\n');
    return;
  }

  const apothecaryData = {
    name: 'Apothecary',
    description: 'Traditional herbal pharmacy offering natural remedies, tinctures, salves, and holistic health products',
    
    // Image URLs - Update these with actual uploaded images
    iconPath: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Ficons%2Fapothecary-icon.png?alt=media',
    image: 'https://firebasestorage.googleapis.com/v0/b/dispensary-tree.firebasestorage.app/o/dispensary-type-assets%2Fimages%2Fapothecary-image.png?alt=media',
    
    // Status
    isActive: true,
    
    // IMPORTANT: Enable generic workflow
    useGenericWorkflow: true,
    
    // AI Advisor configuration
    advisorFocusPrompt: 'You are a knowledgeable apothecary advisor specializing in herbal remedies, natural medicine, and holistic wellness. Guide users on selecting traditional remedies, understanding herb properties, dosages, preparation methods, and safe usage. Provide evidence-based information on botanical medicine.',
    recommendedAdvisorIds: [], // Add AI advisor document IDs here
    
    // Stats
    storeCount: 0,
    
    // Timestamps
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection('dispensaryTypes').add(apothecaryData);
    
    console.log('✅ SUCCESS! Apothecary type added to Firestore\n');
    console.log('📄 Document ID:', docRef.id);
    console.log('📦 Collection: dispensaryTypes');
    console.log('🔧 Generic Workflow: ENABLED');
    console.log('\n📋 Next Steps:');
    console.log('   1. Upload actual icon and image to Firebase Storage');
    console.log('   2. Update iconPath and image URLs in the document');
    console.log('   3. Add category structure via admin dashboard');
    console.log('   4. Create route pages:');
    console.log('      - src/app/dispensary-admin/products/add/apothecary/page.tsx');
    console.log('      - src/app/dispensary-admin/products/edit/apothecary/[productId]/page.tsx');
    console.log('   5. Test add/edit workflows\n');
    
  } catch (error) {
    console.error('❌ Error adding Apothecary type:', error);
    throw error;
  }
}

// Run the script
addApothecaryType()
  .then(() => {
    console.log('🎉 Script completed successfully!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
