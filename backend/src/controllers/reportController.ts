import { Response } from 'express';
import { Op, fn, col, literal } from 'sequelize';
import { Project, Task, User, WorkLog, TaskAssignment } from '../models';
import { AuthRequest } from '../middleware/auth';

export const getProjectReport = async (req: AuthRequest, res: Response) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [{ model: User, as: 'manager', attributes: ['id','name','email'] }],
    });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (req.user!.role === 'project_manager' && project.manager_id !== req.user!.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const tasks = await Task.findAll({
      where: { project_id: project.id },
      include: [
        { model: User, as: 'assignee', attributes: ['id','name'] },
        { model: WorkLog, as: 'workLogs', attributes: ['hours_worked'] },
      ],
    });

    const total     = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked   = tasks.filter(t => t.status === 'blocked').length;
    const overdue   = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed').length;
    const totalHours = tasks.reduce((sum, t) => {
      const logs = (t as any).workLogs as Array<{ hours_worked: number }>;
      return sum + logs.reduce((s, l) => s + Number(l.hours_worked), 0);
    }, 0);

    res.json({
      project,
      summary: {
        total_tasks:    total,
        completed:      completed,
        in_progress:    inProgress,
        blocked:        blocked,
        overdue:        overdue,
        pending:        total - completed,
        completion_pct: total > 0 ? Math.round((completed / total) * 100) : 0,
        total_hours_logged: Math.round(totalHours * 10) / 10,
      },
      tasks: tasks.map(t => ({
        id:           t.id,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        deadline:     t.deadline,
        assignee:     (t as any).assignee,
        hours_logged: (t as any).workLogs.reduce((s: number, l: any) => s + Number(l.hours_worked), 0),
      })),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getEmployeeReport = async (req: AuthRequest, res: Response) => {
  try {
    const employee = await User.findByPk(req.params.id, {
      attributes: ['id','name','email','role_id'],
    });
    if (!employee) return res.status(404).json({ message: 'User not found' });

    const tasks = await Task.findAll({
      where: { assigned_to: req.params.id },
      include: [
        { model: Project, as: 'project', attributes: ['id','name'] },
        { model: WorkLog, as: 'workLogs', attributes: ['hours_worked','created_at'] },
      ],
    });

    const completed  = tasks.filter(t => t.status === 'completed');
    const overdue    = tasks.filter(t => new Date(t.deadline) < new Date() && t.status !== 'completed');
    const totalHours = tasks.reduce((sum, t) => {
      return sum + (t as any).workLogs.reduce((s: number, l: any) => s + Number(l.hours_worked), 0);
    }, 0);

    const avgCompletion = completed.length > 0
      ? completed.reduce((sum, t) => {
          const created  = new Date(t.created_at!).getTime();
          const updated  = new Date(t.updated_at!).getTime();
          return sum + (updated - created) / (1000 * 60 * 60 * 24);
        }, 0) / completed.length
      : 0;

    const assignments = await TaskAssignment.findAll({
      where: { assigned_to: req.params.id },
      attributes: ['task_id','assigned_at','unassigned_at'],
    });

    res.json({
      employee,
      summary: {
        total_assigned:       tasks.length,
        completed:            completed.length,
        in_progress:          tasks.filter(t => t.status === 'in_progress').length,
        overdue:              overdue.length,
        total_hours_logged:   Math.round(totalHours * 10) / 10,
        avg_completion_days:  Math.round(avgCompletion * 10) / 10,
        total_assignments:    assignments.length,
      },
      tasks: tasks.map(t => ({
        id:           t.id,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        deadline:     t.deadline,
        project:      (t as any).project,
        hours_logged: (t as any).workLogs.reduce((s: number, l: any) => s + Number(l.hours_worked), 0),
      })),
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOverviewReport = async (req: AuthRequest, res: Response) => {
  try {
    const [projects, tasks, users] = await Promise.all([
      Project.findAll({ include: [{ model: Task, as: 'tasks', attributes: ['status'] }] }),
      Task.findAll({ include: [{ model: WorkLog, as: 'workLogs', attributes: ['hours_worked'] }] }),
      User.findAll({ attributes: ['id','role_id','is_active'] }),
    ]);

    const now = new Date();
    res.json({
      projects: {
        total:     projects.length,
        active:    projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        planning:  projects.filter(p => p.status === 'planning').length,
        archived:  projects.filter(p => p.status === 'archived').length,
      },
      tasks: {
        total:       tasks.length,
        completed:   tasks.filter(t => t.status === 'completed').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        overdue:     tasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed').length,
        blocked:     tasks.filter(t => t.status === 'blocked').length,
        total_hours: Math.round(
          tasks.reduce((sum, t) =>
            sum + (t as any).workLogs.reduce((s: number, l: any) => s + Number(l.hours_worked), 0), 0
          ) * 10) / 10,
      },
      users: {
        total:    users.length,
        active:   users.filter(u => u.is_active).length,
        admins:   users.filter(u => u.role_id === 1).length,
        managers: users.filter(u => u.role_id === 2).length,
        employees:users.filter(u => u.role_id === 3).length,
      },
    });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
};