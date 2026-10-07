import React, { useState } from 'react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToSignUp: () => void;
  onSwitchToForgotPassword: () => void;
  initialLang?: 'en' | 'ar';
  onLanguageChange?: (lang: 'en' | 'ar') => void;
}

interface Status {
  type: 'error' | 'success' | 'loading';
  message: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  onLogin, 
  onSwitchToSignUp, 
  onSwitchToForgotPassword,
  initialLang = 'en',
  onLanguageChange
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [lang, setLang] = useState<'en' | 'ar'>(initialLang);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [adminHint, setAdminHint] = useState<string>('');

  const handleLangToggle = (newLang: 'en' | 'ar') => {
    setLang(newLang);
    onLanguageChange?.(newLang);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: 'loading', message: lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...' });

    try {
      await onLogin(email, password);
      setStatus({ type: 'success', message: lang === 'ar' ? 'تم تسجيل الدخول بنجاح!' : 'Login successful!' });
      
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = lang === 'ar' ? 'حدث خطأ أثناء تسجيل الدخول' : 'An error occurred during login';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = lang === 'ar' ? 'محاولات كثيرة. يرجى المحاولة لاحقاً' : 'Too many failed attempts. Please try again later';
      }
      
      setStatus({ type: 'error', message: errorMessage });
    }
  };

  const handleForgotPassword = () => {
    onSwitchToForgotPassword();
  };

  const handleAdminLoginClick = () => {
    setAdminHint(lang === 'ar' ? 'اتصل بمدير النظام للحصول على بيانات اعتماد الإدارة' : 'Contact system administrator for admin credentials');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500">
      {/* Language Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-10">
        <div className="flex items-center bg-white rounded-full px-3 py-2 border">
          <button
            onClick={() => handleLangToggle('en')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              lang === 'en' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-orange-500'
            }`}
          >
            EN
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            onClick={() => handleLangToggle('ar')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              lang === 'ar' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-orange-500'
            }`}
          >
            عربي
          </button>
        </div>
      </div>

      {/* Main Login Card */}
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
            <h1 className="text-lg font-bold text-gray-800">{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</h1>
            <p className="text-gray-600 text-xs">{lang === 'ar' ? 'خدمات بيئية زهران فليت' : 'Environmental Services Zahran Fleet'}</p>
          </div>

          {/* Form Status Messages */}
          {status && (
            <div className={`p-3 rounded text-xs ${
              status.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' :
              status.type === 'loading' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
              'bg-green-50 text-green-600 border border-green-200'
            }`}>
              <p className="font-medium">{status.message}</p>
            </div>
          )}

          {/* Admin Login Hint */}
          {adminHint && (
            <div className="p-3 rounded bg-blue-50 text-blue-600 border border-blue-200 text-xs">
              <p className="font-medium">{adminHint}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-500"
                placeholder={lang === 'ar' ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-500"
                  placeholder={lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter your password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                {lang === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={status?.type === 'loading'}
              className="w-full bg-orange-500 text-white py-2.5 px-3 rounded text-sm font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2"
            >
              {status?.type === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{lang === 'ar' ? 'جاري تسجيل الدخول...' : 'Signing in...'}</span>
                </>
              ) : (
                <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
              )}
            </button>

            {/* Create Account Link */}
            <div className="pt-2 border-t border-gray-200 text-center">
              <span className="text-xs text-gray-500">
                {lang === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
              </span>
              <button
                type="button"
                onClick={onSwitchToSignUp}
                className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
              >
                {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create Account'}
              </button>
            </div>

            {/* Admin Login Helper */}
            <button
              type="button"
              onClick={handleAdminLoginClick}
              className="w-full text-center text-xs text-gray-400 hover:text-orange-600 py-1 transition-colors"
            >
              {lang === 'ar' ? 'تحتاج وصول إداري؟ اضغط هنا' : 'Need admin access? Click here'}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              {lang === 'ar' ? '© ٢٠٢٤ خدمات بيئية زهران فليت' : '© 2024 Environmental Services Zahran Fleet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;