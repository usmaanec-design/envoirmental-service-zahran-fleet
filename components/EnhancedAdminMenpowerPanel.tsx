import React, { useMemo, useState, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import Select from 'react-select';
import { TRANSLATIONS } from '../constants';
import type { Language, User, ProjectData, Supervisor, Foreman, Labour, ProjectOfficer } from '../types';
import { exportToExcel } from '../utils/export';
import * as XLSX from 'xlsx';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

type MenpowerType = 'supervisors' | 'foremen' | 'labours' | 'projectOfficers' | 'crewmen' | 'campLabours' | 'hierarchy';

interface FilterState {
    selectedProject: string;
    selectedSupervisor: string;
    selectedCrewman: string;
    selectedCampLabour: string;
    selectedOfficer: string;
}

interface EnhancedAdminMenpowerProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

const EnhancedAdminMenpowerPanel: React.FC<EnhancedAdminMenpowerProps> = ({ 
    lang, 
    allUsers, 
    allProjectData 
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [activeView, setActiveView] = useState<MenpowerType>('hierarchy');
    const [filters, setFilters] = useState<FilterState>({
        selectedProject: 'all',
        selectedSupervisor: 'all', 
        selectedCrewman: 'all',
        selectedCampLabour: 'all',
        selectedOfficer: 'all'
    });
    const [searchTerm, setSearchTerm] = useState('');

    // Prepare dropdown options
    const dropdownOptions = useMemo(() => {
        const projectOptions = [
            { value: 'all', label: lang === 'ar' ? 'جميع المشاريع' : 'All Projects' },
            ...allUsers.map(user => ({
                value: user.email,
                label: user.projectName || user.email
            }))
        ];

        // Get filtered supervisors based on selected project
        const supervisors = [];
        const crewmen = [];
        const campLabours = [];
        const officers = [];

        if (filters.selectedProject === 'all') {
            // Include all supervisors from all projects
            allUsers.forEach(user => {
                const project = allProjectData[user.email];
                if (project) {
                    (project.supervisors || []).forEach(s => supervisors.push({ 
                        value: s.id, 
                        label: `${s.name} (${user.projectName})`,
                        projectEmail: user.email 
                    }));
                    (project.crewmen || []).forEach(c => crewmen.push({
                        value: c.id,
                        label: `${c.name} (${user.projectName})`,
                        projectEmail: user.email
                    }));
                    (project.campLabours || []).forEach(cl => campLabours.push({
                        value: cl.id,
                        label: `${cl.name} (${user.projectName})`,
                        projectEmail: user.email
                    }));
                    (project.projectOfficers || []).forEach(o => officers.push({
                        value: o.id,
                        label: `${o.name} (${user.projectName})`,
                        projectEmail: user.email
                    }));
                }
            });
        } else {
            // Include only supervisors from selected project
            const project = allProjectData[filters.selectedProject];
            const user = allUsers.find(u => u.email === filters.selectedProject);
            if (project && user) {
                (project.supervisors || []).forEach(s => supervisors.push({ 
                    value: s.id, 
                    label: s.name,
                    projectEmail: user.email 
                }));
                (project.crewmen || []).forEach(c => crewmen.push({
                    value: c.id,
                    label: c.name,
                    projectEmail: user.email
                }));
                (project.campLabours || []).forEach(cl => campLabours.push({
                    value: cl.id,
                    label: cl.name,
                    projectEmail: user.email
                }));
                (project.projectOfficers || []).forEach(o => officers.push({
                    value: o.id,
                    label: o.name,
                    projectEmail: user.email
                }));
            }
        }

        return {
            projects: projectOptions,
            supervisors: [
                { value: 'all', label: lang === 'ar' ? 'جميع المشرفين' : 'All Supervisors' },
                ...supervisors
            ],
            crewmen: [
                { value: 'all', label: lang === 'ar' ? 'جميع أفراد الطاقم' : 'All Crew Man' },
                ...crewmen
            ],
            campLabours: [
                { value: 'all', label: lang === 'ar' ? 'جميع عمال المخيم' : 'All Camp Labour' },
                ...campLabours
            ],
            officers: [
                { value: 'all', label: lang === 'ar' ? 'جميع المسؤولين' : 'All Officers' },
                ...officers
            ]
        };
    }, [allUsers, allProjectData, filters.selectedProject, lang]);

    // Prepare hierarchical data for AG Grid
    const hierarchicalData = useMemo(() => {
        const data = [];
        
        allUsers.forEach(user => {
            const project = allProjectData[user.email];
            if (!project) return;

            // Filter by selected project
            if (filters.selectedProject !== 'all' && user.email !== filters.selectedProject) return;

            // Project level
            const projectRow = {
                level: 0,
                type: 'project',
                projectName: user.projectName,
                projectManager: user.projectManagerName,
                projectEmail: user.email,
                name: user.projectName,
                id: `project_${user.email}`,
                supervisorCount: (project.supervisors || []).length,
                foremanCount: (project.supervisors || []).reduce((sum, s) => sum + (s.foremen?.length || 0), 0),
                labourCount: (project.supervisors || [])
                    .flatMap(s => s.foremen || [])
                    .reduce((sum, f) => sum + (f.labours?.length || 0), 0),
                crewmenCount: (project.crewmen || []).length,
                campLabourCount: (project.campLabours || []).length,
                officerCount: (project.projectOfficers || []).length
            };
            data.push(projectRow);

            // Supervisors level
            (project.supervisors || []).forEach(supervisor => {
                // Filter by selected supervisor
                if (filters.selectedSupervisor !== 'all' && supervisor.id !== filters.selectedSupervisor) return;

                const supervisorRow = {
                    level: 1,
                    type: 'supervisor',
                    projectName: user.projectName,
                    projectManager: user.projectManagerName,
                    projectEmail: user.email,
                    name: supervisor.name,
                    id: supervisor.id,
                    iqama: supervisor.iqama,
                    empId: supervisor.empId,
                    mobile: supervisor.mobile,
                    area: supervisor.area,
                    foremanCount: (supervisor.foremen || []).length,
                    labourCount: (supervisor.foremen || []).reduce((sum, f) => sum + (f.labours?.length || 0), 0)
                };
                data.push(supervisorRow);

                // Foremen level
                (supervisor.foremen || []).forEach(foreman => {
                    const foremanRow = {
                        level: 2,
                        type: 'foreman',
                        projectName: user.projectName,
                        supervisorName: supervisor.name,
                        name: foreman.name,
                        id: foreman.id,
                        iqama: foreman.iqama,
                        empId: foreman.empId,
                        labourCount: (foreman.labours || []).length
                    };
                    data.push(foremanRow);

                    // Labour level
                    (foreman.labours || []).forEach(labour => {
                        const labourRow = {
                            level: 3,
                            type: 'labour',
                            projectName: user.projectName,
                            supervisorName: supervisor.name,
                            foremanName: foreman.name,
                            name: labour.name,
                            id: labour.id,
                            iqama: labour.iqama,
                            empId: labour.empId
                        };
                        data.push(labourRow);
                    });
                });
            });

            // Add project officers
            (project.projectOfficers || []).forEach(officer => {
                if (filters.selectedOfficer !== 'all' && officer.id !== filters.selectedOfficer) return;
                data.push({
                    level: 1,
                    type: 'officer',
                    projectName: user.projectName,
                    name: officer.name,
                    id: officer.id,
                    iqama: officer.iqama,
                    role: officer.role,
                    mobile: officer.mobile
                });
            });

            // Add crewmen
            (project.crewmen || []).forEach(crewman => {
                if (filters.selectedCrewman !== 'all' && crewman.id !== filters.selectedCrewman) return;
                data.push({
                    level: 1,
                    type: 'crewman',
                    projectName: user.projectName,
                    name: crewman.name,
                    id: crewman.id,
                    iqama: crewman.iqama,
                    empId: crewman.empId
                });
            });

            // Add camp labours
            (project.campLabours || []).forEach(campLabour => {
                if (filters.selectedCampLabour !== 'all' && campLabour.id !== filters.selectedCampLabour) return;
                data.push({
                    level: 1,
                    type: 'campLabour',
                    projectName: user.projectName,
                    name: campLabour.name,
                    id: campLabour.id,
                    iqama: campLabour.iqama,
                    empId: campLabour.empId
                });
            });
        });

        return data;
    }, [allUsers, allProjectData, filters]);

    // AG Grid column definitions
    const columnDefs = useMemo(() => [
        {
            headerName: lang === 'ar' ? 'اسم المشروع' : 'Project Name',
            field: 'projectName',
            width: 200,
            cellStyle: { fontWeight: 'bold' },
            filter: 'agTextColumnFilter',
            sortable: true,
            resizable: true
        },
        {
            headerName: lang === 'ar' ? 'الاسم' : 'Name',
            field: 'name',
            width: 250,
            cellStyle: (params) => {
                const level = params.data?.level || 0;
                return {
                    paddingLeft: `${level * 20 + 10}px`,
                    fontWeight: level === 0 ? 'bold' : 'normal',
                    color: level === 0 ? '#ea580c' : level === 1 ? '#0891b2' : level === 2 ? '#059669' : '#374151'
                };
            },
            filter: 'agTextColumnFilter',
            sortable: true,
            resizable: true
        },
        {
            headerName: lang === 'ar' ? 'النوع' : 'Type',
            field: 'type',
            width: 120,
            cellRenderer: (params) => {
                const type = params.value;
                const typeLabels = {
                    project: lang === 'ar' ? 'مشروع' : 'Project',
                    supervisor: lang === 'ar' ? 'مشرف' : 'Supervisor',
                    foreman: lang === 'ar' ? 'رئيس عمال' : 'Foreman',
                    labour: lang === 'ar' ? 'عامل' : 'Labour',
                    officer: lang === 'ar' ? 'مسؤول' : 'Officer',
                    crewman: lang === 'ar' ? 'فرد طاقم' : 'Crewman',
                    campLabour: lang === 'ar' ? 'عامل مخيم' : 'Camp Labour'
                };
                return typeLabels[type] || type;
            },
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            headerName: lang === 'ar' ? 'رقم الإقامة' : 'Iqama',
            field: 'iqama',
            width: 150,
            filter: 'agTextColumnFilter',
            sortable: true,
            resizable: true
        },
        {
            headerName: lang === 'ar' ? 'رقم الموظف' : 'Employee ID',
            field: 'empId',
            width: 130,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            headerName: lang === 'ar' ? 'الجوال' : 'Mobile',
            field: 'mobile',
            width: 130,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            headerName: lang === 'ar' ? 'المنطقة' : 'Area',
            field: 'area',
            width: 150,
            filter: 'agTextColumnFilter',
            sortable: true
        },
        {
            headerName: lang === 'ar' ? 'عدد العمال' : 'Labour Count',
            field: 'labourCount',
            width: 120,
            filter: 'agNumberColumnFilter',
            sortable: true,
            cellRenderer: (params) => params.value || 0
        }
    ], [lang]);

    // Handle filter changes
    const handleFilterChange = useCallback((filterType: keyof FilterState, value: string) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value,
            // Reset dependent filters
            ...(filterType === 'selectedProject' && {
                selectedSupervisor: 'all',
                selectedCrewman: 'all',
                selectedCampLabour: 'all',
                selectedOfficer: 'all'
            })
        }));
    }, []);

    // Export to Excel with styling
    const handleExportExcel = useCallback(() => {
        const workbook = XLSX.utils.book_new();
        
        // Prepare data for export with proper formatting
        const exportData = hierarchicalData.map(row => ({
            [lang === 'ar' ? 'اسم المشروع' : 'Project Name']: row.projectName || '',
            [lang === 'ar' ? 'الاسم' : 'Name']: '  '.repeat(row.level) + (row.name || ''),
            [lang === 'ar' ? 'النوع' : 'Type']: row.type,
            [lang === 'ar' ? 'رقم الإقامة' : 'Iqama']: row.iqama || '',
            [lang === 'ar' ? 'رقم الموظف' : 'Employee ID']: row.empId || '',
            [lang === 'ar' ? 'الجوال' : 'Mobile']: row.mobile || '',
            [lang === 'ar' ? 'المنطقة' : 'Area']: row.area || '',
            [lang === 'ar' ? 'عدد العمال' : 'Labour Count']: row.labourCount || 0
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        
        // Add styling
        const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = {
                font: { bold: true, color: { rgb: 'FFFFFF' } },
                fill: { fgColor: { rgb: 'EA580C' } },
                alignment: { horizontal: 'center' }
            };
        }

        // Set column widths
        worksheet['!cols'] = [
            { width: 25 }, // Project Name
            { width: 30 }, // Name (with indentation)
            { width: 15 }, // Type
            { width: 20 }, // Iqama
            { width: 15 }, // Employee ID
            { width: 15 }, // Mobile
            { width: 20 }, // Area
            { width: 15 }  // Labour Count
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Manpower Hierarchy');
        XLSX.writeFile(workbook, `Manpower-Hierarchy-${new Date().toISOString().split('T')[0]}.xlsx`);
    }, [hierarchicalData, lang]);

    // Clear all filters
    const clearFilters = useCallback(() => {
        setFilters({
            selectedProject: 'all',
            selectedSupervisor: 'all',
            selectedCrewman: 'all',
            selectedCampLabour: 'all',
            selectedOfficer: 'all'
        });
        setSearchTerm('');
    }, []);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-full mx-auto">
            {/* Header */}
            <header className="flex flex-wrap justify-between items-center border-b-2 border-orange-500 pb-6 mb-6 gap-4">
                <h2 className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                    {lang === 'ar' ? 'لوحة القوى العاملة المتقدمة' : 'Advanced Manpower Panel'}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleExportExcel}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-file-excel"></i>
                        {lang === 'ar' ? 'تصدير إكسل' : 'Export Excel'}
                    </button>
                    <button
                        onClick={clearFilters}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-times"></i>
                        {lang === 'ar' ? 'مسح المرشحات' : 'Clear Filters'}
                    </button>
                </div>
            </header>

            {/* Filter Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {lang === 'ar' ? 'اختر المشروع' : 'Select Project'}
                    </label>
                    <Select
                        options={dropdownOptions.projects}
                        value={dropdownOptions.projects.find(opt => opt.value === filters.selectedProject)}
                        onChange={(selected) => handleFilterChange('selectedProject', selected?.value || 'all')}
                        placeholder={lang === 'ar' ? 'جميع المشاريع' : 'All Projects'}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {lang === 'ar' ? 'اختر المشرف' : 'Select Supervisor'}
                    </label>
                    <Select
                        options={dropdownOptions.supervisors}
                        value={dropdownOptions.supervisors.find(opt => opt.value === filters.selectedSupervisor)}
                        onChange={(selected) => handleFilterChange('selectedSupervisor', selected?.value || 'all')}
                        placeholder={lang === 'ar' ? 'جميع المشرفين' : 'All Supervisors'}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {lang === 'ar' ? 'اختر فرد الطاقم' : 'Select Crew Man'}
                    </label>
                    <Select
                        options={dropdownOptions.crewmen}
                        value={dropdownOptions.crewmen.find(opt => opt.value === filters.selectedCrewman)}
                        onChange={(selected) => handleFilterChange('selectedCrewman', selected?.value || 'all')}
                        placeholder={lang === 'ar' ? 'جميع أفراد الطاقم' : 'All Crew Man'}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {lang === 'ar' ? 'اختر عامل المخيم' : 'Select Camp Labour'}
                    </label>
                    <Select
                        options={dropdownOptions.campLabours}
                        value={dropdownOptions.campLabours.find(opt => opt.value === filters.selectedCampLabour)}
                        onChange={(selected) => handleFilterChange('selectedCampLabour', selected?.value || 'all')}
                        placeholder={lang === 'ar' ? 'جميع عمال المخيم' : 'All Camp Labour'}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {lang === 'ar' ? 'اختر المسؤول' : 'Select Officer'}
                    </label>
                    <Select
                        options={dropdownOptions.officers}
                        value={dropdownOptions.officers.find(opt => opt.value === filters.selectedOfficer)}
                        onChange={(selected) => handleFilterChange('selectedOfficer', selected?.value || 'all')}
                        placeholder={lang === 'ar' ? 'جميع المسؤولين' : 'All Officers'}
                        className="react-select-container"
                        classNamePrefix="react-select"
                    />
                </div>
            </div>

            {/* Statistics Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-orange-100 dark:bg-orange-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                        {hierarchicalData.filter(d => d.type === 'project').length}
                    </div>
                    <div className="text-sm text-orange-600 dark:text-orange-300">
                        {lang === 'ar' ? 'المشاريع' : 'Projects'}
                    </div>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        {hierarchicalData.filter(d => d.type === 'supervisor').length}
                    </div>
                    <div className="text-sm text-blue-600 dark:text-blue-300">
                        {lang === 'ar' ? 'المشرفين' : 'Supervisors'}
                    </div>
                </div>
                <div className="bg-green-100 dark:bg-green-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-800 dark:text-green-200">
                        {hierarchicalData.filter(d => d.type === 'foreman').length}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-300">
                        {lang === 'ar' ? 'رؤساء العمال' : 'Foremen'}
                    </div>
                </div>
                <div className="bg-yellow-100 dark:bg-yellow-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">
                        {hierarchicalData.filter(d => d.type === 'labour').length}
                    </div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-300">
                        {lang === 'ar' ? 'العمال' : 'Labour'}
                    </div>
                </div>
                <div className="bg-purple-100 dark:bg-purple-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                        {hierarchicalData.filter(d => d.type === 'officer').length}
                    </div>
                    <div className="text-sm text-purple-600 dark:text-purple-300">
                        {lang === 'ar' ? 'المسؤولين' : 'Officers'}
                    </div>
                </div>
                <div className="bg-indigo-100 dark:bg-indigo-900 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">
                        {hierarchicalData.filter(d => d.type === 'crewman').length + 
                         hierarchicalData.filter(d => d.type === 'campLabour').length}
                    </div>
                    <div className="text-sm text-indigo-600 dark:text-indigo-300">
                        {lang === 'ar' ? 'أطقم + مخيم' : 'Crew + Camp'}
                    </div>
                </div>
            </div>

            {/* AG Grid Table */}
            <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
                <AgGridReact
                    columnDefs={columnDefs}
                    rowData={hierarchicalData}
                    defaultColDef={{
                        sortable: true,
                        filter: true,
                        resizable: true,
                        minWidth: 100
                    }}
                    enableRangeSelection={true}
                    pagination={true}
                    paginationPageSize={50}
                    suppressRowClickSelection={false}
                    rowSelection="multiple"
                    animateRows={true}
                    domLayout="normal"
                    getRowStyle={(params) => {
                        const level = params.data?.level || 0;
                        if (level === 0) return { backgroundColor: '#fff7ed', fontWeight: 'bold' };
                        if (level === 1) return { backgroundColor: '#f0f9ff' };
                        if (level === 2) return { backgroundColor: '#f0fdf4' };
                        return { backgroundColor: '#ffffff' };
                    }}
                    onGridReady={(params) => {
                        params.api.sizeColumnsToFit();
                    }}
                />
            </div>
        </div>
    );
};

export default EnhancedAdminMenpowerPanel;