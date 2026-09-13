import { db, auth } from './config';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from 'firebase/auth';
import { collection, doc, getDoc, getDocs, setDoc, writeBatch, deleteDoc, query, where, updateDoc } from 'firebase/firestore';
import type { User, ProjectData, Vehicle, Driver, Supervisor, Foreman, Labour, Transfer, TransferStatus } from '../types';
// Export auth for use in App.tsx
export { auth } from './config';
export { onAuthStateChanged } from 'firebase/auth';
const COLLECTIONS = {
  USERS: 'users',
  PROJECTS: 'projects',
  ADMIN_NOTIFICATIONS: 'adminNotifications'
};
// Initialize database
export const initializeDB = () => {
  console.log(' Firebase is ready');
};
// Login function with persistence
export const loginUser = async (email: string, password: string): Promise<User> => {
  console.log('🔐 Firebase loginUser called with:', { email, password });
  
  // Clear any existing cached data first
  localStorage.removeItem('zahran_current_user');
  console.log('🗑️ Cleared existing cached user data');
  
  // Admin credentials - single admin account
  const adminAccount = {
    email: 'zahran@projects.reports',
    password: 'zahran111',
    name: 'System Administrator'
  };
  
  // Allow any authenticated user - no email restrictions
  console.log('👤 User attempting login:', { email });
  
  // Check if this is an admin login
  if (email === adminAccount.email) {
    console.log('🔑 Admin login detected!', adminAccount.name);
    if (password !== adminAccount.password) {
      throw new Error('Invalid admin password');
    }
    
    // For admin, also authenticate with Firebase to get proper permissions
    console.log('🔐 Authenticating admin with Firebase Auth...');
    try {
      // Try to authenticate admin with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Admin Firebase authentication successful');
      
      const adminUser = {
        email: adminAccount.email,
        projectName: 'Admin Dashboard',
        projectManagerName: adminAccount.name, 
        projectId: 'ADMIN',
        operatorName: 'Admin',
        isAdmin: true,
        password: adminAccount.password,
        uid: userCredential.user.uid,
        securityAnswer: 'zahran'
      };
      
      // Persist admin login
      localStorage.setItem('zahran_current_user', JSON.stringify(adminUser));
      console.log('✅ Admin login persisted');
      
      return adminUser;
    } catch (firebaseError) {
      console.log('⚠️ Firebase Auth failed for admin, creating bypass solution...');
      // If Firebase Auth fails, still allow admin access but modify data fetching approach
      const adminUser = {
        email: adminAccount.email,
        projectName: 'Admin Dashboard',
        projectManagerName: adminAccount.name, 
        projectId: 'ADMIN',
        operatorName: 'Admin',
        isAdmin: true,
        password: adminAccount.password,
        uid: 'admin-bypass',
        securityAnswer: 'zahran'
      };
      
      // Persist admin login
      localStorage.setItem('zahran_current_user', JSON.stringify(adminUser));
      console.log('✅ Admin login persisted (bypass mode)');
      
      return adminUser;
    }
  }
  // For regular users, authenticate with Firebase first
  console.log('?? Authenticating with Firebase Auth...');
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('? Firebase authentication successful for:', userCredential.user.email);
    
    // Now check Firestore for user data
    console.log('?? Checking user in Firestore database...');
    const userDocRef = doc(db, COLLECTIONS.USERS, email);
    const userDoc = await getDoc(userDocRef);
  
  if (userDoc.exists()) {
    const userData = userDoc.data() as User;
    console.log('?? User found in Firestore:', userData);
    console.log('?? Project Name:', userData.projectName);
    console.log('?? Project Manager:', userData.projectManagerName);
    console.log('?? Project ID:', userData.projectId);
    
    if (userData.password === password) {
      console.log('? Password validated for existing user');
      
      // Fix for zahran@sharq.project - ensure correct project name
      if (email === 'zahran@sharq.project') {
        userData.projectName = 'الشرق';
        userData.projectManagerName = 'مدير مشروع الشرق';
        userData.projectId = '5537';
        console.log('✅ Fixed Sharq project data:', userData);
        
        // Initialize empty subcollections to prevent undefined arrays
        console.log('?? SHARQ PROJECT: Initializing subcollections...');
        try {
          const initResult = await initializeUserSubcollections(email);
          console.log('?? Subcollection initialization result:', initResult);
        } catch (initError) {
          console.log('?? Subcollection initialization failed:', initError);
        }
        
        // Sharq project - login without forced data import
        console.log('? SHARQ PROJECT: Login successful without importing backup data');
      }
      
      userData.uid = userData.uid || `firestore-${email}`;
      
      // Persist Firestore user login
      localStorage.setItem('zahran_current_user', JSON.stringify(userData));
      console.log('?? User login persisted with correct data');
      
      return userData;
    } else {
      throw new Error('Invalid password');
    }
  }
  // If user not found in Firestore, create fresh account profile
  console.log('?? User not found in Firestore, creating fresh user profile...');
  
  // Create basic user profile for authenticated user (no auto import)
  console.log('? Creating clean user profile without importing any data...');
  
  // If we reach here, user is authenticated with Firebase but no Firestore data
  // Create a basic user profile for authenticated users
  console.log('?? Creating basic user profile for authenticated user:', email);
  const basicUser: User = {
    email: email,
    projectName: 'User Project',
    projectManagerName: 'Project Manager',
    projectId: 'USER',
    operatorName: 'User',
    isAdmin: false,
    password: password,
    uid: userCredential.user.uid,
    securityAnswer: ''
  };
  
  // Save basic user to Firestore
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, email);
    await setDoc(userDocRef, basicUser);
    console.log('? Basic user profile created in Firestore');
    
    // Also create empty project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, email);
    const emptyProjectData: ProjectData = {
      vehicles: [],
      drivers: [],
      incidents: [],
      transfers: [],
      supervisors: [],
      crewmen: [],
      campLabours: [],
      notifications: [],
      projectOfficers: [],
      repairHistory: []
    };
    await setDoc(projectDocRef, emptyProjectData);
    console.log('? Empty project data created');
  } catch (saveError) {
    console.log('?? Failed to save basic user profile:', saveError);
  }
  
  localStorage.setItem('zahran_current_user', JSON.stringify(basicUser));
  console.log('?? Basic user login persisted');
  return basicUser;
  
} catch (authError: any) {
  console.error('?? Firebase Authentication failed:', authError);
  throw new Error(authError.message || 'Invalid email or password');
}
};
// Load project data
export const loadProjectData = async (email: string): Promise<ProjectData> => {
  console.log('?? loadProjectData called for email:', email);
  
  if (email === 'zahran@sharq.project') {
    console.log('?? SHARQ PROJECT - Loading specific user data...');
  }
  
  // First get user data to find UID for filtering
  const userDocRef = doc(db, COLLECTIONS.USERS, email);
  const userDoc = await getDoc(userDocRef);
  
  let userId = '';
  if (userDoc.exists()) {
    const userData = userDoc.data() as User;
    userId = userData.uid || email;
    console.log('?? User UID for filtering:', userId);
    
    if (email === 'zahran@sharq.project') {
      console.log('?? SHARQ USER DATA:', userData);
    }
  }
  
  const projectDocRef = doc(db, COLLECTIONS.PROJECTS, email);
  const projectDoc = await getDoc(projectDocRef);
  
  if (projectDoc.exists()) {
    const data = projectDoc.data() as ProjectData;
    console.log('✅ Project data found:', {
      vehicles: data.vehicles?.length || 0,
      drivers: data.drivers?.length || 0,
      incidents: data.incidents?.length || 0
    });
    
    // Additional debug for vehicles after import
    if (data.vehicles && data.vehicles.length > 0) {
      console.log('🚗 First 3 vehicles from project doc:', 
        data.vehicles.slice(0, 3).map(v => ({ id: v.id, doorNumber: v.doorNumber, plateNumber: v.plateNumber }))
      );
    }
    
    // Ensure all supervisors have foremen arrays (migration fix)
    if (data.supervisors) {
      data.supervisors = data.supervisors.map(supervisor => ({
        ...supervisor,
        foremen: supervisor.foremen || []
      }));
    }
    
    return data;
  } else {
    console.log(' No project data found for', email);
    
    // For zahran@sharq.project, try user subcollections first
    if (email === 'zahran@sharq.project') {
      console.log('?? SHARQ: Trying user subcollections first...');
      try {
        const userRef = doc(db, 'users', email);
        const vehiclesSubcollectionRef = collection(userRef, 'vehicles');
        const driversSubcollectionRef = collection(userRef, 'drivers');
        const incidentsSubcollectionRef = collection(userRef, 'incidents');
        
        const [userVehiclesSnapshot, userDriversSnapshot, userIncidentsSnapshot] = await Promise.all([
          getDocs(vehiclesSubcollectionRef),
          getDocs(driversSubcollectionRef),
          getDocs(incidentsSubcollectionRef)
        ]);
        
        console.log('?? User subcollections found:', {
          vehicles: userVehiclesSnapshot.size,
          drivers: userDriversSnapshot.size,
          incidents: userIncidentsSnapshot.size
        });
        
        // Filter out _init documents and build arrays
        const userVehicles: any[] = [];
        const userDrivers: any[] = [];
        const userIncidents: any[] = [];
        
        userVehiclesSnapshot.forEach(doc => {
          if (doc.id !== '_init') { // Skip initialization documents
            userVehicles.push({ id: doc.id, ...doc.data() });
          }
        });
        
        userDriversSnapshot.forEach(doc => {
          if (doc.id !== '_init') {
            userDrivers.push({ id: doc.id, ...doc.data() });
          }
        });
        
        userIncidentsSnapshot.forEach(doc => {
          if (doc.id !== '_init') {
            userIncidents.push({ id: doc.id, ...doc.data() });
          }
        });
        
        console.log('?? Filtered user subcollection data:', {
          vehicles: userVehicles.length,
          drivers: userDrivers.length,
          incidents: userIncidents.length
        });
        
        // If we found data in user subcollections, return it
        if (userVehicles.length > 0 || userDrivers.length > 0 || userIncidents.length > 0) {
          return {
            vehicles: userVehicles,
            drivers: userDrivers,
            incidents: userIncidents,
            transfers: [],
            supervisors: [],
            crewmen: [],
            campLabours: [],
            notifications: [],
            projectOfficers: [],
            repairHistory: [],
          };
        }
      } catch (subcollectionError) {
        console.log('?? Error checking user subcollections:', subcollectionError);
      }
    }
    
    console.log(' Checking for data in direct collections...');
    
    try {
      const vehiclesRef = collection(db, 'vehicles');
      const driversRef = collection(db, 'drivers');
      const incidentsRef = collection(db, 'incidents');
      
      const [vehiclesSnapshot, driversSnapshot, incidentsSnapshot] = await Promise.all([
        getDocs(vehiclesRef),
        getDocs(driversRef), 
        getDocs(incidentsRef)
      ]);
      
      console.log(' Found in direct collections:', {
        vehicles: vehiclesSnapshot.size,
        drivers: driversSnapshot.size,
        incidents: incidentsSnapshot.size
      });
      
      // For debugging Sharq project, let's check the first few vehicles
      if (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2') {
        console.log('?? DEBUGGING: Checking first 5 vehicles in collection...');
        let count = 0;
        vehiclesSnapshot.forEach(doc => {
          if (count < 5) {
            const vehicle = { id: doc.id, ...doc.data() } as any;
            console.log(`Vehicle ${count + 1}:`, {
              id: vehicle.id,
              plateNumber: vehicle.plateNumber,
              userId: vehicle.userId,
              email: vehicle.email
            });
            count++;
          }
        });
        console.log(`?? Total vehicles in Firebase: ${vehiclesSnapshot.size}`);
      }
      
      if (vehiclesSnapshot.size > 0 || driversSnapshot.size > 0) {
        console.log(' Found data in direct collections');
        
        const vehicles: any[] = [];
        const drivers: any[] = [];
        const incidents: any[] = [];
        
        // Filter by userId for this specific user
        vehiclesSnapshot.forEach(doc => {
          const vehicle = { id: doc.id, ...doc.data() } as any;
          
          // Debug logging for SEh2OY5rjCRvyDO137tv3dzGx2q2
          if (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2') {
            console.log('?? Checking vehicle:', {
              plateNumber: vehicle.plateNumber,
              vehicleUserId: vehicle.userId,
              vehicleEmail: vehicle.email,
              vehicleProjectName: vehicle.projectName,
              targetUserId: userId,
              targetEmail: email,
              userIdMatch: vehicle.userId === userId,
              emailMatch: vehicle.email === email
            });
          }
          
          // Enhanced filtering: check userId, email, AND projectName for Sharq project
          const matchesUserId = vehicle.userId === userId;
          const matchesEmail = vehicle.email === email;
          const matchesProject = (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2' && vehicle.projectName === '?????');
          
          if (matchesUserId || matchesEmail || matchesProject) {
            vehicles.push(vehicle);
            if (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2') {
              console.log('? Vehicle ADDED:', vehicle.plateNumber, 'Reason:', {
                userId: matchesUserId,
                email: matchesEmail,
                project: matchesProject
              });
            }
          } else if (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2') {
            console.log('? Vehicle NOT matched:', vehicle.plateNumber, 'Missing:', {
              userId: !matchesUserId,
              email: !matchesEmail,
              project: !matchesProject
            });
          }
        });
        
        driversSnapshot.forEach(doc => {
          const driver = { id: doc.id, ...doc.data() } as any;
          const matchesUserId = driver.userId === userId;
          const matchesEmail = driver.email === email;
          const matchesProject = (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2' && driver.projectName === '?????');
          
          if (matchesUserId || matchesEmail || matchesProject) {
            drivers.push(driver);
          }
        });
        
        incidentsSnapshot.forEach(doc => {
          const incident = { id: doc.id, ...doc.data() } as any;
          const matchesUserId = incident.userId === userId;
          const matchesEmail = incident.email === email;
          const matchesProject = (userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2' && incident.projectName === '?????');
          
          if (matchesUserId || matchesEmail || matchesProject) {
            incidents.push(incident);
          }
        });
        
        console.log(' Filtered data for user:', {
          vehicles: vehicles.length,
          drivers: drivers.length,
          incidents: incidents.length
        });
        
        return {
          vehicles,
          drivers,
          incidents,
          transfers: [],
          supervisors: [],
          crewmen: [],
          campLabours: [],
          notifications: [],
          projectOfficers: [],
          repairHistory: [],
        };
      }
    } catch (error) {
      console.error(' Error checking direct collections:', error);
    }
    
    return {
      vehicles: [],
      drivers: [],
      incidents: [],
      transfers: [],
      supervisors: [],
      crewmen: [],
      campLabours: [],
      notifications: [],
      projectOfficers: [],
      repairHistory: [],
    };
  }
};
// Database exploration
export const exploreFirebaseCollections = async () => {
  console.log(' Exploring Firebase collections...');
  
  const commonCollections = [
    'vehicles', 'drivers', 'incidents', 'users', 'projects',
    'supervisors', 'foremen', 'labours', 'crewmen', 'campLabours', 
    'projectOfficers', 'transfers', 'notifications', 'repairHistory'
  ];
  
  const results = {};
  
  for (const collectionName of commonCollections) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      results[collectionName] = snapshot.size;
      
      if (snapshot.size > 0) {
        console.log(` Collection '${collectionName}': ${snapshot.size} documents`);
        const firstDoc = snapshot.docs[0];
        console.log(` Sample from '${collectionName}':`, firstDoc.data());
      }
    } catch (error) {
      results[collectionName] = 0;
      console.error(` Error accessing collection '${collectionName}':`, error);
    }
  }
  
  return results;
};
export const checkUserExists = async (email: string) => {
  console.log(` Checking if user ${email} exists...`);
  
  const userDocRef = doc(db, 'users', email);
  const userDoc = await getDoc(userDocRef);
  
  console.log(` User ${email} in 'users' collection:`, userDoc.exists() ? userDoc.data() : 'NOT FOUND');
  
  const projectDocRef = doc(db, 'projects', email);
  const projectDoc = await getDoc(projectDocRef);
  
  console.log(` Project data for ${email}:`, projectDoc.exists() ? 'EXISTS' : 'NOT FOUND');
  if (projectDoc.exists()) {
    const data = projectDoc.data();
    console.log(` Project data summary:`, {
      vehicles: data.vehicles?.length || 0,
      drivers: data.drivers?.length || 0,
      incidents: data.incidents?.length || 0
    });
  }
  
  return {
    userExists: userDoc.exists(),
    projectExists: projectDoc.exists(),
    userData: userDoc.exists() ? userDoc.data() : null,
    projectData: projectDoc.exists() ? projectDoc.data() : null
  };
};
// Other required functions
export const signUpUser = async (user: Omit<User, 'isAdmin'>): Promise<void> => {
  // Allow any email domain for signup - no restrictions
  console.log('?? Creating account for:', user.email);
  
  const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
  
  const userData: User = {
    ...user,
    isAdmin: false,
    uid: userCredential.user.uid
  };
  
  const userDocRef = doc(db, COLLECTIONS.USERS, user.email);
  await setDoc(userDocRef, userData);
  
  const projectDocRef = doc(db, COLLECTIONS.PROJECTS, user.email);
  const initialProjectData: ProjectData = {
    vehicles: [],
    drivers: [],
    incidents: [],
    transfers: [],
    supervisors: [],
    crewmen: [],
    campLabours: [],
    notifications: [],
    projectOfficers: [],
    repairHistory: [],
  };
  
  await setDoc(projectDocRef, initialProjectData);
};
export const saveProjectData = async (email: string, data: ProjectData): Promise<void> => {
  const projectDocRef = doc(db, COLLECTIONS.PROJECTS, email);
  await setDoc(projectDocRef, data, { merge: true });
};
export const getAllUsers = async (): Promise<User[]> => {
  console.log('?? Getting all users from Firestore...');
  
  const usersCollectionRef = collection(db, COLLECTIONS.USERS);
  const querySnapshot = await getDocs(usersCollectionRef);
  
  const users: User[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data() as User);
  });
  
  console.log(`🔍 Found ${users.length} users in database`);
  
  // Filter out any extra admin accounts (keep only official admin accounts)
  const filteredUsers = users.filter(user => user.email !== 'admin@zahran.com');
  
  // Always include admin users
  const adminUsers: User[] = [
    {
      email: 'zahran@projects.reports',
      projectName: 'Admin Dashboard',
      projectManagerName: 'System Administrator', 
      projectId: 'ADMIN-001',
      operatorName: 'Admin',
      isAdmin: true,
      password: 'zahran111',
      uid: 'admin-1',
      securityAnswer: 'zahran'
    },
    {
      email: 'admin@zahran.fleet',
      projectName: 'Admin Dashboard',
      projectManagerName: 'Fleet Administrator', 
      projectId: 'ADMIN-002',
      operatorName: 'Fleet Admin',
      isAdmin: true,
      password: 'admin123',
      uid: 'admin-2',
      securityAnswer: 'zahran'
    },
    {
      email: 'super@admin.com',
      projectName: 'Admin Dashboard',
      projectManagerName: 'Super Administrator', 
      projectId: 'ADMIN-003',
      operatorName: 'Super Admin',
      isAdmin: true,
      password: 'super456',
      uid: 'admin-3',
      securityAnswer: 'zahran'
    }
  ];
  
  // Add admin users if not already present
  adminUsers.forEach(adminUser => {
    const hasAdmin = filteredUsers.some(u => u.email === adminUser.email);
    if (!hasAdmin) {
      filteredUsers.unshift(adminUser);
      console.log(`👑 Added admin user: ${adminUser.email}`);
    }
  });
  
  // Remove duplicates by email to prevent React key warnings
  const uniqueUsers = filteredUsers.filter((user, index, arr) => 
    arr.findIndex(u => u.email === user.email) === index
  );
  
  console.log(`? Returning ${uniqueUsers.length} unique users:`, uniqueUsers.map(u => ({ email: u.email, projectName: u.projectName })));
  
  return uniqueUsers;
};
export const getAllProjectData = async (): Promise<any> => {
  console.log('?? Getting all project data...');
  const projectsCollectionRef = collection(db, COLLECTIONS.PROJECTS);
  const querySnapshot = await getDocs(projectsCollectionRef);
  
  let allVehicles: any[] = [];
  let allDrivers: any[] = [];
  let allIncidents: any[] = [];
  let allTransfers: any[] = [];
  let allSupervisors: any[] = [];
  let allNotifications: any[] = [];
  let allProjectOfficers: any[] = [];
  let allRepairHistory: any[] = [];
  let allCrewmen: any[] = [];
  let allCampLabours: any[] = [];
  
  querySnapshot.forEach((doc) => {
    const projectData = doc.data() as ProjectData;
    
    allVehicles = [...allVehicles, ...(projectData.vehicles || [])];
    allDrivers = [...allDrivers, ...(projectData.drivers || [])];
    allIncidents = [...allIncidents, ...(projectData.incidents || [])];
    allTransfers = [...allTransfers, ...(projectData.transfers || [])];
    allSupervisors = [...allSupervisors, ...(projectData.supervisors || [])];
    allNotifications = [...allNotifications, ...(projectData.notifications || [])];
    allProjectOfficers = [...allProjectOfficers, ...(projectData.projectOfficers || [])];
    allRepairHistory = [...allRepairHistory, ...(projectData.repairHistory || [])];
    allCrewmen = [...allCrewmen, ...(projectData.crewmen || [])];
    allCampLabours = [...allCampLabours, ...(projectData.campLabours || [])];
  });
  
  console.log('?? Found in projects collection:', {
    vehicles: allVehicles.length,
    drivers: allDrivers.length,
    incidents: allIncidents.length
  });
  
  // Always check direct collections for complete data (not just when minimal)
  console.log('?? Always checking direct collections for complete data...');
    
    try {
      const [
        vehiclesSnapshot,
        driversSnapshot,
        incidentsSnapshot,
        supervisorsSnapshot,
        projectOfficersSnapshot,
        transfersSnapshot,
        repairHistorySnapshot,
        crewmenSnapshot,
        campLaboursSnapshot,
        notificationsSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'vehicles')),
        getDocs(collection(db, 'drivers')),
        getDocs(collection(db, 'incidents')),
        getDocs(collection(db, 'supervisors')),
        getDocs(collection(db, 'projectOfficers')),
        getDocs(collection(db, 'transfers')),
        getDocs(collection(db, 'repairHistory')),
        getDocs(collection(db, 'crewmen')),
        getDocs(collection(db, 'campLabours')),
        getDocs(collection(db, 'notifications'))
      ]);
      
      // Replace arrays with direct collection data (not add to them)
      allVehicles = [];
      allDrivers = [];
      allIncidents = [];
      allSupervisors = [];
      allProjectOfficers = [];
      allTransfers = [];
      allRepairHistory = [];
      allCrewmen = [];
      allCampLabours = [];
      allNotifications = [];
      
      vehiclesSnapshot.forEach(doc => allVehicles.push({ id: doc.id, ...doc.data() }));
      driversSnapshot.forEach(doc => allDrivers.push({ id: doc.id, ...doc.data() }));
      incidentsSnapshot.forEach(doc => allIncidents.push({ id: doc.id, ...doc.data() }));
      supervisorsSnapshot.forEach(doc => allSupervisors.push({ id: doc.id, ...doc.data() }));
      projectOfficersSnapshot.forEach(doc => allProjectOfficers.push({ id: doc.id, ...doc.data() }));
      transfersSnapshot.forEach(doc => allTransfers.push({ id: doc.id, ...doc.data() }));
      repairHistorySnapshot.forEach(doc => allRepairHistory.push({ id: doc.id, ...doc.data() }));
      crewmenSnapshot.forEach(doc => allCrewmen.push({ id: doc.id, ...doc.data() }));
      campLaboursSnapshot.forEach(doc => allCampLabours.push({ id: doc.id, ...doc.data() }));
      notificationsSnapshot.forEach(doc => allNotifications.push({ id: doc.id, ...doc.data() }));
      
      console.log('?? Found in direct collections:', {
        vehicles: allVehicles.length,
        drivers: allDrivers.length,
        incidents: allIncidents.length,
        supervisors: allSupervisors.length,
        projectOfficers: allProjectOfficers.length,
        transfers: allTransfers.length,
        repairHistory: allRepairHistory.length,
        crewmen: allCrewmen.length,
        campLabours: allCampLabours.length,
        notifications: allNotifications.length
      });
    } catch (error) {
      console.error('? Error checking direct collections:', error);
    }
  
  return {
    vehicles: allVehicles,
    drivers: allDrivers,
    incidents: allIncidents,
    transfers: allTransfers,
    supervisors: allSupervisors,
    notifications: allNotifications,
    projectOfficers: allProjectOfficers,
    repairHistory: allRepairHistory,
    crewmen: allCrewmen,
    campLabours: allCampLabours,
  };
};
// Get structured project data for admin dashboard
export const getAllProjectDataStructured = async (): Promise<{ aggregated: any, projectDataMap: Record<string, ProjectData> }> => {
  console.log('🔄 Getting structured project data from ALL sources (flat collections + project documents)...');
  
  let allVehicles: any[] = [];
  let allDrivers: any[] = [];
  let allIncidents: any[] = [];
  let allTransfers: any[] = [];
  let allSupervisors: any[] = [];
  let allNotifications: any[] = [];
  let allProjectOfficers: any[] = [];
  let allRepairHistory: any[] = [];
  let allCrewmen: any[] = [];
  let allCampLabours: any[] = [];
  
  // Store project-specific data
  const projectDataMap: Record<string, ProjectData> = {};
  
  try {
    // Check if we're in admin bypass mode
    const currentUser = localStorage.getItem('zahran_current_user');
    const isAdminBypass = currentUser && JSON.parse(currentUser).uid === 'admin-bypass';
    
    if (isAdminBypass) {
      console.log('🔧 Admin bypass mode - using alternative data access method');
      
      // For admin bypass, try to get data without strict authentication
      try {
        // Get users first
        const users = await getAllUsers();
        console.log('📋 Found users:', users.map(u => u.email));
        
        // Try to get project data directly from documents
        for (const user of users) {
          try {
            console.log(`🔍 Checking project document for: ${user.email}`);
            const projectDocRef = doc(db, 'projects', user.email);
            const projectDoc = await getDoc(projectDocRef);
            
            if (projectDoc.exists()) {
              const projectData = projectDoc.data() as ProjectData;
              console.log(`✅ Found project data for ${user.email}:`, {
                vehicles: projectData.vehicles?.length || 0,
                drivers: projectData.drivers?.length || 0,
                incidents: projectData.incidents?.length || 0
              });
              
              // Add project document data to aggregated totals
              if (projectData.vehicles) allVehicles.push(...projectData.vehicles.map(v => ({ ...v, projectEmail: user.email })));
              if (projectData.drivers) allDrivers.push(...projectData.drivers.map(d => ({ ...d, projectEmail: user.email })));
              if (projectData.incidents) allIncidents.push(...projectData.incidents.map(i => ({ ...i, projectEmail: user.email })));
              if (projectData.supervisors) allSupervisors.push(...projectData.supervisors.map(s => ({ ...s, projectEmail: user.email })));
              if (projectData.projectOfficers) allProjectOfficers.push(...projectData.projectOfficers.map(p => ({ ...p, projectEmail: user.email })));
              if (projectData.transfers) allTransfers.push(...projectData.transfers.map(t => ({ ...t, projectEmail: user.email })));
              if (projectData.notifications) allNotifications.push(...projectData.notifications.map(n => ({ ...n, projectEmail: user.email })));
              if (projectData.repairHistory) allRepairHistory.push(...projectData.repairHistory.map(r => ({ ...r, projectEmail: user.email })));
              if (projectData.crewmen) allCrewmen.push(...projectData.crewmen.map(c => ({ ...c, projectEmail: user.email })));
              if (projectData.campLabours) allCampLabours.push(...projectData.campLabours.map(c => ({ ...c, projectEmail: user.email })));
              
              // Store in projectDataMap for individual project access
              projectDataMap[user.email] = projectData;
            } else {
              console.log(`ℹ️ No project document found for: ${user.email}`);
              // Initialize empty project data
              projectDataMap[user.email] = {
                vehicles: [], drivers: [], incidents: [], transfers: [], supervisors: [],
                crewmen: [], campLabours: [], notifications: [], projectOfficers: [], repairHistory: []
              };
            }
          } catch (error) {
            console.error(`❌ Error getting project data for ${user.email}:`, error);
          }
        }
        
        console.log('🎯 Admin bypass data collection complete:', {
          totalVehicles: allVehicles.length,
          totalDrivers: allDrivers.length,
          totalIncidents: allIncidents.length,
          totalProjects: Object.keys(projectDataMap).length
        });
        
        return {
          aggregated: {
            vehicles: allVehicles, drivers: allDrivers, incidents: allIncidents, transfers: allTransfers,
            supervisors: allSupervisors, notifications: allNotifications, projectOfficers: allProjectOfficers,
            repairHistory: allRepairHistory, crewmen: allCrewmen, campLabours: allCampLabours,
          },
          projectDataMap
        };
        
      } catch (bypassError) {
        console.error('❌ Admin bypass method also failed:', bypassError);
        throw new Error('Failed to access data even in bypass mode');
      }
    }
    
    // Regular authenticated method
    console.log('🔐 Using regular authenticated data access...');
    
    // First, get all users to check their project documents
    const users = await getAllUsers();
    console.log('📋 Found users:', users.map(u => u.email));
    
    // Get data from both flat collections AND project documents
    const [vehiclesSnapshot, driversSnapshot, incidentsSnapshot, supervisorsSnapshot, projectOfficersSnapshot, transfersSnapshot, notificationsSnapshot] = await Promise.all([
      getDocs(collection(db, 'vehicles')),
      getDocs(collection(db, 'drivers')), 
      getDocs(collection(db, 'incidents')),
      getDocs(collection(db, 'supervisors')),
      getDocs(collection(db, 'projectOfficers')),
      getDocs(collection(db, 'transfers')),
      getDocs(collection(db, 'notifications'))
    ]);
    
    // Also get data from individual project documents
    for (const user of users) {
      try {
        console.log(`?? Checking project document for: ${user.email}`);
        const projectDocRef = doc(db, 'projects', user.email);
        const projectDoc = await getDoc(projectDocRef);
        
        if (projectDoc.exists()) {
          const projectData = projectDoc.data() as ProjectData;
          console.log(`?? Found project data for ${user.email}:`, {
            vehicles: projectData.vehicles?.length || 0,
            drivers: projectData.drivers?.length || 0,
            incidents: projectData.incidents?.length || 0
          });
          
          // Add project document data to aggregated totals
          if (projectData.vehicles) allVehicles.push(...projectData.vehicles.map(v => ({ ...v, projectEmail: user.email })));
          if (projectData.drivers) allDrivers.push(...projectData.drivers.map(d => ({ ...d, projectEmail: user.email })));
          if (projectData.incidents) allIncidents.push(...projectData.incidents.map(i => ({ ...i, projectEmail: user.email })));
          if (projectData.supervisors) allSupervisors.push(...projectData.supervisors.map(s => ({ ...s, projectEmail: user.email })));
          if (projectData.projectOfficers) allProjectOfficers.push(...projectData.projectOfficers.map(p => ({ ...p, projectEmail: user.email })));
          if (projectData.transfers) allTransfers.push(...projectData.transfers.map(t => ({ ...t, projectEmail: user.email })));
          if (projectData.notifications) allNotifications.push(...projectData.notifications.map(n => ({ ...n, projectEmail: user.email })));
          if (projectData.repairHistory) allRepairHistory.push(...projectData.repairHistory.map(r => ({ ...r, projectEmail: user.email })));
          if (projectData.crewmen) allCrewmen.push(...projectData.crewmen.map(c => ({ ...c, projectEmail: user.email })));
          if (projectData.campLabours) allCampLabours.push(...projectData.campLabours.map(c => ({ ...c, projectEmail: user.email })));
          
          // Store in projectDataMap for individual project access
          projectDataMap[user.email] = projectData;
        } else {
          console.log(`?? No project document found for: ${user.email}`);
          // Initialize empty project data
          projectDataMap[user.email] = {
            vehicles: [],
            drivers: [],
            incidents: [],
            transfers: [],
            supervisors: [],
            crewmen: [],
            campLabours: [],
            notifications: [],
            projectOfficers: [],
            repairHistory: []
          };
        }
      } catch (error) {
        console.error(`? Error getting project data for ${user.email}:`, error);
      }
    }
    
    console.log('?? Raw flat collections loaded:', {
      vehicles: vehiclesSnapshot.size,
      drivers: driversSnapshot.size,
      incidents: incidentsSnapshot.size,
      supervisors: supervisorsSnapshot.size,
      projectOfficers: projectOfficersSnapshot.size,
      transfers: transfersSnapshot.size,
      notifications: notificationsSnapshot.size
    });
    
    // Also add data from flat collections (if any exists there)
    vehiclesSnapshot.forEach((doc) => {
      const vehicle = { id: doc.id, ...doc.data() };
      allVehicles.push(vehicle);
    });
    
    driversSnapshot.forEach((doc) => {
      const driver = { id: doc.id, ...doc.data() };
      allDrivers.push(driver);
    });
    
    incidentsSnapshot.forEach((doc) => {
      const incident = { id: doc.id, ...doc.data() };
      allIncidents.push(incident);
    });
    
    supervisorsSnapshot.forEach((doc) => {
      const supervisor = { id: doc.id, ...doc.data() };
      allSupervisors.push(supervisor);
    });
    
    projectOfficersSnapshot.forEach((doc) => {
      const officer = { id: doc.id, ...doc.data() };
      allProjectOfficers.push(officer);
    });
    
    transfersSnapshot.forEach((doc) => {
      const transfer = { id: doc.id, ...doc.data() };
      allTransfers.push(transfer);
    });
    
    notificationsSnapshot.forEach((doc) => {
      const notification = { id: doc.id, ...doc.data() };
      allNotifications.push(notification);
    });
    
    console.log('?? FINAL aggregated data totals:', {
      totalVehicles: allVehicles.length,
      totalDrivers: allDrivers.length,
      totalIncidents: allIncidents.length,
      totalSupervisors: allSupervisors.length,
      totalProjectOfficers: allProjectOfficers.length,
      totalTransfers: allTransfers.length,
      totalNotifications: allNotifications.length,
      totalCrewmen: allCrewmen.length,
      totalCampLabours: allCampLabours.length
    });
    
  } catch (error) {
    console.error('? Error loading structured project data:', error);
    // Fallback to empty structure
    const users = await getAllUsers();
    users.forEach(user => {
      projectDataMap[user.email] = {
        vehicles: [],
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: []
      };
    });
  }
  
  console.log(`?? Structured project data summary:`, {
    totalVehicles: allVehicles.length,
    totalDrivers: allDrivers.length,
    totalIncidents: allIncidents.length,
    totalProjects: Object.keys(projectDataMap).length,
    projectEmails: Object.keys(projectDataMap)
  });
  
  return {
    aggregated: {
      vehicles: allVehicles,
      drivers: allDrivers,
      incidents: allIncidents,
      transfers: allTransfers,
      supervisors: allSupervisors,
      notifications: allNotifications,
      projectOfficers: allProjectOfficers,
      repairHistory: allRepairHistory,
      crewmen: allCrewmen,
      campLabours: allCampLabours,
    },
    projectDataMap
  };
};
export const signOut = async (): Promise<void> => {
  console.log('?? Signing out user...');
  
  // Clear localStorage
  localStorage.removeItem('zahran_current_user');
  console.log('??? Cleared persisted user data');
  
  // Sign out from Firebase Auth
  await firebaseSignOut(auth);
  console.log('? Firebase signout complete');
};
// Custom auth state change observer with localStorage persistence
export const onAppAuthStateChanged = (callback: (user: User | null) => void) => {
  // Check localStorage first for persisted user
  const checkPersistedUser = async () => {
    const persistedUser = localStorage.getItem('zahran_current_user');
    if (persistedUser) {
      try {
        const user = JSON.parse(persistedUser) as User;
        console.log('?? Found persisted user:', user.email);
        
        // Validate the user still exists in database
        if (user.email === 'zahran@projects.reports') {
          // Admin user is always valid
          callback(user);
          return;
        } else {
          // Check if regular user still exists in Firestore
          const userDocRef = doc(db, COLLECTIONS.USERS, user.email);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            console.log('? Persisted user validated');
            callback(user);
            return;
          } else {
            console.log('? Persisted user no longer exists in database');
            localStorage.removeItem('zahran_current_user');
          }
        }
      } catch (error) {
        console.error('? Error validating persisted user:', error);
        localStorage.removeItem('zahran_current_user');
      }
    }
    
    // No valid persisted user, proceed with Firebase Auth
    callback(null);
  };
  // Check persisted user first
  checkPersistedUser();
  // Also listen to Firebase Auth changes
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        const adminEmail = 'zahran@projects.reports';
        if (firebaseUser.email === adminEmail) {
          const adminUser: User = {
            email: adminEmail,
            projectName: 'Admin Dashboard',
            projectManagerName: 'System Administrator', 
            projectId: 'ADMIN',
            operatorName: 'Admin',
            isAdmin: true,
            password: 'zahran111',
            uid: firebaseUser.uid,
            securityAnswer: 'zahran'
          };
          
          // Persist admin user
          localStorage.setItem('zahran_current_user', JSON.stringify(adminUser));
          callback(adminUser);
          return;
        }
        if (firebaseUser.email) {
          const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.email);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            userData.uid = firebaseUser.uid;
            
            // Persist Firebase Auth user
            localStorage.setItem('zahran_current_user', JSON.stringify(userData));
            callback(userData);
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error in Firebase auth state change:', error);
        callback(null);
      }
    } else {
      // Firebase user signed out, check if we have a persisted Firestore-only user
      const persistedUser = localStorage.getItem('zahran_current_user');
      if (!persistedUser) {
        callback(null);
      }
      // If persisted user exists, don't clear - let the initial check handle it
    }
  });
};
// Compatibility aliases
export const loginAdmin = loginUser;
export const getAllMockData = getAllProjectData;
export const logoutUser = signOut;
// Vehicle Management Functions
export const addVehicle = async (vehicleData: Omit<Vehicle, 'id'>, projectId: string) => {
  try {
    console.log('🚗 Adding vehicle for project:', projectId);
    console.log('🚗 Vehicle data:', vehicleData);
    
    // Generate unique ID
    const vehicleId = Date.now().toString();
    const vehicle: Vehicle = {
      ...vehicleData,
      id: vehicleId
    };
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedVehicles = [...(currentData.vehicles || []), vehicle];
      
      await setDoc(projectDocRef, {
        ...currentData,
        vehicles: updatedVehicles
      });
      
      console.log('✅ Vehicle added successfully');
      return { success: true };
    } else {
      // Create new project with this vehicle
      const initialProjectData: ProjectData = {
        vehicles: [vehicle],
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log('✅ New project created with vehicle');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Error adding vehicle:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple vehicles at once to avoid race conditions
export const addVehiclesBatch = async (vehiclesData: Omit<Vehicle, 'id'>[], projectId: string) => {
  try {
    console.log(`🚗 Adding ${vehiclesData.length} vehicles in batch for project:`, projectId);
    
    // Generate unique IDs for all vehicles
    const vehicles: Vehicle[] = vehiclesData.map((vehicleData, index) => ({
      ...vehicleData,
      id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedVehicles = [...(currentData.vehicles || []), ...vehicles];
      
      await setDoc(projectDocRef, {
        ...currentData,
        vehicles: updatedVehicles
      });
      
      console.log(`✅ ${vehicles.length} vehicles added successfully in batch (Total now: ${updatedVehicles.length})`);
      return { success: true, count: updatedVehicles.length };
    } else {
      // Create new project with these vehicles
      const initialProjectData: ProjectData = {
        vehicles: vehicles,
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log(`✅ New project created with ${vehicles.length} vehicles`);
      return { success: true, count: vehicles.length };
    }
  } catch (error) {
    console.error('❌ Error adding vehicles batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple drivers at once to avoid race conditions
export const addDriversBatch = async (driversData: Omit<Driver, 'id'>[], projectId: string) => {
  try {
    console.log(`🚗 Adding ${driversData.length} drivers in batch for project:`, projectId);
    
    // Generate unique IDs for all drivers
    const drivers: Driver[] = driversData.map((driverData, index) => ({
      ...driverData,
      id: `${Date.now()}_${index}_${Math.random().toString(36).substring(2, 8)}`
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedDrivers = [...(currentData.drivers || []), ...drivers];
      
      await setDoc(projectDocRef, {
        ...currentData,
        drivers: updatedDrivers
      });
      
      console.log(`✅ ${drivers.length} drivers added successfully in batch (Total now: ${updatedDrivers.length})`);
      return { success: true, count: updatedDrivers.length };
    } else {
      // Create new project with these drivers
      const initialProjectData: ProjectData = {
        vehicles: [],
        drivers: drivers,
        incidents: [],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log(`✅ New project created with ${drivers.length} drivers`);
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Error adding drivers batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple supervisors at once to avoid race conditions
export const addSupervisorsBatch = async (supervisorsData: Omit<Supervisor, 'id' | 'userId'>[], projectId: string) => {
  try {
    console.log(`👷‍♂️ Adding ${supervisorsData.length} supervisors in batch for project:`, projectId);
    
    // Generate unique IDs for all supervisors
    const supervisors: Supervisor[] = supervisorsData.map((supervisorData, index) => ({
      ...supervisorData,
      id: (Date.now() + index).toString(), // Ensure unique IDs
      userId: projectId // Set userId to projectId
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedSupervisors = [...(currentData.supervisors || []), ...supervisors];
      
      await setDoc(projectDocRef, {
        ...currentData,
        supervisors: updatedSupervisors
      });
      
      console.log(`✅ ${supervisors.length} supervisors added successfully in batch`);
      return { success: true };
    } else {
      // Create new project with these supervisors
      const initialProjectData: ProjectData = {
        vehicles: [],
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: supervisors,
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log(`✅ New project created with ${supervisors.length} supervisors`);
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Error adding supervisors batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple foremen at once to avoid race conditions
export const addForemenBatch = async (foremenData: { foremanData: Omit<Foreman, 'id'|'labours'>, supervisorName: string }[], projectId: string) => {
  try {
    console.log(`👷 Adding ${foremenData.length} foremen in batch for project:`, projectId);
    console.log('🔍 FIREBASE DEBUG - foremenData:', foremenData);
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      console.log('🔍 FIREBASE DEBUG - Current supervisors count:', currentData.supervisors?.length || 0);
      
      // Process each foreman and add to appropriate supervisor
      const updatedSupervisors = [...currentData.supervisors];
      
      for (const { foremanData, supervisorName } of foremenData) {
        console.log('🔍 FIREBASE DEBUG - Processing foreman:', foremanData, 'for supervisor:', supervisorName);
        
        const newForeman: Foreman = {
          ...foremanData,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          labours: []
        };
        
        // Find or create supervisor
        let targetSupervisor = updatedSupervisors.find(s => s.name === supervisorName);
        if (!targetSupervisor) {
          console.log('🔍 FIREBASE DEBUG - Creating new supervisor:', supervisorName);
          targetSupervisor = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: supervisorName,
            area: '',
            iqama: '',
            mobile: '',
            empId: '',
            foremen: [newForeman],
            userId: projectId
          };
          updatedSupervisors.push(targetSupervisor);
        } else {
          console.log('🔍 FIREBASE DEBUG - Adding to existing supervisor:', supervisorName, 'current foremen count:', targetSupervisor.foremen?.length || 0);
          targetSupervisor.foremen = [...(targetSupervisor.foremen || []), newForeman];
        }
      }
      
      console.log('🔍 FIREBASE DEBUG - Final supervisors count:', updatedSupervisors.length);
      console.log('🔍 FIREBASE DEBUG - Total foremen across all supervisors:', 
        updatedSupervisors.reduce((total, sup) => total + (sup.foremen?.length || 0), 0));
      
      await setDoc(projectDocRef, {
        ...currentData,
        supervisors: updatedSupervisors
      });
      
      console.log(`✅ ${foremenData.length} foremen added successfully in batch`);
      return { success: true };
    } else {
      console.log('Project does not exist, cannot add foremen');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error adding foremen batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple labor at once to avoid race conditions
export const addLabourBatch = async (labourData: { labourData: Omit<Labour, 'id'>, foremanName: string, supervisorName: string }[], projectId: string) => {
  try {
    console.log(`👷‍♂️ Adding ${labourData.length} labour in batch for project:`, projectId);
    console.log('🔍 FIREBASE DEBUG - labourData:', labourData);
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      console.log('🔍 FIREBASE DEBUG - Current supervisors count:', currentData.supervisors?.length || 0);
      
      // Process each labour and add to appropriate foreman under supervisor
      const updatedSupervisors = [...currentData.supervisors];
      
      for (const { labourData: labour, foremanName, supervisorName } of labourData) {
        console.log(`🔍 FIREBASE DEBUG - Processing labour:`, { 
          labourName: labour.name, 
          foremanName, 
          supervisorName 
        });
        
        const newLabour: Labour = {
          ...labour,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
        };
        
        // Find or create supervisor
        let targetSupervisor = updatedSupervisors.find(s => s.name === supervisorName);
        if (!targetSupervisor) {
          console.log(`🔍 FIREBASE DEBUG - Creating new supervisor:`, supervisorName);
          const newForeman: Foreman = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: foremanName,
            iqama: '',
            empId: '',
            labours: [newLabour]
          };
          targetSupervisor = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: supervisorName,
            iqama: '',
            empId: '',
            area: '',
            mobile: '',
            userId: projectId,
            foremen: [newForeman]
          };
          console.log(`🔍 FIREBASE DEBUG - Adding new supervisor with foreman and labour:`, supervisorName);
          updatedSupervisors.push(targetSupervisor);
        } else {
          console.log(`🔍 FIREBASE DEBUG - Adding to existing supervisor:`, supervisorName, 'current foremen count:', targetSupervisor.foremen?.length || 0);
          // Find or create foreman under supervisor
          let targetForeman = targetSupervisor.foremen.find(f => f.name === foremanName);
          if (!targetForeman) {
            console.log(`🔍 FIREBASE DEBUG - Creating new foreman under supervisor:`, foremanName, 'under', supervisorName);
            targetForeman = {
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              name: foremanName,
              iqama: '',
              empId: '',
              labours: [newLabour]
            };
            targetSupervisor.foremen.push(targetForeman);
          } else {
            console.log(`🔍 FIREBASE DEBUG - Adding labour to existing foreman:`, foremanName, 'current labours:', targetForeman.labours?.length || 0);
            targetForeman.labours.push(newLabour);
          }
        }
      }
      
      console.log('🔍 FIREBASE DEBUG - Final supervisors count:', updatedSupervisors.length);
      console.log('🔍 FIREBASE DEBUG - Total labour across all supervisors:', 
        updatedSupervisors.reduce((total, sup) => 
          total + (sup.foremen?.reduce((foremanTotal, foreman) => 
            foremanTotal + (foreman.labours?.length || 0), 0) || 0), 0));
      
      await setDoc(projectDocRef, {
        ...currentData,
        supervisors: updatedSupervisors
      });
      
      console.log(`✅ ${labourData.length} labour added successfully in batch`);
      return { success: true };
    } else {
      console.log('Project does not exist, cannot add labour');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error adding labour batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple project officers at once to avoid race conditions
export const addProjectOfficersBatch = async (projectOfficersData: Omit<any, 'id'>[], projectId: string) => {
  try {
    console.log(`👨‍💼 Adding ${projectOfficersData.length} project officers in batch for project:`, projectId);
    console.log('🔍 FIREBASE DEBUG - projectOfficersData:', projectOfficersData);
    
    // Generate unique IDs for all project officers
    const projectOfficers: any[] = projectOfficersData.map((officerData, index) => ({
      ...officerData,
      id: (Date.now() + index).toString() // Ensure unique IDs
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      console.log('🔍 FIREBASE DEBUG - Current project officers count:', currentData.projectOfficers?.length || 0);
      
      const updatedProjectOfficers = [...(currentData.projectOfficers || []), ...projectOfficers];
      
      await setDoc(projectDocRef, {
        ...currentData,
        projectOfficers: updatedProjectOfficers
      });
      
      console.log(`✅ ${projectOfficers.length} project officers added successfully in batch`);
      return { success: true };
    } else {
      console.log('Project does not exist, cannot add project officers');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error adding project officers batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple crewmen at once to avoid race conditions
export const addCrewmenBatch = async (crewmenData: Omit<any, 'id'>[], projectId: string) => {
  try {
    console.log(`👷‍♂️ Adding ${crewmenData.length} crewmen in batch for project:`, projectId);
    console.log('🔍 FIREBASE DEBUG - crewmenData:', crewmenData);
    
    // Generate unique IDs for all crewmen
    const crewmen: any[] = crewmenData.map((crewmanData, index) => ({
      ...crewmanData,
      id: (Date.now() + index).toString() // Ensure unique IDs
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      console.log('🔍 FIREBASE DEBUG - Current crewmen count:', currentData.crewmen?.length || 0);
      
      const updatedCrewmen = [...(currentData.crewmen || []), ...crewmen];
      
      await setDoc(projectDocRef, {
        ...currentData,
        crewmen: updatedCrewmen
      });
      
      console.log(`✅ ${crewmen.length} crewmen added successfully in batch`);
      return { success: true };
    } else {
      console.log('Project does not exist, cannot add crewmen');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error adding crewmen batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// BATCH IMPORT: Add multiple camp labours at once to avoid race conditions
export const addCampLaboursBatch = async (campLaboursData: Omit<any, 'id'>[], projectId: string) => {
  try {
    console.log(`👷‍♀️ Adding ${campLaboursData.length} camp labours in batch for project:`, projectId);
    console.log('🔍 FIREBASE DEBUG - campLaboursData:', campLaboursData);
    
    // Generate unique IDs for all camp labours
    const campLabours: any[] = campLaboursData.map((labourData, index) => ({
      ...labourData,
      id: (Date.now() + index).toString() // Ensure unique IDs
    }));
    
    // Get current project data
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      console.log('🔍 FIREBASE DEBUG - Current camp labours count:', currentData.campLabours?.length || 0);
      
      const updatedCampLabours = [...(currentData.campLabours || []), ...campLabours];
      
      await setDoc(projectDocRef, {
        ...currentData,
        campLabours: updatedCampLabours
      });
      
      console.log(`✅ ${campLabours.length} camp labours added successfully in batch`);
      return { success: true };
    } else {
      console.log('Project does not exist, cannot add camp labours');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error adding camp labours batch:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const updateVehicle = async (updatedVehicle: Vehicle, projectId: string) => {
  try {
    console.log('?? Updating vehicle:', updatedVehicle.id);
    
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const vehicleIndex = currentData.vehicles.findIndex(v => v.id === updatedVehicle.id);
      
      if (vehicleIndex !== -1) {
        const updatedVehicles = [...currentData.vehicles];
        updatedVehicles[vehicleIndex] = updatedVehicle;
        
        await setDoc(projectDocRef, {
          ...currentData,
          vehicles: updatedVehicles
        });
        
        console.log('? Vehicle updated successfully');
        return { success: true };
      } else {
        console.error('? Vehicle not found');
        return { success: false, error: 'Vehicle not found' };
      }
    } else {
      console.error('? Project not found');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('? Error updating vehicle:', error);
    throw error;
  }
};
export const deleteVehicle = async (vehicleId: string, projectId: string) => {
  try {
    console.log('🗑️ Deleting vehicle with cascade deletion:', vehicleId);
    
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      
      // Filter out the vehicle
      const updatedVehicles = currentData.vehicles.filter(v => v.id !== vehicleId);
      
      // Cascade delete incidents for this vehicle
      const originalIncidentCount = (currentData.incidents || []).length;
      const updatedIncidents = (currentData.incidents || []).filter(incident => 
        incident.vehicleId !== vehicleId
      );
      const incidentsDeleted = originalIncidentCount - updatedIncidents.length;
      
      if (incidentsDeleted > 0) {
        console.log(`🔗 Cascade deleting ${incidentsDeleted} incidents for vehicle ${vehicleId}`);
      }
      
      await setDoc(projectDocRef, {
        ...currentData,
        vehicles: updatedVehicles,
        incidents: updatedIncidents
      });
      
      console.log('✅ Vehicle deleted successfully with cascade deletion');
      if (incidentsDeleted > 0) {
        console.log(`✅ Also cascade deleted ${incidentsDeleted} associated incidents`);
      }
      
      return { success: true, incidentsDeleted };
    } else {
      console.error('❌ Project not found');
      return { success: false, error: 'Project not found' };
    }
  } catch (error) {
    console.error('❌ Error deleting vehicle:', error);
    throw error;
  }
};
export const deleteVehicles = async (
  vehicleIds: string[], 
  context: 'bulk' | 'history' | 'individual' = 'bulk'
): Promise<{ 
  success: boolean; 
  message: string; 
  deletedCount: number; 
  skippedCount: number; 
  skippedVehicles: Array<{vehicleId: string, reason: string, plateNumber?: string}> 
}> => {
  try {
    console.log(`??? Attempting to delete ${vehicleIds.length} vehicles from ${context} context...`);
    console.log('?? Delete context received:', context);
    console.log('?? Vehicle IDs to delete:', vehicleIds);
    
    if (vehicleIds.length === 0) {
      return { success: false, message: 'No vehicles selected', deletedCount: 0, skippedCount: 0, skippedVehicles: [] };
    }
    
    // For Vehicle History page, allow deletion with minimal protection
    if (context === 'history') {
      console.log('🚁 Vehicle History deletion - applying minimal protection with cascade deletion...');
      console.log('✅ Bypassing all protection checks for history context');
      
      // First, cascade delete all incidents for these vehicles from project documents
      try {
        console.log('🔗 Starting cascade deletion of incidents for vehicles:', vehicleIds);
        const projectsSnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
        const projectUpdatePromises: Promise<any>[] = [];
        let totalIncidentsDeleted = 0;

        projectsSnapshot.forEach(projectDoc => {
          const projectData = projectDoc.data() as ProjectData;
          if (!projectData || !projectData.incidents) return;

          // Filter out incidents for vehicles being deleted
          const originalIncidentCount = projectData.incidents.length;
          const filteredIncidents = projectData.incidents.filter(incident => 
            !vehicleIds.includes(incident.vehicleId)
          );
          const incidentsDeleted = originalIncidentCount - filteredIncidents.length;

          if (incidentsDeleted > 0) {
            totalIncidentsDeleted += incidentsDeleted;
            const projectRef = doc(db, COLLECTIONS.PROJECTS, projectDoc.id);
            projectUpdatePromises.push(setDoc(projectRef, { 
              ...projectData, 
              incidents: filteredIncidents 
            }, { merge: true }));
            console.log(`🗑️ Removing ${incidentsDeleted} incidents from project ${projectDoc.id}`);
          }
        });

        if (projectUpdatePromises.length > 0) {
          await Promise.all(projectUpdatePromises);
          console.log(`✅ Cascade deleted ${totalIncidentsDeleted} incidents from ${projectUpdatePromises.length} projects`);
        } else {
          console.log('ℹ️ No incidents found to cascade delete');
        }
      } catch (error) {
        console.error('❌ Error during incident cascade deletion:', error);
        // Continue with vehicle deletion even if incident cleanup fails
      }

      // Then delete the vehicles themselves
      const batch = writeBatch(db);
      vehicleIds.forEach(vehicleId => {
        const vehicleRef = doc(db, 'vehicles', vehicleId);
        batch.delete(vehicleRef);
        console.log(`🗑️ Adding vehicle ${vehicleId} to deletion batch`);
      });
      
      await batch.commit();
      console.log(`✅ Successfully deleted ${vehicleIds.length} vehicles from Vehicle History with cascade deletion`);
      
      return {
        success: true,
        message: `Successfully deleted ${vehicleIds.length} vehicles and their associated incidents from Vehicle History.`,
        deletedCount: vehicleIds.length,
        skippedCount: 0,
        skippedVehicles: []
      };
    }
    
    console.log('🛡️ Applying full protection checks for non-history context...');
    const [vehiclesSnapshot, incidentsSnapshot, transfersSnapshot, repairHistorySnapshot, driversSnapshot] = await Promise.all([
      getDocs(collection(db, 'vehicles')),
      getDocs(collection(db, 'incidents')),
      getDocs(collection(db, 'transfers')),
      getDocs(collection(db, 'repairHistory')),
      getDocs(collection(db, 'drivers'))
    ]);
    
    // Build lookup maps
    const vehiclesMap = new Map();
    vehiclesSnapshot.forEach(doc => {
      const vehicle = { id: doc.id, ...doc.data() };
      vehiclesMap.set(doc.id, vehicle);
    });
    
    // Check which vehicles actually exist in the database
    // If a vehicle was deleted from Vehicle History, it shouldn't be protected anymore
    const vehiclesStillInSystem = vehicleIds.filter(id => vehiclesMap.has(id));
    console.log('🔍 Vehicles still in system:', vehiclesStillInSystem);
    console.log('🗑️ Vehicles already deleted from history:', vehicleIds.filter(id => !vehiclesMap.has(id)));
    
    // If vehicle was deleted from history, allow deletion from View Vehicles too
    const vehiclesToCheckForDependencies = vehiclesStillInSystem;
    
    // Check which vehicles have dependencies or historical significance
    const vehiclesWithDependencies = new Set<string>();
    const dependencyReasons = new Map<string, string[]>();
    
    // Helper function to add dependency reason
    const addDependency = (vehicleId: string, reason: string) => {
      vehiclesWithDependencies.add(vehicleId);
      const reasons = dependencyReasons.get(vehicleId) || [];
      reasons.push(reason);
      dependencyReasons.set(vehicleId, reasons);
    };
    
    // Check vehicles that are not 'Active' (in workshop, under repair, etc.)
    vehiclesToCheckForDependencies.forEach(vehicleId => {
      const vehicle = vehiclesMap.get(vehicleId);
      if (vehicle && vehicle.status && vehicle.status !== 'Active') {
        addDependency(vehicleId, `vehicle status: ${vehicle.status}`);
      }
    });
    
    // Check for assigned drivers (only for vehicles still in system)
    driversSnapshot.forEach(doc => {
      const driver = doc.data();
      if (driver.assignedVehicle && vehiclesToCheckForDependencies.includes(driver.assignedVehicle)) {
        addDependency(driver.assignedVehicle, 'assigned to driver');
      }
    });
    
    // Check incidents (only for vehicles still in system)
    incidentsSnapshot.forEach(doc => {
      const incident = doc.data();
      if (incident.vehicleId && vehiclesToCheckForDependencies.includes(incident.vehicleId)) {
        addDependency(incident.vehicleId, 'active incidents');
      }
    });
    
    // Check transfers (only for vehicles still in system)
    transfersSnapshot.forEach(doc => {
      const transfer = doc.data();
      if (transfer.vehicleId && vehiclesToCheckForDependencies.includes(transfer.vehicleId)) {
        addDependency(transfer.vehicleId, 'transfer history');
      }
    });
    
    // Check repair history (only for vehicles still in system)
    repairHistorySnapshot.forEach(doc => {
      const repair = doc.data();
      if (repair.vehicleId && vehiclesToCheckForDependencies.includes(repair.vehicleId)) {
        addDependency(repair.vehicleId, 'repair history');
      }
    });
    
    // Vehicles that were already deleted from history can be deleted from View Vehicles
    const vehiclesDeletedFromHistory = vehicleIds.filter(id => !vehiclesMap.has(id));
    
    // Separate vehicles that can be deleted vs those that should be skipped
    const vehiclesToDelete = [
      ...vehiclesDeletedFromHistory, // Always allow deletion if already removed from history
      ...vehiclesToCheckForDependencies.filter(id => !vehiclesWithDependencies.has(id))
    ];
    
    const vehiclesToSkip = vehiclesToCheckForDependencies.filter(id => vehiclesWithDependencies.has(id));
    
    const skippedVehicles = vehiclesToSkip.map(vehicleId => {
      const vehicle = vehiclesMap.get(vehicleId);
      const reasons = dependencyReasons.get(vehicleId) || [];
      return {
        vehicleId,
        plateNumber: vehicle?.plateNumber || 'Unknown',
        reason: reasons.join(', ')
      };
    });
    
    console.log('🔍 Deletion analysis:', {
      total: vehicleIds.length,
      vehiclesDeletedFromHistory: vehiclesDeletedFromHistory.length,
      vehiclesStillInSystem: vehiclesStillInSystem.length,
      canDelete: vehiclesToDelete.length,
      mustSkip: vehiclesToSkip.length,
      skippedVehicles
    });
    
    // Delete vehicles that are safe to delete
    let deletedCount = 0;
    if (vehiclesToDelete.length > 0) {
      // For vehicles already deleted from history, we only need to clean up project documents
      const vehiclesAlreadyDeleted = vehiclesDeletedFromHistory;
      const vehiclesToDeleteFromFlat = vehiclesToDelete.filter(id => vehiclesMap.has(id));
      
      if (vehiclesToDeleteFromFlat.length > 0) {
        const batch = writeBatch(db);
        
        vehiclesToDeleteFromFlat.forEach(vehicleId => {
          const vehicleRef = doc(db, 'vehicles', vehicleId);
          batch.delete(vehicleRef);
        });
        
        await batch.commit();
        console.log(`✅ Successfully deleted ${vehiclesToDeleteFromFlat.length} vehicles from flat collection`);
      }
      
      if (vehiclesAlreadyDeleted.length > 0) {
        console.log(`✅ ${vehiclesAlreadyDeleted.length} vehicles were already deleted from history, cleaning up project documents`);
      }
      
      deletedCount = vehiclesToDelete.length;

      // Also remove deleted vehicles from any project document that stores vehicles in an array
      try {
        const projectsSnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
        const updatePromises: Promise<any>[] = [];
        projectsSnapshot.forEach(projectDoc => {
          const projectData = projectDoc.data() as ProjectData;
          if (!projectData || !projectData.vehicles) return;
          const filtered = projectData.vehicles.filter((v: any) => !vehiclesToDelete.includes(v.id));
          if (filtered.length !== projectData.vehicles.length) {
            const projectRef = doc(db, COLLECTIONS.PROJECTS, projectDoc.id);
            updatePromises.push(setDoc(projectRef, { ...projectData, vehicles: filtered }, { merge: true }));
            console.log(`? Removed ${projectData.vehicles.length - filtered.length} vehicles from project ${projectDoc.id}`);
          }
        });
        if (updatePromises.length > 0) {
          await Promise.all(updatePromises);
          console.log('? Project documents updated to remove deleted vehicles');
        }
      } catch (projErr) {
        console.error('? Failed to update project documents after deleting vehicles:', projErr);
      }
    }
    
    // Build result message
    let message = '';
    if (deletedCount > 0 && vehiclesToSkip.length > 0) {
      message = `Successfully deleted ${deletedCount} vehicles. Skipped ${vehiclesToSkip.length} vehicles with active incidents, transfers, or repair history.`;
    } else if (deletedCount > 0) {
      message = `Successfully deleted ${deletedCount} vehicles.`;
    } else if (vehiclesToSkip.length > 0) {
      message = `Could not delete any vehicles. All ${vehiclesToSkip.length} selected vehicles have active incidents, transfers, or repair history.`;
    } else {
      message = 'No vehicles were processed.';
    }
    
    return {
      success: deletedCount > 0 || vehiclesToSkip.length === 0,
      message,
      deletedCount,
      skippedCount: vehiclesToSkip.length,
      skippedVehicles
    };
    
  } catch (error) {
    console.error('? Error deleting vehicles:', error);
    return {
      success: false,
      message: `Error deleting vehicles: ${error.message}`,
      deletedCount: 0,
      skippedCount: 0,
      skippedVehicles: []
    };
  }
};

// Cleanup function for removing test incidents
export const cleanupTestIncidents = async (): Promise<{ 
  success: boolean; 
  message: string; 
  deletedCount: number; 
}> => {
  try {
    console.log('🧹 Starting cleanup of test incidents...');
    
    const projectsSnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
    const projectUpdatePromises: Promise<any>[] = [];
    let totalIncidentsDeleted = 0;
    
    // Keywords to identify test incidents
    const testKeywords = [
      'test', 'testing', 'asdf', 'qwerty', 'abc', 'xyz', 'demo',
      'sample', '123', 'mnn', 'aaa', 'bbb', 'ccc', 'ddd'
    ];

    projectsSnapshot.forEach(projectDoc => {
      const projectData = projectDoc.data() as ProjectData;
      if (!projectData || !projectData.incidents) return;

      // Filter out test incidents
      const originalIncidentCount = projectData.incidents.length;
      const filteredIncidents = projectData.incidents.filter(incident => {
        const description = (incident.description || '').toLowerCase();
        const type = (incident.type || '').toLowerCase();
        
        // Check if description or type contains test keywords
        const isTestIncident = testKeywords.some(keyword => 
          description.includes(keyword) || type.includes(keyword)
        );
        
        // Also check for very short descriptions that look like test data
        const hasShortTestDescription = description.length > 0 && description.length <= 5 && 
          !/^[a-z\s]+$/.test(description); // Not proper words
        
        if (isTestIncident || hasShortTestDescription) {
          console.log(`🗑️ Marking incident for deletion: "${incident.description}" (${incident.type})`);
          return false; // Remove this incident
        }
        
        return true; // Keep this incident
      });
      
      const incidentsDeleted = originalIncidentCount - filteredIncidents.length;

      if (incidentsDeleted > 0) {
        totalIncidentsDeleted += incidentsDeleted;
        const projectRef = doc(db, COLLECTIONS.PROJECTS, projectDoc.id);
        projectUpdatePromises.push(setDoc(projectRef, { 
          ...projectData, 
          incidents: filteredIncidents 
        }, { merge: true }));
        console.log(`🧹 Cleaning ${incidentsDeleted} test incidents from project ${projectDoc.id}`);
      }
    });

    if (projectUpdatePromises.length > 0) {
      await Promise.all(projectUpdatePromises);
      console.log(`✅ Successfully cleaned up ${totalIncidentsDeleted} test incidents from ${projectUpdatePromises.length} projects`);
      
      return {
        success: true,
        message: `Successfully removed ${totalIncidentsDeleted} test incidents from the database.`,
        deletedCount: totalIncidentsDeleted
      };
    } else {
      console.log('ℹ️ No test incidents found to clean up');
      return {
        success: true,
        message: 'No test incidents found to clean up.',
        deletedCount: 0
      };
    }

  } catch (error) {
    console.error('❌ Error during test incident cleanup:', error);
    return {
      success: false,
      message: `Error cleaning up test incidents: ${error.message}`,
      deletedCount: 0
    };
  }
};

export const bulkUpdateVehicleServiceType = async (vehicleIds: string[], serviceType: string) => console.log('bulkUpdateVehicleServiceType stub');
// Driver Management Functions  
export const addDriver = async (driverData: Omit<Driver, 'id'>, projectId: string) => {
  try {
    console.log('????? Adding driver for project:', projectId);
    
    const driverId = Date.now().toString();
    const driver: Driver = {
      ...driverData,
      id: driverId
    };
    
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedDrivers = [...(currentData.drivers || []), driver];
      
      await setDoc(projectDocRef, {
        ...currentData,
        drivers: updatedDrivers
      });
      
      console.log('? Driver added successfully');
      return { success: true };
    } else {
      const initialProjectData: ProjectData = {
        vehicles: [],
        drivers: [driver],
        incidents: [],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log('? New project created with driver');
      return { success: true };
    }
  } catch (error) {
    console.error('? Error adding driver:', error);
    throw error;
  }
};
export const updateDriver = async (driver: any) => console.log('updateDriver stub');
export const deleteDriver = async (driverId: string) => console.log('deleteDriver stub');
export const deleteDrivers = async (driverIds: string[]) => {
  try {
    console.log(`🗑️ Attempting to delete ${driverIds.length} drivers...`);
    
    if (driverIds.length === 0) {
      return { success: false, message: 'No drivers selected', deletedCount: 0 };
    }
    
    // Delete from flat collection
    const batch = writeBatch(db);
    driverIds.forEach(driverId => {
      const driverRef = doc(db, 'drivers', driverId);
      batch.delete(driverRef);
      console.log(`🗑️ Adding driver ${driverId} to deletion batch`);
    });
    
    await batch.commit();
    console.log(`✅ Successfully deleted ${driverIds.length} drivers (flat collection)`);
    
    // Also remove deleted drivers from any project document that stores drivers in an array
    try {
      const projectsSnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
      const updatePromises: Promise<any>[] = [];
      projectsSnapshot.forEach(projectDoc => {
        const projectData = projectDoc.data() as ProjectData;
        if (!projectData || !projectData.drivers) return;
        const filtered = projectData.drivers.filter((d: any) => !driverIds.includes(d.id));
        if (filtered.length !== projectData.drivers.length) {
          const projectRef = doc(db, COLLECTIONS.PROJECTS, projectDoc.id);
          updatePromises.push(setDoc(projectRef, { ...projectData, drivers: filtered }, { merge: true }));
          console.log(`🗑️ Removed ${projectData.drivers.length - filtered.length} drivers from project ${projectDoc.id}`);
        }
      });
      if (updatePromises.length > 0) {
        await Promise.all(updatePromises);
        console.log('✅ Project documents updated to remove deleted drivers');
      }
    } catch (projErr) {
      console.error('❌ Failed to update project documents after deleting drivers:', projErr);
    }
    
    return {
      success: true,
      message: `Successfully deleted ${driverIds.length} drivers.`,
      deletedCount: driverIds.length
    };
  } catch (error) {
    console.error('❌ Error deleting drivers:', error);
    return {
      success: false,
      message: `Error deleting drivers: ${error.message}`,
      deletedCount: 0
    };
  }
};
// Incident Management Functions
export const addIncident = async (incidentData: any, projectId: string) => {
  try {
    console.log('🚨 Adding incident for project:', projectId);
    
    const incidentId = Date.now().toString();
    
    // Clean the incident data to remove undefined values
    const cleanedData = Object.entries(incidentData).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
    
    const incident = {
      ...cleanedData,
      id: incidentId,
      status: 'active',
      date: incidentData.date || new Date().toISOString(),
      affectedPart: incidentData.affectedPart || '',
      description: incidentData.description || '',
      driverId: incidentData.driverId || ''
    };
    
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedIncidents = [...(currentData.incidents || []), incident];
      
      // Update vehicle status to indicate it's in workshop
      const updatedVehicles = (currentData.vehicles || []).map(vehicle => 
        vehicle.id === incidentData.vehicleId ? { 
          ...vehicle, 
          status: incidentData.type || 'Under Maintenance',
          inWorkshop: true 
        } : vehicle
      );
      
      await setDoc(projectDocRef, {
        ...currentData,
        incidents: updatedIncidents,
        vehicles: updatedVehicles
      });
      
      console.log('✅ Incident added and vehicle marked as in workshop');
      return { success: true };
    } else {
      // For new projects, we shouldn't create incomplete vehicle data
      // Instead, just create the project with the incident
      const initialProjectData: ProjectData = {
        vehicles: [], // Don't create incomplete vehicle data
        drivers: [],
        incidents: [incident],
        transfers: [],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log('✅ New project created with incident and workshop vehicle');
      return { success: true };
    }
  } catch (error) {
    console.error('❌ Error adding incident:', error);
    throw error;
  }
};
// Helper function to get current user ID from localStorage
const getCurrentUserId = (): string | null => {
  try {
    const currentUser = localStorage.getItem('zahran_current_user');
    if (currentUser) {
      const user = JSON.parse(currentUser);
      return user.email; // Use email as user ID for project documents
    }
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

export const markVehicleAsActive = async (vehicleId: string, repairedAt: string, repairedBy: string, repairNotes?: string, userId?: string) => {
  console.log(`🔧 Marking vehicle ${vehicleId} as repaired/active...`);
  
  try {
    // Get the current user ID
    const activeUserId = userId || getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Update project document
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as ProjectData;
      
      // Find the active incident for this vehicle
      const activeIncident = (projectData.incidents || []).find(incident => 
        incident.vehicleId === vehicleId
      );
      
      // Update vehicle status to Active and remove from workshop
      const updatedVehicles = (projectData.vehicles || []).map(vehicle => 
        vehicle.id === vehicleId ? { 
          ...vehicle, 
          status: 'Active',
          inWorkshop: false  // Remove from workshop
        } : vehicle
      );
      
      // Move incident to repair history by updating incident status
      const updatedIncidents = (projectData.incidents || []).map(incident => 
        incident.vehicleId === vehicleId ? {
          ...incident,
          status: 'repaired',
          repairedAt: repairedAt,
          repairedBy: repairedBy,
          repairNotes: repairNotes || ''
        } : incident
      );
      
      // Create repair history entry from the incident with complete data
      const repairHistoryEntry = {
        id: Date.now().toString(),
        vehicleId,
        incidentId: activeIncident?.id || '',
        incidentType: activeIncident?.type || 'Unknown',
        affectedPart: activeIncident?.affectedPart || '',
        description: activeIncident?.description || '',
        incidentDate: activeIncident?.date || new Date().toISOString(),
        driverId: activeIncident?.driverId || '',
        repairedAt,
        repairedBy,
        repairNotes: repairNotes || '',
        createdAt: new Date().toISOString(),
        userId: activeUserId,
        status: 'repaired',
        // Store complete original incident data
        originalIncident: {
          id: activeIncident?.id || '',
          type: activeIncident?.type || 'Unknown',
          affectedPart: activeIncident?.affectedPart || '',
          description: activeIncident?.description || '',
          date: activeIncident?.date || new Date().toISOString(),
          driverId: activeIncident?.driverId || '',
          vehicleId: activeIncident?.vehicleId || vehicleId,
          status: 'repaired'
        }
      };
      
      // Add to repair history
      const updatedRepairHistory = [...(projectData.repairHistory || []), repairHistoryEntry];
      
      // Remove the incident from active incidents (move it to history)
      const filteredIncidents = (projectData.incidents || []).filter(incident => 
        incident.vehicleId !== vehicleId
      );
      
      // Update the project document
      await updateDoc(projectDocRef, {
        vehicles: updatedVehicles,
        incidents: filteredIncidents,  // Remove from active incidents
        repairHistory: updatedRepairHistory
      });
      
      console.log(`✅ Vehicle ${vehicleId} marked as repaired:`);
      console.log(`   - Removed from workshop`);
      console.log(`   - Incident moved to repair history`);
      console.log(`   - Status set to Active`);
    }
    
    // Also try to update flat collections if they exist
    try {
      const vehicleDocRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleDocRef);
      if (vehicleDoc.exists()) {
        await updateDoc(vehicleDocRef, { 
          status: 'Active',
          inWorkshop: false 
        });
      }
      
      // Update incident status in flat collection
      const incidentsSnapshot = await getDocs(query(collection(db, 'incidents'), where('vehicleId', '==', vehicleId)));
      const updatePromises = incidentsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, { 
          status: 'repaired',
          repairedAt: repairedAt,
          repairedBy: repairedBy
        })
      );
      await Promise.all(updatePromises);
    } catch (flatError) {
      console.log('Note: Flat collection update failed (this is OK if using project documents only)', flatError);
    }
    
  } catch (error) {
    console.error('❌ Error marking vehicle as active:', error);
    throw error;
  }
};

export const dismissIncident = async (vehicleId: string) => {
  console.log(`🗑️ Dismissing incident for vehicle ${vehicleId}...`);
  
  try {
    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Update project document
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as ProjectData;
      
      // Update vehicle status to Active (remove incident status)
      const updatedVehicles = (projectData.vehicles || []).map(vehicle => 
        vehicle.id === vehicleId ? { ...vehicle, status: 'Active' } : vehicle
      );
      
      // Remove incidents for this vehicle
      const updatedIncidents = (projectData.incidents || []).filter(incident => 
        incident.vehicleId !== vehicleId
      );
      
      // Update the project document
      await updateDoc(projectDocRef, {
        vehicles: updatedVehicles,
        incidents: updatedIncidents
      });
      
      console.log(`✅ Incident dismissed for vehicle ${vehicleId}`);
    }
    
    // Also try to update flat collections if they exist
    try {
      const vehicleDocRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleDocRef);
      if (vehicleDoc.exists()) {
        await updateDoc(vehicleDocRef, { status: 'Active' });
      }
      
      // Remove from incidents collection
      const incidentsSnapshot = await getDocs(query(collection(db, 'incidents'), where('vehicleId', '==', vehicleId)));
      const deletePromises = incidentsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (flatError) {
      console.log('Note: Flat collection update failed (this is OK if using project documents only)', flatError);
    }
    
  } catch (error) {
    console.error('❌ Error dismissing incident:', error);
    throw error;
  }
};
export const dismissRepairHistories = async (repairIds: string[]) => {
  console.log(`🗑️ Dismissing repair histories: ${repairIds.join(', ')}...`);
  
  try {
    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Update project document
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as ProjectData;
      
      // Remove specified repair histories
      const updatedRepairHistory = (projectData.repairHistory || []).filter(repair => 
        !repairIds.includes(repair.id)
      );
      
      // Update the project document
      await updateDoc(projectDocRef, {
        repairHistory: updatedRepairHistory
      });
      
      console.log(`✅ Dismissed ${repairIds.length} repair history entries`);
    }
    
    // Also try to delete from flat collection if it exists
    try {
      const deletePromises = repairIds.map(repairId => {
        const repairDocRef = doc(db, 'repairHistory', repairId);
        return deleteDoc(repairDocRef);
      });
      await Promise.all(deletePromises);
    } catch (flatError) {
      console.log('Note: Flat collection deletion failed (this is OK if using project documents only)', flatError);
    }
    
  } catch (error) {
    console.error('❌ Error dismissing repair histories:', error);
    throw error;
  }
};

export const deleteCompleteHistory = async (vehicleIds: string[], upToDate?: string) => {
  console.log(`🗑️ Deleting complete history for vehicles: ${vehicleIds.join(', ')}...`);
  
  try {
    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Update project document
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as ProjectData;
      const cutoffDate = upToDate ? new Date(upToDate) : new Date();
      
      // Filter out incidents for specified vehicles up to specified date
      const updatedIncidents = (projectData.incidents || []).filter(incident => {
        if (!vehicleIds.includes(incident.vehicleId)) return true;
        if (upToDate && new Date(incident.date) > cutoffDate) return true;
        return false;
      });
      
      // Filter out repair histories for specified vehicles up to specified date
      const updatedRepairHistory = (projectData.repairHistory || []).filter(repair => {
        if (!vehicleIds.includes(repair.vehicleId)) return true;
        if (upToDate && new Date(repair.repairedAt) > cutoffDate) return true;
        return false;
      });
      
      // Update the project document
      await updateDoc(projectDocRef, {
        incidents: updatedIncidents,
        repairHistory: updatedRepairHistory
      });
      
      console.log(`✅ Deleted complete history for ${vehicleIds.length} vehicles`);
    }
    
  } catch (error) {
    console.error('❌ Error deleting complete history:', error);
    throw error;
  }
};
export const transferVehicle = async (vehicleId: string, fromUserId: string, toUserId: string, transferDate: string, notes?: string) => {
  console.log(`🚗 Transferring vehicle ${vehicleId} from ${fromUserId} to ${toUserId}...`);
  
  try {
    // Create transfer record with correct type structure
    const transferRecord: Transfer = {
      id: Date.now().toString(),
      vehicleId,
      fromUserId,
      toUserId,
      timestamp: transferDate,
      status: 'Transferred' as TransferStatus
    };
    
    // Get vehicle data from source project
    const fromProjectDocRef = doc(db, COLLECTIONS.PROJECTS, fromUserId);
    const fromProjectDoc = await getDoc(fromProjectDocRef);
    
    if (!fromProjectDoc.exists()) {
      throw new Error(`Source project ${fromUserId} not found`);
    }
    
    const fromProjectData = fromProjectDoc.data() as ProjectData;
    const vehicleToTransfer = (fromProjectData.vehicles || []).find(v => v.id === vehicleId);
    
    if (!vehicleToTransfer) {
      throw new Error(`Vehicle ${vehicleId} not found in source project`);
    }
    
    // Remove vehicle from source project
    const updatedSourceVehicles = (fromProjectData.vehicles || []).filter(v => v.id !== vehicleId);
    const updatedSourceTransfers = [...(fromProjectData.transfers || []), transferRecord];
    
    // Update source project document
    await updateDoc(fromProjectDocRef, {
      vehicles: updatedSourceVehicles,
      transfers: updatedSourceTransfers
    });
    
    // Add vehicle to destination project
    const toProjectDocRef = doc(db, COLLECTIONS.PROJECTS, toUserId);
    const toProjectDoc = await getDoc(toProjectDocRef);
    
    if (toProjectDoc.exists()) {
      const toProjectData = toProjectDoc.data() as ProjectData;
      
      // Add vehicle to destination project
      const updatedDestinationVehicles = [...(toProjectData.vehicles || []), vehicleToTransfer];
      const updatedDestinationTransfers = [...(toProjectData.transfers || []), transferRecord];
      
      // Update destination project document
      await updateDoc(toProjectDocRef, {
        vehicles: updatedDestinationVehicles,
        transfers: updatedDestinationTransfers
      });
    } else {
      // Create new project document for destination if it doesn't exist
      const initialProjectData: ProjectData = {
        vehicles: [vehicleToTransfer],
        drivers: [],
        incidents: [],
        transfers: [transferRecord],
        supervisors: [],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: []
      };
      
      await setDoc(toProjectDocRef, initialProjectData);
    }
    
    // Also try to update flat collections if they exist
    try {
      // Update vehicle in flat collection
      const vehicleDocRef = doc(db, 'vehicles', vehicleId);
      const vehicleDoc = await getDoc(vehicleDocRef);
      if (vehicleDoc.exists()) {
        await updateDoc(vehicleDocRef, { 
          userId: toUserId,
          transferredAt: transferDate,
          transferredFrom: fromUserId
        });
      }
      
      // Add to transfers collection
      const transferDocRef = doc(db, 'transfers', transferRecord.id);
      await setDoc(transferDocRef, transferRecord);
    } catch (flatError) {
      console.log('Note: Flat collection update failed (this is OK if using project documents only)', flatError);
    }
    
    console.log(`✅ Vehicle ${vehicleId} transferred successfully from ${fromUserId} to ${toUserId}`);
    return transferRecord;
    
  } catch (error) {
    console.error('❌ Error transferring vehicle:', error);
    throw error;
  }
};
export const returnVehicle = async (transferId: string) => {
  console.log(`↩️ Returning vehicle from transfer ${transferId}...`);
  
  try {
    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Find the transfer record in the current project
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (!projectDoc.exists()) {
      throw new Error(`Project ${activeUserId} not found`);
    }
    
    const projectData = projectDoc.data() as ProjectData;
    const transfer = (projectData.transfers || []).find(t => t.id === transferId);
    
    if (!transfer) {
      throw new Error(`Transfer ${transferId} not found`);
    }
    
    // Update transfer status to 'Returned'
    const updatedTransfers = (projectData.transfers || []).map(t => 
      t.id === transferId ? { ...t, status: 'Returned', returnedAt: new Date().toISOString() } : t
    );
    
    // Update the project document
    await updateDoc(projectDocRef, {
      transfers: updatedTransfers
    });
    
    console.log(`✅ Vehicle returned for transfer ${transferId}`);
    
  } catch (error) {
    console.error('❌ Error returning vehicle:', error);
    throw error;
  }
};

export const deleteTransfer = async (transferId: string) => {
  console.log(`🗑️ Deleting transfer ${transferId}...`);
  
  try {
    const activeUserId = getCurrentUserId();
    if (!activeUserId) {
      throw new Error('No active user ID provided');
    }
    
    // Remove transfer from current project
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, activeUserId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const projectData = projectDoc.data() as ProjectData;
      
      // Remove the transfer
      const updatedTransfers = (projectData.transfers || []).filter(t => t.id !== transferId);
      
      // Update the project document
      await updateDoc(projectDocRef, {
        transfers: updatedTransfers
      });
    }
    
    // Also try to delete from flat collection
    try {
      const transferDocRef = doc(db, 'transfers', transferId);
      await deleteDoc(transferDocRef);
    } catch (flatError) {
      console.log('Note: Flat collection deletion failed (this is OK if using project documents only)', flatError);
    }
    
    console.log(`✅ Transfer ${transferId} deleted`);
    
  } catch (error) {
    console.error('❌ Error deleting transfer:', error);
    throw error;
  }
};
export const addAdminNotification = async (data: any) => console.log('addAdminNotification stub');
export const deleteAdminNotification = async (notificationId: string) => console.log('deleteAdminNotification stub');
export const deleteAllAdminNotifications = async () => console.log('deleteAllAdminNotifications stub');
// Manpower Management Functions
export const addManPowerEntry = async (entryType: 'supervisor' | 'foreman' | 'labour' | 'crewman' | 'campLabour' | 'projectOfficer', data: any, projectId: string, parentId?: string) => {
  try {
    console.log(`?? Adding ${entryType} for project:`, projectId);
    
    const entryId = Date.now().toString();
    const entry = {
      ...data,
      id: entryId,
      parentId: parentId || null
    };
    
    const projectDocRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectDocRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      let updatedData = { ...currentData };
      
      switch (entryType) {
        case 'supervisor':
          updatedData.supervisors = [...(currentData.supervisors || []), { ...entry, foremen: [] }];
          break;
        case 'foreman':
          if (parentId) {
            const supervisorIndex = updatedData.supervisors.findIndex(s => s.id === parentId);
            if (supervisorIndex !== -1) {
              if (!updatedData.supervisors[supervisorIndex].foremen) {
                updatedData.supervisors[supervisorIndex].foremen = [];
              }
              updatedData.supervisors[supervisorIndex].foremen.push({ ...entry, labours: [] });
            }
          }
          break;
        case 'labour':
          if (parentId) {
            // parentId should be foreman ID
            for (const supervisor of updatedData.supervisors) {
              const foremanIndex = supervisor.foremen?.findIndex(f => f.id === parentId) ?? -1;
              if (foremanIndex !== -1) {
                if (!supervisor.foremen[foremanIndex].labours) {
                  supervisor.foremen[foremanIndex].labours = [];
                }
                supervisor.foremen[foremanIndex].labours.push(entry);
                break;
              }
            }
          }
          break;
        case 'crewman':
          updatedData.crewmen = [...(currentData.crewmen || []), entry];
          break;
        case 'campLabour':
          updatedData.campLabours = [...(currentData.campLabours || []), entry];
          break;
        case 'projectOfficer':
          updatedData.projectOfficers = [...(currentData.projectOfficers || []), entry];
          break;
      }
      
      await setDoc(projectDocRef, updatedData);
      
      console.log(`? ${entryType} added successfully`);
      return { success: true };
    } else {
      const initialProjectData: ProjectData = {
        vehicles: [],
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: entryType === 'supervisor' ? [entry] : [],
        crewmen: entryType === 'crewman' ? [entry] : [],
        campLabours: entryType === 'campLabour' ? [entry] : [],
        notifications: [],
        projectOfficers: entryType === 'projectOfficer' ? [entry] : [],
        repairHistory: [],
      };
      
      await setDoc(projectDocRef, initialProjectData);
      console.log(`? New project created with ${entryType}`);
      return { success: true };
    }
  } catch (error) {
    console.error(`? Error adding ${entryType}:`, error);
    throw error;
  }
};
export const updateProjectStructure = async (userEmail: string, newStructure: any) => {
    try {
        console.log('🔧 Updating project structure for:', userEmail);
        
        const projectDocRef = doc(db, 'projects', userEmail);
        
        // Completely replace the project data with new structure
        await setDoc(projectDocRef, {
            ...newStructure,
            lastUpdated: new Date().toISOString(),
            structureVersion: Date.now().toString()
        });
        
        console.log('✅ Project structure updated successfully');
        return { success: true };
        
    } catch (error) {
        console.error('❌ Error updating project structure:', error);
        throw error;
    }
};

export const updateSupervisor = async (supervisor: Supervisor, userEmail: string) => {
    const userDocRef = doc(db, 'projects', userEmail);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
        const data = userDoc.data() as ProjectData;
        const supervisorIndex = data.supervisors.findIndex(s => s.id === supervisor.id);
        
        if (supervisorIndex !== -1) {
            data.supervisors[supervisorIndex] = supervisor;
            await updateDoc(userDocRef, { supervisors: data.supervisors });
        }
    }
};
export const deleteSupervisor = async (supervisorId: string) => console.log('deleteSupervisor stub');
export const updateProjectOfficer = async (officer: any) => {
  console.log('📝 Updating project officer:', officer);
  
  try {
    // Get current user email
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No user logged in');
    
    const user = JSON.parse(currentUser);
    const email = user.email;
    
    // Load current project data
    const projectData = await loadProjectData(email);
    
    // Update in project officers array
    const updatedOfficers = (projectData.projectOfficers || []).map(
      item => item.id === officer.id ? { ...item, ...officer } : item
    );
    
    await saveProjectData(email, {
      ...projectData,
      projectOfficers: updatedOfficers
    });
    
    console.log(`✅ Successfully updated project officer: ${officer.id}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating project officer:', error);
    throw error;
  }
};
export const deleteProjectOfficer = async (officerId: string) => {
  console.log('🗑️ Deleting project officer:', officerId);
  
  try {
    // Get current user email
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No user logged in');
    
    const user = JSON.parse(currentUser);
    const email = user.email;
    
    // Load current project data
    const projectData = await loadProjectData(email);
    
    // Remove from project officers array
    const updatedOfficers = (projectData.projectOfficers || []).filter(
      officer => officer.id !== officerId
    );
    
    await saveProjectData(email, {
      ...projectData,
      projectOfficers: updatedOfficers
    });
    
    console.log(`✅ Successfully deleted project officer: ${officerId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting project officer:', error);
    throw error;
  }
};
export const deleteMultipleProjectOfficers = async (officerIds: string[]) => {
  console.log('🗑️ Deleting multiple project officers:', officerIds);
  
  try {
    // Get current user email
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No user logged in');
    
    const user = JSON.parse(currentUser);
    const email = user.email;
    
    // Load current project data
    const projectData = await loadProjectData(email);
    
    // Remove from project officers array
    const updatedOfficers = (projectData.projectOfficers || []).filter(
      officer => !officerIds.includes(officer.id)
    );
    
    await saveProjectData(email, {
      ...projectData,
      projectOfficers: updatedOfficers
    });
    
    console.log(`✅ Successfully deleted ${officerIds.length} project officers`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error deleting project officers:', error);
    throw error;
  }
};
export const updateLabour = async (labourId: string, labour: any, type: string) => {
  console.log(`📝 Updating ${type}:`, labourId, labour);
  
  try {
    // Get current user email
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No user logged in');
    
    const user = JSON.parse(currentUser);
    const email = user.email;
    
    // Load current project data
    const projectData = await loadProjectData(email);
    
    if (type === 'campLabour') {
      // Update in camp labours array
      const updatedCampLabours = (projectData.campLabours || []).map(
        item => item.id === labourId ? { ...item, ...labour, id: labourId } : item
      );
      
      await saveProjectData(email, {
        ...projectData,
        campLabours: updatedCampLabours
      });
      
      console.log(`✅ Successfully updated camp labour: ${labourId}`);
    } else if (type === 'crewman') {
      // Update in crewmen array
      const updatedCrewmen = (projectData.crewmen || []).map(
        item => item.id === labourId ? { ...item, ...labour, id: labourId } : item
      );
      
      await saveProjectData(email, {
        ...projectData,
        crewmen: updatedCrewmen
      });
      
      console.log(`✅ Successfully updated crewman: ${labourId}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error updating ${type}:`, error);
    throw error;
  }
};
export const deleteLabour = async (labourId: string, type: string) => console.log('deleteLabour stub');
export const deleteMultipleLabours = async (labourIds: string[], type: string) => {
  console.log(`🗑️ Deleting multiple ${type}s:`, labourIds);
  
  try {
    // Get current user email
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No user logged in');
    
    const user = JSON.parse(currentUser);
    const email = user.email;
    
    // Load current project data
    const projectData = await loadProjectData(email);
    
    if (type === 'campLabour') {
      // Remove from camp labours array
      const updatedCampLabours = (projectData.campLabours || []).filter(
        labour => !labourIds.includes(labour.id)
      );
      
      await saveProjectData(email, {
        ...projectData,
        campLabours: updatedCampLabours
      });
      
      console.log(`✅ Successfully deleted ${labourIds.length} camp labours`);
    } else if (type === 'crewman') {
      // Remove from crewmen array
      const updatedCrewmen = (projectData.crewmen || []).filter(
        crewman => !labourIds.includes(crewman.id)
      );
      
      await saveProjectData(email, {
        ...projectData,
        crewmen: updatedCrewmen
      });
      
      console.log(`✅ Successfully deleted ${labourIds.length} crewmen`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting ${type}s:`, error);
    throw error;
  }
};
export const getProjectDataForUser = async (uid: string) => {
  return {
    vehicles: [],
    drivers: [],
    incidents: [],
    transfers: [],
    supervisors: [],
    crewmen: [],
    campLabours: [],
    notifications: [],
    projectOfficers: [],
    repairHistory: [],
  };
};
// Import backup data from JSON file (optimized with batch operations)
export const importBackupData = async () => {
  try {
    console.log('?? Starting optimized data import from backup-data.json...');
    
    // Fetch the backup data from public folder
    const response = await fetch('/backup-data.json');
    if (!response.ok) {
      throw new Error('Failed to fetch backup data');
    }
    
    const backupData = await response.json();
    console.log('?? Backup data loaded:', backupData);
    
    // Helper function to process data in batches with rate limiting
    const processBatch = async (collectionName: string, items: any[], batchSize = 50) => {
      console.log(`?? Processing ${items.length} ${collectionName} in batches of ${batchSize}...`);
      
      for (let i = 0; i < items.length; i += batchSize) {
        try {
          const batch = writeBatch(db);
          const batchItems = items.slice(i, i + batchSize);
          
          batchItems.forEach((item) => {
            if (item.id || item.email) {
              const docId = item.email || item.id;
              const docRef = doc(db, collectionName, docId);
              batch.set(docRef, item);
            }
          });
          
          await batch.commit();
          console.log(`? Imported batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)} for ${collectionName}`);
          
          // Add delay between batches to avoid quota exhaustion
          if (i + batchSize < items.length) {
            console.log('?? Waiting 1 second before next batch...');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          if (error.code === 'resource-exhausted') {
            console.log('?? Quota exceeded, waiting 5 seconds before retrying...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            i -= batchSize; // Retry this batch
          } else {
            throw error;
          }
        }
      }
    };
    
    // Import users with batch operations
    if (backupData.collections?.users) {
      console.log('?? Starting users import...');
      
      // Special check for zahran@sharq.project
      const sharqUser = backupData.collections.users.find(user => user.email === 'zahran@sharq.project');
      if (sharqUser) {
        console.log('?? Found Sharq project user in backup:', sharqUser);
        console.log('?? Project Name in backup:', sharqUser.projectName);
        console.log('?? Project Manager in backup:', sharqUser.projectManagerName);
      }
      
      await processBatch('users', backupData.collections.users, 100);
      console.log('? Completed users import');
    }
    
    // Import vehicles with batch operations
    if (backupData.collections?.vehicles) {
      console.log('?? Starting vehicles import...');
      await processBatch('vehicles', backupData.collections.vehicles);
      console.log('? Completed vehicles import');
    }
    
    // Import drivers with batch operations
    if (backupData.collections?.drivers) {
      console.log('?? Starting drivers import...');
      await processBatch('drivers', backupData.collections.drivers);
      console.log('? Completed drivers import');
    }
    
    // Import other collections with batch operations
    const otherCollections = ['incidents', 'supervisors', 'projectOfficers', 'transfers', 'notifications', 'repairHistory'];
    
    for (const collectionName of otherCollections) {
      if (backupData.collections?.[collectionName] && backupData.collections[collectionName].length > 0) {
        console.log(`?? Starting ${collectionName} import...`);
        await processBatch(collectionName, backupData.collections[collectionName]);
        console.log(`? Completed ${collectionName} import`);
      }
    }
    
    console.log('?? Optimized data import completed successfully!');
    return { success: true, message: 'Data imported successfully using batch operations' };
    
  } catch (error) {
    console.error('? Error importing data:', error);
    return { success: false, error: error.message };
  }
};
// Manual check specifically for Sharq project data
export const manualCheckSharqData = async () => {
  try {
    console.log('?? Manual check: Looking for Sharq data...');
    const vehiclesRef = collection(db, 'vehicles');
    const vehiclesSnapshot = await getDocs(vehiclesRef);
    
    let sharqVehicles = 0;
    let totalVehicles = vehiclesSnapshot.size;
    const sampleVehicles: any[] = [];
    
    vehiclesSnapshot.forEach(doc => {
      const vehicle = { id: doc.id, ...doc.data() } as any;
      
      // Check for Sharq project vehicles - multiple criteria
      const matchesUserId = vehicle.userId === 'SEh2OY5rjCRvyDO137tv3dzGx2q2';
      const matchesEmail = vehicle.email === 'zahran@sharq.project';
      const matchesProject = vehicle.projectName === '?????';
      
      if (matchesUserId || matchesEmail || matchesProject) {
        sharqVehicles++;
        if (sampleVehicles.length < 3) {
          sampleVehicles.push({
            plateNumber: vehicle.plateNumber,
            userId: vehicle.userId,
            email: vehicle.email,
            projectName: vehicle.projectName,
            matchReason: {
              userId: matchesUserId,
              email: matchesEmail,
              project: matchesProject
            }
          });
        }
      }
    });
    
    console.log('?? Manual check results:', {
      totalVehiclesInFirebase: totalVehicles,
      sharqVehicles: sharqVehicles,
      sampleSharqVehicles: sampleVehicles
    });
    
    return {
      totalVehiclesInFirebase: totalVehicles,
      sharqVehicles: sharqVehicles,
      sampleSharqVehicles: sampleVehicles
    };
  } catch (error) {
    console.error('? Error in manual check:', error);
    return { error: error.message };
  }
};
// Initialize empty subcollections for a user to prevent undefined arrays
export const initializeUserSubcollections = async (userEmail: string): Promise<{ success: boolean; message: string }> => {
  try {
    console.log(`?? Initializing empty subcollections for user: ${userEmail}`);
    
    const subcollections = [
      'vehicles',
      'drivers', 
      'incidents',
      'supervisors',
      'projectOfficers',
      'campLabours',
      'crewmen',
      'transfers',
      'notifications',
      'repairHistory'
    ];
    
    const batch = writeBatch(db);
    let initCount = 0;
    
    for (const subcollectionName of subcollections) {
      // Create path: /users/{userEmail}/{subcollectionName}/_init
      const userSubcollectionRef = collection(db, 'users', userEmail, subcollectionName);
      const initDocRef = doc(userSubcollectionRef, '_init');
      
      // Check if initialization doc already exists
      const existingDoc = await getDoc(initDocRef);
      if (!existingDoc.exists()) {
        batch.set(initDocRef, {
          initialized: true,
          createdAt: new Date(),
          purpose: 'Empty subcollection initialization to prevent undefined arrays'
        });
        initCount++;
        console.log(`?? Will initialize: ${subcollectionName}`);
      } else {
        console.log(`? Already exists: ${subcollectionName}`);
      }
    }
    
    if (initCount > 0) {
      await batch.commit();
      console.log(`? Successfully initialized ${initCount} subcollections for ${userEmail}`);
      return { success: true, message: `Initialized ${initCount} subcollections` };
    } else {
      console.log(`?? All subcollections already exist for ${userEmail}`);
      return { success: true, message: 'All subcollections already exist' };
    }
    
  } catch (error) {
    console.error('? Error initializing subcollections:', error);
    return { success: false, message: error.message };
  }
};
// Clean test/sample projects
export const cleanTestProjects = async (): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('??? Starting test project cleanup...');
    
    const testEmails = ['project1@zahran.com', 'project2@zahran.com', 'marwan1@projects.reports'];
    let deletedCount = 0;
    
    // Delete test users
    const usersSnapshot = await getDocs(collection(db, COLLECTIONS.USERS));
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      if (testEmails.includes(userData.email)) {
        await deleteDoc(doc(db, COLLECTIONS.USERS, userDoc.id));
        console.log(`??? Deleted test user: ${userData.email}`);
        deletedCount++;
      }
    }
    
    // Delete test projects
    const projectsSnapshot = await getDocs(collection(db, COLLECTIONS.PROJECTS));
    for (const projectDoc of projectsSnapshot.docs) {
      if (testEmails.includes(projectDoc.id)) {
        await deleteDoc(doc(db, COLLECTIONS.PROJECTS, projectDoc.id));
        console.log(`??? Deleted test project: ${projectDoc.id}`);
        deletedCount++;
      }
    }
    
    const message = deletedCount > 0 
      ? `Successfully removed ${deletedCount} test entries` 
      : 'No test projects found to remove';
      
    console.log(`? Test cleanup completed: ${message}`);
    return { success: true, message };
    
  } catch (error) {
    console.error('? Error during test cleanup:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
};
// Function to completely clear all database data for fresh start
export const clearAllDatabaseData = async (): Promise<{ success: boolean; message: string; deletedCount: number }> => {
  try {
    console.log('?? Starting complete database cleanup...');
    
    const collectionsToClean = [
      'vehicles',
      'drivers', 
      'incidents',
      'transfers',
      'repairs',
      'labours',
      'supervisors',
      'projectOfficers',
      'crewmen',
      'campLabours',
      'notifications',
      'repairHistory',
      'projects', // Keep projects but clean their data
      // Note: Not deleting 'users' collection to preserve user accounts
    ];
    
    let totalDeletedCount = 0;
    
    for (const collectionName of collectionsToClean) {
      console.log(`??? Cleaning collection: ${collectionName}`);
      
      const snapshot = await getDocs(collection(db, collectionName));
      
      // Process in smaller batches to avoid quota issues
      const batchSize = 10; // Reduced from 500 to prevent quota exhaustion
      const docs = snapshot.docs;
      
      for (let i = 0; i < docs.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchDocs = docs.slice(i, i + batchSize);
        
        batchDocs.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        
        await batch.commit();
        totalDeletedCount += batchDocs.length;
        
        console.log(`? Deleted ${batchDocs.length} documents from ${collectionName} (total: ${totalDeletedCount})`);
        
        // Add delay between batches to prevent quota exhaustion
        if (i + batchSize < docs.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
        }
      }
      
      console.log(`? Completed cleaning ${collectionName}: ${docs.length} documents deleted`);
      
      // Delay between collections
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`?? Database cleanup completed! Total deleted: ${totalDeletedCount}`);
    return { 
      success: true, 
      message: `Successfully deleted ${totalDeletedCount} documents`, 
      deletedCount: totalDeletedCount 
    };
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    return { 
      success: false, 
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
      deletedCount: 0 
    };
  }
};

// Supervisor Management Functions
export const addSupervisor = async (supervisorData: Omit<Supervisor, 'id'>): Promise<void> => {
  try {
    console.log('👷 Adding new supervisor...');
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    // Generate unique ID
    const supervisorId = Date.now().toString();
    const supervisor: Supervisor = {
      ...supervisorData,
      id: supervisorId,
      foremen: supervisorData.foremen || []
    };
    
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      const updatedSupervisors = [...(currentData.supervisors || []), supervisor];
      
      await setDoc(projectRef, { 
        ...currentData, 
        supervisors: updatedSupervisors 
      });
    } else {
      // Create new project with this supervisor
      const initialProjectData: ProjectData = {
        vehicles: [],
        drivers: [],
        incidents: [],
        transfers: [],
        supervisors: [supervisor],
        crewmen: [],
        campLabours: [],
        notifications: [],
        projectOfficers: [],
        repairHistory: [],
      };
      
      await setDoc(projectRef, initialProjectData);
    }
    
    console.log('✅ Supervisor added successfully');
  } catch (error) {
    console.error('❌ Error adding supervisor:', error);
    throw error;
  }
};

export const deleteMultipleSupervisors = async (supervisorIds: string[]): Promise<void> => {
  try {
    console.log(`🗑️ Deleting ${supervisorIds.length} supervisors...`);
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      
      // Remove supervisors by ID
      const updatedSupervisors = (currentData.supervisors || []).filter(supervisor => 
        !supervisorIds.includes(supervisor.id)
      );
      
      await setDoc(projectRef, { 
        ...currentData, 
        supervisors: updatedSupervisors 
      });
      
      console.log(`✅ Successfully deleted ${supervisorIds.length} supervisors`);
    }
  } catch (error) {
    console.error('❌ Error deleting supervisors:', error);
    throw error;
  }
};

// Bulk Delete Functions for Foremen and Labour
export const deleteMultipleForemen = async (foremanIds: string[]): Promise<void> => {
  try {
    console.log(`🗑️ Deleting ${foremanIds.length} foremen...`);
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      
      // Remove foremen from supervisors
      const updatedSupervisors = (currentData.supervisors || []).map(supervisor => ({
        ...supervisor,
        foremen: (supervisor.foremen || []).filter(foreman => !foremanIds.includes(foreman.id))
      }));
      
      await setDoc(projectRef, { 
        ...currentData, 
        supervisors: updatedSupervisors 
      });
      
      console.log(`✅ Successfully deleted ${foremanIds.length} foremen`);
    }
  } catch (error) {
    console.error('❌ Error deleting foremen:', error);
    throw error;
  }
};

export const deleteMultipleLabourFromForemen = async (labourIds: string[]): Promise<void> => {
  try {
    console.log(`🗑️ Deleting ${labourIds.length} labour...`);
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (projectDoc.exists()) {
      const currentData = projectDoc.data() as ProjectData;
      
      // Remove labour from foremen
      const updatedSupervisors = (currentData.supervisors || []).map(supervisor => ({
        ...supervisor,
        foremen: (supervisor.foremen || []).map(foreman => ({
          ...foreman,
          labours: (foreman.labours || []).filter(labour => !labourIds.includes(labour.id))
        }))
      }));
      
      await setDoc(projectRef, { 
        ...currentData, 
        supervisors: updatedSupervisors 
      });
      
      console.log(`✅ Successfully deleted ${labourIds.length} labour`);
    }
  } catch (error) {
    console.error('❌ Error deleting labour:', error);
    throw error;
  }
};

// Manpower Assignment Functions
export const uploadPendingForemen = async (foremen: any[]): Promise<void> => {
  try {
    console.log('📤 Uploading pending foremen:', foremen.length);
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    // Store pending foremen in a separate collection for temporary storage
    const pendingRef = doc(db, 'pendingAssignments', `${projectId}_foremen`);
    await setDoc(pendingRef, {
      projectId,
      foremen,
      timestamp: new Date().toISOString(),
      type: 'foremen'
    });
    
    console.log('✅ Pending foremen uploaded successfully');
  } catch (error) {
    console.error('❌ Error uploading pending foremen:', error);
    throw error;
  }
};

export const uploadPendingLabours = async (labours: any[]): Promise<void> => {
  try {
    console.log('📤 Uploading pending labours:', labours.length);
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    // Store pending labours in a separate collection for temporary storage
    const pendingRef = doc(db, 'pendingAssignments', `${projectId}_labours`);
    await setDoc(pendingRef, {
      projectId,
      labours,
      timestamp: new Date().toISOString(),
      type: 'labours'
    });
    
    console.log('✅ Pending labours uploaded successfully');
  } catch (error) {
    console.error('❌ Error uploading pending labours:', error);
    throw error;
  }
};

export const getPendingForemen = async (): Promise<any[]> => {
  try {
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const pendingRef = doc(db, 'pendingAssignments', `${projectId}_foremen`);
    const pendingDoc = await getDoc(pendingRef);
    
    if (pendingDoc.exists()) {
      const data = pendingDoc.data();
      return data.foremen || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error getting pending foremen:', error);
    return [];
  }
};

export const getPendingLabours = async (): Promise<any[]> => {
  try {
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const pendingRef = doc(db, 'pendingAssignments', `${projectId}_labours`);
    const pendingDoc = await getDoc(pendingRef);
    
    if (pendingDoc.exists()) {
      const data = pendingDoc.data();
      return data.labours || [];
    }
    
    return [];
  } catch (error) {
    console.error('❌ Error getting pending labours:', error);
    return [];
  }
};

export const commitManpowerAssignments = async (assignments: {
  foremanAssignments: Array<{foremanId: string, supervisorId: string}>;
  labourAssignments: Array<{labourId: string, foremanId: string}>;
}): Promise<void> => {
  try {
    console.log('🔄 Committing manpower assignments...');
    
    const currentUser = localStorage.getItem('zahran_current_user');
    if (!currentUser) throw new Error('No authenticated user');
    
    const user = JSON.parse(currentUser);
    const projectId = user.email;
    
    const projectRef = doc(db, COLLECTIONS.PROJECTS, projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    const currentData = projectDoc.data() as ProjectData;
    let updatedSupervisors = [...(currentData.supervisors || [])];
    
    // Get pending data
    const pendingForemen = await getPendingForemen();
    const pendingLabours = await getPendingLabours();
    
    // Apply foreman assignments
    assignments.foremanAssignments.forEach(({ foremanId, supervisorId }) => {
      const foremanData = pendingForemen.find(f => f.id === foremanId);
      if (foremanData) {
        const supervisorIndex = updatedSupervisors.findIndex(s => s.id === supervisorId);
        if (supervisorIndex >= 0) {
          if (!updatedSupervisors[supervisorIndex].foremen) {
            updatedSupervisors[supervisorIndex].foremen = [];
          }
          updatedSupervisors[supervisorIndex].foremen.push({
            ...foremanData,
            labours: []
          });
        }
      }
    });
    
    // Apply labour assignments
    assignments.labourAssignments.forEach(({ labourId, foremanId }) => {
      const labourData = pendingLabours.find(l => l.id === labourId);
      if (labourData) {
        // Find the foreman in the updated supervisors
        for (let supervisor of updatedSupervisors) {
          const foremanIndex = supervisor.foremen?.findIndex(f => f.id === foremanId);
          if (foremanIndex !== undefined && foremanIndex >= 0) {
            if (!supervisor.foremen[foremanIndex].labours) {
              supervisor.foremen[foremanIndex].labours = [];
            }
            supervisor.foremen[foremanIndex].labours.push(labourData);
            break;
          }
        }
      }
    });
    
    // Update the project with new assignments
    await setDoc(projectRef, {
      ...currentData,
      supervisors: updatedSupervisors
    });
    
    // Clean up pending assignments
    const batch = writeBatch(db);
    const pendingForemenRef = doc(db, 'pendingAssignments', `${projectId}_foremen`);
    const pendingLaboursRef = doc(db, 'pendingAssignments', `${projectId}_labours`);
    
    batch.delete(pendingForemenRef);
    batch.delete(pendingLaboursRef);
    
    await batch.commit();
    
    console.log('✅ Manpower assignments committed successfully');
  } catch (error) {
    console.error('❌ Error committing manpower assignments:', error);
    throw error;
  }
};
