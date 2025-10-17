// Simple test để kiểm tra revision creation
// Chạy script này sau khi đã start server

const axios = require('axios');

async function testRevisionCreation() {
  const baseURL = 'http://localhost:3001/api/v1';
  const techPackId = '68e4ebd800ccd0b306ed0623';
  
  console.log('🧪 Testing Revision Creation...');
  console.log('TechPack ID:', techPackId);
  
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
    
    // 2. Tạo một thay đổi nhỏ
    console.log('\n2️⃣ Making a small change...');
    const updatePayload = {
      productName: `Updated at ${new Date().toISOString()}`,
      version: '1.1'
    };
    
    const updateResponse = await axios.put(`${baseURL}/techpacks/${techPackId}`, updatePayload, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Update response status:', updateResponse.status);
    
    // 3. Kiểm tra revisions sau update
    console.log('\n3️⃣ Checking revisions after update...');
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
    
    const newRevisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    const newRevisions = newRevisionsResponse.data.data?.revisions || [];
    console.log('📊 New revisions count:', newRevisions.length);
    
    if (newRevisions.length > currentRevisions.length) {
      console.log('✅ SUCCESS: New revision was created!');
      const latestRevision = newRevisions[0];
      console.log('📊 Latest revision:', {
        id: latestRevision._id,
        version: latestRevision.version,
        summary: latestRevision.changes?.summary,
        createdAt: latestRevision.createdAt
      });
    } else {
      console.log('❌ FAILED: No new revision was created');
      console.log('🔍 This means the revision creation logic is not working');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Chạy test
testRevisionCreation().catch(console.error);

