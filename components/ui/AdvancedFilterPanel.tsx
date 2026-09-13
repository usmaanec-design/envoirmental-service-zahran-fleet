import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Select from './Select';
import Input from './Input';

export interface FilterRule {
  id: string;
  column: string;
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'notEquals';
  value: string | number;
  logicalOperator?: 'AND' | 'OR';
}

export interface SavedFilter {
  id: string;
  name: string;
  rules: FilterRule[];
}

interface AdvancedFilterPanelProps {
  columns: Array<{ value: string; label: string; type?: 'text' | 'number' | 'date' }>;
  filters: FilterRule[];
  onFiltersChange: (filters: FilterRule[]) => void;
  savedFilters?: SavedFilter[];
  onSaveFilter?: (name: string, rules: FilterRule[]) => void;
  onLoadFilter?: (filter: SavedFilter) => void;
  onDeleteFilter?: (filterId: string) => void;
}

const operatorOptions = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater', label: 'Greater Than' },
  { value: 'less', label: 'Less Than' },
  { value: 'between', label: 'Between' },
];

const logicalOperatorOptions = [
  { value: 'AND', label: 'AND' },
  { value: 'OR', label: 'OR' },
];

const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  columns,
  filters,
  onFiltersChange,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const addFilter = () => {
    const newFilter: FilterRule = {
      id: Date.now().toString(),
      column: columns[0]?.value || '',
      operator: 'equals',
      value: '',
      logicalOperator: filters.length > 0 ? 'AND' : undefined,
    };
    onFiltersChange([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<FilterRule>) => {
    onFiltersChange(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const removeFilter = (id: string) => {
    onFiltersChange(filters.filter(f => f.id !== id));
  };

  const clearAllFilters = () => {
    onFiltersChange([]);
  };

  const handleSaveFilter = () => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim(), filters);
      setSaveFilterName('');
      setShowSaveDialog(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'} text-sm`}></i>
            <i className="fas fa-filter"></i>
            <span className="font-semibold">Advanced Filters</span>
          </button>
          {filters.length > 0 && (
            <span className="px-2 py-1 text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full">
              {filters.length} active
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <Button variant="secondary" size="sm" onClick={clearAllFilters}>
              <i className="fas fa-times mr-1"></i>
              Clear All
            </Button>
          )}
          {onSaveFilter && filters.length > 0 && (
            <Button variant="primary" size="sm" onClick={() => setShowSaveDialog(true)}>
              <i className="fas fa-save mr-1"></i>
              Save Filter
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4">
              {/* Saved Filters */}
              {savedFilters.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Quick Filters
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {savedFilters.map(filter => (
                      <div
                        key={filter.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                      >
                        <button
                          onClick={() => onLoadFilter?.(filter)}
                          className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400"
                        >
                          {filter.name}
                        </button>
                        {onDeleteFilter && (
                          <button
                            onClick={() => onDeleteFilter(filter.id)}
                            className="text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <i className="fas fa-times text-xs"></i>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filter Rules */}
              {filters.map((filter, index) => (
                <motion.div
                  key={filter.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  {/* Logical Operator */}
                  {index > 0 && (
                    <Select
                      label=""
                      name={`logical-${filter.id}`}
                      value={filter.logicalOperator || 'AND'}
                      onChange={(e) => updateFilter(filter.id, { logicalOperator: e.target.value as 'AND' | 'OR' })}
                      options={logicalOperatorOptions}
                      className="w-24"
                    />
                  )}

                  {/* Column */}
                  <Select
                    label=""
                    name={`column-${filter.id}`}
                    value={filter.column}
                    onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                    options={columns}
                    className="w-40"
                  />

                  {/* Operator */}
                  <Select
                    label=""
                    name={`operator-${filter.id}`}
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterRule['operator'] })}
                    options={operatorOptions}
                    className="w-36"
                  />

                  {/* Value */}
                  <Input
                    label=""
                    name={`value-${filter.id}`}
                    value={filter.value.toString()}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Enter value..."
                    className="flex-1 min-w-[150px]"
                  />

                  {/* Remove Button */}
                  <button
                    onClick={() => removeFilter(filter.id)}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Remove filter"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </motion.div>
              ))}

              {/* Add Filter Button */}
              <Button variant="secondary" onClick={addFilter} className="w-full">
                <i className="fas fa-plus mr-2"></i>
                Add Filter Rule
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Filter Dialog */}
      {showSaveDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowSaveDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Save Filter Preset
            </h3>
            <Input
              label="Filter Name"
              name="filterName"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
              placeholder="e.g., Critical Incidents"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowSaveDialog(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveFilter} disabled={!saveFilterName.trim()}>
                Save
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default AdvancedFilterPanel;
