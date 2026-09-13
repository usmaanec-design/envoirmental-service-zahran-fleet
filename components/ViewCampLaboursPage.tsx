import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Labour, Language } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditLabourModal from './EditLabourModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';
import FormStatus from './ui/FormStatus';

interface ViewCampLaboursPageProps {
  lang: Language;
  campLabours: Labour[];
  onUpdateLabour: (labour: Labour) => Promise<void>;
  onDeleteLabour: (labourId: string) => Promise<void>;
  onDeleteSelectedCampLabours: (labourIds: string[]) => Promise<void>;
  onImportCampLabours: (data: any[]) => Promise<{ success: boolean, error?: string }>;
  isReadOnly?: boolean;
}

const ViewCampLaboursPage: React.FC<ViewCampLaboursPageProps> = ({ lang, campLabours, onUpdateLabour, onDeleteLabour, onDeleteSelectedCampLabours, onImportCampLabours, isReadOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [labourToEdit, setLabourToEdit] = useState<Labour | null>(null);
    const [labourToDelete, setLabourToDelete] = useState<Labour | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const filteredCampLabours = useMemo(() => {
        if (!searchTerm.trim()) return campLabours;
        const lowercasedFilter = searchTerm.toLowerCase();
        return campLabours.filter(c =>
            c.name.toLowerCase().includes(lowercasedFilter) ||
            c.iqama.includes(lowercasedFilter) ||
            c.empId.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, campLabours]);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (labourToDelete) {
            try {
                await onDeleteLabour(labourToDelete.id);
                setLabourToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete camp labour.";
                setActionError(message);
            }
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        setActionError(null);
        if (selectedIds.length > 0) {
            try {
                await onDeleteSelectedCampLabours(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete selected camp labours.";
                setActionError(message);
            }
        }
    };

    const handleSaveUpdate = async (labour: Labour) => {
        await onUpdateLabour(labour);
        setLabourToEdit(null);
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const data = await readExcelFile(file);
                const result = await onImportCampLabours(data);
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
                setTimeout(() => setImportStatus(null), 5000);
            }
        }
    };
    
    const columns: Column<Labour>[] = useMemo(() => {
        const baseColumns: Column<Labour>[] = [
            { key: 'name', header: t.labourName, sortable: true },
            { key: 'iqama', header: t.labourIqama, sortable: true },
            { key: 'empId', header: t.labourEmpId, sortable: true },
        ];

        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (labour: Labour) => (
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <button onClick={() => setLabourToEdit(labour)} className="text-orange-500 hover:text-orange-700 p-2" title={t.editLabourTitle}><i className="fas fa-edit"></i></button>
                        <button onClick={() => setLabourToDelete(labour)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteLabourTitle}><i className="fas fa-trash"></i></button>
                    </div>
                )
            });
        }
        
        return baseColumns;
    }, [t, isReadOnly]);
    
    const exportData = useMemo(() => {
        const headers = {
            [t.labourName]: "",
            [t.labourIqama]: "",
            'empid': "",
        };

        if (filteredCampLabours.length === 0) {
            return [headers];
        }

        return filteredCampLabours.map(c => ({
            [t.labourName]: c.name,
            [t.labourIqama]: c.iqama,
            'empid': c.empId,
        }));
    }, [filteredCampLabours, t]);

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
             <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.viewCampLabours}</h2>
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
                                <button onClick={handleImportClick} className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-sm transition-all hover:shadow cursor-pointer" title={t.importCampLabours}>
                                    <i className="fas fa-file-import text-xs sm:text-sm"></i>
                                    <span>{t.import}</span>
                                </button>
                            </>
                         )}
                        <ExportButtons data={exportData} title={t.viewCampLabours} />
                     </div>
                </div>
            </div>

            {importStatus && <FormStatus type={importStatus.type} message={importStatus.message} />}
            
            {filteredCampLabours.length > 0 ? (
                <Table<Labour>
                    columns={columns}
                    data={filteredCampLabours}
                    initialSortKey="name"
                    selectable={!isReadOnly}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-campground text-4xl mb-4"></i>
                    <p className="text-lg">{t.noCampLaboursFound}</p>
                </div>
            )}
            
            {!isReadOnly && (
                <>
                    <EditLabourModal
                        isOpen={!!labourToEdit}
                        onClose={() => setLabourToEdit(null)}
                        onSave={handleSaveUpdate}
                        labour={labourToEdit}
                        lang={lang}
                    />

                    {labourToDelete && (
                        <ConfirmationModal
                            isOpen={!!labourToDelete}
                            onClose={() => { setLabourToDelete(null); setActionError(null); }}
                            onConfirm={handleConfirmDelete}
                            title={t.deleteLabourTitle}
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {t.deleteLabourMessage} <span className="font-semibold">{labourToDelete.name}</span>
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

export default ViewCampLaboursPage;
