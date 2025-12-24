import mongoose from 'mongoose';
import { MONGODB_URI } from '../config/env.js';
import { User } from '../models/user.model.js';
import { Workspace } from '../models/workspace.model.js';

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Main function
const checkUser = async () => {
  try {
    await connectDB();

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.log('📧 Usage: node backend/scripts/checkUser.js <email>');
      console.log('   Example: node backend/scripts/checkUser.js hieudz6222@gmail.com');
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log(`\n🔍 Checking user: ${normalizedEmail}\n`);

    // Find all users with similar email (in case of typos)
    const allUsers = await User.find({
      email: { $regex: normalizedEmail.replace('@', '.*@'), $options: 'i' }
    }).populate('workspace', 'name');

    if (allUsers.length === 0) {
      console.log(`❌ No user found with email: ${normalizedEmail}`);
      console.log(`\n💡 Suggestions:`);
      console.log(`   1. Check if email is correct`);
      console.log(`   2. User may have been deleted`);
      console.log(`   3. Try creating a new account`);
      
      // List all workspaces
      const workspaces = await Workspace.find({ isActive: true });
      console.log(`\n📦 Available workspaces:`);
      workspaces.forEach((ws, index) => {
        console.log(`   ${index + 1}. ${ws.name} (ID: ${ws._id})`);
      });
      
      process.exit(1);
    }

    console.log(`✅ Found ${allUsers.length} user(s):\n`);
    
    allUsers.forEach((user, index) => {
      console.log(`--- User ${index + 1} ---`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name || 'N/A'}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Workspace: ${user.workspace ? user.workspace.name : 'None'} (ID: ${user.workspace?._id || 'None'})`);
      console.log(`   Has Password: ${user.password ? 'Yes' : 'No'}`);
      console.log(`   Is Verified: ${user.isVerified}`);
      console.log(`   Is Locked: ${user.isLocked}`);
      console.log('');
    });

    // Check exact match
    const exactUser = allUsers.find(u => u.email === normalizedEmail);
    if (!exactUser) {
      console.log(`⚠️  No exact match found. Did you mean one of the emails above?`);
    } else {
      console.log(`✅ Exact match found!`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
};

// Run the script
checkUser();







