import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
// FIX: Removed unused and undefined HistoryEvent type.
import type { Language, Vehicle, Driver, Incident, Supervisor, ProjectOfficer } from '../types';
import StatCard from './ui/StatCard';
import BarChart from './ui/BarChart';
import StackedBarChart from './ui/StackedBarChart';
import PieChart from './ui/PieChart';

interface DashboardProps {
    lang: Language;
    vehicles: Vehicle[];
    drivers: Driver[];
    projectName: string;
    incidents: Incident[];
    supervisors: Supervisor[];
    projectOfficers: ProjectOfficer[];
    campLabour: number;
    crewman: number;
}

// FIX: Removed unused history prop.
const Dashboard: React.FC<DashboardProps> = ({ lang, vehicles = [], drivers = [], projectName, incidents = [], supervisors = [], projectOfficers = [], campLabour, crewman }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const getOfficerRoleDisplay = (role?: string) => {
        if (typeof role !== 'string' || !role) {
            return role || '';
        }
        const key = `officerRole_${role.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || role;
    };

    const stats = useMemo(() => {
        const assignedVehicleIds = new Set(drivers.map(d => d.assignedVehicle).filter(Boolean));
        const unassignedVehicles = vehicles.filter(v => !assignedVehicleIds.has(v.id));
        const vehiclesInWorkshop = vehicles.filter(v => v.status !== 'Active');
        return {
            totalVehicles: vehicles.length,
            totalDrivers: drivers.length,
            unassignedVehicles: unassignedVehicles.length,
            vehiclesInWorkshop: vehiclesInWorkshop.length,
        };
    }, [vehicles, drivers]);

    const manPowerStats = useMemo(() => {
        const totalForemen = supervisors.reduce((sum, s) => sum + (s.foremen?.length || 0), 0);
        const totalForemenLabour = supervisors
            .flatMap(s => s.foremen || [])
            .reduce((sum, f) => sum + f.totalLabour, 0);

        return {
            totalSupervisors: supervisors.length,
            totalForemen,
            totalLabour: totalForemenLabour + campLabour + crewman,
        };
    }, [supervisors, campLabour, crewman]);

    const vehiclesByArea = useMemo(() => {
        const counts = vehicles.reduce((acc, vehicle) => {
            const area = vehicle.projectSite || 'N/A';
            acc[area] = (acc[area] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#38BDF8'];
        return Object.entries(counts).map(([label, value], index) => ({
            label,
            value,
            color: colors[index % colors.length]
        }));
    }, [vehicles]);

    const foremanManpowerData = useMemo(() => {
        return supervisors.map((supervisor, index) => {
            const totalForemen = supervisor.foremen?.length || 0;
            const totalLabour = supervisor.foremen?.reduce((sum, foreman) => sum + foreman.totalLabour, 0) || 0;
            
            const segments = [];
            
            // Add foremen segment (light green)
            if (totalForemen > 0) {
                segments.push({
                    type: t.totalForemen || 'Total Foremen',
                    value: totalForemen,
                    color: '#86EFAC' // Light green
                });
            }
            
            // Add labour segment (dark orange)
            if (totalLabour > 0) {
                segments.push({
                    type: t.totalLabour || 'Total Labour',
                    value: totalLabour,
                    color: '#EA580C' // Dark orange
                });
            }

            return {
                label: supervisor.name,
                segments,
                total: totalForemen + totalLabour
            };
        }).filter(item => item.total > 0);
    }, [supervisors, t]);

    const recentIncidents = useMemo(() => incidents.slice(0, 5), [incidents]);

    return (
        <div className="space-y-4">
            <header>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.dashboard}</h1>
                <p className="text-4xl font-black text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-orange-600 bg-clip-text mt-2">{projectName}</p>
            </header>

            {/* Fleet Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title={t.totalVehicles} value={stats.totalVehicles} icon="fas fa-truck" color="teal" />
                <StatCard title={t.totalDrivers} value={stats.totalDrivers} icon="fas fa-users" color="green" />
                <StatCard title={t.unassignedVehicles} value={stats.unassignedVehicles} icon="fas fa-parking" color="orange" />
                <StatCard title={t.vehiclesInWorkshop} value={stats.vehiclesInWorkshop} icon="fas fa-tools" color="red" />
            </div>

            {/* Man Power Stats */}
            <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.manPowerStatistics}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard title={t.totalSupervisors} value={manPowerStats.totalSupervisors} icon="fas fa-user-tie" color="purple" />
                    <StatCard title={t.totalForemen} value={manPowerStats.totalForemen} icon="fas fa-user-cog" color="blue" />
                    <StatCard title={t.totalLabour} value={manPowerStats.totalLabour} icon="fas fa-hard-hat" color="yellow" />
                </div>
            </div>

            {/* Charts - Normal Size */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <div className="xl:col-span-2">
                    <PieChart title={t.vehiclesByArea} data={vehiclesByArea} />
                </div>
                <div className="xl:col-span-3">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-full flex flex-col">
                        <StackedBarChart 
                            data={foremanManpowerData}
                            title={t.manpowerBySupervisor || "أعداد القوى العاملة حسب المشرف"}
                            showTotal={true}
                            translations={{
                                vehicles: t.workers || "عمال",
                                total: t.total || "الإجمالي"
                            }}
                        />
                    </div>
                </div>
            </div>

             {/* Recent Incidents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Incidents</h3>
                 <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {recentIncidents.length > 0 ? recentIncidents.map(item => {
                        const vehicle = vehicles.find(v => v.id === item.vehicleId);
                        return (
                            <li key={item.id} className="py-3 flex items-start space-x-4 rtl:space-x-reverse">
                                <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400`}>
                                    <i className="fas fa-car-crash"></i>
                                </div>
                                <div className="flex-grow">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                        {t[item.type === 'Accident' ? 'accident' : 'notWorking']} - {vehicle?.doorNumber}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">{item.description}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{new Date(item.date).toLocaleDateString('en-CA')}</p>
                                </div>
                            </li>
                        );
                    }) : (
                       <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noIncidentsFound}</p>
                    )}
                </ul>
            </div>

            {/* Project Officers Report */}
            {projectOfficers && projectOfficers.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.projectOfficersReport}</h3>
                    <div className="table-scroll-container bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="table-content scrollbar-thin" style={{ overflowX: 'auto', maxHeight: '60vh' }}>
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.officerRole}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.officerName}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.officerIqama}</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t.officerMobile}</th>
                                    </tr>
                                </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {projectOfficers.map(officer => (
                                    <tr key={officer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-200">{getOfficerRoleDisplay(officer.role)}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{officer.name || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{officer.iqama || '-'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{officer.mobile ? `+966 ${officer.mobile}`: '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
