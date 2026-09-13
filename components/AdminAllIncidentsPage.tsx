import React, { useMemo, useState } from 'react';
import { TRANSLATIONS, INCIDENT_TYPES } from '../constants';
import type { Language, User, Incident, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import * as XLSX from 'xlsx';

interface AdminAllIncidentsPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    onViewProjectVehicleHistory?: (user: User) => void;
}

type AdminIncidentView = Incident & { 
    projectName: string; 
    vehicleInfo: string;
    plateNumber: string;
    doorNumber: string;
    vehicleId: string;
};

const AdminAllIncidentsPage: React.FC<AdminAllIncidentsPageProps> = ({ 
    lang, 
    allUsers, 
    allProjectData 
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [incidentProjectFilter, setIncidentProjectFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIncidentForHistory, setSelectedIncidentForHistory] = useState<AdminIncidentView | null>(null);

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const incidentTypeTranslations = useMemo(() => {
        const map: Record<string, string> = {};
        INCIDENT_TYPES.forEach(type => {
            map[type.value] = t[type.labelKey as keyof typeof t] || type.value;
        });
        return map;
    }, [t]);

    const allIncidents: AdminIncidentView[] = useMemo(() => {
        return Object.entries(allProjectData).flatMap(([email, data]: [string, ProjectData]) => {
            const user = allUsers.find(u => u.email === email);
            return (data.incidents || []).map(incident => {
                const vehicle = (data.vehicles || []).find(v => v.id === incident.vehicleId);
                return {
                    ...incident,
                    projectName: user?.projectName || 'N/A',
                    vehicleInfo: vehicle?.doorNumber || 'N/A',
                    plateNumber: vehicle?.plateNumber || 'N/A',
                    doorNumber: vehicle?.doorNumber || 'N/A',
                    vehicleId: incident.vehicleId
                };
            });
        });
    }, [allProjectData, allUsers]);

    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers
            .filter(u => u.projectName && u.projectName !== 'Admin Dashboard')
            .map(user => ({
                value: user.email,
                label: getTranslatedProjectName(user.projectName)
            }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    const filteredIncidents = useMemo(() => {
        let result = allIncidents;

        if (incidentProjectFilter !== 'all') {
            const selectedUser = allUsers.find(u => u.email === incidentProjectFilter);
            if (selectedUser) {
                result = result.filter(i => i.projectName === selectedUser.projectName);
            }
        }

        if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i => 
                i.plateNumber?.toLowerCase().includes(term) ||
                i.doorNumber?.toLowerCase().includes(term) ||
                i.projectName?.toLowerCase().includes(term) ||
                i.type?.toLowerCase().includes(term) ||
                i.description?.toLowerCase().includes(term) ||
                i.date?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [allIncidents, incidentProjectFilter, searchTerm, allUsers]);

    const incidentColumns: Column<AdminIncidentView>[] = useMemo(() => [
        { 
            key: 'plateNumber', 
            header: t.thPlateNumber || 'Plate #', 
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    {item.plateNumber || 'N/A'}
                </span>
            )
        },
        { 
            key: 'doorNumber', 
            header: t.thDoorNumber || 'Door #', 
            sortable: true,
            render: (item) => (
                <button
                    onClick={() => setSelectedIncidentForHistory(item)}
                    className="font-bold text-orange-600 dark:text-orange-400 hover:underline text-xs text-left"
                    title={lang === 'ar' ? 'عرض سجل المركبة' : 'View Vehicle History'}
                >
                    {item.doorNumber || 'N/A'}
                </button>
            )
        },
        { 
            key: 'projectName', 
            header: t.thProjectName || 'Project Name', 
            sortable: true, 
            allowWrap: true,
            render: (item) => (
                <span className="text-gray-800 dark:text-gray-200 text-xs">
                    {getTranslatedProjectName(item.projectName)}
                </span>
            )
        },
        { 
            key: 'type', 
            header: t.thIncidentType || 'Incident Type', 
            sortable: true,
            render: (item) => {
                const label = incidentTypeTranslations[item.type] || item.type;
                const isAcc = item.type?.toLowerCase() === 'accident';
                const isBkd = item.type?.toLowerCase().includes('breakdown');
                const badgeClass = isAcc 
                    ? 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : isBkd
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
                return (
                    <span className={`px-2 py-0.5 rounded text-[11px] font-medium inline-block ${badgeClass}`}>
                        {label}
                    </span>
                );
            }
        },
        { 
            key: 'date', 
            header: t.thIncidentDate || 'Date', 
            sortable: true,
            render: (item) => (
                <span className="font-mono text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {item.date ? new Date(item.date).toLocaleDateString('en-CA') : '-'}
                </span>
            )
        },
        { 
            key: 'description', 
            header: lang === 'ar' ? 'الوصف' : 'DESCRIPTION', 
            sortable: false, 
            allowWrap: true,
            render: (item) => (
                <div 
                    className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 max-w-2xl cursor-pointer hover:text-orange-600 transition-colors"
                    title={item.description}
                    onClick={() => setSelectedIncidentForHistory(item)}
                >
                    {item.description || '-'}
                </div>
            )
        },
    ], [t, lang, getTranslatedProjectName, incidentTypeTranslations]);

    const handleExportExcel = () => {
        const isAr = lang === 'ar';
        const exportData = filteredIncidents.map(incident => ({
            [isAr ? 'رقم اللوحة' : 'Plate #']: incident.plateNumber,
            [isAr ? 'رقم الباب' : 'Door #']: incident.doorNumber,
            [isAr ? 'اسم المشروع' : 'Project Name']: getTranslatedProjectName(incident.projectName),
            [isAr ? 'نوع الحادث' : 'Incident Type']: incidentTypeTranslations[incident.type] || incident.type,
            [isAr ? 'التاريخ' : 'Date']: incident.date ? new Date(incident.date).toLocaleDateString('en-CA') : '',
            [isAr ? 'الوصف' : 'Description']: incident.description,
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Incidents');
        XLSX.writeFile(wb, `Incidents_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const getVehicleHistoryList = (vehicleId: string, projectName: string) => {
        const projectEntry = Object.entries(allProjectData).find(([email]) => {
            const user = allUsers.find(u => u.email === email);
            return user?.projectName === projectName;
        });
        
        if (!projectEntry) return [];
        const [, data] = projectEntry;
        return (data.incidents || [])
            .filter(i => i.vehicleId === vehicleId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            {/* Header matching Example Photo (Image 2) */}
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {t.allIncidentsReport || 'Incidents'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lang === 'ar' ? `إجمالي الحوادث: ${filteredIncidents.length}` : `Total Incidents: ${filteredIncidents.length}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Project Filter Dropdown */}
                    <div className="min-w-[180px] sm:min-w-[220px]">
                        <select
                            value={incidentProjectFilter}
                            onChange={(e) => setIncidentProjectFilter(e.target.value)}
                            className="w-full px-3 py-2 text-xs sm:text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500 focus:outline-none cursor-pointer shadow-sm"
                        >
                            {projectFilterOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Green Excel Export Button */}
                    <button
                        onClick={handleExportExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow cursor-pointer"
                        title="Download Incidents Excel"
                    >
                        <i className="fas fa-file-excel"></i>
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            {/* Quick Search Bar */}
            <div className="mb-4">
                <div className="relative">
                    <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={lang === 'ar' ? 'بحث برقم اللوحة، رقم الباب، المشروع، نوع الحادث، الوصف...' : 'Search by plate #, door #, project, incident type, description...'}
                        className="w-full pl-8 pr-8 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                        >
                            <i className="fas fa-times"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Sleek Compact Table matching Example Photo (Image 2) */}
            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table<AdminIncidentView>
                    columns={incidentColumns}
                    data={filteredIncidents}
                    initialSortKey="date"
                    initialSortDirection="desc"
                    defaultPageSize={15}
                />
            </div>

            {/* Incident & Vehicle History Detail Modal */}
            {selectedIncidentForHistory && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 bg-orange-500 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <i className="fas fa-history text-base"></i>
                                <h3 className="font-bold text-sm sm:text-base">
                                    {t.vehicleHistory} - {selectedIncidentForHistory.doorNumber} ({selectedIncidentForHistory.plateNumber})
                                </h3>
                            </div>
                            <button
                                onClick={() => setSelectedIncidentForHistory(null)}
                                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/20 transition-colors"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-5 overflow-y-auto space-y-4">
                            {/* Selected Incident Details Box */}
                            <div className="bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                                <h4 className="text-xs font-bold text-orange-800 dark:text-orange-300 uppercase tracking-wide mb-2">
                                    {lang === 'ar' ? 'تفاصيل الحادث الحالي' : 'Selected Incident Details'}
                                </h4>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 block">{t.thProjectName}:</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{getTranslatedProjectName(selectedIncidentForHistory.projectName)}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 block">{t.thIncidentDate}:</span>
                                        <span className="font-mono text-gray-800 dark:text-gray-200">{new Date(selectedIncidentForHistory.date).toLocaleDateString('en-CA')}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 block">{t.thIncidentType}:</span>
                                        <span className="font-semibold text-gray-800 dark:text-gray-200">{incidentTypeTranslations[selectedIncidentForHistory.type] || selectedIncidentForHistory.type}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 dark:text-gray-400 block">{t.thStatus || 'Status'}:</span>
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{selectedIncidentForHistory.status || 'Reported'}</span>
                                    </div>
                                </div>
                                <div className="mt-3 pt-3 border-t border-orange-200/60 dark:border-orange-800/60 text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 block mb-1 font-medium">{t.thDescription}:</span>
                                    <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap bg-white dark:bg-gray-800 p-2.5 rounded-lg border border-orange-100 dark:border-orange-900">
                                        {selectedIncidentForHistory.description || '-'}
                                    </p>
                                </div>
                            </div>

                            {/* Previous Incidents History for this vehicle */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2.5 flex items-center gap-2">
                                    <i className="fas fa-list-ul text-orange-500"></i>
                                    {lang === 'ar' ? 'سجل حوادث هذه المركبة' : 'All Incidents for this Vehicle'}
                                </h4>
                                <div className="space-y-2">
                                    {getVehicleHistoryList(selectedIncidentForHistory.vehicleId, selectedIncidentForHistory.projectName).map((hist, idx) => (
                                        <div 
                                            key={hist.id || idx}
                                            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 text-xs space-y-1"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-gray-800 dark:text-gray-200">
                                                    {incidentTypeTranslations[hist.type] || hist.type}
                                                </span>
                                                <span className="font-mono text-gray-500 dark:text-gray-400">
                                                    {new Date(hist.date).toLocaleDateString('en-CA')}
                                                </span>
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300">
                                                {hist.description}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 flex justify-end">
                            <button
                                onClick={() => setSelectedIncidentForHistory(null)}
                                className="px-4 py-1.5 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 transition-colors"
                            >
                                {lang === 'ar' ? 'إغلاق' : 'Close'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAllIncidentsPage;