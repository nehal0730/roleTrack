import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams]    = useSearchParams();
  const navigate          = useNavigate();
  const token             = searchParams.get('token') || '';

  const [password, setPassword]         = useState('');
  const [confirm,  setConfirm]          = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConf, setShowConf]         = useState(false);
  const [loading,  setLoading]          = useState(false);
  const [success,  setSuccess]          = useState(false);
  const [tokenMissing, setTokenMissing] = useState(false);

  useEffect(() => {
    if (!token) setTokenMissing(true);
  }, [token]);

  const rules = [
    { label: 'At least 6 characters', ok: password.length >= 6 },
    { label: 'Passwords match',        ok: password === confirm && confirm.length > 0 },
  ];
  const valid = rules.every(r => r.ok);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  /* No token in URL */
  if (tokenMissing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md text-center animate-scale-in">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invalid reset link</h2>
          <p className="text-sm text-gray-500 mb-6">
            This password reset link is missing a token. Please request a new one.
          </p>
          <Link to="/forgot-password"
            className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer">
            Request new link
          </Link>
        </div>
      </div>
    );
  }

  /* Success state */
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 w-full max-w-md text-center animate-scale-in">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} className="text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">Password reset!</h2>
          <p className="text-sm text-gray-500">
            Your password has been updated. Redirecting to login in 3 seconds...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 animate-fade-in">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mb-5">
            <Lock size={22} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-xl font-bold mb-1">Set new password</h2>
          <p className="text-sm text-gray-500 mb-6">Choose a strong password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                New password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter new password"
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700 dark:text-gray-300">
                Confirm password
              </label>
              <div className="relative">
                <input
                  type={showConf ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="button" onClick={() => setShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors">
                  {showConf ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Validation rules */}
            {(password || confirm) && (
              <div className="space-y-1.5 animate-fade-in">
                {rules.map(({ label, ok }) => (
                  <div key={label} className={`flex items-center gap-2 text-xs transition-colors ${ok ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                      {ok ? <CheckCircle size={10}/> : <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                    </div>
                    {label}
                  </div>
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !valid}
              className="w-full bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium text-sm transition-all cursor-pointer mt-2"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            Remember it?{' '}
            <Link to="/login" className="text-blue-600 hover:underline cursor-pointer">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}