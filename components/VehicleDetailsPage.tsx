import React, { useMemo, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Vehicle, Driver } from '../types';
import Input from './ui/Input';
import Button from './ui/Button';

interface VehicleDetailsPageProps {
  lang: Language;
  vehicles: Vehicle[];
  drivers: Driver[];
  selectedVehicleId: string | null;
}

const DetailItem: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-200 sm:mt-0 sm:col-span-2">{value || 'N/A'}</dd>
  </div>
);

const VehicleDetailsPage: React.FC<VehicleDetailsPageProps> = ({ lang, vehicles, drivers, selectedVehicleId }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchedVehicle, setSearchedVehicle] = useState<Vehicle | null | undefined>(undefined);

    useEffect(() => {
        if (selectedVehicleId) {
            const vehicle = vehicles.find(v => v.id === selectedVehicleId);
            setSearchedVehicle(vehicle ?? null);
            setSearchTerm(vehicle?.doorNumber ?? '');
        } else {
            setSearchedVehicle(undefined);
            setSearchTerm('');
        }
    }, [selectedVehicleId, vehicles]);

    const handleSearch = () => {
        const foundVehicle = vehicles.find(v => v.doorNumber.toLowerCase() === searchTerm.toLowerCase().trim());
        setSearchedVehicle(foundVehicle || null);
    };

    const assignedDriver = useMemo(() => {
        if (!searchedVehicle) return null;
        return drivers.find(driver => driver.assignedVehicle === searchedVehicle.id) || null;
    }, [searchedVehicle, drivers]);

    const renderContent = () => {
        if (searchedVehicle === undefined) {
            return (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-info-circle text-4xl mb-4"></i>
                    <p className="text-lg">{t.noVehicleSelected}</p>
                </div>
            );
        }

        if (searchedVehicle === null) {
            return (
                <div className="text-center py-16 text-red-500">
                    <i className="fas fa-exclamation-triangle text-4xl mb-4"></i>
                    <p className="text-lg">{t.vehicleNotFound}</p>
                </div>
            );
        }
        
        return (
            <div className="space-y-8 mt-8">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b dark:border-gray-700">{t.vehicleInfo}</h3>
                    <dl>
                        <DetailItem label={t.doorNumber} value={searchedVehicle.doorNumber} />
                        <DetailItem label={t.plateNumber} value={searchedVehicle.plateNumber} />
                        <DetailItem label={t.chassisNumber} value={searchedVehicle.chassisNumber} />
                        <DetailItem label={t.manufacturer} value={searchedVehicle.manufacturer} />
                        <DetailItem label={t.make} value={searchedVehicle.make} />
                        <DetailItem label={t.year} value={searchedVehicle.year} />
                        <DetailItem label={t.purchaseDate} value={new Date(searchedVehicle.purchaseDate).toLocaleDateString('en-CA')} />
                        <DetailItem label={t.tareWeight} value={searchedVehicle.tareWeight ? `${searchedVehicle.tareWeight} KG` : 'N/A'} />
                        <DetailItem label={t.serviceType} value={searchedVehicle.serviceType} />
                        <DetailItem label={t.projectSite} value={searchedVehicle.projectSite} />
                    </dl>
                </div>

                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 pb-2 border-b dark:border-gray-700">{t.assignedDriver}</h3>
                    <dl>
                        <DetailItem
                            label={t.driverName}
                            value={
                                assignedDriver ? (
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <i className="fas fa-user-check text-green-500"></i>
                                        <span>{assignedDriver.driverName}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                                        <i className="fas fa-times-circle text-red-500"></i>
                                        <span className="text-gray-500 dark:text-gray-400 italic">{t.unassigned}</span>
                                    </div>
                                )
                            }
                        />
                         {assignedDriver && (
                            <>
                                <DetailItem label={t.driverIqama} value={assignedDriver.driverIqama} />
                                <DetailItem label={t.driverMobile} value={`+966 ${assignedDriver.driverMobile}`} />
                            </>
                        )}
                    </dl>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-4">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.vehicleDetailsTitle}</h2>
                 <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <div className="flex-grow">
                        <Input
                            name="search"
                            placeholder={t.searchByDoorNumber}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button variant="info" onClick={handleSearch} className="sm:min-w-[120px]">
                        <i className="fas fa-search me-2"></i> {t.search}
                    </Button>
                </div>
            </header>
            
            {renderContent()}
        </div>
    );
};

export default VehicleDetailsPage;