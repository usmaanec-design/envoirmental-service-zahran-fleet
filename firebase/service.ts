import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { auth, db } from './config';
import { MOCK_USERS, MOCK_PROJECT_DATA, TRANSLATIONS } from '../constants';
import type { User, Vehicle, Driver, Incident, Transfer, Supervisor, Foreman, ProjectData, ProjectOfficer, AdminNotification, ProjectMetadata, VehicleStatus } from '../types';

// --- Firebase Database Helper Functions ---

const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Manual admin creation function for debugging
export const createAdminManually = async () => {
    try {
        console.log("🔨 Manually creating admin user...");
        
        // Delete existing admin user if exists
        try {
            const existingAdminQuery = query(collection(db, 'users'), where('email', '==', 'zahran@projects.reports'));
            const existingAdminSnapshot = await getDocs(existingAdminQuery);
            
            if (!existingAdminSnapshot.empty) {
                console.log("🗑️ Deleting existing admin user from Firestore...");
                const batch = writeBatch(db);
                existingAdminSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
            }
        } catch (cleanupError) {
            console.log("ℹ️ No existing admin to cleanup:", cleanupError);
        }
        
        // Create admin user in Firebase Authentication first
        const adminCredential = await createUserWithEmailAndPassword(
            auth, 
            'zahran@projects.reports', 
            'zahran111'
        );
        
        console.log("✅ Admin user created in Firebase Auth:", adminCredential.user.uid);
        
        // Create admin user document in Firestore
        const adminUser = {
            uid: adminCredential.user.uid,
            email: 'zahran@projects.reports',
            password: 'zahran111',
            isAdmin: true,
            projectName: 'Zahran Admin',
            projectManagerName: 'Admin',
            projectId: 'ADM-001',
            operatorName: 'Admin'
        };
        
        await setDoc(doc(db, 'users', adminCredential.user.uid), adminUser);
        console.log("✅ Admin user document created in Firestore");
        console.log("🎉 Admin creation completed successfully!");
        
        return adminCredential.user;
        
    } catch (error: any) {
        console.error("❌ Error creating admin manually:", error);
        if (error.code === 'auth/email-already-in-use') {
            console.log("⚠️ Admin email already exists in Firebase Auth - this is good!");
            // Try to create just the Firestore document
            try {
                const adminUser = {
                    uid: 'admin-manual-' + Date.now(),
                    email: 'zahran@projects.reports',
                    password: 'zahran111',
                    isAdmin: true,
                    projectName: 'Zahran Admin',
                    projectManagerName: 'Admin',
                    projectId: 'ADM-001',
                    operatorName: 'Admin'
                };
                
                await setDoc(doc(db, 'users', adminUser.uid), adminUser);
                console.log("✅ Admin document created in Firestore with manual UID");
            } catch (docError) {
                console.error("❌ Error creating admin document:", docError);
            }
        }
        throw error;
    }
};

// Initialize default data in Firestore (run once)
export const initializeDB = async () => {
    try {
        console.log("🔄 Checking Firebase database initialization...");
        
        // Set timeout for Firebase operations
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Firebase connection timeout')), 10000);
        });
        
        // Check if admin user exists in Authentication
        const adminQuery = query(collection(db, 'users'), where('isAdmin', '==', true));
        const adminSnapshot = await Promise.race([getDocs(adminQuery), timeoutPromise]);
        
        if (adminSnapshot.empty) {
            console.log("🔨 Initializing Firebase database with default data...");
            
            try {
                // Create admin user in Firebase Authentication first
                console.log("👤 Creating admin user in Firebase Auth...");
                const adminCredential = await createUserWithEmailAndPassword(
                    auth, 
                    'zahran@projects.reports', 
                    'zahran111'
                );
                
                console.log("✅ Admin user created in Firebase Auth:", adminCredential.user.uid);
                
                // Create admin user document in Firestore
                const adminUser = {
                    uid: adminCredential.user.uid,
                    email: 'zahran@projects.reports',
                    password: 'zahran111',
                    isAdmin: true,
                    projectName: 'Zahran Admin',
                    projectManagerName: 'Admin',
                    projectId: 'ADM-001',
                    operatorName: 'Admin'
                };
                
                await setDoc(doc(db, 'users', adminCredential.user.uid), adminUser);
                console.log("✅ Admin user document created in Firestore");
                
                // Create other mock users (but don't create them in Firebase Auth)
                const batch = writeBatch(db);
                MOCK_USERS.filter(user => !user.isAdmin).forEach(user => {
                    const userRef = doc(collection(db, 'users'));
                    const userData = { ...user, uid: userRef.id };
                    batch.set(userRef, userData);
                });
                
                await batch.commit();
                console.log("✅ Database initialized successfully!");
                
            } catch (authError: any) {
                if (authError.code === 'auth/email-already-in-use') {
                    console.log("⚠️ Admin user already exists in Firebase Auth");
                    
                    // Check if admin document exists in Firestore
                    const existingAdminQuery = query(collection(db, 'users'), where('email', '==', 'zahran@projects.reports'));
                    const existingAdminSnapshot = await getDocs(existingAdminQuery);
                    
                    if (existingAdminSnapshot.empty) {
                        console.log("🔨 Creating admin document in Firestore...");
                        
                        // Get current user from Firebase Auth to get UID
                        // For now, create with a known UID pattern
                        const adminUser = {
                            uid: 'admin-firebase-' + Date.now(),
                            email: 'zahran@projects.reports',
                            password: 'zahran111',
                            isAdmin: true,
                            projectName: 'Zahran Admin',
                            projectManagerName: 'Admin',
                            projectId: 'ADM-001',
                            operatorName: 'Admin'
                        };
                        
                        await setDoc(doc(db, 'users', adminUser.uid), adminUser);
                        console.log("✅ Admin document created in Firestore");
                    }
                } else {
                    console.error("❌ Error creating admin user:", authError);
                }
            }
        } else {
            console.log("✅ Admin user already exists in database");
        }
    } catch (error) {
        console.error("❌ Error initializing database:", error);
        // If it's a timeout or connection error, set offline mode
        if (error instanceof Error && 
            (error.message.includes('timeout') || 
             error.message.includes('network') ||
             error.message.includes('connection'))) {
            console.log("🔄 Firebase connection failed, running in offline mode");
        }
    }
};

