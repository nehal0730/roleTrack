import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Shield, Filter, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_COLOR: Record<string, string> = {
  LOGIN: 'bg-blue-100 text-blue-700', LOGOUT: 'bg-gray-100 text-gray-600',
  CREATE_PROJECT: 'bg-green-100 text-green-700', UPDATE_PROJECT: 'bg-amber-100 text-amber-700', DELETE_PROJECT: 'bg-red-100 text-red-700',
  CREATE_TASK: 'bg-green-100 text-green-700', UPDATE_TASK: 'bg-amber-100 text-amber-700', DELETE_TASK: 'bg-red-100 text-red-700',
  CREATE_USER: 'bg-purple-100 text-purple-700', UPDATE_USER: 'bg-amber-100 text-amber-700', DELETE_USER: 'bg-red-100 text-red-700',
  CREATE_WORKLOG: 'bg-blue-100 text-blue-700', REPLY_WORKLOG: 'bg-purple-100 text-purple-700',
};

export default function ActivityLogPage() {
  const [page, setPage]       = useState(1);
  const [entityType, setType] = useState('');
  const [expanded, setExpanded] = useState<Record<number,boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityType],
    queryFn:  () => api.get(`/audit-logs?page=${page}&limit=30${entityType ? `&entity_type=${entityType}` : ''}`).then(r => r.data),
  });

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield size={22} className="text-purple-500" /> Activity Log
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Full audit trail · {data?.total || 0} events</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter size={15} className="text-gray-400" />
          <select value={entityType} onChange={e => { setType(e.target.value); setPage(1); }}
            className="border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All entities</option>
            <option value="user">Users</option>
            <option value="project">Projects</option>
            <option value="task">Tasks</option>
            <option value="work_log">Work Logs</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(8)].map((_,i) => <div key={i} className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"/>)}</div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-stagger">
            {data?.logs?.length === 0 ? (
              <div className="text-center py-16 text-gray-400 text-sm">No activity found</div>
            ) : data?.logs?.map((log: any, i: number) => (
              <div key={log.id} className={i !== 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''}>
                <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => setExpanded({...expanded, [log.id]: !expanded[log.id]})}>
                  <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                    {log.user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{log.user?.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                        {log.action.replace(/_/g,' ')}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">{log.entity_type} #{log.entity_id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                    {(log.previous_value || log.new_value) && (
                      expanded[log.id] ? <ChevronUp size={14} className="text-gray-400"/> : <ChevronDown size={14} className="text-gray-400"/>
                    )}
                  </div>
                </div>
                {expanded[log.id] && (log.previous_value || log.new_value) && (
                  <div className="px-5 pb-3 animate-slide-up">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {log.previous_value && (
                        <div className="bg-red-50 dark:bg-red-900/10 rounded-lg p-3">
                          <p className="font-medium text-red-600 mb-1">Previous</p>
                          <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all font-mono text-xs">
                            {JSON.stringify(log.previous_value, null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.new_value && (
                        <div className="bg-green-50 dark:bg-green-900/10 rounded-lg p-3">
                          <p className="font-medium text-green-600 mb-1">New</p>
                          <pre className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-all font-mono text-xs">
                            {JSON.stringify(log.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {data?.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">Page {page} of {data.totalPages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">Previous</button>
                <button onClick={() => setPage(p => p+1)} disabled={page>=data.totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}