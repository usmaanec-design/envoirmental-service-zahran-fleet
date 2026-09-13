import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, ProjectData, Page, Supervisor, Foreman, Labour } from '../types';
import StatCard from './ui/StatCard';
import Table, { type Column } from './ui/Table';
import Select from './ui/Select';
import Input from './ui/Input';
import Button from './ui/Button';
import { exportToExcel } from '../utils/export';

interface ManpowerSummaryPageProps {
    lang: Language;
    projectData: ProjectData;
    onNavigate: (page: Page) => void;
}

type ViewType = 'overview' | 'supervisors' | 'foremen' | 'labour' | 'projectOfficers' | 'crewmen' | 'campLabour';

const ManpowerSummaryPage: React.FC<ManpowerSummaryPageProps> = ({ lang, projectData, onNavigate }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [currentView, setCurrentView] = useState<ViewType>('overview');
    const [selectedSupervisorId, setSelectedSupervisorId] = useState<string>('');
    const [selectedForemanId, setSelectedForemanId] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const { supervisors, campLabours, crewmen, projectOfficers } = projectData;

    // Calculate statistics
    const stats = useMemo(() => {
        const totalForemen = supervisors.reduce((sum, s) => sum + (s.foremen?.length || 0), 0);
        const totalLabour = supervisors.flatMap(s => s.foremen || []).reduce((sum, f) => sum + (f.labours?.length || 0), 0);
        const totalManpower = supervisors.length + totalForemen + totalLabour + projectOfficers.length + crewmen.length + campLabours.length;
        
        return {
            totalSupervisors: supervisors.length,
            totalForemen,
            totalLabour,
            totalOfficers: projectOfficers.length,
            totalCrewmen: crewmen.length,
            totalCampLabour: campLabours.length,
            totalManpower
        };
    }, [supervisors, projectOfficers, crewmen, campLabours]);

    // Get all labour from all supervisors and foremen
    const allLabour = useMemo(() => {
        return supervisors.flatMap(supervisor => 
            supervisor.foremen?.flatMap(foreman => 
                foreman.labours?.map(labour => ({
                    ...labour,
                    supervisorName: supervisor.name,
                    supervisorArea: supervisor.area,
                    foremanName: foreman.name,
                    foremanEmpId: foreman.empId
                })) || []
            ) || []
        );
    }, [supervisors]);

    // Get all foremen from all supervisors
    const allForemen = useMemo(() => {
        return supervisors.flatMap(supervisor => 
            supervisor.foremen?.map(foreman => ({
                ...foreman,
                supervisorName: supervisor.name,
                supervisorArea: supervisor.area,
                totalLabour: foreman.labours?.length || 0
            })) || []
        );
    }, [supervisors]);

    // Filter data based on selections and search
    const filteredLabour = useMemo(() => {
        let filtered = allLabour;
        
        if (selectedSupervisorId) {
            const supervisor = supervisors.find(s => s.id === selectedSupervisorId);
            if (supervisor) {
                filtered = filtered.filter(labour => labour.supervisorName === supervisor.name);
            }
        }
        
        if (selectedForemanId) {
            const foreman = allForemen.find(f => f.id === selectedForemanId);
            if (foreman) {
                filtered = filtered.filter(labour => labour.foremanName === foreman.name);
            }
        }
        
        if (searchTerm.trim()) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(labour =>
                labour.name.toLowerCase().includes(lowercasedFilter) ||
                labour.iqama?.includes(lowercasedFilter) ||
                labour.empId?.toLowerCase().includes(lowercasedFilter) ||
                labour.supervisorName?.toLowerCase().includes(lowercasedFilter) ||
                labour.foremanName?.toLowerCase().includes(lowercasedFilter)
            );
        }
        
        return filtered;
    }, [allLabour, selectedSupervisorId, selectedForemanId, searchTerm, supervisors, allForemen]);

    // Table columns for different views
    const supervisorColumns: Column<Supervisor>[] = useMemo(() => [
        { key: 'name', header: t.supervisorName, sortable: true },
        { key: 'area', header: t.assignedAreaName || 'Area', sortable: true, render: (s) => s.area || 'N/A' },
        { key: 'empId', header: t.supervisorEmpId || 'Employee ID', sortable: true, render: (s) => s.empId || 'N/A' },
        { key: 'iqama', header: t.supervisorIqama, sortable: true },
        { key: 'mobile', header: t.supervisorMobile, sortable: false, render: (s) => s.mobile || 'N/A' },
        { key: 'totalForemen' as any, header: t.totalForemen, sortable: true, render: (s) => s.foremen?.length || 0 },
        { key: 'totalLabour' as any, header: t.totalLabour, sortable: true, render: (s) => s.foremen?.reduce((total, f) => total + (f.labours?.length || 0), 0) || 0 },
    ], [t]);

    const foremanColumns: Column<typeof allForemen[0]>[] = useMemo(() => [
        { key: 'name', header: t.foremanName, sortable: true },
        { key: 'empId', header: t.foremanEmpId, sortable: true, render: (f) => f.empId || 'N/A' },
        { key: 'iqama', header: t.foremanIqama, sortable: true, render: (f) => f.iqama || 'N/A' },
        { key: 'supervisorName', header: t.supervisorName, sortable: true },
        { key: 'supervisorArea', header: t.assignedAreaName || 'Supervisor Area', sortable: true, render: (f) => f.supervisorArea || 'N/A' },
        { key: 'totalLabour', header: t.totalLabour, sortable: true },
    ], [t]);

    const labourColumns: Column<typeof filteredLabour[0]>[] = useMemo(() => [
        { key: 'name', header: t.labourName, sortable: true },
        { key: 'empId', header: t.labourEmpId, sortable: true, render: (l) => l.empId || 'N/A' },
        { key: 'iqama', header: t.labourIqama, sortable: true, render: (l) => l.iqama || 'N/A' },
        { key: 'foremanName', header: t.foremanName, sortable: true },
        { key: 'supervisorName', header: t.supervisorName, sortable: true },
        { key: 'supervisorArea', header: t.assignedAreaName || 'Area', sortable: true, render: (l) => l.supervisorArea || 'N/A' },
    ], [t]);

    const projectOfficerColumns: Column<typeof projectOfficers[0]>[] = useMemo(() => [
        { key: 'role', header: t.officerRole, sortable: true },
        { key: 'name', header: t.officerName, sortable: true },
        { key: 'id', header: t.officerId || 'Officer ID', sortable: true },
        { key: 'iqama', header: t.officerIqama, sortable: true },
        { key: 'mobile', header: t.officerMobile, sortable: false, render: (o) => o.mobile || 'N/A' },
    ], [t]);

    const labourSimpleColumns: Column<Labour>[] = useMemo(() => [
        { key: 'name', header: t.labourName, sortable: true },
        { key: 'empId', header: t.labourEmpId, sortable: true, render: (l) => l.empId || 'N/A' },
        { key: 'iqama', header: t.labourIqama, sortable: true, render: (l) => l.iqama || 'N/A' },
    ], [t]);

    // Export functionality
    const handleExport = (type: string) => {
        let data: any[] = [];
        let filename = '';

        switch (type) {
            case 'all':
                data = [
                    { Category: t.supervisors, Count: stats.totalSupervisors },
                    { Category: t.foremen, Count: stats.totalForemen },
                    { Category: t.totalLabour, Count: stats.totalLabour },
                    { Category: t.projectOfficer, Count: stats.totalOfficers },
                    { Category: t.crewman, Count: stats.totalCrewmen },
                    { Category: t.campLabour, Count: stats.totalCampLabour },
                    { Category: 'Total Manpower', Count: stats.totalManpower },
                ];
                filename = 'manpower-summary';
                break;
            case 'labour':
                data = filteredLabour;
                filename = 'all-labour';
                break;
            case 'foremen':
                data = allForemen;
                filename = 'all-foremen';
                break;
            default:
                return;
        }

        exportToExcel(data, filename);
    };

    // Dropdown options
    const supervisorOptions = useMemo(() => {
        return supervisors.map(supervisor => ({
            value: supervisor.id,
            label: `${supervisor.name} - ${supervisor.area || 'N/A'}`
        }));
    }, [supervisors]);

    const foremanOptions = useMemo(() => {
        if (!selectedSupervisorId) return [];
        const supervisor = supervisors.find(s => s.id === selectedSupervisorId);
        return supervisor?.foremen?.map(foreman => ({
            value: foreman.id,
            label: `${foreman.name} - ${foreman.empId || foreman.iqama}`
        })) || [];
    }, [supervisors, selectedSupervisorId]);

    const renderContent = () => {
        switch (currentView) {
            case 'overview':
                return (
                    <div className="space-y-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6">
                            <div className="cursor-pointer" onClick={() => setCurrentView('supervisors')}>
                                <StatCard title={t.totalSupervisors} value={stats.totalSupervisors} icon="fa-user-tie" color="orange" />
                            </div>
                            <div className="cursor-pointer" onClick={() => setCurrentView('foremen')}>
                                <StatCard title={t.totalForemen} value={stats.totalForemen} icon="fa-users" color="green" />
                            </div>
                            <div className="cursor-pointer" onClick={() => setCurrentView('labour')}>
                                <StatCard title={t.totalLabour} value={stats.totalLabour} icon="fa-hard-hat" color="yellow" />
                            </div>
                            <div className="cursor-pointer" onClick={() => setCurrentView('projectOfficers')}>
                                <StatCard title={t.totalOfficers} value={stats.totalOfficers} icon="fa-user-shield" color="red" />
                            </div>
                            <div className="cursor-pointer" onClick={() => setCurrentView('crewmen')}>
                                <StatCard title={t.crewman} value={stats.totalCrewmen} icon="fa-hard-hat" color="green" />
                            </div>
                            <div className="cursor-pointer" onClick={() => setCurrentView('campLabour')}>
                                <StatCard title={t.campLabour} value={stats.totalCampLabour} icon="fa-campground" color="orange" />
                            </div>
                            <div className="cursor-pointer" onClick={() => handleExport('all')}>
                                <StatCard title="Total Manpower" value={stats.totalManpower} icon="fa-chart-bar" color="blue" />
                            </div>
                        </div>

                        {/* Quick Access Filters */}
                        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Labour View</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Select
                                        label={t.selectSupervisor}
                                        name="supervisor"
                                        value={selectedSupervisorId}
                                        onChange={(e) => {
                                            setSelectedSupervisorId(e.target.value);
                                            setSelectedForemanId('');
                                            if (e.target.value) setCurrentView('labour');
                                        }}
                                        options={supervisorOptions}
                                        placeholder={t.selectSupervisor + '...'}
                                    />
                                </div>
                                <div>
                                    <Select
                                        label={t.selectForeman}
                                        name="foreman"
                                        value={selectedForemanId}
                                        onChange={(e) => {
                                            setSelectedForemanId(e.target.value);
                                            if (e.target.value && selectedSupervisorId) setCurrentView('labour');
                                        }}
                                        options={foremanOptions}
                                        placeholder={t.selectForeman + '...'}
                                        disabled={!selectedSupervisorId}
                                    />
                                </div>
                                <div className="flex items-end">
                                    <Button
                                        onClick={() => {
                                            if (selectedSupervisorId || selectedForemanId) {
                                                setCurrentView('labour');
                                            }
                                        }}
                                        disabled={!selectedSupervisorId && !selectedForemanId}
                                        className="w-full"
                                    >
                                        View Labour
                                    </Button>
                                </div>
                            </div>
                            {(selectedSupervisorId || selectedForemanId) && (
                                <div className="flex gap-2 mt-4">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => {
                                            setSelectedSupervisorId('');
                                            setSelectedForemanId('');
                                        }}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                );

            case 'supervisors':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.supervisors} ({stats.totalSupervisors})</h3>
                            <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                            </Button>
                        </div>
                        <Table columns={supervisorColumns} data={supervisors} initialSortKey="name" />
                    </div>
                );

            case 'foremen':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.foremen} ({stats.totalForemen})</h3>
                            <div className="flex gap-3">
                                <Button variant="success" onClick={() => handleExport('foremen')}>
                                    <i className="fas fa-file-excel me-2"></i> {(t as any).export || 'Export'}
                                </Button>
                                <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                    <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                                </Button>
                            </div>
                        </div>
                        <Table columns={foremanColumns} data={allForemen} initialSortKey="name" />
                    </div>
                );

            case 'labour':
                return (
                    <div className="space-y-6">
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.totalLabour} ({filteredLabour.length})</h3>
                            <div className="flex gap-3">
                                <Button variant="success" onClick={() => handleExport('labour')}>
                                    <i className="fas fa-file-excel me-2"></i> {(t as any).export || 'Export'}
                                </Button>
                                <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                    <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                                </Button>
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-4">
                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Filters</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <Select
                                        label={t.selectSupervisor}
                                        name="supervisor"
                                        value={selectedSupervisorId}
                                        onChange={(e) => {
                                            setSelectedSupervisorId(e.target.value);
                                            setSelectedForemanId(''); // Reset foreman when supervisor changes
                                        }}
                                        options={supervisorOptions}
                                        placeholder={t.selectSupervisor + '...'}
                                    />
                                </div>
                                <div>
                                    <Select
                                        label={t.selectForeman}
                                        name="foreman"
                                        value={selectedForemanId}
                                        onChange={(e) => setSelectedForemanId(e.target.value)}
                                        options={foremanOptions}
                                        placeholder={t.selectForeman + '...'}
                                        disabled={!selectedSupervisorId}
                                    />
                                </div>
                                <div>
                                    <Input
                                        label="Search Labour"
                                        name="search"
                                        placeholder="Search by name, iqama, or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onClear={() => setSearchTerm('')}
                                    />
                                </div>
                            </div>
                            {(selectedSupervisorId || selectedForemanId || searchTerm) && (
                                <div className="flex gap-2">
                                    <Button 
                                        variant="secondary" 
                                        onClick={() => {
                                            setSelectedSupervisorId('');
                                            setSelectedForemanId('');
                                            setSearchTerm('');
                                        }}
                                    >
                                        Clear All Filters
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Hierarchical Display */}
                        {selectedSupervisorId && selectedForemanId ? (
                            // Show hierarchical view when both supervisor and foreman are selected
                            (() => {
                                const selectedSupervisor = supervisors.find(s => s.id === selectedSupervisorId);
                                const selectedForeman = selectedSupervisor?.foremen?.find(f => f.id === selectedForemanId);
                                const foremanLabour = selectedForeman?.labours || [];

                                return (
                                    <div className="space-y-4">
                                        {/* Supervisor Info Card */}
                                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-6">
                                            <h4 className="text-lg font-semibold text-orange-800 dark:text-orange-300 mb-3 flex items-center">
                                                <i className="fas fa-user-tie mr-3"></i>
                                                {t.supervisorName}: {selectedSupervisor?.name}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Employee ID:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedSupervisor?.empId || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Iqama:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedSupervisor?.iqama || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Area:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedSupervisor?.area || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Mobile:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedSupervisor?.mobile || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Foreman Info Card */}
                                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-6">
                                            <h4 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
                                                <i className="fas fa-users mr-3"></i>
                                                {t.foremanName}: {selectedForeman?.name}
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Employee ID:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedForeman?.empId || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Iqama:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{selectedForeman?.iqama || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-600 dark:text-gray-400">Total Labour:</span>
                                                    <p className="text-gray-800 dark:text-gray-200">{foremanLabour.length}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Labour Table */}
                                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                                            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                                                <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                                    <i className="fas fa-hard-hat mr-3"></i>
                                                    {t.labourDetails} ({foremanLabour.length})
                                                </h5>
                                            </div>
                                            
                                            {foremanLabour.length > 0 ? (
                                                <Table<Labour>
                                                    columns={[
                                                        { key: 'name', header: t.labourName, sortable: true },
                                                        { key: 'empId', header: t.labourEmpId, sortable: true, render: (l) => l.empId || 'N/A' },
                                                        { key: 'iqama', header: t.labourIqama, sortable: true, render: (l) => l.iqama || 'N/A' },
                                                    ]} 
                                                    data={foremanLabour} 
                                                    initialSortKey="name" 
                                                />
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <i className="fas fa-users text-gray-400 text-3xl mb-3"></i>
                                                    <p className="text-gray-500 dark:text-gray-400">No labour found under this foreman</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()
                        ) : (
                            // Show regular table when no specific foreman is selected
                            <Table columns={labourColumns} data={filteredLabour} initialSortKey="name" />
                        )}
                    </div>
                );

            case 'projectOfficers':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.projectOfficer} ({stats.totalOfficers})</h3>
                            <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                            </Button>
                        </div>
                        <Table columns={projectOfficerColumns} data={projectOfficers} initialSortKey="name" />
                    </div>
                );

            case 'crewmen':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.crewman} ({stats.totalCrewmen})</h3>
                            <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                            </Button>
                        </div>
                        <Table columns={labourSimpleColumns} data={crewmen} initialSortKey="name" />
                    </div>
                );

            case 'campLabour':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t.campLabour} ({stats.totalCampLabour})</h3>
                            <Button variant="secondary" onClick={() => setCurrentView('overview')}>
                                <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back'}
                            </Button>
                        </div>
                        <Table columns={labourSimpleColumns} data={campLabours} initialSortKey="name" />
                    </div>
                );

            default:
                return <div>Unknown view</div>;
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.manpowerSummaryTitle}</h1>
                <div className="flex gap-3">
                    {currentView === 'overview' && (
                        <Button variant="success" onClick={() => handleExport('all')}>
                            <i className="fas fa-file-excel me-2"></i> Export Summary
                        </Button>
                    )}
                    <Button variant="secondary" onClick={() => onNavigate('menpowerOverview')}>
                        <i className="fas fa-arrow-left me-2"></i> {(t as any).back || 'Back to Overview'}
                    </Button>
                </div>
            </div>

            {renderContent()}
        </div>
    );
};

export default ManpowerSummaryPage;