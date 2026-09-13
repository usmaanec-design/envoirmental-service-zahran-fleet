import React, { useState, useEffect, useCallback } from 'react';
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
import TransferVehiclePage from './components/TransferVehiclePage';
import AddMenpowerPage from './components/AddSupervisorPage';
import MenpowerOverviewPage from './components/SupervisorOverviewPage';
import AdminAllProjectsPage from './components/AdminAllProjectsPage';
import AdminAllVehiclesPage from './components/AdminAllVehiclesPage';
import AdminAllIncidentsPage from './components/AdminAllIncidentsPage';
import AdminTransferLogPage from './components/AdminTransferLogPage';
import ViewProjectOfficersPage from './components/ViewProjectOfficersPage';
import ViewCrewmenPage from './components/ViewCrewmenPage';
import ViewCampLaboursPage from './components/ViewCampLaboursPage';
import ViewSupervisorsTablePage from './components/ViewSupervisorsTablePage';
import ManpowerSummaryPage from './components/ManpowerSummaryPage';
import AdminAllDriversPage from './components/AdminAllDriversPage';
import AdminAllMenpowerPage from './components/AdminAllMenpowerPage';
import AdminAllMenpowerReportPage from './components/AdminAllMenpowerReportPage';
import DynamicJsonLoader from './components/DynamicJsonLoader';
import ChatBot from './components/ChatBot';
import ManpowerAssignPage from './components/ManpowerAssignPage';
import { ViewAllForemenPage } from './components/ViewAllForemenPage';
import { ViewAllLabourPage } from './components/ViewAllLabourPage';
import type { Page, Language, Vehicle, Driver, Incident, User, ProjectData, Transfer, Theme, Supervisor, AdminNotification, ProjectOfficer, Foreman, Labour, VehicleStatus } from './types';
import * as fb from './firebase/service';
import { TRANSLATIONS } from './constants';
import { readExcelFile } from './utils/export';

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

type MenpowerEntryData = Omit<Supervisor, 'id'|'userId'|'foremen'> | Omit<Foreman, 'id'|'labours'> | Omit<Labour, 'id'> | Omit<ProjectOfficer, 'id'|'userId'>;


