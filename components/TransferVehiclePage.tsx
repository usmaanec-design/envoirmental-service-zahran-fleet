import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle, Transfer, User, AdminNotification, NotificationType } from '../types';
import FormSection from './ui/FormSection';
import Button from './ui/Button';
import FormStatus from './ui/FormStatus';
import VehicleSelect from './ui/VehicleSelect';
import Select from './ui/Select';
import Table, { type Column } from './ui/Table';
import Input from './ui/Input';
import ConfirmationModal from './ui/ConfirmationModal';

interface TransferVehiclePageProps {
    lang: Language;
    vehicles: Vehicle[];
    allVehicles: Vehicle[];
    transfers: Transfer[];
    notifications: AdminNotification[];
    allUsers: User[];
    currentUser: User;
    onTransfer: (vehicleId: string, toUserId: string, transferDate: string) => Promise<void>;
    onAddNotification: (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>) => Promise<void>;
    onDeleteTransfer: (transferId: string) => Promise<void>;
    isReadOnly?: boolean;
}

const TransferVehiclePage: React.FC<TransferVehiclePageProps> = ({ lang, vehicles, allVehicles, transfers, notifications, allUsers, currentUser, onTransfer, onAddNotification, onDeleteTransfer, isReadOnly }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [toUserId, setToUserId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    const [notifying, setNotifying] = useState<Record<string, boolean>>({});
    const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // Debug logging
    console.log("🚗 TransferVehiclePage props:", {
        vehiclesCount: vehicles?.length || 0,
        allVehiclesCount: allVehicles?.length || 0,
        allUsersCount: allUsers?.length || 0,
        currentUser: currentUser?.email || 'No current user',
        transfers: transfers?.length || 0
    });

    // Safety check with error boundary
    try {
        if (!allUsers) {
            console.error("❌ allUsers is undefined in TransferVehiclePage");
            return <div className="p-4 bg-red-100 text-red-700">Error: User data not loaded</div>;
        }

        if (!currentUser) {
            console.error("❌ currentUser is undefined in TransferVehiclePage");
            return <div className="p-4 bg-red-100 text-red-700">Error: Current user not found</div>;
        }
    } catch (error) {
        console.error("❌ Error in TransferVehiclePage safety check:", error);
        return <div className="p-4 bg-red-100 text-red-700">Error: Page loading failed</div>;
    }

    const getTranslatedProjectName = (projectName: string): string => {
        if (lang !== 'ar') {
            return projectName;
        }
        if (projectName === 'Riyadh Site Project') {
            return t.projectName_Riyadh_Site_Project;
        }
        if (projectName === 'Jeddah Expansion') {
            return t.projectName_Jeddah_Expansion;
        }
        return projectName;
    };

    const selectedVehicle = useMemo(() => vehicles.find(v => v.id === selectedVehicleId), [selectedVehicleId, vehicles]);

    const projectOptions = useMemo(() => {
        if (!allUsers || !Array.isArray(allUsers) || !currentUser?.uid) {
            console.warn("⚠️ Cannot create project options: missing data", {
                allUsersExists: !!allUsers,
                allUsersIsArray: Array.isArray(allUsers),
                currentUserUid: currentUser?.uid
            });
            return [];
        }
        
        console.log("🔍 Creating project options from allUsers:", {
            totalUsers: allUsers.length,
            currentUserUid: currentUser.uid,
            allUsersData: allUsers.map(u => ({
                uid: u?.uid,
                email: u?.email,
                projectName: u?.projectName
            }))
        });
        
        // Filter out current user and users without project names
        const filteredUsers = allUsers.filter(u => 
            u && 
            u.uid && 
            u.uid !== currentUser.uid && 
            u.projectName && 
            u.projectName.trim() !== '' &&
            !u.isAdmin // Exclude admin users from transfer options
        );
        
        console.log("🔍 Filtered users for projects:", filteredUsers.map(u => ({
            uid: u.uid,
            email: u.email,
            projectName: u.projectName
        })));
        
        const options = filteredUsers.map(u => ({ 
            value: u.uid || '', 
            label: `${getTranslatedProjectName(u.projectName || 'Unknown Project')} (${u.email || 'No Email'})` 
        }));
        
        console.log("🔍 Final project options:", options);
        return options;
    }, [allUsers, currentUser?.uid, getTranslatedProjectName]);
    
    const usersMap = useMemo(() => {
        if (!allUsers || !Array.isArray(allUsers)) {
            console.warn("⚠️ Cannot create users map: allUsers is not an array");
            return {};
        }
        
        return allUsers.reduce((acc, user) => {
            if(user && user.uid) acc[user.uid] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [allUsers]);

    const vehiclesMap = useMemo(() => {
        return allVehicles.reduce((acc, vehicle) => {
            acc[vehicle.id] = vehicle;
            return acc;
        }, {} as Record<string, Vehicle>);
    }, [allVehicles]);

    const resetForm = () => {
        setSelectedVehicleId('');
        setToUserId('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setVehicleSearchTerm('');
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        
        if (!selectedVehicleId) {
            newErrors.vehicle = t.requiredField;
        }
        
        if (!toUserId) {
            newErrors.project = t.requiredField;
        } else {
            // Check if destination project exists
            const destinationUser = allUsers.find(u => u.uid === toUserId);
            if (!destinationUser) {
                newErrors.project = lang === 'ar' ? 'المشروع المحدد غير موجود' : 'Selected project does not exist';
            } else if (!destinationUser.projectName) {
                newErrors.project = lang === 'ar' ? 'المشروع المحدد لا يحتوي على اسم' : 'Selected project has no name';
            }
        }
        
        // Validate transfer date
        const today = new Date();
        const transferDateObj = new Date(transferDate);
        if (transferDateObj > today) {
            newErrors.transferDate = lang === 'ar' ? 'تاريخ التحويل لا يمكن أن يكون في المستقبل' : 'Transfer date cannot be in the future';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirmTransfer = async () => {
        if (isSubmitting || isReadOnly) return;
        
        setFormStatus(null);
        setActionError(null);
        
        if (!validateForm()) {
            setFormStatus({ 
                type: 'error', 
                message: lang === 'ar' ? 'يرجى تصحيح الأخطاء في النموذج' : 'Please correct the errors in the form' 
            });
            return;
        }

        setIsSubmitting(true);
        try {
            console.log('🔄 Starting vehicle transfer:', {
                vehicleId: selectedVehicleId,
                toUserId: toUserId,
                transferDate: transferDate
            });
            
            await onTransfer(selectedVehicleId, toUserId, new Date(transferDate).toISOString());
            
            console.log('✅ Vehicle transfer completed successfully');
            setFormStatus({ type: 'success', message: t.transferSuccess });
            resetForm();
            setTimeout(() => setFormStatus(null), 5000);
        } catch (error) {
            const message = error instanceof Error ? error.message : t.transferError;
            console.error("❌ Error transferring vehicle:", error);
            setFormStatus({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleConfirmDelete = async () => {
        setActionError(null);
        if (transferToDelete) {
            try {
                await onDeleteTransfer(transferToDelete.id);
                setTransferToDelete(null);
            } catch (e) {
                const message = e instanceof Error ? e.message : "Failed to delete transfer.";
                console.error("Delete transfer error:", e);
                setActionError(message);
            }
        }
    };

    const transferHistoryColumns: Column<Transfer>[] = useMemo(() => {
        const baseColumns: Column<Transfer>[] = [
            { 
                key: 'vehicleId',
                header: t.thDoorNumber,
                sortable: true,
                render: (item) => vehiclesMap[item.vehicleId]?.doorNumber || 'N/A'
            },
            { 
                key: 'fromUserId',
                header: t.thFromProject,
                sortable: true,
                render: (item) => getTranslatedProjectName(usersMap[item.fromUserId]?.projectName || 'N/A')
            },
            { 
                key: 'toUserId',
                header: t.thToProject,
                sortable: true,
                render: (item) => getTranslatedProjectName(usersMap[item.toUserId]?.projectName || 'N/A')
            },
            { 
                key: 'timestamp',
                header: t.thIncidentDate,
                sortable: true,
                render: (item) => new Date(item.timestamp).toLocaleString('en-US')
            },
            {
                key: 'status',
                header: t.thStatus,
                sortable: true,
                render: (item) => (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'Returned' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    }`}>
                        {t[`status_${item.status}` as keyof typeof t]}
                    </span>
                )
            }
        ];
        
        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (transfer: Transfer) => {
                    const sentNotif = notifications.find(n => n.transferId === transfer.id && n.type === 'VEHICLE_SENT');
                    const returnedNotif = notifications.find(n => n.transferId === transfer.id && n.type === 'VEHICLE_RETURNED');
                    const isNotifyingSent = notifying[`${transfer.id}-sent`];
                    const isNotifyingReturned = notifying[`${transfer.id}-returned`];
    
                    const handleNotify = async (type: NotificationType) => {
                        const fromProject = usersMap[transfer.fromUserId]?.projectName || 'N/A';
                        const toProject = usersMap[transfer.toUserId]?.projectName || 'N/A';
                        const vehicleDoor = vehiclesMap[transfer.vehicleId]?.doorNumber || 'N/A';
                        const message = type === 'VEHICLE_SENT'
                            ? `Vehicle ${vehicleDoor} sent from ${fromProject} to ${toProject}.`
                            : `Vehicle ${vehicleDoor} returned to ${fromProject} from ${toProject}.`;
    
                        const stateKey = `${transfer.id}-${type === 'VEHICLE_SENT' ? 'sent' : 'returned'}`;
                        setNotifying(prev => ({ ...prev, [stateKey]: true }));
                        try {
                            await onAddNotification({
                                transferId: transfer.id,
                                fromUserId: currentUser.uid!,
                                vehicleId: transfer.vehicleId,
                                type,
                                message
                            });
                        } catch(e) { console.error("Failed to send notification", e); }
                        finally {
                           setNotifying(prev => ({ ...prev, [stateKey]: false }));
                        }
                    }
    
                    return (
                        <div className="flex flex-col space-y-2 items-center">
                            <Button 
                                variant="info" 
                                className="!min-w-0 !px-3 !py-1 text-xs w-full" 
                                onClick={() => handleNotify('VEHICLE_SENT')}
                                disabled={!!sentNotif || isNotifyingSent || isNotifyingReturned}
                            >
                                {isNotifyingSent ? <i className="fas fa-spinner fa-spin"></i> : sentNotif ? t.notified : t.notifyAdminSent}
                            </Button>
                            <Button 
                                variant="success" 
                                className="!min-w-0 !px-3 !py-1 text-xs w-full" 
                                onClick={() => handleNotify('VEHICLE_RETURNED')}
                                disabled={!!returnedNotif || isNotifyingSent || isNotifyingReturned}
                            >
                                 {isNotifyingReturned ? <i className="fas fa-spinner fa-spin"></i> : returnedNotif ? t.notified : t.notifyAdminReturned}
                            </Button>
                            <button 
                                onClick={() => setTransferToDelete(transfer)} 
                                className="text-red-500 hover:text-red-700 p-1 text-sm flex items-center gap-1 w-full justify-center mt-1" 
                                title={t.deleteTransferTitle}
                            >
                                <i className="fas fa-trash"></i> <span>Delete</span>
                            </button>
                        </div>
                    )
                }
            });
        }

        return baseColumns;

    }, [t, lang, vehiclesMap, usersMap, notifications, isReadOnly, notifying, onAddNotification, currentUser.uid, getTranslatedProjectName]);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-5xl mx-auto space-y-12">
            <div>
                <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10">
                    <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.transferVehicleTitle}</h2>
                </header>

                {formStatus && (
                    <FormStatus
                        type={formStatus.type}
                        message={formStatus.message}
                    />
                )}

                <form noValidate>
                    <FormSection title={t.transferInfo}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <VehicleSelect
                                label={t.selectVehicle}
                                vehicles={vehicles}
                                value={selectedVehicleId}
                                onSelect={(id) => {
                                    setSelectedVehicleId(id);
                                    if (errors.vehicle) setErrors(prev => ({ ...prev, vehicle: '' }));
                                }}
                                placeholder={t.selectVehicleOptional}
                                searchHint={t.searchVehicleHint}
                                noResultsText={t.noVehiclesFound}
                                searchTerm={vehicleSearchTerm}
                                onSearchTermChange={setVehicleSearchTerm}
                                searchTermPlaceholder={t.vehicleSearchPlaceholder}
                            />
                            {errors.vehicle && <p className="text-red-500 text-sm -mt-4 md:col-span-2">{errors.vehicle}</p>}
                            
                             <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{t.currentProject}</label>
                                <p className="text-gray-900 dark:text-gray-100 font-semibold h-6 flex items-center">{selectedVehicle ? getTranslatedProjectName(selectedVehicle.projectSite) : '-'}</p>
                            </div>
                            
                            <Select
                                label={t.transferTo}
                                name="project"
                                value={toUserId}
                                onChange={(e) => {
                                    setToUserId(e.target.value);
                                     if (errors.project) setErrors(prev => ({ ...prev, project: '' }));
                                }}
                                options={projectOptions}
                                placeholder={projectOptions.length > 0 ? t.selectProject : (lang === 'ar' ? 'لا توجد مشاريع متاحة للتحويل' : 'No projects available for transfer')}
                                error={errors.project}
                                required
                                disabled={projectOptions.length === 0}
                            />
                            
                            {projectOptions.length === 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm">
                                    <i className="fas fa-exclamation-triangle mr-2"></i>
                                    {lang === 'ar' 
                                        ? 'لا توجد مشاريع متاحة للتحويل. يرجى التأكد من وجود مشاريع أخرى في النظام.'
                                        : 'No projects available for transfer. Please ensure other projects exist in the system.'
                                    }
                                </div>
                            )}

                            <Input
                                label={t.transferDate}
                                name="transferDate"
                                type="date"
                                value={transferDate}
                                onChange={(e) => {
                                    setTransferDate(e.target.value);
                                    if (errors.transferDate) setErrors(prev => ({ ...prev, transferDate: '' }));
                                }}
                                error={errors.transferDate}
                                max={new Date().toISOString().split('T')[0]}
                                required
                            />
                        </div>
                    </FormSection>
                    
                    {!isReadOnly && (
                        <div className="flex justify-end gap-4 mt-8">
                            <Button type="button" variant="success" onClick={handleConfirmTransfer} disabled={isSubmitting}>
                                {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-exchange-alt me-2"></i> {t.confirmTransfer}</>}
                            </Button>
                        </div>
                    )}
                </form>
            </div>
            
             <div>
                <header className="border-b-2 border-gray-300 dark:border-gray-700 pb-4 mb-6">
                    <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">{t.transferHistory}</h2>
                </header>
                 {transfers.length > 0 ? (
                    <Table<Transfer>
                        columns={transferHistoryColumns}
                        data={transfers}
                        initialSortKey="timestamp"
                        initialSortDirection="desc"
                    />
                ) : (
                    <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                        <i className="fas fa-history text-4xl mb-4"></i>
                        <p className="text-lg">{t.noTransfersFound}</p>
                    </div>
                )}
            </div>

            {transferToDelete && (
                <ConfirmationModal
                    isOpen={!!transferToDelete}
                    onClose={() => { setTransferToDelete(null); setActionError(null); }}
                    onConfirm={handleConfirmDelete}
                    title={t.deleteTransferTitle}
                    message={
                        <>
                            {actionError && <p className="text-red-500 mb-2">{actionError}</p>}
                            {t.deleteTransferMessage}
                        </>
                    }
                    confirmButtonText={t.confirmDelete}
                    cancelButtonText={t.cancel}
                />
            )}
        </div>
    );
};

export default TransferVehiclePage;
