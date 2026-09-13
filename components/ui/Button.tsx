import React from 'react';

type ButtonVariant = 'success' | 'secondary' | 'info' | 'danger' | 'primary';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
    variant = 'success', 
    size = 'md',
    children, 
    className = '', 
    disabled, 
    ...props 
}) => {
    const sizeClasses = {
        sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
        md: "px-4 py-2 text-xs sm:text-sm rounded-lg gap-2",
        lg: "px-5 py-2.5 text-sm sm:text-base rounded-lg gap-2.5",
    };

    const baseClasses = "font-semibold text-white transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 flex items-center justify-center shadow-sm cursor-pointer whitespace-nowrap";
    
    const variantClasses = {
        success: "bg-green-600 hover:bg-green-700 focus:ring-green-400 active:bg-green-800",
        secondary: "bg-gray-500 hover:bg-gray-600 focus:ring-gray-300 active:bg-gray-700",
        info: "bg-orange-500 hover:bg-orange-600 focus:ring-orange-400 active:bg-orange-700",
        danger: "bg-red-600 hover:bg-red-700 focus:ring-red-400 active:bg-red-800",
        primary: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-400 active:bg-blue-800",
    };

    const interactiveClasses = "hover:shadow hover:-translate-y-0.5 active:translate-y-0";
    const disabledClasses = "disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none";

    return (
        <button
            className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${!disabled ? interactiveClasses : ''} ${disabledClasses} ${className}`}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;