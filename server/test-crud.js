/**
 * Comprehensive CRUD Test Script for TechPack
 * 
 * Prerequisites:
 *   1. Install axios: npm install axios
 *   2. Make sure server is running on http://localhost:5000
 *   3. Have a test user with email: test@example.com, password: test123456
 * 
 * Usage: 
 *   cd server
 *   node test-crud.js
 * 
 * Or with custom API URL:
 *   API_URL=http://localhost:5000/api/v1 node test-crud.js
 * 
 * This script tests:
 * - CREATE: Create new TechPack with all fields (supplier, productClass, brand, etc.)
 * - READ: Get TechPack by ID and verify all fields are saved
 * - UPDATE: Update TechPack fields (including arrays like BOM)
 * - DELETE: Delete TechPack
 */

// Check if axios is available
let axios;
try {
  axios = require('axios');
} catch (error) {
  console.error('❌ axios is not installed. Please run: npm install axios');
  process.exit(1);
}

// Configuration
// Default server port used by this project is 4001 (see server/src/config/config.ts)
const BASE_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@techpacker.com',
  password: process.env.TEST_PASSWORD || 'password123'
};

// Test data
let authToken = '';
let createdTechPackId = '';
let testTechPack = {
  articleInfo: {
    productName: 'Test Product CRUD',
    // Keep articleCode short to satisfy backend validation (<20 chars)
    // Format: TCRUD + 4 random digits = max 9 chars
    articleCode: `TCRUD${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}`,
    version: 1,
    supplier: 'Test Supplier',
    season: 'SS25',
    fabricDescription: 'Test fabric description',
    productDescription: 'Test product description',
    designSketchUrl: 'https://example.com/sketch.jpg',
    productClass: 'Shirts',
    gender: 'Unisex',
    technicalDesignerId: '', // Will be set after login
    lifecycleStage: 'Concept',
    collection: 'Test Collection',
    targetMarket: 'Global',
    pricePoint: 'Mid-range',
    notes: 'Test notes'
  },
  bom: [
    {
      part: 'Body',
      materialName: 'Cotton Fabric',
      placement: 'Front',
      size: 'M',
      quantity: 2,
      uom: 'm',
      supplier: 'Fabric Supplier',
      color: 'White',
      unitPrice: 10.5,
      totalPrice: 21
    }
  ],
  measurements: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest',
      toleranceMinus: 1,
      tolerancePlus: 1,
      sizes: {
        S: 90,
        M: 95,
        L: 100
      },
      notes: 'Test measurement'
    }
  ],
  colorways: [
    {
      name: 'White',
      code: 'WHITE-001',
      placement: 'Body',
      materialType: 'Fabric',
      hexColor: '#FFFFFF'
    }
  ],
  howToMeasures: [
    {
      pomCode: 'CHEST',
      pomName: 'Chest',
      description: 'Measure around the chest',
      stepNumber: 1,
      instructions: ['Place tape measure', 'Measure at fullest point']
    }
  ],
  status: 'draft'
};

// Helper functions
async function checkServerConnection() {
  try {
    console.log('\n🔍 Checking server connection...');
    const response = await axios.get(`${BASE_URL.replace('/api/v1', '')}/health`, {
      timeout: 3000
    }).catch(() => {
      // Health endpoint might not exist, try a simple GET
      return axios.get(`${BASE_URL}/techpacks?limit=1`, {
        timeout: 3000,
        validateStatus: () => true // Accept any status
      });
    });
    console.log('✅ Server is reachable');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('❌ Cannot connect to server');
      console.error(`   URL: ${BASE_URL}`);
      console.error('   Make sure the server is running: npm run dev');
      return false;
    }
    // If we get any response (even 401/403), server is running
    console.log('✅ Server is reachable (got response)');
    return true;
  }
}

