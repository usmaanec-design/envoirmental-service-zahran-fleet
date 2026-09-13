import React, { useState, useMemo, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle } from '../types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import Textarea from './ui/Textarea';

interface MarkAsRepairedModalProps {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle | null;
    onMarkActive: (vehicleId: string, repairedAt: string, repairedBy: string, repairNotes?: string) => Promise<void>;
    lang: Language;
}

const MarkAsRepairedModal: React.FC<MarkAsRepairedModalProps> = ({ isOpen, onClose, vehicle, onMarkActive, lang }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    // --- STATE ---
    const [repairDate, setRepairDate] = useState('');
    const [repairedBy, setRepairedBy] = useState('');
    const [repairNotes, setRepairNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // --- UTILITY FUNCTIONS ---
    const resetState = () => {
        setRepairDate(new Date().toISOString().split('T')[0]);
        setRepairedBy('');
        setRepairNotes('');
        setIsSubmitting(false);
        setError(null);
    };
    
    // --- EFFECTS ---
    useEffect(() => {
        // Reset form state when the modal is opened or closed
        resetState();
    }, [isOpen]);

    // --- EVENT HANDLERS ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!vehicle || !repairDate || !repairedBy.trim()) {
            setError(t.requiredField);
            return;
        }

        setIsSubmitting(true);
        try {
            await onMarkActive(vehicle.id, repairDate, repairedBy.trim(), repairNotes.trim() || undefined);
            onClose(); // Close the modal on success
        } catch (err) {
            const message = err instanceof Error ? err.message : "Error confirming repair. Please try again.";
            console.error("Error marking vehicle as active:", err);
            setError(message);
            setIsSubmitting(false);
        }
    };

    // --- RENDER ---
    if (!isOpen || !vehicle) {
        return null;
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.markVehicleActiveTitle}>
            <form onSubmit={handleSubmit}>
                <div className="p-6">
                    {/* Vehicle Info Box */}
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4 border border-gray-200 dark:border-gray-700">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">{t.vehicleInformation}</h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-gray-500 dark:text-gray-400">{t.thDoorNumber}</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{vehicle.doorNumber}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t.thPlateNumber}</span>
                            <span className="font-medium text-gray-900 dark:text-gray-100">{vehicle.plateNumber}</span>
                            <span className="text-gray-500 dark:text-gray-400">{t.currentStatus}</span>
                            <span className="font-medium text-red-600 dark:text-red-400">{vehicle.status}</span>
                        </div>
                    </div>
                    
                    {error && (
                         <div className="p-3 mb-4 rounded-md text-white bg-red-500 text-sm" role="alert">
                            <div className="flex items-center">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                <p>{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className="space-y-4">
                        <Input 
                            label={t.repairDate} 
                            name="repairDate" 
                            type="date" 
                            value={repairDate} 
                            onChange={(e) => setRepairDate(e.target.value)}
                            required
                        />
                        <Input 
                            label={t.repairedBy}
                            name="repairedBy"
                            value={repairedBy}
                            onChange={(e) => setRepairedBy(e.target.value)}
                            placeholder={t.repairedByPlaceholder}
                            required
                        />
                        <Textarea
                            label={t.repairNotes}
                            name="repairNotes"
                            value={repairNotes}
                            onChange={(e) => setRepairNotes(e.target.value)}
                            placeholder={t.repairNotesPlaceholder}
                            rows={3}
                        />
                    </div>
                    
                    {/* Warning Box */}
                    <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200">
                        <p>{t.confirmRepairWarning}</p>
                    </div>
                </div>
                <footer className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
                        {t.cancel}
                    </Button>
                    <Button type="submit" variant="success" disabled={isSubmitting}>
                        {isSubmitting ? (
                             <><i className="fas fa-spinner fa-spin me-2"></i> {t.confirming}</>
                        ) : (
                            <>{t.confirmRepair}</>
                        )}
                    </Button>
                </footer>
            </form>
        </Modal>
    );
};

export default MarkAsRepairedModal;
