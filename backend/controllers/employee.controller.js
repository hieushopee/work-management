import { User } from '../models/user.model.js';
import { Team } from '../models/team.model.js';
import { imagekit, isImageKitConfigured } from '../config/imagekit.js';
import { IMAGEKIT_FACE_FOLDER } from '../config/env.js';
import { transporter } from '../config/nodemailer.js';
import { mailOptions } from '../utils/mailOptions.js';
import { CLIENT_LOGIN_URL, MY_EMAIL } from '../config/env.js';

const normalizeEmail = (value = '') => value.trim().toLowerCase();

export const createEmployee = async (req, res) => {
  const { name, email, phoneNumber, department, role, faceUrl, teams } = req.body || {};
  const createdBy = req.user?.id || null;

  if (!email) {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const normalizedEmail = normalizeEmail(email);
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists.' });
    }

    const employee = await User.create({
      createdBy,
      name: name || '',
      email: normalizedEmail,
      phoneNumber: phoneNumber || '',
      role: role || 'employee',
      department: department || '',
      faceUrl: faceUrl || null,
      teams: [],
      isVerified: false,
    });

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
    console.error('Error in createEmployee:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllUsers = async (_req, res) => {
  try {
    const users = await User.find().populate('teams', 'name').sort({ createdAt: -1 });

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

export const getAllEmployees = async (_req, res) => {
  try {
    const employees = await User.find({ role: 'employee' })
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

  try {
    const employee = await User.findById(id);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
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
  const { name, email, phoneNumber, department, role, faceUrl, teams } = req.body || {};

  try {
    const employee = await User.findById(id);

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found.' });
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

    let imageUrl = null;
    let uploadedToImageKit = false;

    try {
      const uploadResponse = await imagekit.upload({
        file: payload,
        fileName: `employee-${id}-${Date.now()}.jpg`,
        folder,
        useUniqueFileName: true,
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