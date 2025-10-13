import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, Transfer, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import Select from './ui/Select';
import Input from './ui/Input';

interface AdminTransferLogPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
    allTransfers: Transfer[];
}

const AdminTransferLogPage: React.FC<AdminTransferLogPageProps> = ({ lang, allUsers, allProjectData, allTransfers }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [transferDoorFilter, setTransferDoorFilter] = useState('');
    const [transferProjectFilter, setTransferProjectFilter] = useState('all');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    const { usersMap, vehiclesMap } = useMemo(() => {
        const uMap = allUsers.reduce((acc, user) => {
             if (user.uid) acc[user.uid] = user.projectName;
             return acc;
        }, {} as Record<string, string>);
        
        const vMap: Record<string, string> = {};
        // FIX: Explicitly type `data` as `ProjectData` to resolve TypeScript inference issue.
        Object.values(allProjectData).forEach((data: ProjectData) => {
            data.vehicles.forEach(vehicle => {
                vMap[vehicle.id] = vehicle.doorNumber;
            });
        });
        
        return { usersMap: uMap, vehiclesMap: vMap };
    }, [allUsers, allProjectData]);

    const filteredTransfers = useMemo(() => {
        return allTransfers
            .filter(transfer => {
                const doorNumber = vehiclesMap[transfer.vehicleId] || '';
                const doorMatch = transferDoorFilter ? doorNumber.includes(transferDoorFilter) : true;
                
                const projectMatch = transferProjectFilter === 'all' 
                    ? true 
                    : (allUsers.find(u => u.email === transferProjectFilter)?.uid === transfer.fromUserId ||
                       allUsers.find(u => u.email === transferProjectFilter)?.uid === transfer.toUserId);

                return doorMatch && projectMatch;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [allTransfers, transferDoorFilter, transferProjectFilter, vehiclesMap, allUsers]);

    const transferColumns: Column<Transfer>[] = useMemo(() => [
        { 
            key: 'vehicleId',
            header: t.thDoorNumber,
            render: (item) => vehiclesMap[item.vehicleId] || 'N/A'
        },
        { 
            key: 'fromUserId',
            header: t.thFromProject,
            render: (item) => getTranslatedProjectName(usersMap[item.fromUserId] || 'N/A')
        },
        { 
            key: 'toUserId',
            header: t.thToProject,
            render: (item) => getTranslatedProjectName(usersMap[item.toUserId] || 'N/A')
        },
        { 
            key: 'timestamp',
            header: t.thIncidentDate,
            render: (item) => new Date(item.timestamp).toLocaleString('en-US')
        },
         {
            key: 'status',
            header: t.thStatus,
            render: (item) => (
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    item.status === 'Returned' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                }`}>
                    {t[`status_${item.status}` as keyof typeof t]}
                </span>
            )
        }
    ], [t, lang, vehiclesMap, usersMap, getTranslatedProjectName]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
            <header className="flex flex-wrap justify-between items-center mb-8 border-b-2 border-blue-500 pb-6 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.transferLog}</h2>
                <div className="flex flex-wrap gap-4">
                    <Input 
                        name="transferDoorFilter" 
                        placeholder={t.searchByDoorNumberAdmin} 
                        value={transferDoorFilter} 
                        onChange={e => setTransferDoorFilter(e.target.value)}
                        onClear={() => setTransferDoorFilter('')}
                    />
                    <div className="min-w-[200px]">
                        <Select 
                            label=""
                            name="transferProjectFilter"
                            value={transferProjectFilter}
                            onChange={e => setTransferProjectFilter(e.target.value)}
                            options={projectFilterOptions}
                        />
                    </div>
                </div>
            </header>
            {filteredTransfers.length > 0 ? (
                <Table<Transfer>
                    columns={transferColumns}
                    data={filteredTransfers}
                />
            ) : (
                <p className="text-center py-8 text-gray-500 dark:text-gray-400">{t.noTransfersFound}</p>
            )}
        </div>
    );
};

export default AdminTransferLogPage;