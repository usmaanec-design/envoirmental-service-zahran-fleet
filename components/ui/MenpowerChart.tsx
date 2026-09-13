import React, { useState, useMemo } from 'react';
import type { Language, User, ProjectData } from '../../types';
import BarChart from './BarChart';
import PieChart from './PieChart';

interface MenpowerChartProps {
    lang: Language;
    allUsers: User[];
    allProjectData: Record<string, ProjectData>;
}

const MenpowerChart: React.FC<MenpowerChartProps> = ({ lang, allUsers, allProjectData }) => {
    const [selectedProject, setSelectedProject] = useState<string>('all');
    const [chartType, setChartType] = useState<'bar' | 'pie' | 'doughnut'>('bar');
    const [viewType, setViewType] = useState<'overview' | 'supervisors'>('overview');

    // Calculate comprehensive manpower data
    const menpowerData = useMemo(() => {
        const realUsers = allUsers.filter(user => 
            user.projectName && 
            user.projectName !== 'Admin Dashboard' &&
            !user.projectName.toLowerCase().includes('admin')
        );

        const projectData: any[] = [];
        const supervisorData: any[] = [];
        const overallStats = {
            totalSupervisors: 0,
            totalForemen: 0,
            totalLabour: 0,
            totalOfficers: 0,
            totalCrewmen: 0,
            totalCampLabour: 0
        };

        realUsers.forEach(user => {
            const project = allProjectData[user.email];
            if (!project) return;

            const supervisors = project.supervisors || [];
            const officers = project.projectOfficers || [];
            const crewmen = project.crewmen || [];
            const campLabour = project.campLabours || [];

            let totalForemen = 0;
            let totalLabour = 0;

            supervisors.forEach(supervisor => {
                const foremanCount = (supervisor.foremen || []).length;
                const labourCount = (supervisor.foremen || []).reduce((sum, f) => sum + (f.labours?.length || 0), 0);
                
                totalForemen += foremanCount;
                totalLabour += labourCount;

                // Individual supervisor data
                supervisorData.push({
                    projectName: user.projectName,
                    supervisorName: supervisor.name,
                    supervisorId: supervisor.id,
                    foremenCount: foremanCount,
                    labourCount: labourCount,
                    totalUnderSupervisor: foremanCount + labourCount
                });
            });

            // Project-level data
            projectData.push({
                projectName: user.projectName,
                projectEmail: user.email,
                supervisors: supervisors.length,
                foremen: totalForemen,
                labour: totalLabour,
                officers: officers.length,
                crewmen: crewmen.length,
                campLabour: campLabour.length,
                totalManpower: supervisors.length + totalForemen + totalLabour + officers.length + crewmen.length + campLabour.length
            });

            // Update overall stats
            overallStats.totalSupervisors += supervisors.length;
            overallStats.totalForemen += totalForemen;
            overallStats.totalLabour += totalLabour;
            overallStats.totalOfficers += officers.length;
            overallStats.totalCrewmen += crewmen.length;
            overallStats.totalCampLabour += campLabour.length;
        });

        return { projectData, supervisorData, overallStats };
    }, [allUsers, allProjectData]);

    // Filter data based on selected project
    const filteredData = useMemo(() => {
        if (selectedProject === 'all') {
            return menpowerData;
        }
        
        const filteredProjects = menpowerData.projectData.filter(p => p.projectEmail === selectedProject);
        const filteredSupervisors = menpowerData.supervisorData.filter(s => {
            const project = menpowerData.projectData.find(p => p.projectName === s.projectName);
            return project?.projectEmail === selectedProject;
        });

        // Recalculate overall stats for filtered data
        const filteredStats = filteredProjects.reduce((stats, project) => ({
            totalSupervisors: stats.totalSupervisors + project.supervisors,
            totalForemen: stats.totalForemen + project.foremen,
            totalLabour: stats.totalLabour + project.labour,
            totalOfficers: stats.totalOfficers + project.officers,
            totalCrewmen: stats.totalCrewmen + project.crewmen,
            totalCampLabour: stats.totalCampLabour + project.campLabour
        }), {
            totalSupervisors: 0,
            totalForemen: 0,
            totalLabour: 0,
            totalOfficers: 0,
            totalCrewmen: 0,
            totalCampLabour: 0
        });
        
        return {
            projectData: filteredProjects,
            supervisorData: filteredSupervisors,
            overallStats: filteredStats
        };
    }, [menpowerData, selectedProject]);

    // Chart data for project overview
    const projectBarChartData = useMemo(() => {
        if (filteredData.projectData.length === 0) return [];

        return [
            {
                label: lang === 'ar' ? 'المشرفين' : 'Supervisors',
                value: filteredData.overallStats.totalSupervisors,
                color: '#3B82F6'
            },
            {
                label: lang === 'ar' ? 'رؤساء العمال' : 'Foremen', 
                value: filteredData.overallStats.totalForemen,
                color: '#10B981'
            },
            {
                label: lang === 'ar' ? 'العمال' : 'Labour',
                value: filteredData.overallStats.totalLabour,
                color: '#F59E0B'
            },
            {
                label: lang === 'ar' ? 'الضباط' : 'Officers',
                value: filteredData.overallStats.totalOfficers,
                color: '#8B5CF6'
            },
            {
                label: lang === 'ar' ? 'أفراد الطاقم' : 'Crew',
                value: filteredData.overallStats.totalCrewmen,
                color: '#EC4899'
            },
            {
                label: lang === 'ar' ? 'عمال المخيم' : 'Camp Labour',
                value: filteredData.overallStats.totalCampLabour,
                color: '#EF4444'
            }
        ];
    }, [filteredData, lang]);

    // Chart data for supervisor details
    const supervisorChartData = useMemo(() => {
        if (filteredData.supervisorData.length === 0) return [];

        return filteredData.supervisorData.map((supervisor, index) => ({
            label: `${supervisor.supervisorName}`,
            value: supervisor.totalUnderSupervisor,
            color: `hsl(${(index * 137.5) % 360}, 70%, 60%)`
        }));
    }, [filteredData]);

    const projectOptions = [
        { value: 'all', label: lang === 'ar' ? 'جميع المشاريع' : 'All Projects' },
        ...menpowerData.projectData.map(p => ({
            value: p.projectEmail,
            label: p.projectName
        }))
    ];

    const totalManpower = Object.values(filteredData.overallStats).reduce((sum, val) => sum + val, 0);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
            {/* Header with Controls */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h3 className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                        {lang === 'ar' ? 'مخططات القوى العاملة' : 'Manpower Analytics'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {lang === 'ar' ? 'تحليل شامل للقوى العاملة عبر المشاريع' : 'Comprehensive workforce analysis across projects'}
                    </p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    {/* Project Filter */}
                    <select
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-sm font-medium dark:text-white"
                    >
                        {projectOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    
                    {/* View Type Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setViewType('overview')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                viewType === 'overview' 
                                    ? 'bg-orange-500 text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
                            }`}
                        >
                            <i className="fas fa-chart-bar mr-1"></i>
                            {lang === 'ar' ? 'نظرة عامة' : 'Overview'}
                        </button>
                        <button
                            onClick={() => setViewType('supervisors')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                viewType === 'supervisors' 
                                    ? 'bg-orange-500 text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
                            }`}
                            disabled={selectedProject === 'all'}
                        >
                            <i className="fas fa-users mr-1"></i>
                            {lang === 'ar' ? 'المشرفين' : 'Supervisors'}
                        </button>
                    </div>

                    {/* Chart Type Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                        <button
                            onClick={() => setChartType('bar')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                chartType === 'bar' 
                                    ? 'bg-orange-500 text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
                            }`}
                        >
                            <i className="fas fa-chart-bar mr-1"></i>
                            {lang === 'ar' ? 'أعمدة' : 'Bar'}
                        </button>
                        <button
                            onClick={() => setChartType('pie')}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                chartType === 'pie' 
                                    ? 'bg-orange-500 text-white shadow-sm' 
                                    : 'text-gray-600 dark:text-gray-300 hover:text-orange-600'
                            }`}
                        >
                            <i className="fas fa-chart-pie mr-1"></i>
                            {lang === 'ar' ? 'دائري' : 'Pie'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chart */}
            <div className="h-96">
                {viewType === 'overview' && (
                    <>
                        {chartType === 'bar' && (
                            <BarChart 
                                title={lang === 'ar' ? 'توزيع القوى العاملة حسب النوع' : 'Manpower Distribution by Type'}
                                data={projectBarChartData}
                            />
                        )}
                        {chartType === 'pie' && (
                            <PieChart 
                                title={lang === 'ar' ? 'توزيع القوى العاملة حسب النوع' : 'Manpower Distribution by Type'}
                                data={projectBarChartData}
                                translations={{
                                    vehicles: lang === 'ar' ? 'الأفراد' : 'People',
                                    total: lang === 'ar' ? 'المجموع' : 'Total',
                                    showDetails: lang === 'ar' ? 'إظهار التفاصيل' : 'Show Details',
                                    hideDetails: lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details',
                                    editServiceTypeTitle: lang === 'ar' ? 'تعديل النوع' : 'Edit Type'
                                }}
                            />
                        )}
                    </>
                )}

                {viewType === 'supervisors' && selectedProject !== 'all' && (
                    <>
                        {chartType === 'bar' && (
                            <BarChart 
                                title={lang === 'ar' ? 'القوى العاملة حسب المشرف' : 'Workforce by Supervisor'}
                                data={supervisorChartData}
                            />
                        )}
                        {chartType === 'pie' && (
                            <PieChart 
                                title={lang === 'ar' ? 'القوى العاملة حسب المشرف' : 'Workforce by Supervisor'}
                                data={supervisorChartData}
                                translations={{
                                    vehicles: lang === 'ar' ? 'الأفراد' : 'People',
                                    total: lang === 'ar' ? 'المجموع' : 'Total',
                                    showDetails: lang === 'ar' ? 'إظهار التفاصيل' : 'Show Details',
                                    hideDetails: lang === 'ar' ? 'إخفاء التفاصيل' : 'Hide Details',
                                    editServiceTypeTitle: lang === 'ar' ? 'تعديل النوع' : 'Edit Type'
                                }}
                            />
                        )}
                    </>
                )}

                {viewType === 'supervisors' && selectedProject === 'all' && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <i className="fas fa-info-circle text-6xl text-gray-400 mb-4"></i>
                            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">
                                {lang === 'ar' ? 'اختر مشروعاً محدداً' : 'Select a specific project'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                                {lang === 'ar' 
                                    ? 'لعرض تفاصيل المشرفين، يرجى اختيار مشروع محدد من القائمة أعلاه'
                                    : 'To view supervisor details, please select a specific project from the dropdown above'
                                }
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                {[
                    { 
                        label: lang === 'ar' ? 'المشرفين' : 'Supervisors', 
                        value: filteredData.overallStats.totalSupervisors, 
                        color: 'blue',
                        icon: 'fa-user-tie'
                    },
                    { 
                        label: lang === 'ar' ? 'رؤساء العمال' : 'Foremen', 
                        value: filteredData.overallStats.totalForemen, 
                        color: 'green',
                        icon: 'fa-users-cog'
                    },
                    { 
                        label: lang === 'ar' ? 'العمال' : 'Labour', 
                        value: filteredData.overallStats.totalLabour, 
                        color: 'yellow',
                        icon: 'fa-hard-hat'
                    },
                    { 
                        label: lang === 'ar' ? 'الضباط' : 'Officers', 
                        value: filteredData.overallStats.totalOfficers, 
                        color: 'purple',
                        icon: 'fa-user-graduate'
                    },
                    { 
                        label: lang === 'ar' ? 'أفراد الطاقم' : 'Crew', 
                        value: filteredData.overallStats.totalCrewmen, 
                        color: 'pink',
                        icon: 'fa-users'
                    },
                    { 
                        label: lang === 'ar' ? 'عمال المخيم' : 'Camp Labour', 
                        value: filteredData.overallStats.totalCampLabour, 
                        color: 'red',
                        icon: 'fa-campground'
                    }
                ].map((stat, index) => (
                    <div key={index} className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-center mb-2">
                            <i className={`fas ${stat.icon} text-lg text-gray-600 dark:text-gray-400`}></i>
                        </div>
                        <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">
                            {stat.value}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                            {stat.label}
                        </div>
                        {totalManpower > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                {((stat.value / totalManpower) * 100).toFixed(1)}%
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Supervisor Details Table - Only show when viewing supervisors */}
            {viewType === 'supervisors' && selectedProject !== 'all' && filteredData.supervisorData.length > 0 && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
                        {lang === 'ar' ? 'تفاصيل المشرفين' : 'Supervisor Details'}
                    </h4>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {lang === 'ar' ? 'اسم المشرف' : 'Supervisor Name'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {lang === 'ar' ? 'رؤساء العمال' : 'Foremen'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {lang === 'ar' ? 'العمال' : 'Labour'}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        {lang === 'ar' ? 'المجموع' : 'Total'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {filteredData.supervisorData.map((supervisor, index) => (
                                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                            <div className="flex items-center">
                                                <i className="fas fa-user-tie mr-2 text-orange-500"></i>
                                                {supervisor.supervisorName}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                                                <i className="fas fa-users-cog mr-1"></i>
                                                {supervisor.foremenCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
                                                <i className="fas fa-hard-hat mr-1"></i>
                                                {supervisor.labourCount}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-200">
                                                <i className="fas fa-users mr-1"></i>
                                                {supervisor.totalUnderSupervisor}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenpowerChart;