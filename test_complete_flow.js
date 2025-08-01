// Comprehensive test of account creation and verification flow
import { createClient } from '@supabase/supabase-js';

const baseUrl = 'http://localhost:5000';
const testEmail = `test.flow.${Date.now()}@gmail.com`;
const testPassword = 'SecurePassword123!';
const testDisplayName = 'Flow Test User';

async function testCompleteAccountFlow() {
  console.log('TESTING COMPLETE ACCOUNT CREATION & VERIFICATION FLOW\n');
  console.log(`Test email: ${testEmail}\n`);
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // STEP 1: Test Registration
    console.log('STEP 1: Testing Registration Process');
    console.log('=====================================');
    
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
        displayName: testDisplayName
      })
    });
    
    const registerResult = await registerResponse.json();
    console.log(`Registration status: ${registerResponse.status}`);
    console.log(`Registration response:`, registerResult);
    
    if (registerResponse.status !== 200) {
      console.log('❌ REGISTRATION FAILED');
      return;
    }
    
    console.log('✅ Registration successful');
    
    // STEP 2: Verify Account Created in Supabase Auth
    console.log('\nSTEP 2: Verifying Account in Supabase Auth');
    console.log('==========================================');
    
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(user => user.email === testEmail);
    
    if (!authUser) {
      console.log('❌ CRITICAL: User not found in Supabase Auth table');
      return;
    }
    
    console.log('✅ User found in Supabase Auth');
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
    console.log(`   Created: ${authUser.created_at}`);
    
    // STEP 3: Verify User Profile Created
    console.log('\nSTEP 3: Verifying User Profile in Database');
    console.log('===========================================');
    
    const profileResponse = await fetch(`${baseUrl}/api/users/${testEmail}`);
    if (profileResponse.ok) {
      const userProfile = await profileResponse.json();
      console.log('✅ User profile found in database');
      console.log(`   Display name: ${userProfile.display_name}`);
      console.log(`   Subscription: ${userProfile.subscription_tier}`);
      console.log(`   Search limit: ${userProfile.search_count}/${userProfile.searches_limit || 'unlimited'}`);
    } else {
      console.log('❌ CRITICAL: User profile not found in database');
      return;
    }
    
    // STEP 4: Test Sign-in (should work if email confirmed)
    console.log('\nSTEP 4: Testing Sign-in Process');
    console.log('================================');
    
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });
    
    const loginResult = await loginResponse.json();
    console.log(`Sign-in status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      console.log('✅ Sign-in successful');
      console.log(`   User ID: ${loginResult.user.id}`);
      console.log(`   Email: ${loginResult.user.email}`);
      console.log(`   Display name: ${loginResult.user.displayName}`);
      console.log(`   Access token: ${loginResult.session.access_token.substring(0, 20)}...`);
      
      // STEP 5: Test Authenticated API Access
      console.log('\nSTEP 5: Testing Authenticated API Access');
      console.log('=========================================');
      
      const meResponse = await fetch(`${baseUrl}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${loginResult.session.access_token}`
        }
      });
      
      if (meResponse.ok) {
        const meData = await meResponse.json();
        console.log('✅ Authenticated API access working');
        console.log(`   Current user: ${meData.email}`);
        console.log(`   Searches used: ${meData.searchesUsed}/${meData.searchesLimit}`);
      } else {
        console.log('❌ Authenticated API access failed');
      }
      
    } else {
      console.log(`⚠️  Sign-in failed: ${loginResult.error}`);
      if (loginResult.error?.includes('Email not confirmed')) {
        console.log('   This is expected if email confirmation is required');
        
        // Test manual verification link generation
        console.log('\nTesting manual verification link generation...');
        const linkResponse = await fetch(`${baseUrl}/api/auth/generate-verification-link`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: testEmail })
        });
        
        if (linkResponse.ok) {
          const linkResult = await linkResponse.json();
          console.log('✅ Manual verification link generated');
          console.log(`   Link: ${linkResult.verificationLink.substring(0, 80)}...`);
        } else {
          console.log('❌ Manual verification link generation failed');
        }
      }
    }
    
    // FINAL ANALYSIS
    console.log('\nFINAL ANALYSIS');
    console.log('==============');
    
    const issues = [];
    const successes = [];
    
    if (registerResponse.status === 200) {
      successes.push('Registration process working');
    } else {
      issues.push('Registration process failing');
    }
    
    if (authUser) {
      successes.push('Supabase Auth integration working');
      if (authUser.email_confirmed_at) {
        successes.push('Email verification working automatically');
      } else {
        issues.push('Email verification not completing automatically');
      }
    } else {
      issues.push('Supabase Auth integration broken');
    }
    
    if (profileResponse.ok) {
      successes.push('User profile creation working');
    } else {
      issues.push('User profile creation failing');
    }
    
    if (loginResponse.status === 200) {
      successes.push('Sign-in process working');
    } else {
      if (loginResult.error?.includes('Email not confirmed')) {
        successes.push('Sign-in properly requires email verification');
      } else {
        issues.push('Sign-in process has unexpected issues');
      }
    }
    
    console.log('\n✅ WORKING CORRECTLY:');
    successes.forEach(success => console.log(`   - ${success}`));
    
    if (issues.length > 0) {
      console.log('\n⚠️  ISSUES FOUND:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n🎉 ALL SYSTEMS WORKING CORRECTLY!');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testCompleteAccountFlow().then(() => {
  console.log('\nComplete flow test finished.');
  process.exit(0);
}).catch(console.error);