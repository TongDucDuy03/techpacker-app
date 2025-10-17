// Test script để kiểm tra revision creation với PUT request
const axios = require('axios');

async function testRevisionCreationWithPUT() {
  const baseURL = 'http://localhost:4001/api/v1'; // Port từ log của bạn
  const techPackId = '68f0924d6b2a9242a6cac5b4'; // ID từ log của bạn
  
  console.log('🧪 Testing Revision Creation with PUT request...');
  console.log('TechPack ID:', techPackId);
  console.log('Base URL:', baseURL);
  
  try {
    // 1. Kiểm tra revisions hiện tại
    console.log('\n1️⃣ Current revisions:');
    const revisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    const currentRevisions = revisionsResponse.data.data?.revisions || [];
    console.log('📊 Current revisions count:', currentRevisions.length);
    
    // 2. Tạo thay đổi với PUT request
    console.log('\n2️⃣ Making change with PUT request...');
    const updatePayload = {
      productName: `PUT Update at ${new Date().toISOString()}`,
      version: '1.2',
      fabricDescription: 'Updated fabric description'
    };
    
    console.log('🔄 Sending PUT request with payload:', updatePayload);
    
    const updateResponse = await axios.put(`${baseURL}/techpacks/${techPackId}`, updatePayload, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PUT Update response status:', updateResponse.status);
    console.log('📊 Response data:', JSON.stringify(updateResponse.data, null, 2));
    
    // 3. Kiểm tra revisions sau update
    console.log('\n3️⃣ Checking revisions after PUT update...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const newRevisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    const newRevisions = newRevisionsResponse.data.data?.revisions || [];
    console.log('📊 New revisions count:', newRevisions.length);
    
    if (newRevisions.length > currentRevisions.length) {
      console.log('✅ SUCCESS: New revision was created with PUT request!');
      const latestRevision = newRevisions[0];
      console.log('📊 Latest revision:', {
        id: latestRevision._id,
        version: latestRevision.version,
        summary: latestRevision.changes?.summary,
        createdAt: latestRevision.createdAt,
        createdBy: latestRevision.createdByName
      });
    } else {
      console.log('❌ FAILED: No new revision was created with PUT request');
      console.log('🔍 This means there might be an issue with:');
      console.log('   - Backend revision creation logic');
      console.log('   - Database connection');
      console.log('   - User permissions');
      console.log('   - TechPack not found');
    }
    
    // 4. So sánh với PATCH request
    console.log('\n4️⃣ Testing PATCH request for comparison...');
    const patchPayload = {
      productName: `PATCH Update at ${new Date().toISOString()}`,
      version: '1.3'
    };
    
    const patchResponse = await axios.patch(`${baseURL}/techpacks/${techPackId}`, patchPayload, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PATCH Update response status:', patchResponse.status);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalRevisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    const finalRevisions = finalRevisionsResponse.data.data?.revisions || [];
    console.log('📊 Final revisions count after PATCH:', finalRevisions.length);
    
    if (finalRevisions.length > newRevisions.length) {
      console.log('✅ PATCH request also created revision');
    } else {
      console.log('❌ PATCH request did not create revision');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('🔑 Authentication required. Please update the token in the script.');
    } else if (error.response?.status === 404) {
      console.log('🔍 TechPack not found. Please check the ID.');
    } else if (error.response?.status === 403) {
      console.log('🚫 Access denied. Please check permissions.');
    }
  }
}

// Chạy test
testRevisionCreationWithPUT().catch(console.error);

