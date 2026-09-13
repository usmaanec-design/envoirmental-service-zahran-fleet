import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { ProjectOfficer, Language } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditProjectOfficerModal from './EditProjectOfficerModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';
import FormStatus from './ui/FormStatus';

interface ViewProjectOfficersPageProps {
  lang: Language;
  projectOfficers: ProjectOfficer[];
  onUpdateProjectOfficer: (officer: ProjectOfficer) => Promise<void>;
  onDeleteProjectOfficer: (officerId: string) => Promise<void>;
  onDeleteSelectedProjectOfficers: (officerIds: string[]) => Promise<void>;
  onImportProjectOfficers: (data: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
  isReadOnly?: boolean;
}

const ViewProjectOfficersPage: React.FC<ViewProjectOfficersPageProps> = ({ lang, projectOfficers, onUpdateProjectOfficer, onDeleteProjectOfficer, onDeleteSelectedProjectOfficers, onImportProjectOfficers, isReadOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [officerToEdit, setOfficerToEdit] = useState<ProjectOfficer | null>(null);
    const [officerToDelete, setOfficerToDelete] = useState<ProjectOfficer | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [importProgress, setImportProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const filteredOfficers = useMemo(() => {
        if (!searchTerm.trim()) return projectOfficers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return projectOfficers.filter(officer =>
            officer.name.toLowerCase().includes(lowercasedFilter) ||
            officer.iqama.includes(lowercasedFilter) ||
            officer.role.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, projectOfficers]);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (officerToDelete) {
            try {
                await onDeleteProjectOfficer(officerToDelete.id);
                setOfficerToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete officer.";
                setActionError(message);
            }
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        setActionError(null);
        if (selectedIds.length > 0) {
            try {
                await onDeleteSelectedProjectOfficers(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete selected officers.";
                setActionError(message);
            }
        }
    };

    const handleSaveUpdate = async (officer: ProjectOfficer) => {
        await onUpdateProjectOfficer(officer);
        setOfficerToEdit(null);
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                setImportProgress(0);
                const data = await readExcelFile(file);
                const result = await onImportProjectOfficers(data, setImportProgress);
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
    
    const columns: Column<ProjectOfficer>[] = useMemo(() => {
        const baseColumns: Column<ProjectOfficer>[] = [
            { key: 'role', header: t.officerRole, sortable: true },
            { key: 'name', header: t.officerName, sortable: true },
            { key: 'id', header: t.officerId || 'Officer ID', sortable: true },
            { key: 'iqama', header: t.officerIqama, sortable: true },
            { key: 'mobile', header: t.officerMobile, sortable: false, render: (o) => o.mobile || 'N/A' },
        ];

        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (officer: ProjectOfficer) => (
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <button onClick={() => setOfficerToEdit(officer)} className="text-orange-500 hover:text-orange-700 p-2" title={t.editOfficerTitle}><i className="fas fa-edit"></i></button>
                        <button onClick={() => setOfficerToDelete(officer)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteOfficerTitle}><i className="fas fa-trash"></i></button>
                    </div>
                )
            });
        }
        
        return baseColumns;
    }, [t, isReadOnly]);
    
    const exportData = useMemo(() => {
        const headers = {
            [t.officerRole]: "",
            [t.officerName]: "",
            [t.officerId || 'Officer ID']: "",
            [t.officerIqama]: "",
            [t.officerMobile]: "",
        };

        if (filteredOfficers.length === 0) {
            return [headers];
        }

        return filteredOfficers.map(officer => ({
            [t.officerRole]: officer.role,
            [t.officerName]: officer.name,
            [t.officerId || 'Officer ID']: officer.id,
            [t.officerIqama]: officer.iqama,
            [t.officerMobile]: officer.mobile, // Remove +966 from export
        }));
    }, [filteredOfficers, t]);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
             <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.viewProjectOfficers}</h2>
                 <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-full sm:w-auto sm:min-w-[220px]">
                        <Input 
                            name="search"
                            placeholder={t.searchByNameOrIqama}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClear={() => setSearchTerm('')}
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && !isReadOnly && (
                            <button onClick={() => setIsBulkDeleteModalOpen(true)} className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm">
                                <i className="fas fa-trash-alt me-1.5"></i>
                                <span>{t.deleteSelected.replace('{count}', String(selectedIds.length))}</span>
                            </button>
                        )}
                         {!isReadOnly && (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
                                <button onClick={handleImportClick} className="bg-purple-600 text-white px-3.5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm" title={t.importProjectOfficers}>
                                    <i className="fas fa-file-import me-1.5"></i>
                                    <span>{t.import}</span>
                                </button>
                            </>
                         )}
                        <ExportButtons data={exportData} title={t.exportOfficers} />
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {t.importing || 'Importing'}: {importProgress}%
                    </p>
                </div>
            )}
            
            {filteredOfficers.length > 0 ? (
                <Table<ProjectOfficer>
                    columns={columns}
                    data={filteredOfficers}
                    initialSortKey="role"
                    selectable={!isReadOnly}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-user-shield text-4xl mb-4"></i>
                    <p className="text-lg">{t.noOfficersFound}</p>
                </div>
            )}
            
            {!isReadOnly && (
                <>
                    <EditProjectOfficerModal
                        isOpen={!!officerToEdit}
                        onClose={() => setOfficerToEdit(null)}
                        onSave={handleSaveUpdate}
                        officer={officerToEdit}
                        lang={lang}
                    />

                    {officerToDelete && (
                        <ConfirmationModal
                            isOpen={!!officerToDelete}
                            onClose={() => { setOfficerToDelete(null); setActionError(null); }}
                            onConfirm={handleConfirmDelete}
                            title={t.deleteOfficerTitle}
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {t.deleteOfficerMessage} <span className="font-semibold">{officerToDelete.name}</span>
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
                        title={t.deleteSelectedItemsTitle}
                        message={t.deleteSelectedItemsMessage.replace('{count}', String(selectedIds.length))}
                        confirmButtonText={t.confirmDelete}
                        cancelButtonText={t.cancel}
                    />
                </>
            )}
        </div>
    );
};

export default ViewProjectOfficersPage;