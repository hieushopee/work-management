import { SalarySettings } from '../models/salarySettings.model.js';
import { ManagerProposal } from '../models/managerProposal.model.js';
import { StaffReport } from '../models/staffReport.model.js';
import { User } from '../models/user.model.js';
import { Department } from '../models/department.model.js';
import { Payroll } from '../models/payroll.model.js';
import { Salary } from '../models/salary.model.js';
import { toObjectId, normalizeId } from '../utils/identifiers.js';

// ============ SALARY SETTINGS (Admin only) ============

// Get salary settings (Admin, Manager, Staff can view)
export const getSalarySettings = async (req, res) => {
  try {
    let settings = await SalarySettings.findOne({ type: 'default' });
    
    // If no settings exist, create default
    if (!settings) {
      const currentUser = req.user;
      settings = await SalarySettings.create({
        type: 'default',
        updatedBy: toObjectId(currentUser.id || currentUser._id),
      });
    }

    await settings.populate('updatedBy', 'name email');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error in getSalarySettings:', error);
    res.status(500).json({ error: error.message });
  }
};

// Update salary settings (Admin only)
export const updateSalarySettings = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    let settings = await SalarySettings.findOne({ type: 'default' });
    
    if (!settings) {
      settings = await SalarySettings.create({
        type: 'default',
        ...req.body,
        updatedBy: toObjectId(currentUser.id || currentUser._id),
      });
    } else {
      Object.assign(settings, req.body);
      settings.updatedBy = toObjectId(currentUser.id || currentUser._id);
      await settings.save();
    }

    await settings.populate('updatedBy', 'name email');
    res.json({ success: true, settings });
  } catch (error) {
    console.error('Error in updateSalarySettings:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ MANAGER PROPOSALS ============

// Get all proposals (Manager: own proposals, Admin: all)
export const getAllProposals = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = {};

    // Manager can only see their own proposals
    if (currentUser.role === 'manager') {
      query.proposedBy = toObjectId(currentUser.id || currentUser._id);
    }
    // Admin can see all proposals

    const proposals = await ManagerProposal.find(query)
      .populate('targetUserId', 'name email role department avatar')
      .populate('proposedBy', 'name email role department')
      .populate('reviewedBy', 'name email')
      .populate('metadata.taskId', 'name description')
      .sort({ createdAt: -1 });

    res.json({ success: true, proposals });
  } catch (error) {
    console.error('Error in getAllProposals:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create proposal (Manager only)
export const createProposal = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    const { targetUserId, type, amount, reason, description, metadata, period } = req.body;

    // Verify target user is in manager's department
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    const managerDepartment = currentUser.department || '';
    if (targetUser.department !== managerDepartment) {
      return res.status(403).json({ error: 'You can only propose for users in your department' });
    }

    const proposal = await ManagerProposal.create({
      targetUserId: toObjectId(targetUserId),
      type,
      amount,
      reason,
      description: description || '',
      metadata: metadata || {},
      period: period || null,
      proposedBy: toObjectId(currentUser.id || currentUser._id),
      status: 'pending',
    });

    await proposal.populate('targetUserId', 'name email role department avatar');
    await proposal.populate('proposedBy', 'name email role department');

    res.status(201).json({ success: true, proposal });
  } catch (error) {
    console.error('Error in createProposal:', error);
    res.status(500).json({ error: error.message });
  }
};

// Review proposal (Admin only)
export const reviewProposal = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { proposalId } = req.params;
    const { status, reviewNote } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const proposal = await ManagerProposal.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }

    proposal.status = status;
    proposal.reviewedBy = toObjectId(currentUser.id || currentUser._id);
    proposal.reviewedAt = new Date();
    proposal.reviewNote = reviewNote || '';

    await proposal.save();

    // If approved, update payroll if period is provided
    if (status === 'approved' && proposal.period) {
      const payroll = await Payroll.findOne({
        userId: proposal.targetUserId,
        period: proposal.period,
      });

      if (payroll) {
        if (proposal.type === 'bonus') {
          payroll.bonus = (payroll.bonus || 0) + proposal.amount;
        } else if (proposal.type === 'penalty') {
          payroll.penalty = (payroll.penalty || 0) + proposal.amount;
        } else if (proposal.type === 'overtime') {
          payroll.overtime = (payroll.overtime || 0) + proposal.amount;
        }
        payroll.totalSalary = (payroll.baseSalary || 0) + (payroll.bonus || 0) - (payroll.penalty || 0) + (payroll.overtime || 0);
        await payroll.save();
      }
    }

    await proposal.populate('targetUserId', 'name email role department avatar');
    await proposal.populate('proposedBy', 'name email role department');
    await proposal.populate('reviewedBy', 'name email');

    res.json({ success: true, proposal });
  } catch (error) {
    console.error('Error in reviewProposal:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ STAFF REPORTS ============

// Get all reports (Staff: own reports, Admin/Manager: all in their scope)
export const getAllReports = async (req, res) => {
  try {
    const currentUser = req.user;
    let query = {};

    if (currentUser.role === 'staff') {
      // Staff can only see their own reports
      query.reportedBy = toObjectId(currentUser.id || currentUser._id);
    } else if (currentUser.role === 'manager') {
      // Manager can see reports from their department
      const managerDepartment = currentUser.department || '';
      const departmentUsers = await User.find({ department: managerDepartment }).select('_id');
      const userIds = departmentUsers.map((u) => u._id);
      query.reportedBy = { $in: userIds };
    }
    // Admin can see all reports

    const reports = await StaffReport.find(query)
      .populate('reportedBy', 'name email role department avatar')
      .populate('reviewedBy', 'name email')
      .populate('payrollId', 'period totalSalary')
      .populate('proposalId', 'type amount reason')
      .sort({ createdAt: -1 });

    res.json({ success: true, reports });
  } catch (error) {
    console.error('Error in getAllReports:', error);
    res.status(500).json({ error: error.message });
  }
};

// Create report (Staff only)
export const createReport = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'staff') {
      return res.status(403).json({ error: 'Access denied. Staff only.' });
    }

    const { type, period, description, expectedAmount, actualAmount, payrollId, proposalId } = req.body;

    const difference = (expectedAmount || 0) - (actualAmount || 0);

    const report = await StaffReport.create({
      type,
      period,
      description,
      expectedAmount: expectedAmount || 0,
      actualAmount: actualAmount || 0,
      difference,
      payrollId: payrollId ? toObjectId(payrollId) : null,
      proposalId: proposalId ? toObjectId(proposalId) : null,
      reportedBy: toObjectId(currentUser.id || currentUser._id),
      status: 'pending',
    });

    await report.populate('reportedBy', 'name email role department avatar');
    if (report.payrollId) {
      await report.populate('payrollId', 'period totalSalary');
    }
    if (report.proposalId) {
      await report.populate('proposalId', 'type amount reason');
    }

    res.status(201).json({ success: true, report });
  } catch (error) {
    console.error('Error in createReport:', error);
    res.status(500).json({ error: error.message });
  }
};

