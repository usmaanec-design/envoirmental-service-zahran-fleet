
import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Driver, Language, Vehicle } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditDriverModal from './EditDriverModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';

interface ViewDriversPageProps {
  lang: Language;
  drivers: Driver[];
  vehicles: Vehicle[];
  onUpdateDriver: (driver: Driver) => Promise<void>;
  onDeleteDriver: (driverId: string) => Promise<void>;
  onDeleteSelectedDrivers: (driverIds: string[]) => Promise<void>;
  onImportDrivers: (driversData: any[]) => Promise<{ success: boolean, error?: string }>;
  isReadOnly?: boolean;
}

const ViewDriversPage: React.FC<ViewDriversPageProps> = ({ lang, drivers, vehicles, onUpdateDriver, onDeleteDriver, onDeleteSelectedDrivers, onImportDrivers, isReadOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [driverToEdit, setDriverToEdit] = useState<Driver | null>(null);
    const [driverToDelete, setDriverToDelete] = useState<Driver | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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
            driver.driverIqama.includes(lowercasedFilter)
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
                const result = await onImportDrivers(data);
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
                setTimeout(() => setImportStatus(null), 5000);
            }
        }
    };
    
    const columns: Column<Driver>[] = useMemo(() => {
        const baseColumns: Column<Driver>[] = [
            { key: 'driverName', header: t.thDriverName, sortable: true, allowWrap: true },
            { key: 'driverIqama', header: t.thIqama, sortable: true },
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
                        <button onClick={() => setDriverToEdit(driver)} className="text-blue-500 hover:text-blue-700 p-2" title={t.editDriverTitle}><i className="fas fa-edit"></i></button>
                        <button onClick={() => setDriverToDelete(driver)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteDriverTitle}><i className="fas fa-trash"></i></button>
                    </div>
                )
            });
        }
        
        return baseColumns;
    }, [t, vehiclesMap, isReadOnly]);
    
    // For export, use translated headers and formatted data
    const exportData = useMemo(() => filteredDrivers.map(driver => {
        const vehicle = vehiclesMap[driver.assignedVehicle];
        return {
            [t.thDriverName]: driver.driverName,
            [t.nationality]: driver.nationality,
            [t.thIqama]: driver.driverIqama,
            [t.thMobile]: `+966 ${driver.driverMobile}`,
            [t.thAssignedVehicleDoorNumber]: vehicle ? vehicle.doorNumber : t.unassigned,
        };
    }), [filteredDrivers, vehiclesMap, t]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
             <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.viewDriversTitle}</h2>
                 <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-full sm:w-auto sm:min-w-[250px]">
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
                                className="bg-red-600 text-white px-3 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center"
                            >
                                <i className="fas fa-trash-alt me-2"></i>
                                <span>{t.deleteSelected.replace('{count}', String(selectedIds.length))}</span>
                            </button>
                        )}
                         {!isReadOnly && (
                            <>
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept=".xlsx, .xls" />
                                <button
                                    onClick={handleImportClick}
                                    className="bg-purple-500 text-white px-3 py-2 rounded-md hover:bg-purple-600 transition-colors text-sm font-medium flex items-center"
                                    title={t.importDrivers}
                                >
                                    <i className="fas fa-file-import me-2"></i>
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
            </header>

            {importStatus && (
                <div className={`p-4 mb-4 rounded-md text-white ${importStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {importStatus.message}
                </div>
            )}
            
            {filteredDrivers.length > 0 ? (
                <Table<Driver>
                    columns={columns}
                    data={filteredDrivers}
                    initialSortKey="driverName"
                    selectable={!isReadOnly}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-users text-4xl mb-4"></i>
                    <p className="text-lg">{t.noDriversFound}</p>
                </div>
            )}
            
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
    );
};

export default ViewDriversPage;