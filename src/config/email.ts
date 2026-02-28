// src/config/email.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // ← App Password, NOT regular password
    },
    tls: {
        rejectUnauthorized: false, // Fix: "self-signed certificate in certificate chain"
    },
});

export const sendResetPasswordEmail = async (to: string, resetLink: string) => {
    const mailOptions = {
        from: `"Petals by You" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Reset Your Password',
        html: `
      <div style="font-family: Georgia, serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #FBF6F4; border-radius: 16px;">
        <h2 style="color: #6B4E4E; font-size: 24px; margin-bottom: 16px;">Password Reset</h2>
        <p style="color: #9A7A7A; margin-bottom: 24px;">You requested a password reset for your Petals by You account.</p>
        <p style="margin-bottom: 24px;">
          <a href="${resetLink}"
            style="display: inline-block; padding: 12px 28px; background: #6B4E4E; color: white; text-decoration: none; border-radius: 999px; font-size: 14px; letter-spacing: 0.05em;">
            Reset Password
          </a>
        </p>
        <p style="color: #9A7A7A; font-size: 13px;">This link expires in <strong>1 hour</strong>.</p>
        <p style="color: #C4A0A0; font-size: 12px; margin-top: 24px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    };

    await transporter.sendMail(mailOptions);
};