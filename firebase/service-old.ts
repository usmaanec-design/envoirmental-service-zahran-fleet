
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendPasswordResetEmail,
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
import type { User, Vehicle, Driver, Incident, Transfer, ProjectData, Supervisor, ProjectMetadata, AdminNotification, ProjectOfficer, Foreman } from '../types';

// --- Firebase Database Helper Functions ---

const uniqueId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Initialize default data in Firestore (run once)
export const initializeDB = async () => {
    try {
        // Check if admin user exists
        const adminQuery = query(collection(db, 'users'), where('isAdmin', '==', true));
        const adminSnapshot = await getDocs(adminQuery);
        
        if (adminSnapshot.empty) {
            console.log("Initializing Firebase database with default data...");
            
            // Add default admin and users
            const batch = writeBatch(db);
            
            MOCK_USERS.forEach(user => {
                const userRef = doc(collection(db, 'users'));
                const userData = { ...user, uid: userRef.id };
                batch.set(userRef, userData);
            });
            
            await batch.commit();
            console.log("Database initialized successfully!");
        }
    } catch (error) {
        console.error("Error initializing database:", error);
    }
};

// --- Auth Functions ---

let authListener: ((user: User | null) => void) | null = null;

export const onAuthStateChanged = (callback: (user: User | null) => void) => {
    authListener = callback;
    
    return firebaseOnAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
        if (firebaseUser) {
            try {
                // Get user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data() as User;
                    callback(userData);
                } else {
                    callback(null);
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
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

    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const loginUser = async (email: string, password: string): Promise<void> => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
        throw new Error(TRANSLATIONS.en.invalidCredentials);
    }
};

export const logoutUser = async (): Promise<void> => {
    await signOut(auth);
};

export const sendPasswordReset = async (email: string): Promise<void> => {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const deleteTransfer = async (transferId: string): Promise<void> => {
    const db = getDB();
    
    // Remove the transfer
    const transferIndex = db.transfers.findIndex(t => t.id === transferId);
    if (transferIndex > -1) {
        db.transfers.splice(transferIndex, 1);
    } else {
        console.warn(`Transfer with id ${transferId} not found for deletion.`);
    }

    // Remove associated notifications
    db.notifications = db.notifications.filter(n => n.transferId !== transferId);

    saveDB(db);
};

// --- Data Access Functions ---

export const getProjectDataForUser = async (userId: string): Promise<ProjectData> => {
    try {
        const [vehiclesSnapshot, driversSnapshot, incidentsSnapshot, transfersSnapshot, 
               supervisorsSnapshot, notificationsSnapshot, projectOfficersSnapshot, metadataDoc] = await Promise.all([
            getDocs(query(collection(db, 'vehicles'), where('userId', '==', userId))),
            getDocs(query(collection(db, 'drivers'), where('userId', '==', userId))),
            getDocs(query(collection(db, 'incidents'), where('userId', '==', userId))),
            getDocs(query(collection(db, 'transfers'), where('fromUserId', '==', userId))),
            getDocs(query(collection(db, 'supervisors'), where('userId', '==', userId))),
            getDocs(query(collection(db, 'notifications'))),
            getDocs(query(collection(db, 'projectOfficers'), where('userId', '==', userId))),
            getDoc(doc(db, 'projectMetadata', userId))
        ]);

        const vehicles = vehiclesSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Vehicle[];
        const drivers = driversSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Driver[];
        const incidents = incidentsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Incident[];
        const transfers = transfersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Transfer[];
        const supervisors = supervisorsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as Supervisor[];
        const notifications = notificationsSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as AdminNotification[];
        const projectOfficers = projectOfficersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() })) as ProjectOfficer[];
        
        const metadata = metadataDoc.exists() ? metadataDoc.data() as ProjectMetadata : { campLabour: 0, crewman: 0 };

        console.log(`Loaded project data for user ${userId}:`, {
            vehicles: vehicles.length,
            drivers: drivers.length,
            incidents: incidents.length
        });

        return {
            vehicles,
            drivers,
            incidents,
            transfers,
            supervisors,
            notifications,
            projectOfficers,
            ...metadata
        };
    } catch (error) {
        console.error("Error getting project data from Firestore:", error);
        throw error;
    }
};

