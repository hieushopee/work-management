import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceAssignmentSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    shift: { type: Schema.Types.ObjectId, ref: 'AttendanceShift', required: true },
    flexible: { type: Boolean, default: false },
    mode: { type: String, enum: ['employee', 'shift', 'day', 'week'], default: 'employee' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceAssignmentSchema.index({ workspace: 1, user: 1, date: 1 }, { unique: true });

export const AttendanceAssignment = mongoose.model('AttendanceAssignment', attendanceAssignmentSchema);
