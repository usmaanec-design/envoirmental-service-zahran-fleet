import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Driver, Language, Vehicle, User, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ExportButtons from './ui/ExportButtons';

interface AdminAllDriversPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

type DriverWithProject = Driver & {
    id: string;
    projectName: string;
    projectManager: string;
    userEmail: string;
};

const AdminAllDriversPage: React.FC<AdminAllDriversPageProps> = ({ 
    lang, 
    allUsers, 
    allProjectData 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // Combine all drivers from all projects
    const allDrivers = useMemo(() => {
        const drivers: DriverWithProject[] = [];
        
        allUsers.forEach(user => {
            const projectData = allProjectData[user.email];
            if (projectData && projectData.drivers) {
                projectData.drivers.forEach(driver => {
                    drivers.push({
                        ...driver,
                        projectName: user.projectName,
                        projectManager: user.projectManagerName,
                        userEmail: user.email
                    });
                });
            }
        });
        
        return drivers;
    }, [allUsers, allProjectData]);

    // Get all vehicles for vehicle mapping
    const allVehiclesMap = useMemo(() => {
        const vehiclesMap: Record<string, Vehicle & { projectName: string }> = {};
        
        allUsers.forEach(user => {
            const projectData = allProjectData[user.email];
            if (projectData && projectData.vehicles) {
                projectData.vehicles.forEach(vehicle => {
                    vehiclesMap[vehicle.id] = {
                        ...vehicle,
                        projectName: user.projectName
                    };
                });
            }
        });
        
        return vehiclesMap;
    }, [allUsers, allProjectData]);

    const filteredDrivers = useMemo(() => {
        if (!searchTerm.trim()) return allDrivers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return allDrivers.filter(driver =>
            driver.driverName.toLowerCase().includes(lowercasedFilter) ||
            driver.driverIqama.includes(lowercasedFilter) ||
            driver.driverIdNumber?.toLowerCase().includes(lowercasedFilter) ||
            driver.projectName.toLowerCase().includes(lowercasedFilter) ||
            driver.nationality.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, allDrivers]);

    const columns: Column<DriverWithProject>[] = useMemo(() => [
        { 
            key: 'driverName', 
            header: t.thDriverName, 
            sortable: true, 
            allowWrap: true,
            render: (driver) => <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{driver.driverName}</span>
        },
        { 
            key: 'nationality', 
            header: t.nationality, 
            sortable: true,
            render: (driver) => <span className="text-gray-700 dark:text-gray-300 text-xs">{driver.nationality}</span>
        },
        { 
            key: 'driverIqama', 
            header: t.thIqama, 
            sortable: true,
            render: (driver) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{driver.driverIqama}</span>
        },
        { 
            key: 'driverIdNumber', 
            header: 'ID NUMBER', 
            sortable: true,
            render: (driver) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{driver.driverIdNumber || '-'}</span>
        },
        { 
            key: 'projectName', 
            header: 'PROJECT NAME', 
            sortable: true,
            render: (driver) => <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{driver.projectName}</span>
        },
        { 
            key: 'driverMobile', 
            header: t.thMobile, 
            sortable: false, 
            render: (driver: DriverWithProject) => (
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {driver.driverMobile ? `+966 ${driver.driverMobile}`: '-'}
                </span>
            )
        },
        { 
            key: 'assignedVehicle',
            header: t.thAssignedVehicle, 
            sortable: true,
            allowWrap: true,
            render: (driver: DriverWithProject) => {
                const vehicle = allVehiclesMap[driver.assignedVehicle];
                return vehicle ? (
                    <span className="font-mono text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {vehicle.doorNumber} - {vehicle.plateNumber}
                    </span>
                ) : (
                    <span className="text-gray-400 dark:text-gray-500 italic text-xs">{t.unassigned}</span>
                );
            }
        },
        { 
            key: 'projectManager', 
            header: 'PROJECT MANAGER', 
            sortable: true, 
            allowWrap: true,
            render: (driver) => <span className="text-gray-700 dark:text-gray-300 text-xs">{driver.projectManager || '-'}</span>
        },
    ], [t, allVehiclesMap]);

    // For export, use translated headers and formatted data
    const exportData = useMemo(() => filteredDrivers.map(driver => {
        const vehicle = allVehiclesMap[driver.assignedVehicle];
        return {
            [t.thDriverName]: driver.driverName,
            [t.nationality]: driver.nationality,
            [t.thIqama]: driver.driverIqama,
            'ID NUMBER': driver.driverIdNumber || '',
            'PROJECT NAME': driver.projectName,
            [t.thMobile]: driver.driverMobile ? `+966 ${driver.driverMobile}` : '',
            [t.thAssignedVehicleDoorNumber]: vehicle ? vehicle.doorNumber : t.unassigned,
            'PROJECT MANAGER': driver.projectManager,
            'USER EMAIL': driver.userEmail,
        };
    }), [filteredDrivers, allVehiclesMap, t]);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {t.allDriversReport || 'Drivers'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lang === 'ar' ? `إجمالي السائقين: ${filteredDrivers.length} | المشاريع: ${allUsers.length}` : `Total Drivers: ${filteredDrivers.length} | Projects: ${allUsers.length}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative min-w-[200px] sm:min-w-[260px]">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث بالاسم، الإقامة، المشروع...' : 'Search by name, iqama, project...'}
                            className="w-full pl-8 pr-7 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>

                    <ExportButtons
                        data={exportData}
                        title="All_Drivers_All_Projects"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table
                    data={filteredDrivers}
                    columns={columns}
                    initialSortKey="driverName"
                    defaultPageSize={15}
                />
            </div>
        </div>
    );
};

export default AdminAllDriversPage;