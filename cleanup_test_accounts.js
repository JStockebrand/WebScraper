// Clean up test accounts from Supabase Auth and database
import { createClient } from '@supabase/supabase-js';

async function cleanupTestAccounts() {
  console.log('CLEANING UP TEST ACCOUNTS\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  
  try {
    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.log('Failed to get users:', usersError.message);
      return;
    }
    
    // Identify test accounts
    const testAccounts = users.users.filter(user => {
      const email = user.email.toLowerCase();
      return email.includes('test') || 
             email.includes('timing') || 
             email.includes('complete') || 
             email.includes('verification') || 
             email.includes('debug') || 
             email.includes('final') ||
             email.includes('flow') ||
             email.includes('admin.test');
    });
    
    const realAccounts = users.users.filter(user => {
      const email = user.email.toLowerCase();
      return !email.includes('test') && 
             !email.includes('timing') && 
             !email.includes('complete') && 
             !email.includes('verification') && 
             !email.includes('debug') && 
             !email.includes('final') &&
             !email.includes('flow') &&
             !email.includes('admin.test');
    });
    
    console.log(`Found ${testAccounts.length} test accounts to delete:`);
    testAccounts.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });
    
    console.log(`\nFound ${realAccounts.length} real accounts to keep:`);
    realAccounts.forEach(user => {
      console.log(`  - ${user.email} (verified: ${!!user.email_confirmed_at})`);
    });
    
    // Delete test accounts from Supabase Auth
    console.log('\nDeleting test accounts from Supabase Auth...');
    let authDeletedCount = 0;
    
    for (const user of testAccounts) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.log(`  ❌ Failed to delete ${user.email}: ${deleteError.message}`);
        } else {
          console.log(`  ✅ Deleted ${user.email} from Auth`);
          authDeletedCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error deleting ${user.email}: ${error.message}`);
      }
    }
    
    // Delete test accounts from application database via API
    console.log('\nDeleting test accounts from application database...');
    let dbDeletedCount = 0;
    
    for (const user of testAccounts) {
      try {
        const deleteResponse = await fetch(`http://localhost:5000/api/users/${user.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`  ✅ Deleted ${user.email} from database`);
          dbDeletedCount++;
        } else {
          console.log(`  ⚠️  Database delete failed for ${user.email} (${deleteResponse.status})`);
        }
      } catch (error) {
        console.log(`  ❌ Error deleting ${user.email} from database: ${error.message}`);
      }
    }
    
    console.log('\nCLEANUP SUMMARY:');
    console.log(`================`);
    console.log(`Auth accounts deleted: ${authDeletedCount}/${testAccounts.length}`);
    console.log(`Database profiles deleted: ${dbDeletedCount}/${testAccounts.length}`);
    console.log(`Real accounts preserved: ${realAccounts.length}`);
    
    if (authDeletedCount === testAccounts.length && dbDeletedCount === testAccounts.length) {
      console.log('✅ All test accounts successfully cleaned up!');
    } else {
      console.log('⚠️  Some test accounts may still exist - check manually');
    }
    
  } catch (error) {
    console.error('Cleanup failed:', error.message);
  }
}

cleanupTestAccounts().then(() => {
  console.log('\nTest account cleanup complete.');
  process.exit(0);
}).catch(console.error);