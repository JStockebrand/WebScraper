// Test Supabase admin connection directly
import { createClient } from '@supabase/supabase-js';

async function testSupabaseAdmin() {
  console.log('Testing Supabase Admin Connection...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log(`URL: ${supabaseUrl ? 'Available' : 'Missing'}`);
  console.log(`Service Key: ${serviceKey ? `Available (${serviceKey.length} chars, starts with "${serviceKey.substring(0, 10)}")` : 'Missing'}`);
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing required environment variables');
    return;
  }
  
  try {
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('✅ Admin client created');
    
    // Test a simple admin operation
    console.log('Testing admin functionality...');
    
    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1
    });
    
    if (error) {
      console.error('❌ Admin test failed:', error.message);
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔍 DIAGNOSIS: Service role key is invalid or incorrect');
        console.log('Please verify:');
        console.log('1. Key copied correctly from Supabase Dashboard > Settings > API');
        console.log('2. Using the "service_role" key (not anon key)');
        console.log('3. Key starts with "eyJ" and is very long');
      }
    } else {
      console.log('✅ Admin connection working! Found users:', users?.users?.length || 0);
      
      // Test generating a verification link
      const testEmail = 'admin.test@example.com';
      console.log(`\nTesting verification link generation for: ${testEmail}`);
      
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email: testEmail
      });
      
      if (linkError) {
        console.error('❌ Link generation failed:', linkError.message);
      } else {
        console.log('✅ Verification link generated successfully!');
        console.log(`Link domain: ${new URL(linkData.properties.action_link).hostname}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupabaseAdmin().then(() => {
  console.log('\nTest complete.');
  process.exit(0);
}).catch(console.error);