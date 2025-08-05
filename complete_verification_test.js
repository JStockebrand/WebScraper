// Complete email verification test
import { createClient } from '@supabase/supabase-js';

async function testCompleteVerificationFlow() {
  console.log('🧪 COMPLETE EMAIL VERIFICATION TEST\n');
  
  const testEmail = `complete.test.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`Testing with: ${testEmail}`);
  console.log('Expected: User should receive verification email\n');
  
  try {
    // 1. Register new user
    console.log('1. REGISTERING USER...');
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: 'Complete Test User'
      })
    });
    
    const registerResult = await registerResponse.json();
    
    if (registerResponse.ok && registerResult.emailVerificationRequired) {
      console.log('✅ Registration successful - verification required');
      console.log('📧 Verification email should be sent to:', testEmail);
      
      if (registerResult.immediateVerificationLink) {
        console.log('\n🔗 IMMEDIATE VERIFICATION LINK (for testing):');
        console.log(registerResult.immediateVerificationLink);
        console.log('\nYou can click this link to test the verification flow if email is slow.');
      }
      
      console.log('\n📥 EMAIL DELIVERY CHECKLIST:');
      console.log('✓ Check your inbox for email from Supabase');
      console.log('✓ Check spam/junk folder');
      console.log('✓ Email may take 1-5 minutes to arrive');
      console.log('✓ Look for subject like "Confirm your signup"');
      
      // 2. Check Supabase logs for email send status
      console.log('\n2. CHECKING EMAIL SEND STATUS...');
      
      const supabaseAdmin = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );
      
      // Get the user from Supabase to check status
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
      const testUser = users?.users?.find(u => u.email === testEmail);
      
      if (testUser) {
        console.log('✅ User created in Supabase Auth');
        console.log('📧 Email confirmation status:', testUser.email_confirmed_at ? 'Confirmed' : 'Pending');
        console.log('🕒 Created at:', testUser.created_at);
        
        if (!testUser.email_confirmed_at) {
          console.log('\n🎯 VERIFICATION NEEDED:');
          console.log('- User must click verification link in email');
          console.log('- Or use the immediate verification link above');
          console.log('- Then they will be redirected and can sign in');
        }
      }
      
      console.log('\n3. TESTING EMAIL TEMPLATE CONFIGURATION...');
      console.log('📋 Verify these Supabase settings:');
      console.log('- Authentication → Email Templates → "Confirm signup" is enabled');
      console.log('- Template contains {{ .ConfirmationURL }}');
      console.log('- Redirect URL is set to {{ .SiteURL }}/auth?type=signup');
      
      console.log('\n4. SMTP CONFIGURATION CHECK...');
      console.log('📤 If emails aren\'t arriving, consider:');
      console.log('- Supabase built-in SMTP (30 emails/hour limit)');
      console.log('- Configure custom SMTP in Project Settings → Auth');
      console.log('- Check Supabase logs for email send errors');
      
    } else if (registerResult.session) {
      console.log('⚠️ EMAIL VERIFICATION BYPASS DETECTED');
      console.log('Registration gave immediate session - this suggests:');
      console.log('- Email confirmation might still be disabled');
      console.log('- Or there\'s a configuration issue');
    } else {
      console.log('❌ Registration failed:', registerResult.error);
    }
    
    // Clean up
    console.log('\n5. CLEANING UP...');
    const usersResponse = await fetch('http://localhost:5000/api/users');
    if (usersResponse.ok) {
      const users = await usersResponse.json();
      const testUser = users.find(u => u.email === testEmail);
      
      if (testUser) {
        const deleteResponse = await fetch(`http://localhost:5000/api/users/${testUser.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log('✅ Test user cleaned up');
        }
      }
    }
    
    console.log('\n🎉 VERIFICATION TEST COMPLETE');
    console.log('\nNEXT STEPS:');
    console.log('1. Check your email inbox for verification message');
    console.log('2. If no email, check spam folder');
    console.log('3. If still no email, configure SMTP in Supabase');
    console.log('4. Use immediate verification link for testing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteVerificationFlow().then(() => {
  process.exit(0);
}).catch(console.error);