const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [lang, setLang] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile only
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); // Desktop only - start expanded
  
  // Handle window resize for sidebar responsiveness
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 1024;
      if (!isMobile && isSidebarOpen) {
        // If switching to desktop and mobile sidebar is open, close it
        setIsSidebarOpen(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);


  // --- Auth & Loading State ---
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  
  // --- Data State ---
  const [projectData, setProjectData] = useState<ProjectData>(initialProjectData);
  const [dynamicStructure, setDynamicStructure] = useState<any>(null);
  
  const [allVehiclesForLookup, setAllVehiclesForLookup] = useState<Vehicle[]>([]);
  // --- Admin State ---
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allProjectData, setAllProjectData] = useState<Record<string, ProjectData>>({});
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [allAdminNotifications, setAllAdminNotifications] = useState<AdminNotification[]>([]);
  const [viewingProjectAsAdmin, setViewingProjectAsAdmin] = useState<User | null>(null);
  
  // --- Single-Item State ---
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [editingSupervisorId, setEditingSupervisorId] = useState<string | null>(null);

  // --- ChatBot State ---
  const [isChatBotOpen, setIsChatBotOpen] = useState(false);

  const t = TRANSLATIONS[lang];

  const fetchDataForCurrentUser = useCallback(async (userEmail: string) => {
    console.log('📊 Fetching data for user:', userEmail);
    
    const data = await fb.loadProjectData(userEmail);
    
    setProjectData(data || {
      vehicles: [], drivers: [], incidents: [], transfers: [],
      supervisors: [], crewmen: [], campLabours: [], notifications: [],
      projectOfficers: [], repairHistory: []
    });
  }, []);

  const fetchDataForAdmin = useCallback(async () => {
    console.log('🔄 fetchDataForAdmin called');
    
    let users = await fb.getAllUsers();
    console.log('👥 Initial users found:', users.length, users.map(u => u.email));
    
    // Check if we only have sample/fake users
    const sampleEmails = ['marwan1@projects.reports', 'zahran@sharq.project'];
    const realUsers = users.filter(user => !sampleEmails.includes(user.email));
    
    console.log('🔍 Real users found:', realUsers.length);
    
    // Skip automatic data import - users will have fresh clean accounts
    console.log('✨ Auto-import disabled - all accounts will be fresh and clean');
    if (realUsers.length === 0) {
      console.log('🎯 No backup data will be imported - fresh start for all users');
    }
    
    setAllUsers(users);
    
    // Use new structured function
    const { aggregated, projectDataMap } = await fb.getAllProjectDataStructured();
    console.log('📊 Structured data received:', { 
      aggregatedKeys: Object.keys(aggregated),
      projectDataKeys: Object.keys(projectDataMap),
      totalVehicles: aggregated.vehicles?.length || 0,
      totalDrivers: aggregated.drivers?.length || 0
    });
    
    // Set aggregated data for lookups
    setAllVehiclesForLookup(aggregated.vehicles);
    setAllTransfers(aggregated.transfers);
    setAllAdminNotifications(aggregated.notifications);
    
    // Set project-specific data directly
    setAllProjectData(projectDataMap);
    
    console.log('✅ Admin data loaded:', {
      usersCount: users.length,
      projectDataKeys: Object.keys(projectDataMap),
      sampleProjectData: Object.keys(projectDataMap)[0] ? projectDataMap[Object.keys(projectDataMap)[0]] : 'No projects'
    });
  }, []);

  // --- Effects ---
  useEffect(() => {
    fb.initializeDB();

    const preferredLang = localStorage.getItem('preferredLanguage') as Language;
    if (preferredLang) setLang(preferredLang);
    
    // Always default to light mode on load
    setTheme('light');

    const unsubscribe = fb.onAppAuthStateChanged(async (user) => {
        console.log('🟢 Auth state changed:', user);
        setIsLoading(true);
        if (user) {
          try {
            console.log('🟢 User found, setting currentUser:', user);
            setCurrentUser(user);
            if (user.isAdmin) {
                console.log('🟢 Admin detected, fetching admin data...');
                await fetchDataForAdmin();
                console.log('🟢 Setting page to adminDashboard');
                setCurrentPage('adminDashboard');
            } else if (user.email) {
                await fetchDataForCurrentUser(user.email);
                const { vehicles } = await fb.getAllProjectData();
                setAllVehiclesForLookup(vehicles);
                const users = await fb.getAllUsers();
                setAllUsers(users);
            }
            const hasEntered = sessionStorage.getItem('zahran_has_entered');
            if (!hasEntered) {
                setShowWelcome(true);
            }
          } catch(error) {
            console.error("❌ Failed to fetch data post-login:", error);
            await fb.logoutUser();
          }
        } else {
            console.log('🟢 No user, resetting state');
            setCurrentUser(null);
            setProjectData(initialProjectData);
            setAllUsers([]);
            setAllProjectData({});
            setAllTransfers([]);
            setCurrentPage('dashboard'); 
        }
        console.log('🟢 Setting isLoading to false');
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [fetchDataForAdmin, fetchDataForCurrentUser]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // We still save the theme to localStorage for in-session changes,
    // but it won't be loaded on startup anymore.
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLanguageChange = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem('preferredLanguage', newLang);
  };
  
  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
  };
  
  const getActiveUserId = useCallback((): string | null => {
    // Use the user email as the active project id. Service functions store per-project
    // data under `projects/{email}` so passing the email ensures writes/read target
    // the same document that `loadProjectData` reads.
    return viewingProjectAsAdmin?.email || currentUser?.email || null;
  }, [currentUser, viewingProjectAsAdmin]);

  const handleToggleSidebar = () => {
    // Check if we're on mobile (screen width < 1024px)
    const isMobile = window.innerWidth < 1024; // lg breakpoint in TailwindCSS
    
    if (isMobile) {
      // On mobile: toggle the overlay sidebar
      setIsSidebarOpen(p => !p);
    } else {
      // On desktop: toggle the collapsed state  
      setIsSidebarCollapsed(p => !p);
    }
  };


  // --- Auth Handlers ---
  const handleSignUp = useCallback(async (newUser: User) => {
    await fb.signUpUser(newUser);
  }, []);

  const handleLogin = useCallback(async (email: string, pass: string): Promise<void> => {
    console.log('🟡 handleLogin called with:', { email, pass });
    const user = await fb.loginUser(email, pass);
    console.log('🟡 Login successful, user:', user);
    
    // For admin users, manually trigger auth state since they don't go through Firebase Auth
    if (user.isAdmin) {
      console.log('🟡 Manual admin login - setting user state directly');
      setCurrentUser(user);
      setIsLoading(true);
      try {
        await fetchDataForAdmin();
        setCurrentPage('adminDashboard');
        sessionStorage.removeItem('zahran_has_entered');
        setShowWelcome(true);
      } catch (error) {
        console.error("❌ Failed to fetch admin data:", error);
        await fb.logoutUser();
      } finally {
        setIsLoading(false);
      }
    } else {
      // Regular users - manually set state since we might be using Firestore auth
      console.log('🟡 Regular user login - setting user state manually');
      setCurrentUser(user);
      setIsLoading(true);
      try {
        if (user.email) {
          await fetchDataForCurrentUser(user.email);
          
          // For Sharq project, add periodic refresh to ensure data loads
          if (user.email === 'zahran@sharq.project') {
            console.log('🔄 Setting up auto-refresh for Sharq project...');
            // Refresh data every 30 seconds for the first 2 minutes after login
            let refreshCount = 0;
            const maxRefreshes = 4; // 4 refreshes over 2 minutes
            
            const refreshInterval = setInterval(async () => {
              refreshCount++;
              console.log(`🔄 Auto-refresh ${refreshCount}/${maxRefreshes} for Sharq project...`);
              
              try {
                await fetchDataForCurrentUser(user.email);
                const currentData = await fb.loadProjectData(user.email);
                
                if (currentData?.vehicles && currentData.vehicles.length > 0) {
                  console.log(`✅ Auto-refresh successful: Found ${currentData.vehicles.length} vehicles!`);
                  clearInterval(refreshInterval);
                  return;
                }
              } catch (error) {
                console.error('❌ Auto-refresh failed:', error);
              }
              
              if (refreshCount >= maxRefreshes) {
                console.log('⏹️ Auto-refresh completed (max attempts reached)');
                clearInterval(refreshInterval);
              }
            }, 30000); // Every 30 seconds
          }
          
          const { vehicles } = await fb.getAllProjectData();
          setAllVehiclesForLookup(vehicles);
          const users = await fb.getAllUsers();
          setAllUsers(users);
          setCurrentPage('dashboard');
        }
        sessionStorage.removeItem('zahran_has_entered');
        setShowWelcome(true);
      } catch (error) {
        console.error("❌ Failed to fetch user data:", error);
        await fb.logoutUser();
      } finally {
        setIsLoading(false);
      }
    }
  }, [fetchDataForAdmin]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🔓 Logging out user...');
      await fb.logoutUser();
      
      // Reset all user state
      sessionStorage.removeItem('zahran_has_entered');
      setShowWelcome(false);
      setCurrentUser(null);
      setViewingProjectAsAdmin(null);
      setCurrentPage('auth');
      setProjectData({
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
      });
      
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  }, []);
  
  const handleAdminViewProject = useCallback((user: User) => {
      setViewingProjectAsAdmin(user);
      setCurrentPage('dashboard');
  }, []);

  const handleAdminViewProjectMenpower = useCallback((user: User) => {
      setViewingProjectAsAdmin(user);
      setCurrentPage('menpowerOverview');
  }, []);

  const handleAdminViewProjectVehicleHistory = useCallback((user: User) => {
      setViewingProjectAsAdmin(user);
      setCurrentPage('vehicleHistory');
  }, []);
  
  const handleReturnToAdminDashboard = useCallback(() => {
      setViewingProjectAsAdmin(null);
      setCurrentPage('adminDashboard');
  }, []);

  const refreshActiveUserData = useCallback(async () => {
    console.log('🔄 refreshActiveUserData called');
    const activeId = getActiveUserId();
    if (currentUser?.isAdmin) {
      console.log('👨‍💼 Refreshing admin data...');
      await fetchDataForAdmin();
    }
    if (activeId) {
      console.log('📊 Force-refreshing project data for:', activeId);
      await fetchDataForCurrentUser(activeId);
      
      // Force a second refresh after a short delay to ensure data consistency
      console.log('⏳ Waiting 500ms for additional refresh...');
      setTimeout(async () => {
        console.log('📊 Second refresh after timeout for:', activeId);
        await fetchDataForCurrentUser(activeId);
      }, 500);
    }
  }, [getActiveUserId, currentUser, fetchDataForAdmin, fetchDataForCurrentUser]);

  // --- Data Handlers ---
  const handleAddVehicle = useCallback(async (newVehicleData: Omit<Vehicle, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addVehicle(newVehicleData, activeId);
    await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);

  const handleUpdateVehicle = useCallback(async (updatedVehicle: Vehicle) => {
    const activeId = getActiveUserId();
    if (!activeId) return;
    await fb.updateVehicle(updatedVehicle, activeId);
    await refreshActiveUserData();
  }, [refreshActiveUserData, getActiveUserId]);

  const handleBulkUpdateVehicleServiceType = useCallback(async (vehicleIds: string[], newServiceType: string) => {
      await fb.bulkUpdateVehicleServiceType(vehicleIds, newServiceType);
      await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteVehicle = useCallback(async (vehicleId: string) => {
    const activeId = getActiveUserId();
    if (!activeId) return;
    await fb.deleteVehicle(vehicleId, activeId);
    await refreshActiveUserData();
  }, [refreshActiveUserData, getActiveUserId]);

  const handleDeleteSelectedVehicles = useCallback(async (vehicleIds: string[]): Promise<{ deletedCount: number; skippedCount: number }> => {
    const activeId = getActiveUserId();
    if (!activeId) return { deletedCount: 0, skippedCount: vehicleIds.length };

    const data = (currentUser?.isAdmin && viewingProjectAsAdmin)
        ? allProjectData[viewingProjectAsAdmin.email]
        : projectData;

    const repairHistoryVehicleIds = new Set(data.repairHistory.map(rh => rh.vehicleId));
    const transferredVehicleIds = new Set(data.transfers.filter(t => t.status === 'Transferred').map(t => t.vehicleId));

    console.log('🗑️ handleDeleteSelectedVehicles called');
    console.log('📄 Current page:', currentPage);
    console.log('🎯 Selected vehicle IDs:', vehicleIds);

    const idsToDelete: string[] = [];
    let skippedCount = 0;
    
    // Determine deletion context first
    const deletionContext = currentPage === 'vehicleHistory' ? 'history' : 'bulk';
    console.log('🔧 Deletion context determined:', deletionContext);

    for (const id of vehicleIds) {
        const vehicle = data.vehicles.find(v => v.id === id);
        
        // For Vehicle History context, allow deletion of any existing vehicle
        if (deletionContext === 'history') {
            if (vehicle) {
                idsToDelete.push(id);
                console.log(`✅ Vehicle ${id} added to deletion list (history context)`);
            } else {
                console.log(`⚠️ Vehicle ${id} not found in user data`);
                skippedCount++;
            }
        } else {
            // For other contexts, apply strict filtering
            if (
                vehicle &&
                vehicle.status === 'Active' &&
                !repairHistoryVehicleIds.has(id) &&
                !transferredVehicleIds.has(id)
            ) {
                idsToDelete.push(id);
                console.log(`✅ Vehicle ${id} added to deletion list (safe vehicle)`);
            } else {
                console.log(`⚠️ Vehicle ${id} filtered out:`, {
                    exists: !!vehicle,
                    status: vehicle?.status,
                    hasRepairHistory: repairHistoryVehicleIds.has(id),
                    hasTransferHistory: transferredVehicleIds.has(id)
                });
                skippedCount++;
            }
        }
    }

    if (idsToDelete.length > 0) {
        console.log('🗑️ About to call deleteVehicles with:', { idsToDelete, deletionContext });
        const result = await fb.deleteVehicles(idsToDelete, deletionContext);
        console.log('🗑️ Delete result:', result);
        
        // Show detailed message to user
        if (result.skippedVehicles.length > 0) {
          console.warn('⚠️ Some vehicles were skipped:', result.skippedVehicles);
          
          // You could also show a modal or toast notification here
          const skippedDetails = result.skippedVehicles.map(v => 
            `${v.plateNumber} (${v.reason})`
          ).join(', ');
          
          alert(`${result.message}\n\nSkipped vehicles: ${skippedDetails}`);
        } else if (result.deletedCount > 0) {
          console.log(`✅ Successfully deleted ${result.deletedCount} vehicles`);
        }
        
        await refreshActiveUserData();
        return { deletedCount: result.deletedCount, skippedCount: result.skippedCount };
    }
    
    return { deletedCount: idsToDelete.length, skippedCount };
}, [getActiveUserId, currentUser, viewingProjectAsAdmin, allProjectData, projectData, refreshActiveUserData]);

  const handleAddDriver = useCallback(async (newDriverData: Omit<Driver, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addDriver(newDriverData, activeId);
    await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);
  
  const handleUpdateDriver = useCallback(async (updatedDriver: Driver) => {
    await fb.updateDriver(updatedDriver);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteDriver = useCallback(async (driverId: string) => {
    await fb.deleteDriver(driverId);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteSelectedDrivers = useCallback(async (driverIds: string[]) => {
    await fb.deleteDrivers(driverIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleAddIncident = useCallback(async (incidentData: Omit<Incident, 'id'>) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    await fb.addIncident(incidentData, activeId);
    await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);

  const handleMarkVehicleActive = useCallback(async (vehicleId: string, repairedAt: string, repairedBy: string, repairNotes?: string) => {
    const activeId = getActiveUserId();
    if (!activeId) return;
    await fb.markVehicleAsActive(vehicleId, repairedAt, repairedBy, repairNotes, activeId);
    await refreshActiveUserData();
  }, [getActiveUserId, refreshActiveUserData]);
  
  const handleDismissIncident = useCallback(async (vehicleId: string) => {
    await fb.dismissIncident(vehicleId);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDismissSelectedRepairHistories = useCallback(async (repairIds: string[]) => {
    await fb.dismissRepairHistories(repairIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleBulkDeleteHistory = useCallback(async (vehicleIds: string[], upToDate?: string) => {
      await fb.deleteCompleteHistory(vehicleIds, upToDate);
      await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleTransferVehicle = useCallback(async (vehicleId: string, toUserId: string, transferDate: string, notes?: string) => {
    const activeId = getActiveUserId();
    if (!activeId) return;
    await fb.transferVehicle(vehicleId, activeId, toUserId, transferDate, notes);
    // Refresh both admin and user data as transfers affect all views
    await fetchDataForAdmin();
    if(activeId) await fetchDataForCurrentUser(activeId);
  }, [getActiveUserId, fetchDataForAdmin, fetchDataForCurrentUser]);

  const handleReturnVehicle = useCallback(async (transferId: string) => {
    await fb.returnVehicle(transferId);
    // Refresh both admin and user data
    await fetchDataForAdmin();
    const activeId = getActiveUserId();
    if(activeId) await fetchDataForCurrentUser(activeId);
  }, [getActiveUserId, fetchDataForAdmin, fetchDataForCurrentUser]);
  
  const handleAddNotification = useCallback(async (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>) => {
    await fb.addAdminNotification(notificationData);
    await fetchDataForAdmin(); // Always refresh admin data
  }, [fetchDataForAdmin]);

  const handleDismissNotification = useCallback(async (notificationId: string) => {
    await fb.deleteAdminNotification(notificationId);
    await fetchDataForAdmin();
  }, [fetchDataForAdmin]);
  
  const handleClearAllNotifications = useCallback(async () => {
    await fb.deleteAllAdminNotifications();
    await fetchDataForAdmin();
  }, [fetchDataForAdmin]);

  const handleDeleteTransfer = useCallback(async (transferId: string) => {
      await fb.deleteTransfer(transferId);
      await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleAddMenpowerEntry = useCallback(async (
    type: 'supervisor' | 'foreman' | 'labour' | 'crewman' | 'campLabour' | 'projectOfficer', 
    data: MenpowerEntryData, 
    parentId?: string
  ) => {
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
      
      await fb.addManPowerEntry(type, data, activeId, parentId);
      await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);
  
  const handleUpdateSupervisor = useCallback(async (updatedSupervisor: Supervisor) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;
    
    await fb.updateSupervisor(updatedSupervisor, activeId);
    await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);
  
  const handleDeleteSupervisor = useCallback(async (supervisorId: string) => {
    await fb.deleteSupervisor(supervisorId);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteSelectedSupervisors = useCallback(async (supervisorIds: string[]) => {
    await fb.deleteMultipleSupervisors(supervisorIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleUpdateProjectOfficer = useCallback(async (officer: ProjectOfficer) => {
    await fb.updateProjectOfficer(officer);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteProjectOfficer = useCallback(async (officerId: string) => {
    await fb.deleteProjectOfficer(officerId);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

   const handleDeleteSelectedProjectOfficers = useCallback(async (officerIds: string[]) => {
    await fb.deleteMultipleProjectOfficers(officerIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleUpdateLabour = useCallback(async (labour: Labour, type: 'crewman' | 'campLabour') => {
    await fb.updateLabour(labour.id, labour, type);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteLabour = useCallback(async (labourId: string, type: 'crewman' | 'campLabour') => {
    await fb.deleteLabour(labourId, type);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteSelectedLabours = useCallback(async (labourIds: string[], type: 'crewman' | 'campLabour') => {
    await fb.deleteMultipleLabours(labourIds, type);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteSelectedForemen = useCallback(async (foremanIds: string[]) => {
    await fb.deleteMultipleForemen(foremanIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDeleteSelectedLabour = useCallback(async (labourIds: string[]) => {
    await fb.deleteMultipleLabourFromForemen(labourIds);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleDynamicStructureUpdate = useCallback(async (newStructure: any) => {
    setDynamicStructure(newStructure);
    // Also update project data with new structure
    setProjectData(newStructure);
    await refreshActiveUserData();
  }, [refreshActiveUserData]);

  const handleSaveManpowerAssignments = useCallback(async (updatedSupervisors: Supervisor[]) => {
    const activeId = getActiveUserId();
    if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) return;

    const sourceData = (currentUser?.isAdmin && viewingProjectAsAdmin && allProjectData[viewingProjectAsAdmin.email])
      ? allProjectData[viewingProjectAsAdmin.email]
      : projectData;

    await fb.saveProjectData(activeId, {
      ...sourceData,
      supervisors: updatedSupervisors,
    });

    await refreshActiveUserData();
  }, [getActiveUserId, currentUser, viewingProjectAsAdmin, allProjectData, projectData, refreshActiveUserData]);
  
  // Helper function to add foreman to a supervisor
  const handleAddForeman = useCallback(async (foremanData: Omit<Foreman, 'id' | 'labours'>, supervisorName: string, userEmail: string) => {
    try {
      // Load current project data
      const currentData = await fb.loadProjectData(userEmail);
      const supervisors = currentData.supervisors || [];
      
      // Find or create supervisor
      let supervisor = supervisors.find(s => s.name.toLowerCase() === supervisorName.toLowerCase());
      if (!supervisor) {
        // Create new supervisor
        supervisor = {
          id: Date.now().toString(),
          name: supervisorName,
          area: 'Assigned Area',
          iqama: '',
          mobile: '',
          empId: '',
          foremen: []
        };
        supervisors.push(supervisor);
      }
      
      // Add foreman to supervisor
      const newForeman: Foreman = {
        ...foremanData,
        id: Date.now().toString() + Math.random(),
        labours: []
      };
      supervisor.foremen = supervisor.foremen || [];
      supervisor.foremen.push(newForeman);
      
      // Save updated data
      await fb.saveProjectData(userEmail, { ...currentData, supervisors });
    } catch (error) {
      console.error('Error adding foreman:', error);
      throw error;
    }
  }, []);

  // Helper function to add labour to a foreman under a supervisor
  const handleAddLabour = useCallback(async (labourData: Omit<Labour, 'id'>, foremanName: string, supervisorName: string, userEmail: string) => {
    try {
      // Load current project data
      const currentData = await fb.loadProjectData(userEmail);
      const supervisors = currentData.supervisors || [];
      
      // Find or create supervisor
      let supervisor = supervisors.find(s => s.name.toLowerCase() === supervisorName.toLowerCase());
      if (!supervisor) {
        // Create new supervisor
        supervisor = {
          id: Date.now().toString(),
          name: supervisorName,
          area: 'Assigned Area',
          iqama: '',
          mobile: '',
          empId: '',
          foremen: []
        };
        supervisors.push(supervisor);
      }
      
      // Find or create foreman
      supervisor.foremen = supervisor.foremen || [];
      let foreman = supervisor.foremen.find(f => f.name.toLowerCase() === foremanName.toLowerCase());
      if (!foreman) {
        // Create new foreman
        foreman = {
          id: Date.now().toString() + Math.random(),
          name: foremanName,
          iqama: '',
          empId: '',
          labours: []
        };
        supervisor.foremen.push(foreman);
      }
      
      // Add labour to foreman
      const newLabour: Labour = {
        ...labourData,
        id: Date.now().toString() + Math.random()
      };
      foreman.labours = foreman.labours || [];
      foreman.labours.push(newLabour);
      
      // Save updated data
      await fb.saveProjectData(userEmail, { ...currentData, supervisors });
    } catch (error) {
      console.error('Error adding labour:', error);
      throw error;
    }
  }, []);

  // Helper for flexible column value extraction during Excel imports
  const getFlexColValue = (row: any, possibleKeys: string[]): string => {
    if (!row || typeof row !== 'object') return '';
    const rowKeys = Object.keys(row);
    
    // 1. Direct match (exact key)
    for (const key of possibleKeys) {
      if (key && row[key] !== undefined && row[key] !== null) {
        const val = String(row[key]).trim();
        if (val) return val;
      }
    }
    
    // 2. Normalized match (ignore spaces, casing, and common punctuation)
    const normalize = (s: string) => s.toLowerCase().replace(/[\s#._\/\-\(\)]/g, '');
    const normPossible = possibleKeys.filter(Boolean).map(normalize);
    
    for (const rowKey of rowKeys) {
      const normRowKey = normalize(rowKey);
      if (normPossible.some(p => normRowKey === p || normRowKey.includes(p) || p.includes(normRowKey))) {
        const val = String(row[rowKey]).trim();
        if (val) return val;
      }
    }
    
    return '';
  };

  const handleImport = useCallback(async (type: 'vehicles' | 'drivers' | 'projectOfficers' | 'supervisors' | 'crewmen' | 'campLabours' | 'foremen' | 'labour', data: any[], onProgress?: (percent: number) => void) => {
      const t = TRANSLATIONS[lang]; // Use current language for headers
      const activeId = getActiveUserId();
      if (!activeId || (currentUser?.isAdmin && !viewingProjectAsAdmin)) {
          return { success: false, error: 'User not authenticated' };
      }
      
      try {
          console.log(`📊 Starting FAST import of ${data.length} ${type} entries...`);
          
          // Optimized: Much larger batch size and reduced delays for faster processing
          if (type === 'vehicles') {
              // Extract ALL valid vehicles across the entire imported file to avoid batch race conditions
              if (onProgress) onProgress(20);
              const validVehicles = data.map((row, idx) => {
                  const doorNumber = getFlexColValue(row, [
                      t.thDoorNumber, TRANSLATIONS.en.thDoorNumber, TRANSLATIONS.ar.thDoorNumber,
                      'Door #', 'Door No', 'Door No.', 'Door Number', 'Door', 'Door ID', 'DoorNum', 'DoorNumber',
                      'Equipment #', 'Equipment No', 'Equipment No.', 'Equipment Number', 'Equipment', 'Equipment ID', 'Eq No', 'Eq #',
                      'Fleet #', 'Fleet No', 'Fleet No.', 'Fleet Number', 'Unit #', 'Unit No', 'Unit Number', 'Vehicle #', 'Vehicle No', 'Vehicle Number',
                      'رقم الباب', 'رقم المعدة', 'رقم المعده', 'المعدة', 'المعده', 'رقم المركبة', 'رقم المركبه', 'المركبة', 'المركبه', 'رقم السيارة', 'رقم السياره', 'رقم الآلية', 'رقم الالية', 'رقم الاسطول', 'رمز المعدة', 'رقم التسلسل', 'كود المعدة'
                  ]);

                  const plateNumber = getFlexColValue(row, [
                      t.thPlateNumber, TRANSLATIONS.en.thPlateNumber, TRANSLATIONS.ar.thPlateNumber,
                      'Plate #', 'Plate No', 'Plate No.', 'Plate Number', 'Plate', 'PlateNum', 'PlateNumber', 'License Plate', 'Registration #', 'Registration',
                      'رقم اللوحة', 'رقم اللوحه', 'اللوحة', 'اللوحه', 'رقم اللوحة المعدنية', 'لوحة السيارة'
                  ]);

                  const chassisNumber = getFlexColValue(row, [
                      t.thChassisNumber, TRANSLATIONS.en.thChassisNumber, TRANSLATIONS.ar.thChassisNumber,
                      'Chassis #', 'Chassis No', 'Chassis No.', 'Chassis Number', 'Chassis', 'ChassisNum', 'VIN', 'VIN Number',
                      'رقم الهيكل', 'الهيكل', 'رقم الشاسي', 'رقم الشاسيه', 'الشاسي', 'الشاسيه'
                  ]);

                  const make = getFlexColValue(row, [
                      t.thMake, TRANSLATIONS.en.thMake, TRANSLATIONS.ar.thMake,
                      'Make', 'Model', 'Make / Model', 'Make/Model', 'Type', 'Vehicle Type',
                      'الماركة', 'الموديل', 'الماركة / الموديل', 'نوع المركبة', 'نوع السيارة', 'نوع المعدة'
                  ]);

                  const manufacturer = getFlexColValue(row, [
                      t.thManufacturer, TRANSLATIONS.en.thManufacturer, TRANSLATIONS.ar.thManufacturer,
                      'Manufacturer', 'Maker', 'Brand', 'Company',
                      'الشركة المصنعة', 'الشركة المصنعه', 'المصنع', 'الصانع', 'الشركة'
                  ]);

                  const year = getFlexColValue(row, [
                      t.thYear, TRANSLATIONS.en.thYear, TRANSLATIONS.ar.thYear,
                      'Year', 'Model Year', 'Mfg Year', 'Manufacturing Year',
                      'سنة الصنع', 'سنة الإنتاج', 'سنة الانتاج', 'السنة', 'الموديل'
                  ]);

                  const purchaseDate = getFlexColValue(row, [
                      t.thPurchaseDate, TRANSLATIONS.en.thPurchaseDate, TRANSLATIONS.ar.thPurchaseDate,
                      'Purchase Date', 'Date of Purchase', 'Delivery Date', 'PurchaseDate',
                      'تاريخ الشراء', 'تاريخ التسليم', 'تاريخ الشراء / التسليم', 'التاريخ'
                  ]);

                  const tareWeight = getFlexColValue(row, [
                      t.thTareWeight, TRANSLATIONS.en.thTareWeight, TRANSLATIONS.ar.thTareWeight,
                      'Tare Weight', 'Tare Weight (Tons)', 'TareWeight', 'Weight', 'Capacity',
                      'الوزن الفارغ', 'الوزن الفارغ (طن)', 'الوزن', 'الحمولة'
                  ]);

                  const serviceType = getFlexColValue(row, [
                      t.thServiceType, TRANSLATIONS.en.thServiceType, TRANSLATIONS.ar.thServiceType,
                      'Service Type', 'Type of Service', 'Service', 'ServiceType', 'Operation Type',
                      'نوع الخدمة', 'نوع الخدمه', 'الخدمة', 'الخدمه', 'طبيعة العمل'
                  ]);

                  const projectSite = getFlexColValue(row, [
                      t.thProjectSite, TRANSLATIONS.en.thProjectSite, TRANSLATIONS.ar.thProjectSite,
                      'Project Site', 'ProjectSite', 'Site', 'Location', 'Project', 'Branch',
                      'موقع المشروع', 'المشروع', 'الموقع', 'الفرع'
                  ]);

                  const finalDoorNumber = doorNumber || plateNumber || chassisNumber || (make || manufacturer || serviceType ? `EQ-${idx + 1}` : '');

                  if (!finalDoorNumber && !plateNumber && !chassisNumber && !make && !manufacturer && !serviceType) {
                      return null;
                  }

                  const newVehicle: Omit<Vehicle, 'id'> = {
                      doorNumber: finalDoorNumber,
                      plateNumber,
                      chassisNumber,
                      make,
                      manufacturer,
                      year,
                      purchaseDate,
                      tareWeight,
                      serviceType,
                      projectSite,
                      status: 'Active',
                  };
                  return newVehicle;
              }).filter(Boolean) as Omit<Vehicle, 'id'>[];

              if (onProgress) onProgress(60);
              console.log(`🚗 Saving all ${validVehicles.length} vehicles atomically to project ${activeId}...`);
              await fb.addVehiclesBatch(validVehicles, activeId);
              if (onProgress) onProgress(100);

          } else if (type === 'drivers') {
              // Extract ALL valid drivers across the entire imported file to avoid batch race conditions
              if (onProgress) onProgress(20);
              const validDrivers = data.map((row, idx) => {
                  const driverName = getFlexColValue(row, [
                      t.thDriverName, TRANSLATIONS.en.thDriverName, TRANSLATIONS.ar.thDriverName,
                      'Driver Name', 'DriverName', 'Driver', 'Name', 'Worker Name', 'Full Name',
                      'اسم السائق', 'السائق', 'الاسم', 'اسم الموظف'
                  ]);

                  const nationality = getFlexColValue(row, [
                      t.nationality, TRANSLATIONS.en.nationality, TRANSLATIONS.ar.nationality,
                      'Nationality', 'Country', 'Nation',
                      'الجنسية', 'الجنسيه'
                  ]);

                  const driverIqama = getFlexColValue(row, [
                      t.thIqama, TRANSLATIONS.en.thIqama, TRANSLATIONS.ar.thIqama,
                      'Iqama', 'Iqama Number', 'Iqama #', 'IqamaNo', 'ID Number', 'National ID',
                      'رقم الإقامة', 'رقم الاقامة', 'الإقامة', 'الاقامة', 'رقم الهوية'
                  ]);

                  const driverIdNumber = getFlexColValue(row, [
                      t.thDriverIdNumber, TRANSLATIONS.en.thDriverIdNumber, TRANSLATIONS.ar.thDriverIdNumber,
                      'Driver ID Number', 'Driver ID', 'ID Number', 'Identity Number', 'Emp ID',
                      'رقم الهوية', 'رقم الهويه', 'رقم الموظف'
                  ]);

                  const driverMobile = getFlexColValue(row, [
                      t.thMobile, TRANSLATIONS.en.thMobile, TRANSLATIONS.ar.thMobile,
                      'Mobile', 'Mobile Number', 'Phone', 'Phone Number', 'Mobile No',
                      'الجوال', 'رقم الجوال', 'الهاتف'
                  ]).replace('+966', '').trim();

                  if (!driverName && !driverIqama && !driverIdNumber) {
                      return null;
                  }

                  const newDriver: Omit<Driver, 'id'> = {
                      driverName: driverName || `Driver ${idx + 1}`,
                      nationality,
                      driverIqama,
                      driverIdNumber,
                      driverMobile,
                      assignedVehicle: '',
                  };
                  return newDriver;
              }).filter(Boolean) as Omit<Driver, 'id'>[];

              if (onProgress) onProgress(60);
              console.log(`👨‍💼 Saving all ${validDrivers.length} drivers atomically to project ${activeId}...`);
              await fb.addDriversBatch(validDrivers, activeId);
              if (onProgress) onProgress(100);

          } else {
              // Chunked batch handling for other types (supervisors, foremen, labour, officers)
              const batchSize = 50;
              const delayBetweenBatches = 150;

              for (let i = 0; i < data.length; i += batchSize) {
                  const batch = data.slice(i, i + batchSize);
                  if (type === 'projectOfficers' || type === 'crewmen' || type === 'campLabours') {
                      const menpowerTypeMap = {
                          projectOfficers: 'projectOfficer',
                          crewmen: 'crewman',
                          campLabours: 'campLabour'
                      };
                      const currentType = menpowerTypeMap[type] as 'projectOfficer' | 'crewman' | 'campLabour';
                  
                  console.log(`🔍 ${currentType.toUpperCase()} DEBUG - Processing batch:`, batch.length, 'rows');
                  console.log(`🔍 ${currentType.toUpperCase()} DEBUG - Translation keys:`, {
                      labourName: t.labourName,
                      labourIqama: t.labourIqama, 
                      labourEmpId: t.labourEmpId,
                      officerName: t.officerName,
                      officerRole: t.officerRole,
                      officerIqama: t.officerIqama,
                      officerMobile: t.officerMobile
                  });
                  console.log(`🔍 ${currentType.toUpperCase()} DEBUG - First row sample:`, batch[0]);
                  
                  // Try multiple column header variations (case-insensitive)
                  const getColumnValue = (possibleKeys: string[]) => {
                      const keys = Object.keys(batch[0] || {});
                      for (const possibleKey of possibleKeys) {
                          // Exact match first
                          if (batch[0] && batch[0][possibleKey]) return String(batch[0][possibleKey]).trim();
                          
                          // Case-insensitive match
                          const matchedKey = keys.find(key => 
                              key.toLowerCase().trim() === possibleKey.toLowerCase().trim()
                          );
                          if (matchedKey && batch[0] && batch[0][matchedKey]) return String(batch[0][matchedKey]).trim();
                      }
                      return '';
                  };
                  
                  // Process entire batch with better validation and debugging
                  const validEntries: any[] = [];
                  
                  batch.forEach((row, index) => {
                      let entryData: any;
                      
                      if (currentType === 'projectOfficer') {
                          const role = getFlexColValue(row, [
                              t.officerRole, TRANSLATIONS.en.officerRole, TRANSLATIONS.ar.officerRole,
                              'Officer Role', 'Role', 'Position', 'الوظيفة', 'المسمى الوظيفي', 'الدور', 'دور المسؤول'
                          ]);
                          const name = getFlexColValue(row, [
                              t.officerName, TRANSLATIONS.en.officerName, TRANSLATIONS.ar.officerName,
                              'Officer Name', 'Name', 'اسم المسؤول', 'الاسم', 'اسم الموظف'
                          ]);
                          const iqama = getFlexColValue(row, [
                              t.officerIqama, TRANSLATIONS.en.officerIqama, TRANSLATIONS.ar.officerIqama,
                              'Iqama Number', 'Iqama', 'Iqama #', 'رقم الإقامة', 'رقم الاقامة', 'الإقامة', 'الاقامة'
                          ]);
                          const idNumber = getFlexColValue(row, [
                              t.thDriverIdNumber, TRANSLATIONS.en.thDriverIdNumber, TRANSLATIONS.ar.thDriverIdNumber,
                              'Officer ID Number', 'ID Number', 'Identity Number', 'Emp ID', 'رقم الهوية', 'رقم الهويه', 'رقم الموظف'
                          ]);
                          const mobile = getFlexColValue(row, [
                              t.officerMobile, TRANSLATIONS.en.officerMobile, TRANSLATIONS.ar.officerMobile,
                              'Mobile Number', 'Mobile', 'Phone', 'Phone Number', 'الجوال', 'رقم الجوال'
                          ]).replace('+966', '').trim();
                          
                          entryData = { role, name, iqama, idNumber, mobile };
                          
                          console.log(`🔍 PROJECT OFFICER DEBUG - Row ${index}:`, {
                              entryData,
                              isValid: entryData.name && entryData.name.length > 0,
                              availableColumns: Object.keys(row)
                          });
                          
                          if (entryData.name && entryData.name.length > 0) {
                              validEntries.push(entryData);
                          }
                      } else {
                          // For crewmen and campLabours
                          const name = getFlexColValue(row, [
                              t.labourName, TRANSLATIONS.en.labourName, TRANSLATIONS.ar.labourName,
                              'Labour Name', 'Worker Name', 'Name', 'اسم العامل', 'العامل', 'الاسم'
                          ]);
                          const iqama = getFlexColValue(row, [
                              t.labourIqama, TRANSLATIONS.en.labourIqama, TRANSLATIONS.ar.labourIqama,
                              'Labour Iqama', 'Worker Iqama', 'Iqama', 'Iqama Number', 'رقم الإقامة', 'رقم الاقامة', 'الإقامة', 'الاقامة'
                          ]);
                          const empId = getFlexColValue(row, [
                              t.labourEmpId, TRANSLATIONS.en.labourEmpId, TRANSLATIONS.ar.labourEmpId,
                              'Employee ID', 'EmpID', 'ID', 'Worker ID', 'Labour ID', 'رقم الموظف', 'الرقم الوظيفي', 'معرف الموظف للعامل'
                          ]);
                          const idNumber = getFlexColValue(row, [
                              t.thDriverIdNumber, TRANSLATIONS.en.thDriverIdNumber, TRANSLATIONS.ar.thDriverIdNumber,
                              'ID Number', 'Identity Number', 'رقم الهوية', 'رقم الهويه'
                          ]);
                          
                          entryData = { name, iqama, empId, idNumber };
                          
                          console.log(`🔍 ${currentType.toUpperCase()} DEBUG - Row ${index}:`, {
                              entryData,
                              isValid: entryData.name && entryData.name.length > 0,
                              availableColumns: Object.keys(row)
                          });
                          
                          if (entryData.name && entryData.name.length > 0) {
                              validEntries.push(entryData);
                          }
                      }
                  });
                  
                  console.log(`👷 Adding batch of ${validEntries.length} ${currentType} entries out of ${batch.length} rows...`);
                  
                  if (validEntries.length > 0) {
                      // Use batch functions instead of individual calls
                      let batchResult: any = { success: false };
                      
                      if (currentType === 'projectOfficer') {
                          console.log(`📋 Adding project officers batch...`);
                          batchResult = await fb.addProjectOfficersBatch(validEntries, activeId);
                      } else if (currentType === 'crewman') {
                          console.log(`👷‍♂️ Adding crewmen batch...`);
                          batchResult = await fb.addCrewmenBatch(validEntries, activeId);
                      } else if (currentType === 'campLabour') {
                          console.log(`👷‍♀️ Adding camp labours batch...`);
                          batchResult = await fb.addCampLaboursBatch(validEntries, activeId);
                      }
                      
                      console.log(`🔍 ${currentType.toUpperCase()} BATCH RESULT:`, batchResult);
                      
                      if (batchResult.success) {
                          console.log(`✅ Successfully imported ${validEntries.length} ${currentType} entries`);
                      } else {
                          console.error(`❌ Failed to import ${currentType} batch:`, batchResult.error);
                      }
                  } else {
                      console.warn(`⚠️ ${currentType.toUpperCase()} DEBUG - No valid entries found in this batch!`);
                  }
                  
                  if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + batch.length) / data.length) * 100));
                    try { onProgress(percent); } catch (e) { console.warn('onProgress callback error', e); }
                  }
                  
              } else if (type === 'foremen') {
                  // FIXED: Use batch import to avoid race conditions - collect all valid foremen
                  console.log('🔍 FOREMEN DEBUG - Processing batch:', batch.length, 'rows');
                  console.log('🔍 FOREMEN DEBUG - Translation keys:', {
                      foremanName: t.foremanName,
                      foremanIqama: t.foremanIqama,
                      foremanEmpId: t.foremanEmpId,
                      supervisorName: t.supervisorName
                  });
                  console.log('🔍 FOREMEN DEBUG - First row sample:', batch[0]);
                  
                  const validForemen = batch.map((row, index) => {
                      // Try multiple column header variations (case-insensitive)
                      const getColumnValue = (possibleKeys: string[]) => {
                          const keys = Object.keys(row);
                          for (const possibleKey of possibleKeys) {
                              // Exact match first
                              if (row[possibleKey]) return String(row[possibleKey]).trim();
                              
                              // Case-insensitive match
                              const matchedKey = keys.find(key => 
                                  key.toLowerCase().trim() === possibleKey.toLowerCase().trim()
                              );
                              if (matchedKey && row[matchedKey]) return String(row[matchedKey]).trim();
                          }
                          return '';
                      };
                      
                      const foremanData = {
                          name: getColumnValue([
                              t.foremanName,
                              'Foreman Name',
                              'foreman_name',
                              'Foreman',
                              'اسم المراقب',
                              'Name'
                          ]),
                          iqama: getColumnValue([
                              t.foremanIqama,
                              "Foreman's Iqama",
                              'foreman_iqama',
                              'Iqama',
                              'إقامة المراقب',
                              'Foreman Iqama'
                          ]),
                          empId: getColumnValue([
                              t.foremanEmpId,
                              "Foreman's Employee ID",
                              'foreman_empid',
                              'Employee ID',
                              'معرف الموظف للمراقب',
                              'EmpID',
                              'ID'
                          ]),
                          idNumber: getColumnValue([
                              t.thDriverIdNumber,
                              'ID Number',
                              'Driver ID Number',
                              'id_number',
                              'Foreman ID Number',
                              'foreman_id_number',
                              'رقم الهوية',
                              'Identity Number'
                          ]),
                      };
                      
                      const supervisorName = getColumnValue([
                          t.supervisorName,
                          'Supervisor',
                          'Assigned Supervisor',
                          'supervisor_name',
                          'المشرف',
                          'Supervisor Name'
                      ]) || 'Default Supervisor';
                      
                      console.log(`🔍 FOREMEN DEBUG - Row ${index}:`, {
                          foremanData,
                          supervisorName,
                          isValid: foremanData.name && foremanData.name.length > 0,
                          availableColumns: Object.keys(row)
                      });
                      
                      // Less strict validation - only require name
                      return (foremanData.name && foremanData.name.length > 0) ? { foremanData, supervisorName } : null;
                  }).filter(Boolean) as { foremanData: Omit<Foreman, 'id'|'labours'>, supervisorName: string }[];
                  
                  // Add entire batch at once to prevent race conditions
                  console.log(`👷 Adding batch of ${validForemen.length} foremen out of ${batch.length} rows...`);
                  
                  if (validForemen.length > 0) {
                      console.log('🔍 FOREMEN DEBUG - Calling addForemenBatch with:', validForemen);
                      try {
                          const result = await fb.addForemenBatch(validForemen, activeId);
                          console.log('🔍 FOREMEN DEBUG - addForemenBatch result:', result);
                          
                          if (!result.success) {
                              console.error('❌ FOREMEN DEBUG - Batch import failed:', result.error);
                              throw new Error(result.error || 'Failed to import foremen batch');
                          }
                      } catch (batchError) {
                          console.error('❌ FOREMEN DEBUG - Error in addForemenBatch:', batchError);
                          throw batchError;
                      }
                  } else {
                      console.warn('⚠️ FOREMEN DEBUG - No valid foremen found in this batch!');
                  }
                  
                  // Update progress after this batch
                  if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + batch.length) / data.length) * 100));
                    try { onProgress(percent); } catch (e) { console.warn('onProgress callback error', e); }
                  }
                  
              } else if (type === 'labour') {
                  console.log(`🔍 LABOUR DEBUG - Processing labour batch ${Math.floor(i/batchSize) + 1}:`, batch.length, 'entries');
                  console.log(`🔍 LABOUR DEBUG - Translation keys:`, {
                      labourName: t.labourName,
                      labourIqama: t.labourIqama, 
                      labourEmpId: t.labourEmpId,
                      foremanName: t.foremanName,
                      supervisorName: t.supervisorName
                  });
                  console.log(`🔍 LABOUR DEBUG - Sample data:`, batch.slice(0, 2));
                  
                  // Enhanced column header matching for flexible imports
                  const validLabour = batch.map((row, index) => {
                      try {
                          console.log(`🔍 LABOUR DEBUG - Processing labour entry ${index + 1}:`, row);
                          
                          // Flexible column header matching
                          const labourData = {
                              name: String(
                                  row[t.labourName] || 
                                  row['name'] || row['Name'] || row['NAME'] ||
                                  row['Labour Name'] || row['labour_name'] ||
                                  row['Worker Name'] || row['worker_name'] || 
                                  ''
                              ).trim(),
                              iqama: String(
                                  row[t.labourIqama] || 
                                  row['iqama'] || row['Iqama'] || row['IQAMA'] ||
                                  row['Iqama Number'] || row['iqama_number'] ||
                                  row['ID Number'] || row['id_number'] || 
                                  row['Labour Iqama'] || row['labour_iqama'] ||
                                  row['Worker Iqama'] || row['worker_iqama'] ||
                                  row['إقامة العامل'] || row['رقم الإقامة'] ||
                                  ''
                              ).trim(),
                              empId: String(
                                  row[t.labourEmpId] || 
                                  row['empId'] || row['EmpId'] || row['EMPID'] ||
                                  row['Employee ID'] || row['employee_id'] ||
                                  row['Worker ID'] || row['worker_id'] || 
                                  row['Labour ID'] || row['labour_id'] ||
                                  row['Labour Employee ID'] || row['labour_employee_id'] ||
                                  row['معرف الموظف للعامل'] || row['رقم الهوية'] ||
                                  ''
                              ).trim(),
                              idNumber: String(
                                  row[t.thDriverIdNumber] || 
                                  row['ID Number'] || row['Driver ID Number'] ||
                                  row['id_number'] || row['Identity Number'] ||
                                  row['Labour ID Number'] || row['labour_id_number'] ||
                                  row['Worker ID Number'] || row['worker_id_number'] ||
                                  row['رقم الهوية'] || row['Identity'] ||
                                  ''
                              ).trim(),
                          };
                          
                          const foremanName = String(
                              row[t.foremanName] || 
                              row['foremanName'] || row['Foreman'] || row['FOREMAN'] ||
                              row['Assigned Foreman'] || row['assigned_foreman'] ||
                              row['Foreman Name'] || row['foreman_name'] ||
                              'Default Foreman'
                          ).trim();
                          
                          const supervisorName = String(
                              row[t.supervisorName] || 
                              row['supervisorName'] || row['Supervisor'] || row['SUPERVISOR'] ||
                              row['Assigned Supervisor'] || row['assigned_supervisor'] ||
                              row['Supervisor Name'] || row['supervisor_name'] ||
                              'Default Supervisor'
                          ).trim();
                          
                          console.log(`🔍 LABOUR DEBUG - Processed labour ${index + 1}:`, {
                              labourData,
                              foremanName,
                              supervisorName,
                              isValid: labourData.name && labourData.name.length > 0
                          });
                          
                          // Validate - require at least name
                          if (!labourData.name || labourData.name.length === 0) {
                              console.warn(`⚠️ Skipping labour entry ${index + 1} - missing name:`, row);
                              return null;
                          }
                          
                          return { labourData, foremanName, supervisorName };
                      } catch (error) {
                          console.error(`❌ Error processing labour entry ${index + 1}:`, error, row);
                          return null;
                      }
                  }).filter(Boolean) as { labourData: Omit<Labour, 'id'>, foremanName: string, supervisorName: string }[];
                  
                  console.log(`🔍 LABOUR DEBUG - Valid labour for batch:`, validLabour.length, 'out of', batch.length);
                  
                  if (validLabour.length > 0) {
                      // Add entire batch at once to prevent race conditions
                      console.log(`👷‍♂️ Adding batch of ${validLabour.length} labour...`);
                      const batchResult = await fb.addLabourBatch(validLabour, activeId);
                      console.log(`🔍 LABOUR DEBUG - Batch result:`, batchResult);
                      
                      if (batchResult.success) {
                          console.log(`✅ Successfully imported ${validLabour.length} labour entries`);
                      } else {
                          console.error(`❌ Failed to import labour batch:`, batchResult.error);
                      }
                  } else {
                      console.warn(`⚠️ LABOUR DEBUG - No valid labour entries found in this batch!`);
                  }
                  
                  // Update progress after this batch
                  if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + batch.length) / data.length) * 100));
                    try { onProgress(percent); } catch (e) { console.warn('onProgress callback error', e); }
                  }
                  
              } else if (type === 'supervisors') {
                  // FIXED: Use batch import to avoid race conditions
                  const getFlexColValue = (row: any, possibleKeys: string[]) => {
                      const keys = Object.keys(row);
                      for (const possibleKey of possibleKeys) {
                          if (possibleKey && row[possibleKey]) return String(row[possibleKey]).trim();
                          const matchedKey = keys.find(key => 
                              key && possibleKey && key.toLowerCase().trim() === possibleKey.toLowerCase().trim()
                          );
                          if (matchedKey && row[matchedKey]) return String(row[matchedKey]).trim();
                      }
                      return '';
                  };

                  const validSupervisors = batch.map((row) => {
                      const name = getFlexColValue(row, [
                          t.supervisorName, TRANSLATIONS.en.supervisorName, TRANSLATIONS.ar.supervisorName,
                          'Supervisor', 'Supervisor Name', 'Name', 'اسم المشرف', 'المشرف', 'الاسم'
                      ]);
                      const iqama = getFlexColValue(row, [
                          t.supervisorIqama, TRANSLATIONS.en.supervisorIqama, TRANSLATIONS.ar.supervisorIqama,
                          "Supervisor's Iqama Number", 'Iqama Number', 'Iqama', 'رقم الإقامة', 'رقم الاقامة', 'الإقامة'
                      ]);
                      const empId = getFlexColValue(row, [
                          t.supervisorEmpId, TRANSLATIONS.en.supervisorEmpId, TRANSLATIONS.ar.supervisorEmpId,
                          'Employee ID', 'EmpID', 'ID Number', 'رقم الموظف', 'الرقم الوظيفي'
                      ]);
                      const idNumber = getFlexColValue(row, [
                          t.thDriverIdNumber, TRANSLATIONS.en.thDriverIdNumber, TRANSLATIONS.ar.thDriverIdNumber,
                          'Supervisor ID Number', 'ID Number', 'Identity Number', 'رقم الهوية', 'رقم الهويه'
                      ]);
                      const area = getFlexColValue(row, [
                          t.assignedAreaName, TRANSLATIONS.en.assignedAreaName, TRANSLATIONS.ar.assignedAreaName,
                          'Assigned Area Name', 'Assigned Area', 'Area', 'المنطقة', 'منطقة العمل', 'الموقع'
                      ]);
                      const mobile = getFlexColValue(row, [
                          t.supervisorMobile, TRANSLATIONS.en.supervisorMobile, TRANSLATIONS.ar.supervisorMobile,
                          "Supervisor's Mobile Number", 'Mobile', 'Mobile Number', 'Phone', 'الجوال', 'رقم الجوال'
                      ]).replace('+966', '').trim();

                      const supervisorData: Omit<Supervisor, 'id' | 'userId'> = {
                          name,
                          iqama,
                          empId,
                          idNumber,
                          area,
                          mobile,
                          foremen: [] // Start with empty foremen array
                      };
                      
                      // More flexible validation - only require name and iqama
                      if (!supervisorData.name && !supervisorData.iqama) {
                          console.warn('⚠️ Skipping supervisor row - missing both name and iqama:', row);
                          return null;
                      }
                      
                      console.log('📝 Valid supervisor:', {
                          name: supervisorData.name,
                          iqama: supervisorData.iqama,
                          empId: supervisorData.empId,
                          area: supervisorData.area,
                          mobile: supervisorData.mobile
                      });
                      
                      return supervisorData;
                  }).filter(Boolean) as Omit<Supervisor, 'id' | 'userId'>[];
                  
                  // Add entire batch at once to prevent race conditions
                  console.log(`👷‍♂️ Adding batch of ${validSupervisors.length} supervisors...`);
                  await fb.addSupervisorsBatch(validSupervisors, activeId);
                  
                  // Update progress after this batch
                  if (onProgress) {
                    const percent = Math.min(100, Math.round(((i + batch.length) / data.length) * 100));
                    try { onProgress(percent); } catch (e) { console.warn('onProgress callback error', e); }
                  }
              }
              
              // Optimized: Much shorter delay between batches for faster processing
              if (i + batchSize < data.length) {
                  console.log(`⚡ Quick pause: ${delayBetweenBatches}ms before next batch...`);
                  await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
              }
          }
        }
          
          console.log(`🚀 FAST import completed successfully: ${data.length} ${type} entries processed`);
          
          // Add a small delay to ensure all Firebase writes are complete
          console.log('⏳ Waiting for Firebase writes to complete...');
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          await refreshActiveUserData();
          
          // Force a second refresh after another delay to ensure data consistency
          console.log('🔄 Performing second data refresh...');
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshActiveUserData();
          
          return { success: true };
      } catch (e) {
          console.error("❌ Import error:", e);
          const message = e instanceof Error ? e.message : 'Unknown import error.';
          return { success: false, error: message };
      }
  }, [lang, getActiveUserId, handleAddMenpowerEntry, currentUser, viewingProjectAsAdmin, refreshActiveUserData]);


  // --- Page Navigation ---
  const handleNavigate = useCallback((page: Page) => {
    if (editingSupervisorId) {
        setEditingSupervisorId(null);
    }
    if (page === 'viewVehicleDetails') {
      console.warn("Direct navigation to viewVehicleDetails is deprecated. Select a vehicle from the list.");
      return;
    }
    setCurrentPage(page);

    // Dynamically refresh live data when navigating to ensure statistics are 100% updated
    const activeId = getActiveUserId();
    if (page === 'dashboard' && activeId) {
      fetchDataForCurrentUser(activeId);
    }
    if (page === 'adminDashboard' || page.startsWith('adminAll')) {
      fetchDataForAdmin();
    }
  }, [editingSupervisorId, getActiveUserId, fetchDataForCurrentUser, fetchDataForAdmin]);
  
  const handleViewVehicleDetails = useCallback((vehicleId: string) => {
    setSelectedVehicleId(vehicleId);
    setCurrentPage('viewVehicleDetails');
  }, []);
  
  const handleEditSupervisor = useCallback((supervisorId: string) => {
      setEditingSupervisorId(supervisorId);
      setCurrentPage('addMenpower');
  }, []);

  // --- ChatBot Handlers ---
  const handleToggleChatBot = useCallback(() => {
    setIsChatBotOpen(prev => !prev);
  }, []);

  const handleCloseChatBot = useCallback(() => {
    setIsChatBotOpen(false);
  }, []);

  const renderContent = () => {
    // Debug logging for page rendering
    console.log('🎯 renderContent called with:', {
      currentPage,
      isAdmin: currentUser?.isAdmin,
      allUsersCount: allUsers.length,
      allProjectDataKeys: Object.keys(allProjectData),
      viewingProjectAsAdmin: viewingProjectAsAdmin?.email || null
    });

    const activeProjectData = (currentUser?.isAdmin && viewingProjectAsAdmin && allProjectData[viewingProjectAsAdmin.email])
        ? allProjectData[viewingProjectAsAdmin.email]
        : projectData;
    const activeProjectName = viewingProjectAsAdmin?.projectName || currentUser?.projectName || '';
    
    // Debug for Sharq project
    if (currentUser?.email === 'zahran@sharq.project') {
      console.log('🎯 SHARQ PROJECT DEBUG:');
      console.log('👤 Current User:', currentUser);
      console.log('🔧 Is Admin:', currentUser?.isAdmin);
      console.log('👁️ Viewing Project As Admin:', viewingProjectAsAdmin);
      console.log('📊 Project Data (user specific):', projectData);
      console.log('📊 Active Project Data (final):', activeProjectData);
      console.log('🚗 Vehicles count:', activeProjectData?.vehicles?.length || 0);
    }
    
    // Additional debug for vehicle import issue
    console.log('🚗 VEHICLE DEBUG - Current state:');
    console.log('- projectData vehicles count:', projectData?.vehicles?.length || 0);
    console.log('- activeProjectData vehicles count:', activeProjectData?.vehicles?.length || 0);
    console.log('- First 3 vehicles in projectData:', projectData?.vehicles?.slice(0, 3)?.map(v => ({ id: v.id, doorNumber: v.doorNumber })) || []);
    console.log('- First 3 vehicles in activeProjectData:', activeProjectData?.vehicles?.slice(0, 3)?.map(v => ({ id: v.id, doorNumber: v.doorNumber })) || []);
    
    const isReadOnlyView = currentUser?.isAdmin && viewingProjectAsAdmin !== null;

    if (!currentUser) return null; // Should be handled by AuthPage redirect, but good practice

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard 
                    lang={lang} 
                    projectData={activeProjectData}
                    projectName={activeProjectName} 
                    onBulkUpdateVehicleServiceType={handleBulkUpdateVehicleServiceType}
                    onNavigate={handleNavigate}
                />;
      case 'addVehicle':
        return <AddVehicleForm lang={lang} onAddVehicle={handleAddVehicle} defaultProjectSite={activeProjectName} />;
      case 'viewVehicles':
        return <ViewVehiclesPage lang={lang} vehicles={activeProjectData.vehicles} onUpdateVehicle={handleUpdateVehicle} onDeleteVehicle={handleDeleteVehicle} onDeleteSelectedVehicles={handleDeleteSelectedVehicles} onViewDetails={handleViewVehicleDetails} onImportVehicles={(data, onProgress) => handleImport('vehicles', data, onProgress)} isReadOnly={isReadOnlyView} />;
      case 'viewVehicleDetails':
        return <VehicleDetailsPage lang={lang} vehicles={activeProjectData.vehicles} drivers={activeProjectData.drivers} selectedVehicleId={selectedVehicleId} />;
      case 'addDriver':
        return <AddDriverForm lang={lang} onAddDriver={handleAddDriver} vehicles={activeProjectData.vehicles} drivers={activeProjectData.drivers} />;
      case 'viewDrivers':
        console.log('🚗 Driver Debug - Current drivers data:', {
          driversCount: activeProjectData.drivers.length,
          firstDriver: activeProjectData.drivers[0] ? {
            id: activeProjectData.drivers[0].id,
            name: activeProjectData.drivers[0].driverName,
            idNumber: activeProjectData.drivers[0].driverIdNumber,
            hasIdNumber: !!activeProjectData.drivers[0].driverIdNumber,
            allFields: Object.keys(activeProjectData.drivers[0])
          } : 'No drivers'
        });
        return <ViewDriversPage lang={lang} drivers={activeProjectData.drivers} vehicles={allVehiclesForLookup} onUpdateDriver={handleUpdateDriver} onDeleteDriver={handleDeleteDriver} onDeleteSelectedDrivers={handleDeleteSelectedDrivers} onImportDrivers={(data, onProgress) => handleImport('drivers', data, onProgress)} isReadOnly={isReadOnlyView} />;
      case 'reportIncident':
        return <ReportIncidentForm lang={lang} vehicles={activeProjectData.vehicles} drivers={activeProjectData.drivers} onAddIncident={handleAddIncident} />;
      case 'vehicleHistory':
        return <ReportsPage lang={lang} vehicles={activeProjectData.vehicles} incidents={activeProjectData.incidents} repairHistory={activeProjectData.repairHistory} transfers={activeProjectData.transfers} drivers={activeProjectData.drivers} onMarkVehicleActive={handleMarkVehicleActive} onDismissIncident={handleDismissIncident} onDismissSelectedRepairHistories={handleDismissSelectedRepairHistories} onBulkDeleteHistory={handleBulkDeleteHistory} onDeleteSelectedVehicles={handleDeleteSelectedVehicles} />;
      case 'transferVehicle':
        return <TransferVehiclePage lang={lang} vehicles={activeProjectData.vehicles} allVehiclesForLookup={allVehiclesForLookup} transfers={activeProjectData.transfers} notifications={activeProjectData.notifications} allUsers={allUsers} currentUser={currentUser} onTransfer={handleTransferVehicle} onAddNotification={handleAddNotification} onDeleteTransfer={handleDeleteTransfer} onReturn={handleReturnVehicle} isReadOnly={isReadOnlyView} />;
      case 'settings':
        return <SettingsPage lang={lang} onLanguageChange={handleLanguageChange} theme={theme} onThemeChange={handleThemeChange} currentUser={currentUser} />;
      case 'adminDashboard':
        return <AdminDashboard lang={lang} allUsers={allUsers} allProjectData={allProjectData} allAdminNotifications={allAdminNotifications} onDismissNotification={handleDismissNotification} onClearAllNotifications={handleClearAllNotifications} onNavigate={handleNavigate} />;
      case 'adminAllProjects':
        console.log('🏢 adminAllProjects case triggered with allUsers:', allUsers.length);
        return <AdminAllProjectsPage lang={lang} allUsers={allUsers} onViewProjectDashboard={handleAdminViewProject} />;
      case 'adminAllVehicles':
          return <AdminAllVehiclesPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} />;
      case 'adminAllIncidents':
          return <AdminAllIncidentsPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} onViewProjectVehicleHistory={handleAdminViewProjectVehicleHistory} />;
      case 'adminTransferLog':
          return <AdminTransferLogPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} allTransfers={allTransfers} />;
      case 'adminAllDrivers':
          return <AdminAllDriversPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} />;
      case 'adminAllMenpower':
          return <AdminAllMenpowerPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} onViewProjectMenpower={handleAdminViewProjectMenpower} initialTab="supervisors" />;
      case 'adminAllForemen':
          return <AdminAllMenpowerPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} onViewProjectMenpower={handleAdminViewProjectMenpower} initialTab="foremen" />;
      case 'adminAllLabour':
          return <AdminAllMenpowerPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} onViewProjectMenpower={handleAdminViewProjectMenpower} initialTab="labour" />;
      case 'adminAllMenpowerReport':
          return <AdminAllMenpowerReportPage lang={lang} allUsers={allUsers} allProjectData={allProjectData} onViewProjectMenpower={handleAdminViewProjectMenpower} />;
      case 'addMenpower':
        const supervisorToEdit = editingSupervisorId ? activeProjectData.supervisors.find(s => s.id === editingSupervisorId) : null;
        return <AddMenpowerPage 
                    lang={lang} 
                    onAddManPowerEntry={handleAddMenpowerEntry} 
                    projectData={activeProjectData}
                    supervisorToEdit={supervisorToEdit}
                    onUpdateSupervisor={handleUpdateSupervisor}
                    onNavigate={handleNavigate}
                />;
      case 'menpowerOverview':
        return <MenpowerOverviewPage 
                    lang={lang} 
                    projectData={activeProjectData} 
                    onNavigate={handleNavigate}
                    onImportForemen={(data, onProgress) => handleImport('foremen', data, onProgress)}
                    onImportLabour={(data, onProgress) => handleImport('labour', data, onProgress)}
                    onDeleteSelectedForemen={handleDeleteSelectedForemen}
                    onDeleteSelectedLabour={handleDeleteSelectedLabour}
                />;
      case 'viewSupervisors':
        return <ViewSupervisorsTablePage
                    lang={lang}
                    supervisors={activeProjectData.supervisors}
                    onUpdateSupervisor={handleUpdateSupervisor}
                    onDeleteSupervisor={handleDeleteSupervisor}
                    onDeleteSelectedSupervisors={handleDeleteSelectedSupervisors}
                    onImportSupervisors={(data, onProgress) => handleImport('supervisors', data, onProgress)}
                    onNavigate={setCurrentPage}
                    isReadOnly={isReadOnlyView}
                />;
      case 'manpowerSummary':
        return <ManpowerSummaryPage
                    lang={lang}
                    projectData={activeProjectData}
                    onNavigate={setCurrentPage}
                />;
      case 'viewProjectOfficers':
        return <ViewProjectOfficersPage 
                  lang={lang} 
                  projectOfficers={activeProjectData.projectOfficers} 
                  onUpdateProjectOfficer={handleUpdateProjectOfficer}
                  onDeleteProjectOfficer={handleDeleteProjectOfficer}
                  onDeleteSelectedProjectOfficers={handleDeleteSelectedProjectOfficers}
                  onImportProjectOfficers={(data, onProgress) => handleImport('projectOfficers', data, onProgress)}
                  isReadOnly={isReadOnlyView}
                />;
      case 'viewCrewmen':
        return <ViewCrewmenPage
                  lang={lang}
                  crewmen={activeProjectData.crewmen}
                  onUpdateLabour={(l) => handleUpdateLabour(l, 'crewman')}
                  onDeleteLabour={(id) => handleDeleteLabour(id, 'crewman')}
                  onDeleteSelectedCrewmen={(ids) => handleDeleteSelectedLabours(ids, 'crewman')}
                  onImportCrewmen={(data) => handleImport('crewmen', data)}
                  isReadOnly={isReadOnlyView}
                />;
      case 'viewCampLabours':
        return <ViewCampLaboursPage
                  lang={lang}
                  campLabours={activeProjectData.campLabours}
                  onUpdateLabour={(l) => handleUpdateLabour(l, 'campLabour')}
                  onDeleteLabour={(id) => handleDeleteLabour(id, 'campLabour')}
                  onDeleteSelectedCampLabours={(ids) => handleDeleteSelectedLabours(ids, 'campLabour')}
                  onImportCampLabours={(data) => handleImport('campLabours', data)}
                  isReadOnly={isReadOnlyView}
                />;
      case 'dynamicJson':
        return <DynamicJsonLoader
                  lang={lang}
                  currentUser={currentUser}
                  onStructureUpdate={handleDynamicStructureUpdate}
                />;
      case 'manpowerAssign':
        return <ManpowerAssignPage 
                  lang={lang}
                  projectData={activeProjectData}
                  onSaveAssignments={handleSaveManpowerAssignments}
                  isReadOnly={isReadOnlyView}
                />;
      case 'allForemen':
        return <ViewAllForemenPage 
                  onBack={() => handleNavigate('dashboard')} 
                  lang={lang}
                  onImportForemen={(data, onProgress) => handleImport('foremen', data, onProgress)}
                  onDeleteSelectedForemen={handleDeleteSelectedForemen}
                />;
      case 'allLabour':
        return <ViewAllLabourPage 
                  onBack={() => handleNavigate('dashboard')} 
                  lang={lang}
                  onImportLabour={(data, onProgress) => handleImport('labour', data, onProgress)}
                  onDeleteSelectedLabour={handleDeleteSelectedLabour}
                />;
      default:
        return <Dashboard 
                    lang={lang} 
                    projectData={activeProjectData}
                    projectName={activeProjectName} 
                    onBulkUpdateVehicleServiceType={handleBulkUpdateVehicleServiceType}
                    onNavigate={handleNavigate}
                />;
    }
  };

  if (isLoading) {
    return <div className="min-h-screen bg-orange-500 flex items-center justify-center"><div className="text-xl text-white font-bold">Loading...</div></div>;
  }
  
  if (!currentUser) {
    return <AuthPage onLogin={handleLogin} onSignUp={handleSignUp} lang={lang} onLanguageChange={handleLanguageChange} />;
  }
  
  if (showWelcome) {
    return (
      <WelcomePage 
        user={currentUser} 
        lang={lang} 
        onLanguageChange={handleLanguageChange}
        onNavigate={(page) => {
          sessionStorage.setItem('zahran_has_entered', 'true');
          setShowWelcome(false);
          handleNavigate(page);
        }}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className={`h-full min-h-screen max-h-screen w-full overflow-hidden bg-gradient-to-br from-orange-100 via-orange-50 to-green-100 font-sans flex flex-col ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
        <Header 
            lang={lang} 
            onToggleSidebar={handleToggleSidebar} 
            isViewingProjectAsAdmin={viewingProjectAsAdmin !== null}
            projectName={viewingProjectAsAdmin?.projectName || ''}
            onReturnToAdminDashboard={handleReturnToAdminDashboard}
            onGoToPortal={() => setShowWelcome(true)}
        />
        <div className="flex flex-1 overflow-hidden h-full">
            <Sidebar 
                currentPage={currentPage} 
                onNavigate={handleNavigate}
                currentLang={lang}
                onLogout={handleLogout}
                isAdmin={currentUser.isAdmin || false}
                isViewingProject={viewingProjectAsAdmin !== null}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={handleToggleSidebar}
            />
            <main className="flex-1 overflow-y-auto bg-gradient-to-br from-orange-50 via-orange-25 to-green-50 p-3 sm:p-5 lg:p-6">
              <div className="w-full">
                {renderContent()}
              </div>
            </main>
        </div>
        
        {/* Floating AI Chat Button */}
        <button
          onClick={handleToggleChatBot}
          className={`fixed bottom-6 w-16 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-full shadow-2xl hover:shadow-orange-500/50 transition-all duration-300 transform hover:scale-110 z-50 flex items-center justify-center group ${
            lang === 'ar' ? 'left-6' : 'right-6'
          }`}
          title={lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
          style={{
            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
            boxShadow: '0 8px 32px rgba(249, 115, 22, 0.4), 0 4px 16px rgba(0, 0, 0, 0.1)'
          }}
        >
          <i className="fas fa-robot text-xl group-hover:animate-pulse"></i>
          
          {/* Floating label - positioned based on language direction */}
          <div className={`absolute bg-gray-800 text-white px-3 py-1 rounded-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap pointer-events-none ${
            lang === 'ar' ? 'left-full ml-3' : 'right-full mr-3'
          }`}>
            {lang === 'ar' ? 'المساعد الذكي' : 'AI Assistant'}
            <div className={`absolute top-1/2 w-2 h-2 bg-gray-800 rotate-45 transform -translate-y-1/2 ${
              lang === 'ar' ? '-left-1' : '-right-1'
            }`}></div>
          </div>
          
          {/* Pulsing ring animation */}
          <div className="absolute inset-0 rounded-full border-2 border-orange-400 animate-ping opacity-30"></div>
        </button>
        
        {/* ChatBot Component */}
        <ChatBot 
          lang={lang} 
          isOpen={isChatBotOpen} 
          onClose={handleCloseChatBot} 
        />
    </div>
  );
};

export default App;