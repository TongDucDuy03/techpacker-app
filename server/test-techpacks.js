const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function testTechPacksEndpoint() {
  console.log('[object Object]esting TechPacks Endpoint...\n');

  // Test 1: Basic GET request without parameters
  console.log('1. Testing basic GET /api/v1/techpacks...');
  try {
    const response = await axios.get(`${API_BASE_URL}/techpacks`);
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.log('❌ Failed:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }

  // Test 2: GET request with valid designer parameter
  console.log('\n2. Testing with valid designer ObjectId...');
  try {
    const validObjectId = '507f1f77bcf86cd799439011'; // Example valid ObjectId
    const response = await axios.get(`${API_BASE_URL}/techpacks?designer=${validObjectId}`);
    console.log('✅ Success with valid designer:', response.data);
  } catch (error) {
    console.log('❌ Failed with valid designer:', error.response?.data || error.message);
  }

  // Test 3: GET request with invalid designer parameter (this should now be handled gracefully)
  console.log('\n3. Testing with invalid designer parameter...');
  try {
    const response = await axios.get(`${API_BASE_URL}/techpacks?designer=fsd`);
    console.log('✅ Success with invalid designer (should be handled gracefully):', response.data);
  } catch (error) {
    console.log('❌ Still failing with invalid designer:', error.response?.data || error.message);
    console.log('Status:', error.response?.status);
  }

  // Test 4: GET request with other query parameters
  console.log('\n4. Testing with other query parameters...');
  try {
    const response = await axios.get(`${API_BASE_URL}/techpacks?page=1&limit=10&status=Draft`);
    console.log('✅ Success with query params:', response.data);
  } catch (error) {
    console.log('❌ Failed with query params:', error.response?.data || error.message);
  }
}

testTechPacksEndpoint().catch(console.error);
