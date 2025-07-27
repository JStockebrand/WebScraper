import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { EmailVerificationDialog } from '@/components/auth/EmailVerificationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { user, loading, signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Check for email verification success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('verified') === 'true') {
      toast({
        title: "Email Verified!",
        description: "Your email has been verified. You can now sign in to your account.",
      });
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

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
      
      // Check if email verification is required  
      if ((result as any)?.emailVerificationRequired) {
        setVerificationEmail(email);
        setShowEmailVerification(true);
      } else {
        // Registration complete - user can login
        setLocation('/');
      }
    } catch (error) {
      throw error; // Let the form handle the error
    }
  };

  const handleVerificationComplete = () => {
    setShowEmailVerification(false);
    setIsLogin(true); // Switch to login form
    toast({
      title: "Verification Complete!",
      description: "You can now sign in with your email and password.",
    });
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
      
      <EmailVerificationDialog
        open={showEmailVerification}
        onOpenChange={setShowEmailVerification}
        email={verificationEmail}
        onVerificationComplete={handleVerificationComplete}
      />
    </div>
  );
}