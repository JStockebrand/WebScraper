import Stripe from 'stripe';
import { storage } from '../storage';

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