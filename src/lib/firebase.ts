
/**
 * Firebase Configuration — MivisShopping
 * =======================================
 * Initializes Firebase App, Firestore, and Auth.
 * Credentials are loaded from .env.local (NEXT_PUBLIC_ prefix).
 */

import { initializeApp, getApps } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Log for debugging (only in development)
if (typeof window !== 'undefined') {
    console.log("Firebase Full Config:", {
        apiKey: firebaseConfig.apiKey?.substring(0, 5) + '...',
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        appId: firebaseConfig.appId
    });
}

// Prevent duplicate initialization
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

/** 
 * Firestore Database 
 * Enabled with persistence for offline reliability (crucial for iPad/Mobile).
 * Explicitly using 'default' as the database ID.
 */
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
}, 'default');

/** Firebase Authentication */
export const auth = getAuth(app);

export default app;
