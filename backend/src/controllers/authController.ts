import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt    from 'jsonwebtoken';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { User }               from '../models';
import { createAuditLog }     from '../middleware/auditLogger';
import { AuthRequest }        from '../middleware/auth';
import { sendEmail }          from '../services/emailService';

const generateTokens = (userId: number) => {
  const JWT_SECRET = process.env.JWT_SECRET as string;
  const JWT_EXPIRES =(process.env.JWT_EXPIRES_IN || '15m') as jwt.SignOptions['expiresIn'];

  const accessToken = jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
    );
  const refreshToken = jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET as string,
    { expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn'] });
  return { accessToken, refreshToken };
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, is_active: true } });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const { accessToken, refreshToken } = generateTokens(user.id);
    await createAuditLog(user.id, 'LOGIN', 'user', user.id, null, null, req.ip);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email, role_id: user.role_id },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return res.status(401).json({ message: 'No refresh token provided' });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { id: number };
    const user    = await User.findOne({ where: { id: decoded.id, is_active: true } });
    if (!user) return res.status(401).json({ message: 'User not found or inactive' });

    const { accessToken, refreshToken: newRefresh } = generateTokens(user.id);
    res.json({ accessToken, refreshToken: newRefresh });
  } catch {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    await createAuditLog(req.user!.id, 'LOGOUT', 'user', req.user!.id, null, null, req.ip);
    res.json({ message: 'Logged out successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });

    // Always same response — prevents email enumeration
    if (!user) return res.json({ message: 'If that email exists, a reset link has been sent.' });

    const token = crypto.randomBytes(32).toString('hex');
    const hash  = crypto.createHash('sha256').update(token).digest('hex');

    await user.update({
      reset_token:        hash,
      reset_token_expiry: new Date(Date.now() + 3_600_000), // 1 hour
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    await sendEmail(
      user.email,
      'Password Reset Request — Task Manager',
      `You requested a password reset. Visit this link to set a new password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#1d4ed8;margin-bottom:8px">Password Reset</h2>
        <p style="color:#374151">You requested a password reset for your Task Manager account.</p>
        <p style="color:#374151">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <div style="margin:24px 0">
          <a href="${resetUrl}"
            style="display:inline-block;background:#2563eb;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">
            Reset Password
          </a>
        </div>
        <p style="color:#9ca3af;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"/>
        <p style="color:#9ca3af;font-size:12px">Task Manager · ${resetUrl}</p>
      </div>`
    );

    res.json({ message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('forgotPassword error:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const hash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      where: {
        reset_token:        hash,
        reset_token_expiry: { [Op.gt]: new Date() },
      },
    });
    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    const passwordHash = await bcrypt.hash(password, 12);
    await user.update({
      password_hash:      passwordHash,
      reset_token:        null,
      reset_token_expiry: null,
    });

    res.json({ message: 'Password reset successfully' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByPk(req.user!.id, {
      attributes: ['id','name','email','role_id','created_at'],
      include:    [{ association: 'role', attributes: ['name'] }],
    });
    res.json(user);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};