# Supabase Redirect URL Configuration

## Overview
Implemented proper redirect URL functionality according to [Supabase documentation](https://supabase.com/docs/guides/auth/redirect-urls).

## Changes Made

### 1. Dynamic URL Generation
- Created `client/src/lib/redirectUrls.ts` for environment-aware URL generation
- Added server-side URL helpers in `server/services/supabase.ts`
- Automatic detection of production vs development environments

### 2. Enhanced Authentication Handling
- Updated auth page to handle multiple authentication types:
  - Email verification (`type=signup`)
  - Password reset (`type=recovery`)
  - Generic OAuth redirects
- Added proper error handling for authentication failures
- Improved URL parameter parsing (both query params and hash fragments)

### 3. URL Configuration Required in Supabase Dashboard

You need to configure these URLs in your Supabase project dashboard:

#### Step 1: Go to URL Configuration
1. Visit [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project: **csaksfdlssftgwobifis**
3. Navigate to **Authentication** → **URL Configuration**

#### Step 2: Set Site URL
Set your **Site URL** to your production domain:
```
https://your-app-name.replit.app
```

#### Step 3: Add Additional Redirect URLs
Add these URLs to the **Additional Redirect URLs** list:

**For Development:**
```
http://localhost:5000/**
```

**For Replit Production:**
```
https://your-app-name.replit.app/**
https://your-app-name.replit.app/auth
https://your-app-name.replit.app/auth?type=signup
https://your-app-name.replit.app/auth?type=recovery
```

### 4. Email Template Updates Needed

#### In Supabase Dashboard → Authentication → Email Templates:

**Update Confirmation Email Template:**
Change from:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your email</a>
```

To:
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

**Update Password Reset Email Template:**
Change from:
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

To:
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

## Environment Variables

Add to your Replit Secrets (if not already present):
```
SITE_URL=https://your-app-name.replit.app
```

## How It Works Now

### Email Verification Flow:
1. User registers → Receives email with verification link
2. Click link → Redirects to `/auth?type=signup&access_token=...&refresh_token=...`
3. App detects tokens → Automatically signs user in
4. Success message → Redirect to home page

### Password Reset Flow:
1. User requests reset → Receives email with reset link  
2. Click link → Redirects to `/auth?type=recovery&access_token=...&refresh_token=...`
3. App detects recovery type → Shows "Reset Link Verified" message
4. Redirects to password reset form

### Error Handling:
- Authentication errors are parsed from URL parameters
- User-friendly error messages displayed
- Automatic URL cleanup after processing

## Benefits
- ✅ Follows Supabase best practices
- ✅ Supports multiple environments automatically
- ✅ Proper error handling for failed authentication
- ✅ Clean URL management (no leftover parameters)
- ✅ Seamless user experience for email verification and password resets

## Next Steps
1. Update the URLs in your Supabase dashboard as shown above
2. Update email templates to use `{{ .RedirectTo }}`
3. Test the authentication flows with a new user registration

The application will automatically handle all redirect scenarios based on your environment!