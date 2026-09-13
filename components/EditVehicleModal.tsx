import React, { useState, useEffect, useMemo } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Vehicle, Language } from '../types';
import { TRANSLATIONS, ARABIC_SERVICE_TYPES_FOR_EXPORT } from '../constants';
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
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const serviceTypeOptions = useMemo(() => {
    return ARABIC_SERVICE_TYPES_FOR_EXPORT.map(type => ({
        value: type,
        label: type,
    }));
  }, []);

  useEffect(() => {
    if (vehicle) {
      const serviceTypeInNewList = ARABIC_SERVICE_TYPES_FOR_EXPORT.includes(vehicle.serviceType);

      const newFormData = {
        doorNumber: vehicle.doorNumber,
        plateNumber: vehicle.plateNumber,
        chassisNumber: vehicle.chassisNumber,
        make: vehicle.make,
        manufacturer: vehicle.manufacturer,
        year: vehicle.year,
        purchaseDate: vehicle.purchaseDate,
        tareWeight: vehicle.tareWeight,
        serviceType: serviceTypeInNewList ? vehicle.serviceType : '',
        projectSite: vehicle.projectSite,
        status: vehicle.status,
      };

      setFormData(newFormData);
      setError(null);
      setErrors({});
    }
  }, [vehicle]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
        setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
      const newErrors: Record<string, string> = {};
      if (!formData.doorNumber.trim()) newErrors.doorNumber = t.requiredField;
      if (!formData.chassisNumber.trim()) newErrors.chassisNumber = t.requiredField;
      if (!formData.serviceType) newErrors.serviceType = t.requiredField;
      
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (isSubmitting || !vehicle) return;

    setError(null);
    if (!validateForm()) {
        setError(t.saveError);
        return;
    }

    setIsSubmitting(true);
    try {
      const updatedVehicle: Vehicle = {
        ...vehicle,
        ...formData,
      };
      await onSave(updatedVehicle);
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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.editVehicleTitle}>
      <div className="p-6 max-h-[60vh] overflow-y-auto">
        {error && <p className="bg-red-100 text-red-700 p-3 rounded-md text-sm mb-4">{error}</p>}
        <form className="space-y-4">
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
            placeholder={t.serviceType}
            required
          />
          <Input label={t.projectSite} name="projectSite" value={formData.projectSite} onChange={handleInputChange} />
          <Input label={t.chassisNumber} name="chassisNumber" value={formData.chassisNumber} onChange={handleInputChange} error={errors.chassisNumber} required />
        </form>
      </div>
      <footer className="bg-gray-50 px-6 py-4 flex justify-end gap-3 rounded-b-xl">
        <Button variant="secondary" onClick={onClose}>{t.cancel}</Button>
        <Button variant="success" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.saveChanges}
        </Button>
      </footer>
    </Modal>
  );
};

export default EditVehicleModal;