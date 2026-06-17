import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import {
  CheckSquare, FolderKanban, AlertTriangle,
  Clock, Users, FileText, TrendingUp,
} from 'lucide-react';

// ── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects?limit=100').then(r => r.data) });
  const { data: tasks }    = useQuery({ queryKey: ['tasks'],    queryFn: () => api.get('/tasks?limit=100').then(r => r.data) });
  const { data: users }    = useQuery({ queryKey: ['users'],    queryFn: () => api.get('/users').then(r => r.data) });

  const taskList    = tasks?.tasks    || [];
  const projectList = projects?.projects || [];
  const userList    = users || [];
  const now         = new Date();

  const overdue    = taskList.filter((t: any) => new Date(t.deadline) < now && t.status !== 'completed');
  const completed  = taskList.filter((t: any) => t.status === 'completed');
  const employees  = userList.filter((u: any) => u.role_id === 3);
  const managers   = userList.filter((u: any) => u.role_id === 2);

  const stats = [
    { label: 'Total Projects',    value: projectList.length,  icon: FolderKanban,  color: 'purple' },
    { label: 'Total Tasks',       value: taskList.length,     icon: CheckSquare,   color: 'blue'   },
    { label: 'Completed Tasks',   value: completed.length,    icon: TrendingUp,    color: 'green'  },
    { label: 'Overdue Tasks',     value: overdue.length,      icon: AlertTriangle, color: 'red'    },
    { label: 'Project Managers',  value: managers.length,     icon: Users,         color: 'amber'  },
    { label: 'Employees',         value: employees.length,    icon: Users,         color: 'teal'   },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Admin Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">Full system overview</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Icon size={18} className="text-blue-500" />
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverdueList tasks={overdue} />
        <RecentProjects projects={projectList.slice(0, 5)} />
      </div>
    </div>
  );
}

// ── Project Manager Dashboard ─────────────────────────────────────────────────
function ManagerDashboard() {
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects?limit=100').then(r => r.data) });
  const { data: tasks }    = useQuery({ queryKey: ['tasks'],    queryFn: () => api.get('/tasks?limit=100').then(r => r.data) });

  const taskList    = tasks?.tasks    || [];
  const projectList = projects?.projects || [];
  const now         = new Date();

  const overdue   = taskList.filter((t: any) => new Date(t.deadline) < now && t.status !== 'completed');
  const active    = taskList.filter((t: any) => t.status === 'in_progress');
  const inReview  = taskList.filter((t: any) => t.status === 'in_review');
  const dueSoon   = taskList.filter((t: any) => {
    const d = new Date(t.deadline);
    return d >= now && d <= new Date(now.getTime() + 48 * 3600000) && t.status !== 'completed';
  });

  const stats = [
    { label: 'My Projects',       value: projectList.length, icon: FolderKanban,  },
    { label: 'Active Tasks',      value: active.length,      icon: CheckSquare,   },
    { label: 'Pending Review',    value: inReview.length,    icon: FileText,      },
    { label: 'Due in 48h',        value: dueSoon.length,     icon: Clock,         },
    { label: 'Overdue',           value: overdue.length,     icon: AlertTriangle, },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">Project Manager Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">Your assigned projects and team tasks</p>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className="text-blue-500" />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OverdueList tasks={overdue} />
        <InReviewList tasks={inReview} />
      </div>
    </div>
  );
}

