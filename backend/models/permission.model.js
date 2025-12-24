import mongoose from 'mongoose';

const { Schema } = mongoose;

const permissionSchema = new Schema(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    // Target can be a user or department
    targetType: {
      type: String,
      enum: ['user', 'department'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      // Can reference User or Department
    },
    // Module permissions
    modules: {
      tasks: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false }, // Full management access
      },
      forms: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      calendar: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      messages: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      documents: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      attendance: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      salary: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
      employees: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: false },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      },
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
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

// Compound index to ensure unique permission per target
permissionSchema.index({ workspace: 1, targetType: 1, targetId: 1 }, { unique: true });

export const Permission = mongoose.model('Permission', permissionSchema);


