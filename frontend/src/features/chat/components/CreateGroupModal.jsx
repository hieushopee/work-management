import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Camera, Users, X, Search, Loader2, CircleUserIcon } from 'lucide-react';
import { matchesSearchTerm, normalizeString } from '../utils/chatUtils';

const GROUP_MEMBER_LIMIT = 100;

const Avatar = ({ user, size = 'h-10 w-10' }) => {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'Member avatar'}
        className={`${size} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  const initials = normalizeString(user?.name || user?.email)
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`${size} rounded-full flex items-center justify-center bg-gray-100 border border-gray-200`}>
      {initials ? (
        <span className='text-sm font-semibold text-gray-500'>{initials}</span>
      ) : (
        <CircleUserIcon className='h-5 w-5 text-gray-400' />
      )}
    </div>
  );
};

const CreateGroupModal = ({ open, onClose, availableUsers = [], currentUser, onCreateGroup, existingGroups = [] }) => {
  const [groupName, setGroupName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateError, setDuplicateError] = useState('');

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    setGroupName('');
    setSearchTerm('');
    setSelectedMembers([]);
    setAvatarFile(null);
    setAvatarPreview('');
    setIsSubmitting(false);
    setDuplicateError('');

    const focusTimer = setTimeout(() => {
      modalRef.current?.querySelector('input[data-group-name]')?.focus();
    }, 80);

    return () => clearTimeout(focusTimer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const uniqueAvailableUsers = useMemo(() => {
    const unique = new Map();
    (availableUsers || []).forEach((user) => {
      const id = normalizeString(user?.id);
      if (!id) return;
      if (!unique.has(id)) {
        unique.set(id, { ...user, id });
      }
    });
    return Array.from(unique.values());
  }, [availableUsers]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return uniqueAvailableUsers.filter((user) => matchesSearchTerm(term, user));
  }, [searchTerm, uniqueAvailableUsers]);

  const isSelected = useCallback(
    (userId) => selectedMembers.some((member) => member.id === userId),
    [selectedMembers]
  );

  const toggleMember = useCallback(
    (candidate) => {
      if (!candidate?.id) return;
      setSelectedMembers((prev) => {
        const exists = prev.some((member) => member.id === candidate.id);
        if (exists) {
          return prev.filter((member) => member.id !== candidate.id);
        }
        if (prev.length >= GROUP_MEMBER_LIMIT) {
          return prev;
        }
        return [...prev, candidate];
      });
    },
    []
  );

  const selectedCount = selectedMembers.length;

  const handleAvatarFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarFile(file);
      setAvatarPreview(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.readAsDataURL(file);
  };

  const clearAvatar = () => {
    setAvatarFile(null);
    setAvatarPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!groupName.trim() || isSubmitting) return;
    if (!selectedMembers.length) return;

    // Check for duplicate group
    const allMemberIds = currentUser ? [currentUser.id, ...selectedMembers.map(m => m.id)].sort() : selectedMembers.map(m => m.id).sort();
    
    const duplicateGroup = existingGroups.find(group => {
      if (!group.members || group.members.length !== allMemberIds.length) return false;
      const groupMemberIds = group.members.map(m => typeof m === 'string' ? m : m.id).sort();
      return JSON.stringify(groupMemberIds) === JSON.stringify(allMemberIds);
    });

    if (duplicateGroup) {
      const isTeamGroup = (duplicateGroup.conversation?.conversationId || duplicateGroup.id || '').startsWith('team:');
      if (isTeamGroup) {
        setDuplicateError(`A team chat with these members already exists: "${duplicateGroup.name}".`);
      } else {
        setDuplicateError('A group chat with these members already exists.');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setDuplicateError('');
      await onCreateGroup?.({
        name: groupName.trim(),
        members: currentUser ? [currentUser, ...selectedMembers] : selectedMembers,
        invitedMembers: selectedMembers,
        avatarFile,
        avatarPreview,
      });
      onClose?.();
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        'Unable to create group chat. Please choose different members.';
      setDuplicateError(message);
      console.error('Error creating group:', error);
      return;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  if (!open) return null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6'
      onClick={handleOverlayClick}
    >
      <div
        ref={modalRef}
        className='relative w-full max-w-4xl rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 animate-in fade-in zoom-in duration-200'
      >
        <header className='flex items-center justify-between border-b border-gray-100 px-6 py-4'>
          <div>
            <h2 className='text-xl font-semibold text-gray-900'>Create Group Chat</h2>
            <p className='text-sm text-gray-500'>Chat with multiple teammates at once.</p>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='rounded-full p-2 text-gray-500 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
            aria-label='Close group modal'
          >
            <X className='h-5 w-5' />
          </button>
        </header>

        <div className='grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]'>
          <div className='space-y-6'>
            <div className='flex items-center gap-4'>
              <div className='relative'>
                <div className='h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-200'>
                  {avatarPreview ? (
                    <img src={avatarPreview} alt='Group avatar preview' className='h-full w-full object-cover' />
                  ) : (
                    <Users className='h-7 w-7 text-gray-400' />
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleAvatarFileChange}
                />
                <button
                  type='button'
                  onClick={() => fileInputRef.current?.click()}
                  className='absolute -bottom-1 -right-1 rounded-full bg-blue-500 p-1 text-white shadow hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
                  aria-label='Choose group avatar'
                >
                  <Camera className='h-4 w-4' />
                </button>
                {avatarPreview && (
                  <button
                    type='button'
                    onClick={clearAvatar}
                    className='absolute -top-1 -right-1 rounded-full bg-white/90 p-1 text-gray-600 shadow hover:text-gray-900'
                    aria-label='Remove group avatar'
                  >
                    <X className='h-3 w-3' />
                  </button>
                )}
              </div>

              <div className='flex-1'>
                <input
                  data-group-name
                  type='text'
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder='Group name'
                  className='w-full rounded-xl border border-gray-200 px-4 py-3 text-base font-medium text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200'
                />
                <p className='mt-1 text-xs text-gray-500'>Please choose a name before creating the group.</p>
                {duplicateError && (
                  <p className='mt-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200'>
                    {duplicateError}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400' />
                <input
                  type='text'
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder='Search members'
                  className='w-full rounded-full bg-gray-100 pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400'
                />
              </div>
              <p className='mt-2 text-xs text-gray-400'>You can invite up to {GROUP_MEMBER_LIMIT} people (not counting yourself).</p>
            </div>

            <div className='rounded-2xl border border-gray-200 shadow-sm overflow-hidden'>
              <div className='bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-600'>
                <span>Suggested contacts</span>
              </div>
              <ul className='max-h-80 divide-y divide-gray-100 overflow-y-auto pr-1'>
                {filteredUsers.length === 0 && (
                  <li className='py-6 text-center text-sm text-gray-500'>No members match your search.</li>
                )}
                {filteredUsers.map((user) => {
                  const active = isSelected(user.id);
                  return (
                    <li key={user.id}>
                      <button
                        type='button'
                        onClick={() => toggleMember(user)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          active ? 'bg-blue-50/80' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          active ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 text-transparent'
                        }`}>
                          ✓
                        </span>
                        <Avatar user={user} size='h-10 w-10' />
                        <div className='min-w-0 flex-1'>
                          <p className='truncate text-sm font-medium text-gray-900'>{user.name}</p>
                          <p className='truncate text-xs text-gray-500'>{user.email || user.role || 'Member'}</p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside className='flex h-full flex-col rounded-2xl border border-gray-200 bg-gray-50 shadow-sm'>
            <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3'>
              <div>
                <p className='text-sm font-semibold text-gray-900'>Selected members</p>
                <p className='text-xs text-gray-500'>Includes you and {selectedMembers.length} others.</p>
              </div>
              <span className='text-xs font-medium text-blue-500'>
                {selectedCount}/{GROUP_MEMBER_LIMIT}
              </span>
            </div>

            <div className='flex-1 space-y-3 overflow-y-auto px-4 py-4'>
              {currentUser && (
                <div className='flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm'>
                  <Avatar user={currentUser} size='h-8 w-8' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-gray-900'>{currentUser.name || 'You'}</p>
                    <p className='truncate text-xs text-gray-500'>You</p>
                  </div>
                </div>
              )}

              {selectedMembers.length === 0 && (
                <div className='rounded-xl border border-dashed border-gray-300 bg-white/70 px-4 py-8 text-center text-sm text-gray-500'>
                  No members selected yet. Choose from the list on the left.
                </div>
              )}

              {selectedMembers.map((member) => (
                <div key={member.id} className='flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-sm'>
                  <Avatar user={member} size='h-8 w-8' />
                  <div className='min-w-0 flex-1'>
                    <p className='truncate text-sm font-medium text-gray-900'>{member.name}</p>
                    <p className='truncate text-xs text-gray-500'>{member.email || member.role || 'Member'}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => toggleMember(member)}
                    className='rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                    aria-label={`Remove ${member.name}`}
                  >
                    <X className='h-4 w-4' />
                  </button>
                </div>
              ))}
            </div>

            <div className='flex items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3'>
              <button
                type='button'
                onClick={onClose}
                className='rounded-full px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100'
              >
                Cancel
              </button>
              <button
                type='button'
                onClick={handleSubmit}
                disabled={!groupName.trim() || !selectedMembers.length || isSubmitting}
                className='inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    <span>Creating…</span>
                  </>
                ) : (
                  'Create group'
                )}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
