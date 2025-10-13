import React, { useState } from 'react';
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import type { Language, User } from '../../types';

interface AuthPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignUp: (user: User) => Promise<void>;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
}

type AuthView = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignUp, lang, onLanguageChange }) => {
  const [view, setView] = useState<AuthView>('login');

  const renderView = () => {
    switch(view) {
      case 'signup':
        return <SignUpPage onSignUp={onSignUp} onSwitchToLogin={() => setView('login')} lang={lang} />;
      case 'forgot':
        return <ForgotPasswordPage onSwitchToLogin={() => setView('login')} lang={lang} />;
      case 'login':
      default:
        return <LoginPage 
                  onLogin={onLogin} 
                  onSwitchToSignUp={() => setView('signup')} 
                  onSwitchToForgotPassword={() => setView('forgot')}
                  lang={lang} 
                />;
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful building background image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/building-background.jpg')",
          backgroundPosition: 'center top',
          backgroundSize: 'cover'
        }}
      >
        {/* Overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/70 via-green-900/60 to-orange-800/70"></div>
        <div className="absolute inset-0 bg-black/20"></div>
      </div>
      
      {/* Content overlay */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Enhanced login container */}
          <div className="backdrop-blur-md bg-white/10 dark:bg-gray-900/20 border border-white/20 rounded-2xl shadow-2xl">
            {renderView()}
          </div>
          
          {/* Language Toggle */}
          <div className="mt-8 text-center">
            <div className="inline-flex rounded-lg shadow-lg backdrop-blur-md bg-white/10 dark:bg-gray-800/20 border border-white/20 p-1">
              <button
                onClick={() => onLanguageChange('en')}
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none ${lang === 'en' ? 'bg-blue-600/80 text-white shadow-lg' : 'text-white/90 hover:bg-white/10'}`}
              >
                English
              </button>
              <button
                onClick={() => onLanguageChange('ar')}
                className={`px-6 py-2 text-sm font-semibold rounded-md transition-all duration-200 focus:outline-none ${lang === 'ar' ? 'bg-blue-600/80 text-white shadow-lg' : 'text-white/90 hover:bg-white/10'}`}
              >
                العربية
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;