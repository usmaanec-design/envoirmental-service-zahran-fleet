import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label: string;
    name: string;
    options: { value: string; label: string }[];
    placeholder?: string;
    error?: string;
}

const Select: React.FC<SelectProps> = ({ label, name, options, placeholder, error, required, ...props }) => {
    return (
        <div>
            {label && (
                <label htmlFor={name} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <select
                id={name}
                name={name}
                className={`block w-full h-11 px-3 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                required={required}
                {...props}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map((option, index) => (
                    <option key={`${option.value}-${index}`} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default Select;