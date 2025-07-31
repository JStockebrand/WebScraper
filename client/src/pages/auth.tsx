import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { EmailVerificationDialog } from '@/components/auth/EmailVerificationDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseAuthParams, cleanAuthParams } from '@/lib/redirectUrls';

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const { user, loading, signIn, signUp } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Handle authentication redirects according to Supabase documentation
  useEffect(() => {
    const params = parseAuthParams();
    
    // Handle authentication errors first
    if (params.error) {
      handleAuthError(params);
      cleanAuthParams();
      return;
    }
    
    // Handle different authentication types
    if (params.accessToken && params.refreshToken) {
      if (params.type === 'signup') {
        // Email verification
        handleEmailVerificationSignIn(params.accessToken, params.refreshToken);
      } else if (params.type === 'recovery') {
        // Password reset
        handlePasswordResetSignIn(params.accessToken, params.refreshToken);
      } else {
        // Generic authentication
        handleEmailVerificationSignIn(params.accessToken, params.refreshToken);
      }
    } else if (params.type === 'signup' && !params.error) {
      toast({
        title: "Email Verified!",
        description: "Your email has been verified. You can now sign in to your account.",
      });
      cleanAuthParams();
    }
  }, [toast]);

  const handleAuthError = (params: any) => {
    console.error('Authentication error:', params);
    
    let errorMessage = 'Authentication failed';
    
    // Handle specific error codes according to Supabase docs
    if (params.errorCode?.startsWith('4')) {
      errorMessage = params.errorDescription || 'Authentication error occurred';
    } else if (params.error === 'access_denied') {
      errorMessage = 'Access was denied. Please try again.';
    } else if (params.error === 'server_error') {
      errorMessage = 'Server error occurred. Please try again later.';
    }
    
    toast({
      title: "Authentication Error",
      description: errorMessage,
      variant: "destructive",
    });
  };

  const handleEmailVerificationSignIn = async (accessToken: string, refreshToken: string) => {
    try {
      // Call our auth service to set up the session
      const response = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken, refreshToken }),
      });

      if (response.ok) {
        const userData = await response.json();
        
        toast({
          title: "Welcome!",
          description: "Your email has been verified and you're now signed in.",
        });
        
        // Redirect to account page for verified users
        setLocation('/account');
      } else {
        throw new Error('Failed to verify session');
      }
      
      cleanAuthParams();
      
    } catch (error) {
      console.error('Auto sign-in failed:', error);
      toast({
        title: "Verification Complete",
        description: "Your email is verified. Please sign in with your credentials.",
        variant: "default",
      });
      cleanAuthParams();
    }
  };

  const handlePasswordResetSignIn = async (accessToken: string, refreshToken: string) => {
    try {
      // For password reset, we need to handle the session and redirect to password change
      const response = await fetch('/api/auth/verify-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ accessToken, refreshToken }),
      });

      if (response.ok) {
        toast({
          title: "Reset Link Verified",
          description: "Please enter your new password.",
        });
        
        // Show password reset form or redirect to reset page
        setLocation('/reset-password');
      } else {
        throw new Error('Failed to verify reset session');
      }
      
      cleanAuthParams();
      
    } catch (error) {
      console.error('Password reset verification failed:', error);
      toast({
        title: "Reset Link Expired",
        description: "Please request a new password reset link.",
        variant: "destructive",
      });
      cleanAuthParams();
    }
  };

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
        // Registration complete - go to account page
        setLocation('/account');
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