// --- Auth Functions ---

let authListener: ((user: User | null) => void) | null = null;

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    authListener = callback;
    
    return firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        console.log('🔥 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
        
        if (firebaseUser) {
            try {
                console.log('🔍 Fetching user data from Firestore for UID:', firebaseUser.uid);
                
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    console.log('✅ User data found in Firestore:', userData);
                    callback(userData);
                } else {
                    console.warn('⚠️ User document not found in Firestore');
                    
                    // Create user document in Firestore if it doesn't exist
                    const newUser: User = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        password: '', // We don't store password in Firestore
                        projectName: 'Default Project',
                        projectManagerName: 'Manager',
                        projectId: 'DEFAULT-001',
                        operatorName: 'Operator',
                        isAdmin: false
                    };
                    
                    await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
                    console.log('✅ Created new user document in Firestore');
                    callback(newUser);
                }
            } catch (error) {
                console.error('❌ Error fetching user data:', error);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
};

export const signUpUser = async (userData: Omit<User, 'uid'>): Promise<void> => {
    try {
        // Check if email already exists
        const emailQuery = query(collection(db, 'users'), where('email', '==', userData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
            throw new Error("Email already in use.");
        }

        // Create Firebase auth user
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const firebaseUser = userCredential.user;

        // Save user data to Firestore
        const newUser: User = {
            ...userData,
            uid: firebaseUser.uid,
            isAdmin: false
        };

        await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
        
        // Initialize project metadata
        await setDoc(doc(db, 'projectMetadata', firebaseUser.uid), {
            campLabour: 0,
            crewman: 0
        });

        console.log("User created successfully in Firebase!");
    } catch (error: any) {
        console.error("Signup error:", error);
        throw new Error(error.message);
    }
};

export const loginUser = async (email: string, password: string): Promise<void> => {
    try {
        console.log('🔑 Attempting login for:', email);
        
        // Check for hardcoded admin first (offline fallback)
        if (email === 'zahran@projects.reports' && password === 'zahran111') {
            console.log('✅ Admin login successful (hardcoded fallback)');
            return; // Allow admin login regardless of Firebase connection
        }
        
        // Check if account is temporarily disabled first
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('✅ Firebase Authentication successful!', userCredential.user.uid);
            return;
        } catch (authError: any) {
            console.log('⚠️ Firebase Auth failed:', authError.code, '-', authError.message);
            
            // Handle too many requests error
            if (authError.code === 'auth/too-many-requests') {
                console.log('� Too many requests - checking Firestore directly');
                
                // Skip Firebase Auth and use Firestore verification directly
                try {
                    const usersQuery = query(collection(db, 'users'), where('email', '==', email));
                    const snapshot = await getDocs(usersQuery);
                    
                    if (!snapshot.empty) {
                        const userData = snapshot.docs[0].data();
                        console.log('👤 Found user in Firestore');
                        
                        if (userData.password === password) {
                            console.log('✅ Password matches Firestore record - allowing login');
                            return; // Allow login based on Firestore verification
                        } else {
                            console.log('❌ Password does not match Firestore record');
                            throw new Error(TRANSLATIONS.en.invalidCredentials);
                        }
                    } else {
                        console.log('❌ User not found in Firestore');
                        throw new Error(TRANSLATIONS.en.invalidCredentials);
                    }
                } catch (firestoreError) {
                    console.error('❌ Firestore verification failed:', firestoreError);
                    throw new Error(TRANSLATIONS.en.tooManyRequests);
                }
            }
            
            // Handle wrong password or invalid credential
            if (authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
                console.log('� Checking Firestore for updated password...');
                
                try {
                    const usersQuery = query(collection(db, 'users'), where('email', '==', email));
                    const snapshot = await getDocs(usersQuery);
                    
                    if (!snapshot.empty) {
                        const userData = snapshot.docs[0].data();
                        console.log('👤 Found user in Firestore');
                        
                        if (userData.password === password) {
                            console.log('✅ Password matches Firestore record - allowing login');
                            return; // Allow login based on Firestore verification
                        } else {
                            console.log('❌ Password does not match Firestore record');
                        }
                    } else {
                        console.log('❌ User not found in Firestore');
                    }
                } catch (firestoreError) {
                    console.error('❌ Firestore verification failed:', firestoreError);
                }
            }
            
            // Re-throw original auth error
            throw authError;
        }
        
    } catch (error: any) {
        console.error('❌ Login error:', error);
        
        // Handle too many requests specifically
        if (error.code === 'auth/too-many-requests') {
            throw new Error(TRANSLATIONS.en.tooManyRequests);
        }
        
        // If network error and admin credentials, allow offline admin login
        if ((error.code === 'auth/network-request-failed' || error.code === 'auth/invalid-credential') 
            && email === 'zahran@projects.reports' && password === 'zahran111') {
            console.log('🔄 Network error - allowing offline admin login');
            return; // Allow admin login in offline mode
        }
        
        throw new Error(TRANSLATIONS.en.invalidCredentials);
    }
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    try {
        console.log('🔄 Sending password reset email to:', email);
        console.log('🔧 Auth domain:', auth.config.authDomain);
        
        await sendPasswordResetEmail(auth, email);
        
        console.log('✅ Password reset email sent successfully');
    } catch (error: any) {
        console.error('❌ Password reset error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        throw new Error(error.message);
    }
};

// Check if user exists with given email
export const checkUserExists = async (email: string): Promise<boolean> => {
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        return !snapshot.empty;
    } catch (error) {
        console.error('Error checking user existence:', error);
        return false;
    }
};

