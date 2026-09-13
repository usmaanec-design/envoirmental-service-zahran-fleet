import React, { useState, useMemo, useEffect } from 'react';
import { TRANSLATIONS, PROJECT_OFFICER_ROLES } from '../constants';
import type { Language, Supervisor, Foreman, Labour, ProjectData, ProjectOfficer, Page } from '../types';
import FormSection from './ui/FormSection';
import Input from './ui/Input';
import Button from './ui/Button';
import FormStatus from './ui/FormStatus';
import Select from './ui/Select';

type MenpowerEntryData = Omit<Supervisor, 'id'|'userId'|'foremen'> | Omit<Foreman, 'id'|'labours'> | Omit<Labour, 'id'> | Omit<ProjectOfficer, 'id'|'userId'>;
type EntryType = 'supervisor' | 'foreman' | 'labour' | 'crewman' | 'campLabour' | 'projectOfficer';
type EditableForeman = Omit<Foreman, 'id'> & { id?: string };

interface AddMenpowerPageProps {
    lang: Language;
    onAddManPowerEntry: (type: EntryType, data: MenpowerEntryData, parentId?: string) => Promise<void>;
    projectData: ProjectData;
    supervisorToEdit?: Supervisor | null;
    onUpdateSupervisor?: (supervisor: Supervisor) => Promise<void>;
    onNavigate: (page: Page) => void;
}

const initialDetailsState = {
    name: '',
    empId: '',
    iqama: '',
    mobile: '',
    area: '',
    role: '',
    customRole: '',
};

