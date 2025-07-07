
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFunctions, type Functions } from 'firebase/functions'; // Import Functions
// import { getAnalytics, type Analytics } from "firebase/analytics"; // Optional: if you need analytics

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional: if you have analytics setup
};

// --- Temporary Diagnostic Log ---
if (typeof window !== 'undefined') { // Only log on client-side
    console.log("Firebase Config from env:", {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Exists" : "MISSING",
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Exists" : "MISSING",
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Exists" : "MISSING",
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "Exists" : "MISSING",
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "Exists" : "MISSING",
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Exists" : "MISSING",
    });
}
// Check for any undefined essential variables
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("CRITICAL: Firebase apiKey or projectId is missing from environment variables (NEXT_PUBLIC_FIREBASE_...). Please check your .env.local file and ensure the Next.js development server was restarted after changes.");
}
// --- End Temporary Diagnostic Log ---


let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions; // Add this
// let analytics: Analytics; // Optional

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0]!;
}

auth = getAuth(app);
db = getFirestore(app);
storage = getStorage(app);
functions = getFunctions(app, 'us-central1'); // Initialize Functions

// Optional: Initialize Analytics if needed and measurementId is present
// if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
//   analytics = getAnalytics(app);
// }

export { app, auth, db, storage, functions /*, analytics */ };
