import React, { useMemo, useEffect, useState } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Theme, User } from '../types';
import FormSection from './ui/FormSection';
import * as fb from '../firebase/service';

interface SettingsPageProps {
    lang: Language;
    onLanguageChange: (lang: Language) => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    currentUser?: User;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ lang, onLanguageChange, theme, onThemeChange, currentUser }) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Load all users if current user is admin
    useEffect(() => {
        if (currentUser?.isAdmin) {
            const loadUsers = async () => {
                try {
                    setLoadingUsers(true);
                    console.log('🔧 Loading all users for admin settings');
                    const users = await fb.getAllUsers();
                    console.log('🔧 Users loaded:', users);
                    console.log('🔧 Unique emails:', [...new Set(users.map(u => u.email))]);
                    
                    // Remove duplicates based on email
                    const uniqueUsers = users.filter((user, index, self) => 
                        index === self.findIndex(u => u.email === user.email)
                    );
                    console.log('🔧 Filtered unique users:', uniqueUsers);
                    
                    setAllUsers(uniqueUsers);
                } catch (error) {
                    console.error('❌ Error loading users:', error);
                } finally {
                    setLoadingUsers(false);
                }
            };
            loadUsers();
        }
    }, [currentUser]);

    const copyToClipboard = async (text: string) => {
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                console.log('📋 Copied to clipboard:', text);
                return;
            }
            
            // Fallback method for older browsers or non-HTTPS
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                console.log('📋 Copied to clipboard (fallback):', text);
            } catch (err) {
                console.error('❌ Fallback copy failed:', err);
                // Show the text in an alert as last resort
                alert(`Copy this text: ${text}`);
            } finally {
                document.body.removeChild(textArea);
            }
        } catch (error) {
            console.error('❌ Failed to copy:', error);
            // Show the text in an alert as last resort
            alert(`Copy this text: ${text}`);
        }
    };

    const getLangButtonClasses = (buttonLang: Language) => {
        const baseClasses = "px-5 py-2.5 w-full sm:w-auto text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm cursor-pointer focus:outline-none focus:ring-2 flex items-center justify-center gap-2";
        if (lang === buttonLang) {
            return `${baseClasses} bg-orange-600 text-white focus:ring-orange-400 cursor-default`;
        }
        return `${baseClasses} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-gray-300`;
    };
    
    const getThemeButtonClasses = (buttonTheme: Theme) => {
        const baseClasses = "px-5 py-2.5 w-full sm:w-auto text-sm font-semibold rounded-lg transition-all duration-200 shadow-sm cursor-pointer focus:outline-none focus:ring-2 flex items-center justify-center gap-2";
         if (theme === buttonTheme) {
            return `${baseClasses} bg-orange-600 text-white focus:ring-orange-400 cursor-default`;
        }
        return `${baseClasses} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-gray-300`;
    };

    return (
        <div className="w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700 p-4 sm:p-6 transition-all duration-200">
            <div className="flex flex-wrap justify-between items-center mb-5 pb-4 border-b border-gray-100 dark:border-gray-700 gap-4">
                <h2 className="text-2xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{t.settingsTitle}</h2>
            </div>

            <FormSection title={t.languageSettings}>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{t.chooseLanguage}</p>
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                        onClick={() => onLanguageChange('en')}
                        className={getLangButtonClasses('en')}
                        aria-pressed={lang === 'en'}
                    >
                        <span role="img" aria-label="USA flag" className="me-2">🇬🇧</span> {t.english}
                    </button>
                    <button
                        onClick={() => onLanguageChange('ar')}
                        className={getLangButtonClasses('ar')}
                        aria-pressed={lang === 'ar'}
                    >
                         <span role="img" aria-label="Saudi Arabia flag" className="me-2">🇸🇦</span> {t.arabic}
                    </button>
                </div>
            </FormSection>
            
            <FormSection title={t.themeSettings}>
                 <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                    <button
                        onClick={() => onThemeChange('light')}
                        className={getThemeButtonClasses('light')}
                        aria-pressed={theme === 'light'}
                    >
                        <i className="fas fa-sun"></i> {t.lightMode}
                    </button>
                    <button
                        onClick={() => onThemeChange('dark')}
                        className={getThemeButtonClasses('dark')}
                        aria-pressed={theme === 'dark'}
                    >
                        <i className="fas fa-moon"></i> {t.darkMode}
                    </button>
                </div>
            </FormSection>

            {/* Admin Project Credentials Section */}
            {currentUser?.isAdmin && (
                <FormSection title="Project Credentials">
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        All registered project login credentials
                    </p>
                    {loadingUsers ? (
                        <div className="text-center py-8">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading project credentials...</p>
                        </div>
                    ) : allUsers.length > 0 ? (
                        <div className="space-y-4">
                            {allUsers.map((user, index) => (
                                <div 
                                    key={`${user.email}-${index}`} 
                                    className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                                >
                                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                                                    Project #{index + 1}
                                                </span>
                                                {user.isAdmin && (
                                                    <span className="bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded text-xs font-medium">
                                                        Admin
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                                                {user.projectName}
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                Manager: {user.projectManagerName}
                                            </p>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:w-96">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Email
                                                </label>
                                                <div className="flex items-center bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                                                    <input
                                                        type="text"
                                                        value={user.email}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(user.email)}
                                                        className="px-3 py-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                                                        title="Copy email"
                                                    >
                                                        <i className="fas fa-copy text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Password
                                                </label>
                                                <div className="flex items-center bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
                                                    <input
                                                        type="text"
                                                        value={user.password}
                                                        readOnly
                                                        className="flex-1 px-3 py-2 text-sm bg-transparent border-none outline-none font-mono"
                                                    />
                                                    <button
                                                        onClick={() => copyToClipboard(user.password)}
                                                        className="px-3 py-2 text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
                                                        title="Copy password"
                                                    >
                                                        <i className="fas fa-copy text-xs"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <i className="fas fa-users text-4xl text-gray-400 dark:text-gray-600 mb-3"></i>
                            <p className="text-gray-600 dark:text-gray-400">
                                No project credentials found in database
                            </p>
                        </div>
                    )}
                </FormSection>
            )}
        </div>
    );
};

export default SettingsPage;