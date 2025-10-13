import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../constants';
import type { Language, Theme, User } from '../types';
import FormSection from './ui/FormSection';
import ProjectPasswordManager from './ProjectPasswordManager';

interface SettingsPageProps {
    lang: Language;
    onLanguageChange: (lang: Language) => void;
    theme: Theme;
    onThemeChange: (theme: Theme) => void;
    // Admin props - optional
    user?: User;
    allUsers?: User[];
    onUpdateUserPassword?: (email: string, newPassword: string) => Promise<void>;
    onUpdateAllPasswords?: (newPassword: string) => Promise<void>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
    lang, 
    onLanguageChange, 
    theme, 
    onThemeChange,
    user,
    allUsers,
    onUpdateUserPassword,
    onUpdateAllPasswords
}) => {
    const t = useMemo(() => TRANSLATIONS[lang], [lang]);

    const getLangButtonClasses = (buttonLang: Language) => {
        const baseClasses = "px-8 py-3 w-full sm:w-auto text-lg font-semibold rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4";
        if (lang === buttonLang) {
            return `${baseClasses} bg-blue-600 text-white shadow-lg focus:ring-blue-300 cursor-default`;
        }
        return `${baseClasses} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-gray-200 dark:focus:ring-gray-500`;
    };
    
    const getThemeButtonClasses = (buttonTheme: Theme) => {
        const baseClasses = "px-6 py-3 w-full sm:w-auto text-lg font-semibold rounded-lg transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 focus:outline-none focus:ring-4 flex items-center justify-center gap-3";
         if (theme === buttonTheme) {
            return `${baseClasses} bg-blue-600 text-white shadow-lg focus:ring-blue-300 cursor-default`;
        }
        return `${baseClasses} bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 focus:ring-gray-200 dark:focus:ring-gray-500`;
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
            <header className="border-b-2 border-blue-500 pb-6 mb-10">
                <h2 className="text-3xl font-bold text-blue-600 dark:text-blue-400">{t.settingsTitle}</h2>
            </header>

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

            {/* Admin Password Management Section */}
            {user?.isAdmin && allUsers && onUpdateUserPassword && onUpdateAllPasswords && (
                <FormSection title={t.adminPasswordSettings}>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">{t.managePasswordsDescription}</p>
                    <ProjectPasswordManager
                        lang={lang}
                        allUsers={allUsers}
                        onUpdateUserPassword={onUpdateUserPassword}
                        onUpdateAllPasswords={onUpdateAllPasswords}
                    />
                </FormSection>
            )}
        </div>
    );
};

export default SettingsPage;