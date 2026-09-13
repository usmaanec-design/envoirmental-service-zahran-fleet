import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Driver, Language, Vehicle } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditDriverModal from './EditDriverModal';
import ExportButtons from './ui/ExportButtons';
import FormStatus from './ui/FormStatus';
import { readExcelFile } from '../utils/export';

interface ViewDriversPageProps {
  lang: Language;
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateDriver: (driver: Driver) => Promise<void>;
  onDeleteDriver: (driverId: string) => Promise<void>;
  onDeleteSelectedDrivers: (driverIds: string[]) => Promise<void>;
  onImportDrivers: (driversData: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
  isReadOnly?: boolean;
}

const ViewDriversPage: React.FC<ViewDriversPageProps> = ({ lang, drivers, vehicles, onUpdateDriver, onDeleteDriver, onDeleteSelectedDrivers, onImportDrivers, isReadOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
    const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [importProgress, setImportProgress] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const vehiclesMap = useMemo(() => {
        return vehicles.reduce((acc, vehicle) => {
            acc[vehicle.id] = vehicle;
            return acc;
        }, {} as Record<string, Vehicle>);
    }, [vehicles]);

    const filteredDrivers = useMemo(() => {
        if (!searchTerm.trim()) return drivers;
        const lowercasedFilter = searchTerm.toLowerCase();
        return drivers.filter(driver =>
            driver.driverName.toLowerCase().includes(lowercasedFilter) ||
            driver.driverIqama.includes(lowercasedFilter) ||
            driver.driverIdNumber?.toLowerCase().includes(lowercasedFilter) ||
            driver.nationality.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, drivers]);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (driverToDelete) {
            try {
                await onDeleteDriver(driverToDelete.id);
                setDriverToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete driver.";
                console.error("Delete driver error:", e);
                setActionError(message);
            }
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        setActionError(null);
        if (selectedIds.length > 0) {
            try {
                await onDeleteSelectedDrivers(selectedIds);
                setImportStatus({ type: 'info', message: `Successfully deleted ${selectedIds.length} drivers.` });
                setTimeout(() => setImportStatus(null), 5000);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete selected drivers.";
                console.error("Bulk delete drivers error:", e);
                setActionError(message);
            }
        }
    };

    const handleSaveDriverUpdate = async (driver: Driver) => {
        await onUpdateDriver(driver);
        setDriverToEdit(null);
    }

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const data = await readExcelFile(file);

                // progress callback
                const onProgress = (percent: number) => {
                    setImportProgress(percent);
                    setImportStatus({ type: 'info', message: `${percent}% ${t.importing || 'Importing...'}` });
                };

                const result = await onImportDrivers(data, onProgress);
                 if (result.success) {
                    setImportStatus({ type: 'success', message: t.importSuccess });
                } else {
                    setImportStatus({ type: 'error', message: result.error || t.importError });
                }
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : t.importError;
                setImportStatus({ type: 'error', message });
            } finally {
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setImportProgress(null);
                setTimeout(() => setImportStatus(null), 5000);
            }
        }
    };
    
