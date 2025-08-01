// Check account status via our application API
const fetch = require('node-fetch');

async function checkAccountViaAPI() {
  const email = 'jwstock3921@gmail.com';
  
  console.log(`Checking ${email} via application API...\n`);
  
  try {
    // Try to get user data via admin endpoint
    const response = await fetch('http://localhost:5000/api/admin/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: email })
    });
    
    const result = await response.json();
    console.log('Admin API Response:', result);
    
    // Try registration to see if email is available
    console.log('\nTesting email availability via registration...');
    const regResponse = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: email, 
        password: 'TestPassword123!', 
        displayName: 'Test User' 
      })
    });
    
    const regResult = await regResponse.json();
    
    if (regResponse.status === 409) {
      console.log('✓ Account exists - email already registered');
    } else if (regResponse.status === 200) {
      console.log('✓ Registration successful - account was recreated');
    } else {
      console.log('Registration response:', regResult);
    }
    
  } catch (error) {
    console.error('Error checking account:', error.message);
  }
}

checkAccountViaAPI().catch(console.error);