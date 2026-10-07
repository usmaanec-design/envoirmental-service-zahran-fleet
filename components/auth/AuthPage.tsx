import React, { useState } from 'react';
import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import ForgotPasswordPage from './ForgotPasswordPage';
import type { Language, User } from '../../types';

interface AuthPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSignUp: (user: User) => Promise<void>;
  lang?: Language;
  onLanguageChange?: (lang: Language) => void;
}

type AuthView = 'login' | 'signup' | 'forgot';

const AuthPage: React.FC<AuthPageProps> = ({ onLogin, onSignUp, lang = 'en', onLanguageChange }) => {
  const [view, setView] = useState<AuthView>('login');

  const renderView = () => {
    switch(view) {
      case 'signup':
        return <SignUpPage onSignUp={onSignUp} onSwitchToLogin={() => setView('login')} lang={lang} />;
      case 'forgot':
        return <ForgotPasswordPage onSwitchToLogin={() => setView('login')} />;
      case 'login':
      default:
        return <LoginPage 
                  onLogin={onLogin} 
                  onSwitchToSignUp={() => setView('signup')} 
                  onSwitchToForgotPassword={() => setView('forgot')}
                  initialLang={lang}
                  onLanguageChange={onLanguageChange}
                />;
    }
  }

  return (
    <div className="relative">
      {renderView()}
    </div>
  );
};

export default AuthPage;