import { Server } from 'socket.io';
import mongoose from 'mongoose';
import { CLIENT_URL } from '../config/env.js';
import { Conversation } from '../models/conversation.model.js';
import { User } from '../models/user.model.js';
import { buildConversationId, normalizeId, toObjectId } from '../utils/identifiers.js';

const { Types } = mongoose;

const ensureParticipantDetail = (conversation, userId, profile, fallbackName = '') => {
  if (!conversation) return;
  const normalizedId = normalizeId(userId);
  if (!normalizedId) return;

  if (!Array.isArray(conversation.participants)) {
    conversation.participants = [];
  }

  const objectId = toObjectId(userId);
  if (objectId) {
    const alreadyInParticipants = conversation.participants.some((participant) =>
      normalizeId(participant) === normalizedId
    );
    if (!alreadyInParticipants) {
      conversation.participants.push(objectId);
    }
  }

  if (!Array.isArray(conversation.participantDetails)) {
    conversation.participantDetails = [];
  }

  const existingDetail = conversation.participantDetails.find(
    (detail) => normalizeId(detail.userId) === normalizedId
  );

  if (existingDetail) {
    if (profile?.name) existingDetail.name = profile.name;
    if (profile?.role) existingDetail.role = profile.role;
    if (profile?.avatar !== undefined) {
      existingDetail.avatar = profile.avatar;
    }
  } else {
    conversation.participantDetails.push({
      userId: objectId ?? userId,
      name: profile?.name || fallbackName || '',
      role: profile?.role || '',
      avatar: profile?.avatar ?? null,
    });
  }
};

const updateParticipantState = (conversation, userId, timestamp = new Date()) => {
  if (!conversation) return;
  if (!Array.isArray(conversation.participantStates)) {
    conversation.participantStates = [];
  }

  const normalizedId = normalizeId(userId);
  if (!normalizedId) return;

  const objectId = toObjectId(userId) ?? userId;
  const existingState = conversation.participantStates.find(
    (state) => normalizeId(state.userId) === normalizedId
  );

  if (existingState) {
    existingState.lastReadAt = timestamp;
  } else {
    conversation.participantStates.push({ userId: objectId, lastReadAt: timestamp });
  }
};

const normalizeAttachments = (attachments = []) =>
  attachments
    .map((attachment) => {
      if (!attachment || typeof attachment !== 'object') return null;
      const url = typeof attachment.url === 'string' ? attachment.url : null;
      if (!url) return null;

      const providedKind = typeof attachment.kind === 'string' ? attachment.kind.toLowerCase() : null;
      const mimeType = typeof attachment.mimeType === 'string' ? attachment.mimeType : '';
      const resolvedKind = providedKind === 'image'
        ? 'image'
        : providedKind === 'file'
        ? 'file'
        : mimeType.startsWith('image/')
        ? 'image'
        : 'file';

      return {
        kind: resolvedKind,
        url,
        fileId: typeof attachment.fileId === 'string' ? attachment.fileId : null,
        name: typeof attachment.name === 'string' ? attachment.name : '',
        mimeType,
        size: Number.isFinite(attachment.size) ? attachment.size : null,
        width: Number.isFinite(attachment.width) ? attachment.width : null,
        height: Number.isFinite(attachment.height) ? attachment.height : null,
        thumbnailUrl: typeof attachment.thumbnailUrl === 'string' ? attachment.thumbnailUrl : null,
      };
    })
    .filter(Boolean);

const determineMessageType = (text, attachments) => {
  if (!attachments.length) {
    return 'text';
  }

  const hasImageAttachment = attachments.some((attachment) => attachment.kind === 'image');
  const hasFileAttachment = attachments.some((attachment) => attachment.kind !== 'image');

  if (text) {
    return 'mixed';
  }

  if (hasImageAttachment && hasFileAttachment) {
    return 'mixed';
  }

  return hasFileAttachment ? 'file' : 'image';
};

const toSocketMessage = (conversationId, storedMessage, savedDocument) => ({
  id: savedDocument._id.toString(),
  conversationId,
  senderId: storedMessage.senderId,
  receiverId: storedMessage.receiverId,
  senderName: storedMessage.senderName,
  receiverName: storedMessage.receiverName,
  message: storedMessage.message,
  messageType: storedMessage.messageType,
  attachments: storedMessage.attachments,
  seenByReceiver: false,
  timestamp: storedMessage.timestamp.toISOString(),
  isGroup: storedMessage.isGroup,
  groupMembers: storedMessage.groupMembers,
});

