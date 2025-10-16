// Simple test to verify the PATCH endpoint works
const fetch = require('node-fetch');

async function testPatchTechPack() {
  try {
    // You'll need to replace these with actual values
    const techPackId = '68ef09f43f44855bfb42ffd8';
    const token = 'your-jwt-token-here'; // Replace with actual token
    
    const response = await fetch(`http://localhost:4001/api/v1/techpacks/${techPackId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        productName: "Test Update",
        articleCode: "TEST_001",
        version: "1",
        supplier: "Test Supplier",
        season: "SS25",
        fabricDescription: "Test fabric",
        gender: "Women",
        lifecycleStage: "Pre-production",
        technicalDesignerId: "68f041b0cd843aef7ea29cf9"
      })
    });

    const result = await response.json();
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

console.log('🧪 Testing PATCH endpoint...');
console.log('⚠️  Note: You need to replace the token with a valid JWT token');
console.log('⚠️  Note: You need to replace the techPackId with a valid ID');
console.log('');
console.log('To run this test:');
console.log('1. Get a valid JWT token from your login');
console.log('2. Replace the token variable in this file');
console.log('3. Replace the techPackId with a valid TechPack ID');
console.log('4. Run: node test-patch-fix.js');


