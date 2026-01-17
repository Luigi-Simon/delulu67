// app/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // <--- 1. IMPORT THIS
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD9qzNu_1rVff-FahlaxMGBXGSVU_GAFZ8",
  authDomain: "teamdelulu67.firebaseapp.com",
  projectId: "teamdelulu67",
  storageBucket: "teamdelulu67.firebasestorage.app",
  messagingSenderId: "473418184191",
  appId: "1:473418184191:web:d19038e3f1ac1bdeea63ca"
};

// Initialize Firebase (Singleton pattern)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// --- THE MISSING PART ---
const db = getFirestore(app); // <--- 2. CREATE DATABASE CONNECTION
const auth = getAuth(app);

export { db, auth, app };     // <--- 3. EXPORT IT