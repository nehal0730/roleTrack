import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

export const sendEmail = async (to: string, subject: string, text: string, html?: string) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to, subject, text, html: html || `<p>${text}</p>`,
    });
  } catch (err) {
    console.error('Email error:', err);
  }
};