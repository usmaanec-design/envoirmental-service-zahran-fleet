

import React from 'react';

interface PieChartProps {
    title: string;
    data: { label: string; value: number; color: string }[];
    showLegend?: boolean;
    onToggleLegend?: () => void;
    translations?: {
        vehicles?: string;
        showDetails?: string;
        hideDetails?: string;
        total?: string;
    };
}

const PieChart: React.FC<PieChartProps> = ({ 
    title, 
    data, 
    showLegend = true, 
    onToggleLegend,
    translations = {
        vehicles: 'vehicles',
        showDetails: 'Show Details',
        hideDetails: 'Hide Details',
        total: 'Total'
    }
}) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    const gradientParts = data.reduce((acc, item, index) => {
        const start = total > 0 ? (data.slice(0, index).reduce((sum, i) => sum + i.value, 0) / total) * 360 : 0;
        const end = total > 0 ? start + (item.value / total) * 360 : 0;
        acc.push(`${item.color} ${start}deg ${end}deg`);
        return acc;
    }, [] as string[]);
    
    const conicGradient = `conic-gradient(${gradientParts.join(', ')})`;

    return (
        <div className="h-full flex flex-col">
            {/* Chart and Toggle Button */}
            <div className="flex flex-col md:flex-row items-start justify-start gap-6 flex-grow">
                <div className="flex flex-col items-center">
                    <div
                        className="w-48 h-48 rounded-full flex-shrink-0 relative"
                        style={{ background: conicGradient }}
                        role="img"
                        aria-label={title}
                    >
                        {/* Total count overlay */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg border border-gray-200 dark:border-gray-600">
                                <div className="text-center">
                                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{translations.total}</div>
                                    <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{total}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-500">{translations.vehicles}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Toggle Button */}
                    {onToggleLegend && (
                        <button
                            onClick={onToggleLegend}
                            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                        >
                            <i className={`fas ${showLegend ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                            {showLegend ? translations.hideDetails : translations.showDetails}
                        </button>
                    )}
                </div>
                
                {/* Legend */}
                {showLegend && (
                    <div className="space-y-2 mt-2 max-h-80 overflow-y-auto">
                        {data.map(({ label, value, color }, index) => (
                            <div key={`${label}-${index}-${value}`} className="flex items-center group relative">
                                <span 
                                    className="w-3 h-3 rounded-full me-2 cursor-pointer relative" 
                                    style={{ backgroundColor: color }}
                                >
                                    <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
                                        {value} {translations.vehicles}
                                    </span>
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{label}:</span>
                                <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 ms-1">{value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PieChart;