// Manual user deletion using storage interface
import { storage } from './server/storage.ts';

async function manualDeleteUser() {
  const email = 'jwstock3921@gmail.com';
  const userId = 'd4faf2ec-6872-4ec0-94a2-4b02225020cc';
  
  console.log(`Manually deleting user: ${email}\n`);
  
  try {
    // Step 1: Verify user exists
    console.log('1. Checking user exists...');
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log('   ℹ User not found in database');
      return;
    }
    
    console.log(`   ✓ Found user: ${user.email} (${user.id})`);
    
    // Step 2: Check for associated data
    console.log('\n2. Checking for user data...');
    const searches = await storage.getUserSearches(userId);
    console.log(`   Searches: ${searches.length}`);
    
    // Step 3: Delete using storage interface
    console.log('\n3. Deleting user and all data...');
    await storage.deleteUser(userId);
    console.log('   ✓ User deletion completed');
    
    // Step 4: Verify deletion
    console.log('\n4. Verifying deletion...');
    const deletedUser = await storage.getUserByEmail(email);
    
    if (deletedUser) {
      console.log('   ✗ User still exists in database');
    } else {
      console.log('   ✓ User successfully removed from database');
    }
    
    console.log(`\n✅ Manual deletion of ${email} completed`);
    
  } catch (error) {
    console.error('\n❌ Error during manual deletion:', error.message);
    console.error('Stack:', error.stack);
  }
}

manualDeleteUser().then(() => {
  console.log('\nManual deletion process complete.');
  process.exit(0);
}).catch(console.error);