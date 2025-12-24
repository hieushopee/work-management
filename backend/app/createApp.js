import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { CLIENT_URL } from '../config/env.js';
import authRoutes from '../routes/auth.route.js';
import employeeRoutes from '../routes/employee.route.js';
import taskRoutes from '../routes/task.route.js';
import messageRoutes from '../routes/message.route.js';
import aiRoute from '../routes/ai.route.js';
import formRoutes from '../routes/form.route.js';
import calendarRoutes from '../routes/calendar.route.js';
import teamRoutes from '../routes/team.route.js';
import departmentRoutes from '../routes/department.route.js';
import salaryRoutes from '../routes/salary.route.js';
import salarySettingsRoutes from '../routes/salarySettings.route.js';
import workspaceRoutes from '../routes/workspace.route.js';
import attendanceRoutes from '../routes/attendance.route.js';
import documentRoutes from '../routes/document.route.js';
import permissionRoutes from '../routes/permission.route.js';

const createApp = () => {
  const app = express();

  app.use(cors({ origin: CLIENT_URL, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());
  app.use('/uploads', express.static(path.join(process.cwd(), 'backend', 'uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/employees', employeeRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/ai', aiRoute);
  app.use('/api/forms', formRoutes);
  app.use('/api/calendar', calendarRoutes);
  app.use('/api/teams', teamRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/salaries', salaryRoutes);
  app.use('/api/salary-settings', salarySettingsRoutes);
  app.use('/api/workspace', workspaceRoutes);
  app.use('/api/attendance', attendanceRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/permissions', permissionRoutes);

  return app;
};

export default createApp;
