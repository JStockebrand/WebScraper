import Stripe from 'stripe';
import { storage } from '../storage';
import { userSyncService } from './userSync';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  pro: {
    name: 'Pro',
    price: 9.99,
    searchLimit: 100,
    features: ['100 searches/month', 'Priority support', 'Advanced analytics'],
    stripeProductId: 'prod_pro', // You'll create this in Stripe dashboard
    stripePriceId: 'price_pro',   // You'll create this in Stripe dashboard
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    searchLimit: 500,
    features: ['500 searches/month', 'Priority support', 'Advanced analytics', 'API access'],
    stripeProductId: 'prod_premium',
    stripePriceId: 'price_premium',
  }
};

export class StripeService {
  // Create or retrieve Stripe customer
  async getOrCreateCustomer(userId: string, email: string, displayName?: string) {
    const user = await storage.getUser(userId);
    
    if (user?.stripeCustomerId) {
      return await stripe.customers.retrieve(user.stripeCustomerId);
    }

    const customer = await stripe.customers.create({
      email,
      name: displayName || email,
      metadata: {
        userId,
      },
    });

    await storage.updateUser(userId, { stripeCustomerId: customer.id });
    return customer;
  }

  // Create Checkout Session for subscription
  async createCheckoutSession(userId: string, planType: 'pro' | 'premium', successUrl: string, cancelUrl: string) {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const customer = await this.getOrCreateCustomer(userId, user.email, user.displayName || undefined);
    const plan = SUBSCRIPTION_PLANS[planType];

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        planType,
      },
    });

    return session;
  }

  // Fulfill checkout session (called by webhook and redirect)
  async fulfillCheckout(sessionId: string) {
    console.log(`Fulfilling Checkout Session ${sessionId}`);

    try {
      // Check if already fulfilled to prevent duplicate processing
      const existingUser = await this.getCheckoutSessionUser(sessionId);
      if (existingUser && existingUser.subscriptionStatus === 'active') {
        console.log(`Session ${sessionId} already fulfilled`);
        return { success: true, alreadyFulfilled: true };
      }

      // Retrieve the Checkout Session with line_items expanded
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['line_items', 'subscription'],
      });

      // Check payment status
      if (session.payment_status === 'unpaid') {
        console.log(`Session ${sessionId} payment still pending`);
        return { success: false, reason: 'payment_pending' };
      }

      if (session.payment_status === 'paid' && session.subscription) {
        const subscription = session.subscription as Stripe.Subscription;
        const userId = session.metadata?.userId;
        const planType = session.metadata?.planType as 'pro' | 'premium';

        if (!userId || !planType) {
          throw new Error('Missing user ID or plan type in session metadata');
        }

        const plan = SUBSCRIPTION_PLANS[planType];

        // Update user with subscription details using sync service
        await userSyncService.syncSubscriptionStatus(userId, {
          stripeCustomerId: session.customer as string,
          stripeSubscriptionId: subscription.id,
          subscriptionTier: planType,
          subscriptionStatus: 'active',
          searchesLimit: plan.searchLimit,
        });

        console.log(`User subscription fulfilled - User: ${userId}, Plan: ${planType}, Status: active, Stripe Customer: ${session.customer}, Subscription: ${subscription.id}`);

        console.log(`Successfully fulfilled subscription for user ${userId}, plan: ${planType}`);
        return { 
          success: true, 
          userId, 
          planType, 
          subscriptionId: subscription.id 
        };
      }

      return { success: false, reason: 'invalid_payment_status' };
    } catch (error: any) {
      console.error(`Error fulfilling checkout session ${sessionId}:`, error);
      throw error;
    }
  }

  // Helper method to get user from checkout session
  private async getCheckoutSessionUser(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const userId = session.metadata?.userId;
      if (userId) {
        return await storage.getUser(userId);
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  // Create subscription for a user
  async createSubscription(userId: string, planType: 'pro' | 'premium') {
    const user = await storage.getUser(userId);
    if (!user) throw new Error('User not found');

    const customer = await this.getOrCreateCustomer(userId, user.email, user.displayName || undefined);
    const plan = SUBSCRIPTION_PLANS[planType];

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{
        price: plan.stripePriceId,
      }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update user with subscription info
    await storage.updateUser(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionTier: planType,
      searchesLimit: plan.searchLimit,
    });

    return subscription;
  }

  // Create payment intent for subscription
  async createSubscriptionPaymentIntent(userId: string, planType: 'pro' | 'premium') {
    const subscription = await this.createSubscription(userId, planType);
    
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      customerId: subscription.customer,
    };
  }

  // Handle successful payment
  async handleSuccessfulPayment(subscriptionId: string) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer as string;
    
    const customer = await stripe.customers.retrieve(customerId);
    const userId = (customer as Stripe.Customer).metadata.userId;

    if (userId) {
      // Activate subscription
      await storage.updateUser(userId, {
        subscriptionStatus: 'active',
        updatedAt: new Date(),
      });
    }

    return { success: true, userId };
  }

  // Cancel subscription
  async cancelSubscription(userId: string) {
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    
    await storage.updateUser(userId, {
      subscriptionTier: 'free',
      searchesLimit: 10,
      subscriptionStatus: 'cancelled',
    });

    return { success: true };
  }

  // Get subscription details
  async getSubscriptionDetails(userId: string) {
    const user = await storage.getUser(userId);
    if (!user?.stripeSubscriptionId) {
      return null;
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    return subscription;
  }
}

export const stripeService = new StripeService();