// Clean up remaining test accounts from database
async function finalCleanupDatabase() {
  console.log('FINAL DATABASE CLEANUP - REMOVING TEST PROFILES\n');
  
  try {
    // Get all users from database
    const usersResponse = await fetch('http://localhost:5000/api/users');
    if (!usersResponse.ok) {
      console.log('❌ Failed to fetch users');
      return;
    }
    
    const users = await usersResponse.json();
    console.log(`Found ${users.length} user profiles in database`);
    
    // Identify test accounts
    const testAccounts = users.filter(user => {
      const email = user.email.toLowerCase();
      return email.includes('test') || 
             email.includes('timing') || 
             email.includes('complete') || 
             email.includes('verification') || 
             email.includes('debug') || 
             email.includes('final') ||
             email.includes('flow');
    });
    
    const realAccounts = users.filter(user => {
      const email = user.email.toLowerCase();
      return !email.includes('test') && 
             !email.includes('timing') && 
             !email.includes('complete') && 
             !email.includes('verification') && 
             !email.includes('debug') && 
             !email.includes('final') &&
             !email.includes('flow');
    });
    
    console.log(`Test profiles to delete: ${testAccounts.length}`);
    console.log(`Real profiles to keep: ${realAccounts.length}`);
    
    // Delete test accounts one by one
    let deletedCount = 0;
    for (const user of testAccounts) {
      try {
        const deleteResponse = await fetch(`http://localhost:5000/api/users/${user.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted ${user.email} (${user.id})`);
          deletedCount++;
        } else {
          console.log(`❌ Failed to delete ${user.email}`);
        }
      } catch (error) {
        console.log(`❌ Error deleting ${user.email}: ${error.message}`);
      }
    }
    
    // Verify cleanup
    const finalUsersResponse = await fetch('http://localhost:5000/api/users');
    if (finalUsersResponse.ok) {
      const finalUsers = await finalUsersResponse.json();
      console.log(
`
CLEANUP RESULTS:
================
Before: ${users.length} profiles
Deleted: ${deletedCount} test profiles
After: ${finalUsers.length} profiles

Remaining accounts:`);
      
      finalUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.displayName})`);
      });
      
      if (finalUsers.length === realAccounts.length) {
        console.log('\n🎉 Database cleanup successful! Only real accounts remain.');
      } else {
        console.log('\n⚠️  Some test accounts may still exist in database');
      }
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

finalCleanupDatabase().then(() => {
  console.log('\nFinal database cleanup complete.');
  process.exit(0);
}).catch(console.error);