// Review report (Admin/Manager)
export const reviewReport = async (req, res) => {
  try {
    const currentUser = req.user;
    if (!['admin', 'manager'].includes(currentUser.role)) {
      return res.status(403).json({ error: 'Access denied. Admin or Manager only.' });
    }

    const { reportId } = req.params;
    const { status, reviewNote, resolutionNote } = req.body;

    if (!['reviewing', 'resolved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await StaffReport.findById(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Manager can only review reports from their department
    if (currentUser.role === 'manager') {
      const reporter = await User.findById(report.reportedBy);
      const managerDepartment = currentUser.department || '';
      if (reporter.department !== managerDepartment) {
        return res.status(403).json({ error: 'You can only review reports from your department' });
      }
    }

    report.status = status;
    report.reviewedBy = toObjectId(currentUser.id || currentUser._id);
    report.reviewedAt = new Date();
    report.reviewNote = reviewNote || '';
    report.resolutionNote = resolutionNote || '';

    await report.save();

    await report.populate('reportedBy', 'name email role department avatar');
    await report.populate('reviewedBy', 'name email');
    if (report.payrollId) {
      await report.populate('payrollId', 'period totalSalary');
    }
    if (report.proposalId) {
      await report.populate('proposalId', 'type amount reason');
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error('Error in reviewReport:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ VIEW COMPANY SALARY (Admin only) ============

// Get all company salaries with payroll data
export const getCompanySalaries = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { period } = req.query; // Optional: filter by period

    // Prepare settings for default allowances/bonuses/penalties when payroll does not exist
    const settings = await SalarySettings.findOne({ type: 'default' });
    const standardAllowances = settings?.standardAllowances || {};
    const standardBonuses = settings?.standardBonuses || {};
    const standardPenalties = settings?.standardPenalties || {};

    const allowanceTotal = Object.values(standardAllowances).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
    const bonusTotal = Object.values(standardBonuses).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );
    const penaltyTotal = Object.values(standardPenalties).reduce(
      (sum, val) => sum + (Number(val) || 0),
      0
    );

    const users = await User.find().select('name email role department avatar');
    const salaries = await Payroll.find(period ? { period } : {})
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email')
      .sort({ period: -1, createdAt: -1 });

    // Map existing payrolls by user + period to avoid duplicates
    const payrollKey = (userId, per) => `${String(userId)}-${per || 'all'}`;
    const existingKeys = new Set();
    salaries.forEach((p) => {
      const key = payrollKey(p.userId?._id || p.userId, p.period);
      existingKeys.add(key);
    });

    // Add fallback rows for users who have salary set but no payroll for this period
    const salaryRecords = await Salary.find()
      .populate('userId', 'name email role department avatar')
      .select('userId baseSalary currency');

    const targetPeriod =
      period ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();

    const fallbackSalaries = salaryRecords
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

    const mergedSalaries = [...salaries, ...fallbackSalaries];

    res.json({ success: true, salaries: mergedSalaries, users });
  } catch (error) {
    console.error('Error in getCompanySalaries:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============ VIEW DEPARTMENT SALARY (Manager) ============

// Get department salaries
export const getDepartmentSalaries = async (req, res) => {
  try {
    const currentUser = req.user;
    if (currentUser.role !== 'manager') {
      return res.status(403).json({ error: 'Access denied. Manager only.' });
    }

    const { period } = req.query;
    const managerDepartment = currentUser.department || '';

    // Get all users in the department
    const departmentUsers = await User.find({ department: managerDepartment }).select('_id');
    const userIds = departmentUsers.map((u) => u._id);

    // Settings for defaults
    const settings = await SalarySettings.findOne({ type: 'default' });
    const standardAllowances = settings?.standardAllowances || {};
    const standardBonuses = settings?.standardBonuses || {};
    const standardPenalties = settings?.standardPenalties || {};

    const allowanceTotal = Object.values(standardAllowances).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const bonusTotal = Object.values(standardBonuses).reduce((sum, val) => sum + (Number(val) || 0), 0);
    const penaltyTotal = Object.values(standardPenalties).reduce((sum, val) => sum + (Number(val) || 0), 0);

    const salaries = await Payroll.find({
      userId: { $in: userIds },
      ...(period ? { period } : {}),
    })
      .populate('userId', 'name email role department avatar')
      .populate('approvedBy', 'name email')
      .populate('lockedBy', 'name email')
      .sort({ period: -1, createdAt: -1 });

    const payrollKey = (userId, per) => `${String(userId)}-${per || 'all'}`;
    const existingKeys = new Set();
    salaries.forEach((p) => {
      const key = payrollKey(p.userId?._id || p.userId, p.period);
      existingKeys.add(key);
    });

    const targetPeriod =
      period ||
      (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      })();

    // Add fallback rows for users with a Salary record but no payroll this period
    const salaryRecords = await Salary.find({ userId: { $in: userIds } })
      .populate('userId', 'name email role department avatar')
      .select('userId baseSalary currency');

    const fallbackSalaries = salaryRecords
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

    res.json({ success: true, salaries: [...salaries, ...fallbackSalaries], department: managerDepartment });
  } catch (error) {
    console.error('Error in getDepartmentSalaries:', error);
    res.status(500).json({ error: error.message });
  }
};

