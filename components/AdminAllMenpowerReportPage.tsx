import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { 
    Language, 
    User, 
    ProjectData, 
    Supervisor, 
    Foreman, 
    Labour, 
    CampLabour, 
    Crewman, 
    ProjectOfficer 
} from '../types';
import * as XLSX from 'xlsx';

interface AdminAllMenpowerReportPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    onViewProjectMenpower?: (user: User) => void;
}

type ManpowerCategory = 'supervisors' | 'foremen' | 'labour' | 'campLabour' | 'crewman' | 'projectOfficers';

interface ModalDetailState {
    isOpen: boolean;
    projectName: string;
    projectEmail: string;
    category: ManpowerCategory;
    title: string;
    items: any[];
}

interface ProjectManpowerStats {
    user: User;
    projectName: string;
    totalSupervisors: number;
    totalForemen: number;
    totalLabour: number;
    campLabour: number;
    crewMan: number;
    officers: number;
    totalManpower: number;
    supervisors: Supervisor[];
    foremen: Array<Foreman & { supervisorName: string }>;
    labours: Array<Labour & { supervisorName: string; foremanName: string }>;
    campLabours: CampLabour[];
    crewmen: Crewman[];
    projectOfficers: ProjectOfficer[];
}

const AdminAllMenpowerReportPage: React.FC<AdminAllMenpowerReportPageProps> = ({ 
    lang, 
    allUsers, 
    allProjectData,
    onViewProjectMenpower 
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [projectSearchTerm, setProjectSearchTerm] = useState('');
    
    // Modal state for viewing details
    const [detailModal, setDetailModal] = useState<ModalDetailState>({
        isOpen: false,
        projectName: '',
        projectEmail: '',
        category: 'supervisors',
        title: '',
        items: []
    });
    const [modalSearchTerm, setModalSearchTerm] = useState('');
    const [modalPage, setModalPage] = useState(1);
    const modalPageSize = 10;

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    // Filter valid project users (exclude internal admin dashboards)
    const validUsers = useMemo(() => {
        return allUsers.filter(user => 
            user.projectName && 
            user.projectName !== 'Admin Dashboard' &&
            !user.projectName.toLowerCase().includes('admin dashboard')
        );
    }, [allUsers]);

    // Calculate detailed stats for every project
    const projectStatsList: ProjectManpowerStats[] = useMemo(() => {
        return validUsers.map(user => {
            const projectData = allProjectData[user.email] || {
                vehicles: [],
                drivers: [],
                supervisors: [],
                campLabours: [],
                crewmen: [],
                projectOfficers: [],
                incidents: [],
                repairHistory: [],
                transfers: [],
                notifications: []
            };

            const supervisors = projectData.supervisors || [];
            const totalSupervisors = supervisors.length;

            const foremenList: Array<Foreman & { supervisorName: string }> = [];
            const laboursList: Array<Labour & { supervisorName: string; foremanName: string }> = [];

            supervisors.forEach(s => {
                (s.foremen || []).forEach(f => {
                    foremenList.push({
                        ...f,
                        supervisorName: s.name || '-'
                    });

                    (f.labours || []).forEach(l => {
                        laboursList.push({
                            ...l,
                            supervisorName: s.name || '-',
                            foremanName: f.name || '-'
                        });
                    });
                });
            });

            const totalForemen = foremenList.length;
            const totalLabour = laboursList.length;
            const campLabours = projectData.campLabours || [];
            const campLabourCount = campLabours.length;
            const crewmen = projectData.crewmen || [];
            const crewmanCount = crewmen.length;
            const projectOfficers = projectData.projectOfficers || [];
            const officerCount = projectOfficers.length;

            const totalManpower = totalSupervisors + totalForemen + totalLabour + campLabourCount + crewmanCount + officerCount;

            return {
                user,
                projectName: user.projectName,
                totalSupervisors,
                totalForemen,
                totalLabour,
                campLabour: campLabourCount,
                crewMan: crewmanCount,
                officers: officerCount,
                totalManpower,
                supervisors,
                foremen: foremenList,
                labours: laboursList,
                campLabours,
                crewmen,
                projectOfficers
            };
        });
    }, [validUsers, allProjectData]);

    // Global Aggregate KPI statistics across all projects
    const globalStats = useMemo(() => {
        let totalSupervisors = 0;
        let totalForemen = 0;
        let totalLabour = 0;
        let totalOfficers = 0;
        let totalCrewmen = 0;
        let totalCampLabour = 0;

        projectStatsList.forEach(stat => {
            totalSupervisors += stat.totalSupervisors;
            totalForemen += stat.totalForemen;
            totalLabour += stat.totalLabour;
            totalOfficers += stat.officers;
            totalCrewmen += stat.crewMan;
            totalCampLabour += stat.campLabour;
        });

        // Combined total manpower
        const totalManpower = totalSupervisors + totalForemen + totalLabour + totalOfficers + totalCrewmen + totalCampLabour;

        return {
            totalProjects: projectStatsList.length,
            totalSupervisors,
            totalForemen,
            totalLabour,
            totalOfficers,
            totalCrewmen,
            totalCampLabour,
            totalManpower
        };
    }, [projectStatsList]);

    // Filter projects by search
    const filteredProjects = useMemo(() => {
        if (!projectSearchTerm.trim()) return projectStatsList;
        const term = projectSearchTerm.toLowerCase();
        return projectStatsList.filter(p => 
            p.projectName.toLowerCase().includes(term) ||
            p.user.projectManagerName?.toLowerCase().includes(term) ||
            p.user.email?.toLowerCase().includes(term)
        );
    }, [projectStatsList, projectSearchTerm]);

    // Open detail modal for specific project category
    const handleOpenDetailModal = (stat: ProjectManpowerStats, category: ManpowerCategory) => {
        const transName = getTranslatedProjectName(stat.projectName);
        let title = '';
        let items: any[] = [];

        switch (category) {
            case 'supervisors':
                title = `${transName} - ${lang === 'ar' ? 'المشرفين' : 'Total Supervisors'} (${stat.totalSupervisors})`;
                items = stat.supervisors;
                break;
            case 'foremen':
                title = `${transName} - ${lang === 'ar' ? 'رؤساء العمال' : 'Total Foremen'} (${stat.totalForemen})`;
                items = stat.foremen;
                break;
            case 'labour':
                title = `${transName} - ${lang === 'ar' ? 'إجمالي العمال' : 'Total Labour'} (${stat.totalLabour})`;
                items = stat.labours;
                break;
            case 'campLabour':
                title = `${transName} - ${lang === 'ar' ? 'عمال السكن' : 'Camp Labour'} (${stat.campLabour})`;
                items = stat.campLabours;
                break;
            case 'crewman':
                title = `${transName} - ${lang === 'ar' ? 'طاقم العمل' : 'Crewman'} (${stat.crewMan})`;
                items = stat.crewmen;
                break;
            case 'projectOfficers':
                title = `${transName} - ${lang === 'ar' ? 'مسؤولي المشروع' : 'Project Officers'} (${stat.officers})`;
                items = stat.projectOfficers;
                break;
        }

        setDetailModal({
            isOpen: true,
            projectName: transName,
            projectEmail: stat.user.email,
            category,
            title,
            items
        });
        setModalSearchTerm('');
        setModalPage(1);
    };

    // Filter items inside modal
    const filteredModalItems = useMemo(() => {
        if (!modalSearchTerm.trim()) return detailModal.items;
        const term = modalSearchTerm.toLowerCase();
        return detailModal.items.filter(item => {
            const name = (item.name || item.driverName || '').toLowerCase();
            const iqama = (item.iqama || item.driverIqama || '').toLowerCase();
            const area = (item.assignedArea || item.area || '').toLowerCase();
            const role = (item.role || item.profession || '').toLowerCase();
            const mobile = (item.mobile || '').toLowerCase();
            return name.includes(term) || iqama.includes(term) || area.includes(term) || role.includes(term) || mobile.includes(term);
        });
    }, [detailModal.items, modalSearchTerm]);

    // Modal pagination
    const paginatedModalItems = useMemo(() => {
        const start = (modalPage - 1) * modalPageSize;
        return filteredModalItems.slice(start, start + modalPageSize);
    }, [filteredModalItems, modalPage]);

    const modalTotalPages = Math.max(1, Math.ceil(filteredModalItems.length / modalPageSize));

    // Export single category to Excel
    const handleExportCategoryExcel = () => {
        if (!detailModal.items || detailModal.items.length === 0) return;

        let exportRows: any[] = [];
        const isAr = lang === 'ar';

        switch (detailModal.category) {
            case 'supervisors':
                exportRows = detailModal.items.map((s: Supervisor) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'اسم المشرف' : 'Supervisor Name']: s.name,
                    [isAr ? 'رقم الإقامة' : 'Iqama']: s.iqama || '',
                    [isAr ? 'الجوال' : 'Mobile']: s.mobile || '',
                    [isAr ? 'المنطقة المخصصة' : 'Assigned Area']: s.assignedArea || '',
                    [isAr ? 'عدد رؤساء العمال' : 'Foremen Count']: (s.foremen || []).length,
                }));
                break;
            case 'foremen':
                exportRows = detailModal.items.map((f: any) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'رئيس العمال' : 'Foreman Name']: f.name,
                    [isAr ? 'المشرف المسؤول' : 'Supervisor']: f.supervisorName || '',
                    [isAr ? 'رقم الإقامة' : 'Iqama']: f.iqama || '',
                    [isAr ? 'الجوال' : 'Mobile']: f.mobile || '',
                    [isAr ? 'المنطقة' : 'Assigned Area']: f.assignedArea || '',
                    [isAr ? 'عدد العمال' : 'Labour Count']: (f.labours || []).length,
                }));
                break;
            case 'labour':
                exportRows = detailModal.items.map((l: any) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'اسم العامل' : 'Labour Name']: l.name,
                    [isAr ? 'رقم الإقامة' : 'Iqama']: l.iqama || '',
                    [isAr ? 'المهنة' : 'Profession']: l.profession || '',
                    [isAr ? 'الجوال' : 'Mobile']: l.mobile || '',
                    [isAr ? 'رئيس العمال' : 'Foreman']: l.foremanName || '',
                    [isAr ? 'المشرف' : 'Supervisor']: l.supervisorName || '',
                }));
                break;
            case 'campLabour':
                exportRows = detailModal.items.map((c: CampLabour) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'الاسم' : 'Name']: c.name,
                    [isAr ? 'رقم الإقامة' : 'Iqama']: c.iqama || '',
                    [isAr ? 'المهنة' : 'Profession']: c.profession || '',
                    [isAr ? 'اسم السكن' : 'Camp Name']: c.campName || '',
                    [isAr ? 'رقم الغرفة' : 'Room #']: c.roomNumber || '',
                }));
                break;
            case 'crewman':
                exportRows = detailModal.items.map((cr: Crewman) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'الاسم' : 'Name']: cr.name,
                    [isAr ? 'رقم الإقامة' : 'Iqama']: cr.iqama || '',
                    [isAr ? 'الدور / الوظيفة' : 'Role']: cr.role || '',
                    [isAr ? 'المركبة المخصصة' : 'Vehicle Assigned']: cr.vehicleAssigned || '',
                }));
                break;
            case 'projectOfficers':
                exportRows = detailModal.items.map((o: ProjectOfficer) => ({
                    [isAr ? 'المشروع' : 'Project']: detailModal.projectName,
                    [isAr ? 'الاسم' : 'Officer Name']: o.name,
                    [isAr ? 'المسمى الوظيفي' : 'Role']: o.role || '',
                    [isAr ? 'رقم الموظف' : 'Officer ID']: o.officerId || '',
                    [isAr ? 'رقم الإقامة' : 'Iqama']: o.iqama || '',
                    [isAr ? 'الجوال' : 'Mobile']: o.mobile || '',
                }));
                break;
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportRows);
        XLSX.utils.book_append_sheet(wb, ws, 'Details');
        XLSX.writeFile(wb, `${detailModal.projectName}_${detailModal.category}.xlsx`);
    };

    // Export entire project manpower to Excel
    const handleExportProjectExcel = (stat: ProjectManpowerStats) => {
        const isAr = lang === 'ar';
        const transName = getTranslatedProjectName(stat.projectName);
        const wb = XLSX.utils.book_new();

        // 1. Summary Sheet
        const summaryData = [
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'المشروع' : 'Project', [isAr ? 'القيمة' : 'Value']: transName },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'مدير المشروع' : 'Project Manager', [isAr ? 'القيمة' : 'Value']: stat.user.projectManagerName || '-' },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'إجمالي المشرفين' : 'Total Supervisors', [isAr ? 'القيمة' : 'Value']: stat.totalSupervisors },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'إجمالي رؤساء العمال' : 'Total Foremen', [isAr ? 'القيمة' : 'Value']: stat.totalForemen },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'إجمالي العمال' : 'Total Labour', [isAr ? 'القيمة' : 'Value']: stat.totalLabour },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'عمال السكن' : 'Camp Labour', [isAr ? 'القيمة' : 'Value']: stat.campLabour },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'طاقم العمل' : 'Crewman', [isAr ? 'القيمة' : 'Value']: stat.crewMan },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'مسؤولي المشروع' : 'Project Officers', [isAr ? 'القيمة' : 'Value']: stat.officers },
            { [isAr ? 'البيان' : 'Metric']: isAr ? 'إجمالي القوى العاملة' : 'Total Manpower', [isAr ? 'القيمة' : 'Value']: stat.totalManpower },
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

        // 2. Supervisors
        if (stat.supervisors.length > 0) {
            const supRows = stat.supervisors.map(s => ({
                [isAr ? 'اسم المشرف' : 'Supervisor Name']: s.name,
                [isAr ? 'رقم الإقامة' : 'Iqama']: s.iqama,
                [isAr ? 'الجوال' : 'Mobile']: s.mobile,
                [isAr ? 'المنطقة' : 'Area']: s.assignedArea,
                [isAr ? 'عدد رؤساء العمال' : 'Foremen']: (s.foremen || []).length,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(supRows), 'Supervisors');
        }

        // 3. Foremen
        if (stat.foremen.length > 0) {
            const forRows = stat.foremen.map(f => ({
                [isAr ? 'رئيس العمال' : 'Foreman Name']: f.name,
                [isAr ? 'المشرف المسؤول' : 'Supervisor']: f.supervisorName,
                [isAr ? 'رقم الإقامة' : 'Iqama']: f.iqama,
                [isAr ? 'الجوال' : 'Mobile']: f.mobile,
                [isAr ? 'المنطقة' : 'Area']: f.assignedArea,
                [isAr ? 'عدد العمال' : 'Labour']: (f.labours || []).length,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(forRows), 'Foremen');
        }

        // 4. Labours
        if (stat.labours.length > 0) {
            const labRows = stat.labours.map(l => ({
                [isAr ? 'اسم العامل' : 'Labour Name']: l.name,
                [isAr ? 'رقم الإقامة' : 'Iqama']: l.iqama,
                [isAr ? 'المهنة' : 'Profession']: l.profession,
                [isAr ? 'الجوال' : 'Mobile']: l.mobile || '',
                [isAr ? 'رئيس العمال' : 'Foreman']: l.foremanName,
                [isAr ? 'المشرف' : 'Supervisor']: l.supervisorName,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(labRows), 'Labour');
        }

        // 5. Crewmen
        if (stat.crewmen.length > 0) {
            const crewRows = stat.crewmen.map(c => ({
                [isAr ? 'الاسم' : 'Name']: c.name,
                [isAr ? 'رقم الإقامة' : 'Iqama']: c.iqama,
                [isAr ? 'الدور' : 'Role']: c.role,
                [isAr ? 'المركبة المخصصة' : 'Vehicle']: c.vehicleAssigned || '',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(crewRows), 'Crewmen');
        }

        // 6. Camp Labours
        if (stat.campLabours.length > 0) {
            const campRows = stat.campLabours.map(c => ({
                [isAr ? 'الاسم' : 'Name']: c.name,
                [isAr ? 'رقم الإقامة' : 'Iqama']: c.iqama,
                [isAr ? 'المهنة' : 'Profession']: c.profession,
                [isAr ? 'السكن' : 'Camp']: c.campName || '',
                [isAr ? 'الغرفة' : 'Room']: c.roomNumber || '',
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(campRows), 'Camp Labour');
        }

        // 7. Project Officers
        if (stat.projectOfficers.length > 0) {
            const offRows = stat.projectOfficers.map(o => ({
                [isAr ? 'الاسم' : 'Officer Name']: o.name,
                [isAr ? 'المسمى' : 'Role']: o.role,
                [isAr ? 'رقم الموظف' : 'Officer ID']: o.officerId,
                [isAr ? 'رقم الإقامة' : 'Iqama']: o.iqama,
                [isAr ? 'الجوال' : 'Mobile']: o.mobile,
            }));
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(offRows), 'Officers');
        }

        XLSX.writeFile(wb, `${transName}_Manpower_Full_Report.xlsx`);
    };

    // Export ALL Projects Manpower to one comprehensive Excel file
    const handleExportAllProjectsExcel = () => {
        const isAr = lang === 'ar';
        const wb = XLSX.utils.book_new();

        const allProjectsSummary = projectStatsList.map(stat => ({
            [isAr ? 'اسم المشروع' : 'Project Name']: getTranslatedProjectName(stat.projectName),
            [isAr ? 'مدير المشروع' : 'Project Manager']: stat.user.projectManagerName || '-',
            [isAr ? 'المشرفين' : 'Supervisors']: stat.totalSupervisors,
            [isAr ? 'رؤساء العمال' : 'Foremen']: stat.totalForemen,
            [isAr ? 'العمال' : 'Total Labour']: stat.totalLabour,
            [isAr ? 'عمال السكن' : 'Camp Labour']: stat.campLabour,
            [isAr ? 'طاقم العمل' : 'Crewman']: stat.crewMan,
            [isAr ? 'المسؤولين' : 'Project Officers']: stat.officers,
            [isAr ? 'إجمالي القوى العاملة' : 'Total Manpower']: stat.totalManpower,
        }));

        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(allProjectsSummary), 'All Projects');
        XLSX.writeFile(wb, `All_Projects_Manpower_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="w-full space-y-6">
            {/* Top 6 KPI Summary Cards - Exactly matching the Live Web App design */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* 1. Projects Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-orange-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-building"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'المشاريع' : 'Projects'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalProjects}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 2. Supervisors Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-blue-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-user-tie"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'المشرفين' : 'Supervisors'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalSupervisors}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 3. Foremen Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-emerald-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-user-cog"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'رؤساء العمال' : 'Foremen'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalForemen}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 4. Total Labour Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-amber-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-users"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'إجمالي العمال' : 'Total Labour'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalLabour}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 5. Officers Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-purple-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-id-badge"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'الضباط' : 'Officers'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalOfficers}
                            </span>
                        </div>
                    </div>
                </div>

                {/* 6. Total Manpower Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-t-4 border-t-indigo-500 border border-gray-100 dark:border-gray-700 flex items-center justify-between transition-all hover:shadow-md">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center text-lg shadow-sm">
                            <i className="fas fa-users-cog"></i>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium block">
                                {lang === 'ar' ? 'إجمالي القوى' : 'Total Manpower'}
                            </span>
                            <span className="text-2xl font-bold text-gray-900 dark:text-white">
                                {globalStats.totalManpower}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Global Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex-1 min-w-[240px] max-w-md relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input 
                        type="text"
                        value={projectSearchTerm}
                        onChange={(e) => setProjectSearchTerm(e.target.value)}
                        placeholder={lang === 'ar' ? 'البحث عن مشروع بالاسم أو المدير...' : 'Search projects by name or manager...'}
                        className="w-full pl-9 pr-9 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                    />
                    {projectSearchTerm && (
                        <button
                            onClick={() => setProjectSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {lang === 'ar' ? `المشاريع: ${filteredProjects.length}` : `Projects: ${filteredProjects.length}`}
                    </span>
                    <button
                        onClick={handleExportAllProjectsExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow"
                        title="Download All Projects Manpower Report"
                    >
                        <i className="fas fa-file-excel"></i>
                        <span>{lang === 'ar' ? 'تصدير شامل إكسل' : 'Export All Excel'}</span>
                    </button>
                </div>
            </div>

            {/* Grid of Individual Project Manpower Containers (Exact Image 2 Structure) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((stat) => {
                    const transName = getTranslatedProjectName(stat.projectName);

                    return (
                        <div 
                            key={stat.user.email}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 flex flex-col"
                        >
                            {/* Project Container Header */}
                            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-750">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h3 
                                        className="font-bold text-gray-800 dark:text-gray-100 text-base truncate"
                                        title={transName}
                                    >
                                        {transName}
                                    </h3>
                                    {stat.user.projectManagerName && (
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                                            {stat.user.projectManagerName}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    {/* Excel Export Button for this project */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportProjectExcel(stat);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors"
                                        title={lang === 'ar' ? 'تنزيل تقرير إكسل للمشروع' : 'Download Project Excel'}
                                    >
                                        <i className="fas fa-file-excel text-base"></i>
                                    </button>

                                    {/* View Project Overview if handler provided */}
                                    {onViewProjectMenpower && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onViewProjectMenpower(stat.user);
                                            }}
                                            className="p-1.5 text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 transition-colors"
                                            title={lang === 'ar' ? 'عرض تفاصيل المشروع' : 'View Project Dashboard'}
                                        >
                                            <i className="fas fa-external-link-alt text-sm"></i>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Project Manpower Rows - 6 Clickable Categories with Counts and Chevrons */}
                            <div className="p-3 divide-y divide-gray-100 dark:divide-gray-700/60 flex-1 flex flex-col justify-between text-sm">
                                {/* 1. Total Supervisors */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'supervisors')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-blue-50/70 dark:hover:bg-blue-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-user-tie"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'المشرفين' : 'Total Supervisors'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-600 dark:text-blue-400">
                                            {stat.totalSupervisors}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>

                                {/* 2. Total Foremen */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'foremen')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-emerald-50/70 dark:hover:bg-emerald-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-user-cog"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'رؤساء العمال' : 'Total Foremen'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                            {stat.totalForemen}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>

                                {/* 3. Total Labour */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'labour')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-amber-50/70 dark:hover:bg-amber-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-users"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'إجمالي العمال' : 'Total Labour'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-amber-600 dark:text-amber-400">
                                            {stat.totalLabour}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>

                                {/* 4. Camp Labour */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'campLabour')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-orange-50/70 dark:hover:bg-orange-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-campground"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'عمال السكن' : 'Camp Labour'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-orange-600 dark:text-orange-400">
                                            {stat.campLabour}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-orange-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>

                                {/* 5. Crewman */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'crewman')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-rose-50/70 dark:hover:bg-rose-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-hard-hat"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'طاقم العمل' : 'Crewman'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-rose-600 dark:text-rose-400">
                                            {stat.crewMan}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>

                                {/* 6. Project Officer */}
                                <div 
                                    onClick={() => handleOpenDetailModal(stat, 'projectOfficers')}
                                    className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-purple-50/70 dark:hover:bg-purple-950/30 cursor-pointer transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs flex-shrink-0">
                                            <i className="fas fa-id-badge"></i>
                                        </div>
                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                            {lang === 'ar' ? 'مسؤولي المشروع' : 'Project Officer'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-purple-600 dark:text-purple-400">
                                            {stat.officers}
                                        </span>
                                        <i className="fas fa-chevron-right text-xs text-gray-400 group-hover:text-purple-500 group-hover:translate-x-0.5 transition-all rtl:rotate-180"></i>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Total Manpower */}
                            <div className="px-5 py-3 bg-gray-50/70 dark:bg-gray-750/70 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                <span>{lang === 'ar' ? 'إجمالي قوى المشروع:' : 'Total Project Manpower:'}</span>
                                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                                    {stat.totalManpower}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Detail Modal for Clicked Manpower Category */}
            {detailModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-orange-500 text-white">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-users text-lg"></i>
                                <h3 className="text-lg font-bold">
                                    {detailModal.title}
                                </h3>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleExportCategoryExcel}
                                    className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                                    title="Export this list to Excel"
                                >
                                    <i className="fas fa-file-excel"></i>
                                    <span>{lang === 'ar' ? 'تصدير إكسل' : 'Export Excel'}</span>
                                </button>
                                <button
                                    onClick={() => setDetailModal(prev => ({ ...prev, isOpen: false }))}
                                    className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/20 transition-colors"
                                >
                                    <i className="fas fa-times text-lg"></i>
                                </button>
                            </div>
                        </div>

                        {/* Search in modal */}
                        <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-750">
                            <div className="relative">
                                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                                <input
                                    type="text"
                                    value={modalSearchTerm}
                                    onChange={(e) => {
                                        setModalSearchTerm(e.target.value);
                                        setModalPage(1);
                                    }}
                                    placeholder={lang === 'ar' ? 'بحث بالاسم، الإقامة، الجوال...' : 'Search by name, iqama, mobile...'}
                                    className="w-full pl-8 pr-4 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-orange-500 focus:outline-none"
                                />
                            </div>
                        </div>

                        {/* Modal Table Content */}
                        <div className="flex-1 overflow-y-auto p-4">
                            {filteredModalItems.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <i className="fas fa-info-circle text-3xl mb-2"></i>
                                    <p className="text-sm">
                                        {lang === 'ar' ? 'لا توجد بيانات مسجلة في هذا القسم.' : 'No data records found in this section.'}
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                    <table className="w-full text-left text-xs divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold uppercase">
                                            <tr>
                                                <th className="px-3 py-2">#</th>
                                                <th className="px-3 py-2">{lang === 'ar' ? 'الاسم' : 'Name'}</th>
                                                <th className="px-3 py-2">{lang === 'ar' ? 'رقم الإقامة' : 'Iqama'}</th>
                                                {detailModal.category === 'supervisors' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'الجوال' : 'Mobile'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المنطقة' : 'Area'}</th>
                                                        <th className="px-3 py-2 text-center">{lang === 'ar' ? 'رؤساء العمال' : 'Foremen'}</th>
                                                    </>
                                                )}
                                                {detailModal.category === 'foremen' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'الجوال' : 'Mobile'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المنطقة' : 'Area'}</th>
                                                        <th className="px-3 py-2 text-center">{lang === 'ar' ? 'العمال' : 'Labours'}</th>
                                                    </>
                                                )}
                                                {detailModal.category === 'labour' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المهنة' : 'Profession'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'رئيس العمال' : 'Foreman'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المشرف' : 'Supervisor'}</th>
                                                    </>
                                                )}
                                                {detailModal.category === 'campLabour' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المهنة' : 'Profession'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'اسم السكن' : 'Camp'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'الغرفة' : 'Room'}</th>
                                                    </>
                                                )}
                                                {detailModal.category === 'crewman' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'الوظيفة' : 'Role'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المركبة' : 'Vehicle'}</th>
                                                    </>
                                                )}
                                                {detailModal.category === 'projectOfficers' && (
                                                    <>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'المسمى' : 'Role'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'رقم الموظف' : 'Officer ID'}</th>
                                                        <th className="px-3 py-2">{lang === 'ar' ? 'الجوال' : 'Mobile'}</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                                            {paginatedModalItems.map((item: any, idx: number) => {
                                                const globalIndex = (modalPage - 1) * modalPageSize + idx + 1;
                                                return (
                                                    <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                        <td className="px-3 py-2 font-mono text-gray-400">{globalIndex}</td>
                                                        <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white">{item.name || '-'}</td>
                                                        <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-300">{item.iqama || '-'}</td>
                                                        
                                                        {detailModal.category === 'supervisors' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.mobile || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.assignedArea || '-'}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-blue-600">{(item.foremen || []).length}</td>
                                                            </>
                                                        )}
                                                        {detailModal.category === 'foremen' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.supervisorName || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.mobile || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.assignedArea || '-'}</td>
                                                                <td className="px-3 py-2 text-center font-bold text-emerald-600">{(item.labours || []).length}</td>
                                                            </>
                                                        )}
                                                        {detailModal.category === 'labour' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.profession || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.foremanName || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.supervisorName || '-'}</td>
                                                            </>
                                                        )}
                                                        {detailModal.category === 'campLabour' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.profession || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.campName || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.roomNumber || '-'}</td>
                                                            </>
                                                        )}
                                                        {detailModal.category === 'crewman' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.role || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.vehicleAssigned || '-'}</td>
                                                            </>
                                                        )}
                                                        {detailModal.category === 'projectOfficers' && (
                                                            <>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.role || '-'}</td>
                                                                <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-300">{item.officerId || '-'}</td>
                                                                <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{item.mobile || '-'}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer with Pagination */}
                        {modalTotalPages > 1 && (
                            <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex items-center justify-between text-xs">
                                <span className="text-gray-500">
                                    {lang === 'ar' ? `صفحة ${modalPage} من ${modalTotalPages}` : `Page ${modalPage} of ${modalTotalPages}`} ({filteredModalItems.length} {lang === 'ar' ? 'عنصر' : 'items'})
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setModalPage(p => Math.max(1, p - 1))}
                                        disabled={modalPage === 1}
                                        className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        {lang === 'ar' ? 'السابق' : 'Previous'}
                                    </button>
                                    <button
                                        onClick={() => setModalPage(p => Math.min(modalTotalPages, p + 1))}
                                        disabled={modalPage === modalTotalPages}
                                        className="px-2.5 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        {lang === 'ar' ? 'التالي' : 'Next'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAllMenpowerReportPage;