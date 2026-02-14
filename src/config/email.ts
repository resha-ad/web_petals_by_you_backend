import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // ← App Password, NOT regular password
    },
});

export const sendResetPasswordEmail = async (to: string, resetLink: string) => {
    const mailOptions = {
        from: `"Petals by You" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'Reset Your Password',
        html: `
      <p>You requested a password reset.</p>
      <p>Click this link to reset your password (expires in 1 hour):</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>If you didn't request this, ignore this email.</p>
    `,
    };

    await transporter.sendMail(mailOptions);
};