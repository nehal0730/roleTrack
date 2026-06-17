import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Bell, CheckCheck } from 'lucide-react';

const TYPE_COLOR: Record<string, string> = {
  assignment:    'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  reply:         'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  overdue:       'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  deadline_1h:   'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  deadline_12h:  'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  deadline_24h:  'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  deadline_48h:  'bg-gray-50 border-gray-200 dark:bg-gray-700/30 dark:border-gray-600',
};

export default function NotificationsPage() {
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn:  () => api.get('/notifications').then(r => r.data),
  });

  const markAll = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const markOne = useMutation({
    mutationFn: (id: number) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notif-count'] });
    },
  });

  const unread = notifications.filter((n: any) => !n.is_read);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-sm text-gray-500 mt-0.5">{unread.length} unread</p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={() => markAll.mutate()}
            className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 transition"
          >
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Bell size={40} className="mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markOne.mutate(n.id)}
              className={`border rounded-xl p-4 cursor-pointer transition hover:opacity-80 ${
                TYPE_COLOR[n.type] || 'bg-white dark:bg-gray-800'
              } ${!n.is_read ? 'opacity-100' : 'opacity-50'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm">{n.message}</p>
                {!n.is_read && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0 mt-1.5" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {new Date(n.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}