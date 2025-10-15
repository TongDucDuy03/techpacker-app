import axios from 'axios';

const BASE_URL = 'http://localhost:4001/api/v1';

// Test users for different roles
const testUsers = {
  admin: { email: 'admin@techpack.com', password: 'AdminPassword123!' },
  designer: { email: 'designer@techpack.com', password: 'DesignerPassword123!' },
  merchandiser: { email: 'merchandiser@techpack.com', password: 'MerchandiserPassword123!' },
  viewer: { email: 'viewer@techpack.com', password: 'ViewerPassword123!' }
};

async function createTestUsers() {
  console.log('🔧 Setting up test users...\n');
  
  const adminToken = await loginUser('admin');
  
  const usersToCreate = [
    { firstName: 'Test', lastName: 'Designer', email: 'designer@techpack.com', password: 'DesignerPassword123!', role: 'designer' },
    { firstName: 'Test', lastName: 'Merchandiser', email: 'merchandiser@techpack.com', password: 'MerchandiserPassword123!', role: 'merchandiser' },
    { firstName: 'Test', lastName: 'Viewer', email: 'viewer@techpack.com', password: 'ViewerPassword123!', role: 'viewer' }
  ];
  
  for (const userData of usersToCreate) {
    try {
      await axios.post(`${BASE_URL}/admin/users`, userData, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      console.log(`✅ Created ${userData.role} user: ${userData.email}`);
    } catch (error) {
      if (error.response?.status === 409) {
        console.log(`ℹ️ ${userData.role} user already exists: ${userData.email}`);
      } else {
        console.log(`❌ Failed to create ${userData.role} user:`, error.response?.data?.message);
      }
    }
  }
}

async function loginUser(role) {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, testUsers[role]);
    return response.data.data.tokens.accessToken;
  } catch (error) {
    console.error(`❌ Failed to login ${role}:`, error.response?.data?.message);
    throw error;
  }
}

async function testRolePermissions() {
  console.log('\n🧪 Testing Role-Based Access Control System\n');
  
  try {
    // Setup test users
    await createTestUsers();
    
    // Test each role's permissions
    await testDesignerPermissions();
    await testMerchandiserPermissions();
    await testViewerPermissions();
    await testAdminPermissions();
    
    console.log('\n🎉 ALL ROLE-BASED PERMISSION TESTS COMPLETED!');
    
  } catch (error) {
    console.error('\n❌ PERMISSION TEST FAILED:', error.message);
  }
}

