import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, ProjectOfficer } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';

interface ViewProjectOfficersPageProps {
  lang: Language;
  projectOfficers: ProjectOfficer[];
}

const ViewProjectOfficersPage: React.FC<ViewProjectOfficersPageProps> = ({ lang, projectOfficers }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const getRoleTranslation = (role: string) => {
        // FIX: Add a defensive check to prevent calling .replace on an undefined role.
        if (typeof role !== 'string' || !role) {
            return '';
        }
        const key = `officerRole_${role.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || role;
    };

    const columns: Column<ProjectOfficer>[] = useMemo(() => [
        { 
            key: 'role', 
            header: t.officerRole, 
            sortable: true,
            render: (officer) => getRoleTranslation(officer.role)
        },
        { key: 'name', header: t.officerName, sortable: true },
        { key: 'iqama', header: t.officerIqama, sortable: false },
        { 
            key: 'mobile',
            header: t.officerMobile,
            sortable: false,
            render: (officer) => officer.mobile ? `+966 ${officer.mobile}` : ''
        },
    ], [t]);
    
    const exportData = useMemo(() => {
        return projectOfficers.map(officer => ({
            [t.officerRole]: getRoleTranslation(officer.role),
            [t.officerName]: officer.name,
            [t.officerIqama]: officer.iqama,
            [t.officerMobile]: officer.mobile ? `+966 ${officer.mobile}` : '',
        }));
    }, [projectOfficers, t]);


    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 w-full max-w-none">
             <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10 gap-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.viewProjectOfficers}</h2>
                <ExportButtons 
                    data={exportData}
                    title={t.exportOfficers}
                />
            </header>
            
            {projectOfficers.length > 0 ? (
                <Table<ProjectOfficer>
                    columns={columns}
                    data={projectOfficers}
                    initialSortKey="role"
                />
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-user-tie text-4xl mb-4"></i>
                    <p className="text-lg">{t.noOfficersFound}</p>
                </div>
            )}
        </div>
    );
};

export default ViewProjectOfficersPage;