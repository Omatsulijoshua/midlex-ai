import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Validate if Firebase has actual user credentials
const isConfigured = !!(
  firebaseConfig.apiKey && 
  firebaseConfig.apiKey.trim() !== '' && 
  firebaseConfig.apiKey !== 'your_firebase_api_key'
);

let auth = null;
let googleProvider = null;

if (isConfigured) {
  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    console.log('🔥 Firebase Authentication initialized successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize Firebase:', err.message);
  }
} else {
  console.warn('⚠️ Firebase credentials are not set in frontend .env.');
  console.warn('⚠️ Midlex Auth will operate in Simulated Google Sign-In Mode.');
}

export { auth, googleProvider, isConfigured };
