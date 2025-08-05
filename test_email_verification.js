// Test email verification functionality
async function testEmailVerification() {
  console.log('TESTING EMAIL VERIFICATION FUNCTIONALITY\n');
  
  const testEmail = `test.verification.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log(`1. Testing user registration with: ${testEmail}`);
    
    // Register new user
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: 'Test User'
      })
    });
    
    const registerResult = await registerResponse.json();
    console.log('Registration response:', JSON.stringify(registerResult, null, 2));
    
    if (registerResponse.ok) {
      if (registerResult.emailVerificationRequired) {
        console.log('✅ Registration successful - email verification required');
        console.log('📧 User should receive verification email');
        
        if (registerResult.immediateVerificationLink) {
          console.log('🔗 Immediate verification link available:');
          console.log(registerResult.immediateVerificationLink);
        }
        
        // Test resend verification
        console.log('\n2. Testing resend verification email...');
        const resendResponse = await fetch('http://localhost:5000/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });
        
        if (resendResponse.ok) {
          console.log('✅ Resend verification successful');
        } else {
          const resendError = await resendResponse.json();
          console.log('❌ Resend verification failed:', resendError.error);
        }
        
      } else if (registerResult.session) {
        console.log('⚠️ Registration successful but no email verification required');
        console.log('This means email confirmation is disabled in Supabase');
      }
    } else {
      console.log('❌ Registration failed:', registerResult.error);
    }
    
    // Clean up test user
    console.log('\n3. Cleaning up test user...');
    const usersResponse = await fetch('http://localhost:5000/api/users');
    const users = await usersResponse.json();
    const testUser = users.find(u => u.email === testEmail);
    
    if (testUser) {
      const deleteResponse = await fetch(`http://localhost:5000/api/users/${testUser.id}`, {
        method: 'DELETE'
      });
      
      if (deleteResponse.ok) {
        console.log('✅ Test user cleaned up successfully');
      } else {
        console.log('⚠️ Could not clean up test user - manual cleanup may be needed');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Additional diagnostic function
async function checkSupabaseConfig() {
  console.log('\nCHECKING SUPABASE CONFIGURATION\n');
  
  // Check if required env vars are present
  console.log('Environment variables check:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Present' : '❌ Missing');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Present' : '❌ Missing');
  
  console.log('\nSubabase Configuration Notes:');
  console.log('- Email confirmation must be enabled in Supabase Auth settings');
  console.log('- Site URL should be set to your application URL');
  console.log('- Email templates should be properly configured');
  console.log('- SMTP settings may need configuration for reliable delivery');
}

async function runFullTest() {
  await checkSupabaseConfig();
  await testEmailVerification();
  
  console.log('\n=== EMAIL VERIFICATION TEST COMPLETE ===');
  console.log('\nIf emails are not being received:');
  console.log('1. Check Supabase Auth settings (Confirm email: ON)');
  console.log('2. Verify Site URL in Supabase settings');
  console.log('3. Check Email Templates configuration');
  console.log('4. Consider configuring SMTP settings');
  console.log('5. Check spam/junk folders');
  console.log('6. Review Supabase logs for email-related errors');
}

runFullTest().then(() => {
  process.exit(0);
}).catch(console.error);