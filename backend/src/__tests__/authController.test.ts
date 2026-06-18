jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  apiLimiter:  (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../middleware/auditLogger', () => ({
  createAuditLog: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../models', () => ({
  User: {
    findOne:  jest.fn(),
    findByPk: jest.fn(),
  },
}));

import request    from 'supertest';
import express    from 'express';
import jwt        from 'jsonwebtoken';
import bcrypt     from 'bcryptjs';
import authRoutes from '../routes/auth';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_SECRET         = 'test_secret_that_is_long_enough_32chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_long_enough_32chars!!';
process.env.JWT_EXPIRES_IN     = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_URL         = 'http://localhost:5173';

const app = express();
app.use(express.json());
app.use('/auth', authRoutes);
app.use(errorHandler);

const { User }      = require('../models');
const { sendEmail } = require('../services/emailService');

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeHash = (pw: string) => bcrypt.hashSync(pw, 1); // rounds=1 for test speed

const mockActiveUser = (overrides = {}) =>
  User.findOne.mockResolvedValue({
    id: 1, name: 'Test User', email: 'test@test.com',
    password_hash: makeHash('Password1'),
    role_id: 1, is_active: true,
    update: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('422 — missing email', async () => {
    const res = await request(app).post('/auth/login').send({ password: 'pw' });
    expect(res.status).toBe(422);
  });

  it('422 — missing password', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'a@b.com' });
    expect(res.status).toBe(422);
  });

  it('422 — invalid email format', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'notanemail', password: 'pw' });
    expect(res.status).toBe(422);
  });

  it('401 — user not found', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/auth/login').send({ email: 'no@one.com', password: 'pw' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('401 — wrong password', async () => {
    mockActiveUser();
    const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'WrongPass' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('200 — valid credentials returns tokens and user', async () => {
    mockActiveUser();
    const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('test@test.com');
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  it('200 — accessToken is a valid JWT', async () => {
    mockActiveUser();
    const res = await request(app).post('/auth/login').send({ email: 'test@test.com', password: 'Password1' });
    const decoded = jwt.verify(res.body.accessToken, process.env.JWT_SECRET!) as any;
    expect(decoded.id).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/refresh', () => {
  beforeEach(() => jest.clearAllMocks());

  it('422 — missing refreshToken', async () => {
    const res = await request(app).post('/auth/refresh').send({});
    expect(res.status).toBe(422);
  });

  it('401 — invalid refresh token', async () => {
    const res = await request(app).post('/auth/refresh').send({ refreshToken: 'garbage' });
    expect(res.status).toBe(401);
  });

  it('401 — user inactive', async () => {
    User.findOne.mockResolvedValue(null);
    const token = jwt.sign({ id: 99 }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    const res   = await request(app).post('/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(401);
  });

  it('200 — valid refresh token returns new tokens', async () => {
    mockActiveUser();
    const token = jwt.sign({ id: 1 }, process.env.JWT_REFRESH_SECRET!, { expiresIn: '7d' });
    const res   = await request(app).post('/auth/refresh').send({ refreshToken: token });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/logout', () => {
  it('401 — no token', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(401);
  });

  it('200 — valid token logs out', async () => {
    mockActiveUser();
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const res   = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logged out successfully');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('422 — invalid email format', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'bad' });
    expect(res.status).toBe(422);
  });

  it('200 — non-existent email (enumeration guard)', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/auth/forgot-password').send({ email: 'ghost@test.com' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If that email exists');
    // Must NOT reveal whether email exists
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('200 — existing user sends reset email', async () => {
    mockActiveUser();
    const res = await request(app).post('/auth/forgot-password').send({ email: 'test@test.com' });
    expect(res.status).toBe(200);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, subject] = sendEmail.mock.calls[0];
    expect(to).toBe('test@test.com');
    expect(subject).toContain('Reset');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('POST /auth/reset-password', () => {
  it('422 — missing token', async () => {
    const res = await request(app).post('/auth/reset-password').send({ password: 'newpass1' });
    expect(res.status).toBe(422);
  });

  it('422 — password too short', async () => {
    const res = await request(app).post('/auth/reset-password').send({ token: 'abc', password: '123' });
    expect(res.status).toBe(422);
  });

  it('400 — invalid/expired token', async () => {
    User.findOne.mockResolvedValue(null);
    const res = await request(app).post('/auth/reset-password').send({ token: 'badtoken', password: 'newpass1' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid or expired');
  });

  it('200 — valid token resets password', async () => {
    const mockUpdate = jest.fn().mockResolvedValue(true);
    User.findOne.mockResolvedValue({
      id: 1, email: 'test@test.com',
      reset_token: 'hashed', reset_token_expiry: new Date(Date.now() + 3600000),
      update: mockUpdate,
    });
    const res = await request(app).post('/auth/reset-password').send({ token: 'sometoken', password: 'newPassword1' });
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ reset_token: null, reset_token_expiry: null })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('GET /auth/me', () => {
  it('401 — no token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('200 — returns current user', async () => {
    mockActiveUser();
    User.findByPk.mockResolvedValue({
      id: 1, name: 'Test User', email: 'test@test.com', role_id: 1,
    });
    const token = jwt.sign({ id: 1 }, process.env.JWT_SECRET!, { expiresIn: '15m' });
    const res   = await request(app).get('/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('test@test.com');
  });
});