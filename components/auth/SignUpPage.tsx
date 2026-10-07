import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language, User } from '../../types';

interface SignUpPageProps {
  onSignUp: (user: User) => Promise<void>;
  onSwitchToLogin: () => void;
  lang: Language;
}

interface Status {
  type: 'error' | 'success' | 'loading';
  message: string;
}

const initialState: Omit<User, 'isAdmin'> = {
  projectName: '',
  projectManagerName: '',
  projectId: '',
  operatorName: '',
  email: '',
  password: '',
  securityAnswer: 'zahran',
};

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp, onSwitchToLogin, lang: propLang }) => {
  const [formData, setFormData] = useState<Omit<User, 'isAdmin'>>(initialState);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [lang, setLang] = useState<Language>(propLang || 'en');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = useMemo(() => TRANSLATIONS[lang] || TRANSLATIONS['en'], [lang]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (status?.type === 'error') {
      setStatus(null);
    }
  };

  const validate = (): string | null => {
    if (!formData.projectName.trim()) return lang === 'ar' ? 'يرجى إدخال اسم المشروع' : 'Project name is required';
    if (!formData.projectManagerName.trim()) return lang === 'ar' ? 'يرجى إدخال اسم مدير المشروع' : 'Project manager name is required';
    if (!formData.email.trim()) return lang === 'ar' ? 'يرجى إدخال البريد الإلكتروني' : 'Email address is required';
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      return lang === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Please enter a valid email address';
    }

    if (!formData.password || formData.password.length < 6) {
      return lang === 'ar' ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters';
    }

    if (formData.password !== confirmPassword) {
      return lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errorMsg = validate();
    if (errorMsg) {
      setStatus({ type: 'error', message: errorMsg });
      return;
    }

    setIsSubmitting(true);
    setStatus({
      type: 'loading',
      message: lang === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating your account...'
    });

    try {
      const preparedData: User = {
        ...formData,
        email: formData.email.trim().toLowerCase(),
        projectId: formData.projectId.trim() || `PRJ-${Date.now().toString().slice(-4)}`,
        operatorName: formData.operatorName.trim() || formData.projectManagerName.trim(),
        securityAnswer: formData.securityAnswer?.trim() || 'zahran',
        isAdmin: false
      };

      await onSignUp(preparedData);
      setStatus({
        type: 'success',
        message: lang === 'ar' ? 'تم إنشاء الحساب بنجاح! جاري الدخول...' : 'Account created successfully! Logging in...'
      });
    } catch (error: any) {
      console.error('Sign up error:', error);
      let message = lang === 'ar' ? 'حدث خطأ أثناء إنشاء الحساب' : 'Failed to create account';
      if (error?.code === 'auth/email-already-in-use') {
        message = lang === 'ar' ? 'هذا البريد الإلكتروني مسجل بالفعل' : 'This email is already registered. Please sign in.';
      } else if (error?.code === 'auth/invalid-email') {
        message = lang === 'ar' ? 'صيغة البريد الإلكتروني غير صحيحة' : 'Invalid email format';
      } else if (error?.code === 'auth/weak-password') {
        message = lang === 'ar' ? 'كلمة المرور ضعيفة جداً' : 'Password is too weak';
      } else if (error?.message) {
        message = error.message;
      }
      setStatus({ type: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-500 py-6 px-4">
      {/* Language Toggle - Top Right */}
      <div className="fixed top-4 right-4 z-10">
        <div className="flex items-center bg-white rounded-full px-3 py-2 border shadow-sm">
          <button
            type="button"
            onClick={() => setLang('en')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              lang === 'en' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-orange-500'
            }`}
          >
            EN
          </button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-all ${
              lang === 'ar' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-orange-500'
            }`}
          >
            عربي
          </button>
        </div>
      </div>

      {/* Main Sign Up Card */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white rounded shadow-md p-5 space-y-3">
          
          {/* Header with Logo */}
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-2 shadow-sm">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Zahran Fleet" 
                className="w-9 h-9 object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M12 2L3 7l9 5 9-5-9-5zM3 17l9 5 9-5M3 12l9 5 9-5'/%3E%3C/svg%3E";
                }}
              />
            </div>
            <h1 className="text-lg font-bold text-gray-800">
              {lang === 'ar' ? 'إنشاء حساب جديد' : 'Create New Account'}
            </h1>
            <p className="text-gray-600 text-xs">
              {lang === 'ar' ? 'خدمات بيئية زهران فليت' : 'Environmental Services Zahran Fleet'}
            </p>
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

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Project Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'اسم المشروع' : 'Project Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                  placeholder={lang === 'ar' ? 'مثال: مشروع الشرق' : 'e.g. Sharq Project'}
                  required
                />
              </div>

              {/* Project ID */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'معرف المشروع' : 'Project ID'}
                </label>
                <input
                  type="text"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                  placeholder={lang === 'ar' ? 'مثال: 5537' : 'e.g. 5537'}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Project Manager Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'اسم مدير المشروع' : 'Project Manager Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="projectManagerName"
                  value={formData.projectManagerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                  placeholder={lang === 'ar' ? 'اسم المدير' : 'Manager Name'}
                  required
                />
              </div>

              {/* Data Entry Operator Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'اسم مدخل البيانات' : 'Operator Name'}
                </label>
                <input
                  type="text"
                  name="operatorName"
                  value={formData.operatorName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                  placeholder={lang === 'ar' ? 'اسم المشغل' : 'Operator Name'}
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'} <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                placeholder={lang === 'ar' ? 'name@zahran.com' : 'name@zahran.com'}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'كلمة المرور' : 'Password'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                    placeholder="••••••••"
                    required
                    minLength={6}
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

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  {lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm Password'} <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-gray-800 placeholder-gray-400"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 text-white py-2 px-3 rounded text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>{lang === 'ar' ? 'جاري إنشاء الحساب...' : 'Creating Account...'}</span>
                </>
              ) : (
                <span>{lang === 'ar' ? 'إنشاء الحساب' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Footer - Switch to Login */}
          <div className="text-center pt-2 border-t border-gray-200">
            <span className="text-xs text-gray-600">
              {lang === 'ar' ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
            </span>
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-xs font-semibold text-orange-600 hover:text-orange-700 hover:underline cursor-pointer"
            >
              {lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;