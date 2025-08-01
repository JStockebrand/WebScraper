// Test the complete verification flow with timing fix
const baseUrl = 'http://localhost:5000';

async function testCompleteVerificationFlow() {
  console.log('🧪 Testing Complete Email Verification Flow with Timing Fix\n');
  
  // Step 1: Test registration
  console.log('1. Testing registration...');
  const testEmail = `complete.test.${Date.now()}@gmail.com`;
  
  try {
    const regResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'TestPassword123!',
        displayName: 'Complete Test User'
      })
    });
    
    const regResult = await regResponse.json();
    
    if (regResponse.status === 200 && regResult.emailVerificationRequired) {
      console.log('   ✓ Registration successful');
      console.log(`   Email: ${regResult.email}`);
      console.log(`   Verification required: ${regResult.emailVerificationRequired}`);
      
      if (regResult.immediateVerificationLink) {
        console.log('   ✅ TIMING FIX WORKING: Immediate verification link generated');
        console.log(`   🔗 Link: ${regResult.immediateVerificationLink}`);
        
        // Step 2: Test the verification link
        console.log('\n2. Testing immediate verification link...');
        try {
          const verifyResponse = await fetch(regResult.immediateVerificationLink, {
            method: 'GET',
            redirect: 'manual' // Don't follow redirects automatically
          });
          
          console.log(`   Verification response status: ${verifyResponse.status}`);
          console.log(`   Redirect location: ${verifyResponse.headers.get('location')}`);
          
          if (verifyResponse.status === 302 || verifyResponse.status === 301) {
            console.log('   ✅ Verification link working - redirects to app');
            
            // Step 3: Test signin after verification
            console.log('\n3. Testing signin after verification...');
            const signinResponse = await fetch(`${baseUrl}/api/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: testEmail,
                password: 'TestPassword123!'
              })
            });
            
            const signinResult = await signinResponse.json();
            
            if (signinResponse.status === 200 && signinResult.session) {
              console.log('   ✅ COMPLETE FLOW SUCCESS: User can signin after verification');
              console.log(`   User: ${signinResult.session.user.email}`);
              console.log(`   Session expires: ${signinResult.session.expires_at}`);
            } else {
              console.log('   ⚠️ Signin after verification failed');
              console.log(`   Status: ${signinResponse.status}`);
              console.log(`   Response: ${JSON.stringify(signinResult, null, 2)}`);
            }
          } else {
            console.log('   ❌ Verification link not working properly');
          }
          
        } catch (verifyError) {
          console.log('   ❌ Error testing verification link:', verifyError.message);
        }
        
      } else {
        console.log('   ⚠️ TIMING FIX NOT WORKING: No immediate verification link provided');
        console.log('   This means the timing issue workaround failed');
      }
      
    } else {
      console.log('   ❌ Registration failed');
      console.log(`   Status: ${regResponse.status}`);
      console.log(`   Response: ${JSON.stringify(regResult, null, 2)}`);
    }
    
  } catch (error) {
    console.error('   ❌ Registration test failed:', error.message);
  }
  
  console.log('\n📊 TEST SUMMARY:');
  console.log('- Registration endpoint functionality');
  console.log('- Immediate verification link generation (timing fix)');
  console.log('- Verification link functionality');
  console.log('- Post-verification signin capability');
  console.log('\n⏱️ This test validates the complete fix for the email timing issue.');
}

// Add fetch polyfill for Node.js
global.fetch = global.fetch || (async (...args) => {
  const { default: fetch } = await import('node-fetch');
  return fetch(...args);
});

testCompleteVerificationFlow().then(() => {
  console.log('\n✅ Complete verification flow test finished.');
  process.exit(0);
}).catch(console.error);