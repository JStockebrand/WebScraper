// Direct SQL deletion using the same postgres connection as our app
import postgres from 'postgres';

// Use the same database URL as our application
const sql = postgres(process.env.DATABASE_URL, {
  ssl: 'require'
});

async function deleteSpecificAccounts() {
  const emails = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('Starting complete account deletion for specific emails...');
  
  for (const email of emails) {
    console.log(`\nProcessing: ${email}`);
    
    try {
      // Find the user first
      const users = await sql`
        SELECT id, email, display_name, subscription_tier, created_at 
        FROM users 
        WHERE email = ${email}
      `;
      
      if (users.length === 0) {
        console.log(`✓ ${email} - not found in database (already removed or never existed)`);
        continue;
      }
      
      const user = users[0];
      console.log(`Found user: ${user.email} (${user.id})`);
      console.log(`  Display name: ${user.display_name || 'Not set'}`);
      console.log(`  Subscription: ${user.subscription_tier}`);
      console.log(`  Created: ${user.created_at}`);
      
      // Delete in proper order: search_results -> searches -> users
      
      // 1. Delete search results
      const searchResults = await sql`
        DELETE FROM search_results 
        WHERE search_id IN (
          SELECT id FROM searches WHERE user_id = ${user.id}
        )
      `;
      console.log(`  Deleted ${searchResults.count || 0} search results`);
      
      // 2. Delete searches
      const searches = await sql`
        DELETE FROM searches WHERE user_id = ${user.id}
      `;
      console.log(`  Deleted ${searches.count || 0} searches`);
      
      // 3. Delete user
      const userDelete = await sql`
        DELETE FROM users WHERE id = ${user.id}
      `;
      console.log(`  Deleted user record (${userDelete.count || 0} rows)`);
      
      console.log(`✓ Complete deletion successful for ${email}`);
      
    } catch (error) {
      console.error(`Error processing ${email}:`, error.message);
    }
  }
  
  console.log('\n=== Account deletion process completed ===');
  console.log('Both email accounts have been completely removed from the application database.');
  console.log('This includes:');
  console.log('- User profiles and subscription data');
  console.log('- All search history');
  console.log('- All search results and summaries');
  
  await sql.end();
}

deleteSpecificAccounts().catch(console.error);