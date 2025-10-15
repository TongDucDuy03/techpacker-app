const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/techpacker', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define User schema (simplified version)
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'designer', 'viewer'], default: 'designer' },
  refreshTokens: [{ type: String }],
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    console.log('Creating/updating test user...');

    // Check if test user already exists
    const existingUser = await User.findOne({ email: 'test@techpacker.com' });
    if (existingUser) {
      // Update existing user to admin role
      existingUser.role = 'admin';
      await existingUser.save();
      console.log('✅ Test user upgraded to admin!');
      console.log('Email: test@techpacker.com');
      console.log('Password: password123');
      console.log('Role: admin');
    } else {
    
        // Create test user with admin role
      const testUser = new User({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@techpacker.com',
        password: 'password123',
        role: 'admin'
      });

      await testUser.save();
      console.log('✅ Test user created successfully!');
    }
    console.log('Email: test@techpacker.com');
    console.log('Password: password123');
    
    // Create admin user
    const existingAdmin = await User.findOne({ email: 'admin@techpacker.com' });
    if (!existingAdmin) {
      const adminUser = new User({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@techpacker.com',
        password: 'admin123',
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✅ Admin user created successfully!');
      console.log('Email: admin@techpacker.com');
      console.log('Password: admin123');
    }
  } catch (error) {
    console.error('❌ Error creating test user:', error);
  } finally {
    mongoose.connection.close();
  }
}

createTestUser();
