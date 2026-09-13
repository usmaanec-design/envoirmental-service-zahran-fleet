import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, Vehicle, VehicleStatus, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Select from './ui/Select';
import StatCard from './ui/StatCard';

interface AdminAllVehiclesPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

type AdminVehicleView = Vehicle & { 
    projectName: string;
    assignedDriver: string;
};

const AdminAllVehiclesPage: React.FC<AdminAllVehiclesPageProps> = ({ lang, allUsers, allProjectData }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [vehicleProjectFilter, setVehicleProjectFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const statusTranslations = useMemo(() => ({
        'Active': t.status_Active,
        'active': t.status_Active,
        'Accident': t.status_Accident,
        'Breakdown': t.status_Breakdown
    }), [t]);

    const allVehicles: AdminVehicleView[] = useMemo(() => {
        return Object.entries(allProjectData).flatMap(([email, data]: [string, ProjectData]) => {
            const user = allUsers.find(u => u.email === email);
            const driversList = data.drivers || [];
            return (data.vehicles || []).map(vehicle => {
                const driver = driversList.find(d => d.assignedVehicle === vehicle.id || d.vehicleId === vehicle.id);
                return {
                    ...vehicle,
                    projectName: user?.projectName || 'N/A',
                    assignedDriver: driver?.driverName || '-',
                };
            });
        });
    }, [allProjectData, allUsers]);

    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    const vehicleColumns: Column<AdminVehicleView>[] = useMemo(() => [
        { 
            key: 'projectName', 
            header: t.thProjectName, 
            sortable: true, 
            allowWrap: true,
            render: (item) => (
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    {getTranslatedProjectName(item.projectName)}
                </span>
            ) 
        },
        { 
            key: 'doorNumber', 
            header: t.thDoorNumber, 
            sortable: true,
            render: (v) => <span className="font-bold text-orange-600 dark:text-orange-400">{v.doorNumber}</span>
        },
        { key: 'plateNumber', header: t.thPlateNumber, sortable: true },
        { 
            key: 'assignedDriver', 
            header: t.assignedDriver || 'Assigned Driver', 
            sortable: true,
            allowWrap: true,
            render: (item) => item.assignedDriver && item.assignedDriver !== '-' 
                ? <span className="text-gray-800 dark:text-gray-200">{item.assignedDriver}</span>
                : <span className="text-gray-400 dark:text-gray-500 italic">-</span>
        },
        { 
            key: 'chassisNumber', 
            header: t.thChassisNumber, 
            sortable: true,
            render: (v) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{v.chassisNumber}</span>
        },
        { key: 'make', header: t.thMake, sortable: true, allowWrap: true },
        { key: 'manufacturer', header: t.thManufacturer, sortable: true, allowWrap: true },
        { key: 'year', header: t.thYear, sortable: true },
        { 
            key: 'purchaseDate', 
            header: t.thPurchaseDate, 
            sortable: true, 
            render: (v) => v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('en-CA') : '-' 
        },
        { key: 'tareWeight', header: t.thTareWeight, sortable: true },
        { key: 'serviceType', header: t.thServiceType, sortable: true, allowWrap: true },
        { 
            key: 'status', 
            header: t.thStatus, 
            sortable: true, 
            render: (v) => {
                const label = statusTranslations[v.status as VehicleStatus] || v.status;
                const isAct = v.status?.toLowerCase() === 'active';
                const isBkd = v.status?.toLowerCase() === 'breakdown';
                const colorClass = isAct 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                    : isBkd 
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300' 
                    : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300';
                return (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>
                        <span className="w-1.5 h-1.5 rounded-full me-1 bg-current"></span>
                        {label}
                    </span>
                );
            } 
        },
    ], [t, getTranslatedProjectName, statusTranslations]);

    const filteredAllVehicles = useMemo(() => {
        let result = allVehicles;

        if (vehicleProjectFilter !== 'all') {
            const selectedUser = allUsers.find(u => u.email === vehicleProjectFilter);
            if (selectedUser) {
                result = result.filter(v => v.projectName === selectedUser.projectName);
            }
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(v => 
                v.doorNumber?.toLowerCase().includes(term) ||
                v.plateNumber?.toLowerCase().includes(term) ||
                v.chassisNumber?.toLowerCase().includes(term) ||
                v.make?.toLowerCase().includes(term) ||
                v.manufacturer?.toLowerCase().includes(term) ||
                v.serviceType?.toLowerCase().includes(term) ||
                v.projectName?.toLowerCase().includes(term) ||
                v.assignedDriver?.toLowerCase().includes(term) ||
                v.status?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [allVehicles, vehicleProjectFilter, searchTerm, allUsers]);

    const exportDataVehicles = useMemo(() => {
        return filteredAllVehicles.map(vehicle => ({
            [t.thProjectName]: getTranslatedProjectName(vehicle.projectName),
            [t.thDoorNumber]: vehicle.doorNumber,
            [t.thPlateNumber]: vehicle.plateNumber,
            [t.assignedDriver || 'Assigned Driver']: vehicle.assignedDriver,
            [t.thChassisNumber]: vehicle.chassisNumber,
            [t.thManufacturer]: vehicle.manufacturer,
            [t.thStatus]: statusTranslations[vehicle.status as VehicleStatus] || vehicle.status,
            [t.thMake]: vehicle.make,
            [t.thYear]: vehicle.year,
            [t.thPurchaseDate]: vehicle.purchaseDate ? new Date(vehicle.purchaseDate).toLocaleDateString('en-CA') : '',
            [t.thTareWeight]: vehicle.tareWeight,
            [t.thServiceType]: vehicle.serviceType,
            [t.thProjectSite]: getTranslatedProjectName(vehicle.projectSite),
        }));
    }, [filteredAllVehicles, t, statusTranslations, lang, getTranslatedProjectName]);

    // Summary statistics (calculated from project-filtered data or all)
    const baseProjectVehicles = useMemo(() => {
        if (vehicleProjectFilter === 'all') return allVehicles;
        const selectedUser = allUsers.find(u => u.email === vehicleProjectFilter);
        return selectedUser ? allVehicles.filter(v => v.projectName === selectedUser.projectName) : allVehicles;
    }, [allVehicles, vehicleProjectFilter, allUsers]);

    const summaryStats = useMemo(() => {
        return {
            totalVehicles: baseProjectVehicles.length,
            activeVehicles: baseProjectVehicles.filter(v => v.status?.toLowerCase() === 'active').length,
            breakdownVehicles: baseProjectVehicles.filter(v => v.status?.toLowerCase() === 'breakdown').length,
            accidentVehicles: baseProjectVehicles.filter(v => v.status?.toLowerCase() === 'accident').length,
        };
    }, [baseProjectVehicles]);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            {/* Header with Project Filter and Export Buttons */}
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {t.allVehiclesReport}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t.allProjects}: {allUsers.length} | {t.totalVehicles}: {summaryStats.totalVehicles}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-[180px] sm:min-w-[220px]">
                        <Select
                            label=""
                            name="vehicleProjectFilter"
                            value={vehicleProjectFilter}
                            onChange={(e) => setVehicleProjectFilter(e.target.value)}
                            options={projectFilterOptions}
                        />
                    </div>
                    <ExportButtons
                        data={exportDataVehicles}
                        title={t.allVehiclesReport}
                    />
                </div>
            </div>
            
            {/* Fleet Summary KPI Cards */}
            <div className="mb-6">
                <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Fleet Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <StatCard 
                        title={t.totalVehicles} 
                        value={summaryStats.totalVehicles} 
                        icon="fa-car" 
                        color="orange" 
                    />
                    <StatCard 
                        title={t.status_Active} 
                        value={summaryStats.activeVehicles} 
                        icon="fa-check-circle" 
                        color="green" 
                    />
                    <StatCard 
                        title={t.status_Breakdown} 
                        value={summaryStats.breakdownVehicles} 
                        icon="fa-exclamation-triangle" 
                        color="yellow" 
                    />
                    <StatCard 
                        title={t.status_Accident} 
                        value={summaryStats.accidentVehicles} 
                        icon="fa-car-crash" 
                        color="red" 
                    />
                </div>
            </div>

            {/* Search Filter Box */}
            <div className="mb-4">
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by door #, plate #, chassis #, driver, make, service type..."
                        className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm"
                            title="Clear search"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
            </div>
            
            {/* Complete Vehicles Database Table */}
            <div className="bg-gray-50 dark:bg-gray-750 rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex flex-wrap justify-between items-center pb-3 mb-3 border-b border-gray-200 dark:border-gray-600 gap-2">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200">
                        Complete Vehicles Database ({filteredAllVehicles.length} {filteredAllVehicles.length === 1 ? 'Vehicle' : 'Vehicles'})
                    </h3>
                    {searchTerm && (
                        <span className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 px-2 py-1 rounded">
                            Filtered from {baseProjectVehicles.length} total
                        </span>
                    )}
                </div>
                
                {/* Full-width table with single scrollable container and clean pagination */}
                <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    <Table<AdminVehicleView>
                        columns={vehicleColumns}
                        data={filteredAllVehicles}
                        initialSortKey="projectName"
                        defaultPageSize={15}
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminAllVehiclesPage;