import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import type { ProjectOfficer, Language } from '../types';
import { TRANSLATIONS, PROJECT_OFFICER_ROLES } from '../constants';

interface EditProjectOfficerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (officer: ProjectOfficer) => Promise<void>;
  officer: ProjectOfficer | null;
  lang: Language;
}

const EditProjectOfficerModal: React.FC<EditProjectOfficerModalProps> = ({ isOpen, onClose, onSave, officer, lang }) => {
  const [formData, setFormData] = useState({
    role: '',
    name: '',
    iqama: '',
    mobile: '',
    customRole: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  useEffect(() => {
    if (officer) {
      const isPredefinedRole = PROJECT_OFFICER_ROLES.includes(officer.role);
      setFormData({
        role: isPredefinedRole ? officer.role : 'Other',
        name: officer.name,
        iqama: officer.iqama,
        mobile: officer.mobile,
        customRole: isPredefinedRole ? '' : officer.role,
      });
      setErrors({});
      setApiError(null);
    }
  }, [officer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'iqama') finalValue = value.replace(/\D/g, '').substring(0, 10);
    if (name === 'mobile') finalValue = value.replace(/\D/g, '').substring(0, 9);

    setFormData(prev => {
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
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t.requiredField;
    if (!formData.role.trim()) {
        newErrors.role = t.requiredField;
    } else if (formData.role === 'Other' && !formData.customRole.trim()) {
        newErrors.customRole = t.requiredField;
    }
    if (formData.iqama && !/^\d{10}$/.test(formData.iqama)) newErrors.iqama = t.iqamaInvalid;
    if (formData.mobile && !/^5\d{8}$/.test(formData.mobile)) newErrors.mobile = t.mobileInvalid;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !officer) return;
    setApiError(null);
    if (validateForm()) {
        setIsSubmitting(true);
        try {
            const finalRole = formData.role === 'Other' ? formData.customRole : formData.role;
            const updatedOfficer: ProjectOfficer = {
                ...officer,
                name: formData.name,
                iqama: formData.iqama,
                mobile: formData.mobile,
                role: finalRole,
            };
            await onSave(updatedOfficer);
            onClose();
        } catch (error) {
            const message = error instanceof Error ? error.message : t.saveError;
            setApiError(message);
        } finally {
            setIsSubmitting(false);
        }
    } else {
      setApiError(t.saveError);
    }
  };

  const projectOfficerRoleOptions = PROJECT_OFFICER_ROLES.map(role => ({
    value: role,
    label: t[`officerRole_${role.replace(/ /g, '_')}` as keyof typeof t] || role,
  }));
  
  if (!officer) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.editOfficerTitle}>
      <div className="p-6">
        {apiError && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{apiError}</p>}
        <form className="space-y-4">
            <Select
                label={t.officerRole}
                name="role"
                value={formData.role}
                onChange={handleInputChange}
                options={projectOfficerRoleOptions}
                error={errors.role}
                required
            />
            {formData.role === 'Other' && (
                <Input
                    label={t.officerRole}
                    name="customRole"
                    value={formData.customRole}
                    onChange={handleInputChange}
                    error={errors.customRole}
                    required
                />
            )}
            <Input label={t.officerName} name="name" value={formData.name} onChange={handleInputChange} error={errors.name} required />
            <Input label={t.officerIqama} name="iqama" value={formData.iqama} onChange={handleInputChange} maxLength={10} error={errors.iqama} />
            <Input label={t.officerMobile} name="mobile" value={formData.mobile} onChange={handleInputChange} maxLength={9} placeholder="5XXXXXXXX" error={errors.mobile} />
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

export default EditProjectOfficerModal;