import jwt from 'jsonwebtoken';
import { transporter } from '../config/nodemailer.js';
import { mailOptions } from '../utils/mailOptions.js';
import { generateTokens } from '../utils/handleTokens.js';
import {
  ACCESS_TOKEN_SECRET,
  CLIENT_LOGIN_URL,
  NODE_ENV,
  REFRESH_TOKEN_SECRET,
} from '../config/env.js';
import { User } from '../models/user.model.js';
import { Workspace } from '../models/workspace.model.js';
import { hashPassword, comparePassword, validatePassword } from '../utils/passwordUtils.js';
import { toObjectId } from '../utils/identifiers.js';

const normalizeEmail = (value = '') => value.trim().toLowerCase();
const normalizeAvatarData = (value = '') => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith('data:image')) {
    console.warn('Avatar update received non data-url input; storing as provided string.');
  }

  return trimmed;
};

const uploadAvatarImage = async (imageData) => normalizeAvatarData(imageData);

const createAccessCode = () => Math.floor(100000 + Math.random() * 900000).toString();

export const createNewAccessCode = async (req, res) => {
  const rawEmail = req.body?.email;
  const workspaceId = req.body?.workspaceId; // Workspace ID from frontend
  if (!rawEmail) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const email = normalizeEmail(rawEmail);

  try {
    const accessCode = createAccessCode();
    
    // Check if workspace exists
    let workspace = null;
    if (workspaceId) {
      workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        return res.status(404).json({ error: 'Workspace not found.' });
      }
    } else {
      // If no workspace provided, check if any workspace exists
      workspace = await Workspace.findOne({ isActive: true });
      if (!workspace) {
        return res.status(400).json({ error: 'No workspace found. Please create a workspace first.' });
      }
    }

    // Check if user exists in this workspace
    const existingUser = await User.findOne({ email, workspace: workspace._id });
    const userCount = await User.countDocuments({ workspace: workspace._id });

    let user;
    let isNewUser = false;

    if (userCount === 0) {
      // First user in workspace becomes admin
      user = await User.create({
        email,
        accessCode,
        role: 'admin',
        name: 'Admin',
        isVerified: false,
        workspace: workspace._id,
      });
      
      // Update workspace admin
      workspace.admin = user._id;
      await workspace.save();
      
      isNewUser = true;
      console.log(`The first user has been created as admin: ${email} in workspace: ${workspace.name}`);
    } else if (existingUser) {
      // Existing user in workspace
      user = existingUser;
      user.accessCode = accessCode;
      await user.save();
      console.log(`Login attempt for existing user: ${email} in workspace: ${workspace.name}`);
    } else {
      // User exists but not in this workspace
      return res.status(404).json({
        error: 'This email is not registered in this workspace. Only existing users can log in.',
      });
    }

    const emailSubject = isNewUser
      ? 'Welcome! Your Access Code - Real-Time Employee Task Management Tool'
      : 'Your Login Access Code - Real-Time Employee Task Management Tool';

    const emailContent = isNewUser
      ? `
        <h2>Welcome to Task Management!</h2>
        <p>Your account has been created successfully.</p>
        <p>Your 6-digit access code is: <strong>${accessCode}</strong></p>
        <p>Use this code to complete your registration.</p>
      `
      : `
        <h2>Your Login Access Code</h2>
        <p>Your 6-digit access code is: <strong>${accessCode}</strong></p>
        <p>Use this code to log in to your account.</p>
      `;

    await transporter.sendMail(mailOptions(email, emailSubject, emailContent));

    res.json({ success: true });
  } catch (error) {
    console.error('Error in createNewAccessCode:', error);
    res.status(500).json({ error: error.message });
  }
};

