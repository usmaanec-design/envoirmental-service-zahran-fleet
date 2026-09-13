import React, { useMemo, useState } from 'react';
import { TRANSLATIONS, CHART_COLORS, INCIDENT_TYPES } from '../constants';
import type { Language, Vehicle, Driver, Incident, Supervisor, ProjectOfficer, Labour, ProjectData, Page } from '../types';
import StatCard from './ui/StatCard';
import PieChart from './ui/PieChart';
import Input from './ui/Input';
import EditServiceTypeModal from './EditServiceTypeModal';
import FormStatus from './ui/FormStatus';
import ImageBanner from './ui/ImageBanner';

interface DashboardProps {
    lang: Language;
    projectData: ProjectData;
    projectName: string;
    onBulkUpdateVehicleServiceType: (vehicleIds: string[], newServiceType: string) => Promise<void>;
    onNavigate?: (page: Page) => void;
}

const MenpowerBreakdownChart: React.FC<{
    supervisors: Supervisor[];
    projectOfficers: ProjectOfficer[];
    crewmen: Labour[];
    campLabours: Labour[];
    lang: Language;
}> = ({ supervisors, projectOfficers, crewmen, campLabours, lang }) => {
    const t = TRANSLATIONS[lang];

    const supervisorData = supervisors.map(s => {
        const totalForemen = s.foremen?.length || 0;
        const totalLabour = s.foremen?.reduce((sum, f) => sum + (f.labours?.length || 0), 0) || 0;
        const total = totalForemen + totalLabour;
        return {
            name: s.name,
            total,
            foremen: totalForemen,
            labour: totalLabour,
        };
    });

    const otherData = [
        { label: t.totalOfficers, value: projectOfficers.length, color: CHART_COLORS[3] },
        { label: t.crewman, value: crewmen.length, color: CHART_COLORS[4] },
        { label: t.campLabour, value: campLabours.length, color: CHART_COLORS[5] },
    ];
    
    const hasData = supervisorData.some(s => s.total > 0) || otherData.some(o => o.value > 0);

    if (!hasData) {
        return (
             <div className="h-full flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                {t.noSupervisorsFound}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{t.menpowerOverview}</h3>
            </div>

            <div className="space-y-4 overflow-y-auto flex-grow max-h-96">
                {supervisorData.length > 0 && supervisorData.some(s => s.total > 0) && (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="flex justify-between items-center mb-3">
                           <h4 className="font-semibold text-gray-700 dark:text-gray-300">{t.menpowerBySupervisor}</h4>
                           <div className="flex items-center space-x-4 rtl:space-x-reverse text-xs">
                                <div className="flex items-center"><span className="w-3 h-3 rounded-sm me-2 bg-green-400"></span>{t.totalForemen}</div>
                                <div className="flex items-center"><span className="w-3 h-3 rounded-sm me-2 bg-orange-400"></span>{t.totalLabour}</div>
                           </div>
                        </div>
                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                           {supervisorData.map(s => {
                                if (s.total === 0) return null;
                                const foremenPercent = (s.foremen / s.total) * 100;
                                const labourPercent = (s.labour / s.total) * 100;

                                return (
                                    <div key={s.name} className="animate-fade-in-down">
                                        <div className="flex justify-between items-center mb-1 text-sm">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{s.name}</span>
                                            <span className="font-bold text-gray-800 dark:text-gray-200">{s.total}</span>
                                        </div>
                                        <div className="flex w-full h-6 bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden text-white text-xs font-bold items-center">
                                            {s.foremen > 0 && (
                                                <div style={{ width: `${foremenPercent}%` }} className="bg-green-400 h-full flex items-center justify-center">
                                                    {s.foremen}
                                                </div>
                                            )}
                                            {s.labour > 0 && (
                                                 <div style={{ width: `${labourPercent}%` }} className="bg-orange-400 h-full flex items-center justify-center">
                                                    {s.labour}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                           })}
                        </div>
                    </div>
                )}
                
                {otherData.some(o => o.value > 0) && (
                    <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Other Staff</h4>
                        <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                            {otherData.map(item => {
                                if (item.value === 0) return null;
                                return (
                                    <div key={item.label} className="animate-fade-in-down">
                                        <div className="flex justify-between mb-1 text-sm">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                                            <span className="font-semibold text-gray-700 dark:text-gray-300">{item.value}</span>
                                        </div>
                                        <div className="flex w-full h-5 bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden">
                                            <div
                                                style={{ width: `100%`, backgroundColor: item.color }}
                                                className="transition-all duration-500 ease-out"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ lang, projectData, projectName, onBulkUpdateVehicleServiceType, onNavigate }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const { vehicles, drivers, incidents, supervisors, projectOfficers, campLabours, crewmen } = projectData;

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [serviceTypeToEdit, setServiceTypeToEdit] = useState<string | null>(null);
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showDetails, setShowDetails] = useState(true);
    const [serviceTypeSearchTerm, setServiceTypeSearchTerm] = useState('');

    const incidentTypeTranslations = useMemo(() => {
        const map: Record<string, string> = {};
        INCIDENT_TYPES.forEach(type => {
            map[type.value] = t[type.labelKey as keyof typeof t] || type.value;
        });
        return map;
    }, [t]);

    const stats = useMemo(() => {
        const assignedVehicleIds = new Set(drivers.map(d => d.assignedVehicle).filter(Boolean));
        const unassignedVehicles = vehicles.filter(v => !assignedVehicleIds.has(v.id));
        
        // Enhanced workshop calculation: include vehicles with non-Active status OR active incidents
        const vehicleIdsWithIncidents = new Set(incidents.map(i => i.vehicleId));
        const vehiclesInWorkshop = vehicles.filter(v => {
            const hasNonActiveStatus = v.status !== 'Active' && v.status !== 'active';
            const hasActiveIncident = vehicleIdsWithIncidents.has(v.id);
            return hasNonActiveStatus || hasActiveIncident;
        });
        
        console.log('📊 WORKSHOP DEBUG:', {
            totalVehicles: vehicles.length,
            vehicleIdsWithIncidents: Array.from(vehicleIdsWithIncidents),
            vehiclesWithNonActiveStatus: vehicles.filter(v => v.status !== 'Active' && v.status !== 'active').length,
            vehiclesInWorkshop: vehiclesInWorkshop.length,
            workshopVehicles: vehiclesInWorkshop.map(v => ({ id: v.id, door: v.doorNumber, status: v.status }))
        });
        
        return {
            totalVehicles: vehicles.length,
            totalDrivers: drivers.length,
            unassignedVehicles: unassignedVehicles.length,
            vehiclesInWorkshop: vehiclesInWorkshop.length,
        };
    }, [vehicles, drivers, incidents]);

    const menpowerStats = useMemo(() => {
        const totalSupervisors = supervisors.length;
        const totalForemen = supervisors.reduce((sum, s) => sum + (s.foremen?.length || 0), 0);
        const totalLaboursUnderForemen = supervisors
            .flatMap(s => s.foremen || [])
            .reduce((sum, f) => sum + (f.labours?.length || 0), 0);
        
        const totalMenpower = 
            totalSupervisors + 
            totalForemen + 
            totalLaboursUnderForemen + 
            (projectOfficers?.length || 0) + 
            (drivers?.length || 0) +
            (campLabours?.length || 0) + 
            (crewmen?.length || 0);

        return {
            totalSupervisors,
            totalForemen,
            totalLabours: totalLaboursUnderForemen,
            totalMenpower,
        };
    }, [supervisors, campLabours, crewmen, projectOfficers, drivers]);

    const vehiclesByServiceType = useMemo(() => {
        // Create a map to merge duplicate service types (case-insensitive and trimmed)
        const serviceMap = new Map<string, { originalName: string; count: number }>();
        
        vehicles.forEach(vehicle => {
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

        const sortedData = Array.from(serviceMap.values())
            .filter(item => {
                if (!serviceTypeSearchTerm.trim()) return true;
                return item.originalName.toLowerCase().includes(serviceTypeSearchTerm.toLowerCase());
            })
            .map(item => ({ label: item.originalName, value: item.count }))
            .sort((a, b) => b.value - a.value);

        const ORANGE_HIGHLIGHT = '#ea580c';
        const otherColors = CHART_COLORS.filter(c => c !== ORANGE_HIGHLIGHT);

        return sortedData.map((item, index) => {
            if (index === 0) {
                return { ...item, color: ORANGE_HIGHLIGHT };
            }
            return { ...item, color: otherColors[(index - 1) % otherColors.length] };
        });
    }, [vehicles, serviceTypeSearchTerm]);
    
    const recentIncidents = useMemo(() => incidents.slice(0, 5), [incidents]);
    
    const handleOpenEditModal = (serviceType: string) => {
        setServiceTypeToEdit(serviceType);
        setIsEditModalOpen(true);
    };

    const handleSaveServiceType = async (vehicleIds: string[], newServiceType: string) => {
        setFormStatus(null);
        try {
            await onBulkUpdateVehicleServiceType(vehicleIds, newServiceType);
            setIsEditModalOpen(false);
            setServiceTypeToEdit(null);
            setFormStatus({ type: 'success', message: t.serviceTypeUpdateSuccess });
            setTimeout(() => setFormStatus(null), 5000);
        } catch (error) {
            console.error("Failed to update service types:", error);
            const message = error instanceof Error ? error.message : t.saveError;
            setFormStatus({ type: 'error', message });
        }
    };

    return (
        <div className="space-y-4">
            {/* Image Banner */}
            <ImageBanner />
            
            <header>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.dashboard}</h1>
                <p className="text-lg text-gray-500 dark:text-gray-400">{projectName}</p>
            </header>
            
            {formStatus && <FormStatus type={formStatus.type} message={formStatus.message} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={t.totalVehicles} 
                    value={stats.totalVehicles} 
                    icon="fa-car" 
                    color="orange" 
                    onClick={onNavigate ? () => onNavigate('viewVehicles') : undefined}
                />
                <StatCard 
                    title={t.totalDrivers} 
                    value={stats.totalDrivers} 
                    icon="fa-users" 
                    color="green" 
                    onClick={onNavigate ? () => onNavigate('viewDrivers') : undefined}
                />
                <StatCard 
                    title={t.unassignedVehicles} 
                    value={stats.unassignedVehicles} 
                    icon="fa-car-on" 
                    color="yellow" 
                    onClick={onNavigate ? () => onNavigate('viewVehicles') : undefined}
                />
                <StatCard 
                    title={t.vehiclesInWorkshop} 
                    value={stats.vehiclesInWorkshop} 
                    icon="fa-tools" 
                    color="red" 
                    onClick={onNavigate ? () => onNavigate('vehicleHistory') : undefined}
                />
            </div>

            <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.menpowerStatistics}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard 
                        title={t.totalSupervisors} 
                        value={menpowerStats.totalSupervisors} 
                        icon="fa-user-tie" 
                        color="orange" 
                        onClick={onNavigate ? () => onNavigate('viewSupervisors') : undefined}
                    />
                    <StatCard 
                        title={t.totalForemen} 
                        value={menpowerStats.totalForemen} 
                        icon="fa-users" 
                        color="green" 
                        onClick={onNavigate ? () => onNavigate('allForemen') : undefined}
                    />
                    <StatCard 
                        title={t.totalLabours} 
                        value={menpowerStats.totalLabours} 
                        icon="fa-hard-hat" 
                        color="yellow" 
                        onClick={onNavigate ? () => onNavigate('allLabour') : undefined}
                    />
                    <StatCard 
                        title={t.totalMenpower} 
                        value={menpowerStats.totalMenpower} 
                        icon="fa-users-cog" 
                        color="red" 
                        onClick={onNavigate ? () => onNavigate('manpowerSummary') : undefined}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">{t.vehiclesByServiceType}</h3>
                    
                    {/* Search Input for Service Types */}
                    <div className="mb-4">
                        <Input
                            label=""
                            name="serviceTypeSearch"
                            placeholder="🔍 Search service types..."
                            value={serviceTypeSearchTerm}
                            onChange={(e) => setServiceTypeSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                    
                     <PieChart
                        title=""
                        data={vehiclesByServiceType}
                        showLegend={showDetails}
                        onToggleLegend={() => setShowDetails(!showDetails)}
                        onEdit={handleOpenEditModal}
                        translations={{
                            vehicles: t.vehiclesLabel,
                            showDetails: t.showDetails,
                            hideDetails: t.hideDetails,
                            total: t.total,
                            editServiceTypeTitle: t.editServiceTypeTitle,
                        }}
                    />
                </div>
                <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <MenpowerBreakdownChart 
                        supervisors={supervisors}
                        projectOfficers={projectOfficers}
                        crewmen={crewmen}
                        campLabours={campLabours}
                        lang={lang}
                    />
                </div>
            </div>
            
            {isEditModalOpen && serviceTypeToEdit && (
                <EditServiceTypeModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onSave={handleSaveServiceType}
                    lang={lang}
                    serviceTypeToEdit={serviceTypeToEdit}
                    vehicles={vehicles}
                />
            )}
        </div>
    );
};

export default Dashboard;