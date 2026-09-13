import React, { useState, useMemo, useCallback } from 'react';
import { TRANSLATIONS, INCIDENT_TYPES } from '../constants';
import type { Incident, Language, Vehicle, RepairHistory, Driver } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import MarkAsRepairedModal from './MarkAsRepairedModal';
import ExportButtons from './ui/ExportButtons';
import ConfirmationModal from './ui/ConfirmationModal';

// --- TYPE DEFINITIONS & CUSTOM HOOK ---

// A consolidated object representing a single row in our history table.
type ConsolidatedRecord = {
    id: string; // A unique ID for the row, e.g., `v-hist-${vehicle.id}`
    date: Date; // The primary date for sorting (latest event)
    vehicleId: string;
    vehicleDoorNumber: string;
    vehiclePlateNumber: string;
    incidentDate?: Date;
    incidentType?: string;
    affectedPart?: string;
    driverName?: string;
    repairedDate?: Date;
    currentStatus: string; // Translated status text
    statusKey: 'active' | 'incident' | 'repaired'; // Key for filtering
    statusColor: string; // Tailwind text color class
    statusBgColor: string; // Tailwind background color class
};

type PairedHistoryEvent = {
    incident: Incident;
    repair: RepairHistory | null;
}

type SortDirection = 'asc' | 'desc';
type SortKey = keyof ConsolidatedRecord;

interface HistoryFilters {
    searchTerm: string;
    dateFrom: string;
    dateTo: string;
    statusFilter: string;
}

const initialFilters: HistoryFilters = {
    searchTerm: '',
    dateFrom: '',
    dateTo: '',
    statusFilter: 'all',
};

/**
 * Custom hook to manage state and logic for filtering and sorting the vehicle history log.
 * @param data The raw, consolidated vehicle records.
 * @returns An object with processed records and the state/handlers to control them.
 */
function useVehicleHistoryControls(data: ConsolidatedRecord[]) {
    const [filters, setFilters] = useState<HistoryFilters>(initialFilters);
    const [sortKey, setSortKey] = useState<SortKey>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleFilterChange = useCallback((key: keyof HistoryFilters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    }, []);

    const clearFilters = useCallback(() => {
        setFilters(initialFilters);
    }, []);

    const handleSort = useCallback((key: SortKey) => {
        if (sortKey === key) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    }, [sortKey]);

    const processedRecords = useMemo(() => {
        // 1. Filtering Logic
        const filtered = data.filter(record => {
            if (filters.searchTerm.trim()) {
                const search = filters.searchTerm.toLowerCase();
                if (![record.vehicleDoorNumber, record.vehiclePlateNumber].some(field => field.toLowerCase().includes(search))) {
                    return false;
                }
            }
            if (filters.dateFrom && record.date < new Date(filters.dateFrom)) return false;
            if (filters.dateTo) {
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59, 999);
                if (record.date > toDate) return false;
            }
            if (filters.statusFilter !== 'all' && record.statusKey !== filters.statusFilter) {
                return false;
            }
            return true;
        });

        // 2. Sorting Logic
        return [...filtered].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA == null) return 1;
            if (valB == null) return -1;
            const multiplier = sortDirection === 'asc' ? 1 : -1;

            if (valA instanceof Date && valB instanceof Date) {
                return (valA.getTime() - valB.getTime()) * multiplier;
            }
            return String(valA).localeCompare(String(valB)) * multiplier;
        });
    }, [data, filters, sortKey, sortDirection]);

    return {
        processedRecords,
        filters,
        handleFilterChange,
        clearFilters,
        sortKey,
        sortDirection,
        handleSort,
    };
}


// --- PROPS INTERFACE ---

interface ReportsPageProps {
  lang: Language;
  vehicles: Vehicle[];
  incidents: Incident[];
  drivers: Driver[];
  transfers: any[]; // Kept for prop compatibility, but not used in this new design.
  repairHistory: RepairHistory[];
  onMarkVehicleActive: (vehicleId: string, repairedAt: string, repairedBy: string, repairNotes?: string) => Promise<void>;
  onDismissIncident: (vehicleId: string) => Promise<void>;
  onDismissSelectedRepairHistories: (repairIds: string[]) => Promise<void>;
  onBulkDeleteHistory: (vehicleIds: string[], upToDate?: string) => Promise<void>;
  onDeleteSelectedVehicles: (vehicleIds: string[]) => Promise<void>;
}

// --- HELPER COMPONENTS ---

