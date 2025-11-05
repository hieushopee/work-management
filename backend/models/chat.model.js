import mongoose from 'mongoose';

const { Schema } = mongoose;

const chatMessageSchema = new Schema(
  {
    role: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const chatSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: 'New Conversation',
    },
    messages: {
      type: [chatMessageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        if (Array.isArray(ret.messages)) {
          ret.messages = ret.messages.map((message) => ({
            ...message,
            timestamp:
              message.timestamp instanceof Date
                ? message.timestamp.toISOString()
                : message.timestamp,
          }));
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Chat = mongoose.models.Chat || mongoose.model('Chat', chatSchema, 'chats');
