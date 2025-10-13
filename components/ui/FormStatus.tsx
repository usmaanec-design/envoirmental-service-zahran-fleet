import React from 'react';

interface FormStatusProps {
    type: 'success' | 'error';
    message: string;
    className?: string;
    onAnimationEnd?: () => void;
}

const FormStatus: React.FC<FormStatusProps> = ({ type, message, className, onAnimationEnd }) => {
    const isSuccess = type === 'success';
    const baseClasses = `p-4 mb-6 rounded-md text-white`;
    const colorClasses = isSuccess ? 'bg-green-500' : 'bg-red-500';
    const icon = isSuccess ? 'fa-check-circle' : 'fa-exclamation-triangle';

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