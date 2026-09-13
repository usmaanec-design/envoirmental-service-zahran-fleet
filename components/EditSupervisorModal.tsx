import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Supervisor, Foreman, Labour, Language } from '../types';
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
type EditableForeman = Omit<Foreman, 'id'> & { id?: string }; // Make ID optional for new foremen

const EditSupervisorModal: React.FC<EditSupervisorModalProps> = ({ isOpen, onClose, onSave, supervisor, lang }) => {
    const [supervisorData, setSupervisorData] = useState<EditableSupervisor>({ name: '', area: '', iqama: '', mobile: '', empId: '' });
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
                empId: supervisor.empId
            });
            // Ensure labours is always an array
            setForemen(supervisor.foremen.map(f => ({ ...f, labours: f.labours || [] })));
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
        (newForemen[index] as any)[name] = value;
        setForemen(newForemen);
        
        if (errors.foremen?.[index]?.[name]) {
            const newForemenErrors = [...(errors.foremen || [])];
            if (newForemenErrors[index]) {
                delete newForemenErrors[index][name];
            }
            setErrors(prev => ({ ...prev, foremen: newForemenErrors }));
        }
    };

    const handleLabourChange = (foremanIndex: number, labourIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newForemen = [...foremen];
        (newForemen[foremanIndex].labours[labourIndex] as any)[name] = value;
        setForemen(newForemen);
    };

    const addForemanRow = () => {
        setForemen([...foremen, { name: '', iqama: '', empId: '', labours: [] }]);
    };

    const removeForemanRow = (index: number) => {
        const newForemen = foremen.filter((_, i) => i !== index);
        setForemen(newForemen);
    };

    const addLabourRow = (foremanIndex: number) => {
        const newForemen = [...foremen];
        newForemen[foremanIndex].labours.push({ id: `new-l-${Date.now()}`, name: '', iqama: '', empId: '' });
        setForemen(newForemen);
    };

    const removeLabourRow = (foremanIndex: number, labourIndex: number) => {
        const newForemen = [...foremen];
        newForemen[foremanIndex].labours = newForemen[foremanIndex].labours.filter((_, i) => i !== labourIndex);
        setForemen(newForemen);
    };
    
    const validateForm = (): boolean => {
        // Simplified validation for brevity, can be expanded
        return true;
    };

    const handleSave = async () => {
        if (isSubmitting || !supervisor) return;
        setApiError(null);
        if (validateForm()) {
            setIsSubmitting(true);
            try {
                // Reconstruct supervisor object with original IDs for existing entities
                const updatedSupervisor: Supervisor = {
                    ...supervisor,
                    ...supervisorData,
                    foremen: foremen.map((f) => ({
                        ...f,
                        id: f.id || '', // Existing foremen will have an ID
                        labours: f.labours.map((l) => ({
                            ...l,
                            id: l.id || '', // Existing labours will have an ID
                        }))
                    }))
                };
                await onSave(updatedSupervisor);
                onClose();
            } catch (error) {
                const message = error instanceof Error ? error.message : t.saveError;
                setApiError(message);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    if (!supervisor) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t.editSupervisorTitle}>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
                {apiError && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{apiError}</p>}
                <form noValidate className="space-y-6">
                    <FormSection title={t.supervisorInfo}>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Input label={t.supervisorName} name="name" value={supervisorData.name} onChange={handleSupervisorChange} required />
                            <Input label={t.supervisorEmpId} name="empId" value={supervisorData.empId} onChange={handleSupervisorChange} />
                            <Input label={t.areaLocation} name="area" value={supervisorData.area} onChange={handleSupervisorChange} />
                            <Input label={t.supervisorIqama} name="iqama" value={supervisorData.iqama} onChange={handleSupervisorChange} maxLength={10} required />
                            <Input label={t.supervisorMobile} name="mobile" value={supervisorData.mobile} onChange={handleSupervisorChange} maxLength={9} placeholder="5XXXXXXXX" />
                        </div>
                    </FormSection>
                    <FormSection title={t.foremenInfo}>
                         {foremen.map((foreman, fIndex) => (
                             <div key={foreman.id || `new-f-${fIndex}`} className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-4">
                                <div className="grid grid-cols-12 gap-4 items-start pb-4 border-b border-gray-200 dark:border-gray-700">
                                    <div className="col-span-11 grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Input label={t.foremanName} name="name" value={foreman.name} onChange={(e) => handleForemanChange(fIndex, e)} required />
                                        <Input label={t.foremanIqama} name="iqama" value={foreman.iqama} onChange={(e) => handleForemanChange(fIndex, e)} />
                                        <Input label={t.foremanEmpId} name="empId" value={foreman.empId} onChange={(e) => handleForemanChange(fIndex, e)} />
                                    </div>
                                    <div className="col-span-1 flex items-end h-full">
                                         <Button type="button" variant="secondary" onClick={() => removeForemanRow(fIndex)} className="!min-w-0 !px-4 !py-2 bg-red-500 hover:bg-red-600 focus:ring-red-300">
                                            <i className="fas fa-trash"></i>
                                        </Button>
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <h6 className="font-semibold text-sm mb-2 text-gray-700 dark:text-gray-300">{t.labour} ({foreman.labours.length})</h6>
                                    {foreman.labours.map((labour, lIndex) => (
                                         <div key={labour.id || `new-l-${lIndex}`} className="grid grid-cols-12 gap-2 items-center mb-2">
                                            <div className="col-span-11 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                <Input name="name" placeholder={t.labourName} value={labour.name} onChange={e => handleLabourChange(fIndex, lIndex, e)} className="!h-9 text-sm" />
                                                <Input name="iqama" placeholder={t.labourIqama} value={labour.iqama} onChange={e => handleLabourChange(fIndex, lIndex, e)} className="!h-9 text-sm" />
                                                <Input name="empId" placeholder={t.labourEmpId} value={labour.empId} onChange={e => handleLabourChange(fIndex, lIndex, e)} className="!h-9 text-sm" />
                                            </div>
                                            <div className="col-span-1">
                                                <button type="button" onClick={() => removeLabourRow(fIndex, lIndex)} className="text-gray-400 hover:text-red-500 w-full"><i className="fas fa-minus-circle"></i></button>
                                            </div>
                                         </div>
                                    ))}
                                    <Button type="button" variant="info" onClick={() => addLabourRow(fIndex)} className="!px-3 !py-1 text-xs mt-2">
                                        <i className="fas fa-plus me-2"></i> {t.addLabour}
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
