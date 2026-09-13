import React, { useMemo, useState } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onSwitchToLogin }) => {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-green-600"></div>
      
      {/* Background Pattern Overlay */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white/15 backdrop-blur-lg border border-white/30 rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in-down transform transition-all duration-500 hover:shadow-green-500/20 hover:shadow-3xl">
          <div className="text-center">
            <div className="flex-shrink-0 w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-orange-200/40 mb-4 shadow-lg transform transition-transform duration-300 hover:scale-110">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Zahran Fleet" 
                className="w-12 h-12 object-contain rounded-full shadow-sm"
                style={{ filter: 'brightness(1.2) contrast(1.1)' }}
              />
            </div>
            <h2 className="text-3xl font-bold text-white drop-shadow-2xl mb-2">{t.forgotPasswordTitle}</h2>
            <p className="text-white/90 drop-shadow-lg">
              {t.forgotPasswordInstructions}
            </p>
          </div>

          <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-center mb-3">
              <i className="fab fa-whatsapp text-green-600 dark:text-green-400 text-2xl mr-2"></i>
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">{t.whatsappSupport}</h3>
            </div>
            <p className="text-green-700 dark:text-green-300 text-center mb-4 text-sm">
              {t.whatsappSupportDescription}
            </p>
            <div className="flex justify-center">
              <a
                href="https://wa.me/966503763410?text=I%20need%20password%0A%D8%A3%D9%86%D8%A7%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg"
              >
                <i className="fab fa-whatsapp text-lg mr-2"></i>
                {t.contactSupport}
              </a>
            </div>
          </div>

          <div className="text-center pt-3">
            <button 
              onClick={onSwitchToLogin} 
              className="font-semibold text-orange-300 hover:text-orange-200 hover:underline focus:outline-none drop-shadow text-sm"
            >
              <i className="fas fa-arrow-left me-1 text-xs"></i>{t.backToLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;