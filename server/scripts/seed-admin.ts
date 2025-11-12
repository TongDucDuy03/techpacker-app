import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import User, { UserRole } from '../src/models/user.model';
import { config } from '../src/config/config';

// Load environment variables
dotenv.config();

interface SeedAdminOptions {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}

async function seedAdmin(options: SeedAdminOptions = {}) {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(config.mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ Connected to MongoDB');

    // Default admin credentials
    const adminEmail = options.email || process.env.ADMIN_EMAIL || 'admin@techpacker.com';
    const adminPassword = options.password || process.env.ADMIN_PASSWORD || 'Admin123!';
    const firstName = options.firstName || process.env.ADMIN_FIRST_NAME || 'Admin';
    const lastName = options.lastName || process.env.ADMIN_LAST_NAME || 'User';

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      console.log(`⚠️  Admin user with email "${adminEmail}" already exists.`);
      console.log('   Skipping seed. If you want to reset, delete the user first.');
      await mongoose.disconnect();
      return;
    }

    // Check if any admin exists
    const anyAdmin = await User.findOne({ role: UserRole.Admin });
    if (anyAdmin) {
      console.log(`⚠️  An admin user already exists (${anyAdmin.email}).`);
      console.log('   Skipping seed. If you want to create another admin, use the admin panel.');
      await mongoose.disconnect();
      return;
    }

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = new User({
      firstName,
      lastName,
      email: adminEmail,
      password: adminPassword, // Will be hashed by pre-save hook
      role: UserRole.Admin,
      isActive: true,
    });

    await adminUser.save();
    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log(`   Name: ${adminUser.firstName} ${adminUser.lastName}`);
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!');

    await mongoose.disconnect();
    console.log('\n✅ Seed completed successfully');
  } catch (error: any) {
    console.error('❌ Error seeding admin:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate email detected. Admin may already exist.');
    }
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const options: SeedAdminOptions = {};

  for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
      (options as any)[key] = value;
    }
  }

  seedAdmin(options)
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedAdmin };

