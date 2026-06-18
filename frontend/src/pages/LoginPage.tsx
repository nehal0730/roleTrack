import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { LogIn } from 'lucide-react';

// const DEMO_CREDENTIALS = [
//   { role: 'Admin',           email: 'admin@taskmanager.com', password: 'Admin@123',   color: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-700 dark:text-purple-300' },
//   { role: 'Project Manager', email: '(created by admin)',     password: '(set by admin)', color: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300' },
//   { role: 'Employee',        email: '(created by admin)',     password: '(set by admin)', color: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300' },
// ];

export default function LoginPage() {
  const [email, setEmail]       = useState('admin@taskmanager.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading]   = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      toast.error('Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md space-y-5">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Task Manager</h1>
          <p className="mt-1 text-sm text-gray-500">Role-based project & task management</p>
        </div>

        {/* Info box */}
        {/* <div className="flex gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3">
          <Info size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            There is no public signup. The <strong>Admin</strong> creates all Project Manager and Employee accounts from the Users page after logging in.
          </p>
        </div> */}

        {/* Role cards */}
        {/* <div className="space-y-2">
          {DEMO_CREDENTIALS.map(({ role, email: e, password: p, color }) => (
            <div
              key={role}
              className={`border rounded-lg p-3 cursor-pointer transition hover:opacity-80 ${color}`}
              onClick={() => { if (e !== '(created by admin)') { setEmail(e); setPassword(p); } }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide">{role}</span>
                {e !== '(created by admin)' && (
                  <span className="text-xs opacity-60">click to fill</span>
                )}
              </div>
              <div className="mt-1 text-xs opacity-80 font-mono">{e}</div>
            </div>
          ))}
        </div> */}

        {/* Login form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-4 border border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Sign in</h2>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition cursor-pointer"
          >
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}