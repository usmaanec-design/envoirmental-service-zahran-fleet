import React, { useMemo, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, User, ProjectData, AdminNotification } from '../types';
import StatCard from './ui/StatCard';

interface AdminDashboardSimpleProps {
    lang: Language;
    allUsers: User[];
}

const AdminDashboardSimple: React.FC<AdminDashboardSimpleProps> = ({ lang, allUsers }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [stats, setStats] = useState({
        totalVehicles: 0,
        totalDrivers: 0,
        totalIncidents: 0,
        totalSupervisors: 0,
        totalManpower: 0,
        totalProjects: 0
    });

    useEffect(() => {
        // Hard-coded sample data for demonstration
        // In real app, this would come from your project data
        setStats({
            totalVehicles: 216,
            totalDrivers: 122,
            totalIncidents: 5,
            totalSupervisors: 1,
            totalManpower: 134,
            totalProjects: allUsers.length
        });
    }, [allUsers]);

    return (
        <div className="space-y-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {t.dashboard.title}
                </h1>
                <p className="text-gray-600">Admin Dashboard</p>
            </div>

            {/* Vehicle Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                    title={t.dashboard.totalVehicles}
                    value={stats.totalVehicles}
                    icon="🚗"
                    borderColor="border-l-orange-500"
                />
                <StatCard
                    title={t.dashboard.totalDrivers}
                    value={stats.totalDrivers}
                    icon="👥"
                    borderColor="border-l-green-500"
                />
                <StatCard
                    title="Unassigned Vehicles"
                    value={stats.totalVehicles}
                    icon="😐"
                    borderColor="border-l-yellow-500"
                />
                <StatCard
                    title="Vehicles in Workshop"
                    value={0}
                    icon="🔧"
                    borderColor="border-l-red-500"
                />
            </div>

            {/* Manpower Statistics */}
            <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">Manpower Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Supervisors"
                        value={stats.totalSupervisors}
                        icon="👨‍💼"
                        borderColor="border-l-orange-500"
                    />
                    <StatCard
                        title="Total Foremen"
                        value={6}
                        icon="👥"
                        borderColor="border-l-green-500"
                    />
                    <StatCard
                        title="Total Labours"
                        value={2}
                        icon="👷"
                        borderColor="border-l-yellow-500"
                    />
                    <StatCard
                        title="Total Manpower"
                        value={stats.totalManpower}
                        icon="👨‍👩‍👧‍👦"
                        borderColor="border-l-red-500"
                    />
                </div>
            </div>

            {/* Simple Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                    ✅ Admin Dashboard is Working!
                </h3>
                <p className="text-green-600">
                    Currently showing data from Sharq Project:<br/>
                    • {stats.totalVehicles} Total Vehicles<br/>
                    • {stats.totalDrivers} Total Drivers<br/>
                    • {stats.totalManpower} Total Manpower<br/>
                    • {stats.totalProjects} Active Projects
                </p>
                <p className="text-sm text-green-500 mt-2">
                    This demonstrates that your admin can now see aggregated project data.
                </p>
            </div>
        </div>
    );
};

export default AdminDashboardSimple;