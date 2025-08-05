// Test email verification after enabling it in Supabase dashboard
async function testAfterSupabaseFix() {
  console.log('TESTING EMAIL VERIFICATION AFTER SUPABASE CONFIGURATION FIX\n');
  
  const testEmail = `verification.test.${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log(`Testing registration with: ${testEmail}`);
    console.log('Expected behavior: User should NOT get immediate session, should require email verification\n');
    
    // Register new user
    const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: 'Verification Test User'
      })
    });
    
    const registerResult = await registerResponse.json();
    console.log('Registration response:', JSON.stringify(registerResult, null, 2));
    
    if (registerResponse.ok) {
      if (registerResult.emailVerificationRequired) {
        console.log('\n🎉 SUCCESS! Email verification is now working correctly');
        console.log('✅ Registration successful - email verification required');
        console.log('📧 User should receive verification email');
        console.log('🔒 No immediate session created - user must verify email first');
        
        if (registerResult.immediateVerificationLink) {
          console.log('\n🔗 Immediate verification link available for testing:');
          console.log(registerResult.immediateVerificationLink);
          console.log('\nYou can use this link to test the verification flow if email delivery is slow.');
        }
        
        // Test resend functionality
        console.log('\n📧 Testing resend verification email...');
        const resendResponse = await fetch('http://localhost:5000/api/auth/resend-verification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });
        
        if (resendResponse.ok) {
          console.log('✅ Resend verification successful - another email should be sent');
        } else {
          const resendError = await resendResponse.json();
          console.log('❌ Resend verification failed:', resendError.error);
        }
        
        console.log('\n🔄 VERIFICATION FLOW:');
        console.log('1. User receives email with verification link');
        console.log('2. User clicks link and gets redirected to /auth?type=signup');
        console.log('3. App automatically signs them in and redirects to /account');
        console.log('4. User can now use the application');
        
      } else if (registerResult.session) {
        console.log('\n⚠️ EMAIL CONFIRMATION STILL DISABLED');
        console.log('User got immediate session without email verification');
        console.log('Please double-check Supabase Auth settings:');
        console.log('- Go to Authentication → Settings');
        console.log('- Ensure "Confirm email" is turned ON');
        console.log('- Save settings and try again');
      }
    } else {
      console.log('❌ Registration failed:', registerResult.error);
    }
    
    // Clean up test user
    console.log('\n🧹 Cleaning up test user...');
    const usersResponse = await fetch('http://localhost:5000/api/users');
    if (usersResponse.ok) {
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
      } else {
        console.log('ℹ️ Test user not found in database (expected if verification was required)');
      }
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

console.log('After you have enabled email confirmation in Supabase dashboard:');
console.log('1. Go to https://supabase.com/dashboard/project/YOUR_PROJECT/auth/settings');
console.log('2. Turn ON "Confirm email"');
console.log('3. Set Site URL to your app URL');
console.log('4. Save settings');
console.log('5. Run this test again');
console.log('\nPress Ctrl+C to cancel, or wait 5 seconds to run the test...\n');

setTimeout(() => {
  testAfterSupabaseFix().then(() => {
    process.exit(0);
  }).catch(console.error);
}, 5000);