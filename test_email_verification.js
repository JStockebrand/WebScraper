// Test email verification setup in Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csaksfdlssftgwobifis.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error('SUPABASE_ANON_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testEmailVerification() {
  console.log('🔍 Testing email verification configuration...');
  
  // Test with a temporary email address
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  try {
    console.log(`📧 Attempting to register: ${testEmail}`);
    
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          display_name: 'Test User',
        },
        emailRedirectTo: `${process.env.SITE_URL || 'http://localhost:5000'}/auth?verified=true`
      }
    });
    
    if (error) {
      console.error('❌ Registration failed:', error.message);
      return false;
    }
    
    console.log('✅ Registration response received');
    console.log(`   User ID: ${data.user?.id}`);
    console.log(`   Email: ${data.user?.email}`);
    console.log(`   Email confirmed: ${data.user?.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Session: ${data.session ? 'Created' : 'None (verification required)'}`);
    
    if (data.user && !data.user.email_confirmed_at && !data.session) {
      console.log('✅ Email verification is properly configured - user needs to verify email');
      console.log('📩 Supabase should have sent a verification email');
      return true;
    } else if (data.user && data.user.email_confirmed_at) {
      console.log('⚠️  User was automatically confirmed - email verification may be disabled');
      return false;
    } else if (data.session) {
      console.log('⚠️  User got a session immediately - email verification is disabled');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testEmailVerification().then(success => {
  if (success) {
    console.log('\n✅ Email verification is properly configured');
    console.log('📋 Note: Check your Supabase Auth settings if emails are not being sent');
  } else {
    console.log('\n❌ Email verification may not be properly configured');
    console.log('📋 Check Supabase dashboard → Auth → Settings → Email confirmation');
  }
});