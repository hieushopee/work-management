import { User } from '../models/user.model.js';
import { Team } from '../models/team.model.js';
import { imagekit, isImageKitConfigured } from '../config/imagekit.js';
import { IMAGEKIT_FACE_FOLDER } from '../config/env.js';
import { transporter } from '../config/nodemailer.js';
import { mailOptions } from '../utils/mailOptions.js';
import { CLIENT_LOGIN_URL, MY_EMAIL } from '../config/env.js';
import { hashPassword, validatePassword, generateDefaultPassword } from '../utils/passwordUtils.js';
import { toObjectId } from '../utils/identifiers.js';

const normalizeEmail = (value = '') => value.trim().toLowerCase();

export const createEmployee = async (req, res) => {
  const { name, email, phoneNumber, department, role, faceUrl, teams, password } = req.body || {};
  const createdBy = req.user?.id || null;
  const currentUser = req.user;
  const workspaceId = toObjectId(currentUser?.workspace);

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  // Manager can only create employees in their department and only with staff role
  if (currentUser && currentUser.role === 'manager') {
    if (department && department !== currentUser.department) {
      return res.status(403).json({ error: 'You can only create employees in your own department.' });
    }
    if (role && role !== 'staff') {
      return res.status(403).json({ error: 'You can only create employees with staff role.' });
    }
  }

  // Only admin can set password when creating account
  let hashedPassword = null;
  if (password && currentUser && currentUser.role === 'admin') {
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements.',
        details: passwordValidation.errors 
      });
    }
    hashedPassword = await hashPassword(password);
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    // Check if user exists in the same workspace
    const existingUser = await User.findOne({ 
      email: normalizedEmail,
      workspace: workspaceId 
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists in this workspace.' });
    }

    // Set default values based on user role
    const finalDepartment = currentUser && currentUser.role === 'manager'
      ? (department || currentUser.department || '')
      : (department || '');
    const finalRole = currentUser && currentUser.role === 'manager'
      ? 'staff'
      : (role || 'staff');

    const employeeData = {
      createdBy,
      name: name || '',
      email: normalizedEmail,
      phoneNumber: phoneNumber || '',
      role: finalRole,
      department: finalDepartment,
      faceUrl: faceUrl || null,
      teams: [],
      isVerified: false,
      workspace: workspaceId || undefined, // Assign to current user's workspace when valid
    };

    // Add password if provided (admin only)
    if (hashedPassword) {
      employeeData.password = hashedPassword;
      employeeData.passwordChangedAt = null; // User hasn't changed it yet
    }

    const employee = await User.create(employeeData);

    // Find teams by names if teams are provided and add employee to them
    if (teams && Array.isArray(teams) && teams.length > 0) {
      const teamIds = [];
      for (const teamName of teams) {
        if (teamName && teamName.trim() !== '') {
          const foundTeam = await Team.findOne({ name: teamName.trim() });
          if (foundTeam) {
            // Add employee to team's members array first
            if (!foundTeam.members.includes(employee._id)) {
              foundTeam.members.push(employee._id);
              await foundTeam.save();
            }
            teamIds.push(foundTeam._id);
          }
        }
      }

      // Update employee's teams reference
      employee.teams = teamIds;
      await employee.save();
    }

    try {
      await transporter.sendMail(
        mailOptions(
          employee.email,
          'Welcome to Real-Time Employee Task Management Tool',
          `
            <h2>Welcome, ${employee.name || 'Employee'}!</h2>
            <p>You have been successfully added as an employee in our Real-Time Employee Task Management Tool.</p>
            <p>Your role is: <strong>${employee.role}</strong></p>
            <p>For any assistance, please contact us at ${MY_EMAIL}.</p>
            <p>Please click on the verification link to set up your account: ${CLIENT_LOGIN_URL}</p>
          `
        )
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Populate teams information before returning
    const populatedEmployee = await User.findById(employee._id).populate('teams', 'name');

    res.json({
      success: true,
      employeeId: populatedEmployee.id,
      employee: populatedEmployee.toJSON(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }
    if (error?.name === 'CastError' && error?.path === 'workspace') {
      return res.status(400).json({ error: 'Invalid workspace identifier.' });
    }
    console.error('Error in createEmployee:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = {};
    const workspaceId = toObjectId(currentUser?.workspace);
    if (workspaceId) {
      query.workspace = workspaceId;
    }
    
    // Manager can only see users in their department
    if (currentUser && currentUser.role === 'manager') {
      query.department = currentUser.department || '';
    }
    // Admin can see all users in their workspace
    
    // Filter out locked accounts for non-admin users
    const showLocked = currentUser && currentUser.role === 'admin';
    if (!showLocked) {
      query.isLocked = { $ne: true };
    }
    
    const users = await User.find(query).populate('teams', 'name').sort({ createdAt: -1 });

    const usersWithTeamNames = users.map((user) => {
      const userObj = user.toJSON();
      // Add team names array to the response
      userObj.teamNames = user.teams ? user.teams.map(team => team.name) : [];
      return userObj;
    }).filter(user => user !== null); // Filter out any null users

    res.json({ success: true, users: usersWithTeamNames });
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get all users for messaging (no role-based filtering, but filter locked accounts and by workspace)
export const getAllUsersForMessaging = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { isLocked: { $ne: true } };
    
    // Filter by workspace
    const workspaceId = toObjectId(currentUser?.workspace);
    if (workspaceId) {
      query.workspace = workspaceId;
    }
    
    // Filter out locked accounts - they shouldn't appear in messaging
    const users = await User.find(query).populate('teams', 'name').sort({ createdAt: -1 });

    const usersWithTeamNames = users.map((user) => {
      const userObj = user.toJSON();
      // Add team names array to the response
      userObj.teamNames = user.teams ? user.teams.map(team => team.name) : [];
      return userObj;
    }).filter(user => user !== null); // Filter out any null users

    res.json({ success: true, users: usersWithTeamNames });
  } catch (error) {
    console.error('Error in getAllUsersForMessaging:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = { role: 'staff' };
    
    // Filter by workspace
    const workspaceId = toObjectId(currentUser?.workspace);
    if (workspaceId) {
      query.workspace = workspaceId;
    }
    
    // Manager can only see employees in their department
    if (currentUser && currentUser.role === 'manager') {
      query.department = currentUser.department || '';
    }
    // Admin can see all staff in their workspace
    
    const employees = await User.find(query)
      .populate('teams', 'name')
      .sort({ createdAt: -1 });

    const employeesWithTeamNames = employees.map((employee) => {
      const employeeObj = employee.toJSON();
      // Add team names array to the response
      employeeObj.teamNames = employee.teams ? employee.teams.map(team => team.name) : [];
      return employeeObj;
    });

    res.json({ success: true, employees: employeesWithTeamNames });
  } catch (error) {
    console.error('Error in getAllEmployees:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getEmployeeById = async (req, res) => {
  const { id } = req.params;

  try {
    const employee = await User.findById(id).populate('teams', 'name');
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    const employeeObj = employee.toJSON();
    // Add team names array to the response
    employeeObj.teamNames = employee.teams ? employee.teams.map(team => team.name) : [];

    res.json({ success: true, employee: employeeObj });
  } catch (error) {
    console.error('Error in getEmployeeById:', error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteEmployeeById = async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  try {
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Only admin can delete employees
    if (currentUser && currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can delete employees.' });
    }

    // Remove employee from all teams they belong to
    if (employee.teams && employee.teams.length > 0) {
      for (const teamId of employee.teams) {
        const team = await Team.findById(teamId);
        if (team) {
          team.members = team.members.filter(memberId => !memberId.equals(employee._id));
          await team.save();
        }
      }
    }

    await User.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteEmployeeById:', error);
    res.status(500).json({ error: error.message });
  }
};

export const updateEmployeeById = async (req, res) => {
  const { id } = req.params;
  const { name, email, phoneNumber, department, role, faceUrl, teams, password } = req.body || {};
  const currentUser = req.user;

  try {
    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Manager can only update employees in their department
    if (currentUser && currentUser.role === 'manager') {
      if (employee.department !== currentUser.department) {
        return res.status(403).json({ error: 'You can only update employees in your own department.' });
      }
      // Manager cannot change role to admin or manager
      if (role && role !== 'staff' && role !== employee.role) {
        return res.status(403).json({ error: 'You can only set employees to staff role.' });
      }
      // Manager cannot change department
      if (department && department !== currentUser.department) {
        return res.status(403).json({ error: 'You cannot change employee department.' });
      }
    }

    const previousEmail = employee.email;
    const incomingEmail = email ? normalizeEmail(email) : employee.email;

    if (incomingEmail !== employee.email) {
      const emailExists = await User.exists({ email: incomingEmail, _id: { $ne: id } });
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'This email is already in use by another account.',
        });
      }
      employee.email = incomingEmail;
      employee.isVerified = false;
    }

    if (typeof name === 'string') employee.name = name;
    if (typeof phoneNumber === 'string') employee.phoneNumber = phoneNumber;
    if (typeof department === 'string') employee.department = department;
    if (typeof role === 'string') employee.role = role;
    if (faceUrl) employee.faceUrl = faceUrl;

    // Only admin can set password
    if (password && currentUser && currentUser.role === 'admin') {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          error: 'Password does not meet requirements.',
          details: passwordValidation.errors 
        });
      }
      employee.password = await hashPassword(password);
      employee.passwordChangedAt = new Date();
    }

    // Handle teams update
    if (Array.isArray(teams)) {
      const oldTeamIds = employee.teams || [];
      const newTeamNames = teams.filter(team => team && team.trim() !== '');

      // Find new team IDs
      const newTeamIds = [];
      for (const teamName of newTeamNames) {
        const foundTeam = await Team.findOne({ name: teamName.trim() });
        if (foundTeam) {
          newTeamIds.push(foundTeam._id);
        }
      }

      // Remove from old teams that are not in new teams
      for (const oldTeamId of oldTeamIds) {
        if (!newTeamIds.some(newId => newId.equals(oldTeamId))) {
          const oldTeam = await Team.findById(oldTeamId);
          if (oldTeam) {
            oldTeam.members = oldTeam.members.filter(memberId => !memberId.equals(employee._id));
            await oldTeam.save();
          }
        }
      }

      // Add to new teams that are not in old teams
      for (const newTeamId of newTeamIds) {
        if (!oldTeamIds.some(oldId => oldId.equals(newTeamId))) {
          const newTeam = await Team.findById(newTeamId);
          if (newTeam && !newTeam.members.includes(employee._id)) {
            newTeam.members.push(employee._id);
            await newTeam.save();
          }
        }
      }

      employee.teams = newTeamIds;
    }

    await employee.save();

    // Populate teams information before returning
    const updatedEmployee = await User.findById(employee._id).populate('teams', 'name');

    if (incomingEmail !== previousEmail) {
      try {
        await transporter.sendMail(
          mailOptions(
            employee.email,
            'Email Verification Required',
            `
              <h2>Hello ${employee.name || ''},</h2>
              <p>You have updated your email address in our Real-Time Employee Task Management Tool.</p>
              <p>Please verify your new email address by clicking the link below:</p>
              <p><a href="${CLIENT_LOGIN_URL}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
              <p>If you did not make this change, please contact your administrator immediately.</p>
            `
          )
        );
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
    }

    // Add team names array to the response
    const employeeObj = updatedEmployee.toJSON();
    employeeObj.teamNames = updatedEmployee.teams ? updatedEmployee.teams.map(team => team.name) : [];

    res.json({
      success: true,
      employee: employeeObj
    });
  } catch (error) {
    console.error('Error in updateEmployeeById:', error);
    res.status(500).json({ error: error.message });
  }
};

export const uploadEmployeeFace = async (req, res) => {
  const { id } = req.params;
  const { imageData, album } = req.body || {};

  if (!imageData) {
    return res.status(400).json({ success: false, error: 'No imageData provided' });
  }

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (!isImageKitConfigured || !imagekit) {
      return res.status(500).json({
        success: false,
        error: 'ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, and IMAGEKIT_URL_ENDPOINT in the backend environment.',
      });
    }

    let folder = album || IMAGEKIT_FACE_FOLDER || '/';
    if (!folder.startsWith('/')) {
      folder = `/${folder}`;
    }
    folder = folder.replace(/\/+/g, '/');

    let payload = imageData;
    if (!payload.startsWith('data:')) {
      payload = `data:image/jpeg;base64,${payload}`;
    }

    // Đặt tên file theo tên nhân viên (slug) (không cần timestamp)
    const normalizeNameForFile = (val, fallback = 'employee') => {
      if (!val) return fallback;
      const safe = String(val)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
      return safe || fallback;
    };

    const employeeName = user.name || user.fullName || user.email || `employee-${id}`;
    const fileName = `${normalizeNameForFile(employeeName)}.jpg`;

    let imageUrl = null;
    let uploadedToImageKit = false;

    try {
      const uploadResponse = await imagekit.upload({
        file: payload,
        fileName,
        folder,
        useUniqueFileName: false,
        overwriteFile: true,
      });

      imageUrl = uploadResponse?.url || null;
      uploadedToImageKit = Boolean(uploadResponse?.url);
    } catch (uploadError) {
      console.error('ImageKit upload error:', uploadError);
      return res.status(502).json({
        success: false,
        error: 'ImageKit upload failed',
        detail: uploadError.message,
      });
    }

    if (!imageUrl) {
      return res.status(500).json({ success: false, error: 'ImageKit upload did not return a URL.' });
    }

    user.faceUrl = imageUrl;
    await user.save();

    res.json({ success: true, imageUrl, uploadedToImageKit });
  } catch (error) {
    console.error('uploadEmployeeFace error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Admin: Reset employee password to default
export const resetEmployeePassword = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Only admin can reset passwords
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can reset passwords.' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Generate default password
    const defaultPassword = generateDefaultPassword();
    const hashedPassword = await hashPassword(defaultPassword);

    // Update password
    employee.password = hashedPassword;
    employee.passwordChangedAt = null; // Reset to indicate default password
    await employee.save();

    // Send email with default password
    const emailSubject = 'Your Account Password Has Been Reset';
    const emailContent = `
      <h2>Password Reset</h2>
      <p>Your password has been reset by an administrator.</p>
      <p>Your new default password is: <strong>${defaultPassword}</strong></p>
      <p>Please change your password after logging in for security.</p>
      <p><a href="${CLIENT_LOGIN_URL}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">Login</a></p>
    `;

    try {
      await transporter.sendMail(mailOptions(employee.email, emailSubject, emailContent));
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Still return success but log the error
    }

    res.json({ 
      success: true, 
      message: 'Password reset successfully. Default password sent to employee email.',
      defaultPassword // Return for admin to see (optional, can be removed for security)
    });
  } catch (error) {
    console.error('Error in resetEmployeePassword:', error);
    res.status(500).json({ error: error.message });
  }
};

// Admin: Lock/Unlock employee account
export const toggleEmployeeLock = async (req, res) => {
  try {
    const { id } = req.params;
    const currentUser = req.user;

    // Only admin can lock/unlock accounts
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Only admin can lock/unlock accounts.' });
    }

    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
    }

    // Cannot lock admin account
    if (employee.role === 'admin') {
      return res.status(403).json({ error: 'Cannot lock admin account.' });
    }

    // Toggle lock status
    employee.isLocked = !employee.isLocked;
    await employee.save();

    res.json({ 
      success: true, 
      message: employee.isLocked ? 'Account locked successfully.' : 'Account unlocked successfully.',
      employee: employee.toJSON()
    });
  } catch (error) {
    console.error('Error in toggleEmployeeLock:', error);
    res.status(500).json({ error: error.message });
  }
};
