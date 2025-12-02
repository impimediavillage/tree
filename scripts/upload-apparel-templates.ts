/**
 * Upload apparel templates to Firebase Storage
 * Run with: npx tsx scripts/upload-apparel-templates.ts
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
const serviceAccount = require('../wellness-tree-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'wellness-tree.firebasestorage.app'
});

const bucket = admin.storage().bucket();

const TEMPLATES = [
  'black-cap.jpg',
  'black-beannie.jpg',
  'black-tshirt-front.jpg',
  'black-tshirt-back.jpg',
  'black-long-sleeve-sweatshirt-front.jpg',
  'black-long-sleeve-sweatshirt-black.jpg', // back
  'black-hoodie-front.jpg',
  'black-hoodie-back.jpg',
];

async function uploadTemplates() {
  console.log('🚀 Starting apparel template upload...\n');

  for (const template of TEMPLATES) {
    const localPath = path.join(__dirname, '../public/images/apparel', template);
    const storagePath = `apparel-templates/${template}`;

    try {
      if (!fs.existsSync(localPath)) {
        console.log(`⚠️  File not found: ${template}`);
        continue;
      }

      const file = bucket.file(storagePath);
      
      await bucket.upload(localPath, {
        destination: storagePath,
        metadata: {
          contentType: 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        },
        public: true,
      });

      console.log(`✅ Uploaded: ${template}`);
    } catch (error) {
      console.error(`❌ Failed to upload ${template}:`, error);
    }
  }

  console.log('\n✨ Upload complete!');
  process.exit(0);
}

uploadTemplates();
