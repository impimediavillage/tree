/**
 * Dispensary Type Category Management Script
 * 
 * Purpose:
 * 1. Copy existing category structure (Homeopathic store → Apothecary)
 * 2. Provide foundation for auto-creating categories when adding new dispensary types
 * 
 * Usage:
 * node scripts/copy-dispensary-categories.js
 */

require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

if (!admin.apps.length) {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Using service account key\n');
  } else {
    // Use project ID from .env.local
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local');
    }
    console.log(`✅ Using Firebase project: ${projectId}\n`);
    
    // Try to use Application Default Credentials (from gcloud CLI)
    try {
      admin.initializeApp({
        projectId: projectId,
        credential: admin.credential.applicationDefault()
      });
    } catch (error) {
      console.error('❌ Could not initialize with application default credentials');
      console.error('Please run: gcloud auth application-default login');
      console.error('Or download a service account key and save as serviceAccountKey.json');
      throw error;
    }
  }
}

const db = admin.firestore();

/**
 * Copy category structure from one dispensary type to another
 * @param {string} sourceDocId - Source document ID (e.g., "Homeopathic store")
 * @param {string} targetDocId - Target document ID (e.g., "Apothecary")
 * @param {object} overrides - Optional field overrides for the new document
 */
async function copyCategoryStructure(sourceDocId, targetDocId, overrides = {}) {
  try {
    console.log(`\n📋 Copying category structure from "${sourceDocId}" to "${targetDocId}"...`);
    
    // Fetch source document
    const sourceDoc = await db.collection('dispensaryTypeProductCategories').doc(sourceDocId).get();
    
    if (!sourceDoc.exists) {
      throw new Error(`Source document "${sourceDocId}" not found!`);
    }
    
    const sourceData = sourceDoc.data();
    console.log(`✅ Source document found with ${Object.keys(sourceData.categoriesData || {}).length} category groups`);
    
    // Check if target already exists
    const targetDoc = await db.collection('dispensaryTypeProductCategories').doc(targetDocId).get();
    
    if (targetDoc.exists) {
      console.log(`⚠️  Target document "${targetDocId}" already exists!`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question('Do you want to overwrite it? (yes/no): ', resolve);
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log('❌ Operation cancelled');
        return false;
      }
    }
    
    // Prepare new document data
    const newDocData = {
      ...sourceData,
      name: targetDocId, // Update the name field
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      copiedFrom: sourceDocId,
      copiedAt: admin.firestore.FieldValue.serverTimestamp(),
      ...overrides // Apply any custom overrides
    };
    
    // Write to Firestore
    await db.collection('dispensaryTypeProductCategories').doc(targetDocId).set(newDocData);
    
    console.log(`✅ Successfully created "${targetDocId}" document`);
    console.log(`📊 Copied categoriesData structure:`);
    if (sourceData.categoriesData) {
      Object.keys(sourceData.categoriesData).forEach(key => {
        console.log(`   - ${key}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error copying category structure:', error);
    throw error;
  }
}

/**
 * Create category structure from JSON template
 * This is the foundation for your future auto-creation system
 * 
 * @param {string} dispensaryTypeName - Name of the dispensary type (used as document ID)
 * @param {string} jsonFilePath - Path to JSON file with category structure
 */
async function createFromTemplate(dispensaryTypeName, jsonFilePath) {
  try {
    console.log(`\n🏗️  Creating category structure for "${dispensaryTypeName}" from template...`);
    
    // Read JSON template
    const fullPath = path.resolve(jsonFilePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Template file not found: ${fullPath}`);
    }
    
    const templateData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    console.log(`✅ Template loaded: ${fullPath}`);
    
    // Check if document already exists
    const existingDoc = await db.collection('dispensaryTypeProductCategories').doc(dispensaryTypeName).get();
    
    if (existingDoc.exists) {
      console.log(`⚠️  Document "${dispensaryTypeName}" already exists!`);
      return false;
    }
    
    // Create document with template data
    const docData = {
      name: dispensaryTypeName,
      categoriesData: templateData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdFromTemplate: true
    };
    
    await db.collection('dispensaryTypeProductCategories').doc(dispensaryTypeName).set(docData);
    
    console.log(`✅ Successfully created "${dispensaryTypeName}" from template`);
    console.log(`📊 Category groups created:`);
    Object.keys(templateData).forEach(key => {
      console.log(`   - ${key}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Error creating from template:', error);
    throw error;
  }
}

/**
 * List all dispensary type category documents
 */
async function listAllCategoryDocs() {
  try {
    console.log('\n📚 Listing all dispensaryTypeProductCategories documents...\n');
    
    const snapshot = await db.collection('dispensaryTypeProductCategories').get();
    
    if (snapshot.empty) {
      console.log('No documents found');
      return [];
    }
    
    const docs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      docs.push({
        id: doc.id,
        name: data.name,
        categoryGroups: Object.keys(data.categoriesData || {}).length,
        updatedAt: data.updatedAt?.toDate?.()
      });
      
      console.log(`📄 ${doc.id}`);
      console.log(`   Name: ${data.name || 'N/A'}`);
      console.log(`   Category Groups: ${Object.keys(data.categoriesData || {}).length}`);
      console.log(`   Updated: ${data.updatedAt?.toDate?.() || 'N/A'}`);
      console.log('');
    });
    
    return docs;
  } catch (error) {
    console.error('❌ Error listing documents:', error);
    throw error;
  }
}

/**
 * Preview category structure without making changes
 */
async function previewCategoryStructure(docId) {
  try {
    console.log(`\n🔍 Previewing category structure for "${docId}"...\n`);
    
    const doc = await db.collection('dispensaryTypeProductCategories').doc(docId).get();
    
    if (!doc.exists) {
      console.log(`❌ Document "${docId}" not found`);
      return null;
    }
    
    const data = doc.data();
    console.log(`📄 Document: ${doc.id}`);
    console.log(`📝 Name: ${data.name}`);
    console.log(`📊 Category Groups:\n`);
    
    if (data.categoriesData) {
      Object.entries(data.categoriesData).forEach(([groupKey, groupData]) => {
        console.log(`   🔸 ${groupKey}`);
        
        // Show structure of each group
        if (typeof groupData === 'object' && groupData !== null) {
          Object.entries(groupData).forEach(([subKey, subData]) => {
            if (Array.isArray(subData)) {
              console.log(`      - ${subKey}: [${subData.length} items]`);
              if (subData.length > 0 && subData.length <= 3) {
                subData.forEach(item => {
                  console.log(`         • ${item.name || item.value || JSON.stringify(item)}`);
                });
              }
            } else if (typeof subData === 'object') {
              console.log(`      - ${subKey}: {object}`);
            } else {
              console.log(`      - ${subKey}: ${subData}`);
            }
          });
        }
        console.log('');
      });
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error previewing structure:', error);
    throw error;
  }
}

// ==================== MAIN EXECUTION ====================

async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];
    
    console.log('🌳 Dispensary Type Category Management Tool\n');
    
    switch (command) {
      case 'copy':
        // Copy existing structure
        // Usage: node scripts/copy-dispensary-categories.js copy "Homeopathic store" "Apothecary"
        const sourceId = args[1] || 'Homeopathic store';
        const targetId = args[2] || 'Apothecary';
        await copyCategoryStructure(sourceId, targetId);
        break;
        
      case 'create':
        // Create from template
        // Usage: node scripts/copy-dispensary-categories.js create "New Type" ./templates/category-template.json
        const typeName = args[1];
        const templatePath = args[2];
        if (!typeName || !templatePath) {
          console.log('Usage: node scripts/copy-dispensary-categories.js create <typeName> <templatePath>');
          process.exit(1);
        }
        await createFromTemplate(typeName, templatePath);
        break;
        
      case 'list':
        // List all documents
        // Usage: node scripts/copy-dispensary-categories.js list
        await listAllCategoryDocs();
        break;
        
      case 'preview':
        // Preview a document structure
        // Usage: node scripts/copy-dispensary-categories.js preview "Homeopathic store"
        const previewId = args[1];
        if (!previewId) {
          console.log('Usage: node scripts/copy-dispensary-categories.js preview <docId>');
          process.exit(1);
        }
        await previewCategoryStructure(previewId);
        break;
        
      default:
        // Default: Copy Homeopathic store to Apothecary (immediate fix)
        console.log('🎯 Running default operation: Copy "Homeopathic store" → "Apothecary"\n');
        await copyCategoryStructure('Homeopathic store', 'Apothecary');
        break;
    }
    
    console.log('\n✅ Operation completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
module.exports = {
  copyCategoryStructure,
  createFromTemplate,
  listAllCategoryDocs,
  previewCategoryStructure
};
