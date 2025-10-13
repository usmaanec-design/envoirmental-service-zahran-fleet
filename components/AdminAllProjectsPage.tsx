import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User } from '../types';
import Table, { type Column } from './ui/Table';
import ExportButtons from './ui/ExportButtons';

interface AdminAllProjectsPageProps {
    lang: Language;
    allUsers: User[];
    onViewProjectDashboard: (user: User) => void;
}

type UserWithId = User & { id: string };

const AdminAllProjectsPage: React.FC<AdminAllProjectsPageProps> = ({ lang, allUsers, onViewProjectDashboard }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };
    
    const usersWithId: UserWithId[] = useMemo(() => allUsers.map((user, index) => ({...user, id: user.uid || `user-${index}`})), [allUsers]);

    const projectColumns: Column<UserWithId>[] = [
        { key: 'projectName', header: t.thProjectName, sortable: true, render: (user) => getTranslatedProjectName(user.projectName) },
        { key: 'projectManagerName', header: t.thProjectManager, sortable: true },
        { key: 'projectId', header: t.thProjectId, sortable: true },
        { key: 'email', header: t.email, sortable: true },
        {
            key: 'actions',
            header: t.actions,
            render: (user: UserWithId) => (
                <button onClick={() => onViewProjectDashboard(user)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors">
                    <i className="fas fa-eye me-2"></i> {t.viewProjectDashboard}
                </button>
            )
        }
    ];

    const exportDataProjects = useMemo(() => {
        return allUsers.map(user => ({
            [t.thProjectName]: getTranslatedProjectName(user.projectName),
            [t.thProjectManager]: user.projectManagerName,
            [t.thProjectId]: user.projectId,
            [t.email]: user.email,
        }));
    }, [allUsers, t, getTranslatedProjectName]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-7xl mx-auto">
            <header className="flex justify-between items-center mb-8 border-b-2 border-blue-500 pb-6">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.allProjectsReport}</h2>
                <ExportButtons
                    data={exportDataProjects}
                    title={t.allProjectsReport}
                />
            </header>
            <Table<UserWithId>
                columns={projectColumns}
                data={usersWithId}
                initialSortKey="projectName"
            />
        </div>
    );
};

export default AdminAllProjectsPage;
