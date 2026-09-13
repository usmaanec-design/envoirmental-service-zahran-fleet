import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface LoginPageProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  lang: Language;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onSwitchToSignUp, onSwitchToForgotPassword, lang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; api?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminHint, setAdminHint] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    let isValid = true;
    if (!email) {
      newErrors.email = t.requiredField;
      isValid = false;
    }
    if (!password) {
      newErrors.password = t.requiredField;
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleLoginError = (error: any) => {
      let message = t.invalidCredentials;
      if (error instanceof Error) {
        message = error.message;
      }
      setErrors({ api: message });
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔴 Login form submitted!', { email, password });
    if (isSubmitting || !validate()) return;
    
    setIsSubmitting(true);
    setErrors({});
    try {
      console.log('🔴 Calling onLogin...');
      await onLogin(email, password);
      console.log('🔴 onLogin completed successfully!');
      // On success, App component will handle navigation
    } catch (error: any) {
      console.log('🔴 Login error:', error);
      handleLoginError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email || errors.api) setErrors({});
    if (adminHint) setAdminHint(null);
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password || errors.api) setErrors({});
    if (adminHint) setAdminHint(null);
  };

  const handleAdminLoginClick = () => {
    // Security: Just show hint instead of auto-filling
    setAdminHint('Contact system administrator for admin credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-orange-400 to-orange-600">
      {/* Clean Orange Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600"></div>
      
      {/* Subtle Pattern Overlay */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='40' cy='40' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}>
        </div>
      </div>

      {/* Language Toggle - Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <div className="flex bg-white/20 backdrop-blur-md rounded-full p-1 border border-white/30">
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 text-white hover:bg-white/20"
          >
            English
          </button>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 text-white hover:bg-white/20"
          >
            العربية
          </button>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6 transform transition-all duration-500 hover:shadow-3xl">
          
          {/* Header with Logo */}
          <div className="text-center">
            <div className="mx-auto w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Zahran Fleet" 
                className="w-16 h-16 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5'/%3E%3C/svg%3E";
                }}
              />
            </div>
          {/* Form Status Messages */}
          {status && (
            <div className={`p-4 rounded-lg ${
              status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
              status.type === 'loading' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
              'bg-green-50 text-green-600 border border-green-200'
            }`}>
              <p className="text-sm font-medium">{status.message}</p>
            </div>
          )}

          {/* Admin Login Hint */}
          {adminHint && (
            <div className="p-4 rounded-lg bg-blue-50 text-blue-600 border border-blue-200">
              <p className="text-sm font-medium">{adminHint}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Sign in as
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                    role === 'admin' 
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg' 
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  👨‍💼 Admin
                </button>
                <button
                  type="button"
                  onClick={() => setRole('supervisor')}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border-2 ${
                    role === 'supervisor' 
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg' 
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-orange-300 hover:bg-orange-50'
                  }`}
                >
                  👷‍♂️ Supervisor
                </button>
              </div>
            </div>

            {/* Email Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-500"
                  placeholder="Enter your email"
                  required
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 text-gray-800 placeholder-gray-500"
                  placeholder="Enter your password"
                  required
                />
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                <span className="ml-2 text-sm text-gray-600">Remember me</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors duration-200"
              >
                Forgot Password?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status?.type === 'loading'}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {status?.type === 'loading' ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            {/* Admin Login Helper */}
            {role === 'admin' && (
              <button
                type="button"
                onClick={handleAdminLoginClick}
                className="w-full text-center text-sm text-gray-500 hover:text-orange-600 transition-colors duration-200 border border-gray-200 py-2 rounded-lg hover:border-orange-300"
              >
                Need admin access? Click here
              </button>
            )}
          </form>

          {/* Footer */}
          <div className="text-center pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              © 2024 Environmental Services Zahran Fleet. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
              </div>
              <h2 className="text-2xl font-bold text-white drop-shadow-2xl">{t.loginTitle}</h2>
              <p className="text-orange-200/90 mt-1 text-sm drop-shadow-lg">Environmental Services Zahran Fleet</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              {/* Compact Email Input with orange-green highlights */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-orange-200/90 drop-shadow">
                  {t.email}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={handleEmailChange}
                    placeholder={lang === 'ar' ? 'البريد الإلكتروني' : 'Enter your email'}
                    className={`w-full py-3 text-base backdrop-blur-sm bg-black/30 border-2 border-orange-500/30 border-b-green-500/30 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400/60 focus:border-orange-400/60 text-white placeholder-white/60 transition-all duration-300 hover:shadow-xl focus:shadow-orange-500/30 ${
                      lang === 'ar' ? 'pr-10 text-right' : 'pl-10 text-left'
                    } ${errors.email ? 'border-red-500/60' : ''}`}
                    style={{
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(251, 146, 60, 0.2)'
                    }}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    required
                    autoComplete="email"
                  />
                  <i className={`fas fa-envelope absolute top-1/2 transform -translate-y-1/2 text-orange-400 text-lg ${
                    lang === 'ar' ? 'right-3' : 'left-3'
                  }`}></i>
                </div>
                {errors.email && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.email}</p>
                )}
              </div>

              {/* Compact Password Input with green highlights */}
              <div className="space-y-1">
                <label className="block text-xs font-medium text-green-200/90 drop-shadow">
                  {t.password}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={password}
                    onChange={handlePasswordChange}
                    placeholder={lang === 'ar' ? 'كلمة المرور' : 'Enter your password'}
                    className={`w-full py-3 text-base backdrop-blur-sm bg-black/30 border-2 border-green-500/30 border-b-orange-500/30 rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-green-400/60 focus:border-green-400/60 text-white placeholder-white/60 transition-all duration-300 hover:shadow-xl focus:shadow-green-500/30 ${
                      lang === 'ar' ? 'pr-16 pl-10 text-right' : 'pl-10 pr-16 text-left'
                    } ${errors.password ? 'border-red-500/60' : ''}`}
                    style={{
                      boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(34, 197, 94, 0.2)'
                    }}
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                    required
                    autoComplete="current-password"
                  />
                  <i className={`fas fa-lock absolute top-1/2 transform -translate-y-1/2 text-green-400 text-lg ${
                    lang === 'ar' ? 'right-3' : 'left-3'
                  }`}></i>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute top-1/2 transform -translate-y-1/2 text-green-300 hover:text-green-200 text-lg ${
                      lang === 'ar' ? 'left-3' : 'right-3'
                    }`}
                  >
                    <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.password}</p>
                )}
                <div className={`${lang === 'ar' ? 'text-left' : 'text-right'} mt-1`}>
                  <button 
                    type="button" 
                    onClick={onSwitchToForgotPassword} 
                    className="text-xs font-medium text-green-300 hover:text-green-200 transition-colors duration-200 drop-shadow"
                  >
                    {t.forgotPassword}
                  </button>
                </div>
              </div>

              {/* Error Messages */}
              {errors.api && (
                <div className="backdrop-blur-sm bg-red-500/10 border border-red-300/30 rounded-lg p-2">
                  <p className="text-red-200 text-xs drop-shadow">{errors.api}</p>
                </div>
              )}

              {/* Admin Hint */}
              {adminHint && (
                <div className="backdrop-blur-sm bg-green-500/10 border border-green-300/30 rounded-lg p-2">
                  <p className="text-green-200 text-xs drop-shadow">{adminHint}</p>
                </div>
              )}

              {/* Compact Login Button with orange-green highlights */}
              <button
                type="submit"
                disabled={isSubmitting}
                onClick={(e) => {
                  console.log('🔴 Button clicked!');
                  handleLogin(e);
                }}
                className="w-full py-3 bg-gradient-to-r from-orange-500/90 via-orange-600/90 to-green-600/90 hover:from-orange-600/90 hover:via-orange-700/90 hover:to-green-700/90 backdrop-blur-sm text-white rounded-lg transition-all duration-300 font-medium shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-orange-400/40"
                style={{
                  boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                }}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <i className="fas fa-sign-in-alt"></i>
                    <span>{t.signIn}</span>
                  </div>
                )}
              </button>
            </form>

            {/* Admin Login Link */}
            <div className="text-center border-t border-orange-500/20 pt-3">
              <button 
                type="button"
                onClick={handleAdminLoginClick}
                className="text-xs font-medium text-orange-300 hover:text-orange-200 transition-colors duration-200 drop-shadow"
                disabled={isSubmitting}
              >
                <i className="fas fa-user-shield mr-1 text-xs"></i>
                {t.adminLogin}
              </button>
            </div>

            {/* Sign Up Link with green highlight */}
            <div className="text-center">
              <p className="text-xs text-white/80 drop-shadow">
                {t.dontHaveAccount}{' '}
                <button 
                  onClick={onSwitchToSignUp} 
                  className="font-medium text-green-300 hover:text-green-200 transition-colors duration-200 drop-shadow"
                >
                  {t.signUpHere}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;