import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { BarChart3, Users, FolderKanban, TrendingUp } from 'lucide-react';

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow">
      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, max, color = 'bg-blue-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function AdminOverview() {
  const { data, isLoading } = useQuery({
    queryKey: ['report-overview'],
    queryFn:  () => api.get('/reports/overview').then(r => r.data),
  });

  if (isLoading) return <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"/>)}</div>;
  if (!data) return null;

  return (
    <div className="space-y-6 animate-stagger">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects"  value={data.projects.total}   sub={`${data.projects.active} active`} />
        <StatCard label="Total Tasks"     value={data.tasks.total}      sub={`${data.tasks.completed} completed`} />
        <StatCard label="Hours Logged"    value={data.tasks.total_hours} sub="across all tasks" />
        <StatCard label="Active Users"    value={data.users.active}     sub={`${data.users.employees} employees`} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><FolderKanban size={16} className="text-blue-500" /> Projects by status</h3>
          <div className="space-y-3">
            {[
              { label: 'Active',    value: data.projects.active,    color: 'bg-blue-500' },
              { label: 'Completed', value: data.projects.completed, color: 'bg-green-500' },
              { label: 'Planning',  value: data.projects.planning,  color: 'bg-amber-500' },
              { label: 'Archived',  value: data.projects.archived,  color: 'bg-gray-400' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 dark:text-gray-300">{label}</span><span className="font-medium">{value}</span></div>
                <ProgressBar value={value} max={data.projects.total} color={color} />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-green-500" /> Task health</h3>
          <div className="space-y-3">
            {[
              { label: 'Completed',   value: data.tasks.completed,   color: 'bg-green-500' },
              { label: 'In Progress', value: data.tasks.in_progress, color: 'bg-blue-500' },
              { label: 'Overdue',     value: data.tasks.overdue,     color: 'bg-red-500' },
              { label: 'Blocked',     value: data.tasks.blocked,     color: 'bg-orange-400' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1"><span className="text-gray-600 dark:text-gray-300">{label}</span><span className="font-medium">{value}</span></div>
                <ProgressBar value={value} max={data.tasks.total} color={color} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectReport() {
  // const { role } = useAuthStore();
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects').then(r => r.data) });
  const [projectId, setProjectId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-project', projectId],
    queryFn:  () => api.get(`/reports/project/${projectId}`).then(r => r.data),
    enabled:  !!projectId,
  });

  const STATUS_COLOR: Record<string,string> = {
    todo: 'bg-gray-100 text-gray-600', in_progress: 'bg-blue-100 text-blue-700',
    in_review: 'bg-purple-100 text-purple-700', completed: 'bg-green-100 text-green-700',
    blocked: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center gap-3">
        <select
          value={projectId}
          onChange={e => setProjectId(e.target.value)}
          className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-64"
        >
          <option value="">Select a project...</option>
          {projects?.projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {isLoading && <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />}

      {data && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Completion" value={`${data.summary.completion_pct}%`} sub={`${data.summary.completed}/${data.summary.total_tasks} tasks`} />
            <StatCard label="Overdue"    value={data.summary.overdue}    sub="tasks past deadline" />
            <StatCard label="Blocked"    value={data.summary.blocked}    sub="tasks blocked" />
            <StatCard label="Hours"      value={data.summary.total_hours_logged} sub="hours logged" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b dark:border-gray-700">
              <h3 className="font-semibold">Tasks</h3>
            </div>
            {data.tasks.map((t: any, i: number) => (
              <div key={t.id} className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${i !== 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.assignee?.name || 'Unassigned'} · {t.hours_logged}h logged</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_COLOR[t.status]}`}>{t.status.replace('_',' ')}</span>
                  <span className={`text-xs ${new Date(t.deadline) < new Date() && t.status !== 'completed' ? 'text-red-500' : 'text-gray-400'}`}>
                    {new Date(t.deadline).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeReport() {
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });
  const [userId, setUserId] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['report-employee', userId],
    queryFn:  () => api.get(`/reports/employee/${userId}`).then(r => r.data),
    enabled:  !!userId,
  });

  const employees = (users || []).filter((u: any) => u.role_id === 3);

  return (
    <div className="space-y-5 animate-fade-in">
      <select
        value={userId}
        onChange={e => setUserId(e.target.value)}
        className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer min-w-64"
      >
        <option value="">Select an employee...</option>
        {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>

      {isLoading && <div className="h-40 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />}

      {data && (
        <div className="space-y-5 animate-slide-up">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Assigned"         value={data.summary.total_assigned}     sub="total tasks" />
            <StatCard label="Completed"        value={data.summary.completed}          sub="tasks done" />
            <StatCard label="Avg Completion"   value={`${data.summary.avg_completion_days}d`} sub="average days" />
            <StatCard label="Hours Logged"     value={data.summary.total_hours_logged} sub="total hours" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b dark:border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Task breakdown</h3>
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"/>Completed</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>Overdue</span>
              </div>
            </div>
            {data.tasks.map((t: any, i: number) => (
              <div key={t.id} className={`flex items-center justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${i !== 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}>
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.project?.name} · {t.hours_logged}h logged</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    t.status === 'completed' ? 'bg-green-500'
                    : new Date(t.deadline) < new Date() ? 'bg-red-500'
                    : 'bg-blue-500'
                  }`} />
                  <span className="text-xs text-gray-500 capitalize">{t.status.replace('_',' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const { role } = useAuthStore();
  const [tab, setTab] = useState<'overview'|'project'|'employee'>(
    role() === 'admin' ? 'overview' : 'project'
  );

  const tabs = [
    ...(role() === 'admin' ? [{ id: 'overview', label: 'Overview', icon: BarChart3 }] : []),
    { id: 'project',  label: 'Project Report',  icon: FolderKanban },
    { id: 'employee', label: 'Employee Report',  icon: Users },
  ] as const;

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Reports</h2>
        <p className="text-sm text-gray-500 mt-0.5">Analytics and performance insights</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              tab === id
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && role() === 'admin' && <AdminOverview />}
      {tab === 'project'  && <ProjectReport />}
      {tab === 'employee' && <EmployeeReport />}
    </div>
  );
}