import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceRuleSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true, unique: true },
    delayToleranceMinutes: { type: Number, default: 10 },
    leaveEarlyToleranceMinutes: { type: Number, default: 10 },
    allowOutsideLocation: { type: Boolean, default: false },
    allowOutsideDevice: { type: Boolean, default: false },
    holidayOvertimeRate: { type: Number, default: 3 }, // multiplier for working on public holidays (e.g., 3 = 300%)
  },
  { timestamps: true }
);

export const AttendanceRule = mongoose.model('AttendanceRule', attendanceRuleSchema);
