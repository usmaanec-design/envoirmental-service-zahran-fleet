import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Labour, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface EditLabourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (labour: Labour) => Promise<void>;
  labour: Labour | null;
  lang: Language;
}

const EditLabourModal: React.FC<EditLabourModalProps> = ({ isOpen, onClose, onSave, labour, lang }) => {
  const [formData, setFormData] = useState<Omit<Labour, 'id' | 'userId'>>({
    name: '',
    iqama: '',
    empId: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  useEffect(() => {
    if (labour) {
      setFormData({
        name: labour.name,
        iqama: labour.iqama,
        empId: labour.empId,
      });
      setErrors({});
      setApiError(null);
    }
  }, [labour]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'iqama') finalValue = value.replace(/\D/g, '').substring(0, 10);
    
    setFormData(prev => ({ ...prev, [name]: finalValue }));
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = t.requiredField;
    if (formData.iqama && !/^\d{10}$/.test(formData.iqama)) newErrors.iqama = t.iqamaInvalid;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !labour) return;
    setApiError(null);
    if (validateForm()) {
        setIsSubmitting(true);
        try {
            const updatedLabour: Labour = {
                ...labour,
                name: formData.name,
                iqama: formData.iqama,
                empId: formData.empId,
            };
            await onSave(updatedLabour);
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
  
  if (!labour) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.editLabourTitle}>
      <div className="p-6">
        {apiError && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{apiError}</p>}
        <form className="space-y-4">
            <Input label={t.personName} name="name" value={formData.name} onChange={handleInputChange} error={errors.name} required />
            <Input label={t.iqamaNumber} name="iqama" value={formData.iqama} onChange={handleInputChange} maxLength={10} error={errors.iqama} />
            <Input label={t.employeeId} name="empId" value={formData.empId} onChange={handleInputChange} />
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

export default EditLabourModal;
