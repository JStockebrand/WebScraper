import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  subscriptionTier: string;
  searchesUsed: number;
  searchesLimit: number;
}

interface AuthContextType {
  user: User | null;
  session: any | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ isNewUser: boolean }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ isNewUser: boolean }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check for existing session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await apiRequest('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setSession({ access_token: token });
      } else {
        // Invalid or expired token
        localStorage.removeItem('supabase_token');
      }
    } catch (error) {
      console.error('Session check failed:', error);
      localStorage.removeItem('supabase_token');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    const response = await apiRequest('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Sign in failed');
    }

    localStorage.setItem('supabase_token', result.session.access_token);
    setUser(result.user);
    setSession(result.session);
    
    return { isNewUser: false }; // Existing user login
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const response = await apiRequest('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Sign up failed');
    }

    // Check if email verification is required
    if (result.emailVerificationRequired) {
      return { 
        isNewUser: true, 
        emailVerificationRequired: true,
        email: result.email,
        message: result.message
      };
    }

    // Registration complete with session
    localStorage.setItem('supabase_token', result.session.access_token);
    setUser(result.user);
    setSession(result.session);
    
    return { isNewUser: true }; // New user registration complete
  };

  const signOut = async () => {
    try {
      const token = localStorage.getItem('supabase_token');
      if (token) {
        await apiRequest('/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      localStorage.removeItem('supabase_token');
      setUser(null);
      setSession(null);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const value = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}