const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testLogin() {
  try {
    console.log('Testing TechPacker Login API...\n');

    // First, try to register a test user
    console.log('1. Creating test user...');
    try {
      const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'testpassword123',
        role: 'designer'
      });
      console.log('✅ Test user created successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  Test user already exists, continuing...');
      } else {
        console.log('❌ Failed to create test user:', error.response?.data || error.message);
      }
    }

    // Test login with valid credentials
    console.log('\n2. Testing login with valid credentials...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      console.log('✅ Login successful!');
      console.log('Response:', JSON.stringify(loginResponse.data, null, 2));
      
      // Test accessing a protected route
      const token = loginResponse.data.data.accessToken;
      console.log('\n3. Testing protected route access...');
      
      const profileResponse = await axios.get(`${BASE_URL}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Protected route access successful!');
      console.log('Profile:', JSON.stringify(profileResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ Login failed:', error.response?.data || error.message);
      console.log('Status:', error.response?.status);
      console.log('Headers:', error.response?.headers);
    }

    // Test login with invalid credentials
    console.log('\n4. Testing login with invalid credentials...');
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      console.log('❌ This should have failed!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid credentials correctly rejected');
        console.log('Error response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('❌ Unexpected error:', error.response?.data || error.message);
      }
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testLogin();
