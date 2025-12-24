import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
  {
    assignedTo: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    assignedTeams: [{
      type: Schema.Types.ObjectId,
      ref: 'Team',
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
      default: 'Medium',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    comments: [
      {
        author: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        authorName: {
          type: String,
          default: '',
        },
        message: {
          type: String,
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        editedAt: {
          type: Date,
          default: null,
        },
      },
    ],
    checklist: [
      {
        title: {
          type: String,
          required: true,
        },
        assignedTo: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        dueDate: {
          type: Date,
          default: null,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        completedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        completedAt: {
          type: Date,
          default: null,
        },
        createdBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: null,
        },
      },
    ],
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
        if (Array.isArray(ret.comments)) {
          ret.comments = ret.comments.map((comment) => ({
            id: comment._id ? comment._id.toString() : undefined,
            author: comment.author ? comment.author.toString() : null,
            authorName: comment.authorName || '',
            message: comment.message || '',
            createdAt: comment.createdAt instanceof Date ? comment.createdAt.toISOString() : comment.createdAt,
            editedAt: comment.editedAt instanceof Date ? comment.editedAt.toISOString() : comment.editedAt,
          }));
        }
        if (Array.isArray(ret.checklist)) {
          ret.checklist = ret.checklist.map((item) => ({
            id: item._id ? item._id.toString() : undefined,
            title: item.title || '',
            completed: Boolean(item.completed),
            createdBy: item.createdBy ? item.createdBy.toString() : null,
            createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
            completedBy: item.completedBy ? item.completedBy.toString() : null,
            completedAt: item.completedAt instanceof Date ? item.completedAt.toISOString() : item.completedAt,
            assignedTo: item.assignedTo ? item.assignedTo.toString() : null,
            dueDate: item.dueDate instanceof Date ? item.dueDate.toISOString() : item.dueDate,
            updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
          }));
        }
        if (Array.isArray(ret.assignedTeams)) {
          ret.assignedTeams = ret.assignedTeams.map(team => {
              if (team._id) {
                  team.id = team._id.toString();
                  delete team._id;
                  delete team.__v;
              }
              return team;
          });
        }
        if (ret.createdBy) {
          ret.createdBy = ret.createdBy.toString();
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

export const Task = mongoose.model('Task', taskSchema);
