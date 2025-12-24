import { Router } from 'express';
import multer from 'multer';
import { protectRoute, ownerRoute } from '../middlewares/auth.middleware.js';
import {
  getAllSalaries,
  getSalaryByUserId,
  updateSalary,
  createAdjustmentRequest,
  reviewAdjustmentRequest,
  getPayrolls,
  getPayrollByUserId,
  upsertPayroll,
  approvePayroll,
  lockPayroll,
  getDailySalaryStats,
  autoCalculatePayroll,
  generatePayrollsForPeriod,
} from '../controllers/salary.controller.js';

const router = Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Salary routes
// Get all salaries (Admin: all, Manager: department only)
router.get('/', protectRoute, getAllSalaries);

// Get salary by user ID
router.get('/:userId', protectRoute, getSalaryByUserId);

// Update salary (Admin/Manager only)
router.put('/:userId', protectRoute, ownerRoute, updateSalary);

// Create adjustment request (Staff only)
router.post('/:userId/adjustment-requests', protectRoute, createAdjustmentRequest);

// Review adjustment request (Admin/Manager only)
router.post('/:userId/adjustment-requests/:requestId/review', protectRoute, ownerRoute, reviewAdjustmentRequest);

// Payroll routes
// Get payrolls (Admin: all, Manager: department only)
router.get('/payrolls/list', protectRoute, ownerRoute, getPayrolls);

// Generate payrolls for a period (Admin/Manager)
router.post('/payrolls/generate', protectRoute, ownerRoute, generatePayrollsForPeriod);

// Get payroll by user ID
router.get('/payrolls/:userId', protectRoute, getPayrollByUserId);

// Create or update payroll (Admin/Manager only)
router.post('/payrolls', protectRoute, ownerRoute, upsertPayroll);

// Auto-calculate payroll from attendance data (Admin/Manager only)
router.post('/payrolls/auto-calculate', protectRoute, ownerRoute, autoCalculatePayroll);

// Approve payroll (Admin/Manager only)
router.post('/payrolls/:payrollId/approve', protectRoute, ownerRoute, approvePayroll);

// Lock payroll (Admin/Manager only)
router.post('/payrolls/:payrollId/lock', protectRoute, ownerRoute, lockPayroll);

// Export payrolls to Excel (Admin/Manager only)
router.get('/payrolls/export/excel', protectRoute, ownerRoute, async (req, res) => {
  try {
    const XLSX = (await import('xlsx')).default;
    const { period, status } = req.query;
    const currentUser = req.user;
    let query = {};

    if (period) {
      query.period = period;
    }

    if (status) {
      query.status = status;
    }

    // Manager can only export payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const { User } = await import('../models/user.model.js');
      const userDepartment = currentUser.department || '';
      const departmentUsers = await User.find({ department: userDepartment }).select('_id');
      const userIds = departmentUsers.map((u) => u._id);
      query.userId = { $in: userIds };
    }

    const { Payroll } = await import('../models/payroll.model.js');
    const payrolls = await Payroll.find(query)
      .populate('userId', 'name email role department')
      .populate('approvedBy', 'name email')
      .sort({ period: -1, createdAt: -1 });

    // Prepare data for Excel
    const excelData = payrolls.map((payroll) => ({
      'Employee ID': payroll.userId?._id?.toString() || '',
      'Employee Name': payroll.userId?.name || '',
      'Email': payroll.userId?.email || '',
      'Role': payroll.userId?.role || '',
      'Department': payroll.userId?.department || '',
      'Period': payroll.period || '',
      'Base Salary': payroll.baseSalary || 0,
      'Bonus': payroll.bonus || 0,
      'Penalty': payroll.penalty || 0,
      'Overtime': payroll.overtime || 0,
      'Total Salary': payroll.totalSalary || 0,
      'Currency': payroll.currency || 'VND',
      'Status': payroll.status || 'pending',
      'Approved By': payroll.approvedBy?.name || '',
      'Approved At': payroll.approvedAt ? new Date(payroll.approvedAt).toISOString() : '',
      'Notes': payroll.notes || '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers for file download
    const filename = `payroll_${period || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error in exportPayrollsToExcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import payrolls from Excel (Admin/Manager only)
router.post('/payrolls/import/excel', protectRoute, ownerRoute, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const XLSX = (await import('xlsx')).default;
    const { toObjectId } = await import('../utils/identifiers.js');
    const { Payroll } = await import('../models/payroll.model.js');
    const { User } = await import('../models/user.model.js');
    const currentUser = req.user;

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      try {
        const employeeId = row['Employee ID'] || row['employeeId'] || row['EmployeeId'];
        const period = row['Period'] || row['period'];
        const baseSalary = Number(row['Base Salary'] || row['baseSalary'] || row['BaseSalary'] || 0);
        const bonus = Number(row['Bonus'] || row['bonus'] || 0);
        const penalty = Number(row['Penalty'] || row['penalty'] || 0);
        const overtime = Number(row['Overtime'] || row['overtime'] || 0);
        const currency = row['Currency'] || row['currency'] || 'VND';
        const status = row['Status'] || row['status'] || 'pending';
        const notes = row['Notes'] || row['notes'] || '';

        if (!employeeId || !period) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Missing Employee ID or Period`);
          continue;
        }

        const userId = toObjectId(employeeId);
        if (!userId) {
          results.failed++;
          results.errors.push(`Row ${i + 2}: Invalid Employee ID`);
          continue;
        }

        // Manager can only import payrolls for users in their department
        if (currentUser && currentUser.role === 'manager') {
          const targetUser = await User.findById(userId).select('department');
          if (!targetUser) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: User not found`);
            continue;
          }
          const userDepartment = currentUser.department || '';
          const targetDepartment = targetUser.department || '';
          if (userDepartment !== targetDepartment) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: User not in your department`);
            continue;
          }
        }

        const totalSalary = baseSalary + bonus - penalty + overtime;

        await Payroll.findOneAndUpdate(
          { userId, period },
          {
            userId,
            period,
            baseSalary,
            bonus,
            penalty,
            overtime,
            totalSalary,
            currency,
            status,
            notes,
          },
          { upsert: true, new: true }
        );

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Imported ${results.success} payrolls successfully, ${results.failed} failed`,
      results,
    });
  } catch (error) {
    console.error('Error in importPayrollsFromExcel:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get daily salary statistics for Staff
router.get('/stats/daily/:userId', protectRoute, getDailySalaryStats);

export default router;
