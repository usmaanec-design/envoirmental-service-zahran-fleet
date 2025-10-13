import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, Vehicle, VehicleStatus, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Select from './ui/Select';

interface AdminAllVehiclesPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

type AdminVehicleView = Vehicle & { projectName: string; };

const AdminAllVehiclesPage: React.FC<AdminAllVehiclesPageProps> = ({ lang, allUsers, allProjectData }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [vehicleProjectFilter, setVehicleProjectFilter] = useState('all');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const allVehicles: AdminVehicleView[] = useMemo(() => {
         return Object.entries(allProjectData).flatMap(([email, data]: [string, ProjectData]) => {
            const user = allUsers.find(u => u.email === email);
            return data.vehicles.map(vehicle => ({
                ...vehicle,
                projectName: user?.projectName || 'N/A',
            }));
        });
    }, [allProjectData, allUsers]);

    const projectFilterOptions = useMemo(() => {
        const userOptions = allUsers.map(user => ({
            value: user.email,
            label: getTranslatedProjectName(user.projectName)
        }));
        return [{ value: 'all', label: t.allProjects }, ...userOptions];
    }, [allUsers, t.allProjects, getTranslatedProjectName]);

    const vehicleColumns: Column<AdminVehicleView>[] = [
        { key: 'projectName', header: t.thProjectName, sortable: true, render: (item) => getTranslatedProjectName(item.projectName) },
        { key: 'doorNumber', header: t.thDoorNumber, sortable: true },
        { key: 'plateNumber', header: t.thPlateNumber, sortable: true },
        { key: 'manufacturer', header: t.thManufacturer, sortable: true },
        { key: 'year', header: t.thYear, sortable: true },
        { key: 'purchaseDate', header: t.thPurchaseDate, sortable: true, render: (v) => new Date(v.purchaseDate).toLocaleDateString('en-CA') },
        { key: 'tareWeight', header: t.thTareWeight, sortable: true },
        { key: 'chassisNumber', header: t.thChassisNumber, sortable: false },
        { key: 'serviceType', header: t.thServiceType, sortable: true },
    ];

    const statusTranslations = useMemo(() => ({
        'Active': t.status_Active,
        'Accident': t.status_Accident,
        'Not Working': t.status_Not_Working
    }), [t]);

    const filteredAllVehicles = useMemo(() => {
        if (vehicleProjectFilter === 'all') {
            return allVehicles;
        }
        const selectedUser = allUsers.find(u => u.email === vehicleProjectFilter);
        if (!selectedUser) {
            return allVehicles;
        }
        return allVehicles.filter(v => v.projectName === selectedUser.projectName);
    }, [allVehicles, vehicleProjectFilter, allUsers]);

    const exportDataVehicles = useMemo(() => {
        return filteredAllVehicles.map(vehicle => ({
            [t.thProjectName]: getTranslatedProjectName(vehicle.projectName),
            [t.thDoorNumber]: vehicle.doorNumber,
            [t.thPlateNumber]: vehicle.plateNumber,
            [t.thChassisNumber]: vehicle.chassisNumber,
            [t.thManufacturer]: vehicle.manufacturer,
            [t.thStatus]: statusTranslations[vehicle.status as VehicleStatus] || vehicle.status,
            [t.thMake]: vehicle.make,
            [t.thYear]: vehicle.year,
            [t.thPurchaseDate]: new Date(vehicle.purchaseDate).toLocaleDateString('en-CA'),
            [t.thTareWeight]: vehicle.tareWeight,
            [t.thServiceType]: vehicle.serviceType,
            [t.thProjectSite]: getTranslatedProjectName(vehicle.projectSite),
        }));
    }, [filteredAllVehicles, t, statusTranslations, lang, getTranslatedProjectName]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
            <header className="flex flex-wrap justify-between items-center mb-8 border-b-2 border-blue-500 pb-6 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.allVehiclesReport}</h2>
                <div className="flex items-center gap-4">
                    <div className="min-w-[200px]">
                        <Select
                            label=""
                            name="vehicleProjectFilter"
                            value={vehicleProjectFilter}
                            onChange={(e) => setVehicleProjectFilter(e.target.value)}
                            options={projectFilterOptions}
                        />
                    </div>
                    <ExportButtons
                        data={exportDataVehicles}
                        title={t.allVehiclesReport}
                    />
                </div>
            </header>
            <Table<AdminVehicleView>
                columns={vehicleColumns}
                data={filteredAllVehicles}
                initialSortKey="projectName"
            />
        </div>
    );
};

export default AdminAllVehiclesPage;
