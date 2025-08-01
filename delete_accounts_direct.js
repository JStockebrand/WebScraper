import { createClient } from '@supabase/supabase-js';
import { storage } from './server/storage.ts';

// Get Supabase configuration from environment
const supabaseUrl = process.env.DATABASE_URL?.match(/https:\/\/([^\.]+)\.supabase\.co/)?.[0] || 'https://csaksfdlssftgwobifis.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

// Admin client for both Auth and Database operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAccountComplete(email) {
  console.log(`\nDeleting account: ${email}`);
  
  try {
    // Find user in Supabase Auth
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error(`Error listing users:`, listError.message);
      return false;
    }
    
    const authUser = authUsers.users.find(user => user.email === email);
    
    if (authUser) {
      console.log(`Found user in Auth: ${authUser.id}`);
      
      // Delete from our application database first (includes all related data)
      try {
        await storage.deleteUser(authUser.id);
        console.log(`✓ Deleted from application database and all associated data`);
      } catch (dbError) {
        console.log(`Note: User may not exist in app database:`, dbError.message);
      }
      
      // Delete from Supabase Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
      
      if (deleteError) {
        console.error(`Error deleting from Auth:`, deleteError.message);
        return false;
      }
      
      console.log(`✓ Deleted from Supabase Auth`);
      return true;
    } else {
      console.log(`User ${email} not found in Auth system`);
      
      // Still try to delete from our database if they exist there
      try {
        const localUser = await storage.getUserByEmail(email);
        if (localUser) {
          await storage.deleteUser(localUser.id);
          console.log(`✓ Deleted from application database`);
        } else {
          console.log(`User not found in application database either`);
        }
      } catch (dbError) {
        console.log(`Error checking application database:`, dbError.message);
      }
      
      return true; // Success since user doesn't exist
    }
  } catch (error) {
    console.error(`Error processing ${email}:`, error.message);
    return false;
  }
}

async function deleteSpecificAccounts() {
  const emailsToDelete = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('Starting complete account deletion process...');
  console.log('This will remove accounts from:');
  console.log('- Supabase Auth system');
  console.log('- Application users table');
  console.log('- All associated searches and search results\n');
  
  for (const email of emailsToDelete) {
    const success = await deleteAccountComplete(email);
    
    if (success) {
      console.log(`✓ Complete deletion successful for ${email}`);
    } else {
      console.log(`✗ Deletion failed for ${email}`);
    }
  }
  
  console.log('\n=== Account deletion process completed ===');
}

deleteSpecificAccounts().catch(console.error);