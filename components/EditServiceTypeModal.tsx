import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { Vehicle, Language } from '../types';
import { TRANSLATIONS, ARABIC_SERVICE_TYPES_FOR_EXPORT } from '../constants';

interface EditServiceTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleIds: string[], newServiceType: string) => Promise<void>;
  serviceTypeToEdit: string;
  vehicles: Vehicle[];
  lang: Language;
}

const EditServiceTypeModal: React.FC<EditServiceTypeModalProps> = ({ isOpen, onClose, onSave, serviceTypeToEdit, vehicles, lang }) => {
    const [newServiceType, setNewServiceType] = useState('');
    const [customServiceType, setCustomServiceType] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    useEffect(() => {
        if (isOpen) {
            setNewServiceType('');
            setCustomServiceType('');
            setError(null);
            setIsSubmitting(false);
        }
    }, [isOpen]);
    
    const serviceTypeOptions = useMemo(() => [
        ...ARABIC_SERVICE_TYPES_FOR_EXPORT.map(type => ({ value: type, label: type })),
        { value: 'Other', label: t.other }
    ], [t.other]);
    
    const vehiclesToUpdate = useMemo(() => 
        vehicles.filter(v => v.serviceType === serviceTypeToEdit)
    , [vehicles, serviceTypeToEdit]);

    const handleSave = async () => {
        setError(null);
        const finalServiceType = newServiceType === 'Other' ? customServiceType.trim() : newServiceType;

        if (!finalServiceType) {
            setError(t.requiredField);
            return;
        }
        
        if (vehiclesToUpdate.length === 0) {
            setError("No vehicles found to update.");
            return;
        }

        setIsSubmitting(true);
        try {
            const vehicleIds = vehiclesToUpdate.map(v => v.id);
            await onSave(vehicleIds, finalServiceType);
        } catch (e) {
            const message = e instanceof Error ? e.message : t.saveError;
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`${t.editServiceTypeTitle}: ${serviceTypeToEdit}`}>
            <div className="p-6 space-y-4">
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm">{error}</p>}
                
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will update {vehiclesToUpdate.length} vehicles.
                </p>

                <Select
                    label={t.newServiceType}
                    name="newServiceType"
                    value={newServiceType}
                    onChange={(e) => setNewServiceType(e.target.value)}
                    options={serviceTypeOptions}
                    placeholder={t.serviceType}
                    required
                />
                {newServiceType === 'Other' && (
                    <Input
                        label={t.otherServiceType}
                        name="customServiceType"
                        value={customServiceType}
                        onChange={(e) => setCustomServiceType(e.target.value)}
                        required
                    />
                )}
            </div>
             <footer className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>{t.cancel}</Button>
                <Button variant="success" onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.updateServiceType}
                </Button>
            </footer>
        </Modal>
    );
};

export default EditServiceTypeModal;
