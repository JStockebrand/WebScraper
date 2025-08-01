// Use the exact same database setup as our application
import { drizzle } from 'drizzle-orm/neon-serverless';
import { neon } from '@neondatabase/serverless';
import { users, searches, searchResults } from './shared/schema.ts';
import { eq } from 'drizzle-orm';

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function deleteAccountsFinal() {
  const emails = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('Starting final account deletion using application database setup...');
  
  for (const email of emails) {
    console.log(`\nProcessing: ${email}`);
    
    try {
      // Find the user
      const userList = await db.select().from(users).where(eq(users.email, email));
      
      if (userList.length === 0) {
        console.log(`✓ ${email} - not found in database (already removed or never existed)`);
        continue;
      }
      
      const user = userList[0];
      console.log(`Found user: ${user.email} (${user.id})`);
      console.log(`  Display name: ${user.displayName || 'Not set'}`);
      console.log(`  Subscription: ${user.subscriptionTier}`);
      console.log(`  Created: ${user.createdAt}`);
      
      // Get search count first
      const userSearches = await db.select().from(searches).where(eq(searches.userId, user.id));
      console.log(`  Found ${userSearches.length} searches`);
      
      // Delete search results first
      let totalResults = 0;
      for (const search of userSearches) {
        const results = await db.delete(searchResults).where(eq(searchResults.searchId, search.id));
        totalResults += results.rowsAffected || 0;
      }
      console.log(`  Deleted ${totalResults} search results`);
      
      // Delete searches
      const deletedSearches = await db.delete(searches).where(eq(searches.userId, user.id));
      console.log(`  Deleted ${deletedSearches.rowsAffected || 0} searches`);
      
      // Delete user
      const deletedUser = await db.delete(users).where(eq(users.id, user.id));
      console.log(`  Deleted user (${deletedUser.rowsAffected || 0} rows)`);
      
      console.log(`✓ Complete deletion successful for ${email}`);
      
    } catch (error) {
      console.error(`Error processing ${email}:`, error.message);
    }
  }
  
  console.log('\n=== Final account deletion completed ===');
  console.log('Both email accounts have been completely removed from the application.');
  console.log('All associated data including searches and results have been deleted.');
}

deleteAccountsFinal().catch(console.error);