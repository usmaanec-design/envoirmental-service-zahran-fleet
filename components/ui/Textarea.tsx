import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label: string;
    name: string;
    error?: string;
}

const Textarea: React.FC<TextareaProps> = ({ label, name, error, required, ...props }) => {
    return (
        <div>
            <label htmlFor={name} className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <textarea
                id={name}
                name={name}
                className={`block w-full px-4 py-2 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition duration-150 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200`}
                required={required}
                {...props}
            />
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
    );
};

export default Textarea;