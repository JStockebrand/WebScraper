import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Supabase client is configured and ready
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication service
export class AuthService {
  
  // Register new user
  async register(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
        emailRedirectTo: `${process.env.SITE_URL || 'http://localhost:5000'}/auth?verified=true`
      }
    });

    if (error) {
      throw new Error(`Registration failed: ${error.message}`);
    }

    // For demo purposes, simulate email verification requirement
    // In production, Supabase would be configured to require verification
    console.log('Registration successful, simulating email verification requirement for:', data.user.email);
    
    // Return user data but no session to demonstrate verification flow
    return { 
      user: data.user, 
      session: null,
      needsVerification: true 
    };

    // Create user profile in our database (or get existing one)
    if (data.user) {
      try {
        const existingUser = await storage.getUser(data.user.id);
        if (!existingUser) {
          await storage.createUser({
            id: data.user.id,
            email: data.user.email!,
            displayName: displayName || data.user.user_metadata?.display_name || data.user.email!.split('@')[0],
            subscriptionTier: 'free',
          });
          console.log(`Created user profile: ${data.user.email} (${data.user.id})`);
        } else {
          console.log(`User profile already exists: ${data.user.email} (${data.user.id})`);
        }
      } catch (dbError: any) {
        console.error('Failed to create user profile:', dbError);
        // Don't throw here as auth user was created successfully
      }
    }

    return data;
  }

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Sign in failed: ${error.message}`);
    }

    // Ensure user profile exists in our database
    if (data.user) {
      try {
        let user = await storage.getUser(data.user.id);
        if (!user) {
          // Create profile if it doesn't exist (for existing auth users)
          await storage.createUser({
            id: data.user.id,
            email: data.user.email!,
            displayName: data.user.user_metadata?.display_name || data.user.email!.split('@')[0],
            subscriptionTier: 'free',
          });
          console.log(`Created user profile for existing auth user: ${data.user.email} (${data.user.id})`);
        } else {
          console.log(`User profile already exists: ${data.user.email} (${data.user.id})`);
        }
      } catch (dbError: any) {
        console.error('Failed to sync user profile:', dbError);
      }
    }

    return data;
  }

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw new Error(`Sign out failed: ${error.message}`);
    }
  }

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      throw new Error(`Get user failed: ${error.message}`);
    }

    return user;
  }

  // Verify user session
  async verifySession(accessToken: string) {
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      throw new Error('Invalid or expired session');
    }

    return user;
  }

  // Reset password
  async resetPassword(email: string) {
    console.log(`Attempting password reset for: ${email}`);
    
    // First, try to find the user in Supabase auth
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      if (listError) {
        console.error('Error listing users:', listError);
      } else {
        const user = users?.users?.find(u => u.email === email);
        console.log(`User found in Supabase:`, user ? 'Yes' : 'No');
        if (user) {
          console.log(`User email confirmed:`, user.email_confirmed_at ? 'Yes' : 'No');
        }
      }
    } catch (adminError) {
      console.log('Could not access admin users (this is expected with anon key)');
    }
    
    const redirectUrl = `${process.env.SITE_URL || 'http://localhost:5000'}/reset-password`;
    console.log(`Redirect URL: ${redirectUrl}`);
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error('Supabase reset password error:', {
        message: error.message,
        status: error.status,
        statusCode: error.status
      });
      
      // Check if it's a user not found error vs other issues
      if (error.message?.includes('Invalid') || error.message?.includes('invalid')) {
        throw new Error('User not found or email not confirmed');
      }
      
      throw new Error(`Password reset failed: ${error.message}`);
    }
    
    console.log('Password reset email sent successfully');
  }

  // Resend email verification
  async resendVerification(email: string) {
    console.log(`Resending verification email for: ${email}`);
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${process.env.SITE_URL || 'http://localhost:5000'}/auth?verified=true`
      }
    });

    if (error) {
      console.error('Supabase resend verification error:', error);
      throw new Error(`Resend verification failed: ${error.message}`);
    }
    
    console.log('Verification email resent successfully');
  }

  // Update password
  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      throw new Error(`Password update failed: ${error.message}`);
    }
  }
}

export const authService = new AuthService();