export const validateAccessCode = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const accessCode = req.body?.accessCode;

    if (!rawEmail || !accessCode) {
      return res.status(400).json({ error: 'Email and access code are required.' });
    }

    const email = normalizeEmail(rawEmail);
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.accessCode !== accessCode) {
      return res.status(400).json({ success: false, error: 'Invalid access code' });
    }

    user.accessCode = '';
    user.isVerified = true;
    await user.save();

    generateTokens(res, user.id);

    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error('Error in validateAccessCode:', error);
    res.status(500).json({ error: error.message });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      console.log('Refresh token not found in cookies:', {
        cookies: req.cookies,
        hasRefreshToken: !!req.cookies?.refreshToken,
      });
      return res.status(400).json({ error: 'Refresh token not found.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError.name, jwtError.message);
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Refresh token expired. Please log in again.' });
      }
      return res.status(401).json({ error: 'Invalid refresh token.' });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('User not found for refresh token:', decoded.userId);
      return res.status(401).json({ error: 'User not found.' });
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error in refreshAccessToken:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getProfile = async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    console.error('Error in getProfile:', error);
    res.status(500).json({ error: error.message });
  }
};

export const editProfile = async (req, res) => {

  const userId = req.user?.id;

  const { name, email, phoneNumber, department, role, avatar } = req.body || {};



  try {

    const user = await User.findById(userId);



    if (!user) {

      return res.status(404).json({ error: 'Employee not found.' });

    }



    const previousEmail = user.email;

    const previousAvatar = user.avatar;

    const incomingEmail = email ? normalizeEmail(email) : user.email;

    const emailChanged = incomingEmail !== user.email;



    if (emailChanged) {

      const emailExists = await User.exists({ email: incomingEmail, _id: { $ne: userId } });

      if (emailExists) {

        return res.status(400).json({

          success: false,

          error: 'This email is already in use by another account.',

        });

      }

      user.email = incomingEmail;

      user.isVerified = false;

    }



    if (typeof name === 'string') user.name = name;

    if (typeof phoneNumber === 'string') user.phoneNumber = phoneNumber;

    if (typeof department === 'string') user.department = department;

    if (typeof role === 'string') user.role = role;



    if (avatar !== undefined) {

      if (avatar === null || avatar === '' || avatar === 'null') {

        user.avatar = null;

      } else if (typeof avatar === 'string') {

        if (avatar.startsWith('data:image')) {

          user.avatar = await uploadAvatarImage(avatar);

        } else if (avatar != previousAvatar) {

          user.avatar = avatar;

        }

      }

    }



    await user.save();



    if (emailChanged) {

      try {

        await transporter.sendMail(

          mailOptions(

            user.email,

            'Email Verification Required',

            `

              <h2>Hello ${user.name || ''},</h2>

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



    const responseUser = user.toJSON();



    res.json({

      success: true,

      user: responseUser,

      message: emailChanged

        ? 'Profile updated successfully. Please verify your new email address.'

        : 'Profile updated successfully.',

    });

  } catch (error) {

    console.error('Error updating profile:', error);

    res.status(500).json({ error: error.message });

  }

};



export const logout = (req, res) => {
  try {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getCurrentUser = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    id,
    name,
    email,
    role,
    avatar,
    faceUrl,
    department,
    phoneNumber,
    isVerified,
    teamNames = [],
  } = req.user;
  res.json({
    id,
    name,
    email,
    role,
    avatar,
    faceUrl,
    department,
    phoneNumber,
    isVerified,
    teamNames,
  });
};

// Login with email and password
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const rawWorkspaceId = req.body?.workspaceId;
    const workspaceId = rawWorkspaceId ? toObjectId(rawWorkspaceId) : null;

    if (rawWorkspaceId && !workspaceId) {
      return res.status(400).json({ error: 'Invalid workspace ID.' });
    }
    
    // Find user in workspace
    let query = { email: normalizedEmail };
    if (workspaceId) {
      query.workspace = workspaceId;
    }
    const user = await User.findOne(query);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(403).json({ error: 'This account has been locked. Please contact administrator.' });
    }

    // Check if user has password set
    if (!user.password) {
      return res.status(400).json({ 
        error: 'Password not set. Please use access code login or contact admin to set password.' 
      });
    }

    // Compare password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Update isVerified if not already verified
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    generateTokens(res, user.id);

    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({ error: error.message });
  }
};

// Forgot password - send reset code
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      // Don't reveal if user exists for security
      return res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
    }

    // Generate 6-digit reset code
    const resetCode = createAccessCode();
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    // Send email with reset code
    const emailSubject = 'Password Reset Code - Real-Time Employee Task Management Tool';
    const emailContent = `
      <h2>Password Reset Request</h2>
      <p>You have requested to reset your password.</p>
      <p>Your 6-digit reset code is: <strong>${resetCode}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    await transporter.sendMail(mailOptions(normalizedEmail, emailSubject, emailContent));

    res.json({ success: true, message: 'If the email exists, a reset code has been sent.' });
  } catch (error) {
    console.error('Error in forgotPassword:', error);
    res.status(500).json({ error: error.message });
  }
};

// Verify reset code
export const verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return res.status(400).json({ error: 'Email and reset code are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== resetCode) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    if (!user.resetPasswordCodeExpires || user.resetPasswordCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    res.json({ success: true, message: 'Reset code verified successfully.' });
  } catch (error) {
    console.error('Error in verifyResetCode:', error);
    res.status(500).json({ error: error.message });
  }
};

// Reset password after verifying code
export const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.resetPasswordCode || user.resetPasswordCode !== resetCode) {
      return res.status(400).json({ error: 'Invalid reset code.' });
    }

    if (!user.resetPasswordCodeExpires || user.resetPasswordCodeExpires < new Date()) {
      return res.status(400).json({ error: 'Reset code has expired. Please request a new one.' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements.',
        details: passwordValidation.errors 
      });
    }

    // Hash and save new password
    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    user.resetPasswordCode = null;
    user.resetPasswordCodeExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    console.error('Error in resetPassword:', error);
    res.status(500).json({ error: error.message });
  }
};

// Register admin for workspace (public endpoint - only if workspace has no admin)
export const registerAdmin = async (req, res) => {
  try {
    const { workspaceId: rawWorkspaceId, email, password, name, phoneNumber } = req.body;

    if (!rawWorkspaceId || !email || !password) {
      return res.status(400).json({ error: 'Workspace ID, email, and password are required.' });
    }

    const workspaceId = toObjectId(rawWorkspaceId);
    if (!workspaceId) {
      return res.status(400).json({ error: 'Invalid workspace ID.' });
    }

    // Check if workspace exists
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }

    // Check if workspace already has admin
    if (workspace.admin) {
      return res.status(400).json({ error: 'This workspace already has an admin. Please log in instead.' });
    }

    // Check if email already exists in this workspace
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail, workspace: workspaceId });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered in this workspace.' });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements.',
        details: passwordValidation.errors 
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const adminUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      passwordChangedAt: new Date(),
      name: name || 'Admin',
      phoneNumber: phoneNumber || '',
      role: 'admin',
      isVerified: true,
      workspace: workspaceId,
    });

    // Update workspace admin
    workspace.admin = adminUser._id;
    await workspace.save();

    // Generate tokens and log in
    generateTokens(res, adminUser.id);

    res.json({ 
      success: true, 
      message: 'Admin account created successfully.',
      user: adminUser.toJSON() 
    });
  } catch (error) {
    console.error('Error in registerAdmin:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'This email is already registered.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Change password (requires current password)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (!user.password) {
      return res.status(400).json({ error: 'Password not set. Please use reset password function.' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    // Validate new password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: 'Password does not meet requirements.',
        details: passwordValidation.errors 
      });
    }

    // Hash and save new password
    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = new Date();
    await user.save();

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ error: error.message });
  }
};