async function testDesignerPermissions() {
  console.log('=== TESTING DESIGNER ROLE PERMISSIONS ===');
  
  const token = await loginUser('designer');
  let techPackId = null;
  
  // Test CREATE permission (should work)
  console.log('1. Testing Designer CREATE permission...');
  try {
    const response = await axios.post(`${BASE_URL}/techpacks`, {
      articleInfo: {
        productName: 'Designer Test Product',
        articleCode: 'DTP001',
        supplier: 'Test Supplier',
        season: 'SS25',
        fabricDescription: 'Test fabric'
      }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    techPackId = response.data.data._id;
    console.log('✅ Designer can CREATE tech packs');
  } catch (error) {
    console.log('❌ Designer CREATE failed:', error.response?.data?.message);
  }
  
  // Test READ permission (should work)
  console.log('2. Testing Designer READ permission...');
  try {
    await axios.get(`${BASE_URL}/techpacks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Designer can READ tech packs');
  } catch (error) {
    console.log('❌ Designer READ failed:', error.response?.data?.message);
  }
  
  // Test UPDATE permission on own tech pack (should work)
  if (techPackId) {
    console.log('3. Testing Designer UPDATE permission on own tech pack...');
    try {
      await axios.patch(`${BASE_URL}/techpacks/${techPackId}`, {
        productName: 'Updated Designer Product'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Designer can UPDATE own tech packs');
    } catch (error) {
      console.log('❌ Designer update failed:', error.response?.data?.message);
    }
    
    // Test DELETE permission on own tech pack (should work)
    console.log('4. Testing Designer DELETE permission on own tech pack...');
    try {
      await axios.delete(`${BASE_URL}/techpacks/${techPackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Designer can DELETE own tech packs');
    } catch (error) {
      console.log('❌ Designer delete failed:', error.response?.data?.message);
    }
  }
  
  console.log('');
}

async function testMerchandiserPermissions() {
  console.log('=== TESTING MERCHANDISER ROLE PERMISSIONS ===');
  
  const token = await loginUser('merchandiser');
  
  // Test CREATE permission (should fail)
  console.log('1. Testing Merchandiser CREATE permission (should fail)...');
  try {
    await axios.post(`${BASE_URL}/techpacks`, {
      articleInfo: {
        productName: 'Merchandiser Test Product',
        articleCode: 'MTP001',
        supplier: 'Test Supplier',
        season: 'SS25',
        fabricDescription: 'Test fabric'
      }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('❌ Merchandiser should NOT be able to create tech packs');
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Merchandiser correctly denied CREATE permission');
    } else {
      console.log('❓ Unexpected error:', error.response?.data?.message);
    }
  }
  
  // Test READ permission (should work)
  console.log('2. Testing Merchandiser READ permission...');
  try {
    await axios.get(`${BASE_URL}/techpacks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Merchandiser can READ tech packs');
  } catch (error) {
    console.log('❌ Merchandiser read failed:', error.response?.data?.message);
  }
  
  console.log('');
}

async function testViewerPermissions() {
  console.log('=== TESTING VIEWER ROLE PERMISSIONS ===');
  
  const token = await loginUser('viewer');
  
  // Test CREATE permission (should fail)
  console.log('1. Testing Viewer CREATE permission (should fail)...');
  try {
    await axios.post(`${BASE_URL}/techpacks`, {
      articleInfo: {
        productName: 'Viewer Test Product',
        articleCode: 'VTP001',
        supplier: 'Test Supplier',
        season: 'SS25',
        fabricDescription: 'Test fabric'
      }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('❌ Viewer should NOT be able to create tech packs');
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Viewer correctly denied CREATE permission');
    } else {
      console.log('❓ Unexpected error:', error.response?.data?.message);
    }
  }
  
  // Test READ permission (should work)
  console.log('2. Testing Viewer READ permission...');
  try {
    await axios.get(`${BASE_URL}/techpacks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Viewer can read tech packs');
  } catch (error) {
    console.log('❌ Viewer read failed:', error.response?.data?.message);
  }
  
  console.log('');
}

async function testAdminPermissions() {
  console.log('=== TESTING ADMIN ROLE PERMISSIONS ===');
  
  const token = await loginUser('admin');
  
  // Test all CRUD operations (should all work)
  console.log('1. Testing Admin full CRUD permissions...');
  try {
    // Create
    const createResponse = await axios.post(`${BASE_URL}/techpacks`, {
      articleInfo: {
        productName: 'Admin Test Product',
        articleCode: 'ATP001',
        supplier: 'Test Supplier',
        season: 'SS25',
        fabricDescription: 'Test fabric'
      }
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const techPackId = createResponse.data.data._id;
    console.log('✅ Admin can CREATE tech packs');
    
    // Read
    await axios.get(`${BASE_URL}/techpacks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Admin can READ tech packs');
    
    // Update
    await axios.patch(`${BASE_URL}/techpacks/${techPackId}`, {
      productName: 'Updated Admin Product'
    }, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Admin can UPDATE tech packs');
    
    // Delete
    await axios.delete(`${BASE_URL}/techpacks/${techPackId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('✅ Admin can DELETE tech packs');
    
  } catch (error) {
    console.log('❌ Admin operation failed:', error.response?.data?.message);
  }
  
  console.log('');
}

testRolePermissions();
