const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function testAuth() {
  console.log('🧪 Testing Authentication System...\n');

  // Test 1: Register a new user
  console.log('1. Testing user registration...');
  try {
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      password: 'testpassword123',
      role: 'designer'
    });
    console.log('✅ Registration successful:', registerResponse.data);
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('ℹ️  User already exists, continuing with login test...');
    } else {
      console.log('❌ Registration failed:', error.response?.data || error.message);
      return;
    }
  }

  // Test 2: Login with the user
  console.log('\n2. Testing user login...');
  try {
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'testpassword123'
    });
    console.log('✅ Login successful:', loginResponse.data);
    
    const { accessToken } = loginResponse.data.data.tokens;
    
    // Test 3: Access protected route
    console.log('\n3. Testing protected route access...');
    const profileResponse = await axios.get(`${API_BASE_URL}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log('✅ Protected route access successful:', profileResponse.data);
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
    console.log('Full error:', error.response);
  }

  // Test 4: Login with wrong credentials
  console.log('\n4. Testing login with wrong password...');
  try {
    await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    console.log('❌ This should have failed!');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Correctly rejected wrong password:', error.response.data);
    } else {
      console.log('❌ Unexpected error:', error.response?.data || error.message);
    }
  }
}

testAuth().catch(console.error);
