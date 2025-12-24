import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, CheckCircle, CircleUserRoundIcon } from "lucide-react";

const Avatar = ({ user, size = 'h-8 w-8' }) => {
  const [imageError, setImageError] = useState(false);
  
  // If user has avatar and no error, display the image (like in header)
  if (user?.avatar && !imageError) {
    return (
      <img
        src={user.avatar}
        alt={user?.name || 'Voter avatar'}
        className={`${size} rounded-full object-cover border-2 border-white`}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback: display CircleUserRoundIcon with primary-light background (like in header)
  const sizeNum = parseInt(size.replace(/\D/g, '')) || 8;
  const iconSize = sizeNum >= 10 ? 'h-10 w-10' : sizeNum >= 8 ? 'h-8 w-8' : 'h-6 w-6';

  return (
    <div className={`${size} rounded-full flex items-center justify-center bg-primary-light`}>
      <CircleUserRoundIcon className={`${iconSize} text-primary`} />
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
            <div className="flex items-center justify-between p-6 border-b border-border-light">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-light rounded-full">
                  <CheckCircle className="w-6 h-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-text-main">Voting Details</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-bg-hover transition-colors"
              >
                <X className="w-6 h-6 text-text-secondary" />
              </button>
            </div>

            <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
              <div className="space-y-6">
                {options.map((option) => (
                  <div key={option.id} className="bg-bg-secondary rounded-2xl p-6 border border-border-light">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-text-main">{option.text}</h3>
                      <span className="px-3 py-1 bg-primary-light text-primary rounded-full text-sm font-medium">
                        {option.voters.length} vote{option.voters.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    {option.voters.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {option.voters.map((voter, idx) => {
                          const user = users.find(u => u.id === voter.id) || voter;
                          return (
                            <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-border-light">
                              <Avatar user={user} />
                              <span className="font-medium text-text-main">{voter.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-text-secondary italic">No votes yet</p>
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
