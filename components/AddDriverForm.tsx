import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Driver, Vehicle } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import VehicleSelect from './ui/VehicleSelect';
import FormStatus from './ui/FormStatus';

interface AddDriverFormProps {
    lang: Language;
    onAddDriver: (driver: Omit<Driver, 'id'>) => Promise<void>;
    vehicles: Vehicle[];
    drivers: Driver[];
}

const initialDriverState: Omit<Driver, 'id'> = {
    driverName: '',
    nationality: '',
    driverIqama: '',
    driverMobile: '',
    assignedVehicle: ''
};

const AddDriverForm: React.FC<AddDriverFormProps> = ({ lang, onAddDriver, vehicles, drivers }) => {
    const [driver, setDriver] = useState<Omit<Driver, 'id'>>(initialDriverState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isShaking, setIsShaking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setDriver(prev => ({ ...prev, [name]: value }));
        if(errors[name]) {
            setErrors(prev => ({...prev, [name]: ''}));
        }
    };

    const handleIqamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 10);
        handleInputChange({ ...e, target: { ...e.target, name: 'driverIqama', value } });
    };

    const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 9) {
            value = value.substring(0, 9);
        }
        handleInputChange({ ...e, target: { ...e.target, name: 'driverMobile', value } });
    };

    const handleVehicleSelect = (vehicleId: string) => {
        setDriver(prev => ({ ...prev, assignedVehicle: vehicleId }));
        if(errors.assignedVehicle) {
            setErrors(prev => ({...prev, assignedVehicle: ''}));
        }
    };
    
    const resetForm = () => {
        setDriver(initialDriverState);
        setErrors({});
        setVehicleSearchTerm('');
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!driver.driverName.trim()) newErrors.driverName = t.requiredField;
        
        if (!driver.driverIqama) {
            newErrors.driverIqama = t.requiredField;
        } else if (!/^\d{10}$/.test(driver.driverIqama)) {
            newErrors.driverIqama = t.iqamaInvalid;
        }

        // Mobile is optional, but validate if entered
        if (driver.driverMobile && !/^5\d{8}$/.test(driver.driverMobile)) {
            newErrors.driverMobile = t.mobileInvalid;
        }
        
        if (driver.assignedVehicle) {
            const isVehicleAssigned = drivers.some(d => d.assignedVehicle === driver.assignedVehicle);
            if (isVehicleAssigned) {
                newErrors.assignedVehicle = t.vehicleAlreadyAssigned;
            }
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
                await onAddDriver(driver);
                setFormStatus({ type: 'success', message: t.saveSuccess });
                resetForm();
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                const message = error instanceof Error ? error.message : t.saveError;
                console.error("Error saving driver:", error);
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="flex flex-wrap justify-between items-center border-b-2 border-blue-500 pb-6 mb-10">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.addDriverTitle}</h2>
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
                <FormSection title={t.driverInfo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input
                            label={t.driverName}
                            name="driverName"
                            value={driver.driverName}
                            onChange={handleInputChange}
                            error={errors.driverName}
                            required
                        />
                        <Input
                            label={t.nationality}
                            name="nationality"
                            value={driver.nationality}
                            onChange={handleInputChange}
                            error={errors.nationality}
                        />
                        <Input
                            label={t.driverIqama}
                            name="driverIqama"
                            value={driver.driverIqama}
                            onChange={handleIqamaChange}
                            error={errors.driverIqama}
                            maxLength={10}
                            placeholder="1234567890"
                            required
                        />
                        <div>
                            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1" htmlFor="driverMobile">{t.driverMobile}</label>
                            <div className="flex items-center">
                                <span className="inline-flex items-center px-3 h-11 rounded-s-lg border border-e-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">
                                    +966
                                </span>
                                <input
                                    type="tel"
                                    id="driverMobile"
                                    name="driverMobile"
                                    value={driver.driverMobile}
                                    onChange={handleMobileChange}
                                    className={`block w-full h-11 px-4 border ${errors.driverMobile ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-e-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                                    placeholder="5XXXXXXXX"
                                />
                            </div>
                            {errors.driverMobile && <p className="text-red-500 text-sm mt-1">{errors.driverMobile}</p>}
                        </div>
                    </div>
                </FormSection>

                <FormSection title={t.assignVehicle}>
                     <VehicleSelect
                        label={t.assignedVehicle}
                        vehicles={vehicles}
                        value={driver.assignedVehicle}
                        onSelect={handleVehicleSelect}
                        placeholder={t.selectVehicleOptional}
                        searchHint={t.searchVehicleHint}
                        noResultsText={t.noVehiclesFound}
                        searchTerm={vehicleSearchTerm}
                        onSearchTermChange={setVehicleSearchTerm}
                        searchTermPlaceholder={t.vehicleSearchPlaceholder}
                        error={errors.assignedVehicle}
                    />
                </FormSection>

                <div className="flex justify-end gap-4 mt-8">
                    <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                        <i className="fas fa-times me-2"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-2"></i> {t.saveDriver}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddDriverForm;