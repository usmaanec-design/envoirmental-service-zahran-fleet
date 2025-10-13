


import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';
import * as fb from './firebase/service';
import type { Language, Theme, Page, ProjectData, Vehicle, Driver, User, Incident, Transfer, Supervisor, Foreman, ProjectOfficer, AdminNotification, VehicleStatus } from './types';

// Environment check for browser compatibility
const isValidBrowserEnvironment = () => {
  try {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  } catch {
    return false;
  }
};

import Sidebar from './components/Sidebar';
import AddDriverForm from './components/AddDriverForm';
import ViewDriversPage from './components/ViewDriversPage';
import AddVehicleForm from './components/AddVehicleForm';
import ViewVehiclesPage from './components/ViewVehiclesPage';
import Dashboard from './components/Dashboard';
import VehicleDetailsPage from './components/VehicleDetailsPage';
import SettingsPage from './components/SettingsPage';
import ReportIncidentForm from './components/ReportIncidentForm';
import ReportsPage from './components/ReportsPage';
import AuthPage from './components/auth/AuthPage';
import WelcomePage from './components/auth/WelcomePage';
import AdminDashboard from './components/AdminDashboard';
import Header from './components/ui/Header';
import TopBar from './components/ui/TopBar';
import TransferVehiclePage from './components/TransferVehiclePage';
import AddSupervisorPage from './components/AddSupervisorPage';
import SupervisorOverviewPage from './components/SupervisorOverviewPage';
import AddProjectOfficersPage from './components/AddProjectOfficersPage';
import ViewProjectOfficersPage from './components/ViewProjectOfficersPage';
import AdminAllProjectsPage from './components/AdminAllProjectsPage';
import AdminAllVehiclesPage from './components/AdminAllVehiclesPage';
import AdminAllIncidentsPage from './components/AdminAllIncidentsPage';
import AdminTransferLogPage from './components/AdminTransferLogPage';
import { TRANSLATIONS } from './constants';
import { readExcelFile } from './utils/export';

// Helper function to extract project name from email
const getProjectNameFromEmail = (email: string): string => {
  if (email.includes('@sharq.project')) {
    return 'مشروع الشرق'; // Sharq Project in Arabic
  } else if (email.includes('@gharb.project')) {
    return 'مشروع الغرب'; // Gharb Project in Arabic
  } else if (email.includes('@shamal.project')) {
    return 'مشروع الشمال'; // Shamal Project in Arabic
  } else if (email.includes('@janub.project')) {
    return 'مشروع الجنوب'; // Janub Project in Arabic
  } else if (email.includes('@wasat.project')) {
    return 'مشروع الوسط'; // Wasat Project in Arabic
  } else {
    // Default: use email prefix capitalized
    return email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1) + ' Project';
  }
};