export const getAllUsers = async (): Promise<User[]> => {
    const db = getDB();
    return db.users.filter(u => !u.isAdmin);
};

export const getAllProjectData = async (): Promise<Omit<MockDatabase, 'users'>> => {
    const db = getDB();
    const { users, ...rest } = db;
    return rest;
};

export const getAllVehicles = async (): Promise<Vehicle[]> => {
    const db = getDB();
    return db.vehicles;
};


// Vehicle Functions
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>, userId: string): Promise<void> => {
    const db = getDB();
    if (db.vehicles.some(v => v.doorNumber === vehicleData.doorNumber)) {
        throw new Error("DOOR_NUMBER_EXISTS");
    }
    const newVehicle: Vehicle = {
        ...vehicleData,
        id: uniqueId('v'),
        userId,
        createdAt: new Date().toISOString()
    };
    db.vehicles.push(newVehicle);
    saveDB(db);
};

export const updateVehicle = async (updatedVehicle: Vehicle): Promise<void> => {
    const db = getDB();
    const index = db.vehicles.findIndex(v => v.id === updatedVehicle.id);
    if (index !== -1) {
        // Prevent door number collision on update
        if (db.vehicles.some(v => v.doorNumber === updatedVehicle.doorNumber && v.id !== updatedVehicle.id)) {
            throw new Error("DOOR_NUMBER_EXISTS");
        }
        db.vehicles[index] = { ...updatedVehicle, updatedAt: new Date().toISOString() };
        saveDB(db);
    }
};

export const deleteVehicle = async (vehicleId: string): Promise<void> => {
    const db = getDB();
    db.vehicles = db.vehicles.filter(v => v.id !== vehicleId);
    // Also unassign from any driver
    db.drivers = db.drivers.map(d => d.assignedVehicle === vehicleId ? { ...d, assignedVehicle: '' } : d);
    saveDB(db);
};

export const deleteVehicles = async (vehicleIds: string[]): Promise<void> => {
    const db = getDB();
    const idsToDelete = new Set(vehicleIds);
    db.vehicles = db.vehicles.filter(v => !idsToDelete.has(v.id));
    // Also unassign from any driver
    db.drivers = db.drivers.map(d => d.assignedVehicle && idsToDelete.has(d.assignedVehicle) ? { ...d, assignedVehicle: '' } : d);
    saveDB(db);
};


// Driver Functions
export const addDriver = async (driverData: Omit<Driver, 'id'>, userId: string): Promise<void> => {
    const db = getDB();
    const newDriver: Driver = {
        ...driverData,
        id: uniqueId('d'),
        userId,
        createdAt: new Date().toISOString()
    };
    db.drivers.push(newDriver);
    saveDB(db);
};

export const updateDriver = async (updatedDriver: Driver): Promise<void> => {
    const db = getDB();
    const index = db.drivers.findIndex(d => d.id === updatedDriver.id);
    if (index !== -1) {
        db.drivers[index] = { ...updatedDriver, updatedAt: new Date().toISOString() };
        saveDB(db);
    }
};

export const deleteDriver = async (driverId: string): Promise<void> => {
    const db = getDB();
    db.drivers = db.drivers.filter(d => d.id !== driverId);
    saveDB(db);
};

export const deleteDrivers = async (driverIds: string[]): Promise<void> => {
    const db = getDB();
    const idsToDelete = new Set(driverIds);
    db.drivers = db.drivers.filter(d => !idsToDelete.has(d.id));
    saveDB(db);
};


// Incident Functions
export const addIncident = async (incidentData: Omit<Incident, 'id'>, userId: string): Promise<void> => {
    const db = getDB();
    const newIncident: Incident = {
        ...incidentData,
        id: uniqueId('i'),
        userId
    };
    db.incidents.push(newIncident);
    // Also update vehicle status
    const vehicleIndex = db.vehicles.findIndex(v => v.id === incidentData.vehicleId);
    if (vehicleIndex > -1) {
        db.vehicles[vehicleIndex].status = incidentData.type;
    }
    saveDB(db);
};

