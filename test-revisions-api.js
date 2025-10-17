const axios = require('axios');

// Test script để kiểm tra API revisions
async function testRevisionsAPI() {
  const baseURL = 'http://localhost:3001/api/v1';
  const techPackId = '68e4ebd800ccd0b306ed0623'; // ID từ log của bạn
  
  try {
    console.log('🧪 Testing Revisions API...');
    console.log('TechPack ID:', techPackId);
    
    // Test 1: Kiểm tra API endpoint
    console.log('\n1️⃣ Testing GET /techpacks/:id/revisions');
    const response = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('✅ Response Data:', JSON.stringify(response.data, null, 2));
    
    // Kiểm tra format response
    if (response.data.success && response.data.data) {
      console.log('✅ Response format is correct (wrapped)');
      console.log('📊 Revisions count:', response.data.data.revisions?.length || 0);
      console.log('📊 Pagination:', response.data.data.pagination);
    } else if (response.data.revisions) {
      console.log('✅ Response format is direct');
      console.log('📊 Revisions count:', response.data.revisions.length);
      console.log('📊 Pagination:', response.data.pagination);
    } else {
      console.log('❌ Unexpected response format');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication required. Please update the token in the script.');
    } else if (error.response?.status === 404) {
      console.log('🔍 TechPack not found. Please check the ID.');
    } else if (error.response?.status === 403) {
      console.log('🚫 Access denied. Please check permissions.');
    }
  }
}

// Test 2: Kiểm tra với Postman-style request
async function testWithCurl() {
  console.log('\n2️⃣ Curl command to test API:');
  console.log(`curl -X GET "http://localhost:3001/api/v1/techpacks/68e4ebd800ccd0b306ed0623/revisions" \\
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \\
  -H "Content-Type: application/json"`);
}

// Chạy tests
testRevisionsAPI().then(() => {
  testWithCurl();
}).catch(console.error);

