import React, { useState, useMemo, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, ProjectOfficer } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';
import FormStatus from './ui/FormStatus';

interface AddProjectOfficersPageProps {
    lang: Language;
    projectOfficers: ProjectOfficer[];
    onUpdateOfficers: (officers: Omit<ProjectOfficer, 'id' | 'userId'>[]) => Promise<void>;
}

type OfficerData = Omit<ProjectOfficer, 'id' | 'userId'>;

const AddProjectOfficersPage: React.FC<AddProjectOfficersPageProps> = ({ lang, projectOfficers, onUpdateOfficers }) => {
    const [officers, setOfficers] = useState<OfficerData[]>([]);
    const [errors, setErrors] = useState<Array<Record<string, string> | undefined>>([]);
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    useEffect(() => {
        // Initialize with saved officers, or an empty array if none exist
        const officersFromProps = projectOfficers.map(({ id, userId, ...rest }) => rest);
        setOfficers(officersFromProps);
    }, [projectOfficers]);

    const handleOfficerChange = (index: number, field: keyof OfficerData, value: string) => {
        const updatedOfficers = [...officers];
        updatedOfficers[index] = { ...updatedOfficers[index], [field]: value };
        setOfficers(updatedOfficers);
        
        // Clear error for this field
        if (errors[index]?.[field]) {
            const newErrors = [...errors];
            delete newErrors[index]![field];
            if (Object.keys(newErrors[index]!).length === 0) {
                newErrors[index] = undefined;
            }
            setErrors(newErrors);
        }
    };

    const handleAddOfficer = () => {
        setOfficers([...officers, { role: '', name: '', iqama: '', mobile: '' }]);
    };

    const handleDeleteOfficer = (index: number) => {
        const updatedOfficers = officers.filter((_, i) => i !== index);
        setOfficers(updatedOfficers);
        const updatedErrors = errors.filter((_, i) => i !== index);
        setErrors(updatedErrors);
    };

    const validateForm = (): boolean => {
        const newErrors: Array<Record<string, string> | undefined> = [];
        let isValid = true;

        officers.forEach((officer, index) => {
            const officerErrors: Record<string, string> = {};
            const isRowEmpty = !officer.role.trim() && !officer.name.trim() && !officer.iqama.trim() && !officer.mobile.trim();

            if (!isRowEmpty) {
                if (!officer.role.trim()) {
                    officerErrors.role = t.requiredField;
                    isValid = false;
                }
                if (!officer.name.trim()) {
                    officerErrors.name = t.requiredField;
                    isValid = false;
                }
                if (officer.iqama && !/^\d{10}$/.test(officer.iqama)) {
                    officerErrors.iqama = t.iqamaInvalid;
                    isValid = false;
                }
                if (officer.mobile && !/^5\d{8}$/.test(officer.mobile)) {
                    officerErrors.mobile = t.mobileInvalid;
                    isValid = false;
                }
            }
            
            newErrors[index] = Object.keys(officerErrors).length > 0 ? officerErrors : undefined;
        });

        setErrors(newErrors);
        return isValid;
    };


    const handleSave = async () => {
        if (isSubmitting) return;
        setFormStatus(null);

        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const officersToSave = officers.filter(o => o.role.trim() || o.name.trim() || o.iqama.trim() || o.mobile.trim());
                await onUpdateOfficers(officersToSave);
                setFormStatus({ type: 'success', message: t.officersUpdateSuccess });
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                const message = error instanceof Error ? error.message : t.saveError;
                setFormStatus({ type: 'error', message });
            } finally {
                setIsSubmitting(false);
            }
        } else {
            setFormStatus({ type: 'error', message: t.saveError });
        }
    };

    const handleCancel = () => {
        setFormStatus(null);
        if (window.history.length > 1) {
            window.history.back();
        }
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.addProjectOfficers}</h2>
            </div>

            {formStatus && <FormStatus type={formStatus.type} message={formStatus.message} />}

            <form noValidate>
                {officers.map((officer, index) => (
                    <div key={index} className="mb-6 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 relative">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <Input
                                label={t.officerRole}
                                name={`role-${index}`}
                                value={officer.role}
                                onChange={(e) => handleOfficerChange(index, 'role', e.target.value)}
                                error={errors[index]?.role}
                                required
                            />
                            <Input
                                label={t.officerName}
                                name={`name-${index}`}
                                value={officer.name}
                                onChange={(e) => handleOfficerChange(index, 'name', e.target.value)}
                                error={errors[index]?.name}
                                required
                            />
                            <Input
                                label={t.officerIqama}
                                name={`iqama-${index}`}
                                value={officer.iqama}
                                onChange={(e) => handleOfficerChange(index, 'iqama', e.target.value.replace(/\D/g, '').substring(0, 10))}
                                error={errors[index]?.iqama}
                                maxLength={10}
                            />
                            <Input
                                label={t.officerMobile}
                                name={`mobile-${index}`}
                                value={officer.mobile}
                                onChange={(e) => handleOfficerChange(index, 'mobile', e.target.value.replace(/\D/g, '').substring(0, 9))}
                                error={errors[index]?.mobile}
                                maxLength={9}
                                placeholder="5XXXXXXXX"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => handleDeleteOfficer(index)}
                            className="absolute top-3 right-3 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors p-2"
                            title={t.deleteOfficerTitle}
                        >
                            <i className="fas fa-trash-alt"></i>
                        </button>
                    </div>
                ))}

                <div className="flex justify-between items-center mt-8">
                    <Button type="button" variant="info" onClick={handleAddOfficer}>
                        <i className="fas fa-plus me-2"></i> {t.addOfficer}
                    </Button>
                    <div className="flex gap-4">
                        <Button type="button" variant="secondary" onClick={handleCancel}>
                            <i className="fas fa-times me-2"></i> {t.cancel}
                        </Button>
                        <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                            {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-2"></i> {t.updateOfficers}</>}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default AddProjectOfficersPage;