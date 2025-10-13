import React, { useState, useMemo, useRef, useEffect } from 'react';

type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: keyof T | 'actions';
  header: string;
  sortable?: boolean;
  allowWrap?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  initialSortKey?: keyof T;
  initialSortDirection?: SortDirection;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (newSelectedIds: string[]) => void;
  rowClassName?: (item: T) => string;
}

const SortIcon: React.FC<{ direction: SortDirection | null }> = ({ direction }) => {
    if (!direction) return <i className="fas fa-sort text-gray-400 dark:text-gray-500 ms-2 opacity-50 group-hover:opacity-100 transition-opacity"></i>;
    return direction === 'asc' ? <i className="fas fa-sort-up text-blue-500 ms-2"></i> : <i className="fas fa-sort-down text-blue-500 ms-2"></i>;
};

function Table<T extends { id: string }>({
    columns,
    data,
    initialSortKey,
    initialSortDirection = 'asc',
    selectable = false,
    selectedIds = [],
    onSelectionChange,
    rowClassName
}: TableProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey || null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);
    
    // Refs for syncing scroll positions
    const tableRef = useRef<HTMLDivElement>(null);
    const horizontalScrollRef = useRef<HTMLDivElement>(null);
    const scrollContentRef = useRef<HTMLDivElement>(null);

    // Sync horizontal scroll between table and frozen scrollbar
    const syncHorizontalScroll = (source: 'table' | 'scrollbar') => {
        if (!tableRef.current || !horizontalScrollRef.current) return;
        
        if (source === 'scrollbar') {
            const scrollLeft = horizontalScrollRef.current.scrollLeft;
            const tableContainer = tableRef.current;
            
            // Use scrollLeft instead of transform for better RTL support
            tableContainer.scrollLeft = scrollLeft;
        } else if (source === 'table') {
            const tableScrollLeft = tableRef.current.scrollLeft;
            horizontalScrollRef.current.scrollLeft = tableScrollLeft;
        }
    };

    // Update scroll content width to match table width
    useEffect(() => {
        const updateScrollWidth = () => {
            if (!tableRef.current || !scrollContentRef.current) return;
            const table = tableRef.current.querySelector('table') as HTMLTableElement;
            if (table) {
                const tableWidth = table.scrollWidth;
                scrollContentRef.current.style.width = `${tableWidth}px`;
            }
        };

        // Add scroll listener to table container
        const tableContainer = tableRef.current;
        const handleTableScroll = () => syncHorizontalScroll('table');
        
        if (tableContainer) {
            tableContainer.addEventListener('scroll', handleTableScroll);
        }

        updateScrollWidth();
        window.addEventListener('resize', updateScrollWidth);
        
        return () => {
            window.removeEventListener('resize', updateScrollWidth);
            if (tableContainer) {
                tableContainer.removeEventListener('scroll', handleTableScroll);
            }
        };
    }, [data]);

    const handleSort = (columnKey: keyof T) => {
        if (sortKey === columnKey) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(columnKey);
            setSortDirection('asc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        
        return [...data].sort((a, b) => {
            const aVal = a[sortKey];
            const bVal = b[sortKey];
            
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            
            let comparison = 0;
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                comparison = aVal.localeCompare(bVal);
            } else if (typeof aVal === 'number' && typeof bVal === 'number') {
                comparison = aVal - bVal;
            } else {
                comparison = String(aVal).localeCompare(String(bVal));
            }
            
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [data, sortKey, sortDirection]);

    const handleSelectAll = (checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            onSelectionChange(data.map(item => item.id));
        } else {
            onSelectionChange([]);
        }
    };

    const handleSelectItem = (itemId: string, checked: boolean) => {
        if (!onSelectionChange) return;
        if (checked) {
            onSelectionChange([...selectedIds, itemId]);
        } else {
            onSelectionChange(selectedIds.filter(id => id !== itemId));
        }
    };

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 w-full">
            {/* Main table content with horizontal and vertical scroll */}
            <div 
                className="scrollbar-thin table-scroll-container w-full"
                ref={tableRef}
                style={{ 
                    overflowX: 'auto', 
                    overflowY: 'auto', 
                    maxHeight: '70vh',
                    width: '100%'
                }}
            >
                <table className="w-full divide-y divide-gray-200 dark:divide-gray-700" style={{ width: '100%', minWidth: '100%' }}>
                    <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0 z-10">
                        <tr>
                            {selectable && (
                                <th scope="col" className="p-4">
                                    <div className="flex items-center">
                                        <input
                                            id="checkbox-all"
                                            type="checkbox"
                                            className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                            checked={isAllSelected}
                                            ref={el => el && (el.indeterminate = isIndeterminate)}
                                            onChange={(e) => handleSelectAll(e.target.checked)}
                                        />
                                    </div>
                                </th>
                            )}
                            {columns.map((col, index) => (
                                <th
                                    key={String(col.key)}
                                    scope="col"
                                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider ${
                                        col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 group select-none' : ''
                                    }`}
                                    style={{ width: `${100 / columns.length}%` }}
                                    onClick={() => col.sortable && col.key !== 'actions' && handleSort(col.key as keyof T)}
                                >
                                    <div className="flex items-center">
                                        {col.header}
                                        {col.sortable ? (
                                            <SortIcon direction={sortKey === col.key ? sortDirection : null} />
                                        ) : null}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {sortedData.map((item, index) => {
                            const customRowClass = rowClassName ? rowClassName(item) : '';
                            return (
                            <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${customRowClass}`}>
                                 {selectable && (
                                    <td className="p-4">
                                        <div className="flex items-center">
                                            <input
                                                id={`checkbox-${item.id}`}
                                                type="checkbox"
                                                className="h-4 w-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                                            />
                                        </div>
                                    </td>
                                )}
                                {columns.map((col) => (
                                    <td
                                        key={String(col.key)}
                                        className={`px-6 py-4 text-sm text-gray-900 dark:text-gray-100 ${
                                            col.allowWrap ? 'whitespace-normal' : 'whitespace-nowrap'
                                        }`}
                                        style={{ width: `${100 / columns.length}%` }}
                                    >
                                        {col.render ? col.render(item) : String(item[col.key as keyof T] || '')}
                                    </td>
                                ))}
                            </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            
            {/* Single frozen horizontal scrollbar */}
            <div className="horizontal-scroll-wrapper">
                <div 
                    className="horizontal-scroll-area scrollbar-horizontal"
                    ref={horizontalScrollRef}
                    onScroll={() => syncHorizontalScroll('scrollbar')}
                >
                    <div 
                        className="horizontal-scroll-content"
                        ref={scrollContentRef}
                    ></div>
                </div>
            </div>
        </div>
    );
}

export default Table;
