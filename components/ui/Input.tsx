

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    name: string;
    error?: string;
    onClear?: () => void;
    className?: string;
    autoComplete?: string;
}

const Input: React.FC<InputProps> = ({ label, name, error, required, onClear, value, className, autoComplete, ...props }) => {
    const hasValue = value && String(value).length > 0;
    
    // Default styles vs custom styles
    const defaultStyles = `block w-full h-11 px-4 ${onClear && hasValue ? 'pe-10' : ''} border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500`;
    const inputStyles = className || defaultStyles;

    return (
        <div>
            {label && (
                <label htmlFor={name} className={`block font-medium mb-1 ${className ? 'text-white/90' : 'text-gray-700 dark:text-gray-300'}`}>
                    {label} {required && <span className="text-red-400">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    id={name}
                    name={name}
                    className={inputStyles}
                    required={required}
                    value={value}
                    autoComplete={autoComplete}
                    {...props}
                />
                {onClear && hasValue && (
                     <button
                        type="button"
                        onClick={onClear}
                        className={`absolute inset-y-0 end-0 flex items-center pe-3 focus:outline-none ${className ? 'text-white/60 hover:text-white/80' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                        aria-label="Clear search"
                    >
                        <i className="fas fa-times-circle"></i>
                    </button>
                )}
            </div>
            {error && <p className={`text-sm mt-1 ${className ? 'text-red-300' : 'text-red-500'}`}>{error}</p>}
        </div>
    );
};

export default Input;