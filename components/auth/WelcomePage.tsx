import React, { useState, useEffect, useMemo } from 'react';
import type { User, Language, Page } from '../../types';
import { TRANSLATIONS, BANNER_IMAGES } from '../../constants';

interface WelcomePageProps {
  user: User;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onNavigate: (page: Page) => void;
  onLogout: () => void;
}

const BACKGROUND_IMAGES = BANNER_IMAGES;

const WelcomePage: React.FC<WelcomePageProps> = ({ 
  user, 
  lang, 
  onLanguageChange, 
  onNavigate, 
  onLogout 
}) => {
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Background smooth slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % BACKGROUND_IMAGES.length);
    }, 5000); // 5 seconds per background slide
    return () => clearInterval(timer);
  }, []);

  const getTranslatedProjectName = (projectName: string): string => {
    if (lang !== 'ar' || !projectName) return projectName;
    const key = `projectName_${projectName.replace(/ /g, '_')}` as keyof typeof t;
    return t[key] || projectName;
  };

  // User Grid Cards (matching example photo exactly)
  const userCards = useMemo(() => [
    { title: t.dashboard || 'Dashboard', page: 'dashboard' as Page, icon: 'fa-home', color: 'bg-blue-500' },
    { title: t.addMenpower || 'Add Menpower', page: 'addMenpower' as Page, icon: 'fa-user-plus', color: 'bg-purple-600' },
    { title: t.menpowerOverview || 'Menpower Overview', page: 'menpowerOverview' as Page, icon: 'fa-th-large', color: 'bg-emerald-500' },
    { title: lang === 'ar' ? 'تعيين القوى العاملة' : 'Assign Manpower', page: 'manpowerAssign' as Page, icon: 'fa-user-check', color: 'bg-pink-500' },
    { title: t.addVehicle || 'Add Vehicle', page: 'addVehicle' as Page, icon: 'fa-car', color: 'bg-cyan-500' },

    { title: t.viewVehicles || 'View Vehicles', page: 'viewVehicles' as Page, icon: 'fa-list-ul', color: 'bg-orange-500' },
    { title: t.addDriver || 'Add Driver', page: 'addDriver' as Page, icon: 'fa-id-card', color: 'bg-teal-500' },
    { title: t.viewDrivers || 'View Drivers', page: 'viewDrivers' as Page, icon: 'fa-users', color: 'bg-red-500' },
    { title: t.transferVehicle || 'Transfer Vehicle', page: 'transferVehicle' as Page, icon: 'fa-exchange-alt', color: 'bg-indigo-500' },
    { title: t.reportIncident || 'Report Incident', page: 'reportIncident' as Page, icon: 'fa-car-crash', color: 'bg-amber-500' },

    { title: t.vehicleHistory || 'Vehicle History', page: 'vehicleHistory' as Page, icon: 'fa-history', color: 'bg-slate-700' },
    { title: t.settings || 'Settings', page: 'settings' as Page, icon: 'fa-cog', color: 'bg-emerald-600' },
    { title: t.logout || 'Logout', action: 'logout', icon: 'fa-sign-out-alt', color: 'bg-blue-600' },
  ], [t, lang]);

  // Admin Grid Cards
  const adminCards = useMemo(() => [
    { title: t.adminDashboard || 'Admin Dashboard', page: 'adminDashboard' as Page, icon: 'fa-home', color: 'bg-blue-500' },
    { title: t.adminAllVehicles || 'All Vehicles', page: 'adminAllVehicles' as Page, icon: 'fa-car-side', color: 'bg-orange-500' },
    { title: t.adminAllDrivers || 'All Drivers', page: 'adminAllDrivers' as Page, icon: 'fa-id-card', color: 'bg-teal-500' },
    { title: t.adminAllProjects || 'All Projects', page: 'adminAllProjects' as Page, icon: 'fa-list-alt', color: 'bg-green-600' },
    { title: t.adminAllMenpowerReport || 'Manpower Reports', page: 'adminAllMenpowerReport' as Page, icon: 'fa-users-cog', color: 'bg-purple-600' },

    { title: t.totalSupervisors || 'All Supervisors', page: 'adminAllMenpower' as Page, icon: 'fa-user-tie', color: 'bg-amber-500' },
    { title: t.adminAllIncidents || 'All Incidents', page: 'adminAllIncidents' as Page, icon: 'fa-exclamation-triangle', color: 'bg-red-500' },
    { title: t.adminTransferLog || 'Transfer Log', page: 'adminTransferLog' as Page, icon: 'fa-route', color: 'bg-indigo-500' },
    { title: t.settings || 'Settings', page: 'settings' as Page, icon: 'fa-cog', color: 'bg-emerald-600' },
    { title: t.logout || 'Logout', action: 'logout', icon: 'fa-sign-out-alt', color: 'bg-blue-600' },
  ], [t]);

  const cards = user.isAdmin ? adminCards : userCards;

  const handleCardClick = (item: any) => {
    if (item.action === 'logout') {
      onLogout();
    } else if (item.page) {
      onNavigate(item.page);
    }
  };

  return (
    <div className={`min-h-screen w-full relative overflow-x-hidden overflow-y-auto flex flex-col justify-between select-none ${lang === 'ar' ? 'rtl' : 'ltr'}`}>
      
      {/* Background Slideshow Images */}
      <div className="fixed inset-0 z-0 overflow-hidden bg-black">
        {BACKGROUND_IMAGES.map((imagePath, index) => (
          <div
            key={imagePath}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out transform scale-105 ${
              index === currentImageIndex ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: `url("${encodeURI(imagePath)}")` }}
          />
        ))}
        {/* Warm Cinematic Dark Overlay for Maximum Legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/75" />
      </div>

      {/* Top Bar Navigation: Language & Logout */}
      <header className="relative z-10 w-full p-4 sm:p-6 flex justify-end items-center gap-3">
        {/* Language Switcher */}
        <button
          onClick={() => onLanguageChange(lang === 'en' ? 'ar' : 'en')}
          className="bg-white/90 hover:bg-white text-gray-800 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 active:scale-95"
          title="Change Language"
        >
          <i className="fas fa-globe text-orange-600"></i>
          <span>{lang === 'en' ? 'AR' : 'EN'}</span>
        </button>

        {/* Logout Quick Button */}
        <button
          onClick={onLogout}
          className="bg-red-500/90 hover:bg-red-600 text-white text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 rounded-full shadow-lg hover:shadow-xl flex items-center gap-2 transition-all duration-200 transform hover:scale-105 active:scale-95"
          title={t.logout}
        >
          <i className="fas fa-sign-out-alt"></i>
          <span>{lang === 'ar' ? 'خروج' : 'Logout'}</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-4 py-6 max-w-6xl mx-auto w-full">
        
        {/* Center Company Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-black/80 border-2 border-orange-500 shadow-2xl flex items-center justify-center mb-3 transform hover:scale-105 transition-transform duration-300">
            <img 
              src="/images/company-logo.jpeg" 
              alt="Zahran Logo" 
              className="w-full h-full object-contain rounded-full"
            />
          </div>

          {/* Welcome User / Admin Title */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide drop-shadow-lg text-center">
            Welcome{' '}
            <span className="text-orange-400">
              {user.isAdmin ? (lang === 'ar' ? 'المدير' : 'Admin') : (lang === 'ar' ? 'المستخدم' : 'User')}
            </span>
          </h1>

          {/* Project Name Subtitle */}
          <p className="text-sm sm:text-base font-semibold text-gray-200 drop-shadow mt-1 text-center max-w-md">
            {user.isAdmin 
              ? (lang === 'ar' ? 'لوحة تحكم النظام الشاملة' : 'Environmental Services Zahran Fleet - Admin Portal') 
              : (getTranslatedProjectName(user.projectName) || user.projectName)
            }
          </p>
        </div>

        {/* Buttons Grid View (Exactly like example photo) */}
        <div className="w-full flex justify-center">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 max-w-4xl justify-items-center">
            {cards.map((item, index) => (
              <button
                key={index}
                onClick={() => handleCardClick(item)}
                className="w-32 h-32 sm:w-36 sm:h-36 bg-white/95 hover:bg-white text-gray-800 rounded-2xl shadow-xl hover:shadow-2xl flex flex-col items-center justify-center p-3 text-center transition-all duration-200 transform hover:scale-105 active:scale-95 group focus:outline-none focus:ring-2 focus:ring-orange-400"
              >
                {/* Colorful Square Icon */}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white shadow-md ${item.color} mb-2 group-hover:scale-110 transition-transform duration-200`}>
                  <i className={`fas ${item.icon} text-lg sm:text-xl`}></i>
                </div>

                {/* Button Label */}
                <span className="text-[11px] sm:text-xs font-bold text-gray-800 group-hover:text-orange-600 transition-colors line-clamp-2 leading-snug px-1">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-white/70 font-medium">
        © 2025 Zahran Operation & Maintenance
      </footer>

    </div>
  );
};

export default WelcomePage;