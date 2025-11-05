import mongoose from 'mongoose';
import { Router } from 'express';
import { Conversation } from '../models/conversation.model.js';
import { Team } from '../models/team.model.js';
import { User } from '../models/user.model.js';
import { buildConversationId, normalizeId, toObjectId } from '../utils/identifiers.js';
import { ensureTeamConversation, toMemberIds } from '../utils/conversation.js';

const { Types } = mongoose;

const router = Router();
const ensureParticipantName = async (conversation, userId) => {
  if (!conversation) return '';
  const normalizedId = normalizeId(userId);
  if (!normalizedId) return '';

  const detail = conversation.participantDetails?.find(
    (item) => normalizeId(item.userId) === normalizedId
  );
  if (detail?.name) return detail.name;

  try {
    const user = await User.findById(userId).select('name email').lean();
    return user?.name || user?.email || '';
  } catch (_error) {
    return '';
  }
};

const serializeAttachments = (attachments = []) =>
  Array.isArray(attachments)
    ? attachments.map((attachment) => ({
        id: attachment?._id?.toString?.(),
        kind:
          attachment?.kind ??
          (attachment?.mimeType?.startsWith('image/') ? 'image' : 'file'),
        url: attachment?.url ?? null,
        fileId: attachment?.fileId ?? null,
        name: attachment?.name ?? '',
        mimeType: attachment?.mimeType ?? '',
        size: attachment?.size ?? null,
        width: attachment?.width ?? null,
        height: attachment?.height ?? null,
        thumbnailUrl: attachment?.thumbnailUrl ?? null,
      }))
    : [];

const serializeMessages = (messages = [], limit, lastReadMap = new Map()) => {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const limited = Number.isFinite(limit) && limit > 0 ? sorted.slice(-limit) : sorted;

  return limited.map((message) => {
    const senderId = normalizeId(message?.senderId);
    const receiverId = normalizeId(message?.receiverId);
    const timestampDate = message?.timestamp ? new Date(message.timestamp) : null;
    const receiverLastRead = receiverId ? lastReadMap.get(receiverId) : null;

    const seenByReceiver = Boolean(
      receiverLastRead && timestampDate && receiverLastRead.getTime() >= timestampDate.getTime()
    );

    const serializedAttachments = serializeAttachments(message?.attachments);
    const hasImageAttachment = serializedAttachments.some((attachment) => attachment.kind === 'image');
    const hasFileAttachment = serializedAttachments.some((attachment) => attachment.kind !== 'image');
    const fallbackType = serializedAttachments.length
      ? hasImageAttachment && hasFileAttachment
        ? 'mixed'
        : hasFileAttachment
        ? 'file'
        : 'image'
      : 'text';

    return {
      id: message?._id?.toString?.(),
      senderId,
      receiverId,
      senderName: message?.senderName ?? '',
      receiverName: message?.receiverName ?? '',
      message: message?.message ?? '',
      messageType: message?.messageType ?? fallbackType,
      attachments: serializedAttachments,
      seenByReceiver,
      timestamp: timestampDate ? timestampDate.toISOString() : message?.timestamp ?? null,
      isGroup: Boolean(message?.isGroup),
      groupMembers: Array.isArray(message?.groupMembers) ? message.groupMembers : [],
    };
  });
};

const computeUnreadForConversation = (conversation, userId) => {
  if (!conversation) return { unreadCount: 0, lastReadAt: null };

  const normalizedId = normalizeId(userId);
  const state = conversation.participantStates?.find(
    (item) => normalizeId(item.userId) === normalizedId
  );

  const lastReadAt = state?.lastReadAt ? new Date(state.lastReadAt) : null;

  const unreadCount = (conversation.messages || []).reduce((count, msg) => {
    const messageReceiver = normalizeId(msg.receiverId);
    if (messageReceiver !== normalizedId) return count;

    const messageTime = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
    if (!lastReadAt || messageTime > lastReadAt) {
      return count + 1;
    }
    return count;
  }, 0);

  return { unreadCount, lastReadAt };
};





const normalizeMemberValue = (member) => {
  if (!member) return null;
  if (typeof member === 'string') {
    return normalizeId(member);
  }
  if (typeof member === 'object') {
    const id = member.id || member._id;
    if (id) return normalizeId(id);
  }
  return normalizeId(member); // fallback for other types with toString()
};

