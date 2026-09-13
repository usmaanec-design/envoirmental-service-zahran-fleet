import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, ProjectData } from '../types';
import Select from './ui/Select';
import toast from 'react-hot-toast';
import { exportToExcel } from '../utils/excelExport';

interface ExcelReportsPageProps {
  lang: Language;
  allUsers: User[];
  allProjectData: Record<string, ProjectData>;
}

type ReportType = 'vehicles' | 'drivers' | 'incidents' | 'all';

const ExcelReportsPage: React.FC<ExcelReportsPageProps> = ({ lang, allUsers, allProjectData }) => {
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

  const handleGenerateExcel = () => {
    toast.loading('Generating Excel report...');

    try {
      const projectName = selectedProject === 'all' 
        ? 'All Projects' 
        : validUsers.find(u => u.email === selectedProject)?.projectName || 'Project';

      // Get filtered data
      const filteredUsers = selectedProject === 'all' 
        ? validUsers 
        : validUsers.filter(u => u.email === selectedProject);

      // Collect vehicles - Keep Arabic text as-is for Excel
      const vehicles = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        return data?.vehicles?.map(v => ({
          'Door Number': v.doorNumber,
          'Plate Number': v.plateNumber || 'N/A',
          'Chassis Number': v.chassisNumber || 'N/A',
          'Manufacturer': v.manufacturer,
          'Status': v.status,
          'Make': v.make || 'N/A',
          'Year': v.year,
          'Tare Weight': v.tareWeight || 'N/A',
          'Service Type': v.serviceType || 'N/A',
          'Project Site': v.projectSite || 'N/A',
          'Project Name': user.projectName
        })) || [];
      });

      // Collect drivers - Keep Arabic text as-is
      const drivers = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        const vehiclesMap = new Map(data?.vehicles?.map(v => [v.id, v]) || []);
        return data?.drivers?.map(d => {
          const vehicle = vehiclesMap.get(d.assignedVehicle);
          return {
            'Driver Name': d.driverName,
            'Nationality': d.nationality,
            'Iqama': d.driverIqama,
            'ID Number': d.driverIdNumber || 'N/A',
            'Mobile': d.driverMobile ? `+966 ${d.driverMobile}` : 'N/A',
            'Assigned Vehicle': vehicle ? `${vehicle.doorNumber} - ${vehicle.plateNumber}` : 'Unassigned',
            'Project Name': user.projectName,
            'Project Manager': user.projectManagerName
          };
        }) || [];
      });

      // Collect incidents - Keep Arabic text as-is
      const incidents = filteredUsers.flatMap(user => {
        const data = allProjectData[user.email];
        const vehiclesMap = new Map(data?.vehicles?.map(v => [v.id, v]) || []);
        return data?.incidents?.map(i => {
          const vehicle = vehiclesMap.get(i.vehicleId);
          return {
            'Plate Number': vehicle?.plateNumber || 'N/A',
            'Door Number': vehicle?.doorNumber || 'N/A',
            'Incident Type': i.type,
            'Date': new Date(i.date).toLocaleDateString('en-CA'),
            'Description': i.description || 'N/A',
            'Project Name': user.projectName
          };
        }) || [];
      });

      // Generate Excel based on report type
      if (selectedReportType === 'all') {
        // Combined report with multiple sheets
        exportToExcel({
          filename: `${projectName}_Complete_Report`,
          sheets: [
            {
              sheetName: 'Vehicles',
              data: vehicles,
              columns: [
                { key: 'Door Number', header: 'Door Number', width: 15 },
                { key: 'Plate Number', header: 'Plate Number', width: 15 },
                { key: 'Chassis Number', header: 'Chassis Number', width: 20 },
                { key: 'Manufacturer', header: 'Manufacturer', width: 15 },
                { key: 'Status', header: 'Status', width: 12 },
                { key: 'Make', header: 'Make', width: 15 },
                { key: 'Year', header: 'Year', width: 10 },
                { key: 'Tare Weight', header: 'Tare Weight', width: 12 },
                { key: 'Service Type', header: 'Service Type', width: 20 },
                { key: 'Project Site', header: 'Project Site', width: 25 },
                { key: 'Project Name', header: 'Project Name', width: 25 }
              ]
            },
            {
              sheetName: 'Drivers',
              data: drivers,
              columns: [
                { key: 'Driver Name', header: 'Driver Name', width: 20 },
                { key: 'Nationality', header: 'Nationality', width: 15 },
                { key: 'Iqama', header: 'Iqama', width: 15 },
                { key: 'ID Number', header: 'ID Number', width: 15 },
                { key: 'Mobile', header: 'Mobile', width: 15 },
                { key: 'Assigned Vehicle', header: 'Assigned Vehicle', width: 25 },
                { key: 'Project Name', header: 'Project Name', width: 25 },
                { key: 'Project Manager', header: 'Project Manager', width: 20 }
              ]
            },
            {
              sheetName: 'Incidents',
              data: incidents,
              columns: [
                { key: 'Plate Number', header: 'Plate Number', width: 15 },
                { key: 'Door Number', header: 'Door Number', width: 15 },
                { key: 'Incident Type', header: 'Incident Type', width: 20 },
                { key: 'Date', header: 'Date', width: 12 },
                { key: 'Description', header: 'Description', width: 40 },
                { key: 'Project Name', header: 'Project Name', width: 25 }
              ]
            }
          ],
          includeTimestamp: true,
          author: 'Zahran Fleet Admin'
        });
      } else if (selectedReportType === 'vehicles') {
        exportToExcel({
          filename: `${projectName}_Vehicles_Report`,
          sheets: [{
            sheetName: 'Vehicles',
            data: vehicles,
            columns: [
              { key: 'Door Number', header: 'Door Number', width: 15 },
              { key: 'Plate Number', header: 'Plate Number', width: 15 },
              { key: 'Chassis Number', header: 'Chassis Number', width: 20 },
              { key: 'Manufacturer', header: 'Manufacturer', width: 15 },
              { key: 'Status', header: 'Status', width: 12 },
              { key: 'Make', header: 'Make', width: 15 },
              { key: 'Year', header: 'Year', width: 10 },
              { key: 'Tare Weight', header: 'Tare Weight', width: 12 },
              { key: 'Service Type', header: 'Service Type', width: 20 },
              { key: 'Project Site', header: 'Project Site', width: 25 },
              { key: 'Project Name', header: 'Project Name', width: 25 }
            ]
          }],
          includeTimestamp: true,
          author: 'Zahran Fleet Admin'
        });
      } else if (selectedReportType === 'drivers') {
        exportToExcel({
          filename: `${projectName}_Drivers_Report`,
          sheets: [{
            sheetName: 'Drivers',
            data: drivers,
            columns: [
              { key: 'Driver Name', header: 'Driver Name', width: 20 },
              { key: 'Nationality', header: 'Nationality', width: 15 },
              { key: 'Iqama', header: 'Iqama', width: 15 },
              { key: 'ID Number', header: 'ID Number', width: 15 },
              { key: 'Mobile', header: 'Mobile', width: 15 },
              { key: 'Assigned Vehicle', header: 'Assigned Vehicle', width: 25 },
              { key: 'Project Name', header: 'Project Name', width: 25 },
              { key: 'Project Manager', header: 'Project Manager', width: 20 }
            ]
          }],
          includeTimestamp: true,
          author: 'Zahran Fleet Admin'
        });
      } else if (selectedReportType === 'incidents') {
        exportToExcel({
          filename: `${projectName}_Incidents_Report`,
          sheets: [{
            sheetName: 'Incidents',
            data: incidents,
            columns: [
              { key: 'Plate Number', header: 'Plate Number', width: 15 },
              { key: 'Door Number', header: 'Door Number', width: 15 },
              { key: 'Incident Type', header: 'Incident Type', width: 20 },
              { key: 'Date', header: 'Date', width: 12 },
              { key: 'Description', header: 'Description', width: 40 },
              { key: 'Project Name', header: 'Project Name', width: 25 }
            ]
          }],
          includeTimestamp: true,
          author: 'Zahran Fleet Admin'
        });
      }

      toast.dismiss();
      toast.success('Excel report generated successfully!');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate Excel report');
      console.error('Excel Error:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
      <header className="mb-8 border-b-2 border-orange-500 pb-6">
        <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-2">
          <i className="fas fa-file-excel mr-3"></i>
          Excel Reports Center
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Generate professional Excel reports for your fleet data
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
        <div className="bg-orange-50 dark:from-gray-700 dark:to-gray-600 rounded-lg p-4">
          <h3 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
            <i className="fas fa-info-circle mr-2"></i>
            Report Summary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-orange-500 rounded-lg p-3 shadow">
              <div className="text-xs font-semibold text-gray-900">Selected Project</div>
              <div className="text-lg font-bold text-gray-900 mt-1">
                {selectedProject === 'all' ? 'All Projects' : validUsers.find(u => u.email === selectedProject)?.projectName || 'N/A'}
              </div>
            </div>
            <div className="bg-orange-500 rounded-lg p-3 shadow">
              <div className="text-xs font-semibold text-gray-900">Report Type</div>
              <div className="text-lg font-bold text-gray-900 mt-1 capitalize">
                {selectedReportType === 'all' ? 'Combined' : selectedReportType}
              </div>
            </div>
            <div className="bg-orange-500 rounded-lg p-3 shadow">
              <div className="text-xs font-semibold text-gray-900">Format</div>
              <div className="text-lg font-bold text-gray-900 mt-1">
                Excel (.xlsx)
              </div>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleGenerateExcel}
            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 text-gray-900 rounded-xl shadow-lg transition-all duration-200 flex items-center gap-3 text-lg font-bold"
          >
            <i className="fas fa-file-excel text-2xl text-gray-900"></i>
            <span>Generate Excel Report</span>
            <i className="fas fa-arrow-right text-gray-900"></i>
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
            <li>• Click "Generate Excel Report" button</li>
            <li>• Your Excel file will download automatically with proper Arabic text</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ExcelReportsPage;
