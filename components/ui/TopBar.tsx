import React from 'react';

const TopBar: React.FC = () => {
  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-orange-700 via-orange-600 to-green-700 shadow-md border-b border-white/10">
      <div className="flex items-center justify-between px-4 sm:px-6 py-1.5">
        {/* Left side - Company name */}
        <div className="flex items-center space-x-2 sm:space-x-3 rtl:space-x-reverse">
          <div className="text-white font-bold text-sm sm:text-base hidden sm:block">
            Environmental Services Zahran Fleet
          </div>
          <div className="text-white font-bold text-xs sm:hidden">
            ES Zahran Fleet
          </div>
        </div>

        {/* Center - Empty space */}
        <div className="flex-1"></div>
        
        {/* Right side - Company Logo */}
        <div className="flex items-center">
          <div className="transform hover:scale-105 transition-transform duration-300">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-orange-500/70 rounded-full p-0.5">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Company Logo" 
                className="w-full h-full object-contain rounded-full opacity-85"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Subtle drop shadow effect */}
      <div className="absolute inset-x-0 top-full h-2 bg-gradient-to-b from-black/10 to-transparent pointer-events-none"></div>
    </div>
  );
};

export default TopBar;