import React from 'react';

interface StatCardProps {
    title: string;
    value: number | string;
    icon: string;
    color: 'orange' | 'green' | 'yellow' | 'red' | 'blue';
    onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, onClick }) => {
    const colorClasses = {
        orange: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-600 dark:text-orange-400', border: 'border-orange-500 dark:border-orange-400', ring: 'hover:ring-2 hover:ring-orange-400/40' },
        green: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-600 dark:text-green-400', border: 'border-green-500 dark:border-green-400', ring: 'hover:ring-2 hover:ring-green-400/40' },
        yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500 dark:border-yellow-400', ring: 'hover:ring-2 hover:ring-yellow-400/40' },
        red: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-600 dark:text-red-400', border: 'border-red-500 dark:border-red-400', ring: 'hover:ring-2 hover:ring-red-400/40' },
        blue: { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500 dark:border-blue-400', ring: 'hover:ring-2 hover:ring-blue-400/40' },
    };

    const selectedColor = colorClasses[color] || colorClasses.blue;

    return (
        <div 
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex items-center justify-between border-s-4 ${selectedColor.border} ${
                onClick 
                    ? `cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] ${selectedColor.ring} transition-all duration-200 group select-none` 
                    : 'transition-transform transform hover:-translate-y-1'
            }`}
        >
            <div className="flex items-center space-x-4 rtl:space-x-reverse min-w-0">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${selectedColor.bg} ${selectedColor.text} ${onClick ? 'group-hover:scale-110 transition-transform duration-200' : ''}`}>
                    <i className={`fas ${icon} text-2xl`}></i>
                </div>
                <div className="min-w-0">
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium truncate">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
                </div>
            </div>
            {onClick && (
                <div className="text-gray-300 dark:text-gray-600 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors ps-2 flex-shrink-0">
                    <i className="fas fa-chevron-right rtl:rotate-180 transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform text-sm"></i>
                </div>
            )}
        </div>
    );
};

export default StatCard;