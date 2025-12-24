import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Users, LogOut, CircleUserRoundIcon } from "lucide-react";

const Avatar = ({ user, size = 'h-8 w-8' }) => {
  const [imageError, setImageError] = useState(false);
  
  if (user?.avatar && !imageError) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'Member avatar'}
        className={`${size} rounded-full object-cover border-2 border-white`}
        onError={() => setImageError(true)}
      />
    );
  }

  const sizeNum = parseInt(size.replace(/\D/g, '')) || 8;
  const iconSize = sizeNum >= 10 ? 'h-10 w-10' : sizeNum >= 8 ? 'h-8 w-8' : 'h-6 w-6';

  return (
    <div className={`${size} rounded-full flex items-center justify-center bg-primary-light`}>
      <CircleUserRoundIcon className={`${iconSize} text-primary`} />
    </div>
  );
};

export default function GroupMembersModal({
  open,
  onClose,
  groupName,
  members = [],
  users = [],
  currentUser,
  onLeaveGroup,
  isTeamGroup = false,
  isProcessingLeave = false,
}) {
  const normalizedMembers = useMemo(() => {
    return (members || [])
      .map((member) => {
        if (!member) return null;
        if (typeof member === 'string') return member;
        if (typeof member === 'object') {
          return member.id || member._id || member.userId || null;
        }
        return null;
      })
      .filter(Boolean);
  }, [members]);

  const allMembers = useMemo(() => {
    const combined = currentUser ? [currentUser.id, ...normalizedMembers] : normalizedMembers;
    return [...new Set(combined)];
  }, [normalizedMembers, currentUser]);

  const memberDetails = allMembers.map((memberId) => {
    const userInfo =
      users?.find((u) => u.id === memberId) ||
      (currentUser?.id === memberId ? currentUser : null);

    return {
      id: memberId,
      name: userInfo?.name || 'Unknown member',
      email: userInfo?.email || '',
      avatar: userInfo?.avatar || userInfo?.faceUrl || null,
    };
  });

  const canLeave =
    Boolean(onLeaveGroup) && Boolean(currentUser?.id && allMembers.includes(currentUser.id));

  const leaveLabel = isTeamGroup ? 'Leave Team Chat' : 'Leave Group';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-text-secondary" />
                <h2 className="text-xl font-semibold">{groupName} Members</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-bg-hover"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
              {memberDetails.map((member) => {
                const isCurrentUser = currentUser?.id === member.id;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-bg-secondary">
                    <Avatar user={member} />
                    <div>
                      <p className="font-medium text-text-main">
                        {member.name} {isCurrentUser && <span className="text-primary">(You)</span>}
                      </p>
                      <p className="text-sm text-text-secondary">{member.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {canLeave && (
              <div className="mt-6 border-t border-border-light pt-4">
                <button
                  onClick={onLeaveGroup}
                  disabled={isProcessingLeave}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <LogOut className="w-4 h-4" />
                  {isProcessingLeave ? 'Processing...' : leaveLabel}
                </button>
                {!isTeamGroup && (
                  <p className="mt-2 text-xs text-text-secondary text-center">
                    The group will be automatically deleted if no members remain.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
