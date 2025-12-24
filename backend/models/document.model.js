import mongoose from 'mongoose';

const { Schema } = mongoose;

const documentSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    file: {
      filename: { type: String, required: true },
      originalName: { type: String, required: true },
      path: { type: String, required: true },
      size: { type: Number, required: true },
      mimeType: { type: String, required: true },
    },
    category: {
      type: String,
      enum: ['policy', 'procedure', 'form', 'announcement', 'other'],
      default: 'other',
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
      default: null, // null means company-wide
    },
    visibility: {
      type: String,
      enum: ['company', 'department'],
      default: 'company',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspace: {
      type: Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    tags: [{
      type: String,
      trim: true,
    }],
    isActive: {
      type: Boolean,
      default: true,
    },
    docType: {
      type: String,
      enum: ['company', 'personal'],
      default: 'company',
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },
    submittedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        if (ret._id != null) {
          ret.id = ret._id.toString();
        } else if (ret.id == null) {
          ret.id = undefined;
        }
        if (ret.workspace && ret.workspace._id) {
          ret.workspace = ret.workspace._id.toString();
        } else if (ret.workspace) {
          ret.workspace = ret.workspace.toString();
        }

        // Keep populated department details if available; otherwise normalize to string ID
        const isPopulatedDept = ret.department && typeof ret.department === 'object' && ret.department._id;
        if (isPopulatedDept) {
          const dept = { ...ret.department };
          dept.id = dept._id.toString();
          delete dept._id;
          ret.department = dept;
        } else if (ret.department) {
          ret.department = ret.department.toString();
        }
        // Handle submittedBy: check if it's a populated object (has _id property) or just ObjectId
        if (ret.submittedBy) {
          if (typeof ret.submittedBy === 'object' && ret.submittedBy._id != null && !(ret.submittedBy instanceof mongoose.Types.ObjectId)) {
            // Populated object
            const submitted = { ...ret.submittedBy };
            submitted.id = submitted._id.toString();
            delete submitted._id;
            ret.submittedBy = submitted;
          } else {
            // ObjectId or null
            ret.submittedBy = ret.submittedBy.toString();
          }
        }

        // Handle approvedBy: check if it's a populated object (has _id property) or just ObjectId
        if (ret.approvedBy) {
          if (typeof ret.approvedBy === 'object' && ret.approvedBy._id != null && !(ret.approvedBy instanceof mongoose.Types.ObjectId)) {
            // Populated object
            const approved = { ...ret.approvedBy };
            approved.id = approved._id.toString();
            delete approved._id;
            ret.approvedBy = approved;
          } else {
            // ObjectId or null
            ret.approvedBy = ret.approvedBy.toString();
          }
        }
        delete ret._id;
        delete ret.__v;
      },
    },
  }
);

// Indexes for better query performance
documentSchema.index({ workspace: 1, isActive: 1 });
documentSchema.index({ department: 1, visibility: 1 });
documentSchema.index({ createdBy: 1 });
documentSchema.index({ category: 1 });
documentSchema.index({ workspace: 1, approvalStatus: 1 });

export const Document = mongoose.model('Document', documentSchema);







