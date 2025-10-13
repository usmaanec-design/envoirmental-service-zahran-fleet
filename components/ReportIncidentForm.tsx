import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle, Incident } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import Select from './ui/Select';
import Textarea from './ui/Textarea';
import VehicleSelect from './ui/VehicleSelect';

interface ReportIncidentFormProps {
    lang: Language;
    vehicles: Vehicle[];
    onAddIncident: (incident: Omit<Incident, 'id'>) => Promise<void>;
}

const initialState: Omit<Incident, 'id'> = {
    vehicleId: '',
    type: 'Accident',
    date: new Date().toISOString().split('T')[0],
    description: '',
};

const ReportIncidentForm: React.FC<ReportIncidentFormProps> = ({ lang, vehicles, onAddIncident }) => {
    const [incident, setIncident] = useState(initialState);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const vehicleOptions = useMemo(() => vehicles.map(v => ({
        value: v.id,
        label: `${v.doorNumber} - ${v.plateNumber}`
    })), [vehicles]);

    const incidentTypeOptions = [
        { value: 'Accident', label: t.accident },
        { value: 'Not Working', label: t.notWorking },
    ];

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setIncident(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const resetForm = () => {
        setIncident(initialState);
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (!incident.vehicleId) newErrors.vehicleId = t.requiredField;
        if (!incident.date) newErrors.date = t.requiredField;
        if (!incident.description.trim()) newErrors.description = t.requiredField;
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (isSubmitting) return;
        setFormStatus(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                await onAddIncident(incident);
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

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-10">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.reportIncidentTitle}</h2>
            </header>

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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <VehicleSelect
                            label={t.selectVehicle}
                            vehicles={vehicles}
                            value={incident.vehicleId}
                            onSelect={(vehicleId) => {
                                setIncident(prev => ({ ...prev, vehicleId }));
                                if (errors.vehicleId) {
                                    setErrors(prev => ({ ...prev, vehicleId: '' }));
                                }
                            }}
                            placeholder={t.selectVehicleOptional}
                            searchHint={lang === 'ar' ? 'ابحث برقم الباب أو رقم اللوحة' : 'Search by door number or plate number'}
                            noResultsText={lang === 'ar' ? 'لا توجد مركبات' : 'No vehicles found'}
                            searchTerm={vehicleSearchTerm}
                            onSearchTermChange={setVehicleSearchTerm}
                            searchTermPlaceholder={lang === 'ar' ? 'ابحث عن مركبة...' : 'Search vehicle...'}
                            error={errors.vehicleId}
                        />
                         <Select
                            label={t.incidentType}
                            name="type"
                            value={incident.type}
                            onChange={handleInputChange}
                            options={incidentTypeOptions}
                            error={errors.type}
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
                        <div className="md:col-span-2">
                            <Textarea
                                label={t.description}
                                name="description"
                                value={incident.description}
                                onChange={handleInputChange}
                                error={errors.description}
                                required
                                rows={4}
                            />
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end gap-4 mt-8">
                    <Button type="button" variant="secondary" onClick={() => window.history.back()}>
                        <i className="fas fa-times me-2"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-paper-plane me-2"></i> {t.submitReport}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default ReportIncidentForm;