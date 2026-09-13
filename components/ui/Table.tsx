import React, { useState, useMemo, useEffect } from 'react';

type SortDirection = 'asc' | 'desc';

export interface Column<T> {
  key: keyof T | 'actions';
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  allowWrap?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  initialSortKey?: keyof T;
  initialSortDirection?: SortDirection;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (newSelectedIds: string[]) => void;
  useWrapper?: boolean;
  defaultPageSize?: number;
  showPagination?: boolean;
}

const SortIcon: React.FC<{ direction: SortDirection | null }> = ({ direction }) => {
    if (!direction) return <i className="fas fa-sort text-gray-400 dark:text-gray-500 ms-1.5 opacity-50 group-hover:opacity-100 transition-opacity text-xs"></i>;
    return direction === 'asc' ? <i className="fas fa-sort-up text-orange-600 dark:text-orange-400 ms-1.5 text-xs"></i> : <i className="fas fa-sort-down text-orange-600 dark:text-orange-400 ms-1.5 text-xs"></i>;
};

function Table<T extends { id: string }>({
    columns,
    data,
    initialSortKey,
    initialSortDirection = 'asc',
    selectable = false,
    selectedIds = [],
    onSelectionChange = () => {},
    useWrapper = true,
    defaultPageSize = 10,
    showPagination = true,
}: TableProps<T>) {
    const [sortKey, setSortKey] = useState<keyof T | null>(initialSortKey || null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(initialSortDirection);

    // Pagination state
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [pageSize, setPageSize] = useState<number>(defaultPageSize);

    // Reset page to 1 if data length changes
    useEffect(() => {
        setCurrentPage(1);
    }, [data.length]);

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        
        const sorted = [...data].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];

            if (valA == null && valB == null) return 0;
            if (valA == null) return 1;
            if (valB == null) return -1;

            const multiplier = sortDirection === 'asc' ? 1 : -1;

            if (typeof valA === 'number' && typeof valB === 'number') {
                return (valA - valB) * multiplier;
            }

            const strA = String(valA).toLowerCase();
            const strB = String(valB).toLowerCase();
            
            return strA.localeCompare(strB) * multiplier;
        });
        return sorted;
    }, [data, sortKey, sortDirection]);

    const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));

    const currentPaginatedData = useMemo(() => {
        if (!showPagination || pageSize >= sortedData.length) return sortedData;
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize, showPagination]);

    const handleSort = (key: keyof T) => {
        if (sortKey === key) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onSelectionChange(data.map(item => item.id));
        } else {
            onSelectionChange([]);
        }
    };

    const handleSelectOne = (id: string) => {
        const isSelected = selectedIds.includes(id);
        if (isSelected) {
            onSelectionChange(selectedIds.filter(selectedId => selectedId !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    const isAllSelected = data.length > 0 && selectedIds.length === data.length;
    const isIndeterminate = selectedIds.length > 0 && selectedIds.length < data.length;
    
    const selectAllCheckboxRef = (el: HTMLInputElement | null) => {
        if (el) {
            el.indeterminate = isIndeterminate;
        }
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, sortedData.length);

    const tableMarkup = (
        <div className="w-full flex flex-col justify-between">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-xs">
                    <thead className="bg-gray-100 dark:bg-gray-750 sticky top-0 z-10 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            {selectable && (
                                <th scope="col" className="p-2 w-10 text-center">
                                    <div className="flex items-center justify-center">
                                        <input
                                            id="checkbox-all"
                                            type="checkbox"
                                            className="h-3.5 w-3.5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                            checked={isAllSelected}
                                            ref={selectAllCheckboxRef}
                                            onChange={handleSelectAll}
                                        />
                                        <label htmlFor="checkbox-all" className="sr-only">Select all items</label>
                                    </div>
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={String(col.key)}
                                    scope="col"
                                    className="px-3 py-2 text-left text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                                >
                                    {col.sortable ? (
                                        <button
                                            className="flex items-center w-full text-left focus:outline-none group font-bold"
                                            onClick={() => handleSort(col.key as keyof T)}
                                        >
                                            <span className="group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">{col.header}</span>
                                            <SortIcon direction={sortKey === col.key ? sortDirection : null} />
                                        </button>
                                    ) : (
                                        col.header
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {currentPaginatedData.map(item => (
                            <tr key={item.id} className={`transition-colors duration-150 ${selectedIds.includes(item.id) ? 'bg-orange-50/80 dark:bg-orange-900/30 font-medium' : 'hover:bg-orange-50/40 dark:hover:bg-gray-700/50'}`}>
                                {selectable && (
                                    <td className="w-10 p-2 text-center">
                                        <div className="flex items-center justify-center">
                                            <input
                                                id={`checkbox-${item.id}`}
                                                type="checkbox"
                                                className="h-3.5 w-3.5 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-1 dark:bg-gray-700 dark:border-gray-600 cursor-pointer"
                                                checked={selectedIds.includes(item.id)}
                                                onChange={() => handleSelectOne(item.id)}
                                            />
                                            <label htmlFor={`checkbox-${item.id}`} className="sr-only">Select item</label>
                                        </div>
                                    </td>
                                )}
                                {columns.map(col => (
                                    <td key={`${item.id}-${String(col.key)}`} className={`px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 leading-tight ${!col.allowWrap ? 'whitespace-nowrap' : ''}`}>
                                       {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Control Footer */}
            {showPagination && sortedData.length > 0 && (
                <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-3">
                        <span>
                            Showing <span className="font-semibold text-gray-900 dark:text-white">{sortedData.length > 0 ? startIndex + 1 : 0}</span> to <span className="font-semibold text-gray-900 dark:text-white">{endIndex}</span> of <span className="font-semibold text-gray-900 dark:text-white">{sortedData.length}</span> items
                        </span>
                        
                        <div className="flex items-center gap-1.5 ms-2">
                            <span className="hidden sm:inline text-xs text-gray-500">Rows per page:</span>
                            <select
                                value={pageSize >= sortedData.length && pageSize > 100 ? 999999 : pageSize}
                                onChange={(e) => {
                                    const val = Number(e.target.value);
                                    setPageSize(val);
                                    setCurrentPage(1);
                                }}
                                className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded px-2 py-0.5 text-xs focus:ring-1 focus:ring-orange-500 focus:outline-none cursor-pointer"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                                <option value={999999}>All</option>
                            </select>
                        </div>
                    </div>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-orange-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="First Page"
                            >
                                <i className="fas fa-angle-double-left"></i>
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-orange-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>

                            {getPageNumbers().map((page, idx) => (
                                typeof page === 'number' ? (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentPage(page)}
                                        className={`px-2.5 py-0.5 rounded text-xs font-semibold transition-all ${
                                            currentPage === page
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'border border-gray-300 dark:border-gray-600 hover:bg-orange-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                ) : (
                                    <span key={idx} className="px-1 text-gray-400">...</span>
                                )
                            ))}

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-orange-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                                Next
                            </button>
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium hover:bg-orange-100 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Last Page"
                            >
                                <i className="fas fa-angle-double-right"></i>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
    
    if (!useWrapper) {
        return tableMarkup;
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {tableMarkup}
        </div>
    );
}

export default Table;