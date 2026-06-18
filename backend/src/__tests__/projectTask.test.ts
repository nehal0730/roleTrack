jest.mock('../middleware/rateLimiter', () => ({
  authLimiter: (_req: any, _res: any, next: any) => next(),
  apiLimiter:  (_req: any, _res: any, next: any) => next(),
}));
jest.mock('../services/emailService',  () => ({ sendEmail: jest.fn().mockResolvedValue(undefined) }));
jest.mock('../services/socketService', () => ({ notifyUser: jest.fn(), initSocket: jest.fn() }));
jest.mock('../middleware/auditLogger',  () => ({ createAuditLog: jest.fn().mockResolvedValue(undefined) }));

const mockProject = {
  id: 1, name: 'Test Project', description: 'Desc',
  start_date: '2025-01-01', end_date: '2025-12-31',
  status: 'active', manager_id: 2, created_by: 1,
  toJSON: jest.fn().mockReturnThis(),
  update:  jest.fn().mockResolvedValue(true),
  destroy: jest.fn().mockResolvedValue(true),
};

const mockTask = {
  id: 1, title: 'Test Task', project_id: 1,
  priority: 'medium', status: 'todo',
  deadline: new Date(Date.now() + 86400000).toISOString(),
  assigned_to: 3, created_by: 1, estimated_hours: 4,
  toJSON: jest.fn().mockReturnThis(),
  update:  jest.fn().mockImplementation(function(this: any, data: any) {
    Object.assign(this, data);
    return Promise.resolve(this);
  }),
  destroy: jest.fn().mockResolvedValue(true),
};

jest.mock('../models', () => ({
  User:           { findOne: jest.fn(), findByPk: jest.fn() },
  Role:           {},
  Project:        { findAndCountAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  Task:           { findAndCountAll: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
  TaskAssignment: { create: jest.fn().mockResolvedValue({}), update: jest.fn().mockResolvedValue([1]) },
  TaskHistory:    { bulkCreate: jest.fn().mockResolvedValue([]), findAll: jest.fn().mockResolvedValue([]) },
  Notification:   { create: jest.fn().mockResolvedValue({ created_at: new Date() }), findOne: jest.fn().mockResolvedValue(null) },
  AuditLog:       { create: jest.fn().mockResolvedValue({}) },
}));

import request        from 'supertest';
import express        from 'express';
import jwt            from 'jsonwebtoken';
import projectRoutes  from '../routes/projects';
import taskRoutes     from '../routes/tasks';
import { errorHandler } from '../middleware/errorHandler';

process.env.JWT_SECRET         = 'test_secret_that_is_long_enough_32chars!!';
process.env.JWT_REFRESH_SECRET = 'test_refresh_secret_long_enough_32chars!!';

const { User, Project, Task, TaskAssignment } = require('../models');

// ── App setup ─────────────────────────────────────────────────────────────────
const projectApp = express();
projectApp.use(express.json());
projectApp.use('/projects', projectRoutes);
projectApp.use(errorHandler);

const taskApp = express();
taskApp.use(express.json());
taskApp.use('/tasks', taskRoutes);
taskApp.use(errorHandler);

// ── Token helpers ─────────────────────────────────────────────────────────────
const makeToken = (roleId: number, id = 1) =>
  jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

const ROLE_NAMES: Record<number, string> = {
  1: 'admin', 2: 'project_manager', 3: 'employee',
};

const setUser = (roleId: number, id = 1) => {
  User.findOne.mockResolvedValue({
    id, email: `user${id}@test.com`,
    role_id: roleId, is_active: true,
    role: { name: ROLE_NAMES[roleId] },
  });
};

beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
// PROJECT CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /projects', () => {
  it('401 — unauthenticated', async () => {
    const res = await request(projectApp).get('/projects');
    expect(res.status).toBe(401);
  });

  it('200 — admin sees paginated list', async () => {
    setUser(1);
    Project.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockProject] });
    const res = await request(projectApp)
      .get('/projects?page=1&limit=10')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(res.body).toHaveProperty('total', 1);
    expect(res.body).toHaveProperty('totalPages');
  });

  it('200 — PM sees only their projects (manager_id filter applied)', async () => {
    setUser(2, 2);
    Project.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const res = await request(projectApp)
      .get('/projects')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`);
    expect(res.status).toBe(200);
    const callArgs = Project.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ manager_id: 2 });
  });

  it('422 — invalid status filter', async () => {
    setUser(1);
    const res = await request(projectApp)
      .get('/projects?status=invalid')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(422);
  });
});

describe('POST /projects', () => {
  const validBody = {
    name: 'New Project', description: 'Desc',
    start_date: '2025-01-01', end_date: '2025-12-31', manager_id: 2,
  };

  it('403 — employee cannot create project', async () => {
    setUser(3, 3);
    const res = await request(projectApp)
      .post('/projects')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('403 — project_manager cannot create project', async () => {
    setUser(2, 2);
    const res = await request(projectApp)
      .post('/projects')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('422 — missing required fields', async () => {
    setUser(1);
    const res = await request(projectApp)
      .post('/projects')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ name: 'Only Name' });
    expect(res.status).toBe(422);
  });

  it('400 — invalid manager (not a PM)', async () => {
    setUser(1);
    // manager lookup returns null (no PM with that id)
    User.findOne
      .mockResolvedValueOnce({ id: 1, email: 'admin@test.com', role_id: 1, is_active: true, role: { name: 'admin' } })
      .mockResolvedValueOnce(null);
    const res = await request(projectApp)
      .post('/projects')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send(validBody);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid manager');
  });

  it('201 — admin creates project successfully', async () => {
    setUser(1);
    User.findOne
      .mockResolvedValueOnce({ id: 1, email: 'admin@test.com', role_id: 1, is_active: true, role: { name: 'admin' } })
      .mockResolvedValueOnce({ id: 2, role_id: 2, is_active: true }); // valid PM
    Project.create.mockResolvedValue(mockProject);
    const res = await request(projectApp)
      .post('/projects')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send(validBody);
    expect(res.status).toBe(201);
  });
});

describe('PUT /projects/:id', () => {
  it('404 — project not found', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue(null);
    const res = await request(projectApp)
      .put('/projects/999')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  it('403 — PM cannot update another PMs project', async () => {
    setUser(2, 2); // PM with id=2
    Project.findByPk.mockResolvedValue({ ...mockProject, manager_id: 99, update: jest.fn() }); // owned by PM 99
    const res = await request(projectApp)
      .put('/projects/1')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`)
      .send({ status: 'active' });
    expect(res.status).toBe(403);
  });

  it('200 — admin can update any project', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue({ ...mockProject, update: jest.fn().mockResolvedValue(mockProject), toJSON: jest.fn().mockReturnValue(mockProject) });
    const res = await request(projectApp)
      .put('/projects/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(200);
  });

  it('422 — invalid status value', async () => {
    setUser(1);
    const res = await request(projectApp)
      .put('/projects/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ status: 'unknown_status' });
    expect(res.status).toBe(422);
  });
});

