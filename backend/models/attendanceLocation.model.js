import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceLocationSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    radiusMeters: { type: Number, default: 50 },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    allowedEmployees: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    allowedDepartments: [{ type: String }],
    flexibleEmployees: [{ type: Schema.Types.ObjectId, ref: 'User' }], // linh động
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceLocationSchema.index({ workspace: 1, name: 1 }, { unique: true });

export const AttendanceLocation = mongoose.model('AttendanceLocation', attendanceLocationSchema);
