import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, Incident, ProjectData } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';
import Select from './ui/Select';

interface AdminAllIncidentsPageProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

type AdminIncidentView = Incident & { projectName: string; vehicleInfo: string; };

const AdminAllIncidentsPage: React.FC<AdminAllIncidentsPageProps> = ({ lang, allUsers, allProjectData }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [incidentProjectFilter, setIncidentProjectFilter] = useState('all');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    const allIncidents: AdminIncidentView[] = useMemo(() => {
        return Object.entries(allProjectData).flatMap(([email, data]: [string, ProjectData]) => {
            const user = allUsers.find(u => u.email === email);
            return data.incidents.map(incident => ({
                ...incident,
                projectName: user?.projectName || 'N/A',
                vehicleInfo: data.vehicles.find(v => v.id === incident.vehicleId)?.doorNumber || 'N/A'
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

    const incidentColumns: Column<AdminIncidentView>[] = [
        { key: 'projectName', header: t.thProjectName, sortable: true, render: (item) => getTranslatedProjectName(item.projectName) },
        { key: 'vehicleInfo' as keyof AdminIncidentView, header: t.thVehicle, sortable: true },
        { key: 'type', header: t.thIncidentType, sortable: true },
        { 
            key: 'date', 
            header: t.thIncidentDate, 
            sortable: true,
            render: (item) => new Date(item.date).toLocaleDateString('en-CA'),
        },
        { key: 'description', header: t.thDescription, sortable: false, allowWrap: true },
    ];

    const incidentTypeTranslations = useMemo(() => ({
        'Accident': t.accident,
        'Not Working': t.notWorking,
    }), [t]);

    const filteredIncidents = useMemo(() => {
        if (incidentProjectFilter === 'all') {
            return allIncidents;
        }
        const selectedUser = allUsers.find(u => u.email === incidentProjectFilter);
        if (!selectedUser) {
            return allIncidents;
        }
        return allIncidents.filter(i => i.projectName === selectedUser.projectName);
    }, [allIncidents, incidentProjectFilter, allUsers]);

    const exportDataIncidents = useMemo(() => {
        return filteredIncidents.map(incident => ({
            [t.thProjectName]: getTranslatedProjectName(incident.projectName),
            [t.thVehicle]: incident.vehicleInfo,
            [t.thIncidentType]: incidentTypeTranslations[incident.type as keyof typeof incidentTypeTranslations] || incident.type,
            [t.thIncidentDate]: new Date(incident.date).toLocaleDateString('en-CA'),
            [t.thDescription]: incident.description,
        }));
    }, [filteredIncidents, t, lang, incidentTypeTranslations, getTranslatedProjectName]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
            <header className="flex flex-wrap justify-between items-center mb-8 border-b-2 border-blue-500 pb-6 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.allIncidentsReport}</h2>
                <div className="flex items-center gap-4">
                    <div className="min-w-[200px]">
                        <Select
                            label=""
                            name="incidentProjectFilter"
                            value={incidentProjectFilter}
                            onChange={(e) => setIncidentProjectFilter(e.target.value)}
                            options={projectFilterOptions}
                        />
                    </div>
                    <ExportButtons
                        data={exportDataIncidents}
                        title={t.allIncidentsReport}
                    />
                </div>
            </header>
            <Table<AdminIncidentView>
                columns={incidentColumns}
                data={filteredIncidents}
                initialSortKey="date"
                initialSortDirection="desc"
            />
        </div>
    );
};

export default AdminAllIncidentsPage;
