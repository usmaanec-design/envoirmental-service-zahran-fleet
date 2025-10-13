import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Incident, Language, Vehicle } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';

interface ReportsPageProps {
  lang: Language;
  incidents: Incident[];
  vehicles: Vehicle[];
  onEditIncident?: (incident: Incident) => void;
  onDeleteIncident?: (incidentId: string) => void;
  isReadOnly?: boolean;
}

type DisplayIncident = Incident & {
    vehicleInfo: string;
};

const ReportsPage: React.FC<ReportsPageProps> = ({ lang, incidents, vehicles, onEditIncident, onDeleteIncident, isReadOnly = false }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const vehiclesMap = useMemo(() => {
        return vehicles.reduce((acc, vehicle) => {
            acc[vehicle.id] = vehicle;
            return acc;
        }, {} as Record<string, Vehicle>);
    }, [vehicles]);

    const displayIncidents: DisplayIncident[] = useMemo(() => {
        return incidents.map(incident => {
            const vehicle = vehiclesMap[incident.vehicleId];
            return {
                ...incident,
                vehicleInfo: vehicle ? `${vehicle.doorNumber} - ${vehicle.plateNumber}` : incident.vehicleId,
            };
        });
    }, [incidents, vehiclesMap]);

    const incidentTypeTranslations = useMemo(() => ({
        'Accident': t.accident,
        'Not Working': t.notWorking,
    }), [t]);

    const columns: Column<DisplayIncident>[] = useMemo(() => [
        {
            key: 'vehicleInfo' as keyof DisplayIncident,
            header: t.thVehicle,
            sortable: true
        },
        {
            key: 'type',
            header: t.thIncidentType,
            sortable: true,
            render: (incident) => incidentTypeTranslations[incident.type] || incident.type,
        },
        {
            key: 'date',
            header: t.thIncidentDate,
            sortable: true,
            render: (incident) => new Date(incident.date).toLocaleDateString('en-CA'),
        },
        {
            key: 'description',
            header: t.thDescription,
            sortable: false,
            allowWrap: true,
        },
        // Add Actions column if not read-only and handlers are provided
        ...(!isReadOnly && (onEditIncident || onDeleteIncident) ? [{
            key: 'actions' as keyof DisplayIncident,
            header: 'Actions',
            sortable: false,
            render: (incident: DisplayIncident) => (
                <div className="flex gap-2">
                    {onEditIncident && (
                        <button
                            onClick={() => onEditIncident(incident)}
                            className="text-blue-500 hover:text-blue-700 p-2"
                            title="Edit Incident"
                        >
                            <i className="fas fa-edit"></i>
                        </button>
                    )}
                    {onDeleteIncident && (
                        <button
                            onClick={() => {
                                if (window.confirm('Are you sure you want to delete this incident report?')) {
                                    onDeleteIncident(incident.id);
                                }
                            }}
                            className="text-red-500 hover:text-red-700 p-2"
                            title="Delete Incident"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    )}
                </div>
            ),
        }] : []),
    ], [t, lang, incidentTypeTranslations, isReadOnly, onEditIncident, onDeleteIncident]);

    const exportData = useMemo(() => {
        return displayIncidents.map(incident => ({
            [t.thVehicle]: incident.vehicleInfo,
            [t.thIncidentType]: incidentTypeTranslations[incident.type] || incident.type,
            [t.thIncidentDate]: new Date(incident.date).toLocaleDateString('en-CA'),
            [t.thDescription]: incident.description,
        }));
    }, [displayIncidents, t, incidentTypeTranslations, lang]);


    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
             <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.reportsTitle}</h2>
                <ExportButtons 
                    data={exportData}
                    title={t.reportsTitle}
                />
            </header>
            
            {displayIncidents.length > 0 ? (
                <Table<DisplayIncident>
                    columns={columns}
                    data={displayIncidents}
                    initialSortKey="date"
                    initialSortDirection="desc"
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-file-alt text-4xl mb-4"></i>
                    <p className="text-lg">{t.noIncidentsFound}</p>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;