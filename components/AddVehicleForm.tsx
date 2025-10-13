import React, { useState, useMemo } from 'react';
import { TRANSLATIONS, SERVICE_TYPES } from '../constants';
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
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [customServiceType, setCustomServiceType] = useState('');
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const serviceTypeOptions = useMemo(() => {
        return SERVICE_TYPES.en.map((enType, index) => ({
            value: enType,
            label: lang === 'ar' ? SERVICE_TYPES.ar[index] : enType,
        }));
    }, [lang]);

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
        
        if (vehicle.serviceType === 'Other' && !customServiceType.trim()) {
            newErrors.customServiceType = t.requiredField;
        } else if (!vehicle.serviceType) {
            newErrors.serviceType = t.requiredField;
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
                const finalVehicleData = {
                    ...vehicle,
                    serviceType: vehicle.serviceType === 'Other' ? customServiceType : vehicle.serviceType,
                };
                await onAddVehicle(finalVehicleData);
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-5xl mx-auto">
            <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.addVehicleTitle}</h2>
            </header>

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
                        <Select
                            label={t.serviceType}
                            name="serviceType"
                            value={vehicle.serviceType}
                            onChange={handleInputChange}
                            options={serviceTypeOptions}
                            error={errors.serviceType}
                            placeholder="Select a service type..."
                            required
                        />
                         {vehicle.serviceType === 'Other' && (
                            <Input
                                label={t.otherServiceType}
                                name="customServiceType"
                                value={customServiceType}
                                onChange={(e) => {
                                    setCustomServiceType(e.target.value);
                                    if (errors.customServiceType) {
                                        setErrors(prev => ({...prev, customServiceType: ''}));
                                    }
                                }}
                                error={errors.customServiceType}
                                required
                            />
                        )}
                        <Input label={t.projectSite} name="projectSite" value={vehicle.projectSite} onChange={handleInputChange} error={errors.projectSite} />
                         <div className="lg:col-span-3">
                            <Input label={t.chassisNumber} name="chassisNumber" value={vehicle.chassisNumber} onChange={handleInputChange} error={errors.chassisNumber} required />
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end gap-4 mt-8">
                    <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                        <i className="fas fa-times me-2"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-2"></i> {t.saveVehicle}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddVehicleForm;