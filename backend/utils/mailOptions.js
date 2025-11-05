import { MY_EMAIL } from "../config/env.js";

export const mailOptions = (to, subject, html) => ({
    from: MY_EMAIL,
    to,
    subject,
    html
});