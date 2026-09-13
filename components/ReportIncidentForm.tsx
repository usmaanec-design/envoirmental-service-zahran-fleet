import React, { useState, useMemo } from 'react';
import { TRANSLATIONS, INCIDENT_TYPES, AFFECTED_PARTS_MAP } from '../constants';
import type { Language, Vehicle, Incident, Driver } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import SearchableSelect from './ui/SearchableSelect';

interface ReportIncidentFormProps {
    lang: Language;
    vehicles: Vehicle[];
    drivers: Driver[];
    onAddIncident: (incident: Omit<Incident, 'id'>) => Promise<void>;
}

const initialState: Omit<Incident, 'id'> = {
    vehicleId: '',
    type: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    affectedPart: '',
    driverId: '',
};

const ReportIncidentForm: React.FC<ReportIncidentFormProps> = ({ lang, vehicles, drivers, onAddIncident }) => {
    const [incident, setIncident] = useState(initialState);
    const [otherType, setOtherType] = useState('');
    const [otherPart, setOtherPart] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const vehicleOptions = useMemo(() => {
        const statusTranslations = {
            'Active': t.status_Active,
            'Accident': t.status_Accident,
            'Breakdown': t.status_Breakdown
        };
        return vehicles
            .map(v => ({
                value: v.id,
                label: `${v.doorNumber} / ${v.plateNumber} - (${statusTranslations[v.status] || v.status})`,
                disabled: v.status !== 'Active'
            }));
    }, [vehicles, t]);
    
    const driverOptions = useMemo(() => {
        return drivers.map(d => ({
            value: d.id,
            label: `${d.driverName} - ${d.driverIqama}`
        }));
    }, [drivers]);

    const incidentTypeOptions = useMemo(() => INCIDENT_TYPES.map(type => ({
        value: type.value,
        label: t[type.labelKey as keyof typeof t] || type.value
    })), [t]);

    const showAffectedPart = useMemo(() => {
        return incident.type && incident.type !== 'Accident' && incident.type !== 'Other';
    }, [incident.type]);

    const affectedPartOptions = useMemo(() => {
        if (!showAffectedPart) return [];
        const parts = AFFECTED_PARTS_MAP[lang][incident.type] || [];
        return parts.map(part => ({ value: part, label: part }));
    }, [showAffectedPart, incident.type, lang]);


    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        // Reset sub-fields when a primary field changes
        if (name === 'type') {
            setIncident(prev => ({ ...prev, type: value, affectedPart: '' }));
            setOtherType('');
            setOtherPart('');
        } else if (name === 'affectedPart') {
             setIncident(prev => ({ ...prev, affectedPart: value }));
             setOtherPart('');
        } else {
             setIncident(prev => ({ ...prev, [name]: value }));
        }
        
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    
    const handleVehicleChange = (value: string) => {
        setIncident(prev => ({ ...prev, vehicleId: value }));
        if (errors.vehicleId) setErrors(prev => ({ ...prev, vehicleId: '' }));
    };

    const handleDriverChange = (value: string) => {
        setIncident(prev => ({ ...prev, driverId: value }));
        if (errors.driverId) setErrors(prev => ({ ...prev, driverId: '' }));
    };

    const resetForm = () => {
        setIncident(initialState);
        setOtherType('');
        setOtherPart('');
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!incident.vehicleId) newErrors.vehicleId = t.requiredField;
        if (!incident.type) newErrors.type = t.requiredField;
        if (incident.type === 'Other' && !otherType.trim()) newErrors.otherType = t.requiredField;
        if (showAffectedPart && !incident.affectedPart) newErrors.affectedPart = t.requiredField;
        if (incident.affectedPart === 'Other' && !otherPart.trim()) newErrors.otherPart = t.requiredField;
        if (!incident.date) newErrors.date = t.requiredField;
        // Description is now optional
        // driverId is optional
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (isSubmitting) return;
        setFormStatus(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const finalType = incident.type === 'Other' ? otherType.trim() : incident.type;
                const finalPart = incident.affectedPart === 'Other' ? otherPart.trim() : incident.affectedPart;

                const incidentToSave: Omit<Incident, 'id'> = {
                    ...incident,
                    type: finalType,
                    affectedPart: showAffectedPart ? finalPart : '',
                };
                
                await onAddIncident(incidentToSave);
                setFormStatus({ type: 'success', message: t.reportSuccess });
                resetForm();
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                 const message = error instanceof Error ? error.message : "An error occurred submitting the report.";
                console.error("Failed to submit incident:", error);
                setFormStatus({ type: 'error', message });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleCancel = () => {
        setIncident(initialState);
        setOtherType('');
        setOtherPart('');
        setErrors({});
        setFormStatus(null);
        if (window.history.length > 1) {
            window.history.back();
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.reportIncidentTitle}</h2>
            </div>

            {formStatus && (
                <div className={`p-4 mb-6 rounded-md text-white ${formStatus.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} role="alert">
                     <div className="flex items-center">
                        <i className={`fas ${formStatus.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'} text-xl me-3`}></i>
                        <p className="font-semibold">{formStatus.message}</p>
                    </div>
                </div>
            )}

            <form noValidate>
                <FormSection title={t.incidentInfo}>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SearchableSelect
                                label={t.selectVehicle}
                                options={vehicleOptions}
                                value={incident.vehicleId}
                                onChange={handleVehicleChange}
                                placeholder={t.selectVehicleOptional}
                                error={errors.vehicleId}
                                required
                            />
                             <Input
                                label={t.incidentDate}
                                name="date"
                                type="date"
                                value={incident.date}
                                onChange={handleInputChange}
                                error={errors.date}
                                required
                            />
                        </div>
                        
                        <SearchableSelect
                            label={t.selectDriverOptional}
                            options={driverOptions}
                            value={incident.driverId || ''}
                            onChange={handleDriverChange}
                            placeholder={t.selectDriverOptional}
                            error={errors.driverId}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label={t.incidentType}
                                name="type"
                                value={incident.type}
                                onChange={handleInputChange}
                                options={incidentTypeOptions}
                                placeholder={t.specifyIncidentType}
                                error={errors.type}
                                required
                            />
                            {incident.type === 'Other' && (
                                <Input
                                    label={t.specifyIncidentType}
                                    name="otherType"
                                    value={otherType}
                                    onChange={(e) => setOtherType(e.target.value)}
                                    error={errors.otherType}
                                    required
                                />
                            )}
                        </div>
                        
                         {showAffectedPart && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Select
                                    label={t.affectedPart}
                                    name="affectedPart"
                                    value={incident.affectedPart}
                                    onChange={handleInputChange}
                                    options={affectedPartOptions}
                                    placeholder={t.specifyAffectedPart}
                                    error={errors.affectedPart}
                                    required
                                />
                                {incident.affectedPart === 'Other' && (
                                    <Input
                                        label={t.specifyAffectedPart}
                                        name="otherPart"
                                        value={otherPart}
                                        onChange={(e) => setOtherPart(e.target.value)}
                                        error={errors.otherPart}
                                        required
                                    />
                                )}
                            </div>
                        )}

                        <div>
                            <Textarea
                                label={t.description}
                                name="description"
                                value={incident.description}
                                onChange={handleInputChange}
                                error={errors.description}
                                rows={4}
                            />
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                        <i className="fas fa-times me-1.5"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane me-1.5"></i> {t.submitReport}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ReportIncidentForm;