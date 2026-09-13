

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    name: string;
    error?: string;
    onClear?: () => void;
}

const Input: React.FC<InputProps> = ({ label, name, error, required, onClear, value, className = '', ...props }) => {
    const hasValue = value && String(value).length > 0;

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    id={name}
                    name={name}
                    className={`block w-full h-10 px-3.5 text-xs sm:text-sm ${onClear && hasValue ? 'pe-10' : ''} border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500'} rounded-lg shadow-sm focus:ring-2 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none ${className}`}
                    required={required}
                    value={value}
                    {...props}
                />
                {onClear && hasValue && (
                     <button
                        type="button"
                        onClick={onClear}
                        className="absolute inset-y-0 end-0 flex items-center pe-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                        aria-label="Clear search"
                    >
                        <i className="fas fa-times-circle text-xs"></i>
                    </button>
                )}
            </div>
            {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        </div>
    );
};

export default Input;