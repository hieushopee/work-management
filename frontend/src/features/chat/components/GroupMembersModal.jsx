import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Users, CircleUserIcon } from "lucide-react";

const Avatar = ({ user, size = 'h-8 w-8' }) => {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'Member avatar'}
        className={`${size} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  const initials = (user?.name || user?.email || '').slice(0, 2).toUpperCase();

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

export default function GroupMembersModal({ open, onClose, groupName, members, users, currentUser }) {
  const allMembers = [...new Set(currentUser ? [currentUser.id, ...members] : members)];
  const memberDetails = allMembers.map(memberId => {
    const user = users?.find(u => u.id === memberId);
    return user ? { name: user.name, email: user.email } : { name: 'Unknown', email: '' };
  });

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
                <Users className="w-5 h-5 text-gray-500" />
                <h2 className="text-xl font-semibold">{groupName} Members</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-transparent hover:scrollbar-thumb-gray-500">
              {memberDetails.map((member, idx) => {
                const isCurrentUser = currentUser && member.name === currentUser.name;
                return (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                    <Avatar user={users?.find(u => u.name === member.name)} />
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.name} {isCurrentUser && <span className="text-blue-500">(You)</span>}
                      </p>
                      <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                  </div>
                );
              })}
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}