describe('DELETE /projects/:id', () => {
  it('403 — PM cannot delete project', async () => {
    setUser(2, 2);
    const res = await request(projectApp)
      .delete('/projects/1')
      .set('Authorization', `Bearer ${makeToken(2, 2)}`);
    expect(res.status).toBe(403);
  });

  it('404 — project not found', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue(null);
    const res = await request(projectApp)
      .delete('/projects/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(404);
  });

  it('200 — admin soft-deletes project', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue({ ...mockProject, destroy: jest.fn().mockResolvedValue(true), toJSON: jest.fn().mockReturnValue(mockProject) });
    const res = await request(projectApp)
      .delete('/projects/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// TASK CONTROLLER
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /tasks', () => {
  it('401 — unauthenticated', async () => {
    const res = await request(taskApp).get('/tasks');
    expect(res.status).toBe(401);
  });

  it('200 — returns paginated tasks', async () => {
    setUser(1);
    Task.findAndCountAll.mockResolvedValue({ count: 1, rows: [mockTask] });
    const res = await request(taskApp)
      .get('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('tasks');
    expect(res.body.total).toBe(1);
  });

  it('200 — employee only sees own tasks', async () => {
    setUser(3, 3);
    Task.findAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    await request(taskApp)
      .get('/tasks')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    const callArgs = Task.findAndCountAll.mock.calls[0][0];
    expect(callArgs.where).toMatchObject({ assigned_to: 3 });
  });

  it('422 — invalid status filter', async () => {
    setUser(1);
    const res = await request(taskApp)
      .get('/tasks?status=invalid')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(422);
  });

  it('422 — invalid priority filter', async () => {
    setUser(1);
    const res = await request(taskApp)
      .get('/tasks?priority=ultra')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(422);
  });
});

describe('POST /tasks', () => {
  const validTask = {
    title: 'Fix bug', project_id: 1,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    priority: 'high', assigned_to: 3,
  };

  it('403 — employee cannot create task', async () => {
    setUser(3, 3);
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .send(validTask);
    expect(res.status).toBe(403);
  });

  it('422 — missing title', async () => {
    setUser(1);
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ project_id: 1, deadline: validTask.deadline });
    expect(res.status).toBe(422);
  });

  it('422 — missing deadline', async () => {
    setUser(1);
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ title: 'Task', project_id: 1 });
    expect(res.status).toBe(422);
  });

  it('404 — project not found', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue(null);
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send(validTask);
    expect(res.status).toBe(404);
  });

  it('201 — admin creates task with assignment', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue(mockProject);
    Task.create.mockResolvedValue(mockTask);
    User.findByPk.mockResolvedValue({ id: 3, email: 'emp@test.com', name: 'Employee' });
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send(validTask);
    expect(res.status).toBe(201);
    expect(TaskAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: mockTask.id, assigned_to: 3 })
    );
  });

  it('201 — task created without assignment', async () => {
    setUser(1);
    Project.findByPk.mockResolvedValue(mockProject);
    const unassigned = { ...mockTask, assigned_to: null };
    Task.create.mockResolvedValue(unassigned);
    const res = await request(taskApp)
      .post('/tasks')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ title: 'Task', project_id: 1, deadline: validTask.deadline });
    expect(res.status).toBe(201);
    expect(TaskAssignment.create).not.toHaveBeenCalled();
  });
});

