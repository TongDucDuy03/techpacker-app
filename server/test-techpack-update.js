const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function testTechPackUpdate() {
  try {
    console.log('Testing tech pack update...');
    
    // First login to get token
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@techpacker.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    console.log('✅ Login successful');
    
    // Test GET tech pack first
    console.log('\n2. Testing GET tech pack...');
    try {
      const getResponse = await axios.get(`${API_BASE_URL}/techpacks/1758726497677`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ GET tech pack successful');
      console.log('Tech pack data:', {
        id: getResponse.data.data._id,
        productName: getResponse.data.data.productName,
        articleCode: getResponse.data.data.articleCode
      });
    } catch (error) {
      console.log('❌ GET tech pack failed:', error.response?.data || error.message);
    }
    
    // Test UPDATE tech pack
    console.log('\n3. Testing PUT tech pack update...');
    const updateData = {
      productName: 'Updated Test Product',
      description: 'Updated description via API test',
      notes: 'Test update from script'
    };
    
    try {
      const updateResponse = await axios.put(`${API_BASE_URL}/techpacks/1758726497677`, updateData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ PUT tech pack update successful');
      console.log('Updated tech pack:', {
        id: updateResponse.data.data._id,
        productName: updateResponse.data.data.productName,
        description: updateResponse.data.data.description
      });
    } catch (error) {
      console.log('❌ PUT tech pack update failed:', error.response?.data || error.message);
      if (error.response?.status) {
        console.log('Status:', error.response.status);
      }
    }
    
  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testTechPackUpdate();
