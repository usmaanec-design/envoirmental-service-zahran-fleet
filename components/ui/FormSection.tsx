

import React from 'react';

interface FormSectionProps {
    title: string;
    children: React.ReactNode;
}

const FormSection: React.FC<FormSectionProps> = ({ title, children }) => {
    return (
        <div className="mb-6 p-4 sm:p-5 border border-gray-100 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-800/40">
            <h5 className="text-sm sm:text-base font-bold text-gray-800 dark:text-gray-200 mb-4 pb-2.5 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-orange-500 rounded-full inline-block"></span>
                {title}
            </h5>
            {children}
        </div>
    );
};

export default FormSection;