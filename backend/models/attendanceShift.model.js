import mongoose from 'mongoose';
import { toObjectId } from '../utils/identifiers.js';

const { Schema } = mongoose;

const attendanceShiftSchema = new Schema(
  {
    workspace: { type: Schema.Types.ObjectId, ref: 'Workspace', required: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['day', 'hour'], default: 'day' }, // day = ca theo ngày, hour = ca theo giờ
    startMinutes: { type: Number, required: true }, // phút từ 00:00
    endMinutes: { type: Number, required: true },
    departments: [{ type: String }], // lưu tên phòng ban theo cách dùng hiện tại
    color: { type: String, default: '' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

attendanceShiftSchema.index({ workspace: 1, name: 1 }, { unique: true });

attendanceShiftSchema.methods.belongsToWorkspace = function (workspaceId) {
  return this.workspace?.toString() === toObjectId(workspaceId).toString();
};

export const AttendanceShift = mongoose.model('AttendanceShift', attendanceShiftSchema);
