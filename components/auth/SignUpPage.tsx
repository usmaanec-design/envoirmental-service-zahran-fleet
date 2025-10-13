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
  securityQuestion: 'What is your company name?',
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
      <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 text-center animate-fade-in-down">
        <div className="flex justify-center items-center mx-auto w-16 h-16 bg-green-500/20 backdrop-blur-sm border border-green-400/30 rounded-full mb-4">
            <i className="fas fa-check text-3xl text-green-300"></i>
        </div>
        <h2 className="text-2xl font-bold text-white drop-shadow-lg">{t.signUpTitle}</h2>
        <p className="mt-4 text-white/80">{t.accountCreatedSuccess}</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in-down">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">{t.signUpTitle}</h2>
        <p className="text-white/80 mt-2">Create your fleet management account</p>
      </div>
      <form onSubmit={handleSignUp} className="space-y-4" noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t.projectName} name="projectName" value={formData.projectName} onChange={handleChange} error={errors.projectName} required />
          <Input label={t.projectManagerName} name="projectManagerName" value={formData.projectManagerName} onChange={handleChange} error={errors.projectManagerName} required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label={t.projectId} name="projectId" value={formData.projectId} onChange={handleChange} error={errors.projectId} required />
          <Input label={t.operatorName} name="operatorName" value={formData.operatorName} onChange={handleChange} error={errors.operatorName} required />
        </div>
        <Input label={t.email} name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} required />
        <Input label={t.password} name="password" type="password" value={formData.password} onChange={handleChange} error={errors.password} required />
        <Input label={t.confirmPassword} name="confirmPassword" type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} error={errors.confirmPassword} required />
        
        {/* Security Question Section */}
        <div className="border-t pt-4">
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg mb-4">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t.companyNameQuestion}
            </p>
          </div>
          <Input 
            label={t.securityAnswer} 
            name="securityAnswer" 
            value={formData.securityAnswer || ''} 
            onChange={handleChange} 
            error={errors.securityAnswer} 
            placeholder="zahran"
            required 
          />
        </div>
        
        {errors.api && <p className="text-red-500 text-center text-sm">{errors.api}</p>}
        
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.createAccount}
        </Button>
      </form>
      <p className="text-center text-sm text-gray-600 dark:text-gray-400">
        {t.alreadyHaveAccount}{' '}
        <button onClick={onSwitchToLogin} className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
          {t.signInHere}
        </button>
      </p>
    </div>
  );
};

export default SignUpPage;