

import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle, Incident, Transfer, User, Driver } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface VehicleHistoryPageProps {
  lang: Language;
  vehicles: Vehicle[];
  drivers: Driver[];
  incidents: Incident[];
  transfers: Transfer[];
  allUsers: User[];
}

type HistoryItem = {
    date: Date;
    type: 'CREATED' | 'INCIDENT' | 'TRANSFER' | 'ASSIGNMENT';
    description: string;
    icon: string;
    color: string;
};

const VehicleHistoryPage: React.FC<VehicleHistoryPageProps> = ({ lang, vehicles, drivers, incidents, transfers, allUsers }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResult, setSearchResult] = useState<{
        vehicle: Vehicle;
        history: HistoryItem[];
    } | 'not_found' | null>(null);

    const usersMap = useMemo(() => new Map(allUsers.map(u => [u.uid, u.projectName])), [allUsers]);

    const handleSearch = () => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) {
            setSearchResult(null);
            return;
        }

        const vehicle = vehicles.find(v => v.doorNumber.toLowerCase() === term);
        if (!vehicle) {
            setSearchResult('not_found');
            return;
        }

        const historyEvents: HistoryItem[] = [];

        // 1. Creation event
        if (vehicle.createdAt) {
            historyEvents.push({
                date: new Date(vehicle.createdAt),
                type: 'CREATED',
                description: t.event_CREATED_desc.replace('{project}', vehicle.projectSite),
                icon: 'fa-plus-circle',
                color: 'text-green-500',
            });
        }

        // 2. Incident events
        incidents
            .filter(i => i.vehicleId === vehicle.id)
            .forEach(i => {
                historyEvents.push({
                    date: new Date(i.date),
                    type: 'INCIDENT',
                    description: t.event_INCIDENT_desc.replace('{type}', i.type).replace('{details}', i.description),
                    icon: 'fa-car-crash',
                    color: 'text-red-500',
                });
            });

        // 3. Transfer events
        transfers
            .filter(t => t.vehicleId === vehicle.id)
            .forEach(t => {
                const fromProject = usersMap.get(t.fromUserId) || 'Unknown';
                const toProject = usersMap.get(t.toUserId) || 'Unknown';
                historyEvents.push({
                    date: new Date(t.timestamp),
                    type: 'TRANSFER',
                    description: t.event_TRANSFER_desc.replace('{from}', fromProject).replace('{to}', toProject),
                    icon: 'fa-exchange-alt',
                    color: 'text-blue-500',
                });
            });
            
        // 4. Assignment Event (Current)
        const assignedDriver = drivers.find(d => d.assignedVehicle === vehicle.id);
        if (assignedDriver) {
            // NOTE: The date is an approximation based on when the driver record was last updated.
            const assignmentDate = assignedDriver.updatedAt || assignedDriver.createdAt;
            if (assignmentDate) {
                historyEvents.push({
                    date: new Date(assignmentDate),
                    type: 'ASSIGNMENT',
                    description: t.event_ASSIGNMENT_desc.replace('{driver}', assignedDriver.driverName),
                    icon: 'fa-user-check',
                    color: 'text-sky-500',
                });
            }
        }

        // Sort history chronologically
        historyEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

        setSearchResult({
            vehicle,
            history: historyEvents,
        });
    };
    
    const renderContent = () => {
        if (searchResult === null) {
            return (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-search text-4xl mb-4"></i>
                    <p className="text-lg">{t.vehicleHistorySearchPrompt}</p>
                </div>
            );
        }

        if (searchResult === 'not_found') {
            return (
                <div className="text-center py-16 text-red-500">
                    <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p className="text-lg">{t.vehicleNotFound}</p>
                </div>
            );
        }

        const { vehicle, history } = searchResult;

        return (
            <div className="mt-8">
                 <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-8 border dark:border-gray-700">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
                        {vehicle.doorNumber} - {vehicle.plateNumber}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{vehicle.manufacturer} {vehicle.make} ({vehicle.year})</p>
                </div>
                <div className="relative ps-4 border-s-2 border-gray-200 dark:border-gray-700">
                    {history.map((item, index) => (
                        <div key={index} className="mb-10 ms-8">
                            <span className={`absolute -start-4 flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full ring-8 ring-white dark:ring-gray-800 dark:bg-gray-700 ${item.color}`}>
                                <i className={`fas ${item.icon}`}></i>
                            </span>
                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-700 dark:border-gray-600">
                                <time className="block mb-2 text-sm font-normal leading-none text-gray-400 dark:text-gray-500">
                                    {item.date.toLocaleDateString(lang, { year: 'numeric', month: 'long', day: 'numeric' })}
                                </time>
                                <p className="text-base font-normal text-gray-600 dark:text-gray-300">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.vehicleHistoryTitle}</h2>
                <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow">
                        <Input
                            name="search"
                            placeholder={t.searchByDoorNumber}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button variant="info" onClick={handleSearch} className="sm:min-w-[120px]">
                        <i className="fas fa-search me-2"></i> {t.search}
                    </Button>
                </div>
            </header>

            {renderContent()}
        </div>
    );
};

export default VehicleHistoryPage;
