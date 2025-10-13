// Enhanced Horizontal Scrollbar Test Component
// This component demonstrates the improved horizontal scrollbar functionality

import React from 'react';

const ScrollTestComponent: React.FC = () => {
  return (
    <div className="p-4 space-y-6">
      <h2 className="text-xl font-bold">Enhanced Horizontal Scrollbar Demo</h2>
      
      {/* Enhanced Table with better horizontal scrolling */}
      <div className="table-scroll-container scrollbar-horizontal scroll-x-visible bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" style={{minWidth: '1200px'}}>
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 1</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 2</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 3</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 4</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 5</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 6</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 7</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Column 8</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 1</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 2</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 3</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 4</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 5</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 6</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 7</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Data 8</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>✅ Enhanced horizontal scrollbar features:</p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Larger, more visible scrollbar (14px height)</li>
          <li>Blue colored thumb for better visibility</li>
          <li>Always visible horizontal scrollbar</li>
          <li>Hover and active states for better feedback</li>
          <li>Easy to drag from any position</li>
          <li>Compatible with dark mode</li>
        </ul>
      </div>
    </div>
  );
};

export default ScrollTestComponent;