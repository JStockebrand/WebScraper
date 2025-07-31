# Fix Duplicate URLs in Confirmation Email

## Issue Identified
Your confirmation email shows two different URLs:
1. `...?type=signup` (correct for email verification)
2. `...?type=recovery` (incorrect - this is for password reset)

## Root Cause
The email template likely has both signup and recovery links, or there's template code duplication.

## Solution: Clean Email Template

### Step 1: Access Email Templates
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project: **csaksfdlssftgwobifis**
3. Navigate to **Authentication** → **Email Templates**
4. Select **"Confirm signup"** template

### Step 2: Replace Entire Template

**Replace the ENTIRE template content with this clean version:**

```html
<h2>Confirm your signup</h2>

<p>Follow this link to confirm your user:</p>

<p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a></p>

<p>You're receiving this email because you signed up for an application powered by Supabase.</p>
```

### Step 3: Verify Template Content

**Make sure the template ONLY contains:**
- ONE link with `{{ .RedirectTo }}`
- ONE `type=signup` parameter
- NO recovery/password reset links
- NO duplicate URLs

### Step 4: Alternative Minimal Template

If you want an even cleaner template:

```html
<h2>Confirm Your Email</h2>

<p>Click the link below to verify your email address and activate your account:</p>

<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup" 
     style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">
    Verify Email Address
  </a>
</p>

<p>If the button doesn't work, copy and paste this link into your browser:</p>
<p>{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup</p>

<p><small>This link will expire in 24 hours for security reasons.</small></p>
```

## What to Remove

**Look for and REMOVE any of these patterns:**
- Multiple `<a href=` tags
- Any links with `type=recovery`
- Any links with `type=email`
- Duplicate `{{ .TokenHash }}` references
- Old `{{ .SiteURL }}` references

## Testing

After updating the template:
1. Register a new test user
2. Check the confirmation email
3. Should see ONLY ONE verification link
4. Link should contain `type=signup`
5. Click should automatically sign user in

## Expected Result

The new email should contain only ONE clean link like:
```
https://web-scope-summary-jwstockebrand.replit.app/auth?token_hash=XXXXX&type=signup
```

This will eliminate the duplicate URLs and provide a clean user experience.