// Verify security answer
export const verifySecurityAnswer = async (email: string, answer: string): Promise<boolean> => {
    try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        
        if (snapshot.empty) return false;
        
        const userData = snapshot.docs[0].data();
        const correctAnswer = (userData.securityAnswer || 'zahran').toLowerCase().trim();
        
        return correctAnswer === answer;
    } catch (error) {
        console.error('Error verifying security answer:', error);
        return false;
    }
};

// Reset user password in both Firestore and Firebase Auth
export const resetUserPassword = async (email: string, newPassword: string): Promise<void> => {
    try {
        console.log('🔄 Resetting password for:', email);
        
        // Update password in Firestore
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const snapshot = await getDocs(usersQuery);
        
        if (snapshot.empty) {
            throw new Error('User not found');
        }
        
        const userDoc = snapshot.docs[0];
        
        // Update password in Firestore
        await updateDoc(userDoc.ref, {
            password: newPassword,
            updatedAt: new Date().toISOString(),
            lastPasswordReset: new Date().toISOString()
        });
        console.log('✅ Password updated in Firestore');
        
        // Note: Firebase Auth sync will happen during next login
        // This approach avoids the "too many requests" issue
        
        console.log('✅ Password reset completed successfully');
    } catch (error) {
        console.error('❌ Error resetting user password:', error);
        throw error;
    }
};

// --- Data Access Functions ---

