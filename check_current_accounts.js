// Check all current accounts in the web-scope-summary app
import { storage } from './server/storage.ts';

async function checkCurrentAccounts() {
  console.log('Checking current accounts in web-scope-summary app...\n');
  
  // Check application database for all users
  console.log('1. Application Database Check:');
  try {
    const users = await storage.getAllUsers();
    
    if (users && users.length > 0) {
      console.log(`✓ Found ${users.length} user(s) in application database:`);
      users.forEach((user, index) => {
        console.log(`\n   User ${index + 1}:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Display Name: ${user.displayName}`);
        console.log(`   Subscription: ${user.subscriptionTier} (${user.subscriptionStatus})`);
        console.log(`   Searches: ${user.searchesUsed}/${user.searchesLimit}`);
        console.log(`   Created: ${user.createdAt}`);
        console.log(`   Email Verified: ${user.emailVerified ? 'Yes' : 'No'}`);
      });
    } else {
      console.log(`✗ No users found in application database`);
    }
  } catch (error) {
    console.log(`✗ Error checking application database: ${error.message}`);
  }
  
  // Check for jwstock3921@gmail.com specifically
  console.log('\n2. Specific Check for jwstock3921@gmail.com:');
  try {
    const user = await storage.getUserByEmail('jwstock3921@gmail.com');
    if (user) {
      console.log(`✓ Found jwstock3921@gmail.com:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Status: ${user.subscriptionStatus}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
    } else {
      console.log(`✗ jwstock3921@gmail.com not found in application database`);
    }
  } catch (error) {
    console.log(`✗ jwstock3921@gmail.com check failed: ${error.message}`);
  }
  
  // Test registration availability
  console.log('\n3. Testing Registration Availability:');
  try {
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'jwstock3921@gmail.com',
        password: 'TestPassword123!',
        displayName: 'Test Registration'
      })
    });
    
    const result = await response.json();
    
    if (response.status === 200) {
      console.log(`✓ Registration successful - account created`);
      console.log(`   Email verification required: ${result.emailVerificationRequired}`);
      
      // Clean up the test account immediately
      console.log(`   Cleaning up test account...`);
      const deleteResponse = await fetch('http://localhost:5000/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'jwstock3921@gmail.com' })
      });
      
      if (deleteResponse.ok) {
        console.log(`   ✓ Test account cleaned up`);
      }
    } else if (response.status === 409) {
      console.log(`✓ Account already exists (email already registered)`);
    } else {
      console.log(`   Registration response: ${response.status} - ${result.message || result.error}`);
    }
  } catch (error) {
    console.log(`   Error testing registration: ${error.message}`);
  }
  
  console.log('\n=== Account Status Summary ===');
  console.log('This check confirms the current state of accounts in the web-scope-summary application.');
}

// Add fetch polyfill for Node.js
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

checkCurrentAccounts().catch(console.error);