router.post('/groups', async (req, res) => {
  try {
    const { name, memberIds, members, avatar, creatorId: providedCreatorId } = req.body || {};

    const creatorId = normalizeMemberValue(req.user?.id || providedCreatorId);

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required.' });
    }

    const sources = [];
    if (Array.isArray(memberIds)) sources.push(...memberIds);
    if (Array.isArray(members)) sources.push(...members);

    const collected = new Set();
    sources.forEach((entry) => {
      const normalized = normalizeMemberValue(entry);
      if (normalized) collected.add(normalized);
    });

    if (creatorId) {
      collected.add(creatorId);
    }

    const normalizedMembers = Array.from(collected).sort();
    if (normalizedMembers.length < 2) {
      return res.status(400).json({ error: 'Group chat must include at least two members.' });
    }

    const memberObjectIds = normalizedMembers
      .map((id) => toObjectId(id))
      .filter(Boolean);

    if (memberObjectIds.length < 2) {
      return res.status(400).json({ error: 'Invalid group members.' });
    }

    const userDocs = await User.find({ _id: { $in: memberObjectIds } })
      .select('name avatar role')
      .lean();

    const userDocMap = new Map(userDocs.map((doc) => [normalizeId(doc._id), doc]));

    const participantDetails = normalizedMembers
      .map((id) => {
        const doc = userDocMap.get(id);
        if (!doc) return null;
        return {
          userId: doc._id,
          name: doc.name || '',
          role: doc.role || '',
          avatar: doc.avatar || null,
        };
      })
      .filter(Boolean);

    if (participantDetails.length < 2) {
      return res.status(400).json({ error: 'Unable to resolve group members.' });
    }

    if (participantDetails.length !== normalizedMembers.length) {
      return res.status(400).json({ error: 'One or more members do not exist.' });
    }

    const finalMemberIds = participantDetails
      .map((detail) => normalizeId(detail.userId))
      .filter(Boolean)
      .sort();

    const existingTeamConversation = await Conversation.findOne({
      conversationId: { $regex: '^team:' },
      groupMembers: { $all: finalMemberIds },
      $expr: { $eq: [{ $size: '$groupMembers' }, finalMemberIds.length] },
    }).select('_id conversationId groupMembers groupName');

    if (existingTeamConversation) {
      let isExactTeamConflict = false;
      let teamConflictName = existingTeamConversation.groupName || null;
      let teamConflictId = null;
      const conversationId = existingTeamConversation.conversationId || '';
      if (typeof conversationId === 'string' && conversationId.startsWith('team:')) {
        const teamIdStr = conversationId.slice(5);
        const teamObjectId = toObjectId(teamIdStr);
        if (teamObjectId) {
          const teamDoc = await Team.findById(teamObjectId)
            .select('name members createdBy')
            .lean();
          if (teamDoc) {
            const teamMemberIds = new Set(
              toMemberIds([
                ...(teamDoc.members || []),
                teamDoc.createdBy,
              ])
            );
            const hasExactMatch =
              teamMemberIds.size === finalMemberIds.length &&
              finalMemberIds.every((id) => teamMemberIds.has(id));
            if (hasExactMatch) {
              isExactTeamConflict = true;
              teamConflictName = teamDoc.name || teamConflictName;
              teamConflictId = teamDoc._id;
            }
          }
        }
      }

      if (isExactTeamConflict) {
        console.warn('Group creation blocked (team conflict)', {
          members: finalMemberIds,
          teamName: teamConflictName,
          teamId: teamConflictId ? teamConflictId.toString() : null,
        });
        return res.status(409).json({
          error: 'Selected members already share a team conversation. Please choose different members.',
          conflictType: 'team',
          teamName: teamConflictName || null,
          teamId: teamConflictId ? teamConflictId.toString() : null,
          members: finalMemberIds,
        });
      }
    }

    const possibleDuplicates = await Conversation.find({
      conversationId: { $not: { $regex: '^team:' } },
      groupMembers: { $all: finalMemberIds },
      $expr: { $eq: [{ $size: '$groupMembers' }, finalMemberIds.length] },
    })
      .select('groupMembers')
      .lean();

    const duplicate = possibleDuplicates.some((conv) => {
      const existing = Array.isArray(conv.groupMembers)
        ? conv.groupMembers.map((value) => normalizeId(value)).filter(Boolean).sort()
        : [];
      if (existing.length !== finalMemberIds.length) return false;
      return existing.every((id, index) => id === finalMemberIds[index]);
    });

    if (duplicate) {
      console.warn('Group creation blocked (duplicate group conversation)', {
        members: finalMemberIds,
      });
      return res
        .status(409)
        .json({
          error: 'A group chat with the same members already exists.',
          conflictType: 'duplicate-group',
          members: finalMemberIds,
        });
    }

    const conversationId = `group:${new Types.ObjectId().toString()}`;
    const participantStates = participantDetails.map((detail) => ({
      userId: detail.userId,
      lastReadAt: null,
    }));

    const conversation = await Conversation.create({
      conversationId,
      groupName: name.trim(),
      groupAvatar: typeof avatar === 'string' && avatar.trim() ? avatar.trim() : null,
      groupMembers: finalMemberIds,
      participants: participantDetails.map((detail) => detail.userId),
      participantDetails,
      participantStates,
      messages: [],
      lastMessageAt: new Date(),
    });

    const createdConversation = await Conversation.findById(conversation._id).lean();
    return res.status(201).json(createdConversation);
  } catch (error) {
    console.error('Error creating group conversation:', error);
    return res.status(500).json({ error: error.message });
  }
});

