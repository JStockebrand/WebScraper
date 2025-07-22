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

  // Create Checkout Session for subscription
  app.post("/api/stripe/create-checkout-session", authenticateUser, async (req: any, res) => {
    try {
      const { planType } = req.body;
      const user = req.user;

      if (!planType || !['pro', 'premium'].includes(planType)) {
        return res.status(400).json({ error: 'Invalid plan type' });
      }

      const baseUrl = process.env.NODE_ENV === 'production' 
        ? `https://${req.get('host')}` 
        : `http://${req.get('host')}`;
      
      const successUrl = `${baseUrl}/subscribe?success=true&session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${baseUrl}/subscribe?canceled=true`;

      const session = await stripeService.createCheckoutSession(
        user.id, 
        planType, 
        successUrl, 
        cancelUrl
      );
      
      res.json({
        sessionId: session.id,
        url: session.url,
      });
    } catch (error: any) {
      console.error('Create checkout session error:', error);
      res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
  });

  // Handle successful checkout (called from success redirect)
  app.post("/api/stripe/fulfill-checkout", authenticateUser, async (req: any, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({ error: 'Session ID required' });
      }

      const result = await stripeService.fulfillCheckout(sessionId);
      
      if (result.success) {
        res.json({ 
          success: true, 
          message: result.alreadyFulfilled ? 'Already fulfilled' : 'Subscription activated successfully',
          planType: result.planType
        });
      } else {
        res.status(400).json({ 
          success: false, 
          error: result.reason || 'Fulfillment failed' 
        });
      }
    } catch (error: any) {
      console.error('Fulfill checkout error:', error);
      res.status(500).json({ error: error.message || 'Failed to fulfill checkout' });
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

  // Stripe webhook endpoint for automatic fulfillment
  app.post("/api/stripe/webhook", async (req, res) => {
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!endpointSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not set, webhook signature verification disabled');
    }

    try {
      let event = req.body;

      // Verify webhook signature in production
      if (endpointSecret) {
        const sig = req.headers['stripe-signature'] as string;
        
        try {
          event = stripe.webhooks.constructEvent(req.rawBody || req.body, sig, endpointSecret);
        } catch (err: any) {
          console.error('Webhook signature verification failed:', err.message);
          return res.status(400).json({ error: 'Webhook signature verification failed' });
        }
      }

      // Handle the event
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Checkout session completed:', event.data.object.id);
          try {
            await stripeService.fulfillCheckout(event.data.object.id);
          } catch (error: any) {
            console.error('Error fulfilling checkout from webhook:', error);
          }
          break;
          
        case 'checkout.session.async_payment_succeeded':
          console.log('Async payment succeeded:', event.data.object.id);
          try {
            await stripeService.fulfillCheckout(event.data.object.id);
          } catch (error: any) {
            console.error('Error fulfilling async payment from webhook:', error);
          }
          break;
          
        case 'checkout.session.async_payment_failed':
          console.log('Async payment failed:', event.data.object.id);
          // TODO: Send email to customer about failed payment
          break;
          
        case 'invoice.payment_succeeded':
          console.log('Invoice payment succeeded:', event.data.object.id);
          break;
          
        case 'invoice.payment_failed':
          console.log('Invoice payment failed:', event.data.object.id);
          break;
          
        case 'customer.subscription.deleted':
          console.log('Subscription cancelled:', event.data.object.id);
          // TODO: Update user subscription status to cancelled
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