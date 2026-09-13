import React, { useState, useMemo } from 'react';
import { TRANSLATIONS, ARABIC_SERVICE_TYPES_FOR_EXPORT } from '../constants';
import type { Language, Vehicle } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import FormStatus from './ui/FormStatus';
import Select from './ui/Select';

interface AddVehicleFormProps {
    lang: Language;
    onAddVehicle: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    defaultProjectSite?: string;
}

const AddVehicleForm: React.FC<AddVehicleFormProps> = ({ lang, onAddVehicle, defaultProjectSite = '' }) => {
    const getInitialState = (): Omit<Vehicle, 'id'> => ({
        doorNumber: '',
        plateNumber: '',
        chassisNumber: '',
        make: '',
        manufacturer: '',
        year: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        tareWeight: '',
        serviceType: '',
        projectSite: defaultProjectSite,
        status: 'Active',
    });

    const [vehicle, setVehicle] = useState<Omit<Vehicle, 'id'>>(getInitialState());
    const [customServiceType, setCustomServiceType] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const serviceTypeOptions = useMemo(() => {
        return [
            ...ARABIC_SERVICE_TYPES_FOR_EXPORT.map(type => ({
                value: type,
                label: type,
            })),
            { value: 'Other', label: t.other }
        ];
    }, [t.other]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'serviceType' && value !== 'Other') {
            setCustomServiceType('');
        }
        setVehicle(prev => ({ ...prev, [name]: value }));
        if(errors[name]) {
            setErrors(prev => ({...prev, [name]: ''}));
        }
    };

    const resetForm = () => {
        setVehicle(getInitialState());
        setCustomServiceType('');
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!vehicle.doorNumber.trim()) newErrors.doorNumber = t.requiredField;
        if (!vehicle.chassisNumber.trim()) newErrors.chassisNumber = t.requiredField;
        if (!vehicle.serviceType) {
            newErrors.serviceType = t.requiredField;
        } else if (vehicle.serviceType === 'Other' && !customServiceType.trim()) {
            newErrors.customServiceType = t.requiredField;
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (isSubmitting) return;
        setFormStatus(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const finalServiceType = vehicle.serviceType === 'Other' ? customServiceType.trim() : vehicle.serviceType;
                await onAddVehicle({ ...vehicle, serviceType: finalServiceType });
                setFormStatus({ type: 'success', message: t.saveVehicleSuccess });
                resetForm();
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                let message = t.saveError;
                if (error instanceof Error) {
                    if (error.message === 'DOOR_NUMBER_EXISTS') {
                        message = t.doorNumberExists;
                        setErrors(prev => ({ ...prev, doorNumber: t.doorNumberExists }));
                    } else {
                        message = error.message;
                    }
                }
                console.error("Failed to save vehicle:", error);
                setFormStatus({ type: 'error', message });
                setIsShaking(true);
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setFormStatus({ type: 'error', message: t.saveError });
            setIsShaking(true);
        }
    };

    const handleCancel = () => {
        setVehicle(getInitialState());
        setCustomServiceType('');
        setErrors({});
        setFormStatus(null);
        if (window.history.length > 1) {
            window.history.back();
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.addVehicleTitle}</h2>
            </div>

            {formStatus && (
               <FormStatus
                   type={formStatus.type}
                   message={formStatus.message}
                   className={isShaking && formStatus.type === 'error' ? 'animate-shake' : ''}
                   onAnimationEnd={() => setIsShaking(false)}
               />
            )}

            <form noValidate>
                <FormSection title={t.vehicleInfo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Input label={t.doorNumber} name="doorNumber" value={vehicle.doorNumber} onChange={handleInputChange} error={errors.doorNumber} required />
                        <Input label={t.plateNumber} name="plateNumber" value={vehicle.plateNumber} onChange={handleInputChange} error={errors.plateNumber} />
                        <Input label={t.manufacturer} name="manufacturer" value={vehicle.manufacturer} onChange={handleInputChange} error={errors.manufacturer} />
                        <Input label={t.make} name="make" value={vehicle.make} onChange={handleInputChange} error={errors.make} />
                        <Input label={t.year} name="year" type="number" placeholder="e.g. 2023" value={vehicle.year} onChange={handleInputChange} error={errors.year} />
                        <Input label={t.purchaseDate} name="purchaseDate" type="date" value={vehicle.purchaseDate} onChange={handleInputChange} error={errors.purchaseDate} />
                        <Input label={t.tareWeight} name="tareWeight" type="number" placeholder="e.g. 1500" value={vehicle.tareWeight} onChange={handleInputChange} error={errors.tareWeight} />
                        <div className="space-y-6">
                            <Select
                                label={t.serviceType}
                                name="serviceType"
                                value={vehicle.serviceType}
                                onChange={handleInputChange}
                                options={serviceTypeOptions}
                                error={errors.serviceType}
                                placeholder={t.serviceType}
                                required
                            />
                            {vehicle.serviceType === 'Other' && (
                                <Input
                                    label={t.otherServiceType}
                                    name="customServiceType"
                                    value={customServiceType}
                                    onChange={(e) => setCustomServiceType(e.target.value)}
                                    error={errors.customServiceType}
                                    required
                                />
                            )}
                        </div>
                        <Input label={t.projectSite} name="projectSite" value={vehicle.projectSite} onChange={handleInputChange} error={errors.projectSite} />
                         <div className="lg:col-span-3">
                            <Input label={t.chassisNumber} name="chassisNumber" value={vehicle.chassisNumber} onChange={handleInputChange} error={errors.chassisNumber} required />
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                        <i className="fas fa-times me-1.5"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-1.5"></i> {t.saveVehicle}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddVehicleForm;