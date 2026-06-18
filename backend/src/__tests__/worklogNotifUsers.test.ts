jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  apiLimiter:  (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../services/emailService',  () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/socketService', () => ({ notifyUser: jest.fn(), initSocket: jest.fn() }));
jest.mock('../middleware/auditLogger',  () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));

const mockUser = (id: number, roleId: number) => ({
  id, email: `user${id}@test.com`, name: `User ${id}`,
  role_id: roleId, is_active: true,
  role: { name: ['','admin','project_manager','employee'][roleId] },
  password_hash: '$2a$01$hashedpassword',
  update:  jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
  toJSON:  jest.fn().mockReturnThis(),
});

const mockTask = {
  id: 1, title: 'Test Task', project_id: 1, assigned_to: 3,
  status: 'in_progress', priority: 'medium',
  deadline: new Date(Date.now() + 86400000),
};

const mockLog = {
  id: 1, task_id: 1, user_id: 3,
  description: 'Did stuff', hours_worked: 2,
  attachment_url: null,
  task: { id: 1, project_id: 1 }
};

jest.mock('../models', () => ({
  User:         { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), create: jest.fn() },
  Role:         {},
  Project:      { findAll: jest.fn() },
  Task:         { findByPk: jest.fn(), findAll: jest.fn() },
  TaskAssignment: { findAll: jest.fn().mockResolvedValue([]) },
  WorkLog:      { create: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn() },
  LogReply:     { create: jest.fn(), findByPk: jest.fn() },
  Notification: { findAll: jest.fn(), count: jest.fn(), update: jest.fn(), create: jest.fn().mockResolvedValue({ created_at: new Date() }) },
  AuditLog:     { findAndCountAll: jest.fn() },
}));

import request             from 'supertest';
import express             from 'express';
import jwt                 from 'jsonwebtoken';
import workLogRoutes       from '../routes/workLogs';
import notificationRoutes  from '../routes/notifications';
import userRoutes          from '../routes/users';
import auditLogRoutes      from '../routes/auditLogs';
import { errorHandler }    from '../middleware/errorHandler';
import { AppError }        from '../middleware/errorHandler';

process.env.JWT_SECRET = 'test_secret_that_is_long_enough_32chars!!';

const { User, Task, WorkLog, LogReply, Notification, AuditLog } = require('../models');

const makeToken = (roleId: number, id = 1) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

const setUser = (roleId: number, id = 1) => {
  User.findOne.mockResolvedValue(mockUser(id, roleId));
};

// ── App instances ─────────────────────────────────────────────────────────────
const wlApp = express();
wlApp.use(express.json());
wlApp.use('/work-logs', workLogRoutes);
wlApp.use(errorHandler);

const notifApp = express();
notifApp.use(express.json());
notifApp.use('/notifications', notificationRoutes);
notifApp.use(errorHandler);

const userApp = express();
userApp.use(express.json());
userApp.use('/users', userRoutes);
userApp.use(errorHandler);

const auditApp = express();
auditApp.use(express.json());
auditApp.use('/audit-logs', auditLogRoutes);
auditApp.use(errorHandler);

// Error handler test app
const errApp = express();
errApp.get('/op-error',  (_req, _res, next) => next(new AppError(400, 'Bad input')));
errApp.get('/seq-val',   (_req, _res, next) => {
  const err: any = new Error('Validation');
  err.name = 'SequelizeValidationError';
  err.errors = [{ path: 'name', message: 'Name is required' }];
  next(err);
});
errApp.get('/seq-uniq',  (_req, _res, next) => {
  const err: any = new Error('Unique');
  err.name = 'SequelizeUniqueConstraintError';
  next(err);
});
errApp.get('/jwt-err',   (_req, _res, next) => {
  const err: any = new Error('JWT');
  err.name = 'JsonWebTokenError';
  next(err);
});
errApp.get('/unknown',   (_req, _res, next) => next(new Error('Unexpected')));
errApp.use(errorHandler);

beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
// ERROR HANDLER
// ═════════════════════════════════════════════════════════════════════════════

