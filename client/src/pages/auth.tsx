import { useState } from 'react';
import { useLocation } from 'wouter';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { useAuth } from '@/contexts/AuthContext';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { user, loading, signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to home if already authenticated
  if (user) {
    setTimeout(() => setLocation('/'), 0);
    return null;
  }

  const handleLoginSuccess = async (email: string, password: string) => {
    try {
      const result = await signIn(email, password);
      // Existing users go to account page
      setLocation('/account');
    } catch (error) {
      throw error; // Let the form handle the error
    }
  };

  const handleRegisterSuccess = async (email: string, password: string, displayName?: string) => {
    try {
      const result = await signUp(email, password, displayName);
      // New users go to homepage
      setLocation('/');
    } catch (error) {
      throw error; // Let the form handle the error
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm
            onSuccess={handleLoginSuccess}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onSuccess={handleRegisterSuccess}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
}