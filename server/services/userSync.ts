// User data synchronization service
// Ensures all user data (email, password via auth, subscription status) is properly captured in Supabase

import { storage } from '../storage';
import { authService } from './supabase';

export class UserSyncService {
  
  // Ensure user profile exists and is synced with Supabase auth
  async ensureUserProfile(authUserId: string, email: string, displayName?: string) {
    try {
      let user = await storage.getUser(authUserId);
      
      if (!user) {
        // Create user profile if it doesn't exist
        user = await storage.createUser({
          id: authUserId,
          email,
          displayName: displayName || email.split('@')[0],
          subscriptionTier: 'free',
        });
        
        console.log(`Created user profile: ${email} (${authUserId})`);
      } else {
        // Update user profile if email or display name changed
        const updates: any = {};
        let needsUpdate = false;
        
        if (user.email !== email) {
          updates.email = email;
          needsUpdate = true;
        }
        
        if (displayName && user.displayName !== displayName) {
          updates.displayName = displayName;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await storage.updateUser(authUserId, updates);
          console.log(`Updated user profile: ${email} (${authUserId})`);
        }
      }
      
      return user;
    } catch (error: any) {
      console.error('Error ensuring user profile:', error);
      throw error;
    }
  }
  
  // Sync subscription status between Stripe and database
  async syncSubscriptionStatus(userId: string, subscriptionData: {
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    subscriptionTier?: 'free' | 'pro' | 'premium';
    subscriptionStatus?: 'active' | 'inactive' | 'cancelled' | 'past_due';
    searchesLimit?: number;
  }) {
    try {
      await storage.updateUser(userId, {
        ...subscriptionData,
        updatedAt: new Date(),
      });
      
      console.log(`Synced subscription for user ${userId}:`, subscriptionData);
    } catch (error: any) {
      console.error('Error syncing subscription status:', error);
      throw error;
    }
  }
  
  // Get complete user profile with subscription details
  async getUserProfile(userId: string) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User profile not found');
      }
      
      return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        subscriptionTier: user.subscriptionTier || 'free',
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        searchesUsed: user.searchesUsed || 0,
        searchesLimit: user.searchesLimit || 10,
        stripeCustomerId: user.stripeCustomerId,
        stripeSubscriptionId: user.stripeSubscriptionId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    } catch (error: any) {
      console.error('Error getting user profile:', error);
      throw error;
    }
  }
  
  // Validate user has required subscription access
  async validateSubscriptionAccess(userId: string, requiredTier?: 'pro' | 'premium') {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return { hasAccess: false, reason: 'User not found' };
      }
      
      // Check if subscription is active
      if (user.subscriptionStatus !== 'active' && requiredTier) {
        return { 
          hasAccess: false, 
          reason: `${requiredTier} subscription required`,
          currentTier: user.subscriptionTier || 'free'
        };
      }
      
      // Check tier level
      if (requiredTier) {
        const tierLevels = { free: 0, pro: 1, premium: 2 };
        const userLevel = tierLevels[user.subscriptionTier as keyof typeof tierLevels] || 0;
        const requiredLevel = tierLevels[requiredTier];
        
        if (userLevel < requiredLevel) {
          return {
            hasAccess: false,
            reason: `${requiredTier} subscription required`,
            currentTier: user.subscriptionTier || 'free'
          };
        }
      }
      
      return { 
        hasAccess: true, 
        user: {
          subscriptionTier: user.subscriptionTier,
          subscriptionStatus: user.subscriptionStatus,
          searchesUsed: user.searchesUsed,
          searchesLimit: user.searchesLimit,
        }
      };
    } catch (error: any) {
      console.error('Error validating subscription access:', error);
      return { hasAccess: false, reason: 'Validation error' };
    }
  }
}

export const userSyncService = new UserSyncService();