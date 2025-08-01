// Test complete verification flow for jwstock3921@gmail.com
import { createClient } from '@supabase/supabase-js';

async function testCompleteVerificationFlow() {
  console.log('Testing Complete Verification Flow...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = 'jwstock3921@gmail.com';
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // 1. Check current status
    console.log('1. CURRENT ACCOUNT STATUS:');
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(user => user.email === testEmail);
    
    if (authUser) {
      console.log(`✅ Auth Account: ${authUser.id}`);
      console.log(`📧 Email: ${authUser.email}`);
      console.log(`✉️ Confirmed: ${authUser.email_confirmed_at ? 'YES' : 'NO'}`);
      console.log(`🕐 Created: ${authUser.created_at}`);
      console.log(`🔑 Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
      
      if (!authUser.email_confirmed_at) {
        console.log('\n2. ACCOUNT NEEDS VERIFICATION');
        console.log('Issue: Email not confirmed - user cannot sign in');
        
        // Generate verification link
        console.log('\n3. GENERATING VERIFICATION LINK...');
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'signup',
          email: testEmail,
          password: 'temp_password_for_verification'
        });
        
        if (linkError) {
          console.error('❌ Failed to generate link:', linkError.message);
        } else {
          console.log('✅ VERIFICATION LINK GENERATED:');
          console.log(`${linkData.properties.action_link}`);
          console.log('\n4. NEXT STEPS:');
          console.log('→ Click the link above to verify the account');
          console.log('→ After verification, user can sign in normally');
          console.log('→ Account will have full access to all features');
          
          // Parse link details
          const linkUrl = new URL(linkData.properties.action_link);
          console.log('\n5. LINK DETAILS:');
          console.log(`Domain: ${linkUrl.hostname} (Official Supabase)`);
          console.log(`Path: ${linkUrl.pathname} (Official verify endpoint)`);
          console.log(`Token: ${linkUrl.searchParams.get('token')?.substring(0, 20)}...`);
          console.log(`Redirect: ${linkUrl.searchParams.get('redirect_to')}`);
        }
      } else {
        console.log('\n✅ ACCOUNT ALREADY VERIFIED');
        console.log('User can sign in normally');
      }
    } else {
      console.log('❌ No auth account found - registration failed');
    }
    
    // Test application user profile
    console.log('\n6. APPLICATION USER PROFILE:');
    const userResponse = await fetch(`http://localhost:5000/api/users/${testEmail}`, {
      method: 'GET'
    });
    
    if (userResponse.ok) {
      console.log('✅ User profile exists in application database');
    } else {
      console.log('⚠️ User profile check failed - may not exist in app database');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCompleteVerificationFlow().then(() => {
  console.log('\n--- VERIFICATION FLOW TEST COMPLETE ---');
  process.exit(0);
}).catch(console.error);