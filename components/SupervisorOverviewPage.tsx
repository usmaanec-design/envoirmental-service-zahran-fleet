
import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, ProjectData, Supervisor, Foreman } from '../types';
import StatCard from './ui/StatCard';
import Table, { type Column } from './ui/Table';
import ConfirmationModal from './ui/ConfirmationModal';
import EditSupervisorModal from './EditSupervisorModal';

interface SupervisorOverviewPageProps {
    lang: Language;
    projectData: ProjectData;
    onUpdateSupervisor: (supervisor: Supervisor) => Promise<void>;
    onDeleteSupervisor: (supervisorId: string) => Promise<void>;
    onEditSupervisor?: (supervisor: Supervisor) => void;
    isReadOnly?: boolean;
}

const SupervisorOverviewPage: React.FC<SupervisorOverviewPageProps> = ({ lang, projectData, onUpdateSupervisor, onDeleteSupervisor, onEditSupervisor, isReadOnly = false }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    
    const { supervisors = [], campLabour, crewman } = projectData;

    const [supervisorToEdit, setSupervisorToEdit] = useState<Supervisor | null>(null);
    const [supervisorToDelete, setSupervisorToDelete] = useState<Supervisor | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        setActionError(null);
        if (supervisorToDelete) {
            setIsDeleting(true);
            try {
                console.log('🗑️ Confirming deletion of supervisor:', supervisorToDelete.id);
                await onDeleteSupervisor(supervisorToDelete.id);
                console.log('✅ Supervisor deletion confirmed');
                setSupervisorToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete supervisor.";
                console.error("Delete supervisor error:", e);
                setActionError(message);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    const handleSaveUpdate = async (updatedSupervisor: Supervisor) => {
        await onUpdateSupervisor(updatedSupervisor);
        setSupervisorToEdit(null);
    };

    const foremenColumns: Column<Foreman>[] = useMemo(() => [
        { key: 'name', header: t.foremanName, sortable: true },
        { key: 'totalLabour', header: t.totalAssignedLabour, sortable: true },
    ], [t]);

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <header>
                <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 tracking-tight">{t.supervisorOverviewTitle}</h1>
            </header>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title={t.campLabour} value={campLabour} icon="fa-campground" color="blue" />
                <StatCard title={t.crewman} value={crewman} icon="fa-hard-hat" color="green" />
            </div>

            <div className="space-y-4">
                {supervisors.length > 0 ? (
                    supervisors
                        .filter(supervisor => supervisor && supervisor.id && supervisor.name) // Filter out invalid supervisors
                        .map(supervisor => {
                        const totalLabour = supervisor.foremen ? supervisor.foremen.reduce((sum, foreman) => sum + (foreman.totalLabour || 0), 0) : 0;

                        return (
                            <details key={supervisor.id} className="group bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-all duration-300">
                                <summary className="p-4 cursor-pointer list-none flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 flex-grow">
                                        <div>
                                            <p className="text-xs text-gray-500">{t.supervisorName}</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{supervisor.name}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t.areaLocation}</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{supervisor.area || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t.supervisorIqama}</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{supervisor.iqama}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t.supervisorMobile}</p>
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{supervisor.mobile ? `+966 ${supervisor.mobile}` : 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">{t.totalLabour}</p>
                                            <p className="font-bold text-lg text-blue-600 dark:text-blue-400">{totalLabour}</p>
                                        </div>
                                    </div>
                                    {!isReadOnly && (
                                        <div className="flex items-center space-x-2 rtl:space-x-reverse mx-4">
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    // Only allow edit if supervisor has valid ID and exists
                                                    if (supervisor.id && supervisor.name) {
                                                        if (onEditSupervisor) {
                                                            // Navigate to Add Supervisor page with pre-filled data
                                                            onEditSupervisor(supervisor);
                                                        } else {
                                                            // Fallback to modal edit
                                                            setSupervisorToEdit(supervisor);
                                                        }
                                                    } else {
                                                        console.warn('Cannot edit supervisor with invalid ID:', supervisor);
                                                    }
                                                }} 
                                                className="text-blue-500 hover:text-blue-700 p-2" 
                                                title={t.editSupervisorTitle}
                                                disabled={!supervisor.id || !supervisor.name}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </button>
                                            <button 
                                                onClick={(e) => { 
                                                    e.preventDefault(); 
                                                    // Only allow delete if supervisor has valid ID
                                                    if (supervisor.id && supervisor.name) {
                                                        setSupervisorToDelete(supervisor); 
                                                    } else {
                                                        console.warn('Cannot delete supervisor with invalid ID:', supervisor);
                                                    }
                                                }} 
                                                className="text-red-500 hover:text-red-700 p-2" 
                                                title={t.deleteSupervisorTitle}
                                                disabled={!supervisor.id || !supervisor.name}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    )}
                                    <div className="ms-4 text-gray-400 group-open:rotate-90 transform transition-transform">
                                        <i className="fas fa-chevron-right"></i>
                                    </div>
                                </summary>
                                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <h4 className="font-semibold mb-2 text-gray-700 dark:text-gray-300">{t.foremenInfo}</h4>
                                    <Table<Foreman>
                                        columns={foremenColumns}
                                        data={supervisor.foremen.map((foreman, index) => ({
                                            ...foreman,
                                            id: foreman.id || `${supervisor.id}-foreman-${index}`
                                        }))}
                                        initialSortKey="name"
                                    />
                                </div>
                            </details>
                        );
                    })
                ) : (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                        <i className="fas fa-user-tie text-4xl mb-4"></i>
                        <p className="text-lg">{t.noSupervisorsFound}</p>
                    </div>
                )}
            </div>

            {!isReadOnly && (
                <>
                    <EditSupervisorModal
                        isOpen={!!supervisorToEdit}
                        onClose={() => setSupervisorToEdit(null)}
                        onSave={handleSaveUpdate}
                        supervisor={supervisorToEdit}
                        lang={lang}
                    />

                    {supervisorToDelete && (
                        <ConfirmationModal
                            isOpen={!!supervisorToDelete}
                            onClose={() => { 
                                if (!isDeleting) {
                                    setSupervisorToDelete(null); 
                                    setActionError(null); 
                                }
                            }}
                            onConfirm={handleConfirmDelete}
                            title={t.deleteSupervisorTitle}
                            message={
                                <>
                                    {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                                    {isDeleting ? (
                                        <div className="flex items-center gap-2 text-blue-600">
                                            <i className="fas fa-spinner fa-spin"></i>
                                            <span>{lang === 'ar' ? 'جاري الحذف...' : 'Deleting supervisor...'}</span>
                                        </div>
                                    ) : (
                                        <>
                                            {t.deleteSupervisorMessage}
                                            <br/>
                                            <span className="font-semibold">{supervisorToDelete.name}</span>
                                        </>
                                    )}
                                </>
                            }
                            confirmButtonText={isDeleting ? (lang === 'ar' ? 'جاري الحذف...' : 'Deleting...') : t.confirmDelete}
                            cancelButtonText={t.cancel}
                            isLoading={isDeleting}
                        />
                    )}
                </>
            )}
        </div>
    );
};

export default SupervisorOverviewPage;
