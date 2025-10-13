


import React, { useMemo, useState } from 'react';
import { TRANSLATIONS, CHART_COLORS, VEHICLE_TYPE_COLORS, SERVICE_TYPE_TO_CATEGORY } from '../constants';
import type { Language, User, Vehicle, Driver, ProjectData, AdminNotification } from '../types';
import StatCard from './ui/StatCard';
import Input from './ui/Input';
import Button from './ui/Button';
import BarChart from './ui/BarChart';
import StackedBarChart from './ui/StackedBarChart';
import Select from './ui/Select';
import PieChart from './ui/PieChart';
import ConfirmationModal from './ui/ConfirmationModal';

interface AdminDashboardProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    allAdminNotifications: AdminNotification[];
    onDismissNotification: (notificationId: string) => void;
    onClearAllNotifications: () => Promise<void>;
}

type SearchResult<T> = { item: T; projectName: string } | 'not_found' | null;

const AdminDashboard: React.FC<AdminDashboardProps> = ({ lang, allUsers, allProjectData, allAdminNotifications, onDismissNotification, onClearAllNotifications }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // Search State
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    const [driverSearchTerm, setDriverSearchTerm] = useState('');
    const [vehicleSearchResult, setVehicleSearchResult] = useState<SearchResult<Vehicle>>(null);
    const [driverSearchResult, setDriverSearchResult] = useState<SearchResult<Driver>>(null);
    const [selectedProjectForChart, setSelectedProjectForChart] = useState('all');
    const [showPieChartLegend, setShowPieChartLegend] = useState(false);

    // Modal state
    const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);

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

        Object.values(allProjectData).forEach((data: ProjectData) => {
            totalVehicles += data.vehicles.length;
            totalDrivers += data.drivers.length;
            totalIncidents += data.incidents.length;
            totalSupervisors += (data.supervisors || []).length;
            (data.supervisors || []).forEach(s => {
                totalForemen += s.foremen.length;
            });
            totalCampLabour += data.campLabour;
            totalCrewman += data.crewman;
        });

        const totalForemenLabour = Object.values(allProjectData)
            .flatMap((p: ProjectData) => (p.supervisors || []))
            .flatMap(s => s.foremen)
            .reduce((sum, f) => sum + f.totalLabour, 0);

        const totalLabour = totalForemenLabour + totalCampLabour + totalCrewman;

        return {
            totalProjects: allUsers.length,
            totalVehicles,
            totalDrivers,
            totalIncidents,
            totalSupervisors,
            totalForemen,
            totalLabour,
        };
    }, [allUsers, allProjectData]);
    
    const serviceTypeChartData = useMemo(() => {
        let relevantVehicles: Vehicle[] = [];
        if (selectedProjectForChart === 'all') {
            // FIX: Explicitly type `p` as `ProjectData` to resolve TypeScript inference issue.
            Object.values(allProjectData).forEach((p: ProjectData) => relevantVehicles.push(...p.vehicles));
        } else {
            const user = allUsers.find(u => u.email === selectedProjectForChart);
            if (user && allProjectData[user.email]) {
                 relevantVehicles = allProjectData[user.email].vehicles;
            }
        }

        const counts = relevantVehicles.reduce((acc, vehicle) => {
            const service = vehicle.serviceType || 'Unspecified';
            acc[service] = (acc[service] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts)
            .map(([label, value], index) => ({
                label,
                value,
                color: CHART_COLORS[index % CHART_COLORS.length]
            }))
            .sort((a, b) => b.value - a.value);
    }, [allProjectData, selectedProjectForChart, allUsers]);
    
    const vehiclesByProjectData = useMemo(() => {
        return allUsers
            .map((user, index) => ({
                label: getTranslatedProjectName(user.projectName),
                value: allProjectData[user.email]?.vehicles?.length || 0,
                color: CHART_COLORS[index % CHART_COLORS.length],
            }))
            .filter(item => item.value > 0);
    }, [allUsers, allProjectData, getTranslatedProjectName]);

    const stackedBarChartData = useMemo(() => {
        return allUsers
            .map(user => {
                const vehicles = allProjectData[user.email]?.vehicles || [];
                
                // Count vehicles by category
                const categoryCounts = vehicles.reduce((acc, vehicle) => {
                    const serviceType = vehicle.serviceType || 'Unspecified';
                    const category = SERVICE_TYPE_TO_CATEGORY[serviceType] || 'Other';
                    acc[category] = (acc[category] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>);

                // Create segments for this project
                const segments = Object.entries(categoryCounts).map(([category, count]) => ({
                    type: category,
                    value: count,
                    color: VEHICLE_TYPE_COLORS[category] || VEHICLE_TYPE_COLORS['Other']
                }));

                const total = vehicles.length;

                return {
                    label: getTranslatedProjectName(user.projectName),
                    segments,
                    total
                };
            })
            .filter(item => item.total > 0)
            .sort((a, b) => b.total - a.total);
    }, [allUsers, allProjectData, getTranslatedProjectName]);


    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    // --- Search Handlers ---
    const handleVehicleSearch = () => {
        if (!vehicleSearchTerm.trim()) {
            setVehicleSearchResult(null);
            return;
        }
        for (const [email, data] of Object.entries(allProjectData) as [string, ProjectData][]) {
            const foundVehicle = data.vehicles.find(v => v.doorNumber === vehicleSearchTerm.trim());
            if (foundVehicle) {
                const projectName = allUsers.find(u => u.email === email)?.projectName || 'Unknown Project';
                setVehicleSearchResult({ item: foundVehicle, projectName });
                return;
            }
        }
        setVehicleSearchResult('not_found');
    };

    const handleDriverSearch = () => {
        if (!driverSearchTerm.trim()) {
            setDriverSearchResult(null);
            return;
        }
        for (const [email, data] of Object.entries(allProjectData) as [string, ProjectData][]) {
            const foundDriver = data.drivers.find(d => d.driverIqama === driverSearchTerm.trim());
            if (foundDriver) {
                const projectName = allUsers.find(u => u.email === email)?.projectName || 'Unknown Project';
                setDriverSearchResult({ item: foundDriver, projectName });
                return;
            }
        }
        setDriverSearchResult('not_found');
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
             <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
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
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.adminDashboard}</h1>
            </header>
            
            {/* Global Search */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {/* Vehicle Search */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.globalVehicleSearch}</h3>
                    <div className="flex gap-2">
                        <Input
                            name="vehicleSearch"
                            placeholder={t.searchByDoorNumberAdmin}
                            value={vehicleSearchTerm}
                            onChange={(e) => setVehicleSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleVehicleSearch()}
                        />
                        <Button variant="info" onClick={handleVehicleSearch} className="min-w-0 px-5">
                            <i className="fas fa-search"></i>
                        </Button>
                    </div>
                     {vehicleSearchResult && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                            {vehicleSearchResult === 'not_found' ? (
                                <p className="text-red-600 dark:text-red-400">{t.vehicleNotFound}</p>
                            ) : (
                                <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{t.vehicleFoundIn}: <span className="text-blue-600 dark:text-blue-400">{getTranslatedProjectName(vehicleSearchResult.projectName)}</span></p>
                                    <div className="text-sm mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                                        <p><strong>{t.thDoorNumber}:</strong> {vehicleSearchResult.item.doorNumber}</p>
                                        <p><strong>{t.thPlateNumber}:</strong> {vehicleSearchResult.item.plateNumber}</p>
                                        <p><strong>{t.thMake}:</strong> {vehicleSearchResult.item.make}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Driver Search */}
                 <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.globalDriverSearch}</h3>
                    <div className="flex gap-2">
                        <Input
                            name="driverSearch"
                            placeholder={t.searchByIqama}
                            value={driverSearchTerm}
                            onChange={(e) => setDriverSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleDriverSearch()}
                        />
                        <Button variant="info" onClick={handleDriverSearch} className="min-w-0 px-5">
                             <i className="fas fa-search"></i>
                        </Button>
                    </div>
                     {driverSearchResult && (
                        <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600">
                            {driverSearchResult === 'not_found' ? (
                                <p className="text-red-600 dark:text-red-400">{t.driverNotFound}</p>
                            ) : (
                                <div>
                                    <p className="font-semibold text-gray-700 dark:text-gray-300">{t.driverFoundIn}: <span className="text-blue-600 dark:text-blue-400">{getTranslatedProjectName(driverSearchResult.projectName)}</span></p>
                                    <div className="text-sm mt-2 space-y-1 text-gray-600 dark:text-gray-400">
                                        <p><strong>{t.thDriverName}:</strong> {driverSearchResult.item.driverName}</p>
                                        <p><strong>{t.thIqama}:</strong> {driverSearchResult.item.driverIqama}</p>
                                        <p><strong>{t.thMobile}:</strong> {driverSearchResult.item.driverMobile}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Global Stats */}
            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Fleet Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title={t.totalProjects} value={globalStats.totalProjects} icon="fa-sitemap" color="blue" />
                    <StatCard title={t.totalVehicles} value={globalStats.totalVehicles} icon="fa-car" color="green" />
                    <StatCard title={t.totalDrivers} value={globalStats.totalDrivers} icon="fa-users" color="yellow" />
                    <StatCard title={t.totalIncidents} value={globalStats.totalIncidents} icon="fa-car-crash" color="red" />
                </div>
            </div>
             <div className="space-y-2">
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">{t.menPower} Statistics</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    <StatCard title={t.totalSupervisors} value={globalStats.totalSupervisors} icon="fa-user-tie" color="blue" />
                    <StatCard title={t.totalForemen} value={globalStats.totalForemen} icon="fa-users-cog" color="green" />
                    <StatCard title={t.totalLabour} value={globalStats.totalLabour} icon="fa-hard-hat" color="yellow" />
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col">
                    <div className="h-[450px] flex flex-col">
                        <StackedBarChart 
                            data={stackedBarChartData}
                            title={t.totalVehiclesByProjectAndType}
                            showTotal={true}
                            translations={{
                                vehicles: t.vehicles,
                                total: t.total
                            }}
                        />
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-4 flex-shrink-0">
                        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t.vehiclesByServiceType}</h3>
                        <div className="min-w-[200px]">
                           <Select
                             label=""
                             name="projectFilter"
                             value={selectedProjectForChart}
                             onChange={(e) => setSelectedProjectForChart(e.target.value)}
                             options={projectFilterOptions}
                           />
                        </div>
                    </div>
                    <div className="flex-grow">
                       <PieChart 
                           title="" 
                           data={serviceTypeChartData} 
                           showLegend={showPieChartLegend}
                           onToggleLegend={() => setShowPieChartLegend(!showPieChartLegend)}
                           translations={{
                               vehicles: t.vehicles,
                               total: t.total,
                               showDetails: t.showDetails,
                               hideDetails: t.hideDetails
                           }}
                       />
                    </div>
                </div>
            </div>
            
             {/* Transfer Notifications */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t.transferNotifications}</h3>
                    {allAdminNotifications.length > 0 && (
                        <button
                            onClick={() => setIsClearAllModalOpen(true)}
                            className="bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center"
                            title={t.clearAll}
                        >
                            <i className="fas fa-broom me-2"></i>
                            <span>{t.clearAll}</span>
                        </button>
                    )}
                </div>
                {allAdminNotifications.length > 0 ? (
                    <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-700">
                        {sortedNotifications.map(n => <NotificationItem key={n.id} notification={n} />)}
                    </ul>
                ) : (
                    <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noNewNotifications}</p>
                )}
            </div>

            <ConfirmationModal
                isOpen={isClearAllModalOpen}
                onClose={() => setIsClearAllModalOpen(false)}
                onConfirm={handleConfirmClearAll}
                title={t.clearAllNotificationsTitle}
                message={t.clearAllNotificationsMessage}
                confirmButtonText={t.confirmDelete}
                cancelButtonText={t.cancel}
            />
        </div>
    );
};

export default AdminDashboard;