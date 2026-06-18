import { Op } from 'sequelize';
import { Response } from 'express';
import { WorkLog, LogReply, Task, User, Notification, Project } from '../models';
import { AuthRequest }    from '../middleware/auth';
import { createAuditLog } from '../middleware/auditLogger';
import { sendEmail }      from '../services/emailService';
import { notifyUser } from '../services/socketService';

export const createWorkLog = async (req: AuthRequest, res: Response) => {
  try {
    const { task_id, description, hours_worked } = req.body;

    const task = await Task.findByPk(task_id, {
      include: [{ model: Project, as: 'project' }],
    });
    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user!.role === 'employee' && task.assigned_to !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const log = await WorkLog.create({
      task_id:        Number(task_id),
      user_id:        req.user!.id,
      description,
      hours_worked:   Number(hours_worked),
      attachment_url: req.file ? `/uploads/${req.file.filename}` : null,
    });

    await createAuditLog(
      req.user!.id, 'CREATE_WORKLOG', 'work_log', log.id,
      null, { task_id, hours_worked }, req.ip
    );
    res.status(201).json(log);
  } catch (err: any) {
    if (err.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: err.errors[0].message });
    }
    res.status(500).json({ message: 'Server error' });
  }
};

export const getWorkLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { task_id } = req.params;

    // RBAC: employees can only see logs for their own tasks
    if (req.user!.role === 'employee') {
      const task = await Task.findByPk(task_id);
      if (!task || task.assigned_to !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const logs = await WorkLog.findAll({
      where: { task_id },
      include: [
        { model: User, as: 'author', attributes: ['id','name'] },
        {
          model: LogReply, as: 'replies',
          include: [{ model: User, as: 'author', attributes: ['id','name'] }],
          separate: true,
          order: [['created_at', 'ASC']],
        },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(logs);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const replyToLog = async (req: AuthRequest, res: Response) => {
  try {
    const { log_id } = req.params;
    const { message } = req.body;

    const log = await WorkLog.findByPk(log_id, {
      include: [{ model: Task, as: 'task' }],
    });
    if (!log) return res.status(404).json({ message: 'Work log not found' });

    // PM access check: must manage the project this task belongs to
    if (req.user!.role === 'project_manager') {
      const task = (log as any).task as Task;
      const project = await Project.findByPk(task.project_id);
      if (!project || project.manager_id !== req.user!.id) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    const reply = await LogReply.create({
      log_id:  Number(log_id),
      user_id: req.user!.id,
      message,
    });

    // Notify the log author (unless they are replying to themselves)
    const logAuthorId = (log as any).user_id as number;
    // In replyToLog, after creating the reply:
    if (logAuthorId !== req.user!.id) {
      const taskId = (log as any).task?.id;

      // Reply notifications are NEVER deduplicated — every reply gets a notification
      await Notification.create({
        user_id: logAuthorId,
        task_id: taskId ?? null,
        type:    'reply',
        message: `Your work log received a reply from ${req.user!.email}`,
        sent_at: new Date(),
      });

      // Real-time push
      notifyUser(logAuthorId, {
        type:    'reply',
        message: `Your work log received a reply from ${req.user!.email}`,
        task_id: taskId ?? null,
        created_at: new Date().toISOString(),
      });

      const author = await User.findByPk(logAuthorId);
      if (author) {
        await sendEmail(author.email, 'New Reply on Your Work Log', `Your work log received a reply: "${message}"`);
      }
    }

    await createAuditLog(
      req.user!.id, 'REPLY_WORKLOG', 'log_reply', reply.id,
      null, { log_id, message }, req.ip
    );

    const replyWithAuthor = await LogReply.findByPk(reply.id, {
      include: [{ model: User, as: 'author', attributes: ['id','name'] }],
    });
    res.status(201).json(replyWithAuthor);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getFilteredLogs = async (req: AuthRequest, res: Response) => {
  try {
    const { project_id, user_id, from, to, page = 1, limit = 20 } = req.query;
    const where: any = {};
    const taskWhere: any = {};

    // Employees can only see their own logs
    if (req.user!.role === 'employee') {
      where.user_id = req.user!.id;
    } else if (user_id) {
      where.user_id = user_id;
    }

    if (project_id) taskWhere.project_id = project_id;

    if (from || to) {
      where.created_at = {};
      if (from) where.created_at[Op.gte] = new Date(from as string);
      if (to)   where.created_at[Op.lte] = new Date(to as string);
    }

    // PM can only see logs for their projects
    if (req.user!.role === 'project_manager') {
      const projects = await Project.findAll({
        where: { manager_id: req.user!.id },
        attributes: ['id'],
      });
      taskWhere.project_id = { [Op.in]: projects.map(p => p.id) };
    }

    const { count, rows } = await WorkLog.findAndCountAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id','name','email'] },
        {
          model: Task, as: 'task',
          where: Object.keys(taskWhere).length ? taskWhere : undefined,
          attributes: ['id','title','project_id'],
          include: [{ model: Project, as: 'project', attributes: ['id','name'] }],
        },
        {
          model: LogReply, as: 'replies',
          include: [{ model: User, as: 'author', attributes: ['id','name'] }],
          separate: true,
          order: [['created_at', 'ASC']],
        },
      ],
      order:  [['created_at', 'DESC']],
      limit:  Number(limit),
      offset: (Number(page) - 1) * Number(limit),
    });

    res.json({
      logs:       rows,
      total:      count,
      page:       Number(page),
      totalPages: Math.ceil(count / Number(limit)),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};