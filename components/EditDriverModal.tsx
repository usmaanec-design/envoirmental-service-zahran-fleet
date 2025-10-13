import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import SearchableVehicleSelect from './ui/SearchableVehicleSelect';
import type { Driver, Vehicle, Language } from '../types';
import { TRANSLATIONS } from '../constants';

interface EditDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driver: Driver) => Promise<void>;
  driver: Driver | null;
  vehicles: Vehicle[];
  lang: Language;
}

const EditDriverModal: React.FC<EditDriverModalProps> = ({ isOpen, onClose, onSave, driver, vehicles, lang }) => {
  const [formData, setFormData] = useState({
    driverName: '',
    nationality: '',
    driverIqama: '',
    driverMobile: '',
    assignedVehicle: '',
  });
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  useEffect(() => {
    if (driver && isOpen) {
      setFormData({
        driverName: driver.driverName,
        nationality: driver.nationality,
        driverIqama: driver.driverIqama,
        driverMobile: driver.driverMobile,
        assignedVehicle: driver.assignedVehicle,
      });
      setVehicleSearchTerm('');
      setError(null);
      setErrors({});
      setHasUnsavedChanges(false);
    }
  }, [driver, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
    if (errors[name]) {
        setErrors(prev => ({...prev, [name]: ''}));
    }
  };
  
  const handleIqamaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 10);
    handleInputChange({ ...e, target: { ...e.target, name: 'driverIqama', value } });
  };

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value.replace(/\D/g, '');
      if (value.length > 9) {
          value = value.substring(0, 9);
      }
      handleInputChange({ ...e, target: { ...e.target, name: 'driverMobile', value } });
  };

  const handleVehicleSelect = (vehicleId: string) => {
    setFormData(prev => ({ ...prev, assignedVehicle: vehicleId }));
    setHasUnsavedChanges(true);
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
  
  const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.driverName.trim()) newErrors.driverName = t.requiredField;
      if (!formData.driverIqama) {
          newErrors.driverIqama = t.requiredField;
      } else if (!/^\d{10}$/.test(formData.driverIqama)) {
          newErrors.driverIqama = t.iqamaInvalid;
      }
      if (formData.driverMobile && !/^5\d{8}$/.test(formData.driverMobile)) {
          newErrors.driverMobile = t.mobileInvalid;
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !driver) return;
    
    setError(null);
    
    // Don't close modal if validation fails
    if (!validate()) {
        setError(t.saveError);
        return;
    }

    setIsSubmitting(true);
    try {
      const updatedDriver: Driver = {
        ...driver,
        ...formData,
      };
      
      await onSave(updatedDriver);
      
      // Only close modal after successful save
      console.log('✅ Driver saved successfully');
      setHasUnsavedChanges(false);
      setError(null);
      setErrors({});
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save changes.";
      console.error("Failed to update driver:", e);
      setError(message);
      // Don't close modal on error - let user see error and try again
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!driver) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t.editDriverTitle} preventAutoClose={hasUnsavedChanges}>
      <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-gray-200 dark:scrollbar-thumb-blue-600 dark:scrollbar-track-gray-700">
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
        {hasUnsavedChanges && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 p-3 rounded-md text-sm mb-4">
            <i className="fas fa-exclamation-triangle mr-2"></i>
            {lang === 'ar' ? 'لديك تغييرات غير محفوظة' : 'You have unsaved changes'}
          </div>
        )}
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <Input label={t.driverName} name="driverName" value={formData.driverName} onChange={handleInputChange} error={errors.driverName} required />
          <Input label={t.nationality} name="nationality" value={formData.nationality} onChange={handleInputChange} error={errors.nationality} />
          <Input label={t.driverIqama} name="driverIqama" value={formData.driverIqama} onChange={handleIqamaChange} maxLength={10} error={errors.driverIqama} required />
          <Input label={t.driverMobile} name="driverMobile" value={formData.driverMobile} onChange={handleMobileChange} maxLength={9} error={errors.driverMobile} placeholder="5XXXXXXXX" />
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t.assignedVehicle}
            </label>
            <SearchableVehicleSelect
              label=""
              name="assignedVehicle"
              vehicles={vehicles}
              value={formData.assignedVehicle}
              onChange={(e) => handleVehicleSelect(e.target.value)}
              placeholder={t.selectVehicleOptional || "Select a vehicle (Optional)"}
            />
          </div>
        </form>
      </div>
      <footer className="bg-gray-50 dark:bg-gray-800/50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
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

export default EditDriverModal;