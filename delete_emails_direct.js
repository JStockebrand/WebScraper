import { createClient } from '@supabase/supabase-js';

// Extract Supabase URL from DATABASE_URL
const databaseUrl = process.env.DATABASE_URL || process.env.SUPABASE_CONNECTION_STRING;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Database URL available:', !!databaseUrl);
console.log('Service key available:', !!serviceKey);

if (!databaseUrl || !serviceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Extract the Supabase project URL from the database connection string
let supabaseUrl = '';
if (databaseUrl.includes('pooler.supabase.com')) {
  // Extract project ID from pooler URL
  const match = databaseUrl.match(/\/\/([^\.]+)\.pooler\.supabase\.com/);
  if (match) {
    supabaseUrl = `https://${match[1]}.supabase.co`;
  }
} else if (databaseUrl.includes('.supabase.co')) {
  const match = databaseUrl.match(/https:\/\/[^\.]+\.supabase\.co/);
  if (match) {
    supabaseUrl = match[0];
  }
}

console.log('Extracted Supabase URL:', supabaseUrl);

if (!supabaseUrl) {
  console.error('Could not extract Supabase URL from database connection string');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteEmailAccounts() {
  const emailsToDelete = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('\nStarting account deletion process...\n');
  
  for (const email of emailsToDelete) {
    console.log(`Processing: ${email}`);
    
    try {
      // List all users to find the target user
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error(`Error listing users:`, listError.message);
        continue;
      }
      
      const targetUser = usersData.users.find(user => user.email === email);
      
      if (!targetUser) {
        console.log(`✓ ${email} - not found in Auth system`);
        
        // Check if exists in users table and delete
        const { data: dbUsers, error: dbError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email);
        
        if (!dbError && dbUsers && dbUsers.length > 0) {
          const { error: deleteDbError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('email', email);
          
          if (deleteDbError) {
            console.error(`Error deleting from users table:`, deleteDbError.message);
          } else {
            console.log(`✓ ${email} - removed from users table`);
          }
        } else {
          console.log(`✓ ${email} - not found in users table either`);
        }
        continue;
      }
      
      console.log(`Found ${email} with ID: ${targetUser.id}`);
      
      // Delete from users table first (if exists)
      const { error: dbDeleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', targetUser.id);
      
      if (dbDeleteError) {
        console.log(`Note: User may not exist in users table:`, dbDeleteError.message);
      } else {
        console.log(`✓ ${email} - removed from users table`);
      }
      
      // Delete from Supabase Auth
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUser.id);
      
      if (authDeleteError) {
        console.error(`Error deleting from Auth:`, authDeleteError.message);
      } else {
        console.log(`✓ ${email} - removed from Supabase Auth`);
      }
      
      console.log(`✓ Complete deletion for ${email}\n`);
      
    } catch (error) {
      console.error(`Error processing ${email}:`, error.message);
    }
  }
  
  console.log('=== Account deletion completed ===');
  console.log('Both accounts have been completely removed from the system.');
}

deleteEmailAccounts().catch(console.error);