    const columns: Column<Driver>[] = useMemo(() => {
        const baseColumns: Column<Driver>[] = [
            { key: 'driverName', header: t.thDriverName, sortable: true, allowWrap: true },
            { key: 'nationality', header: t.nationality, sortable: true },
            { key: 'driverIqama', header: t.thIqama, sortable: true },
            { key: 'driverIdNumber', header: lang === 'ar' ? 'رقم الهوية' : 'ID Number', sortable: true },
            { key: 'driverMobile', header: t.thMobile, sortable: false, render: (driver: Driver) => `+966 ${driver.driverMobile}` },
            { 
                key: 'assignedVehicle',
                header: t.thAssignedVehicle, 
                sortable: true,
                allowWrap: true,
                render: (driver: Driver) => {
                    const vehicle = vehiclesMap[driver.assignedVehicle];
                    return vehicle ? `${vehicle.doorNumber} - ${vehicle.plateNumber}` : <span className="text-gray-500 dark:text-gray-400 italic">{t.unassigned}</span>;
                }
            },
        ];

        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (driver: Driver) => (
                    <div className="flex space-x-2 rtl:space-x-reverse">
                        <button onClick={() => setDriverToEdit(driver)} className="text-orange-500 hover:text-orange-700 p-2" title={t.editDriverTitle}><i className="fas fa-edit"></i></button>
                        <button onClick={() => setDriverToDelete(driver)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteDriverTitle}><i className="fas fa-trash"></i></button>
                    </div>
                )
            });
        }
        
        return baseColumns;
    }, [t, vehiclesMap, isReadOnly]);
    
    // For export, use translated headers and formatted data
    const exportData = useMemo(() => {
        const headers = {
            [t.thDriverName]: "",
            [t.nationality]: "",
            [t.thIqama]: "",
            [lang === 'ar' ? 'رقم الهوية' : 'ID Number']: "",
            [t.thMobile]: "",
            [t.thAssignedVehicleDoorNumber]: "",
        };

        if (filteredDrivers.length === 0) {
            return [headers];
        }
        
        return filteredDrivers.map(driver => {
            const vehicle = vehiclesMap[driver.assignedVehicle];
            return {
                [t.thDriverName]: driver.driverName,
                [t.nationality]: driver.nationality,
                [t.thIqama]: driver.driverIqama,
                [lang === 'ar' ? 'رقم الهوية' : 'ID Number']: driver.driverIdNumber || '',
                [t.thMobile]: `+966 ${driver.driverMobile}`,
                [t.thAssignedVehicleDoorNumber]: vehicle ? vehicle.doorNumber : t.unassigned,
            };
        });
    }, [filteredDrivers, vehiclesMap, t]);

    return (
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col flex-grow min-h-0 transition-all duration-200">
                <div className="flex-shrink-0 flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.viewDriversTitle}</h2>
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
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
                                    <button
                                        onClick={handleImportClick}
                                        className="bg-purple-600 text-white px-3.5 py-2 rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm font-semibold flex items-center shadow-sm"
                                        title={t.importDrivers}
                                    >
                                        <i className="fas fa-file-import me-1.5"></i>
                                        <span>{t.import}</span>
                                    </button>
                                </>
                            )}
                            <ExportButtons
                                data={exportData}
                                title={t.viewDriversTitle}
                            />
                        </div>
                    </div>
                </div>
    
                <div className="px-4 sm:px-5 pt-2">
                    {importStatus && (
                        <FormStatus 
                            type={importStatus.type} 
                            message={importStatus.message}
                        />
                    )}
                </div>
                
                <div className="flex-grow overflow-auto p-3 sm:p-4 pt-2 min-h-0">
                    {filteredDrivers.length > 0 ? (
                        <div className="rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <Table<Driver>
                                columns={columns}
                                data={filteredDrivers}
                                initialSortKey="driverName"
                                selectable={!isReadOnly}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
                                useWrapper={false}
                                defaultPageSize={8}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <i className="fas fa-users text-4xl mb-4"></i>
                            <p className="text-lg">{t.noDriversFound}</p>
                        </div>
                    )}
                </div>
                
                {!isReadOnly && (
                    <>
                        <EditDriverModal
                            isOpen={!!driverToEdit}
                            onClose={() => setDriverToEdit(null)}
                            onSave={handleSaveDriverUpdate}
                            driver={driverToEdit}
                            vehicles={vehicles}
                            lang={lang}
                        />
    
                        {driverToDelete && (
                            <ConfirmationModal
                                isOpen={!!driverToDelete}
                                onClose={() => { setDriverToDelete(null); setActionError(null); }}
                                onConfirm={handleConfirmDelete}
                                title={t.deleteDriverTitle}
                                message={
                                    <>
                                        {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                        {t.deleteDriverMessage}
                                        <br/>
                                        <span className="font-semibold">{driverToDelete.driverName}</span>
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
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {t.deleteSelectedItemsMessage.replace('{count}', String(selectedIds.length))}
                                </>
                            }
                            confirmButtonText={t.confirmDelete}
                            cancelButtonText={t.cancel}
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default ViewDriversPage;