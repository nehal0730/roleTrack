import cron   from 'node-cron';
import { Op } from 'sequelize';
import { Task, User, Notification, Project } from '../models';
import { NotificationType }  from '../models/Notification';
import { sendEmail }         from './emailService';
import { notifyUser }        from './socketService';

interface DeadlineInterval {
  hours: number;
  type:  NotificationType;
}

const INTERVALS: DeadlineInterval[] = [
  { hours: 48, type: 'deadline_48h' },
  { hours: 24, type: 'deadline_24h' },
  { hours: 12, type: 'deadline_12h' },
  { hours: 1,  type: 'deadline_1h'  },
];

/**
 * Attempts to insert a notification row.
 * Returns true if inserted, false if the unique constraint fired (already sent).
 */
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

// ── Deadline reminders ────────────────────────────────────────────────────────
const checkDeadlines = async () => {
  const now = new Date();

  for (const { hours, type } of INTERVALS) {
    const target = new Date(now.getTime() + hours * 3_600_000);
    const window = 5 * 60_000; // ±5-minute window

    const tasks = await Task.findAll({
      where: {
        deadline:    { [Op.between]: [
          new Date(target.getTime() - window),
          new Date(target.getTime() + window),
        ]},
        status:      { [Op.notIn]: ['completed'] },
        assigned_to: { [Op.ne]: null },
      },
      include: [
        { model: User,    as: 'assignee' },
        { model: Project, as: 'project',
          include: [{ model: User, as: 'manager' }] },
      ],
    });

    for (const task of tasks) {
      const assignee = (task as any).assignee as User;
      const manager  = (task as any).project?.manager as User | undefined;
      if (!assignee) continue;

      const msg     = `Reminder: Task "${task.title}" is due in ${hours} hour(s).`;
      const created = await safeCreateNotification(assignee.id, task.id, type, msg);

      if (created) {
        await sendEmail(assignee.email, `Task Due in ${hours}h`, msg);

        // Alert the manager for short windows (≤24 h)
        if (manager && hours <= 24) {
          await sendEmail(
            manager.email,
            `Team Task Due in ${hours}h`,
            `"${task.title}" (assigned to ${assignee.name}) is due in ${hours}h.`
          );
        }
      }
    }
  }
};

// ── Overdue alerts ────────────────────────────────────────────────────────────
const checkOverdue = async () => {
  const now = new Date();

  const tasks = await Task.findAll({
    where: {
      deadline:    { [Op.lt]: now },
      status:      { [Op.notIn]: ['completed'] },
      assigned_to: { [Op.ne]: null },
    },
    include: [
      { model: User,    as: 'assignee' },
      { model: Project, as: 'project',
        include: [{ model: User, as: 'manager' }] },
    ],
  });

  for (const task of tasks) {
    const assignee = (task as any).assignee as User;
    const manager  = (task as any).project?.manager as User | undefined;
    if (!assignee) continue;

    const msg     = `OVERDUE: Task "${task.title}" has passed its deadline.`;
    const created = await safeCreateNotification(assignee.id, task.id, 'overdue', msg);

    if (created) {
      await sendEmail(assignee.email, 'Task Overdue', msg);
      if (manager) {
        await sendEmail(
          manager.email,
          'Team Task Overdue',
          `"${task.title}" (assigned to ${assignee.name}) is now overdue.`
        );
      }
    }
  }
};

// ── Start both cron jobs ──────────────────────────────────────────────────────
export const startScheduler = () => {
  cron.schedule('*/5 * * * *',  checkDeadlines, { name: 'deadline-checker' });
  cron.schedule('*/10 * * * *', checkOverdue,   { name: 'overdue-checker'  });
  console.log('Scheduler started — deadlines every 5 min, overdue every 10 min');
};