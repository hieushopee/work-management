import mongoose from 'mongoose';

const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    success: {
      type: Boolean,
      default: false,
    },
    at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const shiftLogSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    totalMinutes: {
      type: Number,
      default: 0,
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const reportAttachmentSchema = new Schema(
  {
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    size: {
      type: Number,
      default: 0,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: false }
);

const calendarEventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    assignedTo: {
      type: [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
    },
    createdById: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdByName: {
      type: String,
      default: null,
    },
    createdByEmail: {
      type: String,
      default: null,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      default: null,
    },
    attendance: {
      type: [attendanceSchema],
      default: [],
    },
    taskDescription: {
      type: String,
      default: '',
      trim: true,
    },
    reportNotes: {
      type: String,
      default: '',
      trim: true,
    },
    shiftLogs: {
      type: [shiftLogSchema],
      default: [],
    },
    reportAttachments: {
      type: [reportAttachmentSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toObject: { virtuals: true },
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        if (ret.startDate instanceof Date) {
          ret.startDate = ret.startDate.toISOString();
        }
        if (ret.endDate instanceof Date) {
          ret.endDate = ret.endDate.toISOString();
        }
        if (Array.isArray(ret.assignedTo)) {
          ret.assignedTo = ret.assignedTo.map((id) => id && id.toString());
        }
        if (Array.isArray(ret.attendance)) {
          ret.attendance = ret.attendance.map((entry) => ({
            ...entry,
            userId: entry.userId ? entry.userId.toString() : null,
            at: entry.at instanceof Date ? entry.at.toISOString() : entry.at,
          }));
        }
        if (Array.isArray(ret.shiftLogs)) {
          ret.shiftLogs = ret.shiftLogs.map((entry) => ({
            ...entry,
            userId: entry.userId ? entry.userId.toString() : null,
            startedAt: entry.startedAt instanceof Date ? entry.startedAt.toISOString() : entry.startedAt,
            endedAt: entry.endedAt instanceof Date ? entry.endedAt.toISOString() : entry.endedAt,
          }));
        }
        if (Array.isArray(ret.reportAttachments)) {
          ret.reportAttachments = ret.reportAttachments.map((attachment) => ({
            id: attachment._id ? attachment._id.toString() : undefined,
            filename: attachment.filename,
            originalName: attachment.originalName,
            mimeType: attachment.mimeType,
            size: attachment.size || 0,
            url: attachment.url,
          }));
        }
        if (ret.createdById) {
          ret.createdById = ret.createdById.toString();
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

calendarEventSchema.index({ startDate: 1, endDate: 1 });

export const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);

