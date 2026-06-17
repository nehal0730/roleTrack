import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Plus, Archive, Eye, Pencil, X, ChevronDown, Search } from 'lucide-react';

const STATUS_STYLE: Record<string, string> = {
  planning:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  archived:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function ProgressRing({ pct }: { pct: number }) {
  const r = 18, circ = 2 * Math.PI * r;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-700" />
      <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" strokeWidth="3"
        className="text-blue-500"
        strokeDasharray={circ}
        strokeDashoffset={circ - (circ * pct) / 100}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="22" y="27" textAnchor="middle" fontSize="10" fontWeight="500" fill="currentColor" className="text-gray-700 dark:text-gray-200">{pct}%</text>
    </svg>
  );
}

interface ProjectFormData {
  name: string; description: string; start_date: string;
  end_date: string; status: string; manager_id: string;
}
const EMPTY_FORM: ProjectFormData = { name:'', description:'', start_date:'', end_date:'', status:'planning', manager_id:'' };

export default function ProjectsPage() {
  const { role } = useAuthStore();
  const qc = useQueryClient();
  const [showForm, setShowForm]   = useState(false);
  const [editItem, setEditItem]   = useState<any>(null);
  const [detailId, setDetailId]   = useState<number|null>(null);
  const [form, setForm]           = useState<ProjectFormData>(EMPTY_FORM);
  const [statusFilter, setStatus] = useState('');
  const [managerFilter, setManager] = useState('');
  const [fromDate, setFrom]       = useState('');
  const [toDate, setTo]           = useState('');
  const [search, setSearch]       = useState('');

  const queryParams = new URLSearchParams({
    limit: '100',
    ...(statusFilter && { status: statusFilter }),
    ...(managerFilter && { manager_id: managerFilter }),
    ...(fromDate && { from: fromDate }),
    ...(toDate   && { to: toDate }),
  }).toString();

  const { data, isLoading } = useQuery({
    queryKey: ['projects', statusFilter, managerFilter, fromDate, toDate],
    queryFn:  () => api.get(`/projects?${queryParams}`).then(r => r.data),
  });

  const { data: detailData } = useQuery({
    queryKey: ['project-detail', detailId],
    queryFn:  () => api.get(`/reports/project/${detailId}`).then(r => r.data),
    enabled:  !!detailId,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn:  () => api.get('/users').then(r => r.data),
    enabled:  role() === 'admin',
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/projects', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setShowForm(false); setForm(EMPTY_FORM); toast.success('Project created'); },
    onError:   (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api.put(`/projects/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); qc.invalidateQueries({ queryKey: ['project-detail'] }); setEditItem(null); toast.success('Updated'); },
    onError:   (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const archive = useMutation({
    mutationFn: (id: number) => api.put(`/projects/${id}`, { status: 'archived' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Archived'); },
  });

  const managers  = users.filter((u: any) => u.role_id === 2);
  const projects  = (data?.projects || []).filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getProgress = (tasks: any[]) => {
    if (!tasks?.length) return 0;
    return Math.round((tasks.filter((t: any) => t.status === 'completed').length / tasks.length) * 100);
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-sm text-gray-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {role() === 'admin' && (
          <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer">
            <Plus size={16} /> New Project
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
          <option value="">All statuses</option>
          {['planning','active','completed','archived'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {role() === 'admin' && (
          <select value={managerFilter} onChange={e => setManager(e.target.value)}
            className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
            <option value="">All managers</option>
            {managers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        )}
        <div className="flex gap-2">
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)}
            className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
          <input type="date" value={toDate} onChange={e => setTo(e.target.value)}
            className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
      </div>

      {/* Create/Edit form */}
      {(showForm || editItem) && (
        <div className="animate-scale-in bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editItem ? 'Edit Project' : 'New Project'}</h3>
            <button onClick={() => { setShowForm(false); setEditItem(null); }} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Project Name', key: 'name', placeholder: 'e.g. Website Redesign', span: 2 },
              { label: 'Description',  key: 'description', placeholder: 'Brief description...', span: 2 },
            ].map(({ label, key, placeholder, span }) => (
              <div key={key} className={span === 2 ? 'col-span-2' : ''}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input value={editItem ? editItem[key] || '' : (form as any)[key]}
                  onChange={e => editItem ? setEditItem({...editItem, [key]: e.target.value}) : setForm({...form, [key]: e.target.value})}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            {[
              { label: 'Start Date', key: 'start_date', type: 'date' },
              { label: 'End Date',   key: 'end_date',   type: 'date' },
            ].map(({ label, key, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input type={type} value={editItem ? editItem[key]?.split('T')[0] || '' : (form as any)[key]}
                  onChange={e => editItem ? setEditItem({...editItem, [key]: e.target.value}) : setForm({...form, [key]: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={editItem ? editItem.status : form.status}
                onChange={e => editItem ? setEditItem({...editItem, status: e.target.value}) : setForm({...form, status: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {['planning','active','completed','archived'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {role() === 'admin' && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Project Manager</label>
                <select value={editItem ? editItem.manager_id : form.manager_id}
                  onChange={e => editItem ? setEditItem({...editItem, manager_id: Number(e.target.value)}) : setForm({...form, manager_id: e.target.value})}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                  <option value="">Select manager</option>
                  {managers.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => editItem
                ? update.mutate({ id: editItem.id, body: { name: editItem.name, description: editItem.description, start_date: editItem.start_date, end_date: editItem.end_date, status: editItem.status, manager_id: editItem.manager_id } })
                : create.mutate({ ...form, manager_id: Number(form.manager_id) })
              }
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer">
              {editItem ? 'Save Changes' : 'Create Project'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null); }}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Project Detail Drawer */}
      {detailId && detailData && (
        <div className="animate-scale-in bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg">{detailData.project?.name}</h3>
              <p className="text-sm text-gray-500">{detailData.project?.description}</p>
            </div>
            <button onClick={() => setDetailId(null)} className="cursor-pointer text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {[
              { label: 'Total',       value: detailData.summary.total_tasks },
              { label: 'Completed',   value: detailData.summary.completed },
              { label: 'Pending',     value: detailData.summary.pending },
              { label: 'In Progress', value: detailData.summary.in_progress },
              { label: 'Overdue',     value: detailData.summary.overdue },
              { label: 'Hours',       value: detailData.summary.total_hours_logged },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-center">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="font-medium">{detailData.summary.completion_pct}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${detailData.summary.completion_pct}%` }} />
            </div>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {detailData.tasks?.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.assignee?.name || 'Unassigned'} · {t.hours_logged}h</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[t.status] || ''}`}>{t.status.replace('_',' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project cards */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-sm">No projects found</p>
        </div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {projects.map((p: any) => {
            const progress = getProgress(p.tasks);
            return (
              <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 hover:shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <ProgressRing pct={progress} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold truncate">{p.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mb-2">{p.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                      <span>Manager: {p.manager?.name}</span>
                      <span>{p.tasks?.length || 0} tasks</span>
                      <span>{new Date(p.start_date).toLocaleDateString()} → {new Date(p.end_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setDetailId(detailId === p.id ? null : p.id)}
                      className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer" title="View details">
                      <Eye size={15} />
                    </button>
                    {role() !== 'employee' && (
                      <button onClick={() => { setEditItem(p); setShowForm(false); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all cursor-pointer" title="Edit">
                        <Pencil size={15} />
                      </button>
                    )}
                    {role() === 'admin' && p.status !== 'archived' && (
                      <button onClick={() => archive.mutate(p.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer" title="Archive">
                        <Archive size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}