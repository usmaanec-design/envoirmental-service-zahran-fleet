import React from 'react';
import { exportToExcel } from '../../utils/export';

interface ExportButtonsProps {
    data: any[];
    title: string;
}

const ExportButtons: React.FC<ExportButtonsProps> = ({ data, title }) => {
    
    const handleExcelExport = () => {
        // Generate a file-safe name from the title
        const fileName = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}.xlsx`;
        exportToExcel(data, fileName);
    };

    return (
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <button
                onClick={handleExcelExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow cursor-pointer"
                title="Export to Excel"
            >
                <i className="fas fa-file-excel text-xs sm:text-sm"></i>
                <span>Excel</span>
            </button>
        </div>
    );
};

export default ExportButtons;