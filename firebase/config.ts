import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

// Your new Firebase project configuration - Envormental Service Zahran
const firebaseConfig = {
  apiKey: "AIzaSyCa_l7HdZpb77p-xDqtkyr-yLpP6fabnHE",
  authDomain: "envormental-service-zahran.firebaseapp.com",
  projectId: "envormental-service-zahran",
  storageBucket: "envormental-service-zahran.firebasestorage.app",
  messagingSenderId: "567527804007",
  appId: "1:567527804007:web:31a2f11c62963e77a8d8c2",
  measurementId: "G-43RJF355X7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Only connect to emulators in development mode - DISABLED for production
// if (process.env.NODE_ENV === 'development') {
//   try {
//     // Check if emulators are already connected
//     if (!(db as any)._delegate._databaseId.projectId.includes('demo-')) {
//       connectFirestoreEmulator(db, 'localhost', 8080);
//     }
//     if (!(auth as any).config.emulator) {
//       connectAuthEmulator(auth, 'http://localhost:9099');
//     }
//   } catch (error) {
//     // Emulators already connected or not needed
//     console.log('Firebase emulators connection skipped');
//   }
// }

console.log('🔥 Firebase is ready');

export default app;
