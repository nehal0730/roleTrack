import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, UserX, UserCheck, X } from 'lucide-react';

const ROLE_META: Record<number, { label: string; color: string }> = {
  1: { label: 'Admin',           color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  2: { label: 'Project Manager', color: 'bg-blue-100   text-blue-700   dark:bg-blue-900/30   dark:text-blue-300'   },
  3: { label: 'Employee',        color: 'bg-green-100  text-green-700  dark:bg-green-900/30  dark:text-green-300'  },
};

interface UserForm {
  name: string; email: string; password: string; role_id: string;
}
const EMPTY: UserForm = { name: '', email: '', password: '', role_id: '3' };

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm]     = useState(false);
  const [editUser, setEditUser]     = useState<any>(null);
  const [form, setForm]             = useState<UserForm>(EMPTY);
  const [roleFilter, setRoleFilter] = useState('all');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn:  () => api.get('/users').then(r => r.data),
  });

  const create = useMutation({
    mutationFn: (body: any) => api.post('/users', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowForm(false); setForm(EMPTY);
      toast.success('User created successfully');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to create user'),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: any }) => api.put(`/users/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
      toast.success('User updated');
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      api.put(`/users/${id}`, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Updated'); },
  });

  const filtered = users.filter((u: any) =>
    roleFilter === 'all' ? true : u.role_id === Number(roleFilter)
  );

  const getInitials = (name: string) =>
    name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Users</h2>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} total · {users.filter((u:any) => u.is_active).length} active</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditUser(null); setForm(EMPTY); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
        >
          <Plus size={16} /> New User
        </button>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['all','All'], ['1','Admin'], ['2','Project Manager'], ['3','Employee']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setRoleFilter(val)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
              roleFilter === val
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'
            }`}
          >
            {label}
            {val !== 'all' && (
              <span className="ml-1.5 opacity-70">
                {users.filter((u: any) => u.role_id === Number(val)).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Create / Edit form */}
      {(showForm || editUser) && (
        <div className="animate-scale-in bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{editUser ? 'Edit User' : 'Create New User'}</h3>
            <button onClick={() => { setShowForm(false); setEditUser(null); }} className="cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
              <input
                value={editUser ? editUser.name : form.name}
                onChange={e => editUser ? setEditUser({...editUser, name: e.target.value}) : setForm({...form, name: e.target.value})}
                placeholder="John Doe"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
              />
            </div>
            {!editUser && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  placeholder="john@company.com"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            )}
            {!editUser && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                <input
                  type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                  placeholder="Min 6 characters"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
              <select
                value={editUser ? editUser.role_id : form.role_id}
                onChange={e => editUser ? setEditUser({...editUser, role_id: Number(e.target.value)}) : setForm({...form, role_id: e.target.value})}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition-shadow"
              >
                <option value="2">Project Manager</option>
                <option value="3">Employee</option>
                <option value="1">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => editUser
                ? update.mutate({ id: editUser.id, body: { name: editUser.name, role_id: editUser.role_id } })
                : create.mutate({ ...form, role_id: Number(form.role_id) })
              }
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
            >
              {editUser ? 'Save Changes' : 'Create User'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditUser(null); }}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Users table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl h-16 animate-pulse border border-gray-100 dark:border-gray-700" />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-stagger">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-sm">No users found</p>
            </div>
          ) : filtered.map((user: any, i: number) => (
            <div
              key={user.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                i !== 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
              } ${!user.is_active ? 'opacity-50' : ''}`}
            >
              {/* Avatar */}
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-semibold shrink-0">
                {getInitials(user.name)}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{user.name}</p>
                  {!user.is_active && <span className="text-xs text-red-400">Deactivated</span>}
                </div>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
              {/* Role badge */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${ROLE_META[user.role_id]?.color}`}>
                {ROLE_META[user.role_id]?.label}
              </span>
              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => { setEditUser(user); setShowForm(false); }}
                  className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                  title="Edit"
                >
                  <Pencil size={15} />
                </button>
                <button
                  onClick={() => toggleActive.mutate({ id: user.id, is_active: !user.is_active })}
                  className={`p-2 rounded-lg transition-all cursor-pointer ${
                    user.is_active
                      ? 'text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                  title={user.is_active ? 'Deactivate' : 'Activate'}
                >
                  {user.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}