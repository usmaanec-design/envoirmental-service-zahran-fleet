import React, { useState, useMemo, useRef, useEffect } from 'react';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface SearchableSelectProps {
    label: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    error?: string;
    required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder,
    error,
    required,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => {
        return options.find(opt => opt.value === value) || null;
    }, [value, options]);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) {
            return options;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return options.filter(opt =>
            opt.label.toLowerCase().includes(lowercasedFilter)
        );
    }, [searchTerm, options]);

    const handleSelect = (option: Option) => {
        if (option.disabled) return;
        onChange(option.value);
        setIsOpen(false);
        setSearchTerm('');
    };
    
    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setIsOpen(false);
    }

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [wrapperRef]);
    
    const displayValue = selectedOption ? selectedOption.label : placeholder;

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative w-full h-11 px-4 text-left bg-white dark:bg-gray-700 border rounded-lg shadow-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                        error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                >
                    <span className={`block truncate ${selectedOption ? 'text-gray-900 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                        {displayValue}
                    </span>
                    <span className="absolute inset-y-0 end-0 flex items-center pe-2 pointer-events-none">
                        <i className="fas fa-chevron-down text-gray-400"></i>
                    </span>
                </button>
                 {selectedOption && (
                    <button type="button" onClick={handleClear} className="absolute inset-y-0 end-8 flex items-center pe-2" aria-label="Clear selection">
                       <i className="fas fa-times text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"></i>
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black dark:ring-white ring-opacity-5 dark:ring-opacity-20 overflow-auto focus:outline-none sm:text-sm">
                    <div className="p-2">
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full h-10 px-3 border-gray-300 dark:border-gray-600 dark:bg-gray-700 rounded-md focus:ring-orange-500 focus:border-orange-500 text-gray-900 dark:text-gray-200"
                        />
                    </div>
                    
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <div
                                key={option.value}
                                onClick={() => handleSelect(option)}
                                className={`cursor-pointer select-none relative py-2 ps-3 pe-9 ${option.disabled ? 'text-gray-400 bg-gray-100 dark:bg-gray-700' : 'text-gray-900 dark:text-gray-200 hover:bg-orange-100 dark:hover:bg-orange-900'}`}
                            >
                                <span className="block truncate">{option.label}</span>
                            </div>
                        ))
                    ) : (
                        <div className="cursor-default select-none relative py-2 px-4 text-gray-500">
                            No results found
                        </div>
                    )}
                </div>
            )}
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default SearchableSelect;
