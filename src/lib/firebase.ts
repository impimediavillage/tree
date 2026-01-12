
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions';
import { getAnalytics, type Analytics } from 'firebase/analytics';
import { getDatabase, type Database } from 'firebase/database'; // Added for real-time location tracking

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Add this line
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL, // For Realtime Database
};

// Singleton pattern to initialize Firebase app only once
const getApp = (): FirebaseApp => {
    if (getApps().length === 0) {
        return initializeApp(firebaseConfig);
    }
    return getApps()[0]!;
};

const app: FirebaseApp = getApp();
const auth: Auth = getAuth(app);
const db: Firestore = getFirestore(app);
const storage: FirebaseStorage = getStorage(app);
const functions: Functions = getFunctions(app, 'us-central1');
const realtimeDb: Database = getDatabase(app); // Real-time database for live location tracking

// Initialize Analytics only on the client-side
let analytics: Analytics | undefined;
if (typeof window !== 'undefined') {
    // Check if the measurementId is available, otherwise Analytics will not work
    if (firebaseConfig.measurementId) {
        analytics = getAnalytics(app);
    } else {
        console.warn("Firebase Measurement ID is not set. Analytics will be disabled.");
    }
}

export { app, auth, db, storage, functions, analytics, realtimeDb };
