const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function createAdmin() {
  try {
    console.log('Tạo tài khoản admin test@techpacker.com...');
    
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Admin',
      lastName: 'Test',
      username: 'techpackeradmin',
      email: 'test@techpacker.com',
      password: 'password123',
      role: 'admin'
    });

    console.log('✅ Tạo tài khoản thành công!');
    console.log('Response:', response.data);

    // Thử đăng nhập
    console.log('\nKiểm tra đăng nhập...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@techpacker.com',
      password: 'password123'
    });

    console.log('✅ Đăng nhập thành công!');
    console.log('User info:', loginResponse.data.data?.user);

  } catch (error) {
    console.log('❌ Lỗi:', error.response?.data || error.message);
    
    if (error.response?.data?.error?.details) {
      console.log('Chi tiết lỗi:', JSON.stringify(error.response.data.error.details, null, 2));
    }
  }
}

createAdmin();
