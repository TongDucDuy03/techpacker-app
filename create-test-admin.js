import axios from 'axios';

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function createTestAdmin() {
  console.log('Creating test admin user...\n');

  try {
    // Try to register a new admin user
    console.log('1. Registering admin user...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@techpack.com',
      password: 'AdminPassword123!',
      role: 'admin'
    });

    console.log('✅ Registration successful:', registerResponse.data);
    return registerResponse.data;

  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message?.includes('already exists')) {
      console.log('ℹ️ Admin user already exists, that\'s fine');
      return { success: true, message: 'User already exists' };
    } else {
      console.error('❌ Registration failed:');
      console.error('Status:', error.response?.status);
      console.error('Response:', error.response?.data);
      throw error;
    }
  }
}

async function testUserCreationWithAuth() {
  console.log('Testing user creation API with proper authentication...\n');
  
  try {
    // Ensure admin exists
    await createTestAdmin();
    
    // Login to get auth token
    console.log('2. Logging in as admin...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@techpack.com',
      password: 'AdminPassword123!'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token obtained');
    
    // Test the user creation endpoint
    console.log('3. Testing POST /api/v1/admin/users...');
    
    const userData = {
      firstName: "duy",
      lastName: "diuytr", 
      email: "hehe@techpack.com",
      password: "Duydeptrai0910!",
      role: "viewer"
    };
    
    const response = await axios.post(`${API_BASE_URL}/admin/users`, userData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User creation successful:', response.data);
    
  } catch (error) {
    console.error('❌ Error occurred:');
    console.error('Status:', error.response?.status);
    console.error('Status Text:', error.response?.statusText);
    console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.status === 500) {
      console.error('🔍 This is a 500 Internal Server Error - check server logs for details');
    }
  }
}

testUserCreationWithAuth();
