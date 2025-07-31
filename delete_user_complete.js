import { createClient } from '@supabase/supabase-js';

// Initialize Supabase clients
const supabaseUrl = process.env.DATABASE_URL?.match(/https:\/\/([^\.]+)\.supabase\.co/)?.[0] || 'https://csaksfdlssftgwobifis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

// Admin client for both Auth and Database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const emailToDelete = 'jwstock3921@gmail.com';

async function completeUserDeletion() {
  console.log('🚀 Starting complete user deletion...');
  console.log(`📧 Target email: ${emailToDelete}`);
  
  try {
    // Step 1: Find user in Auth
    console.log('\n1️⃣ Searching in Supabase Auth...');
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Error listing auth users:', authError);
    } else {
      const authUser = authUsers?.users?.find(u => u.email === emailToDelete);
      
      if (authUser) {
        console.log(`✅ Found in Auth: ${authUser.id}`);
        
        // Delete from Auth
        const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
        if (deleteAuthError) {
          console.error('❌ Failed to delete from Auth:', deleteAuthError);
        } else {
          console.log('✅ Deleted from Supabase Auth');
        }
      } else {
        console.log('ℹ️  Not found in Supabase Auth');
      }
    }
    
    // Step 2: Find and delete from users table
    console.log('\n2️⃣ Searching in users table...');
    const { data: dbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', emailToDelete);
    
    if (dbError) {
      console.error('❌ Error querying users table:', dbError);
    } else if (dbUsers && dbUsers.length > 0) {
      console.log(`✅ Found ${dbUsers.length} record(s) in users table`);
      
      for (const user of dbUsers) {
        console.log(`🗑️  Deleting user: ${user.id} (${user.email})`);
        
        // Delete user data
        const { error: deleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('id', user.id);
        
        if (deleteError) {
          console.error(`❌ Failed to delete user ${user.id}:`, deleteError);
        } else {
          console.log(`✅ Deleted user ${user.id} from users table`);
        }
      }
    } else {
      console.log('ℹ️  Not found in users table');
    }
    
    // Step 3: Clean up related data (searches, search_results)
    console.log('\n3️⃣ Cleaning up related data...');
    
    // Find user ID from any remaining records
    const { data: searchData } = await supabaseAdmin
      .from('searches')
      .select('user_id')
      .eq('user_id', dbUsers?.[0]?.id || 'no-match');
    
    if (searchData && searchData.length > 0) {
      const userId = searchData[0].user_id;
      
      // Delete search results
      const { error: resultsError } = await supabaseAdmin
        .from('search_results')
        .delete()
        .eq('user_id', userId);
      
      if (resultsError) {
        console.error('❌ Error deleting search results:', resultsError);
      } else {
        console.log('✅ Deleted search results');
      }
      
      // Delete searches
      const { error: searchesError } = await supabaseAdmin
        .from('searches')
        .delete()
        .eq('user_id', userId);
      
      if (searchesError) {
        console.error('❌ Error deleting searches:', searchesError);
      } else {
        console.log('✅ Deleted searches');
      }
    }
    
    console.log('\n✨ Complete deletion finished!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

completeUserDeletion();