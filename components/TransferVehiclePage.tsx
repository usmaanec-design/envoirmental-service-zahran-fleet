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
    allVehiclesForLookup: Vehicle[];
    transfers: Transfer[];
    notifications: AdminNotification[];
    allUsers: User[];
    currentUser: User;
    onTransfer: (vehicleId: string, toUserId: string, transferDate: string, notes?: string) => Promise<void>;
    onAddNotification: (notificationData: Omit<AdminNotification, 'id' | 'isRead' | 'timestamp'>) => Promise<void>;
    onDeleteTransfer: (transferId: string) => Promise<void>;
    onReturn: (transferId: string) => Promise<void>;
    isReadOnly?: boolean;
}

const TransferVehiclePage: React.FC<TransferVehiclePageProps> = ({ lang, vehicles, allVehiclesForLookup, transfers, notifications, allUsers, currentUser, onTransfer, onAddNotification, onDeleteTransfer, onReturn, isReadOnly }) => {
    const [selectedVehicleId, setSelectedVehicleId] = useState('');
    const [toUserId, setToUserId] = useState('');
    const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    const [notifying, setNotifying] = useState<Record<string, boolean>>({});
    const [isReturning, setIsReturning] = useState<Record<string, boolean>>({});
    const [transferToDelete, setTransferToDelete] = useState<Transfer | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

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
        return allUsers
            .filter(u => u.uid !== currentUser.uid)
            .map(u => ({ value: u.uid || '', label: getTranslatedProjectName(u.projectName) }));
    }, [allUsers, currentUser.uid, getTranslatedProjectName]);
    
    const usersMap = useMemo(() => {
        return allUsers.reduce((acc, user) => {
            if(user.uid) acc[user.uid] = user;
            return acc;
        }, {} as Record<string, User>);
    }, [allUsers]);

    const resetForm = () => {
        setSelectedVehicleId('');
        setToUserId('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setVehicleSearchTerm('');
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!selectedVehicleId) newErrors.vehicle = t.requiredField;
        if (!toUserId) newErrors.project = t.requiredField;
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirmTransfer = async () => {
        if (isSubmitting || isReadOnly) return;
        setFormStatus(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                await onTransfer(selectedVehicleId, toUserId, new Date(transferDate).toISOString(), undefined);
                setFormStatus({ type: 'success', message: t.transferSuccess });
                resetForm();
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                const message = error instanceof Error ? error.message : t.transferError;
                console.error("Error transferring vehicle:", error);
                setFormStatus({ type: 'error', message });
            } finally {
                setIsSubmitting(false);
            }
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

    const handleNotify = async (transfer: Transfer, type: NotificationType) => {
        if (notifying[transfer.id]) return;

        setNotifying(prev => ({ ...prev, [transfer.id]: true }));
        try {
            const vehicle = allVehiclesForLookup.find(v => v.id === transfer.vehicleId);
            const fromUser = allUsers.find(u => u.uid === transfer.fromUserId);
            const toUser = allUsers.find(u => u.uid === transfer.toUserId);

            const message = type === 'VEHICLE_SENT'
                ? `Vehicle ${vehicle?.doorNumber} transferred from ${fromUser?.projectName} to ${toUser?.projectName}.`
                : `Vehicle ${vehicle?.doorNumber} returned from ${toUser?.projectName} to ${fromUser?.projectName}.`;
            
            await onAddNotification({
                transferId: transfer.id,
                fromUserId: currentUser.uid!,
                vehicleId: transfer.vehicleId,
                type,
                message,
            });
        } catch (error) {
            console.error("Failed to send notification:", error);
        } finally {
            setNotifying(prev => ({ ...prev, [transfer.id]: false }));
        }
    };
    
    const handleReturn = async (transfer: Transfer) => {
        if (isReturning[transfer.id] || isReadOnly) return;
        
        setIsReturning(prev => ({ ...prev, [transfer.id]: true }));
        setFormStatus(null);
        try {
            await onReturn(transfer.id);
            setFormStatus({ type: 'success', message: t.returnSuccess });
        } catch (error) {
            const message = error instanceof Error ? error.message : t.returnError;
            console.error("Error returning vehicle:", error);
            setFormStatus({ type: 'error', message });
        } finally {
            setIsReturning(prev => ({ ...prev, [transfer.id]: false }));
        }
    };


    const transferHistoryColumns: Column<Transfer>[] = useMemo(() => {
        const baseColumns: Column<Transfer>[] = [
            { 
                key: 'vehicleId',
                header: t.thDoorNumber,
                render: (transfer) => allVehiclesForLookup.find(v => v.id === transfer.vehicleId)?.doorNumber || 'N/A'
            },
            { 
                key: 'plateNumber' as any,
                header: t.thPlateNumber,
                render: (transfer) => allVehiclesForLookup.find(v => v.id === transfer.vehicleId)?.plateNumber || 'N/A'
            },
            { 
                key: 'fromUserId',
                header: t.thFromProject,
                render: (transfer) => getTranslatedProjectName(usersMap[transfer.fromUserId]?.projectName || 'N/A')
            },
            { 
                key: 'toUserId',
                header: t.thToProject,
                render: (transfer) => getTranslatedProjectName(usersMap[transfer.toUserId]?.projectName || 'N/A')
            },
            { 
                key: 'timestamp',
                header: t.thIncidentDate,
                render: (transfer) => new Date(transfer.timestamp).toLocaleString()
            },
            { 
                key: 'status',
                header: t.thStatus,
                render: (transfer) => (
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        transfer.status === 'Returned' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' 
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                    }`}>
                        {t[`status_${transfer.status}` as keyof typeof t] || transfer.status}
                    </span>
                )
            }
        ];

        if (!isReadOnly) {
            baseColumns.push({
                key: 'actions',
                header: t.actions,
                render: (transfer) => {
                    const isCurrentUserReceiver = transfer.toUserId === currentUser.uid;
                    const canBeReturned = transfer.status === 'Transferred';

                    if (isCurrentUserReceiver && canBeReturned) {
                        return (
                            <Button
                                variant="info"
                                onClick={() => handleReturn(transfer)}
                                disabled={isReturning[transfer.id]}
                                className="!bg-purple-600 hover:!bg-purple-700 !focus:ring-purple-300 !px-3 !py-1.5 text-xs"
                            >
                                {isReturning[transfer.id] ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-undo-alt me-1"></i> {t.returnVehicle}</>} 
                            </Button>
                        );
                    }
                    
                    const isNotified = notifications.some(n => n.transferId === transfer.id);
                    const isCurrentUserSender = transfer.fromUserId === currentUser.uid;

                    return (
                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                            {isCurrentUserSender && transfer.status === 'Transferred' && !isNotified && (
                                 <Button
                                    variant="info"
                                    onClick={() => handleNotify(transfer, 'VEHICLE_SENT')}
                                    disabled={notifying[transfer.id]}
                                    className="!px-3 !py-1.5 text-xs"
                                >
                                    {notifying[transfer.id] ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-bell me-1"></i> {t.notifyAdminSent}</>}
                                </Button>
                            )}
                            {isNotified && transfer.status === 'Transferred' && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center">
                                    <i className="fas fa-check-circle me-1"></i> {t.notified}
                                </span>
                            )}
                            <button onClick={() => setTransferToDelete(transfer)} className="text-red-500 hover:text-red-700 p-2" title={t.deleteTransferTitle}>
                                <i className="fas fa-trash"></i>
                            </button>
                        </div>
                    );
                }
            });
        }
        
        return baseColumns;
    }, [t, usersMap, allVehiclesForLookup, notifications, isReadOnly, handleNotify, notifying, currentUser.uid, getTranslatedProjectName, handleReturn, isReturning]);

    const handleCancel = () => {
        setSelectedVehicleId('');
        setToUserId('');
        setTransferDate(new Date().toISOString().split('T')[0]);
        setFormStatus(null);
        setVehicleSearchTerm('');
        if (window.history.length > 1) {
            window.history.back();
        }
    };

    return (
        <div className="space-y-8 w-full">
            {/* Transfer Form Section */}
            {!isReadOnly && (
                <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
                    <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                        <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.transferVehicleTitle}</h2>
                    </div>

                    {formStatus && (formStatus.type === 'error' || formStatus.type === 'success') && <FormStatus type={formStatus.type} message={formStatus.message} />}


                    <form noValidate>
                        <FormSection title={t.transferInfo}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                                <VehicleSelect
                                    label={t.selectVehicle}
                                    vehicles={vehicles}
                                    value={selectedVehicleId}
                                    onSelect={setSelectedVehicleId}
                                    placeholder={t.selectVehicleOptional}
                                    searchHint={t.searchVehicleHint}
                                    noResultsText={t.noVehiclesFound}
                                    searchTerm={vehicleSearchTerm}
                                    onSearchTermChange={setVehicleSearchTerm}
                                    searchTermPlaceholder={t.vehicleSearchPlaceholder}
                                    error={errors.vehicle}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        label={t.currentProject}
                                        name="currentProject"
                                        value={selectedVehicle?.projectSite || currentUser.projectName || ''}
                                        disabled
                                    />
                                    <Select
                                        label={t.transferTo}
                                        name="toUserId"
                                        value={toUserId}
                                        onChange={(e) => setToUserId(e.target.value)}
                                        options={projectOptions}
                                        placeholder={t.selectProject}
                                        error={errors.project}
                                        required
                                    />
                                </div>
                                <Input
                                    label={t.transferDate}
                                    name="transferDate"
                                    type="date"
                                    value={transferDate}
                                    onChange={(e) => setTransferDate(e.target.value)}
                                    required
                                />
                            </div>
                        </FormSection>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <Button type="button" variant="secondary" onClick={handleCancel}>
                                <i className="fas fa-times me-1.5"></i> {t.cancel}
                            </Button>
                            <Button type="button" variant="success" onClick={handleConfirmTransfer} disabled={isSubmitting}>
                                {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-exchange-alt me-1.5"></i> {t.confirmTransfer}</>}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Transfer History Section */}
            <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
                <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                    <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.transferHistory}</h2>
                </div>
                 {formStatus && (formStatus.type === 'success' || formStatus.type === 'error') && <div className="mb-4"><FormStatus type={formStatus.type} message={formStatus.message} /></div>}
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
