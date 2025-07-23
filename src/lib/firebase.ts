
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check for any undefined essential variables
if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
  console.error("CRITICAL: A Firebase configuration value (apiKey, projectId, or authDomain) is missing. Please check your .env.local file and ensure the Next.js development server was restarted after changes.");
}

// Singleton pattern to ensure Firebase is initialized only once.
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

// Functions to get instances, initializing them only once.
const getDbInstance = () => {
    if (!db) {
        db = getFirestore(app);
    }
    return db;
};

const getAuthInstance = () => {
    if (!auth) {
        auth = getAuth(app);
    }
    return auth;
};

const getStorageInstance = () => {
    if (!storage) {
        storage = getStorage(app);
    }
    return storage;
};

const getFunctionsInstance = () => {
    if (!functions) {
        functions = getFunctions(app, 'us-central1');
    }
    return functions;
};


// Export the getter functions
export { 
    app, 
    getAuthInstance as auth, 
    getDbInstance as db, 
    getStorageInstance as storage, 
    getFunctionsInstance as functions 
};
