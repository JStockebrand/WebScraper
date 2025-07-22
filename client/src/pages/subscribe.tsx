import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';

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

function SuccessMessage({ planType }: { planType: string }) {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-2xl font-bold text-green-700 dark:text-green-300">
            Subscription Activated!
          </h2>
          <p className="text-muted-foreground">
            Welcome to {PLANS[planType].name}! Your subscription is now active and you have access to {PLANS[planType].searchLimit} searches per month.
          </p>
          <Button onClick={() => window.location.href = '/account'}>
            Go to Account
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanSelector({ onSelectPlan, loading }: { onSelectPlan: (plan: string) => void; loading: boolean }) {
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
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                `Choose ${plan.name}`
              )}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function SubscribePage() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Check URL parameters for success/canceled
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get('success');
  const canceled = urlParams.get('canceled');
  const sessionId = urlParams.get('session_id');
  const [planType, setPlanType] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Handle successful payment
  useEffect(() => {
    if (success === 'true' && sessionId && !isSuccess) {
      setIsSuccess(true);
      handleSuccessfulPayment(sessionId);
    }
  }, [success, sessionId]);

  // Redirect if not authenticated
  if (!user) {
    setTimeout(() => setLocation('/auth'), 0);
    return null;
  }

  const handleSuccessfulPayment = async (sessionId: string) => {
    try {
      const response = await apiRequest('/api/stripe/fulfill-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      
      if (data.success) {
        setPlanType(data.planType);
        
        // Update user context
        const plan = PLANS[data.planType];
        updateUser({
          subscriptionTier: data.planType,
          searchesLimit: plan.searchLimit,
          subscriptionStatus: 'active',
        });

        toast({
          title: "Success!",
          description: `Your ${plan.name} subscription is now active!`,
        });
      } else {
        throw new Error(data.error || 'Failed to activate subscription');
      }
    } catch (error: any) {
      console.error('Error fulfilling checkout:', error);
      toast({
        title: "Error",
        description: error.message || "There was an issue activating your subscription. Please contact support.",
        variant: "destructive",
      });
    }
  };

  const handleSelectPlan = async (planType: string) => {
    setLoading(true);
    try {
      const response = await apiRequest('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planType }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to initiate checkout process.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  // Show success message if payment was successful
  if (success === 'true' && planType) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <SuccessMessage planType={planType} />
      </div>
    );
  }

  // Show canceled message if payment was canceled
  if (canceled === 'true') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                Payment Canceled
              </h2>
              <p className="text-muted-foreground">
                Your payment was canceled. You can try again anytime.
              </p>
              <Button onClick={() => window.location.href = '/subscribe'}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-xl text-muted-foreground">
            Upgrade your research capabilities with more searches and advanced features
          </p>
        </div>
        <PlanSelector onSelectPlan={handleSelectPlan} loading={loading} />
      </div>
    </div>
  );
}