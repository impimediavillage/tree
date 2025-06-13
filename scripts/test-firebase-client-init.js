
// scripts/test-firebase-client-init.js
const { initializeApp, getApps } = require('firebase/app');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Attempt to load .env.local first, then .env
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('Loaded environment variables from .env.local');
} else {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log('Loaded environment variables from .env');
  } else {
    console.warn('.env.local or .env file not found. Relying on system environment variables.');
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log('\nAttempting to initialize Firebase with the following config:');
// Mask sensitive values like apiKey for logging
const loggableConfig = { ...firebaseConfig };
if (loggableConfig.apiKey) {
  loggableConfig.apiKey = loggableConfig.apiKey.substring(0, 4) + '...';
}
console.log(JSON.stringify(loggableConfig, null, 2));

let missingVars = false;
for (const key in firebaseConfig) {
  if (!firebaseConfig[key]) {
    console.error(`ERROR: Missing Firebase configuration variable: ${key}`);
    missingVars = true;
  }
}

if (missingVars) {
  console.error('\nPlease ensure all NEXT_PUBLIC_FIREBASE_... variables are set in your .env.local or .env file.');
  process.exit(1);
}

try {
  if (getApps().length === 0) {
    initializeApp(firebaseConfig);
    console.log('\nSUCCESS: Firebase app initialized successfully using client SDK config!');
    console.log('Project ID from initialized app:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);
  } else {
    console.log('\nINFO: Firebase app already initialized.');
  }
} catch (error) {
  console.error('\nERROR initializing Firebase app:', error.message);
  console.error('This could be due to incorrect configuration values or a network issue if the SDK tries to fetch remote config.');
  process.exit(1);
}
