// Use the application's own API to delete accounts
// This ensures we use the same authentication and permissions as the running application

import fetch from 'node-fetch';

async function deleteAccountsViaAPI() {
  const emailsToDelete = ['jwstock3921@yahoo.com', 'jwstock3921@gmail.com'];
  
  console.log('Deleting accounts via application API...\n');
  
  for (const email of emailsToDelete) {
    console.log(`Processing: ${email}`);
    
    try {
      // Call our own API endpoint that handles account deletion
      const response = await fetch('http://localhost:5000/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log(`✓ Successfully deleted ${email}`);
        console.log(`  Details: ${result.message}`);
      } else {
        const error = await response.text();
        console.log(`Failed to delete ${email}: ${error}`);
      }
      
    } catch (error) {
      console.error(`Error processing ${email}:`, error.message);
    }
    console.log('');
  }
  
  console.log('=== Account deletion process completed ===');
}

deleteAccountsViaAPI().catch(console.error);