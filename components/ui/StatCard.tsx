import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: string;
    color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'orange' | 'teal';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
    // Clean, professional matte colors without gradients
    const colorClasses = {
        blue: { 
            bg: 'bg-blue-50', 
            iconColor: 'text-blue-600',
            border: 'border-blue-200'
        },
        green: { 
            bg: 'bg-green-50', 
            iconColor: 'text-green-600',
            border: 'border-green-200'
        },
        yellow: { 
            bg: 'bg-yellow-50', 
            iconColor: 'text-yellow-600',
            border: 'border-yellow-200'
        },
        red: { 
            bg: 'bg-red-50', 
            iconColor: 'text-red-600',
            border: 'border-red-200'
        },
        purple: { 
            bg: 'bg-purple-50', 
            iconColor: 'text-purple-600',
            border: 'border-purple-200'
        },
        orange: { 
            bg: 'bg-orange-50', 
            iconColor: 'text-orange-600',
            border: 'border-orange-200'
        },
        teal: { 
            bg: 'bg-teal-50', 
            iconColor: 'text-teal-600',
            border: 'border-teal-200'
        }
    };

    const selectedColor = colorClasses[color];

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 flex items-center space-x-4 rtl:space-x-reverse border ${selectedColor.border} dark:border-gray-600 transition-all duration-200 hover:shadow-lg`}
             style={{
               boxShadow: '0px 5px 15px rgba(0,0,0,0.1)'
             }}>
            {/* Icon Container - Clean and Flat */}
            <div className={`flex items-center justify-center w-16 h-16 rounded-lg ${selectedColor.bg} dark:bg-gray-700 flex-shrink-0`}>
                <i className={`${icon} text-3xl font-bold ${selectedColor.iconColor} dark:text-gray-300`} 
                   style={{ 
                     display: 'block', 
                     lineHeight: '1',
                     fontFamily: '"Font Awesome 6 Free"',
                     fontWeight: 900,
                     fontSize: '1.875rem'
                   }}></i>
            </div>
            
            {/* Content */}
            <div className="flex-1">
                <p className="text-gray-600 dark:text-gray-400 font-medium text-sm mb-1">{title}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;