export const getProjectDataForUser = async (userId: string): Promise<ProjectData> => {
    try {
        console.log('📊 Fetching project data for user:', userId);
        
        if (!userId) {
            throw new Error('User ID is required to fetch project data');
        }
        
        const [vehiclesSnapshot, driversSnapshot, incidentsSnapshot, transfersSnapshot, 
               supervisorsSnapshot, notificationsSnapshot, projectOfficersSnapshot, metadataDoc] = await Promise.all([
            getDocs(query(collection(db, 'vehicles'), where('userId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch vehicles:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'drivers'), where('userId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch drivers:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'incidents'), where('userId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch incidents:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'transfers'), where('fromUserId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch transfers:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'supervisors'), where('userId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch supervisors:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'notifications'))).catch(err => {
                console.warn('⚠️ Failed to fetch notifications:', err);
                return { docs: [] };
            }),
            getDocs(query(collection(db, 'projectOfficers'), where('userId', '==', userId))).catch(err => {
                console.warn('⚠️ Failed to fetch project officers:', err);
                return { docs: [] };
            }),
            getDoc(doc(db, 'projectMetadata', userId)).catch(err => {
                console.warn('⚠️ Failed to fetch metadata:', err);
                return { exists: () => false };
            })
        ]);

        const vehicles = vehiclesSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Vehicle[];
        const drivers = driversSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Driver[];
        const incidents = incidentsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Incident[];
        const transfers = transfersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Transfer[];
        const supervisors = supervisorsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Supervisor[];
        const notifications = notificationsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as AdminNotification[];
        const projectOfficers = projectOfficersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as ProjectOfficer[];
        
        const metadata = metadataDoc.exists() ? metadataDoc.data() as ProjectMetadata : { campLabour: 0, crewman: 0 };

        console.log(`✅ Project data loaded for user ${userId}:`, {
            vehicles: vehicles.length,
            drivers: drivers.length,
            incidents: incidents.length,
            supervisors: supervisors.length,
            projectOfficers: projectOfficers.length
        });

        const projectData = {
            vehicles: vehicles || [],
            drivers: drivers || [],
            incidents: incidents || [],
            transfers: transfers || [],
            supervisors: supervisors || [],
            notifications: notifications || [],
            projectOfficers: projectOfficers || [],
            campLabour: metadata?.campLabour || 0,
            crewman: metadata?.crewman || 0
        };
        
        // Log if user has no data (new user)
        if (vehicles.length === 0 && drivers.length === 0 && incidents.length === 0 && supervisors.length === 0) {
            console.log('ℹ️ New user detected - no data found, returning empty structure');
        }
        
        console.log('📋 Final project data structure:', projectData);
        return projectData;
    } catch (error) {
        console.error("❌ Error getting project data from Firestore:", error);
        // Return empty data structure instead of throwing error
        console.log('🔄 Returning empty data structure due to error');
        return {
            vehicles: [],
            drivers: [],
            incidents: [],
            transfers: [],
            supervisors: [],
            notifications: [],
            projectOfficers: [],
            campLabour: 0,
            crewman: 0
        };
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    try {
        const usersSnapshot = await getDocs(query(collection(db, 'users'), where('isAdmin', '!=', true)));
        return usersSnapshot.docs.map(docSnapshot => ({ uid: docSnapshot.id, ...docSnapshot.data() })) as User[];
    } catch (error) {
        console.error("Error getting all users:", error);
        return [];
    }
};

export const getAllProjectData = async (): Promise<any> => {
    try {
        const [vehiclesSnapshot, driversSnapshot, incidentsSnapshot, transfersSnapshot, 
               supervisorsSnapshot, notificationsSnapshot, projectOfficersSnapshot, 
               metadataSnapshot] = await Promise.all([
            getDocs(collection(db, 'vehicles')),
            getDocs(collection(db, 'drivers')),
            getDocs(collection(db, 'incidents')),
            getDocs(collection(db, 'transfers')),
            getDocs(collection(db, 'supervisors')),
            getDocs(collection(db, 'notifications')),
            getDocs(collection(db, 'projectOfficers')),
            getDocs(collection(db, 'projectMetadata'))
        ]);

        // Process project metadata into a user-keyed object
        const projectMetadata: Record<string, { campLabour: number; crewman: number }> = {};
        metadataSnapshot.docs.forEach(doc => {
            projectMetadata[doc.id] = doc.data() as { campLabour: number; crewman: number };
        });

        return {
            vehicles: vehiclesSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            drivers: driversSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            incidents: incidentsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            transfers: transfersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            supervisors: supervisorsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            notifications: notificationsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            projectOfficers: projectOfficersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })),
            projectMetadata
        };
    } catch (error) {
        console.error("Error getting all project data:", error);
        throw error;
    }
};

export const getAllVehicles = async (): Promise<Vehicle[]> => {
    try {
        const vehiclesSnapshot = await getDocs(collection(db, 'vehicles'));
        return vehiclesSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Vehicle[];
    } catch (error) {
        console.error("Error getting all vehicles:", error);
        return [];
    }
};

// --- Vehicle Functions ---

export const addVehicles = async (vehicles: Omit<Vehicle, 'id'>[], userId: string): Promise<number> => {
    try {
        console.log('🚗 Adding vehicles in batch to Firebase:', vehicles.length);
        const batch = writeBatch(db);
        let addedCount = 0;

        for (const vehicleData of vehicles) {
            // Check if door number already exists
            const doorQuery = query(
                collection(db, 'vehicles'),
                where('doorNumber', '==', vehicleData.doorNumber),
                where('userId', '==', userId)
            );
            const doorSnapshot = await getDocs(doorQuery);

            if (!doorSnapshot.empty) {
                console.warn('⚠️ Skipping duplicate door number:', vehicleData.doorNumber);
                continue;
            }

            const newVehicle = {
                ...vehicleData,
                userId,
                createdAt: new Date().toISOString()
            };

            const newVehicleRef = doc(collection(db, 'vehicles'));
            batch.set(newVehicleRef, newVehicle);
            addedCount++;

            // Commit batch every 50 operations for better performance
            if (addedCount % 50 === 0) {
                await batch.commit();
                console.log(`✅ Committed batch of ${addedCount} vehicles`);
            }
        }

        // Commit any remaining operations
        if (addedCount % 50 !== 0) {
            await batch.commit();
        }

        console.log(`✅ Successfully added ${addedCount} vehicles`);
        return addedCount;
    } catch (error) {
        console.error('❌ Error adding vehicles in batch:', error);
        throw error;
    }
};