describe('PUT /tasks/:id', () => {
  it('404 — task not found', async () => {
    setUser(1);
    Task.findByPk.mockResolvedValue(null);
    const res = await request(taskApp)
      .put('/tasks/999')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
  });

  it('403 — employee cannot update another employees task', async () => {
    setUser(3, 3);
    Task.findByPk.mockResolvedValue({ ...mockTask, assigned_to: 99 }); // owned by user 99
    const res = await request(taskApp)
      .put('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(403);
  });

  it('200 — employee can update status on own task', async () => {
    setUser(3, 3);
    const taskMock = { ...mockTask, assigned_to: 3, update: jest.fn().mockResolvedValue(mockTask), toJSON: jest.fn().mockReturnValue(mockTask) };
    Task.findByPk.mockResolvedValue(taskMock);
    const res = await request(taskApp)
      .put('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
  });

  it('422 — invalid status value', async () => {
    setUser(1);
    const res = await request(taskApp)
      .put('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ status: 'flying' });
    expect(res.status).toBe(422);
  });

  it('200 — reassignment closes old TaskAssignment and creates new one', async () => {
    setUser(1);
    const taskMock = {
      ...mockTask, assigned_to: 3,
      update: jest.fn().mockResolvedValue({ ...mockTask, assigned_to: 5 }),
      toJSON: jest.fn().mockReturnValue({ ...mockTask, assigned_to: 3 }),
    };
    Task.findByPk.mockResolvedValue(taskMock);
    User.findByPk.mockResolvedValue({ id: 5, email: 'new@test.com', name: 'New Employee' });
    const res = await request(taskApp)
      .put('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(1)}`)
      .send({ assigned_to: 5 });
    expect(res.status).toBe(200);
    expect(TaskAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ unassigned_at: expect.any(Date) }),
      expect.objectContaining({ where: expect.objectContaining({ task_id: 1, assigned_to: 3 }) })
    );
    expect(TaskAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: 1, assigned_to: 5 })
    );
  });
});

describe('DELETE /tasks/:id', () => {
  it('403 — employee cannot delete task', async () => {
    setUser(3, 3);
    const res = await request(taskApp)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(3, 3)}`);
    expect(res.status).toBe(403);
  });

  it('404 — task not found', async () => {
    setUser(1);
    Task.findByPk.mockResolvedValue(null);
    const res = await request(taskApp)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(404);
  });

  it('200 — admin soft-deletes task and closes assignments', async () => {
    setUser(1);
    const taskMock = { ...mockTask, destroy: jest.fn().mockResolvedValue(true), toJSON: jest.fn().mockReturnValue(mockTask) };
    Task.findByPk.mockResolvedValue(taskMock);
    const res = await request(taskApp)
      .delete('/tasks/1')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(TaskAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({ unassigned_at: expect.any(Date) }),
      expect.objectContaining({ where: { task_id: 1, unassigned_at: null } })
    );
    expect(taskMock.destroy).toHaveBeenCalled();
  });
});

describe('GET /tasks/:id/history', () => {
  it('401 — unauthenticated', async () => {
    const res = await request(taskApp).get('/tasks/1/history');
    expect(res.status).toBe(401);
  });

  it('404 — task not found', async () => {
    setUser(1);
    Task.findByPk.mockResolvedValue(null);
    const res = await request(taskApp)
      .get('/tasks/1/history')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(404);
  });

  it('200 — returns task history', async () => {
    setUser(1);
    Task.findByPk.mockResolvedValue(mockTask);
    const { TaskHistory } = require('../models');
    TaskHistory.findAll.mockResolvedValue([
      { id: 1, task_id: 1, field: 'status', old_value: 'todo', new_value: 'in_progress', changedBy: { id: 1, name: 'Admin' } },
    ]);
    const res = await request(taskApp)
      .get('/tasks/1/history')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /tasks/:id/assignments', () => {
  it('200 — returns assignment trail', async () => {
    setUser(1);
    Task.findByPk.mockResolvedValue(mockTask);
    const { TaskAssignment: TA } = require('../models');
    TA.findAll = jest.fn().mockResolvedValue([
      { id: 1, task_id: 1, assigned_to: 3, assigned_by: 1, assigned_at: new Date(), unassigned_at: null },
    ]);
    const res = await request(taskApp)
      .get('/tasks/1/assignments')
      .set('Authorization', `Bearer ${makeToken(1)}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});