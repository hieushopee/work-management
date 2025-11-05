import mongoose from 'mongoose';

const { Schema } = mongoose;

const voterSchema = new Schema(
  {
    id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      default: null,
    },
  },
  { _id: false }
);

const optionSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    votes: {
      type: Number,
      default: 0,
    },
    voters: {
      type: [voterSchema],
      default: [],
    },
  },
  { _id: false }
);

const formSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [optionSchema],
      default: [],
    },
    duration: {
      type: String,
      default: 'forever',
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    pinnedAt: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.ownerId) {
          ret.ownerId = ret.ownerId.toString();
        }
        if (ret.createdAt instanceof Date) {
          ret.createdAt = ret.createdAt.getTime();
        }
        if (ret.updatedAt instanceof Date) {
          ret.updatedAt = ret.updatedAt.getTime();
        }
        if (Array.isArray(ret.options)) {
          ret.options = ret.options.map((option) => ({
            ...option,
            voters: Array.isArray(option.voters)
              ? option.voters.map((voter) => ({
                  ...voter,
                  id: voter.id ? voter.id.toString() : null,
                }))
              : [],
          }));
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

formSchema.index({ isPinned: -1, pinnedAt: -1, createdAt: -1 });

export const Form = mongoose.model('Form', formSchema);