const SortIcon: React.FC<{ direction: SortDirection | null }> = ({ direction }) => {
    if (!direction) return <i className="fas fa-sort text-gray-400 dark:text-gray-500 ms-2 opacity-50 group-hover:opacity-100 transition-opacity"></i>;
    return direction === 'asc' ? <i className="fas fa-sort-up text-orange-600 dark:text-orange-400 ms-2"></i> : <i className="fas fa-sort-down text-orange-600 dark:text-orange-400 ms-2"></i>;
};


// --- MAIN COMPONENT ---

const ReportsPage: React.FC<ReportsPageProps> = ({ lang, vehicles, incidents, drivers, repairHistory = [], onMarkVehicleActive, onDismissIncident, onDismissSelectedRepairHistories, onBulkDeleteHistory, onDeleteSelectedVehicles }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // --- STATE MANAGEMENT ---
    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);
    const [selectedVehicleForRepair, setSelectedVehicleForRepair] = useState<Vehicle | null>(null);
    const [vehicleForAction, setVehicleForAction] = useState<{ vehicle: Vehicle, action: 'dismiss_incident' } | null>(null);
    const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    
    // State for the new dismiss history workflow
    const [isDismissMode, setIsDismissMode] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState<string[]>([]);
    const [historyToDelete, setHistoryToDelete] = useState<string[]>([]);


    // --- DATA PROCESSING & MEMOIZATION ---
    
    const driversMap = useMemo(() => {
        return drivers.reduce((acc, driver) => {
            acc[driver.id] = driver;
            return acc;
        }, {} as Record<string, Driver>);
    }, [drivers]);

    const incidentTypeTranslations = useMemo(() => {
        const map: Record<string, string> = {};
        INCIDENT_TYPES.forEach(type => {
            map[type.value] = t[type.labelKey as keyof typeof t] || type.value;
        });
        return map;
    }, [t]);

    const getVehicleStatusInfo = useCallback((vehicle: Vehicle): { statusKey: 'active' | 'incident' | 'repaired'; statusText: string; statusColor: string; statusBgColor: string; } => {
        // Check if vehicle has any active incidents
        const hasActiveIncident = incidents.some(incident => incident.vehicleId === vehicle.id);
        
        // Check if vehicle status indicates incident/breakdown (more comprehensive check)
        const hasIncidentStatus = vehicle.status && (
            vehicle.status === 'Accident' || 
            vehicle.status.includes('Breakdown') ||
            vehicle.status.includes('Incident') ||
            vehicle.status !== 'Active'
        );
        
        if (hasActiveIncident || hasIncidentStatus) {
            return { statusKey: 'incident', statusText: t.underIncidentVH, statusColor: 'text-red-600 dark:text-red-400', statusBgColor: 'bg-red-100 dark:bg-red-900/40' };
        }
        
        const latestRepair = repairHistory
            .filter(rh => rh.vehicleId === vehicle.id)
            .sort((a, b) => new Date(b.repairedAt).getTime() - new Date(a.repairedAt).getTime())[0];
        
        const SEVEN_DAYS_IN_MS = 7 * 24 * 60 * 60 * 1000;
        if (latestRepair?.repairedAt && (Date.now() - new Date(latestRepair.repairedAt).getTime()) <= SEVEN_DAYS_IN_MS) {
            return { statusKey: 'repaired', statusText: t.recentlyRepairedVH, statusColor: 'text-yellow-600 dark:text-yellow-500', statusBgColor: 'bg-yellow-100 dark:bg-yellow-900/40' };
        }
        
        return { statusKey: 'active', statusText: t.activeVH, statusColor: 'text-green-600 dark:text-green-400', statusBgColor: 'bg-green-100 dark:bg-green-900/40' };
    }, [repairHistory, t]);

    const consolidatedRecords = useMemo((): ConsolidatedRecord[] => {
        // Get all vehicles that have incidents, repair history, OR non-active status
        const relevantVehicleIds = new Set([
            ...incidents.map(i => i.vehicleId),
            ...repairHistory.map(rh => rh.vehicleId),
            ...vehicles.filter(v => v.status !== 'Active' && v.status !== 'active').map(v => v.id)
        ]);

        console.log('📋 HISTORY DEBUG:', {
            totalVehicles: vehicles.length,
            vehiclesWithIncidents: incidents.length,
            vehiclesWithRepairHistory: repairHistory.length,
            vehiclesWithNonActiveStatus: vehicles.filter(v => v.status !== 'Active' && v.status !== 'active').length,
            relevantVehicleIds: Array.from(relevantVehicleIds)
        });

        const records: ConsolidatedRecord[] = [];

        for (const vehicleId of relevantVehicleIds) {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            if (!vehicle) continue; // Skip if vehicle not found

            const vehicleIncidents = incidents
                .filter(i => i.vehicleId === vehicleId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const vehicleRepairs = repairHistory
                .filter(rh => rh.vehicleId === vehicleId)
                .sort((a, b) => new Date(b.repairedAt).getTime() - new Date(a.repairedAt).getTime());
            
            const latestIncident = vehicleIncidents[0];
            const latestRepair = vehicleRepairs[0];
            
            // For repaired vehicles, prioritize repair history data, otherwise use active incident data
            let incidentType: string | undefined;
            let affectedPart: string | undefined;
            let incidentDate: Date | undefined;
            let driverName: string | undefined;
            
            if (latestRepair && latestRepair.originalIncident) {
                // Use data from repair history (original incident)
                incidentType = latestRepair.originalIncident.type || (latestRepair as any).incidentType;
                affectedPart = latestRepair.originalIncident.affectedPart || (latestRepair as any).affectedPart;
                incidentDate = new Date(latestRepair.originalIncident.date || (latestRepair as any).incidentDate);
                const driverId = latestRepair.originalIncident.driverId || (latestRepair as any).driverId;
                driverName = driverId ? driversMap[driverId]?.driverName : undefined;
            } else if (latestIncident) {
                // Use data from active incident
                incidentType = latestIncident.type;
                affectedPart = latestIncident.affectedPart;
                incidentDate = new Date(latestIncident.date);
                driverName = latestIncident.driverId ? driversMap[latestIncident.driverId]?.driverName : undefined;
            }
            
            const statusInfo = getVehicleStatusInfo(vehicle);
            const primaryDate = latestRepair?.repairedAt 
                ? new Date(latestRepair.repairedAt) 
                : latestIncident 
                    ? new Date(latestIncident.date) 
                    : new Date(vehicle.createdAt || Date.now());

            const record: ConsolidatedRecord = {
                id: `v-hist-${vehicle.id}`,
                date: primaryDate,
                vehicleId: vehicle.id,
                vehicleDoorNumber: vehicle.doorNumber || '',
                vehiclePlateNumber: vehicle.plateNumber || '',
                incidentDate,
                incidentType,
                affectedPart,
                driverName,
                repairedDate: latestRepair?.repairedAt ? new Date(latestRepair.repairedAt) : undefined,
                currentStatus: statusInfo.statusText,
                statusKey: statusInfo.statusKey,
                statusColor: statusInfo.statusColor,
                statusBgColor: statusInfo.statusBgColor,
            };
            
            records.push(record);
        }

        return records;
    }, [vehicles, incidents, repairHistory, getVehicleStatusInfo, driversMap]);

    // --- HOOK-BASED STATE MANAGEMENT ---
    const {
        processedRecords: sortedRecords,
        filters,
        handleFilterChange,
        clearFilters,
        sortKey,
        sortDirection,
        handleSort,
    } = useVehicleHistoryControls(consolidatedRecords);
    
    const exportData = useMemo(() => {
        const exportRecords: any[] = [];
        
        for (const record of sortedRecords) {
            const vehicle = vehicles.find(v => v.id === record.vehicleId);
            if (!vehicle) continue;
    
            const vehicleIncidents = incidents.filter(i => i.vehicleId === record.vehicleId);
            const vehicleRepairs = repairHistory.filter(rh => rh.vehicleId === record.vehicleId);
    
            // This is the same pairing logic from the render method.
            const repairMap = new Map<string, RepairHistory>();
            for (const repair of vehicleRepairs) {
                if (repair.originalIncident?.id) {
                    repairMap.set(repair.originalIncident.id, repair);
                }
            }
            const allPairs = vehicleIncidents.map(incident => ({
                incident: incident,
                repair: repairMap.get(incident.id) || null,
            })).sort((a, b) => new Date(b.incident.date).getTime() - new Date(a.incident.date).getTime());
            
            if (allPairs.length === 0) {
                continue; // Don't include vehicles with no history in the detailed export
            }
    
            for (const pair of allPairs) {
                const totalIncidentsCount = vehicleIncidents.length;
                const driver = pair.incident.driverId ? driversMap[pair.incident.driverId] : null;
                exportRecords.push({
                    [t.thDoorNumber]: vehicle.doorNumber || '',
                    [t.thPlateNumber]: vehicle.plateNumber || '',
                    [t.thDriverName]: driver?.driverName || 'N/A',
                    [t.thIqama]: driver?.driverIqama || 'N/A',
                    [t.thStatus]: pair.repair ? t.recentlyRepairedVH : t.underIncidentVH,
                    [t.thIncidentDate]: new Date(pair.incident.date).toLocaleDateString('en-CA'),
                    [t.incidentTypeVH]: incidentTypeTranslations[pair.incident.type] || pair.incident.type,
                    [t.affectedPart]: pair.incident.affectedPart || 'N/A',
                    [t.reasonDescriptionVH]: pair.incident.description || 'N/A',
                    [t.totalIncidentsLabel]: totalIncidentsCount,
                    [t.repairDate]: pair.repair ? new Date(pair.repair.repairedAt).toLocaleDateString('en-CA') : 'N/A',
                    [t.repairedByVH]: pair.repair?.repairedBy || 'N/A',
                    [t.repairNotes]: pair.repair?.repairNotes || 'N/A',
                });
            }
        }
        
        return exportRecords;
    }, [sortedRecords, t, incidents, repairHistory, incidentTypeTranslations, vehicles, driversMap]);
    
    const tableColumns: { key: SortKey | 'actions'; header: string; sortable?: boolean; }[] = useMemo(() => [
        { key: 'vehicleDoorNumber', header: t.thDoorNumber, sortable: true },
        { key: 'vehiclePlateNumber', header: t.thPlateNumber, sortable: true },
        { key: 'currentStatus', header: t.thStatus, sortable: true },
        { key: 'driverName', header: t.thDriver, sortable: true },
        { key: 'incidentDate', header: t.thIncidentDate, sortable: true },
        { key: 'incidentType', header: t.incidentTypeVH, sortable: true },
        { key: 'affectedPart', header: t.affectedPart, sortable: true },
        { key: 'repairedDate', header: t.repairDate, sortable: true },
        { key: 'actions', header: t.actions }
    ], [t]);
    
    const isBulkDeleteDisabled = useMemo(() => {
        if (selectedIds.length === 0) return true;
        const selectedRecords = consolidatedRecords.filter(r => selectedIds.includes(r.id));
        return selectedRecords.some(r => r.statusKey === 'incident');
    }, [selectedIds, consolidatedRecords]);

    // --- EVENT HANDLERS ---
    const handleToggleDetails = useCallback((recordId: string) => {
        setExpandedRowId(currentId => (currentId === recordId ? null : recordId));
        // Reset dismiss mode when closing/switching rows
        if (expandedRowId !== recordId) {
            setIsDismissMode(false);
            setSelectedHistoryIds([]);
        }
    }, [expandedRowId]);
    
    const handleMarkActiveSubmit = useCallback(async (vehicleId: string, repairDate: string, repairedBy: string, repairNotes?: string) => {
        await onMarkVehicleActive(vehicleId, repairDate, repairedBy, repairNotes);
        setIsRepairModalOpen(false);
        setSelectedVehicleForRepair(null);
        setExpandedRowId(`v-hist-${vehicleId}`);
    }, [onMarkVehicleActive]);

    const openRepairModal = useCallback((vehicle: Vehicle) => {
        setSelectedVehicleForRepair(vehicle);
        setIsRepairModalOpen(true);
    }, []);

    const handleConfirmAction = async () => {
        if (vehicleForAction) {
            if (vehicleForAction.action === 'dismiss_incident') {
                await onDismissIncident(vehicleForAction.vehicle.id);
            }
            setVehicleForAction(null);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(sortedRecords.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };
    
    const handleSelectOne = (recordId: string) => {
        setSelectedIds(prev =>
            prev.includes(recordId)
                ? prev.filter(id => id !== recordId)
                : [...prev, recordId]
        );
    };

    const handleConfirmBulkDelete = async () => {
        const vehicleIdsToDelete = consolidatedRecords
            .filter(record => selectedIds.includes(record.id))
            .map(record => record.vehicleId);
    
        if (vehicleIdsToDelete.length > 0) {
            await onBulkDeleteHistory(vehicleIdsToDelete);
            setSelectedIds([]); 
            setIsBulkDeleteModalOpen(false);
        }
    };

    const handleDeleteSelectedVehicles = async () => {
        const vehicleIdsToDelete = consolidatedRecords
            .filter(record => selectedIds.includes(record.id))
            .map(record => record.vehicleId);
    
        if (vehicleIdsToDelete.length > 0) {
            const confirmed = window.confirm(
                `Are you sure you want to permanently delete ${vehicleIdsToDelete.length} vehicle${vehicleIdsToDelete.length > 1 ? 's' : ''}? This action cannot be undone.`
            );
            
            if (confirmed) {
                await onDeleteSelectedVehicles(vehicleIdsToDelete);
                setSelectedIds([]);
            }
        }
    };

    const handleConfirmHistoryDismiss = () => {
        if (selectedHistoryIds.length > 0) {
            setHistoryToDelete(selectedHistoryIds);
        }
    };
    
    const executeHistoryDismiss = async () => {
        await onDismissSelectedRepairHistories(historyToDelete);
        setHistoryToDelete([]);
        setSelectedHistoryIds([]);
        setIsDismissMode(false);
    };
    
    // --- RENDER ---

    return (
        <div className={`w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200 ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.vehicleHistoryTitle}</h2>
                <ExportButtons data={exportData} title={t.vehicleHistory} />
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-2.5 sm:p-3 mb-4 flex items-center gap-2.5">
                <i className="fas fa-info-circle text-orange-600 dark:text-orange-400 text-sm"></i>
                <p className="text-xs text-orange-800 dark:text-orange-200">{t.reportsPageInfo}</p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-3.5 sm:p-4 rounded-xl mb-4 space-y-3 border border-gray-100 dark:border-gray-700">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <Input label={t.searchByDoorNumberVH} name="search" placeholder={t.searchByDoorNumberVH} value={filters.searchTerm} onChange={e => handleFilterChange('searchTerm', e.target.value)} onClear={() => handleFilterChange('searchTerm', '')} />
                    <Input label={t.dateFrom} name="dateFrom" type="date" value={filters.dateFrom} onChange={e => handleFilterChange('dateFrom', e.target.value)} />
                    <Input label={t.dateTo} name="dateTo" type="date" value={filters.dateTo} onChange={e => handleFilterChange('dateTo', e.target.value)} />
                    <Select label={t.filterByStatusVH} name="statusFilter" value={filters.statusFilter} onChange={e => handleFilterChange('statusFilter', e.target.value)} options={[
                        { value: 'all', label: t.allStatusesVH },
                        { value: 'active', label: t.activeVH },
                        { value: 'incident', label: t.underIncidentVH },
                        { value: 'repaired', label: t.recentlyRepairedVH },
                    ]} />
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-200/60 dark:border-gray-700">
                    <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-500 hover:bg-gray-600 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                        <i className="fas fa-times text-xs"></i><span>{t.clearFilters}</span>
                    </button>
                    {selectedIds.length > 0 && (
                        <>
                            <button 
                                onClick={() => setIsBulkDeleteModalOpen(true)} 
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                                disabled={isBulkDeleteDisabled}
                                title={isBulkDeleteDisabled ? "Cannot delete history for vehicles with active incidents." : ""}
                            >
                                <i className="fas fa-trash-alt text-xs"></i>
                                <span>{t.deleteSelectedHistory.replace('{count}', String(selectedIds.length))}</span>
                            </button>
                            <button 
                                onClick={() => handleDeleteSelectedVehicles()} 
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-800 hover:bg-red-900 text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                                title="Delete selected vehicles permanently"
                            >
                                <i className="fas fa-car text-xs"></i>
                                <span>Delete {selectedIds.length} Vehicle{selectedIds.length > 1 ? 's' : ''}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="mt-4">
                {sortedRecords.length > 0 ? (
                     <div className="w-full overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                        <table className="w-full divide-y divide-gray-200 dark:divide-gray-700 text-left">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="w-10 px-2.5 py-2.5 text-center">
                                        <div className="flex items-center justify-center">
                                            <input
                                                id="checkbox-all"
                                                type="checkbox"
                                                className="h-4 w-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                checked={sortedRecords.length > 0 && selectedIds.length === sortedRecords.length}
                                                ref={el => { if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < sortedRecords.length; }}
                                                onChange={handleSelectAll}
                                            />
                                            <label htmlFor="checkbox-all" className="sr-only">Select all</label>
                                        </div>
                                    </th>
                                    {tableColumns.map(col => (
                                        <th key={String(col.key)} scope="col" className="px-2.5 py-2.5 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                            {col.sortable ? (
                                                <button className="flex items-center gap-1 w-full text-left focus:outline-none group" onClick={() => handleSort(col.key as SortKey)}>
                                                    <span>{col.header}</span>
                                                    <SortIcon direction={sortKey === col.key ? sortDirection : null} />
                                                </button>
                                            ) : col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {sortedRecords.map(record => {
                                    const isExpanded = expandedRowId === record.id;
                                    const vehicleIncidents = incidents.filter(i => i.vehicleId === record.vehicleId);
                                    const vehicleRepairs = repairHistory.filter(rh => rh.vehicleId === record.vehicleId);

                                    const pairedTimeline: PairedHistoryEvent[] = (() => {
                                        // Create a map of Incident ID -> Repair Record for efficient lookup.
                                        const repairMap = new Map<string, RepairHistory>();
                                        const handledIncidentIds = new Set<string>();
                                        
                                        for (const repair of vehicleRepairs) {
                                            const rAny = repair as any;
                                            if (rAny.incidentId) {
                                                repairMap.set(rAny.incidentId, repair);
                                            }
                                        }

                                        // First, handle all active incidents and find their corresponding repairs
                                        const activePairs = vehicleIncidents.map(incident => {
                                            handledIncidentIds.add(incident.id);
                                            return {
                                                incident: incident,
                                                repair: repairMap.get(incident.id) || null,
                                            };
                                        });

                                        // Then, handle repair history entries that don't have corresponding active incidents
                                        // These are incidents that have been fully repaired and moved to history
                                        const repairedOnlyPairs: PairedHistoryEvent[] = vehicleRepairs
                                            .filter(repair => (repair as any).incidentId && !handledIncidentIds.has((repair as any).incidentId))
                                            .map(repair => {
                                                const rAny = repair as any;
                                                const inc: Incident = repair.originalIncident ? {
                                                    id: repair.originalIncident.id,
                                                    type: repair.originalIncident.type || rAny.incidentType || 'Unknown',
                                                    affectedPart: repair.originalIncident.affectedPart || rAny.affectedPart || '',
                                                    description: repair.originalIncident.description || '',
                                                    date: repair.originalIncident.date || rAny.incidentDate,
                                                    driverId: repair.originalIncident.driverId || rAny.driverId || '',
                                                    vehicleId: repair.originalIncident.vehicleId || repair.vehicleId,
                                                    status: 'Resolved' as const
                                                } : {
                                                    id: rAny.incidentId,
                                                    type: rAny.incidentType || 'Unknown',
                                                    affectedPart: rAny.affectedPart || '',
                                                    description: '',
                                                    date: rAny.incidentDate,
                                                    driverId: rAny.driverId || '',
                                                    vehicleId: repair.vehicleId,
                                                    status: 'Resolved' as const
                                                };
                                                return {
                                                    incident: inc,
                                                    repair: repair,
                                                };
                                            });

                                        // Combine both types and sort by incident date, newest first
                                        const allPairs = [...activePairs, ...repairedOnlyPairs];
                                        return allPairs.sort((a, b) => new Date(b.incident.date).getTime() - new Date(a.incident.date).getTime());
                                    })();


                                    return (
                                        <React.Fragment key={record.id}>
                                            <tr className={`transition-colors duration-150 ${selectedIds.includes(record.id) ? 'bg-orange-50 dark:bg-orange-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                                                <td className="w-10 px-2.5 py-2 text-center">
                                                    <div className="flex items-center justify-center">
                                                        <input
                                                            id={`checkbox-${record.id}`}
                                                            type="checkbox"
                                                            className="h-4 w-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                            checked={selectedIds.includes(record.id)}
                                                            onChange={() => handleSelectOne(record.id)}
                                                        />
                                                        <label htmlFor={`checkbox-${record.id}`} className="sr-only">Select item</label>
                                                    </div>
                                                </td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs font-bold text-gray-900 dark:text-gray-100">{record.vehicleDoorNumber}</td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs font-mono text-gray-700 dark:text-gray-300">{record.vehiclePlateNumber}</td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${record.statusColor} ${record.statusBgColor}`}>
                                                        <div className="w-1.5 h-1.5 rounded-full me-1 bg-current"></div>
                                                        {record.currentStatus}
                                                    </span>
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[110px] truncate" title={record.driverName || 'N/A'}>
                                                    {record.driverName || 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs font-mono text-gray-600 dark:text-gray-400">
                                                    {record.incidentDate ? record.incidentDate.toLocaleDateString('en-CA') : 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[120px] truncate" title={incidentTypeTranslations[record.incidentType!] || record.incidentType || 'N/A'}>
                                                    {incidentTypeTranslations[record.incidentType!] || record.incidentType || 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-2 text-xs text-gray-700 dark:text-gray-300 max-w-[110px] truncate" title={record.affectedPart || 'N/A'}>
                                                    {record.affectedPart || 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs font-mono text-gray-600 dark:text-gray-400">
                                                    {record.repairedDate ? record.repairedDate.toLocaleDateString('en-CA') : 'N/A'}
                                                </td>
                                                <td className="px-2.5 py-2 whitespace-nowrap text-xs">
                                                    <div className="flex items-center gap-1.5 rtl:space-x-reverse">
                                                        {record.statusKey === 'incident' && (
                                                          <>
                                                            <button 
                                                                type="button"
                                                                onClick={() => openRepairModal(vehicles.find(v => v.id === record.vehicleId)!)} 
                                                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                                                                title={t.markAsRepaired}
                                                            >
                                                                <i className="fas fa-check text-[10px]"></i> 
                                                                <span>{lang === 'ar' ? 'تم الإصلاح' : 'Repaired'}</span>
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setVehicleForAction({ vehicle: vehicles.find(v => v.id === record.vehicleId)!, action: 'dismiss_incident' })} 
                                                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                                                                title={t.dismissActiveIncidentTitle}
                                                            >
                                                                <i className="fas fa-undo text-[10px]"></i> 
                                                                <span>{lang === 'ar' ? 'تجاهل' : 'Dismiss'}</span>
                                                            </button>
                                                          </>
                                                        )}
                                                        {pairedTimeline.length > 0 && (
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleToggleDetails(record.id)} 
                                                                className="px-2 py-1 text-xs font-semibold rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1 shadow-sm transition-all cursor-pointer whitespace-nowrap"
                                                                title={isExpanded ? t.cancel : t.viewDetails}
                                                            >
                                                                <i className={`fas ${isExpanded ? 'fa-chevron-up' : 'fa-info-circle'} text-[10px]`}></i> 
                                                                <span>{isExpanded ? t.cancel : (lang === 'ar' ? 'التفاصيل' : 'Details')}</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr className="bg-gray-100 dark:bg-gray-900/30">
                                                    <td colSpan={tableColumns.length + 1} className="p-6 border-y-4 border-orange-200 dark:border-orange-900 animate-fade-in-down">
                                                        <div className="space-y-4">
                                                            {pairedTimeline.map((pair) => {
                                                                const driver = pair.incident.driverId ? driversMap[pair.incident.driverId] : null;
                                                                return (
                                                                <div key={pair.incident.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 flex items-start gap-4">
                                                                    {isDismissMode && pair.repair && (
                                                                         <input
                                                                            type="checkbox"
                                                                            className="mt-1 h-4 w-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500"
                                                                            checked={selectedHistoryIds.includes(pair.repair.id)}
                                                                            onChange={() => {
                                                                                setSelectedHistoryIds(prev => prev.includes(pair.repair!.id) ? prev.filter(id => id !== pair.repair!.id) : [...prev, pair.repair!.id]);
                                                                            }}
                                                                        />
                                                                    )}
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm flex-grow">
                                                                        {/* Incident Column */}
                                                                        <div>
                                                                            <h5 className="font-bold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3"><i className="fas fa-car-crash text-red-500"></i>{t.incidentInfo}</h5>
                                                                            <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.thIncidentDate}:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(pair.incident.date).toLocaleDateString('en-CA')}</span></p>
                                                                            {driver && <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.thDriver}:</strong> <span className="text-gray-800 dark:text-gray-200">{driver.driverName} ({driver.driverIqama})</span></p>}
                                                                            <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.incidentTypeVH}:</strong> <span className="text-gray-800 dark:text-gray-200">{incidentTypeTranslations[pair.incident.type] || pair.incident.type}</span></p>
                                                                            {pair.incident.affectedPart && <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.affectedPart}:</strong> <span className="text-gray-800 dark:text-gray-200">{pair.incident.affectedPart}</span></p>}
                                                                            {pair.incident.description && <div className="mt-2"><strong className="font-semibold text-gray-600 dark:text-gray-400">{t.reasonDescriptionVH}:</strong><p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words pt-1">{pair.incident.description}</p></div>}
                                                                        </div>
                                                                        {/* Repair Column */}
                                                                        <div>
                                                                            <h5 className="font-bold text-base text-gray-800 dark:text-gray-200 flex items-center gap-2 mb-3"><i className="fas fa-tools text-green-500"></i>{t.repairDetails}</h5>
                                                                            {pair.repair ? (
                                                                                <>
                                                                                    <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.repairDate}:</strong> <span className="text-gray-800 dark:text-gray-200">{new Date(pair.repair.repairedAt).toLocaleDateString('en-CA')}</span></p>
                                                                                    <p><strong className="font-semibold text-gray-600 dark:text-gray-400 min-w-[120px] inline-block">{t.repairedByVH}:</strong> <span className="text-gray-800 dark:text-gray-200">{pair.repair.repairedBy}</span></p>
                                                                                    {pair.repair.repairNotes && <div className="mt-2"><strong className="font-semibold text-gray-600 dark:text-gray-400">{t.repairNotes}:</strong><p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words pt-1">{pair.repair.repairNotes}</p></div>}
                                                                                </>
                                                                            ) : (
                                                                                <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md p-4">
                                                                                    <p className="font-semibold text-center">Incident is currently active.</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )})}
                                                        </div>
                                                        {record.statusKey !== 'incident' && (
                                                            <div className="mt-6 flex items-center gap-4">
                                                                <Button
                                                                    onClick={() => setIsDismissMode(!isDismissMode)}
                                                                    variant={isDismissMode ? 'secondary' : 'secondary'}
                                                                    className={`!px-3 !py-1.5 text-xs ${isDismissMode ? '' : '!bg-red-600 hover:!bg-red-700 !focus:ring-red-300 !text-white'}`}
                                                                >
                                                                    {isDismissMode ? <><i className="fas fa-times me-2"></i> {t.cancel}</> : <><i className="fas fa-trash me-2"></i> {t.dismissHistoryTitle}</>}
                                                                </Button>
                                                                {isDismissMode && selectedHistoryIds.length > 0 && (
                                                                    <Button
                                                                        onClick={handleConfirmHistoryDismiss}
                                                                        className="!px-3 !py-1.5 text-xs !bg-red-600 hover:!bg-red-700 !focus:ring-red-300"
                                                                    >
                                                                        <i className="fas fa-trash-alt me-2"></i> {t.deleteSelected.replace('{count}', String(selectedHistoryIds.length))}
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <i className="fas fa-history text-4xl mb-4"></i>
                        <p className="text-lg">{t.noHistoryFound}</p>
                    </div>
                )}
            </div>

            <MarkAsRepairedModal
                isOpen={isRepairModalOpen}
                onClose={() => { setIsRepairModalOpen(false); setSelectedVehicleForRepair(null); }}
                vehicle={selectedVehicleForRepair}
                onMarkActive={handleMarkActiveSubmit}
                lang={lang}
            />

            {vehicleForAction && (
                <ConfirmationModal
                    isOpen={!!vehicleForAction}
                    onClose={() => setVehicleForAction(null)}
                    onConfirm={handleConfirmAction}
                    title={t.dismissActiveIncidentTitle}
                    message={<>
                        {t.dismissActiveIncidentMessage}
                        <br />
                        <span className="font-semibold">{vehicleForAction.vehicle.doorNumber}</span>
                    </>}
                    confirmButtonText={t.confirmDelete}
                    cancelButtonText={t.cancel}
                />
            )}

            <ConfirmationModal
                isOpen={isBulkDeleteModalOpen}
                onClose={() => setIsBulkDeleteModalOpen(false)}
                onConfirm={handleConfirmBulkDelete}
                title={t.deleteSelectedHistoryTitle}
                message={t.deleteSelectedHistoryMessage.replace('{count}', String(selectedIds.length))}
                confirmButtonText={t.confirmDelete}
                cancelButtonText={t.cancel}
            />
            
            <ConfirmationModal
                isOpen={historyToDelete.length > 0}
                onClose={() => setHistoryToDelete([])}
                onConfirm={executeHistoryDismiss}
                title={t.dismissSelectedHistoryTitle}
                message={t.dismissSelectedHistoryMessage.replace('{count}', String(historyToDelete.length))}
                confirmButtonText={t.confirmDelete}
                cancelButtonText={t.cancel}
            />
        </div>
    );
};

export default ReportsPage;