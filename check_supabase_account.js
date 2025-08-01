// Check for jwstock3921@gmail.com in both our database and Supabase Auth
import { storage } from './server/storage.ts';

async function checkSupabaseAccount() {
  const email = 'jwstock3921@gmail.com';
  
  console.log(`Checking for ${email} in Supabase systems...\n`);
  
  // Check our application database
  console.log('1. Application Database Check:');
  try {
    const user = await storage.getUserByEmail(email);
    if (user) {
      console.log(`✓ Found in application database:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Display Name: ${user.displayName}`);
      console.log(`   Subscription: ${user.subscriptionTier} (${user.subscriptionStatus})`);
      console.log(`   Searches Used: ${user.searchesUsed}/${user.searchesLimit}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Updated: ${user.updatedAt}`);
    } else {
      console.log(`✗ Not found in application database`);
    }
  } catch (error) {
    console.log(`✗ Error checking application database: ${error.message}`);
  }
  
  console.log('\n2. Supabase Auth Check:');
  try {
    const { supabaseAdmin } = await import('./server/services/supabase');
    if (supabaseAdmin) {
      const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) {
        console.log(`✗ Cannot access Supabase Auth: ${error.message}`);
      } else {
        const authUser = users.find(u => u.email === email);
        if (authUser) {
          console.log(`✓ Found in Supabase Auth:`);
          console.log(`   Auth ID: ${authUser.id}`);
          console.log(`   Email: ${authUser.email}`);
          console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
          console.log(`   Created: ${authUser.created_at}`);
          console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`);
        } else {
          console.log(`✗ Not found in Supabase Auth`);
        }
      }
    } else {
      console.log(`✗ Supabase admin client not available`);
    }
  } catch (authError) {
    console.log(`✗ Error checking Supabase Auth: ${authError.message}`);
  }
  
  console.log('\n=== Summary ===');
  console.log('This check verifies the current state of the account across both systems.');
}

checkSupabaseAccount().catch(console.error);