import React, { useMemo, useState } from 'react';
import { NAV_LINKS, TRANSLATIONS } from '../constants';
import type { Page, Language, NavLink } from '../types';

interface SidebarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    currentLang?: Language;
    onLogout: () => void;
    isAdmin: boolean;
    isViewingProject: boolean;
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, currentLang = 'en', onLogout, isAdmin, isViewingProject, isOpen, onClose }) => {
  const t = TRANSLATIONS[currentLang];
  const [isHovered, setIsHovered] = useState(false);

  const visibleNavLinks = useMemo(() => {
    if (!isAdmin) {
      // Regular user: show everything except adminOnly links
      return NAV_LINKS.filter(link => !link.adminOnly);
    }
    
    // Admin view
    if (isViewingProject) {
      // Admin viewing a specific project: hide forms for adding/editing
      const adminProjectViewHiddenKeys: Array<NavLink['labelKey']> = ['addVehicle', 'addDriver', 'reportIncident', 'transferVehicle', 'addSupervisor', 'addProjectOfficers'];
      return NAV_LINKS.filter(link => !link.adminOnly && !adminProjectViewHiddenKeys.includes(link.labelKey));
    } else {
      // Admin root dashboard: show only dashboard, admin reports, settings, logout
      return NAV_LINKS.filter(link => 
          link.labelKey === 'dashboard' || 
          link.adminOnly ||
          link.labelKey === 'settings' ||
          link.labelKey === 'logout'
      );
    }
  }, [isAdmin, isViewingProject]);

  const handleLinkClick = (page: Page | 'logout' | 'adminDashboard') => {
      if (page === 'logout') {
          onLogout();
      } else {
          onNavigate(page as Page);
      }
      onClose(); // Always close on mobile after an action
  };
  
  
  const renderLink = (link: NavLink) => {
    if (link.type === 'header') {
      const label = t[link.labelKey as keyof typeof t] || 'Menu';
      return (
         <li key={link.labelKey} className={`px-3 pt-4 pb-2 transition-all duration-300 ${isHovered ? 'px-6' : 'px-3'}`}>
           <div className={`text-xs font-semibold tracking-wider text-gray-400 uppercase transition-all duration-300 ${
             isHovered ? 'opacity-100' : 'opacity-0 lg:opacity-0'
           }`}>
             {isHovered && label}
           </div>
        </li>
      );
    }

    const isLogout = link.labelKey === 'logout';
    const isDashboard = link.labelKey === 'dashboard';

    let targetPage: Page | 'logout' | 'adminDashboard' = link.labelKey as Page;
    if (isDashboard && isAdmin && !isViewingProject) {
      targetPage = 'adminDashboard';
    }
    
    const isActive = currentPage === targetPage;

    return (
      <li key={link.labelKey} className="group">
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleLinkClick(targetPage); }}
          className={`flex items-center py-3 px-3 mx-2 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
            isActive
              ? 'bg-orange-600 text-white shadow-lg'
              : 'text-gray-300 hover:bg-green-700 hover:text-white'
          }`}
        >
          {/* Icon Container */}
          <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
            <i className={`${link.icon} text-lg transition-all duration-300`}></i>
          </div>
          
          {/* Text Label - slides in from right when expanded */}
          <div className={`ml-4 whitespace-nowrap transition-all duration-300 ease-out ${
            isHovered 
              ? 'opacity-100 translate-x-0' 
              : 'opacity-0 -translate-x-4 lg:opacity-0 lg:-translate-x-4'
          }`}>
            <span className="font-medium">
              { targetPage === 'adminDashboard'
                  ? t.adminDashboard
                  : t[link.labelKey as keyof typeof t]
              }
            </span>
          </div>

          {/* Tooltip for collapsed state */}
          {!isHovered && (
            <div className="absolute left-full ml-3 bg-gray-800 text-white text-sm px-3 py-2 rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50 shadow-xl border border-gray-700">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-1 w-2 h-2 bg-gray-800 rotate-45 border-l border-b border-gray-700"></div>
              { targetPage === 'adminDashboard'
                  ? t.adminDashboard
                  : t[link.labelKey as keyof typeof t]
              }
            </div>
          )}
        </a>
      </li>
    );
  }

  const SidebarContent = () => (
    <>
      {/* Close button for mobile - only show when expanded */}
      {isHovered && (
        <div className="flex items-center justify-end p-3 border-b border-green-600 lg:hidden">
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close menu">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>
      )}
      
      {/* Navigation */}
      <nav className="flex-grow mt-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleNavLinks.map(renderLink)}
        </ul>
      </nav>
    </>
  );

  return (
    <>
      {/* Backdrop for Mobile */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-gradient-to-b from-green-800 to-green-900 text-white shadow-2xl transform transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:sticky lg:translate-x-0 lg:h-screen lg:flex-shrink-0`}
        style={{
          width: isHovered ? '280px' : '72px'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;