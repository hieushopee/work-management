import { Team } from '../models/team.model.js';
import { User } from '../models/user.model.js';
import { Conversation } from '../models/conversation.model.js';
import { toObjectId } from '../utils/identifiers.js';
import { ensureTeamConversation } from '../utils/conversation.js';
import { body, validationResult } from 'express-validator';

async function _populateTeam(team) {
  return await Team.findById(team._id)
    .populate('members', 'name email avatar')
    .populate('createdBy', 'name email');
}

export const validateTeam = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Team name is required')
    .isLength({ min: 3 })
    .withMessage('Team name must be at least 3 characters long'),
  body('description').trim(),
  body('department').trim(),
];

export async function getTeams(req, res) {
  try {
    const user = req.user;
    let query = {};
    
    // Manager can only see teams in their department
    if (user && user.role === 'manager') {
      const userDepartment = user.department || '';
      if (userDepartment) {
        query.department = userDepartment;
      }
    }
    // Admin can see all teams
    
    const teams = await Team.find(query)
      .populate('members', 'name email avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(teams);
  } catch (err) {
    console.error('❌ getTeams error:', err);
    res.status(500).json({ message: 'Error while fetching teams' });
  }
}

export async function createTeam(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    console.log('🔍 createTeam - req.body:', req.body);
    console.log('🔍 createTeam - req.user:', req.user);
    
    const { name, description, department } = req.body || {};
    const user = req.user;

    if (!user?.id) {
      console.log('❌ User authentication required');
      return res.status(400).json({ message: 'User authentication required' });
    }

    // Manager can only create teams in their department
    if (user.role === 'manager') {
      const userDepartment = user.department || '';
      if (department && department.trim() !== userDepartment) {
        return res.status(403).json({ message: 'You can only create teams in your own department' });
      }
      // If no department specified, use manager's department
      if (!department || !department.trim()) {
        req.body.department = userDepartment;
      }
    }

    // Check if team name already exists
    const existingTeam = await Team.findOne({ name: name.trim() });
    if (existingTeam) {
      console.log('❌ Team name already exists:', existingTeam);
      return res.status(400).json({ message: 'Team name already exists' });
    }

    console.log('✅ Creating team with data:', {
      name: name.trim(),
      description: description?.trim() || '',
      department: department?.trim() || '',
      members: [],
      createdBy: toObjectId(user.id) || user.id
    });

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim() || '',
      department: department?.trim() || '',
      members: [],
      createdBy: toObjectId(user.id) || user.id
    });

    console.log('✅ Team created successfully:', team);

    const populatedTeam = await _populateTeam(team);

    console.log('✅ Populated team:', populatedTeam);
      // Ensure a group conversation exists for this team so it appears in Messages
      try {
        await ensureTeamConversation(populatedTeam);
      } catch (err) {
        console.error('Error ensuring team conversation after create:', err);
      }

      res.status(201).json(populatedTeam);
  } catch (err) {
    console.error('❌ createTeam error:', err);
    res.status(500).json({ message: 'Error while creating team' });
  }
}

export async function updateTeam(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { id } = req.params;
    const { name, description, department } = req.body || {};
    const user = req.user;

    if (!user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Manager can only update teams in their department
    if (user.role === 'manager') {
      const userDepartment = user.department || '';
      if (team.department !== userDepartment) {
        return res.status(403).json({ message: 'You can only update teams in your own department' });
      }
      // Manager cannot change department
      if (department && department.trim() !== userDepartment) {
        return res.status(403).json({ message: 'You cannot change the team department' });
      }
    } else if (user.role !== 'admin') {
      // For non-admin, non-manager users, check if they created the team
      if (team.createdBy.toString() !== user.id) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to update this team' });
      }
    }

    if (name && name.trim()) {
      team.name = name.trim();
    }

    if (description !== undefined) {
      team.description = description?.trim() || '';
    }

    if (department !== undefined) {
      team.department = department?.trim() || '';
    }

    await team.save();

    const populatedTeam = await _populateTeam(team);
      // Keep team conversation in sync when team is updated (name/department changes)
      try {
        await ensureTeamConversation(populatedTeam);
      } catch (err) {
        console.error('Error ensuring team conversation after update:', err);
      }

      res.json(populatedTeam);
  } catch (err) {
    console.error('❌ updateTeam error:', err);
    res.status(500).json({ message: 'Error while updating team' });
  }
}

export async function deleteTeam(req, res) {
  try {
    const { id } = req.params;
    const user = req.user;

    if (!user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    // Manager can only delete teams in their department
    if (user.role === 'manager') {
      const userDepartment = user.department || '';
      if (team.department !== userDepartment) {
        return res.status(403).json({ message: 'You can only delete teams in your own department' });
      }
    } else if (user.role !== 'admin') {
      // For non-admin, non-manager users, check if they created the team
      if (team.createdBy.toString() !== user.id) {
        return res
          .status(403)
          .json({ message: 'You are not authorized to delete this team' });
      }
    }
    // Admin can delete any team

    // Remove team reference from all users
    await User.updateMany(
      { teams: toObjectId(id) },
      { $pull: { teams: toObjectId(id) } }
    );

    await Team.findByIdAndDelete(id);

      // Remove associated conversation for this team if exists
      try {
        const conversationId = `team:${id}`;
        await Conversation.deleteOne({ conversationId });
      } catch (err) {
        console.error('Error deleting team conversation:', err);
      }

    res.status(204).end();
  } catch (err) {
    console.error('❌ deleteTeam error:', err);
    res.status(500).json({ message: 'Error while deleting team' });
  }
}

export async function addMemberToTeam(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    const authUser = req.user;

    if (!authUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.createdBy.toString() !== authUser.id) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to add members to this team' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already in the team
    if (team.members.some(member => member.equals(toObjectId(userId)))) {
      return res.status(400).json({ message: 'User is already in this team' });
    }

    // Add user to team
    team.members.push(toObjectId(userId));
    await team.save();

    // Update user's teams reference
    if (!user.teams.includes(team._id)) {
      user.teams.push(team._id);
      await user.save();
    }

    const populatedTeam = await _populateTeam(team);

      // Ensure conversation contains the new member
      try {
        await ensureTeamConversation(populatedTeam);
      } catch (err) {
        console.error('Error ensuring team conversation after addMember:', err);
      }

    res.json(populatedTeam);
  } catch (err) {
    console.error('❌ addMemberToTeam error:', err);
    res.status(500).json({ message: 'Error while adding member to team' });
  }
}

export async function removeMemberFromTeam(req, res) {
  try {
    const { id } = req.params;
    const { userId } = req.body || {};
    const authUser = req.user;

    if (!authUser?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const team = await Team.findById(id);
    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    if (team.createdBy.toString() !== authUser.id) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to remove members from this team' });
    }

    // Remove user from team
    team.members = team.members.filter(
      memberId => memberId.toString() !== toObjectId(userId).toString()
    );
    await team.save();

    // Remove team reference from user
    await User.findByIdAndUpdate(userId, { $pull: { teams: team._id } });

    const populatedTeam = await _populateTeam(team);

      // Update conversation to remove the member
      try {
        await ensureTeamConversation(populatedTeam);
      } catch (err) {
        console.error('Error ensuring team conversation after removeMember:', err);
      }

    res.json(populatedTeam);
  } catch (err) {
    console.error('❌ removeMemberFromTeam error:', err);
    res.status(500).json({ message: 'Error while removing member from team' });
  }
}
