import mongoose from 'mongoose';

const { Schema } = mongoose;

const attachmentSubSchema = new Schema(
  {
    kind: { type: String, enum: ['image', 'file'], default: 'image' },
    url: { type: String, required: true },
    fileId: { type: String, default: null },
    name: { type: String, default: '' },
    mimeType: { type: String, default: '' },
    size: { type: Number, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    thumbnailUrl: { type: String, default: null },
  },
  { _id: true }
);

const messageSubSchema = new Schema(
  {
    senderId: { type: String, default: null },
    receiverId: { type: String, default: null },
    senderName: { type: String, required: true, trim: true },
    receiverName: { type: String, required: true, trim: true },
    message: { type: String, default: '' },
    messageType: {
      type: String,
      enum: ['text', 'image', 'file', 'mixed'],
      default: 'text',
    },
    attachments: {
      type: [attachmentSubSchema],
      default: [],
    },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const participantDetailSubSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, default: '' },
    role: { type: String, default: '' },
    avatar: { type: String, default: null },
  },
  { _id: true }
);

const participantStateSubSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    lastReadAt: { type: Date, default: null },
  },
  { _id: true }
);

const conversationSchema = new Schema(
  {
    conversationId: { type: String, required: true, unique: true, index: true },
    groupName: { type: String, default: '' },
    groupAvatar: { type: String, default: null },
    groupMembers: { type: [String], default: [] },
    participants: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    participantDetails: {
      type: [participantDetailSubSchema],
      default: [],
    },
    participantStates: {
      type: [participantStateSubSchema],
      default: [],
    },
    messages: {
      type: [messageSubSchema],
      default: [],
    },
    lastMessageAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;

        if (Array.isArray(ret.participants)) {
          ret.participants = ret.participants.map((value) =>
            value && value.toString ? value.toString() : value
          );
        }

        if (Array.isArray(ret.participantDetails)) {
          ret.participantDetails = ret.participantDetails.map((detail) => ({
            ...detail,
            id: detail?._id?.toString?.(),
            _id: undefined,
            userId:
              detail?.userId && detail.userId.toString
                ? detail.userId.toString()
                : detail?.userId ?? null,
          }));
        }

        if (Array.isArray(ret.participantStates)) {
          ret.participantStates = ret.participantStates.map((state) => ({
            ...state,
            id: state?._id?.toString?.(),
            _id: undefined,
            userId:
              state?.userId && state.userId.toString
                ? state.userId.toString()
                : state?.userId ?? null,
            lastReadAt:
              state?.lastReadAt instanceof Date
                ? state.lastReadAt.toISOString()
                : state?.lastReadAt ?? null,
          }));
        }

        if (Array.isArray(ret.messages)) {
          ret.messages = ret.messages.map((msg) => {
            const normalizedAttachments = Array.isArray(msg?.attachments)
              ? msg.attachments.map((attachment) => {
                  const resolvedKind =
                    attachment?.kind ??
                    (attachment?.mimeType?.startsWith('image/') ? 'image' : 'file');

                  return {
                    id: attachment?._id?.toString?.(),
                    kind: resolvedKind,
                    url: attachment?.url ?? null,
                    fileId: attachment?.fileId ?? null,
                    name: attachment?.name ?? '',
                    mimeType: attachment?.mimeType ?? '',
                    size: attachment?.size ?? null,
                    width: attachment?.width ?? null,
                    height: attachment?.height ?? null,
                    thumbnailUrl: attachment?.thumbnailUrl ?? null,
                  };
                })
              : [];

            const hasImage = normalizedAttachments.some((attachment) => attachment.kind === 'image');
            const hasFile = normalizedAttachments.some((attachment) => attachment.kind !== 'image');
            const fallbackType = normalizedAttachments.length
              ? hasImage && hasFile
                ? 'mixed'
                : hasFile
                ? 'file'
                : 'image'
              : 'text';

            return {
              id: msg?._id?.toString?.(),
              senderId: msg?.senderId ?? null,
              receiverId: msg?.receiverId ?? null,
              senderName: msg?.senderName ?? '',
              receiverName: msg?.receiverName ?? '',
              message: msg?.message ?? '',
              messageType: msg?.messageType ?? fallbackType,
              attachments: normalizedAttachments,
              timestamp:
                msg?.timestamp instanceof Date
                  ? msg.timestamp.toISOString()
                  : msg?.timestamp ?? null,
            };
          });
        }
      },
    },
  }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema, 'messages');
