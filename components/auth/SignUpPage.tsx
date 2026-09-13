import React, { useState, useMemo } from 'react';
import { TRANSLATIONS } from '../../constants';
import type { Language, User } from '../../types';
import Input from '../ui/Input';
import Button from '../ui/Button';

interface SignUpPageProps {
  onSignUp: (user: User) => Promise<void>;
  onSwitchToLogin: () => void;
  lang: Language;
}

const initialState: Omit<User, 'isAdmin'> = {
  projectName: '',
  projectManagerName: '',
  projectId: '',
  operatorName: '',
  email: '',
  password: '',
  securityAnswer: '',
};

const SignUpPage: React.FC<SignUpPageProps> = ({ onSignUp, onSwitchToLogin, lang }) => {
  const [formData, setFormData] = useState<Omit<User, 'isAdmin'>>(initialState);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Partial<Record<keyof User | 'confirmPassword' | 'api', string>>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useMemo(() => TRANSLATIONS[lang], [lang]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors] || errors.api) {
      setErrors(prev => ({ ...prev, [name]: undefined, api: undefined }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword || errors.api) {
      setErrors(prev => ({ ...prev, confirmPassword: undefined, api: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof User | 'confirmPassword', string>> = {};
    let isValid = true;

    // Check required string fields explicitly
    const requiredFields: (keyof typeof formData)[] = ['projectName', 'projectManagerName', 'projectId', 'operatorName', 'email', 'password', 'securityAnswer'];
    requiredFields.forEach(key => {
        if (!formData[key] || formData[key].trim() === '') {
            newErrors[key] = t.requiredField;
            isValid = false;
        }
    });

    // Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = t.emailInvalid;
      isValid = false;
    }

    // Password strength
    if (formData.password && formData.password.length < 8) {
      newErrors.password = t.passwordInvalid;
      isValid = false;
    }
    
    // Confirm password
    if (!confirmPassword) {
        newErrors.confirmPassword = t.requiredField;
        isValid = false;
    } else if (formData.password && formData.password !== confirmPassword) {
      newErrors.confirmPassword = t.passwordsDoNotMatch;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !validate()) return;
    
    setIsSubmitting(true);
    setErrors({});
    try {
      await onSignUp({ ...formData, isAdmin: false });
      setIsSuccess(true);
      setTimeout(() => {
        onSwitchToLogin();
      }, 3000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "An unknown error occurred.";
      setErrors(prev => ({ ...prev, api: message }));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-green-500 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full backdrop-blur-3xl animate-pulse"></div>
          <div className="absolute top-1/2 -right-32 w-64 h-64 bg-orange-300/20 rounded-full backdrop-blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-green-300/20 rounded-full backdrop-blur-3xl animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
          <div className="w-full max-w-md">
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-center animate-fade-in-down">
              <div className="flex justify-center items-center mx-auto w-20 h-20 bg-gradient-to-br from-green-400/30 to-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full mb-6">
                  <i className="fas fa-check text-4xl text-green-300 drop-shadow-lg"></i>
              </div>
              <h2 className="text-3xl font-bold text-white drop-shadow-2xl mb-3">{t.signUpTitle}</h2>
              <p className="text-white/90 text-lg drop-shadow-lg">{t.accountCreatedSuccess}</p>
              <div className="mt-6 animate-pulse">
                <p className="text-white/80 text-sm">Redirecting to login...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-400 via-orange-500 to-green-500 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/10 rounded-full backdrop-blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-32 w-64 h-64 bg-orange-300/20 rounded-full backdrop-blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute -bottom-32 left-1/3 w-72 h-72 bg-green-300/20 rounded-full backdrop-blur-3xl animate-pulse delay-2000"></div>
      </div>
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Header with Zahran logo */}
          <div className="text-center mb-6">
            <div className="flex-shrink-0 w-20 h-20 mx-auto rounded-full flex items-center justify-center bg-white/20 backdrop-blur-sm border border-white/30 mb-4 shadow-xl shadow-orange-500/30 transform transition-transform duration-300 hover:scale-110">
              <img 
                src="/images/company-logo.jpeg" 
                alt="Zahran Fleet" 
                className="w-14 h-14 object-contain rounded-full shadow-sm"
                style={{ filter: 'brightness(1.2) contrast(1.1)' }}
              />
            </div>
            <h1 className="text-3xl font-bold text-white drop-shadow-2xl mb-2">{t.createAccount}</h1>
            <p className="text-white/90 text-lg drop-shadow-lg">Environmental Services Zahran Fleet</p>
            <p className="text-white/80 text-sm drop-shadow-lg mt-1">{t.createAccountSubtitle}</p>
          </div>
          
          <div className="bg-white/15 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl p-8 space-y-6 animate-fade-in-down transform transition-all duration-500 hover:shadow-orange-500/20 hover:shadow-3xl">
            <form onSubmit={handleSignUp} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.projectName} *</label>
                  <input
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter project name"
                    required
                  />
                  {errors.projectName && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.projectName}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.projectManagerName} *</label>
                  <input
                    name="projectManagerName"
                    value={formData.projectManagerName}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter manager name"
                    required
                  />
                  {errors.projectManagerName && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.projectManagerName}</p>}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.projectId} *</label>
                  <input
                    name="projectId"
                    value={formData.projectId}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter project ID"
                    required
                  />
                  {errors.projectId && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.projectId}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.operatorName} *</label>
                  <input
                    name="operatorName"
                    value={formData.operatorName}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter operator name"
                    required
                  />
                  {errors.operatorName && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.operatorName}</p>}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.email} *</label>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                  placeholder="Enter your email"
                  required
                />
                {errors.email && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.email}</p>}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.password} *</label>
                  <input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Enter password"
                    required
                  />
                  {errors.password && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.password}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.confirmPassword} *</label>
                  <input
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    placeholder="Confirm password"
                    required
                  />
                  {errors.confirmPassword && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.confirmPassword}</p>}
                </div>
              </div>
              
              {/* Security Question Section */}
              <div className="border-t border-white/20 pt-6">
                <div className="p-4 bg-gradient-to-r from-orange-600/30 to-orange-500/20 backdrop-blur-sm rounded-xl mb-4 border border-orange-400/30">
                  <p className="text-sm font-semibold text-white drop-shadow-lg">
                    {t.companyNameQuestion}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2 drop-shadow">{t.securityAnswer} *</label>
                  <input 
                    name="securityAnswer" 
                    value={formData.securityAnswer || ''} 
                    onChange={handleChange} 
                    placeholder="zahran"
                    className="block w-full px-4 py-3 border border-orange-300/50 rounded-xl shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-150 bg-white/90 backdrop-blur-sm text-gray-900 placeholder:text-gray-500"
                    required
                  />
                  {errors.securityAnswer && <p className="text-red-200 text-sm mt-1 drop-shadow">{errors.securityAnswer}</p>}
                </div>
              </div>
              
              {errors.api && <p className="text-red-200 text-center text-sm drop-shadow">{errors.api}</p>}
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50 backdrop-blur-sm border border-orange-400/30"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center">
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Creating Account...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <i className="fas fa-user-plus mr-2"></i>
                    {t.createAccount}
                  </div>
                )}
              </button>
            </form>
            
            <div className="text-center pt-4 border-t border-white/20">
              <p className="text-white/80 text-sm drop-shadow">
                {t.alreadyHaveAccount}{' '}
                <button onClick={onSwitchToLogin} className="font-semibold text-orange-200 hover:text-white hover:underline drop-shadow transition duration-200 transform hover:scale-105">
                  {t.signInHere}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;