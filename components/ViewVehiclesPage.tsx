import React, { useState, useMemo, useRef, useCallback } from 'react';
import { TRANSLATIONS, ARABIC_SERVICE_TYPES_FOR_EXPORT } from '../constants';
import type { Vehicle, Language } from '../types';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';
import EditVehicleModal from './EditVehicleModal';
import ExportButtons from './ui/ExportButtons';
import { readExcelFile } from '../utils/export';
import Select from './ui/Select';
import FormStatus from './ui/FormStatus';

interface ViewVehiclesPageProps {
  lang: Language;
  vehicles: Vehicle[];
  onUpdateVehicle: (vehicle: Vehicle) => Promise<void>;
  onDeleteVehicle: (vehicleId: string) => Promise<void>;
  onDeleteSelectedVehicles: (vehicleIds: string[]) => Promise<{ deletedCount: number; skippedCount: number }>;
  onViewDetails: (vehicleId: string) => void;
    onImportVehicles: (vehiclesData: any[], onProgress?: (percent: number) => void) => Promise<{ success: boolean, error?: string }>;
  isReadOnly?: boolean;
}

const ViewVehiclesPage: React.FC<ViewVehiclesPageProps> = ({ lang, vehicles, onUpdateVehicle, onDeleteVehicle, onDeleteSelectedVehicles, onViewDetails, onImportVehicles, isReadOnly = false }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);
    const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [importProgress, setImportProgress] = useState<number | null>(null);
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
    
    const doorNumberCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const vehicle of vehicles) {
            const doorNum = vehicle.doorNumber.trim().toLowerCase();
            counts[doorNum] = (counts[doorNum] || 0) + 1;
        }
        return counts;
    }, [vehicles]);


    const serviceTypeOptions = useMemo(() => {
        const allTypes = new Set(ARABIC_SERVICE_TYPES_FOR_EXPORT);
        vehicles.forEach(vehicle => {
            if (vehicle.serviceType) {
                allTypes.add(vehicle.serviceType);
            }
        });
        return Array.from(allTypes).sort().map(type => ({
            value: type,
            label: type,
        }));
    }, [vehicles]);

    const handleServiceTypeChange = useCallback(async (vehicle: Vehicle, newServiceType: string) => {
        if (isReadOnly) return;
        
        if (vehicle.serviceType === newServiceType) return;
        
        const updatedVehicle = { ...vehicle, serviceType: newServiceType };
        try {
            await onUpdateVehicle(updatedVehicle);
        } catch (error) {
            console.error("Failed to update service type:", error);
            // In a real app, you might show a toast notification on error and revert the UI change.
        }
    }, [isReadOnly, onUpdateVehicle]);


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
                const result = await onDeleteSelectedVehicles(selectedIds);
                let message = `Successfully deleted ${result.deletedCount} vehicles.`;
                if (result.skippedCount > 0) {
                    message += ` Skipped ${result.skippedCount} vehicles with active incidents, transfers, or repair history.`;
                }
                setStatusMessage({ type: 'info', message });
                setTimeout(() => setStatusMessage(null), 7000);
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
                const data = await readExcelFile(file);

                // progress callback
                const onProgress = (percent: number) => {
                    setImportProgress(percent);
                    setStatusMessage({ type: 'info', message: `${percent}% ${t.importing || 'Importing...'}` });
                };

                const result = await onImportVehicles(data, onProgress);
                if (result.success) {
                    setStatusMessage({ type: 'success', message: t.importSuccess });
                } else {
                    setStatusMessage({ type: 'error', message: result.error || t.importError });
                }
            } catch (error) {
                console.error(error);
                const message = error instanceof Error ? error.message : t.importError;
                setStatusMessage({ type: 'error', message });
            } finally {
                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                setImportProgress(null);
                setTimeout(() => setStatusMessage(null), 5000);
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
                render: (v) => {
                    const isDuplicate = doorNumberCounts[v.doorNumber.trim().toLowerCase()] > 1;
                    return (
                        <div className="flex items-center gap-2">
                            <span className={isDuplicate ? 'text-orange-600 dark:text-orange-400 font-bold' : ''}>{v.doorNumber}</span>
                            {isDuplicate && (
                                <i 
                                    className="fas fa-exclamation-triangle text-yellow-500"
                                    title="Duplicate door number exists in the system."
                                ></i>
                            )}
                        </div>
                    );
                }
            },
            { key: 'plateNumber', header: t.thPlateNumber, sortable: true },
            { key: 'manufacturer', header: t.thManufacturer, sortable: true, allowWrap: true },
            { key: 'chassisNumber', header: t.thChassisNumber, sortable: true, allowWrap: true },
            { key: 'year', header: t.thYear, sortable: true },
            { key: 'tareWeight', header: t.thTareWeight, sortable: true },
            {
                key: 'status',
                header: t.thStatus,
                sortable: true,
                render: (vehicle) => {
                    const statusInfo = {
                        'Active': { text: t.status_Active, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
                        'Accident': { text: t.status_Accident, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
                        'Breakdown': { text: t.status_Breakdown, color: 'text-yellow-600 dark:text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/40' },
                    }[vehicle.status];

                    if (!statusInfo) return vehicle.status;

                    return (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                            <div className="w-2 h-2 rounded-full me-1 bg-current"></div>
                            {statusInfo.text}
                        </span>
                    );
                }
            },
            { 
                key: 'serviceType', 
                header: t.thServiceType, 
                sortable: true, 
                allowWrap: true,
                render: (vehicle) => (
                    <div className="min-w-[140px] sm:min-w-[160px]">
                         <Select
                            name={`serviceType-${vehicle.id}`}
                            value={vehicle.serviceType}
                            onChange={(e) => handleServiceTypeChange(vehicle, e.target.value)}
                            options={serviceTypeOptions}
                            disabled={isReadOnly}
                            className="!h-9 text-sm"
                         />
                    </div>
                )
            },
        ];

        const actionsColumn: Column<Vehicle> = {
            key: 'actions',
            header: t.actions,
            render: (vehicle: Vehicle) => (
                <div className="flex space-x-2 rtl:space-x-reverse">
                    <button onClick={() => onViewDetails(vehicle.id)} className="text-green-500 hover:text-green-700 p-2" title={t.viewDetails}><i className="fas fa-eye"></i></button>
                    {!isReadOnly && (
                        <>
                            <button onClick={() => setVehicleToEdit(vehicle)} className="text-orange-500 hover:text-orange-700 p-2" title={t.editVehicleTitle}><i className="fas fa-edit"></i></button>
                            <button onClick={() => setVehicleToDelete(vehicle)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteVehicleTitle}><i className="fas fa-trash"></i></button>
                        </>
                    )}
                </div>
            )
        };

        return [...baseColumns, actionsColumn];

    }, [t, onViewDetails, isReadOnly, lang, serviceTypeOptions, handleServiceTypeChange, doorNumberCounts]);
    
    const statusTranslations = useMemo(() => ({
        'Active': t.status_Active,
        'Accident': t.status_Accident,
        'Breakdown': t.status_Breakdown,
    }), [t]);
    
    const exportData = useMemo(() => {
        // If there are no vehicles, return an array with a single object.
        // This ensures the exported file has headers and an empty row, serving as a template.
        if (filteredVehicles.length === 0) {
            return [{
                [t.thProjectSite]: "",
                [t.thDoorNumber]: "",
                [t.thPlateNumber]: "",
                [t.thChassisNumber]: "",
                [t.thManufacturer]: "",
                [t.thMake]: "",
                [t.thYear]: "",
                [t.thTareWeight]: "",
                [t.thServiceType]: "",
                [t.thStatus]: "",
            }];
        }

        return filteredVehicles.map(v => ({
            [t.thProjectSite]: v.projectSite,
            [t.thDoorNumber]: v.doorNumber,
            [t.thPlateNumber]: v.plateNumber,
            [t.thChassisNumber]: v.chassisNumber,
            [t.thManufacturer]: v.manufacturer,
            [t.thMake]: v.make,
            [t.thYear]: v.year,
            [t.thTareWeight]: v.tareWeight,
            [t.thServiceType]: v.serviceType,
            [t.thStatus]: statusTranslations[v.status],
        }));
    }, [filteredVehicles, t, statusTranslations]);


    return (
        <div className="w-full flex-grow flex flex-col min-h-0">
            <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 flex flex-col flex-grow min-h-0 transition-all duration-200">
                <div className="flex-shrink-0 flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.viewVehiclesTitle}</h2>
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="w-full sm:w-auto sm:min-w-[220px]">
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
                                        title={t.importVehicles}
                                    >
                                        <i className="fas fa-file-import me-1.5"></i>
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
                </div>

                <div className="px-4 sm:px-5 pt-2">
                    {statusMessage && <FormStatus type={statusMessage.type} message={statusMessage.message} />}
                </div>

                <div className="flex-grow overflow-auto p-3 sm:p-4 pt-2 min-h-0">
                    {filteredVehicles.length > 0 ? (
                        <div className="rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                            <Table<Vehicle>
                                columns={columns}
                                data={filteredVehicles}
                                initialSortKey="doorNumber"
                                selectable={!isReadOnly}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
                                useWrapper={false}
                                defaultPageSize={8}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                            <i className="fas fa-car-side text-4xl mb-4"></i>
                            <p className="text-lg">{t.noVehiclesFound}</p> 
                        </div>
                    )}
                </div>

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
        </div>
    );
};

export default ViewVehiclesPage;