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
const fixUserWorkspace = async () => {
  try {
    await connectDB();

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.log('📧 Usage: node backend/scripts/fixUserWorkspace.js <email>');
      console.log('   Example: node backend/scripts/fixUserWorkspace.js hieudz6222@gmail.com');
      process.exit(1);
    }

    console.log(`\n🔍 Checking user: ${email}\n`);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    console.log('📋 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Current Workspace ID: ${user.workspace || 'None'}`);

    // Get current workspace
    let currentWorkspace = null;
    if (user.workspace) {
      currentWorkspace = await Workspace.findById(user.workspace);
      if (currentWorkspace) {
        console.log(`   Current Workspace: ${currentWorkspace.name}`);
      } else {
        console.log(`   ⚠️  Current Workspace: Not found (ID: ${user.workspace})`);
      }
    } else {
      console.log(`   ⚠️  Current Workspace: None`);
    }

    // List all workspaces
    console.log('\n📦 Available Workspaces:');
    const workspaces = await Workspace.find({ isActive: true }).sort({ name: 1 });
    if (workspaces.length === 0) {
      console.log('   No workspaces found');
      process.exit(1);
    }

    workspaces.forEach((ws, index) => {
      const isCurrent = user.workspace && ws._id.toString() === user.workspace.toString();
      console.log(`   ${index + 1}. ${ws.name} (ID: ${ws._id})${isCurrent ? ' ← Current' : ''}`);
    });

    // Get target workspace from command line or prompt
    const targetWorkspaceName = process.argv[3];
    let targetWorkspace = null;

    if (targetWorkspaceName) {
      // Find workspace by name
      targetWorkspace = workspaces.find(
        ws => ws.name.toLowerCase() === targetWorkspaceName.toLowerCase()
      );
      if (!targetWorkspace) {
        console.log(`\n❌ Workspace not found: ${targetWorkspaceName}`);
        process.exit(1);
      }
    } else {
      // Interactive mode - ask user to select
      console.log('\n💡 To update workspace, run:');
      console.log(`   node backend/scripts/fixUserWorkspace.js ${email} <workspace-name>`);
      console.log(`   Example: node backend/scripts/fixUserWorkspace.js ${email} Tomota`);
      process.exit(0);
    }

    // Check if user is already in target workspace
    if (user.workspace && user.workspace.toString() === targetWorkspace._id.toString()) {
      console.log(`\n✅ User is already in workspace: ${targetWorkspace.name}`);
      process.exit(0);
    }

    // Update user workspace
    console.log(`\n🔄 Updating user workspace...`);
    console.log(`   From: ${currentWorkspace ? currentWorkspace.name : 'None'}`);
    console.log(`   To: ${targetWorkspace.name}`);

    user.workspace = targetWorkspace._id;
    await user.save();

    console.log(`\n✅ Successfully updated user workspace!`);
    console.log(`   User: ${user.email}`);
    console.log(`   New Workspace: ${targetWorkspace.name} (ID: ${targetWorkspace._id})`);

    // Verify update
    const updatedUser = await User.findById(user._id).populate('workspace', 'name');
    console.log(`\n✅ Verification:`);
    console.log(`   User workspace: ${updatedUser.workspace ? updatedUser.workspace.name : 'None'}`);

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
fixUserWorkspace();