const initialProjectData: ProjectData = {
    vehicles: [],
    drivers: [],
    incidents: [],
    transfers: [],
    supervisors: [],
    notifications: [],
    projectOfficers: [],
    campLabour: 0,
    crewman: 0,
};

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // --- Auth & Loading State ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // --- Data State ---
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]); // For non-admin vehicle lookups
  
  // --- Admin State ---
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProjectData, setAllProjectData] = useState<Record<string, ProjectData>>({});
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [allAdminNotifications, setAllAdminNotifications] = useState<AdminNotification[]>([]);
  const [viewingProjectAsAdmin, setViewingProjectAsAdmin] = useState<User | null>(null);
  
  // --- Single-Item State ---
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [editingSupervisorData, setEditingSupervisorData] = useState<Supervisor | null>(null);

  // --- Refs for preventing multiple calls ---
  const dataFetchedRef = useRef(false);
  const initializingRef = useRef(false);

  const t = TRANSLATIONS[lang];

  const fetchDataForCurrentUser = useCallback(async (uid: string) => {
    if (initializingRef.current) {
      console.log('⏳ Already initializing data, skipping...');
      return;
    }
    
    try {
      console.log('🔄 Fetching data for user:', uid);
      initializingRef.current = true;
      setIsLoading(true);
      
      const data = await fb.getProjectDataForUser(uid);
      console.log('📊 User data loaded:', data);
      
      // Also fetch all users for transfer functionality
      try {
        const users = await fb.getAllUsers();
        setAllUsers(users);
        console.log('👥 All users loaded for transfers:', users?.length || 0);
      } catch (error) {
        console.warn('⚠️ Failed to load users for transfers:', error);
      }
      
      // Handle empty data for new users gracefully
      const safeData = {
        vehicles: Array.isArray(data?.vehicles) ? data.vehicles : [],
        drivers: Array.isArray(data?.drivers) ? data.drivers : [],
        incidents: Array.isArray(data?.incidents) ? data.incidents : [],
        supervisors: Array.isArray(data?.supervisors) ? data.supervisors : [],
        projectOfficers: Array.isArray(data?.projectOfficers) ? data.projectOfficers : [],
        transfers: Array.isArray(data?.transfers) ? data.transfers : [],
        campLabour: typeof data?.campLabour === 'number' ? data.campLabour : 0,
        crewman: typeof data?.crewman === 'number' ? data.crewman : 0
      };
      
      setProjectData(safeData);
      dataFetchedRef.current = true;
      
      // Check if user has any data
      const hasData = safeData.vehicles.length > 0 || 
                     safeData.drivers.length > 0 || 
                     safeData.incidents.length > 0 ||
                     safeData.supervisors.length > 0 ||
                     safeData.projectOfficers.length > 0;
      
      if (hasData) {
        console.log('✅ User has data, syncing vehicle statuses...');
        try {
          await fb.syncVehicleStatusesWithIncidents(uid);
          console.log('✅ Vehicle statuses synced successfully');
        } catch (error) {
          console.warn('⚠️ Failed to sync vehicle statuses:', error);
        }
      } else {
        console.log('ℹ️ New user detected - no data found, returning empty structure');
      }
      
      setIsLoading(false);
      initializingRef.current = false;
      return safeData;
    } catch (error) {
      console.error('❌ Error fetching user data:', error);
      // Set empty data structure on error
      const emptyData = {
        vehicles: [],
        drivers: [],
        incidents: [],
        supervisors: [],
        projectOfficers: [],
        transfers: [],
        campLabour: 0,
        crewman: 0
      };
      
      setProjectData(emptyData);
      dataFetchedRef.current = true;
      setIsLoading(false);
      initializingRef.current = false;
      return emptyData;
    }
  }, []);

  const fetchDataForAdmin = useCallback(async () => {
    try {
        console.log('🔧 Fetching admin data...');
        
        // Check if we're in offline mode (no internet or Firebase errors)
        let isOfflineMode = false;
        
        try {
            const users = await fb.getAllUsers();
            setAllUsers(users);
            
            const { vehicles, drivers, incidents, transfers, supervisors, projectMetadata, notifications, projectOfficers } = await fb.getAllProjectData();
            setAllTransfers(transfers);
            setAllAdminNotifications(notifications);
            
            console.log('🔧 Admin data fetched from Firebase:', {
                usersCount: users?.length || 0,
                vehiclesCount: vehicles?.length || 0,
                projectMetadata: projectMetadata ? 'Available' : 'Missing'
            });
            
            const structuredData: Record<string, ProjectData> = {};

            users.forEach(u => {
                if (u && u.uid) {
                    const userTransfers = transfers.filter(t => t.fromUserId === u.uid || t.toUserId === u.uid);
                    const userTransferIds = new Set(userTransfers.map(t => t.id));
                    
                    // Safe access to projectMetadata
                    const userMetadata = projectMetadata?.[u.uid];
                    
                    structuredData[u.email] = {
                        vehicles: vehicles.filter(v => v.userId === u.uid),
                        drivers: drivers.filter(d => d.userId === u.uid),
                        incidents: incidents.filter(i => i.userId === u.uid),
                        transfers: userTransfers,
                        supervisors: supervisors.filter(s => s.userId === u.uid),
                        notifications: notifications.filter(n => userTransferIds.has(n.transferId)),
                        projectOfficers: (projectOfficers || []).filter(o => o.userId === u.uid),
                        campLabour: userMetadata?.campLabour || 0,
                        crewman: userMetadata?.crewman || 0,
                    };
                }
            });
            setAllProjectData(structuredData);
            
        } catch (firebaseError) {
            console.warn('🔄 Firebase error, using offline mock data:', firebaseError);
            isOfflineMode = true;
        }
        
        // If offline mode or Firebase failed, use mock data
        if (isOfflineMode || currentUser?.email === 'zahran@projects.reports') {
            console.log('📋 Loading mock data for offline admin mode...');
            
            // Import and use mock data from constants
            const { MOCK_USERS, MOCK_PROJECT_DATA } = await import('./constants');
            
            // Deduplicate users to avoid React key warnings
            const uniqueUsers = MOCK_USERS.filter((user, index, self) => 
                index === self.findIndex(u => u.email === user.email)
            );
            
            setAllUsers(uniqueUsers);
            
            // Create structured mock data
            const mockStructuredData: Record<string, ProjectData> = {};
            uniqueUsers.forEach(user => {
                if (user.email && MOCK_PROJECT_DATA[user.uid]) {
                    const mockData = MOCK_PROJECT_DATA[user.uid];
                    mockStructuredData[user.email] = {
                        ...mockData,
                        supervisors: [],
                        notifications: [],
                        projectOfficers: [],
                        campLabour: 0,
                        crewman: 0
                    };
                }
            });
            
            setAllProjectData(mockStructuredData);
            setAllTransfers([]); // Mock transfers if needed
            setAllAdminNotifications([]); // Mock notifications if needed
            
            console.log('✅ Mock data loaded for offline admin mode');
        }
        
    } catch (error) {
        console.error('❌ Error in fetchDataForAdmin:', error);
        
        // Final fallback - empty data structure
        setAllUsers([]);
        setAllProjectData({});
        setAllTransfers([]);
        setAllAdminNotifications([]);
    }
  }, []); // Remove currentUser dependency to prevent infinite loop

  // --- Effects ---
  // Initialize app on mount
  useEffect(() => {
    let authUnsubscribe: (() => void) | undefined;
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    const initApp = async () => {
      if (!isMounted) return;
      
      // Check browser environment
      if (!isValidBrowserEnvironment()) {
        console.error('❌ Invalid browser environment');
        if (isMounted) {
          setIsLoading(false);
          setCurrentUser(null);
          setCurrentPage('auth');
        }
        return;
      }
      
      setIsLoading(true);
      
      // Set a timeout to handle new users with empty data
      loadingTimeout = setTimeout(() => {
        if (isMounted) {
          console.warn('⚠️ Loading timeout reached, completing with empty data for new user');
          setIsLoading(false);
          // Set empty data structure for new users
          setProjectData({
            vehicles: [],
            drivers: [],
            incidents: [],
            supervisors: [],
            projectOfficers: [],
            transfers: [],
            campLabour: 0,
            crewman: 0
          });
        }
      }, 5000); // Reduced from 10s to 5s for better UX
      
      try {
        await fb.initializeDB();

        // Check for offline admin session first
        const offlineAdminUser = localStorage.getItem('offlineAdminUser');
        if (offlineAdminUser) {
          try {
            const adminUser = JSON.parse(offlineAdminUser) as User;
            console.log('🔄 Restoring offline admin session:', adminUser.email);
            
            if (!isMounted) return;
            setCurrentUser(adminUser);
            setCurrentPage('adminDashboard');
            
            // Clear timeout since we're done
            clearTimeout(loadingTimeout);
            
            // Fetch admin data
            if (isMounted) {
              try {
                await fetchDataForAdmin();
              } catch (error) {
                console.error('Error fetching admin data on restore:', error);
              }
            }
            
            if (isMounted) {
              setIsLoading(false);
            }
            return; // Skip Firebase auth if using offline admin
          } catch (error) {
            console.error('Error restoring admin session:', error);
            localStorage.removeItem('offlineAdminUser');
          }
        }

        // Set up Firebase auth listener
        authUnsubscribe = onAuthStateChanged(auth, async (user) => {
          if (!isMounted) return;

          try {
            // Force logout if no session storage flag is set
            const hasValidSession = sessionStorage.getItem('validUserSession');
            
            if (user && !hasValidSession) {
              console.log('🔐 No valid session found, logging out...');
              await fb.logoutUser();
              setCurrentUser(null);
              setProjectData({
                vehicles: [],
                drivers: [],
                incidents: [],
                supervisors: [],
                projectOfficers: [],
                transfers: [],
                campLabour: 0,
                crewman: 0
              });
              setIsLoading(false);
              return;
            }

            if (user && hasValidSession) {
              console.log('👤 Valid user session found:', user.email);
              const userDoc = await fb.getUserData(user.uid);
              
              if (!isMounted) return;

              if (userDoc) {
                setCurrentUser(userDoc);
                
                // Load data based on user type
                if (userDoc.isAdmin) {
                  await fetchDataForAdmin();
                  setCurrentPage('adminDashboard');
                } else {
                  await fetchDataForCurrentUser(user.uid);
                  setCurrentPage('dashboard');
                }
                
                // Clear loading timeout since data is loaded
                if (loadingTimeout) {
                  clearTimeout(loadingTimeout);
                }
                
                // Show welcome screen only for new logins
                const isNewLogin = sessionStorage.getItem('isNewLogin');
                if (isNewLogin === 'true') {
                  setShowWelcome(true);
                  sessionStorage.removeItem('isNewLogin');
                  
                  // Hide welcome screen after delay
                  setTimeout(() => {
                    if (isMounted) {
                      setShowWelcome(false);
                    }
                  }, 3000);
                }
                
                setIsLoading(false);
              } else {
                // User exists in Firebase auth but no user document
                console.warn('User authenticated but no user document found');
                setCurrentUser(null);
                setCurrentPage('auth');
                setIsLoading(false);
              }
            } else {
              // User logged out
              setCurrentUser(null);
              setCurrentPage('auth');
              setIsLoading(false);
              // Clear session storage on logout
              sessionStorage.removeItem('authInitialized');
            }
          } catch (error) {
            console.error('Error in auth state change:', error);
            setCurrentUser(null);
            setCurrentPage('auth');
            setIsLoading(false);
            sessionStorage.removeItem('authInitialized');
          }
        });

        // Load preferences
        const preferredLang = localStorage.getItem('preferredLanguage') as Language;
        if (preferredLang && isMounted) setLang(preferredLang);
        
        const savedTheme = localStorage.getItem('theme') as Theme;
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (isMounted) {
          if (savedTheme) {
            setTheme(savedTheme);
          } else if (prefersDark) {
            setTheme('dark');
          }
        }

      } catch (error) {
        console.error('Error initializing app:', error);
        if (isMounted) {
          setIsLoading(false);
          setCurrentUser(null);
          setCurrentPage('auth');
        }
      }
    };

    // Start initialization
    initApp();

    // Cleanup
    return () => {
      isMounted = false;
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
      if (authUnsubscribe) {
        authUnsubscribe();
      }
    };
  }, [setCurrentUser, setCurrentPage, setIsLoading, setLang, setTheme, fetchDataForAdmin]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  // Additional effect to ensure data consistency after page refresh
  useEffect(() => {
    if (currentUser && !isLoading && !dataFetchedRef.current && !initializingRef.current) {
      // Check if we have data loaded, if not, reload it
      const hasData = currentUser.isAdmin 
        ? Object.keys(allProjectData).length > 0 
        : projectData !== null && typeof projectData === 'object';
      
      if (!hasData) {
        console.log('🔄 Data missing after page refresh, reloading...');
        if (currentUser.isAdmin) {
          fetchDataForAdmin();
        } else {
          fetchDataForCurrentUser(currentUser.uid);
        }
      } else {
        dataFetchedRef.current = true;
      }
    }
  }, [currentUser, isLoading, allProjectData, projectData, fetchDataForAdmin, fetchDataForCurrentUser]);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };
  
  const getActiveUserId = (): string | null => {
      return viewingProjectAsAdmin?.uid || currentUser?.uid || null;
  }

  // --- Auth Handlers ---
  const handleSignUp = async (newUser: User) => {
    await fb.signUpUser(newUser);
  };

  const handleLogin = async (email: string, pass: string): Promise<void> => {
    try {
      setIsLoading(true);
      console.log('🔑 Attempting login for:', email);
      
      // Check for ONLY ONE specific admin credential
      if (email === 'zahran@projects.reports' && pass === 'zahran111') {
        console.log('✅ Admin login successful');
        
        // Use a try-finally block to ensure loading state is cleared
        
        const adminUser = {
          uid: 'admin',
          email: email,
          displayName: 'Admin',
          projectName: 'Environmental Services Zahran Fleet',
          role: 'admin',
          isAdmin: true,
          disabled: false,
          permissions: {
            canAddDrivers: true,
            canAddVehicles: true,
            canReportIncidents: true,
            canTransferVehicles: true,
            canViewReports: true,
            canManageSupervisors: true,
            canManageProjectOfficers: true
          }
        };
        
        try {
          setCurrentUser(adminUser);
          localStorage.setItem('offlineAdminUser', JSON.stringify(adminUser));
          
          // Fetch admin data immediately without setTimeout
          await fetchDataForAdmin();
          setCurrentPage('adminDashboard');
          
          setShowWelcome(true);
          setTimeout(() => setShowWelcome(false), 3000);
        } finally {
          setIsLoading(false);
        }
        return;
      }
      
      // All other email/password combinations go to Firebase user authentication
      console.log('Attempting user login via Firebase...');
      try {
        await fb.loginUser(email, pass);
        
        // Set session flags for valid login
        sessionStorage.setItem('validUserSession', 'true');
        sessionStorage.setItem('isNewLogin', 'true');
        
        // Get current Firebase user
        const firebaseUser = auth.currentUser;
        if (firebaseUser) {
          // Fetch user data and project data synchronously
          const userData = await fb.getUserData(firebaseUser.uid);
          if (userData) {
            setCurrentUser(userData);
            await fetchDataForCurrentUser(firebaseUser.uid);
            setCurrentPage('dashboard');
          }
        }
        
        setShowWelcome(true);
        setTimeout(() => setShowWelcome(false), 3000);
      } finally {
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error.message);
      throw new Error('Invalid credentials. Please check your email and password.');
    }
  };

  const handleLogout = async () => {
    // Clear offline admin session
    localStorage.removeItem('offlineAdminUser');
    
    // Clear session storage including new session flags
    sessionStorage.removeItem('authInitialized');
    sessionStorage.removeItem('validUserSession');
    sessionStorage.removeItem('isNewLogin');
    
    // Reset all data states
    setProjectData(initialProjectData);
    setAllVehicles([]);
    setAllUsers([]);
    setAllProjectData({});
    setAllTransfers([]);
    setAllAdminNotifications([]);
    
    await fb.logoutUser();
    setViewingProjectAsAdmin(null);
    setCurrentUser(null);
    setCurrentPage('auth'); // Go to auth page instead of dashboard
  };
  
  const handleAdminViewProject = (user: User) => {
      setViewingProjectAsAdmin(user);
      setCurrentPage('dashboard');
  };
  
  const handleReturnToAdminDashboard = () => {
      setViewingProjectAsAdmin(null);
      setCurrentPage('adminDashboard');
  };

  // --- Data Handlers ---
  const handleAddVehicle = async (newVehicleData: Omit<Vehicle, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addVehicle(newVehicleData, activeId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleUpdateVehicle = async (updatedVehicle: Vehicle) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.updateVehicle(updatedVehicle);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.deleteVehicle(vehicleId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleDeleteSelectedVehicles = async (vehicleIds: string[]) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.deleteVehicles(vehicleIds);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleAddDriver = async (newDriverData: Omit<Driver, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addDriver(newDriverData, activeId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };
  
  const handleUpdateDriver = async (updatedDriver: Driver) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.updateDriver(updatedDriver);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleDeleteDriver = async (driverId: string) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.deleteDriver(driverId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleDeleteSelectedDrivers = async (driverIds: string[]) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.deleteDrivers(driverIds);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleAddIncident = async (incidentData: Omit<Incident, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addIncident(incidentData, activeId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };

  const handleEditIncident = (incident: Incident) => {
    // For now, we can navigate to the report incident page with pre-filled data
    // In the future, we can create a dedicated edit modal
    console.log('Edit incident:', incident);
    // TODO: Implement incident editing functionality
  };

  const handleDeleteIncident = async (incidentId: string) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    try {
      await fb.deleteIncident(incidentId);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
    } catch (error) {
      console.error('Error deleting incident:', error);
    }
  };

  const handleUpdateVehicleStatus = async (vehicleId: string, status: VehicleStatus) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    try {
      await fb.updateVehicleStatus(vehicleId, status);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  const handleTransferVehicle = async (vehicleId: string, toUserId: string, transferDate: string) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.transferVehicle(vehicleId, activeId, toUserId, transferDate);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
    // Also fetch for admin to update global transfer log
    if (!currentUser?.isAdmin) await fetchDataForAdmin();
  };
  
  const handleAddNotification = async (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>) => {
    await fb.addAdminNotification(notificationData);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
  };

  const handleDismissNotification = async (notificationId: string) => {
    await fb.deleteAdminNotification(notificationId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
  };
  
  const handleClearAllNotifications = async () => {
    await fb.deleteAllAdminNotifications();
    if (currentUser?.isAdmin) await fetchDataForAdmin();
  };

  const handleDeleteTransfer = async (transferId: string) => {
      const activeId = getActiveUserId();
      if (!activeId) return;
      await fb.deleteTransfer(transferId);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
  }

  const handleUpdateManPower = async (supervisorData: Omit<Supervisor, 'id' | 'userId'> & { foremen: Omit<Foreman, 'id'>[] }, campLabour: number, crewman: number) => {
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
      await fb.updateManPower(supervisorData, campLabour, crewman, activeId);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
  }

  const handleAddSupervisor = async (supervisorData: Omit<Supervisor, 'id' | 'userId'> & { foremen: Omit<Foreman, 'id'>[] }) => {
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
      await fb.addSupervisor(supervisorData, activeId);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
  }

  const handleUpdateProjectLabour = async (campLabour: number, crewman: number) => {
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
      await fb.updateProjectLabour(campLabour, crewman, activeId);
      if (currentUser?.isAdmin) await fetchDataForAdmin();
      await fetchDataForCurrentUser(activeId);
  }
  
  const handleUpdateSupervisor = async (updatedSupervisor: Supervisor) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.updateSupervisor(updatedSupervisor);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  };
  
  const handleDeleteSupervisor = async (supervisorId: string) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    
    try {
      console.log('🗑️ App: Deleting supervisor:', supervisorId);
      
      // Delete from database first
      await fb.deleteSupervisor(supervisorId);
      console.log('✅ App: Supervisor deleted from database');
      
      // Then refresh data to update UI state
      if (currentUser?.isAdmin) {
        await fetchDataForAdmin();
      }
      await fetchDataForCurrentUser(activeId);
      console.log('✅ App: Data refreshed after supervisor deletion');
      
    } catch (error) {
      console.error('❌ App: Error deleting supervisor:', error);
      
      // If deletion failed, still refresh data to sync with actual database state
      if (currentUser?.isAdmin) {
        await fetchDataForAdmin();
      }
      await fetchDataForCurrentUser(activeId);
    }
  };

  const handleEditSupervisor = (supervisor: Supervisor) => {
    // Set the supervisor data for editing
    setEditingSupervisorData(supervisor);
    // Navigate to Add Supervisor page
    setCurrentPage('addSupervisor');
  };

  const handleUpdateProjectOfficers = async (officers: Omit<ProjectOfficer, 'id'|'userId'>[]) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.updateProjectOfficers(officers, activeId);
    if (currentUser?.isAdmin) await fetchDataForAdmin();
    await fetchDataForCurrentUser(activeId);
  }

  // Admin password management functions
  const handleUpdateUserPassword = async (userEmail: string, newPassword: string): Promise<void> => {
    if (!currentUser?.isAdmin) {
      throw new Error('Only admin users can update passwords');
    }
    
    await fb.resetUserPassword(userEmail, newPassword);
    console.log('Password updated successfully');
    
    // Refresh admin data to get updated user information
    await fetchDataForAdmin();
  };

  const handleUpdateAllPasswords = async (newPassword: string): Promise<void> => {
    if (!currentUser?.isAdmin) {
      throw new Error('Only admin users can update all passwords');
    }
    
    // Bulk password update not available in current Firebase service
    console.log('Bulk password update feature not implemented');
    
    // Refresh admin data to get updated user information
    await fetchDataForAdmin();
  };
  
  const handleImport = async (type: 'vehicles' | 'drivers', data: any[]) => {
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) {
          return { success: false, error: 'User not authenticated' };
      }

      // Get the correct project data based on context
      const currentProjectData = (currentUser?.isAdmin && viewingProjectAsAdmin && allProjectData[viewingProjectAsAdmin.email])
          ? allProjectData[viewingProjectAsAdmin.email]
          : projectData;

      const BATCH_SIZE = 100; // Process 100 records at a time
      let importedCount = 0;
      let failedCount = 0;
      let duplicateCount = 0;
      
      try {
          if (type === 'vehicles') {
              console.log('🚗 Vehicle import data received:', data);
              
              // Get existing vehicles to check for duplicates
              const existingVehicles = currentProjectData.vehicles || [];
              const existingDoorNumbers = new Set(existingVehicles.map(v => v.doorNumber?.toLowerCase()));
              const existingPlateNumbers = new Set(existingVehicles.map(v => v.plateNumber?.toLowerCase()));
              const existingChassisNumbers = new Set(existingVehicles.map(v => v.chassisNumber?.toLowerCase()));
              
              // Process in batches
             let importedCount = 0;

// Process in batches of 100
for (let i = 0; i < data.length; i += 100) {
    const batch = data.slice(i, i + 100);

    const batchPromises = batch.map(async row => {
        console.log('🔍 Processing vehicle row:', row);

        const doorNumber = String(row['Door Number'] || row['Door #'] || '').trim();
        const plateNumber = String(row['Plate Number'] || row['Plate #'] || '').trim();
        const chassisNumber = String(row['Chassis Number'] || row['Chassis #'] || '').trim();
        
        // Check if this is a duplicate
        const isDuplicateDoor = doorNumber && existingDoorNumbers.has(doorNumber.toLowerCase());
        const isDuplicatePlate = plateNumber && existingPlateNumbers.has(plateNumber.toLowerCase());
        const isDuplicateChassis = chassisNumber && existingChassisNumbers.has(chassisNumber.toLowerCase());
        const isDuplicate = isDuplicateDoor || isDuplicatePlate || isDuplicateChassis;

        const newVehicle: Omit<Vehicle, 'id'> = {
            doorNumber: doorNumber,
            plateNumber: plateNumber,
            chassisNumber: chassisNumber,
            make: String(row['Make / Model'] || ''),
            manufacturer: String(row['Manufacturer'] || ''),
            year: String(row['Year'] || ''),
            purchaseDate: String(row['Purchase Date'] || ''),
            tareWeight: String(row['Tare Weight (KG)'] || row['Tare Weight'] || ''),
            serviceType: String(row['Service Type'] || ''),
            projectSite: String(row['Project Site / Area'] || row['Project Site'] || ''),
            status: (row['Status'] as Vehicle['status']) || 'Active',
            isDuplicate: isDuplicate,
        };

        console.log('🚗 Vehicle data prepared:', newVehicle, isDuplicate ? '(DUPLICATE)' : '');

        if (!newVehicle.doorNumber) {
            console.warn('⚠️ Skipping vehicle without door number:', newVehicle);
            return;
        }

        try {
            await fb.addVehicle(newVehicle, activeId);
            importedCount++;
            if (isDuplicate) {
                duplicateCount++;
                const duplicateTypes = [];
                if (isDuplicateDoor) duplicateTypes.push('Door Number');
                if (isDuplicatePlate) duplicateTypes.push('Plate Number');
                if (isDuplicateChassis) duplicateTypes.push('Chassis Number');
                console.log(`🔶 Duplicate vehicle added successfully: ${newVehicle.doorNumber} (Duplicate: ${duplicateTypes.join(', ')})`);
            } else {
                console.log('✅ Vehicle added successfully:', newVehicle.doorNumber);
            }
        } catch (error) {
            console.error('❌ Error adding vehicle:', error, newVehicle);
        }
    });

    await Promise.all(batchPromises);
}

console.log(`📊 Vehicle import summary: ${importedCount} vehicles imported out of ${data.length} rows`);

          }
           else if (type === 'drivers') {
              console.log('📋 Import data received:', data);
              let importedCount = 0;
              
              // Process drivers in batches of 100
              for (let i = 0; i < data.length; i += 100) {
                  const batch = data.slice(i, i + 100);
                  const batchPromises = batch.map(async row => {
                      console.log('🔍 Processing row:', row);
                  
                      const newDriver: Omit<Driver, 'id'> = {
                          driverName: String(row["Driver Name"] || row["driverName"] || ''),
                          nationality: String(row['Nationality'] || row["nationality"] || ''),
                          driverIqama: String(row["Driver's Iqama Number"] || row["Iqama"] || row["driverIqama"] || ''),
                          driverMobile: String(row["Driver's Mobile Number"] || row["Mobile"] || row["driverMobile"] || '').replace(/\D/g, '').slice(-9),
                          assignedVehicle: '', // Cannot resolve vehicle ID from import directly easily
                      };
                      
                      console.log('👤 Driver data prepared:', newDriver);
                      
                      if (!newDriver.driverName || !newDriver.driverIqama) {
                          console.warn('⚠️ Skipping invalid driver:', newDriver);
                          return;
                      }
                      
                      try {
                          await fb.addDriver(newDriver, activeId);
                          importedCount++;
                          console.log('✅ Driver added successfully:', newDriver.driverName);
                      } catch (error) {
                          console.error('❌ Error adding driver:', error, newDriver);
                      }
                  });
                  
                  await Promise.all(batchPromises);
              }
              
              console.log(`📊 Import summary: ${importedCount} drivers imported out of ${data.length} rows`);
          }
          if (currentUser?.isAdmin) await fetchDataForAdmin();
          await fetchDataForCurrentUser(activeId);
          return { 
              success: true, 
              imported: importedCount, 
              duplicates: duplicateCount,
              message: duplicateCount > 0 
                  ? `${importedCount} vehicles imported successfully (${duplicateCount} marked as duplicates)`
                  : `${importedCount} vehicles imported successfully`
          };
      } catch (e) {
          console.error("Import error:", e);
          const message = e instanceof Error ? e.message : 'Unknown import error.';
          return { success: false, error: message };
      }
  };


  // --- Page Navigation ---
  const handleNavigate = (page: Page) => {
    if (page === 'viewVehicleDetails') {
      console.warn("Direct navigation to viewVehicleDetails is deprecated. Select a vehicle from the list.");
      return;
    }
    setCurrentPage(page);
  };
  
  const handleViewVehicleDetails = (vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentPage('viewVehicleDetails');
  };

  const allVehiclesList = useMemo(() => {
    // Always use all vehicles for proper transfer history lookup
    return Object.values(allProjectData).flatMap((p: ProjectData) => p.vehicles || []);
  }, [allProjectData]);

  const renderContent = () => {
    const activeProjectData = (currentUser?.isAdmin && viewingProjectAsAdmin && allProjectData[viewingProjectAsAdmin.email])
        ? allProjectData[viewingProjectAsAdmin.email]
        : projectData;
    const activeProjectName = viewingProjectAsAdmin?.projectName || currentUser?.projectName || '';
    const isReadOnlyView = currentUser?.isAdmin && viewingProjectAsAdmin !== null;

    if (!currentUser) return null; // Should be handled by AuthPage redirect, but good practice

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard lang={lang} vehicles={activeProjectData.vehicles || []} drivers={activeProjectData.drivers || []} projectName={activeProjectName} incidents={activeProjectData.incidents || []} supervisors={activeProjectData.supervisors || []} projectOfficers={activeProjectData.projectOfficers || []} campLabour={activeProjectData.campLabour || 0} crewman={activeProjectData.crewman || 0} />;
      case 'addVehicle':
        return <AddVehicleForm lang={lang} onAddVehicle={handleAddVehicle} defaultProjectSite={activeProjectName} />;
      case 'viewVehicles':
        return <ViewVehiclesPage lang={lang} vehicles={activeProjectData.vehicles || []} drivers={activeProjectData.drivers || []} onUpdateVehicle={handleUpdateVehicle} onDeleteVehicle={handleDeleteVehicle} onViewDetails={handleViewVehicleDetails} onImportVehicles={(d) => handleImport('vehicles', d)} onUpdateVehicleStatus={handleUpdateVehicleStatus} isReadOnly={isReadOnlyView} onDeleteSelectedVehicles={handleDeleteSelectedVehicles} />;
      case 'addDriver':
        return <AddDriverForm lang={lang} onAddDriver={handleAddDriver} vehicles={activeProjectData.vehicles || []} drivers={activeProjectData.drivers || []} />;
      case 'viewDrivers':
        return <ViewDriversPage lang={lang} drivers={activeProjectData.drivers || []} vehicles={activeProjectData.vehicles || []} onUpdateDriver={handleUpdateDriver} onDeleteDriver={handleDeleteDriver} onImportDrivers={(d) => handleImport('drivers', d)} isReadOnly={isReadOnlyView} onDeleteSelectedDrivers={handleDeleteSelectedDrivers} />;
      case 'viewVehicleDetails':
        return <VehicleDetailsPage lang={lang} vehicles={activeProjectData.vehicles || []} drivers={activeProjectData.drivers || []} selectedVehicleId={selectedVehicleId} />;
      case 'settings':
        return <SettingsPage 
          lang={lang} 
          onLanguageChange={handleLanguageChange} 
          theme={theme} 
          onThemeChange={handleThemeChange}
          user={currentUser}
          allUsers={allUsers}
          onUpdateUserPassword={handleUpdateUserPassword}
          onUpdateAllPasswords={handleUpdateAllPasswords}
        />;
      case 'reportIncident':
        return <ReportIncidentForm lang={lang} vehicles={activeProjectData.vehicles || []} onAddIncident={handleAddIncident} />;
      case 'reports':
        return <ReportsPage lang={lang} incidents={activeProjectData.incidents || []} vehicles={activeProjectData.vehicles || []} onEditIncident={handleEditIncident} onDeleteIncident={handleDeleteIncident} isReadOnly={isReadOnlyView} />;
      case 'adminDashboard':
         return currentUser.isAdmin ? <AdminDashboard lang={lang} allUsers={allUsers} allProjectData={allProjectData} allAdminNotifications={allAdminNotifications} onDismissNotification={handleDismissNotification} onClearAllNotifications={handleClearAllNotifications} /> : null;
      case 'transferVehicle':
        console.log('🔄 Rendering TransferVehiclePage with data:', {
          allUsersCount: allUsers?.length || 0,
          currentUser: currentUser?.email || 'No user',
          allUsersData: allUsers?.slice(0, 3)?.map(u => ({ email: u.email, projectName: u.projectName })) || []
        });
        return <TransferVehiclePage lang={lang} vehicles={activeProjectData.vehicles || []} allVehicles={allVehiclesList} transfers={activeProjectData.transfers || []} notifications={activeProjectData.notifications || []} allUsers={allUsers} currentUser={currentUser} onTransfer={handleTransferVehicle} onAddNotification={handleAddNotification} onDeleteTransfer={handleDeleteTransfer} isReadOnly={isReadOnlyView} />;
      case 'addSupervisor':
        return <AddSupervisorPage 
          lang={lang} 
          onUpdateManPower={handleUpdateManPower} 
          onAddSupervisor={handleAddSupervisor}
          onUpdateSupervisor={handleUpdateSupervisor}
          onUpdateProjectLabour={handleUpdateProjectLabour}
          projectData={activeProjectData}
          editingSupervisor={editingSupervisorData}
          onClearEditingSupervisor={() => setEditingSupervisorData(null)}
        />;
      case 'supervisorOverview':
        return <SupervisorOverviewPage lang={lang} projectData={activeProjectData} onUpdateSupervisor={handleUpdateSupervisor} onDeleteSupervisor={handleDeleteSupervisor} onEditSupervisor={handleEditSupervisor} isReadOnly={isReadOnlyView} />;
      case 'addProjectOfficers':
        return <AddProjectOfficersPage lang={lang} projectOfficers={activeProjectData.projectOfficers || []} onUpdateOfficers={handleUpdateProjectOfficers} />;
      case 'viewProjectOfficers':
        return <ViewProjectOfficersPage lang={lang} projectOfficers={activeProjectData.projectOfficers || []} />;
      // Admin Report Pages
      case 'adminAllProjects':
        return currentUser.isAdmin ? <AdminAllProjectsPage lang={lang} allUsers={allUsers} onViewProjectDashboard={handleAdminViewProject} /> : null;
      case 'adminAllVehicles':
        return currentUser.isAdmin ? <AdminAllVehiclesPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} /> : null;
      case 'adminAllIncidents':
        return currentUser.isAdmin ? <AdminAllIncidentsPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} /> : null;
      case 'adminTransferLog':
        return currentUser.isAdmin ? <AdminTransferLogPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} allTransfers={allTransfers} /> : null;
      default:
        return <div>Page not found</div>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-pattern-minimal flex items-center justify-center">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 dark:text-blue-400"></i>
          <span className="text-xl text-gray-700 dark:text-gray-300">Loading...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className={`min-h-screen flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <TopBar />
        <div className="flex-1">
          <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} lang={lang} onLanguageChange={handleLanguageChange} />
        </div>
      </div>
    );
  }
  
  if (showWelcome) {
    return (
      <div className={`min-h-screen flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <TopBar />
        <div className="flex-1">
          <WelcomePage user={currentUser} lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      {/* Top bar with Zahran logo - appears on all screens */}
      <TopBar />
      <div className="flex flex-1">
        <Sidebar
          currentPage={currentPage}
          onNavigate={handleNavigate}
          currentLang={lang}
          onLogout={handleLogout}
          isAdmin={currentUser?.isAdmin || false}
          isViewingProject={!!viewingProjectAsAdmin}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <Header 
            lang={lang} 
            onToggleSidebar={() => setIsSidebarOpen(true)}
            isViewingProjectAsAdmin={!!viewingProjectAsAdmin}
            projectName={viewingProjectAsAdmin?.projectName || ''}
            onReturnToAdminDashboard={handleReturnToAdminDashboard}
          />
          <div className="flex-grow p-2 overflow-y-auto overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800 bg-pattern-minimal">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;