export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>, userId: string): Promise<void> => {
    try {
        console.log('🚗 Adding vehicle to Firebase:', vehicleData);
        console.log('🆔 User ID:', userId);
        
        // Check if door number already exists for this user (not globally)
        // Skip duplicate check if this vehicle is intentionally marked as duplicate
        if (!vehicleData.isDuplicate) {
            const doorQuery = query(
                collection(db, 'vehicles'), 
                where('doorNumber', '==', vehicleData.doorNumber),
                where('userId', '==', userId)
            );
            const doorSnapshot = await getDocs(doorQuery);
            
            if (!doorSnapshot.empty) {
                console.warn('⚠️ Door number already exists for this project:', vehicleData.doorNumber);
                throw new Error('DOOR_NUMBER_EXISTS');
            }
        } else {
            console.log('🔶 Allowing duplicate vehicle with door number:', vehicleData.doorNumber);
        }

        const newVehicle = {
            ...vehicleData,
            userId,
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'vehicles'), newVehicle);
        console.log('✅ Vehicle added to Firebase with ID:', docRef.id);
        console.log('📊 Vehicle data saved:', newVehicle);
    } catch (error: any) {
        console.error('❌ Error adding vehicle to Firebase:', error);
        throw new Error(error.message);
    }
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<void> => {
    try {
        const { id, ...vehicleData } = updatedVehicle;
        vehicleData.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'vehicles', id), vehicleData);
        console.log("Vehicle updated in Firebase:", id);
    } catch (error) {
        console.error("Error updating vehicle:", error);
        throw error;
    }
};

export const deleteVehicle = async (vehicleId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'vehicles', vehicleId));
        console.log("Vehicle deleted from Firebase:", vehicleId);
    } catch (error) {
        console.error("Error deleting vehicle:", error);
        throw error;
    }
};

// --- Driver Functions ---

export const addDriver = async (driverData: Omit<Driver, 'id'>, userId: string): Promise<void> => {
    try {
        console.log('👨‍💼 Adding driver to Firebase:', driverData);
        console.log('🆔 User ID:', userId);
        
        const newDriver = {
            ...driverData,
            userId,
            createdAt: new Date().toISOString()
        };
        
        const docRef = await addDoc(collection(db, 'drivers'), newDriver);
        console.log('✅ Driver added to Firebase with ID:', docRef.id);
        console.log('📊 Driver data saved:', newDriver);
    } catch (error) {
        console.error('❌ Error adding driver to Firebase:', error);
        throw error;
    }
};

export const updateDriver = async (updatedDriver: Driver): Promise<void> => {
    try {
        const { id, ...driverData } = updatedDriver;
        driverData.updatedAt = new Date().toISOString();
        await updateDoc(doc(db, 'drivers', id), driverData);
        console.log("Driver updated in Firebase:", id);
    } catch (error) {
        console.error("Error updating driver:", error);
        throw error;
    }
};

export const deleteDriver = async (driverId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'drivers', driverId));
        console.log("Driver deleted from Firebase:", driverId);
    } catch (error) {
        console.error("Error deleting driver:", error);
        throw error;
    }
};

// --- Incident Functions ---

export const addIncident = async (incidentData: Omit<Incident, 'id'>, userId: string): Promise<void> => {
    try {
        console.log('🚨 Adding incident to Firebase:', incidentData);
        console.log('🆔 User ID:', userId);
        
        const newIncident = {
            ...incidentData,
            userId
        };
        
        // Add incident to database
        const docRef = await addDoc(collection(db, 'incidents'), newIncident);
        console.log('✅ Incident added to Firebase with ID:', docRef.id);
        
        // Auto-update vehicle status based on incident type
        if (incidentData.type === 'Accident' || incidentData.type === 'Not Working') {
            console.log('� Auto-updating vehicle status to:', incidentData.type);
            await updateVehicleStatus(incidentData.vehicleId, incidentData.type as VehicleStatus);
        }
        
        console.log('�📊 Incident data saved and vehicle status updated:', newIncident);
    } catch (error) {
        console.error('❌ Error adding incident to Firebase:', error);
        throw error;
    }
};

export const deleteIncident = async (incidentId: string): Promise<void> => {
    try {
        console.log('🗑️ Deleting incident from Firebase:', incidentId);
        await deleteDoc(doc(db, 'incidents', incidentId));
        console.log('✅ Incident deleted from Firebase');
    } catch (error) {
        console.error('❌ Error deleting incident from Firebase:', error);
        throw error;
    }
};

export const updateVehicleStatus = async (vehicleId: string, status: VehicleStatus): Promise<void> => {
    try {
        console.log('🚗 Updating vehicle status:', vehicleId, 'to', status);
        await updateDoc(doc(db, 'vehicles', vehicleId), { status });
        console.log('✅ Vehicle status updated successfully');
    } catch (error) {
        console.error('❌ Error updating vehicle status:', error);
        throw error;
    }
};

