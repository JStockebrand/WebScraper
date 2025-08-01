import { createClient } from '@supabase/supabase-js';
import { storage } from '../storage';

// Dynamic URL generation for different environments
const getBaseURL = (): string => {
  // In production
  if (process.env.NODE_ENV === 'production') {
    return process.env.SITE_URL || process.env.VITE_SITE_URL || 'https://your-app.replit.app';
  }
  
  // In development
  return 'http://localhost:5000';
};

const getAuthRedirectURL = (): string => {
  return `${getBaseURL()}/auth`;
};

const getPasswordResetURL = (): string => {
  return `${getBaseURL()}/auth?type=recovery`;
};

const getEmailConfirmURL = (): string => {
  return `${getBaseURL()}/auth?type=signup`;
};

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_ANON_KEY.');
}

// Supabase client is configured and ready
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for user management operations
export const supabaseAdmin = (() => {
  if (!supabaseServiceKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY not found - admin operations will not be available');
    return null;    
  }
  
  console.log('Initializing Supabase admin client with service role key');
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
})();

// Authentication service
export class AuthService {
  public supabase = supabase;
  public supabaseAdmin = supabaseAdmin;
  
  // Register new user
  async register(email: string, password: string, displayName?: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
        emailRedirectTo: getEmailConfirmURL()
      }
    });

    if (error) {
      console.error('Supabase registration error:', error);
      
      // Handle specific Supabase errors
      if (error.message?.includes('User already registered') || 
          error.message?.includes('duplicate key value') ||
          error.message?.includes('already exists')) {
        throw new Error('User already registered');
      }
      
      throw new Error(`Registration failed: ${error.message}`);
    }

    if (!data.user) {
      throw new Error('Registration failed: No user data returned');
    }

    console.log('Registration successful for:', data.user.email);
    console.log('Email confirmed at registration:', data.user.email_confirmed_at);
    console.log('Session created:', !!data.session);
    
    // Create user profile in our database if this is a new user
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

    // Check if email verification is required
    const needsVerification = !data.user.email_confirmed_at && !data.session;
    
    // WORKAROUND for timing issue: Generate immediate verification link
    let immediateVerificationLink = null;
    if (needsVerification) {
      console.log('🔒 Email verification required - no session created');
      console.log('📧 Verification email should have been sent by Supabase');
      
      try {
        console.log('🔧 Generating immediate verification link due to timing issue...');
        if (this.supabaseAdmin) {
          const { data: linkData, error: linkError } = await this.supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: data.user.email!
          });
          
          if (!linkError && linkData.properties?.action_link) {
            immediateVerificationLink = linkData.properties.action_link;
            console.log('✅ Immediate verification link generated');
            console.log(`🔗 ${immediateVerificationLink}`);
          } else {
            console.log('⚠️ Could not generate immediate verification link:', linkError?.message);
          }
        }
      } catch (linkGenError: any) {
        console.log('⚠️ Could not generate immediate verification link:', linkGenError.message);
      }
    }
    
    if (needsVerification) {
      return { 
        user: data.user, 
        session: null,
        emailVerificationRequired: true,
        immediateVerificationLink
      };
    } else {
      console.log('✅ User registered and can proceed (verification disabled or already confirmed)');
      return { 
        user: data.user, 
        session: data.session,
        emailVerificationRequired: false 
      };
    }
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

  // Resend verification email
  async resendVerificationEmail(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: getEmailConfirmURL()
      }
    });

    if (error) {
      console.error('Resend verification error:', error);
      throw new Error(`Failed to resend verification email: ${error.message}`);
    }

    console.log(`Verification email resent to: ${email}`);
    return { success: true };
  }

  // Send password reset email
  async sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: getPasswordResetURL()
    });

    if (error) {
      console.error('Password reset error:', error);
      throw new Error(`Failed to send password reset email: ${error.message}`);
    }

    console.log(`Password reset email sent to: ${email}`);
    return { success: true };
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

  // Delete user account
  async deleteUser(userId: string) {
    console.log(`Deleting user from Supabase Auth: ${userId}`);
    
    if (!this.supabaseAdmin) {
      throw new Error('Admin operations require SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const { error } = await this.supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Supabase user deletion error:', error);
      throw new Error(`User deletion failed: ${error.message}`);
    }
    
    console.log('User deleted from Supabase Auth successfully');
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