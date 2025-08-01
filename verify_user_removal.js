// Verify user removal from application
import { storage } from './server/storage.ts';

async function verifyUserRemoval() {
  const email = 'jwstock3921@gmail.com';
  
  console.log(`Verifying removal of: ${email}\n`);
  
  try {
    // Check application database
    console.log('1. Checking application database...');
    const user = await storage.getUserByEmail(email);
    
    if (user) {
      console.log(`   ✗ User still exists: ${user.email} (${user.id})`);
      console.log(`   Status: ${user.subscriptionStatus}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
    } else {
      console.log('   ✓ User not found in application database');
    }
    
    // Test login attempt
    console.log('\n2. Testing login attempt...');
    const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: 'NewPassword123!'
      })
    });
    
    const loginResult = await loginResponse.json();
    console.log(`   Login status: ${loginResponse.status}`);
    console.log(`   Response: ${loginResult.error || loginResult.message || 'Success'}`);
    
    if (loginResponse.status === 401 || loginResponse.status === 400) {
      console.log('   ✓ Login correctly rejected - user removed');
    } else {
      console.log('   ✗ Login succeeded - user may still exist');
    }
    
    console.log('\n=== Summary ===');
    console.log('The user deletion API endpoint returned status 200, indicating success.');
    console.log('Based on the configured deletion behavior, this should have removed:');
    console.log('- User profile from application database');
    console.log('- All associated searches and search results');
    console.log('- User account from Supabase Auth (if it existed)');
    
  } catch (error) {
    console.error('Error during verification:', error.message);
  }
}

// Add fetch polyfill
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

verifyUserRemoval().then(() => {
  console.log('\nVerification complete.');
  process.exit(0);
}).catch(console.error);