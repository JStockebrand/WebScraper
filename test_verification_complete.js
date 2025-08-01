// Test the complete email verification flow
import { storage } from './server/storage.ts';

async function testCompleteVerificationFlow() {
  const email = 'jwstock3921@gmail.com';
  
  console.log('Testing complete email verification flow...\n');
  
  // Step 1: Check current user state
  console.log('1. Current User State:');
  try {
    const user = await storage.getUserByEmail(email);
    if (user) {
      console.log(`   ✓ User exists: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Status: ${user.subscriptionStatus}`);
      
      // Step 2: Test login attempt (should fail if not verified)
      console.log('\n2. Testing Login (Should fail if not verified):');
      const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: 'NewPassword123!'
        })
      });
      
      const loginResult = await loginResponse.json();
      console.log(`   Login Status: ${loginResponse.status}`);
      console.log(`   Message: ${loginResult.error || loginResult.message || 'Success'}`);
      
      if (loginResult.error && loginResult.error.includes('Email not confirmed')) {
        console.log('   ✓ Email verification requirement is working correctly');
      }
      
    } else {
      console.log(`   ✗ User not found in application database`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Step 3: Test the verification callback endpoints
  console.log('\n3. Testing Verification Endpoints:');
  
  // Test auth callback
  try {
    const authResponse = await fetch('http://localhost:5000/auth?type=signup', {
      method: 'GET'
    });
    console.log(`   /auth callback status: ${authResponse.status}`);
    
    if (authResponse.status === 302) {
      console.log('   ✓ Auth callback redirect working');
    }
  } catch (error) {
    console.log(`   Auth callback error: ${error.message}`);
  }
  
  // Test verify-session endpoint
  try {
    const verifyResponse = await fetch('http://localhost:5000/api/auth/verify-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken: 'test-token',
        refreshToken: 'test-refresh'
      })
    });
    console.log(`   /api/auth/verify-session status: ${verifyResponse.status}`);
    
    if (verifyResponse.status === 401) {
      console.log('   ✓ Session verification endpoint exists (properly rejecting invalid token)');
    }
  } catch (error) {
    console.log(`   Verify session error: ${error.message}`);
  }
  
  console.log('\n=== Configuration Summary ===');
  console.log('Current Supabase redirect URL should be:');
  console.log('http://localhost:5000/auth');
  console.log('');
  console.log('The verification flow should work as follows:');
  console.log('1. User registers → Gets verification email');
  console.log('2. Clicks email link → Redirected to /auth with tokens');
  console.log('3. Backend redirects to /?access_token=xxx&refresh_token=xxx&type=signup');
  console.log('4. Frontend detects tokens → Calls /api/auth/verify-session');
  console.log('5. User is signed in automatically → Can start searching');
  console.log('');
  console.log('Next step: Check your Supabase dashboard email template configuration');
}

// Add fetch polyfill
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

testCompleteVerificationFlow().catch(console.error);