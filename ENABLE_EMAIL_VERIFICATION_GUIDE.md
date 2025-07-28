# Step-by-Step Guide: Enable Email Verification in Supabase

## Overview
This guide will help you enable email verification in your Supabase project to fix the issue where new users don't receive verification emails and ensure password reset functionality works properly.

## Step 1: Access Your Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Click on your project: **csaksfdlssftgwobifis**
3. You should see your project overview page

## Step 2: Navigate to Authentication Settings

1. In the left sidebar, click **Authentication**
2. Click **Settings** (under the Authentication section)
3. You should now see the Auth Settings page

## Step 3: Enable Email Confirmation

1. Scroll down to find the **Email confirmation** section
2. Look for a toggle/checkbox labeled **"Confirm email"** or **"Enable email confirmations"**
3. **Turn this ON** (it's currently disabled, which is why users aren't getting verification emails)
4. You should see the setting change from disabled to enabled

## Step 4: Configure Email Redirect URL

1. In the same Email confirmation section, find **"Email confirmation redirect URL"** or **"Confirm email redirect URL"**
2. Set this to your app's domain:
   ```
   https://your-replit-app-name.replit.app/auth?verified=true
   ```
   Replace `your-replit-app-name` with your actual Replit app name
3. Click **Save** or **Update** to apply the changes

## Step 5: Configure Email Templates (Optional but Recommended)

1. Scroll down to find **Email Templates** section
2. Click on **"Confirm signup"** template
3. You can customize the email content if desired:
   - Subject line
   - Email body text
   - Button text and styling
4. Make sure the confirmation link points to your app
5. Click **Save** when done

## Step 6: Test Email Configuration

1. Go back to your web app
2. Try registering a new test account with a real email address you can access
3. You should:
   - NOT be logged in immediately after registration
   - See the email verification dialog in your app
   - Receive a verification email in your inbox (check spam folder too)

## Step 7: Verify the Fix Works

1. Check your email inbox for the verification email
2. Click the verification link in the email
3. You should be redirected to your app with `?verified=true` in the URL
4. You should see a success message
5. You should now be able to sign in normally
6. Password reset functionality should now work for verified emails

## Common Issues and Solutions

### Issue: Still not receiving emails
**Solution:** Check your email provider's spam folder and ensure your Supabase project has email sending enabled.

### Issue: Verification link doesn't work
**Solution:** Double-check the redirect URL in Step 4 matches your actual app domain.

### Issue: Users still get logged in immediately
**Solution:** Wait a few minutes for Supabase settings to propagate, then test with a completely new email address.

## Testing Commands

After making these changes, you can test the configuration by running:

```bash
cd /home/runner/workspace && node test_email_verification.js
```

**Expected output after fix:**
```
✅ Email verification is properly configured - user needs to verify email
📩 Supabase should have sent a verification email
```

## What This Fixes

1. **New User Registration**: Users must verify their email before accessing the app
2. **Password Reset**: Only works for verified email addresses (Supabase requirement)
3. **Security**: Prevents fake email addresses from creating accounts
4. **Email Deliverability**: Improves your sender reputation

## Application Features Already Ready

Your app already has these verification features built-in:
- Email verification dialog with clear instructions
- Resend verification email functionality
- Proper handling of verified vs unverified users
- Password reset flow for verified emails
- Success notifications and user guidance

## Need Help?

If you encounter any issues:
1. Double-check each step above
2. Wait 5-10 minutes for Supabase settings to update
3. Test with a fresh email address you haven't used before
4. Check both inbox and spam folders for verification emails

Once enabled, your email verification system will be fully functional and secure!