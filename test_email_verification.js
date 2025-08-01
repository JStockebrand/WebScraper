// Test email verification system and check current state
import { storage } from './server/storage.ts';

async function testEmailVerification() {
  const email = 'jwstock3921@gmail.com';
  
  console.log('Investigating email verification issue...\n');
  
  // Check current user state
  console.log('1. Current User State:');
  try {
    const user = await storage.getUserByEmail(email);
    if (user) {
      console.log(`   User found: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Status: ${user.subscriptionStatus}`);
      console.log(`   Created: ${user.createdAt}`);
    } else {
      console.log(`   User not found in application database`);
    }
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Test Supabase Auth state
  console.log('\n2. Testing Auth State:');
  try {
    const { supabaseAdmin } = await import('./server/services/supabase');
    if (supabaseAdmin) {
      console.log('   Supabase admin client available');
      
      // Try to get user by email (this would show auth state)
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: 'NewPassword123!'
        })
      });
      
      const result = await response.json();
      console.log(`   Login test result: ${response.status}`);
      console.log(`   Message: ${result.error || result.message}`);
      
      if (result.error && result.error.includes('Email not confirmed')) {
        console.log('   ⚠️  Email verification still pending');
      }
    } else {
      console.log('   Supabase admin client not available');
    }
  } catch (error) {
    console.log(`   Auth test error: ${error.message}`);
  }
  
  // Check redirect URL configuration
  console.log('\n3. Checking Redirect Configuration:');
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl.includes('supabase')) {
    const match = databaseUrl.match(/\/\/([^\.]+)\.(pooler\.)?supabase\.co/);
    if (match) {
      const projectRef = match[1];
      console.log(`   Project Reference: ${projectRef}`);
      console.log(`   Dashboard URL: https://supabase.com/dashboard/project/${projectRef}/auth/url-configuration`);
      console.log('   Required redirect URLs should include:');
      console.log(`   - http://localhost:5000/auth/callback`);
      console.log(`   - https://*.replit.app/auth/callback`);
      console.log(`   - Your production domain/auth/callback`);
    }
  }
  
  // Test email verification endpoint
  console.log('\n4. Testing Email Verification Endpoint:');
  try {
    const response = await fetch('http://localhost:5000/auth/callback?type=signup', {
      method: 'GET'
    });
    
    console.log(`   Verification endpoint status: ${response.status}`);
    if (response.status === 404) {
      console.log('   ⚠️  Email verification callback endpoint may be missing');
    }
  } catch (error) {
    console.log(`   Verification endpoint test failed: ${error.message}`);
  }
  
  console.log('\n=== Investigation Results ===');
  console.log('This analysis shows the current email verification state and potential issues.');
}

// Add fetch polyfill
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

testEmailVerification().catch(console.error);