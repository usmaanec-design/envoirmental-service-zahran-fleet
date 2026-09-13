import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    name: string;
    options: { value: string; label: string; disabled?: boolean }[];
    placeholder?: string;
    error?: string;
}

const Select: React.FC<SelectProps> = ({ label, name, options, placeholder, error, required, className = '', ...props }) => {
    return (
        <div className="w-full">
            {label && (
                <label htmlFor={name} className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                id={name}
                name={name}
                className={`block w-full h-10 px-3 text-xs sm:text-sm border ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500 focus:border-orange-500'} rounded-lg shadow-sm focus:ring-2 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none cursor-pointer ${className}`}
                required={required}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(option => (
                    <option key={option.value} value={option.value} disabled={option.disabled}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
        </div>
    );
};

export default Select;