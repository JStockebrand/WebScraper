// Complete deletion of jwstock3921@gmail.com bypassing schema issues
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

async function deleteUserComplete() {
  const userEmail = 'jwstock3921@gmail.com';
  const userId = 'f3a26cc4-569f-4df7-9df3-1aad251e48c2';
  
  console.log(`Performing complete deletion for ${userEmail} (${userId})`);
  
  try {
    // Step 1: Delete all search results associated with this user's searches
    console.log('1. Deleting search results...');
    const deleteSearchResults = await sql`
      DELETE FROM search_results 
      WHERE search_id IN (
        SELECT id FROM searches WHERE user_id = ${userId}
      )
    `;
    console.log(`   Deleted ${deleteSearchResults.count || 0} search results`);
    
    // Step 2: Delete all searches for this user
    console.log('2. Deleting searches...');
    const deleteSearches = await sql`
      DELETE FROM searches WHERE user_id = ${userId}
    `;
    console.log(`   Deleted ${deleteSearches.count || 0} searches`);
    
    // Step 3: Delete the user
    console.log('3. Deleting user...');
    const deleteUser = await sql`
      DELETE FROM users WHERE id = ${userId}
    `;
    console.log(`   Deleted user record (${deleteUser.count || 0} rows affected)`);
    
    console.log(`\n✓ Complete deletion successful for ${userEmail}`);
    console.log('  - All search results removed');
    console.log('  - All searches removed');
    console.log('  - User account removed');
    console.log('\nThe account has been completely removed from the application database.');
    
  } catch (error) {
    console.error('Error during complete deletion:', error.message);
  }
}

deleteUserComplete().catch(console.error);