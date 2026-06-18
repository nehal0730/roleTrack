import { Response } from 'express';
import { Op }       from 'sequelize';
import { Project, Task, User, WorkLog, TaskAssignment, TaskHistory } from '../models';
import { AuthRequest } from '../middleware/auth';

// ── helpers ───────────────────────────────────────────────────────────────────

/** Sequelize returns DECIMAL as string — always parse to float */
const toNum = (v: any) => parseFloat(String(v ?? 0)) || 0;

/** Sum hours_worked across an array of WorkLog records */
const sumHours = (logs: any[]): number =>
  Math.round(logs.reduce((s, l) => s + toNum(l.hours_worked), 0) * 10) / 10;

// ─────────────────────────────────────────────────────────────────────────────
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
        { model: User,    as: 'assignee', attributes: ['id','name'] },
        { model: WorkLog, as: 'workLogs', attributes: ['hours_worked'] },
      ],
    });

    const total      = tasks.length;
    const completed  = tasks.filter(t => t.status === 'completed').length;
    const inProgress = tasks.filter(t => t.status === 'in_progress').length;
    const blocked    = tasks.filter(t => t.status === 'blocked').length;
    const now        = new Date();
    const overdue    = tasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed').length;
    const totalHours = tasks.reduce((sum, t) => sum + sumHours((t as any).workLogs ?? []), 0);

    res.json({
      project,
      summary: {
        total_tasks:        total,
        completed,
        in_progress:        inProgress,
        blocked,
        overdue,
        pending:            total - completed,
        completion_pct:     total > 0 ? Math.round((completed / total) * 100) : 0,
        total_hours_logged: Math.round(totalHours * 10) / 10,
      },
      tasks: tasks.map(t => ({
        id:           t.id,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        deadline:     t.deadline,
        assignee:     (t as any).assignee,
        hours_logged: sumHours((t as any).workLogs ?? []),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
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
        { model: WorkLog, as: 'workLogs', attributes: ['hours_worked'] },
      ],
    });

    const now            = new Date();
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const overdue        = tasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed');
    const totalHours     = tasks.reduce((sum, t) => sum + sumHours((t as any).workLogs ?? []), 0);

    // ── Average completion time ────────────────────────────────────────────
    let avgCompletionDays = 0;

    if (completedTasks.length > 0) {
      const completedTaskIds = completedTasks.map(t => t.id);

      // GUARD: Op.in([]) causes a SequelizeDatabaseError on some MySQL versions
      const completionEvents = completedTaskIds.length > 0
        ? await TaskHistory.findAll({
            where: {
              task_id:   { [Op.in]: completedTaskIds },
              field:     'status',
              new_value: 'completed',
            },
            order: [['created_at', 'ASC']],
          })
        : [];

      // Build map: task_id → first timestamp when status became 'completed'
      const completionMap = new Map<number, Date>();
      for (const ev of completionEvents) {
        if (!completionMap.has(ev.task_id)) {
          completionMap.set(ev.task_id, new Date(ev.created_at!));
        }
      }

      let totalDays = 0;
      let counted   = 0;

      for (const t of completedTasks) {
        const completedAt = completionMap.get(t.id);

        if (completedAt && t.created_at) {
          // Primary: use task_history completion timestamp
          const days = (completedAt.getTime() - new Date(t.created_at).getTime())
                        / (1000 * 60 * 60 * 24);
          totalDays += Math.max(0, days);
          counted++;
        } else if (t.created_at && t.updated_at) {
          // Fallback: task was completed before history tracking existed
          const days = (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime())
                        / (1000 * 60 * 60 * 24);
          totalDays += Math.max(0, days);
          counted++;
        }
      }

      avgCompletionDays = counted > 0
        ? Math.round((totalDays / counted) * 10) / 10
        : 0;
    }

    const assignments = await TaskAssignment.findAll({
      where:      { assigned_to: req.params.id },
      attributes: ['task_id','assigned_at','unassigned_at'],
    });

    res.json({
      employee,
      summary: {
        total_assigned:      tasks.length,
        completed:           completedTasks.length,
        in_progress:         tasks.filter(t => t.status === 'in_progress').length,
        overdue:             overdue.length,
        total_hours_logged:  Math.round(totalHours * 10) / 10,
        avg_completion_days: avgCompletionDays,
        total_assignments:   assignments.length,
      },
      tasks: tasks.map(t => ({
        id:           t.id,
        title:        t.title,
        status:       t.status,
        priority:     t.priority,
        deadline:     t.deadline,
        project:      (t as any).project,
        hours_logged: sumHours((t as any).workLogs ?? []),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
export const getOverviewReport = async (req: AuthRequest, res: Response) => {
  try {
    const [projects, tasks, users] = await Promise.all([
      Project.findAll(),
      Task.findAll({
        include: [{ model: WorkLog, as: 'workLogs', attributes: ['hours_worked'] }],
      }),
      User.findAll({ attributes: ['id','role_id','is_active'] }),
    ]);

    const now        = new Date();
    const totalHours = tasks.reduce((sum, t) => sum + sumHours((t as any).workLogs ?? []), 0);

    res.json({
      projects: {
        total:     projects.length,
        active:    projects.filter(p => p.status === 'active').length,
        completed: projects.filter(p => p.status === 'completed').length,
        planning:  projects.filter(p => p.status === 'planning').length,
        archived:  projects.filter(p => p.status === 'archived').length,
      },
      tasks: {
        total:        tasks.length,
        completed:    tasks.filter(t => t.status === 'completed').length,
        in_progress:  tasks.filter(t => t.status === 'in_progress').length,
        overdue:      tasks.filter(t => new Date(t.deadline) < now && t.status !== 'completed').length,
        blocked:      tasks.filter(t => t.status === 'blocked').length,
        total_hours:  Math.round(totalHours * 10) / 10,
      },
      users: {
        total:     users.length,
        active:    users.filter(u => u.is_active).length,
        admins:    users.filter(u => u.role_id === 1).length,
        managers:  users.filter(u => u.role_id === 2).length,
        employees: users.filter(u => u.role_id === 3).length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};