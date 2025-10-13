import React from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';

interface HeaderProps {
  lang: Language;
  onToggleSidebar: () => void;
  isViewingProjectAsAdmin: boolean;
  projectName: string;
  onReturnToAdminDashboard: () => void;
}

const Header: React.FC<HeaderProps> = ({ lang, onToggleSidebar, isViewingProjectAsAdmin, projectName, onReturnToAdminDashboard }) => {
  const t = TRANSLATIONS[lang];
  return (
    <>
      <header className="sticky top-0 z-20 bg-white dark:bg-gray-800 shadow-sm lg:hidden">
        <div className="flex items-center justify-between p-4">
          <button onClick={onToggleSidebar} className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white focus:outline-none" aria-label="Open menu">
            <i className="fas fa-bars text-2xl"></i>
          </button>
          <div className="text-lg font-bold text-blue-500 dark:text-blue-400">
            {t.appName}
          </div>
          <div className="w-8"></div> {/* Spacer */}
        </div>
      </header>
      {isViewingProjectAsAdmin && (
        <div className="bg-yellow-100 dark:bg-yellow-900/50 border-b border-gray-200 dark:border-gray-700 lg:border-none lg:rounded-md lg:m-6 lg:mb-0 border-l-4 border-yellow-500 dark:border-yellow-400 text-yellow-800 dark:text-yellow-200 p-4 flex justify-between items-center text-sm sm:text-base">
          <p>
              Viewing dashboard for: <span className="font-bold">{projectName}</span>
          </p>
          <button onClick={onReturnToAdminDashboard} className="font-bold hover:underline">
              Return to Admin Dashboard
          </button>
        </div>
      )}
    </>
  );
};

export default Header;