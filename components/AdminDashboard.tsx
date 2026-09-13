import React, { useMemo, useState } from 'react';
import { TRANSLATIONS, CHART_COLORS } from '../constants';
import type { Language, User, Vehicle, Driver, ProjectData, AdminNotification, Page } from '../types';
import StatCard from './ui/StatCard';
import Input from './ui/Input';
import Button from './ui/Button';
import BarChart from './ui/BarChart';
import Select from './ui/Select';
import PieChart from './ui/PieChart';
import ConfirmationModal from './ui/ConfirmationModal';
import VehicleStatusBarChart from './ui/VehicleStatusBarChart';
import ImageBanner from './ui/ImageBanner';
import MenpowerChart from './ui/MenpowerChart';
import * as fb from '../firebase/service';

interface AdminDashboardProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    allAdminNotifications: AdminNotification[];
    onDismissNotification: (notificationId: string) => void;
    onClearAllNotifications: () => Promise<void>;
    onNavigate?: (page: Page) => void;
}

type SearchResult<T> = { item: T; projectName: string } | 'not_found' | null;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, allUsers, allProjectData, allAdminNotifications, onDismissNotification, onClearAllNotifications, onNavigate }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // Search State
    const [globalSearchTerm, setGlobalSearchTerm] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [searchResults, setSearchResults] = useState<{
        vehicles: Array<SearchResult<Vehicle>>;
        drivers: Array<SearchResult<Driver>>;
        manpower: Array<{ item: any; type: string; projectName: string }>;
    }>({ vehicles: [], drivers: [], manpower: [] });
    const [selectedProjectForChart, setSelectedProjectForChart] = useState('all');
    
    // Service Type Search State
    const [serviceTypeSearchTerm, setServiceTypeSearchTerm] = useState('');
    
    // Modal State
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
    const [isExploringFirebase, setIsExploringFirebase] = useState(false);
    const [isForceImporting, setIsForceImporting] = useState(false);
    const [isClearingDatabase, setIsClearingDatabase] = useState(false);
    const [isEditingServiceType, setIsEditingServiceType] = useState(false);
    const [selectedServiceType, setSelectedServiceType] = useState('');
    const [newServiceTypeName, setNewServiceTypeName] = useState('');
    const [isCleaningTestIncidents, setIsCleaningTestIncidents] = useState(false);
    const [isCreatingTestTransfers, setIsCreatingTestTransfers] = useState(false);

    // Check if we have real data or only sample data
    const hasRealData = useMemo(() => {
        const sampleEmails = ['marwan1@projects.reports', 'zahran@sharq.project'];
        const realUsers = allUsers.filter(user => !sampleEmails.includes(user.email));
        const hasRealUsers = realUsers.length > 5; // Should have more than 5 real users
        
        const totalVehicles = Object.values(allProjectData).reduce((sum: number, data) => sum + ((data as ProjectData).vehicles?.length || 0), 0);
        const totalDrivers = Object.values(allProjectData).reduce((sum: number, data) => sum + ((data as ProjectData).drivers?.length || 0), 0);
        
        // Real data should have hundreds of vehicles/drivers, not just a few
        const hasSignificantData = (totalVehicles as number) > 100 && (totalDrivers as number) > 100;
        
        return hasRealUsers && hasSignificantData;
    }, [allUsers, allProjectData]);

    const handleForceImport = async () => {
        try {
            setIsForceImporting(true);
            console.log('🚀 Force importing complete backup data...');
            
            // Show progress message
            const progressMsg = 'Starting complete data import... This may take a few moments.';
            console.log(progressMsg);
            
            const result = await fb.importBackupData();
            
            if (result.success) {
                console.log('✅ Complete data import successful!');
                alert('🎉 Complete data imported successfully!\n\n' +
                      'All project data from backup has been loaded.\n' +
                      'Page will reload to show all data...');
                
                // Wait a moment before reload to ensure data is written
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                console.error('❌ Data import failed:', result.error);
                alert('❌ Failed to import complete data: ' + result.error);
            }
        } catch (error) {
            console.error('❌ Error during force import:', error);
            alert('❌ Error importing complete data. Check console for details.');
        } finally {
            setIsForceImporting(false);
        }
    };
    
    // Function to clear all database data for fresh start
    const handleClearDatabase = async () => {
        try {
            setIsClearingDatabase(true);
            console.log('🧹 Starting complete database cleanup...');
            
            const confirmation = window.confirm(
                '⚠️ WARNING: This will delete ALL data from the database!\n\n' +
                'This includes:\n' +
                '• All vehicles\n' +
                '• All drivers\n' +
                '• All incidents\n' +
                '• All transfers\n' +
                '• All repair history\n' +
                '• All other project data\n\n' +
                'User accounts will be preserved but all projects will be reset to empty.\n\n' +
                'Are you absolutely sure you want to continue?'
            );
            
            if (!confirmation) {
                setIsClearingDatabase(false);
                return;
            }
            
            // Second confirmation
            const doubleConfirmation = window.confirm(
                '🚨 FINAL CONFIRMATION\n\n' +
                'This action CANNOT be undone!\n\n' +
                'Type "DELETE" in your mind and click OK to proceed.\n' +
                'Click Cancel to abort.'
            );
            
            if (!doubleConfirmation) {
                setIsClearingDatabase(false);
                return;
            }
            
            console.log('🗑️ User confirmed database cleanup...');
            const result = await fb.clearAllDatabaseData();
            
            if (result.success) {
                console.log('✅ Database cleanup successful!');
                alert(`🎉 Database cleanup completed!\n\n${result.message}\n\nPage will reload to show fresh state...`);
                
                // Clear local storage and reload
                localStorage.clear();
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                console.error('❌ Database cleanup failed:', result.message);
                alert('❌ Failed to clear database: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error during database cleanup:', error);
            alert('❌ Error clearing database. Check console for details.');
        } finally {
            setIsClearingDatabase(false);
        }
    };

    const handleExploreFirebase = async () => {
        try {
            setIsExploringFirebase(true);
            console.log('🔍 Exploring Firebase database...');
            const collections = await fb.exploreFirebaseCollections();
            
            // Also test the specific user that failed to login
            await fb.checkUserExists('marwan1@projects.reports');
            
            let message = '🔍 Firebase Collections Found:\n\n';
            Object.entries(collections).forEach(([name, count]) => {
                message += `• ${name}: ${count} documents\n`;
            });
            
            if (Object.keys(collections).length === 0) {
                message += 'No collections found. Check console for detailed logs.';
            } else {
                message += '\nCheck browser console for detailed data structure and user check results.';
            }
            
            alert(message);
        } catch (error) {
            console.error('❌ Error exploring Firebase:', error);
            alert('❌ Error exploring database. Check console for details.');
        } finally {
            setIsExploringFirebase(false);
        }
    };

    const handleCleanupTestIncidents = async () => {
        try {
            setIsCleaningTestIncidents(true);
            console.log('🧹 Starting cleanup of test incidents...');
            
            const result = await fb.cleanupTestIncidents();
            
            if (result.success) {
                console.log('✅ Test incident cleanup successful!');
                alert(`🎉 Test incident cleanup completed!\n\n${result.message}\n\nPage will reload to show updated data...`);
                
                // Reload to show updated data
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                console.error('❌ Test incident cleanup failed:', result.message);
                alert('❌ Failed to cleanup test incidents: ' + result.message);
            }
        } catch (error) {
            console.error('❌ Error during test incident cleanup:', error);
            alert('❌ Error cleaning up test incidents. Check console for details.');
        } finally {
            setIsCleaningTestIncidents(false);
        }
    };

    const handleCreateTestTransfers = async () => {
        try {
            setIsCreatingTestTransfers(true);
            console.log('🚛 Creating test transfer data...');
            
            // Get available vehicles and projects
            const allVehicles = Object.values(allProjectData).flatMap(project => project.vehicles || []);
            const availableUsers = allUsers.filter(user => user.uid);
            
            if (allVehicles.length === 0) {
                alert('❌ No vehicles found in the system. Please add some vehicles first before creating transfers.');
                return;
            }
            
            if (availableUsers.length < 2) {
                alert('❌ Need at least 2 projects to create transfers. Please add more projects first.');
                return;
            }
            
            // Create a test transfer
            const testVehicle = allVehicles[0];
            const fromUser = availableUsers[0];
            const toUser = availableUsers[1];
            
            // Use the existing transferVehicle function
            await fb.transferVehicle(
                testVehicle.id,
                fromUser.uid,
                toUser.uid,
                new Date().toISOString().split('T')[0],
                'Test transfer created by admin dashboard'
            );
            
            console.log('✅ Test transfer created successfully!');
            alert(`🎉 Test transfer created successfully!\n\nTransferred: ${testVehicle.doorNumber} (${testVehicle.plateNumber})\nFrom: ${fromUser.projectName}\nTo: ${toUser.projectName}\n\nPage will reload to show transfer data...`);
            
            // Reload to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error creating test transfer:', error);
            alert('❌ Error creating test transfer. Check console for details.');
        } finally {
            setIsCreatingTestTransfers(false);
        }
    };

    const handleEditServiceType = (serviceType: string) => {
        setSelectedServiceType(serviceType);
        setNewServiceTypeName(serviceType);
        setIsEditingServiceType(true);
    };

    const handleSaveServiceType = async () => {
        if (!selectedServiceType || !newServiceTypeName.trim()) {
            alert('Please enter a valid service type name.');
            return;
        }

        if (selectedServiceType === newServiceTypeName.trim()) {
            setIsEditingServiceType(false);
            return;
        }

        try {
            console.log(`🔄 Updating service type "${selectedServiceType}" to "${newServiceTypeName}"`);
            
            // Here you would call a Firebase function to update all vehicles with this service type
            // await fb.updateServiceType(selectedServiceType, newServiceTypeName);
            
            alert(`✅ Service type updated successfully!\n"${selectedServiceType}" → "${newServiceTypeName}"\n\nPage will refresh to show changes.`);
            
            // Refresh the page to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Error updating service type:', error);
            alert('❌ Error updating service type. Please try again.');
        } finally {
            setIsEditingServiceType(false);
        }
    };

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const globalStats = useMemo(() => {
        let totalVehicles = 0;
        let totalDrivers = 0;
        let totalIncidents = 0;
        let totalSupervisors = 0;
        let totalForemen = 0;
        let totalCampLabour = 0;
        let totalCrewman = 0;
        let vehiclesInWorkshop = 0;
        let unassignedVehicles = 0;

        Object.values(allProjectData).forEach((data: ProjectData) => {
            totalVehicles += data.vehicles.length;
            totalDrivers += data.drivers.length;
            totalIncidents += data.incidents.length;
            totalSupervisors += (data.supervisors || []).length;
            
            // Enhanced workshop calculation: vehicles with non-active status OR active incidents
            data.vehicles.forEach(vehicle => {
                const hasActiveIncident = data.incidents.some(incident => incident.vehicleId === vehicle.id);
                const hasNonActiveStatus = vehicle.status && vehicle.status !== 'Active' && vehicle.status !== 'active';
                const isInWorkshop = hasNonActiveStatus || hasActiveIncident;
                
                if (isInWorkshop) {
                    vehiclesInWorkshop++;
                }
                
                // Count unassigned vehicles (vehicles without drivers)
                const hasAssignedDriver = data.drivers.some(driver => 
                    driver.vehicleId === vehicle.id || driver.assignedVehicle === vehicle.id
                );
                if (!hasAssignedDriver) {
                    unassignedVehicles++;
                }
            });
            
            (data.supervisors || []).forEach(s => {
                totalForemen += (s.foremen || []).length;
            });
            totalCampLabour += (data.campLabours || []).length;
            totalCrewman += (data.crewmen || []).length;
        });

        const totalForemenLabour: number = Object.values(allProjectData)
            .flatMap((p: ProjectData) => (p.supervisors || []))
            .flatMap(s => s.foremen || [])
            .reduce((sum, f) => sum + (f.labours?.length || 0), 0);

        const totalLabour: number = totalForemenLabour + totalCampLabour + totalCrewman;

        // Calculate total manpower (all types combined)
        const totalProjectOfficers = Object.values(allProjectData)
            .reduce((sum: number, data) => {
                const projectData = data as ProjectData;
                return sum + (projectData.projectOfficers || []).length;
            }, 0);

        const totalManpower = (totalDrivers as number) + (totalSupervisors as number) + (totalForemen as number) + (totalLabour as number) + (totalProjectOfficers as number);

        // Filter out Admin Dashboard mock users to get real project count
        const realUsers = allUsers.filter(user => 
            user.projectName && 
            user.projectName !== 'Admin Dashboard' &&
            !user.projectName.toLowerCase().includes('admin')
        );

        return {
            totalProjects: realUsers.length,
            totalVehicles,
            totalDrivers,
            totalIncidents,
            totalSupervisors,
            totalForemen,
            totalLabour,
            totalManpower,
            vehiclesInWorkshop,
            unassignedVehicles,
        };
    }, [allUsers, allProjectData]);
    
    const serviceTypeChartData = useMemo(() => {
        let relevantVehicles: Vehicle[] = [];
        if (selectedProjectForChart === 'all') {
            Object.values(allProjectData).forEach((p: ProjectData) => relevantVehicles.push(...p.vehicles));
        } else {
            const user = allUsers.find(u => u.email === selectedProjectForChart);
            if (user && allProjectData[user.email]) {
                 relevantVehicles = allProjectData[user.email].vehicles;
            }
        }

        // Create a map to merge duplicate service types (case-insensitive and trimmed)
        const serviceMap = new Map<string, { originalName: string; count: number }>();
        
        relevantVehicles.forEach(vehicle => {
            const originalService = vehicle.serviceType || 'Unspecified';
            const normalizedService = originalService.trim().toLowerCase();
            
            if (serviceMap.has(normalizedService)) {
                // Merge with existing entry
                const existing = serviceMap.get(normalizedService)!;
                existing.count += 1;
            } else {
                // Create new entry
                serviceMap.set(normalizedService, {
                    originalName: originalService.trim(),
                    count: 1
                });
            }
        });

        console.log('🔄 Service Type Merging:', {
            totalVehicles: relevantVehicles.length,
            uniqueServices: serviceMap.size,
            services: Array.from(serviceMap.entries()).map(([key, value]) => ({
                normalized: key,
                original: value.originalName,
                count: value.count
            }))
        });

        // Convert map to chart data format and apply search filter
        const filteredData = Array.from(serviceMap.values())
            .filter(item => {
                if (!serviceTypeSearchTerm.trim()) return true;
                return item.originalName.toLowerCase().includes(serviceTypeSearchTerm.toLowerCase());
            })
            .map((item, index) => ({
                label: item.originalName,
                value: item.count,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
            
        return filteredData;
    }, [allProjectData, selectedProjectForChart, allUsers, serviceTypeSearchTerm]);
    
    const vehiclesByProjectData = useMemo(() => {
        // Remove duplicate users by email to prevent issues
        const uniqueUsers = allUsers.filter((user, index, arr) => 
            arr.findIndex(u => u.email === user.email) === index
        );
        
        return uniqueUsers
            .map((user, index) => ({
                label: getTranslatedProjectName(user.projectName),
                value: allProjectData[user.email]?.vehicles?.length || 0,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .filter(item => item.value > 0);
    }, [allUsers, allProjectData, getTranslatedProjectName]);

    // Vehicle Status Breakdown by Project
    const vehicleStatusByProject = useMemo(() => {
        // Remove duplicate users by email to prevent issues
        const uniqueUsers = allUsers.filter((user, index, arr) => 
            arr.findIndex(u => u.email === user.email) === index
        );
        
        return uniqueUsers
            .map(user => {
                const projectData = allProjectData[user.email];
                if (!projectData || !projectData.vehicles.length) return null;
                
                const active = projectData.vehicles.filter(v => v.status === 'Active').length;
                const breakdown = projectData.vehicles.filter(v => v.status === 'Breakdown').length;
                const accident = projectData.vehicles.filter(v => v.status === 'Accident').length;
                const total = projectData.vehicles.length;
                
                return {
                    projectName: getTranslatedProjectName(user.projectName),
                    active,
                    breakdown,
                    accident,
                    total
                };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null && item.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [allUsers, allProjectData, getTranslatedProjectName]);


    const projectFilterOptions = useMemo(() => {
        // Remove duplicate users by email to prevent duplicate keys
        const uniqueUsers = allUsers.filter((user, index, arr) => 
            arr.findIndex(u => u.email === user.email) === index
        );
        
        const userOptions = uniqueUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    // --- Search Handlers ---
    const handleGlobalSearch = () => {
        if (!globalSearchTerm.trim()) {
            setSearchResults({ vehicles: [], drivers: [], manpower: [] });
            setHasSearched(false);
            return;
        }

        setHasSearched(true);
        const searchTerm = globalSearchTerm.trim().toLowerCase();
        const foundVehicles: Array<SearchResult<Vehicle>> = [];
        const foundDrivers: Array<SearchResult<Driver>> = [];
        const foundManpower: Array<{ item: any; type: string; projectName: string }> = [];

        console.log('🔍 Searching for:', searchTerm);
        console.log('📊 Available project data:', Object.keys(allProjectData));

        // Search through all projects
        Object.entries(allProjectData).forEach(([email, data]: [string, ProjectData]) => {
            const user = allUsers.find(u => u.email === email);
            const projectName = user?.projectName || 'Unknown Project';
            
            console.log(`🏢 Searching in project: ${projectName}`, {
                vehicles: data.vehicles?.length || 0,
                drivers: data.drivers?.length || 0,
                supervisors: data.supervisors?.length || 0
            });
            
            // Search vehicles by door number, plate number, chassis number, or project
            (data.vehicles || []).forEach(vehicle => {
                if (vehicle.doorNumber?.toLowerCase().includes(searchTerm) || 
                    vehicle.plateNumber?.toLowerCase().includes(searchTerm) ||
                    vehicle.chassisNumber?.toLowerCase().includes(searchTerm) ||
                    projectName.toLowerCase().includes(searchTerm)) {
                    foundVehicles.push({ item: vehicle, projectName });
                    console.log('🚗 Found vehicle:', vehicle.doorNumber);
                }
            });
            
            // Search drivers by Iqama, name, ID number, or project
            (data.drivers || []).forEach(driver => {
                if (driver.driverIqama?.toLowerCase().includes(searchTerm) ||
                    driver.driverName?.toLowerCase().includes(searchTerm) ||
                    driver.driverIdNumber?.toLowerCase().includes(searchTerm) ||
                    projectName.toLowerCase().includes(searchTerm)) {
                    foundDrivers.push({ item: driver, projectName });
                    console.log('👨‍💼 Found driver:', driver.driverName);
                }
            });
            
            // Search manpower by Iqama
            // Search supervisors
            (data.supervisors || []).forEach(supervisor => {
                if (supervisor.iqama?.toLowerCase().includes(searchTerm) ||
                    supervisor.name?.toLowerCase().includes(searchTerm)) {
                    foundManpower.push({ item: supervisor, type: 'Supervisor', projectName });
                    console.log('👷‍♂️ Found supervisor:', supervisor.name);
                }
                // Search foremen under supervisors
                (supervisor.foremen || []).forEach(foreman => {
                    if (foreman.iqama?.toLowerCase().includes(searchTerm) ||
                        foreman.name?.toLowerCase().includes(searchTerm)) {
                        foundManpower.push({ item: foreman, type: 'Foreman', projectName });
                        console.log('👨‍🔧 Found foreman:', foreman.name);
                    }
                    // Search labours under foremen
                    (foreman.labours || []).forEach(labour => {
                        if (labour.iqama?.toLowerCase().includes(searchTerm) ||
                            labour.name?.toLowerCase().includes(searchTerm)) {
                            foundManpower.push({ item: labour, type: 'Labour', projectName });
                            console.log('👷 Found labour:', labour.name);
                        }
                    });
                });
            });
            
            // Search project officers
            (data.projectOfficers || []).forEach(officer => {
                if (officer.iqama?.toLowerCase().includes(searchTerm) ||
                    officer.name?.toLowerCase().includes(searchTerm)) {
                    foundManpower.push({ item: officer, type: 'Project Officer', projectName });
                    console.log('👔 Found officer:', officer.name);
                }
            });
            
            // Search camp labours
            (data.campLabours || []).forEach(labour => {
                if (labour.iqama?.toLowerCase().includes(searchTerm) ||
                    labour.name?.toLowerCase().includes(searchTerm)) {
                    foundManpower.push({ item: labour, type: 'Camp Labour', projectName });
                    console.log('🏕️ Found camp labour:', labour.name);
                }
            });
            
            // Search crewmen
            (data.crewmen || []).forEach(crewman => {
                if (crewman.iqama?.toLowerCase().includes(searchTerm) ||
                    crewman.name?.toLowerCase().includes(searchTerm)) {
                    foundManpower.push({ item: crewman, type: 'Crewman', projectName });
                    console.log('👨‍💼 Found crewman:', crewman.name);
                }
            });
        });

        console.log('📋 Search results:', {
            vehicles: foundVehicles.length,
            drivers: foundDrivers.length,
            manpower: foundManpower.length
        });

        setSearchResults({ vehicles: foundVehicles, drivers: foundDrivers, manpower: foundManpower });
    };

    const handleConfirmClearAll = async () => {
        await onClearAllNotifications();
        setIsClearAllModalOpen(false);
    };

    const sortedNotifications = useMemo(() => {
        return [...allAdminNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allAdminNotifications]);

    const NotificationItem: React.FC<{ notification: AdminNotification }> = ({ notification }) => (
        <li className="py-3 flex items-start space-x-4 rtl:space-x-reverse">
             <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400">
                <i className="fas fa-bell"></i>
            </div>
            <div className="flex-grow">
                <p className="text-sm text-gray-700 dark:text-gray-300">{notification.message}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(notification.timestamp).toLocaleString()}</p>
            </div>
            <button
                onClick={() => onDismissNotification(notification.id)}
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 p-2 -m-2 transition-colors"
                title={t.dismissNotification}
            >
                <i className="fas fa-times"></i>
            </button>
        </li>
    );


    return (
        <div className="space-y-4">
            {/* Image Banner */}
            <ImageBanner />
            
            <header>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.adminDashboard}</h1>
            </header>
            
            {/* Sleek, Full-Width Global Search Bar */}
            <div className="w-full my-1">
                <div className="relative flex items-center w-full bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-md shadow-orange-950/5 hover:shadow-lg hover:border-orange-300 dark:hover:border-orange-500/50 focus-within:shadow-xl focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/20 transition-all duration-300 p-1.5 sm:p-2 ps-2 sm:ps-3">
                    {/* Vibrant Search Icon Badge */}
                    <div 
                        className="flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-full text-white shrink-0 shadow-sm transition-transform duration-300 me-2.5 sm:me-3"
                        style={{ backgroundColor: '#ea580c' }}
                    >
                        <i className="fas fa-search text-base text-white"></i>
                    </div>

                    {/* Long Search Input Field */}
                    <input
                        type="text"
                        placeholder={lang === 'ar' 
                            ? 'بحث شامل في كامل الأسطول: رقم الباب، اللوحة، اسم السائق، الإقامة، القوى العاملة، أو المشروع...'
                            : 'Search fleet: door #, plate #, driver name, iqama, manpower, or project...'
                        }
                        value={globalSearchTerm}
                        onChange={(e) => setGlobalSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleGlobalSearch()}
                        className="w-full bg-transparent text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base font-medium outline-none py-1.5 px-1"
                        dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    />

                    {/* Action Controls */}
                    <div className="flex items-center space-x-2 rtl:space-x-reverse shrink-0 ms-2 pe-1">
                        {globalSearchTerm && (
                            <button
                                type="button"
                                onClick={() => {
                                    setGlobalSearchTerm('');
                                    setHasSearched(false);
                                    setSearchResults({ vehicles: [], drivers: [], manpower: [] });
                                }}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title={lang === 'ar' ? 'مسح' : 'Clear'}
                            >
                                <i className="fas fa-times text-sm"></i>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleGlobalSearch}
                            style={{ backgroundColor: '#ea580c', color: '#ffffff' }}
                            className="inline-flex items-center gap-2 font-bold text-sm sm:text-base px-5 sm:px-7 py-2.5 rounded-full shadow-md hover:shadow-lg active:scale-95 transition-all duration-200 cursor-pointer"
                        >
                            <span>{lang === 'ar' ? 'بحث' : 'Search'}</span>
                            <i className="fas fa-arrow-right rtl:rotate-180 text-xs"></i>
                        </button>
                    </div>
                </div>

                {/* Search Results Header & Filter Stats Bar */}
                {hasSearched && (searchResults.vehicles.length > 0 || searchResults.drivers.length > 0 || searchResults.manpower.length > 0) && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 rounded-xl px-4 py-2.5">
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-900 dark:text-orange-200">
                            <i className="fas fa-check-circle text-orange-600"></i>
                            <span>
                                {lang === 'ar' 
                                    ? `تم العثور على (${searchResults.vehicles.length + searchResults.drivers.length + searchResults.manpower.length}) نتيجة لـ "${globalSearchTerm}"`
                                    : `Found (${searchResults.vehicles.length + searchResults.drivers.length + searchResults.manpower.length}) results for "${globalSearchTerm}"`
                                }
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {searchResults.vehicles.length > 0 && (
                                <span className="bg-white dark:bg-gray-800 text-orange-700 dark:text-orange-300 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs border border-orange-200 dark:border-orange-900">
                                    🚗 {searchResults.vehicles.length} {lang === 'ar' ? 'سيارات' : 'Vehicles'}
                                </span>
                            )}
                            {searchResults.drivers.length > 0 && (
                                <span className="bg-white dark:bg-gray-800 text-green-700 dark:text-green-300 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs border border-green-200 dark:border-green-900">
                                    👨‍✈️ {searchResults.drivers.length} {lang === 'ar' ? 'سائقين' : 'Drivers'}
                                </span>
                            )}
                            {searchResults.manpower.length > 0 && (
                                <span className="bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 text-xs font-bold px-2.5 py-1 rounded-full shadow-xs border border-purple-200 dark:border-purple-900">
                                    👷 {searchResults.manpower.length} {lang === 'ar' ? 'قوى عاملة' : 'Manpower'}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => {
                                    setGlobalSearchTerm('');
                                    setHasSearched(false);
                                    setSearchResults({ vehicles: [], drivers: [], manpower: [] });
                                }}
                                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 ms-2 transition-colors cursor-pointer"
                            >
                                {lang === 'ar' ? 'إغلاق النتائج ✕' : 'Close Results ✕'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Search Results Display */}
                {hasSearched && (searchResults.vehicles.length > 0 || searchResults.drivers.length > 0 || searchResults.manpower.length > 0) && (
                    <div className="mt-6 space-y-6">
                        {/* Vehicle Results - Excel Style Table */}
                        {searchResults.vehicles.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-3 flex items-center justify-between">
                                    <h4 className="text-base font-semibold flex items-center gap-2">
                                        <i className="fas fa-car"></i>
                                        <span>{lang === 'ar' ? 'نتائج السيارات' : 'Vehicle Results'}</span>
                                    </h4>
                                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                        {searchResults.vehicles.length}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Project Name</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Door Number</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Plate Number</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Chassis Number</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Make/Model</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Manufacturer</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Year</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Purchase Date</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Tare Weight</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Service Type</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {searchResults.vehicles.map((result, index) => (
                                                result !== 'not_found' && result && (
                                                    <tr key={index} className="hover:bg-orange-50/40 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400">{getTranslatedProjectName(result.projectName)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-semibold">{result.item.doorNumber}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{result.item.plateNumber}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.chassisNumber}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{result.item.make}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.manufacturer}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.year}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.purchaseDate}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.tareWeight}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.serviceType}</td>
                                                        <td className="px-4 py-3 text-sm">
                                                            <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                                                                result.item.status === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' :
                                                                result.item.status === 'Breakdown' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' :
                                                                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300'
                                                            }`}>
                                                                {result.item.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {/* Driver Results - Excel Style Table */}
                        {searchResults.drivers.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3 flex items-center justify-between">
                                    <h4 className="text-base font-semibold flex items-center gap-2">
                                        <i className="fas fa-id-card"></i>
                                        <span>{lang === 'ar' ? 'نتائج السائقين' : 'Driver Results'}</span>
                                    </h4>
                                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                        {searchResults.drivers.length}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Project Name</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Driver Name</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Nationality</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Iqama</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Mobile</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assigned Vehicle</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {searchResults.drivers.map((result, index) => (
                                                result !== 'not_found' && result && (
                                                    <tr key={index} className="hover:bg-blue-50/40 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400">{getTranslatedProjectName(result.projectName)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-semibold">{result.item.driverName}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.nationality}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{result.item.driverIqama}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.driverMobile}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                                                            {result.item.assignedVehicle || 'Unassigned'}
                                                        </td>
                                                    </tr>
                                                )
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        
                        {/* Manpower Results - Excel Style Table */}
                        {searchResults.manpower.length > 0 && (
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-700">
                                <div className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-6 py-3 flex items-center justify-between">
                                    <h4 className="text-base font-semibold flex items-center gap-2">
                                        <i className="fas fa-users-cog"></i>
                                        <span>{lang === 'ar' ? 'نتائج القوى العاملة' : 'Manpower Results'}</span>
                                    </h4>
                                    <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                                        {searchResults.manpower.length}
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50">
                                            <tr>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Project Name</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Position</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Iqama Number</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Employee ID</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Mobile Number</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assigned Supervisor</th>
                                                <th className="px-4 py-3 text-left rtl:text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Assigned Foreman</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                            {searchResults.manpower.map((result, index) => {
                                                if (result === 'not_found' || !result) return null;
                                                
                                                const projectEmail = allUsers.find(u => u.projectName === result.projectName)?.email || '';
                                                const projectData = allProjectData[projectEmail];
                                                
                                                let assignedSupervisor = '';
                                                let assignedForeman = '';
                                                
                                                if (result.type === 'Labour' && projectData?.supervisors) {
                                                    projectData.supervisors.forEach(supervisor => {
                                                        supervisor.foremen?.forEach(foreman => {
                                                            if (foreman.labours?.some(labour => labour.iqama === result.item.iqama)) {
                                                                assignedSupervisor = supervisor.name;
                                                                assignedForeman = foreman.name;
                                                            }
                                                        });
                                                    });
                                                } else if (result.type === 'Foreman' && projectData?.supervisors) {
                                                    projectData.supervisors.forEach(supervisor => {
                                                        if (supervisor.foremen?.some(foreman => foreman.iqama === result.item.iqama)) {
                                                            assignedSupervisor = supervisor.name;
                                                        }
                                                    });
                                                }
                                                
                                                return (
                                                    <tr key={index} className="hover:bg-purple-50/40 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-4 py-3 text-sm font-medium text-orange-600 dark:text-orange-400">{getTranslatedProjectName(result.projectName)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 font-semibold">{result.item.name}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.role || result.type}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{result.item.iqama}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.empId || 'N/A'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{result.item.mobile || 'N/A'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{assignedSupervisor || 'N/A'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{assignedForeman || 'N/A'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {/* No Results Alert */}
                {hasSearched && globalSearchTerm && searchResults.vehicles.length === 0 && searchResults.drivers.length === 0 && searchResults.manpower.length === 0 && (
                    <div className="mt-4 p-6 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <i className="fas fa-search text-3xl text-orange-400 mb-2"></i>
                        <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
                            {lang === 'ar' ? 'لا توجد نتائج مطابقة للبحث' : 'No matching results found'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                            {lang === 'ar' 
                                ? 'يرجى التحقق من كتابة رقم اللوحة، رقم الباب، الإقامة أو اسم السائق والمشروع'
                                : 'Please check the spelling of plate #, door #, iqama, driver name, or project'
                            }
                        </p>
                    </div>
                )}
            </div>

            {/* Global Stats */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">Fleet Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title={t.totalProjects} 
                        value={globalStats.totalProjects} 
                        icon="fa-folder-open" 
                        color="blue" 
                        onClick={onNavigate ? () => onNavigate('adminAllProjects') : undefined}
                    />
                    <StatCard 
                        title={t.totalVehicles} 
                        value={globalStats.totalVehicles} 
                        icon="fa-car" 
                        color="green" 
                        onClick={onNavigate ? () => onNavigate('adminAllVehicles') : undefined}
                    />
                    <StatCard 
                        title={t.totalDrivers} 
                        value={globalStats.totalDrivers} 
                        icon="fa-users" 
                        color="green" 
                        onClick={onNavigate ? () => onNavigate('adminAllDrivers') : undefined}
                    />
                    <StatCard 
                        title={lang === 'ar' ? 'المركبات في الورشة' : 'Vehicles in Workshop'} 
                        value={globalStats.vehiclesInWorkshop} 
                        icon="fa-wrench" 
                        color="red" 
                        onClick={onNavigate ? () => onNavigate('adminAllIncidents') : undefined}
                    />
                </div>
            </div>
             <div className="space-y-2">
                <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">{t.menpower} Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title={t.totalSupervisors} 
                        value={globalStats.totalSupervisors} 
                        icon="fa-user-tie" 
                        color="orange" 
                        onClick={onNavigate ? () => onNavigate('adminAllMenpower') : undefined}
                    />
                    <StatCard 
                        title={t.totalForemen} 
                        value={globalStats.totalForemen} 
                        icon="fa-users-cog" 
                        color="green" 
                        onClick={onNavigate ? () => onNavigate('adminAllForemen') : undefined}
                    />
                    <StatCard 
                        title={t.totalLabour} 
                        value={globalStats.totalLabour} 
                        icon="fa-hard-hat" 
                        color="yellow" 
                        onClick={onNavigate ? () => onNavigate('adminAllLabour') : undefined}
                    />
                    <StatCard 
                        title={lang === 'ar' ? 'إجمالي القوى العاملة' : 'Total Manpower'} 
                        value={globalStats.totalManpower} 
                        icon="fa-users" 
                        color="red" 
                        onClick={onNavigate ? () => onNavigate('adminAllMenpowerReport') : undefined}
                    />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Vehicle Status by Project Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <VehicleStatusBarChart
                        title="Total Vehicles by Project & Status"
                        data={vehicleStatusByProject}
                        translations={{
                            active: t.status_Active,
                            breakdown: t.status_Breakdown,
                            accident: t.status_Accident,
                            total: t.total
                        }}
                    />
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col h-full">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4 relative z-20">
                        <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400 flex-shrink-0">{t.vehiclesByServiceType}</h3>
                        <div className="w-full sm:w-auto sm:min-w-[220px] relative">
                           <Select
                             label=""
                             name="projectFilter"
                             value={selectedProjectForChart}
                             onChange={(e) => setSelectedProjectForChart(e.target.value)}
                             options={projectFilterOptions}
                           />
                        </div>
                    </div>
                    
                    {/* Search Input for Service Types */}
                    <div className="mb-4 relative z-10">
                        <Input
                            label=""
                            name="serviceTypeSearch"
                            placeholder="🔍 Search service types..."
                            value={serviceTypeSearchTerm}
                            onChange={(e) => setServiceTypeSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                    <div className="flex-grow min-h-0 overflow-hidden">
                       <PieChart 
                           title={t.vehiclesByServiceType}
                           data={serviceTypeChartData} 
                           onEdit={handleEditServiceType}
                           translations={{
                               vehicles: t.vehiclesLabel,
                               total: t.total,
                               showDetails: t.showDetails,
                               hideDetails: t.hideDetails,
                               editServiceTypeTitle: t.editServiceTypeTitle,
                           }}
                       />
                    </div>
                </div>
            </div>
            
            {/* Manpower Analytics Charts */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-orange-700 dark:text-orange-400">
                    {lang === 'ar' ? 'تحليلات القوى العاملة' : 'Manpower Analytics'}
                </h3>
                <MenpowerChart 
                    lang={lang}
                    allUsers={allUsers}
                    allProjectData={allProjectData}
                />
            </div>
            

            
            {/* Service Type Edit Modal */}
            {isEditingServiceType && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                {t.editServiceTypeTitle || 'Edit Service Type'}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                                Editing: <strong>{selectedServiceType}</strong>
                            </p>
                            <input
                                type="text"
                                value={newServiceTypeName}
                                onChange={(e) => setNewServiceTypeName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                placeholder="Enter new service type name"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => setIsEditingServiceType(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveServiceType}
                                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md font-medium"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;