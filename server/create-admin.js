const axios = require('axios');

const API_BASE_URL = 'http://localhost:4001/api/v1';

async function createAdminAccount() {
  console.log('Tạo tài khoản admin...\n');

  try {
    // Đăng ký tài khoản mới
    console.log('1. Đăng ký tài khoản test@techpacker.com...');
    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      firstName: 'Admin',
      lastName: 'User',
      username: 'admin',
      email: 'test@techpacker.com',
      password: 'password123',
      role: 'Admin' // Thử set role admin ngay từ đầu
    });

    console.log('✅ Đăng ký thành công:', registerResponse.data);

    // Thử đăng nhập để kiểm tra
    console.log('\n2. Kiểm tra đăng nhập...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@techpacker.com',
      password: 'password123'
    });

    console.log('✅ Đăng nhập thành công:', {
      message: loginResponse.data.message,
      user: loginResponse.data.data.user,
      token: loginResponse.data.data.token ? 'Token có sẵn' : 'Không có token'
    });

  } catch (error) {
    if (error.response) {
      console.log('❌ Lỗi:', error.response.data);
      console.log('Status:', error.response.status);
      
      // Nếu tài khoản đã tồn tại, thử đăng nhập
      if (error.response.status === 400 && error.response.data.message?.includes('already exists')) {
        console.log('\n3. Tài khoản đã tồn tại, thử đăng nhập...');
        try {
          const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
            email: 'test@techpacker.com',
            password: 'password123'
          });
          console.log('✅ Đăng nhập thành công với tài khoản hiện có:', {
            message: loginResponse.data.message,
            user: loginResponse.data.data.user
          });
        } catch (loginError) {
          console.log('❌ Không thể đăng nhập:', loginError.response?.data || loginError.message);
        }
      }
    } else {
      console.log('❌ Lỗi kết nối:', error.message);
    }
  }
}

// Thêm function để kiểm tra validation chi tiết
async function checkValidationDetails() {
  console.log('\nKiểm tra validation requirements...\n');

  try {
    // Thử với thông tin tối thiểu trước
    const response = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: 'test@techpacker.com',
      password: 'password123'
    });
    console.log('✅ Đăng ký thành công với thông tin tối thiểu');
  } catch (error) {
    if (error.response) {
      console.log('❌ Chi tiết lỗi validation:');
      console.log('Status:', error.response.status);
      console.log('Message:', error.response.data.message);
      if (error.response.data.error && error.response.data.error.details) {
        console.log('Details:', JSON.stringify(error.response.data.error.details, null, 2));
      }

      // Thử với đầy đủ thông tin required
      console.log('\nThử với thông tin đầy đủ...');
      try {
        const fullResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
          firstName: 'Admin',
          lastName: 'User',
          email: 'test@techpacker.com',
          password: 'password123',
          username: 'adminuser'
        });
        console.log('✅ Đăng ký thành công với thông tin đầy đủ');
      } catch (fullError) {
        console.log('❌ Vẫn lỗi với thông tin đầy đủ:');
        if (fullError.response?.data?.error?.details) {
          console.log('Details:', JSON.stringify(fullError.response.data.error.details, null, 2));
        }
      }
    } else {
        console.log('❌ Lỗi không xác định:', error.message);
    }
  }
}

// Chạy function kiểm tra validation trước
checkValidationDetails().catch(console.error);
