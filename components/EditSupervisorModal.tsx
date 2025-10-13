
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Supervisor, Foreman, Language } from '../types';
import { TRANSLATIONS } from '../constants';
import FormSection from './ui/FormSection';

interface EditSupervisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (supervisor: Supervisor) => Promise<void>;
  supervisor: Supervisor | null;
  lang: Language;
}

type EditableSupervisor = Omit<Supervisor, 'id' | 'userId' | 'foremen'>;
type EditableForeman = Omit<Foreman, 'id'>;

const EditSupervisorModal: React.FC<EditSupervisorModalProps> = ({ isOpen, onClose, onSave, supervisor, lang }) => {
    const [supervisorData, setSupervisorData] = useState<EditableSupervisor>({ name: '', area: '', iqama: '', mobile: '' });
    const [foremen, setForemen] = useState<EditableForeman[]>([]);
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [apiError, setApiError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    
    useEffect(() => {
        if (supervisor) {
            setSupervisorData({
                name: supervisor.name,
                area: supervisor.area,
                iqama: supervisor.iqama,
                mobile: supervisor.mobile,
            });
            setForemen(supervisor.foremen.map(({ id, ...rest }) => rest));
            setErrors({});
            setApiError(null);
        }
    }, [supervisor]);

    const handleSupervisorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        let finalValue = value;

        if (name === 'iqama') finalValue = value.replace(/\D/g, '').substring(0, 10);
        if (name === 'mobile') finalValue = value.replace(/\D/g, '').substring(0, 9);
        
        setSupervisorData(prev => ({ ...prev, [name]: finalValue }));
        if (errors.supervisor?.[name]) {
            setErrors(prev => ({ ...prev, supervisor: { ...prev.supervisor, [name]: '' } }));
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
    
    const addForemanRow = () => {
        setForemen([...foremen, { name: '', totalLabour: 0 }]);
    };

    const removeForemanRow = (index: number) => {
        const newForemen = foremen.filter((_, i) => i !== index);
        setForemen(newForemen);
    };
    
    const validateForm = (): boolean => {
        const newErrors: Record<string, any> = { supervisor: {}, foremen: [] };
        let isValid = true;

        if (!supervisorData.name.trim()) { newErrors.supervisor.name = t.requiredField; isValid = false; }
        if (!supervisorData.iqama) { newErrors.supervisor.iqama = t.requiredField; isValid = false; }
        else if (!/^\d{10}$/.test(supervisorData.iqama)) { newErrors.supervisor.iqama = t.iqamaInvalid; isValid = false; }
        
        if (supervisorData.mobile && !/^5\d{8}$/.test(supervisorData.mobile)) { 
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
        if (isSubmitting || !supervisor) return;
        setApiError(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                const updatedSupervisor: Supervisor = {
                    ...supervisor,
                    ...supervisorData,
                    foremen: foremen.map((f, i) => ({
                        ...f,
                        // Preserve original ID if it exists, generate new one only for truly new foremen
                        id: f.id || supervisor.foremen[i]?.id || `foreman-${Date.now()}-${i}`
                    }))
                };
                await onSave(updatedSupervisor);
                onClose();
            } catch (error) {
                console.error('Error saving supervisor:', error);
                let message = t.saveError;
                
                // Handle specific Firebase errors
                if (error instanceof Error) {
                    if (error.message.includes('does not exist')) {
                        message = lang === 'ar' ? 'هذا المشرف لم يعد موجود. يرجى تحديث الصفحة.' : 'This supervisor no longer exists. Please refresh the page.';
                        // Auto-close modal after 3 seconds for non-existent supervisors
                        setTimeout(() => {
                            onClose();
                        }, 3000);
                    } else if (error.message.includes('No document to update')) {
                        message = lang === 'ar' ? 'المشرف غير موجود في قاعدة البيانات. يرجى تحديث الصفحة.' : 'Supervisor not found in database. Please refresh the page.';
                    } else if (error.message.includes('permission-denied')) {
                        message = lang === 'ar' ? 'ليس لديك صلاحية لتنفيذ هذا الإجراء' : 'Permission denied. Please check your access rights.';
                    } else if (error.message.includes('offline') || error.message.includes('network')) {
                        message = lang === 'ar' ? 'لا يوجد اتصال بالإنترنت' : 'No internet connection. Please check your network.';
                    } else if (error.message.includes('400') || error.message.includes('Bad Request')) {
                        message = lang === 'ar' ? 'خطأ في البيانات المرسلة. تحقق من صحة المعلومات.' : 'Invalid data. Please check all fields are filled correctly.';
                    } else if (error.message.includes('required')) {
                        message = lang === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields.';
                    } else {
                        message = error.message;
                    }
                }
                
                setApiError(message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    if (!supervisor) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.editSupervisorTitle}>
            <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-200 dark:scrollbar-thumb-blue-600 dark:scrollbar-track-gray-700">
                {apiError && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{apiError}</p>}
                <form noValidate className="space-y-6">
                    <FormSection title={t.supervisorInfo}>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Input label={t.supervisorName} name="name" value={supervisorData.name} onChange={handleSupervisorChange} error={errors.supervisor?.name} required />
                            <Input label={t.areaLocation} name="area" value={supervisorData.area} onChange={handleSupervisorChange} error={errors.supervisor?.area} />
                            <Input label={t.supervisorIqama} name="iqama" value={supervisorData.iqama} onChange={handleSupervisorChange} error={errors.supervisor?.iqama} maxLength={10} required />
                            <Input label={t.supervisorMobile} name="mobile" value={supervisorData.mobile} onChange={handleSupervisorChange} error={errors.supervisor?.mobile} maxLength={9} placeholder="5XXXXXXXX" />
                        </div>
                    </FormSection>
                    <FormSection title={t.foremenInfo}>
                         {foremen.map((foreman, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:mb-0 last:pb-0">
                                <Input label={t.foremanName} name="name" value={foreman.name} onChange={(e) => handleForemanChange(index, e)} error={errors.foremen?.[index]?.name} required />
                                <Input label={t.totalAssignedLabour} name="totalLabour" type="number" value={String(foreman.totalLabour)} onChange={(e) => handleForemanChange(index, e)} error={errors.foremen?.[index]?.totalLabour} required />
                                <div className="flex items-end h-full">
                                    <Button type="button" variant="secondary" onClick={() => removeForemanRow(index)} className="!min-w-0 !px-4 !py-2 bg-red-500 hover:bg-red-600 focus:ring-red-300">
                                        <i className="fas fa-trash"></i>
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="info" onClick={addForemanRow} className="mt-4">
                            <i className="fas fa-plus me-2"></i> {t.addForeman}
                        </Button>
                    </FormSection>
                </form>
            </div>
            <footer className="bg-gray-50 dark:bg-gray-700/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
                <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
                <Button variant="success" onClick={handleSave} disabled={isSubmitting}>
                    {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.saveChanges}
                </Button>
            </footer>
        </Modal>
    );
};

export default EditSupervisorModal;
