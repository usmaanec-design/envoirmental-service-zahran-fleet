import React, { useMemo } from 'react';
import type { User, Language } from '../../types';
import { TRANSLATIONS } from '../../constants';

interface WelcomePageProps {
  user: User;
  lang: Language;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ user, lang }) => {
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful building background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/building-background.jpg')",
          backgroundPosition: 'center center',
          backgroundSize: 'cover'
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/60 via-green-900/50 to-orange-800/60"></div>
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      
      {/* Welcome content overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="text-center animate-fade-in-scale-up">
          {/* Welcome container with glass effect */}
          <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-12 max-w-4xl mx-auto">
            {/* Company logo or icon */}
            <div className="mb-8">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                <i className="fas fa-building text-3xl text-white"></i>
              </div>
            </div>
            
            {/* Welcome message */}
            <h1 className="text-6xl font-bold text-white drop-shadow-lg mb-4 animate-float">
              {t.welcome}
            </h1>
            
            {/* Project name with special styling */}
            <div className="mb-8">
              <p className="text-4xl text-transparent bg-gradient-to-r from-orange-300 via-green-300 to-orange-300 bg-clip-text font-bold drop-shadow-lg">
                {user.projectName}
              </p>
            </div>
            
            {/* Welcome description */}
            <div className="mb-8">
              <p className="text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Welcome to your comprehensive fleet management system. 
                Monitor vehicles, track incidents, and manage your operations efficiently.
              </p>
            </div>
            
            {/* Loading indicator */}
            <div className="flex justify-center items-center space-x-3">
              <div className="animate-pulse">
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
              <span className="text-white/80 text-lg font-medium ml-4">Loading your dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;