const AddMenpowerPage: React.FC<AddMenpowerPageProps> = ({ lang, onAddManPowerEntry, projectData, supervisorToEdit, onUpdateSupervisor, onNavigate }) => {
    const [entryType, setEntryType] = useState<EntryType>('supervisor');
    const [details, setDetails] = useState(initialDetailsState);
    const [supervisorId, setSupervisorId] = useState('');
    const [foremanId, setForemanId] = useState('');
    const [foremen, setForemen] = useState<EditableForeman[]>([]); // For edit mode
    const [editingSupervisor, setEditingSupervisor] = useState<Supervisor | null>(null);
    
    const [errors, setErrors] = useState<Record<string, any>>({});
    const [formStatus, setFormStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const isEditMode = !!supervisorToEdit || !!editingSupervisor;

    const resetForm = () => {
        setDetails(initialDetailsState);
        setSupervisorId('');
        setForemanId('');
        setErrors({});
        setForemen([]);
    };
    
    // Check for editing supervisor data from localStorage
    useEffect(() => {
        const editingData = localStorage.getItem('editingSupervisor');
        if (editingData) {
            try {
                const supervisor = JSON.parse(editingData) as Supervisor;
                setEditingSupervisor(supervisor);
                setEntryType('supervisor');
                setDetails({
                    name: supervisor.name,
                    empId: supervisor.empId,
                    iqama: supervisor.iqama,
                    mobile: supervisor.mobile,
                    area: supervisor.area,
                    role: '',
                    customRole: '',
                });
                setForemen(supervisor.foremen?.map(f => ({...f, labours: f.labours || []})) || []);
            } catch (error) {
                console.error('Error parsing editing supervisor data:', error);
                localStorage.removeItem('editingSupervisor');
            }
        }
    }, []);
    
    useEffect(() => {
        const currentSupervisor = editingSupervisor || supervisorToEdit;
        if (isEditMode && currentSupervisor) {
            setEntryType('supervisor');
            setDetails({
                name: currentSupervisor.name,
                empId: currentSupervisor.empId,
                iqama: currentSupervisor.iqama,
                mobile: currentSupervisor.mobile,
                area: currentSupervisor.area,
                role: '', customRole: '',
            });
            setForemen(currentSupervisor.foremen?.map(f => ({...f, labours: f.labours || []})) || []);
        } else {
            resetForm();
        }
    }, [supervisorToEdit, editingSupervisor, isEditMode]);


    useEffect(() => {
        // Reset assignments when entry type changes, but not in edit mode
        if (!isEditMode) {
            setSupervisorId('');
            setForemanId('');
            setErrors({});
            setDetails(initialDetailsState);
        }
    }, [entryType, isEditMode]);

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'iqama') finalValue = value.replace(/\D/g, '').substring(0, 10);
        if (name === 'mobile') finalValue = value.replace(/\D/g, '').substring(0, 9);
        
        setDetails(prev => {
            const newState = { ...prev, [name]: finalValue };
            if (name === 'role' && value !== 'Other') {
                newState.customRole = '';
            }
            return newState;
        });
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };
    
    // --- Handlers for Edit Mode ---
     const handleForemanChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const newForemen = [...foremen];
        (newForemen[index] as any)[name] = value;
        setForemen(newForemen);
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
        setForemen(foremen.filter((_, i) => i !== index));
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
        const newErrors: Record<string, any> = {};
        if (!details.name.trim()) newErrors.name = t.requiredField;
        
        const isSupervisorType = entryType === 'supervisor' || isEditMode;

        if (isSupervisorType || entryType === 'projectOfficer') {
            if (details.iqama && !/^\d{10}$/.test(details.iqama)) { newErrors.iqama = t.iqamaInvalid; }
            // Mobile is optional
            // if (details.mobile && !/^5\d{8}$/.test(details.mobile)) { newErrors.mobile = t.mobileInvalid; }
        } else {
             if (details.iqama && !/^\d{10}$/.test(details.iqama)) { newErrors.iqama = t.iqamaInvalid; }
        }

        if (entryType === 'projectOfficer') {
            if (!details.role) {
                newErrors.role = t.requiredField;
            } else if (details.role === 'Other' && !details.customRole.trim()) {
                newErrors.customRole = t.requiredField;
            }
             if (details.mobile && !/^5\d{8}$/.test(details.mobile)) { newErrors.mobile = t.mobileInvalid; }
        }

        if (entryType === 'foreman' && !supervisorId) newErrors.supervisorId = t.requiredField;
        if (entryType === 'labour') {
            if (!supervisorId) newErrors.supervisorId = t.requiredField;
            if (!foremanId) newErrors.foremanId = t.requiredField;
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
                const currentSupervisor = editingSupervisor || supervisorToEdit;
                
                if (isEditMode && currentSupervisor && onUpdateSupervisor) {
                    const updatedSupervisor: Supervisor = {
                        ...currentSupervisor,
                        name: details.name,
                        empId: details.empId,
                        iqama: details.iqama,
                        mobile: details.mobile,
                        area: details.area,
                        foremen: foremen.map((f, fIndex) => ({
                            ...f,
                            id: f.id || `f-new-${Date.now()}-${fIndex}`,
                            labours: (f.labours || []).map((l, lIndex) => ({
                                ...l,
                                id: l.id || `l-new-${Date.now()}-${fIndex}-${lIndex}`
                            }))
                        }))
                    };
                    await onUpdateSupervisor(updatedSupervisor);
                    setFormStatus({ type: 'success', message: t.supervisorUpdateSuccess });
                    
                    // Clear localStorage if we were editing from there
                    if (editingSupervisor) {
                        localStorage.removeItem('editingSupervisor');
                        setEditingSupervisor(null);
                    }
                    
                    setTimeout(() => onNavigate('viewSupervisors'), 1500);
                } else {
                    const dataPayload: Partial<MenpowerEntryData> = { name: details.name, empId: details.empId, iqama: details.iqama };
                    if (entryType === 'supervisor') {
                        (dataPayload as Partial<Supervisor>).mobile = details.mobile;
                        (dataPayload as Partial<Supervisor>).area = details.area;
                    }
                    if (entryType === 'projectOfficer') {
                        (dataPayload as Partial<ProjectOfficer>).mobile = details.mobile;
                        (dataPayload as Partial<ProjectOfficer>).role = details.role === 'Other' ? details.customRole : details.role;
                    }

                    let parentId: string | undefined;
                    if (entryType === 'foreman') parentId = supervisorId;
                    if (entryType === 'labour') parentId = foremanId;

                    await onAddManPowerEntry(entryType, dataPayload as MenpowerEntryData, parentId);
                    setFormStatus({ type: 'success', message: t.entrySaveSuccess });
                    resetForm();
                    setTimeout(() => setFormStatus(null), 5000);
                }
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
    
    const entryTypeOptions = [
        { value: 'supervisor', label: t.supervisorName },
        { value: 'foreman', label: t.foreman },
        { value: 'labour', label: t.labour },
        { value: 'crewman', label: t.crewman },
        { value: 'campLabour', label: t.campLabour },
        { value: 'projectOfficer', label: t.projectOfficer },
    ];
    
    const projectOfficerRoleOptions = PROJECT_OFFICER_ROLES.map(role => ({
        value: role,
        label: t[`officerRole_${role.replace(/ /g, '_')}` as keyof typeof t] || role,
    }));
    
    const supervisorOptions = useMemo(() => projectData.supervisors.map(s => ({ value: s.id, label: `${s.name} (${s.empId || s.iqama})` })), [projectData.supervisors]);
    
    const foremanOptions = useMemo(() => {
        if (entryType !== 'labour' || !supervisorId) return [];
        const supervisor = projectData.supervisors.find(s => s.id === supervisorId);
        return supervisor?.foremen.map(f => ({
            value: f.id,
            label: `${f.name} (${f.empId || f.iqama})`
        })) || [];
    }, [supervisorId, entryType, projectData.supervisors]);

    const renderSimpleForm = () => (
        <>
            <FormSection title={t.entryDetails}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Select
                        label={t.resourceClassification}
                        name="entryType"
                        value={entryType}
                        onChange={(e) => setEntryType(e.target.value as EntryType)}
                        options={entryTypeOptions}
                        required
                        disabled={isEditMode}
                    />
                    {entryType === 'foreman' && (
                        <Select
                            label={t.assignToSupervisor}
                            name="supervisorId"
                            value={supervisorId}
                            onChange={(e) => setSupervisorId(e.target.value)}
                            options={supervisorOptions}
                            placeholder={t.selectSupervisor}
                            error={errors.supervisorId}
                            required
                        />
                    )}
                    {entryType === 'labour' && (
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Select
                                label={t.assignToSupervisor}
                                name="supervisorId"
                                value={supervisorId}
                                onChange={(e) => {
                                    setSupervisorId(e.target.value);
                                    setForemanId('');
                                }}
                                options={supervisorOptions}
                                placeholder={t.selectSupervisor}
                                error={errors.supervisorId}
                                required
                            />
                            <Select
                                label={t.assignToForeman}
                                name="foremanId"
                                value={foremanId}
                                onChange={(e) => setForemanId(e.target.value)}
                                options={foremanOptions}
                                placeholder={supervisorId ? t.selectForeman : t.selectSupervisorPrompt}
                                error={errors.foremanId}
                                disabled={!supervisorId}
                                required
                            />
                        </div>
                    )}
                </div>
            </FormSection>
            <FormSection title={t.personalInfo}>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input label={t.personName} name="name" value={details.name} onChange={handleDetailChange} error={errors.name} required />
                    <Input label={t.employeeId} name="empId" value={details.empId} onChange={handleDetailChange} />
                    <Input label={t.iqamaNumber} name="iqama" value={details.iqama} onChange={handleDetailChange} maxLength={10} error={errors.iqama} required={entryType === 'supervisor'} />
                     {(entryType === 'supervisor' || entryType === 'projectOfficer') && (
                        <Input label={t.officerMobile} name="mobile" value={details.mobile} onChange={handleDetailChange} maxLength={9} placeholder="5XXXXXXXX" error={errors.mobile}/>
                     )}
                     {entryType === 'supervisor' && ( <Input label={t.areaLocation} name="area" value={details.area} onChange={handleDetailChange}/> )}
                     {entryType === 'projectOfficer' && (
                         <>
                            <Select label={t.officerRole} name="role" value={details.role} onChange={handleDetailChange} options={projectOfficerRoleOptions} placeholder={t.officerRole} error={errors.role} required />
                            {details.role === 'Other' && ( <Input label={t.officerRole} name="customRole" value={details.customRole} onChange={handleDetailChange} error={errors.customRole} required /> )}
                         </>
                     )}
                </div>
            </FormSection>
        </>
    );

    const renderEditForm = () => (
        <>
             <FormSection title={t.supervisorInfo}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Input label={t.supervisorName} name="name" value={details.name} onChange={handleDetailChange} required />
                    <Input label={t.supervisorEmpId} name="empId" value={details.empId} onChange={handleDetailChange} />
                    <Input label={t.areaLocation} name="area" value={details.area} onChange={handleDetailChange} />
                    <Input label={t.supervisorIqama} name="iqama" value={details.iqama} onChange={handleDetailChange} maxLength={10} error={errors.iqama} />
                    <Input label={t.supervisorMobile} name="mobile" value={details.mobile} onChange={handleDetailChange} maxLength={9} placeholder="5XXXXXXXX" error={errors.mobile}/>
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
        </>
    );

    const handleCancel = () => {
        // Clear localStorage if we were editing from there
        if (editingSupervisor) {
            localStorage.removeItem('editingSupervisor');
            setEditingSupervisor(null);
        }
        onNavigate(isEditMode ? 'viewSupervisors' : 'menpowerOverview');
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{isEditMode ? t.editSupervisorTitle : t.addMenpowerTitle}</h2>
            </div>

            {formStatus && <FormStatus type={formStatus.type} message={formStatus.message} />}

            <form noValidate>
                {isEditMode ? renderEditForm() : renderSimpleForm()}

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <Button type="button" variant="secondary" onClick={handleCancel}>
                        <i className="fas fa-times me-1.5"></i> {t.cancel}
                    </Button>
                    <Button type="button" variant="success" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-save me-1.5"></i> {isEditMode ? t.saveChanges : t.saveEntry}</>}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AddMenpowerPage;