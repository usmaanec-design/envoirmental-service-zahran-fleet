import React from 'react';

interface PieChartProps {
    title: string;
    data: { label: string; value: number; color: string }[];
    onEdit?: (serviceType: string) => void;
    showLegend?: boolean;
    onToggleLegend?: () => void;
    translations: {
        vehicles: string;
        showDetails: string;
        hideDetails: string;
        total: string;
        editServiceTypeTitle: string;
    };
}

const PieChart: React.FC<PieChartProps> = ({ 
    title, 
    data, 
    onEdit,
    showLegend = true, 
    onToggleLegend,
    translations: t
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
        <div className="w-full h-full flex flex-col min-h-0">
            {/* Chart and Legend Container - Fixed Layout */}
            <div className="flex flex-col lg:flex-row items-start gap-4 h-full min-h-0">
                {/* Chart Section - Fixed Size */}
                <div className="flex flex-col items-center flex-shrink-0">
                    <div
                        className="w-48 h-48 rounded-full relative"
                        style={{
                            background: conicGradient,
                            backgroundColor: data.length === 1 ? data[0].color : '#e5e7eb'
                        }}
                        role="img"
                        aria-label={title}
                    >
                        {/* Center hole to make it a donut chart */}
                        <div className="absolute inset-8 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center">
                            <div className="text-center">
                                <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.total}</div>
                                <div className="text-xl font-bold text-gray-800 dark:text-gray-200">{total}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-500">{t.vehicles}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Toggle Button */}
                    {onToggleLegend && (
                        <button
                            onClick={onToggleLegend}
                            className="mt-3 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium rounded-md transition-colors duration-200 flex items-center gap-1"
                        >
                            <i className={`fas ${showLegend ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                            {showLegend ? t.hideDetails : t.showDetails}
                        </button>
                    )}
                </div>
                
                {/* Legend Section - Fixed Height with Visible Scrollbar */}
                {showLegend && (
                    <div className="flex-grow min-w-0 h-full overflow-hidden">
                        <div className="h-80 overflow-y-scroll service-types-scroll border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/20 p-2">
                            <div className="space-y-1">
                                {data.map(({ label, value, color }, index) => {
                                    if (value === 0) return null;
                                    return (
                                        <div key={`${label}-${index}-${value}`} className="flex items-center justify-between group bg-white dark:bg-gray-800 rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm border border-gray-100 dark:border-gray-700">
                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                <span 
                                                    className="w-3 h-3 rounded-full flex-shrink-0 border border-white dark:border-gray-800 shadow-sm" 
                                                    style={{ backgroundColor: color }}
                                                />
                                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-tight break-words" title={label}>
                                                    {label}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                <span className="text-xs font-bold text-white bg-orange-500 dark:bg-orange-600 px-2 py-0.5 rounded-full min-w-[35px] text-center shadow-sm">
                                                    {value}
                                                </span>
                                                {onEdit && (
                                                    <button 
                                                        onClick={() => onEdit(label)}
                                                        className="opacity-0 group-hover:opacity-100 transition-all duration-200 text-gray-400 hover:text-orange-500 dark:hover:text-orange-400 p-1 hover:bg-orange-50 dark:hover:bg-orange-900/30 rounded-md hover:scale-105"
                                                        title={`${t.editServiceTypeTitle}: ${label}`}
                                                    >
                                                        <i className="fas fa-pencil-alt text-xs"></i>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {/* Scroll indicator */}
                        <div className="text-center mt-2">
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                                <i className="fas fa-arrows-alt-v"></i>
                                <span>{data.length > 8 ? 'Scroll to see more types' : `${data.length} service types`}</span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PieChart;