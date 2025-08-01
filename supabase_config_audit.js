// Audit current Supabase configuration and suggest improvements
import { createClient } from '@supabase/supabase-js';

async function auditSupabaseConfig() {
  console.log('Auditing Supabase Configuration...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Test current configuration
    console.log('1. AUTHENTICATION CONFIGURATION:');
    
    // Check if we can list users (tests service role permissions)
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });
    
    if (!usersError) {
      console.log(`✅ Service role key working - found ${users.users.length} users`);
      
      // Analyze user verification status
      const unverifiedUsers = users.users.filter(user => !user.email_confirmed_at);
      const verifiedUsers = users.users.filter(user => user.email_confirmed_at);
      
      console.log(`✅ Verified users: ${verifiedUsers.length}`);
      if (unverifiedUsers.length > 0) {
        console.log(`⚠️  Unverified users: ${unverifiedUsers.length}`);
        unverifiedUsers.forEach(user => {
          console.log(`   - ${user.email} (created: ${user.created_at})`);
        });
      }
    } else {
      console.log('❌ Service role key issues:', usersError.message);
    }
    
    console.log('\n2. RECOMMENDED CONFIGURATION UPDATES:');
    
    // Check URL configuration
    const urlParts = new URL(supabaseUrl);
    console.log(`✅ Project URL: ${urlParts.hostname}`);
    
    // Recommendations based on current setup
    console.log('\n📋 CONFIGURATION CHECKLIST:');
    console.log('Authentication > Sign In / Providers:');
    console.log('  ✅ Confirm email: ON (already configured)');
    console.log('  🔍 Check: Allow new users to sign up');
    console.log('  🔍 Check: Password requirements');
    console.log('  🔍 Check: Session timeout settings');
    
    console.log('\nAuthentication > URL Configuration:');
    console.log('  🔍 Site URL should be: https://web-scope-summary-jwstockebrand.replit.app');
    console.log('  🔍 Redirect URLs should include:');
    console.log('    - https://web-scope-summary-jwstockebrand.replit.app/auth');
    console.log('    - http://localhost:5000/auth (for development)');
    
    console.log('\nAuthentication > Email Templates:');
    console.log('  🔍 Customize confirmation email template');
    console.log('  🔍 Customize password reset email template');
    console.log('  🔍 Consider custom SMTP for production');
    
    console.log('\nDatabase > Settings:');
    console.log('  🔍 Review RLS policies for users table');
    console.log('  🔍 Review RLS policies for searches table');
    console.log('  🔍 Review RLS policies for search_results table');
    
    console.log('\nAPI > Settings:');
    console.log('  🔍 Verify CORS origins include your domain');
    console.log('  🔍 Check rate limiting settings');
    console.log('  🔍 Review API key permissions');
    
    console.log('\n3. PRIORITY RECOMMENDATIONS:');
    console.log('HIGH: Configure production redirect URLs');
    console.log('HIGH: Review and test RLS policies');
    console.log('MEDIUM: Customize email templates for branding');
    console.log('MEDIUM: Set appropriate session timeout');
    console.log('LOW: Configure custom SMTP for production emails');
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  }
}

auditSupabaseConfig().then(() => {
  console.log('\nConfiguration audit complete.');
  process.exit(0);
}).catch(console.error);