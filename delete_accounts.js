// Use ES module import syntax
import { createClient } from '@supabase/supabase-js';

// Note: In production, these would come from Replit secrets
// For Supabase, we need the service role key (not anon key) for admin operations
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project-id.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const emailsToDelete = [
  'jwstock3921@gmail.com',
  'jwstockebrand@gmail.com'
];

async function deleteAccountByEmail(email) {
  console.log(`\n🔍 Searching for account: ${email}`);
  
  try {
    // First, find the user by email in Supabase Auth
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error(`❌ Error listing users: ${listError.message}`);
      return false;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`ℹ️  No account found for ${email}`);
      return true; // Consider this success since the goal is achieved
    }
    
    console.log(`✅ Found account: ${user.id} (${email})`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Email confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Delete from Supabase Auth (this will cascade delete related data)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error(`❌ Error deleting user from Supabase Auth: ${deleteError.message}`);
      return false;
    }
    
    console.log(`🗑️  Successfully deleted account from Supabase Auth: ${email}`);
    
    // Also try to delete from our application database if it exists
    try {
      // Connect to our database and delete user data
      const { storage } = await import('./server/storage.js');
      await storage.deleteUser(user.id);
      console.log(`🗑️  Successfully deleted application data for: ${email}`);
    } catch (dbError) {
      console.log(`ℹ️  Application database cleanup: ${dbError.message}`);
      // This is not critical since Supabase deletion is the main goal
    }
    
    return true;
    
  } catch (error) {
    console.error(`❌ Unexpected error deleting ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting account deletion process...');
  console.log(`📧 Emails to delete: ${emailsToDelete.join(', ')}`);
  
  let successCount = 0;
  
  for (const email of emailsToDelete) {
    const success = await deleteAccountByEmail(email);
    if (success) {
      successCount++;
    }
  }
  
  console.log(`\n✨ Process complete!`);
  console.log(`📊 Successfully processed: ${successCount}/${emailsToDelete.length} accounts`);
  
  if (successCount === emailsToDelete.length) {
    console.log('🎉 All specified accounts have been removed from the system');
  } else {
    console.log('⚠️  Some accounts could not be deleted - check the logs above');
  }
}

// Run the deletion process
main().catch(console.error);

// Export for module use
export { deleteAccountByEmail, main };