// Simple script to create admin user in Firebase
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

// Your Firebase config (same as in config.ts)
const firebaseConfig = {
  apiKey: "AIzaSyBXNdS4RK0oCjqOLbRGYP_2mqZnUq6Lkgw",
  authDomain: "zahran-projects-report.firebaseapp.com", 
  projectId: "zahran-projects-report",
  storageBucket: "zahran-projects-report.firebasestorage.app",
  messagingSenderId: "479550766036",
  appId: "1:479550766036:web:dfb6ce8d36dc50aa1c81a2",
  measurementId: "G-Y9RLSNP1QH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function createAdmin() {
  try {
    console.log("Creating admin user...");
    
    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      'zahran@projects.reports', 
      'zahran111'
    );
    
    console.log("Admin user created in Auth:", userCredential.user.uid);
    
    // Create user document in Firestore
    const adminUser = {
      uid: userCredential.user.uid,
      email: 'zahran@projects.reports',
      password: 'zahran111',
      isAdmin: true,
      projectName: 'Zahran Admin',
      projectManagerName: 'Admin',
      projectId: 'ADM-001',
      operatorName: 'Admin'
    };
    
    await setDoc(doc(db, 'users', userCredential.user.uid), adminUser);
    console.log("Admin document created in Firestore");
    console.log("Admin user created successfully!");
    
  } catch (error) {
    console.error("Error creating admin:", error);
  }
}

createAdmin();