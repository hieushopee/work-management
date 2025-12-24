import mongoose from 'mongoose';

const { Schema } = mongoose;

const salaryAdjustmentRequestSchema = new Schema({
  type: {
    type: String,
    enum: ['increase', 'decrease', 'reimbursement'], // increase: tăng lương, decrease: giảm lương, reimbursement: hoàn tiền
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
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  requestedBy: {
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const salaryHistorySchema = new Schema({
  baseSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  effectiveDate: {
    type: Date,
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  changedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  adjustmentRequestId: {
    type: Schema.Types.ObjectId,
    ref: 'SalaryAdjustmentRequest',
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const salarySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    currency: {
      type: String,
      default: 'VND',
    },
    effectiveDate: {
      type: Date,
      default: Date.now,
    },
    history: [salaryHistorySchema],
    adjustmentRequests: [salaryAdjustmentRequestSchema],
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

salarySchema.index({ userId: 1 }, { unique: true });

export const Salary = mongoose.model('Salary', salarySchema);



