import { Salary } from '../models/salary.model.js';
import { Payroll } from '../models/payroll.model.js';
import { SalarySettings } from '../models/salarySettings.model.js';
import { User } from '../models/user.model.js';
import { CalendarEvent } from '../models/calendar.model.js';
import { toObjectId, normalizeId } from '../utils/identifiers.js';

// Get all salaries (Admin: all, Manager: department only)
export const getAllSalaries = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = {};

    // Manager can only see salaries in their department
    if (currentUser && currentUser.role === 'manager') {
      const userDepartment = currentUser.department || '';
      // Get all users in the department
      const departmentUsers = await User.find({ department: userDepartment }).select('_id');
      const userIds = departmentUsers.map((u) => u._id);
      query.userId = { $in: userIds };
    }
    // Admin can see all salaries

    const salaries = await Salary.find(query)
      .populate('userId', 'name email role department avatar')
      .populate('history.changedBy', 'name email')
      .populate('adjustmentRequests.requestedBy', 'name email')
      .populate('adjustmentRequests.reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, salaries });
  } catch (error) {
    console.error('Error in getAllSalaries:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get salary by user ID
export const getSalaryByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Staff can only see their own salary
    if (currentUser && currentUser.role === 'staff') {
      const currentUserId = toObjectId(currentUser.id);
      if (!currentUserId || !currentUserId.equals(targetUserId)) {
        return res.status(403).json({ error: 'Access denied. You can only view your own salary.' });
      }
    }

    // Manager can only see salaries in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only view salaries in your department.' });
      }
    }

    let salary = await Salary.findOne({ userId: targetUserId })
      .populate('userId', 'name email role department avatar')
      .populate('history.changedBy', 'name email')
      .populate('adjustmentRequests.requestedBy', 'name email')
      .populate('adjustmentRequests.reviewedBy', 'name email');

    // If salary doesn't exist, create one with default values
    if (!salary) {
      salary = await Salary.create({
        userId: targetUserId,
        baseSalary: 0,
        currency: 'VND',
        effectiveDate: new Date(),
      });
      salary = await Salary.findById(salary._id)
        .populate('userId', 'name email role department avatar')
        .populate('history.changedBy', 'name email')
        .populate('adjustmentRequests.requestedBy', 'name email')
        .populate('adjustmentRequests.reviewedBy', 'name email');
    }

    res.json({ success: true, salary });
  } catch (error) {
    console.error('Error in getSalaryByUserId:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update salary (Admin: all, Manager: department only)
export const updateSalary = async (req, res) => {
  try {
    const { userId } = req.params;
    const { baseSalary, currency, reason } = req.body;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Manager can only update salaries in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only update salaries in your department.' });
      }
    }

    // Staff cannot update salaries
    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Staff cannot update salaries.' });
    }

    let salary = await Salary.findOne({ userId: targetUserId });

    if (!salary) {
      salary = await Salary.create({
        userId: targetUserId,
        baseSalary: baseSalary || 0,
        currency: currency || 'VND',
        effectiveDate: new Date(),
      });
    }

    const oldSalary = salary.baseSalary;
    const newSalary = baseSalary || salary.baseSalary;

    // Update salary
    salary.baseSalary = newSalary;
    if (currency) {
      salary.currency = currency;
    }
    salary.effectiveDate = new Date();

    // Add to history if salary changed
    if (oldSalary !== newSalary) {
      salary.history.push({
        baseSalary: newSalary,
        effectiveDate: new Date(),
        reason: reason || 'Salary updated',
        changedBy: toObjectId(currentUser.id),
      });
    }

    await salary.save();

    const updatedSalary = await Salary.findById(salary._id)
      .populate('userId', 'name email role department avatar')
      .populate('history.changedBy', 'name email')
      .populate('adjustmentRequests.requestedBy', 'name email')
      .populate('adjustmentRequests.reviewedBy', 'name email');

    res.json({ success: true, salary: updatedSalary });
  } catch (error) {
    console.error('Error in updateSalary:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create salary adjustment request (Staff only)
export const createAdjustmentRequest = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type, amount, reason, description } = req.body;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only staff can create adjustment requests for themselves
    if (currentUser && currentUser.role === 'staff') {
      const currentUserId = toObjectId(currentUser.id);
      if (!currentUserId || !currentUserId.equals(targetUserId)) {
        return res.status(403).json({ error: 'Access denied. You can only create requests for yourself.' });
      }
    } else {
      return res.status(403).json({ error: 'Access denied. Only staff can create adjustment requests.' });
    }

    if (!type || !['increase', 'decrease', 'reimbursement'].includes(type)) {
      return res.status(400).json({ error: 'Invalid request type' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    let salary = await Salary.findOne({ userId: targetUserId });

    if (!salary) {
      salary = await Salary.create({
        userId: targetUserId,
        baseSalary: 0,
        currency: 'VND',
        effectiveDate: new Date(),
      });
    }

    salary.adjustmentRequests.push({
      type,
      amount,
      reason: reason.trim(),
      description: description || '',
      requestedBy: toObjectId(currentUser.id),
      status: 'pending',
    });

    await salary.save();

    const updatedSalary = await Salary.findById(salary._id)
      .populate('userId', 'name email role department avatar')
      .populate('history.changedBy', 'name email')
      .populate('adjustmentRequests.requestedBy', 'name email')
      .populate('adjustmentRequests.reviewedBy', 'name email');

    res.json({ success: true, salary: updatedSalary });
  } catch (error) {
    console.error('Error in createAdjustmentRequest:', error);
    res.status(500).json({ error: error.message });
  }
};

// Review adjustment request (Admin/Manager only)
export const reviewAdjustmentRequest = async (req, res) => {
  try {
    const { userId, requestId } = req.params;
    const { status, reviewNote } = req.body;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only admin and manager can review requests
    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Only admin and manager can review requests.' });
    }

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const salary = await Salary.findOne({ userId: targetUserId });

    if (!salary) {
      return res.status(404).json({ error: 'Salary not found' });
    }

    const request = salary.adjustmentRequests.id(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Adjustment request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'Request has already been reviewed' });
    }

    // Manager can only review requests for users in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only review requests in your department.' });
      }
    }

    // Update request status
    request.status = status;
    request.reviewedBy = toObjectId(currentUser.id);
    request.reviewedAt = new Date();
    request.reviewNote = reviewNote || '';

    // If approved and it's a salary adjustment, update the salary
    if (status === 'approved' && (request.type === 'increase' || request.type === 'decrease')) {
      const oldSalary = salary.baseSalary;
      let newSalary = oldSalary;

      if (request.type === 'increase') {
        newSalary = oldSalary + request.amount;
      } else if (request.type === 'decrease') {
        newSalary = Math.max(0, oldSalary - request.amount);
      }

      salary.baseSalary = newSalary;
      salary.effectiveDate = new Date();

      // Add to history
      salary.history.push({
        baseSalary: newSalary,
        effectiveDate: new Date(),
        reason: request.reason,
        changedBy: toObjectId(currentUser.id),
        adjustmentRequestId: request._id,
      });
    }

    await salary.save();

    const updatedSalary = await Salary.findById(salary._id)
      .populate('userId', 'name email role department avatar')
      .populate('history.changedBy', 'name email')
      .populate('adjustmentRequests.requestedBy', 'name email')
      .populate('adjustmentRequests.reviewedBy', 'name email');

    res.json({ success: true, salary: updatedSalary });
  } catch (error) {
    console.error('Error in reviewAdjustmentRequest:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get payrolls (Admin: all, Manager: department only)
export const getPayrolls = async (req, res) => {
  try {
    const { period, status } = req.query;
    const currentUser = req.user;
    let query = {};

    if (period) {
      query.period = period; // Format: "YYYY-MM"
    }

    if (status) {
      query.status = status;
    }

    // Manager can only see payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const userDepartment = currentUser.department || '';
      const departmentUsers = await User.find({ department: userDepartment }).select('_id');
      const userIds = departmentUsers.map((u) => u._id);
      query.userId = { $in: userIds };
    }
    // Admin can see all payrolls

    const payrolls = await Payroll.find(query)
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email')
      .sort({ period: -1, createdAt: -1 });

    // Fallback: include users with Salary but missing payroll for this period
    const settings = await SalarySettings.findOne({ type: 'default' });
    const standardAllowances = settings?.standardAllowances || {};
    const standardBonuses = settings?.standardBonuses || {};
    const standardPenalties = settings?.standardPenalties || {};

    const allowanceTotal = Object.values(standardAllowances).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const bonusTotal = Object.values(standardBonuses).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const penaltyTotal = Object.values(standardPenalties).reduce((sum, val) => sum + (Number(val) || 0), 0);

    const payrollKey = (userId, per) => `${String(userId)}-${per || 'all'}`;
    const existingKeys = new Set();
    payrolls.forEach((p) => {
      const key = payrollKey(p.userId?._id || p.userId, p.period);
      existingKeys.add(key);
    });

    const targetPeriod =
      period ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();

    // Respect department filter for managers
    const salaryFilter = query.userId ? { userId: query.userId } : {};
    const salaryRecords = await Salary.find(salaryFilter)
      .populate('userId', 'name email role department avatar')
      .select('userId baseSalary currency');

    const fallbackPayrolls = salaryRecords
      .filter((s) => s?.userId)
      .map((s) => {
        const key = payrollKey(s.userId._id || s.userId, targetPeriod);
        if (existingKeys.has(key)) return null;
        const baseSalary = Number(s.baseSalary) || 0;
        const totalSalary = baseSalary + allowanceTotal + bonusTotal - penaltyTotal;
        return {
          id: `synthetic-${key}`,
          userId: s.userId,
          period: targetPeriod,
          baseSalary,
          bonus: bonusTotal,
          penalty: penaltyTotal,
          overtime: 0,
          totalSalary,
          currency: s.currency || settings?.currency || 'VND',
          status: 'pending',
          allowances: { ...standardAllowances, total: allowanceTotal },
          bonuses: { ...standardBonuses, total: bonusTotal },
          penalties: { ...standardPenalties, total: penaltyTotal },
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      })
      .filter(Boolean);

    res.json({ success: true, payrolls: [...payrolls, ...fallbackPayrolls] });
  } catch (error) {
    console.error('Error in getPayrolls:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get payroll by user ID and period
export const getPayrollByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const { period } = req.query;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Staff can only see their own payroll
    if (currentUser && currentUser.role === 'staff') {
      const currentUserId = toObjectId(currentUser.id);
      if (!currentUserId || !currentUserId.equals(targetUserId)) {
        return res.status(403).json({ error: 'Access denied. You can only view your own payroll.' });
      }
    }

    // Manager can only see payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only view payrolls in your department.' });
      }
    }

    let query = { userId: targetUserId };
    if (period) {
      query.period = period;
    }

    const payrolls = await Payroll.find(query)
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email')
      .sort({ period: -1 });

    res.json({ success: true, payrolls: period ? (payrolls[0] || null) : payrolls });
  } catch (error) {
    console.error('Error in getPayrollByUserId:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create or update payroll
export const upsertPayroll = async (req, res) => {
  try {
    const { userId, period, baseSalary, bonus, penalty, overtime, currency, status, notes } = req.body;
    const currentUser = req.user;

    if (!userId || !period) {
      return res.status(400).json({ error: 'User ID and period are required' });
    }

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only admin and manager can create/update payrolls
    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Staff cannot manage payrolls.' });
    }

    // Manager can only manage payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only manage payrolls in your department.' });
      }
    }

    const baseSalaryValue = Number(baseSalary) || 0;
    const bonusValue = Number(bonus) || 0;
    const penaltyValue = Number(penalty) || 0;
    const overtimeValue = Number(overtime) || 0;
    const totalSalary = baseSalaryValue + bonusValue - penaltyValue + overtimeValue;

    const payroll = await Payroll.findOneAndUpdate(
      { userId: targetUserId, period },
      {
        userId: targetUserId,
        period,
        baseSalary: baseSalaryValue,
        bonus: bonusValue,
        penalty: penaltyValue,
        overtime: overtimeValue,
        totalSalary,
        currency: currency || 'VND',
        status: status || 'pending',
        notes: notes || '',
      },
      { upsert: true, new: true }
    )
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email');

    res.json({ success: true, payroll });
  } catch (error) {
    console.error('Error in upsertPayroll:', error);
    res.status(500).json({ error: error.message });
  }
};

// Approve payroll
export const approvePayroll = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const currentUser = req.user;

    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Only admin and manager can approve payrolls.' });
    }

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Manager can only approve payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(payroll.userId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only approve payrolls in your department.' });
      }
    }

    payroll.status = 'approved';
    payroll.approvedBy = toObjectId(currentUser.id);
    payroll.approvedAt = new Date();
    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email');

    res.json({ success: true, payroll: updatedPayroll });
  } catch (error) {
    console.error('Error in approvePayroll:', error);
    res.status(500).json({ error: error.message });
  }
};

