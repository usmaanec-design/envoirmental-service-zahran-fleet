import React, { useMemo, useState, useEffect } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, HistoryEvent } from '../types';

interface RecentActivityPageProps {
    lang: Language;
    history: (HistoryEvent & { projectName?: string })[];
    isAdmin: boolean;
    getTranslatedProjectName: (projectName: string) => string;
    onClearHistory: () => void;
}

const RecentActivityPage: React.FC<RecentActivityPageProps> = ({ lang, history, isAdmin, getTranslatedProjectName, onClearHistory }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [showClearNotification, setShowClearNotification] = useState(false);

    useEffect(() => {
        // When the component mounts or dependencies change, if the user is an admin
        // and there's history, set the flag to show the notification.
        if (isAdmin && history.length > 0) {
            setShowClearNotification(true);
        } else {
            setShowClearNotification(false);
        }

        // Return a cleanup function that will be called when the component unmounts
        // or before the effect runs again.
        return () => {
            if (isAdmin && history.length > 0) {
                console.log("Navigating away from activity log as admin. Clearing history.");
                onClearHistory();
            }
        };
    }, [isAdmin, history, onClearHistory]); // Dependencies ensure the effect re-runs and captures latest props

    const eventIcons = {
        CREATED: { icon: 'fa-plus', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/50' },
        UPDATED: { icon: 'fa-pencil-alt', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/50' },
        DELETED: { icon: 'fa-trash-alt', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/50' },
        ASSIGNED: { icon: 'fa-user-check', color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-100 dark:bg-sky-900/50' },
        UNASSIGNED: { icon: 'fa-user-minus', color: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-100 dark:bg-yellow-900/50' },
        TRANSFERRED: { icon: 'fa-exchange-alt', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-900/50' },
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-5xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-8">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.recentActivityPageTitle}</h2>
            </header>

            {showClearNotification && (
                <div className="bg-yellow-100 dark:bg-yellow-900/50 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-200 p-4 mb-6 rounded-r-lg" role="alert">
                    <p className="font-bold">{t.activityLogWillBeCleared}</p>
                </div>
            )}

            {history.length > 0 ? (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {history.map((item, index) => (
                        <li key={`${item.timestamp}-${index}`} className="py-4 flex items-start space-x-4 rtl:space-x-reverse">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full flex-shrink-0 ${eventIcons[item.eventType].bg} ${eventIcons[item.eventType].color}`}>
                                <i className={`fas ${eventIcons[item.eventType].icon}`}></i>
                            </div>
                            <div className="flex-grow">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t[`event_${item.eventType}` as keyof typeof t]}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">{item.details}</p>
                                <div className="flex justify-between items-center mt-1">
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(item.timestamp).toLocaleString('en-US')}</p>
                                    {isAdmin && item.projectName && (
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                                            {getTranslatedProjectName(item.projectName)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <div className="text-center py-16 text-gray-500 dark:text-gray-400">
                    <i className="fas fa-history text-4xl mb-4"></i>
                    <p className="text-lg">{t.noRecentActivity}</p>
                </div>
            )}
        </div>
    );
};

export default RecentActivityPage;