import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  FileText, Users, Bell, LogOut, BarChart3,
  Shield, ChevronRight,
} from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
  admin:           'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  project_manager: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300',
  employee:        'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300',
};
const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin', project_manager: 'Project Manager', employee: 'Employee',
};

const ALL_NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    roles: ['admin','project_manager','employee'] },
  { to: '/projects',     icon: FolderKanban,   label: 'Projects',     roles: ['admin','project_manager'] },
  { to: '/tasks',        icon: CheckSquare,    label: 'Tasks',        roles: ['admin','project_manager','employee'] },
  { to: '/work-logs',    icon: FileText,       label: 'Work Logs',    roles: ['admin','project_manager','employee'] },
  { to: '/reports',      icon: BarChart3,      label: 'Reports',      roles: ['admin','project_manager'] },
  { to: '/users',        icon: Users,          label: 'Users',        roles: ['admin'] },
  { to: '/activity-log', icon: Shield,         label: 'Activity Log', roles: ['admin'] },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, role, logout } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const userRole  = role()!;

  const { data: notifCount = 0 } = useQuery({
    queryKey: ['notif-count'],
    queryFn:  () => api.get('/notifications/unread-count').then(r => r.data.count),
    refetchInterval: 30000,
  });

  const navItems = ALL_NAV.filter(item => item.roles.includes(userRole));

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) || 'U';

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      <aside className="w-64 bg-white dark:bg-gray-800 flex flex-col border-r border-gray-100 dark:border-gray-700 shrink-0">

        {/* Brand */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
              <CheckSquare size={14} className="text-white" />
            </div>
            <span className="font-bold text-base tracking-tight">TaskManager</span>
          </div>
        </div>

        {/* User card */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0">
              {getInitials(user?.name || '')}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[userRole]}`}>
                {ROLE_LABEL[userRole]}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={17} className="shrink-0 transition-transform group-hover:scale-110" />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={13} className="opacity-40" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-700 space-y-0.5">
          <Link
            to="/notifications"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              location.pathname === '/notifications'
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            <Bell size={17} />
            <span className="flex-1">Notifications</span>
            {notifCount > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full min-w-5 h-5 flex items-center justify-center px-1 animate-scale-in">
                {notifCount > 9 ? '9+' : notifCount}
              </span>
            )}
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all w-full cursor-pointer"
          >
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}