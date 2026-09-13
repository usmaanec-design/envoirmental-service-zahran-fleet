import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User } from '../types';
import Table, { type Column } from './ui/Table';
import * as XLSX from 'xlsx';

interface AdminAllProjectsPageProps {
    lang: Language;
    allUsers: User[];
    onViewProjectDashboard: (user: User) => void;
}

type UserWithId = User & { id: string };

const AdminAllProjectsPage: React.FC<AdminAllProjectsPageProps> = ({ 
    lang, 
    allUsers, 
    onViewProjectDashboard 
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [searchTerm, setSearchTerm] = useState('');

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar' || !projectName) return projectName;
        const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
        return t[key] || projectName;
    };

    // Filter out internal Admin Dashboard mock users
    const realUsers = useMemo(() => 
        allUsers.filter(user => 
            user.projectName && 
            user.projectName !== 'Admin Dashboard' &&
            !user.projectName.toLowerCase().includes('admin dashboard')
        ), [allUsers]
    );

    // Filter by search term
    const filteredUsers = useMemo(() => {
        if (!searchTerm.trim()) return realUsers;
        const term = searchTerm.toLowerCase();
        return realUsers.filter(u => 
            u.projectName?.toLowerCase().includes(term) ||
            u.projectManagerName?.toLowerCase().includes(term) ||
            u.projectId?.toLowerCase().includes(term) ||
            u.email?.toLowerCase().includes(term)
        );
    }, [realUsers, searchTerm]);

    const usersWithId: UserWithId[] = useMemo(() => 
        filteredUsers.map(user => ({ ...user, id: user.email })), 
        [filteredUsers]
    );

    const projectColumns: Column<UserWithId>[] = useMemo(() => [
        { 
            key: 'projectName', 
            header: t.thProjectName || 'Project Name', 
            sortable: true,
            allowWrap: true,
            render: (user) => (
                <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs">
                    {getTranslatedProjectName(user.projectName)}
                </span>
            )
        },
        { 
            key: 'projectManagerName', 
            header: t.thProjectManager || 'Manager', 
            sortable: true,
            allowWrap: true,
            render: (user) => (
                <span className="text-gray-700 dark:text-gray-300 text-xs">
                    {user.projectManagerName || '-'}
                </span>
            )
        },
        { 
            key: 'projectId', 
            header: t.thProjectId || 'Project ID', 
            sortable: true,
            render: (user) => (
                <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                    {user.projectId || '-'}
                </span>
            )
        },
        { 
            key: 'email', 
            header: t.email || 'Email Address', 
            sortable: true,
            allowWrap: true,
            render: (user) => (
                <span className="text-gray-600 dark:text-gray-400 text-xs">
                    {user.email || '-'}
                </span>
            )
        },
        {
            key: 'actions',
            header: lang === 'ar' ? 'الإجراءات' : 'ACTIONS',
            sortable: false,
            render: (user: UserWithId) => (
                <button 
                    onClick={() => onViewProjectDashboard(user)} 
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 hover:bg-orange-600 text-white flex items-center gap-1.5 shadow-sm hover:shadow transition-all cursor-pointer whitespace-nowrap"
                    title={t.viewProjectDashboard}
                >
                    <i className="fas fa-eye text-xs"></i> 
                    <span>{t.viewProjectDashboard || 'View Dashboard'}</span>
                </button>
            )
        }
    ], [t, lang, getTranslatedProjectName, onViewProjectDashboard]);

    const handleExportExcel = () => {
        const isAr = lang === 'ar';
        const exportData = filteredUsers.map(user => ({
            [isAr ? 'اسم المشروع' : 'Project Name']: getTranslatedProjectName(user.projectName),
            [isAr ? 'مدير المشروع' : 'Project Manager']: user.projectManagerName || '',
            [isAr ? 'معرف المشروع' : 'Project ID']: user.projectId || '',
            [isAr ? 'البريد الإلكتروني' : 'Email']: user.email || '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Projects');
        XLSX.writeFile(wb, `Projects_List_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            {/* Header */}
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">
                        {t.allProjectsReport || 'Projects'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {lang === 'ar' ? `إجمالي المشاريع: ${filteredUsers.length}` : `Total Projects: ${filteredUsers.length}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Search Bar */}
                    <div className="relative min-w-[200px] sm:min-w-[260px]">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={lang === 'ar' ? 'بحث باسم المشروع، المدير، البريد...' : 'Search by project name, manager, email...'}
                            className="w-full pl-8 pr-7 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-orange-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-none transition-colors"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                            >
                                <i className="fas fa-times"></i>
                            </button>
                        )}
                    </div>

                    {/* Green Excel Export Button */}
                    <button
                        onClick={handleExportExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow cursor-pointer"
                        title="Download Projects Excel"
                    >
                        <i className="fas fa-file-excel"></i>
                        <span>Excel</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
                <Table<UserWithId>
                    columns={projectColumns}
                    data={usersWithId}
                    initialSortKey="projectName"
                    defaultPageSize={15}
                />
            </div>
        </div>
    );
};

export default AdminAllProjectsPage;
