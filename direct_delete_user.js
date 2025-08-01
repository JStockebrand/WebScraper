// Direct database user deletion bypassing the is_saved column issue
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pjubpjuxxepczgguxhgf.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function directDeleteUser() {
  const email = 'jwstock3921@gmail.com';
  const userId = 'd4faf2ec-6872-4ec0-94a2-4b02225020cc';
  
  console.log(`Direct deletion of: ${email} (${userId})\n`);
  
  try {
    // Step 1: Delete search results first (foreign key dependency)
    console.log('1. Deleting search results...');
    const { data: searchIds } = await supabase
      .from('searches')
      .select('id')
      .eq('user_id', userId);
    
    if (searchIds && searchIds.length > 0) {
      const ids = searchIds.map(s => s.id);
      const { error: resultsError, count: resultsCount } = await supabase
        .from('search_results')
        .delete()
        .in('search_id', ids);
      
      if (resultsError) {
        console.log(`   ✗ Search results error: ${resultsError.message}`);
      } else {
        console.log(`   ✓ Deleted ${resultsCount || 0} search results`);
      }
    } else {
      console.log('   ℹ No search results found');
    }
    
    // Step 2: Delete searches
    console.log('\n2. Deleting searches...');
    const { error: searchesError, count: searchesCount } = await supabase
      .from('searches')
      .delete()
      .eq('user_id', userId);
    
    if (searchesError) {
      console.log(`   ✗ Searches error: ${searchesError.message}`);
    } else {
      console.log(`   ✓ Deleted ${searchesCount || 0} searches`);
    }
    
    // Step 3: Delete user profile
    console.log('\n3. Deleting user profile...');
    const { error: userError, count: userCount } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (userError) {
      console.log(`   ✗ User profile error: ${userError.message}`);
    } else {
      console.log(`   ✓ Deleted ${userCount || 0} user profile`);
    }
    
    // Step 4: Delete from Supabase Auth
    console.log('\n4. Deleting from Supabase Auth...');
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.log(`   ✗ Auth deletion error: ${authError.message}`);
    } else {
      console.log('   ✓ User deleted from Supabase Auth');
    }
    
    // Step 5: Verify complete deletion
    console.log('\n5. Verification...');
    
    // Check database
    const { data: dbUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    
    console.log(`   Database: ${dbUser ? 'Still exists ✗' : 'Removed ✓'}`);
    
    // Check auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authExists = authUsers?.users?.some(u => u.email === email);
    console.log(`   Supabase Auth: ${authExists ? 'Still exists ✗' : 'Removed ✓'}`);
    
    if (!dbUser && !authExists) {
      console.log(`\n✅ ${email} completely removed from Supabase`);
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

directDeleteUser().then(() => {
  console.log('\nDirect deletion complete.');
  process.exit(0);
}).catch(console.error);