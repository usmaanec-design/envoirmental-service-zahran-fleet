import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
  lang: Language;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onSwitchToLogin, lang }) => {
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in-down">
      <div className="text-center">
        <i className="fas fa-lock text-4xl text-blue-300 mb-4 drop-shadow-lg"></i>
        <h2 className="text-3xl font-bold text-white drop-shadow-lg mb-2">{t.forgotPasswordTitle}</h2>
        <p className="text-white/80">
          {t.forgotPasswordInstructions}
        </p>
      </div>

      <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
        <div className="flex items-center justify-center mb-4">
          <i className="fab fa-whatsapp text-green-600 dark:text-green-400 text-3xl mr-3"></i>
          <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">{t.whatsappSupport}</h3>
        </div>
        <p className="text-green-700 dark:text-green-300 text-center mb-6 text-lg">
          {t.whatsappSupportDescription}
        </p>
        <div className="flex justify-center">
          <a
            href="https://wa.me/966503763410?text=I%20need%20password%0A%D8%A3%D9%86%D8%A7%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 shadow-lg"
          >
            <i className="fab fa-whatsapp text-2xl mr-3"></i>
            {t.contactSupport}
          </a>
        </div>
      </div>

      <div className="text-center pt-4">
        <button 
          onClick={onSwitchToLogin} 
          className="font-semibold text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
        >
          <i className="fas fa-arrow-left me-2"></i>{t.backToLogin}
        </button>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
