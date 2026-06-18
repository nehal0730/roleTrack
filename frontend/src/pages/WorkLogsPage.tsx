import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { Paperclip, Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function WorkLogsPage() {
  const { role } = useAuthStore();
  // const qc = useQueryClient();
  const [projectFilter, setProject] = useState('');
  const [employeeFilter, setEmployee] = useState('');
  const [fromDate, setFrom] = useState('');
  const [toDate, setTo]     = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [desc, setDesc]     = useState('');
  const [hours, setHours]   = useState('');
  const [file, setFile]     = useState<File|null>(null);
  const [reply, setReply]   = useState<Record<number,string>>({});
  const [expanded, setExpanded] = useState<Record<number,boolean>>({});

  const buildParams = () => new URLSearchParams({
    limit: '50',
    ...(projectFilter  && { project_id: projectFilter  }),
    ...(employeeFilter && { user_id:    employeeFilter  }),
    ...(fromDate       && { from:       fromDate        }),
    ...(toDate         && { to:         toDate          }),
  }).toString();

  const { data: logsData, isLoading, refetch } = useQuery({
    queryKey: ['logs', projectFilter, employeeFilter, fromDate, toDate],
    queryFn:  () => api.get(`/work-logs?${buildParams()}`).then(r => r.data),
  });

  const { data: tasks }    = useQuery({ queryKey: ['tasks'],    queryFn: () => api.get('/tasks?limit=100').then(r => r.data) });
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => api.get('/projects?limit=100').then(r => r.data), enabled: role() !== 'employee' });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data), enabled: role() !== 'employee' });

  const submitLog = useMutation({
    mutationFn: (fd: FormData) => api.post('/work-logs', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { refetch(); setDesc(''); setHours(''); setFile(null); toast.success('Log submitted'); },
    onError:   () => toast.error('Failed to submit log'),
  });

  const submitReply = useMutation({
    mutationFn: ({ logId, message }: { logId: number; message: string }) =>
      api.post(`/work-logs/${logId}/reply`, { message }),
    onSuccess: () => { refetch(); toast.success('Reply sent'); },
  });

  const handleSubmit = () => {
    if (!selectedTaskId) return toast.error('Select a task first');
    if (!desc.trim())    return toast.error('Description required');
    if (!hours)          return toast.error('Hours required');
    const fd = new FormData();
    fd.append('task_id',      selectedTaskId);
    fd.append('description',  desc);
    fd.append('hours_worked', hours);
    if (file) fd.append('attachment', file);
    submitLog.mutate(fd);
  };

  const employees = users.filter((u: any) => u.role_id === 3);
  const logs = logsData?.logs || [];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Work Logs</h2>
        <p className="text-sm text-gray-500 mt-0.5">{logs.length} log{logs.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Submit log — employees only */}
      {role() === 'employee' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-5 animate-slide-up">
          <h3 className="font-semibold mb-4">Submit Work Log</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="col-span-2">
              <select value={selectedTaskId} onChange={e => setSelectedTaskId(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                <option value="">Select task...</option>
                {tasks?.tasks?.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                placeholder="What did you work on? Describe your progress..."
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div>
              <input type="number" value={hours} onChange={e => setHours(e.target.value)} step="0.5" min="0.1" max="24"
                placeholder="Hours worked (e.g. 2.5)"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="flex items-center gap-2 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <Paperclip size={14} className="text-gray-400" />
                <span className="text-gray-500">{file ? file.name : 'Attach file (optional)'}</span>
                <input type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
              </label>
            </div>
          </div>
          <button onClick={handleSubmit} disabled={submitLog.isPending}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer">
            <Send size={14}/> {submitLog.isPending ? 'Submitting...' : 'Submit Log'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {role() !== 'employee' && (
          <>
            <select value={projectFilter} onChange={e => setProject(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="">All projects</option>
              {projects?.projects?.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={employeeFilter} onChange={e => setEmployee(e.target.value)}
              className="text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
              <option value="">All employees</option>
              {employees.map((u: any) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </>
        )}
        <div>
          <label className="block text-xs text-gray-400 mb-1">From date</label>
          <input type="date" value={fromDate} onChange={e => setFrom(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To date</label>
          <input type="date" value={toDate} onChange={e => setTo(e.target.value)}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer" />
        </div>
      </div>

      {/* Logs */}
      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"/>)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">No work logs found</div>
      ) : (
        <div className="space-y-3 animate-stagger">
          {logs.map((log: any) => (
            <div key={log.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-sm transition-all">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 text-xs font-semibold">
                      {log.author?.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.author?.name}</p>
                      <p className="text-xs text-gray-400">{log.task?.title} · {log.task?.project?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-right shrink-0">
                    <div>
                      <p className="text-sm font-semibold">{log.hours_worked}h</p>
                      <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => setExpanded({...expanded, [log.id]: !expanded[log.id]})}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer">
                      {expanded[log.id] ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">{log.description}</p>
                {log.attachment_url && (
                  <a href={`http://localhost:5000${log.attachment_url}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 mt-2 hover:underline cursor-pointer">
                    <Paperclip size={12}/> View attachment
                  </a>
                )}
              </div>

              {/* Replies */}
              {expanded[log.id] && (
                <div className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50/50 dark:bg-gray-700/20 animate-slide-up">
                  {log.replies?.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {log.replies.map((r: any) => (
                        <div key={r.id} className="flex gap-2">
                          <div className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-700 text-xs font-semibold shrink-0">
                            {r.author?.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-medium">{r.author?.name} <span className="text-gray-400 font-normal">{new Date(r.created_at).toLocaleString()}</span></p>
                            <p className="text-sm text-gray-600 dark:text-gray-300">{r.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {role() !== 'employee' && (
                    <div className="flex gap-2">
                      <input value={reply[log.id] || ''} onChange={e => setReply({...reply, [log.id]: e.target.value})}
                        onKeyDown={e => { if (e.key === 'Enter' && reply[log.id]?.trim()) { submitReply.mutate({ logId: log.id, message: reply[log.id] }); setReply({...reply, [log.id]: ''}); } }}
                        placeholder="Reply to this log... (Enter to send)"
                        className="flex-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <button
                        onClick={() => { if (reply[log.id]?.trim()) { submitReply.mutate({ logId: log.id, message: reply[log.id] }); setReply({...reply, [log.id]: ''}); } }}
                        className="p-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-lg transition-all cursor-pointer">
                        <Send size={14}/>
                      </button>
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