// Investigate email confirmation issues
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pjubpjuxxepczgguxhgf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function investigateEmailIssue() {
  console.log('🔍 Investigating email confirmation issues...\n');
  
  try {
    // Step 1: Check current email settings and users
    console.log('1. Checking current Supabase configuration...');
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log(`   ✗ Error accessing Supabase: ${listError.message}`);
      console.log('   This might indicate a configuration issue');
      return;
    }
    
    console.log(`   ✓ Successfully connected to Supabase`);
    console.log(`   Total users in system: ${users.users.length}`);
    
    // Show recent users and their verification status
    const recentUsers = users.users
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
    
    console.log('\n   Recent users:');
    recentUsers.forEach(user => {
      console.log(`   - ${user.email} | Created: ${user.created_at} | Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    });
    
    // Step 2: Test registration to see what happens
    console.log('\n2. Testing registration flow...');
    const testEmail = 'test.email.investigation@gmail.com';
    
    try {
      const { data: regData, error: regError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'TempPassword123!',
        email_confirm: false // Don't auto-confirm, force email verification
      });
      
      if (regError) {
        console.log(`   Registration test error: ${regError.message}`);
        
        // Common email issues to check
        if (regError.message.includes('SMTP')) {
          console.log('   🚨 SMTP configuration issue detected');
          console.log('   This means Supabase cannot send emails');
        } else if (regError.message.includes('email_address_invalid')) {
          console.log('   🚨 Email validation issue');
          console.log('   Supabase may be configured to only allow specific domains');
        } else if (regError.message.includes('already')) {
          console.log('   ℹ Test email already exists (expected in testing)');
        }
      } else {
        console.log(`   ✓ Test user created: ${regData.user?.id}`);
        console.log(`   Email confirmed: ${regData.user?.email_confirmed_at ? 'Yes' : 'No'}`);
        console.log(`   Confirmation sent: ${regData.user?.confirmation_sent_at || 'No timestamp'}`);
        
        // Clean up test user
        await supabaseAdmin.auth.admin.deleteUser(regData.user.id);
        console.log('   ✓ Test user cleaned up');
      }
    } catch (testError) {
      console.log(`   Test registration failed: ${testError.message}`);
    }
    
    // Step 3: Check email template configuration
    console.log('\n3. Email template configuration check...');
    console.log('   Current template should use: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup');
    console.log('   Redirect URL should be: http://localhost:5000/auth');
    
    // Step 4: Test our own registration endpoint
    console.log('\n4. Testing application registration endpoint...');
    const appTestEmail = 'app.test.email@gmail.com';
    
    const regResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: appTestEmail,
        password: 'TestPassword123!',
        displayName: 'Test User'
      })
    });
    
    const regResult = await regResponse.json();
    console.log(`   App registration status: ${regResponse.status}`);
    console.log(`   Response: ${JSON.stringify(regResult, null, 2)}`);
    
    if (regResult.emailVerificationRequired) {
      console.log('   ✓ Email verification flow is correctly configured in app');
    }
    
    console.log('\n📧 COMMON EMAIL ISSUES TO CHECK:');
    console.log('1. Supabase SMTP Configuration:');
    console.log('   - Go to Dashboard → Settings → Auth → SMTP Settings');
    console.log('   - Ensure SMTP is properly configured (not using Supabase default)');
    console.log('');
    console.log('2. Email Template Configuration:');
    console.log('   - Dashboard → Auth → Email Templates → Confirm signup');
    console.log('   - Link should be: {{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=signup');
    console.log('');
    console.log('3. Redirect URLs:');
    console.log('   - Dashboard → Auth → URL Configuration');
    console.log('   - Site URL: http://localhost:5000');
    console.log('   - Redirect URLs: http://localhost:5000/**');
    console.log('');
    console.log('4. Email Delivery:');
    console.log('   - Check spam/junk folder');
    console.log('   - Verify sender domain is not blocked');
    console.log('   - Consider using a custom SMTP provider (Gmail, SendGrid, etc.)');
    
  } catch (error) {
    console.error('\n❌ Investigation error:', error.message);
  }
}

// Add fetch polyfill
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

investigateEmailIssue().then(() => {
  console.log('\n🔍 Email investigation complete.');
  process.exit(0);
}).catch(console.error);