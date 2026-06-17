import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Plus, X, Search, History, ChevronDown, ChevronUp } from 'lucide-react';

const PRIORITY_STYLE: Record<string,string> = {
  low:      'bg-gray-100 text-gray-600',
  medium:   'bg-blue-100 text-blue-700',
  high:     'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
};
const STATUS_STYLE: Record<string,string> = {
  todo:        'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review:   'bg-purple-100 text-purple-700',
  completed:   'bg-green-100 text-green-700',
  blocked:     'bg-red-100 text-red-700',
};

interface TaskForm {
  title: string; description: string; project_id: string;
  priority: string; deadline: string; assigned_to: string; estimated_hours: string;
}
const EMPTY: TaskForm = { title:'', description:'', project_id:'', priority:'medium', deadline:'', assigned_to:'', estimated_hours:'' };

export default function TasksPage() {
  const { role } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState<TaskForm>(EMPTY);
  const [expandedId, setExpandedId]   = useState<number|null>(null);
  const [showHistory, setShowHistory] = useState<number|null>(null);
  const [statusFilter, setStatus]     = useState('');
  const [priorityFilter, setPriority] = useState('');
  const [employeeFilter, setEmployee] = useState('');
  const [deadlineFrom, setFrom]       = useState('');
  const [deadlineTo, setTo]           = useState('');
  const [search, setSearch]           = useState('');

  const buildParams = () => new URLSearchParams({
    limit: '100',
    ...(statusFilter   && { status:       statusFilter   }),
    ...(priorityFilter && { priority:     priorityFilter }),
    ...(employeeFilter && { assigned_to:  employeeFilter }),
    ...(deadlineFrom   && { deadline_from: deadlineFrom  }),
    ...(deadlineTo     && { deadline_to:  deadlineTo     }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['tasks', statusFilter, priorityFilter, employeeFilter, deadlineFrom, deadlineTo],
    queryFn:  () => api.get(`/tasks?${buildParams()}`).then(r => r.data),
  });

  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects?limit=100').then(r => r.data) });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data) });

  const { data: historyData } = useQuery({
    queryKey: ['task-history', showHistory],
    queryFn:  () => api.get(`/tasks/${showHistory}/history`).then(r => r.data),
    enabled:  !!showHistory,
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/tasks', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowForm(false); setForm(EMPTY); toast.success('Task created'); },
    onError:   (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => api.put(`/tasks/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Status updated'); },
  });

  const del = useMutation({
    mutationFn: (id: number) => api.delete(`/tasks/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Deleted'); },
  });

  const employees = users.filter((u: any) => u.role_id === 3);
  const tasks = (data?.tasks || []).filter((t: any) =>
    !search || t.title.toLowerCase().includes(search.toLowerCase())
  );

  const isOverdue = (t: any) => new Date(t.deadline) < new Date() && t.status !== 'completed';

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Tasks</h2>
          <p className="text-sm text-gray-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {role() !== 'employee' && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer">
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-5 grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="relative col-span-2 lg:col-span-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">All statuses</option>
          {['todo','in_progress','in_review','completed','blocked'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={priorityFilter} onChange={e => setPriority(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">All priorities</option>
          {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        {role() !== 'employee' && (
          <select value={employeeFilter} onChange={e => setEmployee(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
            <option value="">All employees</option>
            {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        )}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Deadline from</label>
          <input type="date" value={deadlineFrom} onChange={e => setFrom(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Deadline to</label>
          <input type="date" value={deadlineTo} onChange={e => setTo(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="animate-scale-in bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">New Task</h3>
            <button onClick={() => setShowForm(false)} className="cursor-pointer text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Task title"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2} placeholder="Optional description"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Project</label>
              <select value={form.project_id} onChange={e => setForm({...form, project_id: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="">Select project</option>
                {projects?.projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Assign Employee</label>
              <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="">Unassigned</option>
                {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {['low','medium','high','critical'].map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Deadline</label>
              <input type="datetime-local" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Hours</label>
              <input type="number" value={form.estimated_hours} onChange={e => setForm({...form, estimated_hours: e.target.value})} placeholder="0"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => create.mutate({ ...form, project_id: Number(form.project_id), assigned_to: form.assigned_to ? Number(form.assigned_to) : undefined, estimated_hours: Number(form.estimated_hours) })}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer">
              Create Task
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">Cancel</button>
          </div>
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"/>)}</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No tasks found</div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {tasks.map((t: any) => (
            <div key={t.id} className={`bg-white dark:bg-gray-800 rounded-xl border transition-all hover:shadow-sm ${isOverdue(t) ? 'border-red-200 dark:border-red-900/50' : 'border-gray-100 dark:border-gray-700'}`}>
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                  className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
                  {expandedId === t.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{t.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_STYLE[t.priority]}`}>{t.priority}</span>
                    {isOverdue(t) && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">overdue</span>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.project?.name} · {t.assignee?.name || 'Unassigned'} · Due {new Date(t.deadline).toLocaleDateString()}
                    {t.estimated_hours > 0 && ` · ${t.estimated_hours}h est.`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={t.status} onChange={e => updateStatus.mutate({ id: t.id, status: e.target.value })}
                    className={`text-xs px-2 py-1 rounded-lg border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STATUS_STYLE[t.status]}`}>
                    {['todo','in_progress','in_review','completed','blocked'].map(s => (
                      <option key={s} value={s}>{s.replace('_',' ')}</option>
                    ))}
                  </select>
                  <button onClick={() => setShowHistory(showHistory === t.id ? null : t.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer" title="View history">
                    <History size={14}/>
                  </button>
                  {role() !== 'employee' && (
                    <button onClick={() => del.mutate(t.id)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer">
                      <X size={14}/>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {expandedId === t.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 animate-slide-up">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div><span className="text-xs text-gray-400 block">Created by</span>{t.taskCreator?.name || '—'}</div>
                    <div><span className="text-xs text-gray-400 block">Assigned to</span>{t.assignee?.name || 'Unassigned'}</div>
                    <div><span className="text-xs text-gray-400 block">Estimated</span>{t.estimated_hours}h</div>
                    <div><span className="text-xs text-gray-400 block">Deadline</span>{new Date(t.deadline).toLocaleString()}</div>
                  </div>
                  {t.description && <p className="text-sm text-gray-500 mt-3">{t.description}</p>}
                </div>
              )}

              {/* History timeline */}
              {showHistory === t.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3 animate-slide-up">
                  <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wide">Change History</p>
                  {!historyData || historyData.length === 0 ? (
                    <p className="text-sm text-gray-400">No changes recorded yet</p>
                  ) : (
                    <div className="space-y-2">
                      {historyData.map((h: any) => (
                        <div key={h.id} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm">
                              <span className="font-medium">{h.changedBy?.name}</span>
                              {' changed '}
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{h.field}</span>
                              {h.old_value && <> from <span className="line-through text-gray-400">{h.old_value}</span></>}
                              {' to '}
                              <span className="font-medium">{h.new_value}</span>
                            </p>
                            <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}