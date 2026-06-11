// Firebase Configuration
// You need to replace these values with your Firebase project config
// Get them from: Firebase Console > Project Settings > Your Apps > Web App

import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// Initialize Firebase (prevent reinitializing on hot reload)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Firestore Database — use modern persistent cache with multi-tab support
// This replaces the deprecated enableMultiTabIndexedDbPersistence API
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // Firestore already initialized (e.g. hot reload) — reuse existing instance
  db = getFirestore(app);
}

// Firebase App Check — protects your backend from abuse
// Uses reCAPTCHA v3 (invisible, zero user friction)
if (typeof window !== 'undefined') {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  console.log('[App Check Diagnostic] Site Key value:', recaptchaSiteKey);

  if (recaptchaSiteKey) {
    // Production: use reCAPTCHA v3 provider
    try {
      console.log('[App Check Diagnostic] Initializing with reCAPTCHA v3...');
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('[App Check Diagnostic] App Check initialized successfully!');
    } catch (err) {
      console.warn('[App Check Diagnostic] App Check initialization warning/error:', err);
    }
  } else if (process.env.NODE_ENV === 'development') {
    // Development: enable debug mode so localhost is not blocked
    // @ts-expect-error — Firebase debug token global
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    try {
      console.log('[App Check Diagnostic] Initializing in Development debug mode...');
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider('__debug__'),
        isTokenAutoRefreshEnabled: true,
      });
      console.log('[App Check Diagnostic] App Check debug initialized successfully!');
    } catch (err) {
      console.warn('[App Check Diagnostic] App Check debug initialization warning/error:', err);
    }
  } else {
    console.warn('[App Check Diagnostic] No Site Key found and not in development mode. Skipping App Check.');
  }
}

export { db };
export default app;

