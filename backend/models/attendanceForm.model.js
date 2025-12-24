import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceFormSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['leave', 'device', 'other'],
      default: 'leave',
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: String,
      default: null,
    },
    endDate: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    reviewer: {
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
  },
  {
    timestamps: true,
  }
);

export const AttendanceForm = mongoose.model('AttendanceForm', attendanceFormSchema);













