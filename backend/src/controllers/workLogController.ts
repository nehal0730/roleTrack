import { Response } from 'express';
import { WorkLog, LogReply, Task, User, Notification, Project } from '../models';
import { AuthRequest }    from '../middleware/auth';
import { createAuditLog } from '../middleware/auditLogger';
import { sendEmail }      from '../services/emailService';

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
    if (logAuthorId !== req.user!.id) {
      const taskId = (log as any).task?.id;
      try {
        await Notification.create({
          user_id: logAuthorId,
          task_id: taskId ?? null,
          type:    'reply',
          message: `Your work log received a reply from ${req.user!.email}`,
          sent_at: new Date(),
        });
      } catch { /* duplicate reply notifications are fine to skip */ }

      const author = await User.findByPk(logAuthorId);
      if (author) {
        await sendEmail(
          author.email,
          'New Reply on Your Work Log',
          `Your work log received a reply: "${message}"`
        );
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