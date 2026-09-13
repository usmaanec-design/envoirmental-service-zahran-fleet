import React, { useMemo } from 'react';
import { NAV_LINKS, TRANSLATIONS } from '../constants';
import type { Page, Language, NavLink } from '../types';

interface SidebarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    currentLang?: Language;
    onLogout: () => void;
    isAdmin: boolean;
    isViewingProject: boolean;
    isOpen: boolean; // For mobile overlay
    onClose: () => void; // For mobile overlay
    isCollapsed: boolean; // For desktop collapsed state
    onToggleCollapse: () => void; // For desktop toggle
}

const Sidebar: React.FC<SidebarProps> = ({ 
    currentPage, 
    onNavigate, 
    currentLang = 'en', 
    onLogout, 
    isAdmin, 
    isViewingProject, 
    isOpen, 
    onClose,
    isCollapsed,
    onToggleCollapse
}) => {
  const t = TRANSLATIONS[currentLang];

  const visibleNavLinks = useMemo(() => {
    if (!isAdmin) {
      // Regular user: show everything except adminOnly links
      return NAV_LINKS.filter(link => !link.adminOnly);
    }
    
    // Admin view
    if (isViewingProject) {
      // Admin viewing a specific project: hide forms for adding/editing
      const adminProjectViewHiddenKeys: Array<NavLink['labelKey']> = ['addVehicle', 'addDriver', 'reportIncident', 'transferVehicle', 'addMenpower', 'addProjectOfficers'];
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
      // On desktop, if the sidebar is collapsed, the first click on an icon should expand it.
      if (window.innerWidth >= 1024 && isCollapsed) {
          onToggleCollapse();
          return;
      }

      if (page === 'logout') {
          onLogout();
      } else {
          onNavigate(page as Page);
      }
      onClose(); // Always close on mobile after an action
  };
  
  const renderLink = (link: NavLink) => {
    const isDesktopCollapsed = isCollapsed && window.innerWidth >= 1024;
    
    if (link.type === 'header') {
      const label = t[link.labelKey as keyof typeof t] || 'Menu';
      return (
         <li key={link.labelKey} className={`pt-4 pb-2 text-xs font-semibold tracking-wider text-green-200 uppercase transition-all ${isDesktopCollapsed ? 'px-2 text-center' : 'px-8'}`}>
            {isDesktopCollapsed ? <i className={`fas fa-ellipsis-h`}></i> : label}
        </li>
      );
    }

    const isLogout = link.labelKey === 'logout';
    const isDashboard = link.labelKey === 'dashboard';
    const isVehicleReport = link.labelKey === 'adminAllVehicles';

    let targetPage: Page | 'logout' | 'adminDashboard' = link.labelKey as Page;
    if (isDashboard && isAdmin && !isViewingProject) {
      targetPage = 'adminDashboard';
    }
    
    const isActive = currentPage === targetPage;
    const labelText = targetPage === 'adminDashboard' ? t.adminDashboard : t[link.labelKey as keyof typeof t];

    // Button styling
    const getButtonStyles = () => {
      if (isActive) {
        return 'bg-orange-600 text-white shadow-lg';
      }
      return 'text-gray-300 hover:bg-orange-500 hover:text-white';
    };

    return (
      <li key={link.labelKey}>
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); handleLinkClick(targetPage); }}
          className={`flex items-center py-2 mx-2 rounded-md transition-all duration-200 cursor-pointer group ${getButtonStyles()} ${isDesktopCollapsed ? 'justify-center px-2' : 'px-6'}`}
          title={isDesktopCollapsed ? labelText : undefined}
        >
          <i className={`${link.icon} w-6 text-center text-lg`}></i>
          <span className={`ms-4 transition-opacity ${isDesktopCollapsed ? 'lg:hidden opacity-0' : 'opacity-100'}`}>
            {labelText}
          </span>
        </a>
      </li>
    );
  }

  const SidebarContent = () => (
    <>
      <nav className="flex-grow pt-4 overflow-y-auto sidebar-scrollbar max-h-screen">
        <ul className="space-y-0.5 pb-16">
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
        className={`sidebar-container fixed inset-y-0 left-0 z-40 flex flex-col bg-green-800 text-white shadow-lg transform transition-all duration-300 ease-in-out h-full
          ${isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64'} 
          lg:relative lg:translate-x-0 lg:transform-none lg:transition-all lg:duration-300 lg:flex-shrink-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        <SidebarContent />
      </div>
    </>
  );
};

export default Sidebar;