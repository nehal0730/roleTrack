import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'completed' | 'blocked';

const COLUMNS: { id: TaskStatus; label: string; color: string; dot: string }[] = [
  { id: 'todo',        label: 'To Do',       color: 'border-gray-200 dark:border-gray-700',   dot: 'bg-gray-400'   },
  { id: 'in_progress', label: 'In Progress',  color: 'border-blue-200 dark:border-blue-800',   dot: 'bg-blue-500'   },
  { id: 'in_review',   label: 'In Review',    color: 'border-purple-200 dark:border-purple-800',dot: 'bg-purple-500' },
  { id: 'completed',   label: 'Completed',    color: 'border-green-200 dark:border-green-800', dot: 'bg-green-500'  },
  { id: 'blocked',     label: 'Blocked',      color: 'border-red-200 dark:border-red-800',     dot: 'bg-red-500'    },
];

const PRIORITY_COLOR: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500', medium: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-600', critical: 'bg-red-100 text-red-600',
};

export default function KanbanPage() {
  const { role } = useAuthStore();
  const qc = useQueryClient();
  const [dragging, setDragging]   = useState<number | null>(null);
  const [dragOver, setDragOver]   = useState<TaskStatus | null>(null);
  const dragTask = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks-kanban'],
    queryFn:  () => api.get('/tasks?limit=200').then(r => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.put(`/tasks/${id}`, { status }),
    onMutate: async ({ id, status }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['tasks-kanban'] });
      const prev = qc.getQueryData(['tasks-kanban']) as any;
      qc.setQueryData(['tasks-kanban'], (old: any) => ({
        ...old,
        tasks: old.tasks.map((t: any) => t.id === id ? { ...t, status } : t),
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(['tasks-kanban'], ctx?.prev);
      toast.error('Failed to update status');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks-kanban'] }),
  });

  const tasks = data?.tasks ?? [];

  const getColumnTasks = (status: TaskStatus) =>
    tasks.filter((t: any) => t.status === status);

  const handleDragStart = (e: React.DragEvent, task: any) => {
    dragTask.current = task;
    setDragging(task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(status);
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragTask.current && dragTask.current.status !== status) {
      if (role() === 'employee' && dragTask.current.assigned_to !== undefined) {
        // Employees can only move their own tasks
        updateStatus.mutate({ id: dragTask.current.id, status });
      } else if (role() !== 'employee') {
        updateStatus.mutate({ id: dragTask.current.id, status });
      }
    }
    setDragging(null);
    setDragOver(null);
    dragTask.current = null;
  };

  const handleDragEnd = () => {
    setDragging(null);
    setDragOver(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 h-full animate-pulse">
        {COLUMNS.map(c => (
          <div key={c.id} className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl h-96" />
        ))}
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-5">
        <h2 className="text-2xl font-bold">Kanban Board</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Drag tasks between columns to update status · {tasks.length} total tasks
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = getColumnTasks(col.id);
          const isOver   = dragOver === col.id;

          return (
            <div
              key={col.id}
              onDragOver={e => handleDragOver(e, col.id)}
              onDrop={e => handleDrop(e, col.id)}
              onDragLeave={() => setDragOver(null)}
              className={`flex-shrink-0 w-72 flex flex-col rounded-xl border-2 transition-all duration-150 ${col.color} ${
                isOver ? 'scale-[1.01] shadow-lg bg-blue-50/50 dark:bg-blue-900/10' : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-inherit">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                  <span className="font-semibold text-sm">{col.label}</span>
                </div>
                <span className="text-xs bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full px-2 py-0.5 font-medium">
                  {colTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="flex-1 p-3 space-y-2.5 min-h-32 overflow-y-auto">
                {colTasks.map((task: any) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white dark:bg-gray-800 rounded-xl p-3.5 shadow-sm border border-gray-100 dark:border-gray-700 cursor-grab active:cursor-grabbing transition-all duration-150 select-none ${
                      dragging === task.id
                        ? 'opacity-40 scale-95 shadow-none'
                        : 'hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    {/* Priority badge */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_COLOR[task.priority]}`}>
                        {task.priority}
                      </span>
                      {new Date(task.deadline) < new Date() && task.status !== 'completed' && (
                        <span className="text-xs text-red-500 font-medium">Overdue</span>
                      )}
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold leading-snug mb-2">{task.title}</p>

                    {/* Meta */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span className="truncate max-w-28">{task.project?.name}</span>
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>

                    {/* Assignee */}
                    {task.assignee && (
                      <div className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700">
                        <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 text-xs font-semibold">
                          {task.assignee.name?.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-gray-500 truncate">{task.assignee.name}</span>
                      </div>
                    )}
                  </div>
                ))}

                {/* Empty state per column */}
                {colTasks.length === 0 && (
                  <div className={`rounded-lg border-2 border-dashed p-4 text-center transition-colors ${
                    isOver
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <p className="text-xs text-gray-400">
                      {isOver ? 'Drop here' : 'No tasks'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}