export const createSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const connectedUsers = new Map();

  const resolveUserProfile = async (userId) => {
    if (!userId) {
      return { name: null, email: null, avatar: null, role: null };
    }

    const connected = connectedUsers.get(userId);
    if (connected) {
      return {
        name: connected.name || connected.email || null,
        email: connected.email || null,
        avatar: connected.avatar || null,
        role: connected.role || null,
      };
    }

    try {
      const user = await User.findById(userId).select('name email avatar role').lean();
      if (!user) {
        return { name: null, email: null, avatar: null, role: null };
      }
      return {
        name: user.name || user.email || null,
        email: user.email || null,
        avatar: user.avatar || null,
        role: user.role || null,
      };
    } catch (error) {
      console.error('Failed to resolve user profile:', error);
      return { name: null, email: null, avatar: null, role: null };
    }
  };

  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join', (userData) => {
      if (!userData?.userId) return;

      const profile = {
        socketId: socket.id,
        userId: userData.userId,
        email: userData.email || null,
        role: userData.role || null,
        name: userData.name || userData.email || null,
        avatar: userData.avatar || null,
      };

      socket.join(profile.userId);
      socket.userData = profile;
      connectedUsers.set(profile.userId, profile);

      console.log(
        `${profile.email || profile.userId} (${profile.role || 'unknown'}) joined room: ${profile.userId}`
      );

      socket.broadcast.emit('userOnline', {
        userId: profile.userId,
        name: profile.name,
        role: profile.role,
        avatar: profile.avatar,
      });
    });

    socket.on('sendMessage', async (messageData = {}) => {
      try {
        const rawMessage = typeof messageData.message === 'string' ? messageData.message : '';
        const incomingAttachments = Array.isArray(messageData.attachments)
          ? messageData.attachments
          : [];
        const isGroup = Boolean(messageData.isGroup);

        const senderId = normalizeId(messageData.senderId);
        if (!senderId) {
          return socket.emit('messageError', { error: 'Invalid sender or receiver identifier' });
        }

        if (!rawMessage.trim() && incomingAttachments.length === 0) {
          return socket.emit('messageError', { error: 'Invalid message payload' });
        }

        const senderObjectId = toObjectId(senderId);
        if (!senderObjectId) {
          return socket.emit('messageError', { error: 'Invalid sender or receiver identifier' });
        }

        const providedReceiverId = normalizeId(messageData.receiverId);
        const providedConversationId = normalizeId(messageData.conversationId);
        const groupMemberIds = Array.isArray(messageData.groupMemberIds)
          ? messageData.groupMemberIds.map((id) => normalizeId(id)).filter(Boolean)
          : [];

        let conversationId = providedConversationId;
        let receiverObjectId = null;
        let receiverProfile = null;

        if (!isGroup) {
          if (!providedReceiverId) {
            return socket.emit('messageError', { error: 'Invalid sender or receiver identifier' });
          }
          receiverObjectId = toObjectId(providedReceiverId);
          if (!receiverObjectId) {
            return socket.emit('messageError', { error: 'Invalid sender or receiver identifier' });
          }
          conversationId = conversationId || buildConversationId(senderId, providedReceiverId);
          receiverProfile = await resolveUserProfile(providedReceiverId);
        } else {
          conversationId = conversationId || new Types.ObjectId().toString();
        }

        const senderProfile = await resolveUserProfile(senderId);
        let conversation = await Conversation.findOne({ conversationId });
        const timestamp = new Date();

        if (!conversation) {
          conversation = new Conversation({
            conversationId,
            participants: [],
            participantDetails: [],
            participantStates: [],
            messages: [],
            lastMessageAt: timestamp,
          });
        }

        const ensureParticipants = async (participants) => {
          for (const participantId of participants) {
            const profile = await resolveUserProfile(participantId);
            ensureParticipantDetail(conversation, participantId, profile, profile.name || 'Member');
          }
        };

        if (isGroup) {
          const memberSet = new Set([senderId, ...groupMemberIds]);
          conversation.groupMembers = Array.from(memberSet);
          conversation.groupName = messageData.groupName || conversation.groupName || 'Group chat';
          conversation.groupAvatar = Object.prototype.hasOwnProperty.call(messageData, 'groupAvatar')
            ? messageData.groupAvatar
            : conversation.groupAvatar || messageData.avatarPreview || null;

          conversation.participants = conversation.groupMembers
            .map((id) => toObjectId(id))
            .filter(Boolean);

          await ensureParticipants(conversation.groupMembers);
        } else {
          if (!conversation.participants.length) {
            conversation.participants = [senderObjectId, receiverObjectId];
          }
          ensureParticipantDetail(conversation, senderId, senderProfile, messageData.senderName);
          ensureParticipantDetail(
            conversation,
            providedReceiverId,
            receiverProfile,
            messageData.receiverName
          );
        }

        const cleanedAttachments = normalizeAttachments(incomingAttachments);
        const text = rawMessage.trim();
        const messageType = determineMessageType(text, cleanedAttachments);

        const storedMessage = {
          senderId,
          receiverId: isGroup ? conversationId : providedReceiverId,
          senderName: senderProfile.name || messageData.senderName || '',
          receiverName: !isGroup
            ? receiverProfile.name || messageData.receiverName || ''
            : conversation.groupName || 'Group chat',
          message: text,
          messageType,
          attachments: cleanedAttachments,
          timestamp,
          isGroup,
          groupMembers: isGroup ? conversation.groupMembers : [],
        };

        conversation.messages.push(storedMessage);
        conversation.lastMessageAt = timestamp;
        updateParticipantState(conversation, senderId, timestamp);
        await conversation.save();

        const savedDocument = conversation.messages[conversation.messages.length - 1];
        const savedMessage = toSocketMessage(conversationId, storedMessage, savedDocument);

        io.to(senderId).emit('messageConfirmed', savedMessage);

        if (isGroup) {
          (conversation.groupMembers || [])
            .filter((memberId) => memberId && memberId !== senderId)
            .forEach((memberId) => {
              io.to(memberId).emit('receiveMessage', savedMessage);
            });
        } else if (providedReceiverId) {
          io.to(providedReceiverId).emit('receiveMessage', savedMessage);
        }
      } catch (error) {
        console.error('Error saving message:', error);
        socket.emit('messageError', { error: 'Failed to send message' });
      }
    });

    socket.on('typing', (data) => {
      const { receiverId, senderId, senderName } = data;
      io.to(receiverId).emit('userTyping', {
        senderId,
        senderName,
      });
    });

    socket.on('stopTyping', (data) => {
      const { receiverId, senderId } = data;
      io.to(receiverId).emit('userStoppedTyping', {
        senderId,
      });
    });

    socket.on('markAsRead', async (data = {}) => {
      const { senderId, receiverId } = data;
      if (!senderId || !receiverId) return;

      try {
        const conversationId = buildConversationId(senderId, receiverId);
        const conversation = await Conversation.findOne({ conversationId });
        if (!conversation) {
          return;
        }

        const receiverDetail = conversation.participantDetails?.find(
          (detail) => normalizeId(detail.userId) === normalizeId(receiverId)
        );

        const receiverName = receiverDetail?.name || null;
        const lastReadState = conversation.participantStates?.find(
          (state) => normalizeId(state.userId) === normalizeId(receiverId)
        );
        const previousLastRead = lastReadState?.lastReadAt ? new Date(lastReadState.lastReadAt) : null;

        updateParticipantState(conversation, receiverId, new Date());
        await conversation.save();

        const unreadCount = conversation.messages.reduce((count, msg) => {
          if (!receiverName) return count;
          const isForReceiver = msg.receiverName === receiverName;
          const messageTime = msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp);
          const wasUnread = !previousLastRead || messageTime > previousLastRead;
          return isForReceiver && wasUnread ? count + 1 : count;
        }, 0);

        io.to(senderId).emit('messagesRead', {
          readBy: receiverId,
          count: unreadCount,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);

      let disconnectedUser = null;
      for (const [userId, userData] of connectedUsers.entries()) {
        if (userData.socketId === socket.id) {
          disconnectedUser = userData;
          connectedUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUser) {
        socket.broadcast.emit('userOffline', {
          userId: disconnectedUser.userId,
          name: disconnectedUser.name || disconnectedUser.email,
          avatar: disconnectedUser.avatar || null,
        });
      }
    });

    socket.on('getOnlineUsers', () => {
      const onlineUsers = Array.from(connectedUsers.values()).map((user) => ({
        userId: user.userId,
        name: user.name || user.email,
        role: user.role,
        avatar: user.avatar || null,
      }));

      socket.emit('onlineUsers', onlineUsers);
    });
  });

  return {
    io,
    getConnectedUserCount: () => connectedUsers.size,
    getConnectedUsers: () => Array.from(connectedUsers.values()),
  };
};