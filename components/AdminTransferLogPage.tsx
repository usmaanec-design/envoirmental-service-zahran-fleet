import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, Transfer, ProjectData, Vehicle } from '../types';
import Table, { type Column } from './ui/Table';
import * as XLSX from 'xlsx';

interface AdminTransferLogPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    allTransfers: Transfer[];
}

type EnrichedTransfer = Transfer & {
    doorNumber: string;
    plateNumber: string;
    fromProjectName: string;
    toProjectName: string;
    formattedDate: string;
};

const AdminTransferLogPage: React.FC<AdminTransferLogPageProps> = ({ 
    lang, 
    allUsers, 
    allProjectData, 
    allTransfers = [] 
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [transferSearchFilter, setTransferSearchFilter] = useState('');
    const [transferProjectFilter, setTransferProjectFilter] = useState('all');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName || projectName === 'N/A') return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    // Flatten all vehicles across all projects for instant lookup
    const allVehiclesList: Vehicle[] = useMemo(() => {
        const list: Vehicle[] = [];
        Object.values(allProjectData || {}).forEach((data: ProjectData) => {
            if (data?.vehicles) {
                list.push(...data.vehicles);
            }
        });
        return list;
    }, [allProjectData]);

    // Fast lookup maps for users and projects
    const { userByIdMap, userByEmailMap, userByNameMap } = useMemo(() => {
        const idMap: Record<string, User> = {};
        const emailMap: Record<string, User> = {};
        const nameMap: Record<string, User> = {};

        allUsers.forEach(user => {
            if (user.uid) idMap[user.uid] = user;
            if (user.email) emailMap[user.email.toLowerCase()] = user;
            if (user.projectName) nameMap[user.projectName.trim().toLowerCase()] = user;
            if (user.projectId) idMap[user.projectId] = user;
        });

        return { userByIdMap: idMap, userByEmailMap: emailMap, userByNameMap: nameMap };
    }, [allUsers]);

    // Helper to resolve project name from any identifier (UID, email, project ID, project name, or projectEmail)
    const resolveProjectName = (identifier?: string, fallbackEmail?: string): string => {
        if (!identifier && !fallbackEmail) return 'N/A';

        // 1. If identifier is already a recognized project name
        if (identifier && userByNameMap[identifier.trim().toLowerCase()]) {
            return userByNameMap[identifier.trim().toLowerCase()].projectName;
        }

        // 2. Check by UID or projectId
        if (identifier && userByIdMap[identifier]) {
            return userByIdMap[identifier].projectName;
        }

        // 3. Check by Email
        if (identifier && userByEmailMap[identifier.toLowerCase()]) {
            return userByEmailMap[identifier.toLowerCase()].projectName;
        }

        // 4. Check by fallbackEmail
        if (fallbackEmail && userByEmailMap[fallbackEmail.toLowerCase()]) {
            return userByEmailMap[fallbackEmail.toLowerCase()].projectName;
        }

        // 5. If identifier doesn't look like an email or ID and is a clean Arabic/English name (e.g. 'المركزية', 'الشرق', 'مشروع خميس مشيط')
        if (identifier && identifier !== 'N/A' && !identifier.includes('@') && identifier.length < 50) {
            return identifier.trim();
        }

        return 'N/A';
    };

    // Helper to resolve vehicle door number and plate number
    const resolveVehicleDetails = (item: any): { doorNumber: string; plateNumber: string } => {
        let door = item.doorNumber || item.door_number || item.vehicleDoorNumber || '';
        let plate = item.plateNumber || item.plate_number || item.vehiclePlateNumber || '';

        const lookupId = item.vehicleId || item.vehicle_id || item.id;

        if (lookupId) {
            const found = allVehiclesList.find(v => 
                v.id === lookupId || 
                v.doorNumber === lookupId || 
                v.plateNumber === lookupId
            );

            if (found) {
                if (!door) door = found.doorNumber;
                if (!plate) plate = found.plateNumber;
            }
        }

        // If door is still missing, but lookupId is a human readable plate/door like "2979 ب ب"
        if (!door && lookupId && lookupId !== 'N/A') {
            door = lookupId;
        }
        if (!plate && lookupId && lookupId !== 'N/A') {
            plate = lookupId;
        }

        return {
            doorNumber: door || 'N/A',
            plateNumber: plate || 'N/A'
        };
    };

    // Enrich transfers with resolved vehicle and project data
    const enrichedTransfers: EnrichedTransfer[] = useMemo(() => {
        return (allTransfers || []).map(transfer => {
            const rawItem = transfer as any;
            const { doorNumber, plateNumber } = resolveVehicleDetails(rawItem);
            
            // From project resolution (check fromUserId, fromProject, fromProjectName, projectEmail)
            const fromProjectName = resolveProjectName(
                rawItem.fromProject || rawItem.fromProjectName || transfer.fromUserId,
                rawItem.projectEmail
            );

            // To project resolution (check toUserId, toProject, toProjectName)
            const toProjectName = resolveProjectName(
                rawItem.toProject || rawItem.toProjectName || transfer.toUserId
            );

            // Format date
            let formattedDate = '-';
            if (transfer.timestamp) {
                try {
                    const dateObj = new Date(transfer.timestamp);
                    formattedDate = !isNaN(dateObj.getTime())
                        ? dateObj.toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'numeric',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                        })
                        : transfer.timestamp;
                } catch {
                    formattedDate = transfer.timestamp;
                }
            }

            return {
                ...transfer,
                doorNumber,
                plateNumber,
                fromProjectName,
                toProjectName,
                formattedDate
            };
        });
    }, [allTransfers, allVehiclesList, userByIdMap, userByEmailMap, userByNameMap]);

    // Project filter dropdown options
    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers
            .filter(u => u.projectName && u.projectName !== 'Admin Dashboard')
            .map(user => ({
                value: user.email,
                label: getTranslatedProjectName(user.projectName)
            }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    // Filtered transfers
    const filteredTransfers = useMemo(() => {
        return enrichedTransfers
            .filter(transfer => {
                // Search filter (Door #, Plate #, From Project, To Project)
                const term = transferSearchFilter.trim().toLowerCase();
                const matchesSearch = !term || (
                    transfer.doorNumber?.toLowerCase().includes(term) ||
                    transfer.plateNumber?.toLowerCase().includes(term) ||
                    transfer.fromProjectName?.toLowerCase().includes(term) ||
                    transfer.toProjectName?.toLowerCase().includes(term) ||
                    transfer.status?.toLowerCase().includes(term)
                );

                // Project filter
                let matchesProject = true;
                if (transferProjectFilter !== 'all') {
                    const selectedUser = allUsers.find(u => u.email === transferProjectFilter);
                    const selectedName = selectedUser?.projectName?.trim().toLowerCase();
                    const selectedEmail = selectedUser?.email?.trim().toLowerCase();
                    const selectedUid = selectedUser?.uid;

                    matchesProject = 
                        (selectedName && transfer.fromProjectName?.trim().toLowerCase() === selectedName) ||
                        (selectedName && transfer.toProjectName?.trim().toLowerCase() === selectedName) ||
                        (selectedEmail && transfer.fromUserId?.toLowerCase() === selectedEmail) ||
                        (selectedEmail && transfer.toUserId?.toLowerCase() === selectedEmail) ||
                        (selectedUid && transfer.fromUserId === selectedUid) ||
                        (selectedUid && transfer.toUserId === selectedUid);
                }

                return matchesSearch && matchesProject;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [enrichedTransfers, transferSearchFilter, transferProjectFilter, allUsers]);

    // Columns matching Example Photo (Image 2)
    const transferColumns: Column<EnrichedTransfer>[] = useMemo(() => [
        { 
            key: 'doorNumber',
            header: t.thDoorNumber || 'DOOR #',
            sortable: true,
            render: (item) => (
                <span className="font-bold text-gray-800 dark:text-gray-200 text-xs">
                    {item.doorNumber}
                </span>
            )
        },
        { 
            key: 'plateNumber',
            header: t.thPlateNumber || 'PLATE #',
            sortable: true,
            render: (item) => (
                <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                    {item.plateNumber}
                </span>
            )
        },
        { 
            key: 'fromProjectName',
            header: t.thFromProject || 'FROM PROJECT',
            sortable: true,
            allowWrap: true,
            render: (item) => (
                <span className="text-gray-800 dark:text-gray-200 text-xs">
                    {getTranslatedProjectName(item.fromProjectName)}
                </span>
            )
        },
        { 
            key: 'toProjectName',
            header: t.thToProject || 'TO PROJECT',
            sortable: true,
            allowWrap: true,
            render: (item) => (
                <span className="text-gray-800 dark:text-gray-200 text-xs font-medium">
                    {getTranslatedProjectName(item.toProjectName)}
                </span>
            )
        },
        { 
            key: 'timestamp',
            header: lang === 'ar' ? 'التاريخ' : 'DATE',
            sortable: true,
            render: (item) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    {item.formattedDate}
                </span>
            )
        },
        {
            key: 'status',
            header: t.thStatus || 'STATUS',
            sortable: true,
            render: (item) => {
                const isReturned = item.status?.toLowerCase() === 'returned';
                return (
                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full inline-block ${
                        isReturned 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-300'
                    }`}>
                        {item.status || 'Transferred'}
                    </span>
                );
            }
        }
    ], [t, lang, getTranslatedProjectName]);

    // Export to Excel
    const handleExportExcel = () => {
        const isAr = lang === 'ar';
        const exportData = filteredTransfers.map(tItem => ({
            [isAr ? 'رقم الباب' : 'Door #']: tItem.doorNumber,
            [isAr ? 'رقم اللوحة' : 'Plate #']: tItem.plateNumber,
            [isAr ? 'من مشروع' : 'From Project']: getTranslatedProjectName(tItem.fromProjectName),
            [isAr ? 'إلى مشروع' : 'To Project']: getTranslatedProjectName(tItem.toProjectName),
            [isAr ? 'التاريخ' : 'Date']: tItem.formattedDate,
            [isAr ? 'الحالة' : 'Status']: tItem.status || 'Transferred',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'TransferLog');
        XLSX.writeFile(wb, `Transfer_Log_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            {/* Header matching Example Photo (Image 2) */}
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {t.transferLog || 'Transfer Log'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lang === 'ar' ? `إجمالي سجلات النقل: ${filteredTransfers.length}` : `Total Transfer Records: ${filteredTransfers.length}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Input */}
                    <div className="relative min-w-[200px] sm:min-w-[240px]">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            placeholder={t.searchByDoorNumberAdmin || 'Search by Door Number...'}
                            value={transferSearchFilter}
                            onChange={(e) => setTransferSearchFilter(e.target.value)}
                            className="w-full pl-8 pr-7 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                        />
                        {transferSearchFilter && (
                            <button
                                onClick={() => setTransferSearchFilter('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>

                    {/* Project Filter Dropdown */}
                    <div className="min-w-[180px] sm:min-w-[220px]">
                        <select
                            value={transferProjectFilter}
                            onChange={(e) => setTransferProjectFilter(e.target.value)}
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
                        title="Download Transfer Log Excel"
                    >
                        <i className="fas fa-file-excel"></i>
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            {/* Table or Empty View */}
            {filteredTransfers.length > 0 ? (
                <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                    <Table<EnrichedTransfer>
                        columns={transferColumns}
                        data={filteredTransfers}
                        initialSortKey="timestamp"
                        initialSortDirection="desc"
                        defaultPageSize={15}
                    />
                </div>
            ) : (
                <div className="text-center py-16 bg-gray-50/50 dark:bg-gray-750/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center text-2xl mx-auto mb-3">
                        <i className="fas fa-exchange-alt"></i>
                    </div>
                    <h3 className="text-base font-bold text-gray-800 dark:text-gray-200 mb-1">
                        {t.noTransfersFound || 'No Transfers Found'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                        {transferSearchFilter || transferProjectFilter !== 'all'
                            ? 'No transfer records match your current search/filter criteria.'
                            : 'No vehicle transfers have been recorded yet.'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default AdminTransferLogPage;