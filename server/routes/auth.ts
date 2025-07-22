import { Router } from 'express';
import { authService } from '../services/supabase';
import { storage } from '../storage';
import { loginSchema, registerSchema, type LoginData, type RegisterData } from '@shared/schema';

const router = Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, password, displayName }: RegisterData = registerSchema.parse(req.body);
    
    // Register with Supabase Auth (also creates user profile in database)
    const authResponse = await authService.register(email, password, displayName);
    
    if (!authResponse.user) {
      return res.status(400).json({ error: 'Registration failed' });
    }

    // Get the user record from our database (created by authService.register)
    const user = await storage.getUser(authResponse.user.id);
    
    if (!user) {
      // Fallback: create user record if it doesn't exist
      const newUser = await storage.createUser({
        id: authResponse.user.id,
        email: authResponse.user.email!,
        displayName: displayName || authResponse.user.email!.split('@')[0],
        subscriptionTier: 'free',
      });
      
      return res.json({
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          subscriptionTier: newUser.subscriptionTier,
          searchesUsed: newUser.searchesUsed,
          searchesLimit: newUser.searchesLimit,
        },
        session: authResponse.session,
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        searchesUsed: user.searchesUsed,
        searchesLimit: user.searchesLimit,
      },
      session: authResponse.session,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    // Handle specific errors with user-friendly messages
    if (error.message?.includes('User already registered') || 
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate key value violates unique constraint')) {
      return res.status(409).json({ 
        error: 'An account with this email already exists. Please try signing in instead or use the "Forgot password?" option if you need to reset your password.' 
      });
    }
    
    // Handle Zod validation errors
    if (error.issues && Array.isArray(error.issues)) {
      const passwordErrors = error.issues.filter((issue: any) => issue.path?.includes('password'));
      if (passwordErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Password does not meet requirements. Please ensure it has 8+ characters, uppercase, lowercase, number, and special character.' 
        });
      }
      return res.status(400).json({ error: 'Please check your information and try again.' });
    }
    
    res.status(400).json({ 
      error: error.message || 'Registration failed. Please check your information and try again.' 
    });
  }
});

// Sign in user
router.post('/login', async (req, res) => {
  try {
    const { email, password }: LoginData = loginSchema.parse(req.body);
    
    const authResponse = await authService.signIn(email, password);
    
    if (!authResponse.user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user from our database
    const user = await storage.getUser(authResponse.user.id);
    
    if (!user) {
      // Create user record if it doesn't exist (for existing Supabase users)
      const newUser = await storage.createUser({
        id: authResponse.user.id,
        email: authResponse.user.email!,
        displayName: authResponse.user.user_metadata?.display_name || authResponse.user.email!.split('@')[0],
        subscriptionTier: 'free',
      });
      
      return res.json({
        user: {
          id: newUser.id,
          email: newUser.email,
          displayName: newUser.displayName,
          subscriptionTier: newUser.subscriptionTier,
          searchesUsed: newUser.searchesUsed,
          searchesLimit: newUser.searchesLimit,
        },
        session: authResponse.session,
      });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier,
        searchesUsed: user.searchesUsed,
        searchesLimit: user.searchesLimit,
      },
      session: authResponse.session,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Sign out user
router.post('/logout', async (req, res) => {
  try {
    await authService.signOut();
    res.json({ message: 'Signed out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }

    const token = authHeader.split(' ')[1];
    const authUser = await authService.verifySession(token);
    
    const user = await storage.getUser(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      subscriptionTier: user.subscriptionTier,
      searchesUsed: user.searchesUsed,
      searchesLimit: user.searchesLimit,
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(401).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await authService.resetPassword(email);
    res.json({ message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    res.status(400).json({ error: error.message });
  }
});

export { router as authRoutes };