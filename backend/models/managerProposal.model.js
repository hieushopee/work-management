import mongoose from 'mongoose';

const { Schema } = mongoose;

// Đề xuất từ Manager
const managerProposalSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['bonus', 'penalty', 'overtime', 'kpi'],
      required: true,
    },
    targetUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    // Dữ liệu bổ sung tùy theo loại
    metadata: {
      // Cho overtime
      hours: {
        type: Number,
        default: 0,
      },
      date: {
        type: Date,
        default: null,
      },
      // Cho task-related
      taskId: {
        type: Schema.Types.ObjectId,
        ref: 'Task',
        default: null,
      },
      // Cho KPI
      kpiValue: {
        type: Number,
        default: null,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      default: '',
    },
    period: {
      type: String,
      default: null, // Format: "YYYY-MM" để liên kết với payroll
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        if (ret._id != null) {
          ret.id = ret._id.toString();
        } else if (ret.id == null) {
          ret.id = undefined;
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

managerProposalSchema.index({ proposedBy: 1, status: 1 });
managerProposalSchema.index({ targetUserId: 1 });
managerProposalSchema.index({ period: 1 });

export const ManagerProposal = mongoose.model('ManagerProposal', managerProposalSchema);

