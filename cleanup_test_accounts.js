// Clean up remaining test accounts from Supabase Auth
import { createClient } from '@supabase/supabase-js';

async function cleanupTestAccounts() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    return;
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('CLEANING UP TEST ACCOUNTS FROM SUPABASE AUTH\n');

  try {
    // Get all users
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    console.log(`Found ${users.users.length} total accounts`);
    
    // Identify test accounts
    const testEmails = [
      'verification.test.1754355805449@gmail.com',
      'test.verification.1754355642195@gmail.com'
    ];

    const testAccounts = users.users.filter(user => 
      testEmails.includes(user.email) || 
      user.email.includes('test.') || 
      user.email.includes('verification.test')
    );

    const realAccounts = users.users.filter(user => 
      !testEmails.includes(user.email) && 
      !user.email.includes('test.') && 
      !user.email.includes('verification.test')
    );

    console.log(`Test accounts to delete: ${testAccounts.length}`);
    console.log(`Real accounts to preserve: ${realAccounts.length}`);

    // Delete test accounts
    for (const account of testAccounts) {
      try {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(account.id);
        
        if (deleteError) {
          console.log(`❌ Failed to delete ${account.email}: ${deleteError.message}`);
        } else {
          console.log(`✅ Deleted ${account.email} (${account.id})`);
        }
      } catch (err) {
        console.log(`❌ Error deleting ${account.email}: ${err.message}`);
      }
    }

    console.log('\nCLEANUP RESULTS:');
    console.log('================');
    console.log(`Before: ${users.users.length} accounts`);
    console.log(`Deleted: ${testAccounts.length} test accounts`);
    console.log(`After: ${realAccounts.length} accounts`);
    
    console.log('\nRemaining accounts:');
    realAccounts.forEach(account => {
      console.log(`  - ${account.email} (${account.user_metadata?.display_name || 'No display name'})`);
    });

    console.log('\n🎉 Test account cleanup complete!');

  } catch (error) {
    console.error('Cleanup failed:', error.message);
  }
}

cleanupTestAccounts().then(() => {
  console.log('\nCleanup complete.');
}).catch(console.error);