describe('errorHandler middleware', () => {
  it('handles AppError with correct status', async () => {
    const res = await request(errApp).get('/op-error');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Bad input');
  });

  it('handles SequelizeValidationError as 422', async () => {
    const res = await request(errApp).get('/seq-val');
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('name');
  });

  it('handles SequelizeUniqueConstraintError as 409', async () => {
    const res = await request(errApp).get('/seq-uniq');
    expect(res.status).toBe(409);
  });

  it('handles JsonWebTokenError as 401', async () => {
    const res = await request(errApp).get('/jwt-err');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid token');
  });

  it('handles unknown errors as 500 without leaking details', async () => {
    const res = await request(errApp).get('/unknown');
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('An unexpected error occurred');
    expect(res.body).not.toHaveProperty('stack');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// WORK LOG CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /work-logs/task/:task_id', () => {
  it('401 — unauthenticated', async () => {
    const res = await request(wlApp).get('/work-logs/task/1');
    expect(res.status).toBe(401);
  });

  it('200 — returns logs for task', async () => {
    setUser(2, 2); // PM
    Task.findByPk.mockResolvedValue(mockTask);
    WorkLog.findAll.mockResolvedValue([mockLog]);
    const res = await request(wlApp)
      .get('/work-logs/task/1')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('403 — employee cannot see another employees task logs', async () => {
    setUser(3, 3); // employee id=3
    Task.findByPk.mockResolvedValue({ ...mockTask, assigned_to: 99 }); // owned by someone else
    const res = await request(wlApp)
      .get('/work-logs/task/1')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(403);
  });
});

describe('POST /work-logs', () => {
  it('422 — missing description', async () => {
    setUser(3, 3);
    const res = await request(wlApp)
      .post('/work-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .field('task_id', '1')
      .field('hours_worked', '2');
    expect(res.status).toBe(422);
  });

  it('422 — hours_worked out of range', async () => {
    setUser(3, 3);
    const res = await request(wlApp)
      .post('/work-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .field('task_id', '1')
      .field('description', 'Worked on stuff')
      .field('hours_worked', '25'); // > 24
    expect(res.status).toBe(422);
  });

  it('404 — task not found', async () => {
    setUser(3, 3);
    Task.findByPk.mockResolvedValue(null);
    const res = await request(wlApp)
      .post('/work-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .field('task_id', '999')
      .field('description', 'Worked')
      .field('hours_worked', '2');
    expect(res.status).toBe(404);
  });

  it('403 — employee cannot log on unassigned task', async () => {
    setUser(3, 3);
    Task.findByPk.mockResolvedValue({ ...mockTask, assigned_to: 99 });
    const res = await request(wlApp)
      .post('/work-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .field('task_id', '1')
      .field('description', 'Worked')
      .field('hours_worked', '2');
    expect(res.status).toBe(403);
  });

  it('201 — employee creates work log successfully', async () => {
    setUser(3, 3);
    Task.findByPk.mockResolvedValue({ ...mockTask, assigned_to: 3 });
    WorkLog.create.mockResolvedValue({ id: 1, task_id: 1, user_id: 3, description: 'Worked', hours_worked: 2 });
    const res = await request(wlApp)
      .post('/work-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .field('task_id', '1')
      .field('description', 'Worked on feature')
      .field('hours_worked', '2');
    expect(res.status).toBe(201);
  });
});

describe('POST /work-logs/:log_id/reply', () => {
  it('403 — employee cannot reply to log', async () => {
    setUser(3, 3);
    const res = await request(wlApp)
      .post('/work-logs/1/reply')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .send({ message: 'Good work' });
    expect(res.status).toBe(403);
  });

  it('422 — empty message', async () => {
    setUser(2, 2);
    const res = await request(wlApp)
      .post('/work-logs/1/reply')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`)
      .send({ message: '' });
    expect(res.status).toBe(422);
  });

  it('404 — log not found', async () => {
    setUser(2, 2);
    WorkLog.findByPk = jest.fn().mockResolvedValue(null);
    const res = await request(wlApp)
      .post('/work-logs/999/reply')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`)
      .send({ message: 'Good work' });
    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// NOTIFICATIONS ROUTE
// ═════════════════════════════════════════════════════════════════════════════

describe('Notifications routes', () => {
  it('401 — unauthenticated GET /', async () => {
    const res = await request(notifApp).get('/notifications');
    expect(res.status).toBe(401);
  });

  it('200 — GET / returns notification list', async () => {
    setUser(3, 3);
    Notification.findAll.mockResolvedValue([
      { id: 1, user_id: 3, type: 'assignment', message: 'You were assigned', is_read: false },
    ]);
    const res = await request(notifApp)
      .get('/notifications')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('200 — GET /unread-count returns count', async () => {
    setUser(3, 3);
    Notification.count.mockResolvedValue(3);
    const res = await request(notifApp)
      .get('/notifications/unread-count')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });

  it('200 — PUT /read-all marks all as read', async () => {
    setUser(3, 3);
    Notification.update.mockResolvedValue([2]);
    const res = await request(notifApp)
      .put('/notifications/read-all')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(200);
    expect(Notification.update).toHaveBeenCalledWith(
      { is_read: true },
      expect.objectContaining({ where: { user_id: 3, is_read: false } })
    );
  });

  it('200 — PUT /:id/read marks one as read', async () => {
    setUser(3, 3);
    Notification.update.mockResolvedValue([1]);
    const res = await request(notifApp)
      .put('/notifications/1/read')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(200);
  });

  it('404 — PUT /:id/read when notification not found', async () => {
    setUser(3, 3);
    Notification.update.mockResolvedValue([0]); // 0 rows updated
    const res = await request(notifApp)
      .put('/notifications/999/read')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(404);
  });

  // Verify route ordering — 'read-all' must not be swallowed by /:id/read
  it('PUT /read-all is NOT matched by /:id/read', async () => {
    setUser(3, 3);
    Notification.update.mockResolvedValue([5]);
    const res = await request(notifApp)
      .put('/notifications/read-all')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    // If ordering is wrong this returns 404 (treating 'read-all' as an id)
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('All notifications marked as read');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// USERS ROUTE
// ═════════════════════════════════════════════════════════════════════════════

describe('Users route', () => {
  it('401 — unauthenticated GET /', async () => {
    const res = await request(userApp).get('/users');
    expect(res.status).toBe(401);
  });

  it('403 — employee cannot access users list', async () => {
    setUser(3, 3);
    const res = await request(userApp)
      .get('/users')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(403);
  });

  it('200 — admin sees all users', async () => {
    setUser(1);
    User.findAll.mockResolvedValue([mockUser(1, 1), mockUser(2, 2), mockUser(3, 3)]);
    const res = await request(userApp)
      .get('/users')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('200 — PM only sees employees', async () => {
    setUser(2, 2);
    User.findAll.mockResolvedValue([mockUser(3, 3)]);
    await request(userApp)
      .get('/users')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`);
    const callArgs = User.findAll.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ role_id: 3 });
  });

  it('403 — PM cannot create users', async () => {
    setUser(2, 2);
    const res = await request(userApp)
      .post('/users')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`)
      .send({ name: 'New', email: 'new@test.com', password: 'pass123', role_id: 3 });
    expect(res.status).toBe(403);
  });

  it('422 — invalid email on create', async () => {
    setUser(1);
    const res = await request(userApp)
      .post('/users')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Test', email: 'bademail', password: 'pass123', role_id: 3 });
    expect(res.status).toBe(422);
  });

  it('422 — password too short on create', async () => {
    setUser(1);
    const res = await request(userApp)
      .post('/users')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Test', email: 'test@test.com', password: '12', role_id: 3 });
    expect(res.status).toBe(422);
  });

  it('409 — duplicate email on create', async () => {
    setUser(1);
    User.findOne
      .mockResolvedValueOnce(mockUser(1, 1)) // auth middleware
      .mockResolvedValueOnce(mockUser(5, 3)); // duplicate check finds existing user
    const res = await request(userApp)
      .post('/users')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Dup', email: 'dup@test.com', password: 'pass123', role_id: 3 });
    expect(res.status).toBe(409);
  });

  it('201 — admin creates user successfully', async () => {
    setUser(1);
    User.findOne
      .mockResolvedValueOnce(mockUser(1, 1)) // auth
      .mockResolvedValueOnce(null);            // no duplicate
    User.create.mockResolvedValue(mockUser(10, 3));
    const res = await request(userApp)
      .post('/users')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'New Employee', email: 'newemployee@test.com', password: 'secure123', role_id: 3 });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('password_hash');
  });

  it('404 — update non-existent user', async () => {
    setUser(1);
    User.findByPk.mockResolvedValue(null);
    const res = await request(userApp)
      .put('/users/999')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Updated' });
    expect(res.status).toBe(404);
  });

  it('200 — admin updates user', async () => {
    setUser(1);
    User.findByPk.mockResolvedValue(mockUser(5, 3));
    const res = await request(userApp)
      .put('/users/5')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Updated Name', is_active: false });
    expect(res.status).toBe(200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// AUDIT LOGS ROUTE
// ═════════════════════════════════════════════════════════════════════════════

describe('Audit logs route', () => {
  it('401 — unauthenticated', async () => {
    const res = await request(auditApp).get('/audit-logs');
    expect(res.status).toBe(401);
  });

  it('403 — PM cannot access audit logs', async () => {
    setUser(2, 2);
    const res = await request(auditApp)
      .get('/audit-logs')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`);
    expect(res.status).toBe(403);
  });

  it('403 — employee cannot access audit logs', async () => {
    setUser(3, 3);
    const res = await request(auditApp)
      .get('/audit-logs')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(403);
  });

  it('200 — admin gets paginated audit logs', async () => {
    setUser(1);
    AuditLog.findAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        { id: 1, user_id: 1, action: 'LOGIN', entity_type: 'user', entity_id: 1, created_at: new Date(), user: { id: 1, name: 'Admin' } },
        { id: 2, user_id: 1, action: 'CREATE_PROJECT', entity_type: 'project', entity_id: 1, created_at: new Date(), user: { id: 1, name: 'Admin' } },
      ],
    });
    const res = await request(auditApp)
      .get('/audit-logs?page=1&limit=30')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('logs');
    expect(res.body.total).toBe(2);
    expect(res.body.logs).toHaveLength(2);
  });

  it('200 — filters by entity_type', async () => {
    setUser(1);
    AuditLog.findAndCountAll.mockResolvedValue({ count: 1, rows: [] });
    await request(auditApp)
      .get('/audit-logs?entity_type=project')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    const callArgs = AuditLog.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ entity_type: 'project' });
  });
});