import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Send, Circle, CircleUserRoundIcon, FileText, Download, Paperclip, Smile, Bot } from 'lucide-react';
import { useSocket } from '../../../hooks/useSocket';
import { formatHour } from '../../../utils/formatDate';
import axios from '../../../libs/axios';
import ImageViewer from '../../../components/ImageViewer';
import { encodeFileToBase64, formatFileSize, isImageAttachment, normalizeId } from '../utils/chatUtils';

const ChatWindow = ({ selectedUser, currentUser, onNewMessage, isPartnerOnline, onShowMembers }) => {
  const { id: userId, name: currentUserName, role: currentUserRole } = currentUser || {};

  const normalizedCurrentUserId = normalizeId(userId);

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typing, setTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { socket } = useSocket();

  const partnerAvatar = selectedUser?.avatar || null;
  const isGroupChat = selectedUser?.role === 'group';

  const allImages = useMemo(
    () =>
      messages
        .flatMap((msg) =>
          (msg.attachments || [])
            .filter((att) => isImageAttachment(att))
            .map((att) => att.url || att.thumbnailUrl)
        )
        .filter(Boolean),
    [messages]
  );

  const handleImageClick = (url) => {
    setSelectedImageUrl(url);
    setIsViewerOpen(true);
  };

  const conversationKey = useMemo(() => {
    if (selectedUser?.conversationId) return selectedUser.conversationId;
    if (!userId || !selectedUser?.id) return null;
    return [userId, selectedUser.id].sort().join('_');
  }, [userId, selectedUser?.conversationId, selectedUser?.id]);


  const normalizeMessage = useCallback(
    (message) => {
      if (!message) return null;

      const timestamp = message.timestamp
        ? new Date(message.timestamp).toISOString()
        : new Date().toISOString();

      const attachments = Array.isArray(message.attachments)
        ? message.attachments.map((item, index) => {
            const kind = isImageAttachment(item) ? 'image' : 'file';
            return {
              id: item.id || item._id || `${timestamp}-attachment-${index}`,
              kind,
              url: item.url || item.thumbnailUrl || null,
              thumbnailUrl: item.thumbnailUrl || null,
              fileId: item.fileId || null,
              name: item.name || '',
              mimeType: item.mimeType || '',
              size: item.size || null,
              width: item.width || null,
              height: item.height || null,
            };
          })
        : [];

      const hasImageAttachments = attachments.some((attachment) => attachment.kind === 'image');
      const hasFileAttachments = attachments.some((attachment) => attachment.kind !== 'image');
      const derivedMessageType = attachments.length
        ? hasImageAttachments && hasFileAttachments
          ? 'mixed'
          : hasFileAttachments
          ? 'file'
          : 'image'
        : 'text';

      return {
        id: message.id || message._id || `${message.senderName || 'unknown'}-${timestamp}`,
        conversationId: message.conversationId || conversationKey || null,
        senderId: normalizeId(message.senderId),
        receiverId: normalizeId(message.receiverId),
        senderName: message.senderName || '',
        receiverName: message.receiverName || '',
        message: message.message || '',
        messageType: message.messageType || derivedMessageType,
        attachments,
        seenByReceiver: Boolean(message.seenByReceiver),
        timestamp,
        isGroup: Boolean(message.isGroup),
        groupMembers: Array.isArray(message.groupMembers) ? message.groupMembers : [],
      };
    },
    [conversationKey]
  );

  const upsertMessage = useCallback(
    (rawMessage) => {
      const normalized = normalizeMessage(rawMessage);
      if (!normalized) return;

      setMessages((prev) => {
        const next = [...prev];
        const existingIndex = normalized.id
          ? next.findIndex((item) => item.id === normalized.id)
          : -1;

        if (existingIndex >= 0) {
          next[existingIndex] = normalized;
        } else {
          next.push(normalized);
        }

        return next.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    },
    [normalizeMessage]
  );

  const fetchChatHistory = useCallback(async () => {
    if (!userId || !selectedUser?.id) return;
    setLoading(true);
    try {
      let endpoint = `/messages/history/${userId}/${selectedUser.id}`;
      if (selectedUser?.role === 'group') {
        const conversationId = selectedUser.conversationId || selectedUser.id;
        endpoint += `?conversationId=${conversationId}`;
      }
      const response = await axios.get(endpoint);
      const formatted = (response.data || [])
        .map(normalizeMessage)
        .filter(Boolean)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      setMessages(formatted);
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [normalizeMessage, selectedUser?.id, selectedUser?.role, selectedUser?.conversationId, userId]);

  const markMessagesAsRead = useCallback(async () => {
    if (!userId || !selectedUser?.id) return;
    if (selectedUser?.role === 'group') return;
    try {
      await axios.post('/messages/mark-read', {
        senderId: selectedUser.id,
        receiverId: userId,
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }

    if (socket) {
      socket.emit('markAsRead', {
        senderId: selectedUser.id,
        receiverId: userId,
      });
    }
  }, [selectedUser?.id, selectedUser?.role, socket, userId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const emitMessage = useCallback(
    (payload) => {
      if (!socket) return;
      socket.emit('sendMessage', payload);
    },
    [socket]
  );

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!newMessage.trim() || !socket || !userId || !selectedUser?.id) return;

    const payload = {
      senderId: userId,
      receiverId: selectedUser.id,
      message: newMessage.trim(),
      senderName: currentUserName,
      senderRole: currentUserRole,
      conversationId: conversationKey,
    };

    if (isGroupChat) {
      payload.isGroup = true;
      payload.receiverId = null;
      payload.conversationId = selectedUser.conversationId || selectedUser.id;
      payload.groupMemberIds = selectedUser.members || [];
      payload.groupName = selectedUser.name;
      if (selectedUser.avatar) {
        payload.groupAvatar = selectedUser.avatar;
      }
    }

    emitMessage(payload);

    setNewMessage('');

    if (typing && !isGroupChat) {
      socket.emit('stopTyping', {
        senderId: userId,
        receiverId: selectedUser.id,
      });
      setTyping(false);
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isGroupChat && !typing && socket && e.target.value.trim()) {
      setTyping(true);
      socket.emit('typing', {
        senderId: userId,
        receiverId: selectedUser.id,
        senderName: currentUserName,
      });
    }

    clearTimeout(window.typingTimer);
    window.typingTimer = setTimeout(() => {
      if (!isGroupChat && typing && socket) {
        socket.emit('stopTyping', {
          senderId: userId,
          receiverId: selectedUser.id,
        });
        setTyping(false);
      }
    }, 3000);
  };

  const handleSelectEmoji = (emoji) => {
    setNewMessage((prev) => (prev || '') + emoji);
  };

  const emojiList = [
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
    '??',
  ];

  const toggleEmojiPicker = (e) => {
    e.preventDefault();
    setShowEmojiPicker((value) => !value);
  };

  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !socket || !userId || !selectedUser?.id) {
      event.target.value = '';
      return;
    }

    setUploadingAttachment(true);
    try {
      const dataUrl = await encodeFileToBase64(file);
      const isImage = file.type?.startsWith('image/');

      const payload = {
        senderId: userId,
        receiverId: selectedUser.id,
        message: '',
        senderName: currentUserName,
        senderRole: currentUserRole,
        conversationId: conversationKey,
        attachments: [
          {
            kind: isImage ? 'image' : 'file',
            url: dataUrl,
            name: file.name,
            mimeType: file.type,
            size: file.size,
          },
        ],
      };

      if (isGroupChat) {
        payload.isGroup = true;
        payload.receiverId = null;
        payload.conversationId = selectedUser.conversationId || selectedUser.id;
        payload.groupMemberIds = selectedUser.members || [];
        payload.groupName = selectedUser.name;
        if (selectedUser.avatar) {
          payload.groupAvatar = selectedUser.avatar;
        }
      }

      emitMessage(payload);
    } catch (error) {
      console.error('Failed to encode file:', error);
      alert('Failed to process the selected file. Please try another one.');
    } finally {
      setUploadingAttachment(false);
      event.target.value = '';
    }
  };

  const isMessageMine = useCallback(
    (message) => {
      const senderId = normalizeId(message.senderId);
      if (senderId && normalizedCurrentUserId) {
        return senderId === normalizedCurrentUserId;
      }
      return message.senderName === currentUserName;
    },
    [normalizedCurrentUserId, currentUserName]
  );

  const shouldShowReadReceipt = useCallback(
    (currentIndex, message) => {
      if (!isMessageMine(message) || !message.seenByReceiver) {
        return false;
      }

      for (let i = currentIndex + 1; i < messages.length; i += 1) {
        const futureMessage = messages[i];
        if (isMessageMine(futureMessage) && futureMessage.seenByReceiver) {
          return false;
        }
      }

      return true;
    },
    [isMessageMine, messages]
  );

  const isMessageForActiveConversation = useCallback(
    (message) => {
      if (!message) return false;
      if (conversationKey && message.conversationId) {
        return message.conversationId === conversationKey;
      }

      const senderName = message.senderName || '';
      const receiverName = message.receiverName || '';

      return (
        (senderName === selectedUser?.name && receiverName === currentUserName) ||
        (senderName === currentUserName && receiverName === selectedUser?.name)
      );
    },
    [conversationKey, currentUserName, selectedUser?.name]
  );

  useEffect(() => {
    setMessages([]);
    setIsTyping(false);
    setShowEmojiPicker(false);

    if (selectedUser?.id) {
      fetchChatHistory();
      markMessagesAsRead();
    }
  }, [fetchChatHistory, markMessagesAsRead, selectedUser?.id]);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (incoming) => {
      if (!incoming) return;
      if (isMessageForActiveConversation(incoming)) {
        upsertMessage(incoming);
        markMessagesAsRead();
      }
      onNewMessage?.();
    };

    const handleMessageConfirmed = (outgoing) => {
      if (!outgoing) return;
      if (isMessageForActiveConversation(outgoing)) {
        upsertMessage(outgoing);
      }
      onNewMessage?.();
    };

    const handleUserTyping = (data) => {
      if (data.senderId === selectedUser?.id) {
        setIsTyping(true);
      }
    };

    const handleUserStoppedTyping = (data) => {
      if (data.senderId === selectedUser?.id) {
        setIsTyping(false);
      }
    };

    const handleMessageError = (error) => {
      console.error('Message error:', error);
      alert('Failed to send message. Please try again.');
    };

    const handleMessagesReadEvent = ({ readBy }) => {
      const readerId = normalizeId(readBy);
      const selectedId = normalizeId(selectedUser?.id);
      if (!readerId || !selectedId || readerId !== selectedId) return;

      setMessages((prev) =>
        prev.map((msg) =>
          isMessageMine(msg) && !msg.seenByReceiver ? { ...msg, seenByReceiver: true } : msg
        )
      );
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('messageConfirmed', handleMessageConfirmed);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStoppedTyping', handleUserStoppedTyping);
    socket.on('messageError', handleMessageError);
    socket.on('messagesRead', handleMessagesReadEvent);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('messageConfirmed', handleMessageConfirmed);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStoppedTyping', handleUserStoppedTyping);
      socket.off('messageError', handleMessageError);
      socket.off('messagesRead', handleMessagesReadEvent);
    };
  }, [
    socket,
    isMessageForActiveConversation,
    isMessageMine,
    upsertMessage,
    markMessagesAsRead,
    onNewMessage,
    selectedUser?.id,
  ]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  if (loading) {
    return (
      <div className='bg-white rounded shadow h-full flex items-center justify-center'>
        <div className='text-text-secondary'>Loading chat history...</div>
      </div>
    );
  }

  const renderAvatar = (avatar, fallbackName, userId) => {
    if (userId === 'ai') {
      return (
        <div className='w-9 h-9 flex items-center justify-center'>
          <Bot className='w-7 h-7 text-purple-500' />
        </div>
      );
    }

    if (avatar) {
      return (
        <img
          src={avatar}
          alt={fallbackName}
          className='w-9 h-9 rounded-full object-cover border-2 border-white'
        />
      );
    }

    return (
      <div className='w-9 h-9 rounded-full bg-primary-light flex items-center justify-center'>
        <CircleUserRoundIcon className='h-8 w-8 text-primary' />
      </div>
    );
  };

  const maxBubbleWidthClass = 'max-w-[60ch]';

  return (
    <div className='h-full min-h-0 flex flex-col bg-white'>
      {/* Header */}
      <div className='sticky top-0 z-10 bg-white border-b border-border-light h-20 px-5 flex items-center justify-between'>
        <div className='flex items-center justify-between w-full'>
          <div
            className={`flex items-center gap-3 ${isGroupChat ? 'cursor-pointer hover:bg-bg-secondary rounded-lg p-2 -m-2' : ''}`}
            onClick={isGroupChat ? () => onShowMembers(selectedUser) : undefined}
          >
            <div className='relative'>
              {renderAvatar(partnerAvatar, selectedUser?.name, selectedUser?.id)}
              {selectedUser?.id !== 'ai' && (
                <Circle
                  className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 ${
                    isPartnerOnline ? 'text-green-500 fill-current' : 'text-text-muted'
                  }`}
                />
              )}
            </div>
            <div>
              <div className='flex gap-3 items-center'>
                <h2 className={`text-xl font-semibold truncate max-w-[18rem] ${selectedUser?.id === 'ai' ? 'text-purple-500' : 'text-text-main'}`}>
                  {selectedUser?.name}
                </h2>
                {isTyping && <p className='text-sm text-text-secondary italic'>Typing...</p>}
              </div>
                             <div className='flex items-center gap-2 text-sm text-text-secondary'>
               <span>{isPartnerOnline ? 'Online' : 'Offline'}</span>
             </div>
            </div>
          </div>
          {selectedUser?.role && (
            <span className='bg-primary-100 text-primary-700 px-2 py-0.5 rounded text-xs uppercase'>
              {selectedUser.role}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className='flex-1 min-h-0 overflow-y-auto px-5 py-6 space-y-5'>
        {messages.length === 0 ? (
          <div className='text-center text-text-secondary mt-10'>
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isSelf = isMessageMine(message);
            const showBubble = Boolean(message.message?.trim?.());
            const showReadReceipt = shouldShowReadReceipt(index, message);

            return (
              <div
                key={message.id}
                className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-end gap-2 max-w-full ${
                    isSelf ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  {!isSelf && renderAvatar(partnerAvatar, selectedUser?.name, selectedUser?.id)}

                  <div className={`flex flex-col gap-1 text-sm ${maxBubbleWidthClass}`}>
                    {!isSelf && isGroupChat && <div className="text-xs text-text-secondary mb-1">{message.senderName}</div>}
                    <div className="relative group">
                      {showBubble && (
                        <div
                          className={`inline-block px-4 py-2 rounded-2xl leading-relaxed whitespace-pre-wrap break-words shadow-sm ${
                            isSelf
                              ? 'bg-primary text-white'
                              : 'bg-gray-200 text-text-main'
                          }`}
                        >
                          {message.message}
                        </div>
                      )}

                      {Array.isArray(message.attachments) && message.attachments.length > 0 && (
                        <div className='flex flex-col gap-2'>
                          {message.attachments.map((attachment, attachmentIndex) => {
                            const key =
                              attachment.id ||
                              attachment.url ||
                              attachment.name ||
                              `attachment-${attachmentIndex}`;
                            const source = attachment.url || attachment.thumbnailUrl || '';
                            const isImage = isImageAttachment(attachment);

                            if (isImage && source) {
                              return (
                                <img
                                  key={key}
                                  src={source}
                                  alt={attachment.name || 'Shared image'}
                                  className='rounded-2xl border border-border-light max-h-60 object-cover cursor-pointer'
                                  onClick={() => handleImageClick(source)}
                                />
                              );
                            }

                            return (
                              <a
                                key={key}
                                href={source || undefined}
                                download={attachment.name || 'attachment'}
                                target='_blank'
                                rel='noopener noreferrer'
                                className='flex items-center justify-between gap-4 rounded-2xl border border-border-light bg-bg-secondary px-4 py-3 hover:bg-bg-hover transition-colors'
                              >
                                <div className='flex items-center gap-3 min-w-0'>
                                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary'>
                                    <FileText className='h-5 w-5' />
                                  </div>
                                  <div className='min-w-0'>
                                    <p className='truncate text-sm font-medium text-text-main'>{attachment.name || 'Attachment'}</p>
                                    <p className='text-xs text-text-secondary'>
                                      {formatFileSize(attachment.size) || attachment.mimeType || 'Click to download'}
                                    </p>
                                  </div>
                                </div>
                                <Download className='h-4 w-4 shrink-0 text-text-secondary' />
                              </a>
                            );
                          })}
                        </div>
                      )}

                      {isSelf && showReadReceipt && partnerAvatar && (
                        <div className='flex justify-end mt-1 pr-1'>
                          <img
                            src={partnerAvatar}
                            alt='Read receipt'
                            className='w-5 h-5 rounded-full border border-border-light'
                          />
                        </div>
                      )}
                      <div
                        className={`pointer-events-none absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity ${
                          isSelf ? 'right-full mr-1' : 'left-full ml-1'
                        }`}
                      >
                        <span className='bg-gray-700 text-white text-xs px-2 py-1 rounded-full shadow whitespace-nowrap'>
                          {formatHour(message.timestamp)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className='px-5 py-4 flex gap-2 border-t border-border-light bg-white shrink-0'>
        <input
          ref={fileInputRef}
          type='file'
          accept='*/*'
          onChange={handleFileChange}
          className='hidden'
        />
        <div className='relative flex items-center gap-2 w-full'>
          <button
            onClick={toggleEmojiPicker}
            className='p-2 rounded hover:bg-bg-hover text-text-secondary'
            aria-label='Emoji'
            type='button'
          >
            <Smile className='w-5 h-5' />
          </button>

          <button
            onClick={handleSelectFileClick}
            className='p-2 rounded hover:bg-bg-hover text-text-secondary'
            aria-label='Attach file or image'
            type='button'
            disabled={uploadingAttachment}
          >
            <Paperclip className='w-5 h-5' />
          </button>

          {showEmojiPicker && (
            <div className='absolute bottom-12 left-0 bg-white border rounded shadow p-2 w-48 z-50'>
              <div className='grid grid-cols-6 gap-2'>
                {emojiList.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={(e) => {
                      e.preventDefault();
                      handleSelectEmoji(emoji);
                    }}
                    className='p-1 text-lg hover:bg-bg-hover rounded'
                    type='button'
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          <input
            type='text'
            value={newMessage}
            onChange={handleTyping}
            placeholder={`Message ${selectedUser?.name || ''}...`}
            className='flex-1 p-2 bg-bg-hover rounded focus:outline-none focus:ring-2 focus:ring-blue-500'
            disabled={!socket}
          />

          <button
            type='submit'
            disabled={!newMessage.trim() || !socket || uploadingAttachment}
            className='bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {uploadingAttachment ? 'Uploading...' : <Send className='w-5 h-5' />}
          </button>
        </div>
      </form>

      {isViewerOpen && allImages.length > 0 && (
        <ImageViewer
          images={allImages}
          initialUrl={selectedImageUrl}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </div>
  );

};

export default ChatWindow;










