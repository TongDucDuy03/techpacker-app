const mongoose = require('mongoose');
const { config } = require('./dist/config/config');
const User = require('./dist/models/user.model').default;

async function listUsers() {
  console.log('Đang kết nối tới MongoDB...');
  try {
    await mongoose.connect(config.mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Kết nối thành công!');

    console.log('\n--- DANH SÁCH TÀI KHOẢN NGƯỜI DÙNG ---');
    const users = await User.find({}).select('firstName lastName email role createdAt');

    if (users.length === 0) {
      console.log('Không tìm thấy tài khoản nào trong cơ sở dữ liệu.');
    } else {
      users.forEach(user => {
        console.log(`
- Họ và tên: ${user.firstName} ${user.lastName}
  Email: ${user.email}
  Vai trò: ${user.role}
  Ngày tạo: ${user.createdAt.toLocaleDateString('vi-VN')}`);
      });
      console.log(`\nTổng cộng: ${users.length} tài khoản.`);
    }

  } catch (error) {
    console.error('❌ Đã xảy ra lỗi:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nĐã ngắt kết nối khỏi MongoDB.');
  }
}

listUsers();

