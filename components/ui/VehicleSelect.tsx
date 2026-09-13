import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Vehicle } from '../../types';

interface VehicleSelectProps {
    label: string;
    vehicles: Vehicle[];
    value: string;
    onSelect: (vehicleId: string) => void;
    placeholder: string;
    searchHint: string;
    noResultsText: string;
    searchTerm: string;
    onSearchTermChange: (term: string) => void;
    searchTermPlaceholder: string;
    error?: string;
}

const VehicleSelect: React.FC<VehicleSelectProps> = ({
    label,
    vehicles,
    value,
    onSelect,
    placeholder,
    searchHint,
    noResultsText,
    searchTerm,
    onSearchTermChange,
    searchTermPlaceholder,
    error
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedValue = useMemo(() => {
        return vehicles.find(v => v.id === value) || null;
    }, [value, vehicles]);

    const filteredVehicles = useMemo(() => {
        if (!searchTerm.trim()) {
            return vehicles;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = vehicles.filter(vehicle =>
            vehicle.doorNumber.toLowerCase().includes(lowercasedFilter) ||
            vehicle.plateNumber.toLowerCase().includes(lowercasedFilter) ||
            vehicle.chassisNumber.toLowerCase().includes(lowercasedFilter)
        );
        return filtered;
    }, [searchTerm, vehicles]);

    const handleSelect = (vehicle: Vehicle) => {
        onSelect(vehicle.id);
        setIsOpen(false);
        onSearchTermChange('');
    };
    
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onSelect('');
        setIsOpen(false);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [wrapperRef]);
    
    const displayValue = selectedValue 
        ? `${selectedValue.doorNumber} - ${selectedValue.plateNumber} (${selectedValue.chassisNumber})`
        : placeholder;

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full h-11 px-4 text-left bg-white dark:bg-gray-700 border rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                    <span className={`block truncate ${selectedValue ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {displayValue}
                    </span>
                    <span className="absolute inset-y-0 end-0 flex items-center pe-2 pointer-events-none">
                        <i className="fas fa-chevron-down text-gray-400 dark:text-gray-400"></i>
                    </span>
                </button>
                 {selectedValue && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 end-8 flex items-center pe-2"
                        aria-label="Clear selection"
                    >
                       <i className="fas fa-times text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"></i>
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-20 overflow-auto focus:outline-none sm:text-sm">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder={searchTermPlaceholder}
                            value={searchTerm}
                            onChange={(e) => onSearchTermChange(e.target.value)}
                            className="w-full h-10 px-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-gray-200"
                        />
                    </div>
                    
                    {filteredVehicles.length > 0 ? (
                        filteredVehicles.map((vehicle) => (
                            <div
                                key={vehicle.id}
                                onClick={() => handleSelect(vehicle)}
                                className="cursor-pointer select-none relative py-2 ps-3 pe-9 text-gray-900 dark:text-gray-200 hover:bg-orange-100 dark:hover:bg-orange-900"
                            >
                                <span className="block truncate">
                                    {`${vehicle.doorNumber} - ${vehicle.plateNumber} (${vehicle.chassisNumber})`}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="cursor-default select-none relative py-3 px-4 text-gray-500 dark:text-gray-400 text-center">
                            <i className="fas fa-car mb-2 text-gray-400"></i>
                            <br />
                            {searchTerm.trim() ? 
                                'No vehicles match your search.' : 
                                'No available vehicles in this project.'
                            }
                            <br />
                            <small className="text-xs">Contact admin to add vehicles or check vehicle status.</small>
                        </div>
                    )}
                </div>
            )}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
             <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{searchHint}</p>
        </div>
    );
};

export default VehicleSelect;