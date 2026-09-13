

import React from 'react';

interface BarChartProps {
    data: { label: string; value: number; color: string }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
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
            <div className="flex-grow flex items-end justify-center space-x-4 rtl:space-x-reverse border-b-2 border-gray-200 dark:border-gray-700 pb-4">
                {data.map(({ label, value, color }) => (
                    <div key={label} className="flex flex-col items-center justify-end group relative">
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-2 w-max px-2 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                            {label}: {value}
                        </div>
                        {/* Thin Bar */}
                        <div
                            className="w-8 rounded-t-md transition-all duration-300 ease-in-out hover:w-10 mb-2"
                            style={{ 
                                height: `${Math.max((value / maxValue) * 200, 10)}px`, 
                                backgroundColor: color,
                                minHeight: '10px'
                            }}
                        />
                        {/* Value on top of bar */}
                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                            {value}
                        </div>
                        {/* Title below bar */}
                        <div className="text-xs text-gray-600 dark:text-gray-400 text-center max-w-16 leading-tight">
                            {label}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BarChart;