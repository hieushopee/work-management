import mongoose from 'mongoose';

const { Schema } = mongoose;

const payrollSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    period: {
      type: String,
      required: true,
      // Format: "YYYY-MM" (e.g., "2025-11")
    },
    // Lương cơ bản (từ Salary model)
    baseSalary: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    // Phụ cấp
    allowances: {
      meal: {
        type: Number,
        default: 0, // Phụ cấp ăn trưa
        min: 0,
      },
      phone: {
        type: Number,
        default: 0, // Phụ cấp điện thoại
        min: 0,
      },
      transport: {
        type: Number,
        default: 0, // Phụ cấp xăng xe
        min: 0,
      },
      position: {
        type: Number,
        default: 0, // Phụ cấp chức vụ
        min: 0,
      },
      attendance: {
        type: Number,
        default: 0, // Phụ cấp chuyên cần
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Thưởng
    bonuses: {
      kpi: {
        type: Number,
        default: 0, // Thưởng KPI
        min: 0,
      },
      holiday: {
        type: Number,
        default: 0, // Thưởng lễ/Tết
        min: 0,
      },
      project: {
        type: Number,
        default: 0, // Thưởng dự án
        min: 0,
      },
      attendance: {
        type: Number,
        default: 0, // Thưởng chuyên cần
        min: 0,
      },
      performance: {
        type: Number,
        default: 0, // Thưởng làm tốt
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Phạt
    penalties: {
      lateArrival: {
        type: Number,
        default: 0, // Phạt đi trễ
        min: 0,
      },
      unauthorizedLeave: {
        type: Number,
        default: 0, // Phạt nghỉ không phép
        min: 0,
      },
      violation: {
        type: Number,
        default: 0, // Phạt vi phạm nội quy
        min: 0,
      },
      damage: {
        type: Number,
        default: 0, // Phạt làm hư tài sản
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Tăng ca
    overtime: {
      hours: {
        type: Number,
        default: 0, // Số giờ OT
        min: 0,
      },
      weekday: {
        type: Number,
        default: 0, // Lương OT ngày thường (150%)
        min: 0,
      },
      weekend: {
        type: Number,
        default: 0, // Lương OT cuối tuần (200%)
        min: 0,
      },
      holiday: {
        type: Number,
        default: 0, // Lương OT lễ (300%)
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Bảo hiểm
    insurance: {
      socialInsurance: {
        type: Number,
        default: 0, // BHXH (8%)
        min: 0,
      },
      healthInsurance: {
        type: Number,
        default: 0, // BHYT (1.5%)
        min: 0,
      },
      unemploymentInsurance: {
        type: Number,
        default: 0, // BHTN (1%)
        min: 0,
      },
      total: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    // Dữ liệu từ chấm công
    attendanceData: {
      workingDays: {
        type: Number,
        default: 0, // Số ngày đi làm
        min: 0,
      },
      lateDays: {
        type: Number,
        default: 0, // Số ngày đi muộn
        min: 0,
      },
      leaveDays: {
        type: Number,
        default: 0, // Số ngày nghỉ phép
        min: 0,
      },
      unauthorizedLeaveDays: {
        type: Number,
        default: 0, // Số ngày nghỉ không phép
        min: 0,
      },
      overtimeHours: {
        type: Number,
        default: 0, // Tổng số giờ OT
        min: 0,
      },
    },
    // Tổng lương
    grossSalary: {
      type: Number,
      default: 0, // Tổng trước khi trừ bảo hiểm (baseSalary + allowances + bonuses + overtime)
      min: 0,
    },
    totalSalary: {
      type: Number,
      required: true,
      min: 0, // Tổng thực nhận (grossSalary - penalties - insurance)
    },
    currency: {
      type: String,
      default: 'VND',
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'locked'],
      default: 'pending',
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
    lockedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lockedAt: {
      type: Date,
      default: null,
    },
    notes: {
      type: String,
      default: '',
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

// Compound index to ensure one payroll per user per period
payrollSchema.index({ userId: 1, period: 1 }, { unique: true });
payrollSchema.index({ period: 1 });
payrollSchema.index({ status: 1 });

export const Payroll = mongoose.model('Payroll', payrollSchema);



