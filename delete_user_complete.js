// Complete user deletion from Supabase Auth and database
import { createClient } from '@supabase/supabase-js';
import { storage } from './server/storage.ts';

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

async function deleteUserComplete() {
  const email = 'jwstock3921@gmail.com';
  console.log(`Starting complete deletion of user: ${email}\n`);
  
  try {
    // Step 1: Get user from database first to get the ID
    console.log('1. Finding user in application database...');
    const user = await storage.getUserByEmail(email);
    
    if (user) {
      console.log(`   ✓ Found user: ${user.email} (ID: ${user.id})`);
      
      // Step 2: Delete from application database (includes searches and results)
      console.log('\n2. Deleting from application database...');
      await storage.deleteUser(user.id);
      console.log('   ✓ User and all related data deleted from application database');
      
      // Step 3: Delete from Supabase Auth
      console.log('\n3. Deleting from Supabase Auth system...');
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (authError) {
        if (authError.message.includes('User not found')) {
          console.log('   ✓ User not found in Supabase Auth (already removed or never confirmed)');
        } else {
          console.log(`   ✗ Error deleting from Supabase Auth: ${authError.message}`);
        }
      } else {
        console.log('   ✓ User deleted from Supabase Auth system');
      }
      
    } else {
      console.log(`   ✗ User not found in application database`);
      
      // Still try to delete from Supabase Auth in case they exist there
      console.log('\n2. Checking Supabase Auth for orphaned account...');
      const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.log(`   ✗ Error listing users: ${listError.message}`);
      } else {
        const authUser = authUsers.users.find(u => u.email === email);
        if (authUser) {
          console.log(`   ✓ Found orphaned auth user: ${authUser.id}`);
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id);
          if (deleteError) {
            console.log(`   ✗ Error deleting: ${deleteError.message}`);
          } else {
            console.log('   ✓ Orphaned auth user deleted');
          }
        } else {
          console.log('   ℹ No user found in Supabase Auth either');
        }
      }
    }
    
    // Step 4: Verify complete removal
    console.log('\n4. Verifying complete removal...');
    
    // Check application database
    const dbCheck = await storage.getUserByEmail(email);
    console.log(`   Database: ${dbCheck ? 'Still exists ✗' : 'Removed ✓'}`);
    
    // Check Supabase Auth
    const { data: authCheck } = await supabaseAdmin.auth.admin.listUsers();
    const authExists = authCheck?.users?.some(u => u.email === email);
    console.log(`   Supabase Auth: ${authExists ? 'Still exists ✗' : 'Removed ✓'}`);
    
    console.log(`\n✅ Complete deletion of ${email} finished`);
    
  } catch (error) {
    console.error('\n❌ Error during deletion:', error.message);
  }
}

deleteUserComplete().then(() => {
  console.log('\nDeletion process complete.');
  process.exit(0);
}).catch(console.error);