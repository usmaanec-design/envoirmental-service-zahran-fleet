import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Supervisor, Language } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditSupervisorModal from './EditSupervisorModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';
import FormStatus from './ui/FormStatus';

interface ViewSupervisorsTablePageProps {
    lang: Language;
    supervisors: Supervisor[];
    onUpdateSupervisor: (supervisor: Supervisor) => Promise<void>;
    onDeleteSupervisor: (supervisorId: string) => Promise<void>;
    onDeleteSelectedSupervisors: (supervisorIds: string[]) => Promise<void>;
    onImportSupervisors: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
    onNavigate?: (page: string) => void;
    isReadOnly?: boolean;
}

const ViewSupervisorsTablePage: React.FC<ViewSupervisorsTablePageProps> = ({ 
    lang, 
    supervisors, 
    onUpdateSupervisor, 
    onDeleteSupervisor, 
    onDeleteSelectedSupervisors, 
    onImportSupervisors, 
    onNavigate,
    isReadOnly = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [supervisorToEdit, setSupervisorToEdit] = useState<Supervisor | null>(null);
    const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [importProgress, setImportProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const filteredSupervisors = useMemo(() => {
        if (!searchTerm.trim()) return supervisors;
        const lowercasedFilter = searchTerm.toLowerCase();
        return supervisors.filter(supervisor =>
            supervisor.name.toLowerCase().includes(lowercasedFilter) ||
            supervisor.iqama.includes(lowercasedFilter) ||
            (supervisor.empId && supervisor.empId.includes(lowercasedFilter)) ||
            (supervisor.area && supervisor.area.toLowerCase().includes(lowercasedFilter))
        );
    }, [searchTerm, supervisors]);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (supervisorToDelete) {
            try {
                await onDeleteSupervisor(supervisorToDelete.id);
                setSupervisorToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete supervisor.";
                setActionError(message);
            }
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        setActionError(null);
        if (selectedIds.length > 0) {
            try {
                await onDeleteSelectedSupervisors(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete selected supervisors.";
                setActionError(message);
            }
        }
    };

    const handleEditSupervisor = (supervisor: Supervisor) => {
        // Store supervisor data in localStorage for editing
        localStorage.setItem('editingSupervisor', JSON.stringify(supervisor));
        // Navigate to Add Manpower page
        if (onNavigate) {
            onNavigate('addManpower');
        }
    };

    const handleSaveEdit = async (updatedSupervisor: Supervisor) => {
        try {
            await onUpdateSupervisor(updatedSupervisor);
            setSupervisorToEdit(null);
            setActionError(null);
        } catch (error) {
            setActionError(error instanceof Error ? error.message : (t as any).updateFailed || 'Failed to update supervisor');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                setImportProgress(0);
                const data = await readExcelFile(file);
                const result = await onImportSupervisors(data, setImportProgress);
                if (result.success) {
                    setImportStatus({ type: 'success', message: t.importSuccess });
                } else {
                    setImportStatus({ type: 'error', message: result.error || t.importError });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : t.importError;
                setImportStatus({ type: 'error', message });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = '';
                setImportProgress(null);
                setTimeout(() => setImportStatus(null), 5000);
            }
        }
    };
    
    const columns: Column<Supervisor>[] = useMemo(() => {
        const baseColumns: Column<Supervisor>[] = [
            { 
                key: 'name', 
                header: t.supervisorName, 
                sortable: true,
                render: (s) => <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{s.name}</span>
            },
            { 
                key: 'iqama', 
                header: t.supervisorIqama, 
                sortable: true,
                render: (s) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{s.iqama}</span>
            },
            { 
                key: 'empId', 
                header: t.supervisorEmpId || 'ID Number', 
                sortable: true, 
                render: (s) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{s.empId || '-'}</span>
            },
            { 
                key: 'area', 
                header: t.assignedAreaName || 'Assigned Area', 
                sortable: true, 
                render: (s) => <span className="text-xs text-gray-700 dark:text-gray-300">{s.area || '-'}</span>
            },
            { 
                key: 'totalForemen' as any, 
                header: t.totalForman || 'Total Foremen', 
                sortable: true, 
                render: (s) => <span className="font-bold text-xs text-orange-600 dark:text-orange-400">{s.foremen?.length || 0}</span>
            },
            { 
                key: 'totalLabour' as any, 
                header: t.totalLabour, 
                sortable: true, 
                render: (s) => <span className="font-bold text-xs text-green-600 dark:text-green-400">{s.foremen?.reduce((total, foreman) => total + (foreman.labours?.length || 0), 0) || 0}</span>
            },
            { 
                key: 'mobile', 
                header: t.supervisorMobile, 
                sortable: false, 
                render: (s) => <span className="font-mono text-xs text-gray-700 dark:text-gray-300">{s.mobile || '-'}</span>
            },
        ];

        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (supervisor: Supervisor) => (
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={() => handleEditSupervisor(supervisor)} 
                            className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950/30 rounded transition-colors" 
                            title={t.editSupervisorTitle}
                        >
                            <i className="fas fa-edit text-xs"></i>
                        </button>
                        <button 
                            onClick={() => setSupervisorToDelete(supervisor)} 
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors" 
                            title={t.deleteSupervisorTitle}
                        >
                            <i className="fas fa-trash text-xs"></i>
                        </button>
                    </div>
                )
            });
        }
        
        return baseColumns;
    }, [t, isReadOnly, handleEditSupervisor]);
    
    const exportData = useMemo(() => {
        return filteredSupervisors.map(supervisor => ({
            [t.supervisorName]: supervisor.name,
            [t.supervisorIqama]: supervisor.iqama,
            [t.supervisorEmpId || 'Employee ID']: supervisor.empId || '',
            [t.assignedAreaName || 'Assigned Area']: supervisor.area || '',
            [t.totalForman || 'Total Foremen']: supervisor.foremen?.length || 0,
            [t.totalLabour]: supervisor.foremen?.reduce((total, foreman) => total + (foreman.labours?.length || 0), 0) || 0,
            [t.supervisorMobile]: supervisor.mobile || '',
        }));
    }, [filteredSupervisors, t]);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.viewSupervisors}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-full sm:w-auto sm:min-w-[220px]">
                        <Input 
                            name="search"
                            placeholder={t.searchBySupervisorNameOrIqama || t.searchByNameOrIqama}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && !isReadOnly && (
                            <button 
                                onClick={() => setIsBulkDeleteModalOpen(true)} 
                                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm"
                            >
                                <i className="fas fa-trash-alt me-1.5"></i>
                                <span>{t.deleteSelected.replace('{count}', String(selectedIds.length))}</span>
                            </button>
                        )}
                        {!isReadOnly && (
                            <>
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileChange} 
                                    style={{ display: 'none' }} 
                                    accept=".xlsx, .xls" 
                                />
                                <button 
                                    onClick={handleImportClick} 
                                    className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer" 
                                    title={t.importSupervisors}
                                >
                                    <i className="fas fa-file-import text-xs sm:text-sm"></i>
                                    <span>{t.import}</span>
                                </button>
                            </>
                        )}
                        <ExportButtons data={exportData} title={t.exportSupervisors} />
                    </div>
                </div>
            </div>

            {importStatus && <FormStatus type={importStatus.type} message={importStatus.message} />}
            
            {importProgress !== null && (
                <div className="mb-4">
                    <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                        <div 
                            className="bg-orange-500 h-2.5 rounded-full transition-all duration-300" 
                            style={{ width: `${importProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {t.importing || 'Importing'}: {importProgress}%
                    </p>
                </div>
            )}
            
            {filteredSupervisors.length > 0 ? (
                <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    <Table<Supervisor>
                        columns={columns}
                        data={filteredSupervisors}
                        initialSortKey="name"
                        defaultPageSize={15}
                        selectable={!isReadOnly}
                        selectedIds={selectedIds}
                        onSelectionChange={setSelectedIds}
                    />
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-user-shield text-4xl mb-4"></i>
                    <p className="text-lg">{t.noSupervisorsFoundSearch || t.noSupervisorsFound}</p>
                </div>
            )}
            
            {!isReadOnly && (
                <>
                    <EditSupervisorModal
                        isOpen={!!supervisorToEdit}
                        onClose={() => setSupervisorToEdit(null)}
                        onSave={handleSaveEdit}
                        supervisor={supervisorToEdit}
                        lang={lang}
                    />

                    {supervisorToDelete && (
                        <ConfirmationModal
                            isOpen={!!supervisorToDelete}
                            onClose={() => { setSupervisorToDelete(null); setActionError(null); }}
                            onConfirm={handleConfirmDelete}
                            title={t.deleteSupervisorTitle}
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {t.deleteSupervisorMessage} <span className="font-semibold">{supervisorToDelete.name}</span>
                                </>
                            }
                            confirmButtonText={t.confirmDelete}
                            cancelButtonText={t.cancel}
                        />
                    )}

                    <ConfirmationModal
                        isOpen={isBulkDeleteModalOpen}
                        onClose={() => setIsBulkDeleteModalOpen(false)}
                        onConfirm={handleConfirmBulkDelete}
                        title={t.deleteSupervisorsTitle || t.deleteSelectedItemsTitle}
                        message={t.deleteSupervisorsMessage?.replace('{count}', String(selectedIds.length)) || t.deleteSelectedItemsMessage.replace('{count}', String(selectedIds.length))}
                        confirmButtonText={t.confirmDelete}
                        cancelButtonText={t.cancel}
                    />
                </>
            )}
        </div>
    );
};

export default ViewSupervisorsTablePage;