import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, ProjectData } from '../types';
import Select from './ui/Select';
import toast from 'react-hot-toast';
import { exportToPDF } from '../utils/pdfExport';
import { exportToExcel } from '../utils/excelExport';

interface PDFReportsPageProps {
  lang: Language;
  allUsers: User[];
  allProjectData: Record<string, ProjectData>;
}

type ReportType = 'vehicles' | 'drivers' | 'incidents' | 'all';

// Helper function to transliterate Arabic project names for PDF
const transliterateArabicForPDF = (text: string): string => {
  const arabicToEnglish: Record<string, string> = {
    'الشرق': 'Al-Sharq',
    'الغربية': 'Al-Gharbiya',
    'الشمالية': 'Al-Shamaliya',
    'الجنوبية': 'Al-Janobiya',
    'مشروع خميس مشيط': 'Khamis Mushait Project',
    'مشروع جدة': 'Jeddah Project',
    'مشروع الرياض': 'Riyadh Project',
    'مشروع الدمام': 'Dammam Project',
    'مشروع مكة': 'Makkah Project',
    'مشروع المدينة': 'Madinah Project',
  };
  
  // Check if text contains the Arabic project name
  for (const [arabic, english] of Object.entries(arabicToEnglish)) {
    if (text.includes(arabic)) {
      return text.replace(arabic, english);
    }
  }
  
  // If no match found, return original
  return text;
};

