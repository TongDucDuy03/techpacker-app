const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Kết nối MongoDB
mongoose.connect('mongodb://localhost:27017/techpacker_app');

// User Schema (copy từ model gốc)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  username: { type: String, unique: true, sparse: true }, // sparse: true cho phép multiple null
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'designer', 'merchandiser'], default: 'designer' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function createAdminUser() {
  try {
    console.log('Kết nối MongoDB...');
    
    // Kiểm tra xem user đã tồn tại chưa
    const existingUser = await User.findOne({ email: 'test@techpacker.com' });
    if (existingUser) {
      console.log('✅ User test@techpacker.com đã tồn tại!');
      console.log('Thông tin user:', {
        email: existingUser.email,
        username: existingUser.username,
        role: existingUser.role,
        firstName: existingUser.firstName,
        lastName: existingUser.lastName
      });
      
      // Cập nhật role thành admin nếu chưa phải
      if (existingUser.role !== 'admin') {
        existingUser.role = 'admin';
        await existingUser.save();
        console.log('✅ Đã cập nhật role thành admin');
      }
      
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('password123', 12);
    
    // Tạo user mới
    const newUser = new User({
      firstName: 'Admin',
      lastName: 'Test',
      username: 'techpackeradmin',
      email: 'test@techpacker.com',
      password: hashedPassword,
      role: 'admin'
    });

    await newUser.save();
    
    console.log('✅ Tạo tài khoản admin thành công!');
    console.log('📧 Email: test@techpacker.com');
    console.log('🔑 Password: password123');
    console.log('👤 Username: techpackeradmin');
    console.log('🔐 Role: admin');
    
  } catch (error) {
    console.log('❌ Lỗi:', error.message);
    
    if (error.code === 11000) {
      console.log('Chi tiết lỗi duplicate key:', error.keyValue);
      
      // Thử xóa các bản ghi có username null
      if (error.keyValue && error.keyValue.username === null) {
        console.log('Thử xóa các bản ghi có username null...');
        const result = await User.deleteMany({ username: null });
        console.log(`Đã xóa ${result.deletedCount} bản ghi có username null`);
        
        // Thử tạo lại
        console.log('Thử tạo user lại...');
        const hashedPassword = await bcrypt.hash('password123', 12);
        const newUser = new User({
          firstName: 'Admin',
          lastName: 'Test',
          username: 'techpackeradmin',
          email: 'test@techpacker.com',
          password: hashedPassword,
          role: 'admin'
        });
        await newUser.save();
        console.log('✅ Tạo tài khoản admin thành công sau khi xóa duplicate!');
      }
    }
  } finally {
    mongoose.connection.close();
  }
}

createAdminUser();