// Lock payroll
export const lockPayroll = async (req, res) => {
  try {
    const { payrollId } = req.params;
    const currentUser = req.user;

    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Only admin and manager can lock payrolls.' });
    }

    const payroll = await Payroll.findById(payrollId);
    if (!payroll) {
      return res.status(404).json({ error: 'Payroll not found' });
    }

    // Manager can only lock payrolls in their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(payroll.userId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only lock payrolls in your department.' });
      }
    }

    payroll.status = 'locked';
    payroll.lockedBy = toObjectId(currentUser.id);
    payroll.lockedAt = new Date();
    await payroll.save();

    const updatedPayroll = await Payroll.findById(payroll._id)
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email');

    res.json({ success: true, payroll: updatedPayroll });
  } catch (error) {
    console.error('Error in lockPayroll:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get daily salary statistics for Staff
export const getDailySalaryStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;
    const currentUser = req.user;

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Only staff can view their own daily stats
    if (!currentUser) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (currentUser.role !== 'staff') {
      return res.status(403).json({ error: 'Access denied. This feature is only for staff.' });
    }

    // Staff can only view their own stats - compare as strings
    const currentUserIdStr = normalizeId(currentUser.id || currentUser._id);
    const targetUserIdStr = normalizeId(targetUserId);
    if (!currentUserIdStr || !targetUserIdStr || currentUserIdStr !== targetUserIdStr) {
      return res.status(403).json({ error: 'Access denied. You can only view your own statistics.' });
    }

    // Get salary info
    const salary = await Salary.findOne({ userId: targetUserId });
    if (!salary) {
      return res.json({ success: true, stats: [], baseSalary: 0, currency: 'VND' });
    }

    // Calculate date range
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    // Get calendar events for work hours calculation
    const events = await CalendarEvent.find({
      assignedTo: targetUserId,
      startDate: { $gte: start, $lte: end },
    }).sort({ startDate: 1 });

    // Calculate daily stats
    const dailyStats = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayStart = new Date(currentDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(currentDate);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEvents = events.filter((event) => {
        const eventStart = event.startDate ? new Date(event.startDate) : null;
        return eventStart && eventStart >= dayStart && eventStart <= dayEnd;
      });

      // Calculate work hours for the day
      let totalHours = 0;
      dayEvents.forEach((event) => {
        if (event.startDate && event.endDate) {
          const startTime = new Date(event.startDate);
          const endTime = new Date(event.endDate);
          const hours = (endTime - startTime) / (1000 * 60 * 60);
          totalHours += hours;
        }
      });

      // Calculate daily salary (base salary / working days in month * hours worked / 8)
      const dayOfMonth = currentDate.getDate();
      const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
      const dailyBaseSalary = (salary.baseSalary / daysInMonth) * (totalHours / 8);

      dailyStats.push({
        date: currentDate.toISOString().split('T')[0],
        workHours: totalHours,
        eventsCount: dayEvents.length,
        estimatedSalary: dailyBaseSalary,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    res.json({
      success: true,
      stats: dailyStats,
      baseSalary: salary.baseSalary,
      currency: salary.currency || 'VND',
      totalWorkHours: dailyStats.reduce((sum, stat) => sum + stat.workHours, 0),
      totalEstimatedSalary: dailyStats.reduce((sum, stat) => sum + stat.estimatedSalary, 0),
    });
  } catch (error) {
    console.error('Error in getDailySalaryStats:', error);
    res.status(500).json({ error: error.message });
  }
};

// Calculate payroll automatically from attendance data
export const calculatePayrollFromAttendance = async (userId, period) => {
  try {
    // Get user salary
    const salary = await Salary.findOne({ userId: toObjectId(userId) });
    if (!salary) {
      throw new Error('Salary not found for user');
    }

    // Get salary settings
    const settings = await SalarySettings.findOne({ type: 'default' });
    if (!settings) {
      throw new Error('Salary settings not found');
    }

    // Parse period (YYYY-MM)
    const [year, month] = period.split('-').map(Number);
    const periodStart = new Date(year, month - 1, 1);
    const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);

    // Get calendar events for this period
    const events = await CalendarEvent.find({
      assignedTo: toObjectId(userId),
      startDate: { $gte: periodStart, $lte: periodEnd },
    });

    // Calculate attendance data
    const attendanceData = {
      workingDays: 0,
      lateDays: 0,
      leaveDays: 0,
      unauthorizedLeaveDays: 0,
      overtimeHours: 0,
    };

    const workingDaysSet = new Set();
    const lateDaysSet = new Set();
    let totalOvertimeMinutes = 0;

    events.forEach((event) => {
      const eventDate = new Date(event.startDate);
      const dateKey = eventDate.toISOString().split('T')[0];

      // Check attendance
      const attendance = event.attendance?.find(
        (a) => String(a.userId) === String(userId) && a.success
      );

      if (attendance) {
        workingDaysSet.add(dateKey);
        // Check for late arrival
        const shiftLog = event.shiftLogs?.find(
          (log) => String(log.userId) === String(userId)
        );
        if (shiftLog && shiftLog.lateMinutes > 0) {
          lateDaysSet.add(dateKey);
        }

        // Calculate overtime
        if (shiftLog && shiftLog.overtimeMinutes > 0) {
          totalOvertimeMinutes += shiftLog.overtimeMinutes;
        }
      }
    });

    attendanceData.workingDays = workingDaysSet.size;
    attendanceData.lateDays = lateDaysSet.size;
    attendanceData.overtimeHours = totalOvertimeMinutes / 60;

    // Calculate allowances (from settings or manual)
    const allowances = {
      meal: settings.standardAllowances?.meal || 0,
      phone: settings.standardAllowances?.phone || 0,
      transport: settings.standardAllowances?.transport || 0,
      position: settings.standardAllowances?.position || 0,
      attendance: settings.standardAllowances?.attendance || 0,
      total: 0,
    };
    allowances.total = allowances.meal + allowances.phone + allowances.transport + allowances.position + allowances.attendance;

    // Calculate bonuses (can be from proposals or settings)
    const bonuses = {
      kpi: 0,
      holiday: 0,
      project: 0,
      attendance: 0,
      performance: 0,
      total: 0,
    };
    bonuses.total = bonuses.kpi + bonuses.holiday + bonuses.project + bonuses.attendance + bonuses.performance;

    // Calculate penalties
    const penalties = {
      lateArrival: (settings.standardPenalties?.lateArrival || 0) * attendanceData.lateDays,
      unauthorizedLeave: (settings.standardPenalties?.unauthorizedLeave || 0) * attendanceData.unauthorizedLeaveDays,
      violation: 0,
      damage: 0,
      total: 0,
    };
    penalties.total = penalties.lateArrival + penalties.unauthorizedLeave + penalties.violation + penalties.damage;

    // Calculate overtime
    const hourlyRate = salary.baseSalary / (22 * 8); // Assuming 22 working days, 8 hours/day
    const otRates = settings.otRates || { weekday: 1.5, weekend: 2.0, holiday: 3.0 };
    
    // For simplicity, assume all OT is weekday (can be enhanced to check actual day)
    const overtime = {
      hours: attendanceData.overtimeHours,
      weekday: attendanceData.overtimeHours * hourlyRate * otRates.weekday,
      weekend: 0,
      holiday: 0,
      total: 0,
    };
    overtime.total = overtime.weekday + overtime.weekend + overtime.holiday;

    // Calculate insurance (10.5% of base salary)
    const insurance = {
      socialInsurance: salary.baseSalary * (settings.insurance?.socialInsurance || 8) / 100,
      healthInsurance: salary.baseSalary * (settings.insurance?.healthInsurance || 1.5) / 100,
      unemploymentInsurance: salary.baseSalary * (settings.insurance?.unemploymentInsurance || 1) / 100,
      total: 0,
    };
    insurance.total = insurance.socialInsurance + insurance.healthInsurance + insurance.unemploymentInsurance;

    // Calculate gross and total salary
    const grossSalary = salary.baseSalary + allowances.total + bonuses.total + overtime.total;
    const totalSalary = grossSalary - penalties.total - insurance.total;

    return {
      baseSalary: salary.baseSalary,
      allowances,
      bonuses,
      penalties,
      overtime,
      insurance,
      attendanceData,
      grossSalary,
      totalSalary: Math.max(0, totalSalary), // Ensure non-negative
      currency: salary.currency || 'VND',
    };
  } catch (error) {
    console.error('Error calculating payroll from attendance:', error);
    throw error;
  }
};

// Auto-calculate and create/update payroll
export const autoCalculatePayroll = async (req, res) => {
  try {
    const { userId, period } = req.body;
    const currentUser = req.user;

    if (!userId || !period) {
      return res.status(400).json({ error: 'User ID and period are required' });
    }

    // Only admin and manager can auto-calculate
    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Staff cannot calculate payrolls.' });
    }

    const targetUserId = toObjectId(userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Manager can only calculate for their department
    if (currentUser && currentUser.role === 'manager') {
      const targetUser = await User.findById(targetUserId).select('department');
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      const userDepartment = currentUser.department || '';
      const targetDepartment = targetUser.department || '';
      if (userDepartment !== targetDepartment) {
        return res.status(403).json({ error: 'Access denied. You can only calculate payrolls in your department.' });
      }
    }

    // Skip admin users
    const targetUser = await User.findById(targetUserId).select('role');
    if (targetUser && targetUser.role === 'admin') {
      return res.status(400).json({ error: 'Admin users do not receive salary' });
    }

    // Calculate payroll
    const calculatedData = await calculatePayrollFromAttendance(userId, period);

    // Create or update payroll
    const payroll = await Payroll.findOneAndUpdate(
      { userId: targetUserId, period },
      {
        userId: targetUserId,
        period,
        ...calculatedData,
        status: 'pending',
      },
      { upsert: true, new: true }
    )
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email');

    res.json({ success: true, payroll });
  } catch (error) {
    console.error('Error in autoCalculatePayroll:', error);
    res.status(500).json({ error: error.message });
  }
};

// Generate payrolls for a period for all accessible users (Admin: all, Manager: own department)
export const generatePayrollsForPeriod = async (req, res) => {
  try {
    const currentUser = req.user;
    const { period } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'Period is required (YYYY-MM)' });
    }

    // Only admin/manager
    if (currentUser && currentUser.role === 'staff') {
      return res.status(403).json({ error: 'Access denied. Staff cannot generate payrolls.' });
    }

    // Determine target users
    let userFilter = {};
    if (currentUser && currentUser.role === 'manager') {
      userFilter.department = currentUser.department || '';
    }

    const users = await User.find(userFilter).select('_id role');
    const settings = await SalarySettings.findOne({ type: 'default' });
    const standardAllowances = settings?.standardAllowances || {};
    const standardBonuses = settings?.standardBonuses || {};
    const standardPenalties = settings?.standardPenalties || {};

    const allowanceTotal = Object.values(standardAllowances).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const bonusTotal = Object.values(standardBonuses).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const penaltyTotal = Object.values(standardPenalties).reduce((sum, val) => sum + (Number(val) || 0), 0);

    const results = [];

    for (const user of users) {
      // Skip admin users
      if (user.role === 'admin') continue;

      try {
        const salaryDoc = await Salary.findOne({ userId: user._id });
        const baseSalaryValue = Number(salaryDoc?.baseSalary || 0);

        let calculatedData;
        try {
          calculatedData = await calculatePayrollFromAttendance(user._id, period);
        } catch (err) {
          // Fallback to static calculation
          const totalSalary = baseSalaryValue + allowanceTotal + bonusTotal - penaltyTotal;
          calculatedData = {
            baseSalary: baseSalaryValue,
            allowances: { ...standardAllowances, total: allowanceTotal },
            bonuses: { ...standardBonuses, total: bonusTotal },
            penalties: { ...standardPenalties, total: penaltyTotal },
            overtime: { hours: 0, weekday: 0, weekend: 0, holiday: 0, total: 0 },
            insurance: { socialInsurance: 0, healthInsurance: 0, unemploymentInsurance: 0, total: 0 },
            grossSalary: baseSalaryValue + allowanceTotal + bonusTotal,
            totalSalary: totalSalary > 0 ? totalSalary : 0,
            currency: salaryDoc?.currency || settings?.currency || 'VND',
          };
        }

        const payroll = await Payroll.findOneAndUpdate(
          { userId: user._id, period },
          {
            userId: user._id,
            period,
            ...calculatedData,
            baseSalary: calculatedData.baseSalary ?? baseSalaryValue,
            bonus: calculatedData.bonus ?? calculatedData.bonuses?.total ?? bonusTotal,
            penalty: calculatedData.penalty ?? calculatedData.penalties?.total ?? penaltyTotal,
            overtime: calculatedData.overtime?.total ?? calculatedData.overtime ?? 0,
            totalSalary:
              calculatedData.totalSalary ??
              (calculatedData.baseSalary ?? baseSalaryValue) +
                (calculatedData.bonuses?.total ?? bonusTotal) -
                (calculatedData.penalties?.total ?? penaltyTotal) +
                (calculatedData.overtime?.total ?? 0),
            currency: calculatedData.currency || salaryDoc?.currency || settings?.currency || 'VND',
            status: 'pending',
          },
          { upsert: true, new: true }
        )
          .populate('userId', 'name email role department avatar')
          .populate('approvedBy', 'name email')
          .populate('lockedBy', 'name email');

        results.push({ userId: user._id, status: 'ok', payroll });
      } catch (err) {
        console.error('Failed to generate payroll for user', user._id?.toString(), err);
        results.push({ userId: user._id, status: 'error', error: err.message });
      }
    }

    res.json({
      success: true,
      period,
      generated: results.filter((r) => r.status === 'ok').length,
      failed: results.filter((r) => r.status === 'error').length,
      results,
    });
  } catch (error) {
    console.error('Error in generatePayrollsForPeriod:', error);
    res.status(500).json({ error: error.message });
  }
};
