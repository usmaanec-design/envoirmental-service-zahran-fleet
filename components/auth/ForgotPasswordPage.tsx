import React, { useMemo } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onSwitchToLogin }) => {
  const t = useMemo(() => TRANSLATIONS['en'], []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500">
      {/* Main Forgot Password Card */}
      <div className="w-full max-w-xs mx-4">
        <div className="bg-white rounded shadow-md p-4 space-y-3">
          
          {/* Header with Logo */}
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Zahran Fleet" 
                className="w-9 h-9 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5'/%3E%3C/svg%3E";
                }}
              />
            </div>
            <h1 className="text-lg font-bold text-gray-800">Reset Password</h1>
            <p className="text-gray-600 text-xs">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {/* WhatsApp Support Card */}
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <div className="text-center">
              <div className="text-green-600 text-xl mb-2">📱</div>
              <h3 className="text-sm font-medium text-green-800 mb-1">
                WhatsApp Support
              </h3>
              <p className="text-green-700 text-xs mb-3">
                Contact technical support via WhatsApp for password reset
              </p>
              <a
                href="https://wa.me/966503763410?text=I%20need%20password%20reset%0A%D8%A3%D9%86%D8%A7%20%D8%A3%D8%AD%D8%AA%D8%A7%D8%AC%20%D8%A5%D8%B9%D8%A7%D8%AF%D8%A9%20%D8%AA%D8%B9%D9%8A%D9%8A%D9%86%20%D9%83%D9%84%D9%85%D8%A9%20%D8%A7%D9%84%D9%85%D8%B1%D9%88%D8%B1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
              >
                <span className="mr-1">📱</span>
                Contact Support
              </a>
            </div>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <button 
              onClick={onSwitchToLogin} 
              className="text-xs text-orange-600 hover:text-orange-700 font-medium"
            >
              ← Back to Login
            </button>
          </div>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2024 Environmental Services Zahran Fleet
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;