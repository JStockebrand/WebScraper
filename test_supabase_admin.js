// Simple test for Supabase admin operations
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Service key exists:', !!supabaseServiceKey);
console.log('Service key format:', supabaseServiceKey ? `${supabaseServiceKey.slice(0, 20)}...` : 'N/A');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function testAdminConnection() {
  try {
    console.log('\n🔍 Testing admin connection...');
    
    // Try to list users (this requires service role key)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 5
    });
    
    if (error) {
      console.error('❌ Admin operation failed:', error.message);
      console.error('Full error:', error);
      return false;
    }
    
    console.log(`✅ Admin connection successful! Found ${users.length} users`);
    
    // Look for the specific users we want to delete
    const targetEmails = ['jwstock3921@gmail.com', 'jwstockebrand@gmail.com'];
    const foundUsers = users.filter(user => targetEmails.includes(user.email));
    
    console.log(`🎯 Found ${foundUsers.length} target users:`);
    foundUsers.forEach(user => {
      console.log(`   - ${user.email} (ID: ${user.id})`);
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    return false;
  }
}

// Run the test
testAdminConnection().then(success => {
  if (success) {
    console.log('\n✅ Admin connection test passed');
  } else {
    console.log('\n❌ Admin connection test failed');
    process.exit(1);
  }
});