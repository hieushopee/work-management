import mongoose from 'mongoose';

const { Schema } = mongoose;

const checkInfoSchema = new Schema(
  {
    time: { type: Date, default: null },
    photos: [{ type: String }],
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    deviceId: { type: String, default: '' },
  },
  { _id: false }
);

const attendanceLogSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shift: { type: Schema.Types.ObjectId, ref: 'AttendanceShift', default: null },
    location: { type: Schema.Types.ObjectId, ref: 'AttendanceLocation', default: null },
    status: { type: String, enum: ['in-progress', 'completed'], default: 'in-progress' },
    checkin: { type: checkInfoSchema, default: () => ({}) },
    checkout: { type: checkInfoSchema, default: () => ({}) },
    lateMinutes: { type: Number, default: 0 },
    earlyMinutes: { type: Number, default: 0 },
    overtimeMinutes: { type: Number, default: 0 },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

attendanceLogSchema.index({ workspace: 1, user: 1, 'checkin.time': 1 });

export const AttendanceLog = mongoose.model('AttendanceLog', attendanceLogSchema);
