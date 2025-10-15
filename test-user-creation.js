import axios from 'axios';

const BASE_URL = 'http://localhost:4001/api/v1';

async function testUserCreation() {
  console.log('Testing user creation API...');
  
  try {
    // First, let's try to create an admin user to get auth token
    console.log('1. Creating admin user for authentication...');
    
    const adminData = {
      firstName: "Admin",
      lastName: "User", 
      email: "admin@techpack.com",
      password: "AdminPassword123!",
      role: "admin"
    };
    
    // Try creating admin user first (this might fail if already exists)
    try {
      const adminResponse = await axios.post(`${BASE_URL}/auth/register`, adminData);
      console.log('✅ Admin user created:', adminResponse.data);
    } catch (error) {
      console.log('ℹ️ Admin user might already exist, continuing...');
    }
    
    // Login to get auth token
    console.log('2. Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: adminData.email,
      password: adminData.password
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login successful, token obtained');
    
    // Now test the problematic user creation endpoint
    console.log('3. Testing POST /api/v1/admin/users...');
    
    const userData = {
      firstName: "duy",
      lastName: "diuytr", 
      email: "hehe@techpack.com",
      password: "Duydeptrai0910!",
      role: "viewer"
    };
    
    const response = await axios.post(`${BASE_URL}/admin/users`, userData, {
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
    console.error('Response Data:', error.response?.data);
    console.error('Full Error:', error.message);
    
    if (error.response?.status === 500) {
      console.error('🔍 This is a 500 Internal Server Error - check server logs for details');
    }
  }
}

testUserCreation();
