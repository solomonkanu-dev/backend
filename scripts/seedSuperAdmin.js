import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const existing = await User.findOne({ role: 'super_admin' });

    if (existing) {
      console.log('Super admin already exists');
      process.exit();
    }

    await User.create({
      fullName: 'System Owner',
      email: 'superadmin@system.com',
      password: process.env.ADMIN_SIGNUP_CODE,
      role: 'super_admin',
      approved: true,
    });

    console.log('Super admin created successfully');
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedSuperAdmin();
