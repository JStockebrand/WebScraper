// Simple user deletion using the API
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

async function deleteUser() {
  const email = 'jwstock3921@gmail.com';
  console.log(`Deleting user: ${email}\n`);
  
  try {
    // Step 1: Use the API to delete the user
    console.log('1. Calling deletion API...');
    const response = await fetch('http://localhost:5000/api/auth/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${serviceRoleKey}` // Use service role key for admin access
      },
      body: JSON.stringify({ email: email })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('   ✓ API deletion successful:', result.message);
    } else {
      const error = await response.json();
      console.log('   ✗ API deletion failed:', error.error);
      
      // If API fails, try direct Supabase auth deletion
      console.log('\n2. Trying direct Supabase Auth deletion...');
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!listError) {
        const user = users.users.find(u => u.email === email);
        if (user) {
          console.log(`   Found user in Supabase Auth: ${user.id}`);
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
          if (deleteError) {
            console.log(`   ✗ Supabase deletion failed: ${deleteError.message}`);
          } else {
            console.log('   ✓ User deleted from Supabase Auth');
          }
        } else {
          console.log('   ℹ User not found in Supabase Auth');
        }
      }
    }
    
    // Step 3: Verify deletion
    console.log('\n3. Verifying deletion...');
    const { data: finalCheck } = await supabaseAdmin.auth.admin.listUsers();
    const stillExists = finalCheck?.users?.some(u => u.email === email);
    console.log(`   Final status: ${stillExists ? 'Still exists ✗' : 'Successfully removed ✓'}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Add fetch polyfill for Node.js
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

deleteUser().then(() => {
  console.log('\nDeletion process complete.');
  process.exit(0);
}).catch(console.error);