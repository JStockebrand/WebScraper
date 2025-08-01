import { createClient } from '@supabase/supabase-js';

// Use hardcoded Supabase URL based on the project structure we've seen
const supabaseUrl = 'https://csaksfdlssftgwobifis.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Using Supabase URL:', supabaseUrl);
console.log('Service key available:', !!serviceKey);

if (!serviceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

// Create admin client
const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function deleteAccounts() {
  const emailsToDelete = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('\nDeleting accounts per user request...\n');
  
  for (const email of emailsToDelete) {
    console.log(`Processing: ${email}`);
    
    try {
      // Get all users
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (listError) {
        console.error(`Auth error:`, listError.message);
        console.log(`Attempting database deletion only...`);
        
        // Try direct database deletion
        const { error: dbDeleteError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('email', email);
        
        if (dbDeleteError) {
          console.log(`Database deletion also failed:`, dbDeleteError.message);
        } else {
          console.log(`✓ Deleted ${email} from database`);
        }
        continue;
      }
      
      const user = usersData.users.find(u => u.email === email);
      
      if (!user) {
        console.log(`${email} - not found in Auth`);
        
        // Still check database
        const { data: dbUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (dbUser) {
          const { error: dbDeleteError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('email', email);
          
          if (!dbDeleteError) {
            console.log(`✓ Deleted ${email} from database only`);
          }
        } else {
          console.log(`✓ ${email} - completely removed/never existed`);
        }
        continue;
      }
      
      console.log(`Found ${email} (${user.id})`);
      
      // Delete from database first
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (!dbError) {
        console.log(`✓ Deleted from users table`);
      }
      
      // Delete from Auth
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      
      if (!authError) {
        console.log(`✓ Deleted from Supabase Auth`);
      } else {
        console.log(`Auth deletion error:`, authError.message);
      }
      
      console.log(`✓ Complete deletion for ${email}`);
      
    } catch (error) {
      console.error(`Error with ${email}:`, error.message);
    }
    console.log('');
  }
  
  console.log('=== Account deletion process completed ===');
}

deleteAccounts().catch(console.error);