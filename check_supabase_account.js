// Check Supabase Auth and Users table for account discrepancy
import { createClient } from '@supabase/supabase-js';

async function checkAccountStatus() {
  console.log('Investigating Supabase account creation issue...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = 'jwstock3921@gmail.com';
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  try {
    // Check Supabase Auth table
    console.log('1. Checking Supabase Auth table...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Failed to check auth users:', authError.message);
      return;
    }
    
    const authUser = authUsers.users.find(user => user.email === email);
    console.log(`Auth user found: ${!!authUser}`);
    if (authUser) {
      console.log(`- ID: ${authUser.id}`);
      console.log(`- Email: ${authUser.email}`);
      console.log(`- Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`- Created: ${authUser.created_at}`);
      console.log(`- Last sign in: ${authUser.last_sign_in_at || 'Never'}`);
    }
    
    // Check application Users table via API
    console.log('\n2. Checking application Users table...');
    const response = await fetch('http://localhost:5000/api/users', {
      headers: {
        'Authorization': `Bearer ${serviceKey}` // Using service key for admin access
      }
    });
    
    if (response.ok) {
      const users = await response.json();
      const appUser = users.find(user => user.email === email);
      console.log(`App user found: ${!!appUser}`);
      if (appUser) {
        console.log(`- ID: ${appUser.id}`);
        console.log(`- Email: ${appUser.email}`);
        console.log(`- Display name: ${appUser.display_name}`);
        console.log(`- Subscription: ${appUser.subscription_tier}`);
        console.log(`- Search count: ${appUser.search_count}`);
      }
    } else {
      console.log('Could not fetch app users via API');
    }
    
    // Analysis
    console.log('\n3. ANALYSIS:');
    if (authUser && !authUser.email_confirmed_at) {
      console.log('🔍 Issue: User exists in Auth but email not confirmed');
      console.log('   This explains why sign-in fails');
      
      // Test manual verification link generation
      console.log('\n4. Testing manual verification...');
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: email,
        password: 'temp_password_for_verification'
      });
      
      if (linkError) {
        console.error('❌ Manual verification failed:', linkError.message);
      } else {
        console.log('✅ Manual verification link generated:');
        console.log(`Link: ${linkData.properties.action_link.substring(0, 100)}...`);
      }
    } else if (!authUser) {
      console.log('🔍 Issue: User missing from Supabase Auth table');
      console.log('   Registration process failed to create auth user');
    } else {
      console.log('✅ User properly created and verified');
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error.message);
  }
}

checkAccountStatus().then(() => {
  console.log('\nInvestigation complete.');
  process.exit(0);
}).catch(console.error);