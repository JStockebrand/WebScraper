// Direct Supabase admin deletion
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://pjubpjuxxepczgguxhgf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteUserFromSupabase() {
  const email = 'jwstock3921@gmail.com';
  console.log(`Removing ${email} from Supabase completely...\n`);
  
  try {
    // Step 1: Find the user in Supabase Auth
    console.log('1. Finding user in Supabase Auth...');
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.log(`   ✗ Error listing users: ${listError.message}`);
      return;
    }
    
    const user = authUsers.users.find(u => u.email === email);
    
    if (!user) {
      console.log('   ℹ User not found in Supabase Auth');
      return;
    }
    
    console.log(`   ✓ Found user: ${user.email} (ID: ${user.id})`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`);
    
    // Step 2: Delete from database first (users table and related data)
    console.log('\n2. Deleting from database tables...');
    
    // Delete search results first (foreign key constraint)
    const { error: searchResultsError } = await supabaseAdmin
      .from('search_results')
      .delete()
      .in('search_id', 
        supabaseAdmin
          .from('searches')
          .select('id')
          .eq('user_id', user.id)
      );
    
    if (searchResultsError) {
      console.log(`   Search results deletion: ${searchResultsError.message}`);
    } else {
      console.log('   ✓ Search results deleted');
    }
    
    // Delete searches
    const { error: searchesError } = await supabaseAdmin
      .from('searches')
      .delete()
      .eq('user_id', user.id);
    
    if (searchesError) {
      console.log(`   Searches deletion: ${searchesError.message}`);
    } else {
      console.log('   ✓ Searches deleted');
    }
    
    // Delete user profile
    const { error: userError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id);
    
    if (userError) {
      console.log(`   User profile deletion: ${userError.message}`);
    } else {
      console.log('   ✓ User profile deleted');
    }
    
    // Step 3: Delete from Supabase Auth
    console.log('\n3. Deleting from Supabase Auth...');
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (authError) {
      console.log(`   ✗ Auth deletion failed: ${authError.message}`);
    } else {
      console.log('   ✓ User deleted from Supabase Auth');
    }
    
    // Step 4: Final verification
    console.log('\n4. Final verification...');
    const { data: finalCheck } = await supabaseAdmin.auth.admin.listUsers();
    const stillExists = finalCheck?.users?.some(u => u.email === email);
    
    console.log(`   Supabase Auth: ${stillExists ? 'Still exists ✗' : 'Completely removed ✓'}`);
    
    if (!stillExists) {
      console.log(`\n✅ ${email} has been completely removed from Supabase`);
    }
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
  }
}

deleteUserFromSupabase().then(() => {
  console.log('\nSupabase deletion complete.');
  process.exit(0);
}).catch(console.error);