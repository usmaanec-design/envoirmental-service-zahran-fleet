import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import VehicleSelect from './ui/VehicleSelect';
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
  const [formData, setFormData] = useState<Omit<Driver, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>({
    driverName: '',
    nationality: '',
    driverIqama: '',
    driverMobile: '',
    assignedVehicle: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicleSearchTerm, setVehicleSearchTerm] = useState('');
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  useEffect(() => {
    if (driver) {
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
    }
  }, [driver]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
  };
  
  const validate = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.driverName.trim()) newErrors.driverName = t.requiredField;
      if (!formData.driverIqama) {
          newErrors.driverIqama = t.requiredField;
      } else if (!/^\d{10}$/.test(formData.driverIqama)) {
          newErrors.driverIqama = t.iqamaInvalid;
      }
      // ID Number is optional in edit mode
      if (formData.driverMobile && !/^5\d{8}$/.test(formData.driverMobile)) {
          newErrors.driverMobile = t.mobileInvalid;
      }
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !driver) return;
    
    setError(null);
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
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to save changes.";
      console.error("Failed to update driver:", e);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!driver) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.editDriverTitle}>
      <div className="p-4">
        {error && <p className="bg-red-100 text-red-700 p-2 rounded-md text-sm mb-3">{error}</p>}
        <form className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label={t.driverName} 
              name="driverName" 
              value={formData.driverName} 
              onChange={handleInputChange} 
              error={errors.driverName} 
              required 
            />
            <Input 
              label={t.nationality} 
              name="nationality" 
              value={formData.nationality} 
              onChange={handleInputChange} 
              error={errors.nationality} 
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input 
              label={t.driverIqama} 
              name="driverIqama" 
              value={formData.driverIqama} 
              onChange={handleIqamaChange} 
              maxLength={10} 
              error={errors.driverIqama} 
              required 
            />
            <Input 
              label={lang === 'ar' ? 'رقم الهوية' : 'ID Number'}
              name="driverIdNumber"
              value={formData.driverIdNumber || ''}
              onChange={handleInputChange}
              error={errors.driverIdNumber}
              placeholder={lang === 'ar' ? 'أدخل رقم الهوية (اختياري)' : 'Enter ID Number (Optional)'}
            />
          </div>
          <Input 
            label={t.driverMobile} 
            name="driverMobile" 
            value={formData.driverMobile} 
            onChange={handleMobileChange} 
            maxLength={9} 
            error={errors.driverMobile} 
            placeholder="5XXXXXXXX" 
          />
          <VehicleSelect
            label={t.assignedVehicle}
            vehicles={vehicles.filter(v => {
              // Show vehicles that are:
              // 1. Available (no assigned driver)
              // 2. Currently assigned to this driver
              // 3. Active status
              const isAvailable = !v.assignedDriver || v.assignedDriver === driver?.id;
              const isActive = v.status === 'Active' || v.status === 'active';
              const isCurrentlyAssigned = v.id === formData.assignedVehicle;
              
              console.log('🚗 Vehicle:', v.doorNumber, {
                isAvailable,
                isActive,
                isCurrentlyAssigned,
                assignedDriver: v.assignedDriver,
                currentDriverId: driver?.id
              });
              
              return (isAvailable && isActive) || isCurrentlyAssigned;
            })}
            value={formData.assignedVehicle}
            onSelect={handleVehicleSelect}
            placeholder={t.selectVehicleOptional}
            searchHint={t.searchVehicleHint}
            noResultsText={t.noVehiclesFound}
            searchTerm={vehicleSearchTerm}
            onSearchTermChange={setVehicleSearchTerm}
            searchTermPlaceholder={t.vehicleSearchPlaceholder}
          />
        </form>
      </div>
      <footer className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex justify-end gap-2 rounded-b-xl">
        <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
        <Button variant="success" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.saveChanges}
        </Button>
      </footer>
    </Modal>
  );
};

export default EditDriverModal;