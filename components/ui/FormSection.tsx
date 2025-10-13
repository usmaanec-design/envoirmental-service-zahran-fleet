

import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
    return (
        <div className="mb-10 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/50">
            <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
                {title}
            </h5>
            {children}
        </div>
    );
};

export default FormSection;