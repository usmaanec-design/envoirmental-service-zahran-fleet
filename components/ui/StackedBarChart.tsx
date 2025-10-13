import React from 'react';

interface StackedBarData {
    label: string;
    segments: { type: string; value: number; color: string }[];
    total: number;
}

interface StackedBarChartProps {
    data: StackedBarData[];
    title?: string;
    showTotal?: boolean;
    translations?: {
        total?: string;
        vehicles?: string;
    };
}

const StackedBarChart: React.FC<StackedBarChartProps> = ({ 
    data, 
    title,
    showTotal = true,
    translations = { total: 'Total', vehicles: 'vehicles' }
}) => {
    const maxTotal = Math.max(...data.map(d => d.total), 1);
    const overallTotal = data.reduce((sum, item) => sum + item.total, 0);
    
    // Get all unique vehicle types for legend
    const allTypes = Array.from(new Set(
        data.flatMap(item => item.segments.map(seg => seg.type))
    ));
    
    // Create legend with colors
    const legendItems = allTypes.map(type => {
        const segment = data.flatMap(item => item.segments).find(seg => seg.type === type);
        return {
            type,
            color: segment?.color || '#gray'
        };
    });

    // Calculate dynamic height based on number of projects
    const chartHeight = Math.max(300, data.length * 50 + 100);

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Header */}
            {(title || showTotal) && (
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    {title && (
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>
                    )}
                    {showTotal && (
                        <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 rounded-full text-sm font-medium">
                            {translations.total}: {overallTotal}
                        </div>
                    )}
                </div>
            )}

            {/* Chart Container - Scrollable */}
            <div className="flex-grow overflow-auto" style={{ maxHeight: '350px' }}>
                <div className="space-y-3 pr-2">
                    {data.map((item, index) => (
                        <div key={index} className="group">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[100px] text-right">
                                    {item.label}
                                </span>
                                <span className="text-sm font-bold text-gray-800 dark:text-gray-200 min-w-[35px] text-left ml-2">
                                    {item.total}
                                </span>
                            </div>
                            
                            {/* Stacked Bar */}
                            <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-md overflow-hidden mb-1">
                                <div 
                                    className="h-full flex rounded-md overflow-hidden"
                                    style={{ width: `${(item.total / maxTotal) * 100}%` }}
                                >
                                    {item.segments.map((segment, segIndex) => {
                                        const segmentWidth = item.total > 0 ? (segment.value / item.total) * 100 : 0;
                                        // Ensure minimum width for small segments to display numbers properly
                                        const minWidth = segment.value > 0 ? Math.max(segmentWidth, 15) : segmentWidth;
                                        return (
                                            <div
                                                key={segIndex}
                                                className="relative group/segment"
                                                style={{
                                                    width: `${minWidth}%`,
                                                    backgroundColor: segment.color,
                                                    minWidth: segment.value > 0 ? '40px' : '0px'
                                                }}
                                            >
                                                {/* Segment Tooltip */}
                                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-xs rounded-md opacity-0 group-hover/segment:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                                                    {segment.type}: {segment.value}
                                                </div>
                                                
                                                {/* Segment Value Display */}
                                                {segment.value > 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <span className="text-xs font-bold text-white drop-shadow-lg" style={{ 
                                                            textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                                            fontSize: '11px'
                                                        }}>
                                                            {segment.value}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Hover tooltip for entire bar */}
                                <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-20 shadow-lg">
                                    <div className="font-semibold">{item.label}</div>
                                    <div className="text-xs mt-1">
                                        {translations.total}: {item.total} {translations.vehicles}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default StackedBarChart;