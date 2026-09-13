import React from 'react';

interface FormStatusProps {
    type: 'success' | 'error' | 'info';
    message: string;
    className?: string;
    onAnimationEnd?: () => void;
}

const FormStatus: React.FC<FormStatusProps> = ({ type, message, className, onAnimationEnd }) => {
    const styles = {
        success: {
            color: 'bg-green-500',
            icon: 'fa-check-circle',
        },
        error: {
            color: 'bg-red-500',
            icon: 'fa-exclamation-triangle',
        },
        info: {
            color: 'bg-orange-500',
            icon: 'fa-info-circle',
        },
    };

    const { color: colorClasses, icon } = styles[type];
    const baseClasses = `p-4 mb-6 rounded-md text-white`;

    return (
        <div
            className={`${baseClasses} ${colorClasses} ${className || ''}`}
            role="alert"
            onAnimationEnd={onAnimationEnd}
        >
            <div className="flex items-center">
                <i className={`fas ${icon} text-xl me-3`}></i>
                <p className="font-semibold">{message}</p>
            </div>
        </div>
    );
};

export default FormStatus;