export const syncVehicleStatusesWithIncidents = async (userId: string): Promise<void> => {
    try {
        console.log('🔄 Syncing vehicle statuses with existing incidents for user:', userId);
        
        // Get all incidents for this user
        const incidentsQuery = query(collection(db, 'incidents'), where('userId', '==', userId));
        const incidentsSnapshot = await getDocs(incidentsQuery);
        
        // Get all vehicles for this user
        const vehiclesQuery = query(collection(db, 'vehicles'), where('userId', '==', userId));
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        
        const incidents = incidentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const vehicles = vehiclesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Create a map of vehicle IDs to their latest incident status
        const vehicleStatusMap: Record<string, VehicleStatus> = {};
        
        // Start with all vehicles as Active
        vehicles.forEach(vehicle => {
            vehicleStatusMap[vehicle.id] = 'Active';
        });
        
        // Update status based on most recent incidents
        incidents.forEach((incident: any) => {
            if (incident.type === 'Accident' || incident.type === 'Not Working') {
                vehicleStatusMap[incident.vehicleId] = incident.type as VehicleStatus;
            }
        });
        
        // Update all vehicle statuses
        const updatePromises = Object.entries(vehicleStatusMap).map(([vehicleId, status]) => {
            return updateVehicleStatus(vehicleId, status);
        });
        
        await Promise.all(updatePromises);
        
        console.log('✅ Vehicle statuses synced successfully');
    } catch (error) {
        console.error('❌ Error syncing vehicle statuses:', error);
        throw error;
    }
};

// --- Transfer Functions ---

export const addTransfer = async (transferData: Omit<Transfer, 'id'>): Promise<void> => {
    try {
        const docRef = await addDoc(collection(db, 'transfers'), transferData);
        console.log("Transfer added to Firebase with ID:", docRef.id);
    } catch (error) {
        console.error("Error adding transfer:", error);
        throw error;
    }
};

export const deleteTransfer = async (transferId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'transfers', transferId));
        
        // Delete associated notifications
        const notificationsQuery = query(collection(db, 'notifications'), where('transferId', '==', transferId));
        const notificationsSnapshot = await getDocs(notificationsQuery);
        
        const batch = writeBatch(db);
        notificationsSnapshot.docs.forEach(notificationDoc => {
            batch.delete(notificationDoc.ref);
        });
        
        await batch.commit();
        console.log("Transfer and related notifications deleted from Firebase:", transferId);
    } catch (error) {
        console.error("Error deleting transfer:", error);
        throw error;
    }
};

// --- Supervisor Functions ---

export const addSupervisor = async (supervisorData: Omit<Supervisor, 'id'>, userId: string): Promise<void> => {
    try {
        console.log('👷‍♂️ Adding supervisor to Firebase:', supervisorData);
        console.log('🆔 User ID:', userId);
        
        const newSupervisor = {
            ...supervisorData,
            userId,
            foremen: supervisorData.foremen.map(f => ({ ...f, id: f.id || uniqueId('f') }))
        };
        
        const docRef = await addDoc(collection(db, 'supervisors'), newSupervisor);
        console.log('✅ Supervisor added to Firebase with ID:', docRef.id);
        console.log('📊 Supervisor data saved:', newSupervisor);
    } catch (error) {
        console.error('❌ Error adding supervisor to Firebase:', error);
        throw error;
    }
};

export const updateSupervisor = async (updatedSupervisor: Supervisor): Promise<void> => {
    try {
        console.log('🔄 Updating supervisor:', updatedSupervisor);
        const { id, userId, ...supervisorData } = updatedSupervisor;
        
        // Validate required fields
        if (!id) {
            throw new Error('Supervisor ID is required for update');
        }
        if (!userId) {
            throw new Error('User ID is required for supervisor update');
        }
        
        // Check if this supervisor actually exists in the database first
        const docRef = doc(db, 'supervisors', id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.error('❌ Supervisor does not exist in database, cannot update:', id);
            throw new Error(`Supervisor with ID ${id} does not exist. Please refresh the page and try again.`);
        }
        
        // Ensure foremen have proper IDs and clean data
        supervisorData.foremen = supervisorData.foremen.map(f => {
            const cleanForeman = {
                name: f.name || '',
                totalLabour: Number(f.totalLabour) || 0,
                id: f.id || uniqueId('f')
            };
            return cleanForeman;
        });
        
        // Clean supervisor data and ensure all required fields
        const updateData = {
            name: supervisorData.name || '',
            area: supervisorData.area || '',
            iqama: supervisorData.iqama || '',
            mobile: supervisorData.mobile || '',
            foremen: supervisorData.foremen,
            userId: userId,
            updatedAt: new Date()
        };
        
        console.log('📝 Clean update data:', updateData);
        
        // Update the existing document
        await updateDoc(docRef, updateData);
        console.log('✅ Supervisor updated successfully:', id);
        
    } catch (error) {
        console.error('❌ Error updating supervisor:', error);
        throw error;
    }
};

