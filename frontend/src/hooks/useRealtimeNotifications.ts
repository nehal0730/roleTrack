import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { connectSocket, disconnectSocket } from '../lib/socket';
import { useAuthStore } from '../store/authStore';
import { Bell } from 'lucide-react';

export const useRealtimeNotifications = () => {
  const { accessToken, user } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!accessToken || !user) return;

    const socket = connectSocket(accessToken);

    socket.on('notification', (payload: { type: string; message: string }) => {
      // Refresh notification count badge
      qc.invalidateQueries({ queryKey: ['notif-count'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });

      // Show toast for critical types
      const isUrgent = ['overdue','deadline_1h','assignment'].includes(payload.type);
      if (isUrgent) {
        toast(payload.message, {
          icon: '🔔',
          duration: 6000,
          style: { fontSize: '13px', maxWidth: '360px' },
        });
      }
    });

    return () => {
      disconnectSocket();
    };
  }, [accessToken, user]);
};