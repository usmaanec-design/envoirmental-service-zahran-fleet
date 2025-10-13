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
                className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600 transition-colors text-sm font-medium flex items-center"
                title="Export to Excel"
            >
                <i className="fas fa-file-excel me-2"></i>
                <span>Excel</span>
            </button>
        </div>
    );
};

export default ExportButtons;