import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, ProjectData, Supervisor, Foreman } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Select from './ui/Select';
import StatCard from './ui/StatCard';

interface AdminAllMenpowerPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    onViewProjectMenpower?: (user: User) => void;
    initialTab?: 'supervisors' | 'foremen' | 'labour' | 'projects';
}

type SupervisorWithProject = Supervisor & {
    projectName: string;
    projectManager: string;
    userEmail: string;
    foremenCount: number;
    labourCount: number;
};

type ForemanWithProject = Foreman & {
    projectName: string;
    supervisorName: string;
    userEmail: string;
    labourCount: number;
};

type LabourWithProject = {
    id: string;
    name: string;
    empId: string;
    iqama: string;
    profession: string;
    mobile: string;
    type: string;
    supervisorName: string;
    foremanName: string;
    projectName: string;
    userEmail: string;
};

const AdminAllMenpowerPage: React.FC<AdminAllMenpowerPageProps> = ({ 
    lang, 
    allUsers, 
    allProjectData, 
    onViewProjectMenpower,
    initialTab = 'supervisors'
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [activeTab, setActiveTab] = useState<'supervisors' | 'foremen' | 'labour' | 'projects'>(initialTab);
    const [searchTerm, setSearchTerm] = useState('');
    const [projectFilter, setProjectFilter] = useState('all');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    // 1. All Supervisors from all projects
    const allSupervisors = useMemo(() => {
        const list: SupervisorWithProject[] = [];
        allUsers.forEach(user => {
            const projectData = allProjectData[user.email];
            if (projectData?.supervisors) {
                projectData.supervisors.forEach(s => {
                    const foremenCount = s.foremen?.length || 0;
                    const labourCount = (s.foremen || []).reduce((sum, f) => sum + (f.labours?.length || 0), 0);
                    list.push({
                        ...s,
                        projectName: user.projectName,
                        projectManager: user.projectManagerName || '-',
                        userEmail: user.email,
                        foremenCount,
                        labourCount
                    });
                });
            }
        });
        return list;
    }, [allUsers, allProjectData]);

    // 2. All Foremen from all projects
    const allForemen = useMemo(() => {
        const list: ForemanWithProject[] = [];
        allUsers.forEach(user => {
            const projectData = allProjectData[user.email];
            if (projectData?.supervisors) {
                projectData.supervisors.forEach(s => {
                    (s.foremen || []).forEach(f => {
                        list.push({
                            ...f,
                            projectName: user.projectName,
                            supervisorName: s.name,
                            userEmail: user.email,
                            labourCount: f.labours?.length || 0
                        });
                    });
                });
            }
        });
        return list;
    }, [allUsers, allProjectData]);

    // 3. All Labour (Under Foremen + Camp Labour + Crewmen)
    const allLabour = useMemo(() => {
        const list: LabourWithProject[] = [];
        allUsers.forEach(user => {
            const projectData = allProjectData[user.email];
            if (!projectData) return;
            
            (projectData.supervisors || []).forEach(s => {
                (s.foremen || []).forEach(f => {
                    (f.labours || []).forEach(l => {
                        list.push({
                            id: l.id || `${f.id}_${l.iqama}`,
                            name: l.name,
                            empId: l.empId || '-',
                            iqama: l.iqama,
                            profession: l.profession || 'Labour',
                            mobile: l.mobile || '-',
                            type: 'Labour',
                            supervisorName: s.name,
                            foremanName: f.name,
                            projectName: user.projectName,
                            userEmail: user.email
                        });
                    });
                });
            });

            (projectData.crewmen || []).forEach(c => {
                list.push({
                    id: c.id || `crew_${c.iqama}`,
                    name: c.name,
                    empId: c.empId || '-',
                    iqama: c.iqama,
                    profession: 'Crewman',
                    mobile: c.mobile || '-',
                    type: 'Crewman',
                    supervisorName: '-',
                    foremanName: '-',
                    projectName: user.projectName,
                    userEmail: user.email
                });
            });

            (projectData.campLabours || []).forEach(cl => {
                list.push({
                    id: cl.id || `camp_${cl.iqama}`,
                    name: cl.name,
                    empId: cl.empId || '-',
                    iqama: cl.iqama,
                    profession: 'Camp Labour',
                    mobile: cl.mobile || '-',
                    type: 'Camp Labour',
                    supervisorName: '-',
                    foremanName: '-',
                    projectName: user.projectName,
                    userEmail: user.email
                });
            });
        });
        return list;
    }, [allUsers, allProjectData]);

    // Project filter dropdown options
    const projectFilterOptions = useMemo(() => {
        const validUsers = allUsers.filter(u => u.projectName && !u.projectName.toLowerCase().includes('admin dashboard'));
        const userOptions = validUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects || 'All Projects' }, ...userOptions];
    }, [allUsers, t, getTranslatedProjectName]);

    // Filtered data based on project filter & search
    const filteredSupervisors = useMemo(() => {
        let result = allSupervisors;
        if (projectFilter !== 'all') {
            result = result.filter(s => s.userEmail === projectFilter);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(s => 
                s.name.toLowerCase().includes(term) ||
                s.iqama.includes(term) ||
                (s.empId && s.empId.toLowerCase().includes(term)) ||
                (s.mobile && s.mobile.includes(term)) ||
                s.projectName.toLowerCase().includes(term) ||
                (s.area && s.area.toLowerCase().includes(term))
            );
        }
        return result;
    }, [allSupervisors, projectFilter, searchTerm]);

    const filteredForemen = useMemo(() => {
        let result = allForemen;
        if (projectFilter !== 'all') {
            result = result.filter(f => f.userEmail === projectFilter);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(f => 
                f.name.toLowerCase().includes(term) ||
                f.iqama.includes(term) ||
                (f.empId && f.empId.toLowerCase().includes(term)) ||
                (f.mobile && f.mobile.includes(term)) ||
                f.projectName.toLowerCase().includes(term) ||
                f.supervisorName.toLowerCase().includes(term)
            );
        }
        return result;
    }, [allForemen, projectFilter, searchTerm]);

    const filteredLabour = useMemo(() => {
        let result = allLabour;
        if (projectFilter !== 'all') {
            result = result.filter(l => l.userEmail === projectFilter);
        }
        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(l => 
                l.name.toLowerCase().includes(term) ||
                l.iqama.includes(term) ||
                (l.empId && l.empId.toLowerCase().includes(term)) ||
                (l.mobile && l.mobile.includes(term)) ||
                l.projectName.toLowerCase().includes(term) ||
                l.profession.toLowerCase().includes(term) ||
                l.supervisorName.toLowerCase().includes(term) ||
                l.foremanName.toLowerCase().includes(term)
            );
        }
        return result;
    }, [allLabour, projectFilter, searchTerm]);

    // Table Columns for Supervisors
    const supervisorColumns: Column<SupervisorWithProject>[] = useMemo(() => [
        {
            key: 'name',
            header: t.thName || 'Supervisor Name',
            sortable: true,
            allowWrap: true,
            render: (item) => (
                <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs block">{item.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ID: {item.empId || '-'}</span>
                </div>
            )
        },
        {
            key: 'projectName',
            header: t.thProjectName || 'Project Name',
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-orange-600 dark:text-orange-400 text-xs">
                    {getTranslatedProjectName(item.projectName)}
                </span>
            )
        },
        {
            key: 'iqama',
            header: t.thIqama || 'Iqama Number',
            sortable: true,
            render: (item) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{item.iqama}</span>
        },
        {
            key: 'mobile',
            header: t.thMobile || 'Mobile Number',
            sortable: false,
            render: (item) => (
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {item.mobile ? `+966 ${item.mobile}` : '-'}
                </span>
            )
        },
        {
            key: 'area',
            header: t.thArea || 'Area',
            sortable: true,
            render: (item) => <span className="text-xs text-gray-700 dark:text-gray-300">{item.area || item.assignedArea || '-'}</span>
        },
        {
            key: 'foremenCount',
            header: t.totalForemen || 'Foremen',
            sortable: true,
            render: (item) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                    {item.foremenCount}
                </span>
            )
        },
        {
            key: 'labourCount',
            header: t.totalLabour || 'Labour',
            sortable: true,
            render: (item) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                    {item.labourCount}
                </span>
            )
        },
        {
            key: 'projectManager',
            header: t.thProjectManager || 'Project Manager',
            sortable: true,
            render: (item) => <span className="text-xs text-gray-500 dark:text-gray-400">{item.projectManager}</span>
        }
    ], [t, getTranslatedProjectName]);

    // Table Columns for Foremen
    const foremenColumns: Column<ForemanWithProject>[] = useMemo(() => [
        {
            key: 'name',
            header: t.thName || 'Foreman Name',
            sortable: true,
            render: (item) => (
                <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs block">{item.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ID: {item.empId || '-'}</span>
                </div>
            )
        },
        {
            key: 'projectName',
            header: t.thProjectName || 'Project Name',
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-orange-600 dark:text-orange-400 text-xs">
                    {getTranslatedProjectName(item.projectName)}
                </span>
            )
        },
        {
            key: 'supervisorName',
            header: t.thSupervisor || 'Supervisor',
            sortable: true,
            render: (item) => <span className="text-xs font-medium text-gray-800 dark:text-gray-200">{item.supervisorName}</span>
        },
        {
            key: 'iqama',
            header: t.thIqama || 'Iqama',
            sortable: true,
            render: (item) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{item.iqama}</span>
        },
        {
            key: 'mobile',
            header: t.thMobile || 'Mobile',
            sortable: false,
            render: (item) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{item.mobile || '-'}</span>
        },
        {
            key: 'labourCount',
            header: t.totalLabour || 'Labour Count',
            sortable: true,
            render: (item) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300">
                    {item.labourCount}
                </span>
            )
        }
    ], [t, getTranslatedProjectName]);

    // Table Columns for Labour
    const labourColumns: Column<LabourWithProject>[] = useMemo(() => [
        {
            key: 'name',
            header: t.thName || 'Labour Name',
            sortable: true,
            render: (item) => (
                <div>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs block">{item.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">ID: {item.empId}</span>
                </div>
            )
        },
        {
            key: 'projectName',
            header: t.thProjectName || 'Project Name',
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-orange-600 dark:text-orange-400 text-xs">
                    {getTranslatedProjectName(item.projectName)}
                </span>
            )
        },
        {
            key: 'type',
            header: 'Type',
            sortable: true,
            render: (item) => (
                <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    item.type === 'Crewman' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' :
                    item.type === 'Camp Labour' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' :
                    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                }`}>
                    {item.type}
                </span>
            )
        },
        {
            key: 'iqama',
            header: t.thIqama || 'Iqama',
            sortable: true,
            render: (item) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{item.iqama}</span>
        },
        {
            key: 'profession',
            header: 'Profession',
            sortable: true,
            render: (item) => <span className="text-xs text-gray-700 dark:text-gray-300">{item.profession}</span>
        },
        {
            key: 'foremanName',
            header: t.thForeman || 'Foreman',
            sortable: true,
            render: (item) => <span className="text-xs text-gray-700 dark:text-gray-300">{item.foremanName}</span>
        },
        {
            key: 'supervisorName',
            header: t.thSupervisor || 'Supervisor',
            sortable: true,
            render: (item) => <span className="text-xs text-gray-700 dark:text-gray-300">{item.supervisorName}</span>
        }
    ], [t, getTranslatedProjectName]);

    // Export formats
    const exportDataSupervisors = useMemo(() => filteredSupervisors.map(s => ({
        'Supervisor Name': s.name,
        'Project Name': getTranslatedProjectName(s.projectName),
        'Employee ID': s.empId || '',
        'Iqama Number': s.iqama,
        'Mobile Number': s.mobile || '',
        'Assigned Area': s.area || s.assignedArea || '',
        'Total Foremen': s.foremenCount,
        'Total Labour': s.labourCount,
        'Project Manager': s.projectManager
    })), [filteredSupervisors, getTranslatedProjectName]);

    const exportDataForemen = useMemo(() => filteredForemen.map(f => ({
        'Foreman Name': f.name,
        'Project Name': getTranslatedProjectName(f.projectName),
        'Supervisor': f.supervisorName,
        'Employee ID': f.empId || '',
        'Iqama Number': f.iqama,
        'Mobile Number': f.mobile || '',
        'Total Labour': f.labourCount
    })), [filteredForemen, getTranslatedProjectName]);

    const exportDataLabour = useMemo(() => filteredLabour.map(l => ({
        'Labour Name': l.name,
        'Project Name': getTranslatedProjectName(l.projectName),
        'Type': l.type,
        'Profession': l.profession,
        'Employee ID': l.empId || '',
        'Iqama Number': l.iqama,
        'Foreman': l.foremanName,
        'Supervisor': l.supervisorName
    })), [filteredLabour, getTranslatedProjectName]);

    return (
        <div className="w-full space-y-6">
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title={t.totalSupervisors || 'Total Supervisors'} 
                    value={allSupervisors.length} 
                    icon="fa-user-tie" 
                    color="orange" 
                    onClick={() => setActiveTab('supervisors')}
                />
                <StatCard 
                    title={t.totalForemen || 'Total Foremen'} 
                    value={allForemen.length} 
                    icon="fa-users" 
                    color="green" 
                    onClick={() => setActiveTab('foremen')}
                />
                <StatCard 
                    title={t.totalLabour || 'Total Labour'} 
                    value={allLabour.length} 
                    icon="fa-hard-hat" 
                    color="yellow" 
                    onClick={() => setActiveTab('labour')}
                />
                <StatCard 
                    title={t.totalProjects || 'Total Projects'} 
                    value={projectFilterOptions.length - 1} 
                    icon="fa-building" 
                    color="blue" 
                    onClick={() => setActiveTab('projects')}
                />
            </div>

            {/* Main Content Card */}
            <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
                {/* Header & Tabs */}
                <div className="flex flex-wrap justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                            {activeTab === 'supervisors' && (lang === 'ar' ? 'جميع المشرفين' : 'All Supervisors Sheet')}
                            {activeTab === 'foremen' && (lang === 'ar' ? 'جميع رؤساء العمال' : 'All Foremen Sheet')}
                            {activeTab === 'labour' && (lang === 'ar' ? 'جميع العمال' : 'All Labour Sheet')}
                            {activeTab === 'projects' && (lang === 'ar' ? 'ملخص القوى العاملة بالمشاريع' : 'Projects Manpower Overview')}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {activeTab === 'supervisors' && `${filteredSupervisors.length} ${lang === 'ar' ? 'مشرف مسجل' : 'supervisors found'}`}
                            {activeTab === 'foremen' && `${filteredForemen.length} ${lang === 'ar' ? 'رئيس عمال مسجل' : 'foremen found'}`}
                            {activeTab === 'labour' && `${filteredLabour.length} ${lang === 'ar' ? 'عامل مسجل' : 'labourers found'}`}
                            {activeTab === 'projects' && `${allUsers.length} ${lang === 'ar' ? 'مشروع' : 'projects'}`}
                        </p>
                    </div>

                    {/* Tab Switcher Pills */}
                    <div className="flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                        <button
                            onClick={() => setActiveTab('supervisors')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'supervisors' 
                                    ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-500'
                            }`}
                        >
                            <i className="fas fa-user-tie me-1.5"></i>
                            {t.totalSupervisors || 'Supervisors'} ({allSupervisors.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('foremen')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'foremen' 
                                    ? 'bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-green-500'
                            }`}
                        >
                            <i className="fas fa-users me-1.5"></i>
                            {t.totalForemen || 'Foremen'} ({allForemen.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('labour')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'labour' 
                                    ? 'bg-white dark:bg-gray-800 text-yellow-600 dark:text-yellow-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-yellow-500'
                            }`}
                        >
                            <i className="fas fa-hard-hat me-1.5"></i>
                            {t.totalLabour || 'Labour'} ({allLabour.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('projects')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                activeTab === 'projects' 
                                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-500'
                            }`}
                        >
                            <i className="fas fa-th-large me-1.5"></i>
                            {lang === 'ar' ? 'المشاريع' : 'Projects'}
                        </button>
                    </div>

                    {/* Export */}
                    {activeTab !== 'projects' && (
                        <ExportButtons
                            data={
                                activeTab === 'supervisors' ? exportDataSupervisors :
                                activeTab === 'foremen' ? exportDataForemen : exportDataLabour
                            }
                            title={
                                activeTab === 'supervisors' ? 'All_Supervisors' :
                                activeTab === 'foremen' ? 'All_Foremen' : 'All_Labour'
                            }
                        />
                    )}
                </div>

                {/* Search & Project Filter Bar */}
                {activeTab !== 'projects' && (
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex-1 min-w-[240px] max-w-md relative">
                            <i className="fas fa-search absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={
                                    activeTab === 'supervisors' ? (lang === 'ar' ? 'بحث بالاسم، رقم الإقامة، المشروع...' : 'Search supervisors by name, iqama, project...') :
                                    activeTab === 'foremen' ? (lang === 'ar' ? 'بحث برئيس العمال، المشرف، المشروع...' : 'Search foremen by name, supervisor, project...') :
                                    (lang === 'ar' ? 'بحث بالعامل، المهنة، المشروع...' : 'Search labour by name, profession, project...')
                                }
                                className="w-full ps-9 pe-4 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                            />
                        </div>

                        <div className="w-64">
                            <Select
                                label=""
                                name="projectFilter"
                                value={projectFilter}
                                onChange={(e) => setProjectFilter(e.target.value)}
                                options={projectFilterOptions}
                            />
                        </div>
                    </div>
                )}

                {/* Table Views */}
                {activeTab === 'supervisors' && (
                    <Table
                        columns={supervisorColumns}
                        data={filteredSupervisors}
                        emptyMessage={lang === 'ar' ? 'لا يوجد مشرفين مسجلين' : 'No supervisors found'}
                    />
                )}

                {activeTab === 'foremen' && (
                    <Table
                        columns={foremenColumns}
                        data={filteredForemen}
                        emptyMessage={lang === 'ar' ? 'لا يوجد رؤساء عمال مسجلين' : 'No foremen found'}
                    />
                )}

                {activeTab === 'labour' && (
                    <Table
                        columns={labourColumns}
                        data={filteredLabour}
                        emptyMessage={lang === 'ar' ? 'لا يوجد عمال مسجلين' : 'No labour records found'}
                    />
                )}

                {/* Projects Overview Cards */}
                {activeTab === 'projects' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {allUsers.filter(u => u.projectName && !u.projectName.toLowerCase().includes('admin dashboard')).map(user => {
                            const pData = allProjectData[user.email];
                            const sups = pData?.supervisors || [];
                            const totalSups = sups.length;
                            const totalFm = sups.reduce((sum, s) => sum + (s.foremen?.length || 0), 0);
                            const totalLb = sups.reduce((sum, s) => sum + (s.foremen || []).reduce((fsum, f) => fsum + (f.labours?.length || 0), 0), 0);
                            const campLb = pData?.campLabours?.length || 0;
                            const crewM = pData?.crewmen?.length || 0;
                            const totalAll = totalSups + totalFm + totalLb + campLb + crewM;

                            return (
                                <div 
                                    key={user.email}
                                    onClick={() => {
                                        setProjectFilter(user.email);
                                        setActiveTab('supervisors');
                                    }}
                                    className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-orange-500 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base group-hover:text-orange-600 transition-colors">
                                            {getTranslatedProjectName(user.projectName)}
                                        </h3>
                                        <span className="text-xs font-bold px-2 py-1 bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 rounded-lg">
                                            {totalAll} {lang === 'ar' ? 'فرد' : 'Staff'}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center text-xs py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                                        <div>
                                            <div className="font-bold text-orange-600 dark:text-orange-400 text-sm">{totalSups}</div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t.totalSupervisors || 'Supervisors'}</div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-green-600 dark:text-green-400 text-sm">{totalFm}</div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t.totalForemen || 'Foremen'}</div>
                                        </div>
                                        <div>
                                            <div className="font-bold text-yellow-600 dark:text-yellow-400 text-sm">{totalLb}</div>
                                            <div className="text-[10px] text-gray-500 dark:text-gray-400">{t.totalLabour || 'Labour'}</div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400">
                                        <span>{user.projectManagerName || '-'}</span>
                                        <span className="text-orange-500 group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform flex items-center gap-1 font-medium">
                                            {lang === 'ar' ? 'عرض السجلات' : 'View Sheet'} <i className="fas fa-chevron-right text-[10px]"></i>
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAllMenpowerPage;