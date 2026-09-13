import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, ProjectData, Page } from '../types';
import StatCard from './ui/StatCard';
import { exportToExcel } from '../utils/export';
import Button from './ui/Button';
import { ViewAllForemenPage } from './ViewAllForemenPage';
import { ViewAllLabourPage } from './ViewAllLabourPage';

interface MenpowerOverviewPageProps {
    lang: Language;
    projectData: ProjectData;
    onNavigate: (page: Page) => void;
    onImportForemen?: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
    onImportLabour?: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
    onDeleteSelectedForemen?: (foremanIds: string[]) => Promise<void>;
    onDeleteSelectedLabour?: (labourIds: string[]) => Promise<void>;
}

const MenpowerOverviewPage: React.FC<MenpowerOverviewPageProps> = ({ lang, projectData, onNavigate, onImportForemen, onImportLabour, onDeleteSelectedForemen, onDeleteSelectedLabour }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [currentView, setCurrentView] = useState<'overview' | 'allForemen' | 'allLabour'>('overview');
    
    const { supervisors, campLabours, crewmen, projectOfficers } = projectData;

    const menPowerStats = useMemo(() => {
        const totalForemen = supervisors.reduce((sum, s) => sum + (s.foremen?.length || 0), 0);
        const totalLabour = supervisors.flatMap(s => s.foremen || []).reduce((sum, f) => sum + (f.labours?.length || 0), 0);
        return {
            totalSupervisors: supervisors.length,
            totalForemen,
            totalOfficers: projectOfficers.length,
            totalLabour,
        };
    }, [supervisors, projectOfficers]);
    
    const handleExport = (type: 'supervisors' | 'foremen' | 'officers' | 'campLabour' | 'crewmen' | 'all' | 'labour') => {
        
        const getHeaders = (exportType: typeof type) => {
            switch(exportType) {
                case 'supervisors': return { Name: "", EmployeeID: "", Iqama: "", Mobile: "", Area: "" };
                case 'foremen': return { Name: "", EmployeeID: "", Iqama: "", Supervisor: "" };
                case 'labour': return { Name: "", EmployeeID: "", Iqama: "", Foreman: "", Supervisor: "" };
                case 'officers': return { Role: "", Name: "", Iqama: "", Mobile: "" };
                case 'campLabour':
                case 'crewmen': return { Name: "", EmployeeID: "", Iqama: "" };
                case 'all': return { Type: "", Role: "", Name: "", EmployeeID: "", Iqama: "", Mobile: "", ReportsTo: "" };
            }
        }

        const getData = () => {
             switch (type) {
                case 'supervisors':
                    return supervisors.length > 0 ? supervisors.map(s => ({ Name: s.name, EmployeeID: s.empId, Iqama: s.iqama, Mobile: s.mobile, Area: s.area })) : [getHeaders(type)];
                case 'foremen':
                    const foremenData = supervisors.flatMap(s => s.foremen.map(f => ({ Name: f.name, EmployeeID: f.empId, Iqama: f.iqama, Supervisor: s.name })));
                    return foremenData.length > 0 ? foremenData : [getHeaders(type)];
                case 'labour':
                    const labourData = supervisors.flatMap(s => s.foremen.flatMap(f => f.labours.map(l => ({ Name: l.name, EmployeeID: l.empId, Iqama: l.iqama, Foreman: f.name, Supervisor: s.name }))));
                    return labourData.length > 0 ? labourData : [getHeaders(type)];
                case 'officers':
                    return projectOfficers.length > 0 ? projectOfficers.map(o => ({ Role: o.role, Name: o.name, Iqama: o.iqama, Mobile: o.mobile })) : [getHeaders(type)];
                case 'campLabour':
                    return campLabours.length > 0 ? campLabours.map(c => ({ Name: c.name, EmployeeID: c.empId, Iqama: c.iqama })) : [getHeaders(type)];
                case 'crewmen':
                    return crewmen.length > 0 ? crewmen.map(c => ({ Name: c.name, EmployeeID: c.empId, Iqama: c.iqama })) : [getHeaders(type)];
                case 'all':
                    const allData = [
                        ...supervisors.map(s => ({ Type: 'Supervisor', Role: '', Name: s.name, EmployeeID: s.empId, Iqama: s.iqama, Mobile: s.mobile, ReportsTo: '' })),
                        ...projectOfficers.map(o => ({ Type: 'Project Officer', Role: o.role, Name: o.name, EmployeeID: '', Iqama: o.iqama, Mobile: o.mobile, ReportsTo: '' })),
                        ...supervisors.flatMap(s => s.foremen.map(f => ({ Type: 'Foreman', Role: '', Name: f.name, EmployeeID: f.empId, Iqama: f.iqama, Mobile: '', ReportsTo: s.name }))),
                        ...supervisors.flatMap(s => s.foremen.flatMap(f => f.labours.map(l => ({ Type: 'Labour', Role: '', Name: l.name, EmployeeID: l.empId, Iqama: l.iqama, Mobile: '', ReportsTo: f.name })))),
                        ...crewmen.map(c => ({ Type: 'Crewman', Role: '', Name: c.name, EmployeeID: c.empId, Iqama: c.iqama, Mobile: '', ReportsTo: '' })),
                        ...campLabours.map(cl => ({ Type: 'Camp Labour', Role: '', Name: cl.name, EmployeeID: cl.empId, Iqama: cl.iqama, Mobile: '', ReportsTo: '' })),
                    ];
                    return allData.length > 0 ? allData : [getHeaders(type)];
                 default:
                    return [];
            }
        }
        
        exportToExcel(getData(), `${type}.xlsx`);
    };


    const NavigableRow: React.FC<{ icon: string; iconColor: string; title: string; count: number; onClick: () => void; }> = ({ icon, iconColor, title, count, onClick }) => (
         <div onClick={onClick} className="p-4 cursor-pointer flex justify-between items-center bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200">
            <div className="flex items-center gap-4">
                <i className={`fas ${icon} text-xl ${iconColor}`}></i>
                <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{title} ({count})</p>
            </div>
            <div className="ms-4 text-gray-400">
                <i className="fas fa-chevron-right"></i>
            </div>
        </div>
    );

        // Handle different views
    if (currentView === 'allForemen') {
        return <ViewAllForemenPage 
          onBack={() => setCurrentView('overview')} 
          lang={lang}
          onImportForemen={onImportForemen}
          onDeleteSelectedForemen={onDeleteSelectedForemen}
        />;
    }

    if (currentView === 'allLabour') {
        return <ViewAllLabourPage 
          onBack={() => setCurrentView('overview')} 
          lang={lang}
          onImportLabour={onImportLabour}
          onDeleteSelectedLabour={onDeleteSelectedLabour}
        />;
    }

    return (
        <div className="space-y-6 w-full">
            <header className="flex flex-wrap justify-between items-center gap-4">
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.menpowerOverviewTitle}</h1>
                 <Button variant="success" onClick={() => handleExport('all')}>
                    <i className="fas fa-file-excel me-2"></i> {t.exportAllMenpower}
                </Button>
            </header>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="cursor-pointer" onClick={() => handleExport('supervisors')}><StatCard title={t.totalSupervisors} value={menPowerStats.totalSupervisors} icon="fa-user-tie" color="orange" /></div>
                <div className="cursor-pointer" onClick={() => handleExport('foremen')}><StatCard title={t.totalForemen} value={menPowerStats.totalForemen} icon="fa-users" color="green" /></div>
                <div className="cursor-pointer" onClick={() => handleExport('labour')}><StatCard title={t.totalLabour} value={menPowerStats.totalLabour} icon="fa-hard-hat" color="yellow" /></div>
                <div className="cursor-pointer" onClick={() => handleExport('officers')}><StatCard title={t.totalOfficers} value={menPowerStats.totalOfficers} icon="fa-user-shield" color="red" /></div>
                <div className="cursor-pointer" onClick={() => handleExport('campLabour')}><StatCard title={t.campLabour} value={campLabours.length} icon="fa-campground" color="orange" /></div>
                <div className="cursor-pointer" onClick={() => handleExport('crewmen')}><StatCard title={t.crewman} value={crewmen.length} icon="fa-hard-hat" color="green" /></div>
            </div>

            {/* Manpower Summary Card - Separate Row */}
            <div className="mt-6">
                <div className="cursor-pointer" onClick={() => onNavigate('manpowerSummary')}>
                    <StatCard 
                        title={t.viewManpowerSummary} 
                        value="📊" 
                        icon="fa-sitemap" 
                        color="blue" 
                    />
                </div>
            </div>

            <div className="space-y-4">
                <NavigableRow icon="fa-user-tie" iconColor="text-orange-600 dark:text-orange-400" title={t.totalSupervisors} count={supervisors.length} onClick={() => onNavigate('viewSupervisors')} />
                <NavigableRow icon="fa-users" iconColor="text-green-600 dark:text-green-400" title={t.totalForemen} count={menPowerStats.totalForemen} onClick={() => setCurrentView('allForemen')} />
                <NavigableRow icon="fa-user-shield" iconColor="text-yellow-600 dark:text-yellow-400" title={t.projectOfficer} count={projectOfficers.length} onClick={() => onNavigate('viewProjectOfficers')} />
                <NavigableRow icon="fa-hard-hat" iconColor="text-amber-600 dark:text-amber-400" title={t.totalLabour} count={menPowerStats.totalLabour} onClick={() => setCurrentView('allLabour')} />
                <NavigableRow icon="fa-hard-hat" iconColor="text-green-600 dark:text-green-400" title={t.crewman} count={crewmen.length} onClick={() => onNavigate('viewCrewmen')} />
                <NavigableRow icon="fa-campground" iconColor="text-orange-600 dark:text-orange-400" title={t.campLabour} count={campLabours.length} onClick={() => onNavigate('viewCampLabours')} />
            </div>

        </div>
    );
};

export default MenpowerOverviewPage;