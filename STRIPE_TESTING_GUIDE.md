# Stripe Checkout Integration Testing Guide

## Overview
Your web scrape summarizer now has **Stripe Checkout** integration with a complete fulfillment system following Stripe's best practices. This provides a secure, hosted payment experience.

## Architecture
- **Stripe Checkout**: Hosted payment pages (no card data on your servers)
- **Webhook Fulfillment**: Automatic subscription activation
- **Dual Fulfillment**: Both webhook and redirect-based fulfillment for reliability
- **Idempotent Processing**: Prevents duplicate fulfillment

## Test Mode vs Live Mode
- **Currently in TEST MODE**: Your Stripe keys start with `pk_test_` and `sk_test_`
- All payments are simulated - no real money is charged
- Perfect for development and testing

## Subscription Plans
- **Pro Plan**: $9.99/month, 100 searches
- **Premium Plan**: $19.99/month, 500 searches  

## Stripe Checkout Flow
1. User selects a plan on `/subscribe`
2. Creates Checkout Session via API
3. Redirects to Stripe-hosted payment page
4. User enters payment details securely on Stripe
5. Returns to your app with success/cancel status
6. Fulfillment system activates subscription

## How to Test Stripe Checkout Integration

### 1. Setup Products in Stripe Dashboard
Visit https://dashboard.stripe.com/products and create:

**Pro Product:**
- Name: "Pro Plan"
- Price: $9.99 USD monthly recurring
- Copy the Price ID (starts with `price_`) 

**Premium Product:**
- Name: "Premium Plan"  
- Price: $19.99 USD monthly recurring
- Copy the Price ID (starts with `price_`)

### 2. Update Product IDs
Currently using placeholder IDs in `server/services/stripeService.ts`:
```typescript
pro: {
  stripePriceId: 'price_pro',   // Replace with actual Price ID
},
premium: {
  stripePriceId: 'price_premium', // Replace with actual Price ID
}
```

### 3. Test Credit Cards (Test Mode Only)
Use these test card numbers:

**Successful Payments:**
- `4242424242424242` (Visa)
- `4000056655665556` (Visa Debit)
- `5555555555554444` (Mastercard)

**Failed Payments:**
- `4000000000000002` (Card declined)
- `4000000000009995` (Insufficient funds)

**Authentication Required:**
- `4000002500003155` (Requires 3D Secure)

**For all test cards:**
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC (e.g., 123)
- Use any zip code (e.g., 12345)

### 4. Testing the Complete Checkout Flow

**Step 1: Plan Selection**
1. Visit `/subscribe` in your app
2. You'll see two subscription plans with pricing and features
3. Click "Choose Pro" or "Choose Premium"

**Step 2: Stripe Checkout (Hosted)**
1. You'll be redirected to Stripe's secure checkout page
2. The page shows your selected plan and pricing
3. Enter test card information:
   - Card: `4242424242424242` (Visa success)
   - Expiry: Any future date (e.g., 12/25)
   - CVC: Any 3 digits (e.g., 123)
   - ZIP: Any zip code (e.g., 12345)

**Step 3: Payment Processing**
1. Click "Subscribe" on Stripe's page
2. Stripe processes the payment securely
3. You're redirected back to your app

**Step 4: Fulfillment & Success**
1. App shows "Subscription Activated!" message
2. Your account is automatically updated
3. Search limits increase based on plan
4. Subscription status becomes "active"

**Step 5: Verification**
1. Go to your account page (`/account`)
2. Verify subscription tier is updated
3. Check search limit matches plan
4. Test that searches work within new limits

### 5. API Endpoints for Testing

**Get Available Plans:**
```bash
curl http://localhost:5000/api/stripe/plans
```

**Create Checkout Session (requires authentication):**
```bash
curl -X POST http://localhost:5000/api/stripe/create-checkout-session \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "pro"}'
```

**Manual Fulfillment (for testing):**
```bash
curl -X POST http://localhost:5000/api/stripe/fulfill-checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "cs_test_..."}'
```

**Get Plans:**
```bash
curl http://localhost:5000/api/stripe/plans
```

**Create Subscription (Authenticated):**
```bash
curl -X POST http://localhost:5000/api/stripe/create-subscription \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"planType": "pro"}'
```

**Cancel Subscription (Authenticated):**
```bash
curl -X POST http://localhost:5000/api/stripe/cancel-subscription \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 6. Fulfillment System Features

**Automatic Fulfillment via Webhooks:**
- Stripe sends `checkout.session.completed` events
- Your server automatically activates subscriptions
- Works even if user closes browser after payment

**Redirect-based Fulfillment:**
- User returns to success page after payment
- App calls fulfillment API with session ID
- Provides immediate feedback to user

**Idempotent Processing:**
- Same session can be fulfilled multiple times safely
- Prevents duplicate subscription activation
- Handles race conditions between webhook and redirect

**Error Handling:**
- Failed payments show clear error messages
- Canceled payments redirect to retry page
- Network issues are handled gracefully

### 7. Database Updates
When payments succeed:
- User's `subscriptionTier` updates to 'pro' or 'premium'
- `searchesLimit` increases to plan limit
- `stripeCustomerId` and `stripeSubscriptionId` are stored

### 8. Frontend Features
- `/subscribe` - Subscription selection and payment
- User menu shows "Upgrade Plan" option
- Account page displays current subscription tier
- Search quota reflects subscription limits

### 9. Error Handling
The system handles:
- Failed payments with user-friendly messages
- Authentication requirements
- Stripe API errors
- Network issues

### 10. Webhook Setup for Production

For production deployment, set up webhooks:

1. Go to https://dashboard.stripe.com/webhooks
2. Create endpoint: `https://yourdomain.com/api/stripe/webhook`
3. Select events:
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret (starts with `whsec_`)
5. Add as `STRIPE_WEBHOOK_SECRET` environment variable

### 11. Going Live
When ready for production:
1. Replace test keys with live keys (start with `pk_live_` and `sk_live_`)
2. Update product/price IDs to live versions
3. Set up webhook endpoints for subscription events
4. Test with small amounts first

### 12. Testing Different Scenarios

**Test Successful Payment:**
- Use `4242424242424242`
- Complete full flow
- Verify subscription activation

**Test Declined Payment:**
- Use `4000000000000002`
- Verify error handling
- Ensure no subscription is created

**Test Authentication Required:**
- Use `4000002500003155`
- Follow 3D Secure prompts
- Verify successful completion

**Test Payment Cancellation:**
- Start checkout process
- Click browser back or close tab
- Verify no subscription is created

**Test Webhook vs Redirect Race:**
- Complete payment normally
- Check that both webhook and redirect fulfill safely
- Verify no duplicate processing

## Security Features
- Payment data never touches your servers
- Stripe handles all sensitive card information
- Secure token-based authentication
- User sessions verified for all payment operations

## Monitoring
Check the Stripe Dashboard for:
- Payment attempts and successes
- Customer creation
- Subscription status changes
- Failed payment reasons