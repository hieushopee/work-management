import { User } from '../models/user.model.js';
import { Conversation } from '../models/conversation.model.js';
import { Team } from '../models/team.model.js';
import { normalizeId, toObjectId } from './identifiers.js';

export const toMemberIds = (members = []) =>
  Array.isArray(members)
    ? members
        .map((member) => {
          if (!member) return null;
          if (typeof member === 'string') return normalizeId(member);
          if (member._id) return normalizeId(member._id);
          if (member.id) return normalizeId(member.id);
          return null;
        })
        .filter(Boolean)
    : [];

export const ensureTeamConversation = async (team) => {
  if (!team || !team._id) return null;

  const teamId = normalizeId(team._id);
  const conversationId = `team:${teamId}`;

  const memberIds = toMemberIds(team.members);
  const creatorId = normalizeId(team.createdBy?._id || team.createdBy?.id || team.createdBy);

  if (creatorId && !memberIds.includes(creatorId)) {
    memberIds.push(creatorId);
  }

  const memberObjectIds = memberIds
    .map((id) => toObjectId(id) || null)
    .filter(Boolean);

  const participantObjectIds = memberIds
    .map((id) => toObjectId(id) || null)
    .filter(Boolean);

  const userDocs = memberObjectIds.length
    ? await User.find({ _id: { $in: memberObjectIds } })
        .select('name avatar role')
        .lean()
    : [];

  const participantDetails = userDocs.map((user) => ({
    userId: user._id,
    name: user.name || '',
    role: user.role || '',
    avatar: user.avatar || null,
  }));

  let conversation = await Conversation.findOne({ conversationId });

  if (conversation) {
    conversation.groupName = team.name || conversation.groupName || '';
    conversation.groupMembers = memberIds;
    conversation.participants = participantObjectIds;
    conversation.participantDetails = participantDetails;
    await conversation.save();
    return conversation.toObject();
  }

  conversation = await Conversation.create({
    conversationId,
    groupName: team.name || `Team ${teamId}`,
    groupAvatar: null,
    groupMembers: memberIds,
    participants: participantObjectIds,
    participantDetails,
    participantStates: participantDetails.map((detail) => ({
      userId: detail.userId,
      lastReadAt: null,
    })),
    messages: [],
  });

  return conversation.toObject();
};
