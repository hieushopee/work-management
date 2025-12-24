import mongoose from 'mongoose';

const { Schema } = mongoose;

const deviceInfoSchema = new Schema(
  {
    deviceId: { type: String, default: '' },
    deviceName: { type: String, default: '' },
    deviceType: { type: String, default: '' },
  },
  { _id: false }
);

const attendanceDeviceRequestSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    oldDevice: { type: deviceInfoSchema, default: () => ({}) },
    newDevice: { type: deviceInfoSchema, default: () => ({}) },
    requireGps: { type: Boolean, default: true },
    requestedAt: { type: Date, default: Date.now },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

attendanceDeviceRequestSchema.index({ workspace: 1, user: 1, status: 1 });

export const AttendanceDeviceRequest = mongoose.model('AttendanceDeviceRequest', attendanceDeviceRequestSchema);
