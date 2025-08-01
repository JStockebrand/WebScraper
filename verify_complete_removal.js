// Verify complete removal of test accounts and API functionality
import { createClient } from '@supabase/supabase-js';

async function verifyCompleteRemoval() {
  console.log('VERIFYING COMPLETE TEST ACCOUNT REMOVAL & API FIXES\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Step 1: Check Supabase Auth
    console.log('1. CHECKING SUPABASE AUTH ACCOUNTS');
    console.log('==================================');
    
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('❌ Failed to get Auth users:', usersError.message);
      return;
    }
    
    const testAccounts = users.users.filter(user => {
      const email = user.email.toLowerCase();
      return email.includes('test') || 
             email.includes('timing') || 
             email.includes('complete') || 
             email.includes('verification') || 
             email.includes('debug') || 
             email.includes('final') ||
             email.includes('flow');
    });
    
    const realAccounts = users.users.filter(user => {
      const email = user.email.toLowerCase();
      return !email.includes('test') && 
             !email.includes('timing') && 
             !email.includes('complete') && 
             !email.includes('verification') && 
             !email.includes('debug') && 
             !email.includes('final') &&
             !email.includes('flow');
    });
    
    console.log(`Total Auth accounts: ${users.users.length}`);
    console.log(`Test accounts remaining: ${testAccounts.length}`);
    console.log(`Real accounts: ${realAccounts.length}`);
    
    if (testAccounts.length === 0) {
      console.log('✅ All test accounts successfully removed from Supabase Auth');
    } else {
      console.log('⚠️  Test accounts still exist:');
      testAccounts.forEach(user => console.log(`   - ${user.email}`));
    }
    
    if (realAccounts.length > 0) {
      console.log('✅ Real accounts preserved:');
      realAccounts.forEach(user => {
        console.log(`   - ${user.email} (verified: ${!!user.email_confirmed_at})`);
      });
    }
    
    // Step 2: Test API endpoints
    console.log('\n2. TESTING API ENDPOINTS');
    console.log('=========================');
    
    // Test users API endpoint
    const usersResponse = await fetch('http://localhost:5000/api/users');
    console.log(`GET /api/users status: ${usersResponse.status}`);
    
    if (usersResponse.ok) {
      const dbUsers = await usersResponse.json();
      console.log(`✅ Users API working - found ${dbUsers.length} user profiles`);
      
      if (Array.isArray(dbUsers)) {
        const testProfiles = dbUsers.filter(user => {
          const email = user.email.toLowerCase();
          return email.includes('test') || 
                 email.includes('timing') || 
                 email.includes('complete') || 
                 email.includes('verification') || 
                 email.includes('debug') || 
                 email.includes('final') ||
                 email.includes('flow');
        });
        
        console.log(`Test profiles in database: ${testProfiles.length}`);
        
        if (testProfiles.length === 0) {
          console.log('✅ All test profiles removed from database');
        } else {
          console.log('⚠️  Test profiles still exist in database:');
          testProfiles.forEach(user => console.log(`   - ${user.email}`));
        }
      }
    } else {
      const errorText = await usersResponse.text();
      console.log('❌ Users API failed:', errorText.substring(0, 200));
    }
    
    // Test health endpoint
    const healthResponse = await fetch('http://localhost:5000/api/health');
    console.log(`GET /api/health status: ${healthResponse.status}`);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('✅ Health endpoint working');
      console.log(`   Available endpoints: ${Object.keys(healthData.endpoints).length}`);
    }
    
    // Step 3: Final assessment
    console.log('\n3. FINAL ASSESSMENT');
    console.log('===================');
    
    const issues = [];
    const successes = [];
    
    if (testAccounts.length === 0) {
      successes.push('Test accounts cleaned from Supabase Auth');
    } else {
      issues.push(`${testAccounts.length} test accounts remain in Auth`);
    }
    
    if (usersResponse.ok) {
      successes.push('Users API endpoint working correctly');
    } else {
      issues.push('Users API endpoint returning errors');
    }
    
    if (realAccounts.length > 0) {
      successes.push('Real user accounts preserved');
    }
    
    console.log('\n✅ WORKING CORRECTLY:');
    successes.forEach(success => console.log(`   - ${success}`));
    
    if (issues.length > 0) {
      console.log('\n⚠️  REMAINING ISSUES:');
      issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('\n🎉 ALL CLEANUP AND FIXES COMPLETED SUCCESSFULLY!');
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

verifyCompleteRemoval().then(() => {
  console.log('\nVerification complete.');
  process.exit(0);
}).catch(console.error);