/**
 * Script xác minh TechPack đã tạo
 */

const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:4001/api/v1';
const TECHPACK_ID = process.argv[2] || '691214aa8553367aef65c748';
const TEST_USER = {
  email: process.env.TEST_EMAIL || 'test@techpacker.com',
  password: process.env.TEST_PASSWORD || 'password123'
};

async function login() {
  const response = await axios.post(`${BASE_URL}/auth/login`, {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  return response.data.data.tokens?.accessToken || 
         response.data.data.accessToken || 
         response.data.token;
}

async function getTechPack(id, token) {
  const response = await axios.get(`${BASE_URL}/techpacks/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data.data;
}

async function main() {
  console.log('🔍 Đang xác minh TechPack...\n');
  
  const token = await login();
  const techpack = await getTechPack(TECHPACK_ID, token);
  
  console.log('✅ TechPack đã được tạo thành công!\n');
  console.log('📋 Thông tin sản phẩm:');
  console.log(`   Tên: ${techpack.productName}`);
  console.log(`   Mã: ${techpack.articleCode}`);
  console.log(`   Nhà cung cấp: ${techpack.supplier}`);
  console.log(`   Mùa: ${techpack.season}`);
  console.log(`   Loại: ${techpack.category}`);
  console.log(`   Giới tính: ${techpack.gender}`);
  console.log(`   Thương hiệu: ${techpack.brand}`);
  console.log(`   Bộ sưu tập: ${techpack.collectionName}`);
  console.log(`   Giá bán lẻ: $${techpack.retailPrice} ${techpack.currency}`);
  console.log(`\n📦 BOM (${techpack.bom?.length || 0} items):`);
  techpack.bom?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.part} - ${item.materialName} (${item.quantity} ${item.uom})`);
  });
  console.log(`\n📏 Measurements (${techpack.measurements?.length || 0} points):`);
  techpack.measurements?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.pomName} (${item.pomCode})`);
  });
  console.log(`\n🎨 Colorways (${techpack.colorways?.length || 0}):`);
  techpack.colorways?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.name} (${item.code}) - ${item.approvalStatus}`);
  });
  console.log(`\n📐 How to Measure (${techpack.howToMeasure?.length || 0}):`);
  techpack.howToMeasure?.forEach((item, i) => {
    console.log(`   ${i + 1}. ${item.pomName} (${item.pomCode})`);
  });
}

main().catch(console.error);