async function login() {
  try {
    console.log('\n🔐 Step 1: Login...');
    console.log(`   Email: ${TEST_USER.email}`);
    
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (response.data.success && response.data.data) {
      // Check for both token formats (old and new API)
      authToken = response.data.data.tokens?.accessToken || 
                  response.data.data.accessToken || 
                  response.data.token || 
                  response.data.data.token;
      
      if (!authToken) {
        console.error('❌ Login failed: No token in response');
        console.error('Response structure:', JSON.stringify(response.data, null, 2));
        return false;
      }
      
      console.log('✅ Login successful');
      
      // Get user info to set technicalDesignerId
      try {
        // Try to get user from login response first
        const userData = response.data.data?.user || response.data.data;
        if (userData && (userData._id || userData.id)) {
          testTechPack.articleInfo.technicalDesignerId = userData._id || userData.id;
          console.log(`✅ User ID: ${testTechPack.articleInfo.technicalDesignerId}`);
        } else {
          // Fallback: try /auth/me endpoint
          const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });
          
          if (userResponse.data.success && userResponse.data.data) {
            const user = userResponse.data.data.user || userResponse.data.data;
            testTechPack.articleInfo.technicalDesignerId = user._id || user.id;
            console.log(`✅ User ID: ${testTechPack.articleInfo.technicalDesignerId}`);
          }
        }
      } catch (userError) {
        console.log('⚠️  Could not fetch user info, will use default');
        // Continue anyway, technicalDesignerId might be set from user._id in create
      }
      return true;
    } else {
      console.error('❌ Login failed: No token received');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Login failed');
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error(`   Connection error: Cannot connect to ${BASE_URL}`);
      console.error('   Make sure the server is running on http://localhost:5000');
      console.error('   Run: npm run dev');
    } else if (error.response) {
      // Server responded with error
      console.error(`   Status: ${error.response.status} ${error.response.statusText}`);
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.error('\n💡 Tip: Check your email and password are correct');
        console.error(`   Current email: ${TEST_USER.email}`);
        console.error('   You can set custom credentials with:');
        console.error('   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-crud.js');
      } else if (error.response.status === 404) {
        console.error(`\n💡 Tip: Endpoint not found. Check if API URL is correct: ${BASE_URL}/auth/login`);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('   No response from server');
      console.error('   Make sure the server is running on http://localhost:5000');
    } else {
      // Error setting up request
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    return false;
  }
}

