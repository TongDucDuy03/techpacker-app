import axios from 'axios';

const BASE_URL = 'http://localhost:4001/api/v1';

async function debugTokenIssue() {
  try {
    console.log('1. Logging in to get token...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@techpack.com',
      password: 'AdminPassword123!'
    });
    
    console.log('Login response:', JSON.stringify(loginResponse.data, null, 2));
    
    const token = loginResponse.data.data.tokens.accessToken;
    console.log('Token received:', token ? 'Yes' : 'No');
    console.log('Token length:', token ? token.length : 'N/A');
    
    // Test token with a simple endpoint first
    console.log('\n2. Testing token with GET /admin/users/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/admin/users/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Stats response:', statsResponse.data);
    
    // Now test the user creation endpoint
    console.log('\n3. Testing POST /admin/users...');
    const userData = {
      firstName: "Test",
      lastName: "User", 
      email: "testuser@techpack.com",
      password: "TestPassword123!",
      role: "viewer"
    };
    
    const createResponse = await axios.post(`${BASE_URL}/admin/users`, userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User creation successful:', createResponse.data);
    
  } catch (error) {
    console.error('❌ Error details:');
    console.error('Status:', error.response?.status);
    console.error('Headers sent:', error.config?.headers);
    console.error('Response:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.status === 401) {
      console.error('🔍 Token authentication failed');
    }
  }
}

debugTokenIssue();
