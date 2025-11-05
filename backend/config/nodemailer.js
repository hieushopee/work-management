import nodemailer from 'nodemailer';
import { APP_PASSWORD, MY_EMAIL } from './env.js';

// Email transporter setup
export const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email service
  auth: {
    user: MY_EMAIL,
    pass: APP_PASSWORD
  }
});