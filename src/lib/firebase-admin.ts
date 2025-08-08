
import * as admin from 'firebase-admin';

// This file is intended for server-side use ONLY (Server Actions, API Routes, etc.)

if (!admin.apps.length) {
  try {
    // When running on Firebase/Google Cloud, the SDK automatically finds the credentials
    admin.initializeApp();
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

const db = admin.firestore();
const auth = admin.auth();

export { db, auth, admin };
