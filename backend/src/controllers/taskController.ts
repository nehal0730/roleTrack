import { Response } from 'express';
import { Op }       from 'sequelize';
import {
  Task, User, Project,
  Notification, TaskHistory, TaskAssignment,
} from '../models';
import { AuthRequest }      from '../middleware/auth';
import { createAuditLog }   from '../middleware/auditLogger';
import { sendEmail }        from '../services/emailService';
import { NotificationType } from '../models/Notification';
import { notifyUser } from '../services/socketService';

// ── Single source of truth per concern ───────────────────────────────────────
// task_assignments  → owns ALL assignment events (who, by whom, when, until when)
// task_history      → owns all OTHER field mutations (status, priority, deadline, title)
// tasks.assigned_to → live current value only

const TRACKED_FIELDS = ['status', 'priority', 'deadline', 'title'] as const;
// assigned_to is intentionally excluded — task_assignments is its authoritative log

const recordHistory = async (
  taskId: number,
  changedBy: number,
  previous: Record<string, any>,
  updates: Record<string, any>
) => {
  const entries: Array<{
    task_id: number; changed_by: number;
    field: string; old_value: string | null; new_value: string | null;
  }> = [];

  for (const field of TRACKED_FIELDS) {
    if (!(field in updates)) continue;
    const oldVal = previous[field] ?? null;
    const newVal = updates[field]  ?? null;
    if (String(oldVal) !== String(newVal)) {
      entries.push({
        task_id:    taskId,
        changed_by: changedBy,
        field,
        old_value:  oldVal !== null ? String(oldVal) : null,
        new_value:  newVal !== null ? String(newVal) : null,
      });
    }
  }
  if (entries.length) await TaskHistory.bulkCreate(entries);
};

const DEDUP_TYPES: NotificationType[] = [
  'deadline_48h','deadline_24h','deadline_12h','deadline_1h','overdue',
];

