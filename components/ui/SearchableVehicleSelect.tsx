import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Vehicle } from '../../types';

interface SearchableVehicleSelectProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: { target: { name: string; value: string } }) => void;
    vehicles: Vehicle[];
    placeholder?: string;
    error?: string;
    required?: boolean;
}

const SearchableVehicleSelect: React.FC<SearchableVehicleSelectProps> = ({
    label,
    name,
    value,
    onChange,
    vehicles,
    placeholder = '',
    error,
    required = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Find selected vehicle
    const selectedVehicle = vehicles.find(v => v.id === value);
    
    // Filter vehicles based on search term (search by door number)
    const filteredVehicles = useMemo(() => {
        if (!searchTerm) return vehicles;
        return vehicles.filter(vehicle => 
            vehicle.doorNumber.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [vehicles, searchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') {
                setIsOpen(true);
                setHighlightedIndex(0);
                e.preventDefault();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredVehicles.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredVehicles[highlightedIndex]) {
                    handleSelect(filteredVehicles[highlightedIndex]);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                setSearchTerm('');
                setHighlightedIndex(-1);
                inputRef.current?.blur();
                break;
        }
    };

    const handleSelect = (vehicle: Vehicle) => {
        onChange({ target: { name, value: vehicle.id } });
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(-1);
    };

    const handleInputClick = () => {
        setIsOpen(true);
        setHighlightedIndex(-1);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setHighlightedIndex(-1);
        if (!isOpen) setIsOpen(true);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            
            <div className="relative">
                <div 
                    className={`w-full px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                        error 
                            ? 'border-red-500 focus:border-red-500' 
                            : 'border-gray-300 dark:border-gray-600 focus:border-blue-500'
                    } bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100`}
                    onClick={handleInputClick}
                >
                    {selectedVehicle ? (
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                            {selectedVehicle.doorNumber}
                        </span>
                    ) : (
                        <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
                    )}
                </div>

                {isOpen && (
                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="Search door number..."
                                value={searchTerm}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-blue-500"
                                autoFocus
                            />
                        </div>

                        {/* Options List */}
                        <div className="max-h-48 overflow-y-auto">
                            {filteredVehicles.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    No vehicles found
                                </div>
                            ) : (
                                filteredVehicles.map((vehicle, index) => (
                                    <div
                                        key={vehicle.id}
                                        className={`px-3 py-2 cursor-pointer transition-colors ${
                                            index === highlightedIndex
                                                ? 'bg-blue-100 dark:bg-blue-900/50'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-600'
                                        } ${
                                            vehicle.id === value
                                                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                                : 'text-gray-900 dark:text-gray-100'
                                        }`}
                                        onClick={() => handleSelect(vehicle)}
                                    >
                                        <div className="font-medium text-lg">
                                            {vehicle.doorNumber}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {vehicle.plateNumber} • {vehicle.model}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-red-500 text-xs mt-1">{error}</p>
            )}
        </div>
    );
};

export default SearchableVehicleSelect;