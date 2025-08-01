// Check current Supabase configuration status
import { createClient } from '@supabase/supabase-js';

async function checkCurrentConfiguration() {
  console.log('CHECKING CURRENT SUPABASE CONFIGURATION\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    console.log('1. ENVIRONMENT CONFIGURATION');
    console.log('=============================');
    console.log(`Supabase URL: ${supabaseUrl ? 'Set' : 'Missing'}`);
    console.log(`Anon Key: ${anonKey ? 'Set' : 'Missing'}`);
    console.log(`Service Key: ${serviceKey ? 'Set' : 'Missing'}`);
    
    if (supabaseUrl) {
      const urlObj = new URL(supabaseUrl);
      console.log(`Project ID: ${urlObj.hostname.split('.')[0]}`);
    }
    
    console.log('\n2. AUTHENTICATION STATUS');
    console.log('=========================');
    
    // Check admin access
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 10 });
    
    if (usersError) {
      console.log('❌ Admin access failed:', usersError.message);
      return;
    }
    
    console.log(`✅ Admin access working - found ${users.users.length} users`);
    
    // Analyze user verification status
    const verifiedUsers = users.users.filter(user => user.email_confirmed_at);
    const unverifiedUsers = users.users.filter(user => !user.email_confirmed_at);
    
    console.log(`Verified users: ${verifiedUsers.length}`);
    console.log(`Unverified users: ${unverifiedUsers.length}`);
    
    if (unverifiedUsers.length > 0) {
      console.log('\nUnverified accounts:');
      unverifiedUsers.forEach(user => {
        const isTestAccount = user.email.includes('test') || user.email.includes('timing') || user.email.includes('complete');
        console.log(`  ${isTestAccount ? '🧪' : '⚠️ '} ${user.email} (${new Date(user.created_at).toLocaleDateString()})`);
      });
    }
    
    console.log('\n3. DATABASE CONNECTION TEST');
    console.log('============================');
    
    // Test database access through API
    const dbTestResponse = await fetch('http://localhost:5000/api/users');
    console.log(`Database API status: ${dbTestResponse.status}`);
    
    if (dbTestResponse.ok) {
      const dbUsers = await dbTestResponse.json();
      console.log(`✅ Database connection working - found ${dbUsers.length} user profiles`);
    } else {
      console.log('❌ Database connection issues');
    }
    
    console.log('\n4. CONFIGURATION RECOMMENDATIONS');
    console.log('=================================');
    
    // Check for production readiness
    const recommendations = [];
    
    if (unverifiedUsers.length > 0) {
      const realUsers = unverifiedUsers.filter(user => !user.email.includes('test'));
      if (realUsers.length > 0) {
        recommendations.push('HIGH: Some real user accounts are unverified - check email delivery');
      }
    }
    
    if (supabaseUrl.includes('supabase.co')) {
      recommendations.push('MEDIUM: Configure custom domain for production');
    }
    
    recommendations.push('MEDIUM: Review and update redirect URLs for production deployment');
    recommendations.push('LOW: Clean up test accounts from database');
    
    if (recommendations.length > 0) {
      console.log('\nRecommended actions:');
      recommendations.forEach(rec => console.log(`  ${rec}`));
    } else {
      console.log('✅ Configuration looks good!');
    }
    
  } catch (error) {
    console.error('❌ Configuration check failed:', error.message);
  }
}

checkCurrentConfiguration().then(() => {
  console.log('\nConfiguration check complete.');
  process.exit(0);
}).catch(console.error);