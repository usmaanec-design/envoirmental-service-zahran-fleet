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
    if (isSubmitting || !validate()) return;
    
    setIsSubmitting(true);
    setErrors({});
    try {
      await onLogin(email, password);
      // On success, App component will handle navigation
    } catch (error: any) {
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
    setAdminHint(t.adminLoginHint);
    setErrors({});
  };

  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-8 space-y-6 animate-fade-in-down">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-white drop-shadow-lg">{t.loginTitle}</h2>
        <p className="text-white/80 mt-2">Welcome to Zahran Fleet Management</p>
      </div>
      <form onSubmit={handleLogin} className="space-y-4" noValidate>
        <Input
          label={t.email}
          name="email"
          type="email"
          value={email}
          onChange={handleEmailChange}
          error={errors.email}
          required
          autoComplete="email"
          className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/60"
        />
        <div>
            <Input
              label={t.password}
              name="password"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              error={errors.password}
              required
              autoComplete="current-password"
              className="bg-white/10 backdrop-blur-sm border-white/20 text-white placeholder-white/60"
            />
             <div className="text-right mt-1">
                <button 
                  type="button" 
                  onClick={onSwitchToForgotPassword} 
                  className="text-sm font-semibold text-orange-300 hover:text-orange-100 hover:underline focus:outline-none transition-colors duration-200"
                >
                  {t.forgotPassword}
                </button>
            </div>
        </div>
        {errors.api && <p className="text-red-300 text-center text-sm bg-red-500/20 p-2 rounded-lg border border-red-400/30">{errors.api}</p>}
        {adminHint && <p className="text-orange-300 text-center text-sm bg-orange-500/20 p-2 rounded-lg border border-orange-400/30 -mt-2 mb-4">{adminHint}</p>}
        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105" 
          disabled={isSubmitting}
        >
          {isSubmitting ? <i className="fas fa-spinner fa-spin"></i> : t.signIn}
        </Button>
      </form>
      <div className="text-center">
        <button 
            type="button"
            onClick={handleAdminLoginClick}
            className="text-sm font-semibold text-white/70 hover:text-green-300 hover:underline focus:outline-none transition-colors duration-200"
            disabled={isSubmitting}
        >
            {t.adminLogin}
        </button>
      </div>
      <p className="text-center text-sm text-white/80">
        {t.dontHaveAccount}{' '}
        <button onClick={onSwitchToSignUp} className="font-semibold text-orange-300 hover:text-orange-100 hover:underline transition-colors duration-200">
          {t.signUpHere}
        </button>
      </p>
    </div>
  );
};

export default LoginPage;