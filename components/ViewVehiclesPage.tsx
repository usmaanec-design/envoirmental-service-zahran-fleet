
import React, { useState, useMemo, useRef } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle, Driver, VehicleStatus } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditVehicleModal from './EditVehicleModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';

interface ViewVehiclesPageProps {
    lang: Language;
    vehicles: Vehicle[];
    drivers: Driver[];
    onUpdateVehicle: (vehicle: Vehicle) => void;
    onDeleteVehicle: (vehicleId: string) => void;
    onDeleteSelectedVehicles: (vehicleIds: string[]) => void;
    onViewDetails: (vehicleId: string) => void;
    onImportVehicles: (data: any[]) => Promise<{ success: number; failed: number; errors: string[] }>;
    onUpdateVehicleStatus?: (vehicleId: string, status: VehicleStatus) => void;
    isReadOnly?: boolean;
}

const ViewVehiclesPage: React.FC<ViewVehiclesPageProps> = ({ 
    lang, 
    vehicles, 
    drivers, 
    onUpdateVehicle, 
    onDeleteVehicle, 
    onDeleteSelectedVehicles, 
    onViewDetails, 
    onImportVehicles, 
    onUpdateVehicleStatus, 
    isReadOnly = false 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<{ 
        type: 'success' | 'error' | 'progress';
        message: string;
        progress?: number;
        isLoading?: boolean;
    } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

    const filteredVehicles = useMemo(() => {
        if (!searchTerm.trim()) return vehicles;
        const lowercasedFilter = searchTerm.toLowerCase();
        return vehicles.filter(v =>
            v.doorNumber.toLowerCase().includes(lowercasedFilter) ||
            v.plateNumber.toLowerCase().includes(lowercasedFilter) ||
            v.chassisNumber.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, vehicles]);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (vehicleToDelete) {
            try {
                await onDeleteVehicle(vehicleToDelete.id);
                setVehicleToDelete(null);
            } catch(e) {
                const message = e instanceof Error ? e.message : "Failed to delete vehicle.";
                console.error("Delete vehicle error:", e);
                setActionError(message);
            }
        }
    };
    
    const handleConfirmBulkDelete = async () => {
        setActionError(null);
        if (selectedIds.length > 0) {
            try {
                await onDeleteSelectedVehicles(selectedIds);
                setSelectedIds([]);
                setIsBulkDeleteModalOpen(false);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete selected vehicles.";
                console.error("Bulk delete vehicles error:", e);
                setActionError(message);
            }
        }
    };

    const handleSaveVehicleUpdate = async (vehicle: Vehicle) => {
        await onUpdateVehicle(vehicle);
        setVehicleToEdit(null);
    }
    
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                setImportStatus({ 
                    type: 'progress', 
                    message: 'Reading file...', 
                    progress: 0,
                    isLoading: true 
                });
                const data = await readExcelFile(file);
                setImportStatus({ 
                    type: 'progress', 
                    message: 'Starting import...', 
                    progress: 5,
                    isLoading: true 
                });
                
                // Set up an interval to update progress status
                const progressInterval = setInterval(() => {
                    setImportStatus(current => {
                        if (!current || current.type !== 'progress' || current.progress === undefined) return current;
                        const newProgress = Math.min(current.progress + 1, 90); // Cap at 90% until complete
                        return { ...current, progress: newProgress };
                    });
                }, 1000);

                const result = await onImportVehicles(data);
                clearInterval(progressInterval);

                if (result.success) {
                    if (result.progress !== undefined) {
                        setImportStatus({ 
                            type: 'progress',
                            message: result.message || 'Processing...',
                            progress: result.progress,
                            isLoading: true
                        });
                        if (result.progress === 100) {
                            setTimeout(() => {
                                setImportStatus({ 
                                    type: 'success', 
                                    message: result.message || t.importSuccess,
                                    isLoading: false 
                                });
                            }, 1000);
                        }
                    } else {
                        setImportStatus({ 
                            type: 'success', 
                            message: result.message || t.importSuccess,
                            isLoading: false 
                        });
                    }
                } else {
                    setImportStatus({ 
                        type: 'error', 
                        message: result.error || t.importError,
                        isLoading: false 
                    });
                }
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : t.importError;
                setImportStatus({ 
                    type: 'error', 
                    message,
                    isLoading: false 
                });
            } finally {
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setTimeout(() => setImportStatus(null), 5000);
            }
        }
    };

    const columns: Column<Vehicle>[] = useMemo(() => {
        const baseColumns: Column<Vehicle>[] = [
            { key: 'projectSite', header: t.thProjectSite, sortable: true, allowWrap: true },
            { 
                key: 'doorNumber', 
                header: t.thDoorNumber, 
                sortable: true,
                render: (v) => (
                    <div className="flex items-center">
                        <span>{v.doorNumber}</span>
                        {v.isDuplicate && (
                            <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full font-medium">
                                DUPLICATE
                            </span>
                        )}
                    </div>
                )
            },
            { 
                key: 'plateNumber', 
                header: t.thPlateNumber, 
                sortable: true,
                render: (v) => (
                    <div className="flex items-center">
                        <span>{v.plateNumber}</span>
                        {v.isDuplicate && (
                            <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full font-medium">
                                DUPLICATE
                            </span>
                        )}
                    </div>
                )
            },
            { key: 'manufacturer', header: t.thManufacturer, sortable: true, allowWrap: true },
            { 
                key: 'chassisNumber', 
                header: t.thChassisNumber, 
                sortable: true, 
                allowWrap: true,
                render: (v) => (
                    <div className="flex items-center">
                        <span>{v.chassisNumber}</span>
                        {v.isDuplicate && (
                            <span className="ml-2 px-2 py-1 text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200 rounded-full font-medium">
                                DUPLICATE
                            </span>
                        )}
                    </div>
                )
            },
            { key: 'year', header: t.thYear, sortable: true },
            { key: 'purchaseDate', header: t.thPurchaseDate, sortable: true, render: (v) => v.purchaseDate ? new Date(v.purchaseDate).toLocaleDateString('en-CA') : '' },
            { key: 'tareWeight', header: t.thTareWeight, sortable: true },
            { key: 'serviceType', header: t.thServiceType, sortable: true, allowWrap: true },
        ];

        const actionsColumn: Column<Vehicle> = {
            key: 'actions',
            header: t.actions,
            render: (vehicle: Vehicle) => (
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <button onClick={() => onViewDetails(vehicle.id)} className="text-green-500 hover:text-green-700 p-2" title={t.viewDetails}><i className="fas fa-eye"></i></button>
                    {!isReadOnly && (
                        <>
                            <button onClick={() => setVehicleToEdit(vehicle)} className="text-blue-500 hover:text-blue-700 p-2" title={t.editVehicleTitle}><i className="fas fa-edit"></i></button>
                            <button onClick={() => setVehicleToDelete(vehicle)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteVehicleTitle}><i className="fas fa-trash"></i></button>
                        </>
                    )}
                </div>
            )
        };

        return [...baseColumns, actionsColumn];

    }, [t, onViewDetails, isReadOnly, lang]);
    
    const statusTranslations = useMemo(() => ({
        'Active': t.status_Active,
        'Accident': t.status_Accident,
        'Not Working': t.status_Not_Working
    }), [t]);
    
    // Use translated headers and formatted data for the export
    const exportData = useMemo(() => filteredVehicles.map(v => ({
        [t.thProjectSite]: v.projectSite,
        [t.thDoorNumber]: v.doorNumber,
        [t.thPlateNumber]: v.plateNumber,
        [t.thChassisNumber]: v.chassisNumber,
        [t.thManufacturer]: v.manufacturer,
        [t.thMake]: v.make,
        [t.thYear]: v.year,
        [t.thPurchaseDate]: v.purchaseDate,
        [t.thTareWeight]: v.tareWeight,
        [t.thServiceType]: v.serviceType,
        [t.thStatus]: statusTranslations[v.status],
    })), [filteredVehicles, t, statusTranslations]);


    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto relative">
            {/* Loading Overlay */}
            {importStatus?.isLoading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-xl">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-700 dark:text-gray-300 mb-2">{importStatus.message}</p>
                        {importStatus.progress !== undefined && (
                            <div className="w-full max-w-xs mx-auto">
                                <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                                    <div 
                                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                                        style={{ width: `${importStatus.progress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {importStatus.progress}% Complete
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
             <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.viewVehiclesTitle}</h2>
                {importStatus && importStatus.type === 'progress' && (
                    <div className="w-full mb-4">
                        <div className="bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                            <div 
                                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                                style={{ width: `${importStatus.progress}%` }}
                            />
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                            {importStatus.message}
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="w-full sm:w-auto sm:min-w-[250px]">
                        <Input 
                            name="search"
                            placeholder={t.searchByDoorPlateChassis}
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
                                    title={t.importVehicles}
                                >
                                    <i className="fas fa-file-import me-2"></i>
                                    <span>{t.import}</span>
                                </button>
                            </>
                        )}
                        <ExportButtons 
                            data={exportData}
                            title={t.viewVehiclesTitle}
                        />
                     </div>
                </div>
            </header>

             {importStatus && (
                <div className={`p-4 mb-4 rounded-md text-white ${importStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {importStatus.message}
                </div>
            )}
            
            {filteredVehicles.length > 0 ? (
                <Table<Vehicle>
                    columns={columns}
                    data={filteredVehicles}
                    initialSortKey="doorNumber"
                    selectable={!isReadOnly}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    rowClassName={(vehicle) => 
                        vehicle.isDuplicate 
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 dark:border-orange-500' 
                            : ''
                    }
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-car-side text-4xl mb-4"></i>
                    <p className="text-lg">{t.noVehiclesFound}</p> 
                </div>
            )}

            {!isReadOnly && (
                <>
                    {vehicleToDelete && (
                        <ConfirmationModal
                            isOpen={!!vehicleToDelete}
                            onClose={() => { setVehicleToDelete(null); setActionError(null); }}
                            onConfirm={handleConfirmDelete}
                            title={t.deleteVehicleTitle}
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {t.deleteVehicleMessage}
                                    <br/>
                                    <span className="font-semibold">{vehicleToDelete.doorNumber} - {vehicleToDelete.plateNumber}</span>
                                </>
                            }
                            confirmButtonText={t.confirmDelete}
                            cancelButtonText={t.cancel}
                        />
                    )}
                    
                    <EditVehicleModal
                        isOpen={!!vehicleToEdit}
                        onClose={() => setVehicleToEdit(null)}
                        onSave={handleSaveVehicleUpdate}
                        vehicle={vehicleToEdit}
                        lang={lang}
                    />

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

export default ViewVehiclesPage;