const PDFReportsPage: React.FC<PDFReportsPageProps> = ({ lang, allUsers, allProjectData }) => {
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedReportType, setSelectedReportType] = useState<ReportType>('all');

  // Filter out dummy projects
  const validUsers = useMemo(() => {
    return allUsers.filter(user => user.projectName !== 'Admin Dashboard');
  }, [allUsers]);

  const projectOptions = useMemo(() => {
    const options = validUsers.map(user => ({
      value: user.email,
      label: user.projectName
    }));
    return [{ value: 'all', label: 'All Projects' }, ...options];
  }, [validUsers]);

  const reportTypeOptions = [
    { value: 'all', label: 'All Reports (Combined)' },
    { value: 'vehicles', label: 'Vehicles Report' },
    { value: 'drivers', label: 'Drivers Report' },
    { value: 'incidents', label: 'Incidents Report' },
  ];

  const handleGeneratePDF = async () => {
    toast.loading('Generating PDF report...');

    try {
      const projectName = selectedProject === 'all' 
        ? 'All Projects' 
        : transliterateArabicForPDF(validUsers.find(u => u.email === selectedProject)?.projectName || 'Project');

      // Get filtered data
      const filteredUsers = selectedProject === 'all' 
        ? validUsers 
        : validUsers.filter(u => u.email === selectedProject);

      // Collect vehicles
      const vehicles = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        return data?.vehicles?.map(v => ({
          doorNumber: v.doorNumber,
          plateNumber: v.plateNumber || 'N/A',
          manufacturer: v.manufacturer,
          status: v.status,
          year: v.year,
          serviceType: transliterateArabicForPDF(v.serviceType || 'N/A'),
          projectName: transliterateArabicForPDF(user.projectName)
        })) || [];
      });

      // Collect drivers
      const drivers = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        const vehiclesMap = new Map(data?.vehicles?.map(v => [v.id, v]) || []);
        return data?.drivers?.map(d => {
          const vehicle = vehiclesMap.get(d.assignedVehicle);
          return {
            name: transliterateArabicForPDF(d.driverName),
            nationality: transliterateArabicForPDF(d.nationality),
            iqama: d.driverIqama,
            mobile: d.driverMobile ? `+966 ${d.driverMobile}` : 'N/A',
            vehicle: vehicle ? `${vehicle.doorNumber} - ${vehicle.plateNumber}` : 'Unassigned',
            projectName: transliterateArabicForPDF(user.projectName)
          };
        }) || [];
      });

      // Collect incidents
      const incidents = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        const vehiclesMap = new Map(data?.vehicles?.map(v => [v.id, v]) || []);
        return data?.incidents?.map(i => {
          const vehicle = vehiclesMap.get(i.vehicleId);
          return {
            plateNumber: vehicle?.plateNumber || 'N/A',
            doorNumber: vehicle?.doorNumber || 'N/A',
            type: transliterateArabicForPDF(i.type),
            date: new Date(i.date).toLocaleDateString('en-CA'),
            description: transliterateArabicForPDF(i.description || 'N/A'),
            projectName: transliterateArabicForPDF(user.projectName)
          };
        }) || [];
      });

      // Generate PDF based on report type
      if (selectedReportType === 'all') {
        // Combined report
        await exportToPDF({
          title: `${projectName} - Complete Fleet Report`,
          subtitle: `Vehicles: ${vehicles.length} | Drivers: ${drivers.length} | Incidents: ${incidents.length}`,
          data: [
            ...vehicles.map(v => ({ Type: 'Vehicle', ...v })),
            ...drivers.map(d => ({ Type: 'Driver', ...d })),
            ...incidents.map(i => ({ Type: 'Incident', ...i }))
          ],
          columns: [
            { key: 'Type', header: 'Record Type' },
            { key: 'doorNumber', header: 'Door/Name' },
            { key: 'plateNumber', header: 'Plate/Iqama' },
            { key: 'projectName', header: 'Project' }
          ],
          orientation: 'landscape'
        });
      } else if (selectedReportType === 'vehicles') {
        await exportToPDF({
          title: `${projectName} - Vehicles Report`,
          subtitle: `Total Vehicles: ${vehicles.length}`,
          data: vehicles,
          columns: [
            { key: 'doorNumber', header: 'Door Number' },
            { key: 'plateNumber', header: 'Plate Number' },
            { key: 'manufacturer', header: 'Manufacturer' },
            { key: 'status', header: 'Status' },
            { key: 'year', header: 'Year' },
            { key: 'serviceType', header: 'Service Type' },
            { key: 'projectName', header: 'Project' }
          ],
          orientation: 'landscape'
        });
      } else if (selectedReportType === 'drivers') {
        await exportToPDF({
          title: `${projectName} - Drivers Report`,
          subtitle: `Total Drivers: ${drivers.length}`,
          data: drivers,
          columns: [
            { key: 'name', header: 'Driver Name' },
            { key: 'nationality', header: 'Nationality' },
            { key: 'iqama', header: 'Iqama' },
            { key: 'mobile', header: 'Mobile' },
            { key: 'vehicle', header: 'Assigned Vehicle' },
            { key: 'projectName', header: 'Project' }
          ],
          orientation: 'landscape'
        });
      } else if (selectedReportType === 'incidents') {
        await exportToPDF({
          title: `${projectName} - Incidents Report`,
          subtitle: `Total Incidents: ${incidents.length}`,
          data: incidents,
          columns: [
            { key: 'plateNumber', header: 'Plate Number' },
            { key: 'doorNumber', header: 'Door Number' },
            { key: 'type', header: 'Incident Type' },
            { key: 'date', header: 'Date' },
            { key: 'description', header: 'Description' },
            { key: 'projectName', header: 'Project' }
          ],
          orientation: 'landscape'
        });
      }

      toast.dismiss();
      toast.success('PDF report generated successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate PDF report');
      console.error('PDF Error:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
      <header className="mb-8 border-b-2 border-orange-500 pb-6">
        <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
          <i className="fas fa-file-pdf mr-3"></i>
          PDF Reports Center
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Generate professional PDF reports for your fleet data
        </p>
      </header>

      <div className="space-y-6">
        {/* Project Filter */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <i className="fas fa-filter mr-2"></i>
            Filter by Project
          </label>
          <Select
            label=""
            name="projectFilter"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            options={projectOptions}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Select a specific project or choose "All Projects" for complete report
          </p>
        </div>

        {/* Report Type Selection */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            <i className="fas fa-file-alt mr-2"></i>
            Report Type
          </label>
          <Select
            label=""
            name="reportType"
            value={selectedReportType}
            onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
            options={reportTypeOptions}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Choose which report you want to generate
          </p>
        </div>

        {/* Report Summary */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-700 dark:to-gray-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
            <i className="fas fa-info-circle mr-2"></i>
            Report Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Selected Project</div>
              <div className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-1">
                {selectedProject === 'all' ? 'All Projects' : validUsers.find(u => u.email === selectedProject)?.projectName || 'N/A'}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Report Type</div>
              <div className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 capitalize">
                {selectedReportType === 'all' ? 'Combined' : selectedReportType}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
              <div className="text-sm text-gray-600 dark:text-gray-400">Format</div>
              <div className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">
                PDF
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleGeneratePDF}
            className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 text-lg font-semibold"
          >
            <i className="fas fa-file-pdf text-2xl"></i>
            <span>Generate PDF Report</span>
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            <i className="fas fa-lightbulb mr-2"></i>
            How to use
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
            <li>• Select a project from the dropdown (or choose "All Projects")</li>
            <li>• Choose the type of report you want to generate</li>
            <li>• Click "Generate PDF Report" button</li>
            <li>• Your PDF will download automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFReportsPage;
