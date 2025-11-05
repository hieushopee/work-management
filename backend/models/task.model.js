import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    assigneeStatuses: [{
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      status: {
        type: String,
        default: 'todo',
      },
      role: {
        type: String,
        default: 'employee',
      },
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    }],
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      default: 'todo',
    },
    deadline: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      default: 'Normal',
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.deadline instanceof Date) {
          ret.deadline = ret.deadline.toISOString();
        }
        if (Array.isArray(ret.assigneeStatuses)) {
          ret.assigneeStatuses = ret.assigneeStatuses.map((entry) => ({
            user: entry.user ? entry.user.toString() : null,
            status: entry.status,
            role: entry.role,
            updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
          }));
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Task = mongoose.model('Task', taskSchema);
