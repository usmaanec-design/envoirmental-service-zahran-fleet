import React from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';

interface HeaderProps {
  lang: Language;
  onToggleSidebar: () => void;
  isViewingProjectAsAdmin: boolean;
  projectName: string;
  onReturnToAdminDashboard: () => void;
  onGoToPortal?: () => void;
}

const Header: React.FC<HeaderProps> = ({ lang, onToggleSidebar, isViewingProjectAsAdmin, projectName, onReturnToAdminDashboard, onGoToPortal }) => {
  const t = TRANSLATIONS[lang];
  return (
    <header className="bg-orange-500 text-white shadow-md flex-shrink-0 z-30">
      <div className="flex items-center justify-between p-4 h-16">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
            {/* Sidebar Toggle Button */}
            <button
              onClick={onToggleSidebar}
              className="p-2 rounded-md hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20"
              title={lang === 'ar' ? 'فتح/إغلاق الشريط الجانبي' : 'Toggle Sidebar'}
            >
              <i className="fas fa-bars text-xl"></i>
            </button>

            {/* Portal Hub Launcher Button */}
            {onGoToPortal && (
              <button
                onClick={onGoToPortal}
                className="p-2 rounded-md hover:bg-white/10 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/20 flex items-center gap-1 text-sm font-semibold"
                title={lang === 'ar' ? 'بوابة الخدمات الرئيسية' : 'Portal Hub'}
              >
                <i className="fas fa-th text-lg"></i>
              </button>
            )}

            <h1 className="text-xl font-bold tracking-wider hidden sm:block">
                {t.appName}
            </h1>
        </div>
        
        {/* Zahran Logo - Right Side */}
        <div className="flex items-center">
          <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center bg-white/10 border border-white/30">
            <img 
              src="/images/company-logo.jpeg" 
              alt="Zahran Fleet" 
              className="w-10 h-10 object-contain rounded-full" 
              style={{ filter: 'brightness(1.1) contrast(1.1)' }}
              onError={(e) => {
                const target = e.currentTarget;
                target.src = "data:image/svg+xml,%3Csvg viewBox='0 0 200 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3ClinearGradient id='orangeGrad' x1='0%25' y1='0%25' x2='100%25' y2='0%25'%3E%3Cstop offset='0%25' style='stop-color:%23ff6b35;stop-opacity:1' /%3E%3Cstop offset='100%25' style='stop-color:%23ff8c42;stop-opacity:1' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='200' height='120' fill='%23000000'/%3E%3Cpath d='M20,30 Q40,10 60,30 Q80,50 100,30 Q120,10 140,30' stroke='url(%23orangeGrad)' stroke-width='6' fill='none'/%3E%3Cpath d='M20,45 Q40,25 60,45 Q80,65 100,45 Q120,25 140,45' stroke='url(%23orangeGrad)' stroke-width='6' fill='none'/%3E%3Cpath d='M20,60 Q40,40 60,60 Q80,80 100,60 Q120,40 140,60' stroke='url(%23orangeGrad)' stroke-width='6' fill='none'/%3E%3C/svg%3E";
              }}
            />
          </div>
        </div>
      </div>

      {isViewingProjectAsAdmin && (
        <div className="bg-orange-200 border-t border-orange-400 text-orange-900 p-2 px-4 flex justify-between items-center text-sm">
          <p>
              Viewing dashboard for: <span className="font-bold">{projectName}</span>
          </p>
          <button onClick={onReturnToAdminDashboard} className="font-bold hover:underline text-orange-900 hover:text-orange-700">
              Return to Admin Dashboard
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