async function createTechPack() {
  try {
    console.log('\n📝 Step 2: CREATE TechPack...');
    
    // Generate a unique articleCode each time (max 9 chars: TCRUD + 4 digits)
    const randomCode = String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0');
    testTechPack.articleInfo.articleCode = `TCRUD${randomCode}`;
    
    console.log(`   Article Code: ${testTechPack.articleInfo.articleCode}`);
    console.log('Sending data:', JSON.stringify(testTechPack, null, 2));
    
    const response = await axios.post(
      `${BASE_URL}/techpacks`,
      testTechPack,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      createdTechPackId = response.data.data._id || response.data.data.id;
      console.log('✅ TechPack created successfully');
      console.log(`   ID: ${createdTechPackId}`);
      console.log(`   Product Name: ${response.data.data.productName}`);
      console.log(`   Article Code: ${response.data.data.articleCode}`);
      console.log(`   Supplier: ${response.data.data.supplier}`);
      console.log(`   Category: ${response.data.data.category}`);
      console.log(`   Gender: ${response.data.data.gender}`);
      console.log(`   Brand: ${response.data.data.brand}`);
      console.log(`   Collection: ${response.data.data.collectionName}`);
      console.log(`   BOM Items: ${response.data.data.bom?.length || 0}`);
      console.log(`   Measurements: ${response.data.data.measurements?.length || 0}`);
      console.log(`   Colorways: ${response.data.data.colorways?.length || 0}`);
      return true;
    } else {
      console.error('❌ Create failed: Invalid response');
      console.error('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    console.error('❌ Create failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function readTechPack() {
  try {
    console.log('\n📖 Step 3: READ TechPack...');
    
    const response = await axios.get(
      `${BASE_URL}/techpacks/${createdTechPackId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success && response.data.data) {
      const tp = response.data.data;
      console.log('✅ TechPack retrieved successfully');
      console.log(`   Product Name: ${tp.productName}`);
      console.log(`   Article Code: ${tp.articleCode}`);
      console.log(`   Supplier: ${tp.supplier || 'NOT SAVED'}`);
      console.log(`   Category: ${tp.category || 'NOT SAVED'}`);
      console.log(`   Gender: ${tp.gender || 'NOT SAVED'}`);
      console.log(`   Brand: ${tp.brand || 'NOT SAVED'}`);
      console.log(`   Collection: ${tp.collectionName || 'NOT SAVED'}`);
      console.log(`   Target Market: ${tp.targetMarket || 'NOT SAVED'}`);
      console.log(`   Price Point: ${tp.pricePoint || 'NOT SAVED'}`);
      console.log(`   BOM Items: ${tp.bom?.length || 0}`);
      console.log(`   Measurements: ${tp.measurements?.length || 0}`);
      console.log(`   Colorways: ${tp.colorways?.length || 0}`);
      console.log(`   HowToMeasure: ${tp.howToMeasure?.length || 0}`);
      
      // Verify all fields are saved
      const fieldsToCheck = [
        { name: 'supplier', value: tp.supplier },
        { name: 'category', value: tp.category },
        { name: 'gender', value: tp.gender },
        { name: 'brand', value: tp.brand },
        { name: 'collectionName', value: tp.collectionName },
        { name: 'targetMarket', value: tp.targetMarket },
        { name: 'pricePoint', value: tp.pricePoint }
      ];
      
      const missingFields = fieldsToCheck.filter(f => !f.value);
      if (missingFields.length > 0) {
        console.log(`\n⚠️  Missing fields: ${missingFields.map(f => f.name).join(', ')}`);
      } else {
        console.log('\n✅ All fields saved correctly!');
      }
      
      return true;
    } else {
      console.error('❌ Read failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Read failed:', error.response?.data || error.message);
    return false;
  }
}

async function listTechPacks() {
  try {
    console.log('\n📋 Step 4: LIST TechPacks...');
    
    const response = await axios.get(
      `${BASE_URL}/techpacks?page=1&limit=10`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ TechPacks listed successfully');
      console.log(`   Total: ${response.data.total || response.data.data?.length || 0}`);
      console.log(`   Found our test TechPack: ${response.data.data?.some(tp => tp._id === createdTechPackId || tp.id === createdTechPackId) ? 'Yes' : 'No'}`);
      return true;
    } else {
      console.error('❌ List failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ List failed:', error.response?.data || error.message);
    return false;
  }
}

async function updateTechPack() {
  try {
    console.log('\n✏️  Step 5: UPDATE TechPack...');
    
    const updateData = {
      productName: 'Updated Test Product',
      supplier: 'Updated Supplier',
      category: 'Pants',
      gender: 'Men',
      brand: 'Updated Brand',
      collectionName: 'Updated Collection',
      targetMarket: 'US Market',
      pricePoint: 'Premium',
      bom: [
        ...testTechPack.bom,
        {
          part: 'Sleeve',
          materialName: 'Updated Material',
          placement: 'Left',
          size: 'L',
          quantity: 1,
          uom: 'm',
          supplier: 'New Supplier'
        }
      ]
    };
    
    const response = await axios.patch(
      `${BASE_URL}/techpacks/${createdTechPackId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data.success && response.data.data) {
      const tp = response.data.data.updatedTechPack || response.data.data;
      console.log('✅ TechPack updated successfully');
      console.log(`   Product Name: ${tp.productName}`);
      console.log(`   Supplier: ${tp.supplier}`);
      console.log(`   Category: ${tp.category}`);
      console.log(`   Gender: ${tp.gender}`);
      console.log(`   Brand: ${tp.brand}`);
      console.log(`   BOM Items: ${tp.bom?.length || 0} (should be 2)`);
      
      // Verify update
      if (tp.productName === updateData.productName && 
          tp.supplier === updateData.supplier &&
          tp.bom?.length === 2) {
        console.log('\n✅ All updates saved correctly!');
        return true;
      } else {
        console.log('\n⚠️  Some updates may not have been saved');
        return false;
      }
    } else {
      console.error('❌ Update failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Update failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function deleteTechPack() {
  try {
    console.log('\n🗑️  Step 6: DELETE TechPack...');
    
    const response = await axios.delete(
      `${BASE_URL}/techpacks/${createdTechPackId}`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (response.data.success) {
      console.log('✅ TechPack deleted successfully');
      
      // Verify deletion
      try {
        await axios.get(
          `${BASE_URL}/techpacks/${createdTechPackId}`,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
        console.log('⚠️  TechPack still exists (soft delete?)');
      } catch (error) {
        if (error.response?.status === 404) {
          console.log('✅ TechPack confirmed deleted');
        }
      }
      return true;
    } else {
      console.error('❌ Delete failed: Invalid response');
      return false;
    }
  } catch (error) {
    console.error('❌ Delete failed:', error.response?.data || error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting TechPack CRUD Tests...');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_USER.email}`);
  
  const results = {
    login: false,
    create: false,
    read: false,
    list: false,
    update: false,
    delete: false
  };
  
  // Check server connection first
  const serverConnected = await checkServerConnection();
  if (!serverConnected) {
    console.error('\n❌ Cannot proceed without server connection.');
    return;
  }
  
  // Run tests in sequence
  results.login = await login();
  if (!results.login) {
    console.error('\n❌ Cannot proceed without login. Please check credentials.');
    return;
  }
  
  results.create = await createTechPack();
  if (!results.create) {
    console.error('\n❌ Create failed. Stopping tests.');
    return;
  }
  
  results.read = await readTechPack();
  results.list = await listTechPacks();
  results.update = await updateTechPack();
  results.delete = await deleteTechPack();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Login:        ${results.login ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Create:       ${results.create ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Read:         ${results.read ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`List:         ${results.list ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Update:       ${results.update ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Delete:       ${results.delete ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(50));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  console.log(`\nResult: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner error:', error);
  process.exit(1);
});

