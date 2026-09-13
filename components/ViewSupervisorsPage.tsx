import React, { useMemo, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Supervisor, Labour, Foreman } from '../types';
import Table, { type Column } from './ui/Table';
import ConfirmationModal from './ui/ConfirmationModal';
import Select from './ui/Select';

interface ViewSupervisorsPageProps {
    lang: Language;
    supervisors: Supervisor[];
    onEditSupervisor: (supervisorId: string) => void;
    onDeleteSupervisor: (supervisorId: string) => Promise<void>;
    isReadOnly?: boolean;
}

type Tab = 'overview' | 'foremen' | 'labours';

const ViewSupervisorsPage: React.FC<ViewSupervisorsPageProps> = ({ lang, supervisors, onEditSupervisor, onDeleteSupervisor, isReadOnly = false }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    
    const [selectedSupervisor, setSelectedSupervisor] = useState<Supervisor | null>(null);
    const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [selectedForemanForOverview, setSelectedForemanForOverview] = useState<Foreman | null>(null);
    const [filteredForemanId, setFilteredForemanId] = useState<string | null>(null);

    useEffect(() => {
        if (supervisors.length > 0 && !selectedSupervisor) {
            setSelectedSupervisor(supervisors[0]);
        }
        if (supervisors.length === 0) {
            setSelectedSupervisor(null);
        }
    }, [supervisors, selectedSupervisor]);

    const handleSelectSupervisor = (supervisor: Supervisor) => {
        setSelectedSupervisor(supervisor);
        setActiveTab('overview');
        setSelectedForemanForOverview(null);
        setFilteredForemanId(null);
    };
    
    const handleForemanClickForLaboursTab = (foremanId: string) => {
        setFilteredForemanId(foremanId);
        setActiveTab('labours');
    };

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (supervisorToDelete) {
            try {
                await onDeleteSupervisor(supervisorToDelete.id);
                if (selectedSupervisor?.id === supervisorToDelete.id) {
                    setSelectedSupervisor(supervisors.length > 1 ? supervisors.find(s => s.id !== supervisorToDelete.id) || null : null);
                }
                setSupervisorToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete supervisor.";
                console.error("Delete supervisor error:", e);
                setActionError(message);
            }
        }
    };
    
    const labourColumns: Column<Labour>[] = useMemo(() => [
        { key: 'name', header: t.labourName, sortable: true },
        { key: 'iqama', header: t.labourIqama, sortable: true },
        { key: 'empId', header: t.labourEmpId, sortable: true },
    ], [t]);
    
    const allForemenColumns: Column<Foreman>[] = useMemo(() => [
        { 
            key: 'name', 
            header: t.foremanName, 
            sortable: true,
            render: (f) => (
                <button 
                    onClick={() => handleForemanClickForLaboursTab(f.id)} 
                    className="text-orange-600 hover:underline font-semibold dark:text-orange-400 dark:hover:text-orange-300"
                >
                    {f.name}
                </button>
            )
        },
        { key: 'iqama', header: t.foremanIqama, sortable: true },
        { key: 'empId', header: t.foremanEmpId, sortable: true },
        { key: 'labours' as any, header: t.totalLabours, sortable: true, render: (f) => f.labours?.length || 0 },
    ], [t]);
    
    const labourFilterOptions = useMemo(() => {
        if (!selectedSupervisor || !selectedSupervisor.foremen) return [];
        return selectedSupervisor.foremen.map(f => ({ value: f.id, label: `${f.name} (${f.empId || f.iqama})` }));
    }, [selectedSupervisor]);

    const filteredLabours = useMemo(() => {
        if (!selectedSupervisor || !selectedSupervisor.foremen || !filteredForemanId) return [];
        const foreman = selectedSupervisor.foremen.find(f => f.id === filteredForemanId);
        return foreman?.labours || [];
    }, [selectedSupervisor, filteredForemanId]);

    const TabButton: React.FC<{ tabId: Tab, children: React.ReactNode }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors duration-200 ${
                activeTab === tabId
                    ? 'bg-orange-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
        >
            {children}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row h-full gap-6 max-w-full mx-auto">
            {/* Left Sidebar */}
            <div className="md:w-1/4 lg:w-1/5 flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">{t.supervisors}</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                    <div className="space-y-2">
                        {supervisors.map(s => (
                        <div
                            key={s.id}
                            onClick={() => handleSelectSupervisor(s)}
                            className={`p-3 rounded-lg cursor-pointer transition-colors duration-200 ${
                                selectedSupervisor?.id === s.id
                                    ? 'bg-orange-600 text-white shadow-md'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold">{s.name}</p>
                                    <p className={`text-xs ${selectedSupervisor?.id === s.id ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`}>{s.area || s.empId}</p>
                                </div>
                                {!isReadOnly && (
                                     <div className="flex items-center space-x-1 rtl:space-x-reverse flex-shrink-0">
                                        <button onClick={(e) => { e.stopPropagation(); onEditSupervisor(s.id); }} className={`p-2 rounded-full ${selectedSupervisor?.id === s.id ? 'hover:bg-orange-700' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={t.editSupervisorTitle}><i className="fas fa-edit text-xs"></i></button>
                                        <button onClick={(e) => { e.stopPropagation(); setSupervisorToDelete(s); }} className={`p-2 rounded-full ${selectedSupervisor?.id === s.id ? 'hover:bg-orange-700' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}`} title={t.deleteSupervisorTitle}><i className="fas fa-trash text-xs"></i></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            </div>

            {/* Right Content Panel */}
            <div className="flex-grow bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col">
                {selectedSupervisor ? (
                    <div className="flex flex-col h-full">
                        {/* Header - Fixed */}
                        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t.supervisorDetails}</h1>
                            <div className="flex space-x-4 rtl:space-x-reverse">
                                <TabButton tabId="overview">{t.overview}</TabButton>
                                <TabButton tabId="foremen">{t.foremen}</TabButton>
                                <TabButton tabId="labours">{t.labours}</TabButton>
                            </div>
                        </div>

                        {/* Content - Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                     <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-700">
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                            <div><p className="text-xs text-gray-500">{t.supervisorName}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{selectedSupervisor.name}</p></div>
                                            <div><p className="text-xs text-gray-500">{t.employeeId}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{selectedSupervisor.empId || 'N/A'}</p></div>
                                            <div><p className="text-xs text-gray-500">{t.supervisorIqama}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{selectedSupervisor.iqama || 'N/A'}</p></div>
                                            <div><p className="text-xs text-gray-500">{t.supervisorMobile}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{selectedSupervisor.mobile ? `+966 ${selectedSupervisor.mobile}` : 'N/A'}</p></div>
                                            <div><p className="text-xs text-gray-500">{t.areaLocation}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{selectedSupervisor.area || 'N/A'}</p></div>
                                            <div>
                                                <p className="text-xs text-gray-500">{lang === 'ar' ? 'إجمالي العمال' : 'Total Labour'}</p>
                                                <p className="font-semibold text-orange-600 dark:text-orange-400 text-lg">
                                                    {(selectedSupervisor.foremen || []).reduce((total, foreman) => 
                                                        total + (foreman.labours?.length || 0), 0
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-lg font-semibold mb-3">{t.foremen} ({selectedSupervisor.foremen?.length || 0})</h3>
                                    <div className="max-h-96 overflow-y-auto pr-2 space-y-2 border rounded-lg bg-gray-50 dark:bg-gray-800 p-4 scrollbar-thin scrollbar-thumb-orange-400 scrollbar-track-gray-200 dark:scrollbar-track-gray-700">
                                        {(selectedSupervisor.foremen || []).length > 0 ? (
                                            (selectedSupervisor.foremen || []).map(foreman => (
                                            <div 
                                                key={foreman.id} 
                                                onClick={() => {
                                                    setFilteredForemanId(foreman.id);
                                                    setActiveTab('labours');
                                                }} 
                                                className="p-3 rounded-lg cursor-pointer transition-all duration-200 border bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-orange-300 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                            >
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                                                    <div><p className="text-xs text-gray-500">{t.foremanName}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{foreman.name}</p></div>
                                                    <div><p className="text-xs text-gray-500">{t.foremanIqama}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{foreman.iqama || 'N/A'}</p></div>
                                                    <div><p className="text-xs text-gray-500">{t.totalLabours}</p><p className="font-semibold text-gray-800 dark:text-gray-200">{foreman.labours?.length || 0}</p></div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-orange-600 font-medium">
                                                            <i className="fas fa-arrow-right mr-1"></i>
                                                            {lang === 'ar' ? 'عرض العمال' : 'View Labours'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                                <i className="fas fa-users text-3xl mb-2"></i>
                                                <p>{lang === 'ar' ? 'لا يوجد مراقبون' : 'No Foremen Found'}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                             {activeTab === 'foremen' && <Table columns={allForemenColumns} data={selectedSupervisor.foremen || []} initialSortKey="name" />}
                             {activeTab === 'labours' && (
                                 <div className="space-y-4">
                                     {filteredForemanId ? (
                                         <div>
                                             <div className="flex items-center justify-between mb-4">
                                                 <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                                                     {t.labourDetails} - {selectedSupervisor.foremen?.find(f => f.id === filteredForemanId)?.name}
                                                 </h3>
                                                 <button
                                                     onClick={() => setFilteredForemanId(null)}
                                                     className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                                 >
                                                     <i className="fas fa-times mr-1"></i>
                                                     {lang === 'ar' ? 'مسح الفلتر' : 'Clear Filter'}
                                                 </button>
                                             </div>
                                             <Table columns={labourColumns} data={filteredLabours} initialSortKey="name" />
                                         </div>
                                     ) : (
                                         <div className="text-center py-8">
                                             <div className="max-w-xs mx-auto mb-4">
                                                <Select
                                                    label={t.selectForeman}
                                                    name="foremanFilter"
                                                    value=""
                                                    onChange={(e) => setFilteredForemanId(e.target.value)}
                                                    options={labourFilterOptions}
                                                    placeholder={t.selectForeman}
                                                />
                                             </div>
                                             <p className="text-gray-500 text-sm">
                                                 {lang === 'ar' 
                                                     ? 'أو انقر على صف المراقب في علامة التبويب النظرة العامة لعرض العمال' 
                                                     : 'Or click on foreman row in Overview tab to view labours'
                                                 }
                                             </p>
                                         </div>
                                     )}
                                 </div>
                             )}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
                        <i className="fas fa-list-alt text-5xl mb-4"></i>
                        <p className="text-lg font-semibold">{supervisors.length > 0 ? t.selectSupervisorToView : t.noSupervisorsFound}</p>
                    </div>
                )}
            </div>
            
            {!isReadOnly && supervisorToDelete && (
                 <ConfirmationModal
                    isOpen={!!supervisorToDelete}
                    onClose={() => { setSupervisorToDelete(null); setActionError(null); }}
                    onConfirm={handleConfirmDelete}
                    title={t.deleteSupervisorTitle}
                    message={<>{actionError && <p className="text-red-500 mb-2">{actionError}</p>} {t.deleteSupervisorMessage} <br/><span className="font-semibold">{supervisorToDelete.name}</span></>}
                    confirmButtonText={t.confirmDelete}
                    cancelButtonText={t.cancel}
                />
            )}
        </div>
    );
};

export default ViewSupervisorsPage;