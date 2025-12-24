import mongoose from 'mongoose';

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      default: '',
    },
    receiverName: {
      type: String,
      default: '',
    },
    senderRole: {
      type: String,
      default: '',
    },
    senderAvatar: {
      type: String,
      default: null,
    },
    receiverAvatar: {
      type: String,
      default: null,
    },
    message: {
      type: String,
      required: true,
    },
    conversationId: {
      type: String,
      index: true,
    },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.senderId) ret.senderId = ret.senderId.toString();
        if (ret.receiverId) ret.receiverId = ret.receiverId.toString();
        if (Array.isArray(ret.participants)) {
          ret.participants = ret.participants.map((value) => (value ? value.toString() : value));
        }
        if (ret.workspace != null) {
          ret.workspace = ret.workspace.toString();
        }
        if (ret.timestamp instanceof Date) {
          ret.timestamp = ret.timestamp.toISOString();
        }
        if (ret.readAt instanceof Date) {
          ret.readAt = ret.readAt.toISOString();
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

export const Message = mongoose.model('Message', messageSchema);
