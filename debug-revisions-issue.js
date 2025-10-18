const axios = require('axios');

// Debug script để kiểm tra chi tiết vấn đề revisions
async function debugRevisionsIssue() {
  const baseURL = 'http://localhost:3001/api/v1';
  const techPackId = '68e4ebd800ccd0b306ed0623'; // ID từ log của bạn
  
  try {
    console.log('🔍 Debugging Revisions Issue...');
    console.log('TechPack ID:', techPackId);
    
    // 1. Kiểm tra TechPack có tồn tại không
    console.log('\n1️⃣ Checking if TechPack exists...');
    try {
      const techPackResponse = await axios.get(`${baseURL}/techpacks/${techPackId}`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ TechPack exists:', techPackResponse.data.data?.productName || 'Unknown');
      console.log('📊 TechPack version:', techPackResponse.data.data?.version);
      console.log('📊 TechPack status:', techPackResponse.data.data?.status);
    } catch (error) {
      console.error('❌ TechPack not found:', error.response?.data || error.message);
      return;
    }
    
    // 2. Kiểm tra revisions API
    console.log('\n2️⃣ Checking revisions API...');
    const revisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Revisions API Status:', revisionsResponse.status);
    console.log('📊 Response structure:', Object.keys(revisionsResponse.data));
    
    if (revisionsResponse.data.success && revisionsResponse.data.data) {
      const revisions = revisionsResponse.data.data.revisions || [];
      const pagination = revisionsResponse.data.data.pagination || {};
      
      console.log('📊 Revisions count:', revisions.length);
      console.log('📊 Pagination:', pagination);
      
      if (revisions.length === 0) {
        console.log('❌ No revisions found in database');
        console.log('🔍 This means either:');
        console.log('   - No updates have been made to this TechPack');
        console.log('   - Revision creation failed silently');
        console.log('   - Database query issue');
      } else {
        console.log('✅ Found revisions:');
        revisions.forEach((rev, index) => {
          console.log(`   ${index + 1}. Version: ${rev.version}, Created: ${rev.createdAt}, Summary: ${rev.changes?.summary || 'N/A'}`);
        });
      }
    }
    
    // 3. Test tạo revision bằng cách update TechPack
    console.log('\n3️⃣ Testing revision creation by updating TechPack...');
    try {
      const updatePayload = {
        productName: 'Test Update - ' + new Date().toISOString(),
        version: '1.1'
      };
      
      console.log('🔄 Sending update request...');
      const updateResponse = await axios.put(`${baseURL}/techpacks/${techPackId}`, updatePayload, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Update successful:', updateResponse.status);
      
      // Wait a bit for revision to be created
      console.log('⏳ Waiting 2 seconds for revision creation...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check revisions again
      console.log('🔄 Checking revisions after update...');
      const newRevisionsResponse = await axios.get(`${baseURL}/techpacks/${techPackId}/revisions`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Thay bằng token thực tế
          'Content-Type': 'application/json'
        }
      });
      
      const newRevisions = newRevisionsResponse.data.data?.revisions || [];
      console.log('📊 Revisions count after update:', newRevisions.length);
      
      if (newRevisions.length > 0) {
        console.log('✅ Revision creation is working!');
        console.log('📊 Latest revision:', newRevisions[0]);
      } else {
        console.log('❌ Still no revisions after update - there might be an issue with revision creation logic');
      }
      
    } catch (updateError) {
      console.error('❌ Update failed:', updateError.response?.data || updateError.message);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Chạy debug
debugRevisionsIssue().catch(console.error);