// Transfer Functions
export const transferVehicle = async (vehicleId: string, fromUserId: string, toUserId: string, timestamp: string): Promise<void> => {
    const db = getDB();
    const vehicleIndex = db.vehicles.findIndex(v => v.id === vehicleId);

    if (vehicleIndex === -1) {
        throw new Error("Vehicle not found.");
    }
    
    const toUser = db.users.find(u => u.uid === toUserId);
    if (!toUser) {
        throw new Error("Destination project user not found.");
    }

    // Unassign from current driver
    db.drivers = db.drivers.map(d => {
        if (d.assignedVehicle === vehicleId) {
            return { ...d, assignedVehicle: '' };
        }
        return d;
    });

    // Update vehicle's owner and project site
    db.vehicles[vehicleIndex].userId = toUserId;
    db.vehicles[vehicleIndex].projectSite = toUser.projectName;

    // Create a transfer record
    const newTransfer: Transfer = {
        id: uniqueId('t'),
        vehicleId,
        fromUserId,
        toUserId,
        timestamp,
        status: 'Transferred'
    };
    db.transfers.push(newTransfer);

    saveDB(db);
};

// Supervisor & Man Power Functions
export const updateManPower = async (supervisor: Omit<Supervisor, 'id' | 'userId'> & { foremen: Omit<Foreman, 'id'>[] }, campLabour: number, crewman: number, userId: string): Promise<void> => {
    const db = getDB();

    const newSupervisor: Supervisor = {
        ...supervisor,
        id: uniqueId('s'),
        userId,
        foremen: supervisor.foremen.map(f => ({ ...f, id: uniqueId('f')}))
    }
    if (!db.supervisors) db.supervisors = [];
    db.supervisors.push(newSupervisor);
    
    if (!db.projectMetadata) db.projectMetadata = {};
    db.projectMetadata[userId] = { campLabour, crewman };
    
    saveDB(db);
};

export const updateSupervisor = async (updatedSupervisor: Supervisor): Promise<void> => {
    const db = getDB();
    if (!db.supervisors) db.supervisors = [];
    const index = db.supervisors.findIndex(s => s.id === updatedSupervisor.id);
    if (index !== -1) {
        // Ensure new foremen have IDs
        const supervisorWithForemanIds = {
            ...updatedSupervisor,
            foremen: updatedSupervisor.foremen.map(f => ({...f, id: f.id || uniqueId('f') }))
        };
        db.supervisors[index] = supervisorWithForemanIds;
        saveDB(db);
    }
};

export const deleteSupervisor = async (supervisorId: string): Promise<void> => {
    const db = getDB();
    if (db.supervisors) {
        db.supervisors = db.supervisors.filter(s => s.id !== supervisorId);
        saveDB(db);
    }
};


// Admin Notification Functions
export const addAdminNotification = async (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>): Promise<void> => {
    const db = getDB();
    const newNotification: AdminNotification = {
        ...notificationData,
        id: uniqueId('an'),
        isRead: false,
        timestamp: new Date().toISOString()
    };
    if (!db.notifications) db.notifications = [];
    db.notifications.push(newNotification);
    saveDB(db);
};

export const deleteAdminNotification = async (notificationId: string): Promise<void> => {
    const db = getDB();
    if (db.notifications) {
        db.notifications = db.notifications.filter(n => n.id !== notificationId);
        saveDB(db);
    }
};

export const deleteAllAdminNotifications = async (): Promise<void> => {
    const db = getDB();
    db.notifications = [];
    saveDB(db);
};

// Project Officers Functions
export const updateProjectOfficers = async (officers: Omit<ProjectOfficer, 'id' | 'userId'>[], userId: string): Promise<void> => {
    const db = getDB();
    
    // Ensure the array exists
    if (!db.projectOfficers) {
        db.projectOfficers = [];
    }
    
    // Remove all existing officers for the current user
    db.projectOfficers = db.projectOfficers.filter(o => o.userId !== userId);
    
    // Add the new/updated officers
    const newOfficers: ProjectOfficer[] = officers.map(officer => {
        return {
            ...officer,
            id: uniqueId('po'), // Use a fully unique ID to prevent collisions
            userId: userId
        };
    });
    
    db.projectOfficers.push(...newOfficers);
    saveDB(db);
};
