import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Users, CheckCircle } from "lucide-react";

const Avatar = ({ user, size = 'h-8 w-8' }) => {
  if (user?.avatar) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'Voter avatar'}
        className={`${size} rounded-full object-cover border border-gray-200`}
      />
    );
  }

  const initials = (user?.name || '').slice(0, 2).toUpperCase();

  return (
    <div className={`${size} rounded-full flex items-center justify-center bg-blue-100 border border-gray-200`}>
      {initials ? (
        <span className='text-sm font-semibold text-blue-600'>{initials}</span>
      ) : (
        <Users className='h-4 w-4 text-blue-400' />
      )}
    </div>
  );
};

export default function VoterListModal({ open, onClose, options, users }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Voting Details</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="space-y-6">
                {options.map((option) => (
                  <div key={option.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{option.text}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                        {option.voters.length} vote{option.voters.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {option.voters.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {option.voters.map((voter, idx) => {
                          const user = users.find(u => u.id === voter.id) || voter;
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200">
                              <Avatar user={user} />
                              <span className="font-medium text-gray-900">{voter.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No votes yet</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
