// Direct deletion through the application's storage interface
import { storage } from './server/storage.ts';

async function directDelete() {
  console.log('Checking for jwstock3921@gmail.com in the application database...');
  
  try {
    // Try to find user by email
    const user = await storage.getUserByEmail('jwstock3921@gmail.com');
    
    if (user) {
      console.log(`Found user: ${user.email} (ID: ${user.id})`);
      console.log(`Display name: ${user.displayName || 'Not set'}`);
      console.log(`Subscription: ${user.subscriptionTier} (${user.subscriptionStatus})`);
      console.log(`Created: ${user.createdAt}`);
      
      // Delete the user and all associated data
      await storage.deleteUser(user.id);
      
      console.log(`✓ Successfully deleted ${user.email} and all associated data from application database`);
      
    } else {
      console.log('✓ User jwstock3921@gmail.com not found in application database (already removed or never existed)');
    }
    
  } catch (error) {
    console.error('Error during deletion process:', error.message);
    
    // If it's a column error, it means the user exists but the schema is outdated
    // Let's try a different approach for cleanup
    if (error.message.includes('column "is_saved" does not exist')) {
      console.log('Schema issue detected. Attempting alternative cleanup...');
      
      try {
        // Try to delete directly from users table without going through searches
        const { db } = await import('./server/storage.ts');
        await db.delete(users).where(eq(users.email, 'jwstock3921@gmail.com'));
        console.log('✓ Successfully deleted user data using direct database approach');
      } catch (directError) {
        console.error('Direct deletion also failed:', directError.message);
      }
    }
  }
}

directDelete().catch(console.error);