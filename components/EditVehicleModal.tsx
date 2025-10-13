import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Vehicle, Language } from '../types';
import { TRANSLATIONS, SERVICE_TYPES } from '../constants';
import Select from './ui/Select';

interface EditVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicle: Vehicle) => Promise<void>;
  vehicle: Vehicle | null;
  lang: Language;
}

const EditVehicleModal: React.FC<EditVehicleModalProps> = ({ isOpen, onClose, onSave, vehicle, lang }) => {
  const [formData, setFormData] = useState<Omit<Vehicle, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>({
    doorNumber: '',
    plateNumber: '',
    chassisNumber: '',
    make: '',
    manufacturer: '',
    year: '',
    purchaseDate: '',
    tareWeight: '',
    serviceType: '',
    projectSite: '',
    status: 'Active',
  });
  const [customServiceType, setCustomServiceType] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalFormData, setOriginalFormData] = useState<any>(null);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const serviceTypeOptions = useMemo(() => {
    return SERVICE_TYPES.en.map((enType, index) => ({
        value: enType,
        label: lang === 'ar' ? SERVICE_TYPES.ar[index] : enType,
    }));
  }, [lang]);

  useEffect(() => {
    if (vehicle && isOpen) {
      const isPredefinedService = SERVICE_TYPES.en.includes(vehicle.serviceType);

      const newFormData = {
        doorNumber: vehicle.doorNumber,
        plateNumber: vehicle.plateNumber,
        chassisNumber: vehicle.chassisNumber,
        make: vehicle.make,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        purchaseDate: vehicle.purchaseDate,
        tareWeight: vehicle.tareWeight,
        serviceType: isPredefinedService ? vehicle.serviceType : 'Other',
        projectSite: vehicle.projectSite,
        status: vehicle.status,
      };

      setFormData(newFormData);
      setOriginalFormData(newFormData);
      setCustomServiceType(isPredefinedService ? '' : vehicle.serviceType);
      setError(null);
      setErrors({});
      setHasUnsavedChanges(false);
    }
  }, [vehicle, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'serviceType' && value !== 'Other') {
        setCustomServiceType('');
    }
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCustomServiceTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCustomServiceType(e.target.value);
      setHasUnsavedChanges(true);
      if (errors.customServiceType) {
          setErrors(prev => ({ ...prev, customServiceType: '' }));
      }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmClose = window.confirm(
        lang === 'ar' 
          ? 'لديك تغييرات غير محفوظة. هل تريد إغلاق النموذج بدون حفظ؟'
          : 'You have unsaved changes. Do you want to close without saving?'
      );
      if (confirmClose) {
        setHasUnsavedChanges(false);
        setError(null);
        setErrors({});
        onClose();
      }
    } else {
      setError(null);
      setErrors({});
      onClose();
    }
  };

  const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.doorNumber.trim()) newErrors.doorNumber = t.requiredField;
      if (!formData.chassisNumber.trim()) newErrors.chassisNumber = t.requiredField;
      
      if (formData.serviceType === 'Other' && !customServiceType.trim()) {
          newErrors.customServiceType = t.requiredField;
      } else if (!formData.serviceType) {
          newErrors.serviceType = t.requiredField;
      }
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !vehicle) return;

    setError(null);
    
    // Don't close modal if validation fails
    if (!validateForm()) {
        setError(t.saveError);
        return;
    }

    setIsSubmitting(true);
    try {
      const finalServiceType = formData.serviceType === 'Other' ? customServiceType : formData.serviceType;
      const updatedVehicle: Vehicle = {
        ...vehicle,
        ...formData,
        serviceType: finalServiceType,
      };
      
      await onSave(updatedVehicle);
      
      // Only close modal after successful save
      console.log('✅ Vehicle saved successfully');
      setHasUnsavedChanges(false);
      setError(null);
      setErrors({});
      onClose();
    } catch (e) {
      let message = "Failed to save changes.";
      if (e instanceof Error) {
        if (e.message === 'DOOR_NUMBER_EXISTS') {
            message = t.doorNumberExists;
            setErrors(prev => ({...prev, doorNumber: t.doorNumberExists }));
        } else {
            message = e.message;
        }
      }
      console.error("Failed to update vehicle:", e);
      setError(message);
      // Don't close modal on error - let user see error and try again
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.editVehicleTitle} preventAutoClose={hasUnsavedChanges}>
      <div className="p-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-200 dark:scrollbar-thumb-blue-600 dark:scrollbar-track-gray-700">
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm mb-4">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {lang === 'ar' ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes'}
          </div>
        )}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label={t.doorNumber} name="doorNumber" value={formData.doorNumber} onChange={handleInputChange} error={errors.doorNumber} required />
          <Input label={t.plateNumber} name="plateNumber" value={formData.plateNumber} onChange={handleInputChange} />
          <Input label={t.manufacturer} name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} />
          <Input label={t.make} name="make" value={formData.make} onChange={handleInputChange} />
          <Input label={t.year} name="year" type="number" value={formData.year} onChange={handleInputChange} />
          <Input label={t.purchaseDate} name="purchaseDate" type="date" value={formData.purchaseDate} onChange={handleInputChange} />
          <Input label={t.tareWeight} name="tareWeight" type="number" value={formData.tareWeight} onChange={handleInputChange} />
          <Select
            label={t.serviceType}
            name="serviceType"
            value={formData.serviceType}
            onChange={handleInputChange}
            options={serviceTypeOptions}
            error={errors.serviceType}
            required
          />
          {formData.serviceType === 'Other' && (
            <Input
              label={t.otherServiceType}
              name="customServiceType"
              value={customServiceType}
              onChange={handleCustomServiceTypeChange}
              error={errors.customServiceType}
              required
            />
          )}
          <Input label={t.projectSite} name="projectSite" value={formData.projectSite} onChange={handleInputChange} />
          <Input label={t.chassisNumber} name="chassisNumber" value={formData.chassisNumber} onChange={handleInputChange} error={errors.chassisNumber} required />
          <Select
            label="Vehicle Status"
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Accident', label: 'Accident' },
              { value: 'Not Working', label: 'Not Working' }
            ]}
            error={errors.status}
          />
        </form>
      </div>
      <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
        <Button variant="secondary" onClick={handleClose}>
          {lang === 'ar' ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button variant="success" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {lang === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              t.saveChanges
            )}
        </Button>
      </footer>
    </Modal>
  );
};

export default EditVehicleModal;