router.get('/history/:userId1/:userId2', async (req, res) => {
  const { userId1, userId2 } = req.params;
  const limit = Number.parseInt(req.query?.limit, 10) || 100;

  try {
    const conversationId = normalizeId(req.query?.conversationId) || buildConversationId(userId1, userId2);
    const conversation = await Conversation.findOne({ conversationId }).lean();

    if (!conversation) {
      return res.json([]);
    }

    const lastReadMap = new Map();
    (conversation.participantStates || []).forEach((state) => {
      const id = normalizeId(state.userId);
      if (!id || !state.lastReadAt) return;
      lastReadMap.set(id, new Date(state.lastReadAt));
    });

    return res.json(serializeMessages(conversation.messages, limit, lastReadMap));
  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/conversations/:userId', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = normalizeId(userId);
  const currentObjectId = toObjectId(userId);

  try {
    const matchConditions = [];
    if (currentObjectId) {
      matchConditions.push({ participants: currentObjectId });
    }
    if (currentUserId) {
      matchConditions.push({ participants: userId });
      matchConditions.push({ groupMembers: currentUserId });
    }

    const baseConversations = await Conversation.find(
      matchConditions.length ? { $or: matchConditions } : {}
    )
      .sort({ lastMessageAt: -1 })
      .lean()
      .exec();

    const conversationMap = new Map(
      baseConversations.map((conv) => [normalizeId(conv.conversationId), conv])
    );

    const teamMatch = [];
    if (currentObjectId) {
      teamMatch.push({ members: currentObjectId });
      teamMatch.push({ createdBy: currentObjectId });
    }
    if (currentUserId) {
      teamMatch.push({ members: currentUserId });
      teamMatch.push({ createdBy: currentUserId });
    }

    if (teamMatch.length) {
      const teams = await Team.find({ $or: teamMatch })
        .populate('members', 'name avatar role')
        .populate('createdBy', 'name avatar role')
        .lean();

      for (const team of teams) {
        try {
          const ensured = await ensureTeamConversation(team);
          if (!ensured) continue;
          const key = normalizeId(ensured.conversationId);
          if (!conversationMap.has(key)) {
            conversationMap.set(key, ensured);
          } else {
            conversationMap.set(key, {
              ...conversationMap.get(key),
              ...ensured,
            });
          }
        } catch (teamErr) {
          console.error('ensureTeamConversation failed in conversations route:', teamErr);
        }
      }
    }

    const conversations = Array.from(conversationMap.values()).sort((a, b) => {
      const left = a.lastMessageAt || a.updatedAt || a.createdAt;
      const right = b.lastMessageAt || b.updatedAt || b.createdAt;
      return new Date(right || 0) - new Date(left || 0);
    });

    const items = [];

    for (const conversation of conversations) {
      const messages = Array.isArray(conversation.messages) ? conversation.messages : [];
      const lastMessage = messages[messages.length - 1] || null;

      const participantDetails = Array.isArray(conversation.participantDetails)
        ? conversation.participantDetails
        : [];

      const currentParticipantDetail = participantDetails.find(
        (detail) => normalizeId(detail.userId) === currentUserId
      );
      const partnerDetail = participantDetails.find(
        (detail) => normalizeId(detail.userId) !== currentUserId
      );

      const isGroup = Boolean(conversation.groupName);
      const partnerId = isGroup
        ? conversation.conversationId
        : partnerDetail
        ? normalizeId(partnerDetail.userId)
        : null;

      const { unreadCount } = computeUnreadForConversation(conversation, userId);

      const serializedAttachments = serializeAttachments(lastMessage?.attachments);
      const attachmentsCount = serializedAttachments.length;
      const hasImageAttachment = serializedAttachments.some((attachment) => attachment.kind === 'image');
      const hasFileAttachment = serializedAttachments.some((attachment) => attachment.kind !== 'image');
      let preview = lastMessage?.message?.trim?.() || '';
      if (!preview && attachmentsCount) {
        if (!hasImageAttachment && hasFileAttachment) {
          preview = attachmentsCount > 1 ? 'Shared files' : 'Shared a file';
        } else if (hasImageAttachment && hasFileAttachment) {
          preview = 'Shared attachments';
        } else {
          preview = attachmentsCount > 1 ? 'Shared photos' : 'Shared a photo';
        }
      }

      const fallbackType = attachmentsCount
        ? hasImageAttachment && hasFileAttachment
          ? 'mixed'
          : hasFileAttachment
          ? 'file'
          : 'image'
        : 'text';

      const partnerName = isGroup
        ? conversation.groupName || lastMessage?.senderName || 'Group chat'
        : partnerDetail?.name || lastMessage?.senderName || 'Unknown member';
      const partnerAvatar = isGroup
        ? conversation.groupAvatar || null
        : partnerDetail?.avatar || null;
      const partnerRole = isGroup ? 'group' : partnerDetail?.role || '';
      const members = isGroup
        ? conversation.groupMembers || []
        : partnerId ? [partnerId] : [];

      items.push({
        conversationId: conversation.conversationId,
        partnerId,
        partnerName,
        partnerAvatar,
        partnerRole,
        lastMessage: preview,
        lastMessageType: lastMessage?.messageType || fallbackType,
        attachmentsCount,
        timestamp: lastMessage?.timestamp || conversation.updatedAt || conversation.createdAt,
        isMeSend:
          lastMessage ? normalizeId(lastMessage.senderId) === normalizeId(userId) : false,
        read: unreadCount === 0,
        unreadCount,
        members,
        groupMembers: conversation.groupMembers || [],
        groupName: conversation.groupName || null,
        groupAvatar: conversation.groupAvatar || null,
      });
    }

    res.json(items);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/unread/:userId', async (req, res) => {
  const { userId } = req.params;
  const currentUserId = normalizeId(userId);
  const currentObjectId = toObjectId(userId);

  try {
    const matchConditions = [];
    if (currentObjectId) {
      matchConditions.push({ participants: currentObjectId });
    }
    if (currentUserId) {
      matchConditions.push({ participants: userId });
      matchConditions.push({ groupMembers: currentUserId });
    }

    const conversations = await Conversation.find(
      matchConditions.length ? { $or: matchConditions } : {}
    ).lean();

    let totalUnread = 0;
    const unreadBySender = {};

    for (const conversation of conversations) {
      const participantDetails = conversation.participantDetails || [];
      const partnerDetail = participantDetails.find(
        (detail) => normalizeId(detail.userId) !== currentUserId
      );

      const isGroup = Boolean(conversation.groupName);
      const partnerId = isGroup
        ? conversation.conversationId
        : partnerDetail
        ? normalizeId(partnerDetail.userId)
        : null;

      const { unreadCount } = computeUnreadForConversation(conversation, userId);
      totalUnread += unreadCount;

      if (partnerId && unreadCount > 0) {
        unreadBySender[partnerId] = (unreadBySender[partnerId] || 0) + unreadCount;
      }
    }

    res.json({
      totalUnread,
      unreadBySender,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/mark-read', async (req, res) => {
  const { senderId, receiverId, conversationId: providedConversationId } = req.body || {};

  if (!providedConversationId && (!senderId || !receiverId)) {
    return res.status(400).json({ error: 'senderId and receiverId are required' });
  }

  try {
    const conversationId = normalizeId(providedConversationId) || buildConversationId(senderId, receiverId);
    const conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      return res.json({ success: true, markedCount: 0 });
    }

    const { unreadCount } = computeUnreadForConversation(conversation, receiverId);

    if (!Array.isArray(conversation.participantStates)) {
      conversation.participantStates = [];
    }

    const receiverObjectId = toObjectId(receiverId) ?? receiverId;
    const existingState = conversation.participantStates.find(
      (state) => normalizeId(state.userId) === normalizeId(receiverId)
    );

    if (existingState) {
      existingState.lastReadAt = new Date();
    } else {
      conversation.participantStates.push({ userId: receiverObjectId, lastReadAt: new Date() });
    }

    await conversation.save();

    res.json({ success: true, markedCount: unreadCount });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
