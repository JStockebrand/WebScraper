import type { Express } from "express";
import { stripeService, SUBSCRIPTION_PLANS } from '../services/stripeService';
import { storage } from '../storage';
import { authService } from '../services/supabase';

// Middleware to verify user authentication (copied from main routes)
async function authenticateUser(req: any, res: any, next: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.split(' ')[1];
    const authUser = await authService.verifySession(token);
    
    const user = await storage.getUser(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error: any) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export function registerStripeRoutes(app: Express) {
  // Get subscription plans
  app.get("/api/stripe/plans", (req, res) => {
    res.json({
      plans: SUBSCRIPTION_PLANS
    });
  });

  // Create subscription payment intent
  app.post("/api/stripe/create-subscription", authenticateUser, async (req: any, res) => {
    try {
      const { planType } = req.body;
      const user = req.user;

      if (!planType || !['pro', 'premium'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const result = await stripeService.createSubscriptionPaymentIntent(user.id, planType);
      
      res.json({
        clientSecret: result.clientSecret,
        subscriptionId: result.subscriptionId,
        customerId: result.customerId,
      });
    } catch (error: any) {
      console.error('Create subscription error:', error);
      res.status(500).json({ error: error.message || 'Failed to create subscription' });
    }
  });

  // Handle successful payment confirmation
  app.post("/api/stripe/confirm-payment", authenticateUser, async (req: any, res) => {
    try {
      const { subscriptionId } = req.body;
      
      if (!subscriptionId) {
        return res.status(400).json({ error: 'Subscription ID required' });
      }

      const result = await stripeService.handleSuccessfulPayment(subscriptionId);
      
      res.json({ success: true, message: 'Subscription activated successfully' });
    } catch (error: any) {
      console.error('Confirm payment error:', error);
      res.status(500).json({ error: error.message || 'Failed to confirm payment' });
    }
  });

  // Cancel subscription
  app.post("/api/stripe/cancel-subscription", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      
      const result = await stripeService.cancelSubscription(user.id);
      
      res.json({ success: true, message: 'Subscription cancelled successfully' });
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
    }
  });

  // Get subscription details
  app.get("/api/stripe/subscription", authenticateUser, async (req: any, res) => {
    try {
      const user = req.user;
      
      const subscription = await stripeService.getSubscriptionDetails(user.id);
      
      if (!subscription) {
        return res.json({ subscription: null });
      }
      
      res.json({ 
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_start: subscription.current_period_start,
          current_period_end: subscription.current_period_end,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }
      });
    } catch (error: any) {
      console.error('Get subscription error:', error);
      res.status(500).json({ error: error.message || 'Failed to get subscription details' });
    }
  });

  // Stripe webhook endpoint (for production)
  app.post("/api/stripe/webhook", async (req, res) => {
    try {
      // In production, you should verify the webhook signature
      const event = req.body;

      switch (event.type) {
        case 'invoice.payment_succeeded':
          // Handle successful payment
          console.log('Payment succeeded:', event.data.object.id);
          break;
        case 'invoice.payment_failed':
          // Handle failed payment
          console.log('Payment failed:', event.data.object.id);
          break;
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          console.log('Subscription cancelled:', event.data.object.id);
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: 'Webhook error' });
    }
  });
}