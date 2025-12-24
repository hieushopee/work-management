import { body, validationResult } from 'express-validator';
import { Department } from '../models/department.model.js';
import { toObjectId } from '../utils/identifiers.js';

export const validateDepartment = [
  body('name').trim().notEmpty().withMessage('Department name is required'),
  body('description').trim().optional({ nullable: true }),
  body('color').trim().optional({ nullable: true }),
  body('manager').trim().optional({ nullable: true }),
];

export async function getDepartments(_req, res) {
  try {
    const departments = await Department.find()
      .populate('manager', 'name email')
      .sort({ createdAt: -1 });
    res.json(departments);
  } catch (err) {
    console.error('getDepartments error:', err);
    res.status(500).json({ message: 'Error fetching departments' });
  }
}

export async function createDepartment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { name, description, color, manager } = req.body || {};
    const userId = req.user?.id;
    const userRole = req.user?.role;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    // Only admin can create departments
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Only admin can create departments' });
    }

    const exists = await Department.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: 'Department name already exists' });

    const dept = await Department.create({
      name: name.trim(),
      description: description?.trim() || '',
      color: color || '',
      manager: manager ? toObjectId(manager) : null,
      createdBy: toObjectId(userId),
    });

    const populated = await Department.findById(dept._id).populate('manager', 'name email');
    res.status(201).json(populated);
  } catch (err) {
    console.error('createDepartment error:', err);
    res.status(500).json({ message: 'Error creating department' });
  }
}

export async function updateDepartment(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { id } = req.params;
    const { name, description, color, manager } = req.body || {};
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userDepartment = req.user?.department || '';
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    // Manager can only update their own department
    if (userRole === 'manager') {
      if (dept.name !== userDepartment) {
        return res.status(403).json({ message: 'You can only update your own department' });
      }
    }
    // Admin can update any department

    if (name && name.trim()) dept.name = name.trim();
    if (description !== undefined) dept.description = description?.trim() || '';
    if (color !== undefined) dept.color = color;
    if (manager !== undefined) dept.manager = manager ? toObjectId(manager) : null;

    await dept.save();
    const populated = await Department.findById(id).populate('manager', 'name email');
    res.json(populated);
  } catch (err) {
    console.error('updateDepartment error:', err);
    res.status(500).json({ message: 'Error updating department' });
  }
}

export async function deleteDepartment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userDepartment = req.user?.department || '';
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const dept = await Department.findById(id);
    if (!dept) return res.status(404).json({ message: 'Department not found' });

    // Manager can only delete their own department
    if (userRole === 'manager') {
      if (dept.name !== userDepartment) {
        return res.status(403).json({ message: 'You can only delete your own department' });
      }
    }
    // Admin can delete any department

    await Department.findByIdAndDelete(id);
    res.status(204).end();
  } catch (err) {
    console.error('deleteDepartment error:', err);
    res.status(500).json({ message: 'Error deleting department' });
  }
}
