

import React from 'react';

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
    showLegendTooltips?: boolean;
    translations?: {
        vehicles?: string;
        total?: string;
    };
}

const BarChart: React.FC<BarChartProps> = ({ 
    data, 
    showLegendTooltips = false,
    translations = { vehicles: 'vehicles', total: 'Total' }
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1); // Use 1 to avoid division by zero

    if (data.length === 0) {
        return (
            <div className="h-full flex-grow flex items-center justify-center text-gray-500 dark:text-gray-400">
                No data to display
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="relative h-[350px] overflow-auto border-b-2 border-gray-200 dark:border-gray-700">
                <div className="absolute top-0 left-0 flex items-end min-w-max pb-2 h-full">
                    {data.map(({ label, value, color }) => (
                        <div key={label} className="flex-none w-8 h-full flex flex-col items-center justify-end group">
                            {/* Tooltip */}
                            <div className="absolute bottom-full mb-2 w-max px-3 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg">
                                <div className="font-semibold text-center">{label}</div>
                                <div className="text-center mt-1">
                                    <span className="font-bold text-blue-300 dark:text-blue-600">{translations.total}: {value}</span>
                                </div>
                                <div className="text-xs text-center text-gray-300 dark:text-gray-500 mt-1">{translations.vehicles}</div>
                            </div>
                            {/* Bar with Label inside */}
                            <div
                                className="w-full relative flex items-center justify-center transition-all duration-300 ease-in-out group"
                                style={{ 
                                    height: `${Math.max((value / maxValue) * 180, 30)}px`,
                                    backgroundColor: color 
                                }}
                            >
                                <div className="absolute inset-0 flex items-center justify-center p-1">
                                    <div 
                                        className="writing-mode-vertical transform rotate-180 text-white font-medium text-center max-h-full overflow-hidden"
                                        style={{ 
                                            writingMode: 'vertical-rl',
                                            fontSize: label.length > 20 ? '8px' : label.length > 15 ? '9px' : '10px',
                                        }}
                                        title={label} // Show full text on hover
                                    >
                                        {label.length > 25 ? `${label.substring(0, 22)}...` : label}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="mt-4 max-h-[100px] overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 min-w-max p-2">
                    {data.map(({ label, value, color }) => (
                        <div key={label} className="flex items-center group relative">
                            <span 
                                className="w-3 h-3 rounded-full me-2 flex-shrink-0 cursor-pointer" 
                                style={{ backgroundColor: color }}
                            >
                                {showLegendTooltips && (
                                    <span className="invisible group-hover:visible absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-lg whitespace-nowrap z-10">
                                        {value} {translations.vehicles}
                                    </span>
                                )}
                            </span>
                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate" title={label}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BarChart;