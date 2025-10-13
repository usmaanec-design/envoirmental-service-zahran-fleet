import React, { useState, useMemo, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Supervisor, Foreman, ProjectData } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import FormStatus from './ui/FormStatus';

interface AddSupervisorPageProps {
    lang: Language;
    onUpdateManPower: (supervisor: Omit<Supervisor, 'id' | 'userId'> & { foremen: Omit<Foreman, 'id'>[] }, campLabour: number, crewman: number) => Promise<void>;
    onUpdateProjectLabour: (campLabour: number, crewman: number) => Promise<void>;
    onAddSupervisor: (supervisor: Omit<Supervisor, 'id' | 'userId'> & { foremen: Omit<Foreman, 'id'>[] }) => Promise<void>;
    onUpdateSupervisor?: (supervisor: Supervisor) => Promise<void>;
    projectData: ProjectData;
    editingSupervisor?: Supervisor | null;
    onClearEditingSupervisor?: () => void;
}

const initialSupervisorState: Omit<Supervisor, 'id' | 'foremen' | 'userId'> = {
    name: '',
    area: '',
    iqama: '',
    mobile: '',
};

const initialForemanState: Omit<Foreman, 'id'> = { name: '', totalLabour: 0 };

const AddSupervisorPage: React.FC<AddSupervisorPageProps> = ({ 
    lang, 
    onUpdateManPower, 
    onUpdateProjectLabour, 
    onAddSupervisor,
    onUpdateSupervisor, 
    projectData,
    editingSupervisor,
    onClearEditingSupervisor
}) => {
    const [supervisor, setSupervisor] = useState(initialSupervisorState);
    const [foremen, setForemen] = useState<Omit<Foreman, 'id'>[]>([{ ...initialForemanState }]);
    const [projectLabour, setProjectLabour] = useState({ campLabour: 0, crewman: 0 });
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    useEffect(() => {
        if(projectData) {
            setProjectLabour({
                campLabour: projectData.campLabour,
                crewman: projectData.crewman
            });
        }
    }, [projectData]);

    // Effect to populate form when editing supervisor
    useEffect(() => {
        if (editingSupervisor) {
            setSupervisor({
                name: editingSupervisor.name,
                area: editingSupervisor.area,
                iqama: editingSupervisor.iqama,
                mobile: editingSupervisor.mobile,
            });
            if (editingSupervisor.foremen && editingSupervisor.foremen.length > 0) {
                setForemen(editingSupervisor.foremen.map(foreman => ({
                    name: foreman.name,
                    totalLabour: foreman.totalLabour
                })));
            }
        } else {
            // Reset form when not editing
            setSupervisor(initialSupervisorState);
            setForemen([{ ...initialForemanState }]);
        }
    }, [editingSupervisor]);

    const handleSupervisorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSupervisor(prev => ({ ...prev, [name]: value }));
        if (errors.supervisor?.[name]) {
            setErrors(prev => ({ ...prev, supervisor: { ...prev.supervisor, [name]: '' } }));
        }
    };

    const handleSupervisorIqamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 10);
        setSupervisor(prev => ({ ...prev, iqama: value }));
        if (errors.supervisor?.iqama) {
            setErrors(prev => ({ ...prev, supervisor: { ...prev.supervisor, iqama: '' } }));
        }
    };

    const handleSupervisorMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, '').substring(0, 9);
        setSupervisor(prev => ({ ...prev, mobile: value }));
        if (errors.supervisor?.mobile) {
            setErrors(prev => ({ ...prev, supervisor: { ...prev.supervisor, mobile: '' } }));
        }
    };

    const handleForemanChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newForemen = [...foremen];
        const val = name === 'totalLabour' ? (parseInt(value, 10) || 0) : value;
        (newForemen[index] as any)[name] = val;
        setForemen(newForemen);
        
        if (errors.foremen?.[index]?.[name]) {
            const newForemenErrors = [...(errors.foremen || [])];
            if (newForemenErrors[index]) {
                delete newForemenErrors[index][name];
            }
            setErrors(prev => ({ ...prev, foremen: newForemenErrors }));
        }
    };
    
    const handleProjectLabourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setProjectLabour(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
    };

    const addForemanRow = () => {
        setForemen([...foremen, { ...initialForemanState }]);
    };

    const removeForemanRow = (index: number) => {
        if (foremen.length <= 1) return;
        const newForemen = foremen.filter((_, i) => i !== index);
        setForemen(newForemen);
    };
    
    const resetForm = () => {
        setSupervisor(initialSupervisorState);
        setForemen([{ ...initialForemanState }]);
        // Don't reset project labour, as it should persist.
        setErrors({});
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, any> = { supervisor: {}, foremen: [] };
        let isValid = true;

        // Iqama is optional but must be 10 digits if provided
        if (supervisor.iqama && !/^\d{10}$/.test(supervisor.iqama)) {
            newErrors.supervisor.iqama = t.iqamaInvalid;
            isValid = false;
        }
        
        // Mobile is optional, but if provided must start with 5 and be 9 digits
        if (supervisor.mobile && !/^5\d{8}$/.test(supervisor.mobile)) { 
            newErrors.supervisor.mobile = t.mobileInvalid; 
            isValid = false; 
        }

        foremen.forEach((foreman, index) => {
            const foremanErrors: Record<string, string> = {};
            // Only validate if foreman name is provided (making foremen optional)
            if (foreman.name.trim()) {
                if (foreman.totalLabour <= 0) {
                    foremanErrors.totalLabour = t.requiredField;
                    isValid = false;
                }
            }
            if (Object.keys(foremanErrors).length > 0) {
                newErrors.foremen[index] = foremanErrors;
            }
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
                const supervisorData = {
                    ...supervisor,
                    // Filter out empty foremen (only include foremen with names)
                    foremen: foremen.filter(f => f.name.trim()),
                };
                
                if (editingSupervisor && onUpdateSupervisor) {
                    // Update existing supervisor
                    const updatedSupervisor: Supervisor = {
                        ...supervisorData,
                        id: editingSupervisor.id,
                        userId: editingSupervisor.userId,
                        foremen: supervisorData.foremen.map((foreman, index) => ({
                            ...foreman,
                            id: editingSupervisor.foremen?.[index]?.id || `${editingSupervisor.id}_foreman_${index}`
                        }))
                    };
                    await onUpdateSupervisor(updatedSupervisor);
                    setFormStatus({ type: 'success', message: 'Supervisor updated successfully!' });
                    
                    // Clear editing state and go back
                    if (onClearEditingSupervisor) {
                        onClearEditingSupervisor();
                    }
                } else {
                    // Add new supervisor
                    await onAddSupervisor(supervisorData);
                    setFormStatus({ type: 'success', message: t.supervisorSaveSuccess });
                    resetForm();
                }
                
                setTimeout(() => setFormStatus(null), 5000);
            } catch (error) {
                const message = error instanceof Error ? error.message : t.saveError;
                setFormStatus({ type: 'error', message });
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const handleSaveProjectLabour = async () => {
        if (isSubmitting) return;
        setFormStatus(null);
        setIsSubmitting(true);
        try {
            await onUpdateProjectLabour(projectLabour.campLabour, projectLabour.crewman);
            setFormStatus({ type: 'success', message: 'Project labour updated successfully!' });
            setTimeout(() => setFormStatus(null), 5000);
        } catch (error) {
            const message = error instanceof Error ? error.message : t.saveError;
            setFormStatus({ type: 'error', message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-10">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {editingSupervisor ? 'Edit Supervisor' : t.addSupervisorTitle}
                </h2>
            </header>

            {formStatus && <FormStatus type={formStatus.type} message={formStatus.message} />}

            <form noValidate>
                 <FormSection title={t.projectLevelLabour}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label={t.campLabour} name="campLabour" type="number" value={String(projectLabour.campLabour)} onChange={handleProjectLabourChange} />
                        <Input label={t.crewman} name="crewman" type="number" value={String(projectLabour.crewman)} onChange={handleProjectLabourChange} />
                    </div>
                    <div className="flex justify-end mt-4">
                        <Button type="button" variant="info" onClick={handleSaveProjectLabour} disabled={isSubmitting}>
                            {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-2"></i> Save Project Labour</>}
                        </Button>
                    </div>
                </FormSection>

                <FormSection title={t.supervisorInfo}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input label={t.supervisorName} name="name" value={supervisor.name} onChange={handleSupervisorChange} error={errors.supervisor?.name} />
                        <Input label={t.areaLocation} name="area" value={supervisor.area} onChange={handleSupervisorChange} error={errors.supervisor?.area} />
                        <Input label={t.supervisorIqama} name="iqama" value={supervisor.iqama} onChange={handleSupervisorIqamaChange} error={errors.supervisor?.iqama} maxLength={10} />
                        <Input label={t.supervisorMobile} name="mobile" value={supervisor.mobile} onChange={handleSupervisorMobileChange} error={errors.supervisor?.mobile} maxLength={9} placeholder="5XXXXXXXX" />
                    </div>
                </FormSection>
                
                <FormSection title={t.foremenInfo}>
                    {foremen.map((foreman, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:mb-0 last:pb-0">
                           <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Input label={t.foremanName} name="name" value={foreman.name} onChange={(e) => handleForemanChange(index, e)} error={errors.foremen?.[index]?.name} />
                                <Input label={t.totalAssignedLabour} name="totalLabour" type="number" value={String(foreman.totalLabour)} onChange={(e) => handleForemanChange(index, e)} error={errors.foremen?.[index]?.totalLabour} />
                           </div>
                            <div className="flex items-end h-full">
                                <Button type="button" variant="secondary" onClick={() => removeForemanRow(index)} disabled={foremen.length <= 1} className="!min-w-0 !px-4 !py-2 bg-red-500 hover:bg-red-600 focus:ring-red-300 disabled:bg-gray-300 dark:disabled:bg-gray-600">
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </div>
                        </div>
                    ))}
                     <Button type="button" variant="info" onClick={addForemanRow} className="mt-4">
                        <i className="fas fa-plus me-2"></i> {t.addForeman}
                    </Button>
                </FormSection>

                <div className="flex justify-end gap-4 mt-8">
                    <Button type="button" variant="secondary" onClick={() => {
                        if (editingSupervisor && onClearEditingSupervisor) {
                            onClearEditingSupervisor();
                            window.history.back();
                        } else {
                            window.history.back();
                        }
                    }}>
                        <i className="fas fa-times me-2"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-2"></i> {editingSupervisor ? 'Update Supervisor' : t.saveSupervisor}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddSupervisorPage;