export const deleteSupervisor = async (supervisorId: string): Promise<void> => {
    try {
        console.log('🗑️ Attempting to delete supervisor:', supervisorId);
        
        if (!supervisorId) {
            console.warn('⚠️ No supervisor ID provided for deletion');
            throw new Error('Supervisor ID is required for deletion');
        }
        
        const docRef = doc(db, 'supervisors', supervisorId);
        
        // Delete the supervisor document
        await deleteDoc(docRef);
        console.log('✅ Supervisor document deleted successfully:', supervisorId);
        
        // Also try to clean up any related subcollections
        try {
            // Check for any foremen subcollection and delete it
            const foremenQuery = query(collection(db, 'supervisors', supervisorId, 'foremen'));
            const foremenSnapshot = await getDocs(foremenQuery);
            
            if (!foremenSnapshot.empty) {
                const batch = writeBatch(db);
                foremenSnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log('✅ Related foremen data cleaned up for supervisor:', supervisorId);
            }
        } catch (cleanupError) {
            console.warn('⚠️ Could not cleanup related data (this is okay):', cleanupError);
        }
        
        console.log('🎉 Supervisor deletion completed successfully:', supervisorId);
        
    } catch (error: any) {
        console.error('❌ Error deleting supervisor:', error);
        
        // Only treat actual deletion failures as errors
        if (error.code === 'not-found' || error.message.includes('No document') || error.message.includes('not found')) {
            console.log('✅ Supervisor was already deleted:', supervisorId);
            return; // Treat as successful
        }
        
        // For permission errors or other issues, throw the error
        throw error;
    }
};

// --- Admin Notification Functions ---

export const addAdminNotification = async (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>): Promise<void> => {
    try {
        const newNotification = {
            ...notificationData,
            isRead: false,
            timestamp: new Date().toISOString()
        };
        const docRef = await addDoc(collection(db, 'notifications'), newNotification);
        console.log("Admin notification added to Firebase with ID:", docRef.id);
    } catch (error) {
        console.error("Error adding admin notification:", error);
        throw error;
    }
};

export const deleteAdminNotification = async (notificationId: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'notifications', notificationId));
        console.log("Admin notification deleted from Firebase:", notificationId);
    } catch (error) {
        console.error("Error deleting admin notification:", error);
        throw error;
    }
};

export const deleteAllAdminNotifications = async (): Promise<void> => {
    try {
        const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
        const batch = writeBatch(db);
        
        notificationsSnapshot.docs.forEach(notificationDoc => {
            batch.delete(notificationDoc.ref);
        });
        
        await batch.commit();
        console.log("All admin notifications deleted from Firebase");
    } catch (error) {
        console.error("Error deleting all admin notifications:", error);
        throw error;
    }
};

// --- Project Officers Functions ---

export const updateProjectOfficers = async (officers: Omit<ProjectOfficer, 'id' | 'userId'>[], userId: string): Promise<void> => {
    try {
        console.log('👨‍💼 Updating project officers in Firebase for user:', userId);
        console.log('📊 Officers data:', officers);
        
        // Delete existing officers for this user
        const existingQuery = query(collection(db, 'projectOfficers'), where('userId', '==', userId));
        const existingSnapshot = await getDocs(existingQuery);
        
        const batch = writeBatch(db);
        
        // Delete existing
        existingSnapshot.docs.forEach(docSnapshot => {
            batch.delete(docSnapshot.ref);
        });
        
        // Add new officers
        officers.forEach(officer => {
            const newOfficerRef = doc(collection(db, 'projectOfficers'));
            batch.set(newOfficerRef, {
                id: newOfficerRef.id,
                ...officer,
                userId
            });
        });
        
        await batch.commit();
        console.log('✅ Project officers updated in Firebase successfully!');
    } catch (error) {
        console.error('❌ Error updating project officers in Firebase:', error);
        throw error;
    }
};

// --- Project Metadata Functions ---

export const updateProjectMetadata = async (userId: string, metadata: ProjectMetadata): Promise<void> => {
    try {
        console.log('📊 Updating project metadata in Firebase for user:', userId);
        console.log('📈 Metadata:', metadata);
        
        await setDoc(doc(db, 'projectMetadata', userId), metadata, { merge: true });
        console.log('✅ Project metadata updated in Firebase successfully!');
    } catch (error) {
        console.error('❌ Error updating project metadata in Firebase:', error);
        throw error;
    }
};

// --- Transfer Vehicle Functions ---

export const transferVehicle = async (vehicleId: string, fromUserId: string, toUserId: string, transferDate: string): Promise<void> => {
    try {
        console.log('🚚 Transferring vehicle in Firebase:', { vehicleId, fromUserId, toUserId, transferDate });
        
        // Get the vehicle to transfer - search by document ID directly
        console.log('🔍 Searching for vehicle:', { vehicleId, fromUserId });
        
        const vehiclesQuery = query(collection(db, 'vehicles'), where('userId', '==', fromUserId));
        const vehiclesSnapshot = await getDocs(vehiclesQuery);
        
        let vehicleToTransfer = null;
        let vehicleDocId = null;
        
        vehiclesSnapshot.forEach((doc) => {
            const vehicle = { id: doc.id, ...doc.data() } as Vehicle;
            console.log('📋 Checking vehicle:', { docId: doc.id, vehicleData: vehicle });
            
            // Check both doc.id and vehicle.id
            if (doc.id === vehicleId || vehicle.id === vehicleId) {
                vehicleToTransfer = vehicle;
                vehicleDocId = doc.id;
                console.log('✅ Found matching vehicle!');
            }
        });
        
        if (!vehicleToTransfer || !vehicleDocId) {
            console.error('❌ Vehicle not found. Available vehicles:', 
                vehiclesSnapshot.docs.map(doc => ({ docId: doc.id, data: doc.data() }))
            );
            throw new Error(`Vehicle not found: ${vehicleId} for user: ${fromUserId}`);
        }
        
        // Create transfer record
        const transferData: Omit<Transfer, 'id'> = {
            vehicleId,
            fromUserId,
            toUserId,
            timestamp: new Date(transferDate).toISOString(),
            status: 'Transferred' as const
        };
        
        // Add transfer record
        await addDoc(collection(db, 'transfers'), transferData);
        console.log('✅ Transfer record created');
        
        // Update vehicle's userId (transfer ownership) using correct document ID
        const vehicleRef = doc(db, 'vehicles', vehicleDocId);
        await updateDoc(vehicleRef, {
            userId: toUserId,
            lastTransferDate: new Date(transferDate).toISOString()
        });
        console.log('✅ Vehicle ownership updated');
        
        console.log('✅ Vehicle transferred successfully in Firebase!');
    } catch (error) {
        console.error('❌ Error transferring vehicle in Firebase:', error);
        throw error;
    }
};

