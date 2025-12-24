import mongoose from 'mongoose';

const { Schema } = mongoose;

// Cấu hình chung của bảng lương
const salarySettingsSchema = new Schema(
  {
    // Field để đảm bảo chỉ có một document
    type: {
      type: String,
      default: 'default',
      unique: true,
    },
    // Công thức tính OT (Overtime)
    otRates: {
      weekday: {
        type: Number,
        default: 1.5, // Hệ số OT ngày thường (150%)
        min: 0,
      },
      weekend: {
        type: Number,
        default: 2.0, // Hệ số OT cuối tuần (200%)
        min: 0,
      },
      holiday: {
        type: Number,
        default: 3.0, // Hệ số OT lễ (300%)
        min: 0,
      },
    },
    // Chuẩn KPI
    kpiStandard: {
      type: Number,
      default: 100, // KPI chuẩn (%)
      min: 0,
      max: 100,
    },
    // Mức phạt chuẩn
    standardPenalties: {
      lateArrival: {
        type: Number,
        default: 0, // Phạt đi trễ (VND/lần hoặc VND/phút)
        min: 0,
      },
      unauthorizedLeave: {
        type: Number,
        default: 0, // Phạt nghỉ không phép (VND/ngày)
        min: 0,
      },
      violation: {
        type: Number,
        default: 0, // Phạt vi phạm nội quy (VND/lần)
        min: 0,
      },
      damage: {
        type: Number,
        default: 0, // Phạt làm hư tài sản (VND/lần)
        min: 0,
      },
    },
    // Mức thưởng chuẩn
    standardBonuses: {
      kpi: {
        type: Number,
        default: 0, // Thưởng KPI (VND hoặc %)
        min: 0,
      },
      holiday: {
        type: Number,
        default: 0, // Thưởng lễ/Tết (VND)
        min: 0,
      },
      project: {
        type: Number,
        default: 0, // Thưởng dự án (VND)
        min: 0,
      },
      attendance: {
        type: Number,
        default: 0, // Thưởng chuyên cần (VND)
        min: 0,
      },
      performance: {
        type: Number,
        default: 0, // Thưởng làm tốt (VND)
        min: 0,
      },
    },
    // Phụ cấp chuẩn (có thể áp dụng cho tất cả hoặc theo role)
    standardAllowances: {
      meal: {
        type: Number,
        default: 0, // Phụ cấp ăn trưa (VND/tháng)
        min: 0,
      },
      phone: {
        type: Number,
        default: 0, // Phụ cấp điện thoại (VND/tháng)
        min: 0,
      },
      transport: {
        type: Number,
        default: 0, // Phụ cấp xăng xe (VND/tháng)
        min: 0,
      },
      position: {
        type: Number,
        default: 0, // Phụ cấp chức vụ (VND/tháng)
        min: 0,
      },
      attendance: {
        type: Number,
        default: 0, // Phụ cấp chuyên cần (VND/tháng)
        min: 0,
      },
    },
    // Số ngày phép/năm
    annualLeaveDays: {
      type: Number,
      default: 12,
      min: 0,
    },
    // Bảo hiểm
    insurance: {
      socialInsurance: {
        type: Number,
        default: 8, // % bảo hiểm xã hội
        min: 0,
        max: 100,
      },
      healthInsurance: {
        type: Number,
        default: 1.5, // % bảo hiểm y tế
        min: 0,
        max: 100,
      },
      unemploymentInsurance: {
        type: Number,
        default: 1, // % bảo hiểm thất nghiệp
        min: 0,
        max: 100,
      },
    },
    // Đơn vị tiền tệ
    currency: {
      type: String,
      default: 'VND',
    },
    // Người tạo/cập nhật
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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

// Chỉ có một document settings duy nhất - sử dụng field type với unique

export const SalarySettings = mongoose.model('SalarySettings', salarySettingsSchema);