const safeCreateNotification = async (
  user_id: number,
  task_id: number,
  type: NotificationType,
  message: string
): Promise<boolean> => {
  try {
    // For deadline/overdue types — only one ever per task per type
    if (DEDUP_TYPES.includes(type)) {
      const exists = await Notification.findOne({ where: { task_id, type } });
      if (exists) return false;
    }

    const notif = await Notification.create({
      user_id, task_id, type, message, sent_at: new Date(),
    });

    notifyUser(user_id, {
      type,
      message,
      task_id,
      created_at: notif.created_at?.toISOString(),
    });
    return true;
  } catch (err: any) {
    console.error('Notification error:', err);
    return false;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { status, priority, assigned_to, project_id, page = 1, limit = 10 } = req.query;
    const where: any = {};

    if (req.user!.role === 'employee') {
      where.assigned_to = req.user!.id;
    } else if (req.user!.role === 'project_manager') {
      const projects = await Project.findAll({
        where: { manager_id: req.user!.id },
        attributes: ['id'],
      });
      where.project_id = { [Op.in]: projects.map(p => p.id) };
    }

    if (status)     where.status     = status;
    if (priority)   where.priority   = priority;
    if (project_id) where.project_id = project_id;
    if (assigned_to && req.user!.role !== 'employee') where.assigned_to = assigned_to;
    if (req.query.deadline_from || req.query.deadline_to) {
      where.deadline = {};
      if (req.query.deadline_from) where.deadline[Op.gte] = new Date(req.query.deadline_from as string);
      if (req.query.deadline_to)   where.deadline[Op.lte] = new Date(req.query.deadline_to as string);
    }

    const { count, rows } = await Task.findAndCountAll({
      where,
      include: [
        { model: User,    as: 'assignee', attributes: ['id','name','email'] },
        { model: User,    as: 'taskCreator', attributes: ['id','name'] },
        { model: Project, as: 'project',  attributes: ['id','name'] },
      ],
      limit:  Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order:  [['deadline', 'ASC']],
    });

    res.json({
      tasks:      rows,
      total:      count,
      page:       Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getTaskById = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: User,    as: 'assignee',    attributes: ['id','name','email'] },
        { model: Project, as: 'project',     attributes: ['id','name'] },
        { model: User,    as: 'taskCreator', attributes: ['id','name'] },
        {
          model: TaskAssignment, as: 'assignments',
          include: [
            { model: User, as: 'assignee', attributes: ['id','name','email'] },
            { model: User, as: 'assigner', attributes: ['id','name'] },
          ],
          separate: true,
          order: [['assigned_at', 'DESC']],
        },
        {
          model: TaskHistory, as: 'history',
          include: [{ model: User, as: 'changedBy', attributes: ['id','name'] }],
          separate: true,
          order: [['created_at', 'DESC']],
          limit: 20,
        },
      ],
    });

    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user!.role === 'employee' && task.assigned_to !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    res.json(task);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const {
      project_id, title, description, priority,
      deadline, assigned_to, estimated_hours,
    } = req.body;

    const project = await Project.findByPk(project_id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (req.user!.role === 'project_manager' && project.manager_id !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const task = await Task.create({
      project_id,
      title,
      description,
      priority,
      deadline,
      assigned_to:     assigned_to ? Number(assigned_to) : null,
      created_by:      req.user!.id,
      estimated_hours: estimated_hours || 0,
    });

    if (assigned_to) {
      // task_assignments is the sole record of this assignment — no task_history entry
      await TaskAssignment.create({
        task_id:     task.id,
        assigned_to: Number(assigned_to),
        assigned_by: req.user!.id,
        notes:       'Initial assignment on task creation',
      });

      await safeCreateNotification(
        Number(assigned_to), task.id, 'assignment',
        `You have been assigned to task: "${title}"`
      );

      const assignee = await User.findByPk(assigned_to);
      if (assignee) {
        await sendEmail(
          assignee.email,
          'New Task Assigned',
          `You have been assigned to: "${title}". Deadline: ${new Date(deadline).toLocaleString()}`
        );
      }
    }

    await createAuditLog(
      req.user!.id, 'CREATE_TASK', 'task', task.id,
      null, { title, project_id, assigned_to }, req.ip
    );
    res.status(201).json(task);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user!.role === 'employee') {
      if (task.assigned_to !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
      req.body = { status: req.body.status };
    }

    const previous = task.toJSON() as Record<string, any>;
    await task.update(req.body);

    // task_history: only status / priority / deadline / title
    await recordHistory(task.id, req.user!.id, previous, req.body);

    // task_assignments: owns the assignment event exclusively
    const newAssignee = req.body.assigned_to;
    const oldAssignee = previous.assigned_to;

    if (newAssignee !== undefined && String(newAssignee) !== String(oldAssignee)) {
      if (oldAssignee) {
        await TaskAssignment.update(
          { unassigned_at: new Date() },
          { where: { task_id: task.id, assigned_to: oldAssignee, unassigned_at: null } }
        );
      }

      if (newAssignee) {
        await TaskAssignment.create({
          task_id:     task.id,
          assigned_to: Number(newAssignee),
          assigned_by: req.user!.id,
        });

        await safeCreateNotification(
          Number(newAssignee), task.id, 'assignment',
          `You have been assigned to task: "${task.title}"`
        );

        const assigneeUser = await User.findByPk(newAssignee);
        if (assigneeUser) {
          await sendEmail(
            assigneeUser.email,
            'Task Assigned to You',
            `"${task.title}" has been assigned to you.`
          );
        }
      }
    }

    await createAuditLog(
      req.user!.id, 'UPDATE_TASK', 'task', task.id,
      previous, req.body, req.ip
    );
    res.json(task);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    await TaskAssignment.update(
      { unassigned_at: new Date() },
      { where: { task_id: task.id, unassigned_at: null } }
    );

    await createAuditLog(
      req.user!.id, 'DELETE_TASK', 'task', task.id,
      task.toJSON(), null, req.ip
    );
    await task.destroy();
    res.json({ message: 'Task deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getTaskHistory = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user!.role === 'employee' && task.assigned_to !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const history = await TaskHistory.findAll({
      where: { task_id: req.params.id },
      include: [{ model: User, as: 'changedBy', attributes: ['id','name'] }],
      order: [['created_at', 'DESC']],
    });
    res.json(history);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getTaskAssignments = async (req: AuthRequest, res: Response) => {
  try {
    const task = await Task.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user!.role === 'employee' && task.assigned_to !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const assignments = await TaskAssignment.findAll({
      where: { task_id: req.params.id },
      include: [
        { model: User, as: 'assignee', attributes: ['id','name','email'] },
        { model: User, as: 'assigner', attributes: ['id','name'] },
      ],
      order: [['assigned_at', 'DESC']],
    });
    res.json(assignments);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};