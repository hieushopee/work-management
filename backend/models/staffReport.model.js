import mongoose from 'mongoose';

const { Schema } = mongoose;

// Báo cáo từ Staff về sai sót lương
const staffReportSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['bonus_error', 'penalty_error', 'overtime_error', 'other'],
      required: true,
    },
    period: {
      type: String,
      required: true, // Format: "YYYY-MM"
    },
    description: {
      type: String,
      required: true,
    },
    expectedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    actualAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    difference: {
      type: Number,
      default: 0,
    },
    // Liên kết với payroll nếu có
    payrollId: {
      type: Schema.Types.ObjectId,
      ref: 'Payroll',
      default: null,
    },
    // Liên kết với proposal nếu có
    proposalId: {
      type: Schema.Types.ObjectId,
      ref: 'ManagerProposal',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'reviewing', 'resolved', 'rejected'],
      default: 'pending',
    },
    reportedBy: {
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
    resolutionNote: {
      type: String,
      default: '',
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

staffReportSchema.index({ reportedBy: 1, status: 1 });
staffReportSchema.index({ period: 1 });
staffReportSchema.index({ payrollId: 1 });

export const StaffReport = mongoose.model('StaffReport', staffReportSchema);