// ── Employee Dashboard ────────────────────────────────────────────────────────
function EmployeeDashboard() {
  const { data: tasks }         = useQuery({ queryKey: ['tasks'],         queryFn: () => api.get('/tasks?limit=100').then(r => r.data) });
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: () => api.get('/notifications').then(r => r.data) });

  const taskList  = tasks?.tasks || [];
  const notifList = notifications || [];
  const now       = new Date();

  const myTodo      = taskList.filter((t: any) => t.status === 'todo');
  const myActive    = taskList.filter((t: any) => t.status === 'in_progress');
  const myCompleted = taskList.filter((t: any) => t.status === 'completed');
  const myOverdue   = taskList.filter((t: any) => new Date(t.deadline) < now && t.status !== 'completed');
  const dueSoon     = taskList.filter((t: any) => {
    const d = new Date(t.deadline);
    return d >= now && d <= new Date(now.getTime() + 48 * 3600000) && t.status !== 'completed';
  });
  const unread = notifList.filter((n: any) => !n.is_read);

  const stats = [
    { label: 'To Do',         value: myTodo.length,      icon: CheckSquare   },
    { label: 'In Progress',   value: myActive.length,    icon: TrendingUp    },
    { label: 'Completed',     value: myCompleted.length, icon: CheckSquare   },
    { label: 'Overdue',       value: myOverdue.length,   icon: AlertTriangle },
    { label: 'Due in 48h',    value: dueSoon.length,     icon: Clock         },
    { label: 'Unread Alerts', value: unread.length,      icon: FileText      },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-1">My Dashboard</h2>
      <p className="text-sm text-gray-500 mb-6">Your assigned tasks and activity</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-2">
              <Icon size={18} className="text-blue-500" />
              <span className="text-sm text-gray-500">{label}</span>
            </div>
            <p className="text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyTaskList tasks={taskList} />
        <NotificationList notifications={notifList.slice(0, 8)} />
      </div>
    </div>
  );
}

// ── Shared sub-components ─────────────────────────────────────────────────────
const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600', medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};
const STATUS_COLOR: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
  blocked: 'bg-red-100 text-red-700',
};

function OverdueList({ tasks }: { tasks: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle size={16} className="text-red-500" /> Overdue Tasks
      </h3>
      {tasks.length === 0
        ? <p className="text-sm text-gray-400">No overdue tasks</p>
        : tasks.slice(0, 6).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-gray-400">{t.assignee?.name || 'Unassigned'} · {t.project?.name}</p>
            </div>
            <span className="text-xs text-red-500 whitespace-nowrap ml-2">{new Date(t.deadline).toLocaleDateString()}</span>
          </div>
        ))
      }
    </div>
  );
}

function RecentProjects({ projects }: { projects: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FolderKanban size={16} className="text-blue-500" /> Recent Projects
      </h3>
      {projects.length === 0
        ? <p className="text-sm text-gray-400">No projects yet</p>
        : projects.map((p: any) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium">{p.name}</p>
              <p className="text-xs text-gray-400">Manager: {p.manager?.name}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[p.status] || ''}`}>{p.status}</span>
          </div>
        ))
      }
    </div>
  );
}

function InReviewList({ tasks }: { tasks: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <FileText size={16} className="text-purple-500" /> Pending Review
      </h3>
      {tasks.length === 0
        ? <p className="text-sm text-gray-400">Nothing pending review</p>
        : tasks.slice(0, 6).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-gray-400">{t.assignee?.name} · due {new Date(t.deadline).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
          </div>
        ))
      }
    </div>
  );
}

function MyTaskList({ tasks }: { tasks: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <CheckSquare size={16} className="text-blue-500" /> My Tasks
      </h3>
      {tasks.length === 0
        ? <p className="text-sm text-gray-400">No tasks assigned</p>
        : tasks.slice(0, 6).map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0">
            <div>
              <p className="text-sm font-medium">{t.title}</p>
              <p className="text-xs text-gray-400">{t.project?.name} · due {new Date(t.deadline).toLocaleDateString()}</p>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[t.status]}`}>{t.status.replace('_',' ')}</span>
          </div>
        ))
      }
    </div>
  );
}

function NotificationList({ notifications }: { notifications: any[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold mb-4 flex items-center gap-2">
        <Clock size={16} className="text-amber-500" /> Recent Notifications
      </h3>
      {notifications.length === 0
        ? <p className="text-sm text-gray-400">No notifications</p>
        : notifications.map((n: any) => (
          <div key={n.id} className={`py-2 border-b dark:border-gray-700 last:border-0 ${!n.is_read ? 'opacity-100' : 'opacity-50'}`}>
            <p className="text-sm">{n.message}</p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
          </div>
        ))
      }
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { role } = useAuthStore();
  if (role() === 'admin')           return <AdminDashboard />;
  if (role() === 'project_manager') return <ManagerDashboard />;
  return <EmployeeDashboard />;
}