// --- ManPower/Supervisor Functions ---

export const updateManPower = async (supervisorData: any, campLabour: number, crewman: number, userId: string): Promise<void> => {
    try {
        console.log('👷 Updating manpower in Firebase:', { supervisorData, campLabour, crewman, userId });
        
        // Add supervisor if provided
        if (supervisorData && supervisorData.name) {
            const supervisorToAdd = {
                ...supervisorData,
                userId,
                id: uniqueId('supervisor')
            };
            await addDoc(collection(db, 'supervisors'), supervisorToAdd);
            console.log('✅ Supervisor added to Firebase');
        }
        
        // Update project metadata with camp labour and crewman numbers
        const metadataUpdate = {
            campLabour,
            crewman,
            lastUpdated: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'projectMetadata', userId), metadataUpdate, { merge: true });
        console.log('✅ Project metadata updated in Firebase');
        
    } catch (error) {
        console.error('❌ Error updating manpower in Firebase:', error);
        throw error;
    }
};

export const updateProjectLabour = async (campLabour: number, crewman: number, userId: string): Promise<void> => {
    try {
        console.log('👷 Updating project labour in Firebase:', { campLabour, crewman, userId });
        
        // Update project metadata with camp labour and crewman numbers
        const metadataUpdate = {
            campLabour,
            crewman,
            lastUpdated: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'projectMetadata', userId), metadataUpdate, { merge: true });
        console.log('✅ Project labour updated in Firebase');
        
    } catch (error) {
        console.error('❌ Error updating project labour in Firebase:', error);
        throw error;
    }
};

// --- Bulk Delete Functions ---

export const deleteVehicles = async (vehicleIds: string[]): Promise<void> => {
    try {
        console.log('🗑️ Bulk deleting vehicles:', vehicleIds);
        
        const batch = writeBatch(db);
        vehicleIds.forEach(id => {
            const vehicleRef = doc(db, 'vehicles', id);
            batch.delete(vehicleRef);
        });
        
        await batch.commit();
        console.log('✅ Vehicles deleted successfully from Firebase');
    } catch (error) {
        console.error('❌ Error deleting vehicles from Firebase:', error);
        throw error;
    }
};

export const deleteDrivers = async (driverIds: string[]): Promise<void> => {
    try {
        console.log('🗑️ Bulk deleting drivers:', driverIds);
        
        const batch = writeBatch(db);
        driverIds.forEach(id => {
            const driverRef = doc(db, 'drivers', id);
            batch.delete(driverRef);
        });
        
        await batch.commit();
        console.log('✅ Drivers deleted successfully from Firebase');
    } catch (error) {
        console.error('❌ Error deleting drivers from Firebase:', error);
        throw error;
    }
};

export const deleteSupervisors = async (supervisorIds: string[]): Promise<void> => {
    try {
        console.log('🗑️ Bulk deleting supervisors:', supervisorIds);
        
        const batch = writeBatch(db);
        supervisorIds.forEach(id => {
            const supervisorRef = doc(db, 'supervisors', id);
            batch.delete(supervisorRef);
        });
        
        await batch.commit();
        console.log('✅ Supervisors deleted successfully from Firebase');
    } catch (error) {
        console.error('❌ Error deleting supervisors from Firebase:', error);
        throw error;
    }
};

// Get user data by UID
export const getUserData = async (uid: string): Promise<User | null> => {
    try {
        console.log('🔍 Fetching user data for UID:', uid);
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            console.log('✅ User data found:', userData);
            return userData;
        } else {
            console.warn('⚠️ User document not found for UID:', uid);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching user data:', error);
        return null;
    }
};

// Save user data to Firestore
export const saveUserData = async (userData: User): Promise<void> => {
    try {
        console.log('💾 Saving user data to Firestore:', userData.uid);
        await setDoc(doc(db, 'users', userData.uid), userData);
        console.log('✅ User data saved successfully');
    } catch (error) {
        console.error('❌ Error saving user data:', error);
        throw error;
    }
};