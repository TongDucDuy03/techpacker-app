const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import User model - we need to define it here since we're using JS not TS
const UserSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ['designer', 'merchandiser', 'admin', 'viewer'], default: 'designer' },
    customerId: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    refreshTokens: [{ type: String }],
    is2FAEnabled: { type: Boolean, default: true },
    twoFactorCode: { type: String, select: false },
    twoFactorCodeExpires: { type: Date },
    twoFactorCodeAttempts: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual property for fullName
UserSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Get MongoDB URI from config
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/techpacker';

async function createAdminAccount() {
  try {
    console.log('🔌 Đang kết nối đến MongoDB...');
    console.log('   MongoDB URI:', MONGO_URI.replace(/\/\/.*@/, '//***:***@')); // Hide credentials in log
    
    await mongoose.connect(MONGO_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Đã kết nối đến MongoDB\n');

    // Admin credentials
    const adminEmail = 'duytongduc510@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
    const firstName = process.env.ADMIN_FIRST_NAME || 'Admin';
    const lastName = process.env.ADMIN_LAST_NAME || 'User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️  Tài khoản admin với email "${adminEmail}" đã tồn tại.`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   Name: ${existingAdmin.firstName} ${existingAdmin.lastName}`);
      console.log(`   Active: ${existingAdmin.isActive}`);
      console.log('\n   Nếu muốn tạo lại, hãy xóa user này trước.');
      await mongoose.disconnect();
      return;
    }

    // Check if any admin exists
    const anyAdmin = await User.findOne({ role: 'admin' });
    if (anyAdmin) {
      console.log(`⚠️  Đã có admin user khác tồn tại (${anyAdmin.email}).`);
      console.log('   Bạn vẫn có thể tạo admin mới với email khác.');
    }

    // Create admin user
    console.log('👤 Đang tạo tài khoản admin...');
    const adminUser = new User({
      firstName,
      lastName,
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      role: 'admin',
      isActive: true,
    });

    await adminUser.save();
    console.log('✅ Tạo tài khoản admin thành công!\n');
    console.log('📋 Thông tin đăng nhập:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log('\n⚠️  QUAN TRỌNG: Đổi mật khẩu mặc định sau lần đăng nhập đầu tiên!');

    await mongoose.disconnect();
    console.log('\n✅ Hoàn tất!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi tạo admin:', error.message);
    if (error.code === 11000) {
      console.error('   Email đã tồn tại trong database.');
    }
    if (error.name === 'MongoServerError') {
      console.error('   Lỗi kết nối MongoDB. Kiểm tra lại MONGO_URI trong file .env');
    }
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

// Run the function
createAdminAccount();
