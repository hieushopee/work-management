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
  if (!rawEmail) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  const email = normalizeEmail(rawEmail);

  try {
    const accessCode = createAccessCode();
    const userCount = await User.countDocuments();

    let user;
    let isNewUser = false;

    if (userCount === 0) {
      user = await User.create({
        email,
        accessCode,
        role: 'owner',
        isVerified: false,
      });
      isNewUser = true;
      console.log(`The first user has been created: ${email}`);
    } else {
      user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          error: 'This email is not registered. Only existing users can log in.',
        });
      }
      user.accessCode = accessCode;
      await user.save();
      console.log(`Login attempt for existing user: ${email}`);
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
      return res.status(400).json({ error: 'Refresh token not found.' });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(400).json({ error: 'Unauthorized access.' });
    }

    const accessToken = jwt.sign({ userId: decoded.userId }, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
    });

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: 'strict',
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










