# Supabase Email Template Updates

## How to Update Email Templates

### Step 1: Access Email Templates
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/projects)
2. Select your project: **csaksfdlssftgwobifis**
3. Navigate to **Authentication** → **Email Templates**

### Step 2: Update Confirm Email Template

**Find the "Confirm signup" template and update the HTML:**

**OLD (find this in your template):**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirm your mail</a>
```

**NEW (replace with this):**
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup">Confirm your email</a>
```

**Or if you have a more complete template, look for any link that contains:**
- `{{ .SiteURL }}`
- `token_hash={{ .TokenHash }}`
- `type=email`

**And replace the entire link href with:**
```html
href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup"
```

### Step 3: Update Password Reset Template

**Find the "Reset password" template and update the HTML:**

**OLD (find this in your template):**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a>
```

**NEW (replace with this):**
```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Reset your password</a>
```

### Step 4: Save Changes
- Click **Save** or **Update** after making each change
- Test with a new user registration to verify the links work

## What This Does

### Before Update:
- Email links pointed to hardcoded URLs
- May not work properly with your redirect configuration

### After Update:
- `{{ .RedirectTo }}` uses the dynamic redirect URL you configured
- `type=signup` and `type=recovery` help the app distinguish between verification and password reset
- Links will properly redirect users to your app and automatically sign them in

## Common Template Patterns

Your templates might look like one of these patterns:

**Pattern 1 - Simple Link:**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">
```

**Pattern 2 - Button Style:**
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email" style="...">
  <button>Confirm Email</button>
</a>
```

**Pattern 3 - Full URL:**
```html
href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email"
```

**In ALL cases, replace with:**
```html
href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup"
```

## Testing

After updating the templates:
1. Register a new test user
2. Check the verification email
3. Click the verification link
4. Should redirect to your app and automatically sign in
5. Should see "Welcome! Your email has been verified and you're now signed in."

The redirect system is now fully configured and ready to work!