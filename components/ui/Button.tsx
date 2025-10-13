import React from 'react';

type ButtonVariant = 'success' | 'secondary' | 'info';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'success', children, className, disabled, ...props }) => {
    const baseClasses = "min-w-[140px] px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 ease-in-out transform focus:outline-none focus:ring-4 flex items-center justify-center";
    
    const variantClasses = {
        success: "bg-green-500 border-green-500 hover:bg-green-600 focus:ring-green-300",
        secondary: "bg-gray-500 border-gray-500 hover:bg-gray-600 focus:ring-gray-300",
        info: "bg-cyan-500 border-cyan-500 hover:bg-cyan-600 focus:ring-cyan-300",
    };

    const interactiveClasses = "hover:-translate-y-0.5 shadow-md hover:shadow-lg";
    const disabledClasses = "disabled:bg-gray-400 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none";

    return (
        <button
            className={`${baseClasses} ${variantClasses[variant]} ${!disabled ? interactiveClasses : ''} ${disabledClasses} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;