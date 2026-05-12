const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

const createAdmin = async () => {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: node create-admin.js <name> <email> <password>');
    console.error('Example: node create-admin.js "Super Admin" admin@example.com mysecurepassword');
    process.exit(1);
  }

  const [name, email, password] = args;

  if (!process.env.MONGODB_URI) {
    console.error('Error: MONGODB_URI is not defined in .env file.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      console.error(`❌ User with email ${email} already exists.`);
      process.exit(1);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const adminUser = new User({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin'
    });

    await adminUser.save();
    console.log(`✅ Admin user '${name}' created successfully with email '${email}'.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }
};

createAdmin();
