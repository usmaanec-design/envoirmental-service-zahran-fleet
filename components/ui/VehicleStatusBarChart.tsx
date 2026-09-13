import React, { useRef } from 'react';

interface VehicleStatusData {
    projectName: string;
    active: number;
    breakdown: number;
    accident: number;
    total: number;
}

interface VehicleStatusBarChartProps {
    data: VehicleStatusData[];
    title: string;
    translations: {
        active: string;
        breakdown: string;
        accident: string;
        total: string;
    };
}

const VehicleStatusBarChart: React.FC<VehicleStatusBarChartProps> = ({ 
    data, 
    title,
    translations 
}) => {
    if (data.length === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
                No data available
            </div>
        );
    }

    // ref for the scrollable container
    const containerRef = useRef<HTMLDivElement | null>(null);
    return (
        <div className="w-full h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                <div className="text-right text-sm text-gray-600 dark:text-gray-400">
                    {translations.total}: {data.reduce((sum, item) => sum + item.total, 0)}
                </div>
            </div>
            
            {/* Legend */}
            <div className="flex justify-center items-center mb-4 gap-6 text-sm">
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-green-700 rounded mr-2"></div>
                    <span className="text-gray-700 dark:text-gray-300">{translations.active}</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-red-600 rounded mr-2"></div>
                    <span className="text-gray-700 dark:text-gray-300">{translations.accident}</span>
                </div>
                <div className="flex items-center">
                    <div className="w-4 h-4 bg-orange-600 rounded mr-2"></div>
                    <span className="text-gray-700 dark:text-gray-300">{translations.breakdown}</span>
                </div>
            </div>
            
            {/* Chart - fixed box with vertical scroll + up/down buttons */}
            <div className="relative">
                {/* Scroll buttons */}
                <div className="absolute right-0 top-0 flex flex-col gap-2 z-10">
                    <button
                        type="button"
                        aria-label="Scroll up"
                        className="w-10 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-200"
                        onClick={() => { const el = containerRef.current; if (el) el.scrollBy({ top: -160, behavior: 'smooth' }); }}
                    >
                        ▲
                    </button>
                    <button
                        type="button"
                        aria-label="Scroll down"
                        className="w-10 h-8 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-200"
                        onClick={() => { const el = containerRef.current; if (el) el.scrollBy({ top: 160, behavior: 'smooth' }); }}
                    >
                        ▼
                    </button>
                </div>

                {/* Scrollable container - fixed height */}
                <div
                    ref={containerRef}
                    className="overflow-y-auto h-96 space-y-3 pr-3 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
                >
                    {data.map((item, index) => (
                        <div key={index} className="h-20 flex flex-col justify-center">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">
                                    {item.projectName}
                                </span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[30px] text-right">
                                    {item.total}
                                </span>
                            </div>

                            <div className="flex w-full h-8 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden shadow-inner">
                                {/* Active Vehicles - Dark Green */}
                                {item.active > 0 && (
                                    <div
                                        className="bg-green-700 flex items-center justify-center text-white text-xs font-bold min-w-[24px] transition-all duration-300 hover:bg-green-800"
                                        style={{ width: `${Math.max((item.active / item.total) * 100, 8)}%` }}
                                        title={`Active: ${item.active}`}
                                    >
                                        {item.active}
                                    </div>
                                )}

                                {/* Breakdown Vehicles - Orange */}
                                {item.breakdown > 0 && (
                                    <div
                                        className="bg-orange-600 flex items-center justify-center text-white text-xs font-bold min-w-[24px] transition-all duration-300 hover:bg-orange-700"
                                        style={{ width: `${Math.max((item.breakdown / item.total) * 100, 8)}%` }}
                                        title={`Breakdown: ${item.breakdown}`}
                                    >
                                        {item.breakdown}
                                    </div>
                                )}

                                {/* Accident Vehicles - Red */}
                                {item.accident > 0 && (
                                    <div
                                        className="bg-red-600 flex items-center justify-center text-white text-xs font-bold min-w-[24px] transition-all duration-300 hover:bg-red-700"
                                        style={{ width: `${Math.max((item.accident / item.total) * 100, 8)}%` }}
                                        title={`Accident: ${item.accident}`}
                                    >
                                        {item.accident}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default VehicleStatusBarChart;