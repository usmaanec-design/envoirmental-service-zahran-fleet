import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWamwH81PF-JqNYUqZeSijMX9wcAtGKXg",
  authDomain: "zahran-projects-report.firebaseapp.com",
  projectId: "zahran-projects-report",
  storageBucket: "zahran-projects-report.firebasestorage.app",
  messagingSenderId: "780922102185",
  appId: "1:780922102185:web:a534d7dc6b3901671ca4b8",
  measurementId: "G-6980JRBHSM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set authentication persistence to LOCAL (survives browser refresh)
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Error setting auth persistence:', error);
});

// Analytics (optional)
let analytics;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { analytics };
export default app;
