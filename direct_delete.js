// Direct account deletion with explicit service role key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://csaksfdlssftgwobifis.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNzYWtzZmRsc3NmdGd3b2JpZmlzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjgxMTE1MCwiZXhwIjoyMDY4Mzg3MTUwfQ.ndnOfPrhR13Sv6QXdOzmN4P8_b2j-1a_4aMIVRPyXoQ';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const emailsToDelete = [
  'jwstock3921@gmail.com',
  'jwstockebrand@gmail.com'
];

async function deleteUserByEmail(email) {
  console.log(`\n🔍 Processing: ${email}`);
  
  try {
    // First, find the user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`❌ Error listing users: ${listError.message}`);
      return false;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`ℹ️  No account found for ${email} - already deleted or never existed`);
      return true;
    }
    
    console.log(`✅ Found user: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    
    // Delete the user from Supabase Auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      console.error(`❌ Error deleting user: ${deleteError.message}`);
      return false;
    }
    
    console.log(`🗑️  Successfully deleted: ${email}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Unexpected error for ${email}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting direct account deletion...');
  console.log(`📧 Target emails: ${emailsToDelete.join(', ')}`);
  
  let deletedCount = 0;
  
  for (const email of emailsToDelete) {
    const success = await deleteUserByEmail(email);
    if (success) {
      deletedCount++;
    }
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✨ Deletion complete!`);
  console.log(`📊 Successfully processed: ${deletedCount}/${emailsToDelete.length} accounts`);
  
  if (deletedCount === emailsToDelete.length) {
    console.log('🎉 All specified accounts have been permanently removed');
  } else {
    console.log('⚠️  Some accounts could not be deleted - see details above');
  }
}

// Run the deletion
main().catch(console.error);