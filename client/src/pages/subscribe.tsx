import { useState, useEffect } from 'react';
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

// Load Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Missing required Stripe key: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

interface SubscriptionPlan {
  name: string;
  price: number;
  searchLimit: number;
  features: string[];
}

const PLANS: Record<string, SubscriptionPlan> = {
  pro: {
    name: 'Pro',
    price: 9.99,
    searchLimit: 100,
    features: ['100 searches/month', 'Priority support', 'Advanced analytics'],
  },
  premium: {
    name: 'Premium',
    price: 19.99,
    searchLimit: 500,
    features: ['500 searches/month', 'Priority support', 'Advanced analytics', 'API access'],
  },
};

function SubscribeForm({ planType, clientSecret }: { planType: string; clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const { updateUser } = useAuth();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/account`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
      } else if (paymentIntent?.status === 'succeeded') {
        // Confirm payment on backend
        await apiRequest('/api/stripe/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            subscriptionId: paymentIntent.metadata?.subscriptionId 
          }),
        });

        toast({
          title: "Subscription Activated!",
          description: `Welcome to ${PLANS[planType].name}! Your subscription is now active.`,
        });

        // Refresh user data
        const plan = PLANS[planType];
        updateUser({
          subscriptionTier: planType,
          searchesLimit: plan.searchLimit,
        });

        setLocation('/account');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "An error occurred during payment processing.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      <Button 
        type="submit" 
        disabled={!stripe || !elements || isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Subscribe to ${PLANS[planType].name} - $${PLANS[planType].price}/month`
        )}
      </Button>
    </form>
  );
}

function PlanSelector({ onSelectPlan }: { onSelectPlan: (plan: string) => void }) {
  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      {Object.entries(PLANS).map(([key, plan]) => (
        <Card key={key} className="relative">
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <Badge variant={key === 'premium' ? 'default' : 'secondary'}>
                {key === 'premium' ? 'Popular' : 'Basic'}
              </Badge>
            </div>
            <div className="text-3xl font-bold">
              ${plan.price}
              <span className="text-lg text-muted-foreground">/month</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-lg font-semibold">
              {plan.searchLimit} searches per month
            </div>
            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button 
              onClick={() => onSelectPlan(key)}
              className="w-full"
              variant={key === 'premium' ? 'default' : 'outline'}
            >
              Choose {plan.name}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubscribePage() {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if not authenticated
  if (!user) {
    setTimeout(() => setLocation('/auth'), 0);
    return null;
  }

  const handleSelectPlan = async (planType: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/stripe/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription');
      }

      setClientSecret(data.clientSecret);
      setSelectedPlan(planType);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate subscription process.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Setting up your subscription...</p>
        </div>
      </div>
    );
  }

  if (!selectedPlan || !clientSecret) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground">
              Upgrade your research capabilities with more searches and advanced features
            </p>
          </div>
          <PlanSelector onSelectPlan={handleSelectPlan} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Complete Your Subscription</CardTitle>
            <p className="text-muted-foreground">
              You're subscribing to {PLANS[selectedPlan].name} - ${PLANS[selectedPlan].price}/month
            </p>
          </CardHeader>
          <CardContent>
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <SubscribeForm planType={selectedPlan} clientSecret={clientSecret} />
            </Elements>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}