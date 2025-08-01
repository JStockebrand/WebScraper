// Test the fixed delete functionality
async function testDeleteFixed() {
  console.log('TESTING FIXED DELETE FUNCTIONALITY\n');
  
  try {
    // Get current user count
    const beforeResponse = await fetch('http://localhost:5000/api/users');
    const beforeUsers = await beforeResponse.json();
    console.log(`Users before deletion: ${beforeUsers.length}`);
    
    // Find a test user to delete
    const testUser = beforeUsers.find(user => user.email.includes('test'));
    
    if (!testUser) {
      console.log('No test users found to delete');
      return;
    }
    
    console.log(`Attempting to delete: ${testUser.email} (${testUser.id})`);
    
    // Try to delete the user
    const deleteResponse = await fetch(`http://localhost:5000/api/users/${testUser.id}`, {
      method: 'DELETE'
    });
    
    if (deleteResponse.ok) {
      const deleteResult = await deleteResponse.json();
      console.log('✅ Delete successful:', deleteResult.message);
      
      // Verify deletion
      const afterResponse = await fetch('http://localhost:5000/api/users');
      const afterUsers = await afterResponse.json();
      console.log(`Users after deletion: ${afterUsers.length}`);
      
      const stillExists = afterUsers.find(user => user.id === testUser.id);
      if (stillExists) {
        console.log('❌ User still exists in database');
      } else {
        console.log('✅ User successfully removed from database');
      }
      
    } else {
      const error = await deleteResponse.text();
      console.log('❌ Delete failed:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDeleteFixed().then(() => {
  console.log('\nDelete test complete.');
  process.exit(0);
}).catch(console.error);