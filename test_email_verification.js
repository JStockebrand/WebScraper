// Test email verification timing and trigger manual emails
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjubpjuxxepczgguxhgf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function testEmailVerification() {
  console.log('🔧 Testing Email Verification Timing Issue...\n');
  
  try {
    // Step 1: Check current users with timing issues
    console.log('1. Checking users with future confirmation dates...');
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log(`   ✗ Error: ${listError.message}`);
      return;
    }
    
    const futureConfirmations = users.users.filter(user => {
      if (!user.confirmation_sent_at) return false;
      const sentDate = new Date(user.confirmation_sent_at);
      const now = new Date();
      return sentDate > now;
    });
    
    console.log(`   Found ${futureConfirmations.length} users with future confirmation dates:`);
    futureConfirmations.forEach(user => {
      console.log(`   - ${user.email}: ${user.confirmation_sent_at}`);
    });
    
    // Step 2: Try to manually resend confirmation emails
    console.log('\n2. Attempting to resend confirmation emails immediately...');
    
    for (const user of futureConfirmations) {
      try {
        console.log(`   Resending for ${user.email}...`);
        const { error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          user.email,
          {
            redirectTo: 'http://localhost:5000/auth'
          }
        );
        
        if (resendError) {
          console.log(`   ✗ Resend failed: ${resendError.message}`);
          
          // Try alternative method - generate email link manually
          const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
            type: 'signup',
            email: user.email,
            redirectTo: 'http://localhost:5000/auth'
          });
          
          if (linkError) {
            console.log(`   ✗ Manual link generation failed: ${linkError.message}`);
          } else {
            console.log(`   ✓ Manual verification link generated:`);
            console.log(`   ${linkData.properties.action_link}`);
            console.log(`   📧 You can use this link directly to verify the account`);
          }
        } else {
          console.log(`   ✓ Confirmation email resent successfully`);
        }
      } catch (resendError) {
        console.log(`   ✗ Error resending to ${user.email}: ${resendError.message}`);
      }
    }
    
    // Step 3: Test new registration with immediate verification
    console.log('\n3. Testing new registration with immediate email...');
    const testEmail = `timing.test.${Date.now()}@gmail.com`;
    
    try {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: 'TestPassword123!',
        email_confirm: false // Force email verification
      });
      
      if (createError) {
        console.log(`   ✗ Create user failed: ${createError.message}`);
      } else {
        console.log(`   ✓ Test user created: ${newUser.user?.id}`);
        console.log(`   Confirmation sent at: ${newUser.user?.confirmation_sent_at}`);
        
        // Check timing
        if (newUser.user?.confirmation_sent_at) {
          const sentDate = new Date(newUser.user.confirmation_sent_at);
          const now = new Date();
          const diffMinutes = (sentDate - now) / (1000 * 60);
          
          if (diffMinutes > 1) {
            console.log(`   🚨 TIMING ISSUE: Email scheduled ${diffMinutes.toFixed(2)} minutes in the future`);
            
            // Try to force immediate email
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
              type: 'signup',
              email: testEmail,
              redirectTo: 'http://localhost:5000/auth'
            });
            
            if (!linkError) {
              console.log(`   ✓ Immediate verification link: ${linkData.properties.action_link}`);
            }
          } else {
            console.log(`   ✓ Email timing appears correct`);
          }
        }
        
        // Clean up test user
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
        console.log(`   ✓ Test user cleaned up`);
      }
    } catch (testError) {
      console.log(`   ✗ Test registration failed: ${testError.message}`);
    }
    
    // Step 4: Provide solutions
    console.log('\n📋 SOLUTIONS TO FIX TIMING ISSUE:');
    console.log('');
    console.log('1. IMMEDIATE FIX - Manual Verification Links:');
    console.log('   Generated verification links above can be used immediately');
    console.log('');
    console.log('2. SUPABASE CONFIGURATION:');
    console.log('   - Check Dashboard → Settings → Auth → SMTP Settings');
    console.log('   - Verify timezone settings in project settings');
    console.log('   - Consider switching to custom SMTP provider');
    console.log('');
    console.log('3. CODE-LEVEL WORKAROUND:');
    console.log('   - Implement manual email link generation');
    console.log('   - Use admin API to force immediate verification');
    console.log('   - Add custom email sending service');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
  }
}

testEmailVerification().then(() => {
  console.log('\n✅ Email verification test complete.');
  process.exit(0);
}).catch(console.error);