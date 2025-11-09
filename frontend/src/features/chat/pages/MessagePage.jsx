import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bot,
  Circle,
  CircleUserIcon,
  MessageCircle,
  MoreHorizontal,
  Search,
  UserPlus,
  Sparkles,
  Users,
} from 'lucide-react';
import ChatWindow from '../components/ChatWindow';
import AIChat from '../components/AIChat';
import { useEmployeeStore } from '../../../stores/useEmployeeStore';
import { useSocket } from '../../../hooks/useSocket';
import useUserStore from '../../../stores/useUserStore';
import axios from '../../../libs/axios';
import { formatHour } from '../../../utils/formatDate';
import CreateGroupModal from '../components/CreateGroupModal';
import GroupMembersModal from '../components/GroupMembersModal';
import { normalizeToString, toIsoTimestamp } from '../utils/chatUtils';

const MessagePage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatMode, setChatMode] = useState('inbox');
  const leavingAiRef = useRef(false);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupMembersModalOpen, setGroupMembersModalOpen] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null);
  const [aiConversations, setAiConversations] = useState([]);
  const [aiConversationsLoading, setAiConversationsLoading] = useState(false);
  const [activeAiMenu, setActiveAiMenu] = useState(null);
  const [editingAiConversation, setEditingAiConversation] = useState(null);

  const { employees, getAllUsers } = useEmployeeStore();
  const { user } = useUserStore();
  const { onlineUsers, isConnected, socket } = useSocket();

  const fetchConversations = useCallback(
    async (targetUserId) => {
      const effectiveUserId = normalizeToString(targetUserId || user?.id);
      if (!effectiveUserId) {
        setConversations([]);
        return;
      }

      setConversationsLoading(true);
      try {
        const response = await axios.get(`/messages/conversations/${effectiveUserId}`);
        const normalized = (response.data || []).map((conv) => {
          const partnerId = normalizeToString(conv.partnerId);
          const conversationId =
            conv.conversationId ||
            (partnerId && effectiveUserId ? [partnerId, effectiveUserId].sort().join('_') : null);

          return {
            ...conv,
            partnerId,
            conversationId,
            timestamp: toIsoTimestamp(conv.timestamp),
            unreadCount: Number(conv.unreadCount) || 0,
            attachmentsCount: Number(conv.attachmentsCount) || 0,
            lastMessageType: conv.lastMessageType || (conv.attachmentsCount ? 'image' : 'text'),
            read: conv.read ?? true,
            isMeSend: Boolean(conv.isMeSend),
          };
        });

        setConversations(normalized);
      } catch (error) {
        console.error('Error fetching conversations:', error);
        setConversations([]);
      } finally {
        setConversationsLoading(false);
      }
    },
    [user?.id]
  );

  const fetchAiConversations = useCallback(async () => {
    if (!user?.id) {
      setAiConversations([]);
      return;
    }
    
    setAiConversationsLoading(true);
    try {
      const res = await axios.get(`/ai/conversations/${user.id}`);
      const validConversations = (res.data || []).filter(conv => 
        (conv._id || conv.id) && (conv._id || conv.id) !== 'undefined' && (conv._id || conv.id) !== 'null'
      );
      setAiConversations(validConversations);
    } catch (err) {
      console.error("Failed to fetch AI conversations:", err);
      setAiConversations([]);
    } finally {
      setAiConversationsLoading(false);
    }
  }, [user?.id]);

  const markMessagesAsRead = useCallback(async () => {
    if (!user?.id || !selectedUser?.id) return;
    if (selectedUser?.role === 'group') return;
    try {
      await axios.post('/messages/mark-read', {
        senderId: selectedUser.id,
        receiverId: user.id,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }

    if (socket) {
      socket.emit('markAsRead', {
        senderId: selectedUser.id,
        receiverId: user.id,
      });
    }

    setConversations((prev) =>
      prev.map((conv) =>
        conv.partnerId === selectedUser.id ? { ...conv, read: true, unreadCount: 0 } : conv
      )
    );
  }, [selectedUser?.id, selectedUser?.role, socket, user?.id]);

  const handleSelectUser = useCallback(
    (target) => {
      if (!target?.id) return;
      if (target.id.startsWith('ai-')) {
        // AI conversation selected
        const conversationId = target.conversation?.conversationId;
        if (conversationId) {
          navigate(`/message/ai?conversationId=${conversationId}`);
        } else {
          navigate('/message/ai');
        }
      } else {
        navigate(`/message/${target.id}`);
      }
    },
    [navigate]
  );

  const isUserOnline = useCallback(
    (id) => {
      if (!id) return false;
      const normalized = normalizeToString(id);
      return onlineUsers.some((entry) => normalizeToString(entry?.userId) === normalized);
    },
    [onlineUsers]
  );

  const isGroupOnline = useCallback(
    (members) => {
      if (!Array.isArray(members)) return false;
      return members.some((memberId) => isUserOnline(memberId));
    },
    [isUserOnline]
  );

  const availableUsersWithAI = useMemo(() => {
    const results = [];
    const seen = new Set();

    results.push({
      id: 'ai',
      name: 'ChatAI Bot',
      email: '',
      role: 'assistant',
      department: '',
      avatar: null,
      members: [],
      conversation: null,
    });
    seen.add('ai');

    const safeEmployees = Array.isArray(employees) ? employees : [];
    safeEmployees.forEach((emp) => {
      const id = normalizeToString(emp.id);
      if (!id || seen.has(id)) return;
      results.push({
        id,
        name: emp.name || 'Unknown member',
        email: emp.email || '',
        role: emp.role || '',
        department: emp.department || '',
        avatar: emp.avatar || null,
        members: [],
        conversation: null,
      });
      seen.add(id);
    });

    (Array.isArray(conversations) ? conversations : []).forEach((conv) => {
      const partnerId = normalizeToString(conv.partnerId);
      if (!partnerId || seen.has(partnerId)) return;

      const isGroupConversation =
        conv.partnerRole === 'group' ||
        Boolean(conv.groupName) ||
        (partnerId && partnerId.startsWith('team:'));

      results.push({
        id: partnerId,
        name: isGroupConversation
          ? conv.groupName || conv.partnerName || 'Team chat'
          : conv.partnerName || 'Unknown member',
        email: isGroupConversation ? '' : conv.partnerEmail || '',
        role: isGroupConversation ? 'group' : conv.partnerRole || '',
        department: '',
        avatar: conv.partnerAvatar || null,
        members: Array.isArray(conv.groupMembers) ? conv.groupMembers : [],
        conversation: conv,
      });
      seen.add(partnerId);
    });

    return results;
  }, [employees, conversations]);

  const availableGroupUsers = useMemo(() => {
    const unique = new Map();

    (availableUsersWithAI || []).forEach((entry) => {
      const id = normalizeToString(entry.id);
      if (!id || id === 'ai') return;
      if (id === normalizeToString(user?.id)) return;
      if (entry.role === 'group') return;
      
      // For group creation, allow all users (not just same team members)
      // The team membership filtering should only apply to showing existing conversations
      if (!unique.has(id)) unique.set(id, { ...entry, id });
    });
    return Array.from(unique.values());
  }, [availableUsersWithAI, user?.id]);

  const conversationPartners = useMemo(() => {
    if (!Array.isArray(conversations)) return [];
    return conversations
      .map((conv) => {
        if (!conv.partnerId) return null;
        const partnerInfo = availableUsersWithAI.find((person) => person.id === conv.partnerId);
        const previewLabel = conv.previewText || conv.lastMessage || 'Start chatting';
        const hasAttachmentPreview = !conv.lastMessage && (conv.attachmentsCount || 0) > 0;
        let displayedPreview = previewLabel;

        if (hasAttachmentPreview) {
          if (conv.lastMessageType === 'file') {
            displayedPreview = `[File] ${previewLabel}`;
          } else if (conv.lastMessageType === 'mixed') {
            displayedPreview = `[Attachment] ${previewLabel}`;
          } else {
            displayedPreview = `[Image] ${previewLabel}`;
          }
        }

        const isGroupConversation =
          conv.partnerRole === 'group' ||
          Boolean(conv.groupName) ||
          (conv.partnerId && conv.partnerId.startsWith('team:'));

        return {
          id: conv.partnerId,
          name: isGroupConversation
            ? conv.groupName || conv.partnerName || 'Team chat'
            : partnerInfo?.name || conv.partnerName || 'Unknown member',
          email: isGroupConversation ? '' : partnerInfo?.email || '',
          role: isGroupConversation ? 'group' : partnerInfo?.role || conv.partnerRole || '',
          department: isGroupConversation ? '' : partnerInfo?.department || '',
          avatar: partnerInfo?.avatar || conv.partnerAvatar || null,
          members: conv.groupMembers || conv.members || partnerInfo?.members || [],
          conversation: conv,
          preview: displayedPreview,
        };
      })
      .filter(Boolean);
  }, [availableUsersWithAI, conversations]);

  const visibleConversationPartners = useMemo(() => {
    if (chatMode === 'group') {
      const normalizedUserId = normalizeToString(user?.id);
      const userTeamNames = Array.isArray(user?.teamNames) ? user.teamNames : [];

      return conversationPartners.filter((partner) => {
        if (partner.role !== 'group') return false;
        if (!normalizedUserId) return false;

        const memberIds = Array.isArray(partner.members)
          ? partner.members
              .map((memberId) => normalizeToString(memberId))
              .filter(Boolean)
          : [];

        if (!memberIds.includes(normalizedUserId)) {
          return false;
        }

        const conversationKey = normalizeToString(
          partner.conversation?.conversationId || partner.id
        );

        if (conversationKey && conversationKey.startsWith('team:')) {
          const groupName = partner.conversation?.groupName || partner.name;
          if (!groupName) return false;
          if (!userTeamNames.length) return false;
          return userTeamNames.includes(groupName);
        }

        return true;
      });
    }
    if (chatMode === 'ai') {
      // Return AI conversations as partners
      return aiConversations.map((conv) => ({
        id: `ai-${conv._id || conv.id}`,
        name: conv.title || 'New Conversation',
        email: '',
        role: 'ai',
        department: '',
        avatar: null,
        members: [],
        conversation: {
          conversationId: conv._id || conv.id,
          timestamp: conv.updatedAt,
          previewText: conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 50) || 'Start chatting',
          read: true,
          isMeSend: false,
        },
        preview: conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 50) || 'Start chatting',
      }));
    }
    // Inbox mode: only show personal conversations (no AI, no groups)
    return conversationPartners.filter(
      (partner) => partner.role !== 'group' && partner.id !== 'ai' && partner.role !== 'ai'
    );
  }, [conversationPartners, chatMode, user?.id, user?.teamNames, aiConversations]);

  const hasSearchTerm = searchTerm.trim().length > 0;

  const filteredConversationPartners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = visibleConversationPartners;
    if (!term) return base;
    return base.filter((partner) => {
      if (!partner) return false;
      const fields = [
        partner.name,
        partner.email,
        partner.role,
        partner.department,
        partner.conversation?.previewText,
      ];
      return fields.some((field) => field?.toString().toLowerCase().includes(term));
    });
  }, [visibleConversationPartners, searchTerm]);

  const filteredNewChatUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const base = (availableUsersWithAI || []).filter((person) =>
      !conversationPartners.some((partner) => partner.id === person.id) &&
      person.id !== user?.id &&
      person.id !== 'ai' && person.role !== 'group' && person.role !== 'ai'
    );
    if (!term) return base;
    return base.filter((person) => {
      const fields = [person.name, person.email, person.role, person.department];
      return fields.some((field) => field?.toString().toLowerCase().includes(term));
    });
  }, [availableUsersWithAI, conversationPartners, searchTerm, user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchConversations(user.id);
    }
  }, [user?.id, fetchConversations]);

  useEffect(() => {
    if (chatMode === 'ai' && user?.id) {
      fetchAiConversations();
    }
  }, [chatMode, user?.id, fetchAiConversations]);

  // Listen for AI conversation updates
  useEffect(() => {
    if (chatMode !== 'ai') return;
    const handleAiConversationUpdate = () => {
      fetchAiConversations();
    };
    window.addEventListener('aiConversationCreated', handleAiConversationUpdate);
    window.addEventListener('aiConversationDeleted', handleAiConversationUpdate);
    return () => {
      window.removeEventListener('aiConversationCreated', handleAiConversationUpdate);
      window.removeEventListener('aiConversationDeleted', handleAiConversationUpdate);
    };
  }, [chatMode, fetchAiConversations]);

  useEffect(() => {
    getAllUsers();
  }, [getAllUsers]);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchConversations();
    socket.on('receiveMessage', refresh);
    socket.on('messageConfirmed', refresh);
    socket.on('messagesRead', refresh);
    return () => {
      socket.off('receiveMessage', refresh);
      socket.off('messageConfirmed', refresh);
      socket.off('messagesRead', refresh);
    };
  }, [socket, fetchConversations]);

  useEffect(() => {
    if (userId === 'ai') {
      if (leavingAiRef.current) {
        return;
      }
      if (chatMode !== 'ai') {
        setChatMode('ai');
      }
      setSelectedUser(null);
      return;
    }

    if (!userId) {
      if (chatMode === 'ai') {
        setChatMode('inbox');
      }
      setSelectedUser(null);
      leavingAiRef.current = false;
      return;
    }

    leavingAiRef.current = false;

    const candidate =
      conversationPartners.find((partner) => partner.id === userId) ||
      availableUsersWithAI.find((person) => person.id === userId);

    if (candidate) {
      if (candidate.role === 'group' && chatMode !== 'group') {
        setChatMode('group');
      } else if (candidate.role !== 'group' && chatMode === 'group') {
        setChatMode('inbox');
      } else if (chatMode === 'ai') {
        setChatMode('inbox');
      }

      if (selectedUser?.id === candidate.id) return;

      const normalized = {
        id: candidate.id,
        name: candidate.name || 'Untitled',
        email: candidate.email || '',
        role: candidate.role || '',
        department: candidate.department || '',
        avatar: candidate.avatar || null,
        conversationId: candidate.conversation?.conversationId || candidate.conversationId || null,
        members: candidate.members || candidate.conversation?.members || candidate.conversation?.groupMembers || [],
      };
      setSelectedUser(normalized);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.partnerId === normalized.id ? { ...conv, read: true, unreadCount: 0 } : conv
        )
      );
    }
  }, [userId, chatMode, conversationPartners, availableUsersWithAI, selectedUser?.id]);

  useEffect(() => {
    if (chatMode !== 'ai') {
      markMessagesAsRead();
    }
  }, [chatMode, markMessagesAsRead]);

  const renderUserAvatar = (userItem, size = 'w-12 h-12') => {
    if (userItem?.id === 'ai') {
      return (
        <div className={`${size} flex items-center justify-center rounded-full bg-purple-100 text-purple-600 border border-purple-200`}>
          <Bot className='h-5 w-5' />
        </div>
      );
    }

    if (userItem?.avatar) {
      return (
        <img
          src={userItem.avatar}
          alt={userItem?.name || 'User avatar'}
          className={`${size} rounded-full object-cover border border-white shadow-sm`}
        />
      );
    }

    const initials = (userItem?.name || userItem?.email || '')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join('');

    return (
      <div className={`${size} flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold shadow-sm`}>
        {initials || <CircleUserIcon className='h-5 w-5' />}
      </div>
    );
  };

  const handleToggleMode = (mode) => {
    if (mode === chatMode) return;
    if (chatMode === 'ai' && mode !== 'ai') {
      leavingAiRef.current = true;
    }
    setChatMode(mode);
    navigate('/message');
    setSelectedUser((prev) => {
      if (!prev) return null;
      if (mode === 'group') {
        return prev.role === 'group' ? prev : null;
      }
      return prev.role === 'group' ? null : prev;
    });
  };

  const handleOpenChatAI = () => {
    leavingAiRef.current = false;
    setChatMode('ai');
    setSelectedUser(null);
    navigate('/message/ai');
  };

  if (!user) {
    return (
      <div className='flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-gray-500'>
        Loading user...
      </div>
    );
  }

  useEffect(() => {
    const handleClick = () => setActiveAiMenu(null);
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setActiveAiMenu(null);
        setEditingAiConversation(null);
      }
    };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleRenameAiConversation = useCallback(
    async (conversationId, name) => {
      if (!conversationId || !name?.trim()) {
        setEditingAiConversation(null);
        return;
      }
      try {
        await axios.patch(`/ai/conversation/${conversationId}`, { title: name.trim() });
        await fetchAiConversations();
      } catch (error) {
        console.error('Failed to rename AI conversation', error);
      } finally {
        setEditingAiConversation(null);
      }
    },
    [fetchAiConversations]
  );

  const handleDeleteAiConversation = useCallback(
    async (conversationId) => {
      if (!conversationId) return;
      try {
        await axios.delete(`/ai/conversation/${conversationId}`);
        await fetchAiConversations();
      } catch (error) {
        console.error('Failed to delete AI conversation', error);
      }
    },
    [fetchAiConversations]
  );

  return (
    <div className='h-full w-full overflow-hidden bg-slate-50'>
      <div className='mx-auto flex h-full max-w-[1400px] gap-6 px-6 py-6'>
        {/* Sidebar */}
        <aside className='flex w-[360px] flex-col rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-xl shadow-blue-50/40 backdrop-blur'>
          <div className='mb-6 rounded-3xl border border-slate-100 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-purple-500/10 p-5'>
            <div className='flex items-center gap-3'>
              {renderUserAvatar(user, 'w-14 h-14')}
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-600'>Welcome back</p>
                <p className='text-lg font-semibold text-slate-900'>{user.name || user.email}</p>
                <p className='text-xs text-slate-500'>{isConnected ? 'Online now' : 'Connecting...'}</p>
              </div>
            </div>
            <div className='mt-4 flex items-center gap-2 text-sm font-medium'>
              <button
                type='button'
                onClick={() => handleToggleMode('inbox')}
                className={`flex-1 rounded-full px-4 py-2 transition ${
                  chatMode === 'inbox'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                    : 'bg-white/70 text-slate-600 hover:bg-blue-50'
                }`}
              >
                <Users className='mr-2 inline-block h-4 w-4' /> Inbox
              </button>
              <button
                type='button'
                onClick={() => handleToggleMode('group')}
                className={`flex-1 rounded-full px-4 py-2 transition ${
                  chatMode === 'group'
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                    : 'bg-white/70 text-slate-600 hover:bg-indigo-50'
                }`}
              >
                <Users className='mr-2 inline-block h-4 w-4' /> Group
              </button>
              <button
                type='button'
                onClick={handleOpenChatAI}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                  chatMode === 'ai'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                    : 'bg-white/70 text-slate-600 hover:bg-purple-50'
                }`}
                title='AI Chat'
              >
                <Sparkles className='h-5 w-5' />
              </button>
            </div>
          </div>

          <div className='relative mb-5'>
            <Search className='absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
            <input
              type='text'
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Search messages or people'
              className='w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-700 shadow-inner focus:outline-none focus:ring-4 focus:ring-blue-100'
            />
          </div>

          <div className='flex items-center justify-between pb-4'>
            <div>
              <h3 className='text-sm font-semibold text-slate-700'>Conversations</h3>
              <p className='text-xs text-slate-500'>Keep in touch with your teammates</p>
            </div>
            {chatMode !== 'ai' && (
              <button
                type='button'
                onClick={() => setIsGroupModalOpen(true)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-blue-600 transition hover:bg-blue-100'
                title='Create group chat'
              >
                <UserPlus className='h-4 w-4' />
              </button>
            )}
          </div>

          <div className='flex-1 space-y-6 overflow-y-auto pr-2'>
            <section className='space-y-3'>
              {conversationsLoading ? (
                <div className='rounded-2xl border border-slate-100 bg-white/80 p-6 text-center text-sm text-slate-500 shadow-inner'>
                  Loading conversations...
                </div>
              ) : filteredConversationPartners.length > 0 ? (
                filteredConversationPartners.map((partner) => {
                  const isActive = selectedUser?.id === partner.id;
                  const conversation = partner.conversation;
                  const isAiConversation = partner.role === 'ai' || partner.id === 'ai';

                  if (isAiConversation) {
                    const hasUnread =
                      !conversation?.read && !conversation?.isMeSend && conversation?.unreadCount > 0;
                    const isEditing = editingAiConversation?.id === partner.id;
                    const editingValue = editingAiConversation?.value ?? '';
                    const conversationId = partner.conversation?.conversationId || partner.id?.replace(/^ai-/, '');
                    const handleAiKeyDown = (event) => {
                      if (isEditing) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectUser(partner);
                      }
                    };
                    return (
                      <div
                        key={partner.id}
                        onClick={() => {
                          if (isEditing) return;
                          handleSelectUser(partner);
                        }}
                        onKeyDown={handleAiKeyDown}
                        role='button'
                        tabIndex={0}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? 'border-slate-300 bg-slate-50 shadow-inner'
                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className='flex items-center justify-between gap-3'>
                          {isEditing ? (
                            <input
                              autoFocus
                              className='w-full rounded-md border border-slate-300 px-2 py-1 text-sm font-semibold text-slate-900 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200'
                              value={editingValue}
                              onChange={(event) =>
                                setEditingAiConversation((prev) =>
                                  prev?.id === partner.id ? { ...prev, value: event.target.value } : prev
                                )
                              }
                              onBlur={() => handleRenameAiConversation(conversationId, editingValue)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                  event.preventDefault();
                                  handleRenameAiConversation(conversationId, editingValue);
                                } else if (event.key === 'Escape') {
                                  event.preventDefault();
                                  setEditingAiConversation(null);
                                }
                              }}
                            />
                          ) : (
                            <span className='truncate text-sm font-semibold text-slate-900'>
                              {partner.name}
                            </span>
                          )}
                          <div className='flex items-center gap-2'>
                            {hasUnread && (
                              <span className='inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-slate-700 px-2 py-0.5 text-[10px] font-semibold text-white'>
                                {conversation.unreadCount}
                              </span>
                            )}
                            {!isEditing && (
                              <div className='relative'>
                                <button
                                  type='button'
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActiveAiMenu((prev) => (prev === partner.id ? null : partner.id));
                                  }}
                                  className='inline-flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200'
                                >
                                  <MoreHorizontal className='h-4 w-4' />
                                </button>
                                {activeAiMenu === partner.id && (
                                  <div className='absolute right-0 top-8 z-20 w-32 rounded-xl border border-slate-100 bg-white py-1.5 text-sm shadow-lg'>
                                    <button
                                      type='button'
                                      className='block w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-100'
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setEditingAiConversation({
                                          id: partner.id,
                                          value: partner.name || '',
                                        });
                                        setActiveAiMenu(null);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      type='button'
                                      className='block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50'
                                      onClick={(event) => {
                                        event.stopPropagation();
                                        setActiveAiMenu(null);
                                        handleDeleteAiConversation(conversationId);
                                      }}
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const isPartnerOnline =
                    partner.role === 'group'
                      ? isGroupOnline(partner.members)
                      : partner.id !== 'ai' && isUserOnline(partner.id);

                  return (
                    <button
                      key={partner.id}
                      type='button'
                      onClick={() => handleSelectUser(partner)}
                      className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? 'border-blue-400 bg-blue-50/70 shadow-inner shadow-blue-100'
                          : 'border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40'
                      }`}
                    >
                      <div className='flex items-center gap-3'>
                        {renderUserAvatar(partner, 'w-12 h-12')}
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center justify-between gap-2'>
                            <span className='truncate text-sm font-semibold text-slate-900'>
                              {partner.name}
                            </span>
                            <span className='text-xs text-slate-400'>
                              {conversation?.timestamp ? formatHour(conversation.timestamp) : ''}
                            </span>
                          </div>
                          <p className={`truncate text-xs ${!conversation?.read && !conversation?.isMeSend ? 'font-semibold text-blue-600' : 'text-slate-500'}`}>
                            {partner.preview}
                          </p>
                          <div className='mt-2 flex items-center justify-between text-[10px] text-slate-400'>
                            <span className='flex items-center gap-1'>
                              <Circle className={`h-2 w-2 ${isPartnerOnline ? 'text-emerald-500' : 'text-slate-300'}`} fill='currentColor' />
                              {isPartnerOnline ? 'Online' : 'Offline'}
                            </span>
                            {!conversation?.read && !conversation?.isMeSend && conversation?.unreadCount > 0 && (
                              <span className='inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white'>
                                {conversation.unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : hasSearchTerm ? (
                <div className='rounded-2xl border border-slate-100 bg-white/80 p-6 text-center text-sm text-slate-500 shadow-inner'>
                  No conversations match your search.
                </div>
              ) : (
                <div className='rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500'>
                  {chatMode === 'group' 
                    ? 'No team conversations yet. Create a group to get started.' 
                    : chatMode === 'ai'
                    ? 'Start chatting with AI. Your conversation history will appear here.'
                    : 'Start chatting by selecting a teammate below.'}
                </div>
              )}
            </section>

            {/* Start new chat - only show in inbox mode */}
            {chatMode === 'inbox' && (
              <section className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h3 className='text-sm font-semibold text-slate-700'>Start new chat</h3>
                  <span className='text-xs text-slate-400'>{filteredNewChatUsers.length}</span>
                </div>
                <div className='grid gap-2'>
                  {filteredNewChatUsers.map((person) => {
                    const isOnline = person.id !== 'ai' && person.role !== 'group' && isUserOnline(person.id);
                    return (
                      <button
                        key={person.id}
                        type='button'
                        onClick={() => handleSelectUser(person)}
                        className='flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-2.5 text-left transition hover:border-blue-200 hover:bg-blue-50/40'
                      >
                        {renderUserAvatar(person, 'w-10 h-10')}
                        <div className='min-w-0 flex-1'>
                          <span className={`block truncate text-sm font-semibold text-slate-900 ${person.id === 'ai' ? 'text-purple-600' : ''}`}>
                            {person.name}
                          </span>
                          <p className='truncate text-xs text-slate-500'>{person.email || person.department || person.role || 'Member'}</p>
                        </div>
                        <Circle
                          className={`h-3.5 w-3.5 ${isOnline ? 'text-emerald-500' : 'text-slate-200'}`}
                          fill='currentColor'
                        />
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        </aside>

        {/* Conversation panel */}
        <section className='flex min-h-0 flex-1 flex-col rounded-3xl border border-slate-200 bg-white/70 shadow-2xl shadow-blue-50/40 backdrop-blur'>
          {chatMode === 'ai' ? (
            <AIChat />
          ) : selectedUser ? (
            <ChatWindow
              selectedUser={selectedUser}
              currentUser={user}
              onNewMessage={fetchConversations}
              isPartnerOnline={
                selectedUser.role === 'group'
                  ? isGroupOnline(selectedUser.members)
                  : isUserOnline(selectedUser.id)
              }
              onShowMembers={(group) => {
                setSelectedGroupForMembers(group);
                setGroupMembersModalOpen(true);
              }}
            />
          ) : (
            <div className='flex h-full flex-col items-center justify-center bg-gradient-to-br from-white to-blue-50/60 text-center text-slate-500'>
              <MessageCircle className='mb-4 h-16 w-16 text-blue-300' />
              <p className='text-lg font-semibold text-slate-700'>Select a teammate to start chatting</p>
              <p className='text-sm text-slate-500'>Your conversations and AI assistant will appear here.</p>
              {!isConnected && (
                <div className='mt-4 flex items-center gap-2 text-xs text-slate-400'>
                  <span className='h-2 w-2 animate-ping rounded-full bg-blue-400' /> Connecting...
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <CreateGroupModal
        open={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        availableUsers={availableGroupUsers}
        currentUser={user}
        existingGroups={conversationPartners.filter((partner) => partner.role === 'group')}
        onCreateGroup={async (payload) => {
          try {
            const creatorId = normalizeToString(user?.id);
            const memberIds = Array.isArray(payload?.members)
              ? payload.members
                  .map((member) =>
                    normalizeToString(member?.id || member?._id || member?.userId || member)
                  )
                  .filter(Boolean)
                : [];
            const uniqueMemberIds = Array.from(new Set(memberIds));

            await axios.post('/messages/groups', {
              name: payload?.name?.trim?.() || '',
              memberIds: uniqueMemberIds,
              avatar: payload?.avatarPreview || null,
              creatorId,
            });

            if (user?.id) {
              await fetchConversations(user.id);
            }

            setIsGroupModalOpen(false);
          } catch (error) {
            console.error('Error creating group conversation:', error);
            throw error;
          }
        }}
      />

      <GroupMembersModal
        open={groupMembersModalOpen}
        onClose={() => setGroupMembersModalOpen(false)}
        groupName={selectedGroupForMembers?.name}
        members={selectedGroupForMembers?.members || []}
        users={employees}
        currentUser={user}
      />
    </div>
  );
};

export default MessagePage;
